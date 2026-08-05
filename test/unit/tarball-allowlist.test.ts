import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../..');

function packageRoots(): string[] {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

  return [...new Set<string>(
    pkg.files
      .filter((entry: string) => !entry.startsWith('!'))
      .map((entry: string) => entry.replace(/\\/g, '/').split('/')[0])
      .filter(Boolean),
  )].sort();
}

function allowedRoots(): string[] {
  return readFileSync(path.join(ROOT, 'ci/expected-tarball-top-level.txt'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

describe('npm tarball top-level allowlist', () => {
  it('covers every positive root declared by package.json files', () => {
    const allowed = new Set(allowedRoots());
    const missing = packageRoots().filter((root) => !allowed.has(root));

    expect(missing).toEqual([]);
  });

  it('remains sorted so policy changes are reviewable', () => {
    const allowed = allowedRoots();

    expect(allowed).toEqual([...allowed].sort());
  });
});
