import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = path.resolve(__dirname, '../..');
const BIN = path.join(REPO_ROOT, 'bin', 'aiwg.mjs');
const fixtures: string[] = [];

function fixture(type: 'extension' | 'plugin'): string {
  const root = mkdtempSync(path.join(tmpdir(), 'aiwg-install-plugin-'));
  fixtures.push(root);
  const source = path.join(root, 'source');
  mkdirSync(source, { recursive: true });
  writeFileSync(path.join(source, 'manifest.json'), `${JSON.stringify({
    id: type === 'plugin' ? 'wrapper-fixture' : 'legacy-fixture',
    type,
    name: 'Install Plugin Fixture',
    version: '1.0.0',
    description: 'Handler-to-script integration fixture',
    ...(type === 'plugin'
      ? { pluginConfig: { payloadType: 'addon', payloadPath: 'payload/' } }
      : {}),
  }, null, 2)}\n`);
  return source;
}

function run(args: string[]) {
  const home = mkdtempSync(path.join(tmpdir(), 'aiwg-install-plugin-home-'));
  fixtures.push(home);
  return spawnSync(process.execPath, [BIN, 'install-plugin', ...args], {
    cwd: REPO_ROOT,
    env: { ...process.env, HOME: home, USERPROFILE: home, AIWG_ROOT: REPO_ROOT },
    encoding: 'utf8',
    timeout: 30_000,
  });
}

afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('install-plugin handler-to-script contract (#1996)', () => {
  it('accepts a local --source string and completes a legacy dry run', () => {
    const source = fixture('extension');
    const result = run(['legacy-fixture', '--source', source, '--dry-run']);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('[DRY RUN]');
    expect(result.stdout).toContain('installed successfully');
    expect(`${result.stdout}\n${result.stderr}`).not.toContain('path" argument must be of type string');
  });

  it('routes a standalone local wrapper to the supported package workflow', () => {
    const source = fixture('plugin');
    const result = run(['wrapper-fixture', '--source', source, '--dry-run']);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`aiwg install ${source} --dry-run`);
    expect(result.stderr).toContain('aiwg use wrapper-fixture');
    expect(result.stderr).not.toContain('path" argument must be of type string');
  });

  it('returns typed actionable diagnostics for Git URLs and malformed flags', () => {
    const git = run(['https://example.invalid/owner/plugin.git', '--dry-run']);
    expect(git.status).not.toBe(0);
    expect(git.stderr).toContain('Git URL sources are handled by the package installer');
    expect(git.stderr).toContain('aiwg install https://example.invalid/owner/plugin.git --dry-run');

    const malformed = run(['fixture', '--source', '--dry-run']);
    expect(malformed.status).toBe(2);
    expect(malformed.stderr).toContain('Error: --source requires a value');
  });
});
