/**
 * Tier 4: Query Engine on Real Data
 *
 * Runs queries against the real index and validates that known
 * artifacts appear in results with appropriate ranking.
 *
 * @integration
 * @slow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import { queryIndex } from '../../../src/artifacts/query-engine.js';
import { resolveProjectAiwgDir } from '../../../src/config/project-artifacts.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const AIWG_DIR = resolveProjectAiwgDir(REPO_ROOT);
const PROJECT_CORPUS_AVAILABLE = fs.existsSync(AIWG_DIR) && [
  'requirements',
  'architecture',
  'planning',
  'security',
].some(dir => fs.existsSync(path.join(AIWG_DIR, dir)));
const ARTIFACT_ENV_KEYS = [
  'AIWG_ARTIFACTS_PATH',
  'AIWG_PROJECT_ARTIFACTS_PATH',
  'AIWG_PROJECT_AIWG_DIR',
] as const;

async function withArtifactEnvCleared<T>(callback: () => Promise<T>): Promise<T> {
  const previous = Object.fromEntries(
    ARTIFACT_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof ARTIFACT_ENV_KEYS)[number], string | undefined>;
  for (const key of ARTIFACT_ENV_KEYS) delete process.env[key];
  try {
    return await callback();
  } finally {
    for (const key of ARTIFACT_ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('Artifact Query Engine (integration)', () => {
  let tmpDir: string;

  beforeAll(async () => {
    if (!PROJECT_CORPUS_AVAILABLE) return;

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-query-'));
    fs.cpSync(AIWG_DIR, path.join(tmpDir, '.aiwg'), { recursive: true });

    await withArtifactEnvCleared(async () => {
      await buildIndex(tmpDir, { force: true });
    });
  }, 30_000);

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper: capture JSON output from queryIndex
   */
  async function captureQuery(
    params: Parameters<typeof queryIndex>[1]
  ): Promise<{ results: Array<{ path: string; type: string; score: number; title: string }>; total: number }> {
    if (!tmpDir) return { results: [], total: 0 };
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(' '));
    try {
      await withArtifactEnvCleared(async () => {
        await queryIndex(tmpDir, params, { json: true, backend: 'local' });
      });
    } finally {
      console.log = origLog;
    }
    return JSON.parse(logs.join(''));
  }

  it('should return results for "authentication" keyword', async () => {
    if (!tmpDir) return;
    const result = await captureQuery({ text: 'authentication' });
    expect(result.total).toBeGreaterThan(0);
    // Results should be sorted by score descending
    for (let i = 1; i < result.results.length; i++) {
      expect(result.results[i].score).toBeLessThanOrEqual(result.results[i - 1].score);
    }
  });

  it('should filter by type=use-case', async () => {
    if (!tmpDir) return;
    const result = await captureQuery({ type: 'use-case' });
    for (const r of result.results) {
      expect(r.type).toBe('use-case');
    }
  });

  it('should filter by phase=security', async () => {
    if (!tmpDir) return;
    const result = await captureQuery({ phase: 'security' });
    for (const r of result.results) {
      expect(r.path).toMatch(/\.aiwg\/security\//);
    }
  });

  it('should return 0 results for gibberish query', async () => {
    if (!tmpDir) return;
    const result = await captureQuery({ text: 'xyzzy_zzqwkjhg_nonexistent_42' });
    expect(result.total).toBe(0);
  });

  it('should respect limit parameter', async () => {
    if (!tmpDir) return;
    const result = await captureQuery({ text: 'test', limit: 3 });
    expect(result.results.length).toBeLessThanOrEqual(3);
  });

  it('should return results within acceptable time', async () => {
    if (!tmpDir) return;
    const start = Date.now();
    await captureQuery({ text: 'architecture' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5_000); // Query should be fast on cached index
  });
});
