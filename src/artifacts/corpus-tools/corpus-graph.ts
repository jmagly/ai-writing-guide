/**
 * Corpus graph construction + analytics algorithms (#1501).
 *
 * NetworkX-equivalent ports (no graph library): co-author + citation graphs from
 * the #1497 parser, plus h-index, CD-index (disruption), PageRank, betweenness,
 * eigenvector, and clustering. Used by profile-metrics / profile-communities.
 *
 * @source historical: profiles/build_graphs.py, profiles/compute_metrics.py
 * References: Hirsch 2005 (h-index); Wu-Wang-Evans 2019 (CD-index);
 *   Brandes 2001 (betweenness); Newman 2003 (centrality).
 */

import type { RefRecord } from '../corpus-views/ref-parser.js';

/** Directed citation graph: node → {out: refs it cites (in corpus), in: refs that cite it}. */
export interface CitationGraph {
  nodes: string[];
  out: Map<string, Set<string>>;
  in: Map<string, Set<string>>;
}

/** Build the citation graph from corpus outgoing edges (in-corpus targets only). */
export function buildCitationGraph(records: RefRecord[]): CitationGraph {
  const inCorpus = new Set(records.map((r) => r.refId));
  const out = new Map<string, Set<string>>();
  const inn = new Map<string, Set<string>>();
  for (const r of records) {
    out.set(r.refId, out.get(r.refId) ?? new Set());
    inn.set(r.refId, inn.get(r.refId) ?? new Set());
  }
  for (const r of records) {
    for (const t of r.outgoing) {
      if (!inCorpus.has(t) || t === r.refId) continue;
      out.get(r.refId)!.add(t);
      inn.get(t)!.add(r.refId);
    }
  }
  return { nodes: records.map((r) => r.refId), out, in: inn };
}

/** Undirected co-author graph: person → (person → shared-paper weight). */
export function buildCoauthorGraph(records: RefRecord[]): Map<string, Map<string, number>> {
  const g = new Map<string, Map<string, number>>();
  const link = (a: string, b: string) => {
    const m = g.get(a) ?? g.set(a, new Map()).get(a)!;
    m.set(b, (m.get(b) ?? 0) + 1);
  };
  for (const r of records) {
    const authors = [...new Set(r.authors)];
    for (let i = 0; i < authors.length; i++) {
      if (!g.has(authors[i])) g.set(authors[i], new Map());
      for (let j = i + 1; j < authors.length; j++) {
        link(authors[i], authors[j]);
        link(authors[j], authors[i]);
      }
    }
  }
  return g;
}

/** h-index: max k such that ≥k papers have ≥k in-corpus citations (Hirsch 2005). */
export function hIndex(citationCounts: number[]): number {
  const sorted = [...citationCounts].sort((a, b) => b - a);
  let h = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] >= i + 1) h = i + 1;
    else break;
  }
  return h;
}

/**
 * CD-index (disruption): (F − B) / (F + B + N). +1 fully disruptive, −1 consolidating.
 * Null when < 3 citers (low confidence). Wu-Wang-Evans 2019.
 */
export function cdIndex(ref: string, g: CitationGraph): number | null {
  if (!g.out.has(ref)) return null;
  const citers = g.in.get(ref) ?? new Set();
  const references = g.out.get(ref) ?? new Set();
  if (citers.size < 3) return null;

  let F = 0;
  let B = 0;
  for (const c of citers) {
    const cOut = g.out.get(c) ?? new Set();
    let citesARef = false;
    for (const x of references) if (cOut.has(x)) { citesARef = true; break; }
    if (citesARef) B++;
    else F++;
  }
  const citersOfRefs = new Set<string>();
  for (const rf of references) for (const p of g.in.get(rf) ?? new Set()) citersOfRefs.add(p);
  citersOfRefs.delete(ref);
  for (const c of citers) citersOfRefs.delete(c);
  const N = citersOfRefs.size;

  const denom = F + B + N;
  return denom > 0 ? (F - B) / denom : 0;
}

