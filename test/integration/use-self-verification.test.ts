import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
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

function runUse(
  projectRoot: string,
  homeRoot: string,
  providerArgs: string[],
  options: { copyAll?: boolean } = {},
) {
  const result = spawnSync(process.execPath, [
    BIN,
    'use', 'sdlc',
    ...providerArgs,
    '--target', projectRoot,
    '--no-utils',
    '--no-project-local',
    ...(options.copyAll === false ? [] : ['--copy-all']),
    '--json',
  ], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 180_000,
    env: {
      ...process.env,
      HOME: homeRoot,
      USERPROFILE: homeRoot,
      XDG_CACHE_HOME: path.join(homeRoot, '.cache'),
      XDG_CONFIG_HOME: path.join(homeRoot, '.config'),
      XDG_DATA_HOME: path.join(homeRoot, '.local', 'share'),
      AIWG_CONFIG: path.join(homeRoot, '.aiwg'),
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

function runUseHuman(projectRoot: string, homeRoot: string, providerArgs: string[], width = 80) {
  const result = spawnSync(process.execPath, [
    BIN,
    'use', 'sdlc',
    ...providerArgs,
    '--target', projectRoot,
    '--no-utils',
    '--no-project-local',
    '--copy-all',
  ], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 180_000,
    env: {
      ...process.env,
      HOME: homeRoot,
      USERPROFILE: homeRoot,
      XDG_CACHE_HOME: path.join(homeRoot, '.cache'),
      XDG_CONFIG_HOME: path.join(homeRoot, '.config'),
      XDG_DATA_HOME: path.join(homeRoot, '.local', 'share'),
      AIWG_CONFIG: path.join(homeRoot, '.aiwg'),
      NO_UPDATE_NOTIFIER: '1',
      NO_COLOR: '1',
      COLUMNS: String(width),
    },
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function runFrameworkIndexStats(homeRoot: string) {
  const result = spawnSync(process.execPath, [BIN, 'index', 'stats', '--graph', 'framework', '--json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30_000,
    env: {
      ...process.env,
      HOME: homeRoot,
      USERPROFILE: homeRoot,
      XDG_CACHE_HOME: path.join(homeRoot, '.cache'),
      XDG_CONFIG_HOME: path.join(homeRoot, '.config'),
      XDG_DATA_HOME: path.join(homeRoot, '.local', 'share'),
      AIWG_CONFIG: path.join(homeRoot, '.aiwg'),
      NO_UPDATE_NOTIFIER: '1',
    },
  });
  expect(result.status, result.stderr || result.stdout).toBe(0);
  return JSON.parse(result.stdout || '{}');
}

function runDiscover(projectRoot: string, homeRoot: string) {
  const result = spawnSync(process.execPath, [
    BIN, 'discover', 'requirements review', '--json', '--compact',
  ], {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 30_000,
    env: {
      ...process.env,
      HOME: homeRoot,
      USERPROFILE: homeRoot,
      XDG_CACHE_HOME: path.join(homeRoot, '.cache'),
      XDG_CONFIG_HOME: path.join(homeRoot, '.config'),
      XDG_DATA_HOME: path.join(homeRoot, '.local', 'share'),
      AIWG_CONFIG: path.join(homeRoot, '.aiwg'),
      NO_UPDATE_NOTIFIER: '1',
    },
  });
  expect(result.status, result.stderr || result.stdout).toBe(0);
  return JSON.parse(result.stdout || '{}');
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe.sequential('aiwg use self-verifying provider deployment (#2069)', () => {
  it('returns a planned preview without mutating the target', () => {
    const projectRoot = isolatedRoot('aiwg-use-verify-preview-project-');
    const homeRoot = isolatedRoot('aiwg-use-verify-preview-home-');
    // Exercise the production default profile here. Full-copy behavior is
    // covered by the deployment cases below; coupling this preview assertion
    // to --copy-all made it compete with unrelated package/index builders in
    // the release suite even though a preview must remain lightweight.
    const result = runUse(
      projectRoot,
      homeRoot,
      ['--provider', 'codex', '--dry-run'],
      { copyAll: false },
    );

    expect(result.exitCode, result.stderr || result.stdout).toBe(0);
    expect(result.payload).toMatchObject({ outcome: 'planned', dryRun: true, exitClassification: 'preview' });
    expect(result.payload.providers[0].outcome).toBe('planned');
    expect(readdirSync(projectRoot)).toEqual([]);
  });

  it('verifies fresh and repeated Codex deployment with pure machine output', () => {
    const projectRoot = isolatedRoot('aiwg-use-verify-codex-project-');
    const homeRoot = isolatedRoot('aiwg-use-verify-codex-home-');
    const first = runUse(projectRoot, homeRoot, ['--provider', 'codex']);
    const firstDiscovery = runDiscover(projectRoot, homeRoot);
    const repeated = runUse(projectRoot, homeRoot, ['--provider', 'codex']);
    const repeatedDiscovery = runDiscover(projectRoot, homeRoot);

    for (const result of [first, repeated]) {
      expect(result.exitCode, result.stderr || result.stdout).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.payload).toMatchObject({
        schema: 'aiwg.use.result.v1',
        outcome: 'ready-restart-required',
        exitClassification: 'success',
        exitCode: 0,
      });
      expect(result.payload.findings).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'provider-drift:policy-exempt:0',
          severity: 'info',
        }),
      ]));
      expect(result.payload.discovery.byType).toEqual(expect.objectContaining({
        agent: expect.any(Number),
        skill: expect.any(Number),
        command: expect.any(Number),
        rule: expect.any(Number),
        behavior: expect.any(Number),
        template: expect.any(Number),
        flow: expect.any(Number),
        runbook: expect.any(Number),
        schema: expect.any(Number),
      }));
      expect(result.payload.findings.filter((item: { severity: string }) => item.severity === 'blocking')).toHaveLength(0);
    }
    const stats = runFrameworkIndexStats(homeRoot);
    for (const result of [first, repeated]) {
      expect(result.payload.discovery).toMatchObject({
        graph: 'framework',
        totalArtifacts: stats.totalArtifacts,
      });
      expect(result.payload.discovery.byType).toMatchObject(stats.byType);
    }
    expect(existsSync(path.join(projectRoot, '.agents', 'skills'))).toBe(true);
    expect(existsSync(path.join(projectRoot, 'AGENTS.md'))).toBe(true);
    for (const discovery of [firstDiscovery, repeatedDiscovery]) {
      expect(discovery.total).toBeGreaterThan(0);
      expect(discovery.results[0].provenance.graph).toBe('framework');
    }
    const fortemiRoot = path.join(
      homeRoot,
      '.local', 'share', 'aiwg', 'index', 'fortemi-core', 'framework',
    );
    const fortemiManifest = JSON.parse(readFileSync(path.join(fortemiRoot, 'manifest.json'), 'utf8'));
    const frameworkMetadata = JSON.parse(readFileSync(
      path.join(homeRoot, '.local', 'share', 'aiwg', 'index', 'framework', 'metadata.json'),
      'utf8',
    ));
    expect(existsSync(path.join(fortemiRoot, 'aiwg-fortemi-index-v2.json'))).toBe(true);
    expect(fortemiManifest.item_count).toBe(stats.totalArtifacts);
    expect(fortemiManifest.source_index_built_at).toBe(frameworkMetadata.builtAt);
  }, 120_000);

  it('keeps default non-TTY output compact, colorless, and free of registry chatter', () => {
    const projectRoot = isolatedRoot('aiwg-use-output-codex-project-');
    const homeRoot = isolatedRoot('aiwg-use-output-codex-home-');
    const result = runUseHuman(projectRoot, homeRoot, ['--provider', 'codex'], 80);

    expect(result.exitCode, result.stderr || result.stdout).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('AIWG ready — provider reload required');
    expect(result.stdout).toContain('Deployed to OpenAI Codex (codex)');
    expect(result.stdout).toContain('Indexed for discovery');
    expect(result.stdout).not.toContain('Registered ');
    expect(result.stdout).not.toContain('reload rationale');
    expect(result.stdout).not.toMatch(/\x1b\[/);
    expect(result.stdout.split('\n').every((line) => line.length <= 80)).toBe(true);
  }, 30_000);

  it('verifies a native-skills provider deployment', () => {
    const projectRoot = isolatedRoot('aiwg-use-verify-cursor-project-');
    const homeRoot = isolatedRoot('aiwg-use-verify-cursor-home-');
    const result = runUse(projectRoot, homeRoot, ['--provider', 'cursor']);

    expect(result.exitCode, result.stderr || result.stdout).toBe(0);
    expect(result.payload.providers).toEqual([
      expect.objectContaining({ provider: 'cursor', outcome: 'ready-restart-required' }),
    ]);
    expect(existsSync(path.join(projectRoot, '.cursor', 'skills'))).toBe(true);
  }, 30_000);

  it('reports the home-scope OpenClaw context limitation as degraded, not failed', () => {
    const projectRoot = isolatedRoot('aiwg-use-verify-openclaw-project-');
    const homeRoot = isolatedRoot('aiwg-use-verify-openclaw-home-');
    const repoSkillsRoot = path.join(REPO_ROOT, '.agents', 'skills');
    const repoSkillsBefore = existsSync(repoSkillsRoot) ? readdirSync(repoSkillsRoot).sort() : [];
    const result = runUse(projectRoot, homeRoot, ['--provider', 'openclaw']);

    expect(result.exitCode, result.stderr || result.stdout).toBe(0);
    expect(result.payload.outcome).toBe('degraded');
    expect(result.payload.providers[0]).toMatchObject({ provider: 'openclaw', scope: 'user' });
    expect(result.payload.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'context-provider-unsupported', severity: 'advisory' }),
    ]));
    expect(result.payload.findings.some((item: { severity: string }) => item.severity === 'blocking')).toBe(false);
    expect(existsSync(path.join(homeRoot, '.openclaw', 'skills'))).toBe(true);
    expect(readdirSync(path.join(projectRoot, '.agents', 'skills')).length).toBeGreaterThan(0);
    expect(existsSync(repoSkillsRoot) ? readdirSync(repoSkillsRoot).sort() : []).toEqual(repoSkillsBefore);
  }, 30_000);

  it('verifies every provider and computes one deterministic multi-provider outcome', () => {
    const projectRoot = isolatedRoot('aiwg-use-verify-multi-project-');
    const homeRoot = isolatedRoot('aiwg-use-verify-multi-home-');
    const result = runUse(projectRoot, homeRoot, ['--providers', 'codex,claude']);

    expect(result.exitCode, result.stderr || result.stdout).toBe(0);
    expect(result.payload.outcome).toBe('ready-restart-required');
    expect(result.payload.providers.map((provider: { provider: string }) => provider.provider)).toEqual(['codex', 'claude']);
    expect(result.payload.providers.every(
      (provider: { outcome: string }) => provider.outcome === 'ready-restart-required',
    )).toBe(true);
  }, 90_000);
});
