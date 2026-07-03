/**
 * Tier 1: Full Index Build (smoke test)
 *
 * Runs buildIndex() against the real .aiwg/ directory and validates
 * structural correctness of the output.
 *
 * @integration
 * @slow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import type { ArtifactIndex, TagIndex, DependencyGraph, IndexStats } from '../../../src/artifacts/types.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const AIWG_DIR = path.join(REPO_ROOT, '.aiwg');
const INDEX_BUILD_BUDGET_MS = parseIntEnv('AIWG_INDEX_BUILD_BUDGET_MS', 15_000);

function parseIntEnv(name: string, def: number): number {
  const raw = process.env[name];
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}

describe('Artifact Index Build (integration)', () => {
  let tmpDir: string;
  let metadata: ArtifactIndex;
  let tags: TagIndex;
  let deps: DependencyGraph;
  let stats: IndexStats;

  beforeAll(async () => {
    // Skip if .aiwg/ doesn't exist (e.g. fresh clone without tracked artifacts)
    if (!fs.existsSync(AIWG_DIR)) {
      return;
    }

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-index-test-'));

    // Create the .aiwg/.index/ structure in the temp dir so writeIndexFile works
    fs.mkdirSync(path.join(tmpDir, '.aiwg', '.index'), { recursive: true });

    // Build index: scan real .aiwg/, write output to temp dir
    await buildIndex(REPO_ROOT, {
      force: true,
      outputDir: tmpDir,
    });

    // Load the output files
    const indexDir = path.join(tmpDir, '.aiwg', '.index');
    metadata = JSON.parse(fs.readFileSync(path.join(indexDir, 'metadata.json'), 'utf-8'));
    tags = JSON.parse(fs.readFileSync(path.join(indexDir, 'tags.json'), 'utf-8'));
    deps = JSON.parse(fs.readFileSync(path.join(indexDir, 'dependencies.json'), 'utf-8'));
    stats = JSON.parse(fs.readFileSync(path.join(indexDir, 'stats.json'), 'utf-8'));
  }, 30_000);

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should produce all 4 output files', () => {
    if (!tmpDir) return; // skip if .aiwg/ missing
    const indexDir = path.join(tmpDir, '.aiwg', '.index');
    for (const file of ['metadata.json', 'tags.json', 'dependencies.json', 'stats.json']) {
      expect(fs.existsSync(path.join(indexDir, file)), `${file} should exist`).toBe(true);
    }
  });

  it('should index more than 100 artifacts', () => {
    if (!metadata) return;
    const count = Object.keys(metadata.entries).length;
    expect(count).toBeGreaterThan(100);
  });

  it('should have required fields on every entry', () => {
    if (!metadata) return;
    for (const [entryPath, entry] of Object.entries(metadata.entries)) {
      expect(entry.path, `path on ${entryPath}`).toBe(entryPath);
      expect(entry.type, `type on ${entryPath}`).toBeTruthy();
      expect(entry.phase, `phase on ${entryPath}`).toBeTruthy();
      expect(entry.title, `title on ${entryPath}`).toBeTruthy();
      expect(entry.checksum, `checksum on ${entryPath}`).toMatch(/^[a-f0-9]{16}$/);
      expect(entry.created, `created on ${entryPath}`).toBeTruthy();
      expect(entry.updated, `updated on ${entryPath}`).toBeTruthy();
    }
  });

  it('should cover at least 5 SDLC phases', () => {
    if (!stats) return;
    const phaseCount = Object.keys(stats.byPhase).length;
    expect(phaseCount).toBeGreaterThanOrEqual(5);
  });

  it('should have valid index version and timing', () => {
    if (!metadata) return;
    expect(metadata.version).toBe('1.0.0');
    expect(metadata.builtAt).toBeTruthy();
    expect(metadata.buildTimeMs).toBeGreaterThan(0);
  });

  it(`should build within performance budget (< ${INDEX_BUILD_BUDGET_MS / 1000}s)`, () => {
    if (!metadata) return;
    // The package now ships prebuilt Fortemi indexes that users previously
    // built locally, so the real-corpus smoke budget accounts for that larger
    // indexed artifact set while still catching material regressions.
    expect(metadata.buildTimeMs).toBeLessThan(INDEX_BUILD_BUDGET_MS);
  });

  it('should produce consistent stats', () => {
    if (!stats || !metadata) return;
    expect(stats.totalArtifacts).toBe(Object.keys(metadata.entries).length);
    // Sum of byPhase values should equal totalArtifacts
    const phaseSum = Object.values(stats.byPhase).reduce((a, b) => a + b, 0);
    expect(phaseSum).toBe(stats.totalArtifacts);
    // Sum of byType values should equal totalArtifacts
    const typeSum = Object.values(stats.byType).reduce((a, b) => a + b, 0);
    expect(typeSum).toBe(stats.totalArtifacts);
  });

  it('should produce a non-empty dependency graph', () => {
    if (!deps) return;
    const graphEntries = Object.keys(deps).length;
    expect(graphEntries).toBeGreaterThan(0);
    // At least some artifacts should have cross-references
    const withUpstream = Object.values(deps).filter(n => n.upstream.length > 0).length;
    expect(withUpstream).toBeGreaterThan(0);
  });
});
