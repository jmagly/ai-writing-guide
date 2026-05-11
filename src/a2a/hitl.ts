// HITL prompt envelope extractor + delivery adapter interface.
//
// Per `agentic-sandbox/docs/contracts/extensions/hitl-prompt/v1/spec.md`,
// when a task transitions to `input-required` the executor places a HITL
// prompt envelope at:
//
//   task.status.message.metadata['https://agentic-sandbox.aiwg.io/extensions/hitl-prompt/v1']
//
// The envelope has required keys (prompt_id, prompt, response_schema) and
// optional keys (deadline, allowed_responders). AIWG's orchestrator owns
// the workflow:
//
//   1. Detect `input-required` state on a Task / status-update event
//   2. Extract the envelope
//   3. Route to a HitlDeliveryAdapter (CLI / Slack / web)
//   4. Validate the operator's response against `response_schema`
//   5. POST a reply Message with `metadata.hitl_response_for: <prompt_id>`
//      and the response payload at `metadata.<URI>`
//
// This module handles steps 1–4. Step 5 lives in the A2AClient consumer
// that drives the task lifecycle.
//
// @issue #1255

import { A2A_HITL_PROMPT_V1 } from './client.js';
import type { JsonValue, Message, Task, TaskStatus } from './types.js';

/** Envelope shape (executor-side mirror of `metadata.<HITL URI>`). */
export interface HitlPromptEnvelope {
  /** Server-assigned correlation id; used in the reply's `hitl_response_for`. */
  prompt_id: string;
  /** Human-readable prompt text (markdown allowed). */
  prompt: string;
  /** JSON Schema the operator response must conform to. */
  response_schema: JsonValue;
  /** Optional RFC 3339 deadline; orchestrator policy decides on expiry. */
  deadline?: string;
  /** Optional list of authorized responder ids (operator usernames, role names). */
  allowed_responders?: string[];
  /** Free-form vendor metadata. */
  [extra: string]: JsonValue | undefined;
}

/** Result of structural envelope validation. */
export type EnvelopeValidation =
  | { ok: true; envelope: HitlPromptEnvelope }
  | { ok: false; reason: string };

/** Required envelope keys per spec §Prompt envelope. */
const REQUIRED_ENVELOPE_KEYS = ['prompt_id', 'prompt', 'response_schema'] as const;

/**
 * Pull the HITL envelope out of a Task / TaskStatus / Message metadata
 * blob. Returns `null` when the structure is not `input-required` or
 * doesn't carry the envelope. Returns a typed envelope when valid.
 *
 * Pass either the full Task, just the TaskStatus, or just the
 * `status.message` to suit the calling site.
 */
export function extractHitlEnvelope(
  source: Task | TaskStatus | Message | null | undefined
): EnvelopeValidation | null {
  if (!source) return null;

  // Get to the `metadata` object that should carry the envelope.
  let metadata: Record<string, unknown> | undefined;
  let stateGuardPassed = false;

  if (isTask(source)) {
    if (source.status.state !== 'input-required') return null;
    stateGuardPassed = true;
    metadata = source.status.message?.metadata as Record<string, unknown> | undefined;
  } else if (isTaskStatus(source)) {
    if (source.state !== 'input-required') return null;
    stateGuardPassed = true;
    metadata = source.message?.metadata as Record<string, unknown> | undefined;
  } else if (isMessage(source)) {
    // No state to guard on; assume caller already filtered by state.
    stateGuardPassed = true;
    metadata = source.metadata as Record<string, unknown> | undefined;
  }

  if (!stateGuardPassed) return null;
  if (!metadata) {
    return { ok: false, reason: 'no metadata on status.message' };
  }
  const raw = metadata[A2A_HITL_PROMPT_V1];
  if (raw === undefined) {
    return { ok: false, reason: `missing envelope at metadata[${A2A_HITL_PROMPT_V1}]` };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'envelope is not an object' };
  }
  const env = raw as Record<string, unknown>;
  for (const key of REQUIRED_ENVELOPE_KEYS) {
    if (!(key in env)) {
      return { ok: false, reason: `envelope missing required key: ${key}` };
    }
  }
  if (typeof env['prompt_id'] !== 'string' || (env['prompt_id'] as string).length === 0) {
    return { ok: false, reason: 'prompt_id must be a non-empty string' };
  }
  if (typeof env['prompt'] !== 'string') {
    return { ok: false, reason: 'prompt must be a string' };
  }
  return { ok: true, envelope: env as unknown as HitlPromptEnvelope };
}

