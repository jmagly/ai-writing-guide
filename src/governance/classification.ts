import { createHash, randomUUID } from 'node:crypto';

export type BuiltinClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted-infrastructure'
  | 'restricted-identity';

export type SinkVisibility = 'public' | 'private' | 'restricted' | 'unknown';
export type CrossRepoHandling = 'allow' | 'approval-required' | 'deny';

export interface ClassificationDefinition {
  rank: number;
  description?: string;
}

export interface ArtifactHandling {
  allowedSinks?: string[];
  crossRepo?: CrossRepoHandling;
  retentionPolicy?: string;
}

export interface ArtifactGovernanceMetadata {
  classification?: string;
  owner?: string;
  handling?: ArtifactHandling;
}

export interface ClassificationPolicy {
  classes?: Record<string, ClassificationDefinition>;
  defaultClassification?: string;
  defaultsByKind?: Record<string, string>;
  defaultsByCategory?: Record<string, string>;
  requireExplicitForKinds?: string[];
}

export interface ResolvedArtifactGovernance {
  classification: string;
  classificationRank: number;
  classificationSource: 'artifact' | 'parent' | 'kind-default' | 'category-default' | 'policy-default';
  owner?: string;
  handling: ArtifactHandling;
}

export interface PublicationSink {
  id: string;
  visibility: SinkVisibility;
  external: boolean;
  persistent: boolean;
  mutable: boolean;
  maxClassification?: string;
  repository?: string;
  acceptsSanitizedSummary?: boolean;
  allowRedactionOverride?: boolean;
}

export interface PublicationApproval {
  id: string;
  actor: string;
  reason: string;
  artifactId: string;
  sinkId: string;
  approvedAt: string;
  expiresAt?: string;
}

export type PublicationDecision = 'allow' | 'deny' | 'summarize' | 'override';

export interface PublicationAuditRecord {
  schemaVersion: 'ops-publication-decision.aiwg.io/v1';
  eventId: string;
  occurredAt: string;
  artifactId: string;
  artifactKind: string;
  classification: string;
  sinkId: string;
  decision: PublicationDecision;
  reasonCodes: string[];
  approvalId?: string;
  approvalActor?: string;
  approvalReasonDigest?: string;
}

export interface PublicationGateResult {
  decision: PublicationDecision;
  allowed: boolean;
  reasonCodes: string[];
  audit: PublicationAuditRecord;
}

export const BUILTIN_CLASSIFICATIONS: Readonly<Record<BuiltinClassification, ClassificationDefinition>> = {
  public: { rank: 0, description: 'Approved for unrestricted disclosure.' },
  internal: { rank: 10, description: 'Routine non-public operational information.' },
  confidential: { rank: 20, description: 'Sensitive business or operational information.' },
  'restricted-infrastructure': { rank: 30, description: 'Topology, access path, recovery, or detailed infrastructure information.' },
  'restricted-identity': { rank: 40, description: 'Named-user, identity-provider, authentication, or entitlement information.' },
};

export const SECURE_KIND_DEFAULTS: Readonly<Record<string, BuiltinClassification>> = {
  ITAsset: 'restricted-infrastructure',
  ITService: 'restricted-infrastructure',
  ITNetworkState: 'restricted-infrastructure',
  OpsInventory: 'restricted-infrastructure',
  OpsPlaybook: 'internal',
  IncidentReport: 'confidential',
  IdentityAudit: 'restricted-identity',
  DREvidence: 'restricted-infrastructure',
  RawAuditEvidence: 'restricted-infrastructure',
};

export const SECURE_CATEGORY_DEFAULTS: Readonly<Record<string, BuiltinClassification>> = {
  'raw-audit': 'restricted-infrastructure',
  'identity-audit': 'restricted-identity',
  'network-inventory': 'restricted-infrastructure',
  'dr-evidence': 'restricted-infrastructure',
  'sanitized-summary': 'internal',
  generic: 'internal',
};

function stableId(value: string, label: string): void {
  if (!/^[a-z0-9][a-z0-9.-]{0,127}$/.test(value)) {
    throw new Error(`${label} must be a lowercase stable identifier`);
  }
}

