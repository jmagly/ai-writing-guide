export const DATASET_CONFORMANCE_CONTRACT = 'aiwg.dataset.conformance/v1' as const
export const DATASET_CONFORMANCE_SCHEMA_VERSION = '1.0.0' as const

export type ConformanceCellStatus = 'passed' | 'failed' | 'pending'
export type ConformanceMaturity = 'experimental' | 'qualified' | 'stable'
export type ConformanceEvidenceKind = 'fixture' | 'real-source' | 'cross-repo' | 'live-qualification'

export interface DatasetConformanceCell {
  id: string
  area: 'adapter' | 'capability' | 'replay' | 'checkpoint' | 'provenance' | 'security' | 'offline' | 'parity' | 'standards' | 'migration'
  requiredCapabilities: string[]
  sourceClass: 'synthetic' | 'file' | 'directory' | 'jsonl' | 'csv' | 'http' | 'cache' | 'fortemi'
  runtimeClass: 'local' | 'fortemi-core' | 'fortemi-server'
  fixture: { path: string; digest: string; revision: string }
  expected: { result: 'pass' | 'reject' | 'pending'; diagnostic?: string }
  maturity: ConformanceMaturity
  evidence: ConformanceEvidenceKind[]
  resourceEnvelope: { maxBytes: number; maxRecords: number; maxDurationMs: number }
  liveAuthorizationRequired?: boolean
}

export interface DatasetConformanceManifest {
  contract: typeof DATASET_CONFORMANCE_CONTRACT
  schemaVersion: string
  corpusVersion: string
  cells: DatasetConformanceCell[]
}

export interface DatasetConformanceBinding {
  aiwgCommit: string
  fortemiCommit?: string
  packageDigests: Record<string, string>
  schemaDigests: Record<string, string>
  fixtureDigest: string
  descriptorDigest?: string
  configurationDigest: string
}

export interface DatasetConformanceCellResult {
  cellId: string
  status: ConformanceCellStatus
  diagnostic?: string
  evidence: Array<{ kind: ConformanceEvidenceKind; reference: string; digest: string }>
  observed: { records?: number; bytes?: number; durationMs?: number; networkAttempts: number }
}

export interface DatasetConformanceReceipt {
  contract: typeof DATASET_CONFORMANCE_CONTRACT
  schemaVersion: string
  corpusVersion: string
  manifestDigest: string
  resultDigest: string
  bindings: DatasetConformanceBinding
  startedAt: string
  endedAt: string
  results: DatasetConformanceCellResult[]
  summary: { passed: number; failed: number; pending: number; stableEligible: boolean }
}

export type DatasetConformanceDiagnosticCode =
  | 'CONFORMANCE_MANIFEST_INVALID'
  | 'CONFORMANCE_CELL_DUPLICATE'
  | 'CONFORMANCE_REQUIRED_CELL_MISSING'
  | 'CONFORMANCE_FIXTURE_DIGEST_MISMATCH'
  | 'CONFORMANCE_RECEIPT_STALE'
  | 'CONFORMANCE_RECEIPT_UNVERIFIABLE'
  | 'CONFORMANCE_EVIDENCE_WEAKENED'
  | 'CONFORMANCE_MOCK_ONLY_STABLE'
  | 'CONFORMANCE_RESOURCE_ENVELOPE_MISSING'
  | 'CONFORMANCE_PENDING_STABLE_CELL'
  | 'CONFORMANCE_RESULT_FAILED'
  | 'CONFORMANCE_RESULT_DIGEST_MISMATCH'
  | 'CONFORMANCE_SENSITIVE_VALUE'

export interface DatasetConformanceDiagnostic {
  code: DatasetConformanceDiagnosticCode
  path: string
  message: string
}
