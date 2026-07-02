import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../artifacts/index-builder.js";
import { loadGraphIndexFile } from "../artifacts/index-reader.js";
import type {
  ArtifactIndex,
  GraphType,
  MetadataEntry,
} from "../artifacts/types.js";

type ResearchQueryBackend = "local" | "fortemi-core";
type ResearchQueryDepth = "quick" | "thorough";
type EvidenceGrade = "HIGH" | "MODERATE" | "LOW" | "VERY LOW" | "UNKNOWN";

export interface ResearchQueryOptions {
  question: string;
  backend?: ResearchQueryBackend;
  graph?: GraphType;
  depth?: ResearchQueryDepth;
  maxSources?: number;
  sourcesOnly?: boolean;
  json?: boolean;
  save?: boolean;
  generatedAt?: string;
}

export interface ResearchQuerySource {
  id: string;
  path: string;
  title: string;
  type: string;
  grade: EvidenceGrade;
  relevance: "direct" | "supporting" | "tangential";
  score: number;
  summary: string;
  tags: string[];
}

export interface ResearchQueryResult {
  query: {
    question: string;
    backend: ResearchQueryBackend;
    graph: GraphType;
    depth: ResearchQueryDepth;
  };
  sources: ResearchQuerySource[];
  total: number;
  savedPath?: string;
  hint?: string;
}

const RESEARCH_TYPES = new Set([
  "research-ref",
  "research-profile",
  "research-view",
  "research-synthesis",
  "aiwg.research.ref",
  "aiwg.research.profile",
  "aiwg.research.view",
  "aiwg.research.synthesis",
  "kb-page",
  "aiwg.kb.page",
]);

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "on",
  "with",
  "what",
  "does",
  "do",
  "is",
  "are",
  "about",
  "research",
  "say",
  "evidence",
]);

function usage(): string {
  return [
    "Usage: aiwg research-query <question> [--backend local|fortemi-core] [--graph <name>]",
    "                           [--depth quick|thorough] [--sources-only] [--max-sources N]",
    "                           [--json] [--save]",
  ].join("\n");
}

function flagValue(args: string[], flag: string, errorMessage: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(errorMessage);
  }
  return value;
}

function positiveIntegerFlag(
  args: string[],
  flag: string,
  defaultValue: number,
  errorMessage: string,
): number {
  const value = flagValue(args, flag, errorMessage);
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || String(parsed) !== value) {
    throw new Error(errorMessage);
  }
  return parsed;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function stripFlags(args: string[]): string[] {
  const valueFlags = new Set([
    "--backend",
    "--graph",
    "--depth",
    "--max-sources",
  ]);
  const bareFlags = new Set(["--sources-only", "--json", "--save"]);
  const question: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (valueFlags.has(arg)) {
      index++;
      continue;
    }
    if (bareFlags.has(arg)) continue;
    question.push(arg);
  }
  return question;
}

function parseArgs(args: string[]): ResearchQueryOptions {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    console.log(usage());
    process.exit(0);
  }

  const backend = flagValue(
    args,
    "--backend",
    "--backend must be local or fortemi-core",
  ) as
    | ResearchQueryBackend
    | undefined;
  if (backend && backend !== "local" && backend !== "fortemi-core") {
    throw new Error("--backend must be local or fortemi-core");
  }

  const depth = (flagValue(
    args,
    "--depth",
    "--depth must be quick or thorough",
  ) ??
    "thorough") as ResearchQueryDepth;
  if (depth !== "quick" && depth !== "thorough") {
    throw new Error("--depth must be quick or thorough");
  }

  const maxSources = positiveIntegerFlag(
    args,
    "--max-sources",
    10,
    "--max-sources must be a positive integer",
  );

  const question = stripFlags(args).join(" ").trim();
  if (!question) throw new Error("question is required");

  return {
    question,
    backend: backend ?? "local",
    graph: (flagValue(args, "--graph", "--graph requires a graph name") ??
      "project") as GraphType,
    depth,
    maxSources,
    sourcesOnly: hasFlag(args, "--sources-only"),
    json: hasFlag(args, "--json"),
    save: hasFlag(args, "--save"),
  };
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function readEntryBody(cwd: string, entryPath: string): string {
  const resolved = path.isAbsolute(entryPath)
    ? entryPath
    : path.resolve(cwd, entryPath);
  try {
    return parseFrontmatter(fs.readFileSync(resolved, "utf-8")).body;
  } catch {
    return "";
  }
}

