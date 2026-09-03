import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

import {
  DATASET_CONTRACT_VERSION,
  type CapabilityNegotiationReceipt,
  type CapabilityProfile,
  type Checkpoint,
  type AvailableDatasetCapability,
  type DatasetContract,
  type DatasetDiagnostic,
  type DatasetValidationResult,
  type Digest,
  type ProcessingPlan,
  type RunReceipt,
} from './types.js'

const CONTRACT_KINDS = new Set([
  'DatasetSource', 'Dataset', 'DatasetRevision', 'Distribution',
  'CapabilityProfile', 'ProcessingPlan', 'ProcessingRun', 'DerivedArtifact',
  'ProvenanceAssertion', 'Relationship', 'Checkpoint', 'RunReceipt',
])
const RUN_OUTCOMES = new Set(['preview', 'attempted', 'committed', 'rejected', 'cancelled', 'failed'])
const SECRET_KEYS = /^(?:password|passwd|secret|token|api[-_]?key|private[-_]?key|credential)s?$/i
function packageRoot(start: string): string {
  let current = resolve(start)
  for (;;) {
    try {
      const packageJson = JSON.parse(readFileSync(join(current, 'package.json'), 'utf8')) as { name?: string }
      if (packageJson.name === 'aiwg') return current
    } catch {
      // Keep walking; source and compiled modules have different depths.
    }
    const parent = dirname(current)
    if (parent === current) throw new Error('dataset contracts: could not locate the aiwg package root')
    current = parent
  }
}

const contractSchemaPath = join(packageRoot(dirname(fileURLToPath(import.meta.url))), 'schemas/dataset/dataset-contracts.v1.schema.json')
const contractSchema = JSON.parse(readFileSync(contractSchemaPath, 'utf8')) as Record<string, unknown>
const contractAjv = new Ajv2020({ strict: true, allErrors: true })
addFormats(contractAjv)
const validateSerializedContract = contractAjv.compile(contractSchema)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function diagnostic(code: string, message: string, path?: string): DatasetDiagnostic {
  return { code, message, ...(path === undefined ? {} : { path }) }
}

function detectEmbeddedSecrets(value: unknown, path = ''): DatasetDiagnostic[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => detectEmbeddedSecrets(item, `${path}/${index}`))
  if (!isRecord(value)) return []
  return Object.entries(value).flatMap(([key, nested]) =>
    SECRET_KEYS.test(key)
      ? [diagnostic('DATASET_EMBEDDED_CREDENTIAL', `credential material is forbidden in contract field ${key}`, `${path}/${key}`)]
      : detectEmbeddedSecrets(nested, `${path}/${key}`),
  )
}

function requiredString(record: Record<string, unknown>, key: string, diagnostics: DatasetDiagnostic[]): void {
  if (typeof record[key] !== 'string' || record[key].length === 0) diagnostics.push(diagnostic('DATASET_REQUIRED_FIELD', `${key} must be a non-empty string`, `/${key}`))
}

