import { createHash, randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { link, lstat, mkdir, open, readFile, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_UHP_LIMITS, isUhpLoopback, isUhpPrivateAddress, resolveUhpLimits, validateUhpEndpoint } from './config.js';
import { parseUhpError, redactUhpText, UhpError } from './errors.js';
import { parseUhpEventStream } from './sse.js';
import {
  UHP_VERSION,
  type UhpDiscovery,
  type UhpEndpointProfile,
  type UhpEvent,
  type UhpFile,
  type UhpHarness,
  type UhpResponse,
  type UhpResponseRequest,
} from './types.js';

export type UhpFetch = typeof globalThis.fetch;
export type UhpCredentialResolver = (profile: UhpEndpointProfile) => Promise<string>;

const ID_PATTERNS = {
  harness: /^chrn_[A-Za-z0-9_-]+$/,
  response: /^resp_[A-Za-z0-9_-]+$/,
  session: /^hsess[A-Za-z0-9_-]+$/,
  container: /^cntr_[A-Za-z0-9_-]+$/,
  file: /^file_[A-Za-z0-9_-]+$/,
};
const TERMINAL = new Set(['completed', 'failed', 'incomplete', 'cancelled']);

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, stableValue(child)]));
}

export function canonicalUhpRequestDigest(request: UhpResponseRequest): string {
  return createHash('sha256').update(JSON.stringify(stableValue(request))).digest('hex');
}

export function uhpIdempotencyKey(request: UhpResponseRequest): string {
  return `aiwg-${canonicalUhpRequestDigest(request)}`;
}

export function resolveEnvironmentCredential(profile: UhpEndpointProfile, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const value = env[profile.credential.name];
  if (!value || /[\r\n]/.test(value)) throw new UhpError('missing_credential', `Credential reference '${profile.credential.name}' is unavailable or invalid`, { remoteState: 'not-started' });
  return Promise.resolve(value);
}

function assertId(kind: keyof typeof ID_PATTERNS, value: string): string {
  if (!ID_PATTERNS[kind].test(value)) throw new UhpError('invalid_identifier', `Malformed UHP ${kind} identifier`, { remoteState: 'not-started' });
  return value;
}

async function readBounded(response: Response, maxBytes = 2 * 1024 * 1024): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new UhpError('response_too_large', 'UHP response exceeded the configured size limit', { remoteState: 'unknown' });
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw new UhpError('response_too_large', 'UHP response exceeded the configured size limit', { remoteState: 'unknown' });
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output;
}

function parseJson(bytes: Uint8Array): unknown {
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new UhpError('invalid_json', 'UHP server returned malformed JSON', { remoteState: 'unknown' }); }
}

function ensureDiscovery(value: unknown): UhpDiscovery {
  if (!value || typeof value !== 'object') throw new UhpError('invalid_discovery', 'UHP discovery document must be an object');
  const discovery = value as UhpDiscovery;
  if (discovery.object !== 'uhp.discovery' || discovery.protocol !== 'uhp') throw new UhpError('invalid_discovery', 'Endpoint did not return a UHP discovery document');
  if (!Array.isArray(discovery.versions) || !discovery.versions.length || !discovery.versions.every(version => typeof version === 'string')) throw new UhpError('invalid_discovery', 'UHP discovery versions must be a non-empty string array');
  if (!discovery.versions.includes(discovery.default_version)) throw new UhpError('invalid_discovery', 'UHP default version is not listed as supported');
  if (!discovery.versions.includes(UHP_VERSION)) throw new UhpError('unsupported_protocol_version', `UHP endpoint does not advertise required version ${UHP_VERSION}`);
  if (!['core', 'extended', 'full'].includes(discovery.conformance_class)) throw new UhpError('invalid_discovery', 'UHP discovery has an unknown conformance class');
  const required = discovery.conformance_class === 'core' ? ['streaming', 'sessions', 'cancellation', 'idempotency']
    : discovery.conformance_class === 'extended' ? ['streaming', 'sessions', 'cancellation', 'idempotency', 'files_input', 'files_output', 'session_listing']
      : ['streaming', 'sessions', 'cancellation', 'idempotency', 'files_input', 'files_output', 'session_listing', 'harness_management', 'session_sharing'];
  if (required.some(capability => discovery.capabilities?.[capability] !== true)) throw new UhpError('invalid_discovery', 'UHP conformance class contradicts advertised capabilities');
  return discovery;
}

function ensureResponse(value: unknown): UhpResponse {
  if (!value || typeof value !== 'object') throw new UhpError('invalid_response', 'UHP response must be an object', { remoteState: 'unknown' });
  const response = value as UhpResponse;
  if (response.object !== 'response' || !ID_PATTERNS.response.test(response.id)
    || !Number.isSafeInteger(response.created_at) || typeof response.status !== 'string'
    || typeof response.model !== 'string' || !Array.isArray(response.output)
    || (response.metadata !== undefined && (!response.metadata || typeof response.metadata !== 'object'))) {
    throw new UhpError('invalid_response', 'UHP response is missing required identity or lifecycle fields', { remoteState: 'unknown' });
  }
  return { ...response, metadata: response.metadata ?? {} };
}

