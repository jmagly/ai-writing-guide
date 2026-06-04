/**
 * Profile→REF edges (#1501, reassigned from #1502).
 *
 * @source @src/artifacts/corpus-tools/profile-edges.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildProfileEdges } from '../../../src/artifacts/corpus-tools/profile-edges.js';

let root: string;

function refDoc(refId: string): void {
  const f = join(root, 'documentation', 'references', `${refId}-x.md`);
  mkdirSync(join(f, '..'), { recursive: true });
  writeFileSync(f, `---\nref_id: ${refId}\ntitle: T\n---\n# ${refId}: T\n`);
}
function profile(sub: string, profId: string, type: string, name: string, refs: string[]): void {
  const f = join(root, 'documentation', 'profiles', sub, `${profId}.md`);
  mkdirSync(join(f, '..'), { recursive: true });
  const refsYaml = refs.map((r) => `  - ${r}`).join('\n');
  writeFileSync(f, `---\nprof-id: ${profId}\ntype: ${type}\nname: ${name}\ncorpus-refs:\n${refsYaml}\n---\n# ${name}\n`);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-pedges-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('buildProfileEdges (#1501)', () => {
  it('builds profile→REF edges and reverse (ref→profiles) adjacency', () => {
    refDoc('REF-001');
    refDoc('REF-002');
    profile('people', 'PROF-P-smith-jane', 'person', 'Jane Smith', ['REF-001', 'REF-002']);
    profile('people', 'PROF-P-doe-john', 'person', 'John Doe', ['REF-002']);

    const g = buildProfileEdges(root);
    expect(g.stats).toEqual({ profiles: 2, edges: 3, refsCovered: 2 });
    expect(g.byProfile.get('PROF-P-smith-jane')!.refs.sort()).toEqual(['REF-001', 'REF-002']);
    expect(g.byRef.get('REF-002')!.sort()).toEqual(['PROF-P-doe-john', 'PROF-P-smith-jane']);
    expect(g.byRef.get('REF-001')).toEqual(['PROF-P-smith-jane']);
    expect(g.danglingRefs).toEqual([]);
  });

  it('reconciles against the citation graph — edges to non-existent REFs are flagged dangling, not kept', () => {
    refDoc('REF-001');
    profile('people', 'PROF-P-smith-jane', 'person', 'Jane Smith', ['REF-001', 'REF-999']);
    const g = buildProfileEdges(root);
    // Only the real REF-001 edge is kept.
    expect(g.edges).toEqual([{ profId: 'PROF-P-smith-jane', profileType: 'person', ref: 'REF-001' }]);
    expect(g.danglingRefs).toEqual([{ profId: 'PROF-P-smith-jane', ref: 'REF-999' }]);
    expect(g.byRef.has('REF-999')).toBe(false);
  });

  it('carries profile type (person/org/source) on each edge', () => {
    refDoc('REF-001');
    profile('orgs', 'PROF-O-acme', 'org', 'Acme Labs', ['REF-001']);
    const g = buildProfileEdges(root);
    expect(g.edges[0].profileType).toBe('org');
  });

  it('records a profile with no valid refs (zero edges) without crashing', () => {
    profile('people', 'PROF-P-empty', 'person', 'No Refs', []);
    const g = buildProfileEdges(root);
    expect(g.stats.edges).toBe(0);
    expect(g.byProfile.get('PROF-P-empty')!.refs).toEqual([]);
  });
});