/** Build the response Message that closes a HITL prompt cycle. */
export function buildHitlResponseMessage(opts: {
  promptId: string;
  response: JsonValue;
  messageId: string;
  taskId?: string;
  contextId?: string;
}): Message {
  const message: Message = {
    messageId: opts.messageId,
    role: 'user',
    parts: [
      {
        kind: 'data',
        data: opts.response,
      },
    ],
    metadata: {
      hitl_response_for: opts.promptId,
      [A2A_HITL_PROMPT_V1]: { response: opts.response },
    },
  };
  if (opts.taskId !== undefined) message.taskId = opts.taskId;
  if (opts.contextId !== undefined) message.contextId = opts.contextId;
  return message;
}

/** Delivery adapter interface — pluggable transport for the prompt. */
export interface HitlDeliveryAdapter {
  /** Display name (for logging / audit trail). */
  name: string;

  /**
   * Deliver a prompt to the operator and collect their response payload.
   *
   * The adapter is responsible for:
   *   - rendering the prompt
   *   - reading the operator's response (UI / stdin / web form)
   *   - returning a JsonValue that conforms to `envelope.response_schema`
   *
   * If validation against the schema fails the orchestrator will reject
   * the response and may re-prompt. Throwing here aborts the flow.
   *
   * Adapters MUST honor `signal` for cancellation. The orchestrator
   * aborts the signal when `deadline` passes or the task is canceled.
   */
  collect(
    envelope: HitlPromptEnvelope,
    ctx: { taskId?: string; contextId?: string; signal?: AbortSignal }
  ): Promise<JsonValue>;
}

/** Validation result shape returned by `validateResponseAgainstSchema`. */
export type SchemaValidation =
  | { ok: true }
  | { ok: false; errors: string[] };

/**
 * Validate a response payload against the envelope's `response_schema`.
 *
 * This module deliberately stays free of an `ajv` import so consumers can
 * either plug in their own validator (see `validateResponseAgainstSchema`)
 * or fall back to structural checks. AIWG already has `ajv` in the dep
 * graph from `src/research/`, so the typical wiring is:
 *
 *   import Ajv from 'ajv';
 *   const ajv = new Ajv({ allErrors: true });
 *   const validate = ajv.compile(envelope.response_schema);
 *   const ok = validate(response);
 *   if (!ok) { ... use validate.errors ... }
 *
 * For tests we ship a tiny structural validator below that covers the
 * happy path. A full `ajv` wiring lands at the orchestrator call site so
 * AIWG can pick its own validator strategy (Ajv strict mode, Zod, etc.).
 */
export function validateResponseStructurally(
  schema: JsonValue,
  response: JsonValue
): SchemaValidation {
  const errors: string[] = [];
  walk(schema, response, '$', errors);
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function walk(schema: JsonValue, value: JsonValue, path: string, errors: string[]): void {
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) return;
  const s = schema as Record<string, JsonValue>;

  if (typeof s['type'] === 'string') {
    const expected = s['type'];
    const actual = typeOf(value);
    if (expected !== actual) {
      errors.push(`${path}: expected ${expected}, got ${actual}`);
      return;
    }
  }

  if (s['type'] === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const v = value as Record<string, JsonValue>;
    const required = Array.isArray(s['required']) ? (s['required'] as JsonValue[]) : [];
    for (const r of required) {
      if (typeof r === 'string' && !(r in v)) {
        errors.push(`${path}.${r}: required field missing`);
      }
    }
    const properties =
      s['properties'] && typeof s['properties'] === 'object' && !Array.isArray(s['properties'])
        ? (s['properties'] as Record<string, JsonValue>)
        : {};
    for (const [k, sub] of Object.entries(properties)) {
      if (k in v) walk(sub, v[k]!, `${path}.${k}`, errors);
    }
  }

  if (s['type'] === 'array' && Array.isArray(value)) {
    const items = s['items'];
    if (items) {
      value.forEach((el, i) => walk(items, el, `${path}[${i}]`, errors));
    }
  }
}

function typeOf(v: JsonValue): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

// ---------- narrow type guards ----------

function isTask(v: unknown): v is Task {
  return typeof v === 'object' && v !== null && 'id' in v && 'status' in v;
}

function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === 'object' && v !== null && 'state' in v && !('id' in v);
}

function isMessage(v: unknown): v is Message {
  return typeof v === 'object' && v !== null && 'messageId' in v && 'role' in v;
}
