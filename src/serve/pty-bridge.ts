/**
 * WebSocket PTY Bridge
 *
 * Bridges browser WebSocket connections to PTY sessions. Three modes:
 *
 * Phase 1 (local exec): spawns commands using node-pty.
 * Phase 2a (sandbox WS): bridges to agentic-sandbox management WebSocket.
 *   Connects to the sandbox's management WS server, subscribes to an agent,
 *   starts an interactive shell, and multicasts PTY output to all browser clients.
 *   Leverages the sandbox's tokio broadcast channel for zero-copy multicast.
 * Phase 2b (sandbox REST, deprecated): polls /api/v1/tasks log endpoint.
 *
 * Browser ↔ serve protocol:
 *   Client → Server: { type: 'data', payload: string }    — stdin to PTY
 *   Client → Server: { type: 'resize', cols: number, rows: number }
 *   Client → Server: { type: 'close' }                    — request graceful shutdown
 *   Server → Client: { type: 'data', payload: string }    — stdout/stderr from PTY
 *   Server → Client: { type: 'exit', code: number }       — PTY process exited
 *   Server → Client: { type: 'error', message: string }   — error notification
 *
 * Sandbox management WS protocol (agentic-sandbox):
 *   → { type: 'subscribe',     agent_id }
 *   → { type: 'start_shell',   agent_id, cols, rows }
 *   → { type: 'list_sessions', agent_id }                       — resolves session_name (#901)
 *   → { type: 'send_input',    agent_id, command_id, data }
 *   → { type: 'pty_resize',    agent_id, command_id, cols, rows }
 *   → { type: 'kill_session',  agent_id, session_name }         — must use session_name, not command_id
 *   ← { type: 'shell_started', agent_id, command_id }           — idempotent: same cmd_id on reconnect (#903)
 *   ← { type: 'session_list',  agent_id, sessions[] }           — provides session_name for kill (#901)
 *   ← { type: 'output',        agent_id, command_id, stream, data, ts, seq? }
 *   ← { type: 'session_killed' | 'session_detached', agent_id, exit_code? }
 *
 * Replay-on-attach (#1144). After `shell_started`, AIWG sends:
 *   → { type: 'join_session', agent_id, command_id, replay_from }
 * and the sandbox emits buffered output frames carrying `seq`. AIWG prepends
 * `\x1bc` (full terminal reset) ahead of the first replay frame so xterm.js
 * agrees with tmux on the starting cursor/screen state, eliminating the
 * first-frame alignment glitch. On unexpected disconnect, the bridge resumes
 * from the last observed seq instead of replaying from zero.
 *
 * Capability negotiation (operator review on #1144, 2026-05-07): the original
 * implementation gated this strictly on the sandbox advertising `join_session`
 * + `replay_buffer` in a server-hello banner (agentic-sandbox#190). That
 * banner doesn't ship today, so the gate kept replay disabled even on
 * sandboxes that fully support it. The bridge now uses an opportunistic
 * probe: if the banner explicitly signals support, replay is enabled; if the
 * banner is absent, the bridge sends `join_session` anyway and treats an
 * `error` response with an "unknown" / "not supported" / "session not found"
 * message as the negative signal. Either path is logged so an operator can
 * tell from `aiwg serve` output which mode the bridge is running in.
 *
 * @issue #712
 * @issue #1144 — replay session history when AIWG attaches to running session
 * @see #657 — agentic-sandbox PTY transport
 * @see #711 — HTTP server scaffold
 */

// ============================================================
// Types
// ============================================================

export interface WsMessage {
  type: 'data' | 'resize' | 'close' | 'exit' | 'error';
  payload?: string;
  message?: string;
  cols?: number;
  rows?: number;
  code?: number;
}

export interface PtySession {
  id: string;
  /** Connected WebSocket clients (wsId → ws) */
  clients: Map<string, WebSocketLike>;
  /** Recent output buffer for reconnect replay (max OUTPUT_BUFFER_MAX chars) */
  outputBuffer: string;
  /** Underlying IPty instance (node-pty) */
  pty: PtyLike | null;
  /** Timestamp of last client disconnect (for cleanup) */
  lastDisconnect: number;
  /** Whether the PTY process has exited */
  exited: boolean;
}

