import { createReadStream } from 'node:fs'
import { lookup } from 'node:dns/promises'
import { lstat, opendir, realpath, stat } from 'node:fs/promises'
import { isIP } from 'node:net'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { createInterface } from 'node:readline'
import type {
  AdapterCheckpoint,
  AdapterConfigurationResult,
  AdapterDiscovery,
  AdapterManifest,
  AdapterReadEvent,
  AdapterRecord,
  AdapterRequest,
  AdapterResult,
  DatasetSourceAdapter,
} from './adapter-types.js'
import { DATASET_ADAPTER_CONTRACT_VERSION } from './adapter-types.js'
import {
  AdapterFailure,
  assertActive,
  configureObject,
  diagnostic,
  effectiveLimits,
  isCredentialLocator,
  schemaDeclaration,
  sha256Digest,
  validateCheckpoint,
} from './adapter-sdk.js'

type FileConfig = { path: string; encoding?: 'utf8' }
type DirectoryConfig = FileConfig & { recursive?: boolean }
type HttpConfig = { url: string; headers?: Record<string, string | { kind: 'opaque' | 'environment' | 'keychain' | 'vault'; locator: string }> }

const fileConfigSchema = {
  type: 'object', additionalProperties: false, required: ['path'],
  properties: { path: { type: 'string', minLength: 1 }, encoding: { const: 'utf8' } },
}
const directoryConfigSchema = {
  type: 'object', additionalProperties: false, required: ['path'],
  properties: { path: { type: 'string', minLength: 1 }, encoding: { const: 'utf8' }, recursive: { type: 'boolean' } },
}
const httpConfigSchema = {
  type: 'object', additionalProperties: false, required: ['url'],
  properties: {
    url: { type: 'string', format: 'uri' },
    headers: { type: 'object', additionalProperties: { oneOf: [{ type: 'string' }, { type: 'object', required: ['kind', 'locator'] }] } },
  },
}
const checkpointSchema = {
  type: 'object', additionalProperties: false,
  required: ['contractVersion', 'kind', 'adapter', 'sourceIdentity', 'cursor', 'schema', 'createdAt'],
  properties: { contractVersion: { const: DATASET_ADAPTER_CONTRACT_VERSION }, kind: { const: 'AdapterCheckpoint' }, cursor: { type: 'string' } },
}
const recordSchema = { type: 'object', required: ['logicalId', 'ordinal', 'value', 'sourceLocator', 'contentDigest'] }

function manifest(id: string, sourceKinds: string[], locality: 'local' | 'remote', capabilities: AdapterManifest['capabilities'], configSchema: Record<string, unknown>): AdapterManifest {
  const config = schemaDeclaration(`https://aiwg.io/schemas/dataset/adapters/${id}.config.v1`, configSchema)
  const discoveredRecord = schemaDeclaration('https://aiwg.io/schemas/dataset/adapters/discovered-record.v1', recordSchema)
  const checkpoint = schemaDeclaration('https://aiwg.io/schemas/dataset/adapters/checkpoint.v1', checkpointSchema)
  return {
    contractVersion: DATASET_ADAPTER_CONTRACT_VERSION, kind: 'AdapterManifest', id: `aiwg.adapter.${id}`, version: '1.0.0',
    packageDigest: sha256Digest(`aiwg.adapter.${id}@1.0.0`), datasetContractRange: '^1.0.0', sourceKinds,
    schemas: { config, discoveredRecord, checkpoint }, capabilities,
    limits: { maxRecords: 100_000, maxBytes: 64 * 1024 * 1024, maxRecordBytes: 4 * 1024 * 1024, timeoutMs: 60_000, maxRedirects: 5, maxDepth: 32 },
    maturity: 'qualified', publisher: { id: 'aiwg-maintainers', url: 'https://aiwg.io' }, trust: { state: 'builtin' },
    permissions: { locality, network: locality === 'remote' ? 'https-allowlisted' : 'none', credentials: locality === 'remote' ? 'locator-only' : 'none' },
    incremental: {
      ordering: 'ascending zero-based record ordinal', sameCursorTieHandling: 'logicalId lexical order',
      lateArrivals: 'new source revision requires discovery and a new checkpoint lineage',
      tombstones: 'reference adapters do not synthesize deletes', checkpointCompatibility: 'exact adapter id, version, source identity, and checkpoint schema digest',
    },
  }
}

