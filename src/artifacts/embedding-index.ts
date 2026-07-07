/**
 * Semantic Embedding Index
 *
 * Optional ANN (approximate nearest neighbor) layer on top of the artifact
 * index. Embeds node summaries/titles, or opt-in chunked source bodies, into
 * dense vectors using a small local model and stores them in an HNSW index for
 * fast similarity queries.
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
  /** Text granularity embedded for each node. */
  granularity?: EmbeddingGranularity;
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

export type EmbeddingGranularity = 'title-summary' | 'metadata' | 'body';

export interface BuildEmbeddingIndexOptions {
  /** Embedding input scope: compact metadata, or source body when available. */
  granularity?: EmbeddingGranularity;
  /** Project root used to resolve entry.path for body-level embeddings. */
  cwd?: string;
  /** Maximum source body size to read for body-level embeddings. */
  maxSourceBodyBytes?: number;
  /** Approximate character length for each body chunk before mean pooling. */
  bodyChunkChars?: number;
  /** Approximate character overlap between adjacent body chunks. */
  bodyChunkOverlapChars?: number;
  /** Maximum body chunks to embed per artifact. */
  maxBodyChunks?: number;
}

const DEFAULT_MAX_EMBEDDING_BODY_BYTES = 256 * 1024;
const DEFAULT_BODY_CHUNK_CHARS = 1400;
const DEFAULT_BODY_CHUNK_OVERLAP_CHARS = 200;
const DEFAULT_MAX_BODY_CHUNKS = 48;
const BINARY_SOURCE_EXTENSIONS = new Set([
  '.7z', '.a', '.avi', '.bin', '.bmp', '.bz2', '.class', '.dll', '.doc',
  '.docx', '.dylib', '.exe', '.gif', '.gz', '.ico', '.jar', '.jpeg', '.jpg',
  '.mov', '.mp3', '.mp4', '.o', '.odt', '.pdf', '.png', '.ppt', '.pptx',
  '.so', '.tar', '.tgz', '.war', '.webp', '.xls', '.xlsx', '.zip',
]);

function stripFrontmatter(text: string): string {
  if (!text.startsWith('---')) return text;
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? text.slice(match[0].length) : text;
}

function looksBinary(buffer: Buffer): boolean {
  if (buffer.includes(0)) return true;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('utf-8');
  if (sample.length === 0) return false;
  const replacementCount = (sample.match(/\uFFFD/g) ?? []).length;
  return replacementCount / sample.length > 0.01;
}

function metadataTextForEntry(entry: MetadataEntry): string {
  return `${entry.title} ${entry.summary}`.trim();
}

function chunkText(text: string, chunkChars: number, overlapChars: number, maxChunks: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const size = Math.max(200, chunkChars);
  const overlap = Math.max(0, Math.min(overlapChars, size - 1));
  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length && chunks.length < maxChunks) {
    let end = Math.min(start + size, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf(' ', end);
      if (boundary > start + Math.floor(size * 0.6)) end = boundary;
    }

    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks.filter(Boolean);
}

function sourceBodyForEntry(
  cwd: string,
  entry: MetadataEntry,
  maxBytes: number,
): string {
  const sourcePath = path.isAbsolute(entry.path) ? entry.path : path.join(cwd, entry.path);
  try {
    const stat = fs.statSync(sourcePath);
    if (!stat.isFile() || stat.size > maxBytes) return '';
    if (BINARY_SOURCE_EXTENSIONS.has(path.extname(sourcePath).toLowerCase())) return '';
    const buffer = fs.readFileSync(sourcePath);
    if (looksBinary(buffer)) return '';
    return stripFrontmatter(buffer.toString('utf-8')).trim();
  } catch {
    return '';
  }
}

export function embeddingTextForEntry(
  entry: MetadataEntry,
  options: BuildEmbeddingIndexOptions = {},
): string {
  return embeddingTextsForEntry(entry, options).join('\n\n');
}

export function embeddingTextsForEntry(
  entry: MetadataEntry,
  options: BuildEmbeddingIndexOptions = {},
): string[] {
  const metadataText = metadataTextForEntry(entry);
  if (options.granularity !== 'body') return [metadataText];
  const bodyText = options.cwd
    ? sourceBodyForEntry(
        options.cwd,
        entry,
        options.maxSourceBodyBytes ?? DEFAULT_MAX_EMBEDDING_BODY_BYTES,
      )
    : '';
  if (!bodyText) return [metadataText];

  const chunks = chunkText(
    bodyText,
    options.bodyChunkChars ?? DEFAULT_BODY_CHUNK_CHARS,
    options.bodyChunkOverlapChars ?? DEFAULT_BODY_CHUNK_OVERLAP_CHARS,
    options.maxBodyChunks ?? DEFAULT_MAX_BODY_CHUNKS,
  );

  return chunks.length > 0 ? chunks.map(chunk => [metadataText, chunk].join('\n\n')) : [metadataText];
}

