/**
 * pty-ws/v1 client — speaks the custom A2A binding agentic-sandbox v2
 * publishes at `wss://host/agents/{id}/sessions/{sid}/attach`.
 *
 * Wire format: JSON frames over WebSocket.
 *
 * Server frames (deserialized from text frames):
 *   - binding_hello       — initial handshake; carries session_id, role,
 *                            seq, and the executor-side parameters
 *   - output              — pty stdout/stderr bytes (base64-encoded)
 *   - resize              — terminal resize echo
 *   - role_assigned       — role transition (observer ↔ controller)
 *   - membership_changed  — another attached client joined/left
 *   - keyframe            — full screen snapshot (delivered on
 *                            request_keyframe or after a replay)
 *   - closed              — session has ended; carries exit code + reason
 *   - error               — soft protocol error; payload carries detail
 *
 * Client verbs (sent as text frames):
 *   - pty.join_session
 *   - pty.session_input
 *   - pty.session_resize
 *   - pty.request_keyframe
 *   - pty.request_role
 *   - pty.release_role
 *   - pty.leave_session
 *
 * Subprotocol negotiation: the client requests `pty-ws.v1` via
 * `Sec-WebSocket-Protocol`. The server MUST echo it on the upgrade
 * response. If it does not, this client treats the connection as a
 * negotiation failure and closes — agentic-sandbox issue #240
 * documents the lenient-mode warning, but AIWG's policy is strict.
 *
 * @issue #1257
 */

export const PTY_WS_SUBPROTOCOL = 'pty-ws.v1';

// ── role model ─────────────────────────────────────────────────────────

export type PtyRole = 'controller' | 'observer';

// ── server frames ──────────────────────────────────────────────────────

export interface BindingHelloFrame {
  type: 'binding_hello';
  session_id: string;
  role: PtyRole;
  seq: number;
  /** Initial cols × rows. */
  cols: number;
  rows: number;
  /** Free-form metadata from the executor (binding version, tty type, …). */
  metadata?: Record<string, unknown>;
}

export interface OutputFrame {
  type: 'output';
  seq: number;
  /** Base64-encoded bytes. */
  data: string;
  /** Optional stream tag — present on muxed sessions. */
  stream?: 'stdout' | 'stderr';
}

export interface ResizeFrame {
  type: 'resize';
  seq: number;
  cols: number;
  rows: number;
}

export interface RoleAssignedFrame {
  type: 'role_assigned';
  seq: number;
  role: PtyRole;
  /** Optional reason — e.g. 'controller_released', 'admin_revoked'. */
  reason?: string;
}

export interface MembershipChangedFrame {
  type: 'membership_changed';
  seq: number;
  members: Array<{ client_id: string; role: PtyRole; joined_at: string }>;
}

export interface KeyframeFrame {
  type: 'keyframe';
  seq: number;
  /** Full terminal contents — base64 of the screen-state replay. */
  data: string;
  cols: number;
  rows: number;
}

export interface ClosedFrame {
  type: 'closed';
  seq: number;
  exit_code?: number;
  reason?: string;
}

export interface ErrorFrame {
  type: 'error';
  seq: number;
  code: string;
  detail?: string;
}

export type ServerFrame =
  | BindingHelloFrame
  | OutputFrame
  | ResizeFrame
  | RoleAssignedFrame
  | MembershipChangedFrame
  | KeyframeFrame
  | ClosedFrame
  | ErrorFrame;

// ── client verbs ───────────────────────────────────────────────────────

export interface JoinSessionVerb {
  verb: 'pty.join_session';
  session_id?: string;
  /** Initial cols × rows the client wants — server may clamp. */
  cols?: number;
  rows?: number;
  /** Replay from this sequence on reconnect. */
  replay_from?: number;
}

export interface SessionInputVerb {
  verb: 'pty.session_input';
  /** Base64-encoded bytes typed by the operator. */
  data: string;
}

export interface SessionResizeVerb {
  verb: 'pty.session_resize';
  cols: number;
  rows: number;
}

export interface RequestKeyframeVerb {
  verb: 'pty.request_keyframe';
}

export interface RequestRoleVerb {
  verb: 'pty.request_role';
  role: PtyRole;
}

export interface ReleaseRoleVerb {
  verb: 'pty.release_role';
}

export interface LeaveSessionVerb {
  verb: 'pty.leave_session';
}

export type ClientVerb =
  | JoinSessionVerb
  | SessionInputVerb
  | SessionResizeVerb
  | RequestKeyframeVerb
  | RequestRoleVerb
  | ReleaseRoleVerb
  | LeaveSessionVerb;

