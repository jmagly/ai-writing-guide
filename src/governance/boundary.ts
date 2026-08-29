import { createHash, randomUUID } from 'node:crypto';
import {
  createSanitizedSummary,
  evaluatePublicationGate,
  resolveArtifactGovernance,
  resolveClassificationDefinitions,
  type ArtifactGovernanceMetadata,
  type ClassificationPolicy,
  type PublicationApproval,
  type PublicationAuditRecord,
  type PublicationSink,
  type ResolvedArtifactGovernance,
} from './classification.js';
import {
  createEvidenceLifecycle,
  validateRetentionRules,
  type EvidenceCategory,
  type EvidenceLifecycleMetadata,
  type EvidenceTier,
  type RetentionRule,
} from './retention.js';
import {
  redactStructured,
  redactText,
  type RedactionFinding,
  type RedactionOptions,
} from './redaction.js';

export interface GovernancePolicy {
  redaction?: RedactionOptions;
  classification?: ClassificationPolicy;
  retention?: readonly RetentionRule[];
  sinks?: Record<string, PublicationSink>;
}

export const DEFAULT_PUBLICATION_SINKS: Readonly<Record<string, PublicationSink>> = {
  'local-ephemeral': {
    id: 'local-ephemeral', visibility: 'restricted', external: false,
    persistent: false, mutable: true, maxClassification: 'restricted-identity',
  },
  'private-repository': {
    id: 'private-repository', visibility: 'private', external: false,
    persistent: true, mutable: true, maxClassification: 'restricted-infrastructure',
  },
  'public-repository': {
    id: 'public-repository', visibility: 'public', external: true,
    persistent: true, mutable: true, maxClassification: 'public', acceptsSanitizedSummary: true,
  },
  'private-issue': {
    id: 'private-issue', visibility: 'private', external: true,
    persistent: true, mutable: false, maxClassification: 'confidential', acceptsSanitizedSummary: true,
  },
  'public-issue': {
    id: 'public-issue', visibility: 'public', external: true,
    persistent: true, mutable: false, maxClassification: 'public', acceptsSanitizedSummary: true,
  },
  'encrypted-artifact-store': {
    id: 'encrypted-artifact-store', visibility: 'restricted', external: false,
    persistent: true, mutable: true, maxClassification: 'restricted-identity',
  },
};

export function resolveGovernancePolicy(policy: GovernancePolicy = {}): GovernancePolicy {
  const resolved: GovernancePolicy = {
    ...policy,
    sinks: { ...DEFAULT_PUBLICATION_SINKS, ...(policy.sinks ?? {}) },
  };
  const classes = resolveClassificationDefinitions(resolved.classification);
  const classificationReferences = [
    resolved.classification?.defaultClassification,
    ...Object.values(resolved.classification?.defaultsByKind ?? {}),
    ...Object.values(resolved.classification?.defaultsByCategory ?? {}),
  ].filter((value): value is string => value !== undefined);
  for (const value of classificationReferences) {
    if (!classes[value]) throw new Error(`governance policy references unknown classification '${value}'`);
  }
  for (const [id, sink] of Object.entries(resolved.sinks ?? {})) {
    if (!sink || typeof sink !== 'object') throw new Error(`sink '${id}' must be an object`);
    if (sink.id !== id) throw new Error(`sink map key '${id}' does not match sink ID '${sink.id}'`);
    if (!new Set(['public', 'private', 'restricted', 'unknown']).has(sink.visibility)) {
      throw new Error(`sink '${id}' has invalid visibility`);
    }
    for (const property of ['external', 'persistent', 'mutable'] as const) {
      if (typeof sink[property] !== 'boolean') throw new Error(`sink '${id}' requires boolean ${property}`);
    }
    for (const property of ['acceptsSanitizedSummary', 'allowRedactionOverride'] as const) {
      if (sink[property] !== undefined && typeof sink[property] !== 'boolean') {
        throw new Error(`sink '${id}' requires boolean ${property}`);
      }
    }
    if (sink.maxClassification && !classes[sink.maxClassification]) {
      throw new Error(`sink '${id}' references unknown classification '${sink.maxClassification}'`);
    }
  }
  validateRetentionRules(resolved.retention ?? []);
  // Compile configured patterns up front. Empty input cannot create findings,
  // but invalid or high-risk organization patterns still fail validation.
  redactText('', resolved.redaction ?? {});
  redactStructured({ validation: 'ok' }, resolved.redaction ?? {});
  return resolved;
}

