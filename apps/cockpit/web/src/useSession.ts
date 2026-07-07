import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import type { Role } from './types';

// The pty session connections, lifted to App so the Sessions tab renders them and the
// Actions tab can inject into the active one. Data plane is browser→executor (the
// attach_url the Bridge issues); control plane stays on the Bridge.
//
// Each (instance, session) keeps its OWN persistent xterm Terminal + WebSocket, mounted
// once and hidden (not torn down) when another session is shown. Switching sessions is a
// show/hide — the socket stays connected and the terminal keeps its scrollback — so
// history is preserved and the current screen is already painted (no reset, no re-attach,
// no "press enter to repaint"). This is the per-session-terminal model (#1749) that
// replaced the earlier single-terminal-reset-on-switch design.
//
// Output is rendered through xterm.js so ANSI/VT/OSC sequences — colors, tmux redraws,
// window titles, bracketed paste, shell-integration markers — are *interpreted*, not
// dumped as raw escape bytes.
type WsMsg = { op: string; seq?: number; payload?: { role?: Role; data?: string; code?: string; frames?: { seq: number; payload: { data: string } }[] } };

export interface SessionTarget { instanceId: string; sessionId: string }
export interface SessionState { attached: boolean; role: Role; url: string | null; target: SessionTarget | null }
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
// it must receive bytes (Uint8Array) — a Latin-1 string renders escapes as literal text.
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

export function sessionTargetFromAttachUrl(url: string | null): SessionTarget | null {
  if (!url) return null;
  const pattern = /\/agents\/([^/]+)\/sessions\/([^/]+)\/attach/;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(pattern);
    return match ? { instanceId: decodeURIComponent(match[1]), sessionId: decodeURIComponent(match[2]) } : null;
  } catch {
    const match = url.match(pattern);
    return match ? { instanceId: decodeURIComponent(match[1]), sessionId: decodeURIComponent(match[2]) } : null;
  }
}

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

function targetKey(t: SessionTarget | null, url: string): string {
  return t ? `${t.instanceId}:${t.sessionId}` : `url:${url}`;
}

type PromptSink = (r: ResponseNeededState | null) => void;

// One persistent PTY connection: its own Terminal, wrapper element, and WebSocket, with
// the readiness-retry lifecycle (#1669/#1746). Created once per session and kept alive —
// hidden, not disposed — when another session is shown, so scrollback and the live stream
// survive session switches.
class PtyConnection {
  readonly term: Terminal;
  readonly fit: FitAddon;
  readonly wrapper: HTMLDivElement;
  url: string;
  target: SessionTarget | null;
  role: Role = null;
  attached = false;
  private ws: WebSocket | null = null;
  private lastSeq = 0;
  private connId = 0;
  private closedByUser = false;
  private gotFrame = false;
  private retries = 0;
  private outputTail = '';
  private ro: ResizeObserver | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  private deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  disposed = false;

  constructor(
    url: string,
    target: SessionTarget | null,
    private readonly onChange: () => void,
    private readonly onPrompt: PromptSink,
    private readonly isActive: () => boolean,
  ) {
    this.url = url;
    this.target = target;
    this.term = new Terminal({
      convertEol: false,
      scrollback: 5000,
      cursorBlink: false,
      disableStdin: true, // read-only until role_assigned grants control
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 13,
      theme: { background: '#0a0c10', foreground: '#cdd3de' },
    });
    this.fit = new FitAddon();
    this.term.loadAddon(this.fit);
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'pty-surface';
    this.wrapper.style.width = '100%';
    this.wrapper.style.height = '100%';
    try { this.term.open(this.wrapper); } catch { /* jsdom */ }
    this.term.onData((data) => {
      if (this.role !== 'controller') return;
      const userData = stripTerminalAutoResponses(data);
      if (!userData) return;
      if (this.isActive()) this.onPrompt(null);
      this.send('pty.session_input', { data: toB64(userData) });
    });
    this.term.onResize(({ cols, rows }) => {
      if (this.role !== 'controller') return;
      if (cols < RESIZE_FLOOR_COLS || rows < RESIZE_FLOOR_ROWS) return;
      this.send('pty.session_resize', { cols, rows });
    });
  }

