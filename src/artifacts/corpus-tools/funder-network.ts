/**
 * funder-network — bipartite funder↔paper analytics (#1500).
 *
 * Port of profiles/funder_network.py: per-funder paper/A-grade/mean-grade rollup,
 * mean CD-index + novelty-bias (reusing the #1501 CD-index), and co-funding
 * clusters. Funder linkage comes from the #1497 parser (`funders[]` on each REF).
 * FUNDER_ALIASES are NOT ported — the optional acknowledgement scan reads a
 * corpus-local `documentation/profiles/funder-aliases.yaml` (absent → no aliasing).
 *
 * @source historical: profiles/funder_network.py
 * Reference: Wang et al. 2017 (novelty bias); Funk & Owen-Smith 2017 (novelty).
 */

import * as fs from 'fs';
import * as path from 'path';
import { load as loadYaml } from 'js-yaml';
import { loadCorpus, type RefRecord } from '../corpus-views/ref-parser.js';
import { buildCitationGraph, cdIndex } from './corpus-graph.js';
import { readAnalysisGrade } from './radar-shared.js';

/** Wang et al. 2017 corpus-mean novelty baseline (override via funder-aliases.yaml `novelty-baseline`). */
const DEFAULT_NOVELTY_BASELINE = 0.41;
const GRADE_W: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };

function gradeNum(g: string): number | null {
  return GRADE_W[(g[0] ?? '').toUpperCase()] ?? null;
}

export interface FunderRow {
  funderId: string;
  paperCount: number;
  aGradeCount: number;
  meanGrade: number | null;
  meanCdIndex: number | null;
  noveltyBias: 'below-baseline' | 'baseline' | 'above-baseline' | null;
  topTopics: string[];
  yearRange: [number, number] | null;
  papers: string[];
}

export interface CofundingCluster {
  paper: string;
  funders: string[];
  count: number;
}

/** Load corpus-local funder aliases (raw lowercase name → PROF-F/PROF-O id) + novelty baseline. */
export function loadFunderAliases(corpusRoot: string): { aliases: Map<string, string>; baseline: number } {
  const file = path.join(corpusRoot, 'documentation', 'profiles', 'funder-aliases.yaml');
  const aliases = new Map<string, string>();
  let baseline = DEFAULT_NOVELTY_BASELINE;
  try {
    const raw = loadYaml(fs.readFileSync(file, 'utf-8'));
    if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      if (typeof o['novelty-baseline'] === 'number') baseline = o['novelty-baseline'] as number;
      const a = o.aliases;
      if (a && typeof a === 'object') for (const [k, v] of Object.entries(a as Record<string, unknown>)) aliases.set(k.toLowerCase(), String(v));
    }
  } catch {
    /* absent → no aliasing */
  }
  return { aliases, baseline };
}

interface FunderCtx {
  funderPapers: Map<string, string[]>;
  byId: Map<string, RefRecord>;
  cdByRef: Map<string, number | null>;
  baseline: number;
}

function buildFunderCtx(corpusRoot: string, scanAcks: boolean): FunderCtx {
  const { records } = loadCorpus(corpusRoot);
  const byId = new Map(records.map((r) => [r.refId, r]));
  const cite = buildCitationGraph(records);
  const cdByRef = new Map(records.map((r) => [r.refId, cdIndex(r.refId, cite)]));
  const { aliases, baseline } = loadFunderAliases(corpusRoot);

  const funderPapers = new Map<string, string[]>();
  const add = (fid: string, ref: string) => (funderPapers.get(fid) ?? funderPapers.set(fid, []).get(fid)!).push(ref);
  for (const r of records) for (const f of r.funders) if (f.id) add(f.id, r.refId);

  // Optional acknowledgement scan (externalized aliases only).
  if (scanAcks && aliases.size) {
    for (const r of records) {
      if (r.funders.length) continue; // sidecar funders take precedence
      const text = fs.existsSync(r.path) ? fs.readFileSync(r.path, 'utf-8').toLowerCase() : '';
      const ackIdx = Math.max(text.indexOf('## acknowledgement'), text.indexOf('**acknowledgement'));
      if (ackIdx < 0) continue;
      const ack = text.slice(ackIdx, ackIdx + 2000);
      for (const [alias, fid] of aliases) if (ack.includes(alias)) add(fid, r.refId);
    }
  }
  return { funderPapers, byId, cdByRef, baseline };
}