function isFileConfig(value: Record<string, unknown>): value is FileConfig {
  return Object.keys(value).every(key => key === 'path' || key === 'encoding')
    && typeof value.path === 'string' && value.path.length > 0 && (value.encoding === undefined || value.encoding === 'utf8')
}

function isDirectoryConfig(value: Record<string, unknown>): value is DirectoryConfig {
  return Object.keys(value).every(key => key === 'path' || key === 'encoding' || key === 'recursive')
    && typeof value.path === 'string' && value.path.length > 0
    && (value.encoding === undefined || value.encoding === 'utf8')
    && (value.recursive === undefined || typeof value.recursive === 'boolean')
}

function isHttpConfig(value: Record<string, unknown>): value is HttpConfig {
  if (!Object.keys(value).every(key => key === 'url' || key === 'headers') || typeof value.url !== 'string' || value.url.length === 0) return false
  if (value.headers === undefined) return true
  if (!value.headers || typeof value.headers !== 'object' || Array.isArray(value.headers)) return false
  return Object.values(value.headers as Record<string, unknown>).every(header => typeof header === 'string' || isCredentialLocator(header))
}

async function safeLocalPath(configured: string, policy: AdapterRequest['policy'], expected: 'file' | 'directory', operation: 'check' | 'discover' | 'preview' | 'read'): Promise<{ path: string; size: number; mtimeMs: number }> {
  if (!policy.allowedRoot) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_INVALID_CONFIGURATION', 'Local adapters require an explicit allowedRoot.'))
  const root = await realpath(policy.allowedRoot).catch(() => { throw new AdapterFailure(diagnostic(operation, 'ADAPTER_SOURCE_UNAVAILABLE', 'The allowed root is unavailable.')) })
  const candidate = resolve(root, configured)
  if (isAbsolute(configured) && candidate !== resolve(configured)) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_PATH_ESCAPE', 'Absolute source paths must remain inside allowedRoot.'))
  const lexical = relative(root, candidate)
  if (lexical === '..' || lexical.startsWith(`..${sep}`) || isAbsolute(lexical)) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_PATH_ESCAPE', 'Source path escapes allowedRoot.'))
  const linkInfo = await lstat(candidate).catch(() => { throw new AdapterFailure(diagnostic(operation, 'ADAPTER_SOURCE_UNAVAILABLE', 'The source path is unavailable.', { path: configured })) })
  if (linkInfo.isSymbolicLink()) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_UNSAFE_SYMLINK', 'Symbolic links are not accepted as dataset sources.', { path: configured }))
  const resolved = await realpath(candidate)
  const physical = relative(root, resolved)
  if (physical === '..' || physical.startsWith(`..${sep}`) || isAbsolute(physical)) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_PATH_ESCAPE', 'Resolved source path escapes allowedRoot.'))
  const info = await stat(resolved)
  if ((expected === 'file' && !info.isFile()) || (expected === 'directory' && !info.isDirectory())) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_SPECIAL_FILE', `Expected a regular ${expected}; special files are prohibited.`, { path: configured }))
  return { path: resolved, size: info.size, mtimeMs: info.mtimeMs }
}