export function validateDatasetContract(value: unknown): DatasetValidationResult {
  if (!isRecord(value)) return { valid: false, diagnostics: [diagnostic('DATASET_CONTRACT_INVALID', 'contract must be an object')] }
  validateSerializedContract(value)
  const diagnostics = (validateSerializedContract.errors ?? []).map((error: ErrorObject) =>
    diagnostic('DATASET_SCHEMA_INVALID', error.message ?? 'schema validation failed', error.instancePath || '/'),
  )
  diagnostics.push(...detectEmbeddedSecrets(value))
  requiredString(value, 'contractVersion', diagnostics)
  requiredString(value, 'kind', diagnostics)
  requiredString(value, 'id', diagnostics)
  if (value.contractVersion !== DATASET_CONTRACT_VERSION) diagnostics.push(diagnostic('DATASET_CONTRACT_VERSION_UNSUPPORTED', `unsupported contract version ${String(value.contractVersion)}; expected ${DATASET_CONTRACT_VERSION}`, '/contractVersion'))
  if (typeof value.kind !== 'string' || !CONTRACT_KINDS.has(value.kind)) diagnostics.push(diagnostic('DATASET_CONTRACT_KIND_UNKNOWN', `unknown contract kind ${String(value.kind)}`, '/kind'))

  if (value.kind === 'Dataset' && value.id !== value.logicalId) diagnostics.push(diagnostic('DATASET_LOGICAL_ID_MISMATCH', 'Dataset id must equal its stable logicalId', '/logicalId'))
  if (value.kind === 'DatasetRevision') {
    if (value.id === value.datasetId) diagnostics.push(diagnostic('DATASET_IDENTITY_CONFLATED', 'revision identity must differ from logical dataset identity', '/id'))
    if (value.id !== value.revisionId) diagnostics.push(diagnostic('DATASET_REVISION_ID_MISMATCH', 'DatasetRevision id must equal revisionId', '/revisionId'))
  }
  if (value.kind === 'ProcessingPlan') {
    if (!Array.isArray(value.steps) || value.steps.length === 0) diagnostics.push(diagnostic('DATASET_PLAN_EMPTY', 'processing plan requires at least one step', '/steps'))
  }
  if (value.kind === 'ProcessingRun' || value.kind === 'RunReceipt') {
    if (!RUN_OUTCOMES.has(String(value.outcome))) diagnostics.push(diagnostic('DATASET_RUN_OUTCOME_INVALID', 'run outcome is invalid', '/outcome'))
  }
  if (value.kind === 'RunReceipt') {
    const committed = value.committed === true
    if (committed !== (value.outcome === 'committed')) diagnostics.push(diagnostic('DATASET_RECEIPT_OUTCOME_CONFLICT', 'committed is true exactly when outcome is committed', '/committed'))
    if (typeof value.committedRecords === 'number' && typeof value.attemptedRecords === 'number' && value.committedRecords > value.attemptedRecords) diagnostics.push(diagnostic('DATASET_RECEIPT_COUNT_INVALID', 'committedRecords cannot exceed attemptedRecords', '/committedRecords'))
    if (typeof value.rejectedRecords === 'number' && typeof value.attemptedRecords === 'number' && value.rejectedRecords > value.attemptedRecords) diagnostics.push(diagnostic('DATASET_RECEIPT_COUNT_INVALID', 'rejectedRecords cannot exceed attemptedRecords', '/rejectedRecords'))
  }
  if ((value.kind === 'Relationship' || value.kind === 'ProvenanceAssertion') && value.basis === 'observed' && typeof value.runId !== 'string') diagnostics.push(diagnostic('DATASET_OBSERVED_LINEAGE_RUN_REQUIRED', 'observed lineage requires runId', '/runId'))

  return diagnostics.length ? { valid: false, diagnostics } : { valid: true, value: value as unknown as DatasetContract, diagnostics: [] }
}

export function canonicalDatasetJson(value: unknown): string {
  const visit = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(visit)
    if (!isRecord(item)) return item
    return Object.fromEntries(Object.keys(item).sort().map((key) => [key, visit(item[key])]))
  }
  return JSON.stringify(visit(value))
}

export function datasetDigest(value: unknown): Digest {
  return { algorithm: 'sha256', value: createHash('sha256').update(canonicalDatasetJson(value)).digest('hex') }
}

function withoutDigest(plan: ProcessingPlan): Omit<ProcessingPlan, 'planDigest'> {
  const { planDigest: _planDigest, ...declaration } = plan
  return declaration
}

function receiptWithoutDigest(receipt: RunReceipt): Omit<RunReceipt, 'receiptDigest'> {
  const { receiptDigest: _receiptDigest, ...observation } = receipt
  return observation
}

export function computeProcessingPlanDigest(plan: ProcessingPlan): Digest {
  return datasetDigest(withoutDigest(plan))
}

export function verifyProcessingPlanDigest(plan: ProcessingPlan): boolean {
  return plan.planDigest.algorithm === 'sha256' && plan.planDigest.value === computeProcessingPlanDigest(plan).value
}

export function computeRunReceiptDigest(receipt: RunReceipt): Digest {
  return datasetDigest(receiptWithoutDigest(receipt))
}

export function verifyRunReceiptDigest(receipt: RunReceipt): boolean {
  return receipt.receiptDigest.algorithm === 'sha256' && receipt.receiptDigest.value === computeRunReceiptDigest(receipt).value
}

export function negotiateDatasetCapabilities(
  profile: CapabilityProfile,
  available: readonly (string | AvailableDatasetCapability)[],
): CapabilityNegotiationReceipt {
  const offered = new Map(available.map((capability) =>
    typeof capability === 'string' ? [capability, undefined] : [capability.name, capability.version],
  ))
  const satisfied: string[] = []
  const degraded: CapabilityNegotiationReceipt['degraded'] = []
  for (const capability of profile.capabilities) {
    const offeredVersion = offered.get(capability.name)
    const versionAccepted = !capability.acceptedVersions?.length || (offeredVersion !== undefined && capability.acceptedVersions.includes(offeredVersion))
    if (offered.has(capability.name) && versionAccepted) { satisfied.push(capability.name); continue }
    if (capability.requirement === 'required' || capability.degradation.action === 'fail') throw new DatasetContractError('DATASET_REQUIRED_CAPABILITY_UNSUPPORTED', `required capability is unavailable: ${capability.name}`)
    const action = capability.degradation.action
    if (action === 'disable') degraded.push({ capability: capability.name, action })
    else degraded.push({ capability: capability.name, action, ...(capability.degradation.fallbackCapability ? { fallbackCapability: capability.degradation.fallbackCapability } : {}) })
  }
  return { contractVersion: DATASET_CONTRACT_VERSION, satisfied: satisfied.sort(), degraded: degraded.sort((a, b) => a.capability.localeCompare(b.capability)) }
}