// ── client API ─────────────────────────────────────────────────────────

export interface PtyWsClientOptions {
  /** Full wss:// URL including agent + session path. */
  url: string;
  /** Optional bearer token — appended as `?token=` if the URL has no auth. */
  token?: string;
  /** Resume from this sequence on reconnect. */
  replayFrom?: number;
  /** Inject a WebSocket constructor for testing. */
  WebSocketImpl?: typeof WebSocket;
  /** Initial cols × rows to request. */
  cols?: number;
  rows?: number;
}

export interface PtyWsClientEvents {
  onOpen?: (hello: BindingHelloFrame) => void;
  onOutput?: (frame: OutputFrame) => void;
  onResize?: (frame: ResizeFrame) => void;
  onRoleAssigned?: (frame: RoleAssignedFrame) => void;
  onMembershipChanged?: (frame: MembershipChangedFrame) => void;
  onKeyframe?: (frame: KeyframeFrame) => void;
  onClosed?: (frame: ClosedFrame) => void;
  onError?: (frame: ErrorFrame | Error) => void;
  /** Fired whenever the role flips (observer ↔ controller). */
  onRoleChange?: (role: PtyRole) => void;
}

/**
 * pty-ws/v1 client. Wraps WebSocket, validates the subprotocol echo,
 * tracks the current role + last-seen seq, and exposes a small typed
 * API for sending client verbs.
 *
 * Reconnect strategy: the client itself does NOT auto-reconnect — that
 * concern is owned by the caller (ReconnectingWs or React effect). On
 * reconnect, pass the last-seen seq as `replayFrom` to resume.
 */
export class PtyWsClient {
  readonly url: string;
  private ws: WebSocket | null = null;
  private events: PtyWsClientEvents = {};
  private role: PtyRole = 'observer';
  private lastSeq = 0;
  private sessionId: string | null = null;
  private readonly initialReplayFrom: number | undefined;
  private readonly desiredCols: number | undefined;
  private readonly desiredRows: number | undefined;
  private readonly WebSocketImpl: typeof WebSocket;
  private closed = false;

  constructor(opts: PtyWsClientOptions) {
    this.url = opts.replayFrom !== undefined ? appendQuery(opts.url, 'replay_from', String(opts.replayFrom)) : opts.url;
    if (opts.token) {
      this.url = appendQuery(this.url, 'token', opts.token);
    }
    this.initialReplayFrom = opts.replayFrom;
    this.desiredCols = opts.cols;
    this.desiredRows = opts.rows;
    this.WebSocketImpl = opts.WebSocketImpl ?? (globalThis.WebSocket as typeof WebSocket);
  }

  on(handlers: PtyWsClientEvents): this {
    this.events = { ...this.events, ...handlers };
    return this;
  }

  /** Current role (controller / observer). */
  getRole(): PtyRole {
    return this.role;
  }

  /** Last-seen seq — pass to a fresh client on reconnect as replayFrom. */
  getLastSeq(): number {
    return this.lastSeq;
  }

  /** True iff the WebSocket is in OPEN state. */
  isOpen(): boolean {
    return this.ws?.readyState === 1; // WebSocket.OPEN
  }

  /** Connect; resolves when the WebSocket reaches OPEN. */
  async connect(): Promise<void> {
    if (this.ws) throw new Error('pty-ws client already connected');
    this.closed = false;
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const ws = new this.WebSocketImpl(this.url, [PTY_WS_SUBPROTOCOL]);
      this.ws = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        // Strict subprotocol negotiation — the server MUST echo our
        // requested subprotocol. agentic-sandbox #240 documents the
        // lenient-mode warning. AIWG closes on mismatch.
        if (ws.protocol !== PTY_WS_SUBPROTOCOL) {
          settled = true;
          ws.close(
            4400,
            `subprotocol mismatch — expected '${PTY_WS_SUBPROTOCOL}', got '${ws.protocol || '<none>'}'`
          );
          reject(
            new Error(
              `pty-ws subprotocol negotiation failed (server returned '${ws.protocol || '<none>'}')`
            )
          );
          return;
        }

        // Send the join verb. The server replies with binding_hello.
        const verb: JoinSessionVerb = { verb: 'pty.join_session' };
        if (this.initialReplayFrom !== undefined) verb.replay_from = this.initialReplayFrom;
        if (this.desiredCols !== undefined) verb.cols = this.desiredCols;
        if (this.desiredRows !== undefined) verb.rows = this.desiredRows;
        ws.send(JSON.stringify(verb));

        settled = true;
        resolve();
      };

