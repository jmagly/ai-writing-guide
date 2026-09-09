// Shared harness for tier-3 integration tests (#1174).
//
// Spawns a real aiwg serve as a child process on an ephemeral port, parses
// the URL from its "Dashboard: ..." stdout banner, and exposes a typed
// handle for tests. Uses dist/src/cli/router.js via bin/aiwg.mjs so the
// tests exercise the same code path users run.
//
// Note: in-process testing was explored (#1277) — startServer is exported
// from src/cli/handlers/serve.ts and works fine in standalone Node, but
// vitest's fork-pool ESM loader has trouble with the dynamic hono/ws imports.
// Spawn-based stays the reliable path locally; the CI-stability investigation
// for this suite is filed as #1277.

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const REPO_ROOT = resolve(import.meta.dirname || new URL('.', import.meta.url).pathname, '../..');
const AIWG_BIN = join(REPO_ROOT, 'bin', 'aiwg.mjs');

/**
 * Keep repository-local CLI tests independent from an operator's canonical
 * installation identity. Caller-supplied configuration remains caller-owned.
 */
export function createServeIsolation(baseEnv = process.env, overrides = {}) {
  const explicitConfig = typeof overrides.AIWG_CONFIG === 'string' && overrides.AIWG_CONFIG.length > 0
    ? overrides.AIWG_CONFIG
    : null;
  const configDir = explicitConfig ?? mkdtempSync(join(tmpdir(), 'aiwg-serve-config-'));
  const owned = explicitConfig === null;
  return {
    env: { ...baseEnv, ...overrides, AIWG_CONFIG: configDir },
    configDir,
    owned,
    cleanup() {
      if (!owned) return;
      // force makes repeated cleanup safe, and a later child exit gets a
      // second chance to remove state recreated during an earlier kill race.
      rmSync(configDir, { recursive: true, force: true });
    },
  };
}

/**
 * @typedef {object} ServeHandle
 * @property {string} url
 * @property {number} port
 * @property {(signal?: NodeJS.Signals) => Promise<void>} kill
 * @property {string[]} stdout
 * @property {string[]} stderr
 * @property {string} configDir
 * @property {boolean} ownsConfigDir
 */

/**
 * Spawn aiwg serve on an ephemeral port. Resolves once the "Dashboard:"
 * banner appears in stdout (or rejects after timeoutMs).
 *
 * @param {object} [opts]
 * @param {string[]} [opts.extraArgs]  Extra CLI args appended to `serve ...`.
 * @param {number} [opts.timeoutMs=15000]
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {typeof spawn} [opts.spawnProcess]
 * @param {ReturnType<typeof createServeIsolation>} [opts.isolation]
 * @returns {Promise<ServeHandle>}
 */
