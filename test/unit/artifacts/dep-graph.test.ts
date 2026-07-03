/**
 * Artifact Dependency Graph Tests
 *
 * @source @src/artifacts/dep-graph.ts
 * @implements #417
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { showDeps } from '../../../src/artifacts/dep-graph.js';
import { INDEX_DIR } from '../../../src/artifacts/types.js';
import type { ArtifactIndex, DependencyGraph } from '../../../src/artifacts/types.js';

describe('Artifact Dependency Graph', () => {
  let tmpDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-deps-test-'));
    const indexDir = path.join(tmpDir, INDEX_DIR);
    fs.mkdirSync(indexDir, { recursive: true });

    // Create mock dependency graph with typed edges
    const graph: DependencyGraph = {
      '.aiwg/requirements/UC-001.md': {
        upstream: [],
        downstream: [
          { path: '.aiwg/architecture/adr-001.md', type: 'depends-on' },
          { path: '.aiwg/testing/tp-001.md', type: 'depends-on' },
        ],
      },
      '.aiwg/architecture/adr-001.md': {
        upstream: [{ path: '.aiwg/requirements/UC-001.md', type: 'depends-on' }],
        downstream: [{ path: '.aiwg/testing/tp-001.md', type: 'depends-on' }],
      },
      '.aiwg/testing/tp-001.md': {
        upstream: [
          { path: '.aiwg/requirements/UC-001.md', type: 'depends-on' },
          { path: '.aiwg/architecture/adr-001.md', type: 'depends-on' },
        ],
        downstream: [],
      },
      '.aiwg/risks/risk-register.md': {
        upstream: [],
        downstream: [],
      },
    };

    // Also need metadata.json for indexExists check
    const mockIndex: ArtifactIndex = {
      version: '1.0.0',
      builtAt: '2026-01-15T00:00:00Z',
      buildTimeMs: 50,
      entries: {},
    };

    fs.writeFileSync(path.join(indexDir, 'metadata.json'), JSON.stringify(mockIndex));
    fs.writeFileSync(path.join(indexDir, 'dependencies.json'), JSON.stringify(graph));

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  it('should show both upstream and downstream by default', async () => {
    await showDeps(tmpDir, '.aiwg/architecture/adr-001.md', { backend: 'local' });
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('UPSTREAM');
    expect(output).toContain('DOWNSTREAM');
  });

  it('should show upstream only when direction is upstream', async () => {
    await showDeps(tmpDir, '.aiwg/architecture/adr-001.md', { direction: 'upstream', backend: 'local' });
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('UPSTREAM');
    expect(output).not.toContain('DOWNSTREAM');
  });

  it('should show downstream only when direction is downstream', async () => {
    await showDeps(tmpDir, '.aiwg/requirements/UC-001.md', { direction: 'downstream', backend: 'local' });
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).not.toContain('UPSTREAM');
    expect(output).toContain('DOWNSTREAM');
  });

  it('should output JSON when json option is set', async () => {
    await showDeps(tmpDir, '.aiwg/requirements/UC-001.md', { json: true, backend: 'local' });
    const jsonOutput = consoleSpy.mock.calls.map(c => c[0]).join('');
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.artifact).toBe('.aiwg/requirements/UC-001.md');
    expect(parsed.downstream).toContain('.aiwg/architecture/adr-001.md');
    expect(parsed.downstream).toContain('.aiwg/testing/tp-001.md');
    expect(parsed.downstreamCount).toBe(2);
  });

  it('should handle orphaned artifacts (no dependencies)', async () => {
    await showDeps(tmpDir, '.aiwg/risks/risk-register.md', { json: true, backend: 'local' });
    const jsonOutput = consoleSpy.mock.calls.map(c => c[0]).join('');
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.upstream).toHaveLength(0);
    expect(parsed.downstream).toHaveLength(0);
  });

  it('should respect depth limit', async () => {
    await showDeps(tmpDir, '.aiwg/requirements/UC-001.md', { depth: 1, json: true, backend: 'local' });
    const jsonOutput = consoleSpy.mock.calls.map(c => c[0]).join('');
    const parsed = JSON.parse(jsonOutput);
    // At depth 1, should get direct downstream but not transitive
    expect(parsed.downstream).toContain('.aiwg/architecture/adr-001.md');
    expect(parsed.downstream).toContain('.aiwg/testing/tp-001.md');
  });

  it('should exit with error when artifact path not in index', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(showDeps(tmpDir, '.aiwg/nonexistent.md', { backend: 'local' })).rejects.toThrow('process.exit');

    exitSpy.mockRestore();
  });

  it('should exit with error when index does not exist', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-nodeps-'));
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(showDeps(emptyDir, '.aiwg/foo.md', { backend: 'local' })).rejects.toThrow('process.exit');

    exitSpy.mockRestore();
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });
});
