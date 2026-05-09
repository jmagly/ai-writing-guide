/**
 * Semantic enrichment sidecar store.
 *
 * Storage:
 *   .aiwg/index/semantic/<sanitized-id>.json
 *
 * Sanitization: replace `/` with `__` and any non-[a-zA-Z0-9._-] with `_`.
 * Preserves `.md`, `.ts`, etc. extensions readably while keeping filesystem-safe.
 *
 * @implements #1204
 */

import {
  createHash,
} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { EnrichmentSummary, SemanticFields } from './types.js';

const SEMANTIC_ROOT_DEFAULT = '.aiwg/index/semantic';

export function resolveSemanticRoot(cwd: string = process.cwd()): string {
  return join(cwd, SEMANTIC_ROOT_DEFAULT);
}

export function sanitizeId(id: string): string {
  return id.replace(/\//g, '__').replace(/[^a-zA-Z0-9._\-]/g, '_');
}

function entryPath(root: string, id: string): string {
  return join(root, `${sanitizeId(id)}.json`);
}

export function has(root: string, id: string): boolean {
  return existsSync(entryPath(root, id));
}

export function get(root: string, id: string): SemanticFields {
  const file = entryPath(root, id);
  if (!existsSync(file)) throw new Error(`No enrichment for: ${id}`);
  return JSON.parse(readFileSync(file, 'utf-8')) as SemanticFields;
}

export function put(root: string, id: string, fields: SemanticFields): string {
  mkdirSync(root, { recursive: true });
  const file = entryPath(root, id);
  writeFileSync(file, JSON.stringify(fields, null, 2), 'utf-8');
  return file;
}

export function remove(root: string, id: string): boolean {
  const file = entryPath(root, id);
  if (!existsSync(file)) return false;
  rmSync(file);
  return true;
}

/** Drop ALL enrichment data — implements `aiwg index enrich --reset`. */
export function reset(root: string): { removed: number } {
  if (!existsSync(root)) return { removed: 0 };
  const before = readdirSync(root).filter((f) => f.endsWith('.json'));
  rmSync(root, { recursive: true, force: true });
  return { removed: before.length };
}

/** Compute the content hash that would be stored as `enrichedHash`. */
export function computeContentHash(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/** List all enrichment entries with staleness flag (caller supplies current hashes). */
export function list(
  root:           string,
  currentHashes:  Record<string, string>,
  now:            Date = new Date(),
): EnrichmentSummary[] {
  if (!existsSync(root)) return [];
  const out: EnrichmentSummary[] = [];
  for (const file of readdirSync(root)) {
    if (!file.endsWith('.json')) continue;
    let fields: SemanticFields;
    try {
      fields = JSON.parse(readFileSync(join(root, file), 'utf-8')) as SemanticFields;
    } catch {
      continue;
    }
    const id = file.replace(/\.json$/, '').replace(/__/g, '/');
    const ageDays = Math.max(
      0,
      Math.floor((now.getTime() - new Date(fields.enrichedAt).getTime()) / 86_400_000),
    );
    const currentHash = currentHashes[id];
    const isStale = currentHash !== undefined && currentHash !== fields.enrichedHash;
    out.push({
      artifactId:    id,
      enrichedAt:    fields.enrichedAt,
      enrichedHash:  fields.enrichedHash,
      symbolCount:   fields.declaredSymbols.length,
      citationCount: fields.citations.length,
      ageDays,
      isStale,
    });
  }
  return out.sort((a, b) => a.artifactId.localeCompare(b.artifactId));
}
