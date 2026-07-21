import fs from "node:fs";
import type {
  ArtifactIndex,
  DependencyGraph,
  GraphType,
  MetadataEntry,
} from "./types.js";
import type {
  AiwgFortemiIndexExport,
  AiwgFortemiRecord,
} from "./browser-export.js";
import { bm25Rank, type FullTextDoc } from "./fulltext.js";
import { getFortemiCorePrebuiltStatus, getFortemiCoreSyncStatus } from "./fortemi-core-sync.js";

export interface FortemiCoreLoadResult {
  entries: MetadataEntry[];
  reason?: string;
}

export interface FortemiCoreExportLoadResult {
  exported?: AiwgFortemiIndexExport;
  reason?: string;
}

export interface FortemiCoreDependencyGraphLoadResult {
  graph?: DependencyGraph;
  reason?: string;
}

export interface FortemiCoreStaticSearchOptions {
  graph?: GraphType;
  text: string;
  limit?: number;
}

export interface FortemiCoreStaticHybridSearchOptions extends FortemiCoreStaticSearchOptions {
  path?: string;
  type?: string;
  phase?: string;
  tags?: string[];
}

export interface FortemiCoreStaticSearchResult {
  path: string;
  type: string;
  title: string;
  summary?: string;
  score: number;
  matched: string[];
}

export interface FortemiCoreStaticFulltextResult extends FortemiCoreStaticSearchResult {
  phase: string;
  tags: string[];
  summary: string;
}

export interface FortemiCoreAiwgDiscoveryOptions {
  graph?: GraphType;
  text: string;
  limit?: number;
  types?: string[];
}

export interface FortemiCoreAiwgDiscoveryResult {
  entry: MetadataEntry;
  score: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);
}

function includesAny(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  let matches = 0;
  for (const term of terms) {
    if (lower.includes(term)) matches++;
  }
  return matches;
}

function scoreStaticRecord(
  record: AiwgFortemiRecord,
  terms: string[],
): { score: number; matched: string[] } {
  const fields = [
    { name: "title", text: record.title, weight: 3 },
    { name: "name", text: record.name ?? record.search?.name ?? "", weight: 3 },
    {
      name: "summary",
      text: record.summary ?? record.search?.summary ?? "",
      weight: 2,
    },
    { name: "capability", text: record.search?.capability ?? "", weight: 2 },
    {
      name: "triggers",
      text: (record.search?.triggers ?? []).join(" "),
      weight: 2,
    },
    { name: "tags", text: record.tags.join(" "), weight: 2 },
    { name: "body", text: record.search?.body ?? record.text, weight: 1 },
    {
      name: "chunks",
      text: (record.chunks ?? []).map((chunk) => chunk.text).join(" "),
      weight: 1,
    },
  ];

  let score = 0;
  const matched: string[] = [];
  for (const field of fields) {
    const matches = includesAny(field.text, terms);
    if (matches > 0) {
      score += (matches / terms.length) * field.weight;
      matched.push(field.name);
    }
  }
  return { score, matched };
}

function recordToStaticResult(
  record: AiwgFortemiRecord,
  score: number,
  matched: string[],
): FortemiCoreStaticSearchResult {
  return {
    path: record.source.path,
    type: artifactTypeFromRecord(record),
    title: record.title,
    summary: record.summary ?? record.search?.summary,
    score: Math.round(score * 1000) / 1000,
    matched,
  };
}

