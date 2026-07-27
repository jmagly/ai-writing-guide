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
  return { canonicalPath, rootClass: matchingRoot.input, size: stat.size };
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
  ['credential', /\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*["']?[^\s"',;]{6,}/gi],
  ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
];

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
