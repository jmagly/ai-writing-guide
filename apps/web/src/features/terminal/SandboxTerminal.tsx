/**
 * SandboxTerminal — xterm.js viewer for agentic-sandbox v2 sessions over
 * the pty-ws/v1 binding.
 *
 * Complements the existing AIWG-PTY-bridge Terminal.tsx component:
 *   - Terminal.tsx talks to the bridge's `/ws/pty/:sessionId` endpoint.
 *   - SandboxTerminal talks to a sandbox session at
 *     `wss://host/agents/{id}/sessions/{sid}/attach`.
 *
 * Role gating: the component shows a read-only badge when the assigned
 * role is `observer`; a "Take Control" button when it is observer and
 * the session is multi-user; a "Release Control" button when it is
 * controller. Keystrokes are dropped silently in observer mode.
 *
 * @issue #1257
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Terminal as XTerminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';

import {
  PtyWsClient,
  type BindingHelloFrame,
  type KeyframeFrame,
  type MembershipChangedFrame,
  type OutputFrame,
  type PtyRole,
  decodeBase64Bytes,
} from '../../lib/pty-ws.js';

import styles from './Terminal.module.css';

interface SandboxTerminalProps {
  /** Full wss:// URL to the sandbox session's attach endpoint. */
  attachUrl: string;
  /** Bearer token, if the URL doesn't already include credentials. */
  token?: string;
  /** Optional sequence number to resume from (set on reconnect). */
  replayFrom?: number;
}

type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'closed'
  | 'protocol_error';

