/**
 * Shared research-corpus cadence + staleness config (#1498, #1502).
 *
 * Single source of truth for refresh-cadence → window math. Consumed by:
 *  - renderers.ts `radar-stale-queue` view (#1492)
 *  - the radar subsystem: radar-init GRADE→cadence default, radar-status (#1498)
 *  - the profile subsystem: profile-status staleness (#1502)
 *
 * Ports `corpus/radar_staleness.py` CADENCE_DAYS, `corpus/radar_init.py`
 * CADENCE_BY_GRADE, and `profiles/find_stale_profiles.py`'s cadence map into one
 * module so the date-math lives in exactly one place — the explicit #1498/#1502
 * "one staleness helper" requirement.
 *
 * @source historical: corpus/radar_staleness.py, corpus/radar_init.py
 */

/**
 * Refresh-cadence enum word → staleness window in days.
 *
 * `null` = on-demand: never auto-overdue. `biennial` is accepted as a synonym
 * for `biannual` (180d); both spellings appear in corpus sidecars. The Python
 * sources used distinct on-demand sentinels (radar_staleness: None;
 * find_stale_profiles: 9999) — both mean "never auto-stale", normalized to
 * `null` here.
 */
export const CADENCE_DAYS: Record<string, number | null> = {
  monthly: 30,
  quarterly: 90,
  biannual: 180,
  biennial: 180,
  annual: 365,
  'on-demand': null,
};

/**
 * Default refresh cadence by GRADE letter (radar-init scaffold default).
 * A→quarterly, B/C→biannual, D→on-demand. Ports `radar_init.py` CADENCE_BY_GRADE.
 */
export const CADENCE_BY_GRADE: Record<string, string> = {
  A: 'quarterly',
  B: 'biannual',
  C: 'biannual',
  D: 'on-demand',
};

/**
 * Look up the staleness window for a cadence word.
 * Returns `null` for on-demand and `undefined` for an unknown/absent cadence —
 * callers distinguish "never stale" (null) from "can't tell" (undefined).
 */
export function cadenceWindowDays(cadence: string | null | undefined): number | null | undefined {
  if (!cadence) return undefined;
  return CADENCE_DAYS[cadence.toLowerCase()];
}

/** Default cadence for a GRADE letter; falls back to `biannual` for unknown/absent grades. */
export function cadenceForGrade(grade: string | null | undefined): string {
  if (!grade) return 'biannual';
  const letter = grade.trim().toUpperCase()[0] ?? '';
  return CADENCE_BY_GRADE[letter] ?? 'biannual';
}

export interface Staleness {
  /** Whole days between `lastRefreshed` and `today` (UTC), or null when undatable. */
  daysSince: number | null;
  /** Cadence window in days; null = on-demand; undefined = unknown cadence word. */
  windowDays: number | null | undefined;
  /** `daysSince − windowDays`; null when not computable (on-demand / unknown / bad date). */
  overdueDays: number | null;
  /** True iff overdueDays is a positive number. */
  isStale: boolean;
}

const MS_PER_DAY = 86_400_000;

/**
 * Compute staleness for a `refresh-cadence` + `last-refreshed` ISO date as of
 * `today`. Mirrors `radar_staleness.compute_staleness`: whole-day floor,
 * UTC-midnight anchoring, and on-demand / unknown-cadence / undatable inputs all
 * yield `overdueDays === null` (not stale).
 *
 * `today` should be a UTC-midnight Date (e.g. `new Date('2026-05-26T00:00:00Z')`)
 * so day deltas are exact.
 */
export function computeStaleness(
  cadence: string | null | undefined,
  lastRefreshed: string | null | undefined,
  today: Date,
): Staleness {
  const windowDays = cadenceWindowDays(cadence);

  let daysSince: number | null = null;
  if (lastRefreshed) {
    const last = new Date(`${lastRefreshed}T00:00:00Z`);
    if (!Number.isNaN(last.getTime())) {
      daysSince = Math.floor((today.getTime() - last.getTime()) / MS_PER_DAY);
    }
  }

  const overdueDays = daysSince !== null && typeof windowDays === 'number' ? daysSince - windowDays : null;

  return { daysSince, windowDays, overdueDays, isStale: overdueDays !== null && overdueDays > 0 };
}