function safeFilename(value: string): string {
  let decoded = value;
  for (let i = 0; i < 3; i += 1) {
    try { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; } catch { break; }
  }
  const base = path.basename(decoded.replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f]/g, '_').trim();
  if (!base || base === '.' || base === '..') return `artifact-${randomUUID()}`;
  return base.slice(0, 240);
}

export class UhpClient {
  private readonly base: URL;
  private readonly limits;
  private readonly idempotency = new Map<string, string>();
  private readonly enforceDnsPolicy: boolean;

  constructor(
    readonly profileName: string,
    readonly profile: UhpEndpointProfile,
    private readonly fetchImpl: UhpFetch = globalThis.fetch,
    private readonly credentialResolver: UhpCredentialResolver = resolveEnvironmentCredential,
  ) {
    this.base = validateUhpEndpoint(profile.endpoint, profile);
    this.limits = { ...DEFAULT_UHP_LIMITS, ...resolveUhpLimits(profile) };
    this.enforceDnsPolicy = fetchImpl === globalThis.fetch;
  }

  private async assertResolvedTarget(target: URL): Promise<void> {
    if (!this.enforceDnsPolicy || /^[\d.]+$/.test(target.hostname) || target.hostname.startsWith('[')) return;
    let addresses: Array<{ address: string }>;
    try { addresses = await lookup(target.hostname, { all: true, verbatim: true }); }
    catch { throw new UhpError('endpoint_resolution_failed', 'UHP endpoint hostname could not be resolved', { remoteState: 'not-started' }); }
    for (const { address } of addresses) {
      if (!isUhpPrivateAddress(address)) continue;
      const permitted = isUhpLoopback(address)
        ? this.profile.trust?.allowInsecureLoopback === true
        : this.profile.trust?.allowPrivateNetwork === true;
      if (!permitted) throw new UhpError('endpoint_resolution_blocked', 'UHP endpoint resolved outside the profile network trust policy', { remoteState: 'not-started' });
    }
  }

  private url(relative: string, base = this.base): URL {
    const root = new URL(base.toString());
    if (!root.pathname.endsWith('/')) root.pathname += '/';
    return new URL(relative.replace(/^\/+/, ''), root);
  }

