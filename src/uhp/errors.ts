import type { UhpErrorBody } from './types.js';

const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\b(?:token|authorization|api[-_ ]?key)\b\s*[:=]\s*[^\s,;]+/gi,
];

export function redactUhpText(value: string, secrets: readonly string[] = []): string {
  let redacted = value;
  for (const secret of secrets) {
    if (secret) redacted = redacted.split(secret).join('[REDACTED]');
  }
  for (const pattern of SECRET_PATTERNS) redacted = redacted.replace(pattern, '[REDACTED]');
  return redacted.slice(0, 2_000);
}

function redactUhpValue(value: unknown, secrets: readonly string[], key?: string): unknown {
  if (key && /^(?:authorization|token|api[-_]?key|secret)$/i.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return redactUhpText(value, secrets);
  if (Array.isArray(value)) return value.map(item => redactUhpValue(item, secrets));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .map(([childKey, child]) => [childKey, redactUhpValue(child, secrets, childKey)]));
  }
  return value;
}

export class UhpError extends Error {
  readonly name = 'UhpError';

  constructor(
    readonly code: string,
    message: string,
    readonly options: {
      status?: number;
      type?: string;
      param?: string | null;
      detail?: Record<string, unknown> | null;
      retryable?: boolean;
      remoteState?: 'terminal' | 'unknown' | 'not-started';
    } = {},
  ) {
    super(redactUhpText(message));
  }
}

export function isRetryableUhpError(code: string, status?: number): boolean {
  if (code === 'rate_limited' || code === 'session_busy' || code === 'harness_unavailable') return true;
  if (code === 'quota_exhausted') return false;
  return status !== undefined && [500, 502, 503, 504].includes(status);
}

export function parseUhpError(status: number, payload: unknown, secrets: readonly string[] = []): UhpError {
  const candidate = payload && typeof payload === 'object'
    ? (payload as { error?: Partial<UhpErrorBody> }).error
    : undefined;
  const code = typeof candidate?.code === 'string' ? candidate.code : `http_${status}`;
  const message = typeof candidate?.message === 'string' ? candidate.message : `UHP request failed with HTTP ${status}`;
  const detail = candidate?.detail && typeof candidate.detail === 'object'
    ? redactUhpValue(candidate.detail, secrets) as Record<string, unknown>
    : null;
  return new UhpError(code, redactUhpText(message, secrets), {
    status,
    type: typeof candidate?.type === 'string' ? candidate.type : undefined,
    param: typeof candidate?.param === 'string' ? candidate.param : null,
    detail,
    retryable: isRetryableUhpError(code, status),
    remoteState: status >= 500 ? 'unknown' : 'not-started',
  });
}
