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
import { INDEX_DIR } from '../../../src/artifacts/types.js';
import type { IndexStats } from '../../../src/artifacts/types.js';

describe('Artifact Index Statistics', () => {
  let tmpDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

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
    fs.rmSync(tmpDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
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
    expect(parsed.coverage.indexed).toBe(15);
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
