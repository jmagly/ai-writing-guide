/**
 * HITL (Human-in-the-Loop) Drawer
 *
 * Slides up from the bottom when an agent running in agentic-sandbox
 * is waiting for user input. Persists across tab navigation.
 *
 * Polls GET /api/hitl every 2s for pending requests.
 * Submits responses via POST /api/hitl/:id/respond.
 *
 * @issue #732
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { api, type HitlRequest } from '../../lib/api.js';
import styles from './HitlDrawer.module.css';

/**
 * Strip ANSI escape sequences and TTY-only control bytes from terminal output
 * so it renders cleanly in plain HTML. The browser drops the ESC byte itself
 * but leaves the visible CSI tail (e.g. "[1;30r"), which is what users see as
 * gibberish in HITL prompts captured from a PTY stream.
 */
function stripAnsi(input: string): string {
  if (!input) return '';
  return input
    // CSI: ESC [ ... <final byte>
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    // OSC: ESC ] ... BEL (or ST = ESC \)
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    // Other ESC-prefixed two-char sequences (ESC =, ESC >, etc.)
    .replace(/\x1b[@-Z\\-_]/g, '')
    // Lone ESC
    .replace(/\x1b/g, '')
    // Carriage returns and bells become noise in flowing text
    .replace(/[\r\x07]/g, '');
}

// ---- State ----

interface State {
  requests: HitlRequest[];
  activeIdx: number;
  error: string | null;
}

type Action =
  | { type: 'SET_REQUESTS'; requests: HitlRequest[] }
  | { type: 'SET_ACTIVE'; idx: number }
  | { type: 'REMOVE'; id: string }
  | { type: 'SET_ERROR'; error: string | null };

const INITIAL: State = { requests: [], activeIdx: 0, error: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_REQUESTS':
      return { ...state, requests: action.requests, error: null };
    case 'SET_ACTIVE':
      return { ...state, activeIdx: action.idx };
    case 'REMOVE': {
      const filtered = state.requests.filter((r) => r.id !== action.id);
      return {
        ...state,
        requests: filtered,
        activeIdx: Math.min(state.activeIdx, Math.max(0, filtered.length - 1)),
      };
    }
    case 'SET_ERROR':
      return { ...state, error: action.error };
    default:
      return state;
  }
}

// ---- Component ----

export function HitlDrawer() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Poll for pending HITL requests
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const data = await api.hitl();
        if (active) dispatch({ type: 'SET_REQUESTS', requests: data.requests });
      } catch {
        // Server not ready — ignore
      }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => { active = false; clearInterval(id); };
  }, []);

  // Focus input when a new request appears
  useEffect(() => {
    if (state.requests.length > 0) {
      inputRef.current?.focus();
    }
  }, [state.requests.length]);

  const handleRespond = useCallback(async () => {
    const req = state.requests[state.activeIdx];
    if (!req || !input.trim()) return;
    setSubmitting(true);
    try {
      await api.hitlRespond(req.id, input.trim());
      dispatch({ type: 'REMOVE', id: req.id });
      setInput('');
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: `Failed to send response: ${err}` });
    } finally {
      setSubmitting(false);
    }
  }, [state.requests, state.activeIdx, input]);

  const handleDismiss = useCallback(async () => {
    const req = state.requests[state.activeIdx];
    if (!req) return;
    try {
      await api.hitlDismiss(req.id);
      dispatch({ type: 'REMOVE', id: req.id });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: `Failed to dismiss: ${err}` });
    }
  }, [state.requests, state.activeIdx]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Send on Enter (without Shift) or Ctrl+Enter (#908)
    if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && e.ctrlKey)) {
      e.preventDefault();
      handleRespond();
    }
  }, [handleRespond]);

  // Don't render if no pending requests
  if (state.requests.length === 0) return null;

  const active = state.requests[state.activeIdx];

  return (
    <div className={styles.drawer} role="complementary" aria-label="Agent input required">
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge} role="status" aria-live="polite">
            {state.requests.length} pending
          </span>
          <span className={styles.agent}>
            Agent: <strong>{active?.agentId}</strong>
          </span>
        </div>
        {state.requests.length > 1 && (
          <div className={styles.tabs} role="tablist" aria-label="Pending requests">
            {state.requests.map((r, i) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={i === state.activeIdx}
                className={i === state.activeIdx ? styles.tabActive : styles.tab}
                onClick={() => dispatch({ type: 'SET_ACTIVE', idx: i })}
              >
                {r.agentId}
              </button>
            ))}
          </div>
        )}
      </div>

      {active && (
        <div className={styles.body}>
          <div className={styles.prompt}>
            <p className={styles.promptText}>{stripAnsi(active.prompt)}</p>
            {active.context && (
              <details className={styles.context}>
                <summary>Recent output context</summary>
                <pre>{stripAnsi(active.context)}</pre>
              </details>
            )}
          </div>

          <div className={styles.inputArea}>
            <textarea
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response... (Enter or Ctrl+Enter to send, Shift+Enter for newline)"
              rows={2}
              disabled={submitting}
              aria-label="Response to agent"
            />
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.sendBtn}
                onClick={handleRespond}
                disabled={submitting || !input.trim()}
              >
                {submitting ? 'Sending...' : 'Send'}
              </button>
              <button
                type="button"
                className={styles.dismissBtn}
                onClick={handleDismiss}
              >
                Dismiss
              </button>
            </div>
          </div>

          {state.error && (
            <div className={styles.error} role="alert">
              {state.error}
              <button type="button" onClick={() => dispatch({ type: 'SET_ERROR', error: null })}>
                x
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
