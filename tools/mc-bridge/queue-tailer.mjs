// MC queue-tail bridge — long-running watcher that picks up queued missions
// from .aiwg/ralph-external/mc/sessions/*/session.json and dispatches them to
// `aiwg serve`'s executor contract endpoint.
//
// Status: cycle 1 (skeleton + smoke). Implementation tracked under #1182.
//
// This module is intentionally minimal in cycle 1 — it establishes the contract
// surface so the tailer can be wired into CLI and tested before cycle-2 lands
// the full dispatch wiring + retry/backoff + WS event subscription.

import { readdir, readFile, rename, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { watch } from 'node:fs';

/**
 * @typedef {object} BridgeOptions
 * @property {string} aiwgServeUrl  Base URL of `aiwg serve`. Default http://127.0.0.1:7337.
 * @property {string} watchDir       MC sessions root. Default .aiwg/ralph-external/mc.
 * @property {number} pollIntervalMs Fallback polling cadence when fs.watch is unavailable. Default 1000.
 * @property {number} retryBaseMs    Initial backoff for failed dispatch. Default 500.
 * @property {number} maxAttempts    Consecutive dispatch failures before marking `failed`. Default 5.
 * @property {AbortSignal} [signal]  Abort signal for cooperative shutdown.
 * @property {(msg: string, meta?: object) => void} [logger] Structured logger.
 */

const DEFAULTS = Object.freeze({
  aiwgServeUrl: 'http://127.0.0.1:7337',
  watchDir: '.aiwg/ralph-external/mc',
  pollIntervalMs: 1000,
  retryBaseMs: 500,
  maxAttempts: 5,
});

/**
 * Discover all `<id>/session.json` files under the MC sessions root.
 *
 * @param {string} root
 * @returns {Promise<string[]>} Absolute paths.
 */
export async function discoverSessions(root) {
  const sessionsDir = join(root, 'sessions');
  let entries;
  try {
    entries = await readdir(sessionsDir, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === 'ENOENT') return [];
    throw err;
  }
  const paths = [];
  for (const e of entries) {
    if (e.isDirectory()) paths.push(join(sessionsDir, e.name, 'session.json'));
  }
  return paths;
}

/**
 * Read and parse a session.json. Returns null on missing/unparseable file
 * (the tailer should keep going on transient parse errors during writes).
 *
 * @param {string} path
 * @returns {Promise<object|null>}
 */
export async function readSession(path) {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Atomic write — temp file + rename — so a crash never leaves a half-written
 * session.json. The tailer relies on this when writing back mission lifecycle
 * status changes.
 *
 * @param {string} path
 * @param {object} session
 */
export async function writeSessionAtomic(path, session) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  session.updatedAt = new Date().toISOString();
  await writeFile(tmp, JSON.stringify(session, null, 2));
  await rename(tmp, path);
}

/**
 * Extract missions in `queued` state from a session.
 *
 * @param {object} session
 * @returns {Array<{sessionId: string, mission: object}>}
 */
export function queuedMissions(session) {
  if (!session || !Array.isArray(session.missions)) return [];
  return session.missions
    .filter(m => m && m.status === 'queued')
    .map(mission => ({ sessionId: session.id, mission }));
}

/**
 * Build the v1 dispatch payload from an MC mission. Mirrors the wire shape in
 * `test/fixtures/sandbox-api/executor-v1/dispatch/dispatch-request.json`.
 *
 * @param {object} mission
 * @param {object} sessionMeta { sessionId }
 * @returns {object}
 */
export function buildDispatchPayload(mission, sessionMeta) {
  return {
    mission_id: mission.id,
    objective: mission.objective,
    completion: mission.completion || null,
    long_running: Boolean(mission.longRunning),
    executor_filter: {
      executor_id: mission.targetExecutorId || null,
      capabilities: mission.requiredCapabilities || [],
      agent_id: mission.targetAgentId || null,
    },
    metadata: {
      mc_session_id: sessionMeta.sessionId,
      mode: mission.mode || 'direct',
      priority: mission.priority || 'normal',
      ...(mission.metadata || {}),
    },
  };
}

/**
 * Compute exponential backoff: base * 2^(attempt-1), capped at 30 000 ms.
 *
 * @param {number} attempt 1-indexed.
 * @param {number} baseMs
 * @returns {number}
 */
export function backoffMs(attempt, baseMs) {
  return Math.min(30_000, baseMs * Math.pow(2, attempt - 1));
}

/**
 * Cycle-2 will replace this stub with a real fetch + retry + status writeback.
 * For now it documents the dispatch contract surface and lets unit tests
 * exercise payload-shape and option-merging concerns.
 *
 * @param {BridgeOptions} userOpts
 * @returns {Promise<{stop: () => Promise<void>, options: BridgeOptions}>}
 */
export async function startQueueTailer(userOpts = {}) {
  const options = { ...DEFAULTS, ...userOpts };
  const log = options.logger || (() => {});

  log('queue-tailer:start', {
    aiwgServeUrl: options.aiwgServeUrl,
    watchDir: options.watchDir,
  });

  // Cycle 1: discovery + dry-run dispatch logging.
  // Cycle 2: actual dispatch POST + retry/backoff + atomic writeback.
  // Cycle 3: WS subscription + event-to-status mapping + CLI subcommand.

  let stopped = false;
  let watcher = null;

  const tick = async () => {
    if (stopped) return;
    const paths = await discoverSessions(options.watchDir);
    for (const path of paths) {
      const session = await readSession(path);
      if (!session) continue;
      const queued = queuedMissions(session);
      for (const { mission } of queued) {
        const payload = buildDispatchPayload(mission, { sessionId: session.id });
        log('queue-tailer:would-dispatch', {
          missionId: mission.id,
          sessionId: session.id,
          endpoint: `${options.aiwgServeUrl}/api/v1/sessions/${session.id}/dispatch`,
          payloadDigest: digestPayload(payload),
        });
      }
    }
  };

  try {
    watcher = watch(options.watchDir, { recursive: true }, () => {
      tick().catch(err => log('queue-tailer:tick-error', { error: String(err) }));
    });
  } catch {
    // fs.watch unavailable on some filesystems; fall back to polling.
    const id = setInterval(() => {
      if (stopped) return;
      tick().catch(err => log('queue-tailer:tick-error', { error: String(err) }));
    }, options.pollIntervalMs);
    watcher = { close: () => clearInterval(id) };
  }

  // Initial sweep so existing queued missions get seen on startup.
  await tick();

  if (options.signal) {
    options.signal.addEventListener('abort', () => { void stop(); }, { once: true });
  }

  async function stop() {
    if (stopped) return;
    stopped = true;
    try { watcher?.close?.(); } catch {}
    log('queue-tailer:stop', {});
  }

  return { stop, options };
}

/**
 * Short payload digest for log lines — keeps long objectives out of the log
 * without losing identity.
 *
 * @param {object} payload
 * @returns {string}
 */
function digestPayload(payload) {
  const o = payload.objective || '';
  return `${payload.mission_id}:${o.slice(0, 32)}${o.length > 32 ? '…' : ''}`;
}
