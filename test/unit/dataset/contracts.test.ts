import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'

import {
  DATASET_CONTRACT_VERSION,
  DatasetContractError,
  canonicalDatasetJson,
  computeProcessingPlanDigest,
  computeRunReceiptDigest,
  negotiateDatasetCapabilities,
  validateCheckpointAncestry,
  validateDatasetContract,
  validateDatasetContractSet,
  verifyProcessingPlanDigest,
  verifyRunReceiptDigest,
  type CapabilityProfile,
  type ProcessingPlan,
  type RunReceipt,
} from '../../../src/dataset/index.js'

const root = resolve(import.meta.dirname, '../../..')
const validFixture = JSON.parse(readFileSync(resolve(root, 'test/fixtures/dataset/contracts.valid.json'), 'utf8')) as { contracts: Record<string, unknown>[]; runReceiptOutcomes: string[] }
const invalidFixture = JSON.parse(readFileSync(resolve(root, 'test/fixtures/dataset/contracts.invalid.json'), 'utf8')) as { cases: Array<{ code: string; semanticOnly?: boolean; value: unknown }> }
const schema = JSON.parse(readFileSync(resolve(root, 'schemas/dataset/dataset-contracts.v1.schema.json'), 'utf8')) as Record<string, unknown>
const ajv = new Ajv2020({ strict: true, allErrors: true })
addFormats(ajv)
const validateSchema = ajv.compile(schema)

describe('dataset intelligence contracts (#2234)', () => {
  it('keeps runtime and serialized-schema representations in parity for every contract', () => {
    expect(validFixture.contracts.map((contract) => contract.kind)).toEqual([
      'DatasetSource', 'Dataset', 'DatasetRevision', 'Distribution',
      'CapabilityProfile', 'ProcessingPlan', 'ProcessingRun', 'DerivedArtifact',
      'ProvenanceAssertion', 'Relationship', 'Checkpoint', 'RunReceipt',
    ])
    for (const contract of validFixture.contracts) {
      expect(validateSchema(contract), JSON.stringify(validateSchema.errors)).toBe(true)
      expect(validateDatasetContract(contract)).toMatchObject({ valid: true, diagnostics: [] })
    }
  })

  it('covers every run lifecycle outcome without conflating attempts and commits', () => {
    const base = validFixture.contracts.find((contract) => contract.kind === 'RunReceipt')!
    for (const outcome of validFixture.runReceiptOutcomes) {
      const value = { ...base, id: `receipt:${outcome}`, outcome, committed: outcome === 'committed' }
      expect(validateSchema(value), JSON.stringify(validateSchema.errors)).toBe(true)
      expect(validateDatasetContract(value).valid).toBe(true)
    }
  })

  it('rejects all governed negative fixtures in both representations', () => {
    for (const fixture of invalidFixture.cases) {
      expect(validateSchema(fixture.value), fixture.code).toBe(fixture.semanticOnly === true)
      const result = validateDatasetContract(fixture.value)
      expect(result.valid, fixture.code).toBe(false)
      expect(result.diagnostics.length, fixture.code).toBeGreaterThan(0)
    }
  })

  it('serializes deterministically and binds immutable plan declarations', () => {
    expect(canonicalDatasetJson({ z: 1, a: { y: 2, b: 3 } })).toBe('{"a":{"b":3,"y":2},"z":1}')
    const fixture = validFixture.contracts.find((contract) => contract.kind === 'ProcessingPlan') as unknown as ProcessingPlan
    const plan = { ...fixture, planDigest: computeProcessingPlanDigest(fixture) }
    expect(verifyProcessingPlanDigest(plan)).toBe(true)
    expect(verifyProcessingPlanDigest({ ...plan, createdBy: 'principal:other' })).toBe(false)
    const receiptFixture = validFixture.contracts.find((contract) => contract.kind === 'RunReceipt') as unknown as RunReceipt
    const receipt = { ...receiptFixture, receiptDigest: computeRunReceiptDigest(receiptFixture) }
    expect(verifyRunReceiptDigest(receipt)).toBe(true)
    expect(verifyRunReceiptDigest({ ...receipt, committedRecords: 97 })).toBe(false)
  })

  it('fails closed for required capabilities and reports optional degradation', () => {
    const profile = validFixture.contracts.find((contract) => contract.kind === 'CapabilityProfile') as unknown as CapabilityProfile
    expect(() => negotiateDatasetCapabilities(profile, [])).toThrow(DatasetContractError)
    expect(() => negotiateDatasetCapabilities(profile, [{ name: 'incremental-read', version: '2' }])).toThrow(/required capability/)
    expect(negotiateDatasetCapabilities(profile, [{ name: 'incremental-read', version: '1' }])).toEqual({
      contractVersion: DATASET_CONTRACT_VERSION,
      satisfied: ['incremental-read'],
      degraded: [{ capability: 'vector-index', action: 'disable' }],
    })
  })

  it('rejects duplicate and dangling identities across contract bundles', () => {
    const contracts = validFixture.contracts.map((value) => validateDatasetContract(value).value!)
    expect(validateDatasetContractSet(contracts)).toEqual([])
    const revision = contracts.find((contract) => contract.kind === 'DatasetRevision')!
    const diagnostics = validateDatasetContractSet([...contracts, { ...revision, id: 'revision:other', revisionId: 'revision:other', datasetId: 'dataset:missing' }])
    expect(diagnostics.map((item) => item.code)).toContain('DATASET_REFERENCE_DANGLING')
    expect(validateDatasetContractSet([...contracts, contracts[0]]).map((item) => item.code)).toContain('DATASET_ID_DUPLICATE')
  })

  it('requires checkpoint ancestry to be committed and plan-bound', () => {
    const checkpoint = { ...validFixture.contracts.find((contract) => contract.kind === 'Checkpoint'), priorCommittedReceiptId: 'receipt:orders-0' } as any
    const receipt = validFixture.contracts.find((contract) => contract.kind === 'RunReceipt') as unknown as RunReceipt
    const prior = { ...receipt, id: checkpoint.priorCommittedReceiptId }
    expect(validateCheckpointAncestry(checkpoint, prior)).toEqual([])
    expect(validateCheckpointAncestry(checkpoint).map((item) => item.code)).toContain('DATASET_CHECKPOINT_ANCESTRY_MISSING')
    expect(validateCheckpointAncestry(checkpoint, { ...prior, committed: false, outcome: 'failed' })).toHaveLength(1)
  })
})
