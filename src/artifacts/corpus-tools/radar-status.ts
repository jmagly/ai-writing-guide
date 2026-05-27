/**
 * radar-status — overdue/freshness report over all radar sidecars (#1498).
 *
 * Port of corpus/radar_staleness.py: computes staleness for every radar sidecar
 * (shared computeStaleness), sorts most-overdue-first, and renders table / csv /
 * list. on-demand and undatable radars sort last (no overdue).
 *
 * @source historical: corpus/radar_staleness.py
 */

import { computeStaleness } from '../corpus-views/corpus-config.js';
import { loadRadars } from './radar-shared.js';

export interface RadarStatusRow {
  refId: string;
  cadence: string;
  lastRefreshed: string;
  /** Whole days since last refresh, or null when undatable. */
  daysSince: number | null;
  /** daysSince − cadence window; null for on-demand/unknown/undatable. */
  overdueDays: number | null;
  isStale: boolean;
  grade: string;
  trajectory: string;
  cluster: string;
}

export type RadarStatusFormat = 'table' | 'csv' | 'list';

export interface RadarStatusOptions {
  /** ISO date as-of (defaults to today, UTC midnight). */
  today?: string;
  /** Only return rows that are overdue. */
  staleOnly?: boolean;
}

function asOf(today: string | undefined): Date {
  const iso = today ?? new Date().toISOString().slice(0, 10);
  return new Date(`${iso}T00:00:00Z`);
}

/** Compute one status row per radar sidecar, sorted most-overdue-first. */
export function radarStatusRows(corpusRoot: string, opts: RadarStatusOptions = {}): RadarStatusRow[] {
  const today = asOf(opts.today);
  const rows: RadarStatusRow[] = loadRadars(corpusRoot).map((doc) => {
    const s = computeStaleness(doc.meta.refreshCadence, doc.meta.lastRefreshed, today);
    return {
      refId: doc.refId,
      cadence: doc.meta.refreshCadence ?? '?',
      lastRefreshed: doc.meta.lastRefreshed ?? '',
      daysSince: s.daysSince,
      overdueDays: s.overdueDays,
      isStale: s.isStale,
      grade: doc.meta.gradeCurrent ?? doc.meta.gradeOriginal ?? '?',
      trajectory: doc.meta.gradeTrajectory ?? 'stable',
      cluster: doc.meta.cluster ?? '',
    };
  });

  const filtered = opts.staleOnly ? rows.filter((r) => r.isStale) : rows;
  // Most overdue first; non-overdue (null) sort after; ties by REF id.
  return filtered.sort((a, b) => {
    const ao = a.overdueDays ?? -Infinity;
    const bo = b.overdueDays ?? -Infinity;
    if (ao !== bo) return bo - ao;
    return a.refId < b.refId ? -1 : a.refId > b.refId ? 1 : 0;
  });
}

/** Render status rows as a markdown table, CSV, or plain list. */
export function renderRadarStatus(rows: RadarStatusRow[], format: RadarStatusFormat = 'table'): string {
  if (format === 'csv') {
    const head = 'ref,cadence,last_refreshed,days_since,overdue_days,is_stale,grade,trajectory,cluster';
    const body = rows.map(
      (r) =>
        `${r.refId},${r.cadence},${r.lastRefreshed},${r.daysSince ?? ''},${r.overdueDays ?? ''},${r.isStale},${r.grade},${r.trajectory},${r.cluster}`,
    );
    return [head, ...body].join('\n') + '\n';
  }
  if (format === 'list') {
    return (
      rows
        .map((r) => {
          const tag = r.isStale ? `OVERDUE +${r.overdueDays}d` : r.overdueDays === null ? 'n/a' : `ok (${-r.overdueDays}d left)`;
          return `- ${r.refId} [${r.grade}] ${r.cadence} — last ${r.lastRefreshed || '?'} — ${tag}`;
        })
        .join('\n') + '\n'
    );
  }
  // table
  const lines = [
    '| REF | GRADE | Cadence | Last Refreshed | Days Since | Overdue (days) | Stale |',
    '|---|---|---|---|---:|---:|---|',
  ];
  for (const r of rows) {
    lines.push(
      `| ${r.refId} | ${r.grade} | ${r.cadence} | ${r.lastRefreshed || '—'} | ${r.daysSince ?? '—'} | ${r.overdueDays ?? '—'} | ${r.isStale ? 'yes' : 'no'} |`,
    );
  }
  return lines.join('\n') + '\n';
}
