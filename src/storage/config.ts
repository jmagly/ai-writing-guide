/**
 * Storage Configuration Loader and Validator
 *
 * Reads `.aiwg/storage.config` (project-local), validates it against the
 * v1 schema, and returns a typed `StorageConfig`. Absence of the file is
 * a no-op: every subsystem defaults to `fs` rooted under `.aiwg/`.
 *
 * Validation is hand-rolled rather than schema-validator-driven to avoid
 * adding an `ajv` dependency for a single file. The published JSON
 * Schema (`.aiwg/architecture/schemas/storage.config.v1.json`) remains
 * canonical for editor tooling and external consumers.
 *
 * @design @.aiwg/architecture/storage-design.md
 * @issue #934
 * @issue #953
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve, isAbsolute } from 'path';
import { homedir } from 'os';
import {
  type BackendConfig,
  type StorageConfig,
  type SubsystemKey,
  BACKEND_TYPES,
  SUBSYSTEM_KEYS,
} from './types.js';

/**
 * Property names that must never appear at any nesting depth in
 * `storage.config`. Defense-in-depth against credentials being written
 * to disk. The published JSON Schema also enforces this; the recursive
 * runtime walk below catches custom backend extensions that bypass the
 * static `additionalProperties: false`.
 */
export const FORBIDDEN_CREDENTIAL_KEYS: readonly string[] = [
  'token',
  'password',
  'secret',
  'apiKey',
  'api_key',
  'accessKey',
  'accessKeyId',
  'secretAccessKey',
] as const;

const STORAGE_CONFIG_FILENAME = 'storage.config';

const DEFAULT_AIWG_DIR = '.aiwg';

/** Default subsystem-to-relative-path mapping for the `fs` backend. */
export const DEFAULT_SUBSYSTEM_ROOTS: Record<SubsystemKey, string> = {
  memory: 'memory',
  reflections: 'reflections',
  kb: 'kb',
  activity_log: '.', // activity_log is a single file, not a directory
  provenance: 'provenance',
  research: 'research',
  media: 'media',
  sandbox_identity: 'sandbox-identity',
};

/**
 * Resolve the path where `.aiwg/storage.config` is expected for a given
 * project root. Does not check existence.
 */
export function storageConfigPath(projectRoot: string): string {
  return resolve(projectRoot, DEFAULT_AIWG_DIR, STORAGE_CONFIG_FILENAME);
}

/**
 * Load and validate `.aiwg/storage.config` from `projectRoot`.
 *
 * Returns `null` if the file is absent (caller falls back to defaults).
 * Throws a descriptive error for malformed JSON, unsupported version,
 * unknown subsystem keys, unknown backend types, or any credential-named
 * property at any depth.
 */
export async function loadStorageConfig(
  projectRoot: string
): Promise<StorageConfig | null> {
  const cfgPath = storageConfigPath(projectRoot);
  if (!existsSync(cfgPath)) return null;

  let raw: string;
  try {
    raw = await readFile(cfgPath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read ${cfgPath}: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${cfgPath}: ${(err as Error).message}`);
  }

  return validateStorageConfig(parsed, cfgPath);
}

/**
 * Validate an already-parsed object as a `StorageConfig`. Exposed for
 * use by `aiwg doctor` and tests.
 */
export function validateStorageConfig(parsed: unknown, source = '<input>'): StorageConfig {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${source}: storage config must be an object`);
  }
  const obj = parsed as Record<string, unknown>;

  if (obj['version'] !== '1') {
    throw new Error(
      `${source}: unsupported schema version ${JSON.stringify(obj['version'])} ` +
        `(expected "1"). Update the AIWG CLI to read newer config versions.`
    );
  }

  walkRejectingCredentials(obj, source, 'storage');

  const roots = validateRoots(obj['roots'], source);
  const backends = validateBackends(obj['backends'], source);

  let fallback: StorageConfig['fallback'];
  if (obj['fallback'] !== undefined) {
    if (obj['fallback'] !== 'cache_and_warn' && obj['fallback'] !== 'block') {
      throw new Error(
        `${source}: storage.fallback must be "cache_and_warn" or "block" (got ${JSON.stringify(obj['fallback'])})`
      );
    }
    fallback = obj['fallback'] as 'cache_and_warn' | 'block';
  }

  const result: StorageConfig = { version: '1' };
  if (roots) result.roots = roots;
  if (backends) result.backends = backends;
  if (fallback) result.fallback = fallback;
  return result;
}

