import { afterEach, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main as indexMain } from '../../../src/artifacts/cli.js';

const roots: string[] = [];
const originalCwd = process.cwd();

afterEach(async () => {
  process.chdir(originalCwd);
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

async function workspace(backend: 'json' | 'graphology' | 'sqlite'): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `aiwg-index-cli-${backend}-`));
  roots.push(root);
  await mkdir(join(root, '.aiwg'), { recursive: true });
  await mkdir(join(root, 'docs'), { recursive: true });
  await writeFile(join(root, 'docs', 'a.md'), '# A\n\nDepends on @docs/b.md.\n');
  await writeFile(join(root, 'docs', 'b.md'), '# B\n');
  await writeFile(join(root, '.aiwg', 'aiwg.config'), JSON.stringify({
    index: {
      graphBackend: 'json',
      graphs: {
        sample: {
          scanDirs: ['docs'],
          graphBackend: backend,
        },
      },
    },
  }));
  return root;
}

describe('public index CLI backend selection (#2188)', () => {
  for (const backend of ['json', 'graphology', 'sqlite'] as const) {
    it(`builds a configured ${backend} graph through the public command`, async () => {
      const root = await workspace(backend);
      process.chdir(root);

      await expect(indexMain(['build', '--graph', 'sample'])).resolves.toBeUndefined();

      const indexDir = join(root, '.aiwg', '.index', 'sample');
      const stats = JSON.parse(await readFile(join(indexDir, 'stats.json'), 'utf8'));
      expect(stats.graphMetrics.backend).toBe(backend);
      expect(existsSync(join(indexDir, 'dependencies.json'))).toBe(true);
      expect(existsSync(join(indexDir, 'graph.db'))).toBe(backend === 'sqlite');
    });
  }
});