export function resolveClassificationDefinitions(
  policy: ClassificationPolicy = {},
): Record<string, ClassificationDefinition> {
  const classes: Record<string, ClassificationDefinition> = { ...BUILTIN_CLASSIFICATIONS };
  for (const [id, definition] of Object.entries(policy.classes ?? {})) {
    stableId(id, 'classification');
    if (!Number.isSafeInteger(definition.rank) || definition.rank < 0 || definition.rank > 10_000) {
      throw new Error(`classification '${id}' rank must be an integer from 0 through 10000`);
    }
    const builtin = BUILTIN_CLASSIFICATIONS[id as BuiltinClassification];
    if (builtin && builtin.rank !== definition.rank) {
      throw new Error(`built-in classification '${id}' rank cannot be changed`);
    }
    classes[id] = { ...definition, ...(builtin ? { rank: builtin.rank } : {}) };
  }
  return classes;
}

function mergeHandling(parent: ArtifactHandling | undefined, child: ArtifactHandling | undefined): ArtifactHandling {
  return {
    ...(parent ?? {}),
    ...(child ?? {}),
    ...(child?.allowedSinks ? { allowedSinks: [...child.allowedSinks] } : parent?.allowedSinks ? { allowedSinks: [...parent.allowedSinks] } : {}),
  };
}

/** Resolve explicit metadata, parent inheritance, secure kind/category defaults, then the policy default. */
export function resolveArtifactGovernance(input: {
  kind: string;
  category: string;
  metadata?: ArtifactGovernanceMetadata;
  parent?: ArtifactGovernanceMetadata;
  policy?: ClassificationPolicy;
}): ResolvedArtifactGovernance {
  const policy = input.policy ?? {};
  const definitions = resolveClassificationDefinitions(policy);
  const explicitRequired = new Set(policy.requireExplicitForKinds ?? []);
  if (explicitRequired.has(input.kind) && input.metadata?.classification === undefined) {
    throw new Error(`artifact kind '${input.kind}' requires an explicit classification`);
  }

  const candidates: Array<[string | undefined, ResolvedArtifactGovernance['classificationSource']]> = [
    [input.metadata?.classification, 'artifact'],
    [input.parent?.classification, 'parent'],
    [policy.defaultsByKind?.[input.kind] ?? SECURE_KIND_DEFAULTS[input.kind], 'kind-default'],
    [policy.defaultsByCategory?.[input.category] ?? SECURE_CATEGORY_DEFAULTS[input.category], 'category-default'],
    [policy.defaultClassification ?? 'internal', 'policy-default'],
  ];
  const selected = candidates.find(([value]) => value !== undefined);
  const classification = selected?.[0];
  if (!classification || !definitions[classification]) {
    throw new Error(`unknown or missing classification '${classification ?? '<missing>'}'`);
  }
  const handling = mergeHandling(input.parent?.handling, input.metadata?.handling);
  for (const sink of handling.allowedSinks ?? []) stableId(sink, 'allowed sink');
  return {
    classification,
    classificationRank: definitions[classification].rank,
    classificationSource: selected![1],
    ...(input.metadata?.owner ?? input.parent?.owner ? { owner: input.metadata?.owner ?? input.parent?.owner } : {}),
    handling,
  };
}

function defaultSinkMaxRank(sink: PublicationSink): number | null {
  switch (sink.visibility) {
    case 'public': return BUILTIN_CLASSIFICATIONS.public.rank;
    case 'private': return BUILTIN_CLASSIFICATIONS['restricted-infrastructure'].rank;
    case 'restricted': return BUILTIN_CLASSIFICATIONS['restricted-identity'].rank;
    case 'unknown': return null;
  }
}

function approvalIsValid(approval: PublicationApproval | undefined, artifactId: string, sinkId: string, now: number): approval is PublicationApproval {
  if (!approval) return false;
  if (!approval.id || !approval.actor || !approval.reason.trim()) return false;
  if (approval.artifactId !== artifactId || approval.sinkId !== sinkId) return false;
  const approvedAt = Date.parse(approval.approvedAt);
  if (!Number.isFinite(approvedAt) || approvedAt > now) return false;
  if (approval.expiresAt !== undefined) {
    const expiresAt = Date.parse(approval.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now || expiresAt <= approvedAt) return false;
  }
  return true;
}

