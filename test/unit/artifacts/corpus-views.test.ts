/**
 * Corpus markdown-view renderer tests (#1490).
 *
 * Golden-diffs the TS renderers against fixtures captured from the retired
 * build.py oracle. The `Generated:` line is volatile and normalized out; the
 * `Source-Checksum:` line is content-derived and asserted as-is.
 *
 * @source @src/artifacts/corpus-views/build.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cpSync, mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { buildCorpusViews } from '../../../src/artifacts/corpus-views/build.js';

const FIXTURE = fileURLToPath(new URL('../../fixtures/corpus-views', import.meta.url));
const GOLDEN = join(FIXTURE, 'golden');

const normalize = (s: string) => s.replace(/^Generated:.*$/m, 'Generated: <NORMALIZED>');

describe('corpus markdown views — golden parity with build.py', () => {
  let tmp: string;

  beforeAll(async () => {
    tmp = mkdtempSync(join(tmpdir(), 'aiwg-corpus-views-'));
    // Copy the fixture corpus (references/citations/profiles + aiwg.config manifest), excluding golden/.
    for (const entry of readdirSync(FIXTURE)) {
      if (entry === 'golden') continue;
      cpSync(join(FIXTURE, entry), join(tmp, entry), { recursive: true });
    }
    await buildCorpusViews(tmp, { force: true });
  });

  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  const goldenFiles = readdirSync(GOLDEN).filter((f) => f.endsWith('.md'));

  it('renders all 12 views', () => {
    expect(goldenFiles.sort()).toEqual([
      'authors.md',
      'by-author.md',
      'by-bridge.md',
      'by-method.md',
      'by-model-size.md',
      'by-org.md',
      'by-topic.md',
      'by-venue.md',
      'by-year.md',
      'citation-network.md',
      'training-pipeline.md',
      'unprofiled-hubs.md',
    ]);
    for (const f of goldenFiles) {
      expect(existsSync(join(tmp, 'indices', f)), `missing rendered view: ${f}`).toBe(true);
    }
  });

  for (const f of readdirSync(GOLDEN).filter((x) => x.endsWith('.md'))) {
    it(`view ${f} matches golden byte-for-byte`, () => {
      const rendered = normalize(readFileSync(join(tmp, 'indices', f), 'utf-8'));
      const golden = readFileSync(join(GOLDEN, f), 'utf-8');
      expect(rendered).toBe(golden);
    });
  }

  it('Source-Checksum is present and content-derived (not normalized away)', () => {
    const byYear = readFileSync(join(tmp, 'indices', 'by-year.md'), 'utf-8');
    expect(byYear).toMatch(/^Source-Checksum: sha256:[a-f0-9]{64}$/m);
  });
});

describe('buildCorpusViews behavior', () => {
  it('is a no-op when there is no documentation/references corpus', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'aiwg-no-corpus-'));
    try {
      const res = await buildCorpusViews(empty, { force: true });
      expect(res).toEqual([]);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('reports an unsupported view name from the manifest', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aiwg-bad-view-'));
    try {
      cpSync(join(FIXTURE, 'documentation'), join(dir, 'documentation'), { recursive: true });
      const { mkdirSync, writeFileSync } = await import('fs');
      mkdirSync(join(dir, '.aiwg'), { recursive: true });
      writeFileSync(
        join(dir, '.aiwg', 'aiwg.config'),
        JSON.stringify({
          version: '1', providers: ['claude'], installed: {}, scripts: {},
          index: { graphs: { indices: { manifest: [{ name: 'not-a-real-view' }] } } },
        }),
      );
      const res = await buildCorpusViews(dir, { force: true });
      expect(res).toHaveLength(1);
      expect(res[0].status).toBe('unsupported');
      expect(res[0].graph).toBe('not-a-real-view');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
