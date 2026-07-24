import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCliPackage } from '../../tools/release/build-cli-package.mjs';
import {
  createWebResourceReleaseFixture,
  TEST_SKILL_BODY,
  TEST_VERSION,
} from '../fixtures/web-resource-release.js';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let tempRoot = '';
let installRoot = '';
let cliPath = '';
let home = '';
let trustRootFile = '';
let fixture: ReturnType<typeof createWebResourceReleaseFixture>;
let packMetadata: { name: string; version: string; size: number; unpackedSize: number; files: Array<{ path: string }> };

function isolatedNpmEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      !key.toLowerCase().startsWith('npm_config_') && key !== 'AIWG_ROOT'),
  );
}

function runtimeEnv(): NodeJS.ProcessEnv {
  return {
    ...isolatedNpmEnv(),
    HOME: home,
    USERPROFILE: home,
    XDG_CACHE_HOME: path.join(home, '.cache'),
    XDG_CONFIG_HOME: path.join(home, '.config'),
    XDG_DATA_HOME: path.join(home, '.local', 'share'),
    AIWG_RESOURCE_BASE_URL: fixture.baseUrl,
    AIWG_RESOURCE_CACHE_ROOT: path.join(home, '.cache', 'aiwg-web'),
    AIWG_RESOURCE_TRUST_ROOT_FILE: trustRootFile,
    AIWG_RESOURCE_ALLOW_INSECURE_LOOPBACK_HTTP: '1',
    AIWG_LOG_LEVEL: 'silent',
    NO_UPDATE_NOTIFIER: '1',
  };
}

function runCli(args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cliPath, args, {
      cwd: tempRoot,
      env: runtimeEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function runApi(args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const requireFromPrefix = createRequire(path.join(path.dirname(installRoot), 'api-probe.mjs'));
  const entry = requireFromPrefix.resolve('@aiwg/cli');
  const script = [
    `const api = await import(${JSON.stringify(entry)});`,
    `await api.run(${JSON.stringify(args)}, { cwd: ${JSON.stringify(tempRoot)} });`,
    `process.exit(0);`,
  ].join('\n');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', script], {
      cwd: tempRoot,
      env: runtimeEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, stdout, stderr }));
  });
}

describe('@aiwg/cli packaged web distribution', () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'aiwg-cli-package-'));
    const stage = path.join(tempRoot, 'stage');
    await buildCliPackage({ outputDir: stage });

    const pack = spawnSync(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['pack', stage, '--ignore-scripts', '--json', '--pack-destination', tempRoot],
      { cwd: PROJECT_ROOT, env: isolatedNpmEnv(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    if (pack.status !== 0) throw new Error(pack.stderr || pack.stdout);
    const packed = JSON.parse(pack.stdout) as Array<typeof packMetadata & { filename: string }>;
    packMetadata = packed[0]!;

    const prefix = path.join(tempRoot, 'prefix');
    const install = spawnSync(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      [
        'install', '--prefix', prefix,
        '--cache', path.join(tempRoot, 'npm-cache'),
        '--ignore-scripts', '--no-audit', '--no-fund',
        path.join(tempRoot, packed[0]!.filename),
      ],
      { cwd: tempRoot, env: isolatedNpmEnv(), encoding: 'utf8', timeout: 120_000 },
    );
    if (install.status !== 0) throw new Error(`${install.stdout}\n${install.stderr}`);
    installRoot = path.join(prefix, 'node_modules', '@aiwg', 'cli');
    cliPath = path.join(installRoot, 'bin', 'aiwg.mjs');
    home = path.join(tempRoot, 'home');
    await mkdir(home, { recursive: true });

    fixture = createWebResourceReleaseFixture();
    await fixture.start();
    const release = fixture.publishRelease();
    fixture.publishChannel('stable', 1, release);
    trustRootFile = path.join(home, 'release-root.pem');
    await writeFile(trustRootFile, fixture.publicKeyPem, { mode: 0o600 });
  }, 180_000);

  afterAll(async () => {
    await fixture?.stop();
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  });

  it('is CalVer-locked and excludes the default corpus', async () => {
    const core = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    const installed = JSON.parse(await readFile(path.join(installRoot, 'package.json'), 'utf8'));
    const sourceReadme = await readFile(path.join(PROJECT_ROOT, 'packages', 'cli', 'README.md'), 'utf8');
    const installedReadme = await readFile(path.join(installRoot, 'README.md'), 'utf8');
    const paths = packMetadata.files.map((file) => file.path);

    expect(packMetadata.name).toBe('@aiwg/cli');
    expect(packMetadata.version).toBe(core.version);
    expect(installed.version).toBe(core.version);
    expect(installed.dependencies).toEqual(core.dependencies);
    expect(installed.optionalDependencies).toEqual(core.optionalDependencies);
    expect(packMetadata.unpackedSize).toBeLessThan(25 * 1024 * 1024);
    for (const prefix of ['agentic/', 'docs/', 'prebuilt/', 'templates/', 'tools/', 'apps/']) {
      expect(paths.some((entry) => entry.startsWith(prefix)), `${prefix} must not ship in @aiwg/cli`).toBe(false);
    }
    expect(paths).toContain('bin/aiwg.mjs');
    expect(paths).toContain('LICENSE');
    expect(paths).toContain('dist/src/api/index.js');
    expect(paths).toContain('dist/src/api/index.d.ts');
    expect(paths).toContain('dist/src/resources/index.js');
    expect(paths).toContain('dist/src/providers/capability-matrix.yaml');
    expect(paths).toContain('dist/src/models/model-capabilities.v1.json');
    expect(paths).toContain('dist/src/models/model-catalog.v1.json');
    expect(paths).toContain('README.md');
    expect(installedReadme).toBe(sourceReadme);
    expect(Buffer.byteLength(installedReadme)).toBeGreaterThan(25_000);
    expect(installedReadme).toContain('# @aiwg/cli');
    expect(installedReadme).toContain('## JavaScript API');
    expect(installedReadme).toContain('## Security Model');
    expect(installedReadme).toContain('## Installation Troubleshooting');
  });

  it('defaults to signed stable web discover and show without flags or a bundled corpus', async () => {
    const discovered = await runCli([
      'discover', 'signed web regression',
      '--json', '--compact',
    ]);
    expect(discovered.code, discovered.stderr).toBe(0);
    const payload = JSON.parse(discovered.stdout);
    expect(payload.query).toMatchObject({
      resource_source: 'web',
      aiwg_selector: 'stable',
      aiwg_version: TEST_VERSION,
    });
    expect(payload.results[0]).toMatchObject({ name: 'web-regression', type: 'skill' });

    const shown = await runCli([
      'show', 'skill', payload.results[0].id,
    ]);
    expect(shown.code, shown.stderr).toBe(0);
    expect(Buffer.from(shown.stdout)).toEqual(TEST_SKILL_BODY);
  });

  it('routes signed web discovery through the installed public API', async () => {
    const discovered = await runApi([
      'discover', 'signed web regression',
      '--json', '--compact',
    ]);
    expect(discovered.code, discovered.stderr).toBe(0);
    const payload = JSON.parse(discovered.stdout);
    expect(payload.query).toMatchObject({
      resource_source: 'web',
      aiwg_selector: 'stable',
      aiwg_version: TEST_VERSION,
    });
    expect(payload.results[0]).toMatchObject({
      name: 'web-regression',
      type: 'skill',
    });
  }, 15_000);
});
