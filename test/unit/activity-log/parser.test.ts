/**
 * Tests for src/activity-log/parser.ts and types.ts
 *
 * @issue #934
 * @issue #964
 */

import { describe, it, expect } from 'vitest';
import { parseLine, parseLog, parseUtcDate, parseUtcTimestamp } from '../../../src/activity-log/parser.js';
import { formatEntry, formatUtcTimestamp, isActivityOperation } from '../../../src/activity-log/types.js';

describe('activity-log/types', () => {
  describe('isActivityOperation', () => {
    it('accepts each documented operation', () => {
      for (const op of ['ingest', 'create', 'update', 'delete', 'query', 'lint', 'deploy', 'archive', 'promote']) {
        expect(isActivityOperation(op)).toBe(true);
      }
    });

    it('rejects unknown tokens', () => {
      expect(isActivityOperation('refactor')).toBe(false);
      expect(isActivityOperation('CREATE')).toBe(false);
      expect(isActivityOperation('')).toBe(false);
    });
  });

  describe('formatUtcTimestamp', () => {
    it('formats as YYYY-MM-DD HH:MM in UTC', () => {
      const d = new Date(Date.UTC(2026, 3, 28, 14, 33, 5));
      expect(formatUtcTimestamp(d)).toBe('2026-04-28 14:33');
    });

    it('zero-pads single-digit components', () => {
      const d = new Date(Date.UTC(2026, 0, 5, 3, 7, 0));
      expect(formatUtcTimestamp(d)).toBe('2026-01-05 03:07');
    });
  });

  describe('formatEntry', () => {
    it('produces the canonical wire format', () => {
      const line = formatEntry({
        timestamp: new Date(Date.UTC(2026, 3, 28, 14, 33, 0)),
        operation: 'create',
        summary: '.aiwg/requirements/UC-007.md',
      });
      expect(line).toBe('## [2026-04-28 14:33] create | .aiwg/requirements/UC-007.md');
    });
  });
});

describe('activity-log/parser', () => {
  describe('parseUtcTimestamp', () => {
    it('parses canonical timestamps', () => {
      const d = parseUtcTimestamp('2026-04-28 14:33');
      expect(d).toEqual(new Date(Date.UTC(2026, 3, 28, 14, 33)));
    });

    it('rejects malformed timestamps', () => {
      expect(parseUtcTimestamp('2026-4-28 14:33')).toBeNull();
      expect(parseUtcTimestamp('2026-04-28T14:33')).toBeNull();
      expect(parseUtcTimestamp('not a date')).toBeNull();
    });
  });

  describe('parseUtcDate', () => {
    it('parses YYYY-MM-DD as UTC midnight', () => {
      const d = parseUtcDate('2026-04-28');
      expect(d).toEqual(new Date(Date.UTC(2026, 3, 28)));
    });

    it('rejects malformed dates', () => {
      expect(parseUtcDate('2026/04/28')).toBeNull();
      expect(parseUtcDate('28-04-2026')).toBeNull();
    });
  });

  describe('parseLine', () => {
    it('parses a canonical line', () => {
      const entry = parseLine('## [2026-04-28 14:33] create | UC-007 created');
      expect(entry).not.toBeNull();
      expect(entry?.operation).toBe('create');
      expect(entry?.summary).toBe('UC-007 created');
      expect(entry?.rawTimestamp).toBe('2026-04-28 14:33');
    });

    it('handles summaries containing pipes and brackets', () => {
      const entry = parseLine(
        '## [2026-04-28 14:33] update | .aiwg/foo.md — added [section 3] | finalized'
      );
      expect(entry?.summary).toBe('.aiwg/foo.md — added [section 3] | finalized');
    });

    it('returns null for unknown operation tokens', () => {
      expect(parseLine('## [2026-04-28 14:33] refactor | foo')).toBeNull();
    });

    it('returns null for non-matching lines', () => {
      expect(parseLine('# This is a heading')).toBeNull();
      expect(parseLine('')).toBeNull();
      expect(parseLine('random text')).toBeNull();
    });
  });

  describe('parseLog', () => {
    it('skips blank lines and malformed entries', () => {
      const content = [
        '## [2026-04-28 14:33] create | first',
        '',
        'random text',
        '## [2026-04-28 14:34] update | second',
        '## [bad timestamp] create | third',
      ].join('\n');
      const entries = parseLog(content);
      expect(entries).toHaveLength(2);
      expect(entries[0].summary).toBe('first');
      expect(entries[1].summary).toBe('second');
    });

    it('returns empty array on empty input', () => {
      expect(parseLog('')).toEqual([]);
    });
  });

  describe('round-trip', () => {
    it('format → parse preserves entries', () => {
      const ts = new Date(Date.UTC(2026, 3, 28, 14, 33));
      const line = formatEntry({ timestamp: ts, operation: 'deploy', summary: 'sdlc to copilot' });
      const entry = parseLine(line);
      expect(entry?.operation).toBe('deploy');
      expect(entry?.summary).toBe('sdlc to copilot');
      // Minute-level precision survives; sub-minute does not (by design)
      expect(entry?.timestamp.getTime()).toBe(ts.getTime());
    });
  });
});
