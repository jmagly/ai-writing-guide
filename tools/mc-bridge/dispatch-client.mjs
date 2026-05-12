// MC bridge dispatch client — POST wrapper for aiwg serve's
// /api/v1/sessions/:id/dispatch endpoint with retry/backoff and typed errors.
//
// Cycle 2 of #1182. Cycle-1 had a stub that logged "would-dispatch"; this
// module fires real requests and surfaces structured failure modes the
// queue-tailer can act on (mark mission failed vs. retry).

import { backoffMs } from './queue-tailer.mjs';

/**
 * @typedef {object} DispatchClientOptions
 * @property {string} aiwgServeUrl              Base URL of aiwg serve.
 * @property {number} [retryBaseMs=500]         Initial backoff for retryable failures.
 * @property {number} [maxAttempts=5]           Total attempts (1 initial + N-1 retries) before giving up.
 * @property {typeof fetch} [fetchImpl]         Inject for tests. Defaults to globalThis.fetch.
 * @property {(msg: string, meta?: object) => void} [logger]
 */

/**
 * @typedef {object} DispatchAccepted
 * @property {'accepted'} outcome
 * @property {string} missionId
 * @property {string} executorId
 * @property {string} [estimatedStart]
 * @property {'v2'|'v1-fallback'} [dispatchPath]
 * @property {boolean} [idempotentReplayed]
 * @property {number} attempts             How many attempts it took to succeed.
 */

/**
 * @typedef {object} DispatchFailedTerminal
 * @property {'failed'} outcome
 * @property {string} missionId
 * @property {string} reason               Short code: invalid_request | unauthorized | no_executor_available | dispatch_error | client_error
 * @property {string} message              Human-readable detail (RFC 7807 detail when available).
 * @property {number} status               HTTP status (-1 for never-connected).
 * @property {number} attempts
 */

/**
 * @typedef {DispatchAccepted | DispatchFailedTerminal} DispatchOutcome
 */

const DEFAULT_RETRY_BASE_MS = 500;
const DEFAULT_MAX_ATTEMPTS = 5;

/**
 * Classify an HTTP response into one of three buckets:
 *   - 'accepted'   → 2xx, payload describes the mission state
 *   - 'retryable'  → 5xx, 503, transient — retry with backoff
 *   - 'terminal'   → 4xx (except 503-as-retryable), no point retrying
 *
 * @param {number} status
 * @returns {'accepted'|'retryable'|'terminal'}
 */
export function classifyStatus(status) {
  if (status >= 200 && status < 300) return 'accepted';
  // 503 with "no_executor_available" is retryable — operator may be
  // bringing up an executor. 503 in general is treated as transient.
  if (status === 503) return 'retryable';
  // 502, 504 (gateway/proxy) — transient
  if (status === 502 || status === 504) return 'retryable';
  // Any other 5xx → transient as well
  if (status >= 500 && status < 600) return 'retryable';
  // 4xx → terminal (caller's payload won't suddenly become valid)
  return 'terminal';
}

/**
 * Map a 4xx status to a short reason code the status-writer surfaces.
 *
 * @param {number} status
 * @param {string} fallback
 * @returns {string}
 */
export function reasonForStatus(status, fallback = 'client_error') {
  switch (status) {
    case 400: return 'invalid_request';
    case 401:
    case 403: return 'unauthorized';
    case 404: return 'executor_not_found';
    case 409: return 'idempotency_conflict';
    case 422: return 'idempotency_key_reused';
    case 503: return 'no_executor_available';
    default:  return fallback;
  }
}

/**
 * Sleep promise that honours an AbortSignal so a SIGINT during backoff
 * resolves promptly instead of waiting out the full delay.
 *
 * @param {number} ms
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
export function sleep(ms, signal) {
  return new Promise(resolve => {
    if (signal?.aborted) { resolve(); return; }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
  });
}

/**
 * Fire one dispatch attempt against aiwg serve.
 *
 * @param {DispatchClientOptions} opts
 * @param {string} mcSessionId
 * @param {object} payload
 * @param {AbortSignal} [signal]
 * @returns {Promise<{status: number, body: any, networkError?: Error}>}
 */