function entryId(entry: MetadataEntry): string {
  const text = [entry.name, entry.title, entry.path].filter(Boolean).join(" ");
  return (
    text.match(/\bREF-\d+\b/i)?.[0]?.toUpperCase() ??
    text.match(/\bPROF-[A-Z0-9-]+/i)?.[0]?.toUpperCase() ??
    path.basename(entry.path).replace(/\.[^.]+$/, "")
  );
}

function gradeFromText(text: string): EvidenceGrade {
  const normalized = text.toUpperCase();
  if (/\bVERY\s+LOW\b/.test(normalized)) return "VERY LOW";
  if (/\bHIGH\b/.test(normalized)) return "HIGH";
  if (/\bMODERATE\b/.test(normalized)) return "MODERATE";
  if (/\bLOW\b/.test(normalized)) return "LOW";
  return "UNKNOWN";
}

function relevance(score: number): ResearchQuerySource["relevance"] {
  if (score >= 0.55) return "direct";
  if (score >= 0.25) return "supporting";
  return "tangential";
}

function scoreEntry(
  entry: MetadataEntry,
  question: string,
  body: string,
  depth: ResearchQueryDepth,
): number {
  const queryTokens = tokens(question);
  if (queryTokens.length === 0) return 0;
  const fields = [
    { text: entry.title, weight: 3 },
    { text: entry.name ?? "", weight: 3 },
    { text: entry.tags.join(" "), weight: 2 },
    { text: entry.summary, weight: 2 },
    { text: entry.path, weight: 0.75 },
    ...(depth === "thorough" ? [{ text: body, weight: 1.5 }] : []),
  ];
  let weightedHits = 0;
  let maxWeight = 0;
  for (const token of queryTokens) {
    const best = fields.reduce((score, field) => {
      if (!field.text.toLowerCase().includes(token)) return score;
      return Math.max(score, field.weight);
    }, 0);
    weightedHits += best;
    maxWeight += 3;
  }
  return Math.min(weightedHits / Math.max(maxWeight, 1), 1);
}

function isResearchEntry(entry: MetadataEntry): boolean {
  const type = entry.type.toLowerCase();
  const entryPath = entry.path.toLowerCase();
  return (
    RESEARCH_TYPES.has(type) ||
    entryPath.includes("/research/") ||
    entryPath.includes("/kb/")
  );
}

function localEntries(cwd: string, graph: GraphType): MetadataEntry[] {
  const index = loadGraphIndexFile<ArtifactIndex>(cwd, "metadata.json", graph);
  return index ? Object.values(index.entries) : [];
}

async function backendEntries(
  cwd: string,
  graph: GraphType,
  backend: ResearchQueryBackend,
): Promise<{ entries: MetadataEntry[]; hint?: string }> {
  if (backend === "fortemi-core") {
    const { loadFortemiCoreMetadataEntries } =
      await import("../artifacts/fortemi-core-query-adapter.js");
    const loaded = loadFortemiCoreMetadataEntries(cwd, graph);
    return { entries: loaded.entries, hint: loaded.reason };
  }
  return { entries: localEntries(cwd, graph) };
}

