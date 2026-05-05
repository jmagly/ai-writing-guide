/**
 * Tests for `aiwg storage list-backends` (#1087)
 *
 * Verifies READY/STUB labeling and --json structured output including
 * tracking_issue URLs for unimplemented backends.
 *
 * @source @src/storage/cli.ts
 * @issue #1087
 */

import { describe, it, expect } from 'vitest';
import { backendStatus } from '../../../src/storage/cli.js';
import { BACKEND_TYPES } from '../../../src/storage/index.js';

describe('storage list-backends backendStatus', () => {
  it('marks fs / obsidian / logseq / fortemi as implemented', () => {
    expect(backendStatus('fs').implemented).toBe(true);
    expect(backendStatus('obsidian').implemented).toBe(true);
    expect(backendStatus('logseq').implemented).toBe(true);
    expect(backendStatus('fortemi').implemented).toBe(true);
  });

  it.each([
    ['notion', '959'],
    ['anythingllm', '960'],
    ['s3', '962'],
    ['webdav', '963'],
  ] as const)('marks %s as stub with tracking issue #%s', (type, issueNumber) => {
    const s = backendStatus(type);
    expect(s.implemented).toBe(false);
    expect(s.trackingIssue).toBeDefined();
    expect(s.trackingIssue).toMatch(new RegExp(`/issues/${issueNumber}$`));
    expect(s.note).toContain(`#${issueNumber}`);
  });

  it('every BACKEND_TYPES entry resolves to a status', () => {
    for (const t of BACKEND_TYPES) {
      const s = backendStatus(t);
      expect(s.note.length).toBeGreaterThan(0);
      expect(typeof s.implemented).toBe('boolean');
    }
  });

  it('only stub backends carry a tracking_issue URL', () => {
    for (const t of BACKEND_TYPES) {
      const s = backendStatus(t);
      if (s.implemented) {
        expect(s.trackingIssue).toBeUndefined();
      } else {
        expect(s.trackingIssue).toMatch(/^https:\/\//);
      }
    }
  });
});
