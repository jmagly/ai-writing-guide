/**
 * Unit tests for project-local provider bundle resolution in aiwg use.
 *
 * @source @src/cli/handlers/use.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const state = vi.hoisted(() => ({
  frameworkRoot: '',
  run: vi.fn().mockResolvedValue({ exitCode: 0 }),
}));

vi.mock('../../../../src/channel/manager.mjs', () => ({
  getFrameworkRoot: vi.fn(async () => state.frameworkRoot),
  getVersionInfo: vi.fn(async () => ({ version: 'test', channel: 'test' })),
}));

vi.mock('../../../../src/cli/handlers/script-runner.js', () => ({
  createScriptRunner: vi.fn(() => ({
    run: state.run,
  })),
}));

import { useHandler } from '../../../../src/cli/handlers/use.js';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'aiwg-use-provider-'));
}

function writeProviderBundle(projectDir: string, id: string, extendsProvider: string): void {
  const dir = join(projectDir, '.aiwg', 'providers', id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({
      id,
      type: 'provider',
      name: id,
      version: '1.0.0',
      description: 'Custom provider for tests',
      manifestVersion: '1',
      platforms: { claude: 'full' },
      keywords: ['test'],
      deployment: { pathTemplate: '.{platform}/skills/{id}.md' },
      providerConfig: { extends: extendsProvider, displayName: id },
    }, null, 2),
  );
}

describe('aiwg use project-local provider bundles (#1717)', () => {
  let projectDir: string;
  let frameworkRoot: string;

  beforeEach(() => {
    projectDir = tmp();
    frameworkRoot = tmp();
    state.frameworkRoot = frameworkRoot;
    state.run.mockReset();
    state.run.mockResolvedValue({ exitCode: 0 });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(frameworkRoot, { recursive: true, force: true });
  });

  it('resolves a custom provider id to its providerConfig.extends deploy adapter', async () => {
    writeProviderBundle(projectDir, 'my-provider', 'claude');

    const result = await useHandler.execute({
      cwd: projectDir,
      frameworkRoot,
      rawArgs: ['use', 'sdlc', '--provider', 'my-provider', '--target', projectDir, '--dry-run', '--no-utils', '--no-project-local'],
      args: ['sdlc', '--provider', 'my-provider', '--target', projectDir, '--dry-run', '--no-utils', '--no-project-local'],
    });

    expect(result.exitCode).toBe(0);
    expect(state.run).toHaveBeenCalledWith(
      'tools/agents/deploy-agents.mjs',
      expect.arrayContaining(['--provider', 'claude']),
      {},
    );
    expect(state.run.mock.calls[0][1]).not.toContain('my-provider');
  });

  it('does not treat a provider bundle name as a deployable target', async () => {
    writeProviderBundle(projectDir, 'my-provider', 'claude');

    const result = await useHandler.execute({
      cwd: projectDir,
      frameworkRoot,
      rawArgs: ['use', 'my-provider', '--target', projectDir, '--dry-run'],
      args: ['my-provider', '--target', projectDir, '--dry-run'],
    });

    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('selected with --provider');
    expect(result.message).toContain('aiwg use sdlc --provider my-provider');
    expect(state.run).not.toHaveBeenCalled();
  });
});
