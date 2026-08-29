import { createHmac } from 'node:crypto';
import { Transform, type TransformCallback } from 'node:stream';
import { TextDecoder } from 'node:util';

export type RedactionSensitivity = 'none' | 'sensitive';

export interface OrganizationRedactionPattern {
  id: string;
  pattern: string;
  flags?: string;
}

export interface RedactionLimits {
  maxInputBytes: number;
  maxDepth: number;
  maxNodes: number;
  maxObjectKeys: number;
  maxArrayItems: number;
}

export interface RedactionOptions {
  organizationPatterns?: readonly OrganizationRedactionPattern[];
  sensitiveKeyPatterns?: readonly string[];
  fingerprintKey?: string | Buffer;
  includeLength?: boolean;
  limits?: Partial<RedactionLimits>;
}

export interface RedactionFinding {
  class: string;
  path?: string;
  length?: number;
  fingerprint?: string;
}

export interface TextRedactionResult {
  text: string;
  sensitivity: RedactionSensitivity;
  findings: RedactionFinding[];
}

export interface StructuredRedactionResult<T = unknown> {
  value: T;
  sensitivity: RedactionSensitivity;
  findings: RedactionFinding[];
}

export class RedactionError extends Error {
  constructor(
    public readonly code: 'INVALID_PATTERN' | 'LIMIT_EXCEEDED' | 'UNSUPPORTED_VALUE' | 'INVALID_UTF8',
    message: string,
  ) {
    super(message);
    this.name = 'RedactionError';
  }
}

const DEFAULT_LIMITS: RedactionLimits = {
  maxInputBytes: 8 * 1024 * 1024,
  maxDepth: 32,
  maxNodes: 100_000,
  maxObjectKeys: 10_000,
  maxArrayItems: 100_000,
};

const BUILTIN_SENSITIVE_KEY = /(?:^|[_-])(?:authorization|auth[_-]?header|cookie|set[_-]?cookie|credential|password|passwd|secret|token|api[_-]?key|private[_-]?key|connection[_-]?string|client[_-]?secret)(?:$|[_-])/i;

interface CompiledPattern {
  id: string;
  pattern: RegExp;
  preservePrefix?: boolean;
  preserveSuffix?: boolean;
}

