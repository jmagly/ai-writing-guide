/**
 * Corpus graph algorithm tests (#1501) — known-answer checks.
 *
 * @source @src/artifacts/corpus-tools/corpus-graph.ts
 */

import { describe, it, expect } from 'vitest';
import { hIndex, cdIndex, pageRank, betweenness, eigenvector, clustering, type CitationGraph } from '../../../src/artifacts/corpus-tools/corpus-graph.js';

/** Build a CitationGraph from (citer→cited) edges. */
function cg(nodes: string[], edges: [string, string][]): CitationGraph {
  const out = new Map(nodes.map((n) => [n, new Set<string>()]));
  const inn = new Map(nodes.map((n) => [n, new Set<string>()]));
  for (const [a, b] of edges) {
    out.get(a)!.add(b);
    inn.get(b)!.add(a);
  }
  return { nodes, out, in: inn };
}

/** Undirected co-author graph from edges. */
function coa(edges: [string, string][]): Map<string, Map<string, number>> {
  const g = new Map<string, Map<string, number>>();
  const add = (a: string, b: string) => {
    if (!g.has(a)) g.set(a, new Map());
    g.get(a)!.set(b, (g.get(a)!.get(b) ?? 0) + 1);
  };
  for (const [a, b] of edges) { add(a, b); add(b, a); }
  return g;
}

describe('hIndex', () => {
  it('computes max k with k papers ≥ k citations', () => {
    expect(hIndex([5, 3, 2, 1, 0])).toBe(2);
    expect(hIndex([3, 3, 3])).toBe(3);
    expect(hIndex([1, 1, 1, 1, 1])).toBe(1);
    expect(hIndex([])).toBe(0);
    expect(hIndex([0, 0])).toBe(0);
  });
});

describe('cdIndex', () => {
  it('computes the disruption index (F-B)/(F+B+N)', () => {
    // P cites r1. Citers: c1(P), c2(P,r1), c3(P). c4 cites r1 only.
    const g = cg(
      ['P', 'r1', 'c1', 'c2', 'c3', 'c4'],
      [['P', 'r1'], ['c1', 'P'], ['c2', 'P'], ['c2', 'r1'], ['c3', 'P'], ['c4', 'r1']],
    );
    // F=2 (c1,c3), B=1 (c2), N=1 (c4) -> (2-1)/4 = 0.25
    expect(cdIndex('P', g)).toBeCloseTo(0.25, 5);
  });

  it('returns null with fewer than 3 citers', () => {
    const g = cg(['P', 'c1'], [['c1', 'P']]);
    expect(cdIndex('P', g)).toBeNull();
  });
});

describe('pageRank', () => {
  it('ranks the most-cited node highest and sums to ~1', () => {
    // A cites B,C; B cites C. C accumulates the most.
    const g = cg(['A', 'B', 'C'], [['A', 'B'], ['A', 'C'], ['B', 'C']]);
    const pr = pageRank(g);
    const sum = [...pr.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 3);
    expect(pr.get('C')!).toBeGreaterThan(pr.get('B')!);
    expect(pr.get('C')!).toBeGreaterThan(pr.get('A')!);
  });
});

describe('betweenness', () => {
  it('gives the bridge node of a path the highest score', () => {
    const bc = betweenness(coa([['A', 'B'], ['B', 'C']])); // A-B-C
    expect(bc.get('B')!).toBeGreaterThan(bc.get('A')!);
    expect(bc.get('B')!).toBeGreaterThan(bc.get('C')!);
    expect(bc.get('A')).toBe(0);
    expect(bc.get('C')).toBe(0);
  });
});

describe('eigenvector + clustering', () => {
  it('triangle: equal eigenvector, clustering 1', () => {
    const tri = coa([['A', 'B'], ['B', 'C'], ['A', 'C']]);
    const ec = eigenvector(tri);
    expect(ec.get('A')!).toBeCloseTo(ec.get('B')!, 3);
    expect(ec.get('B')!).toBeCloseTo(ec.get('C')!, 3);
    const cc = clustering(tri);
    expect(cc.get('A')).toBeCloseTo(1, 5);
  });

  it('path: middle node has clustering 0 (neighbors unconnected)', () => {
    const cc = clustering(coa([['A', 'B'], ['B', 'C']]));
    expect(cc.get('B')).toBe(0);
  });
});