function validateRoots(
  raw: unknown,
  source: string
): Partial<Record<SubsystemKey, string>> | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${source}: storage.roots must be an object`);
  }
  const out: Partial<Record<SubsystemKey, string>> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isSubsystemKey(k)) {
      throw new Error(
        `${source}: roots.${k} is not a known subsystem. ` +
          `Allowed: ${SUBSYSTEM_KEYS.join(', ')}`
      );
    }
    if (typeof v !== 'string' || v.length === 0) {
      throw new Error(`${source}: roots.${k} must be a non-empty string path`);
    }
    out[k] = v;
  }
  return out;
}

function validateBackends(
  raw: unknown,
  source: string
): Partial<Record<SubsystemKey, BackendConfig>> | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${source}: storage.backends must be an object`);
  }
  const out: Partial<Record<SubsystemKey, BackendConfig>> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isSubsystemKey(k)) {
      throw new Error(
        `${source}: backends.${k} is not a known subsystem. ` +
          `Allowed: ${SUBSYSTEM_KEYS.join(', ')}`
      );
    }
    out[k] = validateBackendConfig(v, `${source}: backends.${k}`);
  }
  return out;
}

function validateBackendConfig(raw: unknown, source: string): BackendConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${source} must be an object`);
  }
  const obj = raw as Record<string, unknown>;
  const type = obj['type'];
  if (typeof type !== 'string' || !BACKEND_TYPES.includes(type as never)) {
    throw new Error(
      `${source}.type must be one of ${BACKEND_TYPES.join(', ')} (got ${JSON.stringify(type)})`
    );
  }

  // Per-backend required fields. Optional fields are passed through as-is
  // — the adapter is responsible for any further validation it needs.
  switch (type) {
    case 'fs':
      return { type: 'fs' };
    case 'obsidian':
      requireString(obj, 'vault', source);
      return obj as unknown as BackendConfig;
    case 'logseq':
      requireString(obj, 'graph', source);
      return obj as unknown as BackendConfig;
    case 'notion': {
      const parent = obj['parent'];
      if (typeof parent !== 'object' || parent === null) {
        throw new Error(`${source}.parent must be an object with pageId or databaseId`);
      }
      const p = parent as Record<string, unknown>;
      const hasPage = typeof p['pageId'] === 'string' && p['pageId'].length > 0;
      const hasDb = typeof p['databaseId'] === 'string' && p['databaseId'].length > 0;
      if (hasPage === hasDb) {
        throw new Error(`${source}.parent must specify exactly one of pageId or databaseId`);
      }
      return obj as unknown as BackendConfig;
    }
    case 'anythingllm':
      requireString(obj, 'baseUrl', source);
      requireString(obj, 'workspace', source);
      return obj as unknown as BackendConfig;
    case 'fortemi':
      return obj as unknown as BackendConfig;
    case 's3':
      requireString(obj, 'bucket', source);
      return obj as unknown as BackendConfig;
    case 'webdav':
      requireString(obj, 'url', source);
      return obj as unknown as BackendConfig;
    default:
      throw new Error(`${source}: unhandled backend type ${type}`);
  }
}

function requireString(obj: Record<string, unknown>, key: string, source: string): void {
  const v = obj[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`${source}.${key} must be a non-empty string`);
  }
}

function isSubsystemKey(k: string): k is SubsystemKey {
  return (SUBSYSTEM_KEYS as readonly string[]).includes(k);
}

/**
 * Recursively reject any property whose name appears in
 * FORBIDDEN_CREDENTIAL_KEYS. Throws on first hit with the full path.
 */
export function walkRejectingCredentials(
  value: unknown,
  source: string,
  path: string
): void {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkRejectingCredentials(value[i], source, `${path}[${i}]`);
    }
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_CREDENTIAL_KEYS.includes(k)) {
      throw new Error(
        `${source}: forbidden credential property "${path}.${k}" — ` +
          `tokens, passwords, and API keys must come from environment variables, never from storage.config.`
      );
    }
    walkRejectingCredentials(v, source, `${path}.${k}`);
  }
}

/**
 * Resolve the absolute filesystem path for an `fs`-backed subsystem,
 * applying `roots` overrides if present. Used by the fs adapter.
 *
 * Resolution order:
 *   1. `roots[subsystem]` if set, expanding `~` and accepting absolute paths
 *   2. `<projectRoot>/.aiwg/<DEFAULT_SUBSYSTEM_ROOTS[subsystem]>`
 */
export function resolveSubsystemRoot(
  subsystem: SubsystemKey,
  projectRoot: string,
  config: StorageConfig | null
): string {
  const override = config?.roots?.[subsystem];
  if (override) return expandPath(override, projectRoot);
  return resolve(projectRoot, DEFAULT_AIWG_DIR, DEFAULT_SUBSYSTEM_ROOTS[subsystem]);
}

function expandPath(p: string, projectRoot: string): string {
  if (p.startsWith('~/')) return resolve(homedir(), p.slice(2));
  if (p === '~') return homedir();
  if (isAbsolute(p)) return p;
  return resolve(projectRoot, p);
}
