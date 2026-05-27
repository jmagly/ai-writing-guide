/**
 * funder-network tests (#1500).
 *
 * @source @src/artifacts/corpus-tools/funder-network.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { funderRows, cofundingClusters, renderFunderNetwork } from '../../../src/artifacts/corpus-tools/funder-network.js';

let root: string;

function w(rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}
function ref(id: string, grade: string, topic: string, year: number): void {
  w(`documentation/references/${id}-x.md`, `---\ntitle: T\nyear: ${year}\ntopics: [${topic}]\n---\n# ${id}\n- **Quality**: ${grade}\n`);
}
/** citation sidecar with a funders block (raw yaml) + outgoing edges. */
function cite(id: string, fundersYaml: string, cites: string[] = []): void {
  const rows = cites.map((c, i) => `| ${i + 1} | x | ${c} |`).join('\n');
  w(`documentation/citations/${id}-citations.md`, `---\nref: ${id}\ntitle: T\n${fundersYaml}---\n# ${id}\n## Outgoing\n| # | Title | REF |\n${rows}\n## Incoming\n`);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-funder-'));
  ref('REF-100', 'A', 'transformers', 2021);
  ref('REF-101', 'B', 'transformers', 2022);
  ref('REF-102', 'A', 'rlhf', 2022);
  ref('REF-103', 'C', 'rlhf', 2023);
  // REF-100 co-funded (PROF-F-nsf dict + DARPA string); cited by 101/102/103 (CD has >=3 citers).
  cite('REF-100', 'funders:\n  - id: PROF-F-nsf\n    grant-id: "NSF-123"\n  - DARPA\n');
  cite('REF-101', 'funders:\n  - id: PROF-F-nsf\n', ['REF-100']);
  cite('REF-102', '', ['REF-100', 'REF-101']);
  cite('REF-103', '', ['REF-100']);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('funderRows', () => {
  it('rolls up papers/A-grade/mean-grade and CD-index per funder (both funder shapes)', () => {
    const rows = funderRows(root);
    const byId = Object.fromEntries(rows.map((r) => [r.funderId, r]));
    expect(byId['PROF-F-nsf'].paperCount).toBe(2); // REF-100, REF-101
    expect(byId['PROF-F-nsf'].aGradeCount).toBe(1); // REF-100 is A
    expect(byId['PROF-F-nsf'].meanGrade).toBe(3.5); // (A=4 + B=3)/2
    expect(byId['DARPA'].paperCount).toBe(1); // string-form funder parsed
    // REF-100 cited by 3 papers, no references -> CD = 1.0 -> above baseline
    expect(byId['PROF-F-nsf'].meanCdIndex).toBeCloseTo(1.0, 5);
    expect(byId['PROF-F-nsf'].noveltyBias).toBe('above-baseline');
  });
});

describe('cofundingClusters', () => {
  it('detects papers with >= 2 funders', () => {
    const clusters = cofundingClusters(root);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].paper).toBe('REF-100');
    expect(clusters[0].count).toBe(2);
    expect(clusters[0].funders.sort()).toEqual(['DARPA', 'PROF-F-nsf']);
  });
});

describe('renderFunderNetwork', () => {
  it('renders the funder table + co-funded section', () => {
    const out = renderFunderNetwork(funderRows(root), cofundingClusters(root));
    expect(out).toContain('# Funder Network');
    expect(out).toContain('| PROF-F-nsf |');
    expect(out).toContain('## Co-Funded Papers');
    expect(out).toContain('REF-100');
  });
});