  private async fetch(
    relative: string,
    init: RequestInit & { authenticated?: boolean; timeoutMs?: number },
  ): Promise<{ response: Response; secret?: string }> {
    const authenticated = init.authenticated !== false;
    const secret = authenticated ? await this.credentialResolver(this.profile) : undefined;
    let target = this.url(relative);
    let headers = new Headers(init.headers);
    headers.set('UHP-Version', UHP_VERSION);
    if (authenticated && secret) headers.set('Authorization', `Bearer ${secret}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('request timeout')), init.timeoutMs ?? this.limits.requestTimeoutMs);
    const externalSignal = init.signal;
    const abort = () => controller.abort(externalSignal?.reason);
    externalSignal?.addEventListener('abort', abort, { once: true });
    try {
      for (let redirects = 0; ; redirects += 1) {
        await this.assertResolvedTarget(target);
        let response: Response;
        try { response = await this.fetchImpl(target, { ...init, headers, redirect: 'manual', signal: controller.signal }); }
        catch (error) {
          const state = init.method === 'POST' ? 'unknown' : 'not-started';
          throw new UhpError(controller.signal.aborted ? 'request_timeout' : 'network_error', redactUhpText(controller.signal.aborted ? 'UHP request timed out; remote task state is unknown' : `UHP network request failed: ${(error as Error).message}`, secret ? [secret] : []), { retryable: true, remoteState: state });
        }
        if (![301, 302, 303, 307, 308].includes(response.status)) return { response, secret };
        const location = response.headers.get('location');
        if (!this.profile.trust?.allowRedirects || !location || redirects >= 3) throw new UhpError('redirect_blocked', 'UHP redirect was blocked by endpoint policy', { remoteState: init.method === 'POST' ? 'unknown' : 'not-started' });
        const next = new URL(location, target);
        validateUhpEndpoint(next.toString(), this.profile);
        if (next.origin !== target.origin && authenticated) throw new UhpError('credential_redirect_blocked', 'Cross-origin UHP redirect was blocked before forwarding authentication', { remoteState: init.method === 'POST' ? 'unknown' : 'not-started' });
        target = next;
      }
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abort);
    }
  }

  private async json<T>(relative: string, init: RequestInit & { authenticated?: boolean; timeoutMs?: number } = {}): Promise<T> {
    const { response, secret } = await this.fetch(relative, init);
    const version = response.headers.get('UHP-Version');
    const bytes = await readBounded(response);
    const payload = bytes.byteLength ? parseJson(bytes) : null;
    if (version !== UHP_VERSION) throw new UhpError('protocol_version_mismatch', `Expected UHP-Version ${UHP_VERSION}, received ${version ?? 'none'}`, { remoteState: init.method === 'POST' ? 'unknown' : 'not-started' });
    if (!response.ok) throw parseUhpError(response.status, payload, secret ? [secret] : []);
    return payload as T;
  }

  async discover(): Promise<UhpDiscovery> {
    return ensureDiscovery(await this.json('v1/uhp', { authenticated: false }));
  }

  async listHarnesses(): Promise<UhpHarness[]> {
    const payload = await this.json<{ harnesses?: UhpHarness[] }>('v1/harnesses');
    if (!Array.isArray(payload.harnesses)) throw new UhpError('invalid_response', 'UHP harness list is malformed');
    return payload.harnesses;
  }

  async listModels(harnessId?: string): Promise<unknown> {
    return this.json(harnessId ? `v1/harnesses/${encodeURIComponent(assertId('harness', harnessId))}/models` : 'v1/models');
  }

  async createResponse(request: UhpResponseRequest, options: { idempotencyKey?: string; signal?: AbortSignal } = {}): Promise<UhpResponse> {
    const normalized = { ...request, stream: false, metadata: { ...request.metadata, ...(request.metadata?.harness_id || !this.profile.defaultHarness ? {} : { harness_id: this.profile.defaultHarness }) }, ...(request.model || !this.profile.defaultModel ? {} : { model: this.profile.defaultModel }) };
    if ((normalized.timeout_seconds ?? this.limits.maxTaskSeconds) > this.limits.maxTaskSeconds) throw new UhpError('task_budget_exceeded', 'Requested UHP task duration exceeds the profile limit', { remoteState: 'not-started' });
    const digest = canonicalUhpRequestDigest(normalized);
    const key = options.idempotencyKey ?? `aiwg-${digest}`;
    const prior = this.idempotency.get(key);
    if (prior && prior !== digest) throw new UhpError('idempotency_key_reused', 'Idempotency key cannot be reused for changed UHP task content', { remoteState: 'not-started' });
    this.idempotency.set(key, digest);
    for (let attempt = 0; ; attempt += 1) {
      try {
        const payload = await this.json<unknown>('v1/responses', {
          method: 'POST', signal: options.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Idempotency-Key': key },
          body: JSON.stringify(normalized),
          timeoutMs: Math.max(this.limits.requestTimeoutMs, ((normalized.timeout_seconds ?? 0) * 1_000) + 30_000),
        });
        return ensureResponse(payload);
      } catch (error) {
        const uhpError = error instanceof UhpError ? error : undefined;
        if (!uhpError?.options.retryable || uhpError.code === 'session_busy' || attempt >= this.limits.maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.min(10 * 2 ** attempt, 250)));
        options.signal?.throwIfAborted();
      }
    }
  }

  async *streamResponse(request: UhpResponseRequest, options: { idempotencyKey?: string; signal?: AbortSignal } = {}): AsyncGenerator<UhpEvent> {
    const normalized = { ...request, stream: true, metadata: { ...request.metadata, ...(request.metadata?.harness_id || !this.profile.defaultHarness ? {} : { harness_id: this.profile.defaultHarness }) } };
    const digest = canonicalUhpRequestDigest(normalized);
    const key = options.idempotencyKey ?? `aiwg-${digest}`;
    const prior = this.idempotency.get(key);
    if (prior && prior !== digest) throw new UhpError('idempotency_key_reused', 'Idempotency key cannot be reused for changed UHP task content', { remoteState: 'not-started' });
    this.idempotency.set(key, digest);
    const { response, secret } = await this.fetch('v1/responses', {
      method: 'POST', signal: options.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', 'Idempotency-Key': key }, body: JSON.stringify(normalized),
      timeoutMs: Math.max(this.limits.requestTimeoutMs, ((normalized.timeout_seconds ?? 0) * 1_000) + 30_000),
    });
    if (response.headers.get('UHP-Version') !== UHP_VERSION) throw new UhpError('protocol_version_mismatch', 'UHP stream response did not preserve the pinned version', { remoteState: 'unknown' });
    if (!response.ok) throw parseUhpError(response.status, parseJson(await readBounded(response)), secret ? [secret] : []);
    if (!response.headers.get('content-type')?.toLowerCase().startsWith('text/event-stream') || !response.body) throw new UhpError('invalid_stream', 'UHP streaming response must be text/event-stream', { remoteState: 'unknown' });
    yield* parseUhpEventStream(response.body, { inactivityTimeoutMs: this.limits.inactivityTimeoutMs, secrets: secret ? [secret] : [], signal: options.signal });
  }

  async readResponse(responseId: string): Promise<UhpResponse> {
    return ensureResponse(await this.json(`v1/responses/${encodeURIComponent(assertId('response', responseId))}`));
  }

  /** Stored-response reads are authoritative after stream loss or local timeout. */
  async reconcileUnknownResponse(responseId: string): Promise<UhpResponse> {
    return this.readResponse(responseId);
  }

  async continueResponse(previousResponseId: string, request: UhpResponseRequest, options: { idempotencyKey?: string; signal?: AbortSignal } = {}): Promise<UhpResponse> {
    const previous = await this.readResponse(previousResponseId);
    const harness = previous.metadata.harness_id;
    if (request.metadata?.harness_id && harness && request.metadata.harness_id !== harness) throw new UhpError('harness_mismatch', 'Continuation harness does not match the existing UHP session', { remoteState: 'not-started' });
    return this.createResponse({ ...request, previous_response_id: previousResponseId, metadata: { ...request.metadata, ...(harness ? { harness_id: harness } : {}) } }, options);
  }

  async cancelResponse(responseId: string, options: { wait?: boolean; signal?: AbortSignal } = {}): Promise<UhpResponse> {
    const id = encodeURIComponent(assertId('response', responseId));
    let response = ensureResponse(await this.json(`v1/responses/${id}/cancel`, { method: 'POST', signal: options.signal, headers: { 'Content-Type': 'application/json' }, body: '{}' }));
    if (!options.wait) return response;
    for (let attempt = 0; attempt < 20 && !TERMINAL.has(response.status); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, Math.min(250 * 2 ** attempt, 2_000)));
      options.signal?.throwIfAborted();
      response = await this.readResponse(responseId);
    }
    return response;
  }

  async listArtifacts(sessionId: string): Promise<UhpFile[]> {
    const payload = await this.json<{ files?: UhpFile[] }>(`v1/sessions/${encodeURIComponent(assertId('session', sessionId))}/files`);
    if (!Array.isArray(payload.files)) throw new UhpError('invalid_response', 'UHP artifact list is malformed');
    if (payload.files.length > this.limits.maxArtifactCount) throw new UhpError('artifact_count_exceeded', 'UHP artifact count exceeds the profile limit');
    return payload.files;
  }

  async downloadArtifact(containerId: string, fileId: string, destinationDirectory: string, filename?: string): Promise<{ path: string; bytes: number; contentType: string }> {
    assertId('container', containerId); assertId('file', fileId);
    await mkdir(destinationDirectory, { recursive: true, mode: 0o700 });
    const directoryInfo = await lstat(destinationDirectory);
    if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) throw new UhpError('unsafe_artifact_destination', 'Artifact destination must be a non-symlink directory');
    const { response, secret } = await this.fetch(`v1/containers/${encodeURIComponent(containerId)}/files/${encodeURIComponent(fileId)}/content`, { method: 'GET' });
    if (response.headers.get('UHP-Version') !== UHP_VERSION) throw new UhpError('protocol_version_mismatch', 'Artifact response did not preserve the pinned UHP version');
    if (!response.ok) throw parseUhpError(response.status, parseJson(await readBounded(response)), secret ? [secret] : []);
    if (response.headers.get('x-content-type-options')?.toLowerCase() !== 'nosniff') throw new UhpError('artifact_missing_nosniff', 'Refusing UHP artifact without X-Content-Type-Options: nosniff');
    const bytes = await readBounded(response, this.limits.maxArtifactBytes);
    const target = path.resolve(destinationDirectory, safeFilename(filename ?? fileId));
    const root = path.resolve(destinationDirectory) + path.sep;
    if (!target.startsWith(root)) throw new UhpError('artifact_path_traversal', 'Artifact filename escaped the approved destination');
    const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
    try {
      // A hard-link publishes atomically and, unlike rename, never overwrites an
      // existing approved artifact path.
      await link(temporary, target);
      await unlink(temporary);
    } catch (error) { await unlink(temporary).catch(() => undefined); throw error; }
    return { path: target, bytes: bytes.byteLength, contentType: response.headers.get('content-type') ?? 'application/octet-stream' };
  }

  async uploadFile(filename: string): Promise<UhpFile> {
    const info = await stat(filename);
    if (!info.isFile() || info.size > this.limits.maxUploadBytes) throw new UhpError('file_too_large', 'UHP upload is not a regular file within the configured size limit', { remoteState: 'not-started' });
    const data = await readFile(filename);
    const form = new FormData();
    form.append('file', new Blob([data]), safeFilename(path.basename(filename)));
    return this.json<UhpFile>('v1/files', { method: 'POST', body: form });
  }
}
