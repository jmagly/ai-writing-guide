/**
 * View store filesystem tests.
 *
 * @implements #1207
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getDefinition,
  getResult,
  listViews,
  putDefinition,
  putResult,
  removeView,
} from '../../../src/artifacts/views/store.js';
import type { ViewDefinition, ViewResultMeta } from '../../../src/artifacts/views/types.js';

const def = (overrides: Partial<ViewDefinition> = {}): ViewDefinition => ({
  name:         'sample-view',
  producer:     'rlm-batch',
  inputs:       { glob: 'foo/*.md' },
  prompt:       'do the thing',
  aggregate:    'concat',
  refresh:      { onArtifactChange: true, schedule: 'never', manualOnly: false },
  outputFormat: 'json',
  ...overrides,
});

const meta = (overrides: Partial<ViewResultMeta> = {}): ViewResultMeta => ({
  name:        'sample-view',
  builtAt:     '2026-05-08T00:00:00Z',
  builtBy:     'rlm-batch',
  inputCount:  3,
  cacheHits:   1,
  cacheMisses: 2,
  durationMs:  1234,
  inputHashes: ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)],
  ...overrides,
});

describe('views store', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'aiwg-views-test-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('round-trips definition put → get', () => {
    const v = def();
    putDefinition(root, v);
    const got = getDefinition(root, 'sample-view');
    expect(got.name).toBe('sample-view');
    expect(got.inputs.glob).toBe('foo/*.md');
    expect(got.aggregate).toBe('concat');
  });

  it('rejects invalid view name on put', () => {
    expect(() => putDefinition(root, def({ name: 'BAD' }))).toThrow(/Invalid view name/);
  });

  it('removeView removes definition + results', () => {
    putDefinition(root, def());
    putResult(root, 'sample-view', { foo: 'bar' }, meta());
    const r = removeView(root, 'sample-view');
    expect(r.defRemoved).toBe(true);
    expect(r.resultRemoved).toBe(true);
    expect(() => getDefinition(root, 'sample-view')).toThrow();
  });

  it('listViews reports never-built when no result', () => {
    putDefinition(root, def());
    const views = listViews(root, new Date('2026-05-09T00:00:00Z'));
    expect(views).toHaveLength(1);
    expect(views[0]?.staleReason).toBe('never-built');
    expect(views[0]?.hasResults).toBe(false);
  });

  it('listViews reports fresh when within schedule', () => {
    putDefinition(root, def({ refresh: { onArtifactChange: true, schedule: 'weekly', manualOnly: false } }));
    putResult(root, 'sample-view', { x: 1 }, meta({ builtAt: '2026-05-08T00:00:00Z' }));
    const views = listViews(root, new Date('2026-05-09T00:00:00Z'));
    expect(views[0]?.staleReason).toBe('fresh');
    expect(views[0]?.ageDays).toBe(1);
    expect(views[0]?.hasResults).toBe(true);
  });

  it('listViews reports stale-schedule when past schedule', () => {
    putDefinition(root, def({ refresh: { onArtifactChange: true, schedule: 'daily', manualOnly: false } }));
    putResult(root, 'sample-view', { x: 1 }, meta({ builtAt: '2026-05-01T00:00:00Z' }));
    const views = listViews(root, new Date('2026-05-09T00:00:00Z'));
    expect(views[0]?.staleReason).toBe('stale-schedule');
    expect(views[0]?.ageDays).toBe(8);
  });

  it('schedule=never never goes stale', () => {
    putDefinition(root, def());   // schedule: never
    putResult(root, 'sample-view', { x: 1 }, meta({ builtAt: '2025-01-01T00:00:00Z' }));
    const views = listViews(root, new Date('2026-05-09T00:00:00Z'));
    expect(views[0]?.staleReason).toBe('fresh');
  });

  it('getResult returns persisted result', () => {
    putDefinition(root, def());
    putResult(root, 'sample-view', { findings: ['a', 'b'] }, meta());
    const r = getResult(root, 'sample-view');
    expect(r.result).toEqual({ findings: ['a', 'b'] });
    expect(r.meta.builtBy).toBe('rlm-batch');
  });

  it('listViews ignores non-yaml entries', () => {
    putDefinition(root, def());
    require('node:fs').writeFileSync(join(root, 'README.md'), '# notes', 'utf-8');
    const views = listViews(root);
    expect(views).toHaveLength(1);
  });
});
