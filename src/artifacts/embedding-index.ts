/**
 * Semantic Embedding Index
 *
 * Optional ANN (approximate nearest neighbor) layer on top of the artifact
 * index. Embeds node summaries/titles into dense vectors using a small local
 * model and stores them in an HNSW index for fast similarity queries.
 *
 * Install: npm install @xenova/transformers hnswlib-node
 *
 * @implements #730
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/embedding-index.test.ts
 */

import fs from 'fs';
import path from 'path';
import type { MetadataEntry } from './types.js';

/**
 * Default embedding model (all-MiniLM-L6-v2: ~22MB, 384 dims, ~5ms/embedding on CPU)
 */
export const DEFAULT_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const DEFAULT_EMBEDDING_DIMS = 384;

/**
 * Embedding index manifest stored alongside the HNSW index
 */
export interface EmbeddingManifest {
  /** Model identifier used for embedding */
  model: string;
  /** Vector dimensionality */
  dims: number;
  /** Ordered list of node IDs (position → node ID) */
  nodeIds: string[];
  /** ISO timestamp of last build */
  builtAt: string;
  /** Checksums at build time for incremental detection */
  checksums: Record<string, string>;
}

/**
 * Configuration for the embedding index (from .aiwg/config.yaml)
 */
export interface EmbeddingConfig {
  /** Enable embedding index for this graph */
  enabled: boolean;
  /** Model to use (default: Xenova/all-MiniLM-L6-v2) */
  model?: string;
  /** Number of results for semantic queries */
  topK?: number;
  /** When to rebuild: 'content-change' | 'always' | 'never' */
  rebuildOn?: 'content-change' | 'always' | 'never';
}

/**
 * Semantic search result
 */
export interface SemanticResult {
  /** Node ID (artifact path or REF identifier) */
  nodeId: string;
  /** Cosine similarity score (0-1, higher is more similar) */
  score: number;
}

/**
 * Check if embedding dependencies are available.
 */
export async function checkEmbeddingDeps(): Promise<{ available: boolean; missing: string[] }> {
  const missing: string[] = [];

  try {
    await (new Function('m', 'return import(m)'))('@xenova/transformers');
  } catch {
    missing.push('@xenova/transformers');
  }

  try {
    await (new Function('m', 'return import(m)'))('hnswlib-node');
  } catch {
    missing.push('hnswlib-node');
  }

  return { available: missing.length === 0, missing };
}

/**
 * Build an embedding index from artifact metadata entries.
 *
 * Embeds each entry's title + summary into a dense vector and stores
 * them in an HNSW index for fast approximate nearest-neighbor queries.
 *
 * @param entries - Map of node ID → MetadataEntry
 * @param outputDir - Directory to write embeddings/ subfolder
 * @param model - Transformer model identifier
 * @returns Number of entries embedded
 */
