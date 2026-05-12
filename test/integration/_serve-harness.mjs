// Shared harness for tier-3 integration tests (#1174).
//
// Spawns a real aiwg serve as a child process on an ephemeral port, parses
// the URL from its "Dashboard: ..." stdout banner, and exposes a typed
// handle for tests. Uses dist/src/cli/router.js via bin/aiwg.mjs so the
// tests exercise the same code path users run.

import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const REPO_ROOT = resolve(import.meta.dirname || new URL('.', import.meta.url).pathname, '../..');
const AIWG_BIN = join(REPO_ROOT, 'bin', 'aiwg.mjs');

/**
 * @typedef {object} ServeHandle
 * @property {string} url
 * @property {number} port
 * @property {(signal?: NodeJS.Signals) => Promise<void>} kill
 * @property {string[]} stdout
 * @property {string[]} stderr
 */

/**
 * Spawn aiwg serve on an ephemeral port. Resolves once the "Dashboard:"
 * banner appears in stdout (or rejects after timeoutMs).
 *
 * @param {object} [opts]
 * @param {string[]} [opts.extraArgs]  Extra CLI args appended to `serve ...`.
 * @param {number} [opts.timeoutMs=15000]
 * @param {NodeJS.ProcessEnv} [opts.env]
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

  const child = spawn(process.execPath, args, {
    cwd: REPO_ROOT,
    env: { ...process.env, ...(opts.env || {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

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

  // Watch for "Dashboard: http://127.0.0.1:PORT" in stdout
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;
  let dashboardLine = null;
  let exited = false;
  child.once('exit', (code) => {
    exited = true;
    if (!dashboardLine) {
      // Failed before banner — surface for debugging
    }
    void code;
  });

  while (!dashboardLine && Date.now() < deadline && !exited) {
    const joined = stdoutBuf.join('');
    const m = joined.match(/Dashboard:\s+(http:\/\/[^\s\r\n]+)/);
    if (m) dashboardLine = m[1];
    if (dashboardLine) break;
    await delay(50);
  }

  if (!dashboardLine) {
    try { child.kill('SIGKILL'); } catch {}
    throw new Error(
      `aiwg serve did not announce a Dashboard URL within ${timeoutMs}ms.\nstdout:\n${stdout.join('')}\nstderr:\n${stderr.join('')}`,
    );
  }

  // Extract port from the URL
  const portMatch = dashboardLine.match(/:(\d+)$/);
  const port = portMatch ? parseInt(portMatch[1], 10) : 0;

  if (port === 0) {
    try { child.kill('SIGKILL'); } catch {}
    throw new Error(
      `aiwg serve reported port 0 — port-resolution fix (#1275) may not be deployed.\nstdout:\n${stdout.join('')}`,
    );
  }

  /** @type {(signal?: NodeJS.Signals) => Promise<void>} */
  const kill = (signal = 'SIGINT') =>
    new Promise((resolveKill) => {
      if (child.exitCode !== null || exited) { resolveKill(); return; }
      child.once('exit', () => resolveKill());
      try { child.kill(signal); } catch { resolveKill(); }
      // Force-kill fallback after 5s
      setTimeout(() => {
        if (child.exitCode === null) {
          try { child.kill('SIGKILL'); } catch {}
        }
      }, 5_000).unref?.();
    });

  return { url: dashboardLine, port, kill, stdout, stderr };
}

/**
 * Poll an HTTP endpoint until it returns 2xx, or throw after timeoutMs.
 *
 * @param {string} url
 * @param {number} [timeoutMs=5000]
 */
export async function waitForHttp(url, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(url);
      if (resp.status < 500) return resp;
    } catch (err) {
      lastErr = err;
    }
    await delay(50);
  }
  throw new Error(`waitForHttp(${url}): no response within ${timeoutMs}ms (${lastErr || ''})`);
}
