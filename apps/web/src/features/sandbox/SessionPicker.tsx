/**
 * Session Picker + Inline Terminal
 *
 * The terminal pane connects to the management WS, lists sessions via
 * `list_sessions`, shows an inline picker, then attaches to the chosen one.
 * All session state comes directly from the management WS — no REST/WS naming
 * mismatch possible.
 *
 * Management WS protocol (proxied at /ws/sandbox/:sandboxId/management):
 *
 *   Client → server:
 *     { type: "subscribe",      agent_id }            ← sent together on open
 *     { type: "list_sessions",  agent_id }            ← sent together on open
 *     { type: "attach_session", agent_id, session_name, cols, rows }
 *     { type: "send_input",     agent_id, command_id, data }
 *     { type: "pty_resize",     agent_id, command_id, cols, rows }
 *
 *   Server → client:
 *     { type: "session_list",    agent_id, sessions[] }
 *     { type: "session_attached",agent_id, session_name, command_id }
 *     { type: "output",          agent_id, command_id, data, stream, ts }
 *     { type: "error",           message }
 *
 * Design notes:
 *   - subscribe + list_sessions are sent together on open (one round trip, not two)
 *   - xterm is initialized in a useEffect keyed on phase === 'attached', which runs
 *     AFTER React commits display:block to the container — FitAddon then measures
 *     the real dimensions instead of 0×0 on a hidden element
 *   - The WS session_attached handler only updates refs/state; no async work
 *
 * @issue #896
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../lib/api.js';
import styles from './SessionPicker.module.css';

// ---- Types ----

interface WsSession {
  session_name: string;
  command_id: string;
  session_id: string;
  session_type: string;
  command: string;
  running: boolean;
}

// ---- Terminal Pane ----

export interface TerminalPaneProps {
  sandboxId: string;
  agentId: string;
  /** Optional live agent metrics rendered in the status bar — drives the
   *  per-pane CPU/MEM/DSK header chips required by issue #1146 phase 3. */
  stats?: {
    cpu_percent?: number;
    memory_used_bytes?: number;
    memory_total_bytes?: number;
    disk_used_bytes?: number;
    disk_total_bytes?: number;
  };
}

type Phase = 'connecting' | 'listing' | 'picking' | 'attaching' | 'attached';

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_ATTEMPTS = 8;

function fmtBytesShort(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}G`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)}M`;
  return `${(bytes / 1024).toFixed(0)}K`;
}

