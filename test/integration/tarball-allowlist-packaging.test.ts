import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../..');

function allowedRoots(): string[] {
  return readFileSync(path.join(ROOT, 'ci/expected-tarball-top-level.txt'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function packedRoots(): string[] {
  const pack = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 110_000,
  });
  if (pack.status !== 0) {
    throw new Error(`npm pack --dry-run --json failed with status ${pack.status}: ${pack.stderr}`);
  }

  let result;
  try {
    result = JSON.parse(pack.stdout);
  } catch {
    const arrayStart = pack.stdout.lastIndexOf('\n[');
    if (arrayStart < 0) throw new Error('npm pack output contained no JSON array');
    result = JSON.parse(pack.stdout.slice(arrayStart + 1));
  }

  const files = result?.[0]?.files;
  if (!Array.isArray(files)) throw new Error('npm pack output did not contain a files array');
  return [...new Set<string>(
    files
      .map((entry: { path?: string }) => entry.path?.split('/')[0])
      .filter((entry: string | undefined): entry is string => Boolean(entry)),
  )].sort();
}

describe('npm tarball top-level allowlist (packaging lane)', () => {
  it('matches the actual dry-run package roots exactly', () => {
    expect(allowedRoots()).toEqual(packedRoots());
  }, 120_000);
});
