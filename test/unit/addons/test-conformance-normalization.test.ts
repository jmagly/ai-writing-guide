import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error Addon runtime is shipped as native MJS.
import { createPlan, applyPlan, rollbackPlan } from '../../../agentic/code/addons/testing-quality/lib/normalization.mjs';

let root: string;
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-normalize-')); });
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });
const read = (name: string) => fs.readFile(path.join(root, name), 'utf8');

describe('test conformance normalization transactions', () => {
  it('applies real edits, preserves executable mode, replays idempotently and rolls back all content', async () => {
    await fs.writeFile(path.join(root, 'runner.sh'), 'before\n', { mode: 0o755 });
    await fs.writeFile(path.join(root, 'obsolete.txt'), 'remove me');
    const plan = await createPlan(root, [
      { path: 'runner.sh', content: 'after\n' },
      { path: 'nested/config.json', content: '{"required":true}\n' },
      { path: 'obsolete.txt', content: null },
    ]);
    expect(await read('runner.sh')).toBe('before\n');
    const receipt = await applyPlan(root, plan);
    expect(receipt.spec.status).toBe('applied');
    expect(await read('runner.sh')).toBe('after\n');
    expect((await fs.stat(path.join(root, 'runner.sh'))).mode & 0o777).toBe(0o755);
    expect(await read('nested/config.json')).toBe('{"required":true}\n');
    await expect(fs.stat(path.join(root, 'obsolete.txt'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await applyPlan(root, plan)).toEqual(receipt);
    const undone = await rollbackPlan(root, receipt);
    expect(undone.spec.status).toBe('rolled-back');
    expect(await read('runner.sh')).toBe('before\n');
    expect((await fs.stat(path.join(root, 'runner.sh'))).mode & 0o777).toBe(0o755);
    expect(await read('obsolete.txt')).toBe('remove me');
    await expect(fs.stat(path.join(root, 'nested/config.json'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await rollbackPlan(root, receipt)).toEqual(undone);
  });

  it('preflights every source before changing the first file', async () => {
    await fs.writeFile(path.join(root, 'first'), 'original');
    await fs.writeFile(path.join(root, 'second'), 'original');
    const plan = await createPlan(root, [{ path: 'first', content: 'new' }, { path: 'second', content: 'new' }]);
    await fs.writeFile(path.join(root, 'second'), 'concurrent edit');
    await expect(applyPlan(root, plan)).rejects.toThrow('Precondition conflict');
    expect(await read('first')).toBe('original');
    expect(await read('second')).toBe('concurrent edit');
  });

  it('refuses new-file collisions and preserves the colliding content', async () => {
    const plan = await createPlan(root, [{ path: 'new.txt', content: 'planned' }]);
    await fs.writeFile(path.join(root, 'new.txt'), 'other owner');
    await expect(applyPlan(root, plan)).rejects.toThrow('Precondition conflict');
    expect(await read('new.txt')).toBe('other owner');
  });

  it('rejects duplicate aliases, ancestor edits, traversal, symlinks and wrong target roots', async () => {
    await expect(createPlan(root, [{ path: 'a/b', content: 'a' }, { path: 'a//b', content: 'b' }])).rejects.toThrow('Duplicate path');
    await expect(createPlan(root, [{ path: 'a', content: 'a' }, { path: 'a/b', content: 'b' }])).rejects.toThrow('Ancestor');
    await expect(createPlan(root, [{ path: '../escape', content: 'bad' }])).rejects.toThrow('Unsafe relative');
    await fs.symlink(root, path.join(root, 'link'));
    await expect(createPlan(root, [{ path: 'link/file', content: 'bad' }])).rejects.toThrow('symlink');
    const plan = await createPlan(root, [{ path: 'new', content: 'new' }]);
    const other = path.join(root, 'other');
    await fs.mkdir(other);
    await expect(applyPlan(other, plan)).rejects.toThrow('root');
  });

  it('refuses rollback after post-apply edits without changing any owned file', async () => {
    await fs.writeFile(path.join(root, 'first'), 'old');
    const plan = await createPlan(root, [{ path: 'first', content: 'new' }, { path: 'second', content: 'new' }]);
    const receipt = await applyPlan(root, plan);
    await fs.writeFile(path.join(root, 'second'), 'later user edit');
    await expect(rollbackPlan(root, receipt)).rejects.toThrow('Precondition conflict');
    expect(await read('first')).toBe('new');
    expect(await read('second')).toBe('later user edit');
    await expect(applyPlan(root, plan)).rejects.toThrow('Precondition conflict');
  });

  it('refuses tampered plans, binary edits, overlapping journal paths and permission drift', async () => {
    await fs.writeFile(path.join(root, 'file'), 'old', { mode: 0o644 });
    const plan = await createPlan(root, [{ path: 'file', content: 'new' }]);
    await expect(applyPlan(root, plan, { receiptPath: 'file' })).rejects.toThrow('overlaps');
    const altered = structuredClone(plan);
    altered.spec.changes[0].after.content = 'tampered';
    await expect(applyPlan(root, altered)).rejects.toThrow('hash');
    await fs.chmod(path.join(root, 'file'), 0o600);
    await expect(applyPlan(root, plan)).rejects.toThrow('Precondition conflict');
    await fs.writeFile(path.join(root, 'binary'), Buffer.from([0xff, 0xfe]));
    await expect(createPlan(root, [{ path: 'binary', content: 'new' }])).rejects.toThrow('UTF-8');
  });

  it('journals before mutation and records a mid-transaction collision honestly', async () => {
    // Observe mkdir used while applying a new nested file, after journal creation;
    // inject an independent file collision before its exclusive create.
    const plan = await createPlan(root, [{ path: 'nested/file', content: 'planned' }]);
    const originalMkdir = fs.mkdir;
    const { vi } = await import('vitest');
    const spy = vi.spyOn(fs, 'mkdir').mockImplementation(async (...args: Parameters<typeof fs.mkdir>) => {
      const result = await originalMkdir(...args as [string, any]);
      if (String(args[0]) === path.join(root, 'nested')) {
        const journal = JSON.parse(await read(`.aiwg/testing/conformance/transactions/${plan.spec.planHash}.json`));
        expect(journal.spec.status).toBe('applying');
        await fs.writeFile(path.join(root, 'nested/file'), 'concurrent owner');
      }
      return result;
    });
    try {
      await expect(applyPlan(root, plan)).rejects.toThrow('partial failure');
      expect(await read('nested/file')).toBe('concurrent owner');
      const receipt = JSON.parse(await read(`.aiwg/testing/conformance/transactions/${plan.spec.planHash}.json`));
      expect(receipt.spec.status).toBe('partial');
      expect(receipt.spec.completed).toEqual([]);
      expect(receipt.spec.observed[0].state.content).toBe('concurrent owner');
    } finally { spy.mockRestore(); }
  });
});
