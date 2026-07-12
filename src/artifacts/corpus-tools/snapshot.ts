/**
 * Research-corpus snapshot renderer (#1647).
 *
 * Produces the computed sections formerly assembled by the corpus-snapshot
 * skill by hand. The command is intentionally deterministic: one parser pass
 * feeds JSON, terminal summary, and markdown report output.
 */

import * as fs from 'fs';
import * as path from 'path';
import { load as loadYaml } from 'js-yaml';
import { loadCorpus, refSortKey } from '../corpus-views/ref-parser.js';
import { findOrphans } from './sidecar-lint.js';
import { scanCorpus } from './integrity-scan.js';

export const SNAPSHOT_FLOW_PATH =
  'agentic/code/frameworks/research-complete/flows/corpus-snapshot.playbook.yaml';

const DEFAULT_TEMPLATE = `# Corpus Snapshot - [DATE]

## Dimensions
[COMPUTE: dimensions-table]

## Citation Topology
[COMPUTE: topology-metrics]

## Degree Distribution
[COMPUTE: degree-histogram]

## GRADE Distribution
[COMPUTE: grade-distribution]

## Source-Type Distribution
[COMPUTE: source-type-distribution]

## Integrity and Orphans
[COMPUTE: integrity-orphans]

## Delta
[COMPUTE: delta-from-previous]

## Cluster Analysis
[ANALYZE: describe main clusters, their themes, and notable papers]

## Citation Chains
[ANALYZE: identify significant citation chains and their meaning]

## Gaps and Opportunities
[ANALYZE: summarize disconnected areas and bridge opportunities]

## Recommendations
[ANALYZE: what should be inducted next, what needs expansion]
`;

const CONTROLLED_GRADES = ['A', 'A-', 'B', 'B-', 'C', 'C-', 'D'];

export interface SnapshotOptions {
  date?: string;
  template?: string;
  out?: string;
  write?: boolean;
  computeOnly?: boolean;
  deltaOnly?: boolean;
  format?: 'full' | 'summary' | 'json';
  notes?: string;
}

export interface SnapshotTopHub {
  ref: string;
  title: string;
  in: number;
  out: number;
  total: number;
}

export interface SnapshotMetrics {
  corpusRoot: string;
  generated: string;
  flow: string;
  dimensions: {
    papers: number;
    citationSidecars: number;
    radarSidecars: number;
    pdfsFull: number;
    webSources: number;
    indexFiles: number;
    peopleProfiles: number;
    authors: number;
    topics: number;
    yearRange: string;
  };
  topology: {
    nodes: number;
    edges: number;
    density: number;
    averageDegree: number;
    isolatedNodes: number;
    isolatedRefs: string[];
    topHubs: SnapshotTopHub[];
  };
  degreeDistribution: Record<string, number>;
  gradeDistribution: Record<string, number>;
  gradeOffVocabulary: number;
  sourceTypeDistribution: Record<string, number>;
  integrity: {
    orphanCount: number;
    orphanRefs: string[];
    recommendations: Record<string, number>;
  };
  previous: PreviousSnapshot | null;
  delta: SnapshotDelta | null;
}

export interface PreviousSnapshot {
  path: string;
  date: string | null;
  metrics: Record<string, number>;
}

export interface SnapshotDelta {
  previousPath: string;
  previousDate: string | null;
  values: Array<{ metric: string; previous: number; current: number; delta: number }>;
}

function countFiles(dir: string, predicate: (name: string) => boolean = () => true): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) count += countFiles(full, predicate);
    else if (predicate(entry.name)) count++;
  }
  return count;
}

function firstExistingCount(root: string, dirs: string[], predicate?: (name: string) => boolean): number {
  for (const rel of dirs) {
    const full = path.join(root, rel);
    if (fs.existsSync(full)) return countFiles(full, predicate);
  }
  return 0;
}

