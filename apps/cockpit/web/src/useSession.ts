import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import type { Role } from './types';

// The pty session connection, lifted to App so the Sessions tab renders it and the
// Actions tab can inject into it. Data plane is browser→executor (the attach_url the
// Bridge issues); control plane stays on the Bridge.
//
// Output is rendered through an xterm.js terminal so ANSI/VT/OSC sequences — colors,
// tmux redraws, window titles, bracketed paste, shell-integration markers — are
// *interpreted*, not dumped as raw escape bytes (the bug a plain <pre>{output} showed).
// This mirrors the agentic-sandbox dashboard's pty-ws.v1 client: write decoded bytes to
// the terminal, forward keystrokes as pty.session_input, and keep the PTY (tmux) sized
// to the terminal via pty.session_resize.
type WsMsg = { op: string; seq?: number; payload?: { role?: Role; data?: string; code?: string; frames?: { seq: number; payload: { data: string } }[] } };

export interface SessionState { attached: boolean; role: Role; url: string | null }
export interface ResponseNeededState { needed: boolean; prompt: string; since: string | null; source: string }

// The executor rejects resizes below this floor (management/src/ws/connection.rs).
const RESIZE_FLOOR_COLS = 20;
const RESIZE_FLOOR_ROWS = 5;

// Retry-through-readiness window (#1669). A freshly-launched instance can accept
// the attach but stream 0 frames and close within ~2s while its PTY/tmux comes
// up; ~7s of reconnects rides past that without a hard error.
const MAX_READY_RETRIES = 6;
const READY_RETRY_MS = 1200;
const FIRST_FRAME_NOTICE_MS = 2000;
const FIRST_FRAME_DEADLINE_MS = 4000;

const textEnc = new TextEncoder();
const textDec = new TextDecoder();

// base64 → raw bytes. xterm does its own UTF-8 decoding and escape-sequence parsing, so
// it must receive bytes (Uint8Array) — handing it a Latin-1 string is exactly what made
// the escape sequences render as literal text.
const b64ToBytes = (b64: string): Uint8Array => {
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch { return new Uint8Array(0); }
};

