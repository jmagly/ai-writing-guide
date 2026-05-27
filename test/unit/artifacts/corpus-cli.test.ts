/**
 * `aiwg corpus` router smoke tests (#1498).
 *
 * @source @src/artifacts/corpus-tools/cli.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { corpusMain } from '../../../src/artifacts/corpus-tools/cli.js';

let root: string;
const saved = process.env.AIWG_CORPUS_ROOT;

function write(rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

beforeEach(() => {
  delete process.env.AIWG_CORPUS_ROOT; // corpus root resolves to cwd (the tmp corpus)
  root = mkdtempSync(join(tmpdir(), 'aiwg-corpuscli-'));
  write('documentation/radar/clusters.yaml', `pid-control:\n  - "600-605"\n`);
  write('documentation/references/REF-600-pid.md', `# REF-600\n- **Quality**: A-\n`);
  write('documentation/citations/REF-600-citations.md', `---\nref: REF-600\ntitle: PID\nauthors:\n  - "Lee, Sam"\n---\n`);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  if (saved === undefined) delete process.env.AIWG_CORPUS_ROOT;
  else process.env.AIWG_CORPUS_ROOT = saved;
});

describe('corpusMain', () => {
  it('radar-init --ref --write scaffolds a sidecar in the resolved corpus root', async () => {
    await corpusMain(['radar-init', '--ref', 'REF-600', '--write'], root);
    const p = join(root, 'documentation/radar/REF-600-radar.md');
    expect(existsSync(p)).toBe(true);
    const c = readFileSync(p, 'utf-8');
    expect(c).toContain('refresh-cadence: quarterly'); // A- -> quarterly
    expect(c).toContain('cluster: pid-control');
  });

  it('radar-status --out writes the table into the corpus root', async () => {
    await corpusMain(['radar-init', '--ref', 'REF-600', '--write'], root);
    await corpusMain(['radar-status', '--out', 'indices/radar-status.md'], root);
    const out = readFileSync(join(root, 'indices/radar-status.md'), 'utf-8');
    expect(out).toContain('| REF | GRADE | Cadence |');
    expect(out).toContain('REF-600');
  });

  it('radar-report --out writes the freshness report', async () => {
    await corpusMain(['radar-init', '--ref', 'REF-600', '--write'], root);
    await corpusMain(['radar-report', '--out', 'indices/radar-report.md'], root);
    const out = readFileSync(join(root, 'indices/radar-report.md'), 'utf-8');
    expect(out).toContain('# Radar Report');
    expect(out).toContain('**Total radars**: 1');
  });

  it('radar-init without --ref or --all-missing throws', async () => {
    await expect(corpusMain(['radar-init'], root)).rejects.toThrow(/--ref|--all-missing/);
  });

  it('rejects an unknown subcommand', async () => {
    await expect(corpusMain(['frobnicate'], root)).rejects.toThrow(/unknown corpus subcommand/);
  });

  it('help is a no-op (no throw) for no subcommand', async () => {
    await expect(corpusMain([], root)).resolves.toBeUndefined();
  });
});