      ws.onmessage = (ev: MessageEvent) => {
        try {
          const frame = parseServerFrame(ev.data);
          if (!frame) return;
          this.dispatch(frame);
        } catch (e) {
          this.events.onError?.(e instanceof Error ? e : new Error(String(e)));
        }
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error('pty-ws WebSocket error during connect'));
        }
      };

      ws.onclose = (ev: CloseEvent) => {
        if (this.closed) return;
        this.closed = true;
        // Emit a synthetic closed frame so callers always see one.
        const synthetic: ClosedFrame = {
          type: 'closed',
          seq: this.lastSeq,
          reason: ev.reason || 'websocket_closed',
        };
        this.events.onClosed?.(synthetic);
      };
    });
  }

  // ── client verbs ────────────────────────────────────────────────────

  sendInput(dataBytes: ArrayBuffer | Uint8Array | string): void {
    this.assertController('pty.session_input');
    const data = encodeData(dataBytes);
    const verb: SessionInputVerb = { verb: 'pty.session_input', data };
    this.send(verb);
  }

  resize(cols: number, rows: number): void {
    this.assertController('pty.session_resize');
    this.send({ verb: 'pty.session_resize', cols, rows });
  }

  requestKeyframe(): void {
    this.send({ verb: 'pty.request_keyframe' });
  }

  requestRole(role: PtyRole): void {
    this.send({ verb: 'pty.request_role', role });
  }

  releaseRole(): void {
    this.send({ verb: 'pty.release_role' });
  }

  leave(): void {
    this.send({ verb: 'pty.leave_session' });
  }

  close(): void {
    this.closed = true;
    this.ws?.close(1000, 'client_close');
    this.ws = null;
  }

  // ── internal ────────────────────────────────────────────────────────

  private send(verb: ClientVerb): void {
    if (!this.ws || this.ws.readyState !== 1) {
      throw new Error(`pty-ws send: not connected (verb=${verb.verb})`);
    }
    this.ws.send(JSON.stringify(verb));
  }

  private dispatch(frame: ServerFrame): void {
    if (typeof frame.seq === 'number') this.lastSeq = frame.seq;

    switch (frame.type) {
      case 'binding_hello': {
        this.sessionId = frame.session_id;
        this.role = frame.role;
        this.events.onOpen?.(frame);
        this.events.onRoleChange?.(frame.role);
        return;
      }
      case 'output':
        this.events.onOutput?.(frame);
        return;
      case 'resize':
        this.events.onResize?.(frame);
        return;
      case 'role_assigned': {
        if (frame.role !== this.role) {
          this.role = frame.role;
          this.events.onRoleChange?.(frame.role);
        }
        this.events.onRoleAssigned?.(frame);
        return;
      }
      case 'membership_changed':
        this.events.onMembershipChanged?.(frame);
        return;
      case 'keyframe':
        this.events.onKeyframe?.(frame);
        return;
      case 'closed':
        this.closed = true;
        this.events.onClosed?.(frame);
        return;
      case 'error':
        this.events.onError?.(frame);
        return;
    }
  }

  private assertController(verbName: string): void {
    if (this.role !== 'controller') {
      throw new Error(
        `pty-ws: ${verbName} requires controller role (current: ${this.role})`
      );
    }
  }
}

// ── helpers (exported for testability) ────────────────────────────────

/**
 * Parse a server frame from a WebSocket message. Returns null for
 * unknown / malformed frames so callers can choose whether to log or
 * ignore.
 */
export function parseServerFrame(raw: unknown): ServerFrame | null {
  if (typeof raw !== 'string') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as { type?: unknown };
  if (typeof p.type !== 'string') return null;
  const types = new Set([
    'binding_hello',
    'output',
    'resize',
    'role_assigned',
    'membership_changed',
    'keyframe',
    'closed',
    'error',
  ]);
  if (!types.has(p.type)) return null;
  return parsed as ServerFrame;
}

export function appendQuery(url: string, key: string, value: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function encodeData(d: ArrayBuffer | Uint8Array | string): string {
  if (typeof d === 'string') {
    return base64(new TextEncoder().encode(d));
  }
  if (d instanceof Uint8Array) return base64(d);
  return base64(new Uint8Array(d));
}

function base64(bytes: Uint8Array): string {
  // Browser-safe base64; falls back to manual for non-DOM env (tests).
  if (typeof btoa === 'function') {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
    return btoa(bin);
  }
  // Node fallback path — used by test environment.
  return Buffer.from(bytes).toString('base64');
}

export function decodeBase64Bytes(s: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(s, 'base64'));
}
