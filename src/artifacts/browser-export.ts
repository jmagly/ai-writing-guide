import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import type {
  ArtifactIndex,
  DependencyGraph,
  GraphType,
  MetadataEntry,
  TypedEdge,
} from "./types.js";
import { loadGraphIndexFile } from "./index-reader.js";

export type AiwgFortemiRecordType =
  | "crm.contact"
  | "crm.organization"
  | "crm.event"
  | "crm.interaction"
  | "aiwg.artifact"
  | "aiwg.skill"
  | "aiwg.agent"
  | "aiwg.command"
  | "aiwg.rule"
  | "aiwg.behavior"
  | "aiwg.flow"
  | "aiwg.provider"
  | "aiwg.bundle"
  | "aiwg.research.ref"
  | "aiwg.research.profile"
  | "aiwg.research.view"
  | "aiwg.research.synthesis"
  | "aiwg.kb.page"
  | "aiwg.memory.entry"
  | "aiwg.issue"
  | `aiwg.project.${string}`;

export type AiwgFortemiExportSchemaVersion = "v1" | "v2";
export type AiwgFortemiRecordSchemaVersion =
  | "aiwg.fortemi.index.record.v1"
  | "aiwg.fortemi.index.record.v2";

export type AiwgPrivacyClassification = "private" | "sanitized" | "public";
export type AiwgProvenanceConfidence =
  | "source"
  | "candidate"
  | "reviewed"
  | "rejected";

export interface AiwgFortemiRecordSource {
  path: string;
  repo_relative_path: string;
  locator: string;
  origin?: string;
  generated?: boolean;
  checksum?: string;
  updated_at?: string;
}

export interface AiwgFortemiRelationship {
  type: string;
  target_id: string;
  source_path?: string;
  target_path?: string;
  direction?: "upstream" | "downstream" | "related";
}

export interface AiwgFortemiProvenance {
  field: string;
  source: string;
  path: string;
  confidence: AiwgProvenanceConfidence;
  privacy: AiwgPrivacyClassification;
}

export interface AiwgFortemiRecord {
  schema_version: AiwgFortemiRecordSchemaVersion;
  id: string;
  type: AiwgFortemiRecordType;
  source: AiwgFortemiRecordSource;
  title: string;
  name?: string;
  summary?: string;
  text: string;
  search?: {
    title: string;
    name?: string;
    summary?: string;
    body: string;
    triggers: string[];
    aliases: string[];
    capability?: string;
    tags: string[];
    phase?: string;
    type?: string;
    frontmatter: Record<string, unknown>;
  };
  facets: Record<string, string[]>;
  tags: string[];
  concepts: string[];
  relationships: AiwgFortemiRelationship[];
  provenance: AiwgFortemiProvenance[];
  privacy: {
    classification: AiwgPrivacyClassification;
    pii: boolean;
    locality?: "project" | "framework" | "external";
  };
  chunks?: Array<{
    id: string;
    text: string;
    checksum: string;
  }>;
  embeddings?: Array<{
    model: string;
    chunk_id?: string;
    vector_ref?: string;
    input_hash: string;
  }>;
  updated_at: string;
}

export interface AiwgFortemiIndexExport {
  schema_version:
    | "aiwg.fortemi.index.export.v1"
    | "aiwg.fortemi.index.export.v2";
  generated_at: string;
  source: {
    repo: string;
    privacy: AiwgPrivacyClassification;
    graph?: string;
  };
  compatibility?: {
    previous_schema_version: "aiwg.fortemi.index.export.v1";
    strategy: "supported";
  };
  items: AiwgFortemiRecord[];
}

export interface BrowserIndexExportOptions {
  graph?: GraphType;
  repo?: string;
  privacy?: AiwgPrivacyClassification;
  generatedAt?: string;
  schemaVersion?: AiwgFortemiExportSchemaVersion;
}

function stableArtifactId(artifactPath: string): string {
  return (
    "aiwg:artifact:" +
    createHash("sha256").update(artifactPath).digest("hex").slice(0, 16)
  );
}