  private fitSafe() { try { this.fit.fit(); } catch { /* hidden / zero-sized */ } }

  private write(bytes: Uint8Array) {
    const text = textDec.decode(bytes, { stream: true });
    if (text) {
      this.outputTail = (this.outputTail + text).slice(-6000);
      const prompt = interactivePromptFrom(this.outputTail);
      if (prompt && this.isActive()) {
        this.onPrompt({ needed: true, prompt, since: new Date().toISOString(), source: 'pty' });
      }
    }
    try { this.term.write(bytes); } catch { /* term not open */ }
  }

  private send(op: string, payload?: unknown) {
    try { this.ws?.send(JSON.stringify(payload === undefined ? { op } : { op, payload })); } catch { /* closed */ }
  }
  private sendOn(ws: WebSocket, op: string, payload?: unknown) {
    try { ws.send(JSON.stringify(payload === undefined ? { op } : { op, payload })); } catch { /* closed */ }
  }

  private clearTimers() {
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; }
    if (this.noticeTimer) { clearTimeout(this.noticeTimer); this.noticeTimer = null; }
    if (this.deadlineTimer) { clearTimeout(this.deadlineTimer); this.deadlineTimer = null; }
  }
  private clearFrameTimers() {
    if (this.noticeTimer) { clearTimeout(this.noticeTimer); this.noticeTimer = null; }
    if (this.deadlineTimer) { clearTimeout(this.deadlineTimer); this.deadlineTimer = null; }
  }

  // Reflect visibility. Only the shown surface gets laid out + refit.
  setVisible(visible: boolean) {
    this.wrapper.style.display = visible ? 'block' : 'none';
    if (visible) {
      this.fitSafe();
      requestAnimationFrame(() => this.fitSafe());
    }
  }

  onContainerResize() { if (this.wrapper.style.display !== 'none') this.fitSafe(); }

  // Connect (or re-join, e.g. observer→controller upgrade or a manual replay). Idempotent
  // enough to call again on the same live connection to re-request role/replay.
  connect(requestedRole: Exclude<Role, null>, replay: boolean, replayFromOverride?: number) {
    this.clearTimers();
    const connId = ++this.connId;
    this.closedByUser = false;
    this.retries = 0;
    this.gotFrame = false;
    this.ws?.close();
    if (!replay) { this.lastSeq = 0; this.outputTail = ''; try { this.term.reset(); } catch { /* */ } }
    this.role = null;
    this.term.options.disableStdin = true;
    this.attached = false;
    if (this.isActive()) this.onPrompt(null);
    this.onChange();

    const open = () => {
      if (this.connId !== connId || this.closedByUser || this.disposed) return;
      const ws = new WebSocket(this.url);
      this.ws = ws;
      let gone = false;
      ws.addEventListener('open', () => {
        if (this.connId !== connId || this.ws !== ws) return;
        this.attached = true;
        this.onChange();
        this.clearFrameTimers();
        this.noticeTimer = setTimeout(() => {
          if (this.connId !== connId || this.ws !== ws || this.closedByUser || this.gotFrame) return;
          this.write(textEnc.encode('\r\n[attached — no output yet]\r\n'));
        }, FIRST_FRAME_NOTICE_MS);
        this.deadlineTimer = setTimeout(() => {
          if (this.connId !== connId || this.ws !== ws || this.closedByUser || this.gotFrame) return;
          if (this.role === 'controller') {
            this.write(textEnc.encode(`\r\n[attached — no output after ${Math.round(FIRST_FRAME_DEADLINE_MS / 1000)}s; requesting repaint]\r\n`));
            this.sendOn(ws, 'pty.request_keyframe');
            return;
          }
          if (this.retries >= MAX_READY_RETRIES) {
            this.write(textEnc.encode(`\r\n[attached — no output after ${Math.round(FIRST_FRAME_DEADLINE_MS / 1000)}s]\r\n`));
            return;
          }
          this.retries += 1;
          this.write(textEnc.encode(`\r\n[attached — no output after ${Math.round(FIRST_FRAME_DEADLINE_MS / 1000)}s; requesting repaint]\r\n`));
          try { ws.close(); } catch { /* */ }
          open();
        }, FIRST_FRAME_DEADLINE_MS);
      });
      const onGone = () => {
        if (this.connId !== connId || this.ws !== ws || gone) return;
        gone = true;
        this.clearFrameTimers();
        this.role = null;
        this.attached = false;
        this.onChange();
        if (this.closedByUser || this.gotFrame) return;
        if (this.retries < MAX_READY_RETRIES) {
          this.retries += 1;
          if (this.retries === 1) this.write(textEnc.encode('\r\n[waiting for session…]\r\n'));
          this.retryTimer = setTimeout(open, READY_RETRY_MS);
          return;
        }
        this.write(textEnc.encode('\r\n[connection error — session did not become ready]\r\n'));
      };
      ws.addEventListener('close', onGone);
      ws.addEventListener('error', onGone);
      ws.addEventListener('message', (ev) => {
        if (this.connId !== connId || this.ws !== ws) return;
        let m: WsMsg;
        try { m = JSON.parse((ev as MessageEvent).data as string); } catch { return; }
        switch (m.op) {
          case 'binding_hello': {
            const replayFrom = replayFromOverride ?? (replay ? this.lastSeq : 0);
            this.sendOn(ws, 'pty.join_session', { role: requestedRole, replay_from: replayFrom });
            if (requestedRole === 'controller' && this.term.cols >= RESIZE_FLOOR_COLS && this.term.rows >= RESIZE_FLOOR_ROWS) {
              this.sendOn(ws, 'pty.session_resize', { cols: this.term.cols, rows: this.term.rows });
            }
            break;
          }
          case 'role_assigned': {
            const role = m.payload?.role ?? null;
            this.role = role;
            this.term.options.disableStdin = role !== 'controller';
            this.onChange();
            requestAnimationFrame(() => this.fitSafe());
            break;
          }
          case 'output':
            this.clearFrameTimers();
            this.gotFrame = true; this.retries = 0;
            if (m.seq) this.lastSeq = Math.max(this.lastSeq, m.seq);
            this.write(b64ToBytes(m.payload?.data ?? ''));
            break;
          case 'keyframe':
            this.clearFrameTimers();
            this.gotFrame = true; this.retries = 0;
            for (const f of m.payload?.frames ?? []) { if (f.seq) this.lastSeq = Math.max(this.lastSeq, f.seq); this.write(b64ToBytes(f.payload.data)); }
            break;
          case 'error':
            this.write(textEnc.encode(`\r\n[${m.payload?.code ?? 'error'}]\r\n`));
            break;
        }
      });
    };
    open();
  }

  requestKeyframe() { this.send('pty.request_keyframe'); }

  sendInput(text: string): boolean {
    if (!this.ws || this.role !== 'controller' || !text) return false;
    if (this.isActive()) this.onPrompt(null);
    this.send('pty.session_input', { data: toB64(text + '\r\n') });
    return true;
  }

  // Detach the live socket but keep the terminal buffer (used when the whole session ends).
  close() {
    this.closedByUser = true;
    this.connId += 1;
    this.role = null;
    this.attached = false;
    this.term.options.disableStdin = true;
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
    this.onChange();
  }

  dispose() {
    this.disposed = true;
    this.close();
    try { this.ro?.disconnect(); } catch { /* */ }
    try { this.term.dispose(); } catch { /* */ }
    try { this.wrapper.remove(); } catch { /* */ }
  }

  observe(container: HTMLElement) {
    if (this.ro || typeof ResizeObserver === 'undefined') return;
    this.ro = new ResizeObserver(() => this.onContainerResize());
    this.ro.observe(container);
  }
}

