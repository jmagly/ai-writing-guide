/**
 * Hybrid Query Engine — combine location, semantic, and tag queries
 *
 * Provides artifact search combining file paths (glob), keyword matching,
 * tag filtering, and dependency traversal. In-memory index for <100ms queries.
 *
 * @module artifacts/hybrid-query
 * @issue #187
 */

import { promises as fs } from 'fs';
import path from 'path';
import { resolveProjectAiwgDir } from '../config/project-artifacts.js';
import type { HybridQuery } from './address-parser.js';

// ============================================================================
// Types
// ============================================================================

export interface ArtifactInfo {
  path: string;
  relativePath: string;
  phase: string;
  type: string;
  tags: string[];
  title: string;
  references: string[];
  modifiedAt: Date;
  sizeBytes: number;
}

export interface SearchResult {
  artifact: ArtifactInfo;
  score: number;
  matchReasons: string[];
}

// ============================================================================
// ArtifactIndex
// ============================================================================

export class ArtifactIndex {
  private artifacts: ArtifactInfo[];
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.artifacts = [];
  }

  /**
   * Build index by scanning .aiwg/ directory.
   */
  async build(): Promise<number> {
    this.artifacts = [];
    const aiwgDir = resolveProjectAiwgDir(this.projectPath);

    try {
      await this.scanDirectory(aiwgDir, '');
    } catch {
      // .aiwg doesn't exist
    }

    return this.artifacts.length;
  }

  /**
   * Execute a hybrid query against the index.
   */
  query(q: HybridQuery): SearchResult[] {
    const limit = q.limit ?? 20;
    let results: SearchResult[] = [];

    for (const artifact of this.artifacts) {
      let score = 0;
      const reasons: string[] = [];

      // Path match (glob-like)
      if (q.path) {
        if (matchesGlob(artifact.relativePath, q.path)) {
          score += 0.5;
          reasons.push(`path: ${q.path}`);
        } else {
          continue; // Path is a hard filter when specified
        }
      }

      // Semantic query (keyword match)
      if (q.semanticQuery) {
        const kwScore = keywordScore(artifact, q.semanticQuery);
        if (kwScore > 0) {
          score += kwScore * 0.3;
          reasons.push(`keyword: "${q.semanticQuery}" (${(kwScore * 100).toFixed(0)}%)`);
        } else if (!q.path && !q.tags && !q.phase) {
          continue; // Pure semantic query must match
        }
      }

      // Tag filter
      if (q.tags && q.tags.length > 0) {
        const matched = q.tags.filter((t) => artifact.tags.includes(t.toLowerCase()));
        if (matched.length > 0) {
          score += (matched.length / q.tags.length) * 0.2;
          reasons.push(`tags: ${matched.join(', ')}`);
        } else {
          continue; // Tags are a hard filter
        }
      }

      // Phase filter
      if (q.phase) {
        if (artifact.phase === q.phase) {
          score += 0.1;
          reasons.push(`phase: ${q.phase}`);
        } else {
          continue;
        }
      }

      // Type filter
      if (q.type && artifact.type !== q.type) {
        continue;
      }

      // Date filter
      if (q.updatedAfter) {
        const since = new Date(q.updatedAfter);
        if (artifact.modifiedAt < since) {
          continue;
        }
      }

      if (score > 0) {
        results.push({ artifact, score, matchReasons: reasons });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Find artifacts that reference a given path.
   */
  findDependents(artifactPath: string): ArtifactInfo[] {
    const normalized = artifactPath.replace(/^\.aiwg\//, '');
    return this.artifacts.filter((a) =>
      a.references.some((ref) => ref.includes(normalized))
    );
  }

  /**
   * Find artifacts referenced by a given artifact.
   */
  findDependencies(artifactPath: string): ArtifactInfo[] {
    const artifact = this.artifacts.find(
      (a) => a.relativePath === artifactPath || a.path === artifactPath
    );
    if (!artifact) return [];

    return artifact.references
      .map((ref) => this.artifacts.find((a) => a.relativePath.includes(ref)))
      .filter(Boolean) as ArtifactInfo[];
  }

  getAll(): ArtifactInfo[] {
    return [...this.artifacts];
  }

  // ============================================================================
  // Private
  // ============================================================================

  private async scanDirectory(dirPath: string, relativeBase: string): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Skip working and internal dirs
        if (['working', 'ralph', 'ralph-external', 'node_modules', 'index'].includes(entry.name)) continue;
        await this.scanDirectory(fullPath, relativePath);
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.yaml') || entry.name.endsWith('.json')) {
        try {
          const stat = await fs.stat(fullPath);
          const content = await fs.readFile(fullPath, 'utf-8');
          const info = parseArtifactContent(fullPath, relativePath, content, stat.mtime, stat.size);
          this.artifacts.push(info);
        } catch {
          // Skip unreadable files
        }
      }
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function parseArtifactContent(
  fullPath: string,
  relativePath: string,
  content: string,
  mtime: Date,
  size: number
): ArtifactInfo {
  // Extract phase from path
  const pathParts = relativePath.split('/');
  const phase = pathParts[0] || 'unknown';

  // Extract tags from YAML frontmatter
  const tags: string[] = [];
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const tagMatch = fmMatch[1].match(/tags:\s*\[([^\]]+)\]/);
    if (tagMatch) {
      tags.push(...tagMatch[1].split(',').map((t) => t.trim().toLowerCase()));
    }
  }

  // Extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : path.basename(relativePath, path.extname(relativePath));

  // Extract @-mention references
  const references: string[] = [];
  const refMatches = content.matchAll(/@([\w./-]+\.(?:md|yaml|json|ts|mjs))/g);
  for (const match of refMatches) {
    references.push(match[1]);
  }

  // Infer type from filename/path
  const type = inferArtifactType(relativePath);

  return { path: fullPath, relativePath, phase, type, tags, title, references, modifiedAt: mtime, sizeBytes: size };
}

function inferArtifactType(relativePath: string): string {
  if (relativePath.includes('requirements') || relativePath.match(/UC-\d+/)) return 'use-case';
  if (relativePath.includes('architecture') || relativePath.includes('adr')) return 'architecture';
  if (relativePath.includes('testing') || relativePath.includes('test-plan')) return 'testing';
  if (relativePath.includes('planning')) return 'planning';
  if (relativePath.includes('risks')) return 'risk';
  if (relativePath.includes('security')) return 'security';
  if (relativePath.includes('deployment')) return 'deployment';
  if (relativePath.includes('reports')) return 'report';
  return 'document';
}

function matchesGlob(filePath: string, pattern: string): boolean {
  // Simple glob: * matches any segment, ** matches multiple segments
  const regex = pattern
    .replace(/\*\*/g, '___DOUBLE___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLE___/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regex}$`).test(filePath) || filePath.startsWith(pattern.replace(/\*.*$/, ''));
}

function keywordScore(artifact: ArtifactInfo, query: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return 0;

  const searchable = [artifact.title, artifact.relativePath, ...artifact.tags].join(' ').toLowerCase();

  let matches = 0;
  for (const term of terms) {
    if (searchable.includes(term)) matches++;
  }

  return matches / terms.length;
}
