import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { UseHandler } from '../../src/cli/handlers/use.js';
import { tryExecuteCliExtension } from '../../src/cli/cli-extension-loader.js';

const ENV_KEYS = [
  'AIWG_ARTIFACTS_PATH',
  'AIWG_PROJECT_ARTIFACTS_PATH',
  'AIWG_PROJECT_AIWG_DIR',
  'AIWG_PROJECT_LOCAL_PATHS',
] as const;

let projectDir: string;
let originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;
const frameworkRoot = path.resolve(__dirname, '../..');

beforeEach(async () => {
  projectDir = await mkdtemp(path.join(os.tmpdir(), 'aiwg-nlp-prod-addon-'));
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

function useContext(args: string[]) {
  return { args, rawArgs: args, cwd: projectDir, frameworkRoot };
}

describe('nlp-prod addon CLI deployment', () => {
  it('registers existing local modules for every advertised subcommand', async () => {
    const result = await new UseHandler().execute(useContext([
      'nlp-prod', '--target', projectDir, '--provider', 'claude', '--copy-all',
    ]));
    expect(result.exitCode, result.message).toBe(0);

    const registry = JSON.parse(
      await readFile(path.join(projectDir, '.aiwg', 'cli-extensions.json'), 'utf8'),
    );
    expect(Object.keys(registry.nlp.subcommands).sort()).toEqual([
      'add-step', 'estimate-cost', 'eval', 'new', 'optimize', 'productionize', 'status',
    ]);
    for (const descriptor of Object.values(registry.nlp.subcommands) as Array<{ file: string }>) {
      expect(descriptor.file).toMatch(/\.mjs$/);
      await expect(
        import(path.join(registry.nlp.source, descriptor.file)),
      ).resolves.toHaveProperty('default');
    }
  }, 60_000);

  it('dispatches every advertised subcommand to its executable handler', async () => {
    const deployed = await new UseHandler().execute(useContext([
      'nlp-prod', '--target', projectDir, '--provider', 'claude', '--copy-all',
    ]));
    expect(deployed.exitCode, deployed.message).toBe(0);

    for (const subcommand of [
      'new', 'add-step', 'eval', 'optimize', 'productionize', 'estimate-cost', 'status',
    ]) {
      const executed = await tryExecuteCliExtension(
        'nlp', [subcommand, '--help'], projectDir, frameworkRoot,
      );
      expect(executed?.exitCode, `dispatch ${subcommand}`).toBe(0);
      expect(executed?.message).toContain(`aiwg nlp ${subcommand}`);
    }
  }, 60_000);

  it('scaffolds a pipeline and discovers it through status', async () => {
    await new UseHandler().execute(useContext([
      'nlp-prod', '--target', projectDir, '--provider', 'claude', '--copy-all',
    ]));
    const created = await tryExecuteCliExtension(
      'nlp', ['new', 'demo'], projectDir, frameworkRoot,
    );
    expect(created?.exitCode, created?.message).toBe(0);
    await expect(
      readFile(path.join(projectDir, 'pipelines', 'demo', 'pipeline.config.yaml'), 'utf8'),
    ).resolves.toContain('pattern:');

    const status = await tryExecuteCliExtension(
      'nlp', ['status'], projectDir, frameworkRoot,
    );
    expect(status).toEqual({ exitCode: 0, message: 'Found 1 pipeline(s).' });
  }, 60_000);
});