function caught<T>(error: unknown, operation: 'check' | 'discover' | 'preview'): AdapterResult<T> {
  if (error instanceof AdapterFailure) return { ok: false, diagnostics: [{ ...error.diagnostic, operation }] }
  if (error instanceof Error && error.name === 'AbortError') return { ok: false, diagnostics: [diagnostic(operation, 'ADAPTER_CANCELLED', 'The adapter operation was cancelled.')] }
  return { ok: false, diagnostics: [diagnostic(operation, 'ADAPTER_INTERNAL_ERROR', 'The adapter could not complete the operation.')] }
}

function identity(kind: string, locator: string, size: number, revision = ''): string {
  return `${kind}:sha256:${sha256Digest(`${locator}\0${size}\0${revision}`).value}`
}

function decodeUtf8(value: Uint8Array, operation: 'preview' | 'read'): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(value) }
  catch { throw new AdapterFailure(diagnostic(operation, 'ADAPTER_SCHEMA_DRIFT', 'Source content is not valid UTF-8.')) }
}

function record(value: unknown, ordinal: number, sourceLocator: string): AdapterRecord {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)
  return { logicalId: `sha256:${sha256Digest(`${sourceLocator}\0${ordinal}\0${serialized}`).value}`, ordinal, value, sourceLocator, contentDigest: sha256Digest(serialized) }
}

function checkpoint(manifestValue: AdapterManifest, sourceIdentity: string, cursor: string): AdapterCheckpoint {
  return {
    contractVersion: DATASET_ADAPTER_CONTRACT_VERSION, kind: 'AdapterCheckpoint', adapter: { id: manifestValue.id, version: manifestValue.version },
    sourceIdentity, cursor, schema: { id: manifestValue.schemas.checkpoint.id, version: manifestValue.schemas.checkpoint.version, digest: manifestValue.schemas.checkpoint.digest },
    createdAt: new Date().toISOString(),
  }
}

abstract class LocalAdapter<T extends FileConfig> implements DatasetSourceAdapter<T> {
  abstract describe(): AdapterManifest
  protected abstract valid(value: Record<string, unknown>): value is T
  protected abstract discoverPath(config: T, request: AdapterRequest<T>): Promise<AdapterDiscovery>
  protected abstract records(config: T, request: AdapterRequest<T> & { checkpoint?: AdapterCheckpoint }): AsyncIterable<AdapterRecord>

  async configure(config: unknown): Promise<AdapterConfigurationResult<T>> { return configureObject('configure', config, value => this.valid(value)) }
  async check(request: AdapterRequest<T>): Promise<AdapterResult<{ sourceIdentity: string }>> {
    try { assertActive(request.signal, 'check'); const value = await this.discoverPath(request.config, request); return { ok: true, value: { sourceIdentity: value.sourceIdentity }, diagnostics: [] } } catch (error) { return caught(error, 'check') }
  }
  async discover(request: AdapterRequest<T>): Promise<AdapterResult<AdapterDiscovery>> {
    try { assertActive(request.signal, 'discover'); return { ok: true, value: await this.discoverPath(request.config, request), diagnostics: [] } } catch (error) { return caught(error, 'discover') }
  }
  async preview(request: AdapterRequest<T> & { count: number }): Promise<AdapterResult<AdapterRecord[]>> {
    try {
      assertActive(request.signal, 'preview')
      const values: AdapterRecord[] = []
      if (request.count <= 0) return { ok: true, value: values, diagnostics: [] }
      for await (const item of this.records(request.config, request)) { values.push(item); if (values.length >= Math.max(0, Math.min(request.count, request.limits.maxRecords))) break }
      return { ok: true, value: values, diagnostics: [] }
    } catch (error) { return caught(error, 'preview') }
  }
  async *read(request: AdapterRequest<T> & { checkpoint?: AdapterCheckpoint }): AsyncIterable<AdapterReadEvent> {
    try {
      assertActive(request.signal, 'read')
      if (request.checkpoint) {
        const binding = validateCheckpoint(request.checkpoint, this.describe(), request.checkpoint.sourceIdentity)
        if (binding[0]) { yield { kind: 'diagnostic', diagnostic: binding[0] }; return }
      }
      const found = await this.discoverPath(request.config, request)
      const invalid = validateCheckpoint(request.checkpoint, this.describe(), found.sourceIdentity)
      if (invalid[0]) { yield { kind: 'diagnostic', diagnostic: invalid[0] }; return }
      const after = request.checkpoint ? Number.parseInt(request.checkpoint.cursor, 10) + 1 : 0
      let last = after - 1
      for await (const item of this.records(request.config, request)) {
        if (item.ordinal < after) continue
        yield { kind: 'record', record: item }; last = item.ordinal
      }
      yield { kind: 'checkpoint', checkpoint: checkpoint(this.describe(), found.sourceIdentity, String(last)) }
    } catch (error) {
      const found = error instanceof AdapterFailure
        ? { ...error.diagnostic, operation: 'read' as const }
        : diagnostic('read', error instanceof Error && error.name === 'AbortError' ? 'ADAPTER_CANCELLED' : 'ADAPTER_INTERNAL_ERROR', error instanceof Error && error.name === 'AbortError' ? 'The adapter operation was cancelled.' : 'The adapter could not complete the read.')
      yield { kind: 'diagnostic', diagnostic: found }
    }
  }
}

