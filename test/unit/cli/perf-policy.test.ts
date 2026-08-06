import { describe, expect, it } from 'vitest';
import {
  median,
  parsePositiveInt,
  summarizePairedTimings,
} from '../../helpers/cli-perf-policy.js';

describe('CLI performance gate policy', () => {
  it('parses positive environment overrides and rejects invalid sample counts', () => {
    expect(parsePositiveInt('650', 500)).toBe(650);
    expect(parsePositiveInt(undefined, 500)).toBe(500);
    expect(parsePositiveInt('0', 500)).toBe(500);
    expect(parsePositiveInt('6', 7, { minimum: 3, odd: true })).toBe(7);
    expect(parsePositiveInt('9', 7, { minimum: 3, odd: true })).toBe(9);
  });

  it('calculates medians without mutating the samples', () => {
    const values = [9, 1, 5, 3];
    expect(median(values)).toBe(4);
    expect(values).toEqual([9, 1, 5, 3]);
  });

  it('subtracts a baseline paired around every command sample', () => {
    const summary = summarizePairedTimings([
      { baselineBeforeMs: 100, commandMs: 610, baselineAfterMs: 120 },
      { baselineBeforeMs: 200, commandMs: 650, baselineAfterMs: 220 },
      { baselineBeforeMs: 90, commandMs: 900, baselineAfterMs: 110 },
    ]);
    expect(summary.baselineMedianMs).toBe(110);
    expect(summary.commandMedianMs).toBe(650);
    expect(summary.overheadsMs).toEqual([500, 440, 800]);
    expect(summary.overheadMedianMs).toBe(500);
    expect(summary.overheadMinMs).toBe(440);
    expect(summary.overheadMaxMs).toBe(800);
  });

  it('keeps a hard failure boundary for sustained regressions', () => {
    const summary = summarizePairedTimings([
      { baselineBeforeMs: 100, commandMs: 880, baselineAfterMs: 100 },
      { baselineBeforeMs: 120, commandMs: 900, baselineAfterMs: 120 },
      { baselineBeforeMs: 90, commandMs: 860, baselineAfterMs: 90 },
    ]);
    expect(summary.overheadMedianMs).toBeGreaterThanOrEqual(750);
  });
});
