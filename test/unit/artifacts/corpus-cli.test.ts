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

  it('snapshot --format json exposes computed metrics', async () => {
    await corpusMain(['radar-init', '--ref', 'REF-600', '--write'], root);
    write('documentation/radar/REF-600-radar.md', `---\nref: REF-600\ntitle: PID\ntype: radar\ngrade-current: A-\n---\n`);
    write('pdfs/full/REF-600.pdf', 'pdf');
    write('sources/pdfs/full/legacy.pdf', 'legacy');
    const writes: string[] = [];
    const oldWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      await corpusMain(['snapshot', '--format', 'json', '--date', '2026-07-12'], root);
    } finally {
      process.stdout.write = oldWrite;
    }
    const parsed = JSON.parse(writes.join(''));
    expect(parsed.dimensions.papers).toBe(1);
    expect(parsed.dimensions.pdfsFull).toBe(1);
    expect(parsed.gradeOffVocabulary).toBe(0);
    expect(parsed.flow).toBe('agentic/code/frameworks/research-complete/flows/corpus-snapshot.playbook.yaml');
  });

  it('snapshot --write emits a markdown report with computed sections', async () => {
    await corpusMain(['radar-init', '--ref', 'REF-600', '--write'], root);
    write('documentation/radar/REF-600-radar.md', `---\nref: REF-600\ntitle: PID\ntype: radar\ngrade-current: A\n---\n`);
    await corpusMain(['snapshot', '--write', '--date', '2026-07-12'], root);
    const out = readFileSync(join(root, '.aiwg/reports/corpus-snapshot-2026-07-12.md'), 'utf-8');
    expect(out).toContain('type: corpus-snapshot');
    expect(out).toContain('| Papers | 1 |');
    expect(out).toContain('Off-vocabulary GRADE values: 0');
    expect(out).toContain('agentic/code/frameworks/research-complete/flows/corpus-snapshot.playbook.yaml');
  });

  it('snapshot extracts the markdown output block from instruction templates', async () => {
    write('.aiwg/reports/corpus-snapshot-template.md', `# Corpus Snapshot Template\n\n## Instructions\nFill the output format and replace placeholders.\n\n## Output Format\n\n\`\`\`markdown\n---\ntype: corpus-snapshot\ndate: {{date}}\n---\n\n# Corpus Snapshot - {{date}}\n\nOwner: {{Owner}}\n\n## Corpus Dimensions  [COMPUTE]\n\n[COMPUTE]\n\`\`\`\n`);
    await corpusMain(['snapshot', '--write', '--date', '2026-07-12'], root);
    const out = readFileSync(join(root, '.aiwg/reports/corpus-snapshot-2026-07-12.md'), 'utf-8');
    expect(out).toContain('type: corpus-snapshot');
    expect(out).toContain('## Corpus Dimensions');
    expect(out).toContain('| summaries (analysis docs) | 1 | 0 |');
    expect(out).toContain('1 reference entries');
    expect(out).toContain('[ANALYZE: Owner]');
    expect(out).not.toContain('Corpus Snapshot Template');
    expect(out).not.toContain('## Instructions');
    expect(out).not.toContain('```markdown');
    expect(out).not.toContain('{{');
  });

  it('snapshot computes delta against the previous report', async () => {
    write('.aiwg/reports/corpus-snapshot-2026-07-01.md', `---\ntype: corpus-snapshot\ndate: 2026-07-01\npapers: 0\nedges: 0\ndensity: 0\nisolatedNodes: 0\norphanCount: 0\n---\n`);
    await corpusMain(['snapshot', '--delta-only', '--date', '2026-07-12', '--out', 'delta.md'], root);
    const out = readFileSync(join(root, 'delta.md'), 'utf-8');
    expect(out).toContain('Previous snapshot: .aiwg/reports/corpus-snapshot-2026-07-01.md');
    expect(out).toContain('| papers | 0 | 1 | +1 |');
  });

  it('rejects an unknown subcommand', async () => {
    await expect(corpusMain(['frobnicate'], root)).rejects.toThrow(/unknown corpus subcommand/);
  });

  it('help is a no-op (no throw) for no subcommand', async () => {
    await expect(corpusMain([], root)).resolves.toBeUndefined();
  });
});
