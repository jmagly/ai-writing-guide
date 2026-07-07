/**
 * profile-communities — co-author community detection (#1501).
 *
 * Label-propagation communities (deterministic variant: sorted node order,
 * lexicographic tie-break — no python-louvain dependency, the graceful fallback
 * the issue calls for) + modularity Q + bridge-node detection (high betweenness).
 *
 * @source historical: profiles/community_detection.py
 */

import { loadCorpus } from '../corpus-views/ref-parser.js';
import { buildCoauthorGraph, betweenness } from './corpus-graph.js';
import type { AiwgFortemiIndexExport } from '../browser-export.js';

export interface Community {
  label: string;
  members: string[];
}
export interface CommunityResult {
  communities: Community[];
  modularity: number;
  bridges: { node: string; betweenness: number }[];
}
export interface SkosCommunityResult {
  communities: Community[];
  coverage: {
    recordsWithConcepts: number;
    totalRecords: number;
    ratio: number;
  };
}

type Graph = Map<string, Map<string, number>>;

/** Deterministic label propagation: each node adopts the highest-weight neighbour label. */
function labelPropagation(g: Graph, maxIter = 100): Map<string, string> {
  const nodes = [...g.keys()].sort();
  const labels = new Map(nodes.map((n) => [n, n]));
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (const v of nodes) {
      const nbrs = g.get(v)!;
      if (nbrs.size === 0) continue;
      const weight = new Map<string, number>();
      for (const [w, ew] of nbrs) {
        const lab = labels.get(w)!;
        weight.set(lab, (weight.get(lab) ?? 0) + ew);
      }
      // Highest weight; tie-break to the lexicographically smallest label.
      let best = labels.get(v)!;
      let bestW = -1;
      for (const [lab, wgt] of [...weight.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
        if (wgt > bestW) { bestW = wgt; best = lab; }
      }
      if (best !== labels.get(v)) { labels.set(v, best); changed = true; }
    }
    if (!changed) break;
  }
  return labels;
}

/** Newman modularity Q for a labelled undirected weighted graph. */
function modularity(g: Graph, labels: Map<string, string>): number {
  const deg = new Map<string, number>();
  let twoM = 0;
  for (const [v, nbrs] of g) {
    let d = 0;
    for (const w of nbrs.values()) d += w;
    deg.set(v, d);
    twoM += d;
  }
  if (twoM === 0) return 0;
  const nodes = [...g.keys()];
  let q = 0;
  for (const i of nodes) {
    const nbrs = g.get(i)!;
    for (const j of nodes) {
      if (labels.get(i) !== labels.get(j)) continue;
      const a = nbrs.get(j) ?? 0;
      q += a - (deg.get(i)! * deg.get(j)!) / twoM;
    }
  }
  return Math.round((q / twoM) * 1e4) / 1e4;
}

/** Detect co-author communities + modularity + bridge nodes. */
export function detectCommunities(corpusRoot: string, minModularity = 0.3): CommunityResult & { warning?: string } {
  const { records } = loadCorpus(corpusRoot);
  const g = buildCoauthorGraph(records);
  const labels = labelPropagation(g);

  const byLabel = new Map<string, string[]>();
  for (const [node, lab] of labels) (byLabel.get(lab) ?? byLabel.set(lab, []).get(lab)!).push(node);
  const communities: Community[] = [...byLabel.entries()]
    .map(([label, members]) => ({ label, members: members.sort() }))
    .sort((a, b) => b.members.length - a.members.length);

  const q = modularity(g, labels);

  // Bridge nodes: top betweenness (span communities).
  const bc = betweenness(g);
  const bridges = [...bc.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([node, v]) => ({ node, betweenness: Math.round(v * 1e6) / 1e6 }));

  const result: CommunityResult & { warning?: string } = { communities, modularity: q, bridges };
  if (q < minModularity) result.warning = `modularity ${q} < ${minModularity} — weak community structure (sparse co-author graph)`;
  return result;
}

/** Render communities + modularity + bridges as markdown. */
export function renderCommunities(r: CommunityResult & { warning?: string }): string {
  const lines = [
    '# Co-author communities',
    '',
    `${r.communities.length} communities · modularity Q = ${r.modularity}`,
    ...(r.warning ? ['', `> ⚠ ${r.warning}`] : []),
    '',
    '| Community | Size | Members (top 8) |',
    '|---|---:|---|',
  ];
  let i = 1;
  for (const c of r.communities) {
    if (c.members.length < 2) continue; // skip singletons in the table
    lines.push(`| C${i++} | ${c.members.length} | ${c.members.slice(0, 8).join(', ')}${c.members.length > 8 ? ' …' : ''} |`);
  }
  lines.push('', '## Bridge authors (top betweenness)', '', '| Author | Betweenness |', '|---|---:|');
  for (const b of r.bridges) lines.push(`| ${b.node} | ${b.betweenness} |`);
  return lines.join('\n') + '\n';
}

/** Group Fortemi v2 records by extracted SKOS concept id/prefLabel (#1720). */
export function detectSkosCommunities(exported: AiwgFortemiIndexExport): SkosCommunityResult {
  const labels = new Map<string, string>();
  const membersByConcept = new Map<string, Set<string>>();
  let recordsWithConcepts = 0;

  for (const item of exported.items) {
    const concepts = item.skos_concepts ?? [];
    if (concepts.length > 0) recordsWithConcepts++;
    const member = item.title || item.name || item.source.path;
    for (const concept of concepts) {
      labels.set(concept.id, concept.prefLabel);
      if (!membersByConcept.has(concept.id)) membersByConcept.set(concept.id, new Set());
      membersByConcept.get(concept.id)!.add(member);
    }
  }

  const communities = [...membersByConcept.entries()]
    .map(([id, members]) => ({
      label: labels.get(id) ?? id,
      members: [...members].sort(),
    }))
    .sort((a, b) => b.members.length - a.members.length || a.label.localeCompare(b.label));
  return {
    communities,
    coverage: {
      recordsWithConcepts,
      totalRecords: exported.items.length,
      ratio:
        exported.items.length === 0
          ? 1
          : Math.round((recordsWithConcepts / exported.items.length) * 10000) / 10000,
    },
  };
}

export function renderSkosCommunities(r: SkosCommunityResult): string {
  const lines = [
    '# SKOS concept communities',
    '',
    `${r.communities.length} concepts · SKOS coverage ${r.coverage.recordsWithConcepts}/${r.coverage.totalRecords} (${r.coverage.ratio})`,
    '',
    '| Concept | Size | Records (top 8) |',
    '|---|---:|---|',
  ];
  for (const c of r.communities) {
    lines.push(`| ${c.label} | ${c.members.length} | ${c.members.slice(0, 8).join(', ')}${c.members.length > 8 ? ' …' : ''} |`);
  }
  return lines.join('\n') + '\n';
}
