import type { AtomicMutation, BatchReceipt, StorageBackendDescriptor, VersionedRecord } from '../backend-contract.js';
import { STORAGE_BACKEND_CONTRACT } from '../backend-contract.js';
import type { MigrationChangePage, MigrationEndpoint, MigrationEndpointIdentity, MigrationSnapshot } from '../migration-protocol.js';
import { postgresBatchId, postgresPayloadDigest } from './postgres.js';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_PAYLOAD_BYTES = 1_048_576;
const DEFAULT_PAGE_SIZE = 1000;

export interface PostgrestBackendOptions {
  baseUrl: string;
  tenant: string;
  subsystem: string;
  instance?: string;
  authorizationEnv?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  maxPayloadBytes?: number;
  maxResponseBytes?: number;
  maxBatchSize?: number;
  maxPageSize?: number;
}

export interface PostgrestHealth {
  healthy: boolean;
  ready: boolean;
  schemaVersion: string;
  highWaterMark: string;
  accessMode: 'postgrest';
  engine: 'postgres';
}

interface PostgrestSnapshot<T> {
  snapshot_id: string;
  high_water_mark: string;
  records: VersionedRecord<T>[];
}

interface PostgrestChanges<T> {
  high_water_mark: string;
  next_cursor?: string;
  records: VersionedRecord<T>[];
}

export class PostgrestBackendError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'PostgrestBackendError';
  }
}

/** PostgreSQL accessMode=postgrest; not a separate storage engine. */
export class PostgrestStorageBackend<T = unknown> implements MigrationEndpoint<T> {
  readonly descriptor: StorageBackendDescriptor = {
    contract: STORAGE_BACKEND_CONTRACT,
    backend: 'postgres-postgrest',
    implementationVersion: '1.0.0',
    schemaVersion: '1',
    maturity: 'advanced',
    capabilities: [
      'read', 'atomic-batch', 'consistent-snapshot', 'change-cursor',
      'tombstones', 'idempotency-keys', 'filtered-query', 'cursor-pagination',
      'health', 'readiness', 'tenant-isolation', 'subsystem-isolation', 'tls',
    ],
    durability: 'replicated',
    availability: 'remote-service',
    isolation: 'serializable',
    dataClass: 'canonical',
  };
  readonly identity: MigrationEndpointIdentity;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly timeoutMs: number;
  private readonly maxPayloadBytes: number;
  private readonly maxResponseBytes: number;
  private readonly maxBatchSize: number;
  private readonly maxPageSize: number;

