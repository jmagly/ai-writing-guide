import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const BIN = path.join(REPO_ROOT, 'bin', 'aiwg.mjs');
const temporary: string[] = [];

function tempDir(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `aiwg-${label}-`));
  temporary.push(dir);
  return dir;
}

function runCli(args: string[], configDir: string) {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30_000,
    env: {
      ...process.env,
      AIWG_CONFIG: configDir,
      NO_UPDATE_NOTIFIER: '1',
    },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}

afterEach(() => {
  for (const dir of temporary.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('development checkout compilation preflight', () => {
  it('diagnoses a missing installation manager and keeps stable recovery reachable', () => {
    const configDir = tempDir('dev-preflight-config');
    const devRoot = tempDir('dev-preflight-checkout');
    const routerDir = path.join(devRoot, 'dist', 'src', 'cli');
    fs.mkdirSync(routerDir, { recursive: true });
    fs.writeFileSync(path.join(routerDir, 'router.js'), 'export async function run() {}\n');
    fs.writeFileSync(path.join(configDir, 'channel.json'), JSON.stringify({
      channel: 'edge',
      devMode: true,
      edgePath: devRoot,
    }));

    const failed = runCli(['use', 'all'], configDir);

    expect(failed.exitCode).toBe(1);
    expect(failed.stderr).toContain(
      `Dev mode: compiled installation manager not found at ${path.join(devRoot, 'dist', 'src', 'installation', 'manager.mjs')}`,
    );
    expect(failed.stderr).toContain(`Run: (cd ${devRoot} && npm run build:cli)`);
    expect(failed.stderr).toContain('Or switch back: aiwg --use-stable');
    expect(failed.stderr).not.toMatch(/ERR_MODULE_NOT_FOUND|Cannot find module/);

    const recovered = runCli(['--use-stable'], configDir);

    expect(recovered.exitCode).toBe(0);
    expect(recovered.stdout).toContain('Switched to stable channel.');
    expect(JSON.parse(fs.readFileSync(path.join(configDir, 'installation.json'), 'utf8'))).toMatchObject({
      runMode: 'normal',
      channel: 'stable',
    });
  });
});
