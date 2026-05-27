/**
 * Shared corpus cadence/staleness config tests (#1498, #1502).
 *
 * @source @src/artifacts/corpus-views/corpus-config.ts
 */

import { describe, it, expect } from 'vitest';
import {
  CADENCE_DAYS,
  CADENCE_BY_GRADE,
  cadenceWindowDays,
  cadenceForGrade,
  computeStaleness,
} from '../../../src/artifacts/corpus-views/corpus-config.js';

const TODAY = new Date('2026-05-26T00:00:00Z');

/** ISO date `n` whole days before TODAY. */
function daysAgo(n: number): string {
  return new Date(TODAY.getTime() - n * 86_400_000).toISOString().slice(0, 10);
}

describe('cadence maps', () => {
  it('maps each cadence word to the correct window', () => {
    expect(CADENCE_DAYS.monthly).toBe(30);
    expect(CADENCE_DAYS.quarterly).toBe(90);
    expect(CADENCE_DAYS.biannual).toBe(180);
    expect(CADENCE_DAYS.annual).toBe(365);
    expect(CADENCE_DAYS['on-demand']).toBeNull();
  });

  it('accepts biennial and semi-annual as 180-day synonyms for biannual', () => {
    expect(CADENCE_DAYS.biennial).toBe(CADENCE_DAYS.biannual);
    expect(CADENCE_DAYS['semi-annual']).toBe(180); // profile cadence vocab (#1502)
  });

  it('defaults cadence by GRADE letter', () => {
    expect(CADENCE_BY_GRADE.A).toBe('quarterly');
    expect(CADENCE_BY_GRADE.B).toBe('biannual');
    expect(CADENCE_BY_GRADE.C).toBe('biannual');
    expect(CADENCE_BY_GRADE.D).toBe('on-demand');
  });
});

describe('cadenceWindowDays', () => {
  it('looks up case-insensitively', () => {
    expect(cadenceWindowDays('Quarterly')).toBe(90);
    expect(cadenceWindowDays('ANNUAL')).toBe(365);
  });

  it('returns null for on-demand (never stale) and undefined for unknown/absent', () => {
    expect(cadenceWindowDays('on-demand')).toBeNull();
    expect(cadenceWindowDays('fortnightly')).toBeUndefined();
    expect(cadenceWindowDays(null)).toBeUndefined();
    expect(cadenceWindowDays(undefined)).toBeUndefined();
  });
});

describe('cadenceForGrade', () => {
  it('maps grade letters to default cadence', () => {
    expect(cadenceForGrade('A')).toBe('quarterly');
    expect(cadenceForGrade('D')).toBe('on-demand');
  });

  it('uses only the leading letter and is case-insensitive', () => {
    expect(cadenceForGrade('a-')).toBe('quarterly');
    expect(cadenceForGrade('B+')).toBe('biannual');
  });

  it('falls back to biannual for unknown/absent grades', () => {
    expect(cadenceForGrade('?')).toBe('biannual');
    expect(cadenceForGrade('')).toBe('biannual');
    expect(cadenceForGrade(null)).toBe('biannual');
    expect(cadenceForGrade(undefined)).toBe('biannual');
  });
});

describe('computeStaleness', () => {
  it('flags an overdue radar (quarterly, refreshed 100 days ago → +10 overdue)', () => {
    const s = computeStaleness('quarterly', daysAgo(100), TODAY);
    expect(s.daysSince).toBe(100);
    expect(s.windowDays).toBe(90);
    expect(s.overdueDays).toBe(10);
    expect(s.isStale).toBe(true);
  });

  it('reports a not-yet-due radar with negative overdue, not stale', () => {
    const s = computeStaleness('quarterly', daysAgo(50), TODAY);
    expect(s.daysSince).toBe(50);
    expect(s.overdueDays).toBe(-40);
    expect(s.isStale).toBe(false);
  });

  it('treats exactly-at-window as not yet stale (overdue 0)', () => {
    const s = computeStaleness('quarterly', daysAgo(90), TODAY);
    expect(s.overdueDays).toBe(0);
    expect(s.isStale).toBe(false);
  });

  it('on-demand is never stale (window null, overdue null)', () => {
    const s = computeStaleness('on-demand', daysAgo(9999), TODAY);
    expect(s.windowDays).toBeNull();
    expect(s.overdueDays).toBeNull();
    expect(s.isStale).toBe(false);
  });

  it('unknown cadence is not computable (overdue null)', () => {
    const s = computeStaleness('whenever', daysAgo(500), TODAY);
    expect(s.windowDays).toBeUndefined();
    expect(s.daysSince).toBe(500);
    expect(s.overdueDays).toBeNull();
    expect(s.isStale).toBe(false);
  });

  it('unparseable / missing last-refreshed yields daysSince null, not stale', () => {
    for (const bad of ['', 'never', 'TBD', null, undefined]) {
      const s = computeStaleness('quarterly', bad, TODAY);
      expect(s.daysSince).toBeNull();
      expect(s.overdueDays).toBeNull();
      expect(s.isStale).toBe(false);
    }
  });
});
