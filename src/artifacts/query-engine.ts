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
function scoreEntry(entry: MetadataEntry, text: string): number {
  const lower = text.toLowerCase();
  const tokens = tokenize(text);
  let score = 0;

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

export async function discoverCapability(
  cwd: string,
  params: DiscoverParams,
): Promise<void> {
  const startTime = Date.now();
  const types = params.typeFilter && params.typeFilter.length > 0
    ? params.typeFilter
    : DEFAULT_DISCOVER_TYPES;
  const limit = params.limit ?? 10;

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
    if (params.json) {
      console.log(JSON.stringify({ query: { phrase: params.phrase, types }, results: [], total: 0 }, null, 2));
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

  if (params.json) {
    console.log(JSON.stringify({
      query: { phrase: params.phrase, types, limit },
      results: scored.map(r => ({
        path: r.entry.path,
        type: r.entry.type,
        title: r.entry.title,
        score: Math.round(r.score * 100) / 100,
        triggers: r.entry.triggers ?? [],
        capability: r.entry.capability ?? r.entry.summary,
        kernel: r.entry.kernel ?? false,
      })),
      total: scored.length,
      query_time_ms: queryTimeMs,
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
    const topTrigger = r.entry.triggers && r.entry.triggers.length > 0
      ? r.entry.triggers[0]
      : '';
    console.log(`  ${kernelTag}score=${score}  ${type} ${r.entry.path}`);
    if (r.entry.capability) {
      console.log(`               ${r.entry.capability}`);
    }
    if (topTrigger) {
      console.log(`               trigger: "${topTrigger}"`);
    }
  }
  console.log('');
  console.log('★ = kernel skill (always-loaded). Others are reachable via the index.');
}