/** Minimal WebSocket interface for dependency injection / testing */
export interface WebSocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  readonly readyState: number;
}

/** Minimal IPty interface (subset of node-pty IPty) */
export interface PtyLike {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
  onData(callback: (data: string) => void): void;
  onExit(callback: (event: { exitCode: number }) => void): void;
}

// ============================================================
// Constants
// ============================================================

const OUTPUT_BUFFER_MAX = 64 * 1024; // 64 KB replay buffer per session
const SESSION_TTL_MS = 30_000;       // 30 s before orphaned session is cleaned up

// ============================================================
// Session Registry
// ============================================================

export class PtySessionRegistry {
  private sessions = new Map<string, PtySession>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Periodically clean up orphaned sessions
    this.cleanupTimer = setInterval(() => this.evictExpired(), SESSION_TTL_MS);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  get(id: string): PtySession | undefined {
    return this.sessions.get(id);
  }

  create(id: string): PtySession {
    const session: PtySession = {
      id,
      clients: new Map(),
      outputBuffer: '',
      pty: null,
      lastDisconnect: 0,
      exited: false,
    };
    this.sessions.set(id, session);
    return session;
  }

  delete(id: string): void {
    const session = this.sessions.get(id);
    if (session?.pty) {
      try { session.pty.kill(); } catch { /* ignore */ }
    }
    this.sessions.delete(id);
  }

  addClient(sessionId: string, clientId: string, ws: WebSocketLike): void {
    const session = this.sessions.get(sessionId);
    if (session) session.clients.set(clientId, ws);
  }

  removeClient(sessionId: string, clientId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.clients.delete(clientId);
    if (session.clients.size === 0) {
      session.lastDisconnect = Date.now();
    }
  }

  appendOutput(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.outputBuffer += data;
    if (session.outputBuffer.length > OUTPUT_BUFFER_MAX) {
      session.outputBuffer = session.outputBuffer.slice(-OUTPUT_BUFFER_MAX);
    }
  }

  broadcast(sessionId: string, msg: WsMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const text = JSON.stringify(msg);
    for (const ws of session.clients.values()) {
      if (ws.readyState === 1 /* OPEN */) {
        try { ws.send(text); } catch { /* ignore closed sockets */ }
      }
    }
  }

  private evictExpired(): void {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [id, session] of this.sessions) {
      const orphaned = session.clients.size === 0 && session.lastDisconnect < cutoff;
      if (orphaned || session.exited) {
        this.delete(id);
      }
    }
  }

  shutdown(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    for (const id of this.sessions.keys()) {
      this.delete(id);
    }
  }
}

// Singleton registry shared across WebSocket connections
export const registry = new PtySessionRegistry();

// ============================================================
// PTY Spawn
// ============================================================

/**
 * Spawn a PTY process for the given session.
 *
 * Priority order:
 *   1. Explicit wsEndpoint opt → sandbox management WebSocket bridge
 *   2. Auto-detect: first connected sandbox in registry → sandbox WS bridge
 *   3. AIWG_SANDBOX_ENDPOINT env var → legacy REST polling (deprecated)
 *   4. Fallback → local node-pty
 *
 * @issue #657 — agentic-sandbox PTY transport
 */
