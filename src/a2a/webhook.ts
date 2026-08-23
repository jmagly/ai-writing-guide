// A2A push-notification webhook receiver — verifies HMAC-SHA256 signatures
// using the Stripe-style `X-AIWG-Signature: t=<ts>,v1=<hmac>` header, rejects
// stale timestamps (replay protection), and deduplicates by event-id
// (idempotency).
//
// The webhook is the push-based alternative to SSE described in
// roctinam/agentic-sandbox issue #211. The executor signs the raw request
// body with a per-config secret (registered via
// A2AClient.createPushNotificationConfig) and POSTs StreamResponse-shaped
// payloads to the AIWG receiver URL.
//
// This module is HTTP-framework-agnostic. The serve.ts wiring adapts Hono
// requests to `verifyWebhookSignature`; tests can call the same function
// directly with synthesized Buffers.
//
// @issue #1256

import { createHmac, timingSafeEqual } from 'node:crypto';
import { decodeStreamResponse, A2AEventReconciler } from './events.js';
import type { A2AProtocolVersion, StreamEvent } from './types.js';

/** Header name (case-insensitive). */
export const SIGNATURE_HEADER = 'x-aiwg-signature';

/** Five minutes — RFC 8941 timestamp tolerance. */
export const DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 300;

/** Idempotency cache size. Old entries are evicted FIFO. */
export const DEFAULT_IDEMPOTENCY_CAPACITY = 4096;

// ── verification ───────────────────────────────────────────────────────

export interface VerifyResult {
  ok: boolean;
  /** When `ok=false`, a stable machine code suitable for ProblemDetails. */
  code?:
    | 'signature_missing'
    | 'signature_malformed'
    | 'signature_mismatch'
    | 'timestamp_skew'
    | 'secret_unknown';
  /** Human-readable detail. */
  detail?: string;
  /** Parsed timestamp on success (epoch seconds). */
  timestamp?: number;
}

export interface VerifyOptions {
  /**
   * Function to look up the per-config secret given the `configId` query
   * parameter on the webhook URL. Returning `null` causes a
   * `secret_unknown` failure.
   *
   * Implementations should fetch from a per-mission store populated when
   * createPushNotificationConfig is called.
   */
  lookupSecret: (configId: string) => string | null | Promise<string | null>;
  /** Skew tolerance in seconds. Defaults to 5 minutes. */
  toleranceSeconds?: number;
  /** Clock override for testing. */
  now?: () => number;
}

/**
 * Verify the `X-AIWG-Signature` header against the raw request body.
 *
 * Stripe-style format:
 *   `X-AIWG-Signature: t=1700000000,v1=<hex hmac-sha256>`
 *
 * The HMAC is computed over `t=<timestamp>.<raw body>` (the timestamp and
 * a literal dot, prepended to the body). Multiple `v1=` entries may be
 * present in a single header (during a key rotation); any match accepts.
 */