export interface GovernedArtifact<T = unknown> {
  id: string;
  kind: string;
  category: EvidenceCategory;
  payload: T;
  governance?: ArtifactGovernanceMetadata;
  parentGovernance?: ArtifactGovernanceMetadata;
  tier?: EvidenceTier;
  rawCaptureReason?: string;
  status?: string;
}

export interface RedactionOverride {
  id: string;
  actor: string;
  reason: string;
  artifactId: string;
  sinkId: string;
  approvedAt: string;
  expiresAt?: string;
}

export interface BoundaryAuditRecord {
  schemaVersion: 'ops-evidence-boundary.aiwg.io/v1';
  eventId: string;
  occurredAt: string;
  artifactId: string;
  artifactKind: string;
  sinkId: string;
  decision: 'allow' | 'deny' | 'summary' | 'override';
  reasonCodes: string[];
  redaction: 'completed' | 'not-needed' | 'failed' | 'override';
  redactionCount: number;
  redactionClasses: string[];
  redactionOverrideId?: string;
  redactionOverrideActor?: string;
  redactionOverrideReasonDigest?: string;
  publication?: PublicationAuditRecord;
  retentionPolicyId?: string;
  dispositionDeadline?: string | null;
}

export interface PreparedEvidence<T = unknown> {
  payload: T;
  governance: ArtifactGovernanceMetadata & {
    classification: string;
    handling: { allowedSinks: string[]; crossRepo: 'allow' | 'approval-required' | 'deny'; retentionPolicy: string };
  };
  lifecycle: EvidenceLifecycleMetadata;
  summary: boolean;
}

export interface BoundaryResult<T = unknown> {
  allowed: boolean;
  prepared?: PreparedEvidence<T | Record<string, unknown>>;
  audit: BoundaryAuditRecord;
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function safeAuditLabel(value: string): string {
  try {
    if (/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value) && redactText(value).sensitivity === 'none') return value;
  } catch {
    // Hashing is the fail-closed representation for malformed labels.
  }
  return sha256(value);
}

function stableStatus(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');
  return new Set([
    'ok', 'pass', 'passed', 'fail', 'failed', 'complete', 'completed', 'blocked',
    'partial', 'unknown', 'in-progress', 'review-needed', 'success', 'error',
  ]).has(normalized) ? normalized : undefined;
}

function contentDigest(value: unknown): string {
  if (typeof value === 'string') return sha256(value);
  try {
    return sha256(JSON.stringify(value) ?? '[undefined]');
  } catch {
    return sha256('[unserializable]');
  }
}

function boundedExcerpt(value: unknown, maxBytes: number): { excerpt: string; bytes: number; digest: string; truncated: boolean } | undefined {
  if (typeof value !== 'string') return undefined;
  const source = Buffer.from(value);
  return {
    excerpt: source.subarray(0, maxBytes).toString('utf8'),
    bytes: source.length,
    digest: sha256(value),
    truncated: source.length > maxBytes,
  };
}

/** Reduce command evidence to outcomes, bounded excerpts, counts, and correlation digests by default. */
export function minimizeEvidence(payload: unknown, maxExcerptBytes = 512): unknown {
  if (!Number.isSafeInteger(maxExcerptBytes) || maxExcerptBytes < 0 || maxExcerptBytes > 64 * 1024) {
    throw new Error('maxExcerptBytes must be an integer from 0 through 65536');
  }
  if (typeof payload === 'string') {
    return boundedExcerpt(payload, maxExcerptBytes);
  }
  if (Array.isArray(payload)) {
    return { itemCount: payload.length, digest: contentDigest(payload) };
  }
  if (!payload || typeof payload !== 'object') return payload;
  const source = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    schemaVersion: 'ops-minimum-evidence.aiwg.io/v1',
    sourceFieldCount: Object.keys(source).length,
    sourceDigest: contentDigest(source),
  };
  for (const key of ['status', 'outcome', 'success', 'exitCode', 'durationMs', 'startedAt', 'completedAt']) {
    const value = source[key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') result[key] = value;
  }
  const stdout = boundedExcerpt(source.stdout ?? source.output, maxExcerptBytes);
  const stderr = boundedExcerpt(source.stderr, maxExcerptBytes);
  if (stdout) result.stdout = stdout;
  if (stderr) result.stderr = stderr;
  if (source.command !== undefined) result.commandDigest = contentDigest(source.command);
  return result;
}

