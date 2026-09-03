import { resolve } from 'node:path'
import { FileAdapter, HttpAdapter, JsonlAdapter } from '../../src/dataset/adapters.js'
import { request } from '../../src/dataset/adapter-sdk.js'
import { computeProcessingPlanDigest } from '../../src/dataset/contracts.js'
import { LocalDatasetExecutionBackend } from '../../src/dataset/local-execution-backend.js'
import { MemoryDatasetOrchestrationRepository } from '../../src/dataset/orchestration-repository.js'
import { DatasetOrchestrationService } from '../../src/dataset/orchestration-service.js'
import { DATASET_CONTRACT_VERSION, type CapabilityProfile, type ProcessingPlan } from '../../src/dataset/types.js'
import { exportStandard, importStandard } from '../../src/dataset/standards.js'

const ROOT = process.cwd()
const SOURCE = resolve(ROOT, 'test/fixtures/dataset-intelligence/v1/sources/records.jsonl')
const profile = (optional = false): CapabilityProfile => ({
  contractVersion: DATASET_CONTRACT_VERSION, kind: 'CapabilityProfile', id: `profile:conformance:${optional}`,
  capabilities: [
    { name: 'incremental-read', requirement: 'required', acceptedVersions: ['1'], degradation: { action: 'fail' } },
    ...(optional ? [{ name: 'index.vector', requirement: 'optional' as const, degradation: { action: 'disable' as const } }] : []),
  ],
})

async function planned(backend = new LocalDatasetExecutionBackend()) {
  const repo = new MemoryDatasetOrchestrationRepository()
  const service = new DatasetOrchestrationService(repo, { adapter: () => new JsonlAdapter(), localBackend: backend, now: () => '2026-09-03T00:00:00Z' })
  await service.source({ id: 'source:conformance', revisionId: 'revision:conformance', adapter: { id: 'aiwg.adapter.jsonl', version: '1.0.0' }, config: { path: SOURCE }, policy: { offline: true, allowedRoot: ROOT } })
  const result = await service.plan({ id: 'plan:conformance', sourceId: 'source:conformance', profile: profile(true), schemas: [{ id: 'schema:conformance', version: '1.0.0' }], policy: { privacy: 'internal', intendedUse: ['conformance'], locality: 'local-only', network: 'offline', authorizationRefs: [] }, steps: [{ id: 'step:materialize', operation: 'materialize', implementation: { id: 'local', version: '1' }, configDigest: { algorithm: 'sha256', value: 'a'.repeat(64) } }], artifactClasses: ['regenerable-index'], createdBy: 'conformance', estimates: { reads: 3, writes: 3 } })
  if (!result.ok) throw new Error(result.diagnostics[0]?.code ?? 'CONFORMANCE_PLAN_FAILED')
  return { repo, service, plan: result.data as ProcessingPlan }
}

export async function qualifyCapabilityBinding(): Promise<void> {
  const { service, plan } = await planned()
  if (!plan.capabilityDecision.degraded.some(item => item.capability === 'index.vector')) throw new Error('CONFORMANCE_OPTIONAL_DEGRADATION_UNBOUND')
  const mutated = { ...plan, estimates: { reads: 4, writes: 3 } }
  if (computeProcessingPlanDigest(mutated).value === plan.planDigest.value) throw new Error('CONFORMANCE_PLAN_DECISION_UNBOUND')
  const repo = new MemoryDatasetOrchestrationRepository()
  const strictService = new DatasetOrchestrationService(repo, { adapter: () => new JsonlAdapter(), localBackend: new LocalDatasetExecutionBackend() })
  await strictService.source({ id: 'source:strict', revisionId: 'r', adapter: { id: 'aiwg.adapter.jsonl', version: '1.0.0' }, config: { path: SOURCE }, policy: { offline: true, allowedRoot: ROOT } })
  const strict = await strictService.plan({ id: 'plan:strict', sourceId: 'source:strict', profile: { ...profile(), capabilities: [{ name: 'index.vector', requirement: 'required', degradation: { action: 'fail' } }] }, schemas: [], policy: { privacy: 'internal', intendedUse: ['conformance'], locality: 'local-only', network: 'offline', authorizationRefs: [] }, steps: [{ id: 's', operation: 'index', implementation: { id: 'local', version: '1' }, configDigest: { algorithm: 'sha256', value: 'b'.repeat(64) } }], artifactClasses: ['regenerable-index'], createdBy: 'conformance' })
  if (strict.ok || strict.diagnostics[0]?.code !== 'DATASET_REQUIRED_CAPABILITY_UNSUPPORTED') throw new Error('CONFORMANCE_REQUIRED_CAPABILITY_DID_NOT_FAIL_CLOSED')
}

