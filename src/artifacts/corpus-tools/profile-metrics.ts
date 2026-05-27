/**
 * profile-metrics — corpus-local influence/centrality metrics (#1501).
 *
 * Port of profiles/compute_metrics.py: per-paper CD-index + PageRank, and
 * per-PROF-P h-index / mean-CD / mean-PageRank + co-author centrality
 * (betweenness/eigenvector/clustering) + influence grade. Reuses corpus-graph
 * algorithms and the #1497 parser.
 *
 * @source historical: profiles/compute_metrics.py
 */

import { loadCorpus, loadProfiles } from '../corpus-views/ref-parser.js';
import { slugifyAuthor } from './profile-generate.js';
import {
  buildCitationGraph,
  buildCoauthorGraph,
  hIndex,
  cdIndex,
  pageRank,
  betweenness,
  eigenvector,
  clustering,
} from './corpus-graph.js';

export interface PaperMetric {
  refId: string;
  cdIndex: number | null;
  pageRank: number;
}

export interface PersonMetric {
  profId: string;
  name: string;
  paperCount: number;
  hIndex: number;
  meanCdIndex: number | null;
  meanPageRank: number;
  betweenness: number;
  eigenvector: number;
  clustering: number;
  gradeInfluence: string;
}

export interface CorpusMetrics {
  papers: PaperMetric[];
  people: PersonMetric[];
}

/** h-index → influence grade (compute_metrics.grade_influence thresholds). */
function gradeInfluence(h: number): string {
  if (h >= 3) return 'A';
  if (h >= 2) return 'B';
  if (h >= 1) return 'C';
  return 'D';
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Compute paper-level + person-level metrics across the corpus. */
export function computeMetrics(corpusRoot: string): CorpusMetrics {
  const { records } = loadCorpus(corpusRoot);
  const cite = buildCitationGraph(records);
  const coauthor = buildCoauthorGraph(records);

  // Paper-level: CD-index + PageRank.
  const pr = pageRank(cite);
  const papers: PaperMetric[] = records.map((r) => ({
    refId: r.refId,
    cdIndex: cdIndex(r.refId, cite),
    pageRank: Math.round((pr.get(r.refId) ?? 0) * 1e6) / 1e6,
  }));
  const paperById = new Map(papers.map((p) => [p.refId, p]));

  // Co-author centrality (keyed by author display name).
  const bc = betweenness(coauthor);
  const ec = eigenvector(coauthor);
  const cc = clustering(coauthor);
  // author display-name → slug (to match PROF-P).
  const slugToAuthor = new Map<string, string>();
  for (const a of coauthor.keys()) slugToAuthor.set(slugifyAuthor(a), a);

  // Per-PROF-P aggregation.
  const people: PersonMetric[] = [];
  for (const p of loadProfiles(corpusRoot)) {
    if (p.type !== 'person') continue;
    const refs = p.corpusRefs.filter((r) => cite.out.has(r));
    const citationCounts = refs.map((r) => (cite.in.get(r) ?? new Set()).size);
    const h = hIndex(citationCounts);
    const cds = refs.map((r) => paperById.get(r)?.cdIndex).filter((x): x is number => x != null);
    const prs = refs.map((r) => paperById.get(r)?.pageRank ?? 0);
    const slug = p.profId.replace(/^PROF-P-/, '');
    const author = slugToAuthor.get(slug);
    people.push({
      profId: p.profId,
      name: p.name ?? '',
      paperCount: refs.length,
      hIndex: h,
      meanCdIndex: cds.length ? Math.round(mean(cds) * 1e4) / 1e4 : null,
      meanPageRank: Math.round(mean(prs) * 1e6) / 1e6,
      betweenness: author ? Math.round((bc.get(author) ?? 0) * 1e6) / 1e6 : 0,
      eigenvector: author ? Math.round((ec.get(author) ?? 0) * 1e6) / 1e6 : 0,
      clustering: author ? Math.round((cc.get(author) ?? 0) * 1e4) / 1e4 : 0,
      gradeInfluence: gradeInfluence(h),
    });
  }
  people.sort((a, b) => b.hIndex - a.hIndex || b.meanPageRank - a.meanPageRank || (a.profId < b.profId ? -1 : 1));
  return { papers, people };
}

/** Render person-level metrics as a markdown table (or `--papers` for paper-level). */
export function renderMetrics(m: CorpusMetrics, mode: 'people' | 'papers' = 'people'): string {
  if (mode === 'papers') {
    const lines = ['| REF | CD-index | PageRank |', '|---|---:|---:|'];
    for (const p of [...m.papers].sort((a, b) => b.pageRank - a.pageRank)) {
      lines.push(`| ${p.refId} | ${p.cdIndex ?? '—'} | ${p.pageRank} |`);
    }
    return lines.join('\n') + '\n';
  }
  const lines = [
    '# Entity influence metrics',
    '',
    `${m.people.length} profiled people · ${m.papers.length} papers`,
    '',
    '| Profile | Papers | h-index | Mean CD | Mean PageRank | Betweenness | Eigenvector | Grade |',
    '|---|---:|---:|---:|---:|---:|---:|---|',
  ];
  for (const p of m.people) {
    lines.push(
      `| ${p.profId} | ${p.paperCount} | ${p.hIndex} | ${p.meanCdIndex ?? '—'} | ${p.meanPageRank} | ${p.betweenness} | ${p.eigenvector} | ${p.gradeInfluence} |`,
    );
  }
  return lines.join('\n') + '\n';
}
