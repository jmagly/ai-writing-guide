/**
 * Citation-sidecar structural lint + orphan detection + metadata repair (#1503).
 *
 * @source @src/artifacts/corpus-tools/sidecar-lint.ts
 * @source @src/artifacts/corpus-tools/sidecar-repair.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  lintSidecarText,
  lintSidecars,
  findOrphans,
} from '../../../src/artifacts/corpus-tools/sidecar-lint.js';
import {
  parseAuthors,
  extractCitationBlock,
  normalizeAffiliation,
  repairAuthors,
  normalizeAffiliations,
  loadAffiliationMap,
} from '../../../src/artifacts/corpus-tools/sidecar-repair.js';

let root: string;

function sidecar(id: string, body: string): void {
  const full = join(root, 'documentation', 'citations', `${id}-citations.md`);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, body);
}
function refDoc(id: string, body: string): void {
  const full = join(root, 'documentation', 'references', `${id}-paper.md`);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, body);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-sidecar-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('lintSidecarText (#1503)', () => {
  const good = [
    '---',
    'ref: REF-001',
    'title: A Good Sidecar',
    'type: citation',
    '---',
    '',
    '## Outgoing',
    '| # | Title | REF |',
    '|---|---|---|',
    '| 1 | x | REF-002 |',
    '',
    '## Incoming',
    'None.',
    '',
  ].join('\n');

  it('passes a well-formed sidecar', () => {
    expect(lintSidecarText(good)).toEqual([]);
  });

  it('flags missing frontmatter fields', () => {
    const txt = '---\nref: REF-009\n---\n\n## Outgoing\n\n## Incoming\n';
    const issues = lintSidecarText(txt);
    expect(issues).toContain('frontmatter-missing-title');
    expect(issues).toContain('frontmatter-missing-type');
  });

  it('flags missing Outgoing/Incoming sections', () => {
    const txt = '---\nref: REF-009\ntitle: T\ntype: citation\n---\n\n## Notes\nnothing\n';
    const issues = lintSidecarText(txt);
    expect(issues).toContain('missing-outgoing-section');
    expect(issues).toContain('missing-incoming-section');
  });

  it('exempts merge redirects from section requirements', () => {
    const txt = '---\nref: REF-009\ntitle: T\ntype: citation\nstatus: merged\n---\n\nMERGED INTO REF-008\n';
    expect(lintSidecarText(txt)).toEqual([]);
  });

  it('detects duplicate table headers under one sub-header', () => {
    const txt = [
      '---', 'ref: REF-009', 'title: T', 'type: citation', '---', '',
      '## Outgoing',
      '| # | Title | REF |',
      '| 1 | a | REF-002 |',
      '| # | Title | REF |', // doubled-append signature: second header, no intervening sub-header
      '| 2 | b | REF-003 |',
      '', '## Incoming', 'None.', '',
    ].join('\n');
    expect(lintSidecarText(txt)).toContain('duplicate-table-headers-count=1');
  });

  it('accepts the same table header under distinct sub-headers (not a dupe)', () => {
    const txt = [
      '---', 'ref: REF-009', 'title: T', 'type: citation', '---', '',
      '## Outgoing',
      '### Papers',
      '| # | Title | REF |',
      '| 1 | a | REF-002 |',
      '### Resources',
      '| # | Title | REF |',
      '| 2 | b | REF-003 |',
      '', '## Incoming', 'None.', '',
    ].join('\n');
    expect(lintSidecarText(txt).filter((i) => i.startsWith('duplicate-table-headers'))).toEqual([]);
  });
});

describe('lintSidecars + findOrphans over a corpus root (#1503)', () => {
  it('aggregates issues by type and finds zero-edge orphans', () => {
    sidecar('REF-001', '---\nref: REF-001\ntitle: T\ntype: citation\n---\n\n## Outgoing\n| # | Title | REF |\n|---|---|---|\n| 1 | x | REF-002 |\n\n## Incoming\nNone.\n');
    sidecar('REF-002', '---\nref: REF-002\n---\n\n## Notes\nbroken\n'); // missing title/type + sections
    // Orphan: valid frontmatter, no edges in either section.
    sidecar('REF-003', '---\nref: REF-003\ntitle: Lonely\ntype: citation\n---\n\n## Outgoing\nNone.\n\n## Incoming\nNone.\n');
    refDoc('REF-003', '# REF-003: Lonely Paper Title\n\nbody\n');

    const lint = lintSidecars(root);
    expect(lint.totalFiles).toBe(3);
    expect(lint.byIssue['frontmatter-missing-title']).toContain('REF-002');
    expect(lint.byIssue['missing-outgoing-section']).toContain('REF-002');

    const orphans = findOrphans(root);
    const ids = orphans.map((o) => o.ref);
    expect(ids).toContain('REF-003');
    expect(ids).not.toContain('REF-001'); // has an outgoing edge
    expect(orphans.find((o) => o.ref === 'REF-003')!.title).toBe('Lonely Paper Title');
  });
});

describe('parseAuthors / extractCitationBlock (#1503)', () => {
  // NOTE: the faithful port strips trailing periods from each assembled author
  // (Python `rstrip(",.")`), so a final initial loses its dot ("Hinton, G." →
  // "Hinton, G"). This is parity behavior — the section9 corpus was processed
  // by the original script, so matching it keeps the tool idempotent.
  it('parses surname + initials pairs (trailing dot stripped, per source parity)', () => {
    expect(parseAuthors('Vaswani, A., Shazeer, N. (2017). Attention Is All You Need.')).toEqual([
      'Vaswani, A',
      'Shazeer, N',
    ]);
  });
  it('handles & / and / et al', () => {
    expect(parseAuthors('Brown, T. & Mann, B. et al. (2020). Language Models.')).toEqual([
      'Brown, T',
      'Mann, B',
    ]);
  });
  it('treats a single institutional author as one entry', () => {
    expect(parseAuthors('OpenAI (2023). GPT-4 Technical Report.')).toEqual(['OpenAI']);
  });
  it('extracts the Citation section body', () => {
    const doc = '# REF-001: X\n\n## 1. Citation\n\nVaswani, A. (2017). Title.\n\n## 2. Summary\n\nbody\n';
    expect(extractCitationBlock(doc)).toBe('Vaswani, A. (2017). Title.');
  });
});

describe('normalizeAffiliation + repair over a corpus root (#1503)', () => {
  it('resolves variant names to canonical PROF-O slugs; leaves ambiguous alone', () => {
    const rev = loadAffiliationMap(root); // no override file → default map
    expect(normalizeAffiliation('DeepMind', rev)).toBe('PROF-O-google-deepmind');
    expect(normalizeAffiliation('PROF-O-openai', rev)).toBe('PROF-O-openai'); // already canonical
    expect(normalizeAffiliation('Some Uni; Other Lab', rev)).toBeNull(); // compound → skip
    expect(normalizeAffiliation('Unknown Place', rev)).toBeNull();
  });

  it('a data-file override replaces the default map', () => {
    const f = join(root, 'documentation', 'profiles', 'orgs', 'affiliation-map.yaml');
    mkdirSync(join(f, '..'), { recursive: true });
    writeFileSync(f, 'PROF-O-acme:\n  - "acme labs"\n');
    const rev = loadAffiliationMap(root);
    expect(normalizeAffiliation('Acme Labs', rev)).toBe('PROF-O-acme');
    expect(normalizeAffiliation('DeepMind', rev)).toBeNull(); // default no longer in effect
  });

  it('repairAuthors backfills (see REF doc) from the analysis citation block (dry-run by default)', () => {
    sidecar('REF-010', '---\nref: REF-010\ntitle: T\ntype: citation\nauthors:\n  - name: "(see REF doc)"\n---\n\n## Outgoing\n\n## Incoming\n');
    refDoc('REF-010', '# REF-010: X\n\n## Citation\n\nHinton, G., LeCun, Y. (2015). Deep Learning.\n\n## Summary\n');
    const results = repairAuthors(root); // dry-run
    const r = results.find((x) => x.ref === 'REF-010')!;
    expect(r.ok).toBe(true);
    expect(r.authors).toEqual(['Hinton, G', 'LeCun, Y']); // trailing dot stripped (source parity)
    // dry-run did not write
    expect(readFileSync(join(root, 'documentation/citations/REF-010-citations.md'), 'utf-8')).toContain('(see REF doc)');
  });

  it('repairAuthors --write persists the parsed authors', () => {
    sidecar('REF-010', '---\nref: REF-010\ntitle: T\ntype: citation\nauthors:\n  - name: "(see REF doc)"\n---\n\n## Outgoing\n\n## Incoming\n');
    refDoc('REF-010', '# REF-010: X\n\n## Citation\n\nHinton, G. (2015). Deep Learning.\n\n## Summary\n');
    repairAuthors(root, { write: true });
    const out = readFileSync(join(root, 'documentation/citations/REF-010-citations.md'), 'utf-8');
    expect(out).toContain('- name: "Hinton, G"'); // trailing dot stripped (source parity)
    expect(out).not.toContain('(see REF doc)');
  });

  it('normalizeAffiliations --write canonicalizes affiliation-primary', () => {
    sidecar('REF-011', '---\nref: REF-011\ntitle: T\ntype: citation\naffiliation-primary: "DeepMind"\n---\n\n## Outgoing\n\n## Incoming\n');
    const res = normalizeAffiliations(root, { write: true });
    expect(res.normalized).toBe(1);
    expect(res.changes[0]).toMatchObject({ ref: 'REF-011', to: 'PROF-O-google-deepmind' });
    expect(readFileSync(join(root, 'documentation/citations/REF-011-citations.md'), 'utf-8')).toContain(
      'affiliation-primary: PROF-O-google-deepmind',
    );
  });
});
