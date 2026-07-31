import { z } from 'zod';
import type { Session, SessionEvent } from './contracts.js';
import { sha256 } from './contracts.js';

export const SESSION_ANALYTICS_VERSION = '1.0.0' as const;

export const SessionAnalyticsCategorySchema = z.enum([
  'tool-call',
  'tool-result',
  'escalation',
  'hitl',
  'boundary',
  'indicator',
]);

export const SessionAnalyticsStatusSchema = z.enum([
  'requested',
  'running',
  'succeeded',
  'failed',
  'granted',
  'denied',
  'timed-out',
  'unsupported',
  'provider-unknown',
  'observed',
]);

export const SessionAnalyticsFactSchema = z.object({
  analyticsVersion: z.literal(SESSION_ANALYTICS_VERSION),
  factId: z.string().min(1),
  category: SessionAnalyticsCategorySchema,
  status: SessionAnalyticsStatusSchema,
  provider: z.string().min(1),
  workspaceId: z.string().min(1),
  sessionId: z.string().min(1),
  eventId: z.string().min(1),
  sourceId: z.string().min(1),
  importRunId: z.string().min(1),
  occurredAt: z.string().datetime({ offset: true }).nullable(),
  sequence: z.number().int().nonnegative(),
  actor: z.string().min(1).nullable(),
  participant: z.string().min(1).nullable(),
  toolName: z.string().min(1).nullable(),
  toolCallId: z.string().min(1).nullable(),
  retryGroupId: z.string().min(1).nullable(),
  retryOrdinal: z.number().int().positive().nullable(),
  errorClass: z.string().min(1).nullable(),
  capability: z.string().min(1).nullable(),
  decision: z.string().min(1).nullable(),
  promptType: z.string().min(1).nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  transition: z.string().min(1).nullable(),
  indicator: z.string().min(1).nullable(),
  sensitivity: z.enum(['none', 'sensitive']),
  extractionState: z.string().min(1).nullable(),
  sourceCitation: z.object({
    provider: z.string().min(1),
    sessionId: z.string().min(1),
    eventId: z.string().min(1),
    importRunId: z.string().min(1),
    sourceId: z.string().min(1),
    locatorClass: z.string().min(1),
    sequence: z.number().int().nonnegative(),
  }).strict(),
}).strict();

export type SessionAnalyticsCategory = z.infer<typeof SessionAnalyticsCategorySchema>;
export type SessionAnalyticsStatus = z.infer<typeof SessionAnalyticsStatusSchema>;
export type SessionAnalyticsFact = z.infer<typeof SessionAnalyticsFactSchema>;

interface MutableFact extends Omit<SessionAnalyticsFact, 'factId'> {
  factId?: string;
}

/**
 * Derive content-free analytics facts from normalized session events.
 *
 * Historical text is deliberately excluded. Classification uses the canonical
 * event shape and already-sanitized native extension metadata only; commands,
 * URLs, and provider payloads are never executed or copied into the index.
 */
export function deriveSessionAnalytics(
  session: Session,
  events: readonly SessionEvent[],
): SessionAnalyticsFact[] {
  const ordered = [...events].sort((left, right) =>
    left.sequence - right.sequence || left.eventId.localeCompare(right.eventId));
  const facts: MutableFact[] = [];
  const retries = new Map<string, { groupId: string; count: number; lastSequence: number }>();
  const calls = new Map<string, { occurredAt: string | null; sequence: number }>();

  for (const event of ordered) {
    const metadata = flattenMetadata(event.extensions);
    const normalizedKind = event.kind.toLowerCase();
    const status = classifyStatus(normalizedKind, metadata);
    const common = baseFact(session, event);

    if (isToolCall(event, normalizedKind)) {
      const retryKey = `${event.toolName ?? 'unknown'}\0${metadata.input_hash ?? metadata.arguments_digest ?? ''}`;
      const prior = retries.get(retryKey);
      const sameGroup = prior && event.sequence - prior.lastSequence <= 4;
      const retry = sameGroup
        ? { ...prior, count: prior.count + 1, lastSequence: event.sequence }
        : {
            groupId: sha256(['session-tool-retry', session.sessionId, retryKey, event.sequence].join('\0')),
            count: 1,
            lastSequence: event.sequence,
          };
      retries.set(retryKey, retry);
      if (event.toolCallId) {
        calls.set(event.toolCallId, { occurredAt: event.occurredAt, sequence: event.sequence });
      }
      facts.push({
        ...common,
        category: 'tool-call',
        status: status === 'failed' ? 'failed' : 'requested',
        retryGroupId: retry.groupId,
        retryOrdinal: retry.count,
      });
    }

    if (normalizedKind.includes('tool-result')) {
      const call = event.toolCallId ? calls.get(event.toolCallId) : undefined;
      facts.push({
        ...common,
        category: 'tool-result',
        status: status === 'failed' ? 'failed' : 'succeeded',
        latencyMs: elapsedMs(call?.occurredAt, event.occurredAt),
        errorClass: status === 'failed'
          ? (metadata.error_class ?? metadata.error_code ?? 'provider-error')
          : null,
      });
    }

    if (isEscalation(normalizedKind, metadata)) {
      const decision = escalationDecision(status, metadata);
      facts.push({
        ...common,
        category: 'escalation',
        status: decision,
        capability: metadata.capability ?? metadata.permission ?? metadata.scope ?? 'provider-unknown',
        decision,
      });
    }

    if (isHitl(normalizedKind, metadata)) {
      facts.push({
        ...common,
        category: 'hitl',
        status,
        promptType: metadata.prompt_type ?? metadata.input_type ?? 'provider-unknown',
        transition: metadata.transition ?? metadata.task_state ?? metadata.session_state ?? null,
        latencyMs: integerMetadata(metadata.latency_ms),
      });
    }

    if (event.activityBoundary) {
      facts.push({
        ...common,
        category: 'boundary',
        status: 'observed',
        transition: event.activityBoundary,
      });
    }

    const indicators = eventIndicators(event, normalizedKind, status, metadata);
    for (const indicator of indicators) {
      facts.push({
        ...common,
        category: 'indicator',
        status: 'observed',
        indicator,
        errorClass: status === 'failed'
          ? (metadata.error_class ?? metadata.error_code ?? 'provider-error')
          : null,
      });
    }
  }

  for (const retry of retries.values()) {
    if (retry.count < 3) continue;
    const anchor = facts.find((fact) => fact.retryGroupId === retry.groupId);
    if (!anchor) continue;
    facts.push({
      ...anchor,
      category: 'indicator',
      status: 'observed',
      indicator: 'tool-quota-pressure',
      factId: undefined,
    });
  }

  return facts.map((fact) => SessionAnalyticsFactSchema.parse({
    ...fact,
    factId: sha256([
      'session-analytics',
      SESSION_ANALYTICS_VERSION,
      fact.category,
      fact.eventId,
      fact.indicator ?? '',
    ].join('\0')),
  }));
}