function validOverride(override: RedactionOverride | undefined, artifactId: string, sinkId: string, now: number): override is RedactionOverride {
  if (!override?.id || !override.actor || !override.reason.trim()) return false;
  if (override.artifactId !== artifactId || override.sinkId !== sinkId) return false;
  const approvedAt = Date.parse(override.approvedAt);
  if (!Number.isFinite(approvedAt) || approvedAt > now) return false;
  if (override.expiresAt !== undefined) {
    const expiresAt = Date.parse(override.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now || expiresAt <= approvedAt) return false;
  }
  return true;
}

function emptyAudit(input: GovernedArtifact, sinkId: string, now: Date): BoundaryAuditRecord {
  return {
    schemaVersion: 'ops-evidence-boundary.aiwg.io/v1',
    eventId: randomUUID(),
    occurredAt: now.toISOString(),
    artifactId: sha256(input.id),
    artifactKind: safeAuditLabel(input.kind),
    sinkId: safeAuditLabel(sinkId),
    decision: 'deny',
    reasonCodes: [],
    redaction: 'not-needed',
    redactionCount: 0,
    redactionClasses: [],
  };
}

function sanitizePayload<T>(payload: T, options: RedactionOptions): { value: T; findings: RedactionFinding[] } {
  if (typeof payload === 'string') {
    const result = redactText(payload, options);
    return { value: result.text as T, findings: result.findings };
  }
  const result = redactStructured(payload, options);
  return { value: result.value, findings: result.findings };
}

/**
 * Mandatory sink boundary: minimize, redact, classify/gate, and attach lifecycle
 * metadata before returning any publishable value. Failure returns no payload.
 */
