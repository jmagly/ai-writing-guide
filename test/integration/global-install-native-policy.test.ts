import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let tempRoot = '';
let installRoot = '';
let installOutput = '';

describe('global install native lifecycle-script policy', () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'aiwg-global-install-'));
    const pack = spawnSync(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['pack', '--ignore-scripts', '--json', '--pack-destination', tempRoot],
      { cwd: PROJECT_ROOT, encoding: 'utf8' },
    );
    if (pack.status !== 0) throw new Error(pack.stderr || pack.stdout);
    const packed = JSON.parse(pack.stdout) as Array<{ filename: string }>;
    const tarball = path.join(tempRoot, packed[0]!.filename);

    const prefix = path.join(tempRoot, 'prefix');
    const npmrc = path.join(tempRoot, 'npmrc');
    await writeFile(npmrc, 'ignore-scripts=false\n');
    const cleanEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith('npm_config_')),
    );
    const install = spawnSync(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      [
        'install', '--global', '--prefix', prefix,
        '--cache', path.join(tempRoot, 'cache'), '--userconfig', npmrc,
        '--no-audit', '--no-fund', tarball,
      ],
      { cwd: tempRoot, encoding: 'utf8', timeout: 120_000, env: cleanEnv },
    );
    installOutput = `${install.stdout}\n${install.stderr}`;
    if (install.status !== 0) throw new Error(installOutput);
    installRoot = process.platform === 'win32'
      ? path.join(prefix, 'node_modules', 'aiwg')
      : path.join(prefix, 'lib', 'node_modules', 'aiwg');
  }, 180_000);

  afterAll(async () => {
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  });

  it('does not put node-pty or hnswlib-node in the base dependency graph', async () => {
    const manifest = JSON.parse(await readFile(path.join(installRoot, 'package.json'), 'utf8'));
    expect(manifest.optionalDependencies).not.toHaveProperty('node-pty');
    expect(manifest.optionalDependencies).not.toHaveProperty('hnswlib-node');
    expect(existsSync(path.join(installRoot, 'node_modules', 'node-pty'))).toBe(false);
    expect(existsSync(path.join(installRoot, 'node_modules', 'hnswlib-node'))).toBe(false);
  });

  it('emits no lifecycle-script policy warning for either deferred native package', () => {
    expect(installOutput).not.toMatch(/allow-scripts[^\n]*(node-pty|hnswlib-node)/i);
    expect(installOutput).not.toMatch(/(node-pty|hnswlib-node)[^\n]*install scripts? not yet covered/i);
  });
});
