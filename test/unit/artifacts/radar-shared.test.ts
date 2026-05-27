/**
 * Radar subsystem shared-primitives tests (#1498).
 *
 * @source @src/artifacts/corpus-tools/radar-shared.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  loadClusterMap,
  readAnalysisGrade,
  readCitationMeta,
  listRadarRefs,
  listCitationRefs,
  loadRadars,
  analysisRelPath,
} from '../../../src/artifacts/corpus-tools/radar-shared.js';

let root: string;

function write(rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-radar-'));

  // Cluster map: a range and two singletons.
  write(
    'documentation/radar/clusters.yaml',
    `pid-control:\n  - "600-605"\nself-evolving-agents:\n  - "599"\n  - "615-619"\nswarm-robotics:\n  - "620"\n`,
  );

  // Analysis docs: one canonical (**Quality**: A-), one with **GRADE:** form, one template (must be ignored).
  write('documentation/references/REF-600-pid.md', `# REF-600\n## 14. Document Classification\n- **Quality**: A- — strong\n`);
  write('documentation/references/REF-602-evo.md', `# REF-602\n**GRADE Quality:** B — ok\n`);
  write('documentation/references/TEMPLATE-reference-canonical.md', `- **Quality**: A\n`);

  // Citation sidecars: mixed author shapes.
  write(
    'documentation/citations/REF-600-citations.md',
    `---\nref: REF-600\ntitle: "PID Control Survey"\nauthors:\n  - name: "Lee, Sam"\n  - "Ng, Pat"\n---\n# REF-600 Citations\n`,
  );
  write('documentation/citations/REF-602-citations.md', `---\nref: REF-602\ntitle: Evolution\n---\n# REF-602 Citations\n`);

  // Radar sidecars.
  write(
    'documentation/radar/REF-600-radar.md',
    `---\nref: REF-600\ntitle: "PID Control Survey"\ntype: radar\nrefresh-cadence: quarterly\nlast-refreshed: 2026-01-01\ncluster: pid-control\ngrade-original: A-\ngrade-current: A-\ngrade-trajectory: stable\n---\n# REF-600 Radar\n`,
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('loadClusterMap', () => {
  it('resolves ranges and singletons to cluster tags', () => {
    const cluster = loadClusterMap(root);
    expect(cluster('REF-600')).toBe('pid-control');
    expect(cluster('REF-605')).toBe('pid-control');
    expect(cluster('REF-599')).toBe('self-evolving-agents');
    expect(cluster('REF-617')).toBe('self-evolving-agents');
    expect(cluster('REF-620')).toBe('swarm-robotics');
  });

  it('returns empty string for unmapped refs and malformed ids', () => {
    const cluster = loadClusterMap(root);
    expect(cluster('REF-999')).toBe('');
    expect(cluster('REF-606')).toBe('');
    expect(cluster('not-a-ref')).toBe('');
  });

  it('returns an always-empty resolver when clusters.yaml is absent', () => {
    const bare = mkdtempSync(join(tmpdir(), 'aiwg-radar-bare-'));
    try {
      const cluster = loadClusterMap(bare);
      expect(cluster('REF-600')).toBe('');
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});

describe('readAnalysisGrade', () => {
  it('parses the **Quality**: form and preserves the sign', () => {
    expect(readAnalysisGrade(root, 'REF-600')).toBe('A-');
  });

  it('parses the **GRADE...:** form', () => {
    expect(readAnalysisGrade(root, 'REF-602')).toBe('B');
  });

  it('returns ? when no analysis doc / no grade is found', () => {
    expect(readAnalysisGrade(root, 'REF-700')).toBe('?');
  });

  it('does not read TEMPLATE-* files as analysis docs', () => {
    // REF-XXX with only a TEMPLATE present must not resolve a grade from it.
    expect(readAnalysisGrade(root, 'TEMPLATE')).toBe('?');
  });
});

describe('readCitationMeta', () => {
  it('reads title and normalizes mixed author shapes (name-dict + string)', () => {
    const m = readCitationMeta(root, 'REF-600');
    expect(m.title).toBe('PID Control Survey');
    expect(m.authors).toEqual(['Lee, Sam', 'Ng, Pat']);
  });

  it('handles a sidecar with no authors', () => {
    expect(readCitationMeta(root, 'REF-602')).toEqual({ title: 'Evolution', authors: [] });
  });

  it('returns empty for a missing sidecar', () => {
    expect(readCitationMeta(root, 'REF-999')).toEqual({ title: '', authors: [] });
  });
});

describe('listing + loading', () => {
  it('lists radar and citation refs', () => {
    expect(listRadarRefs(root)).toEqual(['REF-600']);
    expect(listCitationRefs(root)).toEqual(['REF-600', 'REF-602']);
  });

  it('loads radar docs with parsed meta, title, and raw text', () => {
    const radars = loadRadars(root);
    expect(radars).toHaveLength(1);
    const r = radars[0];
    expect(r.refId).toBe('REF-600');
    expect(r.title).toBe('PID Control Survey');
    expect(r.meta.refreshCadence).toBe('quarterly');
    expect(r.meta.gradeCurrent).toBe('A-');
    expect(r.meta.cluster).toBe('pid-control');
    expect(r.relPath).toBe('documentation/radar/REF-600-radar.md');
    expect(r.text).toContain('# REF-600 Radar');
  });

  it('resolves the analysis doc relative path', () => {
    expect(analysisRelPath(root, 'REF-600')).toBe('documentation/references/REF-600-pid.md');
    expect(analysisRelPath(root, 'REF-999')).toBeNull();
  });
});
