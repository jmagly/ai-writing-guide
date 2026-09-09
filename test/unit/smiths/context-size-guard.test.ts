import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const {
  scanContextBridgeSizes,
  formatContextBridgeSizeReport,
} = await import('../../../tools/lint/context-size-guard.mjs');

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-context-size-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('context-size guard', () => {
  it('distinguishes missing bridges from existing files at the ceiling', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), 'x'.repeat(64), 'utf8');

    const result = await scanContextBridgeSizes({
      rootDir: tmpDir,
      ceilingBytes: 64,
      files: ['AGENTS.md', 'WARP.md'],
    });

    expect(result.records).toEqual([
      { path: 'AGENTS.md', exists: true, size: 64, ceilingBytes: 64 },
      { path: 'WARP.md', exists: false, size: 0, ceilingBytes: 64 },
    ]);
    expect(result.violations).toEqual([]);
    const report = formatContextBridgeSizeReport(result);
    expect(report).toContain('AGENTS.md: 0.1 KiB (ok)');
    expect(report).toContain('WARP.md: missing');
  });

  it('reports oversized default-loaded bridge files', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), 'x'.repeat(32), 'utf8');
    await fs.writeFile(path.join(tmpDir, 'WARP.md'), 'x'.repeat(128), 'utf8');

    const result = await scanContextBridgeSizes({
      rootDir: tmpDir,
      ceilingBytes: 64,
      files: ['AGENTS.md', 'WARP.md'],
    });

    expect(result.violations.map((entry: { path: string }) => entry.path)).toEqual(['WARP.md']);
    expect(formatContextBridgeSizeReport(result)).toContain('Move long-form content to Tier 3');
  });
});
