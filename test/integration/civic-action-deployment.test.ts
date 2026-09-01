import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { UseHandler } from '../../src/cli/handlers/use.js';

const ENV_KEYS = [
  'AIWG_ARTIFACTS_PATH',
  'AIWG_PROJECT_ARTIFACTS_PATH',
  'AIWG_PROJECT_AIWG_DIR',
  'AIWG_PROJECT_LOCAL_PATHS',
] as const;

let projectDir: string;
let originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;
const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

function context(args: string[]) {
  return {
    args,
    rawArgs: args,
    cwd: projectDir,
    frameworkRoot: path.resolve(import.meta.dirname, '../..'),
  };
}

beforeEach(async () => {
  projectDir = await mkdtemp(path.join(os.tmpdir(), 'aiwg-civic-deploy-'));
  originalEnv = {};
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(async () => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(projectDir, { recursive: true, force: true });
});

describe('civic-action addon deployment', () => {
  it('deploys required assets and registers the civic CLI for Codex', async () => {
    const result = await new UseHandler().execute(context([
      'civic-action',
      '--target', projectDir,
      '--provider', 'codex',
      '--copy-all',
    ]));
    expect(result.exitCode, result.message).toBe(0);

    const registry = JSON.parse(await readFile(
      path.join(projectDir, '.aiwg', 'cli-extensions.json'),
      'utf8',
    ));
    expect(Object.keys(registry.civic.subcommands).sort()).toEqual([
      'meeting-gate',
      'publish-gate',
      'source-gate',
    ]);

    await expect(access(path.join(
      projectDir,
      '.agents',
      'skills',
      'public-records-plan',
      'SKILL.md',
    ))).resolves.toBeUndefined();
    const deployedScript = path.join(
      projectDir,
      '.agents',
      'skills',
      'source-compliance-gate',
      'scripts',
      'source_compliance_gate.mjs',
    );
    await expect(access(deployedScript)).resolves.toBeUndefined();
    await expect(access(path.join(
      projectDir,
      '.codex',
      'agents',
      'civic-newsroom-operator.toml',
    ))).resolves.toBeUndefined();

    const config = JSON.parse(await readFile(
      path.join(projectDir, '.aiwg', 'aiwg.config'),
      'utf8',
    ));
    expect(config.installed?.['civic-action']?.deployedTo?.codex?.skills).toBe(8);
    expect(config.installed?.['civic-action']?.deployedTo?.codex?.agents).toBe(4);

    const executed = spawnSync(process.execPath, [
      deployedScript,
      path.join(REPO_ROOT, 'agentic/code/addons/civic-action/examples/valid/source-registry.json'),
    ], {
      cwd: projectDir,
      env: { ...process.env, AIWG_ROOT: REPO_ROOT },
      encoding: 'utf8',
    });
    expect(executed.status, executed.stderr).toBe(0);
    expect(JSON.parse(executed.stdout).status).toBe('pass');
  }, 30_000);
});