export function useSession() {
  const connsRef = useRef<Map<string, PtyConnection>>(new Map());
  const activeKeyRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<SessionState>({ attached: false, role: null, url: null, target: null });
  const [responseNeeded, setResponseNeeded] = useState<ResponseNeededState>({ needed: false, prompt: '', since: null, source: 'pty' });

  const active = () => connsRef.current.get(activeKeyRef.current) ?? null;

  const syncState = useCallback(() => {
    const c = connsRef.current.get(activeKeyRef.current);
    if (!c) { setState({ attached: false, role: null, url: null, target: null }); return; }
    setState({ attached: c.attached, role: c.role, url: c.url, target: c.target });
  }, []);

  const setPrompt = useCallback((r: ResponseNeededState | null) => {
    setResponseNeeded(r ?? { needed: false, prompt: '', since: null, source: 'pty' });
  }, []);

  const showOnly = useCallback((key: string) => {
    activeKeyRef.current = key;
    for (const [k, c] of connsRef.current) c.setVisible(k === key);
    setPrompt(null);
    syncState();
  }, [setPrompt, syncState]);

  const attach = useCallback((url: string, replay = false, requestedRole: Exclude<Role, null> = 'observer', target?: SessionTarget | null) => {
    const tgt = target ?? sessionTargetFromAttachUrl(url);
    const key = targetKey(tgt, url);
    let conn = connsRef.current.get(key);
    if (!conn) {
      conn = new PtyConnection(url, tgt, syncState, setPrompt, () => activeKeyRef.current === key);
      connsRef.current.set(key, conn);
      if (containerRef.current) {
        containerRef.current.appendChild(conn.wrapper);
        conn.observe(containerRef.current);
      }
      conn.connect(requestedRole, replay);
    } else {
      // Existing session: keep it alive. Re-join only when this is an explicit
      // replay (repaint) or a role upgrade — otherwise just re-show it, preserving
      // its scrollback and live stream.
      conn.url = url;
      if (replay || (requestedRole === 'controller' && conn.role !== 'controller')) {
        conn.connect(requestedRole, replay);
      }
    }
    showOnly(key);
  }, [showOnly, setPrompt, syncState]);

  const detach = useCallback(() => {
    const c = active();
    if (!c) return;
    const key = activeKeyRef.current;
    c.dispose();
    connsRef.current.delete(key);
    // Fall back to any other live session, else nothing.
    const next = connsRef.current.keys().next();
    if (!next.done) showOnly(next.value);
    else { activeKeyRef.current = ''; setPrompt(null); syncState(); }
  }, [showOnly, setPrompt, syncState]);

  const replay = useCallback((url: string, requestedRole?: Exclude<Role, null>, target?: SessionTarget | null) => {
    const tgt = target ?? sessionTargetFromAttachUrl(url);
    const existing = connsRef.current.get(targetKey(tgt, url));
    const role = requestedRole ?? existing?.role ?? 'observer';
    attach(url, true, role, tgt);
  }, [attach]);

  const requestKeyframe = useCallback(() => { active()?.requestKeyframe(); }, []);

  const sendInput = useCallback((text: string, target?: SessionTarget | null): boolean => {
    const c = active();
    if (!c) return false;
    if (target && (!c.target || c.target.instanceId !== target.instanceId || c.target.sessionId !== target.sessionId)) {
      try { c.term.write(textEnc.encode(`\r\n[inject refused: target ${target.instanceId}:${target.sessionId} does not match attached session ${c.target ? `${c.target.instanceId}:${c.target.sessionId}` : 'none'}]\r\n`)); } catch { /* */ }
      return false;
    }
    return c.sendInput(text);
  }, []);

  // Container ref from the Sessions tab. Per-session terminals are appended here; only the
  // active one is shown. Reparents any connections created before the container mounted.
  const openTerminal = useCallback((el: HTMLDivElement | null) => {
    if (!el) { containerRef.current = null; return; }
    containerRef.current = el;
    for (const [k, c] of connsRef.current) {
      if (c.wrapper.parentElement !== el) el.appendChild(c.wrapper);
      c.observe(el);
      c.setVisible(k === activeKeyRef.current);
    }
  }, []);

  useEffect(() => {
    const onResize = () => { for (const c of connsRef.current.values()) c.onContainerResize(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const conns = connsRef.current;
  useEffect(() => () => {
    for (const c of conns.values()) c.dispose();
    conns.clear();
  }, [conns]);

  return { state, responseNeeded, attach, detach, replay, requestKeyframe, sendInput, openTerminal, isController: state.role === 'controller' };
}

export type SessionApi = ReturnType<typeof useSession>;
