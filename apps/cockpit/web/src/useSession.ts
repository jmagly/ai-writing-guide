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

// The executor rejects resizes below this floor (management/src/ws/connection.rs).
const RESIZE_FLOOR_COLS = 20;
const RESIZE_FLOOR_ROWS = 5;

const textEnc = new TextEncoder();

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

export function useSession() {
  const wsRef = useRef<WebSocket | null>(null);
  const lastSeq = useRef(0);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const roleRef = useRef<Role>(null); // current role, read by term.onData without re-subscribing
  const [state, setState] = useState<SessionState>({ attached: false, role: null, url: null });

  const fit = () => { try { fitRef.current?.fit(); } catch { /* container hidden / zero-sized */ } };
  const write = (bytes: Uint8Array) => { try { termRef.current?.write(bytes); } catch { /* term not open */ } };
  const sendOp = (op: string, payload?: unknown) => { try { wsRef.current?.send(JSON.stringify(payload === undefined ? { op } : { op, payload })); } catch { /* socket closed */ } };

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
        sendOp('pty.session_input', { data: toB64(data) });
      });
      // Keep tmux sized to the terminal so redraws don't wrap/overflow.
      term.onResize(({ cols, rows }) => {
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
    wsRef.current?.close();
  }, []);

  const attach = useCallback((url: string, replay = false, requestedRole: Exclude<Role, null> = 'observer') => {
    wsRef.current?.close();
    if (!replay) lastSeq.current = 0;
    roleRef.current = null;
    setState({ attached: false, role: null, url });
    if (!replay) { try { termRef.current?.reset(); } catch { /* */ } }
    const ws = new WebSocket(replay ? `${url}?replay_from=${lastSeq.current}` : url);
    wsRef.current = ws;
    ws.addEventListener('open', () => setState((s) => ({ ...s, attached: true, url })));
    ws.addEventListener('close', () => { roleRef.current = null; setState((s) => ({ ...s, attached: false, role: null })); });
    ws.addEventListener('error', () => write(textEnc.encode('\r\n[connection error]\r\n')));
    ws.addEventListener('message', (ev) => {
      let m: WsMsg;
      try { m = JSON.parse(ev.data as string); } catch { return; }
      switch (m.op) {
        case 'binding_hello': {
          sendOp('pty.join_session', { role: requestedRole });
          // Tell the PTY our current dimensions up front so the first tmux redraw fits.
          const t = termRef.current;
          if (t && t.cols >= RESIZE_FLOOR_COLS && t.rows >= RESIZE_FLOOR_ROWS) sendOp('pty.session_resize', { cols: t.cols, rows: t.rows });
          break;
        }
        case 'role_assigned':
          roleRef.current = m.payload?.role ?? null;
          setState((s) => ({ ...s, role: m.payload?.role ?? null }));
          break;
        case 'output':
          if (m.seq) lastSeq.current = Math.max(lastSeq.current, m.seq);
          write(b64ToBytes(m.payload?.data ?? ''));
          break;
        case 'keyframe':
          for (const f of m.payload?.frames ?? []) { if (f.seq) lastSeq.current = Math.max(lastSeq.current, f.seq); write(b64ToBytes(f.payload.data)); }
          break;
        case 'error':
          write(textEnc.encode(`\r\n[${m.payload?.code ?? 'error'}]\r\n`));
          break;
      }
    });
  }, []);

  const detach = useCallback(() => { wsRef.current?.close(); wsRef.current = null; }, []);
  const replay = useCallback((url: string) => { detach(); setTimeout(() => attach(url, true, 'observer'), 50); }, [attach, detach]);
  const requestKeyframe = useCallback(() => sendOp('pty.request_keyframe'), []);
  // Composer line-input (the input row + Actions inject). Raw keystrokes go via term.onData.
  const sendInput = useCallback((text: string): boolean => {
    if (!wsRef.current || roleRef.current !== 'controller' || !text) return false;
    sendOp('pty.session_input', { data: toB64(text + '\r\n') });
    return true;
  }, []);

  return { state, attach, detach, replay, requestKeyframe, sendInput, openTerminal, isController: state.role === 'controller' };
}

export type SessionApi = ReturnType<typeof useSession>;