export async function spawnAiwgServe(opts = {}) {
  const args = [
    AIWG_BIN,
    'serve',
    '--port', '0',
    '--no-open',
    '--bind', '127.0.0.1',
    ...(opts.extraArgs || []),
  ];

  const isolation = opts.isolation ?? createServeIsolation(process.env, opts.env || {});
  const spawnProcess = opts.spawnProcess ?? spawn;
  let child;
  try {
    child = spawnProcess(process.execPath, args, {
      cwd: REPO_ROOT,
      env: isolation.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    isolation.cleanup();
    throw error;
  }
  child.once('error', isolation.cleanup);
  child.once('exit', isolation.cleanup);

  /** @type {string[]} */
  const stdout = [];
  /** @type {string[]} */
  const stderr = [];

  const stdoutBuf = [];
  child.stdout.on('data', (chunk) => {
    const s = chunk.toString();
    stdoutBuf.push(s);
    stdout.push(s);
  });
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));

  const timeoutMs = opts.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;
  let dashboardLine = null;
  /** Wrap into an object so waitForHttp can observe live state via the handle. */
  const handleState = { exited: false, exitCode: null };
  child.once('exit', (code) => {
    handleState.exited = true;
    handleState.exitCode = code;
  });
  const exited = () => handleState.exited;

  while (!dashboardLine && Date.now() < deadline && !exited()) {
    const joined = stdoutBuf.join('');
    const m = joined.match(/Dashboard:\s+(http:\/\/[^\s\r\n]+)/);
    if (m) dashboardLine = m[1];
    if (dashboardLine) break;
    await delay(50);
  }

  if (!dashboardLine) {
    try { child.kill('SIGKILL'); } catch {}
    isolation.cleanup();
    throw new Error(
      `aiwg serve did not announce a Dashboard URL within ${timeoutMs}ms.\nstdout:\n${stdout.join('')}\nstderr:\n${stderr.join('')}`,
    );
  }

  const portMatch = dashboardLine.match(/:(\d+)$/);
  const port = portMatch ? parseInt(portMatch[1], 10) : 0;

  if (port === 0) {
    try { child.kill('SIGKILL'); } catch {}
    isolation.cleanup();
    throw new Error(
      `aiwg serve reported port 0 — port-resolution fix (#1275) may not be deployed.\nstdout:\n${stdout.join('')}`,
    );
  }

  /** @type {(signal?: NodeJS.Signals) => Promise<void>} */
  const kill = (signal = 'SIGINT') =>
    new Promise((resolveKill) => {
      if (child.exitCode !== null || exited()) { isolation.cleanup(); resolveKill(); return; }
      child.once('exit', () => { isolation.cleanup(); resolveKill(); });
      try { child.kill(signal); } catch { isolation.cleanup(); resolveKill(); }
      setTimeout(() => {
        if (child.exitCode === null) {
          try { child.kill('SIGKILL'); } catch {}
        }
      }, 5_000).unref?.();
    });

  const handle = {
    url: dashboardLine,
    port,
    kill,
    stdout,
    stderr,
    configDir: isolation.configDir,
    ownsConfigDir: isolation.owned,
    get exited() { return handleState.exited; },
    get exitCode() { return handleState.exitCode; },
  };
  return handle;
}

/**
 * Poll an HTTP endpoint until it returns <500, or throw after timeoutMs.
 *
 * Default 15s — CI cold-start can take >5s when aiwg serve loads its full
 * module graph behind a docker-in-docker runner. Override via
 * AIWG_SERVE_HTTP_TIMEOUT_MS for slow CI hosts.
 *
 * Hits /api/health (a known-registered endpoint) by default. If the caller
 * passed a bare URL we append /api/health so we're verifying readiness
 * specifically, not just "any 404 means we're up".
 *
 * On failure, logs the last fetch error message so CI diagnostics surface
 * the actual network/refused/timeout reason instead of just "no response
 * within Nms".
 *
 * @param {string} url
 * @param {number} [timeoutMs]
 * @param {ServeHandle} [serveHandle]  When passed, fail fast if the child
 *   process exited (no point polling a dead server) and include stderr in
 *   the error message.
 */
export async function waitForHttp(url, timeoutMs, serveHandle = null) {
  const t = timeoutMs ?? (Number(process.env.AIWG_SERVE_HTTP_TIMEOUT_MS) || 15_000);
  const probeUrl = url.endsWith('/api/health') ? url : `${url.replace(/\/+$/, '')}/api/health`;
  const deadline = Date.now() + t;
  let lastErr;
  let attempts = 0;
  while (Date.now() < deadline) {
    // Fast-fail when the spawned server is dead.
    if (serveHandle && serveHandle.exited === true) {
      throw new Error(
        `waitForHttp(${probeUrl}): child process exited (code=${serveHandle.exitCode}) before becoming reachable.\n` +
        `stdout:\n${(serveHandle.stdout || []).join('')}\n` +
        `stderr:\n${(serveHandle.stderr || []).join('')}`,
      );
    }
    try {
      const resp = await fetch(probeUrl);
      if (resp.status < 500) return resp;
      lastErr = new Error(`status ${resp.status}`);
    } catch (err) {
      lastErr = err;
    }
    attempts++;
    await delay(50);
  }
  const stderrDump = serveHandle && serveHandle.stderr && serveHandle.stderr.length > 0
    ? `\nstderr from server:\n${serveHandle.stderr.join('')}` : '';
  throw new Error(
    `waitForHttp(${probeUrl}): no response within ${t}ms after ${attempts} attempts. Last error: ${lastErr?.message || lastErr || 'unknown'}${stderrDump}`,
  );
}