export async function spawnPty(
  session: PtySession,
  command: string,
  args: string[],
  opts: {
    cols?: number;
    rows?: number;
    cwd?: string;
    sandboxEndpoint?: string;
    agentId?: string;
    /** agentic-sandbox management WebSocket URL (e.g. ws://localhost:8121) */
    wsEndpoint?: string;
  } = {},
): Promise<void> {
  // Phase 2a: explicit management WS endpoint
  if (opts.wsEndpoint) {
    const agentId = opts.agentId || process.env.AIWG_SANDBOX_AGENT_ID || 'agent-01';
    // Look up advertised capabilities for this endpoint so spawnSandboxWsPty
    // can capability-gate the replay-on-attach handshake (#1144).
    let capabilities: { supported_client_messages: string[]; features: string[] } | undefined;
    try {
      const { sandboxRegistry } = await import('./sandbox-registry.js');
      const match = sandboxRegistry.list().find((s) => s.wsEndpoint === opts.wsEndpoint);
      capabilities = match?.wsCapabilities;
    } catch { /* registry not available — proceed without capability gating */ }
    await spawnSandboxWsPty(session, agentId, opts.wsEndpoint, { ...opts, capabilities });
    return;
  }

  // Phase 2b: auto-detect — use first connected sandbox from registry
  try {
    const { sandboxRegistry } = await import('./sandbox-registry.js');
    const sandboxes = sandboxRegistry.list();
    const connected = sandboxes.find((s) => s.connected && s.wsEndpoint);
    if (connected) {
      // #1146: refuse silent fallback when multiple ready agents exist and the
      // caller has not chosen one. Single-agent case still auto-selects.
      const explicit = opts.agentId || process.env.AIWG_SANDBOX_AGENT_ID;
      const ready = connected.agents.filter((a) => a.status === 'ready');
      if (!explicit && ready.length > 1) {
        const ids = ready.map((a) => a.agentId).join(', ');
        throw new Error(
          `Sandbox '${connected.name}' has ${ready.length} ready agents (${ids}); ` +
          `pass ?agent=<agentId> on /ws/pty/:sessionId or set AIWG_SANDBOX_AGENT_ID.`,
        );
      }
      const agentId = explicit
        || ready[0]?.agentId
        || connected.agents[0]?.agentId
        || 'agent-01';
      await spawnSandboxWsPty(session, agentId, connected.wsEndpoint, {
        ...opts,
        capabilities: connected.wsCapabilities,
      });
      return;
    }
  } catch (err) {
    // #1146: if we threw above to demand explicit selection, propagate it.
    if (err instanceof Error && err.message.startsWith('Sandbox ')) throw err;
    /* registry not available — fall through to local PTY */
  }

  // Phase 2c: legacy REST-based sandbox (AIWG_SANDBOX_ENDPOINT env var — deprecated)
  const sandboxEndpoint = opts.sandboxEndpoint || process.env.AIWG_SANDBOX_ENDPOINT;
  if (sandboxEndpoint) {
    await spawnSandboxPty(session, command, args, {
      ...opts,
      sandboxEndpoint,
      agentId: opts.agentId || process.env.AIWG_SANDBOX_AGENT_ID || 'agent-01',
    });
    return;
  }

  // Phase 1: local exec via node-pty
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ptyMod: any;
  try {
    ptyMod = await (new Function('m', 'return import(m)'))('node-pty');
  } catch {
    throw new Error('node-pty is required for PTY sessions. Install it: npm install node-pty');
  }

  const pty: PtyLike = ptyMod.spawn(command, args, {
    name: 'xterm-256color',
    cols: opts.cols ?? 120,
    rows: opts.rows ?? 30,
    cwd: opts.cwd ?? process.cwd(),
    env: process.env as Record<string, string>,
  });

  session.pty = pty;

  pty.onData((data: string) => {
    registry.appendOutput(session.id, data);
    registry.broadcast(session.id, { type: 'data', payload: data });
  });

  pty.onExit(({ exitCode }: { exitCode: number }) => {
    session.exited = true;
    registry.broadcast(session.id, { type: 'exit', code: exitCode });
  });
}

/**
 * Spawn a PTY session bridged to an agentic-sandbox management WebSocket.
 *
 * Connects to the sandbox's management WS server at wsEndpoint, subscribes to
 * the target agent, starts an interactive shell, then multicasts PTY output to
 * all browser clients via the existing PtySessionRegistry broadcast channel.
 *
 * The sandbox uses an OutputAggregator that broadcasts all output for an agent_id
 * to every subscribed WS connection. Multiple aiwg bridges sharing the same PTY
 * session receive identical output streams — no extra overhead on the sandbox side.
 * (#903: secondary start_shell for an existing session returns the same command_id
 * as the primary — the PTY is ref-counted and survives until the last subscriber
 * disconnects. The output filter `command_id === commandId` remains correct in all
 * cases whether this is the first or a subsequent attach.)
 *
 * After shell_started, list_sessions is issued to resolve the human-readable
 * session_name (e.g. "main") needed for kill_session. (#901)
 *
 * If the WS connection drops after handshake, the bridge reconnects with exponential
 * backoff rather than marking the session exited. The tmux session on the VM is
 * preserved as long as at least one subscriber is attached. (#902)
 *
 * Future: once aiwg-serve needs operator control (pause/inspect/hand-off), use the
 * formal session protocol keyed on session_id from list_sessions:
 *   JoinSession { session_id, role: "controller" | "observer" }
 *   SessionInput { session_id, data }
 *   SessionResize { session_id, cols, rows }
 *   RequestControl / ReleaseControl
 * This enables role-gated stdin and replay from a sequence number. (#904)
 *
 * @issue #657
 */
