/**
 * Dispatch Router — outbound mission dispatch with A2A-first + v1 fallback.
 *
 * AIWG exposes `POST /api/v1/sessions/:id/dispatch` as its public mission
 * intake. The original implementation forwarded to the executor's v1
 * `/dispatch` endpoint (`${rest}/dispatch`). Per #1252, AIWG should now
 * try the A2A path first (`POST /agents/{executorId}/v1/messages:send`)
 * and fall back to v1 on 404 with a structured deprecation warning.
 *
 * Wire-shape mapping (v1 dispatch payload → A2A Message):
 *
 *   v1 payload                       →  A2A Message
 *   --------------------------------    --------------------------------------
 *   mission_id                          message.messageId (idempotency key)
 *   objective                           parts[0] = { kind: 'text', text: ... }
 *   completion                          metadata.completion
 *   executor_filter                     metadata.executor_filter
 *   long_running                        metadata.long_running
 *   <any other field>                   metadata.<field>
 *
 * @issue #1252 #1254 #1259
 */

import {
  A2A_IDEMPOTENCY_V1,
  A2A_RUNTIME_V1,
  A2AClient,
} from '../a2a/client.js';
import { A2AError, type DeprecationInfo } from '../a2a/http.js';
import type { JsonValue, Message, Task } from '../a2a/types.js';

import type { ExecutorRegistration } from './executor-registry.js';

/** Per-call dispatch options. */
export interface DispatchRouterOptions {
  /** Custom fetch (for tests). */
  fetch?: typeof fetch;
  /** Force a specific path; mostly used by tests. */
  forceV1?: boolean;
  /** Called when the v1 fallback fires (drives `v1.dispatch.fallback` event). */
  onV1Fallback?: (info: { executorId: string; reason: string; sunset?: string }) => void;
  /** Called when the http wrapper sees `Sunset` / `Deprecated` headers
   *  on any forwarded request (drives `v1.deprecation.observed` event). */
  onDeprecation?: (info: DeprecationInfo) => void;
  /** Required A2A extensions to advertise on v2 calls. Defaults to runtime+idempotency. */
  requiredExtensions?: readonly string[];
  /** Optional A2A extensions to additionally advertise (e.g. hitl-prompt). */
  optionalExtensions?: readonly string[];
}

/** Wire shape of the v1 dispatch payload AIWG accepts on
 *  POST /api/v1/sessions/:id/dispatch. */
export interface V1DispatchPayload {
  mission_id: string;
  objective: string;
  completion?: string;
  long_running?: boolean;
  executor_filter?: Record<string, JsonValue>;
  /** Anything else flows through to A2A `Message.metadata`. */
  [key: string]: JsonValue | boolean | undefined;
}

/** Normalized result returned by the router. */
export interface DispatchResult {
  missionId: string;
  executorId: string;
  /** Which path served the dispatch. */
  dispatchPath: 'v2' | 'v1-fallback';
  /** A2A Task (when v2). */
  task?: Task;
  /** Estimated start (when v1 fallback returns one). */
  estimatedStart?: string;
  /** True when the executor served an idempotency replay (v2 only). */
  idempotentReplayed: boolean;
}

/**
 * Route a dispatch to an executor. Tries v2 first, falls back to v1 on 404
 * or when `forceV1` is set. Throws on all other failure modes — caller is
 * responsible for surfacing 5xx to the inbound caller.
 */
export async function routeDispatch(
  executor: ExecutorRegistration,
  payload: V1DispatchPayload,
  opts: DispatchRouterOptions = {}
): Promise<DispatchResult> {
  if (opts.forceV1 === true) {
    const v1 = await dispatchV1(executor, payload, opts);
    return v1;
  }

  // Try v2 first.
  try {
    const v2 = await dispatchV2(executor, payload, opts);
    return v2;
  } catch (err) {
    // Only fall back on a 404 from the v2 path. Everything else propagates.
    if (err instanceof A2AError && err.status === 404) {
      // Capture sunset for the telemetry event if any was attached.
      const sunset = err.problem.code === 'aiwg.deprecation_strict' ? undefined : undefined;
      if (opts.onV1Fallback) {
        opts.onV1Fallback({
          executorId: executor.executorId,
          reason: `v2 endpoint returned 404 (path=${err.path})`,
          ...(sunset !== undefined ? { sunset } : {}),
        });
      }
      return dispatchV1(executor, payload, opts);
    }
    throw err;
  }
}

