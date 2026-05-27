/**
 * radar-init scaffold tests (#1498).
 *
 * @source @src/artifacts/corpus-tools/radar-init.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { scaffoldRadar, radarInitMissing } from '../../../src/artifacts/corpus-tools/radar-init.js';

let root: string;
const TODAY = '2026-05-26';

function write(rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-radarinit-'));
  write('documentation/radar/clusters.yaml', `pid-control:\n  - "600-605"\n`);
  write('documentation/references/REF-600-pid.md', `# REF-600\n- **Quality**: A- — strong\n`);
  write('documentation/references/REF-602-evo.md', `# REF-602\n**GRADE:** B\n`);
  write(
    'documentation/citations/REF-600-citations.md',
    `---\nref: REF-600\ntitle: "PID Control Survey"\nauthors:\n  - "Lee, Sam"\n  - "Ng, Pat"\n  - "Roe, Kim"\n  - "Vo, Min"\n---\n# REF-600 Citations\n`,
  );
  write('documentation/citations/REF-602-citations.md', `---\nref: REF-602\ntitle: Evolution\n---\n# REF-602 Citations\n`);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('scaffoldRadar', () => {
  it('dry-runs without writing, defaulting cadence from GRADE and cluster from the map', () => {
    const r = scaffoldRadar(root, 'REF-600', { today: TODAY });
    expect(r.status).toBe('dry-run');
    expect(existsSync(join(root, r.outPath))).toBe(false);
    const c = r.content!;
    expect(c).toContain('ref: REF-600');
    expect(c).toContain('title: "PID Control Survey"');
    expect(c).toContain('refresh-cadence: quarterly'); // A- -> quarterly
    expect(c).toContain('cluster: pid-control');
    expect(c).toContain('grade-original: A-');
    expect(c).toContain('grade-current: A-');
    expect(c).toContain(`last-refreshed: ${TODAY}`);
  });

  it('truncates author lists over 3 with "et al."', () => {
    const c = scaffoldRadar(root, 'REF-600', { today: TODAY }).content!;
    expect(c).toContain('**Authors**: Lee, Sam, Ng, Pat, Roe, Kim et al.');
  });

  it('writes the sidecar when write=true, then skips if it already exists', () => {
    const first = scaffoldRadar(root, 'REF-600', { today: TODAY, write: true });
    expect(first.status).toBe('wrote');
    expect(existsSync(join(root, first.outPath))).toBe(true);
    expect(readFileSync(join(root, first.outPath), 'utf-8')).toContain('# REF-600 Radar');

    const again = scaffoldRadar(root, 'REF-600', { today: TODAY, write: true });
    expect(again.status).toBe('skip');
    expect(again.message).toContain('already exists');
  });

  it('skips a REF with no citation sidecar', () => {
    const r = scaffoldRadar(root, 'REF-999', { today: TODAY, write: true });
    expect(r.status).toBe('skip');
    expect(r.message).toContain('no citation sidecar');
    expect(existsSync(join(root, r.outPath))).toBe(false);
  });

  it('honors explicit cadence and cluster overrides', () => {
    const c = scaffoldRadar(root, 'REF-600', { today: TODAY, cadence: 'annual', cluster: 'override-tag' }).content!;
    expect(c).toContain('refresh-cadence: annual');
    expect(c).toContain('cluster: override-tag');
  });

  it('derives cadence biannual for a B-grade paper', () => {
    const c = scaffoldRadar(root, 'REF-602', { today: TODAY }).content!;
    expect(c).toContain('refresh-cadence: biannual'); // B -> biannual
    expect(c).toContain('grade-current: B');
    expect(c).toContain('cluster: pid-control'); // 602 is inside the 600-605 range
  });

  it('omits the cluster line for a REF outside the cluster map', () => {
    // REF-700 is outside 600-605; give it a citation sidecar so scaffolding proceeds.
    write('documentation/citations/REF-700-citations.md', `---\nref: REF-700\ntitle: Outlier\n---\n`);
    const c = scaffoldRadar(root, 'REF-700', { today: TODAY }).content!;
    expect(c).not.toMatch(/^cluster:/m);
  });
});

describe('radarInitMissing', () => {
  it('scaffolds only REFs that have a citation sidecar but no radar', () => {
    // Pre-create a radar for REF-600 so only REF-602 is missing.
    write('documentation/radar/REF-600-radar.md', `---\nref: REF-600\ntype: radar\n---\n# REF-600 Radar\n`);
    const results = radarInitMissing(root, { today: TODAY, write: true });
    expect(results.map((r) => r.refId)).toEqual(['REF-602']);
    expect(results[0].status).toBe('wrote');
    expect(existsSync(join(root, 'documentation/radar/REF-602-radar.md'))).toBe(true);
  });
});