async function spawnSandboxWsPty(
  session: PtySession,
  agentId: string,
  wsEndpoint: string,
  opts: {
    cols?: number;
    rows?: number;
    /**
     * Sandbox-advertised WS capabilities. When supplied AND the sandbox lists
     * `join_session` in supported_client_messages and `replay_buffer` in
     * features, spawnSandboxWsPty will request session history replay after
     * `shell_started` (#1144).
     */
    capabilities?: { supported_client_messages: string[]; features: string[] };
  },
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wsMod: any;
  try {
    wsMod = await (new Function('m', 'return import(m)'))('ws');
  } catch {
    throw new Error('ws package required for sandbox PTY bridge. Run: npm install ws');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WS: any = wsMod.WebSocket ?? wsMod.default?.WebSocket ?? wsMod.default;
  if (typeof WS !== 'function') {
    throw new Error('Could not resolve WebSocket constructor from ws package');
  }

  const cols = opts.cols ?? 120;
  const rows = opts.rows ?? 30;

  // Replay-on-attach negotiation (#1144). Three states:
  //   "advertised" — banner explicitly lists join_session + replay_buffer.
  //   "probe"      — no banner present; we'll send join_session opportunistically
  //                  and watch for an "unknown message" / "not supported" error
  //                  to demote to "unsupported" if the sandbox can't handle it.
  //   "unsupported"— banner advertises capabilities but join_session is absent
  //                  (rare — would mean a partial banner). Skip entirely.
  //
  // Default behavior is opportunistic: if the operator hasn't supplied a
  // capability map, or it lists no client messages, we still try. This keeps
  // the replay path useful on sandboxes that support join_session without
  // shipping the server-hello banner from agentic-sandbox#190.
  let replayMode: 'advertised' | 'probe' | 'unsupported';
  if (!opts.capabilities) {
    replayMode = 'probe';
  } else if (
    opts.capabilities.supported_client_messages.includes('join_session') &&
    opts.capabilities.features.includes('replay_buffer')
  ) {
    replayMode = 'advertised';
  } else if (
    opts.capabilities.supported_client_messages.length === 0 &&
    opts.capabilities.features.length === 0
  ) {
    // Sandbox supplied an empty banner — treat as no-banner-yet, probe.
    replayMode = 'probe';
  } else {
    // Banner present but missing the bits we care about — don't probe; the
    // sandbox has explicitly told us it doesn't support replay.
    replayMode = 'unsupported';
  }

  console.info(
    `[pty-bridge] sandbox WS ${wsEndpoint} (agent=${agentId}): replay ${
      replayMode === 'advertised'
        ? 'enabled (banner)'
        : replayMode === 'probe'
          ? 'enabled (opportunistic — no banner advertised)'
          : 'disabled (banner explicitly omits join_session/replay_buffer)'
    }`,
  );

  return new Promise<void>((resolve, reject) => {
    let commandId: string | null = null;
    // session_name resolved via list_sessions after shell_started (#901)
    // The kill_session handler looks up by session_name, not command_id.
    let sessionName: string | null = null;
    let onDataCb: ((data: string) => void) | null = null;
    let onExitCb: ((e: { exitCode: number }) => void) | null = null;
    let settled = false;
    let reconnectAttempt = 0;
    const MAX_RECONNECT = 8;
    // #1144: persist last seen sequence number so reconnects resume from gap point
    let lastSeq = 0;
    // #1144: prepend a single xterm full-reset before the first replay frame so
    // the renderer's cursor/screen state agrees with tmux on its starting point.
    // Without the reset, mid-conversation bytes overlap whatever was on screen
    // and produce the alignment glitch described in #1144.
    let needsReplayReset = false;

    // sock is reassigned on each reconnect; sendMsg always uses the current one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sock: any = null;

    const settle = (err?: Error) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve();
    };

    const sendMsg = (msg: object) => {
      if (sock?.readyState === 1 /* OPEN */) {
        sock.send(JSON.stringify(msg));
      }
    };

    function connect() {
      sock = new WS(wsEndpoint);

      sock.on('open', () => {
        // Subscribe then start (or re-attach to) the interactive shell.
        // After sandbox#ce8e600, start_shell for an existing session returns
        // the same command_id (idempotent attach) — no new PTY is spawned. (#903)
        sendMsg({ type: 'subscribe', agent_id: agentId });
        sendMsg({ type: 'start_shell', agent_id: agentId, cols, rows });
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sock.on('message', (raw: any) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(typeof raw === 'string' ? raw : (raw as Buffer).toString()) as Record<string, unknown>;
        } catch {
          return;
        }

        // Shell handshake — record command_id for all subsequent I/O routing.
        // On reconnect, the server returns the same command_id (idempotent). (#903)
        if (msg['type'] === 'shell_started' && msg['agent_id'] === agentId) {
          commandId = msg['command_id'] as string;
          // Resolve the outer promise on first shell_started only
          settle();
          // Request session list to resolve the session_name needed for kill (#901)
          sendMsg({ type: 'list_sessions', agent_id: agentId });
          // #1144: ask the sandbox to replay buffered output so a late attach
          // sees existing session history. On the initial attach lastSeq is 0
          // (full replay); on reconnect lastSeq is the last frame we saw, so
          // we resume from the gap rather than re-rendering history.
          if (replayMode !== 'unsupported') {
            needsReplayReset = true;
            sendMsg({
              type: 'join_session',
              agent_id: agentId,
              command_id: commandId,
              replay_from: lastSeq,
            });
          }
          return;
        }

        // Probe-mode error handling (#1144): if the sandbox doesn't recognize
        // the join_session message, demote to 'unsupported' so the renderer
        // doesn't keep waiting for a replay reset that's never going to come,
        // and log so the operator can see why replay didn't take effect.
        if (msg['type'] === 'error') {
          const errMsg = String(msg['message'] ?? '').toLowerCase();
          const looksLikeUnsupported =
            errMsg.includes('unknown message') ||
            errMsg.includes('unsupported') ||
            errMsg.includes('not supported') ||
            errMsg.includes('session not found') ||
            errMsg.includes('unknown type');
          if (
            looksLikeUnsupported &&
            (replayMode === 'probe' || replayMode === 'advertised')
          ) {
            console.warn(
              `[pty-bridge] sandbox declined join_session for agent=${agentId}: "${msg['message']}" — demoting to unsupported, falling back to live-only`,
            );
            replayMode = 'unsupported';
            // Cancel the pending reset — there will be no replay frame to
            // prepend `\x1bc` to.
            needsReplayReset = false;
          }
          // Other error types are forwarded as-is to the existing handler
          // chain (no action here — pre-existing behavior).
          return;
        }

        // session_list response: find our session by command_id, store session_name (#901)
        if (msg['type'] === 'session_list' && msg['agent_id'] === agentId) {
          type SessEntry = { session_name: string; command_id: string };
          const sessions = msg['sessions'] as SessEntry[] | undefined;
          const match = sessions?.find((s) => s.command_id === commandId);
          if (match) sessionName = match.session_name;
          return;
        }

        // PTY output from the sandbox broadcast channel → forward to browser
        if (
          msg['type'] === 'output' &&
          msg['agent_id'] === agentId &&
          msg['command_id'] === commandId &&
          (msg['stream'] === 'stdout' || msg['stream'] === undefined) &&
          msg['data']
        ) {
          let data = typeof msg['data'] === 'string' ? msg['data'] : String(msg['data']);
          // #1144: track sandbox-supplied seq so reconnects can resume from
          // the gap point rather than replaying from the buffer head.
          const seq = msg['seq'];
          if (typeof seq === 'number' && seq > lastSeq) lastSeq = seq;
          // #1144: emit a full xterm reset (`\x1bc`) ahead of the first frame
          // following a replay request so the renderer agrees with tmux on
          // the starting state. Eliminates the alignment glitch where
          // mid-session bytes overlap the prior screen content.
          if (needsReplayReset) {
            data = '\x1bc' + data;
            needsReplayReset = false;
          }
          onDataCb?.(data);
          return;
        }

        // Session ended on sandbox side (explicit kill or process exit)
        if (
          (msg['type'] === 'session_killed' || msg['type'] === 'session_detached') &&
          msg['agent_id'] === agentId
        ) {
          onExitCb?.({ exitCode: (msg['exit_code'] as number | undefined) ?? 0 });
        }
      });

      sock.on('error', (_err: Error) => {
        // If not yet settled, the 'close' event will follow and settle with an error.
        // After settlement, let 'close' drive reconnection.
      });

      sock.on('close', () => {
        if (!settled) {
          // Closed before shell_started — fatal for the initial connect
          settle(new Error(`Sandbox WS closed before shell_started (agent: ${agentId}, endpoint: ${wsEndpoint})`));
          return;
        }
        if (session.exited) return; // already torn down intentionally

        // Unexpected mid-session disconnect — reconnect with exponential backoff. (#902)
        // The tmux session on the VM survives as long as we reconnect before the last
        // subscriber drops (sandbox ref-counts WS subscribers per PTY).
        if (reconnectAttempt < MAX_RECONNECT) {
          reconnectAttempt++;
          const delay = Math.min(1_000 * Math.pow(2, reconnectAttempt), 30_000);
          setTimeout(connect, delay);
        } else {
          // Exhausted retries — treat as session exit
          onExitCb?.({ exitCode: 1 });
        }
      });

      // 15 s timeout for the initial shell handshake only (not applied on reconnects)
      if (!settled) {
        const timeout = setTimeout(
          () => settle(new Error(`Timed out waiting for shell_started from agent ${agentId} at ${wsEndpoint}`)),
          15_000,
        );
        if ((timeout as unknown as { unref?: () => void }).unref) {
          (timeout as unknown as { unref: () => void }).unref();
        }
      }
    }

    // PtyLike wrapper: routes browser I/O back through the sandbox management WS
    const sandboxPty: PtyLike = {
      write(data: string) {
        if (!commandId) return;
        sendMsg({ type: 'send_input', agent_id: agentId, command_id: commandId, data });
      },
      resize(c: number, r: number) {
        if (!commandId) return;
        sendMsg({ type: 'pty_resize', agent_id: agentId, command_id: commandId, cols: c, rows: r });
      },
      kill(_signal?: string) {
        // Kill by session_name — the sandbox KillSession handler looks up by name,
        // not by command_id. session_name is resolved from list_sessions. (#901)
        if (sessionName) {
          sendMsg({ type: 'kill_session', agent_id: agentId, session_name: sessionName });
        }
        sock?.close();
      },
      onData(cb: (data: string) => void) { onDataCb = cb; },
      onExit(cb: (e: { exitCode: number }) => void) { onExitCb = cb; },
    };

    session.pty = sandboxPty;

    // Wire output → broadcast pipeline (mirrors the local PTY pattern)
    sandboxPty.onData((data: string) => {
      registry.appendOutput(session.id, data);
      registry.broadcast(session.id, { type: 'data', payload: data });
    });
    sandboxPty.onExit(({ exitCode }: { exitCode: number }) => {
      session.exited = true;
      registry.broadcast(session.id, { type: 'exit', code: exitCode });
    });

    connect();
  });
}

