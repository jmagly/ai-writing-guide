import { lstat, realpath } from 'node:fs/promises';
import type { Stats } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { SessionContractError } from './contracts.js';

export interface SourceAuthorization {
  selectedPath: string;
  allowedRoots: string[];
  allowSymlink?: boolean;
  maxBytes?: number;
}

export interface AuthorizedFile {
  canonicalPath: string;
  rootClass: string;
  size: number;
  mtimeMs: number;
  dev: number;
  ino: number;
}

export async function authorizeSourceFile(input: SourceAuthorization): Promise<AuthorizedFile> {
  if (input.allowedRoots.length === 0) {
    throw new SessionContractError('SOURCE_NOT_AUTHORIZED', 'an explicitly selected allowed root is required');
  }
  const selected = resolve(input.selectedPath);
  const selectedStat = await safeLstat(selected);
  if (selectedStat.isSymbolicLink() && !input.allowSymlink) {
    throw new SessionContractError('SOURCE_SYMLINK', 'symbolic-link session sources are disabled');
  }
  const canonicalPath = await safeRealpath(selected);
  const roots = await Promise.all(input.allowedRoots.map(async (root) => ({
    input: root,
    canonical: await safeRealpath(resolve(root), true),
  })));
  const matchingRoot = roots.find(({ canonical }) => {
    const rel = relative(canonical, canonicalPath);
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
  });
  if (!matchingRoot) {
    throw new SessionContractError('SOURCE_OUTSIDE_ALLOWED_ROOT', 'source is outside the explicitly allowed roots');
  }
  const stat = await safeLstat(canonicalPath);
  if (!stat.isFile()) {
    throw new SessionContractError('SOURCE_NOT_REGULAR_FILE', 'session source must be a regular file');
  }
  if (input.maxBytes !== undefined && stat.size > input.maxBytes) {
    throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'session source exceeds the authorized byte limit');
  }
  return {
    canonicalPath,
    rootClass: matchingRoot.input,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    dev: stat.dev,
    ino: stat.ino,
  };
}

async function safeLstat(path: string): Promise<Stats> {
  try {
    return await lstat(path);
  } catch {
    throw new SessionContractError('SOURCE_NOT_AUTHORIZED', 'selected session source is inaccessible');
  }
}

