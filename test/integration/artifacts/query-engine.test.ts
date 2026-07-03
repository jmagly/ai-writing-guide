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

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const AIWG_DIR = path.join(REPO_ROOT, '.aiwg');

describe('Artifact Query Engine (integration)', () => {
  let tmpDir: string;

  beforeAll(async () => {
    if (!fs.existsSync(AIWG_DIR)) return;

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-query-'));
    fs.mkdirSync(path.join(tmpDir, '.aiwg', '.index'), { recursive: true });

    await buildIndex(REPO_ROOT, { force: true, outputDir: tmpDir });
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
      await queryIndex(tmpDir, params, { json: true, backend: 'local' });
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
