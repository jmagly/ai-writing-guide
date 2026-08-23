// HTTP wrapper for A2A client + v1 fallback.
//
// Responsibilities:
//   - Bearer auth header injection
//   - A2A-Extensions header injection on every mutating call (#1254)
//   - Echo-verification warning when expected extensions are missing
//   - Idempotent-Replayed surfacing as a typed flag on the response
//   - RFC 7807 problem+json error parsing → typed `A2AError`
//   - Sunset / Deprecated / Link rel=successor-version header capture
//     for #1259 (deprecation telemetry — uses callbacks so the Prometheus
//     counter and structured logger plug in without coupling to the
//     telemetry module)
//   - Optional fail-on-deprecated mode (AIWG_FAIL_ON_DEPRECATED=true)

import type { A2AProtocolVersion, ProblemDetails } from './types.js';

export interface DeprecationInfo {
  /** Request path that triggered the deprecation headers (e.g. `/api/v1/sessions/xyz/dispatch`). */
  path: string;
  /** Value of the `Sunset` response header (RFC 8594), if present. */
  sunset?: string;
  /** Value of the `Deprecated` response header, if present. */
  deprecated?: string;
  /** URL extracted from `Link: <…>; rel="successor-version"`, if present. */
  successor?: string;
}

export interface A2ARequestOptions {
  method?: string;
  /** Body — serialized as JSON unless `bodyRaw` is set. */
  body?: unknown;
  /** Raw body (skip JSON encoding); content-type is caller's responsibility. */
  bodyRaw?: string | Uint8Array | ArrayBuffer | ReadableStream<Uint8Array>;
  /** Extra request headers (lowercase keys; merged after defaults). */
  headers?: Record<string, string>;
  /** Override the bearer token for this single call. */
  bearer?: string;
  /** When set, inject these extension URIs as the `A2A-Extensions` header.
   *  Mutating methods should always set this; non-mutating may skip. */
  extensions?: string[];
  /** AbortSignal to cancel the request. */
  signal?: AbortSignal;
  /** Don't parse the body — return the raw Response (used by SSE). */
  raw?: boolean;
  /** Override the client's negotiated A2A version for this request. */
  protocolVersion?: A2AProtocolVersion;
}

export interface A2AResponse<T = unknown> {
  /** HTTP status code. */
  status: number;
  /** Parsed JSON body (or undefined for empty/204). Absent when `raw: true`. */
  body: T | undefined;
  /** Raw Headers, in case the caller needs them. */
  headers: Headers;
  /** True when the executor served this from the idempotency cache. */
  idempotentReplayed: boolean;
  /** Extension URIs the executor echoed (parsed from response `A2A-Extensions`). */
  activatedExtensions: string[];
  /** Captured deprecation info, if the response carried `Sunset` / `Deprecated`. */
  deprecation?: DeprecationInfo;
  /** Raw response body stream (only set when `raw: true`). Caller owns the
   *  lifecycle — must consume or release. */
  rawBody?: ReadableStream<Uint8Array> | null;
}

export class A2AError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails;
  readonly path: string;
  readonly category: 'negotiation' | 'authorization' | 'application' | 'transport';
  readonly versionNotSupported: boolean;

  constructor(
    status: number,
    path: string,
    problem: ProblemDetails,
    category?: 'negotiation' | 'authorization' | 'application' | 'transport'
  ) {
    super(`${status} ${problem.code ?? problem.title}: ${problem.detail ?? problem.title}`);
    this.name = 'A2AError';
    this.status = status;
    this.problem = problem;
    this.path = path;
    this.versionNotSupported = isVersionNotSupportedProblem(problem);
    this.category = category ?? (this.versionNotSupported
      ? 'negotiation'
      : status === 401 || status === 403
        ? 'authorization'
        : status === 0
          ? 'transport'
        : status >= 400
          ? 'application'
          : 'transport');
  }
}

