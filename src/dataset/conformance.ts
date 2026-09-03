import { createHash } from 'node:crypto'
import type {
  DatasetConformanceCellResult,
  DatasetConformanceDiagnostic,
  DatasetConformanceManifest,
  DatasetConformanceReceipt,
} from './conformance-types.js'
import { DATASET_CONFORMANCE_CONTRACT } from './conformance-types.js'

const SHA256 = /^sha256:[0-9a-f]{64}$/u
const SECRET = /(?:(?:password|passwd|api[-_]?key|authorization)\s*[:=]\s*[^\s"}]+|bearer\s+[a-z0-9._~+/-]+|-----BEGIN [A-Z ]+PRIVATE KEY-----)/iu

export function canonicalConformanceJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalConformanceJson).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalConformanceJson(item)}`).join(',')}}`
}

export function conformanceDigest(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalConformanceJson(value)).digest('hex')}`
}

export function resultDigest(results: DatasetConformanceCellResult[]): string {
  return conformanceDigest([...results].sort((a, b) => a.cellId.localeCompare(b.cellId)).map(result => ({
    cellId: result.cellId,
    status: result.status,
    diagnostic: result.diagnostic,
    evidence: [...result.evidence].sort((a, b) => `${a.kind}:${a.reference}`.localeCompare(`${b.kind}:${b.reference}`)),
    observed: result.observed,
  })))
}

export function validateConformanceManifest(manifest: DatasetConformanceManifest): DatasetConformanceDiagnostic[] {
  const diagnostics: DatasetConformanceDiagnostic[] = []
  if (manifest.contract !== DATASET_CONFORMANCE_CONTRACT || !/^1\./u.test(manifest.schemaVersion) || !manifest.corpusVersion) {
    diagnostics.push({ code: 'CONFORMANCE_MANIFEST_INVALID', path: '/', message: 'Unsupported contract, schema version, or empty corpus version.' })
  }
  const seen = new Set<string>()
  manifest.cells.forEach((cell, index) => {
    const path = `/cells/${index}`
    if (!cell.id || seen.has(cell.id)) diagnostics.push({ code: 'CONFORMANCE_CELL_DUPLICATE', path: `${path}/id`, message: `Cell id ${cell.id || '<empty>'} is not unique.` })
    seen.add(cell.id)
    if (!SHA256.test(cell.fixture.digest)) diagnostics.push({ code: 'CONFORMANCE_MANIFEST_INVALID', path: `${path}/fixture/digest`, message: 'Fixture digest must be sha256.' })
    if (!cell.resourceEnvelope || cell.resourceEnvelope.maxBytes < 1 || cell.resourceEnvelope.maxRecords < 1 || cell.resourceEnvelope.maxDurationMs < 1) {
      diagnostics.push({ code: 'CONFORMANCE_RESOURCE_ENVELOPE_MISSING', path: `${path}/resourceEnvelope`, message: 'Every cell requires positive byte, record, and duration bounds.' })
    }
    if (cell.maturity === 'stable' && !cell.evidence.some(kind => kind === 'real-source' || kind === 'cross-repo' || kind === 'live-qualification')) {
      diagnostics.push({ code: 'CONFORMANCE_MOCK_ONLY_STABLE', path: `${path}/evidence`, message: 'Stable cells require non-fixture evidence.' })
    }
    if (cell.runtimeClass === 'fortemi-server' && cell.maturity === 'stable' && !cell.liveAuthorizationRequired) {
      diagnostics.push({ code: 'CONFORMANCE_MANIFEST_INVALID', path: `${path}/liveAuthorizationRequired`, message: 'Stable server cells must declare the live authorization gate.' })
    }
  })
  return diagnostics
}

export function summarizeConformance(manifest: DatasetConformanceManifest, results: DatasetConformanceCellResult[]) {
  const passed = results.filter(result => result.status === 'passed').length
  const failed = results.filter(result => result.status === 'failed').length
  const pending = results.filter(result => result.status === 'pending').length
  const releaseIds = new Set(manifest.cells.filter(cell => cell.maturity !== 'experimental').map(cell => cell.id))
  const stableEligible = failed === 0 && [...releaseIds].every(id => results.some(result => result.cellId === id && result.status === 'passed'))
  return { passed, failed, pending, stableEligible }
}

export function verifyConformanceReceipt(manifest: DatasetConformanceManifest, receipt: DatasetConformanceReceipt): DatasetConformanceDiagnostic[] {
  const diagnostics = validateConformanceManifest(manifest)
  if (receipt.manifestDigest !== conformanceDigest(manifest) || receipt.corpusVersion !== manifest.corpusVersion) {
    diagnostics.push({ code: 'CONFORMANCE_RECEIPT_STALE', path: '/manifestDigest', message: 'Receipt does not bind the current manifest and corpus.' })
  }
  if (receipt.resultDigest !== resultDigest(receipt.results)) diagnostics.push({ code: 'CONFORMANCE_RESULT_DIGEST_MISMATCH', path: '/resultDigest', message: 'Result digest does not match canonical results.' })
  if (!SHA256.test(receipt.bindings.aiwgCommit) && !/^[0-9a-f]{40}$/u.test(receipt.bindings.aiwgCommit)) diagnostics.push({ code: 'CONFORMANCE_RECEIPT_UNVERIFIABLE', path: '/bindings/aiwgCommit', message: 'AIWG commit binding is invalid.' })
  if (Object.keys(receipt.bindings.packageDigests).length === 0 || Object.keys(receipt.bindings.schemaDigests).length === 0) diagnostics.push({ code: 'CONFORMANCE_RECEIPT_UNVERIFIABLE', path: '/bindings', message: 'Package and schema digest bindings are required.' })
  const resultById = new Map(receipt.results.map(result => [result.cellId, result]))
  manifest.cells.forEach(cell => {
    const result = resultById.get(cell.id)
    if (!result) diagnostics.push({ code: 'CONFORMANCE_REQUIRED_CELL_MISSING', path: `/results/${cell.id}`, message: `Required cell ${cell.id} is missing.` })
    else if (result.status === 'failed') diagnostics.push({ code: 'CONFORMANCE_RESULT_FAILED', path: `/results/${cell.id}`, message: `Cell ${cell.id} failed: ${result.diagnostic ?? 'no diagnostic'}.` })
    else if (result.status === 'pending' && cell.maturity === 'stable') diagnostics.push({ code: 'CONFORMANCE_PENDING_STABLE_CELL', path: `/results/${cell.id}`, message: `Stable cell ${cell.id} cannot be pending.` })
    else if (result.status === 'passed' && cell.evidence.some(required => !result.evidence.some(item => item.kind === required))) diagnostics.push({ code: 'CONFORMANCE_EVIDENCE_WEAKENED', path: `/results/${cell.id}/evidence`, message: `Cell ${cell.id} lacks a required evidence kind.` })
  })
  if (SECRET.test(JSON.stringify(receipt))) diagnostics.push({ code: 'CONFORMANCE_SENSITIVE_VALUE', path: '/', message: 'Receipt contains a secret-like value.' })
  const summary = summarizeConformance(manifest, receipt.results)
  if (canonicalConformanceJson(summary) !== canonicalConformanceJson(receipt.summary)) diagnostics.push({ code: 'CONFORMANCE_RECEIPT_UNVERIFIABLE', path: '/summary', message: 'Receipt summary is inconsistent with results.' })
  return diagnostics
}
