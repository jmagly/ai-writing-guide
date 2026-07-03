import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrateLegacyIndex } from '../../../src/artifacts/legacy-index-migration.js';
import { getGraphIndexDir } from '../../../src/artifacts/types.js';
import type { ArtifactIndex, DependencyGraph, MetadataEntry } from '../../../src/artifacts/types.js';
import { queryFortemiCoreStaticHybridIndex } from '../../../src/artifacts/fortemi-core-query-adapter.js';

function customSkillEntry(overrides: Partial<MetadataEntry> = {}): MetadataEntry {
  return {
    path: '.aiwg/skills/custom-release-check/SKILL.md',
    type: 'skill',
    phase: 'operations',
    title: 'Custom Release Check',
    name: 'custom-release-check',
    tags: ['release', 'custom'],
    created: '2026-07-01T00:00:00.000Z',
    updated: '2026-07-02T00:00:00.000Z',
    checksum: 'abcdef1234567890',
    summary: 'Validate a local release checklist before publishing.',
    dependencies: [],
    dependents: [],
    triggers: ['custom release check', 'validate release readiness'],
    capability: 'Validate user-defined release readiness checks.',
    ...overrides,
  };
}

function writeLegacyProjectIndex(root: string, entry: MetadataEntry): void {
  const indexDir = path.join(root, '.aiwg', '.index');
  fs.mkdirSync(indexDir, { recursive: true });
  fs.mkdirSync(path.join(root, path.dirname(entry.path)), { recursive: true });
  fs.writeFileSync(
    path.join(root, entry.path),
    [
      '---',
      'name: custom-release-check',
      'description: Validate user-defined release readiness checks.',
      '---',
      '# Custom Release Check',
      '',
      'This project-local skill checks release readiness from real AIWG custom skill data.',
      '',
    ].join('\n'),
  );

  const metadata: ArtifactIndex = {
    version: '1.0.0',
    builtAt: '2026-07-03T00:00:00.000Z',
    buildTimeMs: 4,
    entries: { [entry.path]: entry },
  };
  const dependencies: DependencyGraph = {
    [entry.path]: { upstream: [], downstream: [] },
  };
  fs.writeFileSync(path.join(indexDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(indexDir, 'dependencies.json'), JSON.stringify(dependencies, null, 2));
  fs.writeFileSync(path.join(indexDir, 'tags.json'), JSON.stringify({ release: [entry.path], custom: [entry.path] }, null, 2));
  fs.writeFileSync(
    path.join(indexDir, 'stats.json'),
    JSON.stringify(
      {
        version: '1.0.0',
        builtAt: '2026-07-03T00:00:00.000Z',
        buildTimeMs: 4,
        totalArtifacts: 1,
        byPhase: { operations: 1 },
        byType: { skill: 1 },
        tagDistribution: { release: 1, custom: 1 },
        graphMetrics: { totalEdges: 0, orphanedArtifacts: 1, mostReferenced: null },
      },
      null,
      2,
    ),
  );
}

describe('legacy index migration (#1710)', () => {
  let tmp: string;
  let previousXdg: string | undefined;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-legacy-index-migration-'));
    previousXdg = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = path.join(tmp, 'xdg');
  });

  afterEach(() => {
    if (previousXdg === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = previousXdg;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('dry-runs project legacy root index migration without writing sidecar files', () => {
    writeLegacyProjectIndex(tmp, customSkillEntry());

    const report = migrateLegacyIndex(tmp, {
      scopes: ['project'],
      dryRun: true,
      generatedAt: '2026-07-03T01:00:00.000Z',
    });

    expect(report.dryRun).toBe(true);
    expect(report.reportPath).toBeNull();
    expect(report.results[0].status).toBe('created');
    expect(report.results[0].entries).toBe(1);
    expect(fs.existsSync(path.join(getGraphIndexDir(tmp, 'project'), 'metadata.json'))).toBe(false);
    expect(fs.existsSync(path.join(tmp, '.aiwg', '.index', 'fortemi-core'))).toBe(false);
  });

  it('migrates representative custom skill data into the project sidecar and Fortemi Core cache', () => {
    writeLegacyProjectIndex(tmp, customSkillEntry());

    const report = migrateLegacyIndex(tmp, {
      scopes: ['project'],
      generatedAt: '2026-07-03T01:00:00.000Z',
    });

    expect(report.results[0].status).toBe('created');
    expect(report.results[0].files.map((file) => `${file.name}:${file.status}`)).toContain('metadata.json:created');
    expect(report.results[0].fortemiCore?.status).toBe('created');
    expect(report.reportPath && fs.existsSync(report.reportPath)).toBe(true);

    const migratedMetadata = JSON.parse(
      fs.readFileSync(path.join(getGraphIndexDir(tmp, 'project'), 'metadata.json'), 'utf-8'),
    ) as ArtifactIndex;
    expect(migratedMetadata.entries['.aiwg/skills/custom-release-check/SKILL.md']?.name).toBe('custom-release-check');

    const queried = queryFortemiCoreStaticHybridIndex(tmp, {
      graph: 'project',
      text: 'custom release check',
      limit: 5,
    });
    expect(queried.reason).toBeFalsy();
    expect(queried.results[0]?.path).toBe('.aiwg/skills/custom-release-check/SKILL.md');
  });

  it('reports incompatible legacy schema as rebuild-needed without writing a sidecar', () => {
    const legacyDir = path.join(tmp, '.aiwg', '.index');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(
      path.join(legacyDir, 'metadata.json'),
      JSON.stringify({ version: '0.1.0', entries: {} }, null, 2),
    );

    const report = migrateLegacyIndex(tmp, {
      scopes: ['project'],
      generatedAt: '2026-07-03T01:00:00.000Z',
    });

    expect(report.results[0].status).toBe('needs-rebuild');
    expect(report.results[0].reason).toContain('not compatible');
    expect(fs.existsSync(path.join(getGraphIndexDir(tmp, 'project'), 'metadata.json'))).toBe(false);
  });
});
