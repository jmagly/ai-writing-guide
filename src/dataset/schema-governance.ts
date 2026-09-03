import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

import { analyzeBackwardCompatibility, loadSchemaCatalog, SchemaResolver, SchemaValidator } from '../schema/index.js'
import type { CompatibilityStatus } from '../schema/compatibility.js'
import type { SchemaBinding, DatasetDiagnostic, Digest } from './types.js'

export const DATASET_CONTRACT_SCHEMA_ID = 'https://aiwg.io/schemas/dataset/dataset-contracts.v1.schema.json'
export const DATASET_GOVERNANCE_SCHEMA_ID = 'https://aiwg.io/schemas/dataset/dataset-schema-governance.v1.schema.json'
export const DATASET_GOVERNANCE_VERSION = 'aiwg.dataset-schema-governance/v1' as const

export type DatasetBoundary =
  | 'adapter-config'
  | 'discovered-record'
  | 'checkpoint'
  | 'processing-plan'
  | 'processing-run'
  | 'run-receipt'
  | 'lineage'
  | 'exchange'

export interface DatasetSchemaCandidate {
  schemaVersion: typeof DATASET_GOVERNANCE_VERSION
  kind: 'DatasetSchemaCandidate'
  id: string
  status: 'candidate'
  sourceRevisionId: string
  inferredSchema: Record<string, unknown>
  inferredSchemaDigest: Digest
  inference: { method: string; tool: string; toolVersion: string; runId?: string }
  observedAt: string
}

export interface DatasetSchemaPromotionReceipt {
  schemaVersion: typeof DATASET_GOVERNANCE_VERSION
  kind: 'DatasetSchemaPromotionReceipt'
  id: string
  status: 'promoted'
  candidateId: string
  candidateDigest: Digest
  promotedSchema: Required<SchemaBinding>
  reviewer: string
  reviewedAt: string
  decisionEvidence: string
  compatibility: { status: CompatibilityStatus; baseline?: string; reasons: string[] }
}

export interface DatasetSchemaImpactTarget {
  target: 'adapter' | 'checkpoint-state' | 'processing-plan' | 'index' | 'derived-artifact' | 'consumer'
  disposition: 'compatible' | 'review-required' | 'migration-required'
  reason: string
}

export interface DatasetSchemaImpactReport {
  schemaVersion: typeof DATASET_GOVERNANCE_VERSION
  kind: 'DatasetSchemaImpactReport'
  schemaId: string
  baseline: string
  compatibility: { status: CompatibilityStatus; reasons: string[] }
  targets: DatasetSchemaImpactTarget[]
}

export type DatasetSchemaGovernanceRecord = DatasetSchemaCandidate | DatasetSchemaPromotionReceipt | DatasetSchemaImpactReport

function packageRoot(start: string): string {
  let current = resolve(start)
  for (;;) {
    try {
      const pkg = JSON.parse(readFileSync(join(current, 'package.json'), 'utf8')) as { name?: string }
      if (pkg.name === 'aiwg') return current
    } catch { /* keep walking */ }
    const parent = dirname(current)
    if (parent === current) throw new Error('dataset schema governance: could not locate package root')
    current = parent
  }
}

const defaultRoot = packageRoot(dirname(fileURLToPath(import.meta.url)))
const governanceSchema = JSON.parse(readFileSync(join(defaultRoot, 'schemas/dataset/dataset-schema-governance.v1.schema.json'), 'utf8')) as Record<string, unknown>
const governanceAjv = new Ajv2020({ strict: true, allErrors: true })
addFormats(governanceAjv)
const validateGovernanceSchema: ValidateFunction = governanceAjv.compile(governanceSchema)

function diagnostic(code: string, message: string, path?: string): DatasetDiagnostic {
  return { code, message, ...(path ? { path } : {}) }
}

function sha256(value: unknown): Digest {
  const canonical = JSON.stringify(canonicalize(value))
  return { algorithm: 'sha256', value: createHash('sha256').update(canonical).digest('hex') }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize((value as Record<string, unknown>)[key])]))
}

export function createDatasetSchemaCandidate(input: Omit<DatasetSchemaCandidate, 'schemaVersion' | 'kind' | 'status' | 'inferredSchemaDigest'>): DatasetSchemaCandidate {
  return {
    schemaVersion: DATASET_GOVERNANCE_VERSION,
    kind: 'DatasetSchemaCandidate',
    status: 'candidate',
    ...input,
    inferredSchemaDigest: sha256(input.inferredSchema),
  }
}