export function SandboxTerminal({ attachUrl, token, replayFrom }: SandboxTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const clientRef = useRef<PtyWsClient | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [role, setRole] = useState<PtyRole>('observer');
  const [sessionId, setSessionId] = useState<string>('');
  const [members, setMembers] = useState<MembershipChangedFrame['members']>([]);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [lastSeq, setLastSeq] = useState<number>(0);

  const takeControl = useCallback(() => {
    clientRef.current?.requestRole('controller');
  }, []);
  const releaseControl = useCallback(() => {
    clientRef.current?.releaseRole();
  }, []);
  const requestKeyframe = useCallback(() => {
    clientRef.current?.requestKeyframe();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;

    async function init() {
      const { Terminal: XTerm } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      if (!isMounted || !containerRef.current) return;

      const term = new XTerm({
        theme: {
          background: '#0d0d0d',
          foreground: '#e0e0e0',
          cursor: '#e0e0e0',
          selectionBackground: 'rgba(255,255,255,0.3)',
        },
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        fontSize: 14,
        lineHeight: 1.4,
        scrollback: 10_000,
        cursorBlink: false, // role determines cursorBlink — flipped below
        disableStdin: true, // observer by default — flipped below
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current!);
      fit.fit();

      xtermRef.current = term;
      fitRef.current = fit;

      const ro = new ResizeObserver((entries) => {
        const box = entries[0]?.contentRect;
        if (!box || box.width < 50 || box.height < 20) return;
        fit.fit();
        const client = clientRef.current;
        if (client && client.getRole() === 'controller') {
          client.resize(term.cols, term.rows);
        }
      });
      ro.observe(containerRef.current!);

      const client = new PtyWsClient({
        url: attachUrl,
        ...(token !== undefined ? { token } : {}),
        ...(replayFrom !== undefined ? { replayFrom } : {}),
        cols: term.cols,
        rows: term.rows,
      });
      clientRef.current = client;

      // Decoder once — Uint8Array → string for xterm.write.
      const decoder = new TextDecoder();

      const renderBase64 = (b64: string) => {
        const bytes = decodeBase64Bytes(b64);
        term.write(decoder.decode(bytes));
      };

      client.on({
        onOpen: (hello: BindingHelloFrame) => {
          if (!isMounted) return;
          setSessionId(hello.session_id);
          setStatus('connected');
        },
        onOutput: (frame: OutputFrame) => {
          if (!isMounted) return;
          renderBase64(frame.data);
          setLastSeq(frame.seq);
        },
        onKeyframe: (frame: KeyframeFrame) => {
          if (!isMounted) return;
          term.reset();
          renderBase64(frame.data);
          setLastSeq(frame.seq);
        },
        onRoleAssigned: () => {
          /* role tracked via onRoleChange */
        },
        onRoleChange: (newRole: PtyRole) => {
          if (!isMounted) return;
          setRole(newRole);
          // Toggle xterm input — disableStdin is set at construction
          // and there's no public toggle; manage by attaching/detaching
          // the onData handler.
          term.options.cursorBlink = newRole === 'controller';
        },
        onMembershipChanged: (frame: MembershipChangedFrame) => {
          if (!isMounted) return;
          setMembers(frame.members);
        },
        onClosed: (frame) => {
          if (!isMounted) return;
          setExitCode(frame.exit_code ?? null);
          setStatus('closed');
        },
        onError: (err) => {
          if (!isMounted) return;
          const detail = err instanceof Error ? err.message : err.detail ?? err.code;
          setErrorDetail(detail);
          // Subprotocol negotiation failure is fatal — distinguish it.
          if (err instanceof Error && /subprotocol/.test(err.message)) {
            setStatus('protocol_error');
          }
        },
      });

      try {
        await client.connect();
      } catch (e) {
        if (!isMounted) return;
        setErrorDetail((e as Error).message);
        setStatus('protocol_error');
        return () => {
          ro.disconnect();
          term.dispose();
        };
      }

      // Forward keystrokes — gated by role. The handler is always
      // attached so a role flip mid-session takes effect immediately
      // without an effect-replay.
      const onDataDispose = term.onData((data) => {
        if (clientRef.current?.getRole() !== 'controller') return;
        try {
          clientRef.current?.sendInput(data);
        } catch {
          /* swallow — race with role change is harmless */
        }
      });

      const onResizeDispose = term.onResize(({ cols, rows }) => {
        if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols < 20 || rows < 5) return;
        if (clientRef.current?.getRole() !== 'controller') return;
        try {
          clientRef.current?.resize(cols, rows);
        } catch {
          /* not connected yet */
        }
      });

      return () => {
        isMounted = false;
        onDataDispose.dispose();
        onResizeDispose.dispose();
        ro.disconnect();
        client.close();
        term.dispose();
      };
    }

    const cleanupPromise = init();
    return () => {
      isMounted = false;
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [attachUrl, token, replayFrom]);

  const isController = role === 'controller';
  const observerCount = members.filter((m) => m.role === 'observer').length;
  const controllerMember = members.find((m) => m.role === 'controller');

  return (
    <section className={styles.wrapper} aria-label={`Sandbox session ${sessionId || 'connecting'}`}>
      <header className={styles.toolbar} role="toolbar" aria-label="Sandbox terminal controls">
        <span className={styles.sessionLabel}>
          Session: <code>{sessionId || '…'}</code>
        </span>
        <span
          className={`${styles.badge} ${styles[status]}`}
          role="status"
          aria-live="polite"
          aria-label={`Connection status: ${status}`}
        >
          {status}
          {status === 'closed' && exitCode !== null ? ` (exit ${exitCode})` : ''}
        </span>
        <span
          className={styles.badge}
          aria-label={`Current role: ${role}`}
          title={isController ? 'You have control of this session' : 'View-only — request control to type'}
        >
          {role}
          {!isController && controllerMember ? ` · controlled by ${controllerMember.client_id}` : ''}
          {observerCount > 0 ? ` · ${observerCount} observer${observerCount === 1 ? '' : 's'}` : ''}
        </span>
        <div className={styles.actions}>
          {!isController ? (
            <button
              type="button"
              onClick={takeControl}
              aria-label="Request controller role"
              title="Take control"
              disabled={status !== 'connected'}
            >
              Take Control
            </button>
          ) : (
            <button
              type="button"
              onClick={releaseControl}
              aria-label="Release controller role"
              title="Release control to observers"
            >
              Release Control
            </button>
          )}
          <button
            type="button"
            onClick={requestKeyframe}
            aria-label="Request full screen refresh from server"
            title="Refresh keyframe"
            disabled={status !== 'connected'}
          >
            Refresh
          </button>
        </div>
        {errorDetail ? (
          <span className={styles.error} role="alert">
            {errorDetail}
          </span>
        ) : null}
        <span className={styles.sessionLabel} aria-hidden="true">
          seq: {lastSeq}
        </span>
      </header>
      <div ref={containerRef} className={styles.terminal} role="region" aria-label="Sandbox terminal output" />
    </section>
  );
}
