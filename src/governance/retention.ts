import { createHash, randomUUID } from 'node:crypto';
import type { PublicationSink } from './classification.js';

export type EvidenceTier = 'raw' | 'durable';
export type LifecycleAction = 'retain' | 'summarize' | 'redact-fields' | 'archive' | 'delete';
export type EvidenceCategory =
  | 'raw-audit'
  | 'identity-audit'
  | 'network-inventory'
  | 'dr-evidence'
  | 'sanitized-summary'
  | 'generic'
  | string;

export interface RetentionRule {
  id: string;
  version: string;
  category?: string;
  classification?: string;
  sink?: string;
  tier?: EvidenceTier;
  duration?: string | null;
  action: LifecycleAction;
  redactFields?: string[];
  archiveSink?: string;
  priority?: number;
}

export interface EvidenceHold {
  id: string;
  actor: string;
  reasonDigest: string;
  placedAt: string;
  releasedAt?: string;
  releasedBy?: string;
  releaseReasonDigest?: string;
}

export interface EvidenceLifecycleMetadata {
  schemaVersion: 'ops-evidence-lifecycle.aiwg.io/v1';
  artifactId: string;
  category: string;
  classification: string;
  sinkId: string;
  tier: EvidenceTier;
  createdAt: string;
  policyId: string;
  policyVersion: string;
  dispositionDeadline: string | null;
  action: LifecycleAction;
  dispositionFields?: string[];
  archiveSink?: string;
  rawCaptureReasonDigest?: string;
  holds: EvidenceHold[];
}

export interface EvidenceRecord<T = unknown> {
  metadata: EvidenceLifecycleMetadata;
  payload: T;
}

export interface DispositionReceipt {
  schemaVersion: 'ops-disposition-receipt.aiwg.io/v1';
  receiptId: string;
  artifactId: string;
  policyId: string;
  policyVersion: string;
  action: LifecycleAction;
  outcome: 'completed' | 'failed' | 'held' | 'not-due';
  occurredAt: string;
  destinationId?: string;
  errorCode?: string;
}

export interface HoldAuditRecord {
  schemaVersion: 'ops-evidence-hold.aiwg.io/v1';
  eventId: string;
  artifactId: string;
  holdId: string;
  action: 'placed' | 'released';
  actor: string;
  reasonDigest: string;
  occurredAt: string;
}

export interface LifecycleAdapter<T = unknown> {
  summarize?(record: EvidenceRecord<T>): Promise<void> | void;
  redactFields?(record: EvidenceRecord<T>, fields: readonly string[]): Promise<void> | void;
  archive?(record: EvidenceRecord<T>, destinationId: string): Promise<void> | void;
  delete?(record: EvidenceRecord<T>): Promise<void> | void;
}

export const DEFAULT_RETENTION_RULES: readonly RetentionRule[] = [
  { id: 'raw-audit-short-lived', version: '1', category: 'raw-audit', tier: 'raw', duration: 'P7D', action: 'delete' },
  { id: 'identity-audit-durable', version: '1', category: 'identity-audit', tier: 'durable', duration: 'P30D', action: 'summarize' },
  { id: 'network-inventory-durable', version: '1', category: 'network-inventory', tier: 'durable', duration: 'P30D', action: 'archive', archiveSink: 'encrypted-artifact-store' },
  { id: 'dr-evidence-durable', version: '1', category: 'dr-evidence', tier: 'durable', duration: 'P90D', action: 'archive', archiveSink: 'encrypted-artifact-store' },
  { id: 'sanitized-summary-durable', version: '1', category: 'sanitized-summary', tier: 'durable', duration: 'P365D', action: 'summarize' },
  { id: 'generic-durable', version: '1', category: 'generic', tier: 'durable', duration: 'P90D', action: 'summarize' },
];

function digest(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function parseDuration(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value);
  if (!match || !match.slice(1).some(Boolean)) throw new Error(`unsupported retention duration '${value}'`);
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  const milliseconds = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1_000;
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 1) throw new Error(`invalid retention duration '${value}'`);
  return milliseconds;
}

