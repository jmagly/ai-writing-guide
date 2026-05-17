// A2A protocol types — the subset AIWG needs to talk to an agentic-sandbox v2
// executor. Modelled from the executor's wire surface
// (`agentic-sandbox/management/agentic-sandbox-executor`):
//
//   - send_message.rs   — POST /agents/{id}/v1/messages:send
//   - get_task.rs       — GET  /agents/{id}/v1/tasks/{tid}
//   - cancel_task.rs    — POST /agents/{id}/v1/tasks/{tid}/cancel
//   - subscribe_task    — GET  /agents/{id}/v1/tasks/{tid}/subscribe (SSE)
//   - push_delivery.rs  — *   /agents/{id}/v1/tasks/{tid}/pushNotificationConfigs/*
//   - agent_card.rs     — GET  /agents/{id}/.well-known/agent-card.json
//                          GET  /agents/{id}/v1/extendedAgentCard
//
// Types are intentionally permissive (extra fields allowed). We track only
// what the AIWG orchestrator inspects; the rest is forwarded opaquely.

import type { JsonValue } from './jcs.js';

// Re-export so consumers can `import type { JsonValue } from './types.js';`
// without reaching into the JCS module's surface.
export type { JsonValue };

// ---------- Task state machine ----------

/** A2A task lifecycle states (executor `TaskState` enum). */
export type TaskState =
  | 'submitted'
  | 'working'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'input-required'
  | 'rejected'
  | 'auth-required';

export const TERMINAL_TASK_STATES: readonly TaskState[] = [
  'completed',
  'failed',
  'canceled',
  'rejected',
] as const;

export function isTerminalTaskState(s: TaskState): boolean {
  return TERMINAL_TASK_STATES.includes(s);
}

// ---------- A2A Message ----------

export interface MessagePart {
  kind: 'text' | 'data' | 'file';
  text?: string;
  data?: JsonValue;
  /** Mime type when `kind === 'file'`. */
  mimeType?: string;
  /** Base64-encoded bytes when `kind === 'file'`. */
  bytes?: string;
  /** URI reference when `kind === 'file'` and content is external. */
  uri?: string;
}

export interface Message {
  /**
   * Caller-supplied stable id. Used as the idempotency key by the executor's
   * `idempotency/v1` extension. Same `messageId` + same body → cached replay.
   */
  messageId: string;
  role: 'user' | 'agent';
  parts: MessagePart[];
  contextId?: string;
  taskId?: string;
  metadata?: Record<string, JsonValue>;
}

// ---------- A2A Task ----------

export interface TaskStatus {
  state: TaskState;
  /** Agent-supplied message describing the current state. HITL prompts ride
   *  here in `metadata` when `state === 'input-required'`. */
  message?: Message;
  /** RFC 3339 timestamp of the last state transition. */
  timestamp?: string;
}

export interface Task {
  id: string;
  contextId?: string;
  status: TaskStatus;
  artifacts?: Artifact[];
  metadata?: Record<string, JsonValue>;
  history?: Message[];
}

export interface Artifact {
  artifactId: string;
  parts: MessagePart[];
  name?: string;
  description?: string;
  metadata?: Record<string, JsonValue>;
}

// ---------- Streaming envelope (SSE + push notifications) ----------

/** Server-sent stream events sent over both SSE (`tasks/{tid}/subscribe`)
 *  and push-notification webhooks. Tagged by `kind`. */
export type StreamEvent =
  | { kind: 'task-state'; task: Task }
  | { kind: 'status-update'; taskId: string; status: TaskStatus; final?: boolean }
  | { kind: 'artifact-update'; taskId: string; artifact: Artifact; append?: boolean };

// ---------- AgentCard ----------

export interface AgentCardCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  extensions?: AgentCardExtension[];
}

export interface AgentCardExtension {
  /** Canonical extension URI, e.g. `https://agentic-sandbox.aiwg.io/extensions/runtime/v1`. */
  uri: string;
  required: boolean;
  description?: string;
  params?: Record<string, JsonValue>;
}

export interface AgentCardSkill {
  id: string;
  name: string;
  tags?: string[];
  description?: string;
}

export interface AgentCardInterface {
  url: string;
  transport: 'JSONRPC' | 'GRPC' | 'REST' | string;
}

export interface AgentCardSignature {
  header: { alg: string; kid?: string };
  signature: string;
}

export interface AgentCard {
  protocolVersion: string;
  name: string;
  url: string;
  version: string;
  preferredTransport?: string;
  capabilities?: AgentCardCapabilities;
  skills?: AgentCardSkill[];
  supportedInterfaces?: AgentCardInterface[];
  /** Present on cards signed per A2A §8 (Ed25519 + JCS payload). */
  signatures?: AgentCardSignature[];
  /** Free-form executor extensions. */
  metadata?: Record<string, JsonValue>;
}

// ---------- Push notification configs ----------

export interface PushNotificationConfig {
  /** Server-assigned config id; absent on create. */
  configId?: string;
  /** Subscriber webhook URL — where the executor POSTs `StreamEvent` payloads. */
  url: string;
  /** Symmetric secret for HMAC-SHA256 signature (`X-AIWG-Signature: t=,v1=`). */
  secret: string;
  /** Optional event filter (e.g. `["status-update"]`). */
  eventTypes?: Array<StreamEvent['kind']>;
  metadata?: Record<string, JsonValue>;
}

// ---------- Error model (RFC 7807) ----------

export interface ProblemDetails {
  type: string;
  title: string;
  detail?: string;
  status?: number;
  /** Sandbox-specific machine code, e.g. `request.invalid_params`. */
  code?: string;
  instance?: string;
}