export async function qualifyReplay(): Promise<void> {
  const { repo, service, plan } = await planned()
  const first = await service.ingest({ planId: plan.id, planDigest: plan.planDigest.value, idempotencyKey: 'conformance:once' })
  const replay = await service.ingest({ planId: plan.id, planDigest: plan.planDigest.value, idempotencyKey: 'conformance:once' })
  if (!first.ok || JSON.stringify(first.data) !== JSON.stringify(replay.data) || repo.runs.size !== 1) throw new Error('CONFORMANCE_EXACT_REPLAY_CHANGED_STATE')
  const other = { ...plan, id: 'plan:other' }; other.planDigest = computeProcessingPlanDigest(other); await repo.putPlan(other)
  const conflict = await service.ingest({ planId: other.id, planDigest: other.planDigest.value, idempotencyKey: 'conformance:once' })
  if (conflict.diagnostics[0]?.code !== 'DATASET_IDEMPOTENCY_CONFLICT') throw new Error('CONFORMANCE_IDEMPOTENCY_CONFLICT_NOT_REJECTED')
}

export async function qualifyCheckpointBoundaries(): Promise<void> {
  for (const outcome of ['failed', 'cancelled', 'ambiguous'] as const) {
    const backend = { id: 'local', capabilities: () => [{ name: 'incremental-read', version: '1' }], execute: async () => ({ outcome, attemptedRecords: 3, committedRecords: 0, rejectedRecords: 0, checkpoint: { forbidden: true }, diagnostics: [] }) }
    const { service, plan } = await planned(backend as never)
    const result = await service.ingest({ planId: plan.id, planDigest: plan.planDigest.value, idempotencyKey: `conformance:${outcome}` })
    if (!result.ok || (result.data as { checkpoint?: unknown }).checkpoint !== undefined) throw new Error(`CONFORMANCE_CHECKPOINT_ADVANCED_${outcome.toUpperCase()}`)
  }
  const { service, plan } = await planned()
  const committed = await service.ingest({ planId: plan.id, planDigest: plan.planDigest.value, idempotencyKey: 'conformance:commit' })
  if (!committed.ok || !(await service.verify((committed.data as { runId: string }).runId)).ok) throw new Error('CONFORMANCE_COMMIT_UNVERIFIED')
}

export async function qualifyProvenanceBinding(): Promise<void> {
  const { service, plan } = await planned()
  const ingested = await service.ingest({ planId: plan.id, planDigest: plan.planDigest.value, idempotencyKey: 'conformance:lineage' })
  if (!ingested.ok) throw new Error('CONFORMANCE_PROVENANCE_INGEST_FAILED')
  const lineage = await service.lineage((ingested.data as { runId: string }).runId)
  const value = lineage.data as { sourceRevisionId?: string; principal?: string; adapter?: { configDigest?: unknown }; schemas?: unknown[]; validation?: { valid?: boolean }; records?: unknown[] }
  if (!lineage.ok || value.sourceRevisionId !== 'revision:conformance' || value.principal !== 'conformance' || !value.adapter?.configDigest || !value.schemas?.length || value.validation?.valid !== true || value.records?.length !== 3) throw new Error('CONFORMANCE_PROVENANCE_BINDING_INCOMPLETE')
}