export interface A2AHttpClientOptions {
  baseUrl: string;
  bearer: string;
  /** Default extensions to inject on mutating calls. Typically the
   *  `required: true` set from the cached AgentCard. */
  defaultExtensions?: string[];
  /** Fail-fast on any v1 deprecation hit (mirrors AIWG_FAIL_ON_DEPRECATED). */
  failOnDeprecated?: boolean;
  /** Custom fetch implementation (for tests + future runtime polyfills). */
  fetch?: typeof fetch;
  /** Called once per (path, sunset) pair when deprecation headers seen. */
  onDeprecation?: (info: DeprecationInfo) => void;
  /** Called when an expected extension is requested but not echoed in the response. */
  onExtensionEchoMissing?: (expected: string[], echoed: string[], path: string) => void;
  /** Selected wire version. 0.3 intentionally omits A2A-Version. */
  protocolVersion?: A2AProtocolVersion;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class A2AHttpClient {
  private readonly baseUrl: string;
  private readonly bearer: string;
  private readonly defaultExtensions: string[];
  private readonly failOnDeprecated: boolean;
  private readonly fetchImpl: typeof fetch;
  private readonly onDeprecation?: (info: DeprecationInfo) => void;
  private readonly onExtensionEchoMissing?: (
    expected: string[],
    echoed: string[],
    path: string
  ) => void;
  /** Per-process dedupe set: one log per (path, sunset_date). */
  private readonly seenDeprecations = new Set<string>();
  private readonly protocolVersion: A2AProtocolVersion;

  constructor(opts: A2AHttpClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.bearer = opts.bearer;
    this.defaultExtensions = opts.defaultExtensions ?? [];
    this.failOnDeprecated = opts.failOnDeprecated ?? false;
    this.fetchImpl = opts.fetch ?? fetch;
    this.onDeprecation = opts.onDeprecation;
    this.onExtensionEchoMissing = opts.onExtensionEchoMissing;
    this.protocolVersion = opts.protocolVersion ?? '0.3';
  }

  async request<T = unknown>(
    path: string,
    options: A2ARequestOptions = {}
  ): Promise<A2AResponse<T>> {
    const method = (options.method ?? 'GET').toUpperCase();
    const url = path.startsWith('http') ? path : this.baseUrl + path;
    const protocolVersion = options.protocolVersion ?? this.protocolVersion;
    const mediaType = protocolVersion === '1.0' ? 'application/a2a+json' : 'application/json';
    const headers: Record<string, string> = {
      authorization: `Bearer ${options.bearer ?? this.bearer}`,
      accept: mediaType,
    };

    if (protocolVersion === '1.0') headers['a2a-version'] = '1.0';

    if (options.body !== undefined && options.bodyRaw === undefined) {
      headers['content-type'] = mediaType;
    }

    // Inject A2A-Extensions on mutating calls. Caller can override with
    // options.extensions (empty array clears injection).
    if (MUTATING_METHODS.has(method)) {
      const exts = options.extensions ?? this.defaultExtensions;
      if (exts.length > 0) {
        headers['a2a-extensions'] = exts.join(', ');
      }
    }

    // Caller overrides last so explicit headers win.
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        headers[k.toLowerCase()] = v;
      }
    }

    const init: RequestInit = { method, headers, signal: options.signal };
    if (options.bodyRaw !== undefined) {
      init.body = options.bodyRaw;
    } else if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    let resp: Response;
    try {
      resp = await this.fetchImpl(url, init);
    } catch (error) {
      throw new A2AError(0, path, {
        type: 'about:blank',
        title: 'A2A transport failure',
        detail: error instanceof Error ? error.message : String(error),
        code: 'aiwg.transport_failure',
      }, 'transport');
    }

    // Capture deprecation headers regardless of status.
    const deprecation = captureDeprecation(path, resp.headers);
    if (deprecation) {
      const key = `${deprecation.path}|${deprecation.sunset ?? ''}`;
      if (!this.seenDeprecations.has(key)) {
        this.seenDeprecations.add(key);
        if (this.onDeprecation) this.onDeprecation(deprecation);
      }
      if (this.failOnDeprecated) {
        throw new A2AError(resp.status, path, {
          type: 'about:blank',
          title: 'Deprecated endpoint',
          detail: `AIWG_FAIL_ON_DEPRECATED is set; ${path} is deprecated (sunset=${deprecation.sunset ?? '?'})`,
          code: 'aiwg.deprecation_strict',
        });
      }
    }

    const idempotentReplayed = (resp.headers.get('idempotent-replayed') ?? '')
      .toLowerCase()
      .includes('true');

    const activatedExtensions = parseExtensionList(resp.headers.get('a2a-extensions'));

    // Warn if mutating call requested extensions that weren't echoed.
    if (MUTATING_METHODS.has(method)) {
      const requested = options.extensions ?? this.defaultExtensions;
      if (requested.length > 0) {
        const missing = requested.filter((e) => !activatedExtensions.includes(e));
        if (missing.length > 0 && this.onExtensionEchoMissing) {
          this.onExtensionEchoMissing(requested, activatedExtensions, path);
        }
      }
    }

