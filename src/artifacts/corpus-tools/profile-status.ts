/**
 * profile-status — entity profiles past their refresh cadence (#1502).
 *
 * Port of profiles/find_stale_profiles.py: reads PROF-{P,O,G,F,S} frontmatter
 * via the shared parser, computes staleness with the shared computeStaleness
 * helper, and reports most-overdue-first. Profile-specific semantics, faithful
 * to the source:
 *  - missing `refresh-cadence` defaults to `annual`; an unknown cadence word is
 *    also treated as `annual` (find_stale's CADENCE_DAYS.get(cadence, 365));
 *  - `on-demand` is never stale;
 *  - stale when overdue ≥ 0 (at or past the window), vs radar's strictly-> 0.
 *
 * @source historical: profiles/find_stale_profiles.py
 */

import { loadProfiles } from '../corpus-views/ref-parser.js';
import { computeStaleness, cadenceWindowDays } from '../corpus-views/corpus-config.js';

export interface ProfileStatusRow {
  profId: string;
  name: string;
  type: string;
  cadence: string;
  lastRefreshed: string;
  daysSince: number | null;
  overdueDays: number | null;
  isStale: boolean;
}

export type ProfileStatusFormat = 'table' | 'csv' | 'list';

export interface ProfileStatusOptions {
  today?: string;
  /** Only return profiles that are overdue (mirrors find_stale_profiles output). */
  staleOnly?: boolean;
}

function asOf(today: string | undefined): Date {
  return new Date(`${today ?? new Date().toISOString().slice(0, 10)}T00:00:00Z`);
}

/** Stringify a frontmatter value; js-yaml parses bare ISO dates to Date. */
function fmStr(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return null;
}

/** One status row per profile that has a `last-refreshed`, sorted most-overdue-first. */
export function profileStatusRows(corpusRoot: string, opts: ProfileStatusOptions = {}): ProfileStatusRow[] {
  const today = asOf(opts.today);
  const rows: ProfileStatusRow[] = [];
  for (const p of loadProfiles(corpusRoot)) {
    const lastRefreshed = fmStr(p.frontmatter['last-refreshed']);
    if (!lastRefreshed) continue; // find_stale skips profiles without last-refreshed
    let cadence = fmStr(p.frontmatter['refresh-cadence']) ?? 'annual';
    if (cadenceWindowDays(cadence) === undefined) cadence = 'annual'; // unknown -> 365, per source
    const s = computeStaleness(cadence, lastRefreshed, today);
    rows.push({
      profId: p.profId,
      name: p.name ?? '',
      type: p.type ?? '',
      cadence,
      lastRefreshed,
      daysSince: s.daysSince,
      overdueDays: s.overdueDays,
      isStale: s.overdueDays !== null && s.overdueDays >= 0, // source: days_overdue >= 0
    });
  }
  const filtered = opts.staleOnly ? rows.filter((r) => r.isStale) : rows;
  return filtered.sort((a, b) => {
    const ao = a.overdueDays ?? -Infinity;
    const bo = b.overdueDays ?? -Infinity;
    if (ao !== bo) return bo - ao;
    return a.profId < b.profId ? -1 : a.profId > b.profId ? 1 : 0;
  });
}

/** Render profile-status rows as a markdown table, CSV, or plain list. */
export function renderProfileStatus(rows: ProfileStatusRow[], format: ProfileStatusFormat = 'table'): string {
  if (format === 'csv') {
    const head = 'prof_id,type,cadence,last_refreshed,days_since,overdue_days,is_stale';
    const body = rows.map(
      (r) => `${r.profId},${r.type},${r.cadence},${r.lastRefreshed},${r.daysSince ?? ''},${r.overdueDays ?? ''},${r.isStale}`,
    );
    return [head, ...body].join('\n') + '\n';
  }
  if (format === 'list') {
    return (
      rows
        .map((r) => {
          const tag = r.isStale ? `STALE +${r.overdueDays}d` : r.overdueDays === null ? 'n/a' : `ok (${-r.overdueDays}d left)`;
          return `- ${r.profId} [${r.type}] ${r.cadence} — last ${r.lastRefreshed} — ${tag}`;
        })
        .join('\n') + '\n'
    );
  }
  const lines = [
    '| Profile | Type | Cadence | Last Refreshed | Days Since | Overdue (days) | Stale |',
    '|---|---|---|---|---:|---:|---|',
  ];
  for (const r of rows) {
    lines.push(
      `| ${r.profId} | ${r.type || '—'} | ${r.cadence} | ${r.lastRefreshed} | ${r.daysSince ?? '—'} | ${r.overdueDays ?? '—'} | ${r.isStale ? 'yes' : 'no'} |`,
    );
  }
  return lines.join('\n') + '\n';
}
