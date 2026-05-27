/**
 * radar-report — aggregate radar sidecars into a corpus/cluster freshness report (#1498).
 *
 * Port of corpus/radar_report.py: totals, overdue count, per-cluster / per-GRADE
 * / per-trajectory breakdowns, an overdue table (most-overdue-first), and a
 * per-radar summary with the §1 GRADE-reassessment rationale snippet. Reuses the
 * shared loader + staleness helper.
 *
 * @source historical: corpus/radar_report.py
 */

import { computeStaleness } from '../corpus-views/corpus-config.js';
import { loadRadars, type RadarDoc } from './radar-shared.js';

export interface RadarReportOptions {
  /** Filter to a single cluster tag. */
  cluster?: string;
  /** ISO date as-of (defaults to today, UTC midnight). */
  today?: string;
}

interface ReportRow {
  refId: string;
  cluster: string;
  grade: string;
  trajectory: string;
  cadence: string;
  lastRefreshed: string;
  daysSince: number | null;
  overdueDays: number | null;
  isStale: boolean;
  text: string;
}

/** Extract the first prose line from a `## <prefix>` section (skips tables/rules). */
function sectionSnippet(text: string, prefix: string): string {
  const lines = text.split('\n');
  let inSection = false;
  const buf: string[] = [];
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (inSection) break;
      if (line.startsWith(prefix)) {
        inSection = true;
        continue;
      }
    }
    if (inSection) buf.push(line);
  }
  for (const raw of buf) {
    const line = raw.trim();
    if (line && !line.startsWith('|') && !line.startsWith('---')) return line.slice(0, 200);
  }
  return '';
}

function toRow(doc: RadarDoc, today: Date): ReportRow {
  const s = computeStaleness(doc.meta.refreshCadence, doc.meta.lastRefreshed, today);
  return {
    refId: doc.refId,
    cluster: doc.meta.cluster ?? '',
    grade: doc.meta.gradeCurrent ?? doc.meta.gradeOriginal ?? '?',
    trajectory: doc.meta.gradeTrajectory ?? 'stable',
    cadence: doc.meta.refreshCadence ?? '?',
    lastRefreshed: doc.meta.lastRefreshed ?? '',
    daysSince: s.daysSince,
    overdueDays: s.overdueDays,
    isStale: s.isStale,
    text: doc.text,
  };
}

function countBy(rows: ReportRow[], key: (r: ReportRow) => string): Map<string, ReportRow[]> {
  const m = new Map<string, ReportRow[]>();
  for (const r of rows) {
    const k = key(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return m;
}

/** Build the markdown freshness report. Returns a "no radars" note when empty. */
export function renderRadarReport(corpusRoot: string, opts: RadarReportOptions = {}): string {
  const iso = opts.today ?? new Date().toISOString().slice(0, 10);
  const today = new Date(`${iso}T00:00:00Z`);

  let docs = loadRadars(corpusRoot);
  if (opts.cluster) docs = docs.filter((d) => (d.meta.cluster ?? '') === opts.cluster);
  if (!docs.length) {
    return opts.cluster ? `No radars matched cluster \`${opts.cluster}\`.\n` : 'No radar sidecars yet.\n';
  }

  const rows = docs.map((d) => toRow(d, today));
  const stale = rows.filter((r) => r.isStale);
  const byCluster = countBy(rows, (r) => r.cluster || '(untagged)');
  const byGrade = countBy(rows, (r) => r.grade);
  const byTrajectory = countBy(rows, (r) => r.trajectory);

  const sortedKeys = (m: Map<string, ReportRow[]>) => [...m.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const tag = opts.cluster ? ` — cluster \`${opts.cluster}\`` : '';
  const lines: string[] = [
    `# Radar Report ${iso}${tag}`,
    '',
    `**Total radars**: ${rows.length}`,
    `**Overdue (stale)**: ${stale.length}`,
    '',
    '## Clusters',
    '',
    '| Cluster | Count | Stale |',
    '|---|---:|---:|',
  ];
  for (const c of sortedKeys(byCluster)) {
    const members = byCluster.get(c)!;
    lines.push(`| ${c} | ${members.length} | ${members.filter((m) => m.isStale).length} |`);
  }

  lines.push('', '## GRADE Distribution', '', '| Grade | Count |', '|---|---:|');
  for (const g of sortedKeys(byGrade)) lines.push(`| ${g || '?'} | ${byGrade.get(g)!.length} |`);

  lines.push('', '## GRADE Trajectories', '', '| Trajectory | Count |', '|---|---:|');
  for (const t of sortedKeys(byTrajectory)) lines.push(`| ${t || '?'} | ${byTrajectory.get(t)!.length} |`);

  if (stale.length) {
    lines.push(
      '',
      '## Overdue Refreshes',
      '',
      '| REF | Cadence | Last refresh | Overdue days | GRADE | Cluster |',
      '|---|---|---|---:|---|---|',
    );
    for (const s of [...stale].sort((a, b) => (b.overdueDays ?? 0) - (a.overdueDays ?? 0))) {
      lines.push(`| ${s.refId} | ${s.cadence} | ${s.lastRefreshed} | ${s.overdueDays} | ${s.grade} | ${s.cluster} |`);
    }
  }

  lines.push('', '## Individual Radars', '');
  for (const r of rows) {
    lines.push(`### ${r.refId} — grade **${r.grade}**, trajectory \`${r.trajectory}\`, cadence \`${r.cadence}\``, '');
    lines.push(`- Cluster: ${r.cluster || '(none)'}`);
    lines.push(`- Last refreshed: ${r.lastRefreshed || '?'} (${r.daysSince ?? '?'} days ago)`);
    const snippet = sectionSnippet(r.text, '## 1.');
    if (snippet) lines.push(`- Rationale: ${snippet}`);
    lines.push('');
  }

  return lines.join('\n').replace(/\s+$/, '') + '\n';
}