function inc(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function sortedEntries(map: Record<string, number>): Array<[string, number]> {
  return Object.entries(map).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function sortRefs(a: string, b: string): number {
  const ak = refSortKey(a);
  const bk = refSortKey(b);
  return ak[0] !== bk[0] ? ak[0] - bk[0] : ak[1].localeCompare(bk[1]);
}

function degreeBucket(total: number): string {
  if (total === 0) return '0';
  if (total <= 2) return '1-2';
  if (total <= 5) return '3-5';
  if (total <= 10) return '6-10';
  if (total <= 20) return '11-20';
  return '20+';
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[`*_]/g, '').replace(/,/g, '').trim();
  const m = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const parsed = Number(m[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function metricFromRows(text: string, labels: string[]): number | undefined {
  const wanted = labels.map((label) => label.toLowerCase());
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.length < 2) continue;
    const label = cells[0].replace(/[`*_]/g, '').toLowerCase();
    if (!wanted.some((w) => label === w || label.includes(w))) continue;
    const parsed = parseNumber(cells[1]);
    if (parsed !== null) return parsed;
  }
  return undefined;
}

function buildPreviousMetrics(data: Record<string, unknown>, text: string): Record<string, number> {
  const metrics: Record<string, number> = {};
  for (const key of ['papers', 'edges', 'density', 'isolatedNodes', 'orphanCount']) {
    const value = data[key];
    if (typeof value === 'number' && Number.isFinite(value)) metrics[key] = value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      metrics[key] = Number(value);
    }
  }

  const rowLabels: Record<string, string[]> = {
    papers: ['REF analysis docs', 'summaries (analysis docs)', 'Total papers'],
    citationSidecars: ['Citation sidecars'],
    radarSidecars: ['Radar sidecars'],
    edges: ['Citation edges (index)', 'Citation edges', 'Edges (directed, in-corpus)', 'Edges'],
    density: ['Graph density', 'Density'],
    isolatedNodes: ['Isolated nodes', 'Orphan papers'],
    webSources: ['Web source snapshots', 'web-sources'],
    gradeOffVocabulary: ['Radar off-vocab values', 'Off-vocabulary GRADE values'],
  };
  for (const [key, labels] of Object.entries(rowLabels)) {
    if (metrics[key] !== undefined) continue;
    const value = metricFromRows(text, labels);
    if (value !== undefined) metrics[key] = value;
  }
  return metrics;
}

