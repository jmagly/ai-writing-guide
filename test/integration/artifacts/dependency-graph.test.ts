/**
 * Tier 3: Dependency Graph Validation
 *
 * Validates the graph against known real relationships in .aiwg/ content.
 *
 * @integration
 * @slow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import type { ArtifactIndex, DependencyGraph } from '../../../src/artifacts/types.js';
import { resolveProjectAiwgDir } from '../../../src/config/project-artifacts.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const AIWG_DIR = resolveProjectAiwgDir(REPO_ROOT);
const PROJECT_CORPUS_AVAILABLE = fs.existsSync(AIWG_DIR) && [
  'requirements',
  'architecture',
  'planning',
  'security',
].some(dir => fs.existsSync(path.join(AIWG_DIR, dir)));

describe('Artifact Dependency Graph (integration)', () => {
  let entries: ArtifactIndex['entries'];
  let deps: DependencyGraph;
  let tmpDir: string;

  beforeAll(async () => {
    if (!PROJECT_CORPUS_AVAILABLE) return;

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-depgraph-'));
    fs.mkdirSync(path.join(tmpDir, '.aiwg', '.index'), { recursive: true });

    await buildIndex(REPO_ROOT, { force: true, outputDir: tmpDir });

    const indexDir = path.join(tmpDir, '.aiwg', '.index');
    const index: ArtifactIndex = JSON.parse(fs.readFileSync(path.join(indexDir, 'metadata.json'), 'utf-8'));
    deps = JSON.parse(fs.readFileSync(path.join(indexDir, 'dependencies.json'), 'utf-8'));
    entries = index.entries;
  }, 30_000);

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should have graph entries for all indexed artifacts', () => {
    if (!entries || !deps) return;
    // Every entry in metadata should appear in the dependency graph
    for (const entryPath of Object.keys(entries)) {
      expect(deps[entryPath], `${entryPath} should be in dependency graph`).toBeDefined();
    }
  });

  it('should have some artifacts with upstream dependencies', () => {
    if (!deps) return;
    const withUpstream = Object.entries(deps).filter(([, n]) => n.upstream.length > 0);
    expect(withUpstream.length).toBeGreaterThan(0);
  });

  it('should have bidirectional consistency (upstream ↔ downstream)', () => {
    if (!deps) return;
    // For every A→B upstream edge, B should have A in its downstream
    for (const [artifact, node] of Object.entries(deps)) {
      for (const upEdge of node.upstream) {
        const upPath = typeof upEdge === 'string' ? upEdge : upEdge.path;
        if (deps[upPath]) {
          const downPaths = deps[upPath].downstream.map(
            (e: string | { path: string }) => typeof e === 'string' ? e : e.path
          );
          expect(
            downPaths,
            `${upPath} downstream should include ${artifact}`
          ).toContain(artifact);
        }
      }
    }
  });

  it('should not have 100% orphaned artifacts', () => {
    if (!deps) return;
    const total = Object.keys(deps).length;
    const orphaned = Object.values(deps).filter(
      n => n.upstream.length === 0 && n.downstream.length === 0
    ).length;
    // Some orphans are expected, but not all
    const orphanRate = orphaned / total;
    expect(orphanRate).toBeLessThan(1.0);
  });

  it('should correctly compute dependents on entries', () => {
    if (!entries || !deps) return;
    // For entries with dependents, verify they match downstream in the graph
    for (const [entryPath, entry] of Object.entries(entries)) {
      if (entry.dependents.length > 0) {
        const rawDownstream = deps[entryPath]?.downstream ?? [];
        const downPaths = rawDownstream.map(
          (e: string | { path: string }) => typeof e === 'string' ? e : e.path
        );
        // Each dependent should appear in the graph downstream
        for (const dep of entry.dependents) {
          expect(downPaths, `${entryPath} graph should have dependent ${dep}`).toContain(dep);
        }
      }
    }
  });

  it('should handle artifacts that reference non-indexed paths gracefully', () => {
    if (!entries) return;
    // Some artifacts reference paths outside .aiwg/ (e.g., @src/...)
    // These should not crash; they just won't appear in the graph
    for (const entry of Object.values(entries)) {
      for (const dep of entry.dependencies) {
        // Dependencies extracted should be strings, not undefined/null
        expect(typeof dep).toBe('string');
        expect(dep.length).toBeGreaterThan(0);
      }
    }
  });
});