export function validateRetentionRules(rules: readonly RetentionRule[]): void {
  const ids = new Set<string>();
  const actions = new Set<LifecycleAction>(['retain', 'summarize', 'redact-fields', 'archive', 'delete']);
  for (const rule of rules) {
    if (!/^[a-z0-9][a-z0-9.-]{0,127}$/.test(rule.id)) throw new Error('retention rule IDs must be lowercase stable identifiers');
    if (ids.has(rule.id)) throw new Error(`duplicate retention rule '${rule.id}'`);
    ids.add(rule.id);
    if (!rule.version.trim()) throw new Error(`retention rule '${rule.id}' requires a version`);
    if (!actions.has(rule.action)) throw new Error(`retention rule '${rule.id}' has an unsupported action`);
    if (rule.tier !== undefined && rule.tier !== 'raw' && rule.tier !== 'durable') {
      throw new Error(`retention rule '${rule.id}' has an unsupported tier`);
    }
    if (rule.priority !== undefined && !Number.isSafeInteger(rule.priority)) {
      throw new Error(`retention rule '${rule.id}' priority must be a safe integer`);
    }
    for (const [name, value] of Object.entries({ category: rule.category, classification: rule.classification, sink: rule.sink })) {
      if (value !== undefined && (typeof value !== 'string' || value.length === 0)) {
        throw new Error(`retention rule '${rule.id}' ${name} must be a non-empty string`);
      }
    }
    parseDuration(rule.duration);
    if (rule.action === 'redact-fields' && (!rule.redactFields || rule.redactFields.length === 0)) {
      throw new Error(`retention rule '${rule.id}' requires redactFields`);
    }
    if (rule.action === 'archive' && !rule.archiveSink) {
      throw new Error(`retention rule '${rule.id}' requires archiveSink`);
    }
    if (rule.redactFields !== undefined && (!Array.isArray(rule.redactFields) || rule.redactFields.some((field) => typeof field !== 'string' || !field))) {
      throw new Error(`retention rule '${rule.id}' redactFields must contain non-empty strings`);
    }
  }
}

function ruleMatches(rule: RetentionRule, input: { category: string; classification: string; sinkId: string; tier: EvidenceTier }): boolean {
  return (rule.category === undefined || rule.category === input.category)
    && (rule.classification === undefined || rule.classification === input.classification)
    && (rule.sink === undefined || rule.sink === input.sinkId)
    && (rule.tier === undefined || rule.tier === input.tier);
}

function specificity(rule: RetentionRule): number {
  return [rule.category, rule.classification, rule.sink, rule.tier].filter((value) => value !== undefined).length;
}

export function resolveRetentionRule(
  input: { category: string; classification: string; sinkId: string; tier: EvidenceTier },
  rules: readonly RetentionRule[] = [],
  requestedPolicyId?: string,
): RetentionRule {
  const candidates = [
    ...rules.map((rule) => ({ rule, configured: true })),
    ...DEFAULT_RETENTION_RULES.map((rule) => ({ rule, configured: false })),
  ]
    .filter(({ rule }) => (requestedPolicyId === undefined || rule.id === requestedPolicyId) && ruleMatches(rule, input))
    .sort((left, right) =>
      (right.rule.priority ?? 0) - (left.rule.priority ?? 0)
      || specificity(right.rule) - specificity(left.rule)
      || Number(right.configured) - Number(left.configured)
      || left.rule.id.localeCompare(right.rule.id));
  const selected = candidates[0]?.rule;
  if (!selected) throw new Error(`no retention rule matches ${input.category}/${input.classification}/${input.sinkId}/${input.tier}`);
  parseDuration(selected.duration);
  if (selected.action === 'redact-fields' && (!selected.redactFields || selected.redactFields.length === 0)) {
    throw new Error(`retention rule '${selected.id}' requires redactFields`);
  }
  if (selected.action === 'archive' && !selected.archiveSink) {
    // Built-in archive policies deliberately require the project to select a destination.
    if (!DEFAULT_RETENTION_RULES.some((rule) => rule.id === selected.id)) {
      throw new Error(`retention rule '${selected.id}' requires archiveSink`);
    }
  }
  return { ...selected };
}