// string → base64 of its UTF-8 bytes (so non-ASCII keystrokes/paste survive the round-trip).
const toB64 = (s: string): string => {
  const bytes = textEnc.encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

export function stripTerminalAutoResponses(data: string): string {
  return data
    .replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[\?[0-9;]*[cnhl]/g, '')
    .replace(/\x1b\[[0-9;]*[Rn]/g, '');
}

function stripAnsi(text: string): string {
  return text
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b[()][A-Za-z0-9]/g, '');
}

function interactivePromptFrom(output: string): string {
  const clean = stripAnsi(output).replace(/\r/g, '\n');
  const lines = clean.split('\n').map((line) => line.trim()).filter(Boolean).slice(-24);
  const text = lines.join('\n');
  const promptPatterns = [
    /Enter to select\b/i,
    /(?:↑|up)\/(?:↓|down)|arrow keys|navigate/i,
    /\bEsc to cancel\b/i,
    /\b(?:y\/n|Y\/n|y\/N|\[y\/N\]|\[Y\/n\])\b/,
    /\b(?:choose|select|pick) (?:one|an option|a number)\b/i,
    /\?$/,
  ];
  if (!promptPatterns.some((re) => re.test(text))) return '';
  return lines.slice(-10).join('\n').slice(0, 900);
}

export function useSession() {
  const wsRef = useRef<WebSocket | null>(null);
  const lastSeq = useRef(0);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const roleRef = useRef<Role>(null); // current role, read by term.onData without re-subscribing
  const outputTailRef = useRef('');
  const connectionIdRef = useRef(0);
  // Retry-through-readiness state (#1669): a freshly-launched VM/container can
  // accept the pty-ws attach, send 0 frames, and close within ~2s because the
  // agent's PTY/tmux isn't streamable yet. Rather than show a hard
  // [connection error], reconnect a few times until the first frame arrives.
  const gotFrameRef = useRef(false);   // any output/keyframe seen on the current attach
  const retryRef = useRef(0);          // reconnect attempts since the last user-initiated attach
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstFrameNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstFrameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUserRef = useRef(false); // detach()/new attach — suppress reconnect
  const [state, setState] = useState<SessionState>({ attached: false, role: null, url: null });
  const [responseNeeded, setResponseNeeded] = useState<ResponseNeededState>({ needed: false, prompt: '', since: null, source: 'pty' });

  const fit = () => { try { fitRef.current?.fit(); } catch { /* container hidden / zero-sized */ } };
  const noteOutput = (bytes: Uint8Array) => {
    const text = textDec.decode(bytes, { stream: true });
    if (!text) return;
    outputTailRef.current = (outputTailRef.current + text).slice(-6000);
    const prompt = interactivePromptFrom(outputTailRef.current);
    if (prompt) {
      setResponseNeeded((prev) => (
        prev.needed && prev.prompt === prompt
          ? prev
          : { needed: true, prompt, since: new Date().toISOString(), source: 'pty' }
      ));
    }
  };
  const write = (bytes: Uint8Array) => {
    noteOutput(bytes);
    try { termRef.current?.write(bytes); } catch { /* term not open */ }
  };
  const encodeOp = (op: string, payload?: unknown) => JSON.stringify(payload === undefined ? { op } : { op, payload });
  const sendOp = (op: string, payload?: unknown) => { try { wsRef.current?.send(encodeOp(op, payload)); } catch { /* socket closed */ } };
  const sendOn = (ws: WebSocket, op: string, payload?: unknown) => { try { ws.send(encodeOp(op, payload)); } catch { /* socket closed */ } };
  const clearResponseNeeded = () => setResponseNeeded({ needed: false, prompt: '', since: null, source: 'pty' });
  const clearFirstFrameTimer = () => {
    if (firstFrameNoticeTimerRef.current) {
      clearTimeout(firstFrameNoticeTimerRef.current);
      firstFrameNoticeTimerRef.current = null;
    }
    if (firstFrameTimerRef.current) {
      clearTimeout(firstFrameTimerRef.current);
      firstFrameTimerRef.current = null;
    }
  };

  // Mount the terminal into the host element (ref callback from the Sessions tab).
  // Idempotent: the Terminal is created once and reused across attaches. A ResizeObserver
  // re-fits when the host gains size (the tab starts hidden/zero-sized, then becomes
  // visible) and on any later layout change, keeping the PTY dimensions honest.
  const openTerminal = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    if (!termRef.current) {
      const term = new Terminal({
        convertEol: false, // the PTY/tmux emits its own CR/LF
        scrollback: 2000,
        cursorBlink: false,
        // Read-only until control is granted: observe must not capture keystrokes
        // at all (not just drop them on send). Flipped to false on controller.
        disableStdin: true,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 13,
        theme: { background: '#0a0c10', foreground: '#cdd3de' },
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      termRef.current = term;
      fitRef.current = fitAddon;
      // Forward keystrokes to the PTY only while driving.
      term.onData((data) => {
        if (roleRef.current !== 'controller') return;
        const userData = stripTerminalAutoResponses(data);
        if (!userData) return;
        clearResponseNeeded();
        sendOp('pty.session_input', { data: toB64(userData) });
      });
      // Keep tmux sized to the terminal so redraws don't wrap/overflow.
      term.onResize(({ cols, rows }) => {
        if (roleRef.current !== 'controller') return;
        if (cols < RESIZE_FLOOR_COLS || rows < RESIZE_FLOOR_ROWS) return;
        sendOp('pty.session_resize', { cols, rows });
      });
    }
    try {
      if (!el.querySelector('.xterm')) termRef.current.open(el);
    } catch { /* jsdom / detached node */ }
    if (!roRef.current && typeof ResizeObserver !== 'undefined') {
      roRef.current = new ResizeObserver(() => fit());
      roRef.current.observe(el);
    }
    fit();
    requestAnimationFrame(() => fit());
  }, []);

  // Refit on window resize (ResizeObserver covers container changes; this covers the rest).
  useEffect(() => {
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Dispose on unmount.
  useEffect(() => () => {
    try { roRef.current?.disconnect(); } catch { /* */ }
    try { termRef.current?.dispose(); } catch { /* */ }
    closedByUserRef.current = true;
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    clearFirstFrameTimer();
    connectionIdRef.current += 1;
    wsRef.current?.close();
  }, []);

  const attach = useCallback((url: string, replay = false, requestedRole: Exclude<Role, null> = 'observer') => {
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    clearFirstFrameTimer();
    const connectionId = connectionIdRef.current + 1;
    connectionIdRef.current = connectionId;
    closedByUserRef.current = false;
    retryRef.current = 0;
    gotFrameRef.current = false;
    wsRef.current?.close();
    if (!replay) lastSeq.current = 0;
    roleRef.current = null;
    if (termRef.current) termRef.current.options.disableStdin = true; // read-only until role_assigned grants control
    clearResponseNeeded();
    outputTailRef.current = '';
    setState({ attached: false, role: null, url });
    if (!replay) { try { termRef.current?.reset(); } catch { /* */ } }

    // Open (or re-open, on a readiness retry) the data-plane socket.
    const connect = (replayFromOverride?: number) => {
      if (connectionIdRef.current !== connectionId || closedByUserRef.current) return;
      // Replay is requested in pty.join_session below. Duplicating replay_from
      // in the pty-ws URL makes the gateway emit replay.out_of_range even when
      // the join succeeds and frames stream, so keep the socket URL stable.
      const ws = new WebSocket(url);
      wsRef.current = ws;
      let gone = false; // a failing socket fires BOTH 'error' and 'close' — handle once
      ws.addEventListener('open', () => {
        if (connectionIdRef.current !== connectionId || wsRef.current !== ws) return;
        setState((s) => ({ ...s, attached: true, url }));
        clearFirstFrameTimer();
        firstFrameNoticeTimerRef.current = setTimeout(() => {
          if (connectionIdRef.current !== connectionId || wsRef.current !== ws || closedByUserRef.current || gotFrameRef.current) return;
          write(textEnc.encode('\r\n[attached — no output yet]\r\n'));
        }, FIRST_FRAME_NOTICE_MS);
        firstFrameTimerRef.current = setTimeout(() => {
          if (connectionIdRef.current !== connectionId || wsRef.current !== ws || closedByUserRef.current || gotFrameRef.current) return;
          if (roleRef.current === 'controller') {
            write(textEnc.encode(`\r\n[attached — no output after ${Math.round(FIRST_FRAME_DEADLINE_MS / 1000)}s; requesting repaint]\r\n`));
            sendOn(ws, 'pty.request_keyframe');
            return;
          }
          if (retryRef.current >= MAX_READY_RETRIES) {
            write(textEnc.encode(`\r\n[attached — no output after ${Math.round(FIRST_FRAME_DEADLINE_MS / 1000)}s]\r\n`));
            return;
          }
          retryRef.current += 1;
          write(textEnc.encode(`\r\n[attached — no output after ${Math.round(FIRST_FRAME_DEADLINE_MS / 1000)}s; requesting repaint]\r\n`));
          try { ws.close(); } catch { /* socket may already be closed */ }
          connect(0);
        }, FIRST_FRAME_DEADLINE_MS);
      });
      const onGone = (kind: 'close' | 'error') => {
        if (connectionIdRef.current !== connectionId || wsRef.current !== ws) return;
        if (gone) return;
        gone = true;
        clearFirstFrameTimer();
        roleRef.current = null;
        setState((s) => ({ ...s, attached: false, role: null }));
        // Clean detach, or we were already streaming → leave it (a real end/drop).
        if (closedByUserRef.current || gotFrameRef.current) return;
        // Early empty close/error before the first frame → the agent's PTY isn't
        // streamable yet. Reconnect through the readiness window rather than error.
        if (retryRef.current < MAX_READY_RETRIES) {
          retryRef.current += 1;
          if (retryRef.current === 1) write(textEnc.encode('\r\n[waiting for session…]\r\n'));
          retryTimerRef.current = setTimeout(connect, READY_RETRY_MS);
          return;
        }
        void kind;
        write(textEnc.encode('\r\n[connection error — session did not become ready]\r\n'));
      };
      ws.addEventListener('close', () => onGone('close'));
      ws.addEventListener('error', () => onGone('error'));
      ws.addEventListener('message', (ev) => {
        if (connectionIdRef.current !== connectionId || wsRef.current !== ws) return;
        let m: WsMsg;
        try { m = JSON.parse(ev.data as string); } catch { return; }
        switch (m.op) {
          case 'binding_hello': {
            const replayFrom = replayFromOverride ?? (replay ? lastSeq.current : 0);
            sendOn(ws, 'pty.join_session', { role: requestedRole, replay_from: replayFrom });
            // Tell the PTY our current dimensions up front so the first tmux redraw fits.
            const t = termRef.current;
            if (requestedRole === 'controller' && t && t.cols >= RESIZE_FLOOR_COLS && t.rows >= RESIZE_FLOOR_ROWS) sendOn(ws, 'pty.session_resize', { cols: t.cols, rows: t.rows });
            break;
          }
          case 'role_assigned': {
            const role = m.payload?.role ?? null;
            roleRef.current = role;
            setState((s) => ({ ...s, role }));
            // Only a controller may type into the terminal; observers are read-only.
            if (termRef.current) termRef.current.options.disableStdin = role !== 'controller';
            // The gateway owns replay/keyframe delivery for joined sessions.
            // Avoid probing here: on some backends keyframe requests are
            // controller-gated and create noisy permission errors for observers.
            requestAnimationFrame(() => fit());
            break;
          }
          case 'output':
            clearFirstFrameTimer();
            gotFrameRef.current = true; retryRef.current = 0; // first frame → readiness reached
            if (m.seq) lastSeq.current = Math.max(lastSeq.current, m.seq);
            write(b64ToBytes(m.payload?.data ?? ''));
            break;
          case 'keyframe':
            clearFirstFrameTimer();
            gotFrameRef.current = true; retryRef.current = 0;
            for (const f of m.payload?.frames ?? []) { if (f.seq) lastSeq.current = Math.max(lastSeq.current, f.seq); write(b64ToBytes(f.payload.data)); }
            break;
          case 'error':
            write(textEnc.encode(`\r\n[${m.payload?.code ?? 'error'}]\r\n`));
            break;
        }
      });
    };
    connect();
  }, []);

  const detach = useCallback(() => {
    closedByUserRef.current = true;
    connectionIdRef.current += 1;
    roleRef.current = null;
    if (termRef.current) termRef.current.options.disableStdin = true; // detached → read-only
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    clearFirstFrameTimer();
    wsRef.current?.close();
    wsRef.current = null;
  }, []);
  const replay = useCallback((url: string, requestedRole?: Exclude<Role, null>) => {
    const role = requestedRole ?? roleRef.current ?? 'observer';
    attach(url, true, role);
  }, [attach]);
  const requestKeyframe = useCallback(() => sendOp('pty.request_keyframe'), []);
  // Composer line-input (the input row + Actions inject). Raw keystrokes go via term.onData.
  const sendInput = useCallback((text: string): boolean => {
    if (!wsRef.current || roleRef.current !== 'controller' || !text) return false;
    clearResponseNeeded();
    sendOp('pty.session_input', { data: toB64(text + '\r\n') });
    return true;
  }, []);

  return { state, responseNeeded, attach, detach, replay, requestKeyframe, sendInput, openTerminal, isController: state.role === 'controller' };
}

export type SessionApi = ReturnType<typeof useSession>;
