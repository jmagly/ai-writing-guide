import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const router = resolve('agentic/code/addons/aiwg-utils/skills/aiwg-regenerate/run.sh');
let root: string;
let bin: string;
let log: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'aiwg-regenerate-router-'));
  bin = join(root, 'bin');
  log = join(root, 'calls.log');
  await mkdir(bin);
  const fakeAiwg = join(bin, 'aiwg');
  await writeFile(fakeAiwg, '#!/usr/bin/env bash\nprintf \'%s\\n\' "$*" >> "$AIWG_ROUTER_LOG"\n');
  await chmod(fakeAiwg, 0o755);
});

afterEach(async () => rm(root, { recursive: true, force: true }));

async function run(args: string[] = []): Promise<string[]> {
  await execFileAsync('bash', [router, ...args], {
    cwd: root,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ''}`, AIWG_ROUTER_LOG: log },
  });
  return (await readFile(log, 'utf8')).trim().split('\n');
}

describe('aiwg-regenerate intelligent branch router', () => {
  it('previews then applies adoption for an unqualified established project', async () => {
    await writeFile(join(root, 'package.json'), '{}\n');
    expect(await run()).toEqual([
      'regenerate --existing-project --dry-run',
      'regenerate --existing-project --apply',
    ]);
  });

  it('keeps inferred existing-project dry runs read-only', async () => {
    await writeFile(join(root, 'README.md'), '# Existing project\n');
    expect(await run(['--dry-run', '--provider', 'codex'])).toEqual([
      'regenerate --existing-project --dry-run --provider codex',
    ]);
  });

  it('routes an already-extracted project to canonical refresh', async () => {
    await writeFile(join(root, 'package.json'), '{}\n');
    await writeFile(join(root, 'WORKSPACE.md'), '<!-- AIWG:project-extraction:start -->\n');
    expect(await run()).toEqual(['regenerate --workspace']);
  });

  it('routes a signal-free fresh project to canonical refresh', async () => {
    expect(await run()).toEqual(['regenerate --workspace']);
  });

  it('honors an explicit branch without reinterpretation', async () => {
    await writeFile(join(root, 'package.json'), '{}\n');
    expect(await run(['--full-inject', '--provider', 'claude'])).toEqual([
      'regenerate --full-inject --provider claude',
    ]);
  });
});
