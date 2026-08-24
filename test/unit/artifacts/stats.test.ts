/**
 * Artifact Index Statistics Tests
 *
 * @source @src/artifacts/stats.ts
 * @implements #418
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { showStats } from '../../../src/artifacts/stats.js';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import { collectGraphIndexFiles, findArtifactFiles } from '../../../src/artifacts/index-files.js';
import { GRAPH_CONFIGS, INDEX_DIR, getGraphIndexDir } from '../../../src/artifacts/types.js';
import type { IndexStats } from '../../../src/artifacts/types.js';

describe('Artifact Index Statistics', () => {
  let tmpDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let prevHome: string | undefined;
  let prevXdgDataHome: string | undefined;

  const mockStats: IndexStats = {
    version: '1.0.0',
    builtAt: '2026-01-15T12:00:00Z',
    buildTimeMs: 42,
    totalArtifacts: 15,
    byPhase: {
      requirements: 5,
      architecture: 3,
      testing: 4,
      security: 2,
      deployment: 1,
    },
    byType: {
      'use-case': 5,
      adr: 3,
      'test-plan': 4,
      'threat-model': 2,
      deployment: 1,
    },
    tagDistribution: {
      auth: 8,
      security: 5,
      api: 3,
      performance: 2,
    },
    graphMetrics: {
      totalEdges: 22,
      markdownLinkEdges: 3,
      canonicalEdges: 22,
      outgoingDeclarations: 23,
      incomingDeclarations: 21,
      adjacencyEntries: 88,
      unmirroredOutgoing: 2,
      unmirroredIncoming: 1,
      orphanedArtifacts: 2,
      mostReferenced: {
        path: '.aiwg/requirements/UC-001.md',
        count: 6,
      },
    },
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-stats-test-'));
    prevHome = process.env.HOME;
    prevXdgDataHome = process.env.XDG_DATA_HOME;
    const indexDir = path.join(tmpDir, INDEX_DIR);
    fs.mkdirSync(indexDir, { recursive: true });

    // Write mock stats and metadata (for indexExists check)
    fs.writeFileSync(path.join(indexDir, 'stats.json'), JSON.stringify(mockStats));
    fs.writeFileSync(path.join(indexDir, 'metadata.json'), JSON.stringify({
      version: '1.0.0',
      builtAt: '2026-01-15T12:00:00Z',
      buildTimeMs: 42,
      entries: {},
    }));

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    if (prevXdgDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = prevXdgDataHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    for (const key of Object.keys(GRAPH_CONFIGS)) {
      if (!['framework', 'project', 'codebase', 'source', 'user'].includes(key)) {
        delete GRAPH_CONFIGS[key];
      }
    }
  });

  it('should display human-readable stats', async () => {
    await showStats(tmpDir);
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Artifact Index Statistics');
    expect(output).toContain('Index version: 1.0.0');
    expect(output).toContain('42ms');
    expect(output).toContain('requirements');
    expect(output).toContain('use-case');
    expect(output).toContain('Total edges:');
    expect(output).toContain('22');
    expect(output).toContain('Markdown link edges:');
    expect(output).toContain('3');
    expect(output).toContain('Canonical edges:');
    expect(output).toContain('Outgoing declares:');
    expect(output).toContain('Incoming declares:');
    expect(output).toContain('Adjacency entries:');
    expect(output).toContain('Unmirrored outgoing:');
    expect(output).toContain('Unmirrored incoming:');
    expect(output).toContain('Orphaned artifacts:');
    expect(output).toContain('2');
    expect(output).toContain('Most referenced:');
    expect(output).toContain('UC-001.md');
  });

  it('should display JSON stats', async () => {
    await showStats(tmpDir, { json: true });
    const jsonOutput = consoleSpy.mock.calls.map(c => c[0]).join('');
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.totalArtifacts).toBe(15);
    expect(parsed.byPhase.requirements).toBe(5);
    expect(parsed.coverage).toBeDefined();
    expect(parsed.coverage.indexed).toBe(0);
    expect(parsed.coverage.totalFiles).toBe(0);
    expect(parsed.coverage.percentage).toBe(100);
  });

  it('reports project graph coverage over WORKSPACE context and .aiwg files', async () => {
    const artifactPath = path.join(tmpDir, '.aiwg', 'requirements', 'one.md');
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, '# One\n');
    fs.writeFileSync(path.join(tmpDir, 'WORKSPACE.md'), '[AIWG](./AIWG.md)\n');
    fs.writeFileSync(path.join(tmpDir, 'AIWG.md'), '# Context\n');

    const graphIndexDir = path.join(tmpDir, INDEX_DIR, 'project');
    fs.mkdirSync(graphIndexDir, { recursive: true });
    fs.writeFileSync(path.join(graphIndexDir, 'stats.json'), JSON.stringify({
      ...mockStats,
      totalArtifacts: 3,
    }));
    const writeMetadata = (paths: string[]): void => {
      fs.writeFileSync(path.join(graphIndexDir, 'metadata.json'), JSON.stringify({
        version: '1.0.0',
        builtAt: '2026-01-15T12:00:00Z',
        buildTimeMs: 42,
        entries: Object.fromEntries(paths.map(entryPath => [entryPath, {}])),
      }));
    };

    writeMetadata(['.aiwg/requirements/one.md', 'WORKSPACE.md', 'AIWG.md']);
    await showStats(tmpDir, { json: true, graph: 'project' });
    let parsed = JSON.parse(consoleSpy.mock.calls.at(-1)?.[0] as string);
    expect(parsed.coverage).toEqual({ indexed: 3, totalFiles: 3, percentage: 100 });

    writeMetadata(['.aiwg/requirements/one.md', 'WORKSPACE.md', 'AIWG.md', '.aiwg/removed.md']);
    await showStats(tmpDir, { json: true, graph: 'project' });
    parsed = JSON.parse(consoleSpy.mock.calls.at(-1)?.[0] as string);
    expect(parsed.coverage).toEqual({ indexed: 3, totalFiles: 3, percentage: 100 });

    // A current source file omitted from the index must reduce coverage rather
    // than allowing root context entries to produce a value above 100%.
    writeMetadata(['WORKSPACE.md', 'AIWG.md', '.aiwg/removed.md']);
    await showStats(tmpDir, { json: true, graph: 'project' });
    parsed = JSON.parse(consoleSpy.mock.calls.at(-1)?.[0] as string);
    expect(parsed.coverage).toEqual({ indexed: 2, totalFiles: 3, percentage: 67 });

    consoleSpy.mockClear();
    await showStats(tmpDir, { graph: 'project' });
    const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
    expect(output).toContain('Coverage: 2/3 artifacts indexed (67%)');
  });

  it('reports default-built global graphs and computes coverage from their scan dirs (#148)', async () => {
    const home = path.join(tmpDir, 'home');
    const xdg = path.join(tmpDir, 'xdg');
    process.env.HOME = home;
    process.env.XDG_DATA_HOME = xdg;
    fs.mkdirSync(path.join(home, '.aiwg'), { recursive: true });
    fs.writeFileSync(path.join(home, '.aiwg', 'aiwg.config'), JSON.stringify({
      index: {
        graphs: {
          myglobal: {
            scanDirs: ['notes'],
            extensions: ['.md'],
          },
        },
      },
    }));

    fs.mkdirSync(path.join(tmpDir, 'notes'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'notes', 'a.md'), '# A note\n');

    await buildIndex(tmpDir, { force: true, graph: 'myglobal' });
    expect(fs.existsSync(path.join(getGraphIndexDir(tmpDir, 'myglobal'), 'stats.json'))).toBe(true);

    consoleSpy.mockClear();
    await showStats(tmpDir, { json: true });
    const parsed = JSON.parse(consoleSpy.mock.calls.at(-1)?.[0] as string);
    expect(parsed.myglobal.totalArtifacts).toBe(1);
    expect(parsed.myglobal.coverage).toEqual({ indexed: 1, totalFiles: 1, percentage: 100 });
  });

  it('counts symlinked directory artifacts consistently in build and coverage (#149)', async () => {
    const linkedTarget = path.join(tmpDir, 'elsewhere', 'shared');
    const linkPath = path.join(tmpDir, '.aiwg', 'linked');
    fs.mkdirSync(linkedTarget, { recursive: true });
    fs.mkdirSync(path.dirname(linkPath), { recursive: true });
    fs.writeFileSync(path.join(linkedTarget, 'SHARED.md'), '# Shared artifact\n');

    try {
      fs.symlinkSync(linkedTarget, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      console.warn(`Skipping symlink coverage regression: ${(error as Error).message}`);
      return;
    }

    await buildIndex(tmpDir, { force: true, graph: 'project' });

    consoleSpy.mockClear();
    await showStats(tmpDir, { json: true, graph: 'project' });
    const parsed = JSON.parse(consoleSpy.mock.calls.at(-1)?.[0] as string);
    expect(parsed.totalArtifacts).toBe(1);
    expect(parsed.coverage).toEqual({ indexed: 1, totalFiles: 1, percentage: 100 });
  });

  it('terminates directory symlink cycles while following linked artifacts (#149)', () => {
    const root = path.join(tmpDir, 'scan');
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'one.md'), '# One\n');

    try {
      fs.symlinkSync(root, path.join(root, 'loop'), process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      console.warn(`Skipping symlink cycle regression: ${(error as Error).message}`);
      return;
    }

    const files = findArtifactFiles(root, ['.md']).map(file => path.relative(root, file));
    expect(files).toEqual(['one.md']);
  });

  it('continues to skip broken links without error (#149)', () => {
    const root = path.join(tmpDir, 'scan');
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'one.md'), '# One\n');

    try {
      fs.symlinkSync(path.join(tmpDir, 'missing'), path.join(root, 'missing.md'));
    } catch (error) {
      console.warn(`Skipping broken symlink regression: ${(error as Error).message}`);
      return;
    }

    const files = findArtifactFiles(root, ['.md']).map(file => path.relative(root, file));
    expect(files).toEqual(['one.md']);
  });

  it('errors instead of calculating coverage for an unknown graph (#148)', async () => {
    await expect(collectGraphIndexFiles(tmpDir, 'missing-graph')).rejects.toThrow('Unknown graph: missing-graph');
  });

  it('should show tag distribution', async () => {
    await showStats(tmpDir);
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Tags (top 10)');
    expect(output).toContain('auth');
  });

  it('should show index health/coverage', async () => {
    await showStats(tmpDir);
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Index Health');
    expect(output).toContain('Coverage');
  });

  it('should exit with error when index does not exist', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-nostats-'));
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(showStats(emptyDir)).rejects.toThrow('process.exit');

    exitSpy.mockRestore();
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });
});
