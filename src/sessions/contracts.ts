import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PROVIDER_IDS } from '../providers/provider-definitions.js';

export const SESSION_CONTRACT_VERSION = '1.0.0' as const;
export const SESSION_PROVIDER_IDS = [...PROVIDER_IDS] as [
  string, string, string, string, string, string,
  string, string, string, string, string, string,
];

export const SessionProviderIdSchema = z.enum(SESSION_PROVIDER_IDS);
export type SessionProviderId = z.infer<typeof SessionProviderIdSchema>;

export const CapabilityDispositionSchema = z.enum([
  'implemented', 'manual-only', 'degraded', 'unsupported',
]);
export const OperationalStateSchema = z.enum([
  'available', 'unavailable', 'inaccessible', 'version-unknown',
  'schema-unsupported', 'degraded',
]);
export const ConsistencyStateSchema = z.enum([
  'provisional', 'consistent-snapshot', 'complete',
]);
export const SessionErrorCodeSchema = z.enum([
  'UNKNOWN_PROVIDER', 'UNKNOWN_SCHEMA_MAJOR', 'SOURCE_NOT_AUTHORIZED',
  'SOURCE_OUTSIDE_ALLOWED_ROOT', 'SOURCE_SYMLINK', 'SOURCE_NOT_REGULAR_FILE',
  'RESOURCE_LIMIT_EXCEEDED', 'NETWORK_NOT_AUTHORIZED', 'SCHEMA_DRIFT',
  'IMPORT_CONFLICT', 'IMPORT_INTERRUPTED',
]);

const VersionSchema = z.string().regex(/^\d+\.\d+\.\d+(?:[-+].+)?$/);
const DigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const NativeExtensionsSchema = z.record(z.unknown()).superRefine((value, context) => {
  for (const key of Object.keys(value)) {
    if (!key.startsWith('native.')) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `native extension must use native.<provider>: ${key}` });
    }
  }
});

export const SessionSourceSchema = z.object({
  contractVersion: z.literal(SESSION_CONTRACT_VERSION),
  sourceId: z.string().min(1),
  provider: SessionProviderIdSchema,
  providerProfile: z.string().min(1),
  locatorClass: z.string().min(1),
  redactedLocator: z.string().min(1),
  adapterVersion: VersionSchema,
  sourceSchemaVersion: VersionSchema,
  disposition: CapabilityDispositionSchema,
  operationalState: OperationalStateSchema,
  consistency: ConsistencyStateSchema,
  authorizedAt: z.string().datetime(),
  extensions: NativeExtensionsSchema.default({}),
});

export const SessionEventSchema = z.object({
  contractVersion: z.literal(SESSION_CONTRACT_VERSION),
  eventId: z.string().min(1),
  sessionId: z.string().min(1),
  sourceId: z.string().min(1),
  importRunId: z.string().min(1),
  nativeId: z.string().min(1).nullable(),
  sequence: z.number().int().nonnegative(),
  kind: z.string().min(1),
  role: z.string().min(1).nullable(),
  occurredAt: z.string().datetime().nullable(),
  searchableText: z.string(),
  digest: DigestSchema,
  rawReference: z.object({
    locatorClass: z.string().min(1),
    offset: z.number().int().nonnegative().optional(),
    sequence: z.number().int().nonnegative().optional(),
  }),
  adapterVersion: VersionSchema,
  consistency: ConsistencyStateSchema,
  sensitivity: z.object({
    classification: z.enum(['none', 'sensitive']),
    classes: z.array(z.string().min(1)),
  }),
  opaque: z.boolean().default(false),
  extensions: NativeExtensionsSchema.default({}),
});

export const SessionSchema = z.object({
  contractVersion: z.literal(SESSION_CONTRACT_VERSION),
  sessionId: z.string().min(1),
  sourceId: z.string().min(1),
  provider: SessionProviderIdSchema,
  nativeSessionId: z.string().min(1),
  workspaceId: z.string().min(1),
  startedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
  consistency: ConsistencyStateSchema,
  lifecycle: z.enum(['active', 'complete', 'tombstoned']),
  sourceDigest: DigestSchema,
  extensions: NativeExtensionsSchema.default({}),
});

export const ImportCheckpointSchema = z.object({
  cursor: z.string(),
  recordsRead: z.number().int().nonnegative(),
  bytesRead: z.number().int().nonnegative(),
});

export const ImportRunSchema = z.object({
  contractVersion: z.literal(SESSION_CONTRACT_VERSION),
  importRunId: z.string().min(1),
  sourceId: z.string().min(1),
  parserVersion: VersionSchema,
  policyVersion: VersionSchema,
  sourceSchemaVersion: VersionSchema,
  consistency: ConsistencyStateSchema,
  status: z.enum(['running', 'committed', 'rolled-back', 'failed']),
  checkpoint: ImportCheckpointSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  errorCode: SessionErrorCodeSchema.nullable(),
});