function sourceForEntry(
  cwd: string,
  entry: MetadataEntry,
  question: string,
  depth: ResearchQueryDepth,
): ResearchQuerySource | null {
  const body = depth === "thorough" ? readEntryBody(cwd, entry.path) : "";
  const sourceText = [
    entry.title,
    entry.summary,
    entry.tags.join(" "),
    body,
  ].join("\n");
  const score = scoreEntry(entry, question, body, depth);
  if (score <= 0) return null;
  return {
    id: entryId(entry),
    path: entry.path,
    title: entry.title,
    type: entry.type,
    grade: gradeFromText(sourceText),
    relevance: relevance(score),
    score: Math.round(score * 1000) / 1000,
    summary: entry.summary,
    tags: entry.tags,
  };
}

export async function runResearchQuery(
  cwd: string,
  options: ResearchQueryOptions,
): Promise<ResearchQueryResult> {
  const graph = options.graph ?? "project";
  const backend = options.backend ?? "local";
  const depth = options.depth ?? "thorough";
  const maxSources = options.maxSources ?? 10;
  const loaded = await backendEntries(cwd, graph, backend);
  if (backend === "fortemi-core" && loaded.hint) {
    throw new Error(loaded.hint);
  }
  const sources = loaded.entries
    .filter(isResearchEntry)
    .map((entry) => sourceForEntry(cwd, entry, options.question, depth))
    .filter((source): source is ResearchQuerySource => source !== null)
    .sort((left, right) => {
      const scoreCmp = right.score - left.score;
      if (scoreCmp !== 0) return scoreCmp;
      return left.path.localeCompare(right.path);
    })
    .slice(0, maxSources);

  const result: ResearchQueryResult = {
    query: {
      question: options.question,
      backend,
      graph,
      depth,
    },
    sources,
    total: sources.length,
    hint: loaded.hint,
  };

  if (options.save) {
    result.savedPath = saveSourceSelection(cwd, result, options.generatedAt);
  }

  return result;
}

function saveSourceSelection(
  cwd: string,
  result: ResearchQueryResult,
  generatedAt = new Date().toISOString(),
): string {
  const date = generatedAt.slice(0, 10);
  const slug =
    result.query.question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "query";
  const relativePath = path.join(
    ".aiwg",
    "research",
    "synthesis",
    `query-${slug}-${date}.md`,
  );
  const outPath = path.resolve(cwd, relativePath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, renderMarkdown(result, true), "utf-8");
  return relativePath;
}

function renderSourcesTable(sources: ResearchQuerySource[]): string {
  const rows = [
    "| REF | Title | GRADE | Relevance | Score | Path |",
    "|-----|-------|-------|-----------|-------|------|",
    ...sources.map(
      (source) =>
        `| ${source.id} | ${source.title} | ${source.grade} | ${source.relevance} | ${source.score.toFixed(3)} | ${source.path} |`,
    ),
  ];
  return rows.join("\n");
}

function renderMarkdown(result: ResearchQueryResult, saved = false): string {
  const frontmatter = saved
    ? [
        "---",
        "type: query-source-selection",
        `question: ${JSON.stringify(result.query.question)}`,
        `backend: ${result.query.backend}`,
        `graph: ${result.query.graph}`,
        `depth: ${result.query.depth}`,
        `sources: [${result.sources.map((source) => source.id).join(", ")}]`,
        "---",
        "",
      ].join("\n")
    : "";
  const sections = [
    `${frontmatter}## Research Sources`,
    "",
    `Question: ${result.query.question}`,
    `Backend: ${result.query.backend}`,
    "",
    result.sources.length > 0
      ? renderSourcesTable(result.sources)
      : "No matching research sources found.",
  ];
  if (!result.query.backend || result.query.backend === "local") {
    sections.push(
      "",
      "Use the research-query skill to synthesize an answer from these sources with GRADE-aware hedging and inline REF citations.",
    );
  }
  if (result.hint) sections.push("", `Hint: ${result.hint}`);
  return sections.join("\n") + "\n";
}

export async function main(args: string[], cwd = process.cwd()): Promise<void> {
  try {
    const options = parseArgs(args);
    const result = await runResearchQuery(cwd, options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(renderMarkdown(result));
    if (result.savedPath) {
      console.log(`Saved source selection: ${result.savedPath}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(usage());
    process.exit(1);
  }
}
