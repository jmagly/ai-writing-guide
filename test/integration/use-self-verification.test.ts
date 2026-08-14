import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = path.resolve(__dirname, '../..');
const BIN = path.join(REPO_ROOT, 'bin', 'aiwg.mjs');
const roots: string[] = [];

function isolatedRoot(prefix: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(root);
  return root;
}

function runUse(projectRoot: string, homeRoot: string, providerArgs: string[]) {
  const result = spawnSync(process.execPath, [
    BIN,
    'use', 'sdlc',
    ...providerArgs,
    '--target', projectRoot,
    '--no-utils',
    '--no-project-local',
    '--copy-all',
    '--json',
  ], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 60_000,
    env: {
      ...process.env,
      HOME: homeRoot,
      USERPROFILE: homeRoot,
      XDG_CACHE_HOME: path.join(homeRoot, '.cache'),
      XDG_CONFIG_HOME: path.join(homeRoot, '.config'),
      XDG_DATA_HOME: path.join(homeRoot, '.local', 'share'),
      NO_UPDATE_NOTIFIER: '1',
    },
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    payload: JSON.parse(result.stdout || '{}'),
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe.sequential('aiwg use self-verifying provider deployment (#2069)', () => {
  it('returns a planned preview without mutating the target', () => {
    const projectRoot = isolatedRoot('aiwg-use-verify-preview-project-');
    const homeRoot = isolatedRoot('aiwg-use-verify-preview-home-');
    const result = runUse(projectRoot, homeRoot, ['--provider', 'codex', '--dry-run']);

    expect(result.exitCode, result.stderr || result.stdout).toBe(0);
    expect(result.payload).toMatchObject({ outcome: 'planned', dryRun: true, exitClassification: 'preview' });
    expect(result.payload.providers[0].outcome).toBe('planned');
    expect(readdirSync(projectRoot)).toEqual([]);
  });

  it('verifies fresh and repeated Codex deployment with pure machine output', () => {
    const projectRoot = isolatedRoot('aiwg-use-verify-codex-project-');
    const homeRoot = isolatedRoot('aiwg-use-verify-codex-home-');
    const first = runUse(projectRoot, homeRoot, ['--provider', 'codex']);
    const repeated = runUse(projectRoot, homeRoot, ['--provider', 'codex']);

    for (const result of [first, repeated]) {
      expect(result.exitCode, result.stderr || result.stdout).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.payload).toMatchObject({
        schema: 'aiwg.use.result.v1',
        outcome: 'ready-restart-required',
        exitClassification: 'success',
        exitCode: 0,
      });
      expect(result.payload.findings.filter((item: { severity: string }) => item.severity === 'blocking')).toHaveLength(0);
    }
    expect(existsSync(path.join(projectRoot, '.agents', 'skills'))).toBe(true);
    expect(existsSync(path.join(projectRoot, 'AGENTS.md'))).toBe(true);
  });

  it('verifies a native-skills provider deployment', () => {
    const projectRoot = isolatedRoot('aiwg-use-verify-cursor-project-');
    const homeRoot = isolatedRoot('aiwg-use-verify-cursor-home-');
    const result = runUse(projectRoot, homeRoot, ['--provider', 'cursor']);

    expect(result.exitCode, result.stderr || result.stdout).toBe(0);
    expect(result.payload.providers).toEqual([
      expect.objectContaining({ provider: 'cursor', outcome: 'ready-restart-required' }),
    ]);
    expect(existsSync(path.join(projectRoot, '.cursor', 'skills'))).toBe(true);
  });

  it('reports the home-scope OpenClaw context limitation as degraded, not failed', () => {
    const projectRoot = isolatedRoot('aiwg-use-verify-openclaw-project-');
    const homeRoot = isolatedRoot('aiwg-use-verify-openclaw-home-');
    const result = runUse(projectRoot, homeRoot, ['--provider', 'openclaw']);

    expect(result.exitCode, result.stderr || result.stdout).toBe(0);
    expect(result.payload.outcome).toBe('degraded');
    expect(result.payload.providers[0]).toMatchObject({ provider: 'openclaw', scope: 'user' });
    expect(result.payload.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'context-provider-unsupported', severity: 'advisory' }),
    ]));
    expect(result.payload.findings.some((item: { severity: string }) => item.severity === 'blocking')).toBe(false);
    expect(existsSync(path.join(homeRoot, '.openclaw', 'skills'))).toBe(true);
  });

  it('verifies every provider and computes one deterministic multi-provider outcome', () => {
    const projectRoot = isolatedRoot('aiwg-use-verify-multi-project-');
    const homeRoot = isolatedRoot('aiwg-use-verify-multi-home-');
    const result = runUse(projectRoot, homeRoot, ['--providers', 'codex,claude']);

    expect(result.exitCode, result.stderr || result.stdout).toBe(0);
    expect(result.payload.outcome).toBe('ready-restart-required');
    expect(result.payload.providers.map((provider: { provider: string }) => provider.provider)).toEqual(['codex', 'claude']);
    expect(result.payload.providers.every((provider: { outcome: string }) => provider.outcome === 'ready-restart-required')).toBe(true);
  });
});
