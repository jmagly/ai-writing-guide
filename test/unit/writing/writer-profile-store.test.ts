import { mkdtemp, mkdir, readFile, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WriterProfileStore } from '../../../src/writing/writer-profile-store.js';
import { parseWriterProfile } from '../../../src/writing/writer-profile.js';
import { writerProfileHandler } from '../../../src/cli/handlers/writer-profile.js';

const roots: string[] = [];
async function setup() {
  const cwd = await mkdtemp(path.join(tmpdir(), 'writer-store-')); roots.push(cwd);
  const store = new WriterProfileStore({ cwd });
  const profile = parseWriterProfile({ schemaVersion: 1, id: 'author', version: '1.0.0', name: 'Author', provenance: { source: 'user', license: 'author-approved' }, samples: [], preferences: [] });
  return { cwd, store, profile };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(p => rm(p, { recursive: true, force: true }))); });

describe('writer profile storage and command boundaries', () => {
  it('separates scopes and rejects stale concurrent revisions', async () => {
    const { cwd, store, profile } = await setup();
    const user = new WriterProfileStore({ cwd, scope: 'user', userConfigDir: path.join(cwd, 'user') });
    await store.save(profile, 0);
    expect(await user.list()).toEqual([]);
    await expect(user.read(profile.id)).rejects.toThrow();
    await user.save({ ...profile, name: 'User Author' }, 0);
    expect((await store.read(profile.id)).name).toBe('Author');
    const outcomes = await Promise.allSettled([store.save(profile, 1), store.save(profile, 1)]);
    expect(outcomes.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await store.read(profile.id)).revision).toBe(2);
    await expect(store.save(profile, 1)).rejects.toThrow('revision conflict');
  });

  it('invalidates managed caches on updates and deletion without retaining history', async () => {
    const { store, profile } = await setup();
    await store.save(profile, 0);
    const cache = path.join(store.directory, 'cache', profile.id);
    await mkdir(cache, { recursive: true }); await writeFile(path.join(cache, 'sample'), 'private text');
    await store.save(profile, 1);
    await expect(access(cache)).rejects.toThrow();
    await mkdir(cache, { recursive: true });
    await expect(store.delete(profile.id, 1)).rejects.toThrow('revision conflict');
    await store.delete(profile.id, 2);
    expect(await store.list()).toEqual([]);
    await expect(access(cache)).rejects.toThrow();
    await expect(store.read('../outside')).rejects.toThrow('Invalid writer profile ID');
  });

  it('does not print malformed personal inputs or overwrite export destinations', async () => {
    const { cwd, store, profile } = await setup();
    const run = (args: string[]) => writerProfileHandler.execute({ cwd, frameworkRoot: cwd, args, rawArgs: ['writer-profile', ...args] });
    const input = path.join(cwd, 'input.json');
    await writeFile(input, '{ "personal-secret-😊":');
    const failed = await run(['import', input, '--revision', '0']);
    expect(failed.exitCode).toBe(1);
    expect(failed.message).not.toContain('personal-secret');
    await store.save(profile, 0);
    const output = path.join(cwd, 'export.json');
    expect((await run(['export', 'author', '--output', output])).exitCode).toBe(0);
    const original = await readFile(output, 'utf8');
    expect((await run(['export', 'author', '--output', output])).exitCode).toBe(1);
    expect(await readFile(output, 'utf8')).toBe(original);
    expect((await run(['delete', 'author', '--revision', '1', '--scope', 'invocation'])).exitCode).toBe(1);
    expect((await store.read('author')).revision).toBe(1);
    await expect(access(path.join(cwd, '.aiwg', 'output-modes.yaml'))).rejects.toThrow();
  });
});
