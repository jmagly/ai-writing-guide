import { describe, it, expect } from 'vitest';
import { capRef, fmtId } from './util';

describe('capRef', () => {
  it('prefixes agents with @', () => {
    expect(capRef('agent', 'aiwg-steward')).toBe('@aiwg-steward');
  });

  it('injects skills as the bare name (no slash) — discover-first resolves them (#1642)', () => {
    expect(capRef('skill', 'intake-wizard')).toBe('intake-wizard');
  });

  it('keeps the slash for commands (the real slash-command surface)', () => {
    expect(capRef('command', 'discover')).toBe('/discover');
  });

  it('falls back to the bare name for unknown types', () => {
    expect(capRef('rule', 'no-attribution')).toBe('no-attribution');
  });
});

describe('fmtId', () => {
  it('truncates long ids with an ellipsis', () => {
    expect(fmtId('0123456789abcdef')).toBe('01234567…');
  });

  it('leaves short ids untouched', () => {
    expect(fmtId('short')).toBe('short');
  });
});
