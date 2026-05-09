/**
 * Semantic enrichment tests — prompt validation + sidecar store.
 *
 * @implements #1204
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ENRICHMENT_PROMPT, validateEnrichmentOutput } from '../../../src/artifacts/enrichment/prompt.js';
import {
  computeContentHash,
  get,
  has,
  list,
  put,
  remove,
  reset,
  resolveSemanticRoot,
  sanitizeId,
} from '../../../src/artifacts/enrichment/store.js';
import type { SemanticFields } from '../../../src/artifacts/enrichment/types.js';

const fields = (overrides: Partial<SemanticFields> = {}): SemanticFields => ({
  summary:         'A brief summary',
  declaredSymbols: ['fooFunc', 'BarType'],
  citations:       ['REF-001', 'src/auth/login.ts'],
  inferredTags:    ['authentication'],
  openQuestions:   [],
  enrichedAt:      '2026-05-09T00:00:00Z',
  enrichedBy:      'rlm-batch',
  enrichedHash:    'a'.repeat(64),
  ...overrides,
});

describe('enrichment prompt', () => {
  it('canonical prompt is a non-empty string', () => {
    expect(ENRICHMENT_PROMPT.length).toBeGreaterThan(100);
    expect(ENRICHMENT_PROMPT).toContain('summary');
    expect(ENRICHMENT_PROMPT).toContain('declared_symbols');
    expect(ENRICHMENT_PROMPT).toContain('citations');
    expect(ENRICHMENT_PROMPT).toContain('inferred_tags');
    expect(ENRICHMENT_PROMPT).toContain('open_questions');
  });

  it('validates well-formed output as ok', () => {
    const issues = validateEnrichmentOutput({
      summary: 'a',
      declared_symbols: [],
      citations: [],
      inferred_tags: [],
      open_questions: [],
    });
    expect(issues).toEqual([]);
  });

  it('rejects non-object input', () => {
    expect(validateEnrichmentOutput(null)).not.toEqual([]);
    expect(validateEnrichmentOutput('string')).not.toEqual([]);
    expect(validateEnrichmentOutput([])).toEqual(expect.arrayContaining([
      expect.stringContaining('summary'),
    ]));
  });

  it('rejects missing summary', () => {
    const issues = validateEnrichmentOutput({
      declared_symbols: [],
      citations: [],
      inferred_tags: [],
      open_questions: [],
    });
    expect(issues).toContain('summary must be a string');
  });

  it('rejects non-array citation field', () => {
    const issues = validateEnrichmentOutput({
      summary: 'a',
      declared_symbols: [],
      citations: 'oops',
      inferred_tags: [],
      open_questions: [],
    });
    expect(issues).toContain('citations must be a string array');
  });

  it('rejects non-string array entries', () => {
    const issues = validateEnrichmentOutput({
      summary: 'a',
      declared_symbols: [42],
      citations: [],
      inferred_tags: [],
      open_questions: [],
    });
    expect(issues).toContain('declared_symbols must contain only strings');
  });
});

describe('enrichment store', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'aiwg-enrichment-test-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('round-trips put → has → get', () => {
    const f = fields();
    put(root, 'src/auth/login.ts', f);
    expect(has(root, 'src/auth/login.ts')).toBe(true);
    const got = get(root, 'src/auth/login.ts');
    expect(got.summary).toBe('A brief summary');
    expect(got.declaredSymbols).toEqual(['fooFunc', 'BarType']);
  });

  it('sanitizes id paths to filesystem-safe names', () => {
    expect(sanitizeId('src/auth/login.ts')).toBe('src__auth__login.ts');
    expect(sanitizeId('REF-001')).toBe('REF-001');
    expect(sanitizeId('foo bar/baz')).toBe('foo_bar__baz');
  });

  it('remove returns false when nothing to remove', () => {
    expect(remove(root, 'nope')).toBe(false);
    put(root, 'a', fields());
    expect(remove(root, 'a')).toBe(true);
    expect(has(root, 'a')).toBe(false);
  });

  it('reset wipes all enrichment data', () => {
    put(root, 'a', fields());
    put(root, 'b', fields());
    const r = reset(root);
    expect(r.removed).toBe(2);
  });

  it('list flags stale entries when current hash differs', () => {
    put(root, 'src/foo.ts', fields({ enrichedHash: 'a'.repeat(64) }));
    const summaries = list(
      root,
      { 'src/foo.ts': 'b'.repeat(64) },     // current hash differs → stale
      new Date('2026-05-10T00:00:00Z'),
    );
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.isStale).toBe(true);
  });

  it('list marks entries as fresh when hashes match', () => {
    put(root, 'src/foo.ts', fields({ enrichedHash: 'a'.repeat(64) }));
    const summaries = list(
      root,
      { 'src/foo.ts': 'a'.repeat(64) },
      new Date('2026-05-10T00:00:00Z'),
    );
    expect(summaries[0]?.isStale).toBe(false);
  });

  it('computeContentHash is deterministic sha256', () => {
    const h1 = computeContentHash('hello world');
    const h2 = computeContentHash('hello world');
    expect(h1).toEqual(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(computeContentHash('different')).not.toEqual(h1);
  });

  it('resolveSemanticRoot returns absolute path', () => {
    expect(resolveSemanticRoot('/some/proj')).toBe('/some/proj/.aiwg/index/semantic');
  });
});