function parseFrontmatter(text: string): Record<string, unknown> {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return {};
  try {
    const loaded = loadYaml(m[1]);
    return loaded && typeof loaded === 'object' && !Array.isArray(loaded)
      ? (loaded as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function findPreviousSnapshot(root: string, date: string): PreviousSnapshot | null {
  const reports = path.join(root, '.aiwg', 'reports');
  if (!fs.existsSync(reports)) return null;
  const files = fs
    .readdirSync(reports)
    .filter((f) => /^corpus-snapshot-\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .filter((f) => f !== `corpus-snapshot-${date}.md`)
    .sort()
    .reverse();
  const file = files[0];
  if (!file) return null;
  const full = path.join(reports, file);
  const text = fs.readFileSync(full, 'utf-8');
  const fm = parseFrontmatter(text);
  return {
    path: path.relative(root, full),
    date: typeof fm.date === 'string' ? fm.date : file.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null,
    metrics: buildPreviousMetrics(fm, text),
  };
}

function computeDelta(current: SnapshotMetrics, previous: PreviousSnapshot | null): SnapshotDelta | null {
  if (!previous) return null;
  const candidates: Array<[string, number]> = [
    ['papers', current.dimensions.papers],
    ['citationSidecars', current.dimensions.citationSidecars],
    ['radarSidecars', current.dimensions.radarSidecars],
    ['edges', current.topology.edges],
    ['density', Number(current.topology.density.toFixed(6))],
    ['isolatedNodes', current.topology.isolatedNodes],
    ['webSources', current.dimensions.webSources],
    ['gradeOffVocabulary', current.gradeOffVocabulary],
    ['orphanCount', current.integrity.orphanCount],
  ];
  const values = candidates
    .filter(([key]) => previous.metrics[key] !== undefined)
    .map(([metric, value]) => ({
      metric,
      previous: previous.metrics[metric],
      current: value,
      delta: Number((value - previous.metrics[metric]).toFixed(6)),
    }));
  return { previousPath: previous.path, previousDate: previous.date, values };
}

export function computeSnapshot(root: string, options: SnapshotOptions = {}): SnapshotMetrics | null {
  const refsDir = path.join(root, 'documentation', 'references');
  if (!fs.existsSync(refsDir)) return null;

  const generated = options.date ?? new Date().toISOString().slice(0, 10);
  const { records } = loadCorpus(root);
  if (!records.length) return null;

  const authors = new Set<string>();
  const topics = new Set<string>();
  const years: number[] = [];
  const grades: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, Missing: 0 };
  const sourceTypes: Record<string, number> = {};
  const degreeDistribution: Record<string, number> = {
    '0': 0,
    '1-2': 0,
    '3-5': 0,
    '6-10': 0,
    '11-20': 0,
    '20+': 0,
  };
  let offVocab = 0;

  for (const r of records) {
    for (const a of r.authors) authors.add(a);
    for (const t of r.topics) topics.add(t);
    if (r.year) years.push(r.year);
    inc(sourceTypes, r.sourceType || 'other');
    const grade = r.radar?.gradeCurrent?.trim().toUpperCase();
    if (!grade) grades.Missing++;
    else if (CONTROLLED_GRADES.includes(grade)) grades[grade] = (grades[grade] ?? 0) + 1;
    else offVocab++;
    inc(degreeDistribution, degreeBucket(r.incoming.size + r.outgoing.size));
  }

  const nodes = records.length;
  const edges = records.reduce((sum, r) => sum + r.outgoing.size, 0);
  const density = nodes > 1 ? edges / (nodes * (nodes - 1)) : 0;
  const topHubs = [...records]
    .sort((a, b) => {
      const total = b.incoming.size + b.outgoing.size - (a.incoming.size + a.outgoing.size);
      if (total !== 0) return total;
      return sortRefs(a.refId, b.refId);
    })
    .slice(0, 25)
    .map((r) => ({
      ref: r.refId,
      title: r.title,
      in: r.incoming.size,
      out: r.outgoing.size,
      total: r.incoming.size + r.outgoing.size,
    }));
  const isolatedRecords = records.filter((r) => !r.incoming.size && !r.outgoing.size);
  const scan = scanCorpus(root);
  const recommendations: Record<string, number> = {};
  for (const s of Object.values(scan.summary)) inc(recommendations, s.recommendation);
  const previous = findPreviousSnapshot(root, generated);
  const metrics: SnapshotMetrics = {
    corpusRoot: root,
    generated,
    flow: SNAPSHOT_FLOW_PATH,
    dimensions: {
      papers: nodes,
      citationSidecars: countFiles(path.join(root, 'documentation', 'citations'), (f) => /^REF-.*-citations\.md$/.test(f)),
      radarSidecars: countFiles(path.join(root, 'documentation', 'radar'), (f) => /^REF-.*-radar\.md$/.test(f)),
      pdfsFull: firstExistingCount(root, ['pdfs/full', 'sources/pdfs/full'], (f) => !f.startsWith('.')),
      webSources: firstExistingCount(root, ['sources/web'], () => true),
      indexFiles: firstExistingCount(root, ['indices'], (f) => /\.md$/i.test(f)),
      peopleProfiles: countFiles(path.join(root, 'documentation', 'profiles', 'people'), (f) => /^PROF-P-.*\.md$/.test(f)),
      authors: authors.size,
      topics: topics.size,
      yearRange: years.length ? `${Math.min(...years)}-${Math.max(...years)}` : 'unknown',
    },
    topology: {
      nodes,
      edges,
      density,
      averageDegree: nodes ? edges / nodes : 0,
      isolatedNodes: isolatedRecords.length,
      isolatedRefs: isolatedRecords.map((r) => r.refId).sort(sortRefs),
      topHubs,
    },
    degreeDistribution,
    gradeDistribution: grades,
    gradeOffVocabulary: offVocab,
    sourceTypeDistribution: sourceTypes,
    integrity: {
      orphanCount: findOrphans(root).length,
      orphanRefs: findOrphans(root).map((o) => o.ref).sort(sortRefs),
      recommendations,
    },
    previous,
    delta: null,
  };
  metrics.delta = computeDelta(metrics, previous);
  return metrics;
}

function table(rows: string[][]): string {
  return rows.map((r) => `| ${r.join(' | ')} |`).join('\n') + '\n';
}

function renderDimensions(m: SnapshotMetrics): string {
  return table([
    ['Metric', 'Value'],
    ['---', '---:'],
    ['Papers', String(m.dimensions.papers)],
    ['Citation sidecars', String(m.dimensions.citationSidecars)],
    ['Radar sidecars', String(m.dimensions.radarSidecars)],
    ['PDFs (full)', String(m.dimensions.pdfsFull)],
    ['Web sources', String(m.dimensions.webSources)],
    ['Index files', String(m.dimensions.indexFiles)],
    ['People profiles', String(m.dimensions.peopleProfiles)],
    ['Unique authors', String(m.dimensions.authors)],
    ['Unique topics', String(m.dimensions.topics)],
    ['Year range', m.dimensions.yearRange],
  ]);
}

function renderCorpusDimensions(m: SnapshotMetrics): string {
  return table([
    ['Graph', 'Nodes', 'Edges'],
    ['---', '---:', '---:'],
    ['papers (PDFs)', String(m.dimensions.pdfsFull), '0'],
    ['summaries (analysis docs)', String(m.dimensions.papers), '0'],
    ['citation-network', String(m.topology.nodes), String(m.topology.edges)],
    ['web-sources', String(m.dimensions.webSources), '0'],
    ['indices', String(m.dimensions.indexFiles), '0'],
  ]) +
    `\n${m.dimensions.papers} reference entries, ${m.dimensions.pdfsFull} archived PDFs, ${m.dimensions.webSources} web source snapshots.\n` +
    `Citation graph: ${m.topology.edges} outgoing directed in-corpus edges; density ${m.topology.density.toFixed(4)}.\n`;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function degreeStats(values: number[]): { max: number; median: number; mean: number } {
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    max: values.length ? Math.max(...values) : 0,
    median: median(values),
    mean: values.length ? sum / values.length : 0,
  };
}

function renderTopology(m: SnapshotMetrics): string {
  const lines = table([
    ['Metric', 'Value'],
    ['---', '---:'],
    ['Nodes', String(m.topology.nodes)],
    ['Citation edges', String(m.topology.edges)],
    ['Graph density', m.topology.density.toFixed(6)],
    ['Average out-degree', m.topology.averageDegree.toFixed(2)],
    ['Isolated nodes', String(m.topology.isolatedNodes)],
  ]).split('\n').filter(Boolean);
  lines.push('', '### Top Hubs', '', '| REF | Title | In | Out | Total |', '|---|---|---:|---:|---:|');
  for (const h of m.topology.topHubs.slice(0, 10)) {
    lines.push(`| ${h.ref} | ${h.title.replace(/\|/g, '\\|').slice(0, 80)} | ${h.in} | ${h.out} | ${h.total} |`);
  }
  return lines.join('\n') + '\n';
}

function renderGraphTopology(m: SnapshotMetrics): string {
  const incoming = m.topology.topHubs
    .slice()
    .sort((a, b) => b.in - a.in || b.out - a.out || a.ref.localeCompare(b.ref));
  const outgoing = m.topology.topHubs
    .slice()
    .sort((a, b) => b.out - a.out || b.in - a.in || a.ref.localeCompare(b.ref));
  const foundational = incoming.filter((h) => h.in >= 9 && h.out <= 2);
  const inStats = degreeStats(m.topology.topHubs.map((h) => h.in));
  const outStats = degreeStats(m.topology.topHubs.map((h) => h.out));
  const lines: string[] = [];
  lines.push('### Hub Nodes (Most Cited Within Corpus)', '');
  lines.push('| Rank | REF | Paper | Cited-by | Cites |', '|---:|---|---|---:|---:|');
  incoming.slice(0, 10).forEach((h, i) => {
    lines.push(`| ${i + 1} | ${h.ref} | ${h.title.replace(/\|/g, '\\|').slice(0, 90)} | ${h.in} | ${h.out} |`);
  });
  lines.push('', '### Highest Out-Degree (Synthesis Papers)', '');
  lines.push('| REF | Paper | Cites | Cited-by |', '|---|---|---:|---:|');
  outgoing.slice(0, 5).forEach((h) => {
    lines.push(`| ${h.ref} | ${h.title.replace(/\|/g, '\\|').slice(0, 90)} | ${h.out} | ${h.in} |`);
  });
  lines.push('', '### Foundational Papers (High Cited-by, Low Cites)', '');
  lines.push('| REF | Paper | Cited-by | Cites |', '|---|---|---:|---:|');
  foundational.slice(0, 10).forEach((h) => {
    lines.push(`| ${h.ref} | ${h.title.replace(/\|/g, '\\|').slice(0, 90)} | ${h.in} | ${h.out} |`);
  });
  if (!foundational.length) lines.push('| none | - | 0 | 0 |');
  lines.push('', '### Orphan Papers (Zero Incoming)', '');
  lines.push(`${m.topology.isolatedNodes} isolated papers with zero incoming and zero outgoing citations. Sample: ${m.topology.isolatedRefs.slice(0, 25).join(', ') || 'none'}.`);
  lines.push('', '### Degree Distribution', '');
  lines.push('| Direction | Max | Median | Mean |', '|---|---:|---:|---:|');
  lines.push(`| Incoming | ${inStats.max} | ${inStats.median.toFixed(1)} | ${inStats.mean.toFixed(2)} |`);
  lines.push(`| Outgoing | ${outStats.max} | ${outStats.median.toFixed(1)} | ${outStats.mean.toFixed(2)} |`);
  return lines.join('\n') + '\n';
}

function renderDistribution(title: string, values: Record<string, number>): string {
  const rows = [[title, 'Count'], ['---', '---:'], ...sortedEntries(values).map(([k, v]) => [k, String(v)])];
  return table(rows);
}

function renderGrade(m: SnapshotMetrics): string {
  return renderDistribution('GRADE', m.gradeDistribution) + `\nOff-vocabulary GRADE values: ${m.gradeOffVocabulary}\n`;
}

function renderIntegrity(m: SnapshotMetrics): string {
  const recs = Object.keys(m.integrity.recommendations).length
    ? sortedEntries(m.integrity.recommendations).map(([k, v]) => `${k}: ${v}`).join(', ')
    : 'none';
  const sample = m.integrity.orphanRefs.slice(0, 20).join(', ') || 'none';
  return `Orphan sidecars: ${m.integrity.orphanCount}\n\nIntegrity recommendations: ${recs}\n\nOrphan refs: ${sample}${m.integrity.orphanRefs.length > 20 ? ', ...' : ''}\n`;
}

export function renderDelta(m: SnapshotMetrics): string {
  if (!m.delta) return 'No previous snapshot found.\n';
  const rows = [
    ['Metric', 'Previous', 'Current', 'Delta'],
    ['---', '---:', '---:', '---:'],
    ...m.delta.values.map((d) => [d.metric, String(d.previous), String(d.current), d.delta > 0 ? `+${d.delta}` : String(d.delta)]),
  ];
  return `Previous snapshot: ${m.delta.previousPath}${m.delta.previousDate ? ` (${m.delta.previousDate})` : ''}\n\n${table(rows)}`;
}

function extractOutputFormatTemplate(template: string): string {
  const match = template.match(/## Output Format[\s\S]*?```markdown\n([\s\S]*?)\n```/);
  if (!match) return template;
  let body = match[1];
  body = body.replace(/^---\n[\s\S]*?\n---\n+/, '');
  return body;
}

function replaceSection(body: string, headingPattern: RegExp, replacement: string): string {
  const match = body.match(headingPattern);
  if (!match || match.index === undefined) return body;
  const start = match.index;
  const next = body.slice(start + match[0].length).search(/\n##\s+/);
  const end = next === -1 ? body.length : start + match[0].length + next;
  const heading = match[0].replace(/\s+\[COMPUTE\]/, '').trimEnd();
  return body.slice(0, start) + `${heading}\n\n${replacement.trimEnd()}\n` + body.slice(end);
}

function fillScalarPlaceholders(body: string, m: SnapshotMetrics): string {
  const previous = m.previous?.date ?? m.previous?.path ?? 'none';
  const delta = m.delta?.values ?? [];
  const papersDelta = delta.find((d) => d.metric === 'papers')?.delta;
  const edgesDelta = delta.find((d) => d.metric === 'edges')?.delta;
  const signed = (n: number | undefined): string => n === undefined ? '+0' : n >= 0 ? `+${n}` : String(n);
  return body
    .replaceAll('{{YYYY-MM-DD}}', m.generated)
    .replaceAll('{{total REF count}}', String(m.dimensions.papers))
    .replaceAll('{{total unique directed edges}}', String(m.topology.edges))
    .replaceAll('{{current phase description}}', 'compute-only snapshot')
    .replaceAll('{{planned next phase}}', 'human/agent analysis')
    .replaceAll('{{path to prior snapshot}}', m.previous?.path ?? 'none')
    .replaceAll('{{phase description}}', 'compute-only snapshot')
    .replaceAll('{{date and path}}', previous)
    .replaceAll('{{+N papers, +M edges since last snapshot}}', `${signed(papersDelta)} papers, ${signed(edgesDelta)} edges`);
}

function materializeTemplate(template: string, m: SnapshotMetrics): string {
  let body = extractOutputFormatTemplate(template).replace(/\[DATE\]/g, m.generated);
  body = fillScalarPlaceholders(body, m);
  body = replaceSection(body, /^## Corpus Dimensions\s+\[COMPUTE\]/m, renderCorpusDimensions(m));
  body = replaceSection(body, /^## Graph Topology\s+\[COMPUTE\]/m, renderGraphTopology(m));
  body = replaceSection(body, /^## Temporal Distribution\s+\[COMPUTE\]/m, '[ANALYZE: temporal distribution narrative not computed by this command]');
  body = replaceSection(body, /^## Delta from Previous Snapshot\s+\[COMPUTE\]/m, renderDelta(m));
  return body;
}

function frontmatter(m: SnapshotMetrics): string {
  const prev = m.previous?.path ?? null;
  return [
    '---',
    'type: corpus-snapshot',
    `date: ${m.generated}`,
    `papers: ${m.dimensions.papers}`,
    `edges: ${m.topology.edges}`,
    `density: ${Number(m.topology.density.toFixed(6))}`,
    `isolatedNodes: ${m.topology.isolatedNodes}`,
    `orphanCount: ${m.integrity.orphanCount}`,
    `gradeOffVocabulary: ${m.gradeOffVocabulary}`,
    `flow: ${SNAPSHOT_FLOW_PATH}`,
    prev ? `previous: ${prev}` : 'previous: null',
    '---',
    '',
  ].join('\n');
}

function analysisPlaceholder(marker: string, notes?: string): string {
  return notes ? notes : marker;
}

export function renderSnapshotMarkdown(m: SnapshotMetrics, options: SnapshotOptions = {}): string {
  if (options.deltaOnly) return renderDelta(m);
  let template = DEFAULT_TEMPLATE;
  if (options.template) {
    const full = path.isAbsolute(options.template) ? options.template : path.join(m.corpusRoot, options.template);
    template = fs.readFileSync(full, 'utf-8');
  } else {
    const defaultTemplatePath = path.join(m.corpusRoot, '.aiwg', 'reports', 'corpus-snapshot-template.md');
    if (fs.existsSync(defaultTemplatePath)) template = fs.readFileSync(defaultTemplatePath, 'utf-8');
  }
  let body = materializeTemplate(template, m);
  const replacements: Record<string, string> = {
    '[COMPUTE: dimensions-table]': renderDimensions(m).trimEnd(),
    '[COMPUTE: topology-metrics]': renderTopology(m).trimEnd(),
    '[COMPUTE: degree-histogram]': renderDistribution('Degree', m.degreeDistribution).trimEnd(),
    '[COMPUTE: grade-distribution]': renderGrade(m).trimEnd(),
    '[COMPUTE: source-type-distribution]': renderDistribution('Source type', m.sourceTypeDistribution).trimEnd(),
    '[COMPUTE: integrity-orphans]': renderIntegrity(m).trimEnd(),
    '[COMPUTE: delta-from-previous]': renderDelta(m).trimEnd(),
  };
  for (const [marker, value] of Object.entries(replacements)) {
    body = body.replaceAll(marker, value);
  }
  if (options.computeOnly) {
    body = body.replace(/\[ANALYZE: [^\]]+\]/g, '[ANALYZE: intentionally left for human/agent narrative]');
  } else {
    body = body.replace(/\[ANALYZE: [^\]]+\]/g, (marker) => analysisPlaceholder(marker, options.notes));
  }
  body = body.replace(/\{\{([^}]+)\}\}/g, (_m, inner) => `[ANALYZE: ${String(inner).trim()}]`);
  return frontmatter(m) + body.replace(/\s+$/, '') + '\n';
}

export function renderSnapshotSummary(m: SnapshotMetrics): string {
  const delta = m.delta?.values ?? [];
  const d = (metric: string): string => {
    const item = delta.find((x) => x.metric === metric);
    if (!item) return '';
    return item.delta > 0 ? ` (+${item.delta})` : ` (${item.delta})`;
  };
  const top = m.topology.topHubs[0];
  return [
    'Corpus Snapshot',
    '',
    `Papers: ${m.dimensions.papers}${d('papers')} | Edges: ${m.topology.edges}${d('edges')}`,
    `Density: ${m.topology.density.toFixed(6)}${d('density')} | Isolated: ${m.topology.isolatedNodes}${d('isolatedNodes')}`,
    `Top hub: ${top ? `${top.ref} (${top.total})` : 'none'}`,
    `GRADE: ${sortedEntries(m.gradeDistribution).map(([k, v]) => `${k}=${v}`).join(', ')}; off-vocab=${m.gradeOffVocabulary}`,
    `Source types: ${sortedEntries(m.sourceTypeDistribution).map(([k, v]) => `${k}=${v}`).join(', ')}`,
    `Flow: ${SNAPSHOT_FLOW_PATH}`,
  ].join('\n') + '\n';
}

export function renderSnapshotJson(m: SnapshotMetrics): string {
  return JSON.stringify(m, null, 2) + '\n';
}

export function renderSnapshot(m: SnapshotMetrics, options: SnapshotOptions = {}): string {
  const format = options.format ?? 'full';
  if (format === 'json') return renderSnapshotJson(m);
  if (format === 'summary') return renderSnapshotSummary(m);
  return renderSnapshotMarkdown(m, options);
}

export function snapshotOutputPath(root: string, options: SnapshotOptions): string | null {
  if (options.out) return path.isAbsolute(options.out) ? options.out : path.join(root, options.out);
  if (options.write) return path.join(root, '.aiwg', 'reports', `corpus-snapshot-${options.date ?? new Date().toISOString().slice(0, 10)}.md`);
  return null;
}

export function runSnapshot(root: string, options: SnapshotOptions = {}): { content: string; outPath: string | null; metrics: SnapshotMetrics | null } {
  const metrics = computeSnapshot(root, options);
  if (!metrics) {
    const message = options.format === 'json'
      ? JSON.stringify({ status: 'skipped', reason: 'no research corpus found', corpusRoot: root }, null, 2) + '\n'
      : `No research corpus found at ${root}; expected documentation/references/REF-*.md\n`;
    return { content: message, outPath: null, metrics: null };
  }
  const content = renderSnapshot(metrics, options);
  const outPath = snapshotOutputPath(root, { ...options, date: metrics.generated });
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, content, 'utf-8');
  }
  return { content, outPath, metrics };
}