export const ProvenanceEdgeSchema = z.object({
  contractVersion: z.literal(SESSION_CONTRACT_VERSION),
  edgeId: z.string().min(1),
  relation: z.enum([
    'acquired-from', 'normalized-from', 'derived-from', 'promoted-to',
    'supersedes', 'invalidates',
  ]),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  importRunId: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const IntelligenceCandidateSchema = z.object({
  contractVersion: z.literal(SESSION_CONTRACT_VERSION),
  candidateId: z.string().min(1),
  version: z.number().int().positive(),
  type: z.enum([
    'decision', 'requirement', 'constraint', 'preference', 'task', 'discovery',
    'fix', 'failed-approach', 'procedure', 'risk', 'contradiction', 'question',
  ]),
  assertion: z.string().min(1),
  evidenceEventIds: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  temporalScope: z.string().min(1),
  projectScope: z.string().min(1),
  extractionMethod: z.string().min(1),
  extractionVersion: VersionSchema,
  reviewState: z.enum(['pending', 'accepted', 'rejected', 'superseded']),
  conflictsWith: z.array(z.string().min(1)).default([]),
  supersedes: z.array(z.string().min(1)).default([]),
});

export const PromotionReceiptSchema = z.object({
  contractVersion: z.literal(SESSION_CONTRACT_VERSION),
  receiptId: z.string().min(1),
  candidateId: z.string().min(1),
  candidateVersion: z.number().int().positive(),
  consumer: z.string().min(1),
  reviewer: z.string().min(1),
  approvedAt: z.string().datetime(),
  beforeHash: DigestSchema.nullable(),
  afterHash: DigestSchema,
  dryRun: z.boolean(),
  duplicate: z.boolean(),
});

export const DeletionReceiptSchema = z.object({
  contractVersion: z.literal(SESSION_CONTRACT_VERSION),
  receiptId: z.string().min(1),
  operationId: z.string().min(1),
  scopeClass: z.string().min(1),
  counts: z.record(z.number().int().nonnegative()),
  survivingDependentIds: z.array(z.string().min(1)),
  outcome: z.enum(['preview', 'committed', 'failed']),
  occurredAt: z.string().datetime(),
}).strict();

export type SessionSource = z.infer<typeof SessionSourceSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SessionEvent = z.infer<typeof SessionEventSchema>;
export type ImportCheckpoint = z.infer<typeof ImportCheckpointSchema>;
export type ImportRun = z.infer<typeof ImportRunSchema>;
export type ProvenanceEdge = z.infer<typeof ProvenanceEdgeSchema>;
export type IntelligenceCandidate = z.infer<typeof IntelligenceCandidateSchema>;
export type PromotionReceipt = z.infer<typeof PromotionReceiptSchema>;
export type DeletionReceipt = z.infer<typeof DeletionReceiptSchema>;

export interface ProviderRecord {
  nativeSessionId: string;
  nativeEventId?: string;
  sequence: number;
  kind: string;
  role?: string;
  occurredAt?: string;
  text: string;
  rawReference: SessionEvent['rawReference'];
  extensions?: Record<string, unknown>;
}

export interface AuthorizedScope {
  workspaceId: string;
  allowedRoots: string[];
  authorizedAccounts?: string[];
  networkOperation?: string;
}
export interface SourceDescriptor { provider: SessionProviderId; locator: string; locatorClass: string }
export interface SelectedSource extends SourceDescriptor { sourceId: string; authorizedScope: AuthorizedScope }
export interface SourceProbe {
  sourceSchemaVersion: string;
  consistency: z.infer<typeof ConsistencyStateSchema>;
  operationalState: z.infer<typeof OperationalStateSchema>;
}
export interface ImportCursor { value: string }

export interface SessionSourceAdapter {
  readonly provider: SessionProviderId;
  readonly adapterVersion: string;
  readonly disposition: z.infer<typeof CapabilityDispositionSchema>;
  readonly supportedOperations: readonly SessionSourceOperation[];
  readonly acquisitionModes: readonly SessionAcquisitionMode[];
  discover(scope: AuthorizedScope): AsyncIterable<SourceDescriptor>;
  inspect(source: SelectedSource): Promise<SourceProbe>;
  stream(source: SelectedSource, cursor?: ImportCursor): AsyncIterable<ProviderRecord>;
}

export type SessionSourceOperation = 'discover' | 'inspect' | 'stream' | 'snapshot';
export type SessionAcquisitionMode =
  | 'api' | 'jsonl' | 'sqlite-snapshot' | 'hook' | 'manual-export';

export function assertSessionProviderId(value: string): SessionProviderId {
  const parsed = SessionProviderIdSchema.safeParse(value);
  if (!parsed.success) throw new SessionContractError('UNKNOWN_PROVIDER', `unknown session provider: ${value}`);
  return parsed.data;
}

export function assertSupportedSchemaMajor(version: string, supportedMajor = 1): void {
  const match = /^(\d+)\./.exec(version);
  if (!match || Number(match[1]) !== supportedMajor) {
    throw new SessionContractError('UNKNOWN_SCHEMA_MAJOR', `unsupported session schema major: ${version}`);
  }
}

export function stableSessionId(provider: SessionProviderId, sourceId: string, nativeSessionId: string): string {
  return stableId('session', provider, sourceId, nativeSessionId);
}

export function stableEventId(sourceId: string, record: ProviderRecord, digest: string): string {
  return record.nativeEventId
    ? stableId('event', sourceId, record.nativeEventId)
    : stableId('event', sourceId, record.nativeSessionId, record.sequence, record.kind, digest);
}

export function sha256(value: string | Uint8Array): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function stableId(prefix: string, ...parts: Array<string | number>): string {
  return `${prefix}_${createHash('sha256').update(parts.join('\0')).digest('hex')}`;
}

export class SessionContractError extends Error {
  constructor(public readonly code: z.infer<typeof SessionErrorCodeSchema>, message: string) {
    super(message);
    this.name = 'SessionContractError';
  }
}
