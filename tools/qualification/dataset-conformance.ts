import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import {
  DATASET_CONFORMANCE_CONTRACT,
  DATASET_CONFORMANCE_SCHEMA_VERSION,
  type DatasetConformanceCell,
  type DatasetConformanceCellResult,
  type DatasetConformanceManifest,
  type DatasetConformanceReceipt,
} from '../../src/dataset/conformance-types.js'
import { conformanceDigest, resultDigest, summarizeConformance, verifyConformanceReceipt } from '../../src/dataset/conformance.js'
import { CsvAdapter, JsonlAdapter } from '../../src/dataset/adapters.js'
import { request, sha256Digest } from '../../src/dataset/adapter-sdk.js'
import { qualifyAdversarialAdapters, qualifyCapabilityBinding, qualifyCheckpointBoundaries, qualifyOfflineMatrix, qualifyProvenanceBinding, qualifyReplay, qualifyStandardsGoldens } from './dataset-local-cells.js'

interface Arguments { manifest: string; report?: string; mode: 'local' | 'cross-repo' | 'live'; fortemiCheckout?: string; fortemiCommit?: string; verify?: string }

function argumentsFrom(argv: string[]): Arguments {
  const value = (name: string) => { const at = argv.indexOf(name); return at >= 0 ? argv[at + 1] : undefined }
  const mode = (value('--mode') ?? 'local') as Arguments['mode']
  if (!['local', 'cross-repo', 'live'].includes(mode)) throw new Error(`Unsupported mode ${mode}`)
  return { manifest: value('--manifest') ?? 'test/fixtures/dataset-intelligence/v1/manifest.json', report: value('--report'), mode, fortemiCheckout: value('--fortemi-checkout'), fortemiCommit: value('--fortemi-commit'), verify: value('--verify') }
}

async function digestFile(path: string): Promise<string> { return `sha256:${sha256Digest(await readFile(path)).value}` }

async function fixtureEvidence(cell: DatasetConformanceCell) {
  const actual = await digestFile(cell.fixture.path)
  if (actual !== cell.fixture.digest) throw new Error(`CONFORMANCE_FIXTURE_DIGEST_MISMATCH: ${cell.fixture.path}`)
  return { kind: 'fixture' as const, reference: cell.fixture.path, digest: actual }
}

async function runAdapter(cell: DatasetConformanceCell): Promise<DatasetConformanceCellResult> {
  const evidence = await fixtureEvidence(cell)
  const Adapter = cell.sourceClass === 'jsonl' ? JsonlAdapter : CsvAdapter
  const adapter = new Adapter()
  const configured = await adapter.configure({ path: resolve(cell.fixture.path) })
  if (!configured.ok || !configured.config) throw new Error(configured.diagnostics[0]?.code ?? 'ADAPTER_INVALID_CONFIGURATION')
  const adapterRequest = request(cell.id, configured.config, { offline: true, allowedRoot: process.cwd() }, cell.resourceEnvelope)
  const checked = await adapter.check(adapterRequest)
  const discovered = await adapter.discover(adapterRequest)
  const previewed = await adapter.preview({ ...adapterRequest, count: 2 })
  let records = 0
  for await (const event of adapter.read(adapterRequest)) if (event.kind === 'record') records += 1
  const expectedRecords = cell.sourceClass === 'csv' ? 4 : 3
  if (!checked.ok || !discovered.ok || !previewed.ok || records !== expectedRecords) throw new Error('CONFORMANCE_ADAPTER_LIFECYCLE_FAILED')
  return { cellId: cell.id, status: 'passed', evidence: [evidence, { kind: 'real-source', reference: resolve(cell.fixture.path), digest: evidence.digest }], observed: { records, bytes: (await stat(cell.fixture.path)).size, durationMs: 0, networkAttempts: 0 } }
}

async function runBoundCell(cell: DatasetConformanceCell, qualify: () => Promise<void>): Promise<DatasetConformanceCellResult> {
  const evidence = await fixtureEvidence(cell)
  await qualify()
  return { cellId: cell.id, status: 'passed', evidence: [evidence], observed: { records: 0, bytes: (await stat(cell.fixture.path)).size, durationMs: 0, networkAttempts: 0 } }
}

async function pending(cell: DatasetConformanceCell): Promise<DatasetConformanceCellResult> {
  return { cellId: cell.id, status: 'pending', diagnostic: cell.expected.diagnostic ?? 'CONFORMANCE_EVIDENCE_PENDING', evidence: [await fixtureEvidence(cell)], observed: { networkAttempts: 0 } }
}