function reasonDigest(reason: string): string {
  return `sha256:${createHash('sha256').update(reason).digest('hex')}`;
}

function correlationDigest(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function safeArtifactKind(value: string): string {
  return /^[A-Za-z][A-Za-z0-9.-]{0,127}$/.test(value) ? value : correlationDigest(value);
}

/** Evaluate an artifact against a known sink before disclosure. Audit data never contains payload content. */
export function evaluatePublicationGate(input: {
  artifactId: string;
  artifactKind: string;
  governance: ResolvedArtifactGovernance;
  sink?: PublicationSink;
  sourceRepository?: string;
  approval?: PublicationApproval;
  classes?: Record<string, ClassificationDefinition>;
  now?: Date;
}): PublicationGateResult {
  const occurredAt = (input.now ?? new Date()).toISOString();
  const now = Date.parse(occurredAt);
  const sinkId = input.sink?.id ?? 'unknown';
  const reasons: string[] = [];
  const sink = input.sink;
  if (!sink || sink.visibility === 'unknown') {
    reasons.push('unknown-sink-visibility');
  } else {
    stableId(sink.id, 'sink');
    if (input.governance.handling.allowedSinks && !input.governance.handling.allowedSinks.includes(sink.id)) {
      reasons.push('sink-not-allowed');
    }
    const definitions = input.classes ?? resolveClassificationDefinitions();
    const configuredMax = sink.maxClassification;
    const maxRank = configuredMax === undefined
      ? defaultSinkMaxRank(sink)
      : definitions[configuredMax]?.rank;
    if (maxRank === undefined || maxRank === null) reasons.push('unknown-sink-classification-limit');
    else if (input.governance.classificationRank > maxRank) reasons.push('classification-exceeds-sink');
    const crossRepo = Boolean(input.sourceRepository && sink.repository && input.sourceRepository !== sink.repository);
    if (crossRepo && input.governance.handling.crossRepo === 'deny') reasons.push('cross-repo-denied');
    if (crossRepo && input.governance.handling.crossRepo === 'approval-required') reasons.push('cross-repo-approval-required');
  }

  const validApproval = approvalIsValid(input.approval, input.artifactId, sinkId, now);
  const overridableReasons = new Set(['classification-exceeds-sink', 'cross-repo-approval-required']);
  const approvalCoversReasons = reasons.length > 0 && reasons.every((reason) => overridableReasons.has(reason));
  let decision: PublicationDecision;
  if (reasons.length === 0) decision = 'allow';
  else if (validApproval && approvalCoversReasons && sink && sink.visibility !== 'unknown') decision = 'override';
  else if (sink?.acceptsSanitizedSummary) decision = 'summarize';
  else decision = 'deny';
  const audit: PublicationAuditRecord = {
    schemaVersion: 'ops-publication-decision.aiwg.io/v1',
    eventId: randomUUID(),
    occurredAt,
    artifactId: correlationDigest(input.artifactId),
    artifactKind: safeArtifactKind(input.artifactKind),
    classification: input.governance.classification,
    sinkId,
    decision,
    reasonCodes: [...reasons].sort(),
    ...(decision === 'override' && input.approval ? {
      approvalId: input.approval.id,
      approvalActor: input.approval.actor,
      approvalReasonDigest: reasonDigest(input.approval.reason),
    } : {}),
  };
  return { decision, allowed: decision === 'allow' || decision === 'override', reasonCodes: audit.reasonCodes, audit };
}

/** Produce a payload-free summary suitable for a second, separately gated publication attempt. */
export function createSanitizedSummary(input: {
  artifactId: string;
  artifactKind: string;
  status?: string;
  omittedFields: number;
  redactionClasses: readonly string[];
}): Record<string, unknown> {
  return {
    schemaVersion: 'ops-sanitized-summary.aiwg.io/v1',
    artifactFingerprint: `sha256:${createHash('sha256').update(input.artifactId).digest('hex')}`,
    artifactKind: input.artifactKind,
    ...(input.status ? { status: input.status } : {}),
    omittedFields: input.omittedFields,
    redactionClasses: [...new Set(input.redactionClasses)].sort(),
  };
}
