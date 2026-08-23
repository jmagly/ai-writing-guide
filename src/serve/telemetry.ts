/**
 * Telemetry Event Schema and In-Memory Store
 *
 * Defines the canonical event types emitted by the agent loop, MC conductor,
 * and ralph launcher. Events are stored in-memory per session and forwarded
 * to the browser via WebSocket push. Persisted to fortemi-react IndexedDB
 * on the browser side (#717).
 *
 * Emission points:
 *   - src/cli/handlers/ralph-launcher.ts → iteration.*, gate.*, tokens.used
 *   - src/cli/handlers/mc.ts → session.*, mission.*, agent.*
 *
 * @issue #716
 * @see #717 — fortemi-react storage layer (browser)
 */

import type { GraphExecutionMetadata } from '../flow/graph-metadata.js';

// ============================================================
// Event Schema
// ============================================================

export type TelemetryEventType =
  | 'session.start'
  | 'session.end'
  | 'mission.dispatch'
  | 'mission.complete'
  | 'mission.abort'
  | 'iteration.start'
  | 'iteration.complete'
  | 'gate.pass'
  | 'gate.fail'
  | 'tokens.used'
  | 'agent.spawn'
  | 'agent.complete'
  | 'scope.unit.complete'
  | 'v1.deprecation.observed'
  | 'v1.dispatch.fallback'
  | 'a2a.protocol.selected'
  | 'a2a.protocol.fallback'
  | 'a2a.webhook.received'
  | 'graph.node.state'
  | 'graph.route.decision'
  | 'graph.checkpoint.saved'
  | 'graph.replay.started';

export interface TelemetryEvent {
  /** Unique event ID */
  id: string;
  /** PTY / agent session ID */
  sessionId: string;
  /** Mission ID (if event is scoped to a mission) */
  missionId?: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  type: TelemetryEventType;
  payload: Record<string, unknown>;
  /** Optional on ordinary events; required for graph.* events. */
  graph?: GraphExecutionMetadata;
}

/** Payload shapes for well-known event types */
export interface TokensUsedPayload {
  input: number;
  output: number;
  model: string;
}

export interface IterationCompletePayload {
  iteration: number;
  durationMs: number;
}

export interface GatePayload {
  criteria: string;
  result: 'pass' | 'fail';
  details?: string;
}

export interface ScopeUnitPayload {
  unit: string;
  total: number;
  done: number;
}

export interface AgentPayload {
  agentId: string;
  agentType: string;
}

/** Payload for `v1.dispatch.fallback`. Emitted by the dispatch router when
 *  a v2 A2A `messages:send` returns 404 and we fall back to the executor's
 *  v1 `/dispatch` endpoint. Powers the trend-to-zero check for the
 *  v1 → v2 dispatch migration (#1252 + #1259). */
export interface V1DispatchFallbackPayload {
  executorId: string;
  reason: string;
  sunset?: string;
}

/** Payload for `v1.deprecation.observed`. Emitted by the A2A HTTP client
 *  whenever it observes a `Sunset` or `Deprecated` header on a v1
 *  endpoint, deduplicated per (path, sunset) pair. Powers the trend-to-zero
 *  check on the v1 → v2 dispatch migration (#1259). */
export interface V1DeprecationObservedPayload {
  /** Request path that returned the deprecation headers. */
  path: string;
  /** `Sunset` header value (RFC 8594), if present. */
  sunset?: string;
  /** `Deprecated` header value, if present. */
  deprecated?: string;
  /** Successor URL extracted from `Link: <…>; rel="successor-version"`. */
  successor?: string;
}

// ============================================================
// In-Memory Event Store
// ============================================================

const MAX_EVENTS_PER_SESSION = 10_000;

export class TelemetryStore {
  private events = new Map<string, TelemetryEvent[]>();
  private listeners = new Set<(event: TelemetryEvent) => void>();

