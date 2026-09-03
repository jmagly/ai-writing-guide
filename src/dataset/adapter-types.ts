import type { Digest, PrivacyClassification, SchemaBinding } from './types.js'

export const DATASET_ADAPTER_CONTRACT_VERSION = 'aiwg.dataset.adapter/v1' as const
export type DatasetAdapterContractVersion = typeof DATASET_ADAPTER_CONTRACT_VERSION

export type AdapterOperation = 'describe' | 'configure' | 'check' | 'discover' | 'preview' | 'read'
export type AdapterDiagnosticCode =
  | 'ADAPTER_INVALID_CONFIGURATION'
  | 'ADAPTER_AUTHORIZATION_UNAVAILABLE'
  | 'ADAPTER_OFFLINE_PROHIBITED'
  | 'ADAPTER_SOURCE_UNAVAILABLE'
  | 'ADAPTER_RESOURCE_LIMIT'
  | 'ADAPTER_SCHEMA_DRIFT'
  | 'ADAPTER_CHECKPOINT_INCOMPATIBLE'
  | 'ADAPTER_CANCELLED'
  | 'ADAPTER_PATH_ESCAPE'
  | 'ADAPTER_UNSAFE_SYMLINK'
  | 'ADAPTER_SPECIAL_FILE'
  | 'ADAPTER_NETWORK_PROHIBITED'
  | 'ADAPTER_REDIRECT_PROHIBITED'
  | 'ADAPTER_SECRET_REJECTED'
  | 'ADAPTER_INTERNAL_ERROR'

export interface AdapterDiagnostic {
  code: AdapterDiagnosticCode
  severity: 'info' | 'warning' | 'error'
  message: string
  operation: AdapterOperation
  path?: string
  retryable: boolean
}

export interface AdapterSchemaDeclaration extends SchemaBinding {
  digest: Digest
  dialect: 'https://json-schema.org/draft/2020-12/schema'
  schema: Record<string, unknown>
}

export interface AdapterManifest {
  contractVersion: DatasetAdapterContractVersion
  kind: 'AdapterManifest'
  id: string
  version: string
  packageDigest: Digest
  datasetContractRange: string
  sourceKinds: string[]
  schemas: {
    config: AdapterSchemaDeclaration
    discoveredRecord: AdapterSchemaDeclaration
    checkpoint: AdapterSchemaDeclaration
  }
  capabilities: Array<'discovery' | 'preview' | 'streaming-read' | 'checkpoint' | 'tombstone'>
  limits: AdapterLimits
  maturity: 'experimental' | 'qualified' | 'stable'
  publisher: { id: string; url?: string }
  trust: { state: 'builtin' | 'verified' | 'untrusted'; signature?: string }
  permissions: { locality: 'local' | 'remote'; network: 'none' | 'https-allowlisted'; credentials: 'none' | 'locator-only' }
  incremental: {
    ordering: string
    sameCursorTieHandling: string
    lateArrivals: string
    tombstones: string
    checkpointCompatibility: string
  }
}

export interface CredentialLocator {
  kind: 'opaque' | 'environment' | 'keychain' | 'vault'
  locator: string
}

export interface AdapterLimits {
  maxRecords: number
  maxBytes: number
  maxRecordBytes: number
  timeoutMs: number
  maxRedirects: number
  maxDepth: number
}

export interface AdapterPolicy {
  offline: boolean
  allowedRoot?: string
  allowedHosts?: string[]
  allowPrivateNetwork?: boolean
}

export interface AdapterRequest<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  contractVersion: DatasetAdapterContractVersion
  requestId: string
  config: TConfig
  policy: AdapterPolicy
  limits: AdapterLimits
  signal?: AbortSignal
}

export interface AdapterCheckpoint {
  contractVersion: DatasetAdapterContractVersion
  kind: 'AdapterCheckpoint'
  adapter: { id: string; version: string }
  sourceIdentity: string
  cursor: string
  tieBreaker?: string
  schema: SchemaBinding
  createdAt: string
}

export interface AdapterConfigurationResult<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  ok: boolean
  config?: TConfig
  configDigest?: Digest
  diagnostics: AdapterDiagnostic[]
}

export interface AdapterDiscovery {
  sourceIdentity: string
  proposedSchema: Record<string, unknown>
  schemaBasis: 'declared' | 'observed' | 'inferred'
  estimates: { records?: number; bytes?: number }
  privacySignals: PrivacyClassification[]
  licenseSignals: string[]
  cursorSupport: boolean
  checkpointSupport: boolean
  identityStability: 'stable' | 'source-unstable'
  identityLimitation?: string
  limitations: string[]
}

export interface AdapterResult<T> {
  ok: boolean
  value?: T
  diagnostics: AdapterDiagnostic[]
}

export interface AdapterRecord {
  logicalId: string
  ordinal: number
  value: unknown
  sourceLocator: string
  contentDigest: Digest
  tombstone?: boolean
}

export type AdapterReadEvent =
  | { kind: 'record'; record: AdapterRecord }
  | { kind: 'checkpoint'; checkpoint: AdapterCheckpoint }
  | { kind: 'diagnostic'; diagnostic: AdapterDiagnostic }

export interface DatasetSourceAdapter<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  describe(): AdapterManifest
  configure(config: unknown): Promise<AdapterConfigurationResult<TConfig>>
  check(request: AdapterRequest<TConfig>): Promise<AdapterResult<{ sourceIdentity: string }>>
  discover(request: AdapterRequest<TConfig>): Promise<AdapterResult<AdapterDiscovery>>
  preview(request: AdapterRequest<TConfig> & { count: number }): Promise<AdapterResult<AdapterRecord[]>>
  read(request: AdapterRequest<TConfig> & { checkpoint?: AdapterCheckpoint }): AsyncIterable<AdapterReadEvent>
}

export interface AdapterQualificationCell {
  name: string
  source: 'fixture' | 'real-source'
  passed: boolean
  evidence: string[]
}

export interface AdapterQualificationReport {
  contractVersion: DatasetAdapterContractVersion
  kind: 'AdapterQualificationReport'
  adapter: { id: string; version: string; packageDigest: Digest }
  schemas: { config: SchemaBinding; record: SchemaBinding; checkpoint: SchemaBinding }
  fixtureRevision: string
  cells: AdapterQualificationCell[]
  qualifiedAt: string
  qualified: boolean
  stableEligible: boolean
}