export async function verifyWebhookSignature(
  signature: string | undefined,
  body: Buffer,
  configId: string,
  opts: VerifyOptions
): Promise<VerifyResult> {
  if (!signature) {
    return { ok: false, code: 'signature_missing', detail: 'missing X-AIWG-Signature header' };
  }
  const parsed = parseSignatureHeader(signature);
  if (!parsed) {
    return { ok: false, code: 'signature_malformed', detail: 'X-AIWG-Signature did not parse' };
  }
  const tolerance = opts.toleranceSeconds ?? DEFAULT_TIMESTAMP_TOLERANCE_SECONDS;
  const now = opts.now ? opts.now() : Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > tolerance) {
    return {
      ok: false,
      code: 'timestamp_skew',
      detail: `timestamp skew ${Math.abs(now - parsed.timestamp)}s exceeds tolerance ${tolerance}s`,
    };
  }

  const secret = await opts.lookupSecret(configId);
  if (!secret) {
    return { ok: false, code: 'secret_unknown', detail: `no secret registered for configId='${configId}'` };
  }

  const signedPayload = `${parsed.timestamp}.${body.toString('utf8')}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

  for (const candidate of parsed.v1) {
    if (constantTimeHexEqual(candidate, expected)) {
      return { ok: true, timestamp: parsed.timestamp };
    }
  }
  return { ok: false, code: 'signature_mismatch', detail: 'no v1 signature matched' };
}

/** Parse `t=...,v1=...,(v1=...,)*` into structured fields. */
export function parseSignatureHeader(
  header: string
): { timestamp: number; v1: string[] } | null {
  const parts = header.split(',').map(s => s.trim()).filter(Boolean);
  let timestamp: number | null = null;
  const v1: string[] = [];
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq <= 0) return null;
    const key = p.slice(0, eq);
    const value = p.slice(eq + 1);
    if (key === 't') {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      timestamp = n;
    } else if (key === 'v1') {
      if (!/^[0-9a-f]+$/i.test(value)) return null;
      v1.push(value);
    }
    // ignore unknown keys forward-compat
  }
  if (timestamp === null || v1.length === 0) return null;
  return { timestamp, v1 };
}

function constantTimeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length || ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}

// ── idempotency cache ──────────────────────────────────────────────────

/**
 * Bounded FIFO event-id deduper. The first call with a given id returns
 * true; subsequent calls return false until the id falls out of the
 * window.
 *
 * Subscribers MUST dedupe per the spec — the executor's delivery worker
 * retries on non-2xx responses, so a flaky downstream handler will
 * receive the same event-id multiple times.
 */
export class IdempotencyCache {
  private readonly capacity: number;
  private readonly seen = new Set<string>();
  private readonly pending = new Set<string>();
  private readonly order: string[] = [];

  constructor(capacity: number = DEFAULT_IDEMPOTENCY_CAPACITY) {
    this.capacity = Math.max(16, capacity);
  }

  /** Returns true if `id` is new (and stores it); false if it's a duplicate. */
  markFresh(id: string): boolean {
    if (this.seen.has(id)) return false;
    this.commit(id);
    return true;
  }

  /** Reserve an event before parsing/routing so concurrent deliveries cannot race. */
  begin(id: string): 'fresh' | 'pending' | 'duplicate' {
    if (this.seen.has(id)) return 'duplicate';
    if (this.pending.has(id)) return 'pending';
    this.pending.add(id);
    return 'fresh';
  }

  /** Mark a successfully routed reservation as completed. */
  commit(id: string): void {
    this.pending.delete(id);
    if (this.seen.has(id)) return;
    this.seen.add(id);
    this.order.push(id);
    while (this.order.length > this.capacity) {
      const evicted = this.order.shift();
      if (evicted !== undefined) this.seen.delete(evicted);
    }
  }

  /** Release a failed reservation so a later retry can be processed. */
  release(id: string): void {
    this.pending.delete(id);
  }

  size(): number {
    return this.seen.size;
  }
}

// ── secret registry ───────────────────────────────────────────────────

/**
 * Maps `configId` to its symmetric HMAC secret + optional mission
 * routing metadata. Populated when the AIWG client calls
 * createPushNotificationConfig on mission start; torn down on mission
 * complete.
 *
 * Threading model: single-process in-memory map. For multi-replica
 * deployments swap in a shared backing store (Redis, etc.) with the
 * same interface.
 */
export interface PushSecretRegistryEntry {
  configId: string;
  secret: string;
  /** Mission this config belongs to — used for routing webhook payloads. */
  missionId?: string;
  /** Task this config belongs to — used to scope StreamEvent application. */
  taskId?: string;
  contextId?: string;
  protocolVersion?: A2AProtocolVersion;
  /** Executor/tenant ownership key included in routing scope. */
  taskOwner?: string;
  /** Free-form metadata returned alongside the entry on lookup. */
  metadata?: Record<string, unknown>;
}

export class PushSecretRegistry {
  private readonly entries = new Map<string, PushSecretRegistryEntry>();
  private readonly reconcilers = new Map<string, A2AEventReconciler>();

  register(entry: PushSecretRegistryEntry): void {
    if (entry.protocolVersion === '1.0' && !entry.taskId) {
      throw new Error('A2A 1.0 push config registration requires taskId ownership scope');
    }
    this.entries.set(entry.configId, entry);
    if (entry.taskId) {
      this.reconcilers.set(entry.configId, new A2AEventReconciler({
        taskId: entry.taskId,
        ...(entry.contextId ? { contextId: entry.contextId } : {}),
      }));
    }
  }

  lookup(configId: string): PushSecretRegistryEntry | null {
    return this.entries.get(configId) ?? null;
  }

  unregister(configId: string): boolean {
    this.reconcilers.delete(configId);
    return this.entries.delete(configId);
  }

  reconcile(configId: string, event: StreamEvent): StreamEvent | null {
    const entry = this.entries.get(configId);
    const eventOwner = ownerOf(event);
    if (entry?.taskOwner && eventOwner && entry.taskOwner !== eventOwner) {
      throw new Error(`A2A event belongs to owner ${eventOwner}, expected ${entry.taskOwner}`);
    }
    const reconciler = this.reconcilers.get(configId);
    return reconciler ? reconciler.accept(event) : event;
  }

  /** Test/debug helper. */
  size(): number {
    return this.entries.size;
  }
}

// ── high-level handler ────────────────────────────────────────────────

export interface WebhookHandlerOptions {
  registry: PushSecretRegistry;
  idempotency: IdempotencyCache;
  /**
   * Route the verified, deduplicated StreamEvent into the mission state
   * machine. Implementations typically forward to the same event handler
   * SSE uses.
   */
  route: (entry: PushSecretRegistryEntry, event: StreamEvent) => void | Promise<void>;
  toleranceSeconds?: number;
  now?: () => number;
  contentType?: string;
}

export interface HandleResult {
  status: number;
  /** ProblemDetails-shape body for non-2xx; minimal `{ ok: true }` for 2xx. */
  body: Record<string, unknown>;
}

/**
 * One-shot processor: takes a raw webhook request (configId + body +
 * signature header + event-id header), verifies, dedupes, routes.
 *
 * Returns the status code and body the HTTP layer should emit. The HTTP
 * adapter (serve.ts) is responsible for reading the raw body bytes
 * BEFORE any JSON parsing — the signature is computed over raw bytes
 * (whitespace-sensitive).
 */
export async function handleWebhook(
  configId: string,
  body: Buffer,
  signature: string | undefined,
  eventId: string | undefined,
  opts: WebhookHandlerOptions
): Promise<HandleResult> {
  if (!configId) {
    return {
      status: 400,
      body: errorBody('aiwg.webhook_config_missing', 'configId query parameter missing'),
    };
  }
  if (!eventId) {
    return {
      status: 400,
      body: errorBody('aiwg.webhook_event_id_missing', 'event-id header missing'),
    };
  }

  // Verify signature first — never touch the body's contents until the
  // HMAC has been checked.
  const verification = await verifyWebhookSignature(signature, body, configId, {
    lookupSecret: id => {
      const entry = opts.registry.lookup(id);
      return entry ? entry.secret : null;
    },
    ...(opts.toleranceSeconds !== undefined ? { toleranceSeconds: opts.toleranceSeconds } : {}),
    ...(opts.now ? { now: opts.now } : {}),
  });

  if (!verification.ok) {
    return {
      status:
        verification.code === 'timestamp_skew'
          ? 401
          : verification.code === 'secret_unknown'
            ? 404
            : 401,
      body: errorBody(`aiwg.webhook_${verification.code}`, verification.detail ?? ''),
    };
  }

  // Idempotency check — duplicate event-ids are accepted with 200 but
  // not re-routed. The executor's retry logic depends on a 2xx response
  // to mark delivery complete; failing here would cause infinite retry.
  const entryForScope = opts.registry.lookup(configId);
  const protocolVersion = entryForScope?.protocolVersion ?? '0.3';
  const scopedEventId = [
    configId,
    protocolVersion,
    entryForScope?.taskOwner ?? '',
    entryForScope?.taskId ?? '',
    eventId,
  ].join('|');
  const reservation = opts.idempotency.begin(scopedEventId);
  if (reservation === 'duplicate') {
    return { status: 200, body: { ok: true, deduped: true } };
  }
  if (reservation === 'pending') {
    return {
      status: 409,
      body: errorBody('aiwg.webhook_event_in_progress', 'a concurrent delivery is still being processed'),
    };
  }

  // Route the verified payload. Errors thrown here become 500 so the
  // executor will retry — pick the abstraction carefully on the
  // mission-state side.
  const entry = opts.registry.lookup(configId);
  if (!entry) {
    // Edge case: secret was unregistered between verify and route.
    opts.idempotency.release(scopedEventId);
    return {
      status: 404,
      body: errorBody('aiwg.webhook_secret_unknown', `configId='${configId}' no longer registered`),
    };
  }

  if (protocolVersion === '1.0' && opts.contentType?.split(';')[0]?.trim().toLowerCase() !== 'application/a2a+json') {
    opts.idempotency.release(scopedEventId);
    return {
      status: 415,
      body: errorBody('aiwg.webhook_content_type_invalid', 'A2A 1.0 push requires application/a2a+json'),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString('utf8'));
  } catch (e) {
    opts.idempotency.release(scopedEventId);
    return {
      status: 400,
      body: errorBody('aiwg.webhook_body_not_json', (e as Error).message),
    };
  }

  let event: StreamEvent;
  try {
    event = decodeStreamResponse(protocolVersion, parsed, { eventId });
    const accepted = opts.registry.reconcile(configId, event);
    if (!accepted) {
      opts.idempotency.commit(scopedEventId);
      return { status: 200, body: { ok: true, deduped: true } };
    }
    event = accepted;
  } catch (e) {
    opts.idempotency.release(scopedEventId);
    return {
      status: 400,
      body: errorBody('aiwg.webhook_event_invalid', (e as Error).message),
    };
  }

  try {
    await opts.route(entry, event);
  } catch (e) {
    opts.idempotency.release(scopedEventId);
    return {
      status: 500,
      body: errorBody('aiwg.webhook_route_failed', (e as Error).message),
    };
  }

  opts.idempotency.commit(scopedEventId);
  return { status: 200, body: { ok: true } };
}

function errorBody(code: string, detail: string): Record<string, unknown> {
  return {
    type: 'about:blank',
    title: 'Webhook rejected',
    code,
    detail,
  };
}

function ownerOf(event: StreamEvent): string | undefined {
  const metadata = event.type === 'task'
    ? event.task.metadata
    : event.type === 'message'
      ? event.message.metadata
      : event.metadata;
  const owner = metadata?.['task_owner']
    ?? metadata?.['taskOwner']
    ?? metadata?.['tenant_id']
    ?? metadata?.['tenantId'];
  return typeof owner === 'string' && owner ? owner : undefined;
}
