import type { RunLedgerSnapshot } from './ledger-types.js'

export const STANDARDS_EXCHANGE_VERSION = 'aiwg.dataset-standards-exchange/v1' as const

export type StandardId = 'w3c-prov-json' | 'openlineage' | 'dcat' | 'croissant' | 'data-package' | 'ro-crate'
export type ProfileDirection = 'import' | 'export' | 'round-trip'
export type ProfileMaturity = 'stable' | 'candidate' | 'descriptor-only'
export type UnknownExtensionPolicy = 'preserve' | 'report' | 'reject'

export interface GovernedSchemaReference { id: string; version: string }

export interface StandardsProfileDescriptor {
  id: string
  standard: StandardId
  version: string
  direction: ProfileDirection
  inputSchema: GovernedSchemaReference
  outputSchema: GovernedSchemaReference
  mappingImplementation: string
  supportedFeatures: readonly string[]
  roundTripFields: readonly string[]
  extensionNamespace: string
  unknownExtensionPolicy: UnknownExtensionPolicy
  maturity: ProfileMaturity
  useCases: readonly string[]
  coverageBoundary: string
}

export type LossCategory = 'mapped' | 'omitted' | 'synthesized' | 'unsupported' | 'extension-carried'
export interface StandardsLossItem {
  category: LossCategory
  sourcePath?: string
  targetPath?: string
  reason: string
  extensionNamespace?: string
}
export interface StandardsLossReport {
  schemaVersion: typeof STANDARDS_EXCHANGE_VERSION
  profileId: string
  profileVersion: string
  direction: 'import' | 'export'
  sourceDigest: { algorithm: 'sha256'; value: string }
  items: StandardsLossItem[]
  counts: Record<LossCategory, number>
}

export interface StandardsExchange<T> {
  schemaVersion: typeof STANDARDS_EXCHANGE_VERSION
  profile: { id: string; version: string }
  value: T
  loss: StandardsLossReport
}

export interface StandardAdapter {
  descriptor: StandardsProfileDescriptor
  importDocument(document: unknown): StandardsExchange<RunLedgerSnapshot>
  exportDocument(snapshot: RunLedgerSnapshot): StandardsExchange<unknown>
}

export type StandardsDiagnosticCode =
  | 'DATASET_STANDARD_PROFILE_NOT_FOUND'
  | 'DATASET_STANDARD_UNSUPPORTED_VERSION'
  | 'DATASET_STANDARD_UNSUPPORTED_CAPABILITY'
  | 'DATASET_STANDARD_INVALID_INPUT'
  | 'DATASET_STANDARD_INVALID_OUTPUT'
  | 'DATASET_STANDARD_EXTENSION_COLLISION'
  | 'DATASET_STANDARD_IDENTITY_CONFLICT'
  | 'DATASET_STANDARD_EVIDENCE_ESCALATION'

export class StandardsProfileError extends Error {
  constructor(public readonly code: StandardsDiagnosticCode, message: string) { super(`${code}: ${message}`); this.name = 'StandardsProfileError' }
}