export function createEvidenceLifecycle(input: {
  artifactId: string;
  category: string;
  classification: string;
  sink: PublicationSink;
  tier: EvidenceTier;
  rules?: readonly RetentionRule[];
  requestedPolicyId?: string;
  rawCaptureReason?: string;
  createdAt?: string;
}): EvidenceLifecycleMetadata {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) throw new Error('evidence creation time must be valid ISO-8601');
  if (input.tier === 'raw' && !input.rawCaptureReason?.trim()) {
    throw new Error('full raw evidence capture requires an explicit reason');
  }
  if (!input.sink.mutable && input.tier === 'raw') {
    throw new Error(`raw evidence cannot be published to immutable sink '${input.sink.id}'; publish a sanitized summary instead`);
  }
  const immutableSummaryRule: RetentionRule | undefined = !input.sink.mutable && input.category === 'sanitized-summary'
    ? {
        id: 'immutable-sanitized-summary', version: '1', category: 'sanitized-summary',
        sink: input.sink.id, tier: 'durable', duration: null, action: 'retain', priority: 10_000,
      }
    : undefined;
  const rule = resolveRetentionRule({
    category: input.category,
    classification: input.classification,
    sinkId: input.sink.id,
    tier: input.tier,
  }, [...(immutableSummaryRule ? [immutableSummaryRule] : []), ...(input.rules ?? [])], input.requestedPolicyId);
  const duration = parseDuration(rule.duration);
  if (!input.sink.mutable && duration !== null && rule.action !== 'retain') {
    throw new Error(`sink '${input.sink.id}' cannot satisfy finite lifecycle action '${rule.action}'`);
  }
  return {
    schemaVersion: 'ops-evidence-lifecycle.aiwg.io/v1',
    artifactId: input.artifactId.startsWith('sha256:') && /^sha256:[a-f0-9]{64}$/.test(input.artifactId)
      ? input.artifactId
      : digest(input.artifactId),
    category: input.category,
    classification: input.classification,
    sinkId: input.sink.id,
    tier: input.tier,
    createdAt,
    policyId: rule.id,
    policyVersion: rule.version,
    dispositionDeadline: duration === null ? null : new Date(created + duration).toISOString(),
    action: rule.action,
    ...(rule.redactFields ? { dispositionFields: [...rule.redactFields] } : {}),
    ...(rule.archiveSink ? { archiveSink: rule.archiveSink } : {}),
    ...(input.rawCaptureReason ? { rawCaptureReasonDigest: digest(input.rawCaptureReason) } : {}),
    holds: [],
  };
}

export function reapplyRetentionPolicy<T>(input: {
  record: EvidenceRecord<T>;
  sink: PublicationSink;
  rules: readonly RetentionRule[];
  requestedPolicyId?: string;
}): EvidenceRecord<T> {
  const metadata = createEvidenceLifecycle({
    artifactId: input.record.metadata.artifactId,
    category: input.record.metadata.category,
    classification: input.record.metadata.classification,
    sink: input.sink,
    tier: input.record.metadata.tier,
    rules: input.rules,
    requestedPolicyId: input.requestedPolicyId,
    rawCaptureReason: input.record.metadata.rawCaptureReasonDigest ? 'previously-approved-raw-capture' : undefined,
    createdAt: input.record.metadata.createdAt,
  });
  return {
    payload: input.record.payload,
    metadata: {
      ...metadata,
      ...(input.record.metadata.rawCaptureReasonDigest
        ? { rawCaptureReasonDigest: input.record.metadata.rawCaptureReasonDigest }
        : {}),
      holds: [...input.record.metadata.holds],
    },
  };
}

export function placeEvidenceHold<T>(input: {
  record: EvidenceRecord<T>;
  holdId: string;
  actor: string;
  reason: string;
  now?: Date;
}): { record: EvidenceRecord<T>; audit: HoldAuditRecord } {
  if (!input.holdId || !input.actor || !input.reason.trim()) throw new Error('hold ID, actor, and reason are required');
  if (input.record.metadata.holds.some((hold) => hold.id === input.holdId && !hold.releasedAt)) {
    throw new Error(`hold '${input.holdId}' is already active`);
  }
  const occurredAt = (input.now ?? new Date()).toISOString();
  const reasonDigest = digest(input.reason);
  const hold: EvidenceHold = { id: input.holdId, actor: input.actor, reasonDigest, placedAt: occurredAt };
  return {
    record: {
      payload: input.record.payload,
      metadata: { ...input.record.metadata, holds: [...input.record.metadata.holds, hold] },
    },
    audit: {
      schemaVersion: 'ops-evidence-hold.aiwg.io/v1', eventId: randomUUID(),
      artifactId: input.record.metadata.artifactId, holdId: input.holdId,
      action: 'placed', actor: input.actor, reasonDigest, occurredAt,
    },
  };
}

