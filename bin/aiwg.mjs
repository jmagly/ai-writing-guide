#!/usr/bin/env node

/**
 * AIWG CLI Entry Point
 *
 * Single entry point for the `aiwg` command. Dispatches directly to the
 * compiled router at `dist/src/cli/router.js` with no intermediate tsx fork
 * or facade layer — one Node process per invocation.
 *
 * Responsibilities:
 *   1. Handle channel-switching commands (--use-dev, --use-edge, --use-stable)
 *   2. Fire a non-blocking background update check
 *   3. Resolve the compiled router (installed path or dev-repo override)
 *   4. Dispatch to router.run(args), then process.exit() deterministically
 *
 * This file is intentionally minimal. All command logic lives in the router
 * and its handlers. If you find yourself adding business logic here, it
 * probably belongs in a handler instead.
 *
 * @module bin/aiwg
 * @implements #919
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync, readFileSync } from 'fs';
import os from 'os';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

function readPackageVersion() {
  try {
    const pkg = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : '(unknown)';
  } catch {
    return '(unknown)';
  }
}

function detectVersionChannel(version) {
  if (version.includes('-rc.')) return 'rc';
  if (version.includes('-beta.')) return 'beta';
  if (version.includes('-alpha.')) return 'alpha';
  if (version.includes('-nightly.')) return 'nightly';
  try {
    const raw = readFileSync(path.join(os.homedir(), '.aiwg', 'channel.json'), 'utf8');
    const cfg = JSON.parse(raw);
    if (cfg?.devMode) return 'dev';
    if (typeof cfg?.channel === 'string') return cfg.channel;
  } catch {
    // Default below.
  }
  return 'stable';
}

function maybeHandleFastVersion(args) {
  if (args.length !== 1) return false;
  if (args[0] !== '--version' && args[0] !== '-version') return false;

  const version = readPackageVersion();
  const channel = detectVersionChannel(version);
  console.log(`  aiwg  ${version}  [${channel}]`);
  console.log(`    path: ${packageRoot}`);
  return true;
}

if (maybeHandleFastVersion(process.argv.slice(2))) {
  process.exit(0);
}

// Preflight: verify dist/ is built before any of the dynamic imports below
// try to resolve files that don't exist. Without this, a missing/incomplete
// dist/ surfaces as a raw `Cannot find module '.../dist/src/.../*.mjs'` from
// whichever import lands first, with no remediation hint. Fixes #1513
// (#1512 follow-up — the research agent hit MODULE_NOT_FOUND when dist/ was
// absent in their checkout; the answer was always `npm run build:cli`,
// which is what this preflight tells them).
//
// `--version` is handled above without dist, so this runs after that.
function maybeWarnUnbuiltDist() {
  const required = [
    'dist/src/cli/router.js',
    'dist/src/update/notifier.mjs',
    'dist/src/channel/manager.mjs',
  ];
  const missing = required.filter(rel => !existsSync(path.join(packageRoot, rel)));
  if (missing.length === 0) return;
  const isDevCheckout =
    existsSync(path.join(packageRoot, 'src')) &&
    existsSync(path.join(packageRoot, '.git'));
  const remediation = isDevCheckout
    ? 'Run `npm run build:cli` in the AIWG checkout to build dist/.'
    : 'Reinstall AIWG: `npm install -g aiwg` (the published package ships dist/).';
  process.stderr.write(`aiwg: dist/ is missing or incomplete — required files absent:\n`);
  for (const rel of missing) process.stderr.write(`  - ${rel}\n`);
  process.stderr.write(`  ${remediation}\n`);
  process.exit(1);
}
maybeWarnUnbuiltDist();

// Mint or inherit an invocation ID before anything else loads. Child processes
// spawned by handlers (detached update-notifier, aiwg exec, etc.) inherit the
// parent's ID via `AIWG_INVOCATION_ID` so their JSONL log records correlate
// with the parent's — search the log by invocation_id to get the full trace
// across process boundaries.
//
// randomUUID() is UUIDv4 today. Time-ordered v7 is not in Node stdlib yet;
// the correlation property is what matters, not the ordering.
function ensureInvocationId() {
  const existing = process.env['AIWG_INVOCATION_ID'];
  if (existing) return existing;
  const fresh = randomUUID();
  process.env['AIWG_INVOCATION_ID'] = fresh;
  return fresh;
}
const invocationId = ensureInvocationId();

// Startup tracing — set AIWG_TRACE_STARTUP=1 to print per-phase timings to
// stderr. Useful for diagnosing cold-start regressions. No-op by default so
// it doesn't cost anything on the hot path.
const traceStartup = process.env['AIWG_TRACE_STARTUP'] === '1' ||
  process.env['AIWG_TRACE_STARTUP']?.toLowerCase() === 'true';
const startHr = process.hrtime.bigint();
function trace(phase) {
  if (!traceStartup) return;
  const ms = Number(process.hrtime.bigint() - startHr) / 1_000_000;
  process.stderr.write(`[trace] +${ms.toFixed(1)}ms ${phase}\n`);
}
trace('bin:entry');

/**
 * Resolve the path to the compiled router.
 *
 * In dev mode (AIWG --use-dev set), point at the dev repo's `dist/`. In
 * stable/next/edge/nightly mode, use this installed package's `dist/`.
 *
 * If the compiled router is missing (fresh clone without `npm run build`),
 * emit a clear error and exit rather than falling back to a tsx fork.
 */