export function prepareEvidenceForSink<T>(input: {
  artifact: GovernedArtifact<T>;
  sinkId: string;
  sourceRepository?: string;
  policy?: GovernancePolicy;
  publicationApproval?: PublicationApproval;
  redactionOverride?: RedactionOverride;
  now?: Date;
  maxExcerptBytes?: number;
}): BoundaryResult<T> {
  const now = input.now ?? new Date();
  const audit = emptyAudit(input.artifact, input.sinkId, now);
  let policy: GovernancePolicy;
  try {
    policy = resolveGovernancePolicy(input.policy);
  } catch {
    audit.reasonCodes = ['invalid-governance-policy'];
    return { allowed: false, audit };
  }
  const sink = policy.sinks?.[input.sinkId];
  if (!sink) {
    audit.reasonCodes = ['unknown-sink'];
    audit.redaction = 'failed';
    return { allowed: false, audit };
  }

  let governance: ResolvedArtifactGovernance;
  try {
    governance = resolveArtifactGovernance({
      kind: input.artifact.kind,
      category: input.artifact.category,
      metadata: input.artifact.governance,
      parent: input.artifact.parentGovernance,
      policy: policy.classification,
    });
  } catch {
    audit.reasonCodes = ['invalid-classification-metadata'];
    return { allowed: false, audit };
  }

  const tier = input.artifact.tier ?? 'durable';
  let candidate: unknown;
  try {
    candidate = tier === 'raw' || input.artifact.category === 'sanitized-summary'
      ? input.artifact.payload
      : minimizeEvidence(input.artifact.payload, input.maxExcerptBytes);
  } catch {
    audit.reasonCodes = ['minimization-failed'];
    return { allowed: false, audit };
  }

  let findings: RedactionFinding[] = [];
  try {
    const sanitized = sanitizePayload(candidate, policy.redaction ?? {});
    candidate = sanitized.value;
    findings = sanitized.findings;
    audit.redaction = findings.length ? 'completed' : 'not-needed';
    audit.redactionCount = findings.length;
    audit.redactionClasses = [...new Set(findings.map((finding) => finding.class))].sort();
  } catch {
    const override = input.redactionOverride;
    if (!sink.allowRedactionOverride || !validOverride(override, input.artifact.id, sink.id, now.getTime())) {
      audit.redaction = 'failed';
      audit.reasonCodes = ['sanitization-failed'];
      return { allowed: false, audit };
    }
    audit.redaction = 'override';
    audit.decision = 'override';
    audit.redactionOverrideId = override.id;
    audit.redactionOverrideActor = override.actor;
    audit.redactionOverrideReasonDigest = sha256(override.reason);
  }

  const gate = evaluatePublicationGate({
    artifactId: input.artifact.id,
    artifactKind: input.artifact.kind,
    governance,
    sink,
    sourceRepository: input.sourceRepository,
    approval: input.publicationApproval,
    classes: resolveClassificationDefinitions(policy.classification),
    now,
  });
  audit.publication = gate.audit;
  audit.reasonCodes = gate.reasonCodes;

  let summary = false;
  const immutableSinkRequiresSummary = !sink.mutable && input.artifact.category !== 'sanitized-summary';
  if (!gate.allowed || immutableSinkRequiresSummary) {
    if (!gate.allowed && gate.decision !== 'summarize') {
      audit.decision = 'deny';
      return { allowed: false, audit };
    }
    candidate = createSanitizedSummary({
      artifactId: input.artifact.id,
      artifactKind: input.artifact.kind,
      status: stableStatus(input.artifact.status),
      omittedFields: candidate && typeof candidate === 'object' ? Object.keys(candidate).length : 1,
      redactionClasses: audit.redactionClasses,
    });
    governance = resolveArtifactGovernance({
      kind: 'SanitizedSummary',
      category: 'sanitized-summary',
      metadata: { classification: 'public', owner: governance.owner, handling: { allowedSinks: [sink.id], crossRepo: 'allow' } },
      policy: policy.classification,
    });
    const summaryGate = evaluatePublicationGate({
      artifactId: input.artifact.id,
      artifactKind: 'SanitizedSummary',
      governance,
      sink,
      sourceRepository: input.sourceRepository,
      classes: resolveClassificationDefinitions(policy.classification),
      now,
    });
    audit.publication = summaryGate.audit;
    if (!summaryGate.allowed) {
      audit.decision = 'deny';
      audit.reasonCodes = ['sanitized-summary-denied', ...summaryGate.reasonCodes];
      return { allowed: false, audit };
    }
    summary = true;
  }

  let lifecycle: EvidenceLifecycleMetadata;
  try {
    lifecycle = createEvidenceLifecycle({
      artifactId: input.artifact.id,
      category: summary ? 'sanitized-summary' : input.artifact.category,
      classification: governance.classification,
      sink,
      tier: summary ? 'durable' : tier,
      rules: policy.retention,
      requestedPolicyId: governance.handling.retentionPolicy,
      rawCaptureReason: input.artifact.rawCaptureReason,
      createdAt: now.toISOString(),
    });
  } catch {
    audit.decision = 'deny';
    audit.reasonCodes = ['retention-policy-unsatisfied'];
    return { allowed: false, audit };
  }
  audit.retentionPolicyId = lifecycle.policyId;
  audit.dispositionDeadline = lifecycle.dispositionDeadline;
  audit.decision = summary ? 'summary' : gate.decision === 'override' || audit.redaction === 'override' ? 'override' : 'allow';
  return {
    allowed: true,
    prepared: {
      payload: candidate as T,
      governance: {
        classification: governance.classification,
        ...(governance.owner ? { owner: governance.owner } : {}),
        handling: {
          allowedSinks: governance.handling.allowedSinks ?? [sink.id],
          crossRepo: governance.handling.crossRepo ?? 'approval-required',
          retentionPolicy: lifecycle.policyId,
        },
      },
      lifecycle,
      summary,
    },
    audit,
  };
}

/** Call a sink writer only after the boundary returns publishable evidence. */
export async function publishEvidence<T>(input: {
  artifact: GovernedArtifact<T>;
  sinkId: string;
  sourceRepository?: string;
  policy?: GovernancePolicy;
  publicationApproval?: PublicationApproval;
  redactionOverride?: RedactionOverride;
  now?: Date;
  writer: (prepared: PreparedEvidence<T | Record<string, unknown>>) => Promise<void> | void;
}): Promise<BoundaryResult<T>> {
  const result = prepareEvidenceForSink(input);
  if (result.allowed && result.prepared) await input.writer(result.prepared);
  return result;
}
