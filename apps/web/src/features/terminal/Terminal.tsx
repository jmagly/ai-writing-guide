/**
 * xterm.js terminal viewer component.
 *
 * Renders PTY output from a WebSocket session with full ANSI color support,
 * auto-resize, and reconnect handling.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Terminal as XTerminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import { ReconnectingWs, ptyWsUrl } from '../../lib/ws.js';
import styles from './Terminal.module.css';

interface TerminalProps {
  /** PTY session ID */
  sessionId: string;
  /** If true, disable stdin (viewer-only mode) */
  readOnly?: boolean;
}

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'exited';

export function Terminal({ sessionId, readOnly = false }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<ReconnectingWs | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [exitCode, setExitCode] = useState<number | null>(null);

  const downloadLog = useCallback(() => {
    if (!xtermRef.current) return;
    const lines: string[] = [];
    const buf = xtermRef.current.buffer.active;
    for (let i = 0; i < buf.length; i++) {
      lines.push(buf.getLine(i)?.translateToString(true) ?? '');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aiwg-session-${sessionId}.log`;
    a.click();
  }, [sessionId]);

  const clearTerminal = useCallback(() => {
    xtermRef.current?.clear();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    async function init() {
      // Dynamic imports — xterm.js is an optional frontend dep
      const { Terminal: XTerm } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');

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
        scrollback: 5000,
        cursorBlink: !readOnly,
        disableStdin: readOnly,
      });

      const fit = new FitAddon();
      const webLinks = new WebLinksAddon();
      term.loadAddon(fit);
      term.loadAddon(webLinks);
      term.open(containerRef.current!);
      fit.fit();

      xtermRef.current = term;
      fitRef.current = fit;

      // Resize observer — skip degenerate container sizes (sidebar collapse,
      // hidden panel, dev StrictMode double-mount). A fit() call against a
      // ~0px box computes garbage cols/rows that would clamp tmux to a
      // sub-region of the visible area.
      const ro = new ResizeObserver((entries) => {
        const box = entries[0]?.contentRect;
        if (!box || box.width < 50 || box.height < 20) return;
        fit.fit();
      });
      ro.observe(containerRef.current!);

      // WebSocket
      const ws = new ReconnectingWs(ptyWsUrl(sessionId), {
        initialDelay: 500,
        maxDelay: 30_000,
        backoffFactor: 2,
      });
      wsRef.current = ws;

      const unsubscribe = ws.onMessage((msg) => {
        if (!isMounted) return;
        if (msg.type === 'data' && msg.payload !== undefined) {
          term.write(msg.payload);
          setStatus('connected');
        } else if (msg.type === 'exit') {
          setExitCode(msg.code ?? 0);
          setStatus('exited');
        } else if (msg.type === 'error' && msg.message) {
          term.writeln(`\r\n\x1b[31mError: ${msg.message}\x1b[0m`);
        }
      });

      // Forward stdin to PTY
      if (!readOnly) {
        term.onData((data) => {
          ws.send({ type: 'data', payload: data });
        });
        term.onResize(({ cols, rows }) => {
          // Drop degenerate sizes — tmux clamps the window to whatever it
          // gets and can't recover a sub-region paint until a clean resize.
          if (
            !Number.isFinite(cols) ||
            !Number.isFinite(rows) ||
            cols < 20 ||
            rows < 5
          ) {
            return;
          }
          ws.send({ type: 'resize', cols, rows });
        });
      }

      return () => {
        isMounted = false;
        unsubscribe();
        ws.destroy();
        ro.disconnect();
        term.dispose();
      };
    }

    const cleanupPromise = init();
    return () => {
      isMounted = false;
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [sessionId, readOnly]);

  return (
    <section className={styles.wrapper} aria-label={`Terminal session ${sessionId}`}>
      <header className={styles.toolbar} role="toolbar" aria-label="Terminal controls">
        <span className={styles.sessionLabel}>
          Session: <code>{sessionId}</code>
        </span>
        <span
          className={`${styles.badge} ${styles[status]}`}
          role="status"
          aria-live="polite"
          aria-label={`Connection status: ${status}`}
        >
          {status}
          {status === 'exited' && exitCode !== null ? ` (exit ${exitCode})` : ''}
        </span>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={clearTerminal}
            aria-label="Clear terminal"
            title="Clear"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={downloadLog}
            aria-label="Download terminal log"
            title="Download log"
          >
            Download
          </button>
        </div>
      </header>
      <div ref={containerRef} className={styles.terminal} role="region" aria-label="Terminal output" />
    </section>
  );
}
