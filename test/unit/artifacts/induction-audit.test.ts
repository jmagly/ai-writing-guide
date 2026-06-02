/**
 * Induction quality: per-type depth audit + frontmatter backfill (#1504).
 * The audit consumes the #1509 source-type registry for per-type required
 * sections — demonstrating a registry consumer end-to-end.
 *
 * @source @src/artifacts/corpus-tools/induction-audit.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { auditInductions, backfillFrontmatter } from '../../../src/artifacts/corpus-tools/induction-audit.js';

let root: string;

function analysis(refId: string, body: string, slug = 'paper'): void {
  const f = join(root, 'documentation', 'references', `${refId}-${slug}.md`);
  mkdirSync(join(f, '..'), { recursive: true });
  writeFileSync(f, body);
}
function sidecar(refId: string): void {
  const f = join(root, 'documentation', 'citations', `${refId}-citations.md`);
  mkdirSync(join(f, '..'), { recursive: true });
  writeFileSync(f, `---\nref: ${refId}\n---\n## Outgoing\n## Incoming\n`);
}
function pdf(refId: string): void {
  const f = join(root, 'pdfs', 'full', `${refId}-paper.pdf`);
  mkdirSync(join(f, '..'), { recursive: true });
  writeFileSync(f, 'PDF');
}
function by(refId: string, results: ReturnType<typeof auditInductions>) {
  return results.find((r) => r.ref === refId)!;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-induct-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('auditInductions — per-type required sections (#1504 consumes #1509)', () => {
  it('checks a paper against the paper required-section set', () => {
    // 100-line paper with Citation + Summary but no Benchmark Results / Comparison.
    const body = ['---', 'source_type: conference-paper', '---', '# REF-001: A Paper', '', '## 1. Citation', 'x', '', '## 4. Executive Summary', 'y', ...Array(90).fill('filler')].join('\n');
    analysis('REF-001', body);
    sidecar('REF-001');
    pdf('REF-001');
    const r = by('REF-001', auditInductions(root, { refs: ['REF-001'] }));
    expect(r.sourceType).toBe('paper');
    expect(r.issues).toEqual([]); // structural OK, not a stub
    // "Citation" + "Summary" present; "Benchmark Results"/"Comparison…"/"Key Contributions" missing.
    expect(r.missingSections).toContain('Benchmark Results');
    expect(r.missingSections).toContain('Comparison with Related Work');
    expect(r.missingSections).not.toContain('Citation');
    expect(r.missingSections).not.toContain('Summary');
  });

  it('does NOT flag a blog for paper-only sections (type-aware)', () => {
    const body = ['---', 'source_type: blog-post', '---', '# REF-002: A Blog', '', '## Citation', 'x', '', '## Executive Summary', 'y', '', '## Key Claim', 'z', '', '## Practical Relevance', 'w', ...Array(90).fill('filler')].join('\n');
    analysis('REF-002', body, 'blog');
    sidecar('REF-002');
    const r = by('REF-002', auditInductions(root, { refs: ['REF-002'] }));
    expect(r.sourceType).toBe('blog');
    // Blog required: Citation, Executive Summary, Key Claim, Practical Relevance — all present.
    expect(r.missingSections).toEqual([]);
    // Blog is web-acquired → no PDF expected, but our audit still flags missing PDF
    // unless excluded; blog isn't in the legacy-excluded set, so MISSING-PDF is expected.
    expect(r.issues).toContain('MISSING-PDF');
  });

  it('flags a stub (under 80 lines) and missing sidecar/pdf', () => {
    analysis('REF-003', '# REF-003: Stub\n\n## 1. Citation\nshort\n');
    const r = by('REF-003', auditInductions(root, { refs: ['REF-003'] }));
    expect(r.depthBand).toBe('STUB');
    expect(r.issues).toContain('below-80-line-stub-threshold');
    expect(r.issues).toContain('MISSING-SIDECAR');
    expect(r.issues).toContain('MISSING-PDF');
  });

  it('exempts meta docs (redirect/stub-role) from section checks', () => {
    analysis('REF-004', '---\ntype: redirect\n---\n# REF-004\n\nMERGED INTO REF-001\n');
    sidecar('REF-004');
    const r = by('REF-004', auditInductions(root, { refs: ['REF-004'] }));
    expect(r.sourceType).toBe('meta');
    expect(r.missingSections).toEqual([]); // exempt
    expect(r.pdfExcluded).toBe(true); // legacy redirect type excludes PDF
    expect(r.issues).not.toContain('MISSING-PDF');
  });

  it('flags a missing analysis doc', () => {
    sidecar('REF-005');
    const r = by('REF-005', auditInductions(root, { refs: ['REF-005'] }));
    expect(r.analysisExists).toBe(false);
    expect(r.issues).toContain('MISSING-ANALYSIS-DOC');
  });
});

describe('backfillFrontmatter (#1504)', () => {
  it('adds minimal frontmatter to a legacy doc; dry-run does not write', () => {
    analysis('REF-010', '# REF-010: Legacy Title\n\n## 1. Citation\n\nSmith, J. (2021). Legacy Title.\n');
    const dry = backfillFrontmatter(root);
    expect(dry.changed).toEqual(['REF-010']);
    expect(readFileSync(join(root, 'documentation/references/REF-010-paper.md'), 'utf-8').startsWith('---')).toBe(false);

    const wrote = backfillFrontmatter(root, { write: true, date: '2026-06-02' });
    expect(wrote.changed).toEqual(['REF-010']);
    const out = readFileSync(join(root, 'documentation/references/REF-010-paper.md'), 'utf-8');
    expect(out).toMatch(/^---\nref_id: REF-010\n/);
    expect(out).toContain('title: "Legacy Title"');
    expect(out).toContain('year: 2021');
  });

  it('skips docs that already have frontmatter', () => {
    analysis('REF-011', '---\nref_id: REF-011\n---\n# REF-011: Already\n');
    const r = backfillFrontmatter(root);
    expect(r.skippedExisting).toBe(1);
    expect(r.changed).toEqual([]);
  });

  it('records a holdout when title or year cannot be extracted', () => {
    analysis('REF-012', 'no heading, no year, just prose\n');
    const r = backfillFrontmatter(root);
    expect(r.holdouts.map((h) => h.ref)).toContain('REF-012');
  });
});