/** Validate identity references across a complete contract bundle. */
export function validateDatasetContractSet(contracts: readonly DatasetContract[]): DatasetDiagnostic[] {
  const diagnostics: DatasetDiagnostic[] = []
  const ids = new Set<string>()
  for (const contract of contracts) {
    if (ids.has(contract.id)) diagnostics.push(diagnostic('DATASET_ID_DUPLICATE', `duplicate contract identity ${contract.id}`))
    ids.add(contract.id)
  }
  const requireReference = (owner: DatasetContract, target: string | undefined, field: string): void => {
    if (target && !ids.has(target)) diagnostics.push(diagnostic('DATASET_REFERENCE_DANGLING', `${owner.kind} ${owner.id} references unknown identity ${target}`, `/${field}`))
  }
  for (const contract of contracts) {
    switch (contract.kind) {
      case 'DatasetRevision':
        requireReference(contract, contract.datasetId, 'datasetId')
        for (const sourceId of contract.sourceIds) requireReference(contract, sourceId, 'sourceIds')
        break
      case 'Distribution': requireReference(contract, contract.datasetRevisionId, 'datasetRevisionId'); break
      case 'ProcessingPlan':
        requireReference(contract, contract.datasetRevisionId, 'datasetRevisionId')
        requireReference(contract, contract.capabilityProfileId, 'capabilityProfileId')
        break
      case 'ProcessingRun': requireReference(contract, contract.planId, 'planId'); break
      case 'DerivedArtifact':
        requireReference(contract, contract.sourceRevisionId, 'sourceRevisionId')
        requireReference(contract, contract.runId, 'runId')
        break
      case 'ProvenanceAssertion':
        requireReference(contract, contract.subjectId, 'subjectId')
        requireReference(contract, contract.objectId, 'objectId')
        requireReference(contract, contract.sourceRevisionId, 'sourceRevisionId')
        requireReference(contract, contract.runId, 'runId')
        break
      case 'Relationship':
        requireReference(contract, contract.sourceId, 'sourceId')
        requireReference(contract, contract.targetId, 'targetId')
        requireReference(contract, contract.sourceRevisionId, 'sourceRevisionId')
        requireReference(contract, contract.runId, 'runId')
        break
      case 'Checkpoint':
        requireReference(contract, contract.sourceId, 'sourceId')
        requireReference(contract, contract.priorCommittedReceiptId, 'priorCommittedReceiptId')
        break
      case 'RunReceipt':
        requireReference(contract, contract.runId, 'runId')
        requireReference(contract, contract.planId, 'planId')
        requireReference(contract, contract.checkpointBeforeId, 'checkpointBeforeId')
        requireReference(contract, contract.checkpointAfterId, 'checkpointAfterId')
        requireReference(contract, contract.priorCommittedReceiptId, 'priorCommittedReceiptId')
        break
      default: break
    }
  }
  return diagnostics
}

export function validateCheckpointAncestry(checkpoint: Checkpoint, prior?: RunReceipt): DatasetDiagnostic[] {
  if (!checkpoint.priorCommittedReceiptId) return []
  if (!prior || prior.id !== checkpoint.priorCommittedReceiptId) return [diagnostic('DATASET_CHECKPOINT_ANCESTRY_MISSING', 'checkpoint prior committed receipt is unavailable', '/priorCommittedReceiptId')]
  if (!prior.committed || prior.outcome !== 'committed') return [diagnostic('DATASET_CHECKPOINT_ANCESTRY_UNCOMMITTED', 'checkpoint ancestry must reference a committed receipt', '/priorCommittedReceiptId')]
  if (prior.planDigest.value !== checkpoint.planDigest.value) return [diagnostic('DATASET_CHECKPOINT_PLAN_MISMATCH', 'checkpoint and prior receipt plan digests differ', '/planDigest')]
  return []
}

export class DatasetContractError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
    this.name = 'DatasetContractError'
  }
}
