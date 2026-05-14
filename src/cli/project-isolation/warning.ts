// Warning emission + 3-second cancellable delay used by the `aiwg use`
// invocation path. Wraps detect.ts to enforce the trigger contract defined
// in UC-NUA-002 / SAD §5.1.2.

import { homedir } from 'node:os';
import { detectProjectSignal, isUnsuitableCwd } from './detect.js';

// Verbatim warning text from UC-NUA-002. Tests assert string equality so
// any wording change here breaks the build deliberately (NFR-USE-01).
export const WARNING_TEXT =
  'No project detected here. AIWG will deploy to the current directory. To associate AIWG with a specific project, run this from your project root. Continuing in 3 seconds — press Ctrl-C to cancel.';

export const GLOBAL_INSTALL_INFO =
  'AIWG_GLOBAL_INSTALL=1 set — deploying to current directory without project check.';

export const DEFAULT_DELAY_MS = 3000;

export interface WarningOptions {
  cwd: string;
  // Override for tests; defaults to os.homedir().
  home?: string;
  // Override for tests; defaults to process.env.
  env?: NodeJS.ProcessEnv;
  // Override for tests; defaults to DEFAULT_DELAY_MS.
  delayMs?: number;
  // Override for tests; defaults to writing to stderr.
  writer?: (msg: string) => void;
  // Override for tests; default appends to .aiwg/activity.log via the
  // activity-log adapter. Tests inject a no-op or recording stub.
  logActivity?: (operation: string, summary: string) => Promise<void>;
  // Override for tests; default registers a SIGINT handler that resolves
  // the delay promise with `cancelled = true`. Tests use fake timers.
  delayWithCancel?: (ms: number) => Promise<{ cancelled: boolean }>;
}

export interface WarningResult {
  // Whether the user cancelled during the delay.
  cancelled: boolean;
  // Why the warning path ran (or didn't). Useful for tests and logging.
  outcome: 'global-install' | 'project-signal-found' | 'cwd-ok' | 'warned' | 'cancelled';
}

// The entrypoint called early in `aiwg use`. Returns synchronously when no
// warning is needed; awaits the delay when the warning fires.
export async function maybeWarnProjectIsolation(
  opts: WarningOptions = { cwd: process.cwd() }
): Promise<WarningResult> {
  const cwd = opts.cwd;
  const home = opts.home ?? homedir();
  const env = opts.env ?? process.env;
  const writer = opts.writer ?? defaultStderrWriter;
  const logActivity = opts.logActivity ?? defaultActivityLogger;
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
  const delayWithCancel = opts.delayWithCancel ?? defaultDelayWithCancel;

  // Env-var opt-out is checked first so detection work is skipped entirely
  // (NFR-REL-02, NFR-PERF-01).
  if (env.AIWG_GLOBAL_INSTALL === '1') {
    writer(GLOBAL_INSTALL_INFO);
    return { cancelled: false, outcome: 'global-install' };
  }

  // If we find a signal anywhere on the walk, the cwd is part of a project.
  // We continue silently — no warning, no info line — to keep the
  // default UX unchanged (NFR-COMPAT-02).
  const detection = detectProjectSignal(cwd);
  if (detection.found) {
    return { cancelled: false, outcome: 'project-signal-found' };
  }

  // No signal AND the cwd isn't a recognized surprise location. We assume
  // the user knows what they're doing and continue silently.
  if (!isUnsuitableCwd(cwd, home)) {
    return { cancelled: false, outcome: 'cwd-ok' };
  }

  writer(WARNING_TEXT);
  const result = await delayWithCancel(delayMs);
  if (result.cancelled) {
    return { cancelled: true, outcome: 'cancelled' };
  }

  // Activity-log write happens AFTER a non-cancelled emission so cancelled
  // runs leave no on-disk evidence (NFR-OBS-01 + UC-NUA-002 A2 postcondition).
  try {
    await logActivity('warn', `no-project-signal: ${cwd}`);
  } catch {
    // Activity-log failure must not block deployment — it's observability,
    // not control flow. Swallow and continue.
  }
  return { cancelled: false, outcome: 'warned' };
}

function defaultStderrWriter(msg: string): void {
  process.stderr.write(msg + '\n');
}

// Wait `ms` milliseconds OR until the user sends SIGINT. Either branch
// removes the listener so the rest of the process stays responsive.
function defaultDelayWithCancel(ms: number): Promise<{ cancelled: boolean }> {
  return new Promise<{ cancelled: boolean }>((resolve) => {
    const onSigint = () => {
      cleanup();
      resolve({ cancelled: true });
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve({ cancelled: false });
    }, ms);
    const cleanup = () => {
      clearTimeout(timer);
      process.removeListener('SIGINT', onSigint);
    };
    process.on('SIGINT', onSigint);
  });
}

// Lazy-imported activity-log writer so a missing storage adapter at startup
// (e.g. in tests that don't touch the filesystem) doesn't crash the load.
async function defaultActivityLogger(operation: string, summary: string): Promise<void> {
  const { resolveStorage } = await import('../../storage/index.js');
  const { formatEntry } = await import('../../activity-log/types.js');
  const adapter = await resolveStorage('activity_log');
  const line = formatEntry({
    timestamp: new Date(),
    operation: operation as never,
    summary,
  });
  const path = 'activity.log';
  if (typeof adapter.append === 'function') {
    const existing = (await adapter.read(path)) ?? '';
    if (existing.length > 0 && !existing.endsWith('\n')) {
      await adapter.append(path, '\n');
    }
    await adapter.append(path, line + '\n');
  } else {
    const existing = (await adapter.read(path)) ?? '';
    const trailing = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
    await adapter.write(path, existing + trailing + line + '\n');
  }
}
