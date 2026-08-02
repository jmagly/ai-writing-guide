import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildContextPack,
  buildWorkspaceContextPack,
  type ContextCandidate,
} from '../../../src/memory/context-pack.js';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function candidate(overrides: Partial<ContextCandidate>): ContextCandidate {
  return {
    tier: 'line',
    text: 'SQLite remains the authoritative session catalog.',
    locator: 'line-memory:one',
    digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    score: 1,
    backend: 'fixture',
    verified: true,
    state: 'active',
    freshness: null,
    ...overrides,
  };
}

describe('bounded hybrid context packs', () => {
  it('deduplicates, excludes invalid lifecycle states, and enforces every hard budget', () => {
    const pack = buildContextPack('authoritative catalog', [
      candidate({}),
      candidate({ tier: 'wiki', locator: '.aiwg/wiki/catalog.md', score: 0.9 }),
      candidate({
        tier: 'wiki',
        locator: '.aiwg/wiki/old.md',
        text: 'The old catalog is authoritative.',
        state: 'superseded',
      }),
      candidate({
        tier: 'wiki',
        locator: '.aiwg/wiki/detail.md',
        text: 'Catalog provenance is retained through exact source spans.',
        score: 0.8,
      }),
    ], {
      budget: {
        totalCharacters: 256,
        lineCharacters: 100,
        wikiCharacters: 100,
        citationCharacters: 100,
        instructionCharacters: 0,
      },
    });
    expect(pack.items.map(item => item.locator)).toContain('line-memory:one');
    expect(pack.items.every(item => item.trust === 'quoted-data')).toBe(true);
    expect(pack.excluded).toEqual(expect.arrayContaining([
      { locator: '.aiwg/wiki/catalog.md', reason: 'duplicate-claim' },
      { locator: '.aiwg/wiki/old.md', reason: 'superseded' },
    ]));
    expect(pack.used.totalCharacters).toBeLessThanOrEqual(256);
    expect(pack.used.lineCharacters).toBeLessThanOrEqual(100);
    expect(pack.used.wikiCharacters).toBeLessThanOrEqual(100);
    expect(pack.used.citationCharacters).toBeLessThanOrEqual(100);
  });

  it('combines relevant line and wiki evidence using deterministic lexical fallback', () => {
    const root = mkdtempSync(join(tmpdir(), 'aiwg-context-pack-'));
    roots.push(root);
    mkdirSync(join(root, '.aiwg/memory'), { recursive: true });
    mkdirSync(join(root, '.aiwg/wiki/concepts'), { recursive: true });
    writeFileSync(join(root, '.aiwg/memory/line-memory.txt'), [
      'SQLite is the authoritative session catalog.',
      'Unrelated deployment preference.',
    ].join('\n'));
    writeFileSync(join(root, '.aiwg/wiki/concepts/catalog.md'), [
      '---',
      'source: session:catalog-decision',
      '---',
      '# Session catalog',
      'The SQLite catalog retains source provenance and review receipts.',
    ].join('\n'));

    const first = buildWorkspaceContextPack(root, 'SQLite catalog provenance', { maxFiles: 20 });
    const second = buildWorkspaceContextPack(root, 'SQLite catalog provenance', { maxFiles: 20 });
    expect(first.id).toBe(second.id);
    expect(first.items.map(item => item.tier)).toEqual(expect.arrayContaining(['line', 'wiki']));
    expect(first.items.some(item => item.text.includes('Unrelated deployment'))).toBe(false);
    expect(first.backend).toEqual(['line-memory-lexical', 'wiki-lexical-fallback']);
    expect(first.metrics.elapsedMs).toBeLessThan(250);
  });
});
