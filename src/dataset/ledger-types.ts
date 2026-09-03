import type { Digest, PrivacyClassification, ProcessingRun } from './types.js'

export const RUN_LEDGER_VERSION = 'aiwg.run-ledger/v1' as const
export type RunLedgerVersion = typeof RUN_LEDGER_VERSION
export type ProvenanceBasis = 'declared' | 'observed' | 'imported' | 'inferred'
export type PrincipalKind = 'person' | 'organization' | 'software' | 'service'

export interface StructuredLocator { scheme: 'file' | 'uri' | 'json-pointer' | 'line-column' | 'record-key' | 'external-id'; value: string; field?: string; line?: number; column?: number }
export interface LedgerEntity { recordType: 'entity'; id: string; entityType: string; revision?: string; digest?: Digest; privacy: PrivacyClassification; retentionPolicy?: string }
export interface LedgerActivity { recordType: 'activity'; id: string; activityType: string; runId?: string; startedAt?: string; endedAt?: string; planDigest?: Digest }
export interface LedgerAgent { recordType: 'agent'; id: string; principalKind: PrincipalKind; version?: string }
export interface LedgerEvidence { recordType: 'evidence'; id: string; source: StructuredLocator; target?: StructuredLocator; method: string; confidence: number; privacy: PrivacyClassification; retentionPolicy?: string; runId?: string; responsibleAgentId: string; observedAt: string }
export interface LedgerAssertion { recordType: 'assertion'; id: string; subjectId: string; predicate: string; objectId: string; basis: ProvenanceBasis; evidenceIds: string[]; activityId?: string; runId?: string; field?: string; privacy: PrivacyClassification; retentionPolicy?: string }
export interface LedgerCorrection { recordType: 'correction'; id: string; correctsEventId: string; replacementEventId?: string; reason: string; responsibleAgentId: string }
export interface LedgerSupersession { recordType: 'supersession'; id: string; supersedesEventId: string; successorEventId: string; reason?: string }
export type LedgerRecord = LedgerEntity | LedgerActivity | LedgerAgent | LedgerEvidence | LedgerAssertion | LedgerCorrection | LedgerSupersession

export interface LedgerEvent { schemaVersion: RunLedgerVersion; eventId: string; runId?: string; sequence: number; recordedAt: string; producer: { id: string; version: string }; record: LedgerRecord; eventDigest: Digest }
export interface RunLedgerSnapshot { schemaVersion: RunLedgerVersion; events: LedgerEvent[] }
export interface ProjectionLossItem {
  path: string
  reason: string
  severity: 'information' | 'semantic' | 'privacy'
  sourcePrivacy?: PrivacyClassification
  retentionPolicy?: string
}
export interface ProjectionLossReport { profile: string; lossless: boolean; items: ProjectionLossItem[] }
export interface ProjectionResult<T> { value: T; loss: ProjectionLossReport }
export interface W3cProvProjection {
  entity: Record<string, Record<string, unknown>>
  activity: Record<string, Record<string, unknown>>
  agent: Record<string, Record<string, unknown>>
  wasDerivedFrom: Array<{ generatedEntity: string; usedEntity: string; evidence?: string[] }>
  wasGeneratedBy: Array<{ entity: string; activity: string }>
  used: Array<{ activity: string; entity: string; evidence?: string[] }>
  wasAssociatedWith: Array<{ activity: string; agent: string }>
  wasAttributedTo: Array<{ entity: string; agent: string }>
}
export type LedgerProcessingRun = ProcessingRun
