/**
 * Tests for the skill script runtime registry (#1227).
 *
 * Covers the dispatch table for explicit runtime names plus `auto`
 * resolution by file extension and shebang fallback.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveRuntime, supportedRuntimes } from '../../../src/skills/runtime.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-runtime-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeScript(filename: string, body: string): Promise<string> {
  const p = path.join(tmpDir, filename);
  await fs.writeFile(p, body, 'utf8');
  return p;
}

describe('resolveRuntime — explicit names', () => {
  it('resolves node', async () => {
    const r = await resolveRuntime('node', '/anywhere/x.js');
    expect(r).not.toBeNull();
    expect(r!.command).toBe('node');
  });

  it('resolves python and python3 to python3', async () => {
    const a = await resolveRuntime('python', '/anywhere/x.py');
    const b = await resolveRuntime('python3', '/anywhere/x.py');
    expect(a?.command).toBe('python3');
    expect(b?.command).toBe('python3');
  });

  it('resolves bash and sh', async () => {
    expect((await resolveRuntime('bash', '/anywhere/x.sh'))?.command).toBe('bash');
    expect((await resolveRuntime('sh', '/anywhere/x.sh'))?.command).toBe('sh');
  });

  it('resolves pwsh with -File prefix', async () => {
    const r = await resolveRuntime('pwsh', '/anywhere/x.ps1');
    expect(r?.command).toBe('pwsh');
    expect(r?.prefixArgs).toEqual(['-File']);
  });

  it('returns null for unknown runtime — no silent fallback', async () => {
    const r = await resolveRuntime('rust-script', '/anywhere/x.rs');
    expect(r).toBeNull();
  });

  it('is case-insensitive', async () => {
    const r = await resolveRuntime('PYTHON3', '/anywhere/x.py');
    expect(r?.command).toBe('python3');
  });
});

describe('resolveRuntime — auto by extension', () => {
  it('resolves .py to python3', async () => {
    const p = await writeScript('a.py', 'print("hi")\n');
    const r = await resolveRuntime('auto', p);
    expect(r?.command).toBe('python3');
  });

  it('resolves .js / .mjs / .cjs to node', async () => {
    const a = await writeScript('a.js', 'console.log("hi")\n');
    const b = await writeScript('a.mjs', 'export default 1\n');
    const c = await writeScript('a.cjs', 'module.exports = 1\n');
    expect((await resolveRuntime('auto', a))?.command).toBe('node');
    expect((await resolveRuntime('auto', b))?.command).toBe('node');
    expect((await resolveRuntime('auto', c))?.command).toBe('node');
  });

  it('resolves .sh and .bash to bash', async () => {
    const p = await writeScript('a.sh', 'echo hi\n');
    expect((await resolveRuntime('auto', p))?.command).toBe('bash');
  });
});

describe('resolveRuntime — auto by shebang fallback', () => {
  it('falls back to shebang for unknown extensions', async () => {
    const p = await writeScript('weirdname', '#!/usr/bin/env python3\nprint("hi")\n');
    const r = await resolveRuntime('auto', p);
    expect(r?.command).toBe('python3');
  });

  it('returns null when no extension and no shebang match', async () => {
    const p = await writeScript('weirdname2', 'just text, no shebang');
    const r = await resolveRuntime('auto', p);
    expect(r).toBeNull();
  });
});

describe('supportedRuntimes', () => {
  it('exposes the supported set including auto', async () => {
    const set = supportedRuntimes();
    expect(set).toContain('node');
    expect(set).toContain('python3');
    expect(set).toContain('bash');
    expect(set).toContain('auto');
  });
});