/** Per-funder analytics, ranked by paper count. */
export function funderRows(corpusRoot: string, opts: { scanAcks?: boolean } = {}): FunderRow[] {
  const { funderPapers, byId, cdByRef, baseline } = buildFunderCtx(corpusRoot, !!opts.scanAcks);
  const rows: FunderRow[] = [];
  for (const [funderId, papersRaw] of funderPapers) {
    const papers = [...new Set(papersRaw)].sort();
    const grades = papers.map((r) => readAnalysisGrade(corpusRoot, r));
    const gradeNums = grades.map(gradeNum).filter((x): x is number => x != null);
    const cds = papers.map((r) => cdByRef.get(r) ?? null).filter((x): x is number => x != null);
    const topicCount = new Map<string, number>();
    const years: number[] = [];
    for (const r of papers) {
      for (const t of byId.get(r)?.topics ?? []) topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
      const y = byId.get(r)?.year;
      if (y != null) years.push(y);
    }
    const meanCd = cds.length ? Math.round((cds.reduce((a, b) => a + b, 0) / cds.length) * 1e4) / 1e4 : null;
    const noveltyBias =
      meanCd == null ? null : meanCd < baseline - 0.1 ? 'below-baseline' : meanCd > baseline + 0.1 ? 'above-baseline' : 'baseline';
    rows.push({
      funderId,
      paperCount: papers.length,
      aGradeCount: grades.filter((g) => g.toUpperCase().startsWith('A')).length,
      meanGrade: gradeNums.length ? Math.round((gradeNums.reduce((a, b) => a + b, 0) / gradeNums.length) * 100) / 100 : null,
      meanCdIndex: meanCd,
      noveltyBias,
      topTopics: [...topicCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t),
      yearRange: years.length ? [Math.min(...years), Math.max(...years)] : null,
      papers,
    });
  }
  return rows.sort((a, b) => b.paperCount - a.paperCount || (a.funderId < b.funderId ? -1 : 1));
}

/** Papers with ≥2 funders (co-funding), ranked by funder count. */
export function cofundingClusters(corpusRoot: string): CofundingCluster[] {
  const { records } = loadCorpus(corpusRoot);
  const clusters: CofundingCluster[] = [];
  for (const r of records) {
    const funders = [...new Set(r.funders.map((f) => f.id).filter(Boolean))];
    if (funders.length >= 2) clusters.push({ paper: r.refId, funders, count: funders.length });
  }
  return clusters.sort((a, b) => b.count - a.count || (a.paper < b.paper ? -1 : 1));
}

/** Render the funder-network markdown index. */
export function renderFunderNetwork(rows: FunderRow[], clusters: CofundingCluster[]): string {
  const lines = [
    '# Funder Network',
    '',
    `**Funders tracked**: ${rows.length} · **Co-funded papers**: ${clusters.length}`,
    '',
    '| Funder | Papers | A-Grade | Mean Grade | Mean CD | Novelty Bias | Top Topics |',
    '|---|---:|---:|---:|---:|---|---|',
  ];
  for (const r of rows) {
    lines.push(
      `| ${r.funderId} | ${r.paperCount} | ${r.aGradeCount} | ${r.meanGrade ?? '—'} | ${r.meanCdIndex ?? '—'} | ${r.noveltyBias ?? '—'} | ${r.topTopics.slice(0, 3).join(', ') || '—'} |`,
    );
  }
  if (clusters.length) {
    lines.push('', '## Co-Funded Papers', '', '| Paper | Funders | Count |', '|---|---|---:|');
    for (const c of clusters.slice(0, 20)) lines.push(`| ${c.paper} | ${c.funders.join(', ')} | ${c.count} |`);
  }
  return lines.join('\n') + '\n';
}
