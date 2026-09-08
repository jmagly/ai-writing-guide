import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspectRestoration } from '../../../tools/testing/conformance-example-state.mjs';

let root;
let file;
const before = { content: 'reviewed source\n', mode: 0o600 };
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-example-restoration-'));
  file = path.join(root, 'source.mjs');
  await fs.writeFile(file, before.content, { mode: before.mode });
});
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

describe('conformance example restoration evidence', () => {
  it('requires the recorded transaction and observed baseline to agree', async () => {
    expect(await inspectRestoration(file, before, true)).toEqual({ sourceRestored: true, diagnostics: [] });
    expect(await inspectRestoration(file, before, false)).toEqual({
      sourceRestored: false, diagnostics: ['Control receipt does not confirm complete restoration.'],
    });
  });
  it('rejects changed permissions even when source bytes match', async () => {
    await fs.chmod(file, 0o644);
    expect(await inspectRestoration(file, before)).toEqual({
      sourceRestored: false, diagnostics: ['Source permissions differ from the baseline.'],
    });
    expect((await fs.stat(file)).mode & 0o777).toBe(0o644);
  });
  it('preserves changed bytes for recovery instead of overwriting them', async () => {
    await fs.writeFile(file, 'independent edit\n');
    expect(await inspectRestoration(file, before)).toEqual({
      sourceRestored: false, diagnostics: ['Source bytes differ from the baseline.'],
    });
    expect(await fs.readFile(file, 'utf8')).toBe('independent edit\n');
  });
  it('retains missing-source evidence without throwing away the run archive', async () => {
    await fs.unlink(file);
    expect(await inspectRestoration(file, before)).toEqual({
      sourceRestored: false, diagnostics: ['Source restoration cannot be observed: ENOENT'],
    });
  });
  it('rejects a symlink replacement even when it points to matching contents', async () => {
    const target = path.join(root, 'other.mjs');
    await fs.rename(file, target);
    await fs.symlink(target, file);
    expect(await inspectRestoration(file, before)).toEqual({
      sourceRestored: false, diagnostics: ['Source is no longer a regular file.'],
    });
    expect(await fs.readlink(file)).toBe(target);
  });
});
