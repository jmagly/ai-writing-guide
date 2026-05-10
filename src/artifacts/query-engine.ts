/**
 * Artifact Query Engine
 *
 * Searches the artifact index by keyword, type, phase, tags, and path pattern.
 * Returns ranked results in human-readable or JSON format.
 *
 * @implements #416
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/query-engine.test.ts
 */

import { minimatch } from 'minimatch';
import type { QueryParams, QueryResult, MetadataEntry, GraphType, ArtifactIndex } from './types.js';
import { loadMetadataIndex, loadGraphIndexFile } from './index-reader.js';

export interface QueryOptions {
  json?: boolean;
  graph?: GraphType;
}

/**
 * Stop-words to drop when tokenizing a discovery phrase. Keep short —
 * we want the user's verbs and nouns to dominate scoring.
 */
const SCORE_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on',
  'with', 'into', 'from', 'is', 'are', 'be', 'i', 'we', 'my',
]);

/**
 * Tokenize a query phrase into lowercased keywords for multi-word
 * scoring. Splits on whitespace and punctuation; drops stopwords and
 * single-character tokens.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(t => t.length > 1 && !SCORE_STOPWORDS.has(t));
}

/**
 * Score a metadata entry against a keyword query.
 *
 * Multi-word queries are tokenized; each token contributes its weighted
 * match across the entry's searchable fields. The full phrase still
 * earns bonus weight when it appears as a contiguous substring or as
 * an exact trigger phrase (the most reliable signal).
 *
 * For AIWG artifact kinds (skills/agents/commands/rules) the entry
 * carries `triggers` (declared activation phrases) and `capability`
 * (one-line description). These get the highest weights so capability
 * search via `aiwg index discover` ranks the right skill on top
 * instead of bottoming out on a path-substring match (#1214).
 */
/**
 * Normalize a string for exact-name comparison (#1233) — lowercase and
 * collapse `-` / `_` / whitespace runs so hyphenated kernel-skill names
 * like `aiwg-doctor` match queries with spaces ("aiwg doctor") and the
 * rendered title ("AIWG Doctor") matches the slug query.
 */
function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[-_\s]+/g, ' ').trim();
}

