import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import type { DatasetConformanceManifest, DatasetConformanceReceipt } from '../../../src/dataset/conformance-types.js'
import { conformanceDigest, resultDigest, summarizeConformance, verifyConformanceReceipt } from '../../../src/dataset/conformance.js'

const manifest = async () => JSON.parse(await readFile('test/fixtures/dataset-intelligence/v1/manifest.json', 'utf8')) as DatasetConformanceManifest

async function receipt(): Promise<DatasetConformanceReceipt> {
  const value = await manifest()
  const results = value.cells.map(cell => ({ cellId: cell.id, status: cell.maturity === 'stable' ? 'passed' as const : 'pending' as const, ...(cell.maturity === 'stable' ? {} : { diagnostic: cell.expected.diagnostic ?? 'CONFORMANCE_PENDING' }), evidence: cell.evidence.map(kind => ({ kind, reference: cell.fixture.path, digest: cell.fixture.digest })), observed: { networkAttempts: 0 } }))
  return { contract: value.contract, schemaVersion: value.schemaVersion, corpusVersion: value.corpusVersion, manifestDigest: conformanceDigest(value), resultDigest: resultDigest(results), bindings: { aiwgCommit: 'a'.repeat(40), packageDigests: { aiwg: `sha256:${'b'.repeat(64)}` }, schemaDigests: { manifest: `sha256:${'c'.repeat(64)}` }, fixtureDigest: `sha256:${'d'.repeat(64)}`, configurationDigest: `sha256:${'e'.repeat(64)}` }, startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T00:00:01Z', results, summary: summarizeConformance(value, results) }
}

describe('dataset conformance release gate negative controls', () => {
  it('accepts a complete receipt while qualified cells remain visibly pending', async () => expect(verifyConformanceReceipt(await manifest(), await receipt())).toEqual([]))

  it.each([
    ['missing cell', (value: DatasetConformanceReceipt) => { value.results.pop(); value.resultDigest = resultDigest(value.results); value.summary.pending -= 1 }, 'CONFORMANCE_REQUIRED_CELL_MISSING'],
    ['stale manifest', (value: DatasetConformanceReceipt) => { value.manifestDigest = `sha256:${'0'.repeat(64)}` }, 'CONFORMANCE_RECEIPT_STALE'],
    ['digest substitution', (value: DatasetConformanceReceipt) => { value.resultDigest = `sha256:${'0'.repeat(64)}` }, 'CONFORMANCE_RESULT_DIGEST_MISMATCH'],
    ['sensitive output', (value: DatasetConformanceReceipt) => { value.results[0]!.diagnostic = 'password=hunter2'; value.resultDigest = resultDigest(value.results) }, 'CONFORMANCE_SENSITIVE_VALUE'],
  ])('rejects %s', async (_name, mutate, code) => {
    const value = await receipt(); mutate(value)
    expect(verifyConformanceReceipt(await manifest(), value).map(item => item.code)).toContain(code)
  })
})
