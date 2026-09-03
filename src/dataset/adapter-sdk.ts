import { createHash } from 'node:crypto'
import type {
  AdapterCheckpoint,
  AdapterConfigurationResult,
  AdapterDiagnostic,
  AdapterDiagnosticCode,
  AdapterLimits,
  AdapterManifest,
  AdapterOperation,
  AdapterQualificationCell,
  AdapterQualificationReport,
  AdapterRequest,
  AdapterSchemaDeclaration,
  CredentialLocator,
  DatasetSourceAdapter,
} from './adapter-types.js'
import { DATASET_ADAPTER_CONTRACT_VERSION } from './adapter-types.js'

export const DEFAULT_ADAPTER_LIMITS: AdapterLimits = Object.freeze({
  maxRecords: 10_000,
  maxBytes: 16 * 1024 * 1024,
  maxRecordBytes: 1024 * 1024,
  timeoutMs: 30_000,
  maxRedirects: 3,
  maxDepth: 16,
})

export function sha256Digest(value: string | Uint8Array): { algorithm: 'sha256'; value: string } {
  return { algorithm: 'sha256', value: createHash('sha256').update(value).digest('hex') }
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`
}

export function diagnostic(
  operation: AdapterOperation,
  code: AdapterDiagnosticCode,
  message: string,
  options: { path?: string; retryable?: boolean; severity?: AdapterDiagnostic['severity'] } = {},
): AdapterDiagnostic {
  return { code, message, operation, retryable: options.retryable ?? false, severity: options.severity ?? 'error', ...(options.path ? { path: options.path } : {}) }
}

export class AdapterFailure extends Error {
  constructor(readonly diagnostic: AdapterDiagnostic) {
    super(diagnostic.message)
    this.name = 'AdapterFailure'
  }
}

export function assertActive(signal: AbortSignal | undefined, operation: AdapterOperation): void {
  if (signal?.aborted) throw new AdapterFailure(diagnostic(operation, 'ADAPTER_CANCELLED', 'The adapter operation was cancelled.'))
}

export function effectiveLimits(manifest: AdapterManifest, requested: AdapterLimits): AdapterLimits {
  const positive = (value: number, ceiling: number): number => Math.max(1, Math.min(Number.isFinite(value) ? Math.trunc(value) : 1, ceiling))
  return {
    maxRecords: positive(requested.maxRecords, manifest.limits.maxRecords),
    maxBytes: positive(requested.maxBytes, manifest.limits.maxBytes),
    maxRecordBytes: positive(requested.maxRecordBytes, manifest.limits.maxRecordBytes),
    timeoutMs: positive(requested.timeoutMs, manifest.limits.timeoutMs),
    maxRedirects: Math.max(0, Math.min(Math.trunc(requested.maxRedirects), manifest.limits.maxRedirects)),
    maxDepth: positive(requested.maxDepth, manifest.limits.maxDepth),
  }
}

export function isCredentialLocator(value: unknown): value is CredentialLocator {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return ['opaque', 'environment', 'keychain', 'vault'].includes(String(candidate.kind))
    && typeof candidate.locator === 'string' && candidate.locator.length > 0 && candidate.locator.length <= 512
}

const SECRET_KEY = /(?:secret|password|passwd|token|api[-_]?key|credential)/iu

export function containsRawSecret(value: unknown, key = ''): boolean {
  if (SECRET_KEY.test(key)) return !isCredentialLocator(value)
  if (Array.isArray(value)) return value.some(item => containsRawSecret(item))
  if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>).some(([childKey, child]) => containsRawSecret(child, childKey))
  return false
}

export function redactAdapterValue(value: unknown, key = ''): unknown {
  if (SECRET_KEY.test(key)) return '[credential-locator-redacted]'
  if (Array.isArray(value)) return value.map(item => redactAdapterValue(item))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [childKey, redactAdapterValue(child, childKey)]))
  return value
}

export function schemaDeclaration(id: string, schema: Record<string, unknown>): AdapterSchemaDeclaration {
  const version = '1.0.0'
  return { id, version, digest: sha256Digest(canonicalJson(schema)), dialect: 'https://json-schema.org/draft/2020-12/schema', schema }
}

export function configureObject<T extends Record<string, unknown>>(
  operation: AdapterOperation,
  value: unknown,
  validate: (candidate: Record<string, unknown>) => candidate is T,
): AdapterConfigurationResult<T> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || containsRawSecret(value)) {
    return { ok: false, diagnostics: [diagnostic(operation, containsRawSecret(value) ? 'ADAPTER_SECRET_REJECTED' : 'ADAPTER_INVALID_CONFIGURATION', containsRawSecret(value) ? 'Secret-like fields must contain an opaque credential locator, never credential material.' : 'Configuration must be an object accepted by the adapter schema.')] }
  }
  const candidate = structuredClone(value as Record<string, unknown>)
  if (!validate(candidate)) return { ok: false, diagnostics: [diagnostic(operation, 'ADAPTER_INVALID_CONFIGURATION', 'Configuration does not satisfy the adapter contract.')] }
  return { ok: true, config: candidate, configDigest: sha256Digest(canonicalJson(redactAdapterValue(candidate))), diagnostics: [] }
}

export function validateCheckpoint(checkpoint: AdapterCheckpoint | undefined, manifest: AdapterManifest, sourceIdentity: string): AdapterDiagnostic[] {
  if (!checkpoint) return []
  const valid = checkpoint.contractVersion === DATASET_ADAPTER_CONTRACT_VERSION
    && checkpoint.kind === 'AdapterCheckpoint'
    && checkpoint.adapter.id === manifest.id
    && checkpoint.adapter.version === manifest.version
    && checkpoint.sourceIdentity === sourceIdentity
    && /^-?\d+$/u.test(checkpoint.cursor)
    && checkpoint.schema.id === manifest.schemas.checkpoint.id
    && checkpoint.schema.version === manifest.schemas.checkpoint.version
    && checkpoint.schema.digest?.value === manifest.schemas.checkpoint.digest.value
  return valid ? [] : [diagnostic('read', 'ADAPTER_CHECKPOINT_INCOMPATIBLE', 'Checkpoint identity, adapter version, or schema binding is incompatible; no records were read.')]
}

export class AdapterRegistry {
  readonly #adapters = new Map<string, DatasetSourceAdapter>()
  constructor(private readonly trust: { allowIds: Set<string>; allowUntrusted?: boolean }) {}

  register(adapter: DatasetSourceAdapter): void {
    const manifest = adapter.describe()
    if (!this.trust.allowIds.has(manifest.id)) throw new Error(`ADAPTER_NOT_ALLOWLISTED: ${manifest.id}`)
    if (manifest.trust.state === 'untrusted' && !this.trust.allowUntrusted) throw new Error(`ADAPTER_TRUST_REQUIRED: ${manifest.id}`)
    if (manifest.permissions.credentials !== 'none' && manifest.permissions.credentials !== 'locator-only') throw new Error(`ADAPTER_PERMISSION_INVALID: ${manifest.id}`)
    this.#adapters.set(`${manifest.id}@${manifest.version}`, adapter)
  }

  require(id: string, version: string): DatasetSourceAdapter {
    const adapter = this.#adapters.get(`${id}@${version}`)
    if (!adapter) throw new Error(`ADAPTER_NOT_REGISTERED: ${id}@${version}`)
    return adapter
  }
}

export async function qualifyAdapter(
  adapter: DatasetSourceAdapter,
  options: { fixtureRevision: string; qualifiedAt: string; cells: AdapterQualificationCell[] },
): Promise<AdapterQualificationReport> {
  const manifest = adapter.describe()
  const required = new Set(['configuration-schema', 'preview-purity', 'deterministic-read', 'stable-errors', 'cancellation', 'checkpoints', 'version-upgrade', 'secret-leakage'])
  const passed = new Set(options.cells.filter(cell => cell.passed).map(cell => cell.name))
  const qualified = [...required].every(name => passed.has(name))
  const realSource = options.cells.some(cell => cell.source === 'real-source' && cell.passed)
  return {
    contractVersion: DATASET_ADAPTER_CONTRACT_VERSION,
    kind: 'AdapterQualificationReport',
    adapter: { id: manifest.id, version: manifest.version, packageDigest: manifest.packageDigest },
    schemas: {
      config: binding(manifest.schemas.config), record: binding(manifest.schemas.discoveredRecord), checkpoint: binding(manifest.schemas.checkpoint),
    },
    fixtureRevision: options.fixtureRevision,
    cells: structuredClone(options.cells), qualifiedAt: options.qualifiedAt,
    qualified, stableEligible: qualified && realSource,
  }
}

function binding(schema: AdapterSchemaDeclaration) {
  return { id: schema.id, version: schema.version, digest: schema.digest }
}

export function request<T extends Record<string, unknown>>(requestId: string, config: T, policy: AdapterRequest<T>['policy'], limits: Partial<AdapterLimits> = {}): AdapterRequest<T> {
  return { contractVersion: DATASET_ADAPTER_CONTRACT_VERSION, requestId, config, policy, limits: { ...DEFAULT_ADAPTER_LIMITS, ...limits } }
}
