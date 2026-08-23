// Normalized A2A domain types. Protocol 0.3 and 1.0 wire values are decoded
// into these types at the boundary in codecs.ts. Application code must not
// depend on either version's enum spellings, kind fields, or oneof layout.

import type { JsonValue } from './jcs.js';
export type { GraphExecutionMetadata, GraphRunIdentity } from '../flow/graph-metadata.js';
export { AIWG_GRAPH_METADATA_KEY } from '../flow/graph-metadata.js';

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

export type MessagePart =
  | {
      type: 'text';
      text: string;
      mediaType?: string;
      metadata?: Record<string, JsonValue>;
    }
  | {
      type: 'data';
      data: JsonValue;
      mediaType?: string;
      metadata?: Record<string, JsonValue>;
    }
  | {
      type: 'file';
      /** Base64-encoded bytes. Exactly one of raw/url is present. */
      raw?: string;
      /** External URL for the file. Exactly one of raw/url is present. */
      url?: string;
      filename?: string;
      mediaType?: string;
      metadata?: Record<string, JsonValue>;
    };

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
  extensions?: string[];
  referenceTaskIds?: string[];
}

// ---------- A2A Task ----------

export interface TaskStatus {
  state: TaskState;
  /** Agent-supplied message describing the current state. HITL prompts ride
   *  here in `metadata` when `state === 'input-required'`. */
  message?: Message;
  /** RFC 3339 timestamp of the last state transition. */
  timestamp?: string;
  /** Normalized extension payload retained across version adapters. */
  extensions?: string[];
  /** Normalized sandbox execution detail (0.3 extension fields). */
  summary?: string;
  exitCode?: number;
}

export interface Task {
  id: string;
  contextId?: string;
  status: TaskStatus;
  artifacts?: Artifact[];
  metadata?: Record<string, JsonValue>;
  history?: Message[];
  extensions?: string[];
}

export interface Artifact {
  artifactId: string;
  parts: MessagePart[];
  name?: string;
  description?: string;
  metadata?: Record<string, JsonValue>;
  extensions?: string[];
}

// ---------- Streaming envelope (SSE + push notifications) ----------

/** Normalized events emitted by both version-specific SSE and push decoders. */
export type StreamEvent =
  | StreamEventBase & { type: 'task'; task: Task }
  | StreamEventBase & { type: 'message'; message: Message }
  | StreamEventBase & {
      type: 'status';
      taskId: string;
      contextId?: string;
      status: TaskStatus;
      metadata?: Record<string, JsonValue>;
    }
  | StreamEventBase & {
      type: 'artifact';
      taskId: string;
      contextId?: string;
      artifact: Artifact;
      append?: boolean;
      lastChunk?: boolean;
      metadata?: Record<string, JsonValue>;
    };

export interface StreamEventBase {
  protocolVersion: A2AProtocolVersion;
  /** Binding-provided sequence, when available. */
  sequence?: number;
  /** Binding-provided event identifier, when available. */
  eventId?: string;
}

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
  /** 0.3 name for protocolBinding. */
  transport?: 'JSONRPC' | 'GRPC' | 'REST' | string;
  /** 1.0 binding name (HTTP+JSON, JSONRPC, GRPC, or extension URI). */
  protocolBinding?: string;
  /** Required per interface in 1.0; normalized from the card in protocol.ts. */
  protocolVersion?: string;
  tenant?: string;
}

export interface AgentCardSignature {
  header: { alg: string; kid?: string };
  signature: string;
}

export interface AgentCard {
  /** 0.3 top-level protocol declaration. Removed in 1.0. */
  protocolVersion?: string;
  name: string;
  /** 0.3 top-level service URL. Removed in 1.0. */
  url?: string;
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
  secret?: string;
  /** Optional event filter (e.g. `["status-update"]`). */
  eventTypes?: Array<StreamEvent['type']>;
  metadata?: Record<string, JsonValue>;
  /** A2A 1.0 token echoed in X-A2A-Notification-Token. */
  token?: string;
  authentication?: { scheme: string; credentials?: string };
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
  /** Standard VersionNotSupportedError detail. */
  supportedVersions?: string[];
  [key: string]: JsonValue | undefined;
}

// ---------- Protocol negotiation ----------

export type A2AProtocolVersion = '0.3' | '1.0';
export type A2AProtocolPolicy = A2AProtocolVersion | 'auto';

export interface NormalizedAgentInterface {
  url: string;
  protocolBinding: string;
  protocolVersion: A2AProtocolVersion;
  tenant?: string;
  /** Ordered position from supportedInterfaces. */
  preference: number;
  /** True when synthesized from a 0.3 top-level card URL. */
  legacy: boolean;
}

export interface NormalizedAgentCard {
  card: AgentCard;
  interfaces: NormalizedAgentInterface[];
}