async function oneAttempt(opts, mcSessionId, payload, signal) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  if (!fetchImpl) {
    throw new Error('No fetch implementation available — pass opts.fetchImpl or run on Node 18+.');
  }
  const url = `${opts.aiwgServeUrl.replace(/\/+$/, '')}/api/v1/sessions/${encodeURIComponent(mcSessionId)}/dispatch`;
  try {
    const resp = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    let body = null;
    const text = await resp.text();
    if (text) {
      try { body = JSON.parse(text); }
      catch { body = { error: text }; }
    }
    return { status: resp.status, body };
  } catch (err) {
    // ECONNREFUSED, DNS failure, timeout → network error, treat as retryable
    return { status: -1, body: null, networkError: err };
  }
}

/**
 * Dispatch a mission to aiwg serve. Handles retry/backoff. Returns a typed
 * outcome that the caller (queue-tailer) uses to update mission status.
 *
 * Retry policy:
 *   - 2xx              → accepted, return immediately
 *   - 5xx / network    → retry with exponential backoff up to maxAttempts
 *   - 4xx              → terminal failure, no retry
 *
 * @param {DispatchClientOptions} opts
 * @param {string} mcSessionId
 * @param {object} payload   The mission dispatch payload (V1DispatchPayload shape).
 * @param {AbortSignal} [signal]
 * @returns {Promise<DispatchOutcome>}
 */
export async function dispatchMission(opts, mcSessionId, payload, signal) {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryBaseMs = opts.retryBaseMs ?? DEFAULT_RETRY_BASE_MS;
  const log = opts.logger || (() => {});
  const missionId = payload.mission_id;

  let lastStatus = -1;
  let lastMessage = 'no attempt made';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      return {
        outcome: 'failed',
        missionId,
        reason: 'aborted',
        message: 'dispatch aborted before completion',
        status: lastStatus,
        attempts: attempt - 1,
      };
    }

    const { status, body, networkError } = await oneAttempt(opts, mcSessionId, payload, signal);
    lastStatus = status;

    if (networkError) {
      lastMessage = `network: ${networkError.message || String(networkError)}`;
      log('dispatch-client:network-error', { missionId, attempt, error: lastMessage });
    } else if (status === -1) {
      lastMessage = 'unknown network error';
    } else {
      lastMessage = (body && (body.detail || body.error)) || `HTTP ${status}`;
    }

    const bucket = networkError ? 'retryable' : classifyStatus(status);

    if (bucket === 'accepted') {
      const accepted = {
        outcome: 'accepted',
        missionId,
        executorId: (body && body.executor_id) || 'unknown',
        estimatedStart: body && body.estimated_start,
        dispatchPath: body && body.dispatch_path,
        idempotentReplayed: Boolean(body && body.idempotent_replayed),
        attempts: attempt,
      };
      log('dispatch-client:accepted', {
        missionId,
        attempts: attempt,
        executorId: accepted.executorId,
      });
      return accepted;
    }

    if (bucket === 'terminal') {
      const reason = reasonForStatus(status);
      log('dispatch-client:terminal', { missionId, status, reason, message: lastMessage });
      return {
        outcome: 'failed',
        missionId,
        reason,
        message: lastMessage,
        status,
        attempts: attempt,
      };
    }

    // Retryable: back off (unless this was the last attempt)
    if (attempt < maxAttempts) {
      const delay = backoffMs(attempt, retryBaseMs);
      log('dispatch-client:retrying', { missionId, attempt, status, delay });
      await sleep(delay, signal);
    }
  }

  log('dispatch-client:exhausted', { missionId, attempts: maxAttempts, lastStatus });
  return {
    outcome: 'failed',
    missionId,
    reason: lastStatus === -1 ? 'unreachable' : reasonForStatus(lastStatus, 'dispatch_error'),
    message: `dispatch exhausted ${maxAttempts} attempts: ${lastMessage}`,
    status: lastStatus,
    attempts: maxAttempts,
  };
}