function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return vector;
  return vector.map(value => value / norm);
}

async function embedEntryVector(
  embed: (text: string, options: { pooling: string; normalize: boolean }) => Promise<{ data: Float32Array }>,
  entry: MetadataEntry,
  options: BuildEmbeddingIndexOptions,
): Promise<number[]> {
  const texts = embeddingTextsForEntry(entry, options);
  const vectors: number[][] = [];

  for (const text of texts) {
    const result = await embed(text, { pooling: 'mean', normalize: true });
    vectors.push(Array.from(result.data as Float32Array));
  }

  if (vectors.length === 1) return vectors[0];

  const mean = new Array(vectors[0].length).fill(0);
  for (const vector of vectors) {
    for (let i = 0; i < vector.length; i++) {
      mean[i] += vector[i];
    }
  }

  return normalizeVector(mean.map(value => value / vectors.length));
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
 * Embeds each entry into a dense vector and stores it in an HNSW index for
 * fast approximate nearest-neighbor queries. Body granularity reads the source
 * file, strips frontmatter, embeds bounded overlapping chunks, and stores the
 * normalized mean vector for the node.
 *
 * @param entries - Map of node ID → MetadataEntry
 * @param outputDir - Directory to write embeddings/ subfolder
 * @param model - Transformer model identifier
 * @returns Number of entries embedded
 */
export async function buildEmbeddingIndex(
  entries: Record<string, MetadataEntry>,
  outputDir: string,
  model: string = DEFAULT_EMBEDDING_MODEL,
  options: BuildEmbeddingIndexOptions = {},
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
    const vector = await embedEntryVector(embed, entry, options);
    index.addPoint(vector, i);
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
    granularity: options.granularity === 'body' ? 'body' : 'title-summary',
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
  // readIndexSync, not the async readIndex — the async form returns a promise
  // that, if not awaited, leaves the index empty (getCurrentCount() === 0).
  index.readIndexSync(path.join(indexDir, 'embeddings', 'vectors.hnsw'));
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

/** A near-duplicate pair surfaced by the embedding index. */
export interface DedupPair {
  /** First node id (lexicographically smaller). */
  a: string;
  /** Second node id. */
  b: string;
  /** Cosine similarity (0-1). */
  score: number;
}

/**
 * Near-duplicate report (#1493). Reads the prebuilt embedding index and, using
 * each stored vector (no re-embedding), finds node pairs whose cosine
 * similarity is at or above `threshold`. Pairs are de-duplicated (unordered)
 * and returned most-similar-first.
 *
 * Requires a built embedding index (`aiwg index embed`). Throws if absent.
 */
export async function dedupReport(
  indexDir: string,
  threshold = 0.92,
  topK = 5
): Promise<DedupPair[]> {
  const manifest = loadEmbeddingManifest(indexDir);
  if (!manifest) {
    throw new Error(`No embedding index found at ${indexDir}/embeddings/`);
  }

  const hnswlib: any = await (new Function('m', 'return import(m)'))('hnswlib-node');
  const HierarchicalNSW = hnswlib.HierarchicalNSW ?? hnswlib.default?.HierarchicalNSW;
  if (!HierarchicalNSW) {
    throw new Error('hnswlib-node: HierarchicalNSW not found in module exports');
  }

  const index = new HierarchicalNSW('cosine', manifest.dims);
  index.readIndexSync(path.join(indexDir, 'embeddings', 'vectors.hnsw'));
  const idx = index as any;
  const k = Math.min(topK + 1, manifest.nodeIds.length);
  if (typeof idx.setEf === 'function') idx.setEf(Math.max(k * 2, 50));

  const seen = new Map<string, DedupPair>();
  for (let i = 0; i < manifest.nodeIds.length; i++) {
    const vec = idx.getPoint(i);
    const { neighbors, distances } = index.searchKnn(vec, k);
    for (let n = 0; n < neighbors.length; n++) {
      const j = neighbors[n];
      if (j === i) continue;
      const score = 1 - (distances[n] ?? 0);
      if (score < threshold) continue;
      const [a, b] = [manifest.nodeIds[i], manifest.nodeIds[j]].sort();
      const key = `${a}|${b}`;
      const prev = seen.get(key);
      if (!prev || score > prev.score) seen.set(key, { a, b, score });
    }
  }
  return [...seen.values()].sort((x, y) => y.score - x.score);
}
