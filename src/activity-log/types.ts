/**
 * Activity Log Types
 *
 * Type definitions for `.aiwg/activity.log` entries. The wire format is
 * frozen by the activity-log rule (`agentic/code/addons/aiwg-utils/rules/activity-log.md`):
 *
 *     ## [YYYY-MM-DD HH:MM] <operation> | <summary>
 *
 * @issue #934
 * @issue #964
 */

/**
 * Valid operation tokens. The activity-log rule freezes this set;
 * additions require updating the rule too.
 */
export const ACTIVITY_OPERATIONS = [
  'ingest',
  'create',
  'update',
  'delete',
  'query',
  'lint',
  'deploy',
  'archive',
  'promote',
] as const;

export type ActivityOperation = (typeof ACTIVITY_OPERATIONS)[number];

export interface ActivityEntry {
  /** UTC timestamp parsed from the line, e.g., 2026-04-28T14:33:00Z. */
  timestamp: Date;
  /** Original raw timestamp string from the line ("YYYY-MM-DD HH:MM"). */
  rawTimestamp: string;
  /** Operation token. */
  operation: ActivityOperation;
  /** One-sentence summary (no leading/trailing whitespace). */
  summary: string;
}

export function isActivityOperation(s: string): s is ActivityOperation {
  return (ACTIVITY_OPERATIONS as readonly string[]).includes(s);
}

/**
 * Format an entry as the canonical wire line (no trailing newline).
 *
 * Wire format: `## [YYYY-MM-DD HH:MM] <operation> | <summary>`
 */
export function formatEntry(entry: { timestamp: Date; operation: ActivityOperation; summary: string }): string {
  const ts = formatUtcTimestamp(entry.timestamp);
  return `## [${ts}] ${entry.operation} | ${entry.summary}`;
}

/**
 * Format a Date as the canonical "YYYY-MM-DD HH:MM" UTC timestamp.
 */
export function formatUtcTimestamp(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const HH = String(d.getUTCHours()).padStart(2, '0');
  const MM = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}`;
}
