/**
 * Corpus parser extension tests (#1497) — radar sidecars, discovery block,
 * funder linkage, profile loading, configurable corpus root.
 *
 * @source @src/artifacts/corpus-views/ref-parser.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadCorpus, loadProfiles } from '../../../src/artifacts/corpus-views/ref-parser.js';

function writeCorpus(root: string): void {
  const ref = join(root, 'documentation', 'references');
  const cit = join(root, 'documentation', 'citations');
  const radar = join(root, 'documentation', 'radar');
  const funders = join(root, 'documentation', 'profiles', 'funders');
  const sources = join(root, 'documentation', 'profiles', 'sources');
  const people = join(root, 'documentation', 'profiles', 'people');
  for (const d of [ref, cit, radar, funders, sources, people]) mkdirSync(d, { recursive: true });

  writeFileSync(join(ref, 'REF-010-alpha.md'), `---\ntitle: Alpha\nyear: 2024\nauthors: ["Lee, Sam"]\n---\n# REF-010: Alpha\n## Citation\nLee, Sam (2024). Alpha. arXiv.\n`);
  writeFileSync(join(ref, 'REF-011-beta.md'), `---\ntitle: Beta\nyear: 2023\nauthors: ["Ng, Pat"]\n---\n# REF-011: Beta\n## Citation\nNg, Pat (2023). Beta. ICML.\n`);

  // REF-010 citation: discovery block + funders[]
  writeFileSync(join(cit, 'REF-010-citations.md'), `---\nref: REF-010\ntitle: Alpha\ntype: citations\nauthors:\n  - name: "Lee, Sam"\n    affiliation: "Stanford University"\naffiliation-primary: "Stanford University"\nfunders:\n  - id: "PROF-F-nsf"\n    grant-id: "NSF IIS-2345678"\n  - "DARPA"\ndiscovery:\n  date: 2026-05-20\n  surface: x-search\n  via: "x.com/@curator"\n  curator-id: PROF-S-curator\n  harvest-batch: 2026-05-20-am\n  harvested-by: claude-opus-4-7\n---\n# REF-010 Citations\n## Outgoing\n| # | Title | Inducted REF |\n## Incoming\n| # | Title | Inducted REF |\n`);
  // REF-011 citation: no discovery/funders
  writeFileSync(join(cit, 'REF-011-citations.md'), `---\nref: REF-011\ntitle: Beta\ntype: citations\nauthors:\n  - "Ng, Pat"\n---\n# REF-011 Citations\n## Outgoing\n| # | Title | Inducted REF |\n## Incoming\n| # | Title | Inducted REF |\n`);

  // Radar sidecars: REF-010 stale (old), REF-011 fresh
  writeFileSync(join(radar, 'REF-010-radar.md'), `---\nref: REF-010\ntitle: Alpha\ntype: radar\nrefresh-cadence: quarterly\nlast-refreshed: 2024-01-01\ngrade-original: B\ngrade-current: A\ngrade-trajectory: rising\ncluster: alignment\nsources-searched:\n  - arxiv\n  - semantic-scholar\n---\n# REF-010 Radar\n`);
  writeFileSync(join(radar, 'REF-011-radar.md'), `---\nref: REF-011\ntitle: Beta\ntype: radar\nrefresh-cadence: annual\nlast-refreshed: 2026-05-01\ngrade-original: B\ngrade-current: B\ngrade-trajectory: stable\ncluster: rl\n---\n# REF-011 Radar\n`);

  // Profiles (corpus-refs in BOTH shapes)
  writeFileSync(join(funders, 'PROF-F-nsf.md'), `---\nprof-id: PROF-F-nsf\nname: "National Science Foundation"\ntype: funder\ncorpus-refs: ["REF-010"]\n---\n# NSF\n`);
  writeFileSync(join(sources, 'PROF-S-curator.md'), `---\nprof-id: PROF-S-curator\nname: "Curator"\ntype: source\nplatform: x\nhandle: "@curator"\ncorpus-refs:\n  - ref: REF-010\n    role: discovered\n---\n# Curator\n`);
  writeFileSync(join(people, 'PROF-P-lee-sam.md'), `---\nprof-id: PROF-P-lee-sam\nname: "Lee, Sam"\ntype: person\ncorpus-refs: ["REF-010"]\n---\n# Sam Lee\n`);
}

describe('corpus parser extension (#1497)', () => {
  let root: string;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'aiwg-corpus-parser-')); writeCorpus(root); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('parses radar sidecars onto records', () => {
    const { records } = loadCorpus(root);
    const r10 = records.find((r) => r.refId === 'REF-010')!;
    expect(r10.radar).not.toBeNull();
    expect(r10.radar!.gradeCurrent).toBe('A');
    expect(r10.radar!.gradeOriginal).toBe('B');
    expect(r10.radar!.gradeTrajectory).toBe('rising');
    expect(r10.radar!.refreshCadence).toBe('quarterly');
    expect(r10.radar!.lastRefreshed).toBe('2024-01-01');
    expect(r10.radar!.cluster).toBe('alignment');
    expect(r10.radar!.sourcesSearched).toEqual(['arxiv', 'semantic-scholar']);
  });

  it('parses the discovery block from the citation sidecar', () => {
    const { records } = loadCorpus(root);
    const r10 = records.find((r) => r.refId === 'REF-010')!;
    expect(r10.discovery).not.toBeNull();
    expect(r10.discovery!.surface).toBe('x-search');
    expect(r10.discovery!.curatorId).toBe('PROF-S-curator');
    expect(r10.discovery!.harvestBatch).toBe('2026-05-20-am');
    // REF-011 has no discovery block
    expect(records.find((r) => r.refId === 'REF-011')!.discovery).toBeNull();
  });

  it('parses funder linkage (object and string forms)', () => {
    const { records } = loadCorpus(root);
    const r10 = records.find((r) => r.refId === 'REF-010')!;
    expect(r10.funders).toEqual([
      { id: 'PROF-F-nsf', grantId: 'NSF IIS-2345678' },
      { id: 'DARPA', grantId: null },
    ]);
    expect(records.find((r) => r.refId === 'REF-011')!.funders).toEqual([]);
  });

  it('checksum reacts to radar edits (radar dir included in checksumSources)', () => {
    const a = loadCorpus(root).checksum;
    writeFileSync(join(root, 'documentation', 'radar', 'REF-011-radar.md'), `---\nref: REF-011\nrefresh-cadence: monthly\nlast-refreshed: 2026-05-26\n---\n# changed\n`);
    const b = loadCorpus(root).checksum;
    expect(a).not.toBe(b);
  });

  it('loads PROF-{P,F,S} profiles, normalizing both corpus-refs shapes', () => {
    const profiles = loadProfiles(root);
    const ids = profiles.map((p) => p.profId).sort();
    expect(ids).toEqual(['PROF-F-nsf', 'PROF-P-lee-sam', 'PROF-S-curator']);
    // list-of-strings shape (PROF-F)
    expect(profiles.find((p) => p.profId === 'PROF-F-nsf')!.corpusRefs).toEqual(['REF-010']);
    // list-of-dicts {ref, role} shape (PROF-S) → normalized to ['REF-010']
    expect(profiles.find((p) => p.profId === 'PROF-S-curator')!.corpusRefs).toEqual(['REF-010']);
    expect(profiles.find((p) => p.profId === 'PROF-S-curator')!.type).toBe('source');
  });
});
