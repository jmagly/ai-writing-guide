/**
 * View definition + result filesystem store.
 *
 * Layout:
 *   .aiwg/index/views/
 *     ├── <name>.yaml                  # definition
 *     └── results/
 *         ├── <name>.json              # last computed result
 *         └── <name>.meta.json         # freshness metadata
 *
 * @implements #1207
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { dumpViewYaml, parseViewYaml } from './definition.js';
import type { ViewDefinition, ViewResult, ViewResultMeta, ViewSummary } from './types.js';

const VIEWS_ROOT_DEFAULT = '.aiwg/index/views';

const NAME_RE = /^[a-z0-9][a-z0-9-_]*$/;

export function resolveViewsRoot(cwd: string = process.cwd()): string {
  return join(cwd, VIEWS_ROOT_DEFAULT);
}

function defPath(root: string, name: string): string {
  if (!NAME_RE.test(name)) throw new Error(`Invalid view name: ${name}`);
  return join(root, `${name}.yaml`);
}
function resultPath(root: string, name: string): string {
  return join(root, 'results', `${name}.json`);
}
function metaPath(root: string, name: string): string {
  return join(root, 'results', `${name}.meta.json`);
}

/** Persist a definition; creates the views directory if needed. */
export function putDefinition(root: string, def: ViewDefinition): string {
  mkdirSync(root, { recursive: true });
  const file = defPath(root, def.name);
  writeFileSync(file, dumpViewYaml(def), 'utf-8');
  return file;
}

/** Read a definition by name. Throws on missing or invalid. */
export function getDefinition(root: string, name: string): ViewDefinition {
  const file = defPath(root, name);
  if (!existsSync(file)) throw new Error(`No view: ${name}`);
  return parseViewYaml(readFileSync(file, 'utf-8'));
}

/** Remove a definition and its results. */
export function removeView(root: string, name: string): { defRemoved: boolean; resultRemoved: boolean } {
  let defRemoved = false;
  let resultRemoved = false;
  const dp = defPath(root, name);
  if (existsSync(dp)) { rmSync(dp); defRemoved = true; }
  const rp = resultPath(root, name);
  const mp = metaPath(root, name);
  if (existsSync(rp)) { rmSync(rp); resultRemoved = true; }
  if (existsSync(mp)) rmSync(mp);
  return { defRemoved, resultRemoved };
}

/** List all views with freshness summary. */
export function listViews(root: string, now: Date = new Date()): ViewSummary[] {
  if (!existsSync(root)) return [];
  const out: ViewSummary[] = [];
  for (const file of readdirSync(root)) {
    if (!file.endsWith('.yaml')) continue;
    const name = file.replace(/\.yaml$/, '');
    if (!NAME_RE.test(name)) continue;
    let def: ViewDefinition;
    try {
      def = parseViewYaml(readFileSync(join(root, file), 'utf-8'));
    } catch {
      continue;
    }
    const meta = readMeta(root, name);
    const summary: ViewSummary = {
      name:        def.name,
      producer:    def.producer,
      aggregate:   def.aggregate,
      hasResults:  meta !== null,
      builtAt:     meta?.builtAt ?? null,
      ageDays:     meta ? ageDays(meta.builtAt, now) : null,
      staleReason: classifyStaleness(def, meta, now),
    };
    out.push(summary);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Read a view's stored result. Throws on missing. */
export function getResult(root: string, name: string): ViewResult {
  const rp = resultPath(root, name);
  if (!existsSync(rp)) throw new Error(`No results for view: ${name}`);
  const meta = readMeta(root, name);
  if (!meta) throw new Error(`No metadata for view: ${name}`);
  const result = JSON.parse(readFileSync(rp, 'utf-8')) as unknown;
  return { name, result, meta };
}

/** Persist a view result + metadata atomically. */
export function putResult(
  root: string,
  name: string,
  result: unknown,
  meta:   ViewResultMeta,
): void {
  mkdirSync(join(root, 'results'), { recursive: true });
  writeFileSync(resultPath(root, name), JSON.stringify(result, null, 2), 'utf-8');
  writeFileSync(metaPath(root, name),   JSON.stringify(meta,   null, 2), 'utf-8');
}

function readMeta(root: string, name: string): ViewResultMeta | null {
  const mp = metaPath(root, name);
  if (!existsSync(mp)) return null;
  try {
    return JSON.parse(readFileSync(mp, 'utf-8')) as ViewResultMeta;
  } catch {
    return null;
  }
}

function ageDays(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
}

function classifyStaleness(
  def:  ViewDefinition,
  meta: ViewResultMeta | null,
  now:  Date,
): ViewSummary['staleReason'] {
  if (!meta) return 'never-built';
  const days = ageDays(meta.builtAt, now);
  switch (def.refresh.schedule) {
    case 'daily':   if (days >= 1)  return 'stale-schedule'; break;
    case 'weekly':  if (days >= 7)  return 'stale-schedule'; break;
    case 'monthly': if (days >= 30) return 'stale-schedule'; break;
    case 'never':   break;
  }
  return 'fresh';
}
