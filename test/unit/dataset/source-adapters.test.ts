import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AdapterRegistry,
  CsvAdapter,
  DATASET_ADAPTER_CONTRACT_VERSION,
  DEFAULT_ADAPTER_LIMITS,
  DirectoryAdapter,
  FileAdapter,
  HttpAdapter,
  JsonlAdapter,
  qualifyAdapter,
  redactAdapterValue,
  request,
  type AdapterCheckpoint,
  type AdapterReadEvent,
  type DatasetSourceAdapter,
} from '../../../src/dataset/index.js'
import { loadSchemaCatalog, SchemaResolver } from '../../../src/schema/index.js'

const root = resolve(import.meta.dirname, '../../..')
const sourceRoot = resolve(root, 'test/fixtures/dataset/adapters/sources')
const temporary: string[] = []
const publicResolver = async () => [{ address: '203.0.113.10' }]

afterEach(async () => { await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

async function events(adapter: DatasetSourceAdapter, value: ReturnType<typeof request> & { checkpoint?: AdapterCheckpoint }): Promise<AdapterReadEvent[]> {
  const found: AdapterReadEvent[] = []
  for await (const event of adapter.read(value)) found.push(event)
  return found
}

describe('dataset source adapter SDK (#2240)', () => {
  const sharedCases: Array<{ name: string; create: () => DatasetSourceAdapter; config: Record<string, unknown>; policy: { offline: boolean; allowedRoot?: string; allowedHosts?: string[] } }> = [
    { name: 'file', create: () => new FileAdapter(), config: { path: 'plain.txt' }, policy: { offline: true, allowedRoot: sourceRoot } },
    { name: 'directory', create: () => new DirectoryAdapter(), config: { path: '.', recursive: true }, policy: { offline: true, allowedRoot: sourceRoot } },
    { name: 'jsonl', create: () => new JsonlAdapter(), config: { path: 'records.jsonl' }, policy: { offline: true, allowedRoot: sourceRoot } },
    { name: 'csv', create: () => new CsvAdapter(), config: { path: 'records.csv' }, policy: { offline: true, allowedRoot: sourceRoot } },
    { name: 'http', create: () => new HttpAdapter(async () => new Response('remote'), publicResolver), config: { url: 'https://data.example.test/source' }, policy: { offline: false, allowedHosts: ['data.example.test'] } },
  ]

  it.each(sharedCases)('passes the unchanged lifecycle contract for $name', async ({ create, config, policy }) => {
    const adapter = create(); const configured = await adapter.configure(config)
    expect(configured).toMatchObject({ ok: true, diagnostics: [] })
    const base = request(`shared:${adapter.describe().id}`, configured.config!, policy)
    expect(await adapter.check(base)).toMatchObject({ ok: true, diagnostics: [] })
    expect(await adapter.discover(base)).toMatchObject({ ok: true, diagnostics: [] })
    expect(await adapter.preview({ ...base, count: 1 })).toMatchObject({ ok: true, diagnostics: [] })
    const output = await events(adapter, base)
    expect(output.some(item => item.kind === 'record')).toBe(true)
    expect(output.at(-1)?.kind).toBe('checkpoint')
  })

  it('publishes governed, versioned manifests for every builtin adapter', async () => {
    const schema = JSON.parse(await readFile(resolve(root, 'schemas/dataset/source-adapter.v1.schema.json'), 'utf8')) as Record<string, unknown>
    const ajv = new Ajv2020({ strict: true, allErrors: true }); addFormats(ajv)
    const validate = ajv.compile(schema)
    const adapters = [new FileAdapter(), new DirectoryAdapter(), new JsonlAdapter(), new CsvAdapter(), new HttpAdapter()]
    for (const adapter of adapters) {
      const manifest = adapter.describe()
      expect(validate(manifest), `${manifest.id}: ${JSON.stringify(validate.errors)}`).toBe(true)
      expect(manifest.schemas.config.digest.value).toMatch(/^[a-f0-9]{64}$/u)
      expect(manifest.incremental).toMatchObject({ ordering: expect.any(String), lateArrivals: expect.any(String), tombstones: expect.any(String) })
    }
  })

  it('keeps check, discovery, and preview pure while reads emit resumable checkpoints', async () => {
    const adapter = new JsonlAdapter()
    const configured = await adapter.configure({ path: 'records.jsonl' })
    expect(configured.ok).toBe(true)
    const base = request('request:jsonl', configured.config!, { offline: true, allowedRoot: sourceRoot })
    expect((await adapter.check(base)).ok).toBe(true)
    const discovery = await adapter.discover(base)
    expect(discovery.value).toMatchObject({ schemaBasis: 'inferred', checkpointSupport: true, identityStability: 'stable' })
    const firstPreview = await adapter.preview({ ...base, count: 2 })
    const secondPreview = await adapter.preview({ ...base, count: 2 })
    expect(firstPreview.value).toEqual(secondPreview.value)
    expect(JSON.stringify(firstPreview)).not.toContain('AdapterCheckpoint')

    const first = await events(adapter, base)
    expect(first.filter(item => item.kind === 'record')).toHaveLength(4)
    const saved = first.find(item => item.kind === 'checkpoint')
    expect(saved?.kind).toBe('checkpoint')
    const resumed = await events(adapter, { ...base, checkpoint: (saved as { kind: 'checkpoint'; checkpoint: AdapterCheckpoint }).checkpoint })
    expect(resumed.filter(item => item.kind === 'record')).toHaveLength(0)
    expect(resumed.at(-1)?.kind).toBe('checkpoint')
  })

  it('reads file, directory, JSONL, and CSV sources deterministically within limits', async () => {
    const cases = [
      [new FileAdapter(), { path: 'plain.txt' }, 1],
      [new DirectoryAdapter(), { path: '.', recursive: true }, 5],
      [new JsonlAdapter(), { path: 'records.jsonl' }, 4],
      [new CsvAdapter(), { path: 'records.csv' }, 3],
    ] as const
    for (const [adapter, config, minimum] of cases) {
      const base = request(`request:${adapter.describe().id}`, config, { offline: true, allowedRoot: sourceRoot })
      const first = await events(adapter, base); const second = await events(adapter, base)
      const records = first.filter(item => item.kind === 'record')
      expect(records.length).toBeGreaterThanOrEqual(minimum)
      expect(first.filter(item => item.kind === 'record')).toEqual(second.filter(item => item.kind === 'record'))
    }
  })

  it('rejects traversal, symlinks, malformed records, special paths, and resource excess', async () => {
    const file = new FileAdapter()
    const escape = request('escape', { path: '../contracts.valid.json' }, { offline: true, allowedRoot: sourceRoot })
    expect((await file.check(escape)).diagnostics[0]?.code).toBe('ADAPTER_PATH_ESCAPE')

    const directory = await mkdtemp(resolve(tmpdir(), 'aiwg-adapter-')); temporary.push(directory)
    await writeFile(resolve(directory, 'safe.txt'), 'safe')
    await symlink('/etc/passwd', resolve(directory, 'escape-link'))
    const unsafe = await events(new DirectoryAdapter(), request('symlink', { path: '.', recursive: true }, { offline: true, allowedRoot: directory }))
    expect(unsafe.at(-1)).toMatchObject({ kind: 'diagnostic', diagnostic: { code: 'ADAPTER_UNSAFE_SYMLINK' } })

    const malformed = await events(new JsonlAdapter(), request('malformed', { path: 'malformed.jsonl' }, { offline: true, allowedRoot: sourceRoot }))
    expect(malformed.at(-1)).toMatchObject({ kind: 'diagnostic', diagnostic: { code: 'ADAPTER_SCHEMA_DRIFT' } })
    const limited = await events(file, request('limited', { path: 'plain.txt' }, { offline: true, allowedRoot: sourceRoot }, { maxBytes: 2, maxRecordBytes: 2 }))
    expect(limited[0]).toMatchObject({ kind: 'diagnostic', diagnostic: { code: 'ADAPTER_RESOURCE_LIMIT' } })
  })

  it('fails before reading on cancellation and incompatible checkpoints', async () => {
    const adapter = new JsonlAdapter(); const controller = new AbortController(); controller.abort()
    const cancelled = request('cancelled', { path: 'records.jsonl' }, { offline: true, allowedRoot: sourceRoot })
    const cancelledEvents = await events(adapter, { ...cancelled, signal: controller.signal })
    expect(cancelledEvents).toEqual([expect.objectContaining({ kind: 'diagnostic', diagnostic: expect.objectContaining({ code: 'ADAPTER_CANCELLED' }) })])

    const base = request('checkpoint', { path: 'records.jsonl' }, { offline: true, allowedRoot: sourceRoot })
    const incompatible: AdapterCheckpoint = {
      contractVersion: DATASET_ADAPTER_CONTRACT_VERSION, kind: 'AdapterCheckpoint', adapter: { id: adapter.describe().id, version: '2.0.0' },
      sourceIdentity: (await adapter.discover(base)).value!.sourceIdentity, cursor: '0',
      schema: { id: adapter.describe().schemas.checkpoint.id, version: '1.0.0', digest: adapter.describe().schemas.checkpoint.digest }, createdAt: new Date().toISOString(),
    }
    const rejected = await events(adapter, { ...base, checkpoint: incompatible })
    expect(rejected).toEqual([expect.objectContaining({ kind: 'diagnostic', diagnostic: expect.objectContaining({ code: 'ADAPTER_CHECKPOINT_INCOMPATIBLE' }) })])
  })

  it('handles empty and late fixtures and rejects mixed encoding and changed checkpoint lineages', async () => {
    const adapter = new JsonlAdapter()
    const empty = await events(adapter, request('empty', { path: 'empty.jsonl' }, { offline: true, allowedRoot: sourceRoot }))
    expect(empty.filter(item => item.kind === 'record')).toHaveLength(0)
    expect(empty.at(-1)?.kind).toBe('checkpoint')
    const late = await events(adapter, request('late', { path: 'late-records.jsonl' }, { offline: true, allowedRoot: sourceRoot }))
    expect(late.filter(item => item.kind === 'record')).toHaveLength(2)

    const directory = await mkdtemp(resolve(tmpdir(), 'aiwg-adapter-change-')); temporary.push(directory)
    const invalidBytes = Buffer.from((await readFile(resolve(sourceRoot, 'mixed-encoding.base64'), 'utf8')).trim(), 'base64')
    await writeFile(resolve(directory, 'mixed.txt'), invalidBytes)
    const mixed = await events(new FileAdapter(), request('mixed', { path: 'mixed.txt' }, { offline: true, allowedRoot: directory }))
    expect(mixed[0]).toMatchObject({ kind: 'diagnostic', diagnostic: { code: 'ADAPTER_SCHEMA_DRIFT' } })

    await writeFile(resolve(directory, 'changing.jsonl'), '{"revision":1}\n')
    const base = request('changing', { path: 'changing.jsonl' }, { offline: true, allowedRoot: directory })
    const original = await events(adapter, base)
    const saved = (original.find(item => item.kind === 'checkpoint') as { kind: 'checkpoint'; checkpoint: AdapterCheckpoint }).checkpoint
    await writeFile(resolve(directory, 'changing.jsonl'), '{"revision":2,"expanded":true}\n')
    const changed = await events(adapter, { ...base, checkpoint: saved })
    expect(changed).toEqual([expect.objectContaining({ kind: 'diagnostic', diagnostic: expect.objectContaining({ code: 'ADAPTER_CHECKPOINT_INCOMPATIBLE' }) })])
  })

  it('enforces offline, scheme, host, redirect, response, and credential boundaries for HTTP', async () => {
    const spy = vi.fn<typeof fetch>()
    const adapter = new HttpAdapter(spy, publicResolver)
    const offline = request('offline', { url: 'https://data.example.test/input' }, { offline: true, allowedHosts: ['data.example.test'] })
    expect((await adapter.preview({ ...offline, count: 1 })).diagnostics[0]?.code).toBe('ADAPTER_OFFLINE_PROHIBITED')
    expect(spy).not.toHaveBeenCalled()
    const privateUrl = request('private', { url: 'https://127.0.0.1/input' }, { offline: false, allowedHosts: ['127.0.0.1'] })
    expect((await adapter.check(privateUrl)).diagnostics[0]?.code).toBe('ADAPTER_NETWORK_PROHIBITED')
    expect(spy).not.toHaveBeenCalled()
    const insecure = request('insecure', { url: 'http://data.example.test/input' }, { offline: false, allowedHosts: ['data.example.test'] })
    expect((await adapter.check(insecure)).diagnostics[0]?.code).toBe('ADAPTER_NETWORK_PROHIBITED')

    spy.mockResolvedValueOnce(new Response('', { status: 302, headers: { location: 'https://blocked.example.test/private' } }))
    const redirect = request('redirect', { url: 'https://data.example.test/input' }, { offline: false, allowedHosts: ['data.example.test'] })
    expect((await adapter.check(redirect)).diagnostics[0]?.code).toBe('ADAPTER_NETWORK_PROHIBITED')

    const secret = await adapter.configure({ url: 'https://data.example.test', apiToken: 'synthetic-sentinel' })
    expect(secret.diagnostics[0]?.code).toBe('ADAPTER_SECRET_REJECTED')
    expect(JSON.stringify(secret)).not.toContain('synthetic-sentinel')
    expect(JSON.stringify(redactAdapterValue({ apiToken: { kind: 'vault', locator: 'fixture/sentinel' } }))).not.toContain('fixture/sentinel')

    const incompatible: AdapterCheckpoint = {
      contractVersion: DATASET_ADAPTER_CONTRACT_VERSION, kind: 'AdapterCheckpoint', adapter: { id: adapter.describe().id, version: '9.0.0' },
      sourceIdentity: 'https:source', cursor: '0', schema: { id: adapter.describe().schemas.checkpoint.id, version: '1.0.0', digest: adapter.describe().schemas.checkpoint.digest }, createdAt: new Date().toISOString(),
    }
    spy.mockClear()
    const rejected = await events(adapter, { ...request('checkpoint-before-network', { url: 'https://data.example.test/input' }, { offline: false, allowedHosts: ['data.example.test'] }), checkpoint: incompatible })
    expect(rejected[0]).toMatchObject({ kind: 'diagnostic', diagnostic: { code: 'ADAPTER_CHECKPOINT_INCOMPATIBLE' } })
    expect(spy).not.toHaveBeenCalled()
  })

  it('streams bounded HTTP data and revalidates redirects', async () => {
    const spy = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 307, headers: { location: '/v2' } }))
      .mockResolvedValueOnce(new Response('remote record', { status: 200, headers: { 'content-length': '13' } }))
    const adapter = new HttpAdapter(spy, publicResolver)
    const base = request('http', { url: 'https://data.example.test/v1' }, { offline: false, allowedHosts: ['data.example.test'] })
    const result = await adapter.preview({ ...base, count: 1 })
    expect(result.value?.[0]).toMatchObject({ ordinal: 0, value: 'remote record', sourceLocator: 'https://data.example.test/v2' })
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('allowlists adapter loading and requires real-source evidence for stable maturity', async () => {
    const file = new FileAdapter(); const registry = new AdapterRegistry({ allowIds: new Set([file.describe().id]) })
    registry.register(file); expect(registry.require(file.describe().id, file.describe().version)).toBe(file)
    expect(() => new AdapterRegistry({ allowIds: new Set() }).register(file)).toThrow('ADAPTER_NOT_ALLOWLISTED')

    const fixture = JSON.parse(await readFile(resolve(root, 'test/fixtures/dataset/adapters/qualification-cells.json'), 'utf8')) as { fixtureRevision: string; cells: Parameters<typeof qualifyAdapter>[1]['cells'] }
    const qualified = await qualifyAdapter(file, { ...fixture, qualifiedAt: '2026-09-03T12:00:00Z' })
    expect(qualified).toMatchObject({ qualified: true, stableEligible: true, fixtureRevision: 'dataset-adapter-fixtures-v1' })
    const mocksOnly = await qualifyAdapter(file, { ...fixture, cells: fixture.cells.filter(cell => cell.source === 'fixture'), qualifiedAt: '2026-09-03T12:00:00Z' })
    expect(mocksOnly).toMatchObject({ qualified: true, stableEligible: false })
    expect(qualified.adapter.packageDigest.value).toMatch(/^[a-f0-9]{64}$/u)
  })

  it('validates checked-in contract fixtures and rejects invalid variants', async () => {
    const schema = JSON.parse(await readFile(resolve(root, 'schemas/dataset/source-adapter.v1.schema.json'), 'utf8')) as Record<string, unknown>
    const valid = JSON.parse(await readFile(resolve(root, 'test/fixtures/dataset/adapters/contracts.valid.json'), 'utf8')) as { records: unknown[] }
    const invalid = JSON.parse(await readFile(resolve(root, 'test/fixtures/dataset/adapters/contracts.invalid.json'), 'utf8')) as { cases: Array<{ code: string; value: unknown }> }
    const ajv = new Ajv2020({ strict: true, allErrors: true }); addFormats(ajv); const validate = ajv.compile(schema)
    for (const value of valid.records) expect(validate(value), JSON.stringify(validate.errors)).toBe(true)
    for (const item of invalid.cases) expect(validate(item.value), item.code).toBe(false)
    const loaded = loadSchemaCatalog({ rootDir: root })
    expect(loaded.valid, JSON.stringify(loaded.diagnostics)).toBe(true)
    expect(new SchemaResolver(loaded.catalog!, { rootDir: root }).require('dataset.source-adapter@1.0.0').artifact.authority.path).toBe('schemas/dataset/source-adapter.v1.schema.json')
  })
})