function baseFact(session: Session, event: SessionEvent): MutableFact {
  return {
    analyticsVersion: SESSION_ANALYTICS_VERSION,
    category: 'indicator',
    status: 'observed',
    provider: session.provider,
    workspaceId: session.workspaceId,
    sessionId: session.sessionId,
    eventId: event.eventId,
    sourceId: event.sourceId,
    importRunId: event.importRunId,
    occurredAt: event.occurredAt,
    sequence: event.sequence,
    actor: event.role,
    participant: event.participant,
    toolName: event.toolName,
    toolCallId: event.toolCallId,
    retryGroupId: null,
    retryOrdinal: null,
    errorClass: null,
    capability: null,
    decision: null,
    promptType: null,
    latencyMs: null,
    transition: null,
    indicator: null,
    sensitivity: event.sensitivity.classification,
    extractionState: event.extractionState,
    sourceCitation: {
      provider: session.provider,
      sessionId: session.sessionId,
      eventId: event.eventId,
      importRunId: event.importRunId,
      sourceId: event.sourceId,
      locatorClass: event.rawReference.locatorClass,
      sequence: event.sequence,
    },
  };
}

function flattenMetadata(value: unknown): Record<string, string> {
  const output: Record<string, string> = {};
  const visit = (input: unknown, depth: number): void => {
    if (depth > 3 || !input || typeof input !== 'object' || Array.isArray(input)) return;
    for (const [key, child] of Object.entries(input as Record<string, unknown>)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      if (typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') {
        if (!(normalized in output)) output[normalized] = String(child).slice(0, 160);
      } else {
        visit(child, depth + 1);
      }
    }
  };
  visit(value, 0);
  return output;
}

function classifyStatus(kind: string, metadata: Record<string, string>): SessionAnalyticsStatus {
  const value = `${kind} ${metadata.status ?? ''} ${metadata.decision ?? ''}`.toLowerCase();
  if (/(timeout|timed.out)/.test(value)) return 'timed-out';
  if (/(unsupported|unavailable)/.test(value)) return 'unsupported';
  if (/(deny|denied|reject|rejected)/.test(value)) return 'denied';
  if (/(grant|granted|approve|approved|allow|allowed)/.test(value)) return 'granted';
  if (/(fail|failed|error|errored)/.test(value)) return 'failed';
  if (/(success|succeeded|complete|completed)/.test(value)) return 'succeeded';
  if (/(request|requested|input.required|prompt)/.test(value)) return 'requested';
  if (/(running|started|pending)/.test(value)) return 'running';
  return 'provider-unknown';
}

function isToolCall(event: SessionEvent, kind: string): boolean {
  return kind.includes('tool-call') || kind.includes('tool_use')
    || Boolean(event.toolName && !kind.includes('tool-result'));
}

function isEscalation(kind: string, metadata: Record<string, string>): boolean {
  return /(escalat|permission|approval|sandbox|capability.required)/.test(kind)
    || ['permission', 'capability', 'approval', 'scope'].some((key) => key in metadata);
}

function isHitl(kind: string, metadata: Record<string, string>): boolean {
  return /(hitl|human|input.required|input_required|operator.prompt)/.test(kind)
    || ['prompt_type', 'input_type', 'reviewer'].some((key) => key in metadata);
}

function escalationDecision(
  status: SessionAnalyticsStatus,
  metadata: Record<string, string>,
): SessionAnalyticsStatus {
  if (['granted', 'denied', 'timed-out', 'unsupported'].includes(status)) return status;
  if (metadata.decision) return classifyStatus('', { decision: metadata.decision });
  return status === 'requested' ? 'requested' : 'provider-unknown';
}

function eventIndicators(
  event: SessionEvent,
  kind: string,
  status: SessionAnalyticsStatus,
  metadata: Record<string, string>,
): string[] {
  const indicators = new Set<string>();
  if (event.opaque || /(unknown|malformed|unsupported)/.test(kind)) {
    indicators.add('provider-schema-drift');
  }
  if (status === 'failed') indicators.add('failed-operation');
  if (event.sensitivity.classification === 'sensitive') indicators.add('sensitive-field-redaction');
  if (metadata.redaction_hit === 'true' || metadata.redacted === 'true') {
    indicators.add('sensitive-field-redaction');
  }
  return [...indicators].sort();
}

function elapsedMs(start: string | null | undefined, end: string | null): number | null {
  if (!start || !end) return null;
  const value = Date.parse(end) - Date.parse(start);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function integerMetadata(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
