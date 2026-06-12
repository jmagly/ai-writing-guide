import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type { ArtifactIndex, DependencyGraph, GraphType, MetadataEntry, TypedEdge } from './types.js';
import { loadGraphIndexFile } from './index-reader.js';

export type AiwgFortemiRecordType =
  | 'crm.contact'
  | 'crm.organization'
  | 'crm.event'
  | 'crm.interaction'
  | 'aiwg.artifact';

export type AiwgPrivacyClassification = 'private' | 'sanitized' | 'public';
export type AiwgProvenanceConfidence = 'source' | 'candidate' | 'reviewed' | 'rejected';

export interface AiwgFortemiRecordSource {
  path: string;
  repo_relative_path: string;
  locator: string;
}

export interface AiwgFortemiRelationship {
  type: string;
  target_id: string;
  source_path?: string;
}

export interface AiwgFortemiProvenance {
  field: string;
  source: string;
  path: string;
  confidence: AiwgProvenanceConfidence;
  privacy: AiwgPrivacyClassification;
}

export interface AiwgFortemiRecord {
  schema_version: 'aiwg.fortemi.index.record.v1';
  id: string;
  type: AiwgFortemiRecordType;
  source: AiwgFortemiRecordSource;
  title: string;
  text: string;
  facets: Record<string, string[]>;
  tags: string[];
  concepts: string[];
  relationships: AiwgFortemiRelationship[];
  provenance: AiwgFortemiProvenance[];
  privacy: {
    classification: AiwgPrivacyClassification;
    pii: boolean;
  };
  updated_at: string;
}

export interface AiwgFortemiIndexExport {
  schema_version: 'aiwg.fortemi.index.export.v1';
  generated_at: string;
  source: {
    repo: string;
    privacy: AiwgPrivacyClassification;
  };
  items: AiwgFortemiRecord[];
}

export interface BrowserIndexExportOptions {
  graph?: GraphType;
  repo?: string;
  privacy?: AiwgPrivacyClassification;
  generatedAt?: string;
}

function stableArtifactId(artifactPath: string): string {
  return 'aiwg:artifact:' + createHash('sha256').update(artifactPath).digest('hex').slice(0, 16);
}

function uniqueSorted(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))].sort((a, b) => a.localeCompare(b));
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
  ]).join('\n');
}

function relationshipsForEntry(entry: MetadataEntry, graph: DependencyGraph | null): AiwgFortemiRelationship[] {
  const edges = graph?.[entry.path];
  if (!edges) return [];

  const relationships: AiwgFortemiRelationship[] = [];
  const append = (prefix: 'upstream' | 'downstream', edge: TypedEdge) => {
    relationships.push({
      type: prefix === 'upstream' ? edge.type : 'depended-on-by',
      target_id: stableArtifactId(edge.path),
      source_path: edge.path,
    });
  };

  for (const edge of edges.upstream) append('upstream', edge);
  for (const edge of edges.downstream) append('downstream', edge);
  return relationships.sort((left, right) => {
    const typeCmp = left.type.localeCompare(right.type);
    if (typeCmp !== 0) return typeCmp;
    return left.target_id.localeCompare(right.target_id);
  });
}

function recordForEntry(
  entry: MetadataEntry,
  graphName: string,
  dependencyGraph: DependencyGraph | null,
  privacy: AiwgPrivacyClassification,
): AiwgFortemiRecord {
  return {
    schema_version: 'aiwg.fortemi.index.record.v1',
    id: stableArtifactId(entry.path),
    type: 'aiwg.artifact',
    source: {
      path: entry.path,
      repo_relative_path: entry.path,
      locator: entry.name ?? entry.title ?? entry.path,
    },
    title: entry.title || entry.path,
    text: textForEntry(entry),
    facets: {
      artifact_type: uniqueSorted([entry.type]),
      phase: uniqueSorted([entry.phase]),
      graph: uniqueSorted([graphName]),
      privacy: uniqueSorted([privacy]),
    },
    tags: uniqueSorted(entry.tags),
    concepts: uniqueSorted([entry.type, entry.phase, entry.name, ...(entry.triggers ?? [])]),
    relationships: relationshipsForEntry(entry, dependencyGraph),
    provenance: [
      {
        field: 'record',
        source: 'aiwg-index',
        path: entry.path,
        confidence: 'source',
        privacy,
      },
    ],
    privacy: {
      classification: privacy,
      pii: privacy === 'private',
    },
    updated_at: entry.updated,
  };
}

export function buildAiwgFortemiIndexExport(cwd: string, options: BrowserIndexExportOptions = {}): AiwgFortemiIndexExport {
  const graphName = options.graph ?? 'project';
  const index = loadGraphIndexFile<ArtifactIndex>(cwd, 'metadata.json', options.graph);
  if (!index) {
    const graphFlag = options.graph ? ' --graph ' + options.graph : '';
    throw new Error("No metadata index found for graph '" + graphName + "'. Run 'aiwg index build" + graphFlag + "' first.");
  }

  const dependencyGraph = loadGraphIndexFile<DependencyGraph>(cwd, 'dependencies.json', options.graph);
  const privacy = options.privacy ?? 'private';
  const repo = options.repo ?? path.basename(cwd);
  const items = Object.values(index.entries)
    .map((entry) => recordForEntry(entry, graphName, dependencyGraph, privacy))
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    schema_version: 'aiwg.fortemi.index.export.v1',
    generated_at: options.generatedAt ?? new Date().toISOString(),
    source: { repo, privacy },
    items,
  };
}

export function writeAiwgFortemiIndexExport(exportData: AiwgFortemiIndexExport, outPath?: string): void {
  const json = JSON.stringify(exportData, null, 2) + '\n';
  if (!outPath || outPath === '-') {
    process.stdout.write(json);
    return;
  }
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(outPath, json, 'utf-8');
}
