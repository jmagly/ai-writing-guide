import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = path.resolve(__dirname, '../..');
const TEST_HOME = mkdtempSync(path.join(os.tmpdir(), 'aiwg-receipt-home-'));
const PROJECT_ROOT = mkdtempSync(path.join(os.tmpdir(), 'aiwg-receipt-project-'));
const USER_REGISTRY = path.join(TEST_HOME, '.aiwg', 'installed.json');

mkdirSync(path.join(TEST_HOME, '.aiwg'), { recursive: true });
writeFileSync(path.join(TEST_HOME, '.aiwg', 'channel.json'), JSON.stringify({
  channel: 'edge',
  edgePath: REPO_ROOT,
  devMode: true,
}));

afterAll(() => {
  rmSync(TEST_HOME, { recursive: true, force: true });
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
});

function runSourceCli(args: string[]): { status: number; json: Record<string, any>; stderr: string } {
  const routerUrl = pathToFileURL(path.join(REPO_ROOT, 'src/cli/router.ts')).href;
  const runner = `import { run } from ${JSON.stringify(routerUrl)}; await run(process.argv.slice(1), { cwd: process.env.AIWG_TEST_PROJECT_ROOT }); process.exit(0);`;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--eval', runner, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 90_000,
    env: {
      ...process.env,
      HOME: TEST_HOME,
      USERPROFILE: TEST_HOME,
      XDG_CACHE_HOME: path.join(TEST_HOME, '.cache'),
      XDG_CONFIG_HOME: path.join(TEST_HOME, '.config'),
      XDG_DATA_HOME: path.join(TEST_HOME, '.local', 'share'),
      AIWG_USER_REGISTRY_PATH: USER_REGISTRY,
      AIWG_TEST_PROJECT_ROOT: PROJECT_ROOT,
      NO_UPDATE_NOTIFIER: '1',
    },
  });
  return {
    status: result.status ?? 1,
    json: result.stdout ? JSON.parse(result.stdout) : {},
    stderr: result.stderr ?? '',
  };
}

describe('local-source user-scope use/status receipt integration (#2137)', () => {
  it('deploys then probes without an impossible missing-receipt remediation', () => {
    const use = runSourceCli([
      'use', 'sdlc', '--target', PROJECT_ROOT, '--provider', 'codex', '--scope', 'user',
      '--no-project-local', '--copy-all', '--json',
    ]);
    expect(use.status, use.stderr).toBe(0);
    expect(use.json).toMatchObject({
      scope: 'user',
      outcome: 'ready-restart-required',
      findings: expect.arrayContaining([expect.objectContaining({
        id: 'provider-drift:policy-exempt:0',
        severity: 'info',
      })]),
    });

    const status = runSourceCli(['status', '--probe', '--scope', 'user', '--provider', 'codex', '--json']);
    expect(status.status, status.stderr).toBe(0);
    expect(status.json).toMatchObject({
      project_root: PROJECT_ROOT,
      status: 'ready-restart-required',
      checks: { health: 'healthy' },
      deployment_verification: {
        scope: 'user',
        findings: expect.arrayContaining([expect.objectContaining({
          id: 'provider-drift:policy-exempt:0',
          severity: 'info',
        })]),
      },
    });
    expect(JSON.stringify(status.json)).not.toContain('provider-drift:missing-receipt');

    const statePath = path.join(
      PROJECT_ROOT, '.aiwg', 'receipts', 'providers', 'codex.user.evidence.json',
    );
    expect(JSON.parse(readFileSync(statePath, 'utf8'))).toMatchObject({
      schemaVersion: 'aiwg.provider-transformation-evidence-state.v1',
      provider: 'codex',
      scope: 'user',
      disposition: 'local-source',
    });
  }, 120_000);
});