export async function qualifyOfflineMatrix(): Promise<void> {
  let attempts = 0
  const adapter = new HttpAdapter(async () => { attempts += 1; throw new Error('NETWORK_ATTEMPTED_OFFLINE') })
  for (const [state, code] of [['stale', 'DATASET_OFFLINE_STALE'], ['corrupt', 'DATASET_OFFLINE_CORRUPT'], ['wrong-revision', 'DATASET_OFFLINE_WRONG_REVISION'], ['unverifiable', 'DATASET_OFFLINE_UNVERIFIABLE']] as const) {
    const repo = new MemoryDatasetOrchestrationRepository(); const service = new DatasetOrchestrationService(repo, { adapter: () => adapter, localBackend: new LocalDatasetExecutionBackend() })
    await service.source({ id: state, revisionId: 'r1', adapter: { id: 'aiwg.adapter.http', version: '1.0.0' }, config: { url: 'https://allowed.example/data' }, policy: { offline: true }, cache: { state } })
    if ((await service.check(state, true)).diagnostics[0]?.code !== code) throw new Error(`CONFORMANCE_OFFLINE_${state.toUpperCase()}_COLLAPSED`)
  }
  const repo = new MemoryDatasetOrchestrationRepository(); const service = new DatasetOrchestrationService(repo, { adapter: () => adapter, localBackend: new LocalDatasetExecutionBackend() })
  await service.source({ id: 'warm', revisionId: 'r1', identity: 'cached:r1', adapter: { id: 'aiwg.adapter.http', version: '1.0.0' }, config: { url: 'https://allowed.example/data' }, policy: { offline: true }, cache: { state: 'warm-verified', records: [] } })
  if (!(await service.check('warm', true)).ok || attempts !== 0) throw new Error('CONFORMANCE_OFFLINE_NETWORK_ATTEMPTED')
}

export async function qualifyAdversarialAdapters(): Promise<void> {
  const secret = await new HttpAdapter().configure({ url: 'https://allowed.example/data', password: 'SYNTHETIC_CREDENTIAL_DO_NOT_LOG' })
  if (secret.ok || secret.diagnostics[0]?.code !== 'ADAPTER_SECRET_REJECTED') throw new Error('CONFORMANCE_SECRET_REJECTION_FAILED')
  const traversal = await new FileAdapter().check(request('traversal', { path: '../escape' }, { offline: true, allowedRoot: resolve(ROOT, 'test/fixtures/dataset-intelligence/v1/sources') }))
  if (traversal.diagnostics[0]?.code !== 'ADAPTER_PATH_ESCAPE') throw new Error('CONFORMANCE_TRAVERSAL_NOT_REJECTED')
  let fetches = 0
  const ssrf = new HttpAdapter(async () => { fetches += 1; return new Response('{}') }, async () => [{ address: '127.0.0.1' }])
  const configured = await ssrf.configure({ url: 'https://allowed.example/data' })
  const checked = await ssrf.check(request('ssrf', configured.config!, { offline: false, allowedHosts: ['allowed.example'] }))
  if (checked.diagnostics[0]?.code !== 'ADAPTER_NETWORK_PROHIBITED' || fetches !== 0) throw new Error('CONFORMANCE_SSRF_NOT_REJECTED_PRECONNECT')
}

export async function qualifyStandardsGoldens(): Promise<void> {
  for (const [standard, version, path] of [['w3c-prov-json', '2013-04-30', 'test/fixtures/dataset/standards/prov-json-20130430.valid.json'], ['openlineage', '1.0.0', 'test/fixtures/dataset/standards/openlineage-1.0.0.valid.json']] as const) {
    const document = JSON.parse(await (await import('node:fs/promises')).readFile(path, 'utf8'))
    const imported = importStandard(standard, version, document)
    const exported = exportStandard(standard, version, imported.value)
    if (!exported.loss || exported.profile.id.length === 0) throw new Error(`CONFORMANCE_STANDARDS_LOSS_REPORT_MISSING:${standard}`)
  }
}