export function TerminalPane({ sandboxId, agentId, stats }: TerminalPaneProps) {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [sessions, setSessions] = useState<WsSession[]>([]);
  const [statusText, setStatusText] = useState('Connecting…');
  const [wsError, setWsError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [isExhausted, setIsExhausted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xtermRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fitAddonRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionBuffersRef = useRef<Map<string, string>>(new Map());
  // command_id confirmed by session_attached; drives output routing and input/resize
  const attachedCmdRef = useRef<string | null>(null);
  const pickedSessionRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ------------------------------------------------------------------
  // WS send helper
  // ------------------------------------------------------------------

  const sendWs = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const requestSessionList = useCallback(() => {
    sendWs({ type: 'list_sessions', agent_id: agentId });
  }, [agentId, sendWs]);

  // ------------------------------------------------------------------
  // xterm init — called from the useEffect below, AFTER React commits
  // the display:block update so FitAddon measures real dimensions.
  // ------------------------------------------------------------------

  const initTerminal = useCallback(async () => {
    if (!containerRef.current) return;

    const [{ Terminal }, { FitAddon }] = await Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit'),
    ]);
    if (!containerRef.current) return; // unmounted during async import

    if (xtermRef.current) return; // already initialized (concurrent call)

    const term = new Terminal({
      rows: 24,
      cols: 80,
      scrollback: 5000, // local ring buffer for historical output (#1154); re-attach replay still served by sessionBuffersRef
      cursorBlink: true,
      convertEol: false,
      theme: {
        background: '#0d0d0d',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: 'rgba(255,255,255,0.25)',
      },
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
      fontSize: 12,
      lineHeight: 1.3,
    });

    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    containerRef.current.appendChild(wrapper);

    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);
    term.open(wrapper);

    // Container is visible at this point (useEffect fires after React paint)
    try { fitAddon.fit(); } catch { /* ignore */ }
    xtermRef.current = term;

    // Keyboard: Ctrl+C copies if selection active, otherwise pass through
    term.attachCustomKeyEventHandler((ev: KeyboardEvent) => {
      if (ev.type !== 'keydown') return true;
      if (ev.ctrlKey && ev.key === 'c' && term.hasSelection()) return false;
      if (ev.ctrlKey && ev.key === 'v') return false;
      return true;
    });

    term.onData((data: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && attachedCmdRef.current) {
        sendWs({ type: 'send_input', agent_id: agentId, command_id: attachedCmdRef.current, data });
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      try { fitAddonRef.current?.fit(); } catch { /* ignore */ }
      if (wsRef.current?.readyState === WebSocket.OPEN && attachedCmdRef.current && xtermRef.current) {
        sendWs({
          type: 'pty_resize',
          agent_id: agentId,
          command_id: attachedCmdRef.current,
          cols: xtermRef.current.cols,
          rows: xtermRef.current.rows,
        });
      }
    });
    resizeObserverRef.current = resizeObserver;
    resizeObserver.observe(containerRef.current);
  }, [agentId, sendWs]);

  // ------------------------------------------------------------------
  // Terminal lifecycle: runs after React commits display:block.
  //
  // On first attach:  init xterm (which now has real dimensions), replay buffer.
  // On re-attach:     fitAddon.fit() to sync dimensions, replay buffer.
  // This is the ONLY place initTerminal is called — never from a WS handler.
  // ------------------------------------------------------------------

  useEffect(() => {
    if (phase !== 'attached' || !containerRef.current) return;
    let cancelled = false;

    const cmdId = attachedCmdRef.current;

    if (!xtermRef.current) {
      // First attach — initialize, then replay buffered output
      initTerminal().then(() => {
        if (cancelled || !xtermRef.current || !cmdId) return;
        const buf = sessionBuffersRef.current.get(cmdId);
        xtermRef.current.clear();
        if (buf) xtermRef.current.write(buf);
        // Sync PTY size now that xterm is measured
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          sendWs({
            type: 'pty_resize',
            agent_id: agentId,
            command_id: cmdId,
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows,
          });
        }
      });
    } else {
      // Re-attach to a different session — fit to container, replay buffer
      try { fitAddonRef.current?.fit(); } catch { /* ignore */ }
      if (cmdId) {
        const buf = sessionBuffersRef.current.get(cmdId);
        xtermRef.current.clear();
        if (buf) xtermRef.current.write(buf);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          sendWs({
            type: 'pty_resize',
            agent_id: agentId,
            command_id: cmdId,
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows,
          });
        }
      }
    }

    return () => { cancelled = true; };
  }, [phase, agentId, initTerminal, sendWs]);

  // ------------------------------------------------------------------
  // WS connection lifecycle
  // ------------------------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    // Loose agent_id match — the bound row.agent.agentId we were given may be
    // `agent-01-<hash>` while the sandbox replies with the bare hostname
    // `agent-01` (or vice versa). Strict equality used to silently drop the
    // session_list reply in that case, leaving the picker hung on the
    // "Listing sessions…" spinner forever. Mirrors the same loose pattern
    // the sidebar's findBoundAgent uses.
    const matchesAgent = (replyId: unknown): boolean => {
      if (typeof replyId !== 'string') return false;
      if (replyId === agentId) return true;
      // Prefix forms in either direction: our id may be the longer hashed
      // version or the bare one — accept either as the same agent.
      const longer = agentId.length >= replyId.length ? agentId : replyId;
      const shorter = agentId.length >= replyId.length ? replyId : agentId;
      return longer === shorter || longer.startsWith(`${shorter}-`);
    };

    function handleMessage(evt: MessageEvent) {
      if (!isMounted) return;
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(evt.data as string); }
      catch { return; }

      // Diagnostic: surface every inbound message — type + agent_id (when
      // present) — so we can see exactly what the sandbox sent for this
      // pane. The verbose form helps debug "session_list never arrives"
      // symptoms: if the sandbox replies for a different agent_id form
      // than this pane queried, the trace lights up the mismatch directly.
      console.debug(
        `[SessionPicker] msg pane=${agentId} type=${String(msg['type'])} agent_id=${String(msg['agent_id'] ?? '<none>')}`,
      );
      const replyAgent = msg['agent_id'];
      if (replyAgent !== undefined && !matchesAgent(replyAgent)) {
        console.warn(
          `[SessionPicker] DROPPED ${String(msg['type'])} — pane agent=${agentId}, reply agent_id=${String(replyAgent)} (loose match failed)`,
        );
      }

      switch (msg['type']) {
        case 'session_list': {
          if (!matchesAgent(msg['agent_id'])) break;
          // Watchdog cleared — session_list arrived as expected.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const wd = (wsRef.current as any)?._sessionListWatchdog;
          if (wd) {
            clearTimeout(wd);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (wsRef.current as any)._sessionListWatchdog = null;
          }
          const raw = (msg['sessions'] as WsSession[] | undefined) ?? [];
          // Diagnostic — surface what the sandbox actually returned so an
          // operator can see in DevTools whether sessions arrived at all.
          console.info(
            `[SessionPicker] session_list reply for agent=${agentId} (sandbox replied with agent_id=${String(msg['agent_id'])}): ${raw.length} session(s):`,
            raw.map((s) => ({ name: s.session_name, type: s.session_type, running: s.running })),
          );
          setSessions(raw);
          setPhase((prev) => {
            if (prev === 'listing') {
              // Auto-attach if exactly one running interactive session
              const attachable = raw.filter(s => s.running && s.session_type === 'interactive');
              if (attachable.length === 1) {
                const s = attachable[0];
                pickedSessionRef.current = s.session_name;
                wsRef.current?.send(JSON.stringify({
                  type: 'attach_session',
                  agent_id: agentId,
                  session_name: s.session_name,
                  cols: 80,
                  rows: 24,
                }));
                return 'attaching';
              }
              return 'picking';
            }
            return prev; // mid-session refresh — stay in current phase
          });
          break;
        }

        case 'session_attached': {
          if (!matchesAgent(msg['agent_id'])) break;
          const cmdId = msg['command_id'] as string | undefined;
          if (!cmdId) break;
          // Update routing ref — useEffect below handles xterm init/replay
          // after React commits the display:block update to the container.
          attachedCmdRef.current = cmdId;
          setPhase('attached');
          setStatusText(pickedSessionRef.current ?? 'terminal');
          break;
        }

        case 'output': {
          if (!matchesAgent(msg['agent_id'])) break;
          const cmdId = msg['command_id'] as string | undefined;
          const data = msg['data'] as string | undefined;
          if (!cmdId || !data) break;
          // Always buffer (32 KB ring) so re-attach can replay
          let buf = sessionBuffersRef.current.get(cmdId) ?? '';
          buf += data;
          if (buf.length > 32768) buf = buf.slice(-32768);
          sessionBuffersRef.current.set(cmdId, buf);
          // Write to terminal only when attached and initialized
          if (cmdId === attachedCmdRef.current && xtermRef.current) {
            xtermRef.current.write(data);
          }
          break;
        }

        case 'session_created':
          requestSessionList();
          break;

        case 'error': {
          const errMsg = (msg['message'] as string) ?? 'unknown error';
          if (xtermRef.current && attachedCmdRef.current) {
            xtermRef.current.writeln(`\r\n\x1b[31m[Error: ${errMsg}]\x1b[0m`);
          } else {
            setWsError(errMsg);
            setPhase((prev) => (prev === 'attaching' ? 'picking' : prev));
          }
          break;
        }
      }
    }

    function connect() {
      if (!isMounted) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws/sandbox/${sandboxId}/management`;
      console.info(`[SessionPicker] connecting to ${wsUrl} (agent=${agentId})`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        console.info(`[SessionPicker] WS open for sandbox=${sandboxId} agent=${agentId} — subscribing`);
        reconnectAttemptsRef.current = 0;
        setIsExhausted(false);
        setConnected(true);
        setStatusText('Listing sessions…');
        setPhase('listing');
        // Send subscribe + list_sessions together — one round trip, not two.
        // The server processes messages in order so subscription is registered
        // before list_sessions is handled.
        ws.send(JSON.stringify({ type: 'subscribe', agent_id: agentId }));
        ws.send(JSON.stringify({ type: 'list_sessions', agent_id: agentId }));

        // Watchdog: warn if session_list doesn't arrive within 3s. Catches
        // the case where the sandbox accepts subscribe + list_sessions but
        // silently drops the reply (e.g., the agent_id we're querying isn't
        // tracked in the sandbox's active_sessions map).
        const watchdog = setTimeout(() => {
          if (isMounted && (phase === 'listing' || phase === 'connecting')) {
            console.warn(
              `[SessionPicker] no session_list reply within 3s for agent=${agentId} (sandbox=${sandboxId}). The sandbox may not have this agent_id registered. Try the agentic-sandbox dashboard's list_sessions for the same id to compare.`,
            );
          }
        }, 3000);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ws as any)._sessionListWatchdog = watchdog;
      };

      ws.onmessage = handleMessage;

      ws.onclose = (ev) => {
        if (!isMounted) return;
        console.warn(`[SessionPicker] WS closed sandbox=${sandboxId} agent=${agentId}: code=${ev.code} reason="${ev.reason}" wasClean=${ev.wasClean}`);
        setConnected(false);
        const attempt = reconnectAttemptsRef.current;
        if (attempt >= RECONNECT_MAX_ATTEMPTS) {
          setStatusText('Connection lost');
          setIsExhausted(true);
          setWsError(`WS closed (code=${ev.code}${ev.reason ? `, ${ev.reason}` : ''}) — reconnect attempts exhausted`);
          return;
        }
        const delay = RECONNECT_BASE_MS * Math.pow(2, attempt);
        reconnectAttemptsRef.current = attempt + 1;
        setStatusText(`Reconnecting… (${attempt + 1}/${RECONNECT_MAX_ATTEMPTS})`);
        reconnectTimerRef.current = setTimeout(() => {
          if (isMounted) {
            attachedCmdRef.current = null;
            pickedSessionRef.current = null;
            setPhase('connecting');
            connect();
          }
        }, delay);
      };

      ws.onerror = (ev) => {
        console.error(`[SessionPicker] WS error sandbox=${sandboxId} agent=${agentId}`, ev);
        // onclose will handle recovery + status surfacing.
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      wsRef.current?.close();
      xtermRef.current?.dispose();
      wsRef.current = null;
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sandboxId, agentId, requestSessionList]);

  // ------------------------------------------------------------------
  // User action handlers
  // ------------------------------------------------------------------

  const handleAttach = (session: WsSession) => {
    setWsError(null);
    pickedSessionRef.current = session.session_name;
    sendWs({
      type: 'attach_session',
      agent_id: agentId,
      session_name: session.session_name,
      cols: 80,
      rows: 24,
    });
    setPhase('attaching');
    setStatusText(`Attaching to ${session.session_name}…`);
  };

  const handleNewTerminal = async () => {
    setWsError(null);
    try {
      await api.createSession(sandboxId, agentId, { command: 'bash' });
      requestSessionList();
    } catch (err) {
      setWsError(`Failed to create session: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleBack = () => {
    attachedCmdRef.current = null;
    pickedSessionRef.current = null;
    setPhase('listing');
    setStatusText('Listing sessions…');
    requestSessionList();
  };

  // Resync (#1146 phase 3): drop the cached output buffer for the current
  // command id, hard-reset the xterm screen, refit, and re-attach. Mirrors
  // the agentic-sandbox dashboard `resyncPane` behavior added in #180. Used
  // when the rendered screen has drifted from the underlying tmux state
  // (orphaned escape codes, partial replays, etc).
  const handleResync = () => {
    const cmdId = attachedCmdRef.current;
    if (!cmdId) return;
    sessionBuffersRef.current.delete(cmdId);
    if (xtermRef.current) {
      try { xtermRef.current.reset(); } catch { /* ignore */ }
      try { fitAddonRef.current?.fit(); } catch { /* ignore */ }
    }
    const sessName = pickedSessionRef.current;
    if (sessName && wsRef.current?.readyState === WebSocket.OPEN) {
      attachedCmdRef.current = null;
      setPhase('attaching');
      setStatusText(`Resyncing ${sessName}…`);
      sendWs({
        type: 'attach_session',
        agent_id: agentId,
        session_name: sessName,
        cols: xtermRef.current?.cols ?? 80,
        rows: xtermRef.current?.rows ?? 24,
      });
    }
  };

  // Reconnect (#1146 phase 3): re-list sessions and reattach without
  // resetting xterm. Use when the WS dropped briefly or the operator just
  // wants to confirm the session list is fresh.
  const handleReconnect = () => {
    setWsError(null);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      requestSessionList();
      const sessName = pickedSessionRef.current;
      if (sessName && phase !== 'attached') {
        setPhase('attaching');
        setStatusText(`Reattaching to ${sessName}…`);
        sendWs({
          type: 'attach_session',
          agent_id: agentId,
          session_name: sessName,
          cols: xtermRef.current?.cols ?? 80,
          rows: xtermRef.current?.rows ?? 24,
        });
      }
    } else {
      // WS is closed — force the reconnect timer to fire now.
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectAttemptsRef.current = 0;
      wsRef.current?.close();
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className={styles.terminal}>
      {/* Status bar */}
      <div className={styles.termStatus}>
        <span className={[styles.termDot, connected ? styles.termDotOn : styles.termDotOff].join(' ')} />
        <span>{statusText}</span>

        {/* Live stats (#1146 phase 3) */}
        {stats && (
          <span style={{ marginLeft: 8, fontSize: 11, color: '#888', display: 'inline-flex', gap: 8 }}>
            {typeof stats.cpu_percent === 'number' && (
              <span title="CPU">{`CPU ${stats.cpu_percent.toFixed(0)}%`}</span>
            )}
            {stats.memory_used_bytes && stats.memory_total_bytes && (
              <span title="Memory">
                {`MEM ${fmtBytesShort(stats.memory_used_bytes)}/${fmtBytesShort(stats.memory_total_bytes)}`}
              </span>
            )}
            {stats.disk_used_bytes && stats.disk_total_bytes && (
              <span title="Disk">
                {`DSK ${fmtBytesShort(stats.disk_used_bytes)}/${fmtBytesShort(stats.disk_total_bytes)}`}
              </span>
            )}
          </span>
        )}

        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={handleResync}
            title="Reset terminal and re-attach to the current session"
            disabled={!attachedCmdRef.current}
          >
            ⟳ Resync
          </button>
          <button
            type="button"
            className={styles.backBtn}
            onClick={handleReconnect}
            title="Re-list sessions and re-attach without resetting the terminal"
          >
            ↺ Reconnect
          </button>
          {phase === 'attached' && (
            <button type="button" className={styles.backBtn} onClick={handleBack}>
              ← Sessions
            </button>
          )}
        </span>
      </div>

      {/* Non-terminal error banner */}
      {wsError && (
        <div className={styles.errBanner}>
          {wsError}
          <button type="button" onClick={() => setWsError(null)}>✕</button>
        </div>
      )}

      {/* Session picker — shown before terminal is attached */}
      {phase !== 'attached' && (
        <div className={styles.termOutput} style={{ overflowY: 'auto', padding: '8px' }}>
          {(phase === 'connecting' || phase === 'listing') && (
            <div className={styles.infoRow}>
              <span className={styles.spinnerRow}>
                <span className={styles.spinner} />
                {phase === 'connecting' ? 'Connecting…' : 'Listing sessions…'}
              </span>
            </div>
          )}

          {phase === 'attaching' && (
            <div className={styles.infoRow}>
              <span className={styles.spinnerRow}>
                <span className={styles.spinner} />
                Attaching to {pickedSessionRef.current}…
              </span>
            </div>
          )}

          {phase === 'picking' && (
            <>
              {sessions.length === 0 && (
                <div className={styles.infoRow}>
                  No sessions reported by the sandbox for this agent
                  (<code>agent_id={agentId}</code>). If a tmux session is running on the
                  VM, check <code>aiwg serve</code> logs for the <code>session_list</code>
                  reply (the sandbox may know the agent under a different id).
                  Click <strong>+ New Terminal</strong> below to spawn a fresh shell.
                </div>
              )}
              {sessions.length > 0 && sessions.every(s => !(s.running && s.session_type === 'interactive')) && (
                <div className={styles.infoRow}>
                  {sessions.length} session(s) returned but none are attachable
                  (running + interactive). Non-interactive types
                  ({Array.from(new Set(sessions.map(s => s.session_type))).join(', ')})
                  don't carry a PTY. Click <strong>+ New Terminal</strong> to spawn one.
                </div>
              )}

              {sessions.map((s) => (
                <div key={s.session_id || s.session_name} className={styles.sessionRow}>
                  <span
                    className={[
                      styles.dot,
                      s.running && s.session_type === 'interactive' ? styles.dotRunning : styles.dotExited,
                    ].join(' ')}
                    title={s.running ? `${s.session_type} — running` : 'not running'}
                  />
                  <span className={styles.sessionLabel} title={s.command}>{s.session_name}</span>
                  <span className={styles.sessionAge}>{s.session_type}</span>
                  <button
                    type="button"
                    className={styles.attachBtn}
                    onClick={() => handleAttach(s)}
                    disabled={!s.running || s.session_type !== 'interactive'}
                    title={
                      !s.running ? 'Session not running'
                      : s.session_type !== 'interactive' ? 'No PTY (headless/background)'
                      : 'Attach terminal'
                    }
                  >
                    Attach
                  </button>
                </div>
              ))}

              <button type="button" className={styles.newTermBtn} onClick={handleNewTerminal}>
                + New Terminal
              </button>
            </>
          )}
        </div>
      )}

      {/*
       * xterm container — always in the DOM once the component mounts,
       * display:none while picking so it doesn't take space, display:block
       * when attached so FitAddon measures real dimensions.
       * The terminal lifecycle useEffect fires AFTER this paint.
       *
       * Overlay: when the WS drops while attached, the xterm stays mounted
       * but receives no data. An overlay communicates reconnect progress and
       * surfaces a Reload button on exhaustion.
       */}
      <div
        ref={containerRef}
        className={styles.termOutput}
        style={{ position: 'relative', display: phase === 'attached' ? 'block' : 'none' }}
      >
        {!connected && (
          <div className={[styles.termOverlay, isExhausted ? styles.termOverlayLost : ''].join(' ').trim()}>
            {isExhausted ? (
              <>
                <span>Connection lost</span>
                <button
                  type="button"
                  className={styles.reloadBtn}
                  onClick={() => window.location.reload()}
                >
                  Reload
                </button>
              </>
            ) : (
              <span className={styles.spinnerRow}>
                <span className={styles.spinner} />
                {statusText}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Session Picker (thin toggle wrapper) ----

export interface SessionPickerProps {
  sandboxId: string;
  agentId: string;
}

export function SessionPicker({ sandboxId, agentId }: SessionPickerProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.sessionPicker}>
      <button
        type="button"
        className={styles.toggleBtn}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Terminal Sessions
        <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={styles.drawer}>
          <TerminalPane sandboxId={sandboxId} agentId={agentId} />
        </div>
      )}
    </div>
  );
}
