// MC bridge status writer — atomically updates a single mission's status
// inside a session.json, preserving every other mission and top-level field.
//
// Cycle 2 of #1182. Uses a per-session async mutex so concurrent updates
// (e.g., dispatch fires for two queued missions in the same session at the
// same time) don't lose each other's writes.

import { writeSessionAtomic, readSession } from './queue-tailer.mjs';

/**
 * @typedef {object} StatusUpdate
 * @property {string} missionId
 * @property {string} status                   New mission.status value.
 * @property {object} [patch]                  Additional mission fields to merge (e.g. executorId, attempts, failureReason, estimatedStart).
 * @property {string} [transitionFrom]         Expected current status; if set and mismatched, returns 'stale' with no write.
 */

/**
 * @typedef {object} WriteResult
 * @property {'updated'|'missing-session'|'missing-mission'|'stale'} outcome
 * @property {object} [session]                The updated session (when outcome=updated).
 */

// Per-session mutex map. Keyed by session.json path.
const _locks = new Map();

/**
 * Acquire a serial lock for a given file path. Returns a release function.
 * The contract: only one writer per path mutates session.json at a time;
 * concurrent updates queue up in FIFO order via promise chaining.
 *
 * @param {string} path
 * @returns {Promise<() => void>}
 */
async function acquire(path) {
  const prev = _locks.get(path) || Promise.resolve();
  let release;
  const next = new Promise(r => { release = r; });
  _locks.set(path, prev.then(() => next));
  await prev;
  return () => {
    release();
    // If this was the last waiter, clean up so the map doesn't grow unbounded.
    if (_locks.get(path) === next) _locks.delete(path);
  };
}

/**
 * Apply one status update to the session at `sessionJsonPath`.
 *
 * @param {string} sessionJsonPath
 * @param {StatusUpdate} update
 * @returns {Promise<WriteResult>}
 */
export async function applyStatusUpdate(sessionJsonPath, update) {
  const release = await acquire(sessionJsonPath);
  try {
    const session = await readSession(sessionJsonPath);
    if (!session) return { outcome: 'missing-session' };

    if (!Array.isArray(session.missions)) {
      session.missions = [];
    }

    const idx = session.missions.findIndex(m => m && m.id === update.missionId);
    if (idx === -1) return { outcome: 'missing-mission' };

    const current = session.missions[idx];
    if (update.transitionFrom && current.status !== update.transitionFrom) {
      // Avoid clobbering a more recent status set by a parallel event handler.
      return { outcome: 'stale', session };
    }

    const merged = {
      ...current,
      ...(update.patch || {}),
      status: update.status,
    };
    session.missions[idx] = merged;
    await writeSessionAtomic(sessionJsonPath, session);
    return { outcome: 'updated', session };
  } finally {
    release();
  }
}

/**
 * Apply multiple updates to the same session in a single write — useful when
 * a single event (e.g. executor.resync drop) affects several missions.
 *
 * @param {string} sessionJsonPath
 * @param {StatusUpdate[]} updates
 * @returns {Promise<{outcome: 'updated'|'missing-session', applied: string[], missing: string[]}>}
 */
export async function applyStatusUpdatesBatched(sessionJsonPath, updates) {
  const release = await acquire(sessionJsonPath);
  try {
    const session = await readSession(sessionJsonPath);
    if (!session) {
      return { outcome: 'missing-session', applied: [], missing: updates.map(u => u.missionId) };
    }
    if (!Array.isArray(session.missions)) session.missions = [];

    const applied = [];
    const missing = [];
    for (const update of updates) {
      const idx = session.missions.findIndex(m => m && m.id === update.missionId);
      if (idx === -1) { missing.push(update.missionId); continue; }
      const current = session.missions[idx];
      if (update.transitionFrom && current.status !== update.transitionFrom) continue;
      session.missions[idx] = {
        ...current,
        ...(update.patch || {}),
        status: update.status,
      };
      applied.push(update.missionId);
    }
    if (applied.length > 0) {
      await writeSessionAtomic(sessionJsonPath, session);
    }
    return { outcome: 'updated', applied, missing };
  } finally {
    release();
  }
}
