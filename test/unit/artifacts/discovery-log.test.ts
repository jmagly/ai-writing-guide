/**
 * discovery-log tests (#1499).
 *
 * @source @src/artifacts/corpus-tools/discovery-log.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { logDiscovery, renderDiscoveryBlock } from '../../../src/artifacts/corpus-tools/discovery-log.js';

let root: string;
const TODAY = '2026-05-26';

function sidecar(id: string, fm: string): void {
  const full = join(root, 'documentation', 'citations', `${id}-citations.md`);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, `---\n${fm}\n---\n# ${id}\n## Outgoing\n## Incoming\n`);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-disclog-'));
  sidecar('REF-200', 'ref: REF-200\ntitle: T\nauthors:\n  - "Lee, Sam"');
  sidecar('REF-201', 'ref: REF-201\ntitle: T\ndiscovery:\n  date: 2025-01-01\n  surface: rss\n  curator-id: PROF-S-old');
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('renderDiscoveryBlock', () => {
  it('renders the block with curator-id null when absent', () => {
    expect(renderDiscoveryBlock({ surface: 'x-search' }, TODAY)).toBe(`discovery:\n  date: ${TODAY}\n  surface: x-search\n  curator-id: null`);
  });
});

describe('logDiscovery', () => {
  it('dry-runs without writing and splices the block into frontmatter', () => {
    const r = logDiscovery(root, 'REF-200', { surface: 'x-account', via: 'x.com/@a', curatorId: 'PROF-S-a', date: TODAY });
    expect(r.status).toBe('dry-run');
    expect(r.content).toContain('discovery:');
    expect(r.content).toContain('surface: x-account');
    expect(r.content).toContain('curator-id: PROF-S-a');
    // original frontmatter preserved
    expect(r.content).toContain('authors:');
    expect(r.content).toContain('# REF-200');
    // not written
    expect(readFileSync(join(root, 'documentation/citations/REF-200-citations.md'), 'utf-8')).not.toContain('discovery:');
  });

  it('writes the block when --write', () => {
    logDiscovery(root, 'REF-200', { surface: 'x-account', curatorId: 'PROF-S-a', date: TODAY, write: true });
    const out = readFileSync(join(root, 'documentation/citations/REF-200-citations.md'), 'utf-8');
    expect(out).toContain('surface: x-account');
    expect(out).toContain('curator-id: PROF-S-a');
  });

  it('replaces an existing discovery block (no duplication)', () => {
    const r = logDiscovery(root, 'REF-201', { surface: 'newsletter', curatorId: 'PROF-S-new', date: TODAY, write: true });
    const out = r.content!;
    expect((out.match(/discovery:/g) || []).length).toBe(1);
    expect(out).toContain('surface: newsletter');
    expect(out).toContain('curator-id: PROF-S-new');
    expect(out).not.toContain('surface: rss'); // old block gone
    expect(out).not.toContain('PROF-S-old');
  });

  it('skips a missing sidecar and rejects an unknown surface', () => {
    expect(logDiscovery(root, 'REF-999', { surface: 'web' }).status).toBe('skip');
    expect(() => logDiscovery(root, 'REF-200', { surface: 'tiktok' })).toThrow(/unknown surface/);
  });
});
