/**
 * Full-text (BM25) ranking + `aiwg index query --fulltext` integration.
 *
 * #1494: the index is metadata/summary-scoped (it stores a 500-char summary,
 * not the full body). `--fulltext` reads candidate node bodies and BM25-ranks
 * them, so a query term that appears only in the body — never in the
 * frontmatter/summary — is still found.
 *
 * @source @src/artifacts/fulltext.ts
 * @source @src/artifacts/query-engine.ts
 * @issue #1494
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { bm25Rank, tokenizeText } from '../../../src/artifacts/fulltext.js';
import { queryIndex } from '../../../src/artifacts/query-engine.js';
import { INDEX_DIR } from '../../../src/artifacts/types.js';
import type { ArtifactIndex, MetadataEntry } from '../../../src/artifacts/types.js';

describe('bm25Rank (#1494)', () => {
  it('returns no hits for an empty/stopword-only query', () => {
    expect(bm25Rank([{ id: 'a', text: 'hello world' }], '')).toEqual([]);
    expect(bm25Rank([{ id: 'a', text: 'hello world' }], 'the and of')).toEqual([]);
  });

  it('returns no hits when the corpus is empty', () => {
    expect(bm25Rank([], 'transformer')).toEqual([]);
  });

  it('ranks a doc with more occurrences of the term higher', () => {
    const docs = [
      { id: 'sparse', text: 'a transformer appears once among many other words here padding padding padding' },
      { id: 'dense', text: 'transformer transformer transformer transformer model' },
    ];
    const hits = bm25Rank(docs, 'transformer');
    expect(hits[0].id).toBe('dense');
    expect(hits.map((h) => h.id)).toContain('sparse');
  });

  it('normalizes the top score to 1.0 and preserves rawScore', () => {
    const hits = bm25Rank(
      [
        { id: 'x', text: 'quantization quantization quantization' },
        { id: 'y', text: 'quantization once here' },
      ],
      'quantization',
    );
    expect(hits[0].score).toBeCloseTo(1.0, 6);
    expect(hits[0].rawScore).toBeGreaterThan(0);
    expect(hits[1].score).toBeLessThan(1.0);
  });

  it('reports matched terms and excludes non-matching docs', () => {
    const docs = [
      { id: 'hit', text: 'mixture of experts routing layer' },
      { id: 'miss', text: 'completely unrelated content about gardening' },
    ];
    const hits = bm25Rank(docs, 'experts routing');
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe('hit');
    expect(hits[0].matchedTerms.sort()).toEqual(['experts', 'routing']);
  });

  it('rewards rarer query terms more (IDF)', () => {
    // "common" appears in every doc (low IDF); "rareword" in only one (high IDF).
    const docs = [
      { id: 'd1', text: 'common common common common' },
      { id: 'd2', text: 'common rareword' },
      { id: 'd3', text: 'common common' },
    ];
    const hits = bm25Rank(docs, 'common rareword');
    expect(hits[0].id).toBe('d2'); // the rare-term hit wins despite fewer total terms
  });
});

describe('tokenizeText', () => {
  it('lowercases, drops stopwords + single chars, keeps hyphens', () => {
    expect(tokenizeText('The Fast-Path is A win')).toEqual(['fast-path', 'win']);
  });
});

describe('queryIndex --fulltext integration (#1494)', () => {
  let tmpDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  function entry(over: Partial<MetadataEntry>): MetadataEntry {
    return {
      path: '.aiwg/requirements/UC-001.md',
      type: 'use-case',
      phase: 'requirements',
      title: 'Doc',
      tags: [],
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
      checksum: 'deadbeefdeadbeef',
      summary: 'Summary text.',
      dependencies: [],
      dependents: [],
      ...over,
    };
  }

  function writeDoc(rel: string, frontmatter: string, body: string): void {
    const full = path.join(tmpDir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, `---\n${frontmatter}\n---\n\n${body}\n`, 'utf8');
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-fulltext-'));
    const indexDir = path.join(tmpDir, INDEX_DIR);
    fs.mkdirSync(indexDir, { recursive: true });

    // Doc A: the term "quantization" appears ONLY in the body, never in
    // title/tags/summary — the metadata-scoped path cannot find it.
    writeDoc(
      '.aiwg/requirements/UC-001.md',
      'title: Inference Doc\ntags: [inference]',
      'This document covers post-training quantization of the weight matrices in detail.',
    );
    // Doc B: a control doc with neither the term in metadata nor body.
    writeDoc(
      '.aiwg/requirements/UC-002.md',
      'title: Caching Doc\ntags: [cache]',
      'This document is entirely about response caching and has nothing else.',
    );

    const index: ArtifactIndex = {
      version: '1.0.0',
      builtAt: '2026-01-01T00:00:00Z',
      buildTimeMs: 1,
      entries: {
        '.aiwg/requirements/UC-001.md': entry({
          path: '.aiwg/requirements/UC-001.md',
          title: 'Inference Doc',
          tags: ['inference'],
          summary: 'Summary that does NOT mention the body term.',
        }),
        '.aiwg/requirements/UC-002.md': entry({
          path: '.aiwg/requirements/UC-002.md',
          title: 'Caching Doc',
          tags: ['cache'],
          summary: 'A caching document summary.',
        }),
      },
    };
    fs.writeFileSync(path.join(indexDir, 'metadata.json'), JSON.stringify(index));
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('default (metadata) mode does NOT find a body-only term', async () => {
    await queryIndex(tmpDir, { text: 'quantization' }, { json: true, backend: 'local' });
    const parsed = JSON.parse(consoleSpy.mock.calls.map((c) => c[0]).join(''));
    expect(parsed.mode).toBe('metadata');
    expect(parsed.results).toHaveLength(0);
  });

  it('--fulltext finds the body-only term and reports mode + matched', async () => {
    await queryIndex(tmpDir, { text: 'quantization', fulltext: true }, { json: true, backend: 'local' });
    const parsed = JSON.parse(consoleSpy.mock.calls.map((c) => c[0]).join(''));
    expect(parsed.mode).toBe('fulltext');
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].path).toBe('.aiwg/requirements/UC-001.md');
    expect(parsed.results[0].matched).toContain('quantization');
    expect(parsed.results[0].score).toBeCloseTo(1.0, 6);
  });

  it('--fulltext respects filter flags as the candidate set', async () => {
    // Restrict candidates by tag; the matching doc is excluded → no hit.
    await queryIndex(tmpDir, { text: 'quantization', fulltext: true, tags: ['cache'] }, { json: true, backend: 'local' });
    const parsed = JSON.parse(consoleSpy.mock.calls.map((c) => c[0]).join(''));
    expect(parsed.results).toHaveLength(0);
  });

  it('--fulltext skips entries whose source file is missing (stale index)', async () => {
    // Add an index entry with no backing file; must not throw.
    const indexPath = path.join(tmpDir, INDEX_DIR, 'metadata.json');
    const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as ArtifactIndex;
    idx.entries['.aiwg/requirements/GHOST.md'] = entry({
      path: '.aiwg/requirements/GHOST.md',
      title: 'Ghost',
      summary: 'quantization in summary',
    });
    fs.writeFileSync(indexPath, JSON.stringify(idx));
    await queryIndex(tmpDir, { text: 'quantization', fulltext: true }, { json: true, backend: 'local' });
    const parsed = JSON.parse(consoleSpy.mock.calls.map((c) => c[0]).join(''));
    // Only the real on-disk body hit; the ghost (file missing) is skipped.
    expect(parsed.results.map((r: { path: string }) => r.path)).toEqual(['.aiwg/requirements/UC-001.md']);
  });
});