export class FileAdapter extends LocalAdapter<FileConfig> {
  readonly #manifest = manifest('file', ['file'], 'local', ['discovery', 'preview', 'streaming-read', 'checkpoint'], fileConfigSchema)
  describe() { return structuredClone(this.#manifest) }
  protected valid(value: Record<string, unknown>): value is FileConfig { return isFileConfig(value) }
  protected async discoverPath(config: FileConfig, request: AdapterRequest<FileConfig>): Promise<AdapterDiscovery> {
    const found = await safeLocalPath(config.path, request.policy, 'file', 'discover')
    return { sourceIdentity: identity('file', found.path, found.size, String(found.mtimeMs)), proposedSchema: { type: 'string' }, schemaBasis: 'observed', estimates: { records: 1, bytes: found.size }, privacySignals: [], licenseSignals: [], cursorSupport: true, checkpointSupport: true, identityStability: 'stable', limitations: ['Content is decoded as strict UTF-8.'] }
  }
  protected async *records(config: FileConfig, request: AdapterRequest<FileConfig> & { checkpoint?: AdapterCheckpoint }): AsyncIterable<AdapterRecord> {
    const limits = effectiveLimits(this.#manifest, request.limits)
    const found = await safeLocalPath(config.path, request.policy, 'file', request.checkpoint ? 'read' : 'preview')
    assertActive(request.signal, request.checkpoint ? 'read' : 'preview')
    if (found.size > limits.maxBytes || found.size > limits.maxRecordBytes) throw new AdapterFailure(diagnostic(request.checkpoint ? 'read' : 'preview', 'ADAPTER_RESOURCE_LIMIT', 'The file exceeds the configured byte limit.'))
    const chunks: Buffer[] = []
    for await (const chunk of createReadStream(found.path, { signal: request.signal })) chunks.push(Buffer.from(chunk))
    yield record(decodeUtf8(Buffer.concat(chunks), request.checkpoint ? 'read' : 'preview'), 0, config.path)
  }
}

abstract class LineAdapter<T extends FileConfig> extends LocalAdapter<T> {
  protected async lineDiscovery(kind: string, config: T, request: AdapterRequest<T>, schema: Record<string, unknown>): Promise<AdapterDiscovery> {
    const found = await safeLocalPath(config.path, request.policy, 'file', 'discover')
    return { sourceIdentity: identity(kind, found.path, found.size, String(found.mtimeMs)), proposedSchema: schema, schemaBasis: 'inferred', estimates: { bytes: found.size }, privacySignals: [], licenseSignals: [], cursorSupport: true, checkpointSupport: true, identityStability: 'stable', limitations: ['Record count is established during bounded read.'] }
  }
  protected async *lines(config: T, request: AdapterRequest<T> & { checkpoint?: AdapterCheckpoint }, parse: (line: string, ordinal: number) => unknown): AsyncIterable<AdapterRecord> {
    const limits = effectiveLimits(this.describe(), request.limits)
    const operation = request.checkpoint ? 'read' : 'preview'
    const found = await safeLocalPath(config.path, request.policy, 'file', operation)
    if (found.size > limits.maxBytes) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_RESOURCE_LIMIT', 'The source exceeds the configured byte limit.'))
    const input = createReadStream(found.path, { signal: request.signal, encoding: 'utf8' })
    const lines = createInterface({ input, crlfDelay: Infinity })
    let ordinal = 0
    try {
      for await (const line of lines) {
        assertActive(request.signal, operation)
        if (Buffer.byteLength(line) > limits.maxRecordBytes || ordinal >= limits.maxRecords) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_RESOURCE_LIMIT', 'The record or record count exceeds configured limits.'))
        if (line.trim() !== '') yield record(parse(line, ordinal), ordinal, config.path)
        ordinal += 1
      }
    } finally { lines.close(); input.destroy() }
  }
}

export class JsonlAdapter extends LineAdapter<FileConfig> {
  readonly #manifest = manifest('jsonl', ['jsonl'], 'local', ['discovery', 'preview', 'streaming-read', 'checkpoint'], fileConfigSchema)
  describe() { return structuredClone(this.#manifest) }
  protected valid(value: Record<string, unknown>): value is FileConfig { return isFileConfig(value) }
  protected discoverPath(config: FileConfig, request: AdapterRequest<FileConfig>) { return this.lineDiscovery('jsonl', config, request, {}) }
  protected records(config: FileConfig, request: AdapterRequest<FileConfig> & { checkpoint?: AdapterCheckpoint }) {
    return this.lines(config, request, (line, ordinal) => { try { return JSON.parse(line) as unknown } catch { throw new AdapterFailure(diagnostic(request.checkpoint ? 'read' : 'preview', 'ADAPTER_SCHEMA_DRIFT', `Malformed JSONL record at ordinal ${ordinal}.`)) } })
  }
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []; let value = ''; let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!
    if (char === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { fields.push(value); value = '' }
    else value += char
  }
  if (quoted) throw new Error('unterminated quoted field')
  fields.push(value); return fields
}

export class CsvAdapter extends LineAdapter<FileConfig> {
  readonly #manifest = manifest('csv', ['csv'], 'local', ['discovery', 'preview', 'streaming-read', 'checkpoint'], fileConfigSchema)
  describe() { return structuredClone(this.#manifest) }
  protected valid(value: Record<string, unknown>): value is FileConfig { return isFileConfig(value) }
  protected discoverPath(config: FileConfig, request: AdapterRequest<FileConfig>) { return this.lineDiscovery('csv', config, request, { type: 'array', items: { type: 'string' } }) }
  protected records(config: FileConfig, request: AdapterRequest<FileConfig> & { checkpoint?: AdapterCheckpoint }) {
    return this.lines(config, request, (line, ordinal) => { try { return parseCsvLine(line) } catch { throw new AdapterFailure(diagnostic(request.checkpoint ? 'read' : 'preview', 'ADAPTER_SCHEMA_DRIFT', `Malformed CSV record at ordinal ${ordinal}.`)) } })
  }
}

export class DirectoryAdapter extends LocalAdapter<DirectoryConfig> {
  readonly #manifest = manifest('directory', ['directory'], 'local', ['discovery', 'preview', 'streaming-read', 'checkpoint'], directoryConfigSchema)
  describe() { return structuredClone(this.#manifest) }
  protected valid(value: Record<string, unknown>): value is DirectoryConfig { return isDirectoryConfig(value) }
  async #scan(config: DirectoryConfig, request: AdapterRequest<DirectoryConfig>, operation: 'discover' | 'preview' | 'read'): Promise<{ root: string; paths: string[]; total: number; revision: string }> {
    const limits = effectiveLimits(this.#manifest, request.limits)
    const root = (await safeLocalPath(config.path, request.policy, 'directory', operation)).path
    const paths: string[] = []; let total = 0
    const walk = async (directory: string, depth: number): Promise<void> => {
      if (depth > limits.maxDepth) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_RESOURCE_LIMIT', 'Directory depth exceeds the configured limit.'))
      const handle = await opendir(directory)
      for await (const entry of handle) {
        assertActive(request.signal, operation)
        const path = resolve(directory, entry.name)
        if (entry.isSymbolicLink()) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_UNSAFE_SYMLINK', 'Directory sources may not contain symbolic links.', { path: relative(root, path) }))
        if (entry.isDirectory()) { if (config.recursive) await walk(path, depth + 1) }
        else if (entry.isFile()) {
          const info = await stat(path); total += info.size
          if (paths.length >= limits.maxRecords || info.size > limits.maxRecordBytes || total > limits.maxBytes) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_RESOURCE_LIMIT', 'Directory content exceeds a configured record or byte limit.'))
          paths.push(path)
        } else throw new AdapterFailure(diagnostic(operation, 'ADAPTER_SPECIAL_FILE', 'Directory sources may contain only regular files and directories.', { path: relative(root, path) }))
      }
    }
    await walk(root, 0); paths.sort()
    const metadata = await Promise.all(paths.map(async path => { const info = await stat(path); return `${relative(root, path)}\0${info.size}\0${info.mtimeMs}` }))
    return { root, paths, total, revision: sha256Digest(metadata.join('\n')).value }
  }
  protected async discoverPath(config: DirectoryConfig, request: AdapterRequest<DirectoryConfig>): Promise<AdapterDiscovery> {
    const found = await this.#scan(config, request, 'discover')
    return { sourceIdentity: identity('directory', found.root, found.total, found.revision), proposedSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } }, schemaBasis: 'observed', estimates: { records: found.paths.length, bytes: found.total }, privacySignals: [], licenseSignals: [], cursorSupport: true, checkpointSupport: true, identityStability: 'stable', limitations: ['Symlinks and special files are rejected.'] }
  }
  protected async *records(config: DirectoryConfig, request: AdapterRequest<DirectoryConfig> & { checkpoint?: AdapterCheckpoint }): AsyncIterable<AdapterRecord> {
    const operation = request.checkpoint ? 'read' : 'preview'
    const { root, paths } = await this.#scan(config, request, operation)
    for (const [ordinal, path] of paths.entries()) {
      const chunks: Buffer[] = []; for await (const chunk of createReadStream(path, { signal: request.signal })) chunks.push(Buffer.from(chunk))
      const source = relative(root, path).split(sep).join('/')
      yield record({ path: source, content: decodeUtf8(Buffer.concat(chunks), operation) }, ordinal, source)
    }
  }
}

type FetchLike = typeof fetch
type HostResolver = (hostname: string) => Promise<Array<{ address: string }>>
export class HttpAdapter implements DatasetSourceAdapter<HttpConfig> {
  readonly #manifest = manifest('http', ['https'], 'remote', ['discovery', 'preview', 'streaming-read', 'checkpoint'], httpConfigSchema)
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly resolveHost: HostResolver = async hostname => lookup(hostname, { all: true, verbatim: true }),
  ) {}
  describe() { return structuredClone(this.#manifest) }
  async configure(config: unknown) { return configureObject('configure', config, isHttpConfig) }

  async #fetch(request: AdapterRequest<HttpConfig>, operation: 'check' | 'discover' | 'preview' | 'read'): Promise<{ body: string; url: string }> {
    assertActive(request.signal, operation)
    if (request.policy.offline) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_OFFLINE_PROHIBITED', 'HTTP access is refused in offline mode.'))
    const limits = effectiveLimits(this.#manifest, request.limits)
    let url = new URL(request.config.url)
    const deadline = AbortSignal.timeout(limits.timeoutMs)
    const signal = request.signal ? AbortSignal.any([request.signal, deadline]) : deadline
    for (let redirects = 0; ; redirects += 1) {
      await validateHttpUrl(url, request.policy, operation, this.resolveHost)
      const headers = new Headers()
      for (const [name, value] of Object.entries(request.config.headers ?? {})) {
        if (typeof value !== 'string') throw new AdapterFailure(diagnostic(operation, 'ADAPTER_AUTHORIZATION_UNAVAILABLE', `Credential locator for header ${name} requires an external authorized resolver.`))
        if (/authorization|cookie|token|key/iu.test(name)) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_SECRET_REJECTED', `Header ${name} must use an opaque credential locator.`))
        headers.set(name, value)
      }
      let response: Response
      try { response = await this.fetchImpl(url, { method: 'GET', redirect: 'manual', headers, signal }) }
      catch (error) {
        if (signal.aborted) throw new AdapterFailure(diagnostic(operation, request.signal?.aborted ? 'ADAPTER_CANCELLED' : 'ADAPTER_RESOURCE_LIMIT', request.signal?.aborted ? 'The HTTP operation was cancelled.' : 'The HTTP operation exceeded its time limit.'))
        throw new AdapterFailure(diagnostic(operation, 'ADAPTER_SOURCE_UNAVAILABLE', 'The HTTP source is unavailable.', { retryable: true }))
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects >= limits.maxRedirects) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_REDIRECT_PROHIBITED', 'HTTP redirect limit exceeded.'))
        const location = response.headers.get('location')
        if (!location) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_SOURCE_UNAVAILABLE', 'Redirect response omitted a Location header.'))
        url = new URL(location, url); continue
      }
      if (!response.ok) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_SOURCE_UNAVAILABLE', `HTTP source returned status ${response.status}.`, { retryable: response.status >= 500 }))
      const length = Number(response.headers.get('content-length') ?? '0')
      if (length > limits.maxBytes) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_RESOURCE_LIMIT', 'HTTP response exceeds the configured byte limit.'))
      if (!response.body) return { body: '', url: url.toString() }
      const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let total = 0
      try {
        while (true) { const item = await reader.read(); if (item.done) break; total += item.value.byteLength; if (total > limits.maxBytes) { await reader.cancel(); throw new AdapterFailure(diagnostic(operation, 'ADAPTER_RESOURCE_LIMIT', 'HTTP response exceeds the configured byte limit.')) }; chunks.push(item.value) }
      } finally { reader.releaseLock() }
      const joined = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength }
      return { body: new TextDecoder().decode(joined), url: url.toString() }
    }
  }
  async check(request: AdapterRequest<HttpConfig>): Promise<AdapterResult<{ sourceIdentity: string }>> {
    try { const found = await this.#fetch(request, 'check'); return { ok: true, value: { sourceIdentity: identity('https', found.url, Buffer.byteLength(found.body)) }, diagnostics: [] } } catch (error) { return caught(error, 'check') }
  }
  async discover(request: AdapterRequest<HttpConfig>): Promise<AdapterResult<AdapterDiscovery>> {
    try { const found = await this.#fetch(request, 'discover'); return { ok: true, value: { sourceIdentity: identity('https', found.url, Buffer.byteLength(found.body)), proposedSchema: { type: 'string' }, schemaBasis: 'observed', estimates: { records: 1, bytes: Buffer.byteLength(found.body) }, privacySignals: [], licenseSignals: [], cursorSupport: true, checkpointSupport: true, identityStability: 'source-unstable', identityLimitation: 'Remote content may change without a stable validator.', limitations: ['One bounded response is one logical record.'] }, diagnostics: [] } } catch (error) { return caught(error, 'discover') }
  }
  async preview(request: AdapterRequest<HttpConfig> & { count: number }): Promise<AdapterResult<AdapterRecord[]>> {
    try { const found = await this.#fetch(request, 'preview'); return { ok: true, value: request.count > 0 ? [record(found.body, 0, found.url)] : [], diagnostics: [] } } catch (error) { return caught(error, 'preview') }
  }
  async *read(request: AdapterRequest<HttpConfig> & { checkpoint?: AdapterCheckpoint }): AsyncIterable<AdapterReadEvent> {
    try {
      if (request.checkpoint) {
        const binding = validateCheckpoint(request.checkpoint, this.#manifest, request.checkpoint.sourceIdentity)
        if (binding[0]) { yield { kind: 'diagnostic', diagnostic: binding[0] }; return }
      }
      const found = await this.#fetch(request, 'read'); const sourceIdentity = identity('https', found.url, Buffer.byteLength(found.body))
      const invalid = validateCheckpoint(request.checkpoint, this.#manifest, sourceIdentity); if (invalid[0]) { yield { kind: 'diagnostic', diagnostic: invalid[0] }; return }
      if (!request.checkpoint) yield { kind: 'record', record: record(found.body, 0, found.url) }
      yield { kind: 'checkpoint', checkpoint: checkpoint(this.#manifest, sourceIdentity, '0') }
    } catch (error) { yield { kind: 'diagnostic', diagnostic: error instanceof AdapterFailure ? error.diagnostic : diagnostic('read', 'ADAPTER_INTERNAL_ERROR', 'The HTTP adapter could not complete the read.') } }
  }
}

async function validateHttpUrl(url: URL, policy: AdapterRequest['policy'], operation: 'check' | 'discover' | 'preview' | 'read', resolveHost: HostResolver): Promise<void> {
  if (url.protocol !== 'https:') throw new AdapterFailure(diagnostic(operation, 'ADAPTER_NETWORK_PROHIBITED', 'Only HTTPS dataset sources are permitted.'))
  const hostname = url.hostname.toLowerCase().replace(/\.$/u, '')
  const allowlisted = (policy.allowedHosts ?? []).some(value => value.toLowerCase().replace(/\.$/u, '') === hostname)
  if (!allowlisted) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_NETWORK_PROHIBITED', 'HTTP source host is not allowlisted.'))
  if (!policy.allowPrivateNetwork && privateHost(hostname)) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_NETWORK_PROHIBITED', 'Private, loopback, link-local, and metadata endpoints are prohibited.'))
  if (url.username || url.password) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_SECRET_REJECTED', 'Credentials in source URLs are prohibited.'))
  if (!policy.allowPrivateNetwork && isIP(hostname) === 0) {
    let addresses: Array<{ address: string }>
    try { addresses = await resolveHost(hostname) } catch { throw new AdapterFailure(diagnostic(operation, 'ADAPTER_SOURCE_UNAVAILABLE', 'HTTP source host could not be resolved.', { retryable: true })) }
    if (addresses.length === 0 || addresses.some(item => privateHost(item.address))) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_NETWORK_PROHIBITED', 'HTTP source resolves to a private, loopback, link-local, or prohibited address.'))
  }
}

function privateHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '169.254.169.254') return true
  if (isIP(hostname) === 4) {
    const [a = 0, b = 0] = hostname.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  }
  if (isIP(hostname) === 6) return hostname === '::1' || hostname.startsWith('fe80:') || hostname.startsWith('fc') || hostname.startsWith('fd')
  return false
}

export function createBuiltinAdapterRegistry() {
  const adapters = [new FileAdapter(), new DirectoryAdapter(), new JsonlAdapter(), new CsvAdapter(), new HttpAdapter()]
  return { adapters, manifests: adapters.map(adapter => adapter.describe()) }
}