function scoreEntry(entry: MetadataEntry, text: string): number {
  const lower = text.toLowerCase();
  const tokens = tokenize(text);
  let score = 0;

  // Exact-name floor (#1233) — if the query (normalized) exactly matches
  // the entry's canonical name, this is the artifact the user is asking
  // for and it must surface at the top regardless of how cluttered the
  // rest of the corpus scoring gets. Hyphens, underscores, and whitespace
  // are interchangeable in the comparison so `aiwg-doctor`, `aiwg doctor`,
  // and `aiwg_doctor` all match a kernel skill with `name: aiwg-doctor`.
  //
  // Returns 1.001 (not 1.0) so an exact-name hit sorts above the many
  // capped-at-1.0 substring matches that share generic words like "use".
  // Display rounding (Math.round(score * 100) / 100) hides the offset, so
  // the user still sees `score: 1.0` while sort order is preserved.
  if (entry.name) {
    const queryNorm = normalizeName(text);
    const nameNorm = normalizeName(entry.name);
    if (queryNorm === nameNorm) {
      return 1.001;
    }
  }

  // Searchable text — joined once so per-token includes() is cheap
  const titleLower = entry.title.toLowerCase();
  const summaryLower = entry.summary.toLowerCase();
  const pathLower = entry.path.toLowerCase();
  const typeLower = entry.type.toLowerCase();
  const capabilityLower = entry.capability ? entry.capability.toLowerCase() : '';
  const tagsLower = entry.tags.map(t => t.toLowerCase());
  const triggersLower = entry.triggers ?? [];

  // For multi-token queries, require ≥50% token overlap to count
  // partial matches. This keeps gibberish queries (e.g.,
  // `xyzzy_zzqwkjhg_42` after splitting on `_`) from surfacing
  // incidental single-token hits.
  const useMultiToken = tokens.length > 1;
  const minHits = useMultiToken ? Math.ceil(tokens.length / 2) : 1;
  const overlapOK = (hits: number): boolean => useMultiToken && hits >= minHits;

  // Trigger phrase match — highest weight (4x). Exact match on the full
  // phrase wins big; substring or token-overlap is still strong.
  if (triggersLower.length > 0) {
    for (const trigger of triggersLower) {
      if (trigger === lower) {
        score += 0.4 * 4;
        break;
      } else if (trigger.includes(lower) || lower.includes(trigger)) {
        score += 0.25 * 4;
      } else if (useMultiToken) {
        const hits = tokens.filter(t => trigger.includes(t)).length;
        if (overlapOK(hits)) score += 0.06 * 4 * (hits / tokens.length);
      }
    }
  }

  // Capability description (2x weight) — full phrase first, then tokens
  if (capabilityLower) {
    if (capabilityLower.includes(lower)) {
      score += 0.2 * 2;
    } else if (useMultiToken) {
      const hits = tokens.filter(t => capabilityLower.includes(t)).length;
      if (overlapOK(hits)) score += 0.1 * 2 * (hits / tokens.length);
    }
  }

  // Title (3x weight)
  if (titleLower.includes(lower)) {
    score += 0.3 * 3;
    if (titleLower === lower) score += 0.2;
  } else if (useMultiToken) {
    const hits = tokens.filter(t => titleLower.includes(t)).length;
    if (overlapOK(hits)) score += 0.08 * 3 * (hits / tokens.length);
  }

  // Tags (2x weight)
  for (const tag of tagsLower) {
    if (tag.includes(lower)) {
      score += 0.2 * 2;
    } else if (useMultiToken) {
      const hits = tokens.filter(t => tag.includes(t)).length;
      if (overlapOK(hits)) score += 0.05 * 2 * (hits / tokens.length);
    }
  }

  // Summary (1x weight)
  if (summaryLower.includes(lower)) {
    score += 0.15;
  } else if (useMultiToken) {
    const hits = tokens.filter(t => summaryLower.includes(t)).length;
    if (overlapOK(hits)) score += 0.04 * (hits / tokens.length);
  }

  // Path (0.5x weight)
  if (pathLower.includes(lower)) {
    score += 0.1;
  } else if (useMultiToken) {
    const hits = tokens.filter(t => pathLower.includes(t)).length;
    if (overlapOK(hits)) score += 0.03 * (hits / tokens.length);
  }

  // Type (0.5x weight)
  if (typeLower.includes(lower)) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

/**
 * Query the artifact index
 */
export async function queryIndex(
  cwd: string,
  params: QueryParams,
  options: QueryOptions = {}
): Promise<void> {
  const { graph } = options;
  const startTime = Date.now();

  let candidates: MetadataEntry[];

  if (graph) {
    // Single graph mode
    const index = loadGraphIndexFile<ArtifactIndex>(cwd, 'metadata.json', graph);
    if (!index) {
      console.error(`Error: No artifact index found for graph '${graph}'.`);
      console.log("Run 'aiwg index build' first to create the index.");
      process.exit(1);
    }
    candidates = Object.values(index.entries);
  } else {
    // No graph specified: search across all project-local graphs
    const graphTypes: GraphType[] = ['project', 'codebase'];
    const allEntries: MetadataEntry[] = [];
    for (const g of graphTypes) {
      const idx = loadGraphIndexFile<ArtifactIndex>(cwd, 'metadata.json', g);
      if (idx) allEntries.push(...Object.values(idx.entries));
    }

    // Fall back to legacy root index
    if (allEntries.length === 0) {
      const legacy = loadMetadataIndex(cwd);
      if (!legacy) {
        console.error('Error: No artifact index found.');
        console.log("Run 'aiwg index build' first to create the index.");
        process.exit(1);
      }
      allEntries.push(...Object.values(legacy.entries));
    }

    candidates = allEntries;
  }

  // Apply filters
  if (params.type) {
    candidates = candidates.filter(e => e.type === params.type);
  }
  if (params.phase) {
    candidates = candidates.filter(e => e.phase === params.phase);
  }
  if (params.tags && params.tags.length > 0) {
    candidates = candidates.filter(e =>
      params.tags!.every(tag => e.tags.includes(tag))
    );
  }
  if (params.path) {
    candidates = candidates.filter(e => minimatch(e.path, params.path!));
  }
  if (params.updatedAfter) {
    const cutoff = new Date(params.updatedAfter).getTime();
    candidates = candidates.filter(e => new Date(e.updated).getTime() >= cutoff);
  }

  // Score and rank
  let results: QueryResult[];
  if (params.text) {
    results = candidates
      .map(entry => ({ entry, score: scoreEntry(entry, params.text!) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);
  } else {
    // No keyword — return all filtered results with score 1.0
    results = candidates.map(entry => ({ entry, score: 1.0 }));
  }

  // Apply limit
  const limit = params.limit ?? 20;
  results = results.slice(0, limit);

  const queryTimeMs = Date.now() - startTime;

  // Output
  if (options.json) {
    console.log(JSON.stringify({
      query: { text: params.text, filters: { type: params.type, phase: params.phase, tags: params.tags, path: params.path } },
      results: results.map(r => ({
        path: r.entry.path,
        type: r.entry.type,
        phase: r.entry.phase,
        title: r.entry.title,
        score: Math.round(r.score * 100) / 100,
        summary: r.entry.summary,
      })),
      total: results.length,
      query_time_ms: queryTimeMs,
    }, null, 2));
  } else {
    const queryDesc = params.text ? `"${params.text}"` : 'all';
    console.log(`Results for ${queryDesc} (${results.length} matches, ${queryTimeMs}ms):`);
    console.log('');
    console.log('  #  Score  Type         Phase          Path');

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const num = String(i + 1).padStart(3);
      const score = r.score.toFixed(2).padStart(4);
      const type = r.entry.type.padEnd(12).slice(0, 12);
      const phase = r.entry.phase.padEnd(14).slice(0, 14);
      console.log(`  ${num}  ${score}  ${type} ${phase} ${r.entry.path}`);
    }

    if (results.length === 0) {
      console.log('  No results found.');
    }
    console.log('');
  }
}

/**
 * Discovery query — capability search across AIWG artifact kinds.
 *
 * Tuned for "agent looking for the right skill / agent / command / rule"
 * use case. Defaults the type filter to AIWG artifact kinds, prefers the
 * `framework` graph (where deployed source lives), and outputs in a
 * token-tight format that names the top trigger phrase responsible for
 * each match.
 *
 * @implements #1214
 */
export interface DiscoverParams {
  /** Search phrase (the user's capability description) */
  phrase: string;
  /** Restrict to specific types — defaults to skill/agent/command/rule */
  typeFilter?: string[];
  /** Max results (default 10) */
  limit?: number;
  /** JSON output mode */
  json?: boolean;
  /** Override default graph (defaults to `framework`, falls back to `project`) */
  graph?: GraphType;
}

const DEFAULT_DISCOVER_TYPES = ['skill', 'agent', 'command', 'rule'];

/**
 * Resolve the AIWG installation root for path-anchoring discover output.
 * Discover returns paths anchored to AIWG_ROOT so the agent's `Read`
 * tool can resolve them from any project working directory (#1217).
 */
/**
 * Build the `run_hint` string for a script-bearing skill entry (#1227).
 *
 * Format: `aiwg run skill <name> [-- <argsHint>]`. The skill name is the
 * basename of its source directory (skills/<name>/SKILL.md), which is
 * what `aiwg run skill` accepts.
 */
function buildRunHint(entry: MetadataEntry): string {
  // Use the directory basename for slug-layout skills, filename stem otherwise.
  const lastSlash = entry.path.lastIndexOf('/');
  const tail = lastSlash >= 0 ? entry.path.slice(lastSlash + 1) : entry.path;
  let name: string;
  if (tail === 'SKILL.md' && lastSlash >= 0) {
    const dir = entry.path.slice(0, lastSlash);
    const dirSlash = dir.lastIndexOf('/');
    name = dirSlash >= 0 ? dir.slice(dirSlash + 1) : dir;
  } else {
    name = tail.replace(/\.[^.]+$/, '');
  }
  const argsHint = entry.script?.argsHint ? ` -- ${entry.script.argsHint}` : '';
  return `aiwg run skill ${name}${argsHint}`;
}

async function getAiwgRootForDiscover(): Promise<string | null> {
  if (process.env.AIWG_ROOT) return process.env.AIWG_ROOT;
  try {
    const mod: { getFrameworkRoot?: () => Promise<string | null> } =
      await import('../channel/manager.mjs');
    if (typeof mod.getFrameworkRoot === 'function') {
      const r = await mod.getFrameworkRoot();
      return r || null;
    }
  } catch {
    // channel manager unavailable — fall through
  }
  return null;
}

export async function discoverCapability(
  cwd: string,
  params: DiscoverParams,
): Promise<void> {
  const startTime = Date.now();
  const types = params.typeFilter && params.typeFilter.length > 0
    ? params.typeFilter
    : DEFAULT_DISCOVER_TYPES;
  // Default top-K = 5 (Wave A from #1218): peer-reviewed work on tool
  // retrieval (Semantic Tool Discovery for MCP, arXiv:2603.20313) reports
  // 97.1% hit@K=3 at scale; K=5 keeps a buffer above K=3 while halving
  // the prior K=10 default. Operators wanting more breadth can pass
  // `--limit N` explicitly.
  const limit = params.limit ?? 5;
  // For framework-graph entries, anchor returned paths to AIWG_ROOT so
  // they resolve from any project working directory (#1217).
  const aiwgRoot = await getAiwgRootForDiscover();

  // Source: prefer `framework` graph (built post-deploy), fall back to
  // project / codebase / legacy depending on what's available.
  let entries: MetadataEntry[] = [];
  if (params.graph) {
    const idx = loadGraphIndexFile<ArtifactIndex>(cwd, 'metadata.json', params.graph);
    if (idx) entries = Object.values(idx.entries);
  } else {
    // Default: framework first, then any per-project graph.
    for (const g of ['framework', 'project', 'codebase'] as GraphType[]) {
      const idx = loadGraphIndexFile<ArtifactIndex>(cwd, 'metadata.json', g);
      if (idx) entries.push(...Object.values(idx.entries));
    }
    if (entries.length === 0) {
      const legacy = loadMetadataIndex(cwd);
      if (legacy) entries.push(...Object.values(legacy.entries));
    }
  }

  if (entries.length === 0) {
    // Empty-index case (#1221). Surface a hint that explains the gap rather
    // than returning a bare zero-result envelope — the latter trains agents
    // to conclude "AIWG doesn't have a skill for that" when in fact the
    // index simply hasn't been built in this workspace yet.
    const hint = 'No artifact index found. Run `aiwg index build --graph framework` (or `aiwg use <framework>`) first.';
    if (params.json) {
      console.log(JSON.stringify({
        query: { phrase: params.phrase, types },
        results: [],
        total: 0,
        hint,
      }, null, 2));
    } else {
      console.error('Error: No artifact index found.');
      console.log('Run `aiwg index build --graph framework` (or `aiwg use <framework>`) first.');
    }
    process.exit(1);
  }

  // Filter by type
  const candidates = entries.filter(e => types.includes(e.type));

  // Score
  const scored = candidates
    .map(entry => ({ entry, score: scoreEntry(entry, params.phrase) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const queryTimeMs = Date.now() - startTime;

  /**
   * Resolve a stored framework-graph path to an absolute AIWG_ROOT
   * path (#1217). Framework-graph entries are stored as paths relative
   * to the AIWG repo root (e.g. `agentic/code/frameworks/.../SKILL.md`);
   * anchoring them to `AIWG_ROOT` makes them readable from any project
   * working directory.
   *
   * Kernel skills are anchored the same way (#1230) — `aiwg show` reads
   * the source corpus, not platform deploy mirrors, so kernel entries
   * need the same `AIWG_ROOT` anchoring as non-kernel framework entries.
   * Non-framework entries (project / codebase graphs) keep their stored
   * paths unchanged.
   */
  function resolvePath(entry: MetadataEntry): string {
    if (!aiwgRoot) return entry.path;
    if (entry.path.startsWith('/')) return entry.path;
    if (entry.path.startsWith('agentic/code/')) return `${aiwgRoot}/${entry.path}`;
    return entry.path;
  }

  // Build a hint string when the index has entries but no scored matches —
  // this is the second silent-failure mode #1221 calls out.
  const emptyResultHint = scored.length === 0
    ? `No matches in the indexed corpus. The framework index has ${entries.length} entries but none scored against "${params.phrase}". Try a broader phrase, check \`aiwg index stats --graph framework\`, or rebuild with \`aiwg index build --graph framework --force\`.`
    : null;

  if (params.json) {
    console.log(JSON.stringify({
      query: { phrase: params.phrase, types, limit, aiwg_root: aiwgRoot ?? null },
      results: scored.map(r => ({
        path: resolvePath(r.entry),
        type: r.entry.type,
        title: r.entry.title,
        score: Math.round(r.score * 100) / 100,
        triggers: r.entry.triggers ?? [],
        capability: r.entry.capability ?? r.entry.summary,
        kernel: r.entry.kernel ?? false,
        // #1227 — surface script-bearing skills so agents know to use
        // `aiwg run skill <name>` instead of executing instructions
        // themselves.
        ...(r.entry.script
          ? {
              executable: true,
              run_hint: buildRunHint(r.entry),
            }
          : {}),
      })),
      total: scored.length,
      query_time_ms: queryTimeMs,
      ...(emptyResultHint ? { hint: emptyResultHint } : {}),
    }, null, 2));
    return;
  }

  if (scored.length === 0) {
    console.log(`No discovery matches for "${params.phrase}" in types: ${types.join(',')}.`);
    console.log('Try a broader phrase, or check `aiwg index stats --graph framework` to confirm the index is built.');
    return;
  }

  console.log(`Discovery results for "${params.phrase}" (${scored.length} matches, ${queryTimeMs}ms):`);
  console.log('');
  for (const r of scored) {
    const score = r.score.toFixed(2).padStart(4);
    const type = r.entry.type.padEnd(7);
    const kernelTag = r.entry.kernel ? '★ ' : '  ';
    const execTag = r.entry.script ? ' [exec]' : '';
    const topTrigger = r.entry.triggers && r.entry.triggers.length > 0
      ? r.entry.triggers[0]
      : '';
    console.log(`  ${kernelTag}score=${score}  ${type} ${resolvePath(r.entry)}${execTag}`);
    if (r.entry.capability) {
      console.log(`               ${r.entry.capability}`);
    }
    if (r.entry.script) {
      console.log(`               run: ${buildRunHint(r.entry)}`);
    }
    if (topTrigger) {
      console.log(`               trigger: "${topTrigger}"`);
    }
  }
  console.log('');
  console.log('★ = kernel skill (always-loaded). Others are reachable via the index.');
}

export interface ShowParams {
  /** Skill name (e.g. `intake-wizard`), title, or artifact path */
  name: string;
  /** Restrict to specific types — defaults to skill/agent/command/rule */
  typeFilter?: string[];
  /** Emit a JSON envelope (path + content) instead of raw file text */
  json?: boolean;
  /** Override default graph (defaults to `framework`, falls back to `project`) */
  graph?: GraphType;
  /** When ambiguous, pick the first match instead of erroring */
  first?: boolean;
}

/**
 * Scan the AIWG_ROOT corpus for an artifact matching `name` (#1221).
 *
 * Walks the well-known artifact layouts under
 * `agentic/code/{frameworks,addons,extensions}/<bundle>/{skills,agents,commands,rules,templates}/`
 * and returns the first match. Used as a fallback in `aiwg show` when an
 * artifact isn't in any built index — either because the workspace hasn't
 * been deployed to yet, or because the bundle hasn't been installed.
 *
 * Returns the resolved absolute path plus enough metadata for the caller
 * to surface a useful install hint. Returns null if nothing matches.
 */
async function findCorpusArtifact(
  aiwgRoot: string,
  name: string,
  typeFilter: string[],
): Promise<{
  path: string;
  type: string;
  bundleKind: 'framework' | 'addon' | 'extension' | null;
  bundleId: string | null;
} | null> {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const fsp = fs.promises;

  const groups: Array<{ kind: 'framework' | 'addon' | 'extension'; dir: string }> = [
    { kind: 'framework', dir: path.join(aiwgRoot, 'agentic/code/frameworks') },
    { kind: 'addon', dir: path.join(aiwgRoot, 'agentic/code/addons') },
    { kind: 'extension', dir: path.join(aiwgRoot, 'agentic/code/extensions') },
  ];

  // (subdir, type, layout) — 'flat' = `<name>.md`, 'slug' = `<name>/SKILL.md`
  const tries: Array<{ sub: string; type: string; layout: 'flat' | 'slug' }> = [
    { sub: 'skills', type: 'skill', layout: 'slug' },
    { sub: 'skills', type: 'skill', layout: 'flat' },
    { sub: 'agents', type: 'agent', layout: 'flat' },
    { sub: 'commands', type: 'command', layout: 'flat' },
    { sub: 'rules', type: 'rule', layout: 'flat' },
    { sub: 'templates', type: 'template', layout: 'flat' },
  ];

  for (const group of groups) {
    let bundles: string[];
    try {
      bundles = (await fsp.readdir(group.dir, { withFileTypes: true }))
        .filter(d => d.isDirectory())
        .map(d => d.name);
    } catch {
      continue;
    }
    for (const bundle of bundles) {
      for (const t of tries) {
        if (typeFilter.length > 0 && !typeFilter.includes(t.type)) continue;
        const candidate = t.layout === 'slug'
          ? path.join(group.dir, bundle, t.sub, name, 'SKILL.md')
          : path.join(group.dir, bundle, t.sub, `${name}.md`);
        try {
          const stat = await fsp.stat(candidate);
          if (stat.isFile()) {
            return { path: candidate, type: t.type, bundleKind: group.kind, bundleId: bundle };
          }
        } catch {
          // not present — continue
        }
      }
    }
  }
  return null;
}

/**
 * Read and emit the full text of a specific artifact (typically a
 * SKILL.md). Consumers don't need to know where AIWG stores skills —
 * they pass the skill name and the CLI reads the file from the indexed
 * location.
 *
 * Lookup order:
 *   1. Exact path match against any indexed entry's stored path
 *   2. Basename match (e.g. `intake-wizard` matches an entry whose
 *      directory basename is `intake-wizard`)
 *   3. Title match (case-insensitive)
 *   4. Corpus fallback under AIWG_ROOT (#1221)
 *
 * On ambiguity, lists all matches and exits with code 2 unless
 * `--first` is supplied.
 */
export async function showArtifact(
  cwd: string,
  params: ShowParams,
): Promise<void> {
  const { promises: fs } = await import('node:fs');
  const path = await import('node:path');
  const types = params.typeFilter && params.typeFilter.length > 0
    ? params.typeFilter
    : DEFAULT_DISCOVER_TYPES;
  const aiwgRoot = await getAiwgRootForDiscover();

  // Source the same graphs as discoverCapability for symmetry.
  let entries: MetadataEntry[] = [];
  if (params.graph) {
    const idx = loadGraphIndexFile<ArtifactIndex>(cwd, 'metadata.json', params.graph);
    if (idx) entries = Object.values(idx.entries);
  } else {
    for (const g of ['framework', 'project', 'codebase'] as GraphType[]) {
      const idx = loadGraphIndexFile<ArtifactIndex>(cwd, 'metadata.json', g);
      if (idx) entries.push(...Object.values(idx.entries));
    }
    if (entries.length === 0) {
      const legacy = loadMetadataIndex(cwd);
      if (legacy) entries.push(...Object.values(legacy.entries));
    }
  }

  if (entries.length === 0) {
    console.error('Error: No artifact index found.');
    console.error('Run `aiwg index build --graph framework` (or `aiwg use <framework>`) first.');
    process.exit(1);
  }

  const candidates = entries.filter(e => types.includes(e.type));
  const needle = params.name.trim();
  const needleLower = needle.toLowerCase();

  // Exact path match — most precise.
  let matches = candidates.filter(e => e.path === needle);

  // Basename match — directory name (skills/<name>/SKILL.md) or filename
  // stem for agent/command/rule files.
  if (matches.length === 0) {
    matches = candidates.filter(e => {
      const stem = path.basename(path.dirname(e.path));
      const fileStem = path.basename(e.path).replace(/\.[^.]+$/, '');
      return stem === needle || fileStem === needle;
    });
  }

  // Title match (case-insensitive) — last-resort fallback.
  if (matches.length === 0) {
    matches = candidates.filter(e =>
      typeof e.title === 'string' && e.title.toLowerCase() === needleLower,
    );
  }

  if (matches.length === 0) {
    // Corpus fallback (#1221): when the artifact isn't in any indexed graph,
    // scan the AIWG_ROOT corpus for a likely match and render it with an
    // "(uninstalled)" banner. This keeps `aiwg show` useful in workspaces
    // where the operator hasn't run `aiwg use` yet, or where the framework
    // index is stale, rather than exiting with a misleading "not found".
    if (aiwgRoot) {
      const corpusMatch = await findCorpusArtifact(aiwgRoot, needle, types);
      if (corpusMatch) {
        let content: string;
        try {
          content = await fs.readFile(corpusMatch.path, 'utf8');
        } catch (err) {
          const e = err as NodeJS.ErrnoException;
          console.error(`Error reading ${corpusMatch.path}: ${e.message ?? String(err)}`);
          process.exit(1);
        }
        const installHint = corpusMatch.bundleKind && corpusMatch.bundleId
          ? `Run \`aiwg use ${corpusMatch.bundleId}\` to install this ${corpusMatch.bundleKind} into the workspace.`
          : 'Run `aiwg index build --graph framework` to refresh the artifact index.';
        if (params.json) {
          console.log(JSON.stringify({
            path: corpusMatch.path,
            type: corpusMatch.type,
            title: needle,
            kernel: false,
            uninstalled: true,
            hint: installHint,
            content,
          }, null, 2));
          return;
        }
        // Plain text mode: prepend a banner so consumers see the artifact is
        // corpus-only, then stream the body.
        const banner = [
          '<!-- AIWG: corpus-only artifact — not in the indexed workspace.',
          `     ${installHint}`,
          '     Origin: ' + corpusMatch.path,
          '-->',
          '',
        ].join('\n');
        process.stdout.write(banner);
        process.stdout.write(content);
        if (!content.endsWith('\n')) process.stdout.write('\n');
        return;
      }
    }
    console.error(`Error: no artifact found matching "${needle}".`);
    console.error('Try `aiwg discover "<phrase>"` to find the right name.');
    process.exit(1);
  }

  // Resolve relative framework-graph paths to absolute paths.
  // Kernel entries are anchored the same way as non-kernel framework entries
  // (#1230) — show reads the source corpus, not platform deploy mirrors.
  function resolvePath(entry: MetadataEntry): string {
    if (path.isAbsolute(entry.path)) return entry.path;
    if (aiwgRoot && entry.path.startsWith('agentic/code/')) {
      return path.join(aiwgRoot, entry.path);
    }
    // Project-graph entries are stored relative to the project root (cwd).
    return path.join(cwd, entry.path);
  }

  if (matches.length > 1 && !params.first) {
    if (params.json) {
      console.log(JSON.stringify({
        ambiguous: true,
        name: needle,
        matches: matches.map(e => ({
          path: resolvePath(e),
          type: e.type,
          title: e.title,
          kernel: e.kernel ?? false,
        })),
      }, null, 2));
    } else {
      console.error(`Ambiguous: "${needle}" matches ${matches.length} artifacts. Disambiguate with --type or pass the full path:`);
      for (const e of matches) {
        console.error(`  ${e.type.padEnd(7)} ${resolvePath(e)}`);
      }
      console.error('');
      console.error('Re-run with `--first` to pick the top match, or `--type skill` to filter.');
    }
    process.exit(2);
  }

  const entry = matches[0];
  const filePath = resolvePath(entry);
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    console.error(`Error reading ${filePath}: ${e.message ?? String(err)}`);
    process.exit(1);
  }

  if (params.json) {
    console.log(JSON.stringify({
      path: filePath,
      type: entry.type,
      title: entry.title,
      kernel: entry.kernel ?? false,
      // #1227 — surface script-bearing skills so callers can route to
      // `aiwg run skill <name>` instead of treating SKILL.md as
      // instructions for the agent to execute itself.
      ...(entry.script
        ? { executable: true, run_hint: buildRunHint(entry) }
        : {}),
      content,
    }, null, 2));
    return;
  }

  // Plain mode: stream the file content unmodified so the consumer
  // (agent or operator) sees exactly what the source authored.
  // #1227 — for script-bearing skills, prepend a one-line banner so
  // agents reading the body immediately see the skill is executable.
  if (entry.script) {
    const hint = buildRunHint(entry);
    process.stdout.write(`<!-- AIWG: executable skill — run via: ${hint} -->\n`);
  }
  process.stdout.write(content);
  if (!content.endsWith('\n')) process.stdout.write('\n');
}
