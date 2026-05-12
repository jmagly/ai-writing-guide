// Executor WS client — subscribes to /ws/executors/{id} on aiwg serve and
// surfaces inbound mission lifecycle events to handlers.
//
// Cycle 3 of #1182. Pairs with dispatch-client (cycle 2) to complete the
// bridge: dispatch-client pushes missions in; this client receives the
// resulting lifecycle events out.

/**
 * @typedef {object} ExecutorEvent
 * @property {string} event
 * @property {string} executor_id
 * @property {string} [mission_id]
 * @property {string} ts
 * @property {object} [data]
 */

/**
 * @typedef {object} ExecutorWSClientOptions
 * @property {string} aiwgServeUrl
 * @property {string} executorId
 * @property {string} [token]                       Bearer token if the WS endpoint requires it.
 * @property {(event: ExecutorEvent) => void | Promise<void>} onEvent
 * @property {(reason: 'opened'|'closed'|'error', meta?: object) => void} [onState]
 * @property {(msg: string, meta?: object) => void} [logger]
 * @property {number} [reconnectBaseMs=1000]
 * @property {number} [reconnectMaxMs=30000]
 * @property {AbortSignal} [signal]
 * @property {any} [WebSocketImpl]                  Injectable WebSocket constructor (for tests).
 */

const DEFAULT_RECONNECT_BASE_MS = 1000;
const DEFAULT_RECONNECT_MAX_MS = 30_000;

/**
 * Build the WS URL for a given executor. Token, if provided, goes as a
 * query-string parameter per the sandbox's executor contract.
 *
 * @param {string} aiwgServeUrl   Base URL (http or https).
 * @param {string} executorId
 * @param {string} [token]
 * @returns {string}
 */
export function buildWsUrl(aiwgServeUrl, executorId, token) {
  const base = aiwgServeUrl.replace(/^http(s?):\/\//, 'ws$1://').replace(/\/+$/, '');
  const path = `${base}/ws/executors/${encodeURIComponent(executorId)}`;
  return token ? `${path}?token=${encodeURIComponent(token)}` : path;
}

/**
 * Compute reconnect delay: doubling base, capped at max.
 *
 * @param {number} attempt 1-indexed.
 * @param {number} baseMs
 * @param {number} maxMs
 */
export function reconnectDelay(attempt, baseMs, maxMs) {
  return Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt - 1)));
}

/**
 * Open a managed WebSocket to /ws/executors/{id}. Reconnects on close/error
 * with exponential backoff. Stops on AbortSignal.
 *
 * @param {ExecutorWSClientOptions} opts
 * @returns {{ stop: () => Promise<void>, ready: Promise<void> }}
 */
export function startExecutorWS(opts) {
  const log = opts.logger || (() => {});
  const WSCtor = opts.WebSocketImpl || globalThis.WebSocket;
  if (!WSCtor) {
    throw new Error('No WebSocket implementation available — pass opts.WebSocketImpl.');
  }
  const reconnectBaseMs = opts.reconnectBaseMs ?? DEFAULT_RECONNECT_BASE_MS;
  const reconnectMaxMs = opts.reconnectMaxMs ?? DEFAULT_RECONNECT_MAX_MS;

  let stopped = false;
  let attempt = 0;
  /** @type {any} */
  let socket = null;
  let firstOpenResolve;
  let firstOpenReject;
  const ready = new Promise((resolve, reject) => {
    firstOpenResolve = resolve;
    firstOpenReject = reject;
  });
  // Always attach a noop catch so a rejection-on-stop doesn't surface as an
  // unhandled-promise warning when the caller never awaited `ready`.
  ready.catch(() => {});

  const url = buildWsUrl(opts.aiwgServeUrl, opts.executorId, opts.token);

  const connect = () => {
    if (stopped) return;
    attempt++;
    try {
      socket = new WSCtor(url);
    } catch (err) {
      log('executor-ws:construct-failed', { executorId: opts.executorId, error: String(err) });
      schedule();
      return;
    }

    socket.addEventListener?.('open', () => {
      log('executor-ws:opened', { executorId: opts.executorId, attempt });
      attempt = 0;
      opts.onState?.('opened', { url });
      firstOpenResolve?.();
    });

    socket.addEventListener?.('message', async (evt) => {
      let payload;
      try {
        payload = JSON.parse(typeof evt.data === 'string' ? evt.data : String(evt.data));
      } catch (err) {
        log('executor-ws:bad-message', {
          executorId: opts.executorId,
          error: String(err),
          sample: String(evt.data).slice(0, 80),
        });
        return;
      }
      try {
        await opts.onEvent(payload);
      } catch (err) {
        log('executor-ws:handler-error', {
          executorId: opts.executorId,
          event: payload?.event,
          error: String(err && err.message || err),
        });
      }
    });

    socket.addEventListener?.('close', (evt) => {
      log('executor-ws:closed', {
        executorId: opts.executorId,
        code: evt?.code,
        reason: evt?.reason,
      });
      opts.onState?.('closed', { code: evt?.code });
      socket = null;
      if (!stopped) schedule();
    });

    socket.addEventListener?.('error', (evt) => {
      log('executor-ws:error', {
        executorId: opts.executorId,
        message: String(evt?.message || evt || 'unknown'),
      });
      opts.onState?.('error');
      // 'close' will follow; reconnect logic lives there.
    });
  };

  const schedule = () => {
    if (stopped) return;
    const delay = reconnectDelay(attempt, reconnectBaseMs, reconnectMaxMs);
    log('executor-ws:reconnect', { executorId: opts.executorId, attempt: attempt + 1, delay });
    setTimeout(() => { if (!stopped) connect(); }, delay).unref?.();
  };

  // First connect
  connect();

  // Wire abort signal
  if (opts.signal) {
    if (opts.signal.aborted) { void stop(); }
    else opts.signal.addEventListener('abort', () => { void stop(); }, { once: true });
  }

  async function stop() {
    if (stopped) return;
    stopped = true;
    try {
      if (socket && typeof socket.close === 'function') socket.close(1000, 'shutdown');
    } catch {}
    firstOpenReject?.(new Error('stopped before first open'));
    log('executor-ws:stopped', { executorId: opts.executorId });
  }

  return { stop, ready };
}