async function resolveRouterPath() {
  const { loadConfig } = await import('../dist/src/channel/manager.mjs');
  const config = await loadConfig();
  if (config.devMode && config.edgePath && config.edgePath !== packageRoot) {
    const devRouter = path.join(config.edgePath, 'dist', 'src', 'cli', 'router.js');
    if (!existsSync(devRouter)) {
      console.error(`Dev mode: compiled router not found at ${devRouter}`);
      console.error(`  Run: (cd ${config.edgePath} && npm run build)`);
      console.error(`  Or switch back: aiwg --use-stable`);
      process.exit(1);
    }
    return devRouter;
  }
  const installedRouter = path.join(packageRoot, 'dist', 'src', 'cli', 'router.js');
  if (!existsSync(installedRouter)) {
    console.error(`Compiled router not found at ${installedRouter}`);
    console.error(`  This is a packaging bug. Please report it at:`);
    console.error(`    https://git.integrolabs.net/roctinam/aiwg/issues`);
    process.exit(1);
  }
  return installedRouter;
}

/**
 * Parse verbosity flags from argv and set the logger level. Stackable:
 *   (none)    → warn and above
 *   -v        → info
 *   -vv       → debug
 *   -vvv      → debug + scope filter wide-open
 *   --quiet   → error only
 *
 * `AIWG_LOG_LEVEL` env var overrides argv. `--verbose` is a synonym for -v.
 *
 * Returns the resolved level so the main entry can stash it. Does NOT mutate
 * argv — handlers still see the flags. Call before the router loads so the
 * logger picks up the right level when it initializes.
 */
async function applyVerbosityFromArgs(args) {
  let level = 'warn'; // default
  if (args.includes('--quiet') || args.includes('-q')) level = 'error';
  else if (args.includes('-vvv')) { level = 'debug'; process.env['AIWG_DEBUG'] ??= '1'; }
  else if (args.includes('-vv')) level = 'debug';
  else if (args.includes('-v') || args.includes('--verbose')) level = 'info';
  // Env var takes precedence (for CI or scripting).
  const envLevel = process.env['AIWG_LOG_LEVEL']?.toLowerCase();
  if (envLevel && ['debug', 'info', 'warn', 'error', 'silent'].includes(envLevel)) {
    level = envLevel;
  }
  // Reach into the compiled logger (same dist/ we're about to dispatch to)
  // and set the level. Failing to import the logger here is non-fatal — the
  // logger's own fallbacks will pick up AIWG_LOG_LEVEL from env.
  try {
    const routerPath = await resolveRouterPath();
    const logPath = path.join(path.dirname(routerPath), 'log.js');
    if (existsSync(logPath)) {
      const { setLogLevel, setInvocationId, pruneOldLogs } = await import('file://' + logPath);
      setLogLevel(level);
      setInvocationId(invocationId);
      // One-shot prune of old JSONL files on startup. Bounded work; safe to
      // call on every invocation because the work is a single directory list.
      pruneOldLogs();
    }
  } catch {
    // If the logger isn't importable yet (fresh clone without dist/), the
    // regular router-resolution error below surfaces it.
  }
  return level;
}

