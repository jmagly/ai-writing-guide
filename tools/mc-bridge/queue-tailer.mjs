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
 * Long-running watcher. Tails session.json files under watchDir, dispatches
 * queued missions to aiwg serve via dispatch-client, and writes the result
 * (assigned or failed) back through status-writer.
 *
 * Cycle 1: would-dispatch stub.
 * Cycle 2 (THIS): real POST + retry/backoff + atomic status writeback.
 * Cycle 3 (next): WS event subscription for runtime lifecycle transitions
 *   and the aiwg mc bridge CLI subcommand.
 *
 * @param {BridgeOptions} userOpts
 * @returns {Promise<{stop: () => Promise<void>, options: BridgeOptions}>}
 */
export async function startQueueTailer(userOpts = {}) {
  const options = { ...DEFAULTS, ...userOpts };
  const log = options.logger || (() => {});

  // Lazy-import to keep the public surface minimal and avoid pulling in
  // dispatch-client during pure unit tests that only exercise pure helpers.
  // dryRun=true skips the import + side effects (cycle-1 behaviour preserved).
  const dryRun = Boolean(options.dryRun);
  const dispatchClientP = dryRun ? null : import('./dispatch-client.mjs');
  const statusWriterP = dryRun ? null : import('./status-writer.mjs');

  log('queue-tailer:start', {
    aiwgServeUrl: options.aiwgServeUrl,
    watchDir: options.watchDir,
    dryRun,
  });

  let stopped = false;
  let watcher = null;
  // Track which missions are currently being dispatched so a re-tick during
  // backoff doesn't spawn a parallel attempt for the same mission.
  const inflight = new Set();

  /** Resolve the session.json path for a session by reading from disk. */
  const sessionPathFor = (sessionId) =>
    join(options.watchDir, 'sessions', sessionId, 'session.json');

  /**
   * Dispatch one queued mission. Marks it `assigned` on success, `failed`
   * on terminal error (with reason + message), or leaves it queued on abort.
   */
  const dispatchOne = async (sessionId, mission) => {
    const key = `${sessionId}:${mission.id}`;
    if (inflight.has(key)) return;
    inflight.add(key);

    const payload = buildDispatchPayload(mission, { sessionId });
    const path = sessionPathFor(sessionId);

    try {
      const { dispatchMission } = await dispatchClientP;
      const { applyStatusUpdate } = await statusWriterP;

      // Race guard: between the tick's readSession and this point, another
      // dispatchOne may have already taken the mission to `assigned` (e.g.,
      // fs.watch fired on the writeback's temp-file and queued a duplicate
      // tick). Re-read and bail if the mission is no longer queued.
      const fresh = await readSession(path);
      const current = fresh?.missions?.find(m => m && m.id === mission.id);
      if (!current || current.status !== 'queued') {
        log('queue-tailer:skip-no-longer-queued', {
          missionId: mission.id,
          sessionId,
          observedStatus: current?.status ?? 'missing',
        });
        return;
      }

      const outcome = await dispatchMission(
        {
          aiwgServeUrl: options.aiwgServeUrl,
          retryBaseMs: options.retryBaseMs,
          maxAttempts: options.maxAttempts,
          fetchImpl: options.fetchImpl,
          logger: log,
        },
        sessionId,
        payload,
        options.signal,
      );

      if (outcome.outcome === 'accepted') {
        await applyStatusUpdate(path, {
          missionId: mission.id,
          status: 'assigned',
          transitionFrom: 'queued',
          patch: {
            executorId: outcome.executorId,
            dispatchedAt: new Date().toISOString(),
            dispatchAttempts: outcome.attempts,
            estimatedStart: outcome.estimatedStart || null,
          },
        });
        log('queue-tailer:dispatched', {
          missionId: mission.id,
          sessionId,
          executorId: outcome.executorId,
          attempts: outcome.attempts,
        });
      } else {
        await applyStatusUpdate(path, {
          missionId: mission.id,
          status: 'failed',
          transitionFrom: 'queued',
          patch: {
            failedAt: new Date().toISOString(),
            failureReason: outcome.reason,
            failureMessage: outcome.message,
            dispatchAttempts: outcome.attempts,
          },
        });
        log('queue-tailer:dispatch-failed', {
          missionId: mission.id,
          sessionId,
          reason: outcome.reason,
          attempts: outcome.attempts,
        });
      }
    } catch (err) {
      log('queue-tailer:dispatch-error', {
        missionId: mission.id,
        sessionId,
        error: String(err && err.message || err),
      });
    } finally {
      inflight.delete(key);
    }
  };

  const tick = async () => {
    if (stopped) return;
    const paths = await discoverSessions(options.watchDir);
    for (const path of paths) {
      const session = await readSession(path);
      if (!session) continue;
      const queued = queuedMissions(session);
      for (const { mission } of queued) {
        if (dryRun) {
          const payload = buildDispatchPayload(mission, { sessionId: session.id });
          log('queue-tailer:would-dispatch', {
            missionId: mission.id,
            sessionId: session.id,
            endpoint: `${options.aiwgServeUrl}/api/v1/sessions/${session.id}/dispatch`,
            payloadDigest: digestPayload(payload),
          });
        } else {
          // Fire-and-track; dispatchOne is async and gates re-entry via inflight.
          void dispatchOne(session.id, mission);
        }
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
    // Wait briefly for any inflight dispatches to settle so we don't leave
    // half-finished writes.
    const drainStart = Date.now();
    while (inflight.size > 0 && Date.now() - drainStart < 5000) {
      await new Promise(r => setTimeout(r, 50));
    }
    log('queue-tailer:stop', { drainedInflight: inflight.size === 0 });
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
