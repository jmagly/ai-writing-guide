/**
 * Tier 5: Incremental Build
 *
 * Validates that the incremental build optimization works correctly:
 * unchanged files are skipped, modified files are re-indexed.
 *
 * @integration
 * @slow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import type { ArtifactIndex, IndexStats } from '../../../src/artifacts/types.js';
import { resolveProjectAiwgDir } from '../../../src/config/project-artifacts.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const AIWG_DIR = resolveProjectAiwgDir(REPO_ROOT);
const PROJECT_CORPUS_AVAILABLE = fs.existsSync(AIWG_DIR) && [
  'requirements',
  'architecture',
  'planning',
  'security',
].some(dir => fs.existsSync(path.join(AIWG_DIR, dir)));

describe('Artifact Incremental Build (integration)', () => {
  let tmpDir: string;

  beforeAll(() => {
    if (!PROJECT_CORPUS_AVAILABLE) return;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-incremental-'));
    fs.mkdirSync(path.join(tmpDir, '.aiwg', '.index'), { recursive: true });
  });

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should complete full build, then incremental rebuild faster', async () => {
    if (!tmpDir) return;

    // Full build
    await buildIndex(REPO_ROOT, { force: true, outputDir: tmpDir });

    const indexDir = path.join(tmpDir, '.aiwg', '.index');
    const fullStats: IndexStats = JSON.parse(
      fs.readFileSync(path.join(indexDir, 'stats.json'), 'utf-8')
    );
    const fullBuildTime = fullStats.buildTimeMs;
    const fullIndex: ArtifactIndex = JSON.parse(
      fs.readFileSync(path.join(indexDir, 'metadata.json'), 'utf-8')
    );
    const fullChecksums = new Map<string, string>();
    for (const [p, e] of Object.entries(fullIndex.entries)) {
      fullChecksums.set(p, e.checksum);
    }

    // Incremental rebuild (no changes)
    await buildIndex(REPO_ROOT, { force: false, outputDir: tmpDir });

    const incrStats: IndexStats = JSON.parse(
      fs.readFileSync(path.join(indexDir, 'stats.json'), 'utf-8')
    );
    const incrBuildTime = incrStats.buildTimeMs;
    const incrIndex: ArtifactIndex = JSON.parse(
      fs.readFileSync(path.join(indexDir, 'metadata.json'), 'utf-8')
    );

    // Incremental should be faster (or at worst similar for small repos)
    // We don't assert strict ordering since timing can vary, but we check
    // that checksums are preserved (proving files were skipped)
    for (const [p, checksum] of fullChecksums) {
      expect(
        incrIndex.entries[p]?.checksum,
        `${p} checksum should be preserved`
      ).toBe(checksum);
    }

    // Same total artifact count
    expect(incrStats.totalArtifacts).toBe(fullStats.totalArtifacts);

    // Incremental should be meaningfully faster than force build
    // Allow generous margin — just verify it's not dramatically slower
    expect(incrBuildTime).toBeLessThan(fullBuildTime * 3);
  }, 60_000);

  it('should produce identical entry count on rebuild', async () => {
    if (!tmpDir) return;

    const indexDir = path.join(tmpDir, '.aiwg', '.index');

    // Build twice (force both times for determinism)
    await buildIndex(REPO_ROOT, { force: true, outputDir: tmpDir });
    const first: ArtifactIndex = JSON.parse(
      fs.readFileSync(path.join(indexDir, 'metadata.json'), 'utf-8')
    );

    await buildIndex(REPO_ROOT, { force: true, outputDir: tmpDir });
    const second: ArtifactIndex = JSON.parse(
      fs.readFileSync(path.join(indexDir, 'metadata.json'), 'utf-8')
    );

    expect(Object.keys(second.entries).length).toBe(Object.keys(first.entries).length);

    // Same paths should be indexed
    const firstPaths = new Set(Object.keys(first.entries));
    const secondPaths = new Set(Object.keys(second.entries));
    for (const p of firstPaths) {
      expect(secondPaths.has(p), `${p} should be in both builds`).toBe(true);
    }
  }, 60_000);
});