async function safeRealpath(path: string, root = false): Promise<string> {
  try {
    return await realpath(path);
  } catch {
    throw new SessionContractError(
      'SOURCE_NOT_AUTHORIZED',
      root ? 'an authorized source root is inaccessible' : 'selected session source is inaccessible',
    );
  }
}

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['bearer-token', /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi],
  ['authorization', /\bAuthorization\s*:\s*[^\r\n]+/gi],
  ['cookie', /\b(?:Cookie|Set-Cookie)\s*:\s*[^\r\n]+/gi],
  ['credential', /\b(?:api[_-]?key|token|password|secret)\s*(?:[:=]|\s)\s*["']?[^\s"',;]{6,}/gi],
  ['provider-token', /\b(?:sk-(?:proj-)?|gh[pousr]_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9._~+/=-]{8,}\b/g],
  ['connection-string', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s]+/gi],
  ['credential-url', /\bhttps?:\/\/[^/\s:@]+:[^/\s@]+@[^\s]+/gi],
  ['environment-assignment', /\b[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY)\s*=\s*(?:"[^"]+"|'[^']+'|[^\s]+)/g],
  ['fixture-credential', /\bredaction-canary-[A-Za-z0-9_-]+\b/gi],
  ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
];

const SENSITIVE_KEY = /(?:authorization|auth[_-]?header|cookie|credential|password|passwd|secret|token|api[_-]?key|private[_-]?key|connection[_-]?string)/i;
const CONTENT_KEY = /(?:^|[_-])(?:text|content|prompt|command|arguments?|args|result|output|body|request|response|source|code|query)(?:$|[_-])/i;
const PATH_KEY = /(?:^|[_-])(?:path|cwd|directory|filename|file)(?:$|[_-])/i;
const SAFE_STRING_KEY = /(?:^|[_-])(?:id|kind|type|role|status|state|lifecycle|reason|name|product|provider|version|schema|model|format|class|mode|event|operation|tool|method|language|scope|consistency|disposition|phase|visibility|protocol|category|classification)(?:$|[_-])/i;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export interface NativeSanitizationLimits {
  maxDepth: number;
  maxNodes: number;
  maxObjectKeys: number;
  maxArrayItems: number;
  maxStringBytes: number;
}

export interface NativeSanitizationResult {
  value: Record<string, unknown>;
  sensitivity: 'none' | 'sensitive';
  classes: string[];
  decisions: Record<string, number>;
}

const DEFAULT_NATIVE_LIMITS: NativeSanitizationLimits = {
  maxDepth: 8,
  maxNodes: 2_048,
  maxObjectKeys: 128,
  maxArrayItems: 256,
  maxStringBytes: 8 * 1024,
};

/**
 * Classify and sanitize provider-native attributes before they cross the
 * persistence boundary. Decisions contain counts only and are safe for audit.
 */
export function sanitizeNativeExtensions(
  input: unknown,
  overrides: Partial<NativeSanitizationLimits> = {},
): NativeSanitizationResult {
  const limits = { ...DEFAULT_NATIVE_LIMITS, ...overrides };
  const classes = new Set<string>();
  const decisions: Record<string, number> = {};
  const active = new WeakSet<object>();
  let nodes = 0;

  const marker = (classification: string): string => {
    classes.add(classification);
    decisions[classification] = (decisions[classification] ?? 0) + 1;
    return `[REDACTED:${classification}]`;
  };

  const visit = (value: unknown, key: string, depth: number): unknown => {
    const classifiedKey = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
    nodes += 1;
    if (nodes > limits.maxNodes) return marker('node-limit');
    if (depth > limits.maxDepth) return marker('depth-limit');
    if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
    if (typeof value === 'bigint') return String(value);
    if (typeof value !== 'string' && typeof value !== 'object') {
      return marker('unsupported-value');
    }
    if (typeof value === 'string') {
      if (SENSITIVE_KEY.test(classifiedKey)) return marker('sensitive-field');
      if (CONTENT_KEY.test(classifiedKey)) return marker('content');
      if (PATH_KEY.test(classifiedKey)) return marker('path');
      if (Buffer.byteLength(value) > limits.maxStringBytes) return marker('string-limit');
      const redacted = redactSessionText(value);
      for (const classification of redacted.classes) classes.add(classification);
      if (redacted.classes.length) {
        decisions['classified-value'] = (decisions['classified-value'] ?? 0) + 1;
        return redacted.text.replace(CONTROL_CHARACTERS, ' ');
      }
      if (!SAFE_STRING_KEY.test(classifiedKey)) return marker('unclassified-field');
      return value.replace(/\r?\n/g, ' ').replace(CONTROL_CHARACTERS, ' ');
    }
    if (active.has(value)) return marker('circular-reference');
    active.add(value);
    try {
      if (Array.isArray(value)) {
        const selected = value.slice(0, limits.maxArrayItems)
          .map((entry) => visit(entry, key, depth + 1));
        if (value.length > limits.maxArrayItems) selected.push(marker('array-limit'));
        return selected;
      }
      const output: Record<string, unknown> = {};
      const entries = Object.entries(value as Record<string, unknown>);
      for (const [childKey, childValue] of entries.slice(0, limits.maxObjectKeys)) {
        output[childKey.replace(/\r?\n/g, ' ').replace(CONTROL_CHARACTERS, '')] =
          visit(childValue, childKey, depth + 1);
      }
      if (entries.length > limits.maxObjectKeys) output.__truncated__ = marker('object-key-limit');
      return output;
    } finally {
      active.delete(value);
    }
  };

  const visited = visit(input ?? {}, 'extensions', 0);
  const value = visited && typeof visited === 'object' && !Array.isArray(visited)
    ? visited as Record<string, unknown>
    : { value: visited };
  return {
    value,
    sensitivity: classes.size ? 'sensitive' : 'none',
    classes: [...classes].sort(),
    decisions,
  };
}

export interface RedactionResult {
  text: string;
  sensitivity: 'none' | 'sensitive';
  classes: string[];
}

export function redactSessionText(input: string): RedactionResult {
  const classes = new Set<string>();
  let text = input;
  for (const [classification, pattern] of SECRET_PATTERNS) {
    text = text.replace(pattern, () => {
      classes.add(classification);
      return `[REDACTED:${classification}]`;
    });
  }
  return { text, sensitivity: classes.size ? 'sensitive' : 'none', classes: [...classes].sort() };
}

export interface AuditEvent {
  operationId: string;
  operation: string;
  actor: string;
  counts: Record<string, number>;
  adapterVersion: string;
  policyVersion: string;
  outcome: 'committed' | 'failed' | 'preview';
  occurredAt: string;
}

export function contentFreeAuditEvent(event: AuditEvent): AuditEvent {
  return Object.freeze({ ...event, counts: { ...event.counts } });
}

export function requireNetworkConsent(operation: string, authorizedOperation?: string): void {
  if (authorizedOperation !== operation) {
    throw new SessionContractError('NETWORK_NOT_AUTHORIZED', `network operation requires explicit consent: ${operation}`);
  }
}

export interface ScopedSearchRecord {
  workspaceId: string;
  provider: string;
}

/** Apply authorization before a search implementation computes rank or snippets. */
export function prefilterAuthorizedSearchScope<T extends ScopedSearchRecord>(
  records: readonly T[],
  scope: { workspaceId: string; providers?: readonly string[] },
): T[] {
  const providers = scope.providers ? new Set(scope.providers) : null;
  return records.filter((record) =>
    record.workspaceId === scope.workspaceId
    && (providers === null || providers.has(record.provider)));
}
