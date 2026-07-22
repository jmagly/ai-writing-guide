/**
 * Artifact Index Reader
 *
 * Shared utility to load .aiwg/.index/ JSON files.
 * Used by query, deps, and stats commands.
 *
 * @implements #420
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/index-reader.test.ts
 */

import fs from 'fs';
import path from 'path';
import type {
  ArtifactIndex,
  TagIndex,
  DependencyGraph,
  IndexStats,
  GraphType,
} from './types.js';
import { getGraphIndexDir, getProjectIndexRoot } from './types.js';

/**
 * Load a JSON file from the index directory
 *
 * @param cwd - Project root directory
 * @param filename - JSON file to load (e.g. 'metadata.json')
 * @returns Parsed JSON or null if file doesn't exist or is corrupt
 */
export function loadIndexFile<T>(cwd: string, filename: string): T | null {
  const filePath = path.join(getProjectIndexRoot(cwd), filename);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Load the master metadata index
 */
export function loadMetadataIndex(cwd: string): ArtifactIndex | null {
  return loadIndexFile<ArtifactIndex>(cwd, 'metadata.json');
}

/**
 * Load the tag reverse index
 */
export function loadTagIndex(cwd: string): TagIndex | null {
  return loadIndexFile<TagIndex>(cwd, 'tags.json');
}

/**
 * Load the dependency graph
 */
export function loadDependencyGraph(cwd: string): DependencyGraph | null {
  return loadIndexFile<DependencyGraph>(cwd, 'dependencies.json');
}

/**
 * Load the index statistics
 */
export function loadIndexStats(cwd: string): IndexStats | null {
  return loadIndexFile<IndexStats>(cwd, 'stats.json');
}

/**
 * Check if an index exists
 */
export function indexExists(cwd: string): boolean {
  const metadataPath = path.join(getProjectIndexRoot(cwd), 'metadata.json');
  return fs.existsSync(metadataPath);
}

/**
 * Write a JSON file to the index directory atomically
 *
 * Uses write-to-temp + rename for POSIX-safe atomic writes.
 *
 * @param cwd - Project root directory
 * @param filename - JSON file to write
 * @param data - Data to serialize
 * @param indexDir - Override index directory (for multi-graph support)
 */
export function writeIndexFile(cwd: string, filename: string, data: unknown, indexDir?: string): void {
  const dirPath = indexDir ?? getProjectIndexRoot(cwd);
  const filePath = path.join(dirPath, filename);
  const tmpPath = `${filePath}.tmp`;

  // Ensure directory exists
  fs.mkdirSync(dirPath, { recursive: true });

  // Write to temp, then rename (atomic on POSIX)
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/**
 * Resolve the index directory for a graph type
 *
 * @param cwd - Project root directory
 * @param graph - Graph type (undefined = default .aiwg/.index/)
 * @returns Absolute path to the index directory
 */
export function resolveIndexDir(cwd: string, graph?: GraphType): string {
  if (graph) return getGraphIndexDir(cwd, graph);
  return getProjectIndexRoot(cwd);
}

/**
 * Load a JSON file from a graph-specific index directory
 */
export function loadGraphIndexFile<T>(cwd: string, filename: string, graph?: GraphType): T | null {
  const dir = resolveIndexDir(cwd, graph);
  const filePath = path.join(dir, filename);

  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}