async function main() {
  const args = process.argv.slice(2);

  // Channel-switching commands — handled before anything else so they work
  // even when the router can't load (e.g. fixing a broken dev-mode pointer).
  if (args[0] === '--use-main' || args[0] === '--use-edge') {
    const { switchToEdge } = await import('../dist/src/channel/manager.mjs');
    await switchToEdge();
    return;
  }
  if (args[0] === '--use-dev') {
    const { switchToDev } = await import('../dist/src/channel/manager.mjs');
    const devPath = args[1] || process.cwd();
    await switchToDev(devPath);
    return;
  }
  if (args[0] === '--use-stable' || args[0] === '--use-npm') {
    const { switchToStable } = await import('../dist/src/channel/manager.mjs');
    await switchToStable();
    return;
  }

  // Wire up the logger level from -v/-vv/--quiet/AIWG_LOG_LEVEL before any
  // handler runs, and stamp the top-level invocation ID so the logger can
  // tag every record with it.
  await applyVerbosityFromArgs(args);

  // Update notifier: print any pending notice from the previous run's
  // background check, then schedule the next background check. Both are
  // non-blocking — the current command never waits on the network.
  // Honors NO_UPDATE_NOTIFIER, CI=*, and non-TTY stderr.
  const { scheduleBackgroundCheck, maybePrintNotice } = await import('../dist/src/update/notifier.mjs');
  maybePrintNotice();
  scheduleBackgroundCheck(packageRoot);

  // Top-level cancellation controller. SIGINT / SIGTERM flip it, long-running
  // handlers plumb ctx.signal through fetches and loops so Ctrl-C cancels
  // in-flight work cleanly instead of leaving orphaned sockets and children.
  // Exit codes 130 (SIGINT = 128+2) and 143 (SIGTERM = 128+15) follow shell
  // convention so scripts can branch on the signal kind.
  const abortController = new AbortController();
  const onSigint = () => {
    abortController.abort('sigint');
    // Safety deadline: if a handler does not honor the signal, force exit
    // after 3s. .unref() so a well-behaved handler can still finish first.
    const deadline = setTimeout(() => process.exit(130), 3_000);
    deadline.unref?.();
  };
  const onSigterm = () => {
    abortController.abort('sigterm');
    const deadline = setTimeout(() => process.exit(143), 3_000);
    deadline.unref?.();
  };
  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);

  // Direct in-process dispatch — no tsx fork, no facade, no router-loader.
  trace('resolve:router');
  const routerPath = await resolveRouterPath();
  trace('import:router');
  const { run } = await import('file://' + routerPath);
  trace('dispatch:begin');
  try {
    await run(args, { cwd: process.cwd(), signal: abortController.signal });
  } finally {
    trace('dispatch:end');
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigterm);
  }
}

// Give the background update check a brief grace window before forcing exit.
// Without an explicit process.exit(), unawaited promises (HTTPS keepalive
// sockets, libuv worker handles, buffered readline from the update prompt)
// can keep the event loop alive for minutes on slow networks or detached
// terminals — the "30s command that hangs for 5 minutes" symptom we debugged
// in #924. 1500ms is plenty for a normal npm registry check; if the check
// is slower the user still gets their shell back promptly and the check
// runs again on the next invocation.
// Lazy-loaded structured error formatter. Imported on demand so a failing
// top-level catch doesn't itself throw by trying to load a missing dist/.
async function formatAndExit(error, fallbackCode = 1) {
  // Show stack trace when the user has opted in to verbose diagnostics.
  const verbose =
    process.env.AIWG_DEBUG === '1' ||
    process.env.AIWG_DEBUG?.toLowerCase() === 'true' ||
    process.env.DEBUG === '1' ||
    process.argv.includes('--verbose') ||
    process.argv.includes('-vv') ||
    process.argv.includes('-vvv');

  let exitCode = fallbackCode;
  try {
    const errorsMod = await import(
      'file://' + path.join(packageRoot, 'dist', 'src', 'cli', 'errors.js')
    );
    const { formatError, exitCodeFor } = errorsMod;
    const formatted = formatError(error, { verbose });
    // Strip ANSI colors when stderr isn't a TTY so piped output stays clean.
    process.stderr.write(formatted + '\n');
    exitCode = exitCodeFor(error);
  } catch {
    // Fallback path: dist/ missing or errors.js failed to load. Print a
    // minimal message so we never silently exit.
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`aiwg: error: ${msg}\n`);
    if (verbose && error instanceof Error && error.stack) {
      process.stderr.write(error.stack + '\n');
    }
  }
  process.exit(exitCode);
}

// Install process-level handlers for unhandled failures so the same
// structured formatter renders them instead of Node's default crash dump.
process.on('uncaughtException', (err) => {
  formatAndExit(err, 1).catch(() => process.exit(1));
});
process.on('unhandledRejection', (reason) => {
  formatAndExit(reason, 1).catch(() => process.exit(1));
});

// With the update notifier now running as a detached unref()'d child (#920),
// main() has no background promise to grace-wait on — the router finishes,
// we exit. The background child writes its cache file and exits on its own
// schedule.
main()
  .then(() => process.exit(0))
  .catch((error) => formatAndExit(error, 1));
