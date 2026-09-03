export const DATASET_CONTRACT_VERSION = 'aiwg.dataset/v1' as const
export type DatasetContractVersion = typeof DATASET_CONTRACT_VERSION

export type PrivacyClassification = 'public' | 'internal' | 'confidential' | 'restricted'
export type ArtifactClass =
  | 'canonical'
  | 'derived'
  | 'regenerable-index'
  | 'cache'
  | 'distribution'
  | 'portable-export'
export type LocalityPolicy = 'local-only' | 'approved-regions' | 'unrestricted'
export type NetworkPolicy = 'offline' | 'allowlisted' | 'online'
export type CapabilityRequirement = 'required' | 'optional'
export type DegradationAction = 'fail' | 'disable' | 'fallback'
export type LineageBasis = 'declared' | 'observed' | 'imported' | 'inferred'
export type RunOutcome = 'preview' | 'attempted' | 'committed' | 'rejected' | 'cancelled' | 'failed'

export interface ContractBase {
  contractVersion: DatasetContractVersion
  id: string
}

export interface Digest {
  algorithm: 'sha256'
  value: string
}

export interface SchemaBinding {
  id: string
  version: string
  digest?: Digest
}

export interface PolicyBinding {
  privacy: PrivacyClassification
  rights?: string
  license?: string
  retention?: { policy: string; expiresAt?: string }
  intendedUse: string[]
  locality: LocalityPolicy
  network: NetworkPolicy
  authorizationRefs: string[]
}

export interface DatasetSource extends ContractBase {
  kind: 'DatasetSource'
  sourceType: string
  locator: string
  policy: PolicyBinding
  schema?: SchemaBinding
  adapter: { id: string; version: string; configDigest: Digest }
}

export interface Dataset extends ContractBase {
  kind: 'Dataset'
  artifactClass: 'canonical'
  logicalId: string
  title: string
  description?: string
  owner: string
  policy: PolicyBinding
}

export interface DatasetRevision extends ContractBase {
  kind: 'DatasetRevision'
  artifactClass: 'canonical'
  datasetId: string
  revisionId: string
  manifestDigest: Digest
  contentDigest?: Digest
  sourceIds: string[]
  createdAt: string
  schema?: SchemaBinding
}

export interface Distribution extends ContractBase {
  kind: 'Distribution'
  datasetRevisionId: string
  artifactClass: 'distribution' | 'portable-export'
  mediaType: string
  locator: string
  digest: Digest
  schema?: SchemaBinding
}

export interface CapabilitySpec {
  name: string
  requirement: CapabilityRequirement
  acceptedVersions?: string[]
  degradation: { action: DegradationAction; fallbackCapability?: string; reason?: string }
}

export interface CapabilityProfile extends ContractBase {
  kind: 'CapabilityProfile'
  capabilities: CapabilitySpec[]
}

export interface ProcessingStep {
  id: string
  operation: string
  implementation: { id: string; version: string; digest?: Digest }
  inputSchema?: SchemaBinding
  outputSchema?: SchemaBinding
  configDigest: Digest
}

export interface ProcessingPlan extends ContractBase {
  kind: 'ProcessingPlan'
  readonly datasetRevisionId: string
  readonly capabilityProfileId: string
  readonly steps: readonly ProcessingStep[]
  readonly artifactClasses: readonly ArtifactClass[]
  readonly createdBy: string
  readonly planDigest: Digest
}

export interface ProcessingRun extends ContractBase {
  kind: 'ProcessingRun'
  runId: string
  planId: string
  planDigest: Digest
  attempt: number
  outcome: RunOutcome
  startedAt: string
  endedAt?: string
  executor: { id: string; version: string }
  diagnosticCodes?: string[]
}

export interface DerivedArtifact extends ContractBase {
  kind: 'DerivedArtifact'
  artifactClass: Exclude<ArtifactClass, 'canonical'>
  sourceRevisionId: string
  runId: string
  locator: string
  digest: Digest
  schema?: SchemaBinding
  regenerable: boolean
}

export interface EvidenceLocator {
  locator: string
  method: string
  confidence: number
  privacy: PrivacyClassification
}

export interface ProvenanceAssertion extends ContractBase {
  kind: 'ProvenanceAssertion'
  basis: LineageBasis
  subjectId: string
  predicate: string
  objectId: string
  sourceRevisionId?: string
  runId?: string
  evidence: EvidenceLocator[]
  assertedBy: string
  assertedAt: string
}

export interface Relationship extends ContractBase {
  kind: 'Relationship'
  relationshipType: string
  direction: 'outbound' | 'inbound'
  sourceId: string
  targetId: string
  basis: LineageBasis
  sourceRevisionId?: string
  runId?: string
  evidence: EvidenceLocator[]
}

export interface Checkpoint extends ContractBase {
  kind: 'Checkpoint'
  sourceId: string
  sourceSchema: SchemaBinding
  adapter: { id: string; version: string }
  planDigest: Digest
  opaqueCursor: string
  priorCommittedReceiptId?: string
  createdAt: string
}

export interface RunReceipt extends ContractBase {
  kind: 'RunReceipt'
  runId: string
  planId: string
  planDigest: Digest
  outcome: RunOutcome
  committed: boolean
  attemptedRecords: number
  committedRecords: number
  rejectedRecords: number
  checkpointBeforeId?: string
  checkpointAfterId?: string
  priorCommittedReceiptId?: string
  receiptDigest: Digest
  createdAt: string
  diagnosticCodes?: string[]
}

export type DatasetContract =
  | DatasetSource
  | Dataset
  | DatasetRevision
  | Distribution
  | CapabilityProfile
  | ProcessingPlan
  | ProcessingRun
  | DerivedArtifact
  | ProvenanceAssertion
  | Relationship
  | Checkpoint
  | RunReceipt

export interface CapabilityNegotiationReceipt {
  contractVersion: DatasetContractVersion
  satisfied: string[]
  degraded: Array<{ capability: string; action: Exclude<DegradationAction, 'fail'>; fallbackCapability?: string }>
}

export interface AvailableDatasetCapability {
  name: string
  version: string
}

export interface DatasetDiagnostic {
  code: string
  message: string
  path?: string
}

export interface DatasetValidationResult<T extends DatasetContract = DatasetContract> {
  valid: boolean
  value?: T
  diagnostics: DatasetDiagnostic[]
}