/**
 * Spawn a PTY session on a remote agentic-sandbox instance.
 * Submits a task and polls for log output via REST.
 *
 * @deprecated Use spawnSandboxWsPty (management WebSocket) instead.
 *   The REST polling approach requires a /api/v1/tasks endpoint that the
 *   agentic-sandbox management server does not expose. Left as fallback for
 *   custom sandbox implementations that implement the task REST API.
 * @issue #657
 */
async function spawnSandboxPty(
  session: PtySession,
  command: string,
  args: string[],
  opts: { cols?: number; rows?: number; cwd?: string; sandboxEndpoint: string; agentId: string },
): Promise<void> {
  const endpoint = opts.sandboxEndpoint.replace(/\/$/, '');
  const cmdLine = [command, ...args].join(' ');

  // Submit task manifest
  const manifest = {
    manifest_yaml: [
      'version: "1"',
      'kind: Task',
      'metadata:',
      `  name: "pty-${session.id}"`,
      '  labels:',
      '    aiwg_transport: pty',
      `    aiwg_session: "${session.id}"`,
      'claude:',
      `  prompt: "${cmdLine}"`,
      '  headless: true',
      '  skip_permissions: true',
      'vm:',
      '  profile: agentic-dev',
    ].join('\n'),
  };

  const resp = await fetch(`${endpoint}/api/v1/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(manifest),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Sandbox task submission failed: ${resp.status} ${body}`);
  }

  const result = await resp.json() as { task_id: string };
  const taskId = result.task_id;

  // Create a PtyLike wrapper that routes I/O through the sandbox REST API
  let logOffset = 0;
  let stopped = false;

  const sandboxPty: PtyLike = {
    write(data: string) {
      if (stopped) return;
      fetch(`${endpoint}/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stdin: data }),
      }).catch(() => { /* best-effort */ });
    },
    resize(_cols: number, _rows: number) {
      // Resize handled by browser WS direct connection to sandbox :8121
    },
    kill(_signal?: string) {
      if (stopped) return;
      stopped = true;
      fetch(`${endpoint}/api/v1/tasks/${taskId}`, { method: 'DELETE' })
        .catch(() => { /* best-effort */ });
    },
    onData(callback: (data: string) => void) {
      // Poll for log output
      const timer = setInterval(async () => {
        if (stopped) { clearInterval(timer); return; }
        try {
          const logResp = await fetch(`${endpoint}/api/v1/tasks/${taskId}/logs?offset=${logOffset}`);
          if (!logResp.ok) {
            if (logResp.status === 404) { stopped = true; clearInterval(timer); }
            return;
          }
          const text = await logResp.text();
          if (text.length > 0) {
            logOffset += text.length;
            callback(text);
          }
        } catch { /* retry next poll */ }
      }, 500);
    },
    onExit(callback: (event: { exitCode: number }) => void) {
      // Poll for task completion
      const timer = setInterval(async () => {
        if (stopped) { clearInterval(timer); return; }
        try {
          const statusResp = await fetch(`${endpoint}/api/v1/tasks/${taskId}`);
          if (!statusResp.ok) return;
          const task = await statusResp.json() as { state: string };
          if (['completed', 'failed', 'cancelled'].includes(task.state)) {
            stopped = true;
            clearInterval(timer);
            callback({ exitCode: task.state === 'completed' ? 0 : 1 });
          }
        } catch { /* retry */ }
      }, 2000);
    },
  };

  session.pty = sandboxPty;

  sandboxPty.onData((data: string) => {
    registry.appendOutput(session.id, data);
    registry.broadcast(session.id, { type: 'data', payload: data });
  });

  sandboxPty.onExit(({ exitCode }: { exitCode: number }) => {
    session.exited = true;
    registry.broadcast(session.id, { type: 'exit', code: exitCode });
  });
}

// ============================================================
// WebSocket Connection Handler
// ============================================================

let clientCounter = 0;

/**
 * Handle a new WebSocket connection for a PTY session.
 *
 * @param sessionId - PTY session ID from the URL path
 * @param ws - WebSocket-like interface
 * @param command - Command to spawn (default: 'aiwg')
 * @param args - Command arguments (default: ['mc', 'watch'])
 * @param cwd - Working directory
 * @param wsEndpoint - Optional: sandbox management WS URL for explicit agent targeting
 * @param agentId - Optional: sandbox agent ID to target (requires wsEndpoint)
 */
export async function handlePtyConnection(
  sessionId: string,
  ws: WebSocketLike,
  command = 'aiwg',
  cmdArgs: string[] = ['mc', 'watch'],
  cwd?: string,
  wsEndpoint?: string,
  agentId?: string,
): Promise<void> {
  const clientId = `client-${++clientCounter}`;

  let session = registry.get(sessionId);

  if (!session) {
    // New session — create and spawn PTY
    session = registry.create(sessionId);
    registry.addClient(sessionId, clientId, ws);
    try {
      await spawnPty(session, command, cmdArgs, { cwd, wsEndpoint, agentId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ws.send(JSON.stringify({ type: 'error', message: msg }));
      ws.close(1011, 'PTY spawn failed');
      registry.delete(sessionId);
      return;
    }
  } else if (!session.exited) {
    // Reconnect to existing session — replay buffer
    registry.addClient(sessionId, clientId, ws);
    if (session.outputBuffer) {
      // Trim replay to start from the last full-screen erase so that tmux's
      // screen-init sequences (cursor moves, status-bar paint) from before the
      // erase don't render as literal garbage in a fresh xterm.js context.
      // Everything before \x1b[2J would be cleared by the erase anyway;
      // everything after is the session content tmux redrew (MOTD, history, etc).
      // If no erase is found, replay the whole buffer unchanged.
      const ERASE = '\x1b[2J';
      const lastErase = session.outputBuffer.lastIndexOf(ERASE);
      const replay = lastErase !== -1 ? session.outputBuffer.slice(lastErase) : session.outputBuffer;
      ws.send(JSON.stringify({ type: 'data', payload: replay }));
    }
  } else {
    // Session exited — inform client
    ws.send(JSON.stringify({ type: 'exit', code: 0 }));
    ws.close(1000, 'Session already exited');
    return;
  }

  // Handle incoming messages from browser
  const onMessage = (rawData: string) => {
    let msg: WsMessage;
    try {
      msg = JSON.parse(rawData) as WsMessage;
    } catch {
      return; // ignore malformed frames
    }

    const s = registry.get(sessionId);
    if (!s?.pty) return;

    if (msg.type === 'data' && msg.payload !== undefined) {
      s.pty.write(msg.payload);
    } else if (msg.type === 'resize' && msg.cols && msg.rows) {
      s.pty.resize(msg.cols, msg.rows);
    } else if (msg.type === 'close') {
      s.pty.kill();
    }
  };

  const onClose = () => {
    registry.removeClient(sessionId, clientId);
  };

  return Promise.resolve().then(() => {
    // Return handlers for integration with WebSocket framework
    (ws as WebSocketLike & { _onMessage?: typeof onMessage; _onClose?: typeof onClose })._onMessage = onMessage;
    (ws as WebSocketLike & { _onClose?: typeof onClose })._onClose = onClose;
  });
}

// ============================================================
// Hono WebSocket Factory
// ============================================================

/**
 * Create a Hono-compatible WebSocket event object for the PTY route.
 *
 * Used with `upgradeWebSocket` from `@hono/node-server/ws`:
 *
 * ```ts
 * app.get('/ws/pty/:sessionId', upgradeWebSocket((c) => createPtyWsHandler(c)));
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPtyWsHandler(c: any): any {
  const sessionId: string = c.req.param('sessionId') ?? 'default';
  const q = c.req.query();
  const command: string = q.command ?? 'aiwg';
  const cmdArgs: string[] = q.args ? (q.args as string).split(',') : ['mc', 'watch'];
  const cwd: string | undefined = q.cwd;
  // Explicit sandbox targeting (optional — auto-detected from registry when absent)
  const wsEndpoint: string | undefined = q.wsEndpoint;
  const agentId: string | undefined = q.agentId;

  let wsRef: (WebSocketLike & { _onMessage?: (d: string) => void; _onClose?: () => void }) | null = null;

  return {
    onOpen(_evt: unknown, ws: WebSocketLike) {
      wsRef = ws as typeof wsRef;
      handlePtyConnection(sessionId, ws, command, cmdArgs, cwd, wsEndpoint, agentId).catch((err) => {
        ws.send(JSON.stringify({ type: 'error', message: String(err) }));
        ws.close(1011);
      });
    },
    onMessage(evt: { data: string }) {
      wsRef?._onMessage?.(evt.data);
    },
    onClose() {
      wsRef?._onClose?.();
      wsRef = null;
    },
    onError(err: unknown) {
      console.error(`[pty-bridge] WebSocket error on session ${sessionId}:`, err);
    },
  };
}
