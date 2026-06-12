import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildAiwgFortemiIndexExport, writeAiwgFortemiIndexExport } from '../../../src/artifacts/browser-export.js';
import { INDEX_DIR } from '../../../src/artifacts/types.js';
import type { ArtifactIndex, DependencyGraph, MetadataEntry } from '../../../src/artifacts/types.js';

function entry(overrides: Partial<MetadataEntry>): MetadataEntry {
  return {
    path: '.aiwg/requirements/UC-001.md',
    type: 'use-case',
    phase: 'requirements',
    title: 'CRM Review Queue',
    tags: ['crm', 'fortemi'],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-02T00:00:00.000Z',
    checksum: 'abcdef1234567890',
    summary: 'Review CRM candidates with Fortemi React.',
    dependencies: [],
    dependents: [],
    ...overrides,
  };
}

describe('AIWG Fortemi browser index export', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-fortemi-export-'));
    const indexDir = path.join(tmpDir, INDEX_DIR);
    fs.mkdirSync(indexDir, { recursive: true });

    const index: ArtifactIndex = {
      version: '1.0.0',
      builtAt: '2026-01-03T00:00:00.000Z',
      buildTimeMs: 5,
      entries: {
        '.aiwg/design/ADR-001.md': entry({
          path: '.aiwg/design/ADR-001.md',
          type: 'adr',
          phase: 'architecture',
          title: 'Use Fortemi React',
          tags: ['architecture'],
          summary: 'Use Fortemi React for the local CRM UX.',
          updated: '2026-01-04T00:00:00.000Z',
          dependents: ['.aiwg/requirements/UC-001.md'],
        }),
        '.aiwg/requirements/UC-001.md': entry({
          dependencies: ['.aiwg/design/ADR-001.md'],
        }),
      },
    };
    const graph: DependencyGraph = {
      '.aiwg/design/ADR-001.md': {
        upstream: [],
        downstream: [{ path: '.aiwg/requirements/UC-001.md', type: 'depends-on' }],
      },
      '.aiwg/requirements/UC-001.md': {
        upstream: [{ path: '.aiwg/design/ADR-001.md', type: 'depends-on' }],
        downstream: [],
      },
    };

    fs.writeFileSync(path.join(indexDir, 'metadata.json'), JSON.stringify(index));
    fs.writeFileSync(path.join(indexDir, 'dependencies.json'), JSON.stringify(graph));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('emits deterministic Fortemi-compatible AIWG artifact records', () => {
    const exported = buildAiwgFortemiIndexExport(tmpDir, {
      repo: 'roctinam/crm',
      privacy: 'sanitized',
      generatedAt: '2026-01-05T00:00:00.000Z',
    });

    expect(exported.schema_version).toBe('aiwg.fortemi.index.export.v1');
    expect(exported.source).toEqual({ repo: 'roctinam/crm', privacy: 'sanitized' });
    expect(exported.items).toHaveLength(2);
    expect(exported.items.map((item) => item.id)).toEqual([...exported.items.map((item) => item.id)].sort());

    const requirement = exported.items.find((item) => item.source.path === '.aiwg/requirements/UC-001.md');
    expect(requirement).toMatchObject({
      schema_version: 'aiwg.fortemi.index.record.v1',
      type: 'aiwg.artifact',
      title: 'CRM Review Queue',
      privacy: { classification: 'sanitized', pii: false },
    });
    expect(requirement?.facets).toMatchObject({
      artifact_type: ['use-case'],
      phase: ['requirements'],
      graph: ['project'],
      privacy: ['sanitized'],
    });
    expect(requirement?.tags).toEqual(['crm', 'fortemi']);
    expect(requirement?.relationships[0]).toMatchObject({
      type: 'depends-on',
      source_path: '.aiwg/design/ADR-001.md',
    });
    expect(requirement?.provenance[0]).toMatchObject({
      source: 'aiwg-index',
      confidence: 'source',
      privacy: 'sanitized',
    });
  });

  it('writes the export JSON for browser import without mutating the index', () => {
    const out = path.join(tmpDir, 'exports', 'aiwg-fortemi-index.json');
    const exported = buildAiwgFortemiIndexExport(tmpDir, { generatedAt: '2026-01-05T00:00:00.000Z' });

    writeAiwgFortemiIndexExport(exported, out);

    const parsed = JSON.parse(fs.readFileSync(out, 'utf-8'));
    expect(parsed.schema_version).toBe('aiwg.fortemi.index.export.v1');
    expect(parsed.items[0].id).toBe(exported.items[0].id);
    expect(fs.existsSync(path.join(tmpDir, INDEX_DIR, 'metadata.json'))).toBe(true);
  });
});
