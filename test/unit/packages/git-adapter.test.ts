import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GitAdapter } from '../../../src/packages/adapters/git.js';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

describe('GitAdapter immutable resolution', () => {
  let root: string;
  let repository: string;
  let previousCache: string | undefined;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-git-adapter-'));
    repository = path.join(root, 'source');
    fs.mkdirSync(repository);
    git(repository, ['init', '--quiet']);
    git(repository, ['config', 'user.name', 'AIWG Test']);
    git(repository, ['config', 'user.email', 'aiwg@example.invalid']);
    fs.writeFileSync(path.join(repository, 'manifest.json'), '{"type":"addon"}\n');
    git(repository, ['add', '.']);
    git(repository, ['commit', '--quiet', '-m', 'one']);
    git(repository, ['branch', '-M', 'main']);
    previousCache = process.env.XDG_CACHE_HOME;
    process.env.XDG_CACHE_HOME = path.join(root, 'cache');
  });

  afterEach(() => {
    if (previousCache === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = previousCache;
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('resolves a mutable branch before checkout and keys cache by immutable commit', async () => {
    const adapter = new GitAdapter();
    const firstCommit = git(repository, ['rev-parse', 'HEAD']);
    const source = { gitUrl: `file://${repository}`, ref: 'main', label: 'fixture' };
    const first = await adapter.fetch(source);
    expect(path.basename(first)).toContain(firstCommit);
    expect(git(first, ['rev-parse', 'HEAD'])).toBe(firstCommit);
    expect(git(first, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('HEAD');

    fs.writeFileSync(path.join(repository, 'second.txt'), 'second\n');
    git(repository, ['add', '.']);
    git(repository, ['commit', '--quiet', '-m', 'two']);
    const secondCommit = git(repository, ['rev-parse', 'HEAD']);
    const second = await adapter.fetch(source, { refresh: true });
    expect(second).not.toBe(first);
    expect(path.basename(second)).toContain(secondCommit);
    expect(git(second, ['rev-parse', 'HEAD'])).toBe(secondCommit);
    expect(git(first, ['rev-parse', 'HEAD'])).toBe(firstCommit);
  });

  it('resolves an annotated tag to its peeled commit', async () => {
    git(repository, ['tag', '-a', 'v1.0.0', '-m', 'release']);
    const expected = git(repository, ['rev-parse', 'v1.0.0^{commit}']);
    const adapter = new GitAdapter();
    const fetched = await adapter.fetch({ gitUrl: `file://${repository}`, ref: 'v1.0.0', label: 'fixture' });
    expect(git(fetched, ['rev-parse', 'HEAD'])).toBe(expected);
    expect(path.basename(fetched)).toContain(expected);
  });
});
