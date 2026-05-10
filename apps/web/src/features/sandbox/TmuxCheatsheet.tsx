/**
 * Tmux cheatsheet for the sandbox tab strip (#1166).
 *
 * First-time operators dropped into a tmux session via `aiwg serve`'s
 * sandbox attach flow often have no idea how to detach, scroll, or
 * switch panes — and reach for Ctrl-C or close the browser tab when
 * they want to detach, severing the websocket. This component renders
 * a small, dismissible cheatsheet covering the operations operators
 * reach for first. The detach row is visually highlighted because
 * "how do I get out of this terminal?" is the most-asked question.
 *
 * The toggle button lives in the tab strip; the panel slots in below
 * it (between tab strip and the active pane). Open/closed state
 * persists across reloads via localStorage like
 * `aiwg:sandbox:paneStackHeight`.
 */

import { useCallback, useEffect, useState } from 'react';
import styles from './TmuxCheatsheet.module.css';

const OPEN_STORAGE_KEY = 'aiwg:sandbox:tmuxCheatsheetOpen';

function loadStoredOpen(): boolean {
  try {
    return window.localStorage.getItem(OPEN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistOpen(open: boolean): void {
  try {
    if (open) {
      window.localStorage.setItem(OPEN_STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(OPEN_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable — silently swallow; the toggle still works in-session
  }
}

interface CheatRow {
  action: string;
  keys: Array<string | { kbd: string }>;
  detach?: boolean;
}

const ROWS: CheatRow[] = [
  { action: 'Detach session (back to picker)', keys: [{ kbd: 'Ctrl-b' }, { kbd: 'd' }], detach: true },
  { action: 'Scroll / copy mode (q to exit)', keys: [{ kbd: 'Ctrl-b' }, { kbd: '[' }] },
  { action: 'Page up / down in scroll mode', keys: [{ kbd: 'PgUp' }, '/', { kbd: 'PgDn' }] },
  { action: 'New window', keys: [{ kbd: 'Ctrl-b' }, { kbd: 'c' }] },
  { action: 'Next / previous window', keys: [{ kbd: 'Ctrl-b' }, { kbd: 'n' }, '/', { kbd: 'Ctrl-b' }, { kbd: 'p' }] },
  { action: 'List windows', keys: [{ kbd: 'Ctrl-b' }, { kbd: 'w' }] },
  { action: 'Split pane horizontally', keys: [{ kbd: 'Ctrl-b' }, { kbd: '"' }] },
  { action: 'Split pane vertically', keys: [{ kbd: 'Ctrl-b' }, { kbd: '%' }] },
  { action: 'Switch pane (or arrow keys)', keys: [{ kbd: 'Ctrl-b' }, { kbd: 'o' }] },
  { action: 'Close pane (exits shell)', keys: [{ kbd: 'Ctrl-d' }] },
  { action: 'Kill window', keys: [{ kbd: 'Ctrl-b' }, { kbd: '&' }] },
  { action: 'Show all keybindings', keys: [{ kbd: 'Ctrl-b' }, { kbd: '?' }] },
];

export interface TmuxCheatsheetToggleProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * The `[?]` toggle button — render this inside the tab strip alongside
 * the close-tab buttons. The panel itself renders separately via
 * <TmuxCheatsheetPanel>.
 */
export function TmuxCheatsheetToggle({ open, onToggle }: TmuxCheatsheetToggleProps) {
  return (
    <button
      type="button"
      className={styles.toggleButton}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="aiwg-tmux-cheatsheet"
      title={open ? 'Hide tmux cheatsheet' : 'Show tmux cheatsheet'}
    >
      ?
    </button>
  );
}

/**
 * The cheatsheet panel itself — render below the tab strip when `open`
 * is true. Keep it null when closed so it doesn't steal vertical real
 * estate from the terminal.
 */
export function TmuxCheatsheetPanel({ open }: { open: boolean }) {
  if (!open) return null;
  return (
    <div id="aiwg-tmux-cheatsheet" className={styles.panel} role="region" aria-label="Tmux keyboard shortcuts">
      <div className={styles.header}>
        <span className={styles.title}>tmux quick reference</span>
        <span className={styles.note}>default prefix: Ctrl-b</span>
      </div>
      <div className={styles.grid}>
        {ROWS.map((row, i) => (
          <div key={i} className={`${styles.row} ${row.detach ? styles.detachRow : ''}`}>
            <span className={styles.action}>{row.action}</span>
            <span className={styles.keys}>
              {row.keys.map((k, j) =>
                typeof k === 'string' ? (
                  <span key={j}> {k} </span>
                ) : (
                  <kbd key={j} className={styles.kbd}>
                    {k.kbd}
                  </kbd>
                ),
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Convenience hook — manages open/close state with localStorage persistence.
 */
export function useTmuxCheatsheet(): { open: boolean; toggle: () => void } {
  const [open, setOpen] = useState<boolean>(() => loadStoredOpen());

  useEffect(() => {
    persistOpen(open);
  }, [open]);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  return { open, toggle };
}