/** PageRank over the directed citation graph (α=0.85), with dangling redistribution. */
export function pageRank(g: CitationGraph, alpha = 0.85, maxIter = 200, tol = 1e-6): Map<string, number> {
  const nodes = g.nodes;
  const n = nodes.length;
  if (n === 0) return new Map();
  let pr = new Map(nodes.map((x) => [x, 1 / n]));
  const outDeg = new Map(nodes.map((x) => [x, (g.out.get(x) ?? new Set()).size]));

  for (let iter = 0; iter < maxIter; iter++) {
    const next = new Map(nodes.map((x) => [x, 0]));
    let dangling = 0;
    for (const x of nodes) if (outDeg.get(x) === 0) dangling += pr.get(x)!;
    const base = (1 - alpha) / n + (alpha * dangling) / n;
    for (const x of nodes) next.set(x, base);
    for (const x of nodes) {
      const deg = outDeg.get(x)!;
      if (deg === 0) continue;
      const share = (alpha * pr.get(x)!) / deg;
      for (const t of g.out.get(x)!) next.set(t, next.get(t)! + share);
    }
    let diff = 0;
    for (const x of nodes) diff += Math.abs(next.get(x)! - pr.get(x)!);
    pr = next;
    if (diff < tol) break;
  }
  return pr;
}

/** Brandes betweenness centrality on an undirected unweighted graph, normalized. */
export function betweenness(g: Map<string, Map<string, number>>): Map<string, number> {
  const nodes = [...g.keys()];
  const cb = new Map(nodes.map((x) => [x, 0]));
  for (const s of nodes) {
    const stack: string[] = [];
    const pred = new Map<string, string[]>(nodes.map((x) => [x, []]));
    const sigma = new Map(nodes.map((x) => [x, 0]));
    const dist = new Map(nodes.map((x) => [x, -1]));
    sigma.set(s, 1);
    dist.set(s, 0);
    const queue: string[] = [s];
    while (queue.length) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of (g.get(v) ?? new Map()).keys()) {
        if (dist.get(w)! < 0) {
          queue.push(w);
          dist.set(w, dist.get(v)! + 1);
        }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          pred.get(w)!.push(v);
        }
      }
    }
    const delta = new Map(nodes.map((x) => [x, 0]));
    while (stack.length) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) {
        delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      }
      if (w !== s) cb.set(w, cb.get(w)! + delta.get(w)!);
    }
  }
  // Undirected normalization: divide by 2, then scale to [0,1].
  const nn = nodes.length;
  const scale = nn > 2 ? 1 / ((nn - 1) * (nn - 2)) : 1;
  for (const x of nodes) cb.set(x, (cb.get(x)! / 2) * 2 * scale);
  return cb;
}

/** Eigenvector centrality via power iteration on the undirected (weighted) graph. */
export function eigenvector(g: Map<string, Map<string, number>>, maxIter = 500, tol = 1e-6): Map<string, number> {
  const nodes = [...g.keys()];
  const n = nodes.length;
  if (n === 0) return new Map();
  let x = new Map(nodes.map((k) => [k, 1 / n]));
  for (let iter = 0; iter < maxIter; iter++) {
    const xLast = x;
    x = new Map(nodes.map((k) => [k, 0]));
    for (const v of nodes) {
      let acc = xLast.get(v)!;
      for (const [w, weight] of g.get(v) ?? new Map()) acc += xLast.get(w)! * weight;
      x.set(v, acc);
    }
    const norm = Math.sqrt([...x.values()].reduce((a, b) => a + b * b, 0)) || 1;
    for (const k of nodes) x.set(k, x.get(k)! / norm);
    let diff = 0;
    for (const k of nodes) diff += Math.abs(x.get(k)! - xLast.get(k)!);
    if (diff < n * tol) break;
  }
  return x;
}

/** Local clustering coefficient per node on the undirected graph. */
export function clustering(g: Map<string, Map<string, number>>): Map<string, number> {
  const cc = new Map<string, number>();
  for (const [v, nbrsMap] of g) {
    const nbrs = [...nbrsMap.keys()];
    const k = nbrs.length;
    if (k < 2) {
      cc.set(v, 0);
      continue;
    }
    let links = 0;
    for (let i = 0; i < nbrs.length; i++) {
      for (let j = i + 1; j < nbrs.length; j++) {
        if ((g.get(nbrs[i]) ?? new Map()).has(nbrs[j])) links++;
      }
    }
    cc.set(v, (2 * links) / (k * (k - 1)));
  }
  return cc;
}