    if (options.raw) {
      return {
        status: resp.status,
        body: undefined,
        headers: resp.headers,
        idempotentReplayed,
        activatedExtensions,
        rawBody: resp.body,
        ...(deprecation ? { deprecation } : {}),
      };
    }

    // Parse body (JSON, problem+json, or empty).
    let body: T | undefined;
    const ct = resp.headers.get('content-type') ?? '';
    if (
      protocolVersion === '1.0'
      && resp.status < 400
      && resp.status !== 204
      && resp.status !== 205
      && !ct.toLowerCase().includes('application/a2a+json')
    ) {
      throw new A2AError(502, path, {
        type: 'about:blank',
        title: 'Invalid A2A 1.0 content type',
        detail: `Expected application/a2a+json, received ${ct || '(missing)'}`,
        code: 'aiwg.invalid_content_type',
      }, 'transport');
    }
    if (resp.status !== 204 && resp.status !== 205) {
      const text = await resp.text();
      if (text.length > 0) {
        if (ct.includes('json')) {
          try {
            body = JSON.parse(text) as T;
          } catch (err) {
            throw new A2AError(resp.status, path, {
              type: 'about:blank',
              title: 'Invalid JSON',
              detail: `Response was not parseable JSON: ${(err as Error).message}`,
              code: 'aiwg.invalid_response',
            });
          }
        } else {
          body = text as unknown as T;
        }
      }
    }

    if (resp.status >= 400) {
      const problem = normalizeProblemDetails(resp.status, body) ?? {
        type: 'about:blank',
        title: `HTTP ${resp.status}`,
      };
      throw new A2AError(resp.status, path, problem);
    }

    return {
      status: resp.status,
      body,
      headers: resp.headers,
      idempotentReplayed,
      activatedExtensions,
      ...(deprecation ? { deprecation } : {}),
    };
  }
}

export function isVersionNotSupportedProblem(problem: ProblemDetails): boolean {
  const type = problem.type?.toLowerCase() ?? '';
  const code = problem.code?.toLowerCase() ?? '';
  return type.includes('version-not-supported')
    || code === 'versionnotsupportederror'
    || code === 'version_not_supported'
    || code === 'a2a.version_not_supported'
    || code === '-32009';
}

function normalizeProblemDetails(status: number, body: unknown): ProblemDetails | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
  const obj = body as Record<string, unknown>;
  // HTTP+JSON uses RFC 7807. JSON-RPC bindings may nest the standard code.
  const nested = obj.error && typeof obj.error === 'object' && !Array.isArray(obj.error)
    ? obj.error as Record<string, unknown>
    : undefined;
  const source = nested ?? obj;
  const codeValue = source.code;
  const code = typeof codeValue === 'string' || typeof codeValue === 'number'
    ? String(codeValue)
    : undefined;
  const title = typeof obj.title === 'string'
    ? obj.title
    : typeof source.message === 'string'
      ? source.message
      : `HTTP ${status}`;
  const problem: ProblemDetails = {
    type: typeof obj.type === 'string' ? obj.type : 'about:blank',
    title,
    status,
    ...(typeof obj.detail === 'string' ? { detail: obj.detail } : {}),
    ...(code ? { code } : {}),
    ...(Array.isArray(obj.supportedVersions) && obj.supportedVersions.every(v => typeof v === 'string')
      ? { supportedVersions: obj.supportedVersions as string[] }
      : {}),
  };
  return problem;
}

// ---------- header helpers ----------

function parseExtensionList(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function captureDeprecation(path: string, headers: Headers): DeprecationInfo | undefined {
  const sunset = headers.get('sunset') ?? undefined;
  const deprecated = headers.get('deprecated') ?? undefined;
  const link = headers.get('link') ?? undefined;
  if (!sunset && !deprecated && !link) return undefined;

  let successor: string | undefined;
  if (link) {
    // Match the `successor-version` rel target — RFC 5988 Link entries are
    // comma-separated; we look for `rel="successor-version"` or `rel=successor-version`.
    const re = /<([^>]+)>\s*;\s*[^,]*rel\s*=\s*"?successor-version"?/i;
    const m = re.exec(link);
    if (m) successor = m[1];
  }

  return {
    path,
    ...(sunset ? { sunset } : {}),
    ...(deprecated ? { deprecated } : {}),
    ...(successor ? { successor } : {}),
  };
}
