/**
 * ScreenReader — PTY screen state parser for Orchestrator-over-PTY
 *
 * Parses raw PTY byte streams into structured, LLM-readable screen state.
 * Uses @xterm/headless as the VT100/ANSI state machine so all escape
 * sequences (colour, cursor movement, clear-screen, etc.) are handled
 * correctly without a DOM.
 *
 * @issue #754
 * @see src/serve/pty-bridge.ts — PTY WebSocket bridge
 */

import { EventEmitter } from 'events';
import { requireFeaturePackage } from '../features/runtime.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let XtermTerminal: new (opts: Record<string, unknown>) => import('@xterm/headless').Terminal;

try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xterm = requireFeaturePackage('@xterm/headless') as any;
  XtermTerminal = xterm.Terminal;
} catch {
  // Will be checked at construction time
}

// ============================================================
// Types
// ============================================================

export interface ScreenState {
  /** Parsed grid of visible text (rows × cols) */
  text: string[][];
  /** Current cursor position within the visible viewport */
  cursor: { row: number; col: number };
  /** Recent scrollback lines no longer in the visible viewport */
  scrollback: string[];
  /** Rendered as a single readable string */
  summary: string;
  /** Heuristic: is the terminal waiting for user input? */
  prompt_detected: boolean;
  /** The text of the detected prompt (when prompt_detected is true) */
  prompt_text?: string;
}

// ============================================================
// Prompt detection patterns
// ============================================================

