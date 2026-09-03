import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'

import {
  DATASET_CONTRACT_SCHEMA_ID,
  DatasetBoundaryValidator,
  assessDatasetSchemaImpact,
  createDatasetSchemaCandidate,
  promoteDatasetSchemaCandidate,
  validateDatasetGovernanceRecord,
  type Digest,
  type ProcessingPlan,
} from '../../../src/dataset/index.js'
import { loadSchemaCatalog, SchemaResolver } from '../../../src/schema/index.js'

const root = resolve(import.meta.dirname, '../../..')
const valid = JSON.parse(readFileSync(resolve(root, 'test/fixtures/dataset/schema-governance.valid.json'), 'utf8')) as { records: unknown[] }
const invalid = JSON.parse(readFileSync(resolve(root, 'test/fixtures/dataset/schema-governance.invalid.json'), 'utf8')) as { cases: Array<{ code: string; value: unknown }> }
const governanceSchema = JSON.parse(readFileSync(resolve(root, 'schemas/dataset/dataset-schema-governance.v1.schema.json'), 'utf8')) as Record<string, unknown>
const contractFixture = JSON.parse(readFileSync(resolve(root, 'test/fixtures/dataset/contracts.valid.json'), 'utf8')) as { contracts: Record<string, unknown>[] }

describe('dataset schema governance (#2237)', () => {
  it('registers both dataset authorities with fixtures and runtime/type projections', () => {
    const loaded = loadSchemaCatalog({ rootDir: root })
    expect(loaded.valid, JSON.stringify(loaded.diagnostics)).toBe(true)
    const resolver = new SchemaResolver(loaded.catalog!, { rootDir: root })
    for (const name of ['dataset.contracts', 'dataset.schema-governance']) {
      const entry = resolver.require(name === 'dataset.contracts' ? DATASET_CONTRACT_SCHEMA_ID : `${name}@1.0.0`)
      expect(entry.artifact.fixtures?.valid).toHaveLength(1)
      expect(entry.artifact.fixtures?.invalid).toHaveLength(1)
      expect(entry.artifact.projections?.map(item => item.kind)).toEqual(['types', 'validator'])
    }
  })

  it('keeps governance JSON Schema and runtime validation in parity', () => {
    const ajv = new Ajv2020({ strict: true, allErrors: true })
    addFormats(ajv)
    const validate = ajv.compile(governanceSchema)
    for (const record of valid.records) {
      expect(validate(record), JSON.stringify(validate.errors)).toBe(true)
      expect(validateDatasetGovernanceRecord(record)).toEqual([])
    }
    for (const fixture of invalid.cases) {
      expect(validate(fixture.value), fixture.code).toBe(false)
      expect(validateDatasetGovernanceRecord(fixture.value).length, fixture.code).toBeGreaterThan(0)
    }
  })

  it('keeps inferred schemas candidates until a digest-bound human review promotes them', () => {
    const candidate = createDatasetSchemaCandidate({
      id: 'candidate:orders:1', sourceRevisionId: 'revision:orders:1',
      inferredSchema: { type: 'object', required: ['id'] },
      inference: { method: 'sample', tool: 'adapter:csv', toolVersion: '1.0.0' }, observedAt: '2026-09-02T12:00:00Z',
    })
    expect(candidate.status).toBe('candidate')
    expect(validateDatasetGovernanceRecord(candidate)).toEqual([])
    expect(validateDatasetGovernanceRecord({ ...candidate, inferredSchema: { type: 'string' } })[0]?.code).toBe('DATASET_SCHEMA_CANDIDATE_DIGEST_MISMATCH')
    const promoted = promoteDatasetSchemaCandidate(candidate, {
      id: 'promotion:orders:1',
      promotedSchema: { id: 'https://example.test/orders', version: '1.0.0', digest: { algorithm: 'sha256', value: 'a'.repeat(64) } },
      reviewer: 'principal:reviewer', reviewedAt: '2026-09-02T13:00:00Z', decisionEvidence: 'decision:orders:1',
      compatibility: { status: 'unknown', reasons: ['first governed revision'] },
    })
    expect(promoted).toMatchObject({ status: 'promoted', candidateId: candidate.id, candidateDigest: candidate.inferredSchemaDigest })
    expect(() => promoteDatasetSchemaCandidate({ ...candidate, inferredSchema: { type: 'string' } }, { ...promoted, candidateId: undefined as never, candidateDigest: undefined as never })).toThrow('DATASET_SCHEMA_CANDIDATE_DIGEST_MISMATCH')
  })

  it('requires compatibility analysis across adapters, state, plans, indexes, artifacts, and consumers', () => {
    const report = assessDatasetSchemaImpact(
      'https://example.test/orders', 'git:baseline',
      { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      { type: 'object', properties: { id: { type: 'string' }, currency: { type: 'string' } }, required: ['id', 'currency'] },
    )
    expect(report.compatibility.status).toBe('breaking')
    expect(report.targets.map(item => item.target)).toEqual(['adapter', 'checkpoint-state', 'processing-plan', 'index', 'derived-artifact', 'consumer'])
    expect(report.targets.every(item => item.disposition === 'migration-required')).toBe(true)
    expect(validateDatasetGovernanceRecord(report)).toEqual([])
  })

  it('fails closed on missing, stale, or mismatched bindings at trust boundaries', () => {
    const boundary = new DatasetBoundaryValidator(root)
    const entry = boundary.resolver.require(DATASET_CONTRACT_SCHEMA_ID)
    const plan = contractFixture.contracts.find(item => item.kind === 'ProcessingPlan') as unknown as ProcessingPlan
    const digest: Digest = { algorithm: 'sha256', value: entry.digest!.replace('sha256:', '') }
    expect(boundary.validate('processing-plan', { id: entry.artifact.id, version: entry.artifact.version, digest }, plan)).toEqual([])
    expect(boundary.validate('processing-plan', { id: entry.artifact.id, version: entry.artifact.version }, plan)[0]?.code).toBe('DATASET_SCHEMA_BINDING_DIGEST_REQUIRED')
    expect(boundary.validate('processing-plan', { id: entry.artifact.id, version: '2.0.0', digest }, plan)[0]?.code).toBe('DATASET_SCHEMA_BINDING_VERSION_MISMATCH')
    expect(boundary.validate('processing-plan', { id: entry.artifact.id, version: entry.artifact.version, digest: { algorithm: 'sha256', value: '0'.repeat(64) } }, plan)[0]?.code).toBe('DATASET_SCHEMA_BINDING_DIGEST_MISMATCH')
    expect(boundary.validate('processing-plan', { id: entry.artifact.id, version: entry.artifact.version, digest }, { ...plan, kind: 'unknown' })[0]?.code).toBe('SCHEMA_INSTANCE_INVALID')
  })
})