async function runFortemiParity(cell: DatasetConformanceCell, checkout: string, commit: string): Promise<DatasetConformanceCellResult> {
  const fixture = await fixtureEvidence(cell)
  execFileSync('pnpm', ['--dir', checkout, '--filter', '@fortemi/core', 'exec', 'vitest', 'run',
    'src/__tests__/dataset-execution-capabilities.test.ts',
    'src/__tests__/dataset-ingest.test.ts',
    'src/__tests__/dataset-lineage.test.ts',
    'src/__tests__/dataset-materialization-profiles.test.ts'], { stdio: 'inherit' })
  const lockDigest = await digestFile(resolve(checkout, 'pnpm-lock.yaml'))
  return { cellId: cell.id, status: 'passed', evidence: [fixture, { kind: 'cross-repo', reference: `${checkout}@${commit}`, digest: lockDigest }], observed: { records: 0, bytes: (await stat(cell.fixture.path)).size, durationMs: 0, networkAttempts: 0 } }
}

async function main() {
  const args = argumentsFrom(process.argv.slice(2))
  const manifest = JSON.parse(await readFile(args.manifest, 'utf8')) as DatasetConformanceManifest
  if (args.verify) {
    const receipt = JSON.parse(await readFile(args.verify, 'utf8')) as DatasetConformanceReceipt
    const diagnostics = verifyConformanceReceipt(manifest, receipt)
    console.log(JSON.stringify({ valid: diagnostics.length === 0, diagnostics }, null, 2))
    process.exitCode = diagnostics.length === 0 ? 0 : 1
    return
  }
  if (args.mode === 'live') throw new Error('CONFORMANCE_LIVE_AUTHORIZATION_REQUIRED: live qualification is owned by #2194')
  if (args.mode === 'cross-repo') {
    if (!args.fortemiCheckout || !args.fortemiCommit || !/^[0-9a-f]{40}$/u.test(args.fortemiCommit)) throw new Error('CONFORMANCE_PINNED_FORTEMI_REQUIRED')
    const actual = execFileSync('git', ['-C', args.fortemiCheckout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    if (actual !== args.fortemiCommit) throw new Error(`CONFORMANCE_FORTEMI_COMMIT_MISMATCH: expected ${args.fortemiCommit}, received ${actual}`)
  }
  const startedAt = new Date().toISOString()
  const results: DatasetConformanceCellResult[] = []
  for (const cell of manifest.cells) {
    try {
      if (cell.id.startsWith('adapter.')) results.push(await runAdapter(cell))
      else if (cell.id === 'capability.plan-binding') results.push(await runBoundCell(cell, qualifyCapabilityBinding))
      else if (cell.id === 'replay.orchestration') results.push(await runBoundCell(cell, qualifyReplay))
      else if (cell.id === 'checkpoint.crash-boundaries') results.push(await runBoundCell(cell, qualifyCheckpointBoundaries))
      else if (cell.id === 'security.adapter-adversarial') results.push(await runBoundCell(cell, qualifyAdversarialAdapters))
      else if (cell.id === 'offline.cache-matrix') results.push(await runBoundCell(cell, qualifyOfflineMatrix))
      else if (cell.id === 'provenance.complete') results.push(await runBoundCell(cell, qualifyProvenanceBinding))
      else if (cell.id === 'standards.prov-openlineage') results.push(await runBoundCell(cell, qualifyStandardsGoldens))
      else if (cell.id === 'parity.fortemi-core' && args.mode === 'cross-repo' && args.fortemiCheckout && args.fortemiCommit) results.push(await runFortemiParity(cell, args.fortemiCheckout, args.fortemiCommit))
      else results.push(await pending(cell))
    } catch (error) {
      results.push({ cellId: cell.id, status: 'failed', diagnostic: error instanceof Error ? error.message : 'CONFORMANCE_UNKNOWN_FAILURE', evidence: [], observed: { networkAttempts: 0 } })
    }
  }
  const schemaPaths = ['schemas/dataset/conformance-manifest.v1.schema.json', 'schemas/dataset/conformance-receipt.v1.schema.json']
  const receipt: DatasetConformanceReceipt = {
    contract: DATASET_CONFORMANCE_CONTRACT, schemaVersion: DATASET_CONFORMANCE_SCHEMA_VERSION, corpusVersion: manifest.corpusVersion,
    manifestDigest: conformanceDigest(manifest), resultDigest: resultDigest(results),
    bindings: {
      aiwgCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      ...(args.mode === 'cross-repo' ? { fortemiCommit: args.fortemiCommit } : {}),
      packageDigests: { aiwg: await digestFile('package-lock.json'), ...(args.fortemiCheckout ? { fortemi: await digestFile(resolve(args.fortemiCheckout, 'pnpm-lock.yaml')) } : {}) },
      schemaDigests: Object.fromEntries(await Promise.all(schemaPaths.map(async path => [path, await digestFile(path)]))),
      fixtureDigest: await digestFile('test/fixtures/dataset-intelligence/v1/digest-manifest.json'),
      configurationDigest: conformanceDigest({ mode: args.mode }),
    },
    startedAt, endedAt: new Date().toISOString(), results, summary: summarizeConformance(manifest, results),
  }
  const output = `${JSON.stringify(receipt, null, 2)}\n`
  if (args.report) {
    await mkdir(dirname(resolve(args.report)), { recursive: true })
    await writeFile(args.report, output)
  } else process.stdout.write(output)
  if (receipt.summary.failed > 0) process.exitCode = 1
}

await main()
