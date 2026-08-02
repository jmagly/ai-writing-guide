import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { UseHandler } from '../../src/cli/handlers/use.js';

let projectDir: string;

function context(args: string[]) {
  return {
    args,
    rawArgs: args,
    cwd: projectDir,
    frameworkRoot: path.resolve(__dirname, '../..'),
  };
}

beforeEach(async () => {
  projectDir = await mkdtemp(path.join(os.tmpdir(), 'aiwg-compound-addon-'));
});

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true });
});

describe('compound-memory addon activation', () => {
  it('deploys transitive required addons before registering the selected addon', async () => {
    const result = await new UseHandler().execute(context([
      'compound-memory',
      '--target', projectDir,
      '--provider', 'claude',
      '--copy-all',
    ]));
    expect(result.exitCode, result.message).toBe(0);

    const registry = JSON.parse(await readFile(
      path.join(projectDir, '.aiwg/cli-extensions.json'),
      'utf8',
    ));
    expect(registry['line-memory'].subcommands.import).toBeDefined();
    expect(registry['compound-memory'].subcommands.status).toBeDefined();

    for (const skill of [
      'compound-memory',
      'line-memory',
      'llm-wiki',
      'memory-ingest',
      'aiwg-guide',
    ]) {
      await expect(access(path.join(
        projectDir,
        '.claude/.aiwg/skills',
        skill,
        'SKILL.md',
      ))).resolves.toBeUndefined();
    }
  });

  it('previews transitive activation without writing deployment artifacts', async () => {
    const result = await new UseHandler().execute(context([
      'compound-memory',
      '--target', projectDir,
      '--provider', 'claude',
      '--copy-all',
      '--dry-run',
    ]));
    expect(result.exitCode, result.message).toBe(0);
    expect(existsSync(path.join(projectDir, '.aiwg/cli-extensions.json'))).toBe(false);
    expect(existsSync(path.join(projectDir, '.claude/.aiwg/skills'))).toBe(false);
  });
});