function stableRecordId(
  recordType: AiwgFortemiRecordType,
  artifactPath: string,
): string {
  if (recordType === "aiwg.artifact") return stableArtifactId(artifactPath);
  return (
    recordType.replaceAll(".", ":") +
    ":" +
    createHash("sha256").update(artifactPath).digest("hex").slice(0, 16)
  );
}

function uniqueSorted(values: Array<string | undefined>): string[] {
  return [
    ...new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      ),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function textForEntry(entry: MetadataEntry): string {
  return uniqueSorted([
    entry.title,
    entry.summary,
    entry.capability,
    entry.name,
    entry.path,
    ...entry.tags,
    ...(entry.triggers ?? []),
  ]).join("\n");
}

function stripFrontmatter(text: string): string {
  if (!text.startsWith("---")) return text;
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? text.slice(match[0].length) : text;
}

function sourceBodyForEntry(cwd: string, entry: MetadataEntry): string {
  const sourcePath = path.isAbsolute(entry.path)
    ? entry.path
    : path.join(cwd, entry.path);
  try {
    return stripFrontmatter(fs.readFileSync(sourcePath, "utf-8")).trim();
  } catch {
    return "";
  }
}

function textForRecord(
  entry: MetadataEntry,
  schemaVersion: AiwgFortemiExportSchemaVersion,
  sourceBody: string,
): string {
  const metadataText = textForEntry(entry);
  if (schemaVersion !== "v2" || !sourceBody) return metadataText;
  return [metadataText, sourceBody].join("\n\n");
}

function relationshipsForEntry(
  entry: MetadataEntry,
  graph: DependencyGraph | null,
  recordTypesByPath: Map<string, AiwgFortemiRecordType>,
): AiwgFortemiRelationship[] {
  const edges = graph?.[entry.path];
  if (!edges) return [];

  const relationships: AiwgFortemiRelationship[] = [];
  const append = (prefix: "upstream" | "downstream", edge: TypedEdge) => {
    const targetRecordType =
      recordTypesByPath.get(edge.path) ?? "aiwg.artifact";
    relationships.push({
      type: edge.type,
      target_id: stableRecordId(targetRecordType, edge.path),
      source_path: edge.path,
      target_path: edge.path,
      direction: prefix,
    });
  };

  for (const edge of edges.upstream) append("upstream", edge);
  for (const edge of edges.downstream) append("downstream", edge);
  return relationships.sort((left, right) => {
    const typeCmp = left.type.localeCompare(right.type);
    if (typeCmp !== 0) return typeCmp;
    return left.target_id.localeCompare(right.target_id);
  });
}

function recordTypeForEntry(
  entry: MetadataEntry,
  schemaVersion: AiwgFortemiExportSchemaVersion,
): AiwgFortemiRecordType {
  if (schemaVersion === "v1") return "aiwg.artifact";

  const normalized = entry.type.toLowerCase().replace(/_/g, "-");
  const pathText = entry.path.toLowerCase();
  switch (normalized) {
    case "skill":
      return "aiwg.skill";
    case "agent":
      return "aiwg.agent";
    case "command":
      return "aiwg.command";
    case "rule":
      return "aiwg.rule";
    case "behavior":
      return "aiwg.behavior";
    case "flow":
    case "workflow":
      return "aiwg.flow";
    case "provider":
      return "aiwg.provider";
    case "bundle":
    case "extension":
    case "addon":
    case "framework":
    case "plugin":
      return "aiwg.bundle";
    case "research-ref":
    case "ref":
      return "aiwg.research.ref";
    case "research-profile":
    case "profile":
      return "aiwg.research.profile";
    case "research-view":
    case "corpus-view":
      return "aiwg.research.view";
    case "research-synthesis":
    case "synthesis":
      return "aiwg.research.synthesis";
    case "kb-page":
    case "kb":
      return "aiwg.kb.page";
    case "memory-entry":
    case "memory":
      return "aiwg.memory.entry";
    case "issue":
      return "aiwg.issue";
    default:
      if (
        pathText.includes("/research/references/") ||
        /^ref[-_]/i.test(entry.name ?? entry.title)
      )
        return "aiwg.research.ref";
      if (
        pathText.includes("/research/profiles/") ||
        /^prof[-_]/i.test(entry.name ?? entry.title)
      )
        return "aiwg.research.profile";
      if (pathText.includes("/research/synthesis/"))
        return "aiwg.research.synthesis";
      if (pathText.includes("/kb/")) return "aiwg.kb.page";
      if (pathText.includes("/memory/")) return "aiwg.memory.entry";
      if (pathText.includes("/issues/")) return "aiwg.issue";
      return "aiwg.artifact";
  }
}

function generatedForPath(artifactPath: string): boolean {
  return (
    artifactPath.includes("/generated/") ||
    artifactPath.includes("/views/") ||
    artifactPath.endsWith(".generated.md")
  );
}

function localityForPath(
  artifactPath: string,
): "project" | "framework" | "external" {
  if (artifactPath.startsWith("/")) return "external";
  if (
    artifactPath.startsWith("agentic/") ||
    artifactPath.includes("/.agents/") ||
    artifactPath.includes("/.opencode/")
  )
    return "framework";
  return "project";
}

function recordForEntry(
  entry: MetadataEntry,
  graphName: string,
  dependencyGraph: DependencyGraph | null,
  privacy: AiwgPrivacyClassification,
  schemaVersion: AiwgFortemiExportSchemaVersion,
  recordTypesByPath: Map<string, AiwgFortemiRecordType>,
  sourceBody: string,
): AiwgFortemiRecord {
  const recordType = recordTypeForEntry(entry, schemaVersion);
  const text = textForRecord(entry, schemaVersion, sourceBody);
  const recordSchemaVersion: AiwgFortemiRecordSchemaVersion =
    schemaVersion === "v2"
      ? "aiwg.fortemi.index.record.v2"
      : "aiwg.fortemi.index.record.v1";
  return {
    schema_version: recordSchemaVersion,
    id: stableRecordId(recordType, entry.path),
    type: recordType,
    source: {
      path: entry.path,
      repo_relative_path: entry.path,
      locator: entry.name ?? entry.title ?? entry.path,
      ...(schemaVersion === "v2"
        ? {
            origin: graphName,
            generated: generatedForPath(entry.path),
            checksum: entry.checksum,
            updated_at: entry.updated,
          }
        : {}),
    },
    title: entry.title || entry.path,
    ...(schemaVersion === "v2"
      ? {
          name: entry.name,
          summary: entry.summary,
          search: {
            title: entry.title || entry.path,
            name: entry.name,
            summary: entry.summary,
            body: text,
            triggers: uniqueSorted(entry.triggers ?? []),
            aliases: uniqueSorted([entry.name, entry.title]),
            capability: entry.capability,
            tags: uniqueSorted(entry.tags),
            phase: entry.phase,
            type: entry.type,
            frontmatter: {},
          },
        }
      : {}),
    text,
    facets: {
      artifact_type: uniqueSorted([entry.type]),
      record_type: uniqueSorted([recordType]),
      phase: uniqueSorted([entry.phase]),
      graph: uniqueSorted([graphName]),
      privacy: uniqueSorted([privacy]),
    },
    tags: uniqueSorted(entry.tags),
    concepts: uniqueSorted([
      entry.type,
      entry.phase,
      entry.name,
      ...(entry.triggers ?? []),
    ]),
    relationships: relationshipsForEntry(
      entry,
      dependencyGraph,
      recordTypesByPath,
    ),
    provenance: [
      {
        field: "record",
        source: "aiwg-index",
        path: entry.path,
        confidence: "source",
        privacy,
      },
    ],
    privacy: {
      classification: privacy,
      pii: privacy === "private",
      ...(schemaVersion === "v2"
        ? { locality: localityForPath(entry.path) }
        : {}),
    },
    ...(schemaVersion === "v2"
      ? {
          chunks: [
            {
              id: stableRecordId(recordType, entry.path) + ":chunk:body",
              text,
              checksum: createHash("sha256").update(text).digest("hex"),
            },
          ],
          embeddings: [] as Array<{
            model: string;
            chunk_id?: string;
            vector_ref?: string;
            input_hash: string;
          }>,
        }
      : {}),
    updated_at: entry.updated,
  };
}

export function buildAiwgFortemiIndexExport(
  cwd: string,
  options: BrowserIndexExportOptions = {},
): AiwgFortemiIndexExport {
  const graphName = options.graph ?? "project";
  const schemaVersion = options.schemaVersion ?? "v1";
  const index = loadGraphIndexFile<ArtifactIndex>(
    cwd,
    "metadata.json",
    options.graph,
  );
  if (!index) {
    const graphFlag = options.graph ? " --graph " + options.graph : "";
    throw new Error(
      "No metadata index found for graph '" +
        graphName +
        "'. Run 'aiwg index build" +
        graphFlag +
        "' first.",
    );
  }

  const dependencyGraph = loadGraphIndexFile<DependencyGraph>(
    cwd,
    "dependencies.json",
    options.graph,
  );
  const privacy = options.privacy ?? "private";
  const repo = options.repo ?? path.basename(cwd);
  const entries = Object.values(index.entries);
  const recordTypesByPath = new Map(
    entries.map((entry) => [
      entry.path,
      recordTypeForEntry(entry, schemaVersion),
    ]),
  );
  const items = entries
    .map((entry) =>
      recordForEntry(
        entry,
        graphName,
        dependencyGraph,
        privacy,
        schemaVersion,
        recordTypesByPath,
        sourceBodyForEntry(cwd, entry),
      ),
    )
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    schema_version:
      schemaVersion === "v2"
        ? "aiwg.fortemi.index.export.v2"
        : "aiwg.fortemi.index.export.v1",
    generated_at: options.generatedAt ?? new Date().toISOString(),
    source:
      schemaVersion === "v2"
        ? { repo, privacy, graph: graphName }
        : { repo, privacy },
    ...(schemaVersion === "v2"
      ? {
          compatibility: {
            previous_schema_version: "aiwg.fortemi.index.export.v1",
            strategy: "supported",
          } as const,
        }
      : {}),
    items,
  };
}