export async function buildEmbeddingIndex(
  entries: Record<string, MetadataEntry>,
  outputDir: string,
  model: string = DEFAULT_EMBEDDING_MODEL
): Promise<number> {
  const transformersMod = await (new Function('m', 'return import(m)'))('@xenova/transformers');
  const { pipeline } = transformersMod;
  const hnswlib: any = await (new Function('m', 'return import(m)'))('hnswlib-node');
  const HierarchicalNSW = hnswlib.HierarchicalNSW ?? hnswlib.default?.HierarchicalNSW;

  if (!HierarchicalNSW) {
    throw new Error('hnswlib-node: HierarchicalNSW not found in module exports');
  }

  const embed = await pipeline('feature-extraction', model);
  const ids = Object.keys(entries);

  if (ids.length === 0) return 0;

  // Determine dimensions from a test embedding
  const testResult = await embed('test', { pooling: 'mean', normalize: true });
  const dims = testResult.data.length;

  const index = new HierarchicalNSW('cosine', dims);
  index.initIndex(Math.max(ids.length, 1));

  const checksums: Record<string, string> = {};

  for (let i = 0; i < ids.length; i++) {
    const entry = entries[ids[i]];
    const text = `${entry.title} ${entry.summary}`.trim();
    const result = await embed(text, { pooling: 'mean', normalize: true });
    index.addPoint(Array.from(result.data as Float32Array), i);
    checksums[ids[i]] = entry.checksum;
  }

  // Write index and manifest
  const embeddingsDir = path.join(outputDir, 'embeddings');
  fs.mkdirSync(embeddingsDir, { recursive: true });

  index.writeIndex(path.join(embeddingsDir, 'vectors.hnsw'));

  const manifest: EmbeddingManifest = {
    model,
    dims,
    nodeIds: ids,
    builtAt: new Date().toISOString(),
    checksums,
  };

  fs.writeFileSync(
    path.join(embeddingsDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  return ids.length;
}

/**
 * Load an embedding manifest from an index directory.
 */
export function loadEmbeddingManifest(indexDir: string): EmbeddingManifest | null {
  const manifestPath = path.join(indexDir, 'embeddings', 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as EmbeddingManifest;
  } catch {
    return null;
  }
}

/**
 * Query the embedding index for semantically similar artifacts.
 *
 * @param query - Natural language query string
 * @param indexDir - Directory containing the embeddings/ subfolder
 * @param topK - Number of results to return
 * @returns Ranked list of semantic results
 */
export async function semanticQuery(
  query: string,
  indexDir: string,
  topK: number = 10
): Promise<SemanticResult[]> {
  const manifest = loadEmbeddingManifest(indexDir);
  if (!manifest) {
    throw new Error(`No embedding index found at ${indexDir}/embeddings/`);
  }

  const transformersMod = await (new Function('m', 'return import(m)'))('@xenova/transformers');
  const { pipeline } = transformersMod;
  const hnswlib: any = await (new Function('m', 'return import(m)'))('hnswlib-node');
  const HierarchicalNSW = hnswlib.HierarchicalNSW ?? hnswlib.default?.HierarchicalNSW;

  if (!HierarchicalNSW) {
    throw new Error('hnswlib-node: HierarchicalNSW not found in module exports');
  }

  const embed = await pipeline('feature-extraction', manifest.model);
  const result = await embed(query, { pooling: 'mean', normalize: true });

  const index = new HierarchicalNSW('cosine', manifest.dims);
  index.readIndex(path.join(indexDir, 'embeddings', 'vectors.hnsw'));
  // setEfSearch controls recall quality — higher = better but slower
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const idx = index as any;
  if (typeof idx.setEfSearch === 'function') {
    idx.setEfSearch(Math.max(topK * 2, 50));
  }

  const effectiveK = Math.min(topK, manifest.nodeIds.length);
  const { neighbors, distances } = index.searchKnn(
    Array.from(result.data as Float32Array),
    effectiveK
  );

  return neighbors.map((pos: number, i: number) => ({
    nodeId: manifest.nodeIds[pos],
    // HNSW cosine distance is 1 - cosine_similarity
    score: 1 - (distances[i] ?? 0),
  }));
}

/**
 * Get semantic neighbors of a specific node.
 *
 * @param nodeId - Node to find neighbors for
 * @param entries - Metadata entries to get the node's text
 * @param indexDir - Directory containing the embeddings/ subfolder
 * @param topK - Number of results
 */
export async function semanticNeighbors(
  nodeId: string,
  entries: Record<string, MetadataEntry>,
  indexDir: string,
  topK: number = 10
): Promise<SemanticResult[]> {
  const entry = entries[nodeId];
  if (!entry) {
    throw new Error(`Node '${nodeId}' not found in metadata`);
  }

  const queryText = `${entry.title} ${entry.summary}`.trim();
  // Get topK + 1 since the node itself will likely be the top result
  const results = await semanticQuery(queryText, indexDir, topK + 1);

  // Filter out the query node itself
  return results.filter(r => r.nodeId !== nodeId).slice(0, topK);
}

/**
 * Determine which entries need re-embedding based on checksum changes.
 *
 * @param entries - Current metadata entries
 * @param manifest - Existing embedding manifest
 * @returns Object with entries that changed and entries that are new
 */
export function detectEmbeddingChanges(
  entries: Record<string, MetadataEntry>,
  manifest: EmbeddingManifest
): { changed: string[]; added: string[]; removed: string[] } {
  const changed: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  const manifestIds = new Set(manifest.nodeIds);
  const entryIds = new Set(Object.keys(entries));

  for (const id of entryIds) {
    if (!manifestIds.has(id)) {
      added.push(id);
    } else if (entries[id].checksum !== manifest.checksums[id]) {
      changed.push(id);
    }
  }

  for (const id of manifestIds) {
    if (!entryIds.has(id)) {
      removed.push(id);
    }
  }

  return { changed, added, removed };
}
