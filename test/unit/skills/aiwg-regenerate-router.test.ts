import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { runSkill } from '../../../src/skills/run.js';

const execFileAsync = promisify(execFile);
const router = resolve('agentic/code/addons/aiwg-utils/skills/aiwg-regenerate/run.sh');
const pluginRouter = resolve('agentic/code/plugins/utils/skills/aiwg-regenerate/run.sh');
const aiwgRoot = resolve('.');
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

describe('aiwg-regenerate executable-skill adapter', () => {
  it('keeps addon and packaged plugin adapters identical', async () => {
    expect(await readFile(pluginRouter, 'utf8')).toBe(await readFile(router, 'utf8'));
    expect(await readFile(
      resolve('agentic/code/plugins/utils/skills/aiwg-regenerate/SKILL.md'),
      'utf8',
    )).toBe(await readFile(
      resolve('agentic/code/addons/aiwg-utils/skills/aiwg-regenerate/SKILL.md'),
      'utf8',
    ));
  });

  it('executes the real script through artifact-index skill runtime', async () => {
    const indexDir = join(root, '.aiwg', '.index', 'project');
    await mkdir(indexDir, { recursive: true });
    const skillPath = 'agentic/code/addons/aiwg-utils/skills/aiwg-regenerate/SKILL.md';
    await writeFile(join(indexDir, 'metadata.json'), JSON.stringify({
      version: '1.0',
      builtAt: new Date().toISOString(),
      buildTimeMs: 1,
      entries: {
        [skillPath]: {
          path: skillPath,
          type: 'skill',
          phase: 'meta',
          title: 'aiwg-regenerate',
          tags: [],
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          checksum: 'aaaaaaaaaaaaaaaa',
          summary: 'Regenerate context',
          dependencies: [],
          dependents: [],
          capability: 'Regenerate context',
          script: { entrypoint: 'run.sh', runtime: 'bash', cwd: 'project-root' },
        },
      },
    }));
    const priorRoot = process.env.AIWG_ROOT;
    const priorPath = process.env.PATH;
    process.env.AIWG_ROOT = aiwgRoot;
    process.env.PATH = `${bin}:${priorPath ?? ''}`;
    process.env.AIWG_ROUTER_LOG = log;
    try {
      expect(await runSkill({ cwd: root, name: 'aiwg-regenerate', args: ['--dry-run'] })).toBe(0);
      expect((await readFile(log, 'utf8')).trim()).toBe('regenerate --dry-run');
    } finally {
      if (priorRoot === undefined) delete process.env.AIWG_ROOT;
      else process.env.AIWG_ROOT = priorRoot;
      if (priorPath === undefined) delete process.env.PATH;
      else process.env.PATH = priorPath;
      delete process.env.AIWG_ROUTER_LOG;
    }
  });

  it('delegates unqualified selection to the canonical CLI', async () => {
    await writeFile(join(root, 'package.json'), '{}\n');
    expect(await run()).toEqual(['regenerate']);
  });

  it('keeps inferred existing-project dry runs read-only', async () => {
    await writeFile(join(root, 'README.md'), '# Existing project\n');
    expect(await run(['--dry-run', '--provider', 'codex'])).toEqual(['regenerate --dry-run --provider codex']);
  });

  it('routes an already-extracted project to canonical refresh', async () => {
    await writeFile(join(root, 'package.json'), '{}\n');
    await writeFile(join(root, 'WORKSPACE.md'), '<!-- AIWG:project-extraction:start -->\n');
    expect(await run()).toEqual(['regenerate']);
  });

  it('routes a signal-free fresh project to canonical refresh', async () => {
    expect(await run()).toEqual(['regenerate']);
  });

  it('honors an explicit branch without reinterpretation', async () => {
    await writeFile(join(root, 'package.json'), '{}\n');
    expect(await run(['--full-inject', '--provider', 'claude'])).toEqual([
      'regenerate --full-inject --provider claude',
    ]);
  });
});