function v1CompatibleText(record: AiwgFortemiRecord): string {
  return record.search?.body ?? record.text;
}

function v1CompatibleRelationships(
  record: AiwgFortemiRecord,
): AiwgFortemiRelationship[] {
  return record.relationships
    .filter((relationship) => relationship.direction !== "downstream")
    .map((relationship) => ({
      type: relationship.type,
      target_id: relationship.target_id,
      source_path: relationship.target_path ?? relationship.source_path,
    }))
    .sort((left, right) => {
      const typeCmp = left.type.localeCompare(right.type);
      if (typeCmp !== 0) return typeCmp;
      return left.target_id.localeCompare(right.target_id);
    });
}

export function buildAiwgFortemiV1CompatibilityExport(
  exportData: AiwgFortemiIndexExport,
): AiwgFortemiIndexExport {
  return {
    schema_version: "aiwg.fortemi.index.export.v1",
    generated_at: exportData.generated_at,
    source: {
      repo: exportData.source.repo,
      privacy: exportData.source.privacy,
    },
    items: exportData.items
      .map((record) => ({
        schema_version: "aiwg.fortemi.index.record.v1" as const,
        id: record.id,
        type: record.type,
        source: {
          path: record.source.path,
          repo_relative_path: record.source.repo_relative_path,
          locator: record.source.locator,
        },
        title: record.title,
        text: v1CompatibleText(record),
        facets: record.facets,
        tags: record.tags,
        concepts: record.concepts,
        relationships: v1CompatibleRelationships(record),
        provenance: record.provenance,
        privacy: {
          classification: record.privacy.classification,
          pii: record.privacy.pii,
        },
        updated_at: record.updated_at,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function writeAiwgFortemiIndexExport(
  exportData: AiwgFortemiIndexExport,
  outPath?: string,
): void {
  const json = JSON.stringify(exportData, null, 2) + "\n";
  if (!outPath || outPath === "-") {
    process.stdout.write(json);
    return;
  }
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(outPath, json, "utf-8");
}