/** v2 path — A2A `messages:send`. */
async function dispatchV2(
  executor: ExecutorRegistration,
  payload: V1DispatchPayload,
  opts: DispatchRouterOptions
): Promise<DispatchResult> {
  const clientOpts: ConstructorParameters<typeof A2AClient>[0] = {
    baseUrl: executor.transportEndpoints.rest,
    bearer: executor.token,
    instanceId: executor.executorId,
    requiredExtensions: opts.requiredExtensions ?? [A2A_RUNTIME_V1, A2A_IDEMPOTENCY_V1],
  };
  if (opts.fetch) clientOpts.fetch = opts.fetch;
  if (opts.optionalExtensions) clientOpts.optionalExtensions = opts.optionalExtensions;
  if (opts.onDeprecation) clientOpts.onDeprecation = opts.onDeprecation;

  const client = new A2AClient(clientOpts);
  const message = payloadToMessage(payload);
  const result = await client.sendMessage(message);
  return {
    missionId: payload.mission_id,
    executorId: executor.executorId,
    dispatchPath: 'v2',
    task: result.task,
    idempotentReplayed: result.idempotentReplayed,
  };
}

/** v1 path — fall back to the legacy `/dispatch` endpoint. */
async function dispatchV1(
  executor: ExecutorRegistration,
  payload: V1DispatchPayload,
  opts: DispatchRouterOptions
): Promise<DispatchResult> {
  const fetchImpl = opts.fetch ?? fetch;
  const url = `${executor.transportEndpoints.rest.replace(/\/+$/, '')}/dispatch`;
  const resp = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${executor.token}`,
    },
    body: JSON.stringify(payload),
  });

  // Inspect deprecation headers from the v1 response — these are exactly
  // what #1259 is meant to surface.
  if (opts.onDeprecation) {
    const dep = readDeprecation(`${executor.transportEndpoints.rest}/dispatch`, resp.headers);
    if (dep) opts.onDeprecation(dep);
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`v1 dispatch failed: ${resp.status} ${detail}`);
  }

  let estimatedStart: string | undefined;
  try {
    const json = (await resp.json()) as Record<string, unknown>;
    if (typeof json['estimated_start'] === 'string') {
      estimatedStart = json['estimated_start'];
    }
  } catch {
    /* optional */
  }

  return {
    missionId: payload.mission_id,
    executorId: executor.executorId,
    dispatchPath: 'v1-fallback',
    idempotentReplayed: false,
    ...(estimatedStart !== undefined ? { estimatedStart } : {}),
  };
}

/** Map a v1 dispatch payload to an A2A Message. */
function payloadToMessage(payload: V1DispatchPayload): Message {
  const metadata: Record<string, JsonValue> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'mission_id' || k === 'objective') continue;
    if (v === undefined) continue;
    // V1DispatchPayload allows boolean — coerce to JSON.
    metadata[k] = v as JsonValue;
  }
  return {
    messageId: payload.mission_id,
    role: 'user',
    parts: [{ kind: 'text', text: payload.objective }],
    metadata,
  };
}

function readDeprecation(path: string, headers: Headers): DeprecationInfo | undefined {
  const sunset = headers.get('sunset') ?? undefined;
  const deprecated = headers.get('deprecated') ?? undefined;
  const link = headers.get('link') ?? undefined;
  if (!sunset && !deprecated && !link) return undefined;
  let successor: string | undefined;
  if (link) {
    const m = /<([^>]+)>\s*;\s*[^,]*rel\s*=\s*"?successor-version"?/i.exec(link);
    if (m) successor = m[1];
  }
  return {
    path,
    ...(sunset ? { sunset } : {}),
    ...(deprecated ? { deprecated } : {}),
    ...(successor ? { successor } : {}),
  };
}