/**
 * Map an executor-v1 event to a session.json status transition.
 *
 * Returns either:
 *   - null  → log-only (mission.progress, executor.resync)
 *   - {missionId, status, patch, transitionFrom?}  → status writeback
 *
 * The shape matches the mission state writeback table in the cycle-1 README.
 *
 * @param {ExecutorEvent} event
 * @returns {object | null}
 */
export function eventToStatusUpdate(event) {
  if (!event || !event.event) return null;
  const missionId = event.mission_id;
  const data = event.data || {};
  switch (event.event) {
    case 'mission.assigned':
      // The bridge already sets `assigned` on successful dispatch; this echo
      // is informational. Keep as a no-op writeback when status is already
      // assigned (transitionFrom guard prevents double-stamping).
      return null;

    case 'mission.started':
      return {
        missionId,
        status: 'running',
        transitionFrom: 'assigned',
        patch: {
          startedAt: event.ts,
          agentRuntime: data.agent_runtime || null,
          ptySessionId: data.pty_session_id || null,
        },
      };

    case 'mission.progress':
      // Log-only — no status change, no writeback. Future: append to log.jsonl.
      return null;

    case 'mission.hitl_required':
      return {
        missionId,
        status: 'hitl_required',
        patch: {
          hitlId: data.hitl_id || null,
          hitlPrompt: data.prompt || null,
          hitlContext: data.context || null,
          hitlAt: event.ts,
        },
      };

    case 'mission.hitl_responded':
      return {
        missionId,
        status: 'running',
        transitionFrom: 'hitl_required',
        patch: {
          hitlRespondedAt: event.ts,
          hitlResponse: data.text || null,
        },
      };

    case 'mission.suspended':
      return {
        missionId,
        status: 'suspended',
        patch: {
          suspendedAt: event.ts,
          checkpointId: data.checkpoint_id || null,
          suspendReason: data.reason || null,
        },
      };

    case 'mission.reconnected':
      // No status change on its own; the paired mission.resumed will flip
      // status. Keep as log-only.
      return null;

    case 'mission.resumed':
      return {
        missionId,
        status: 'running',
        patch: {
          resumedAt: event.ts,
          resumedFrom: data.resumed_from || 'suspended',
        },
      };

    case 'mission.completed':
      return {
        missionId,
        status: 'done',
        patch: {
          completedAt: event.ts,
          exitCode: typeof data.exit_code === 'number' ? data.exit_code : null,
          summary: data.summary || null,
        },
      };

    case 'mission.failed':
      return {
        missionId,
        status: 'failed',
        patch: {
          failedAt: event.ts,
          failureReason: data.reason || 'unknown',
          failureMessage: data.error || null,
          exitCode: typeof data.exit_code === 'number' ? data.exit_code : null,
        },
      };

    case 'mission.aborted':
      return {
        missionId,
        status: 'aborted',
        patch: {
          abortedAt: event.ts,
          abortedBy: data.aborted_by || 'unknown',
          abortReason: data.reason || null,
        },
      };

    case 'executor.resync':
      // executor-level — no per-mission writeback here. Callers should
      // reconcile owned_mission_ids against local state separately.
      return null;

    default:
      return null;
  }
}