export function promoteDatasetSchemaCandidate(
  candidate: DatasetSchemaCandidate,
  review: Omit<DatasetSchemaPromotionReceipt, 'schemaVersion' | 'kind' | 'status' | 'candidateId' | 'candidateDigest'>,
): DatasetSchemaPromotionReceipt {
  if (candidate.status !== 'candidate') throw new Error('DATASET_SCHEMA_NOT_CANDIDATE')
  const actual = sha256(candidate.inferredSchema)
  if (actual.value !== candidate.inferredSchemaDigest.value) throw new Error('DATASET_SCHEMA_CANDIDATE_DIGEST_MISMATCH')
  if (!review.reviewer || !review.decisionEvidence) throw new Error('DATASET_SCHEMA_REVIEW_REQUIRED')
  if (!review.promotedSchema.digest) throw new Error('DATASET_SCHEMA_BINDING_DIGEST_REQUIRED')
  if (review.compatibility.status === 'unknown' && review.compatibility.reasons.length === 0) throw new Error('DATASET_SCHEMA_COMPATIBILITY_EVIDENCE_REQUIRED')
  return {
    schemaVersion: DATASET_GOVERNANCE_VERSION,
    kind: 'DatasetSchemaPromotionReceipt',
    status: 'promoted',
    candidateId: candidate.id,
    candidateDigest: candidate.inferredSchemaDigest,
    ...review,
  }
}

export function assessDatasetSchemaImpact(schemaId: string, baseline: string, before: unknown, after: unknown): DatasetSchemaImpactReport {
  const compatibility = analyzeBackwardCompatibility(before, after)
  const disposition = compatibility.status === 'compatible' ? 'compatible' : compatibility.status === 'breaking' ? 'migration-required' : 'review-required'
  const targets: DatasetSchemaImpactTarget['target'][] = ['adapter', 'checkpoint-state', 'processing-plan', 'index', 'derived-artifact', 'consumer']
  return {
    schemaVersion: DATASET_GOVERNANCE_VERSION,
    kind: 'DatasetSchemaImpactReport',
    schemaId,
    baseline,
    compatibility: { status: compatibility.status, reasons: compatibility.reasons },
    targets: targets.map(target => ({ target, disposition, reason: `${target} must be assessed against ${schemaId}; ${compatibility.reasons.join('; ')}` })),
  }
}

export function validateDatasetGovernanceRecord(value: unknown): DatasetDiagnostic[] {
  const valid = validateGovernanceSchema(value)
  if (!valid) return (validateGovernanceSchema.errors ?? []).map((error: ErrorObject) =>
    diagnostic('DATASET_GOVERNANCE_SCHEMA_INVALID', error.message ?? 'governance record is invalid', error.instancePath || '/'),
  )
  const record = value as DatasetSchemaGovernanceRecord
  if (record.kind === 'DatasetSchemaCandidate') {
    const actual = sha256(record.inferredSchema)
    if (actual.value !== record.inferredSchemaDigest.value) return [diagnostic('DATASET_SCHEMA_CANDIDATE_DIGEST_MISMATCH', 'candidate digest does not match the inferred schema', '/inferredSchemaDigest')]
  }
  return []
}

/** Catalog-backed validation for every dataset trust boundary. */
export class DatasetBoundaryValidator {
  readonly resolver: SchemaResolver
  private readonly validator: SchemaValidator

  constructor(readonly rootDir = defaultRoot) {
    const loaded = loadSchemaCatalog({ rootDir })
    if (!loaded.valid || !loaded.catalog) throw new Error(`DATASET_SCHEMA_CATALOG_INVALID: ${loaded.diagnostics.map(item => item.code).join(',')}`)
    this.resolver = new SchemaResolver(loaded.catalog, { rootDir })
    this.validator = new SchemaValidator(this.resolver, { rootDir })
  }

  validate(boundary: DatasetBoundary, binding: SchemaBinding, value: unknown): DatasetDiagnostic[] {
    const bindingDiagnostics = this.validateBinding(boundary, binding)
    if (bindingDiagnostics.length) return bindingDiagnostics
    return this.validator.validate(binding.id, value).diagnostics.map(item => diagnostic(item.code, item.message, item.path))
  }

  validateBinding(boundary: DatasetBoundary, binding: SchemaBinding): DatasetDiagnostic[] {
    const entry = this.resolver.resolve(binding.id)
    if (!entry) return [diagnostic('DATASET_SCHEMA_BINDING_UNKNOWN', `unknown schema binding ${binding.id}`, '/schema/id')]
    if (binding.version !== entry.artifact.version) return [diagnostic('DATASET_SCHEMA_BINDING_VERSION_MISMATCH', `schema binding version ${binding.version} does not match governed version ${entry.artifact.version}`, '/schema/version')]
    if (!binding.digest) return [diagnostic('DATASET_SCHEMA_BINDING_DIGEST_REQUIRED', `schema digest is required at ${boundary} boundary`, '/schema/digest')]
    const expected = entry.digest?.replace(/^sha256:/, '')
    if (!expected || binding.digest.algorithm !== 'sha256' || binding.digest.value !== expected) return [diagnostic('DATASET_SCHEMA_BINDING_DIGEST_MISMATCH', `schema digest does not match governed authority at ${boundary} boundary`, '/schema/digest')]
    return []
  }
}
