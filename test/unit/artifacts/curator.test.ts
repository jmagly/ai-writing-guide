/**
 * Curator (PROF-S) tooling tests (#1499).
 *
 * @source @src/artifacts/corpus-tools/curator.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { curatorRows, curatorOrphans, renderCuratorStatus, scaffoldCurator, curatorSlug } from '../../../src/artifacts/corpus-tools/curator.js';

let root: string;
const TODAY = '2026-05-26';

function w(rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}
function daysAgo(n: number): string {
  return new Date(new Date(`${TODAY}T00:00:00Z`).getTime() - n * 86_400_000).toISOString().slice(0, 10);
}
/** citation sidecar with optional discovery.curator-id */
function cite(id: string, curatorId?: string): void {
  const disc = curatorId ? `discovery:\n  date: ${TODAY}\n  surface: x-account\n  curator-id: ${curatorId}\n` : '';
  w(`documentation/citations/${id}-citations.md`, `---\nref: ${id}\ntitle: T\n${disc}---\n# ${id}\n## Outgoing\n## Incoming\n`);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-curator-'));
  // Analysis docs with GRADE.
  w('documentation/references/REF-100-x.md', `# REF-100\n- **Quality**: A\n`);
  w('documentation/references/REF-101-x.md', `# REF-101\n- **Quality**: B\n`);
  w('documentation/references/REF-102-x.md', `# REF-102\n- **Quality**: A\n`);
  w('documentation/references/REF-103-x.md', `# REF-103\n- **Quality**: C\n`);
  // PROF-S curator with two inducted refs.
  w(
    'documentation/profiles/sources/PROF-S-alice.md',
    `---\nprof-id: PROF-S-alice\nname: Alice\ntype: source\nplatform: x\nhandle: "@alice"\ncorpus-refs: ['REF-100', 'REF-101']\nsignal-quality: A\nrevisit-cadence: weekly\nlast-harvested: ${daysAgo(20)}\n---\n# Alice\n`,
  );
  // Sidecars: REF-100/101 properly attributed; REF-102 orphan (not in alice's refs); REF-103 ghost curator.
  cite('REF-100', 'PROF-S-alice');
  cite('REF-101', 'PROF-S-alice');
  cite('REF-102', 'PROF-S-alice'); // orphan: not in corpus-refs
  cite('REF-103', 'PROF-S-ghost'); // orphan: no profile
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('curatorRows', () => {
  it('computes yield, avg GRADE, return-to score, and revisit staleness', () => {
    const rows = curatorRows(root, { today: TODAY });
    expect(rows).toHaveLength(1);
    const a = rows[0];
    expect(a.profId).toBe('PROF-S-alice');
    expect(a.inductedCount).toBe(2);
    expect(a.avgGrade).toBe(3.5); // (A=4 + B=3)/2
    expect(a.returnToScore).toBe(7); // 2 * 3.5
    expect(a.overdueDays).toBe(13); // weekly(7), last 20d ago
    expect(a.isStale).toBe(true);
  });
});

describe('curatorOrphans', () => {
  it('flags only curator-id-set sidecars where the curator is missing the REF', () => {
    const orphans = curatorOrphans(root);
    const byRef = Object.fromEntries(orphans.map((o) => [o.refId, o.reason]));
    expect(byRef['REF-102']).toMatch(/missing from curator/);
    expect(byRef['REF-103']).toMatch(/no PROF-S profile/);
    // REF-100/101 are correctly attributed -> not orphans.
    expect(byRef['REF-100']).toBeUndefined();
    expect(byRef['REF-101']).toBeUndefined();
  });

  it('renders a status report with the orphan section', () => {
    const out = renderCuratorStatus(curatorRows(root, { today: TODAY }), curatorOrphans(root));
    expect(out).toContain('| PROF-S-alice |');
    expect(out).toContain('## Discovery orphans');
    expect(out).toContain('REF-102');
  });
});

describe('curatorSlug', () => {
  it('normalizes handles', () => {
    expect(curatorSlug('@_akhaliq')).toBe('akhaliq');
    expect(curatorSlug('@rohanpaul_ai')).toBe('rohanpaul-ai');
    expect(curatorSlug('x.com/@CyberSoma1024')).toBe('x-com-cybersoma1024');
  });
});

describe('scaffoldCurator', () => {
  it('scaffolds a PROF-S profile (dry-run, then write)', () => {
    const dry = scaffoldCurator(root, '@newbot', { today: TODAY });
    expect(dry.status).toBe('dry-run');
    expect(dry.slug).toBe('newbot');
    expect(dry.content).toContain('prof-id: PROF-S-newbot');
    expect(dry.content).toContain('type: source');
    expect(dry.content).toContain('revisit-cadence: weekly');

    const wrote = scaffoldCurator(root, '@newbot', { today: TODAY, write: true });
    expect(wrote.status).toBe('wrote');
    expect(existsSync(join(root, 'documentation/profiles/sources/PROF-S-newbot.md'))).toBe(true);
    expect(scaffoldCurator(root, '@newbot', { today: TODAY, write: true }).status).toBe('skip');
  });
});