/** Patterns that indicate the terminal is waiting for input. */
const PROMPT_PATTERNS: RegExp[] = [
  /[$#>%]\s*$/,           // bash/zsh/sh: ends with $ # > %
  /^\s*\?\s+/,            // inquirer: starts with ?
  /\[y\/n\]/i,            // yes/no confirmation
  /\[y\/N\]/,             // yes/no (default No)
  /\[Y\/n\]/,             // yes/no (default Yes)
  /\(yes\/no\)/i,         // SSH-style yes/no
  /\(y\/n\)/i,            // generic y/n
];

// ============================================================
// ScreenReader
// ============================================================

export class ScreenReader {
  private terminal: import('@xterm/headless').Terminal;
  private _rows: number;
  private _cols: number;
  private emitter: EventEmitter;
  private disposed = false;

  constructor(opts?: { rows?: number; cols?: number }) {
    if (!XtermTerminal) {
      throw new Error(
        'Terminal screen parsing is unavailable; run `aiwg features install terminal`',
      );
    }

    this._rows = opts?.rows ?? 24;
    this._cols = opts?.cols ?? 80;
    this.emitter = new EventEmitter();
    // Suppress Node.js MaxListenersExceededWarning for tests with many awaitChange calls
    this.emitter.setMaxListeners(100);

    this.terminal = new XtermTerminal({
      rows: this._rows,
      cols: this._cols,
      allowProposedApi: true,
      scrollback: 1000,
      logLevel: 'error',
    });
  }

  /** Feed raw PTY data into the parser */
  write(data: string): void {
    if (this.disposed) return;
    const coreWriteSync = (this.terminal as unknown as { _core?: { writeSync?: (input: string) => void } })._core?.writeSync;
    if (coreWriteSync) {
      coreWriteSync.call((this.terminal as unknown as { _core: unknown })._core, data);
      this.emitter.emit('change');
      return;
    }
    this.terminal.write(data, () => {
      // Fired after xterm has processed the write through its state machine
      this.emitter.emit('change');
    });
  }

  /** Get current parsed screen state */
  getState(): ScreenState {
    const buf = this.terminal.buffer.active;
    const viewportRows = this.terminal.rows;
    const viewportCols = this.terminal.cols;

    // ---- visible text grid ----
    const text: string[][] = [];
    for (let r = 0; r < viewportRows; r++) {
      const line = buf.getLine(buf.viewportY + r);
      if (!line) {
        text.push(Array(viewportCols).fill(''));
        continue;
      }
      const row: string[] = [];
      for (let c = 0; c < viewportCols; c++) {
        const cell = line.getCell(c);
        row.push(cell?.getChars() ?? '');
      }
      text.push(row);
    }

    // ---- cursor ----
    const cursor = {
      row: buf.cursorY,
      col: buf.cursorX,
    };

    // ---- scrollback ----
    // baseY is the line index of the first viewport row in the full buffer.
    // Lines 0..(baseY-1) are scrollback content.
    const scrollback: string[] = [];
    const scrollbackStart = Math.max(0, buf.baseY - 50); // keep last 50 scrollback lines
    for (let r = scrollbackStart; r < buf.baseY; r++) {
      const line = buf.getLine(r);
      if (line) {
        const lineStr = line.translateToString(true);
        scrollback.push(lineStr);
      }
    }

    // ---- summary ----
    const summary = buildSummary(text);

    // ---- prompt detection ----
    const { prompt_detected, prompt_text } = detectPrompt(text, cursor);

    return { text, cursor, scrollback, summary, prompt_detected, prompt_text };
  }

  /**
   * Wait for the next screen change, with timeout.
   * Resolves with updated ScreenState when write() causes a change,
   * or with the current state if the timeout elapses first.
   */
  awaitChange(opts?: { timeout?: number }): Promise<ScreenState> {
    const timeoutMs = opts?.timeout ?? 5000;

    return new Promise((resolve) => {
      if (this.disposed) {
        resolve(this.getState());
        return;
      }

      let timer: ReturnType<typeof setTimeout> | null = null;

      const handler = () => {
        if (timer) clearTimeout(timer);
        resolve(this.getState());
      };

      this.emitter.once('change', handler);

      timer = setTimeout(() => {
        this.emitter.removeListener('change', handler);
        resolve(this.getState());
      }, timeoutMs);
    });
  }

  /**
   * Flush all pending writes through xterm's internal write queue.
   * Enqueues an empty write and resolves when its callback fires, which
   * guarantees all previously queued writes have been processed.
   */
  flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.disposed) { resolve(); return; }
      this.terminal.write('', () => resolve());
    });
  }

  /** Get human-readable summary of visible screen */
  getSummary(): string {
    return buildSummary(this.getState().text);
  }

  /** Clean up resources */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.emitter.removeAllListeners();
    try {
      this.terminal.dispose();
    } catch {
      // ignore errors during cleanup
    }
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Build a human-readable summary from the visible text grid.
 * Trailing rows that are entirely empty are stripped.
 */
function buildSummary(text: string[][]): string {
  const lines = text.map((row) => row.join('').trimEnd());
  // Remove trailing blank lines
  let lastNonEmpty = lines.length - 1;
  while (lastNonEmpty >= 0 && lines[lastNonEmpty].trim() === '') {
    lastNonEmpty--;
  }
  return lines.slice(0, lastNonEmpty + 1).join('\n');
}

/**
 * Heuristic prompt detection.
 * Examines the last non-empty visible line and the line at cursor position.
 */
function detectPrompt(
  text: string[][],
  cursor: { row: number; col: number },
): { prompt_detected: boolean; prompt_text?: string } {
  // Gather candidate lines: the cursor row and the last non-empty row
  const candidates: string[] = [];

  // Line where cursor currently sits
  if (cursor.row >= 0 && cursor.row < text.length) {
    const cursorLine = text[cursor.row].join('').trimEnd();
    if (cursorLine) candidates.push(cursorLine);
  }

  // Last non-empty visible line
  for (let r = text.length - 1; r >= 0; r--) {
    const line = text[r].join('').trimEnd();
    if (line) {
      if (!candidates.includes(line)) candidates.push(line);
      break;
    }
  }

  for (const line of candidates) {
    for (const pattern of PROMPT_PATTERNS) {
      if (pattern.test(line)) {
        return { prompt_detected: true, prompt_text: line };
      }
    }
  }

  return { prompt_detected: false };
}