function recordBody(record: AiwgFortemiRecord): string {
  const chunks = (record.chunks ?? []).map((chunk) => chunk.text).join("\n");
  return [
    record.search?.body,
    record.text,
    chunks,
    record.summary,
    record.search?.summary,
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n");
}

function matchesPath(recordPath: string, pattern: string): boolean {
  if (pattern.includes("*")) {
    const doubleStarPlaceholder = "__AIWG_DOUBLE_STAR__";
    const regex = new RegExp(
      `^${pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, doubleStarPlaceholder)
        .replace(/\*/g, "[^/]*")
        .replace(new RegExp(doubleStarPlaceholder, "g"), ".*")}$`,
    );
    return regex.test(recordPath);
  }
  return recordPath.includes(pattern);
}

export function loadFortemiCoreExport(
  cwd: string,
  graph: GraphType = "project",
): FortemiCoreExportLoadResult {
  let status = getFortemiCoreSyncStatus(cwd, graph);
  if ((!status.optedIn || !status.built || status.stale) && graph === "framework") {
    const prebuilt = getFortemiCorePrebuiltStatus(graph);
    if (prebuilt.optedIn && prebuilt.built && !prebuilt.stale) {
      status = prebuilt;
    }
  }
  if (!status.optedIn) {
    return {
      reason: `Fortemi Core static index is not materialized for graph '${graph}'. Run 'aiwg index sync${graph === "project" ? "" : ` --graph ${graph}`}' first, or pass '--backend local' to use the legacy local index.`,
    };
  }
  if (!status.built || status.stale) {
    return {
      reason: `${
        status.reason ??
        `Fortemi Core static index for graph '${graph}' is stale or incomplete`
      }. Re-run 'aiwg index sync' or pass '--backend local' to use the legacy local index.`,
    };
  }

  try {
    const exported = JSON.parse(
      fs.readFileSync(status.exportPath, "utf-8"),
    ) as AiwgFortemiIndexExport;
    if (exported.schema_version !== "aiwg.fortemi.index.export.v2") {
      return {
        reason: `Fortemi Core static index has schema '${exported.schema_version}', expected 'aiwg.fortemi.index.export.v2'. Re-run 'aiwg index sync'.`,
      };
    }
    return { exported };
  } catch (err) {
    return {
      reason: `Fortemi Core static index could not be read: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function artifactTypeFromRecord(record: AiwgFortemiRecord): string {
  if (record.search?.type) return record.search.type;
  if (record.type.startsWith("aiwg.")) return record.type.slice("aiwg.".length);
  return record.type;
}

function entryFromRecord(record: AiwgFortemiRecord): MetadataEntry {
  const indexedFrontmatter = record.search?.frontmatter ?? {};
  const indexedSearchTerms = indexedFrontmatter.aiwg_search_terms;
  return {
    path: record.source.path,
    type: artifactTypeFromRecord(record),
    kind:
      typeof indexedFrontmatter.aiwg_kind === "string"
        ? indexedFrontmatter.aiwg_kind
        : undefined,
    sourceType:
      typeof indexedFrontmatter.aiwg_source_type === "string"
        ? indexedFrontmatter.aiwg_source_type
        : undefined,
    phase: record.search?.phase ?? record.facets.phase?.[0] ?? "",
    title: record.title,
    name: record.name ?? record.search?.name,
    tags: record.tags,
    created: record.source.updated_at ?? record.updated_at,
    updated: record.updated_at,
    checksum: record.source.checksum ?? "",
    summary: record.summary ?? record.search?.summary ?? record.text,
    dependencies: record.relationships
      .filter((relationship) => relationship.direction === "upstream")
      .map(
        (relationship) =>
          relationship.target_path ??
          relationship.source_path ??
          relationship.target_id,
      ),
    dependents: record.relationships
      .filter((relationship) => relationship.direction === "downstream")
      .map(
        (relationship) =>
          relationship.target_path ??
          relationship.source_path ??
          relationship.target_id,
      ),
    triggers: record.search?.triggers,
    capability: record.search?.capability,
    searchTerms: Array.isArray(indexedSearchTerms)
      ? indexedSearchTerms.filter((term): term is string => typeof term === "string")
      : undefined,
    kernel:
      typeof record.search?.frontmatter?.kernel === "boolean"
        ? record.search.frontmatter.kernel
        : undefined,
  };
}

export function loadFortemiCoreMetadataEntries(
  cwd: string,
  graph: GraphType = "project",
): FortemiCoreLoadResult {
  const loaded = loadFortemiCoreExport(cwd, graph);
  if (!loaded.exported) return { entries: [], reason: loaded.reason };
  return { entries: loaded.exported.items.map(entryFromRecord) };
}

export async function queryFortemiCoreAiwgDiscovery(
  cwd: string,
  options: FortemiCoreAiwgDiscoveryOptions,
):
  Promise<
    | { results: FortemiCoreAiwgDiscoveryResult[]; reason?: undefined }
    | { results: []; reason: string }
  > {
  const loaded = loadFortemiCoreExport(cwd, options.graph ?? "framework");
  if (!loaded.exported) {
    return {
      results: [],
      reason: loaded.reason ?? "Fortemi Core static index is unavailable.",
    };
  }

  const typeSet = options.types && options.types.length > 0
    ? new Set(options.types)
    : null;
  const dedicatedRecordTypes = new Set([
    "skill", "agent", "command", "rule", "behavior", "flow", "workflow",
  ]);
  const fortemiTypes = options.types
    ? [...new Set(options.types.map((type) =>
        dedicatedRecordTypes.has(type) ? `aiwg.${type === "workflow" ? "flow" : type}` : "aiwg.artifact",
      ))]
    : undefined;
  const requestedLimit = options.limit ?? 10;
  const includesGenericRecordType = fortemiTypes?.includes("aiwg.artifact") ?? false;
  const { queryAiwgFortemiIndex } = await import("@fortemi/core/aiwg-index");
  const queried = queryAiwgFortemiIndex(loaded.exported as any, options.text, {
    // `template`, `runbook`, and `hook` are intentionally represented by the
    // server-owned generic aiwg.artifact record type. Overfetch before the
    // exact artifact-type post-filter so unrelated generic artifacts cannot
    // crowd the requested operational type out of the candidate window.
    limit: includesGenericRecordType ? loaded.exported.items.length : requestedLimit,
    rank: true,
    includeMatches: false,
    searchProfile: "aiwg-discovery",
    ...(fortemiTypes && fortemiTypes.length > 0 ? { types: fortemiTypes as any } : {}),
  });
  const rankedItems =
    queried.rankedItems ??
    queried.items.map((item, index) => ({
      item,
      rank: queried.items.length - index,
    }));

  const maxRank = Math.max(
    1,
    ...rankedItems.map((result) =>
      typeof result.rank === "number" ? result.rank : 0,
    ),
  );
  const results = rankedItems
    .map((result, index) => {
      const entry = entryFromRecord(result.item as AiwgFortemiRecord);
      return {
        entry,
        score: typeof result.rank === "number"
          ? result.rank / maxRank
          : (rankedItems.length - index) / rankedItems.length,
      };
    })
    .filter((result) => !typeSet || typeSet.has(result.entry.type))
    .slice(0, requestedLimit);

  return { results };
}

export function buildFortemiCoreArtifactIndex(
  cwd: string,
  graph: GraphType = "project",
): ArtifactIndex | null {
  const loaded = loadFortemiCoreExport(cwd, graph);
  if (!loaded.exported) return null;
  const entries = loaded.exported.items.map(entryFromRecord);
  return {
    version: "fortemi-core-v2",
    builtAt: new Date(0).toISOString(),
    buildTimeMs: 0,
    entries: Object.fromEntries(
      entries.map((entry) => [entry.path, entry]),
    ),
  };
}

export function buildFortemiCoreDependencyGraph(
  cwd: string,
  graph: GraphType = "project",
): FortemiCoreDependencyGraphLoadResult {
  const loaded = loadFortemiCoreExport(cwd, graph);
  if (!loaded.exported) return { reason: loaded.reason };

  const dependencyGraph: DependencyGraph = {};
  for (const record of loaded.exported.items) {
    const sourcePath = record.source.path;
    dependencyGraph[sourcePath] ??= { upstream: [], downstream: [] };

    for (const relationship of record.relationships) {
      const targetPath =
        relationship.target_path ??
        relationship.source_path ??
        relationship.target_id;
      if (!targetPath || relationship.direction === "related") continue;
      const direction = relationship.direction ?? "upstream";
      dependencyGraph[sourcePath][direction].push({
        path: targetPath,
        type: relationship.type,
      });
    }
  }

  return { graph: dependencyGraph };
}

export function queryFortemiCoreStaticSemanticIndex(
  cwd: string,
  options: FortemiCoreStaticSearchOptions,
):
  | { results: FortemiCoreStaticSearchResult[]; reason?: undefined }
  | { results: []; reason: string } {
  const loaded = loadFortemiCoreExport(cwd, options.graph ?? "project");
  if (!loaded.exported)
    return {
      results: [],
      reason: loaded.reason ?? "Fortemi Core static index is unavailable.",
    };

  const terms = tokenize(options.text);
  if (terms.length === 0) return { results: [] };

  const results = loaded.exported.items
    .map((record) => {
      const scored = scoreStaticRecord(record, terms);
      return { record, ...scored };
    })
    .filter((result) => result.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.record.source.path.localeCompare(b.record.source.path),
    )
    .slice(0, options.limit ?? 10)
    .map((result) =>
      recordToStaticResult(result.record, result.score, result.matched),
    );

  return { results };
}

export function queryFortemiCoreStaticFulltextIndex(
  cwd: string,
  options: FortemiCoreStaticHybridSearchOptions,
):
  | { results: FortemiCoreStaticFulltextResult[]; reason?: undefined }
  | { results: []; reason: string } {
  const loaded = loadFortemiCoreExport(cwd, options.graph ?? "project");
  if (!loaded.exported)
    return {
      results: [],
      reason: loaded.reason ?? "Fortemi Core static index is unavailable.",
    };

  const recordsByPath = new Map<string, AiwgFortemiRecord>();
  const docs: FullTextDoc[] = [];
  const tags = new Set((options.tags ?? []).map((tag) => tag.toLowerCase()));
  for (const record of loaded.exported.items) {
    if (options.path && !matchesPath(record.source.path, options.path))
      continue;
    if (options.type && artifactTypeFromRecord(record) !== options.type)
      continue;
    if (options.phase && record.search?.phase !== options.phase) continue;
    if (tags.size > 0) {
      const recordTags = new Set(record.tags.map((tag) => tag.toLowerCase()));
      let hasAllTags = true;
      for (const tag of tags) {
        if (!recordTags.has(tag)) {
          hasAllTags = false;
          break;
        }
      }
      if (!hasAllTags) continue;
    }
    const body = recordBody(record);
    if (!body.trim()) continue;
    recordsByPath.set(record.source.path, record);
    docs.push({ id: record.source.path, text: body });
  }

  const hits = bm25Rank(docs, options.text);
  return {
    results: hits.slice(0, options.limit ?? 20).map((hit) => {
      const record = recordsByPath.get(hit.id)!;
      return {
        path: record.source.path,
        type: artifactTypeFromRecord(record),
        phase: record.search?.phase ?? record.facets.phase?.[0] ?? "",
        tags: record.tags,
        title: record.title,
        summary: record.summary ?? record.search?.summary ?? record.text,
        score: Math.round(hit.score * 1000) / 1000,
        matched: hit.matchedTerms,
      };
    }),
  };
}

export function queryFortemiCoreStaticHybridIndex(
  cwd: string,
  options: FortemiCoreStaticHybridSearchOptions,
):
  | { results: FortemiCoreStaticSearchResult[]; reason?: undefined }
  | { results: []; reason: string } {
  const loaded = loadFortemiCoreExport(cwd, options.graph ?? "project");
  if (!loaded.exported)
    return {
      results: [],
      reason: loaded.reason ?? "Fortemi Core static index is unavailable.",
    };

  const terms = tokenize(options.text);
  const tags = new Set((options.tags ?? []).map((tag) => tag.toLowerCase()));

  const results = loaded.exported.items
    .filter((record) => {
      if (options.path && !matchesPath(record.source.path, options.path))
        return false;
      if (options.type && artifactTypeFromRecord(record) !== options.type)
        return false;
      if (options.phase && record.search?.phase !== options.phase) return false;
      if (tags.size > 0) {
        const recordTags = new Set(record.tags.map((tag) => tag.toLowerCase()));
        for (const tag of tags) {
          if (!recordTags.has(tag)) return false;
        }
      }
      return true;
    })
    .map((record) => {
      const scored = scoreStaticRecord(record, terms);
      let score = scored.score;
      const matched = [...scored.matched];
      if (options.path) {
        score += 1;
        matched.push("path");
      }
      if (options.type) {
        score += 0.5;
        matched.push("type");
      }
      if (options.phase) {
        score += 0.5;
        matched.push("phase");
      }
      if (tags.size > 0) {
        score += tags.size * 0.5;
        matched.push("tags");
      }
      return { record, score, matched };
    })
    .filter((result) => result.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.record.source.path.localeCompare(b.record.source.path),
    )
    .slice(0, options.limit ?? 10)
    .map((result) =>
      recordToStaticResult(result.record, result.score, result.matched),
    );

  return { results };
}
