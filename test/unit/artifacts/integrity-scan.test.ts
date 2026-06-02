/**
 * Corpus integrity / submission-risk scan (#1506).
 *
 * @source @src/artifacts/corpus-tools/integrity-scan.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  scanCorpus,
  writeQuarantineReports,
  failsThreshold,
  loadIntegrityPatterns,
  DEFAULT_INTEGRITY_PATTERNS,
} from '../../../src/artifacts/corpus-tools/integrity-scan.js';

let root: string;

function doc(rel: string, body: string): void {
  const f = join(root, rel);
  mkdirSync(join(f, '..'), { recursive: true });
  writeFileSync(f, body);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-integrity-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('scanCorpus (#1506)', () => {
  it('flags a critical LLM meta-comment as quarantine', () => {
    doc('documentation/references/REF-001-paper.md', '# REF-001\n\nReal text.\nAs an AI language model, I cannot verify this.\n');
    const r = scanCorpus(root);
    const rec = r.summary['REF-001'];
    expect(rec.highestSeverity).toBe('critical');
    expect(rec.recommendation).toBe('quarantine');
    expect(rec.categories['llm-meta-comment']).toBe(1);
  });

  it('flags template residue + citation-needed as review (high, score>=20)', () => {
    doc('documentation/references/REF-002-paper.md', '# REF-002\n\nTODO: add the methodology.\n[citation needed]\n');
    const rec = scanCorpus(root).summary['REF-002'];
    expect(rec.highestSeverity).toBe('high');
    expect(rec.recommendation).toBe('quarantine'); // 25+25=50 + high → quarantine
    expect(Object.keys(rec.categories).sort()).toEqual(['citation-risk', 'template-residue']);
  });

  it('a lone low-severity ai-disclosure stays pass', () => {
    doc('documentation/references/REF-003-paper.md', '# REF-003\n\nThis paper studies Claude and Gemini behavior.\n');
    const rec = scanCorpus(root).summary['REF-003'];
    expect(rec.highestSeverity).toBe('low');
    // weight 2 per hit, 2 hits = 4 < 20, no high → pass
    expect(rec.recommendation).toBe('pass');
  });

  it('reports clean corpus with no findings', () => {
    doc('documentation/references/REF-004-paper.md', '# REF-004\n\nA careful, finished analysis with real results.\n');
    const r = scanCorpus(root);
    expect(r.findings).toHaveLength(0);
    expect(Object.keys(r.summary)).toHaveLength(0);
  });

  it('--ref limits the scan to matching paths', () => {
    doc('documentation/references/REF-001-paper.md', '# REF-001\n\nTBD\n');
    doc('documentation/references/REF-002-paper.md', '# REF-002\n\nTBD\n');
    const r = scanCorpus(root, { ref: 'REF-002' });
    expect(Object.keys(r.summary)).toEqual(['REF-002']);
  });

  it('caps per-REF score at 100', () => {
    const spam = Array.from({ length: 20 }, () => 'replace with actual data').join('\n');
    doc('documentation/references/REF-005-paper.md', `# REF-005\n\n${spam}\n`);
    expect(scanCorpus(root).summary['REF-005'].score).toBe(100);
  });
});

describe('quarantine reports + fail-on (#1506)', () => {
  beforeEach(() => {
    doc('documentation/references/REF-010-paper.md', '# REF-010\n\nAs an AI language model, here is a 500 word summary.\n');
    doc('documentation/references/REF-011-paper.md', '# REF-011\n\nThis surveys Claude usage.\n'); // low → pass
  });

  it('writes a per-REF quarantine report only for quarantine REFs (source untouched)', () => {
    const r = scanCorpus(root);
    const written = writeQuarantineReports(root, r);
    expect(written).toEqual(['.aiwg/research/quarantine/REF-010-llm-artifact-scan.md']);
    const report = readFileSync(join(root, written[0]), 'utf-8');
    expect(report).toContain('recommendation: quarantine');
    expect(report).toContain('| critical | llm-meta-comment |');
    // REF-011 (pass) got no report
    expect(existsSync(join(root, '.aiwg/research/quarantine/REF-011-llm-artifact-scan.md'))).toBe(false);
  });

  it('failsThreshold reflects the worst recommendation', () => {
    const r = scanCorpus(root);
    expect(failsThreshold(r, 'quarantine')).toBe(true);
    expect(failsThreshold(r, 'review')).toBe(true); // quarantine counts for review threshold too
  });
});

describe('pattern catalog externalization (#1506)', () => {
  it('uses the built-in default when no override file is present', () => {
    const patterns = loadIntegrityPatterns(root);
    expect(patterns).toHaveLength(DEFAULT_INTEGRITY_PATTERNS.length);
  });

  it('a documentation/integrity-patterns.yaml override replaces the default catalog', () => {
    doc(
      'documentation/integrity-patterns.yaml',
      '- category: custom-flag\n  severity: critical\n  weight: 50\n  regex: "\\\\bsecret-marker\\\\b"\n  description: Custom marker\n',
    );
    const patterns = loadIntegrityPatterns(root);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].category).toBe('custom-flag');

    doc('documentation/references/REF-020-paper.md', '# REF-020\n\nthis has a secret-marker in it\n');
    // Default patterns no longer in effect; custom one fires.
    const rec = scanCorpus(root).summary['REF-020'];
    expect(rec.categories['custom-flag']).toBe(1);
    expect(rec.recommendation).toBe('quarantine');
  });
});
