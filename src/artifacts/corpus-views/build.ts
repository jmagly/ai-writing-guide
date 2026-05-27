/**
 * Research-corpus markdown-view builder (#1490).
 *
 * The native replacement for the retired `corpus-index-build/build.py`.
 * `aiwg index build` invokes this in the same process that builds the JSON
 * graphs, so the corpus is parsed once. Reads the view manifest from
 * `index.graphs.indices.manifest` (canonical `.aiwg/aiwg.config`, #1491).
 *
 * @source historical: corpus-index-build/build.py (configured_graphs, main)
 */

import * as fs from 'fs';
import * as path from 'path';
import { readIndexConfig, readAiwgConfig } from '../../config/aiwg-config.js';
import { loadCorpus } from './ref-parser.js';
import { renderView, outputForView, type RenderContext } from './renderers.js';

interface ManifestEntry {
  name: string;
  output?: string;
}

export interface ViewResult {
  graph: string;
  status: 'built' | 'skipped' | 'unsupported';
  output: string;
  papers?: number;
  error?: string;
}

const DEFAULT_VIEWS = ['by-topic', 'by-year', 'authors', 'by-venue', 'by-method', 'training-pipeline', 'by-model-size'];

/**
 * Resolve which views to render from the index config, mirroring build.py
 * configured_graphs(): manifest entries (by name), else a default set, plus
 * citation-network when it is present as an index.graphs key.
 */
function configuredViews(index: Record<string, unknown> | undefined): Map<string, ManifestEntry> {
  const views = new Map<string, ManifestEntry>();
  const graphs = (index?.graphs ?? {}) as Record<string, unknown>;
  const indices = graphs.indices as Record<string, unknown> | undefined;
  const manifest = Array.isArray(indices?.manifest) ? (indices!.manifest as unknown[]) : [];
  for (const entry of manifest) {
    if (entry && typeof entry === 'object' && typeof (entry as ManifestEntry).name === 'string') {
      const e = entry as ManifestEntry;
      views.set(e.name, e);
    }
  }
  if (views.size === 0) {
    for (const name of DEFAULT_VIEWS) views.set(name, { name });
  }
  if ('citation-network' in graphs && !views.has('citation-network')) {
    views.set('citation-network', { name: 'citation-network' });
  }
  return views;
}

/** Read the Source-Checksum recorded in an existing view file (for staleness skip). */
function existingChecksum(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  const m = fs.readFileSync(filePath, 'utf-8').match(/^Source-Checksum:\s*sha256:([a-f0-9]{64})\s*$/m);
  return m ? m[1] : null;
}

function utcTimestamp(): string {
  // Second-precision UTC, matching build.py's isoformat().replace("+00:00","Z").
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export interface BuildViewsOptions {
  /** Force re-render even when the source checksum is unchanged. */
  force?: boolean;
  /** Build only this named view (when the operator passed `--graph <view>`). */
  only?: string;
}

/**
 * Resolve the corpus root (#1497): `AIWG_CORPUS_ROOT` env > `research.corpusRoot`
 * in `.aiwg/aiwg.config` > the project root (cwd). Relative values resolve
 * against cwd.
 */
export async function resolveCorpusRoot(cwd: string): Promise<string> {
  const env = process.env.AIWG_CORPUS_ROOT;
  if (env && env.trim()) return path.isAbsolute(env) ? env : path.join(cwd, env);
  try {
    const cfg = await readAiwgConfig(cwd);
    const cr = cfg?.research?.corpusRoot;
    if (cr && cr.trim()) return path.isAbsolute(cr) ? cr : path.join(cwd, cr);
  } catch {
    /* no config / unreadable — fall through to cwd */
  }
  return cwd;
}

/**
 * Render the configured research-corpus markdown views. Returns one result per
 * selected view. Returns `[]` (renders nothing) when the corpus root has no
 * `documentation/references/` corpus — so this is a safe no-op in ordinary
 * SDLC projects.
 */
export async function buildCorpusViews(cwd: string, opts: BuildViewsOptions = {}): Promise<ViewResult[]> {
  // Corpus root may differ from the project root (#1497): env override >
  // research.corpusRoot in .aiwg/aiwg.config > project root. The index config
  // is always read from the project's .aiwg/aiwg.config (cwd); corpus content
  // and rendered views live under the corpus root.
  const root = await resolveCorpusRoot(cwd);

  // No research corpus → nothing to render.
  if (!fs.existsSync(path.join(root, 'documentation', 'references'))) return [];

  const { index } = await readIndexConfig(cwd);
  const views = configuredViews(index as Record<string, unknown> | undefined);

  // `only` selects a single view when it is one we render; an unrelated JSON
  // graph name (e.g. 'codebase') selects nothing here.
  let selected: string[];
  if (opts.only) {
    if (!views.has(opts.only)) return [];
    selected = [opts.only];
  } else {
    selected = [...views.keys()];
  }

  const { records, corpusRoot, checksum } = loadCorpus(root);
  const generated = utcTimestamp();
  const ctx: RenderContext = { records, corpusRoot, generated, checksum };
  const results: ViewResult[] = [];

  for (const name of selected) {
    const outRel = outputForView(name, views.get(name)?.output);
    const outPath = path.join(root, outRel);
    if (!opts.force && existingChecksum(outPath) === checksum) {
      results.push({ graph: name, status: 'skipped', output: outRel, papers: records.length });
      continue;
    }
    let content: string;
    try {
      content = renderView(name, ctx);
    } catch (err) {
      results.push({ graph: name, status: 'unsupported', output: outRel, error: (err as Error).message });
      continue;
    }
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, content, 'utf-8');
    results.push({ graph: name, status: 'built', output: outRel, papers: records.length });
  }

  return results;
}
