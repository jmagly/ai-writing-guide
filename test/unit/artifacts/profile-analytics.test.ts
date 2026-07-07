/**
 * profile-metrics / profile-temporal / profile-communities integration (#1501).
 *
 * @source @src/artifacts/corpus-tools/profile-metrics.ts
 * @source @src/artifacts/corpus-tools/profile-temporal.ts
 * @source @src/artifacts/corpus-tools/profile-communities.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { computeMetrics } from '../../../src/artifacts/corpus-tools/profile-metrics.js';
import { computeTrajectory } from '../../../src/artifacts/corpus-tools/profile-temporal.js';
import { detectCommunities, detectSkosCommunities } from '../../../src/artifacts/corpus-tools/profile-communities.js';
import type { AiwgFortemiIndexExport } from '../../../src/artifacts/browser-export.js';

let root: string;

function w(rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}
function ref(id: string, year: number, topic: string, grade: string): void {
  w(`documentation/references/${id}-x.md`, `---\ntitle: T\nyear: ${year}\ntopics: [${topic}]\n---\n# ${id}\n- **Quality**: ${grade}\n`);
}
function cite(id: string, authors: string[], cites: string[] = []): void {
  const al = authors.map((a) => `  - name: "${a}"`).join('\n');
  const rows = cites.map((c, i) => `| ${i + 1} | x | ${c} |`).join('\n');
  w(`documentation/citations/${id}-citations.md`, `---\nref: ${id}\ntitle: T\nauthors:\n${al}\n---\n# ${id}\n## Outgoing\n| # | Title | REF |\n${rows}\n## Incoming\n`);
}
function profile(slug: string, refs: string[], name: string): void {
  const yr = '[' + refs.map((r) => `'${r}'`).join(', ') + ']';
  w(`documentation/profiles/people/PROF-P-${slug}.md`, `---\nprof-id: PROF-P-${slug}\nname: "${name}"\ntype: person\ncorpus-refs: ${yr}\n---\n# ${name}\n`);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-analytics-'));
  ref('REF-100', 2020, 'transformers', 'A');
  ref('REF-101', 2021, 'transformers', 'A');
  ref('REF-102', 2022, 'rlhf', 'B');
  cite('REF-100', ['Lee, Sam']);
  cite('REF-101', ['Lee, Sam', 'Ng, Pat'], ['REF-100']);
  cite('REF-102', ['Ng, Pat'], ['REF-100', 'REF-101']);
  profile('lee-sam', ['REF-100', 'REF-101'], 'Lee, Sam');
  profile('ng-pat', ['REF-101', 'REF-102'], 'Ng, Pat');
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('computeMetrics', () => {
  it('computes paper PageRank (most-cited highest) and per-person h-index + grade', () => {
    const m = computeMetrics(root);
    const pr = Object.fromEntries(m.papers.map((p) => [p.refId, p.pageRank]));
    expect(pr['REF-100']).toBeGreaterThan(pr['REF-102']); // REF-100 cited by 2, REF-102 by 0
    const people = Object.fromEntries(m.people.map((p) => [p.profId, p]));
    expect(people['PROF-P-lee-sam'].hIndex).toBe(1); // refs [2,1] in-degrees -> h=1
    expect(people['PROF-P-lee-sam'].gradeInfluence).toBe('C'); // h=1 -> C
    expect(people['PROF-P-lee-sam'].paperCount).toBe(2);
  });
});

describe('computeTrajectory', () => {
  it('buckets papers by year, classifies career phase, and finds no streak under 3 years', () => {
    const t = computeTrajectory(root, 'PROF-P-lee-sam', 2026);
    expect(t.annualData.map((d) => d.year)).toEqual([2020, 2021]);
    expect(t.totalPapers).toBe(2);
    expect(t.careerPhase).toBe('mid'); // 2026 - 2020 = 6 (<=15)
    expect(t.hotStreak).toBeNull(); // only 2 consecutive A-grade years
    expect(t.annualData[0].hasAGrade).toBe(true);
  });

  it('detects a hot streak across 3+ consecutive A-grade years', () => {
    ref('REF-103', 2023, 'transformers', 'A');
    cite('REF-103', ['Lee, Sam']);
    profile('lee-sam', ['REF-100', 'REF-101', 'REF-103'], 'Lee, Sam'); // 2020,2021,2023 -> not consecutive
    // Make 2020-2021-2022 consecutive A for Lee:
    profile('lee-sam', ['REF-100', 'REF-101', 'REF-104'], 'Lee, Sam');
    ref('REF-104', 2022, 'transformers', 'A');
    cite('REF-104', ['Lee, Sam']);
    const t = computeTrajectory(root, 'PROF-P-lee-sam', 2026);
    expect(t.hotStreak).not.toBeNull();
    expect(t.hotStreak!.length).toBe(3);
    expect(t.hotStreak!.startYear).toBe(2020);
  });
});

describe('detectCommunities', () => {
  it('groups co-authors into a community and reports modularity', () => {
    const r = detectCommunities(root);
    const withBoth = r.communities.find((c) => c.members.includes('Lee, Sam') && c.members.includes('Ng, Pat'));
    expect(withBoth).toBeDefined(); // Lee & Ng co-authored REF-101
    expect(typeof r.modularity).toBe('number');
  });

  it('groups Fortemi export records by full SKOS concept set (#1720)', () => {
    const exported: AiwgFortemiIndexExport = {
      schema_version: 'aiwg.fortemi.index.export.v2',
      generated_at: '2026-01-01T00:00:00.000Z',
      source: { repo: 'test', privacy: 'sanitized', graph: 'citation-network' },
      items: [
        {
          schema_version: 'aiwg.fortemi.index.record.v2',
          id: 'aiwg:ref:a',
          type: 'aiwg.research.ref',
          source: { path: 'REF-A.md', repo_relative_path: 'REF-A.md', locator: 'REF-A' },
          title: 'REF-A',
          text: 'A',
          facets: {},
          tags: [],
          concepts: ['skos:rag', 'skos:evals'],
          relationships: [],
          provenance: [],
          privacy: { classification: 'sanitized', pii: false },
          skos_concepts: [
            { id: 'skos:rag', prefLabel: 'Retrieval' },
            { id: 'skos:evals', prefLabel: 'Evaluation' },
          ],
          skos_relations: [],
          updated_at: '2026-01-01T00:00:00.000Z',
        },
        {
          schema_version: 'aiwg.fortemi.index.record.v2',
          id: 'aiwg:ref:b',
          type: 'aiwg.research.ref',
          source: { path: 'REF-B.md', repo_relative_path: 'REF-B.md', locator: 'REF-B' },
          title: 'REF-B',
          text: 'B',
          facets: {},
          tags: [],
          concepts: ['skos:rag'],
          relationships: [],
          provenance: [],
          privacy: { classification: 'sanitized', pii: false },
          skos_concepts: [{ id: 'skos:rag', prefLabel: 'Retrieval' }],
          skos_relations: [],
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const result = detectSkosCommunities(exported);
    expect(result.coverage).toEqual({ recordsWithConcepts: 2, totalRecords: 2, ratio: 1 });
    expect(result.communities[0]).toEqual({
      label: 'Retrieval',
      members: ['REF-A', 'REF-B'],
    });
    expect(result.communities).toContainEqual({
      label: 'Evaluation',
      members: ['REF-A'],
    });
  });
});
