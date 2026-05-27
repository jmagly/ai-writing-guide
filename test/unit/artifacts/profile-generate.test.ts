/**
 * profile-generate tests (#1502) — build_tier1_profiles port.
 *
 * @source @src/artifacts/corpus-tools/profile-generate.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateTier1Profiles, slugifyAuthor } from '../../../src/artifacts/corpus-tools/profile-generate.js';

let root: string;
const TODAY = '2026-05-26';

function ref(id: string, title: string): void {
  writeFileSync(join(root, 'documentation', 'references', `${id}-x.md`), `---\ntitle: ${title}\nyear: 2020\n---\n# ${id}\n`);
}

/** Citation sidecar with authors + an Outgoing section citing `cites`. */
function cite(id: string, authors: string[], cites: string[] = []): void {
  const authorLines = authors.map((a) => `  - name: "${a}"`).join('\n');
  const outRows = cites.map((c, i) => `| ${i + 1} | x | ${c} |`).join('\n');
  writeFileSync(
    join(root, 'documentation', 'citations', `${id}-citations.md`),
    `---\nref: ${id}\ntitle: T\nauthors:\n${authorLines}\n---\n# ${id}\n## Outgoing\n| # | Title | REF |\n${outRows}\n## Incoming\n| # | Title | REF |\n`,
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-profgen-'));
  for (const d of ['documentation/references', 'documentation/citations', 'documentation/profiles/people']) {
    mkdirSync(join(root, d), { recursive: true });
  }
  // Hub REF-100 (Vaswani) cited by 101, 102 -> in-degree 2.
  ref('REF-100', 'Attention'); cite('REF-100', ['Vaswani, Ashish']);
  ref('REF-101', 'Beta'); cite('REF-101', ['Lee, Sam'], ['REF-100']);
  ref('REF-102', 'Gamma'); cite('REF-102', ['Ng, Pat'], ['REF-100']);
  // Institutional hub REF-103 (OpenAI Team) cited by 104, 105 -> in-degree 2, must be skipped.
  ref('REF-103', 'Delta'); cite('REF-103', ['OpenAI Team']);
  ref('REF-104', 'Eps'); cite('REF-104', ['A, B'], ['REF-103']);
  ref('REF-105', 'Zeta'); cite('REF-105', ['C, D'], ['REF-103']);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('slugifyAuthor', () => {
  it('handles "Last, First" and "First Last"', () => {
    expect(slugifyAuthor('Vaswani, Ashish')).toBe('vaswani-ashish');
    expect(slugifyAuthor('Ashish Vaswani')).toBe('vaswani-ashish');
    expect(slugifyAuthor("O'Brien, Sean P.")).toBe('obrien-sean');
  });
});

describe('generateTier1Profiles', () => {
  it('generates a profile for the top hub primary author and skips institutional authors', () => {
    const results = generateTier1Profiles(root, { today: TODAY });
    // OpenAI Team (REF-103) is skipped; Vaswani (REF-100) is generated.
    expect(results.map((r) => r.slug)).toEqual(['vaswani-ashish']);
    const r = results[0];
    expect(r.status).toBe('dry-run');
    expect(r.content).toContain('prof-id: PROF-P-vaswani-ashish');
    expect(r.content).toContain("corpus-refs: ['REF-100']");
    expect(r.content).toContain('corpus in-degree 2'); // cited by 101 + 102
  });

  it('writes the profile with --write and skips when it already exists', () => {
    const first = generateTier1Profiles(root, { today: TODAY, write: true });
    expect(first[0].status).toBe('wrote');
    expect(existsSync(join(root, 'documentation/profiles/people/PROF-P-vaswani-ashish.md'))).toBe(true);

    const again = generateTier1Profiles(root, { today: TODAY, write: true });
    // Existing slug is filtered out before generation, so no candidate remains.
    expect(again.find((r) => r.slug === 'vaswani-ashish')).toBeUndefined();
  });

  it('respects --limit', () => {
    const results = generateTier1Profiles(root, { today: TODAY, limit: 0 });
    expect(results).toHaveLength(0);
  });
});