export function releaseEvidenceHold<T>(input: {
  record: EvidenceRecord<T>;
  holdId: string;
  actor: string;
  reason: string;
  now?: Date;
}): { record: EvidenceRecord<T>; audit: HoldAuditRecord } {
  if (!input.actor || !input.reason.trim()) throw new Error('release actor and reason are required');
  const occurredAt = (input.now ?? new Date()).toISOString();
  const reasonDigest = digest(input.reason);
  let released = false;
  const holds = input.record.metadata.holds.map((hold) => {
    if (hold.id !== input.holdId || hold.releasedAt) return hold;
    released = true;
    return { ...hold, releasedAt: occurredAt, releasedBy: input.actor, releaseReasonDigest: reasonDigest };
  });
  if (!released) throw new Error(`active hold '${input.holdId}' was not found`);
  return {
    record: { payload: input.record.payload, metadata: { ...input.record.metadata, holds } },
    audit: {
      schemaVersion: 'ops-evidence-hold.aiwg.io/v1', eventId: randomUUID(),
      artifactId: input.record.metadata.artifactId, holdId: input.holdId,
      action: 'released', actor: input.actor, reasonDigest, occurredAt,
    },
  };
}

function receipt(record: EvidenceRecord, action: LifecycleAction, outcome: DispositionReceipt['outcome'], occurredAt: string, extras: Pick<DispositionReceipt, 'destinationId' | 'errorCode'> = {}): DispositionReceipt {
  return {
    schemaVersion: 'ops-disposition-receipt.aiwg.io/v1',
    receiptId: randomUUID(),
    artifactId: record.metadata.artifactId,
    policyId: record.metadata.policyId,
    policyVersion: record.metadata.policyVersion,
    action,
    outcome,
    occurredAt,
    ...(extras.destinationId ? { destinationId: extras.destinationId } : {}),
    ...(extras.errorCode ? { errorCode: extras.errorCode } : {}),
  };
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^[A-Z0-9_-]{1,64}$/.test(error.code)) {
    return error.code;
  }
  return 'LIFECYCLE_ACTION_FAILED';
}

/** Execute a due lifecycle action. Receipts contain identifiers/outcomes only, never removed payloads or error messages. */
export async function executeLifecycle<T>(
  record: EvidenceRecord<T>,
  adapter: LifecycleAdapter<T>,
  now = new Date(),
): Promise<DispositionReceipt> {
  const occurredAt = now.toISOString();
  if (record.metadata.holds.some((hold) => !hold.releasedAt)) {
    return receipt(record, record.metadata.action, 'held', occurredAt);
  }
  if (record.metadata.dispositionDeadline === null || Date.parse(record.metadata.dispositionDeadline) > now.getTime()) {
    return receipt(record, record.metadata.action, 'not-due', occurredAt);
  }
  const action = record.metadata.action;
  try {
    switch (action) {
      case 'retain': break;
      case 'summarize':
        if (!adapter.summarize) throw Object.assign(new Error('summarize adapter is unavailable'), { code: 'SUMMARIZE_UNAVAILABLE' });
        await adapter.summarize(record);
        break;
      case 'redact-fields':
        if (!adapter.redactFields) throw Object.assign(new Error('redact-fields adapter is unavailable'), { code: 'REDACT_FIELDS_UNAVAILABLE' });
        await adapter.redactFields(record, record.metadata.dispositionFields ?? []);
        break;
      case 'archive': {
        if (!adapter.archive) throw Object.assign(new Error('archive adapter is unavailable'), { code: 'ARCHIVE_UNAVAILABLE' });
        const destination = record.metadata.archiveSink ?? 'project-configured-archive';
        await adapter.archive(record, destination);
        return receipt(record, action, 'completed', occurredAt, { destinationId: destination });
      }
      case 'delete':
        if (!adapter.delete) throw Object.assign(new Error('delete adapter is unavailable'), { code: 'DELETE_UNAVAILABLE' });
        await adapter.delete(record);
        break;
    }
    return receipt(record, action, 'completed', occurredAt);
  } catch (error) {
    return receipt(record, action, 'failed', occurredAt, { errorCode: errorCode(error) });
  }
}
