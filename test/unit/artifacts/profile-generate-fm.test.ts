/**
 * profile-generate-fm tests (#1502) — build_fm_profiles port.
 *
 * @source @src/artifacts/corpus-tools/profile-generate-fm.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateFmProfiles, loadFmConfig } from '../../../src/artifacts/corpus-tools/profile-generate-fm.js';

let root: string;
const TODAY = '2026-05-26';

function ref(id: string, title: string): void {
  writeFileSync(join(root, 'documentation', 'references', `${id}-x.md`), `---\ntitle: ${title}\nyear: 2020\n---\n# ${id}\n`);
}
function cite(id: string, authors: string[]): void {
  const al = authors.map((a) => `  - name: "${a}"`).join('\n');
  writeFileSync(join(root, 'documentation', 'citations', `${id}-citations.md`), `---\nref: ${id}\ntitle: T\nauthors:\n${al}\n---\n# ${id}\n## Outgoing\n## Incoming\n`);
}
function write(rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-fmgen-'));
  for (const d of ['documentation/references', 'documentation/citations', 'documentation/profiles/people', 'documentation/profiles/groups']) {
    mkdirSync(join(root, d), { recursive: true });
  }
  // REF-052 (GPT-3): top-2 authors profiled; 3rd is institutional and skipped.
  ref('REF-052', 'GPT-3'); cite('REF-052', ['Brown, Tom', 'Mann, Ben', 'OpenAI Team']);
  // REF-835 (Llama 3): team release -> PROF-G only.
  ref('REF-835', 'Llama 3'); cite('REF-835', ['Llama Team']);
  write(
    'documentation/profiles/fm-config.yaml',
    `fm-papers:\n  REF-052: { model: "GPT-3", top-authors: 2 }\n  REF-835: { model: "Llama 3", group: PROF-G-llama-team }\ngroups:\n  PROF-G-llama-team:\n    name: "Llama Team — AI @ Meta"\n    parent-org: "Meta AI Research"\n    parent-slug: PROF-O-meta-fair\n    refs: [REF-835]\n`,
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('loadFmConfig', () => {
  it('parses fm-papers and groups; absent file -> empty', () => {
    const cfg = loadFmConfig(root);
    expect(cfg.fmPapers.get('REF-052')).toEqual({ model: 'GPT-3', topAuthors: 2, group: undefined });
    expect(cfg.fmPapers.get('REF-835')?.group).toBe('PROF-G-llama-team');
    expect(cfg.groups[0]).toMatchObject({ slug: 'PROF-G-llama-team', parentOrg: 'Meta AI Research', refs: ['REF-835'] });

    const bare = mkdtempSync(join(tmpdir(), 'aiwg-fmbare-'));
    try {
      expect(loadFmConfig(bare).fmPapers.size).toBe(0);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});

describe('generateFmProfiles', () => {
  it('generates PROF-P for top-N FM authors (skipping institutional) + PROF-G for groups', () => {
    const results = generateFmProfiles(root, { today: TODAY });
    const slugs = results.map((r) => r.slug);
    expect(slugs).toContain('PROF-P-brown-tom');
    expect(slugs).toContain('PROF-P-mann-ben');
    expect(slugs).toContain('PROF-G-llama-team');
    expect(slugs).not.toContain('PROF-P-team-openai'); // "OpenAI Team" is institutional + beyond top-2
    const group = results.find((r) => r.slug === 'PROF-G-llama-team')!;
    expect(group.content).toContain('type: group');
    expect(group.content).toContain('parent-org: PROF-O-meta-fair');
    expect(group.content).toContain("corpus-refs: ['REF-835']");
  });

  it('writes files with --write and skips existing', () => {
    const first = generateFmProfiles(root, { today: TODAY, write: true });
    expect(first.every((r) => r.status === 'wrote')).toBe(true);
    expect(existsSync(join(root, 'documentation/profiles/people/PROF-P-brown-tom.md'))).toBe(true);
    expect(existsSync(join(root, 'documentation/profiles/groups/PROF-G-llama-team.md'))).toBe(true);

    const again = generateFmProfiles(root, { today: TODAY, write: true });
    expect(again.every((r) => r.status === 'skip')).toBe(true);
  });

  it('is a no-op when fm-config.yaml is absent', () => {
    rmSync(join(root, 'documentation/profiles/fm-config.yaml'));
    expect(generateFmProfiles(root, { today: TODAY })).toHaveLength(0);
  });
});