  constructor(private readonly options: PostgrestBackendOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) throw new PostgrestBackendError('AIWG_POSTGREST_FETCH_UNAVAILABLE', 'fetch is unavailable');
    this.timeoutMs = bounded(options.timeoutMs, DEFAULT_TIMEOUT_MS, 1, 600_000, 'timeoutMs');
    this.maxPayloadBytes = bounded(options.maxPayloadBytes, DEFAULT_MAX_PAYLOAD_BYTES, 1024, 16_777_216, 'maxPayloadBytes');
    this.maxResponseBytes = bounded(options.maxResponseBytes, DEFAULT_MAX_PAYLOAD_BYTES, 1024, 16_777_216, 'maxResponseBytes');
    this.maxBatchSize = bounded(options.maxBatchSize, DEFAULT_PAGE_SIZE, 1, 10_000, 'maxBatchSize');
    this.maxPageSize = bounded(options.maxPageSize, DEFAULT_PAGE_SIZE, 1, 10_000, 'maxPageSize');
    this.identity = {
      backend: 'postgres-postgrest', instance: options.instance ?? this.baseUrl,
      tenant: options.tenant, subsystem: options.subsystem, schemaVersion: '1',
    };
  }

  async init(): Promise<void> {
    const health = await this.health();
    if (!health.ready || health.schemaVersion !== '1') {
      throw new PostgrestBackendError('AIWG_POSTGREST_SCHEMA_UNAVAILABLE', 'PostgREST schema/RPC contract v1 is unavailable');
    }
  }

  async commitBatch(mutations: readonly AtomicMutation<T>[]): Promise<BatchReceipt> {
    if (mutations.length === 0) throw new PostgrestBackendError('AIWG_POSTGREST_EMPTY_BATCH', 'batch must contain at least one mutation');
    if (mutations.length > this.maxBatchSize) throw new PostgrestBackendError('AIWG_POSTGREST_BATCH_TOO_LARGE', `batch exceeds ${this.maxBatchSize} mutation ceiling`);
    for (const mutation of mutations) this.assertMutationIdentity(mutation);
    return this.rpc<BatchReceipt>('aiwg_commit_batch_v1', {
      p_tenant: this.options.tenant,
      p_subsystem: this.options.subsystem,
      p_batch_id: postgresBatchId(mutations),
      p_payload_digest: postgresPayloadDigest(mutations),
      p_mutations: mutations,
    }, 'return=representation');
  }

  async get(path: string): Promise<VersionedRecord<T> | null> {
    return this.rpc<VersionedRecord<T> | null>('aiwg_get_record_v1', {
      p_tenant: this.options.tenant,
      p_subsystem: this.options.subsystem,
      p_path: path,
    });
  }

  async readAll(): Promise<readonly VersionedRecord<T>[]> {
    const records: VersionedRecord<T>[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.query({}, this.maxPageSize, cursor, true);
      records.push(...page.records);
      cursor = page.nextCursor;
    } while (cursor);
    return records;
  }

  async query(filters: Record<string, unknown>, limit = this.maxPageSize, cursor?: string, includeTombstones = false): Promise<{ records: VersionedRecord<T>[]; nextCursor?: string }> {
    const boundedLimit = bounded(limit, this.maxPageSize, 1, this.maxPageSize, 'limit');
    return this.rpc('aiwg_query_records_v1', {
      p_tenant: this.options.tenant,
      p_subsystem: this.options.subsystem,
      p_filters: filters,
      p_after_path: cursor ?? null,
      p_limit: boundedLimit,
      p_include_tombstones: includeTombstones,
    });
  }

  async snapshot(): Promise<MigrationSnapshot<T>> {
    const response = await this.rpc<PostgrestSnapshot<T>>('aiwg_snapshot_v1', {
      p_tenant: this.options.tenant,
      p_subsystem: this.options.subsystem,
      p_limit: this.maxPageSize,
    });
    return {
      id: response.snapshot_id,
      highWaterMark: response.high_water_mark,
      cursor: response.high_water_mark,
      records: response.records,
    };
  }

  async changes(cursor: string | undefined): Promise<MigrationChangePage<T>> {
    if (cursor !== undefined && !/^\d+$/.test(cursor)) {
      throw new PostgrestBackendError('AIWG_POSTGREST_CURSOR_INVALID', 'change cursor must be an unsigned integer');
    }
    const response = await this.rpc<PostgrestChanges<T>>('aiwg_changes_v1', {
      p_tenant: this.options.tenant,
      p_subsystem: this.options.subsystem,
      p_after_cursor: cursor ?? '0',
      p_limit: this.maxPageSize,
    });
    return {
      records: response.records,
      highWaterMark: response.high_water_mark,
      ...(response.next_cursor ? { nextCursor: response.next_cursor } : {}),
    };
  }

  async reloadSchemaCache(): Promise<void> {
    await this.rpc('aiwg_reload_schema_v1', {});
  }

  async health(): Promise<PostgrestHealth> {
    return this.rpc<PostgrestHealth>('aiwg_health_v1', {
      p_tenant: this.options.tenant,
      p_subsystem: this.options.subsystem,
    });
  }

  private async rpc<R>(name: string, body: Record<string, unknown>, prefer?: string): Promise<R> {
    return this.request<R>(`/rpc/${name}`, { method: 'POST', body, ...(prefer ? { prefer } : {}) });
  }

  private async request<R>(pathname: string, options: { method?: string; body?: unknown; prefer?: string } = {}): Promise<R> {
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    if (body && Buffer.byteLength(body) > this.maxPayloadBytes) {
      throw new PostgrestBackendError('AIWG_POSTGREST_PAYLOAD_TOO_LARGE', `request exceeds ${this.maxPayloadBytes} byte ceiling`);
    }
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    if (options.prefer) headers.Prefer = options.prefer;
    const authorization = this.authorization();
    if (authorization) headers.Authorization = authorization;
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${pathname}`, {
        method: options.method ?? 'GET', headers, body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new PostgrestBackendError('AIWG_POSTGREST_TRANSPORT_FAILED', error instanceof Error ? error.message : String(error), true);
    }
    if (response.status === 204) return undefined as R;
    const declaredLength = Number(response.headers.get('content-length') ?? '0');
    if (declaredLength > this.maxResponseBytes) {
      throw new PostgrestBackendError('AIWG_POSTGREST_RESPONSE_TOO_LARGE', `response exceeds ${this.maxResponseBytes} byte ceiling`);
    }
    const responseBody = await response.text();
    if (Buffer.byteLength(responseBody) > this.maxResponseBytes) {
      throw new PostgrestBackendError('AIWG_POSTGREST_RESPONSE_TOO_LARGE', `response exceeds ${this.maxResponseBytes} byte ceiling`);
    }
    if (!response.ok) {
      const databaseError = parseDatabaseError(responseBody);
      const retryable = response.status === 408 || response.status === 425 || response.status === 429 ||
        response.status >= 500 || isRetryableDatabaseCode(databaseError.databaseCode);
      const exposedCode = databaseError.message?.startsWith('AIWG_')
        ? databaseError.message
        : retryable ? 'AIWG_POSTGREST_RETRYABLE' : 'AIWG_POSTGREST_REQUEST_FAILED';
      throw new PostgrestBackendError(
        exposedCode,
        `PostgREST request failed with HTTP ${response.status}${databaseError.databaseCode ? ` (database ${databaseError.databaseCode})` : ''}`,
        retryable,
        parseRetryAfter(response.headers.get('retry-after')),
      );
    }
    try { return JSON.parse(responseBody) as R; }
    catch { throw new PostgrestBackendError('AIWG_POSTGREST_RESPONSE_INVALID', 'PostgREST returned invalid JSON'); }
  }

  private authorization(): string | undefined {
    if (!this.options.authorizationEnv) return undefined;
    const value = process.env[this.options.authorizationEnv];
    if (!value) throw new PostgrestBackendError('AIWG_POSTGREST_CREDENTIAL_UNAVAILABLE', `authorization locator ${this.options.authorizationEnv} is not set`);
    return value;
  }

  private assertMutationIdentity(mutation: AtomicMutation<T>): void {
    if (mutation.record.identity.tenant !== this.options.tenant || mutation.record.identity.subsystem !== this.options.subsystem) {
      throw new PostgrestBackendError('AIWG_POSTGREST_IDENTITY_MISMATCH', 'mutation identity is outside this backend tenant/subsystem');
    }
  }
}

function parseDatabaseError(body: string): { databaseCode?: string; message?: string } {
  try {
    const parsed = JSON.parse(body) as { code?: unknown; message?: unknown };
    return {
      ...(typeof parsed.code === 'string' ? { databaseCode: parsed.code } : {}),
      ...(typeof parsed.message === 'string' ? { message: parsed.message } : {}),
    };
  } catch { return {}; }
}

function isRetryableDatabaseCode(code: string | undefined): boolean {
  return Boolean(code && (code === '40001' || code === '40P01' || code === '55P03' || code === '57014' || code.startsWith('08')));
}

function normalizeBaseUrl(raw: string): string {
  let url: URL;
  try { url = new URL(raw); } catch { throw new PostgrestBackendError('AIWG_POSTGREST_URL_INVALID', 'baseUrl must be an absolute URL'); }
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new PostgrestBackendError('AIWG_POSTGREST_TLS_REQUIRED', 'PostgREST requires HTTPS except on explicit loopback development endpoints');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new PostgrestBackendError('AIWG_POSTGREST_URL_SECRET_FORBIDDEN', 'baseUrl cannot contain credentials, query parameters, or fragments');
  }
  return url.toString().replace(/\/$/, '');
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Math.min(Number(value) * 1000, 60_000);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.max(0, Math.min(timestamp - Date.now(), 60_000));
}

function bounded(value: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < min || resolved > max) {
    throw new PostgrestBackendError('AIWG_POSTGREST_OPTION_INVALID', `${label} must be an integer from ${min} through ${max}`);
  }
  return resolved;
}