  /** Ingest a new event */
  ingest(event: TelemetryEvent): void {
    const list = this.events.get(event.sessionId) ?? [];
    list.push(event);
    // Trim oldest events when exceeding limit
    if (list.length > MAX_EVENTS_PER_SESSION) {
      list.splice(0, list.length - MAX_EVENTS_PER_SESSION);
    }
    this.events.set(event.sessionId, list);
    for (const listener of this.listeners) {
      try { listener(event); } catch { /* ignore listener errors */ }
    }
  }

  /** Get all events for a session, optionally filtered by type */
  query(
    sessionId: string,
    opts: { types?: TelemetryEventType[]; limit?: number; since?: string } = {},
  ): TelemetryEvent[] {
    let events = this.events.get(sessionId) ?? [];
    if (opts.types?.length) {
      events = events.filter((e) => opts.types!.includes(e.type));
    }
    if (opts.since) {
      events = events.filter((e) => e.timestamp >= opts.since!);
    }
    if (opts.limit) {
      events = events.slice(-opts.limit);
    }
    return events;
  }

  /** Get aggregate metrics for a session */
  metrics(sessionId: string): SessionMetrics {
    const events = this.events.get(sessionId) ?? [];

    let totalInput = 0;
    let totalOutput = 0;
    const tokensByModel: Record<string, { input: number; output: number }> = {};
    let iterations = 0;
    let gatePasses = 0;
    let gateFails = 0;
    let scopeDone = 0;
    let scopeTotal = 0;
    let activeAgents = 0;

    for (const e of events) {
      if (e.type === 'tokens.used') {
        const p = e.payload as unknown as TokensUsedPayload;
        totalInput += p.input;
        totalOutput += p.output;
        const m = tokensByModel[p.model] ?? { input: 0, output: 0 };
        m.input += p.input;
        m.output += p.output;
        tokensByModel[p.model] = m;
      } else if (e.type === 'iteration.complete') {
        iterations++;
      } else if (e.type === 'gate.pass') {
        gatePasses++;
      } else if (e.type === 'gate.fail') {
        gateFails++;
      } else if (e.type === 'scope.unit.complete') {
        const p = e.payload as unknown as ScopeUnitPayload;
        scopeDone = p.done;
        scopeTotal = p.total;
      } else if (e.type === 'agent.spawn') {
        activeAgents++;
      } else if (e.type === 'agent.complete') {
        activeAgents = Math.max(0, activeAgents - 1);
      }
    }

    const passRate = gatePasses + gateFails > 0
      ? Math.round((gatePasses / (gatePasses + gateFails)) * 100)
      : null;

    return {
      sessionId,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      tokensByModel,
      iterations,
      gatePasses,
      gateFails,
      passRate,
      scopeDone,
      scopeTotal,
      activeAgents,
    };
  }

  /** Subscribe to new events (returns unsubscribe fn) */
  subscribe(listener: (event: TelemetryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Clear all events for a session */
  clear(sessionId: string): void {
    this.events.delete(sessionId);
  }

  /** Get all known session IDs */
  sessions(): string[] {
    return [...this.events.keys()];
  }
}

export interface SessionMetrics {
  sessionId: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  tokensByModel: Record<string, { input: number; output: number }>;
  iterations: number;
  gatePasses: number;
  gateFails: number;
  passRate: number | null;
  scopeDone: number;
  scopeTotal: number;
  activeAgents: number;
}

// Singleton store
export const telemetryStore = new TelemetryStore();

// ============================================================
// Event Factory
// ============================================================

let eventCounter = 0;

export function createEvent(
  type: TelemetryEventType,
  sessionId: string,
  payload: Record<string, unknown>,
  missionId?: string,
  graph?: GraphExecutionMetadata,
): TelemetryEvent {
  if (type.startsWith('graph.') && !graph) {
    throw new Error(`Telemetry event '${type}' requires graph execution metadata.`);
  }
  return {
    id: `evt-${Date.now()}-${++eventCounter}`,
    sessionId,
    missionId,
    timestamp: new Date().toISOString(),
    type,
    payload,
    ...(graph ? { graph: structuredClone(graph) } : {}),
  };
}