const BUILTIN_PATTERNS: readonly CompiledPattern[] = [
  {
    id: 'private-key',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
  },
  {
    id: 'authorization-header',
    pattern: /(\bAuthorization\s*:\s*)([^\r\n]+)/gi,
    preservePrefix: true,
  },
  {
    id: 'cookie-header',
    pattern: /(\b(?:Cookie|Set-Cookie)\s*:\s*)([^\r\n]+)/gi,
    preservePrefix: true,
  },
  {
    id: 'url-query-secret',
    pattern: /([?&](?:access[_-]?token|refresh[_-]?token|api[_-]?key|token|secret|password|passwd|signature|sig)=)([^&#\s]+)/gi,
    preservePrefix: true,
  },
  {
    id: 'sensitive-assignment',
    pattern: /((?:^|[\s,{])["']?(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|passwd|secret|client[_-]?secret|credential)["']?\s*(?:[:=]|\s+)\s*")([^"\r\n]*)(")/gim,
    preservePrefix: true,
    preserveSuffix: true,
  },
  {
    id: 'sensitive-assignment',
    pattern: /((?:^|[\s,{])["']?(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|passwd|secret|client[_-]?secret|credential)["']?\s*(?:[:=]|\s+)\s*')([^'\r\n]*)(')/gim,
    preservePrefix: true,
    preserveSuffix: true,
  },
  {
    id: 'sensitive-assignment',
    pattern: /((?:^|[\s,{])["']?(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|passwd|secret|client[_-]?secret|credential)["']?\s*(?:[:=]|\s+)\s*)([^\s"',;}\]]{4,})/gim,
    preservePrefix: true,
  },
  {
    id: 'environment-secret',
    pattern: /(\b[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY)\s*=\s*)(?:"[^"]+"|'[^']+'|[^\s]+)/g,
    preservePrefix: true,
  },
  {
    id: 'provider-token',
    pattern: /\b(?:sk-(?:proj-)?|gh[pousr]_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9._~+/=-]{6,}\b/g,
  },
  {
    id: 'bearer-token',
    pattern: /(\bBearer\s+)([A-Za-z0-9._~+/=-]{6,})\b/gi,
    preservePrefix: true,
  },
  {
    id: 'connection-string',
    pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqps?):\/\/[^\s"'<>]+/gi,
  },
  {
    id: 'url-userinfo',
    pattern: /(https?:\/\/[^/\s:@]+:)([^/\s@]+)(@[^\s"'<>]+)/gi,
  },
];

function resolvedLimits(options: RedactionOptions): RedactionLimits {
  const limits = { ...DEFAULT_LIMITS, ...(options.limits ?? {}) };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RedactionError('LIMIT_EXCEEDED', `${name} must be a positive safe integer`);
    }
  }
  return limits;
}

function validatePatternSource(pattern: OrganizationRedactionPattern): RegExp {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(pattern.id)) {
    throw new RedactionError('INVALID_PATTERN', 'organization redaction pattern IDs must be lowercase stable identifiers');
  }
  if (pattern.pattern.length === 0 || pattern.pattern.length > 512) {
    throw new RedactionError('INVALID_PATTERN', `organization pattern '${pattern.id}' must contain 1-512 characters`);
  }
  if (/\\[1-9]|\(\?<[=!]|\([^)]*[+*][^)]*\)[+*{]/.test(pattern.pattern)) {
    throw new RedactionError('INVALID_PATTERN', `organization pattern '${pattern.id}' uses a disallowed high-risk construct`);
  }
  const requestedFlags = pattern.flags ?? 'g';
  if (/[^gimsuy]/.test(requestedFlags)) {
    throw new RedactionError('INVALID_PATTERN', `organization pattern '${pattern.id}' has unsupported flags`);
  }
  const flags = requestedFlags.includes('g') ? requestedFlags : `${requestedFlags}g`;
  try {
    return new RegExp(pattern.pattern, flags);
  } catch {
    throw new RedactionError('INVALID_PATTERN', `organization pattern '${pattern.id}' is not a valid regular expression`);
  }
}

function fingerprint(value: string, key: string | Buffer | undefined): string | undefined {
  if (key === undefined) return undefined;
  return `hmac-sha256:${createHmac('sha256', key).update(value).digest('hex').slice(0, 16)}`;
}

function marker(classification: string, value: string, options: RedactionOptions): { marker: string; finding: RedactionFinding } {
  const length = Buffer.byteLength(value);
  const valueFingerprint = fingerprint(value, options.fingerprintKey);
  const attributes = [
    options.includeLength === false ? null : `len=${length}`,
    valueFingerprint ? `fp=${valueFingerprint}` : null,
  ].filter((part): part is string => part !== null);
  return {
    marker: `[REDACTED:${classification}${attributes.length ? `;${attributes.join(';')}` : ''}]`,
    finding: {
      class: classification,
      ...(options.includeLength === false ? {} : { length }),
      ...(valueFingerprint ? { fingerprint: valueFingerprint } : {}),
    },
  };
}

function applyPattern(
  input: string,
  definition: CompiledPattern,
  options: RedactionOptions,
  findings: RedactionFinding[],
): string {
  definition.pattern.lastIndex = 0;
  return input.replace(definition.pattern, (...args: unknown[]) => {
    const full = String(args[0]);
    if (definition.id === 'url-userinfo') {
      const prefix = String(args[1]);
      const secret = String(args[2]);
      const suffix = String(args[3]);
      const redacted = marker(definition.id, secret, options);
      findings.push(redacted.finding);
      return `${prefix}${redacted.marker}${suffix}`;
    }
    if (definition.preservePrefix) {
      const prefix = String(args[1]);
      const secret = String(args[2] ?? full.slice(prefix.length));
      if (secret.startsWith('[REDACTED:')) return full;
      const redacted = marker(definition.id, secret, options);
      findings.push(redacted.finding);
      const suffix = definition.preserveSuffix ? String(args[3] ?? '') : '';
      return `${prefix}${redacted.marker}${suffix}`;
    }
    const redacted = marker(definition.id, full, options);
    findings.push(redacted.finding);
    return redacted.marker;
  });
}

function decodedSecretClass(value: string): string | null {
  if (value.length < 24 || value.length > 16 * 1024 || value.length % 4 === 1) return null;
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    if (!decoded || decoded.includes('\uFFFD')) return null;
    if (/-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/.test(decoded)) return 'encoded-private-key';
    if (/(?:api[_-]?key|token|password|passwd|secret|authorization)\s*[:=]/i.test(decoded)) return 'encoded-secret';
    if (/(?:sk-(?:proj-)?|gh[pousr]_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9._~+/=-]{6,}/.test(decoded)) return 'encoded-secret';
    return null;
  } catch {
    return null;
  }
}

/** Redact secret-bearing values from a complete text value. */
export function redactText(input: string, options: RedactionOptions = {}): TextRedactionResult {
  const limits = resolvedLimits(options);
  if (Buffer.byteLength(input) > limits.maxInputBytes) {
    throw new RedactionError('LIMIT_EXCEEDED', 'text exceeds the configured redaction byte limit');
  }
  const findings: RedactionFinding[] = [];
  let text = input;
  for (const definition of BUILTIN_PATTERNS) {
    text = applyPattern(text, definition, options, findings);
  }
  for (const configured of options.organizationPatterns ?? []) {
    const definition: CompiledPattern = {
      id: `organization-${configured.id}`,
      pattern: validatePatternSource(configured),
    };
    text = applyPattern(text, definition, options, findings);
  }
  text = text.replace(/\b[A-Za-z0-9+/]{24,}={0,2}\b/g, (candidate) => {
    const classification = decodedSecretClass(candidate);
    if (!classification) return candidate;
    const redacted = marker(classification, candidate, options);
    findings.push(redacted.finding);
    return redacted.marker;
  });
  return { text, sensitivity: findings.length ? 'sensitive' : 'none', findings };
}

function sensitiveKey(key: string, options: RedactionOptions): boolean {
  if (BUILTIN_SENSITIVE_KEY.test(key)) return true;
  let matched = false;
  for (const source of options.sensitiveKeyPatterns ?? []) {
    if (source.length === 0 || source.length > 256) {
      throw new RedactionError('INVALID_PATTERN', 'sensitive key patterns must contain 1-256 characters');
    }
    try {
      if (new RegExp(source, 'i').test(key)) matched = true;
    } catch {
      throw new RedactionError('INVALID_PATTERN', 'a sensitive key pattern is not a valid regular expression');
    }
  }
  return matched;
}

/** Recursively redact nested JSON/YAML-compatible values while preserving shape and field names. */
export function redactStructured<T>(input: T, options: RedactionOptions = {}): StructuredRedactionResult<T> {
  const limits = resolvedLimits(options);
  const findings: RedactionFinding[] = [];
  const active = new WeakSet<object>();
  let nodes = 0;

  const visit = (value: unknown, path: string, depth: number, key?: string): unknown => {
    nodes += 1;
    if (nodes > limits.maxNodes || depth > limits.maxDepth) {
      throw new RedactionError('LIMIT_EXCEEDED', 'structured value exceeds configured redaction traversal limits');
    }
    if (key !== undefined && sensitiveKey(key, options)) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      const redacted = marker('sensitive-field', serialized ?? String(value), options);
      findings.push({ ...redacted.finding, path });
      return redacted.marker;
    }
    if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
    if (typeof value === 'bigint') return String(value);
    if (typeof value === 'string') {
      const redacted = redactText(value, options);
      findings.push(...redacted.findings.map((finding) => ({ ...finding, path })));
      return redacted.text;
    }
    if (typeof value !== 'object') {
      throw new RedactionError('UNSUPPORTED_VALUE', `unsupported structured value at ${path}`);
    }
    if (active.has(value)) throw new RedactionError('UNSUPPORTED_VALUE', `circular structured value at ${path}`);
    active.add(value);
    try {
      if (Array.isArray(value)) {
        if (value.length > limits.maxArrayItems) {
          throw new RedactionError('LIMIT_EXCEEDED', `array exceeds configured item limit at ${path}`);
        }
        return value.map((item, index) => visit(item, `${path}/${index}`, depth + 1));
      }
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length > limits.maxObjectKeys) {
        throw new RedactionError('LIMIT_EXCEEDED', `object exceeds configured key limit at ${path}`);
      }
      return Object.fromEntries(entries.map(([childKey, child]) => [
        childKey,
        visit(child, `${path}/${childKey.replaceAll('~', '~0').replaceAll('/', '~1')}`, depth + 1, childKey),
      ]));
    } finally {
      active.delete(value);
    }
  };

  const value = visit(input, '', 0) as T;
  return { value, sensitivity: findings.length ? 'sensitive' : 'none', findings };
}

/**
 * A bounded streaming interface. It buffers one logical output value and emits
 * only after full-value sanitization, so secrets split across chunks cannot
 * escape. Exceeding the configured limit fails without emitting partial data.
 */
export class RedactionTransform extends Transform {
  private readonly chunks: Buffer[] = [];
  private bytes = 0;
  private readonly limits: RedactionLimits;

  constructor(private readonly options: RedactionOptions = {}) {
    super();
    this.limits = resolvedLimits(options);
  }

  override _transform(chunk: Buffer | string, encoding: BufferEncoding, callback: TransformCallback): void {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
    this.bytes += value.length;
    if (this.bytes > this.limits.maxInputBytes) {
      callback(new RedactionError('LIMIT_EXCEEDED', 'stream exceeds the configured redaction byte limit'));
      return;
    }
    this.chunks.push(value);
    callback();
  }

  override _flush(callback: TransformCallback): void {
    try {
      let source: string;
      try {
        source = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(this.chunks));
      } catch {
        throw new RedactionError('INVALID_UTF8', 'stream is not valid UTF-8');
      }
      this.push(redactText(source, this.options).text);
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }
}

export function createRedactionTransform(options: RedactionOptions = {}): RedactionTransform {
  return new RedactionTransform(options);
}
