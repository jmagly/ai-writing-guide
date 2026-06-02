/**
 * Citation-graph densification: extract-crossrefs + citation-backfill (#1505).
 *
 * @source @src/artifacts/corpus-tools/citation-densify.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  extractCrossrefs,
  backfillCitations,
} from '../../../src/artifacts/corpus-tools/citation-densify.js';

let root: string;

function sidecar(id: string, body: string): void {
  const f = join(root, 'documentation', 'citations', `${id}-citations.md`);
  mkdirSync(join(f, '..'), { recursive: true });
  writeFileSync(f, body);
}
function refDoc(id: string, body: string): void {
  const f = join(root, 'documentation', 'references', `${id}-paper.md`);
  mkdirSync(join(f, '..'), { recursive: true });
  writeFileSync(f, body);
}
function readSidecar(id: string): string {
  return readFileSync(join(root, 'documentation', 'citations', `${id}-citations.md`), 'utf-8');
}

const OUT_TABLE = [
  '## Outgoing',
  '',
  '| # | Title | Authors | Year | DOI/URL | Inducted REF |',
  '|---|-------|---------|------|---------|--------------|',
];
const IN_TABLE = [
  '## Incoming',
  '',
  '| # | Title | Authors | Year | DOI/URL | Inducted REF |',
  '|---|-------|---------|------|---------|--------------|',
];

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-densify-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('extract-crossrefs (#1505)', () => {
  it('reports cross-ref REFs (with sidecars) missing from the outgoing table', () => {
    // REF-001 analysis doc cross-references REF-002 (has sidecar) and REF-099 (NO sidecar).
    refDoc('REF-001', '# REF-001: Source\n\n## Cross-References\n\n- REF-002 peer work\n- REF-099 no sidecar\n');
    sidecar('REF-001', ['---', 'ref: REF-001', 'title: Source', 'type: citation', '---', '', ...OUT_TABLE, '', '## Incoming', 'None.', ''].join('\n'));
    sidecar('REF-002', '---\nref: REF-002\ntitle: Peer\ntype: citation\n---\n\n## Outgoing\nNone.\n\n## Incoming\nNone.\n');
    refDoc('REF-002', '# REF-002: Peer Work Title\n');

    const r = extractCrossrefs(root); // dry-run
    expect(r.perSource['REF-001']).toEqual(['REF-002']); // REF-099 excluded (no sidecar)
    expect(r.totalAdditions).toBe(1);
    // dry-run: nothing written
    expect(readSidecar('REF-001')).not.toContain('REF-002');
  });

  it('--write injects the missing outgoing edge with the target title', () => {
    refDoc('REF-001', '# REF-001: Source\n\n## Cross-References\n\n- REF-002 peer\n');
    sidecar('REF-001', ['---', 'ref: REF-001', 'title: Source', 'type: citation', '---', '', ...OUT_TABLE, '', '## Incoming', 'None.', ''].join('\n'));
    sidecar('REF-002', '---\nref: REF-002\ntitle: Peer\ntype: citation\n---\n\n## Outgoing\nNone.\n\n## Incoming\nNone.\n');
    refDoc('REF-002', '# REF-002: Peer Work Title\n');

    const r = extractCrossrefs(root, { write: true });
    expect(r.applied).toBe(1);
    const out = readSidecar('REF-001');
    expect(out).toContain('| 1 | Peer Work Title | — | — | — | REF-002 |');
  });

  it('does not re-add an edge already present in the outgoing table (idempotent)', () => {
    refDoc('REF-001', '# REF-001: Source\n\n## Cross-References\n\n- REF-002 peer\n');
    sidecar('REF-001', ['---', 'ref: REF-001', 'title: Source', 'type: citation', '---', '', ...OUT_TABLE, '| 1 | Peer | — | — | — | REF-002 |', '', '## Incoming', 'None.', ''].join('\n'));
    sidecar('REF-002', '---\nref: REF-002\ntitle: Peer\ntype: citation\n---\n\n## Outgoing\nNone.\n\n## Incoming\nNone.\n');
    const r = extractCrossrefs(root);
    expect(r.perSource['REF-001']).toBeUndefined();
    expect(r.totalAdditions).toBe(0);
  });
});

describe('citation-backfill (#1505)', () => {
  it('reports + injects incoming edges implied by outgoing edges', () => {
    // REF-001 cites REF-002, but REF-002's incoming table omits REF-001.
    sidecar('REF-001', ['---', 'ref: REF-001', 'title: A', 'type: citation', '---', '', ...OUT_TABLE, '| 1 | Peer | — | — | — | REF-002 |', '', '## Incoming', 'None.', ''].join('\n'));
    sidecar('REF-002', ['---', 'ref: REF-002', 'title: B', 'type: citation', '---', '', '## Outgoing', 'None.', '', ...IN_TABLE].join('\n'));
    refDoc('REF-001', '# REF-001: Citing Paper Title\n');

    const dry = backfillCitations(root);
    expect(dry.perTarget['REF-002']).toEqual(['REF-001']);
    expect(dry.missingEdges).toBe(1);
    expect(dry.dangling).toEqual([]);
    expect(readSidecar('REF-002')).not.toContain('REF-001'); // dry-run

    const wrote = backfillCitations(root, { write: true });
    expect(wrote.applied).toBe(1);
    expect(readSidecar('REF-002')).toContain('| 1 | Citing Paper Title | — | — | — | REF-001 |');
  });

  it('flags dangling targets (cited but no sidecar)', () => {
    sidecar('REF-001', ['---', 'ref: REF-001', 'title: A', 'type: citation', '---', '', ...OUT_TABLE, '| 1 | Ghost | — | — | — | REF-900 |', '', '## Incoming', 'None.', ''].join('\n'));
    const r = backfillCitations(root);
    expect(r.dangling).toEqual([{ target: 'REF-900', sources: ['REF-001'] }]);
  });

  it('does not duplicate an incoming edge already present', () => {
    sidecar('REF-001', ['---', 'ref: REF-001', 'title: A', 'type: citation', '---', '', ...OUT_TABLE, '| 1 | Peer | — | — | — | REF-002 |', '', '## Incoming', 'None.', ''].join('\n'));
    sidecar('REF-002', ['---', 'ref: REF-002', 'title: B', 'type: citation', '---', '', '## Outgoing', 'None.', '', ...IN_TABLE, '| 1 | A | — | — | — | REF-001 |', ''].join('\n'));
    const r = backfillCitations(root);
    expect(r.perTarget['REF-002']).toBeUndefined();
    expect(r.missingEdges).toBe(0);
  });
});
