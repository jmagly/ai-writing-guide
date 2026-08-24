import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectInstallMode, updateInstallation } from '../../../src/update/service.mjs';
import { createInstallationIdentity } from '../../../src/installation/manager.mjs';

const roots: string[] = [];

function packageRoot(name: string, source = false): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-update-service-'));
  roots.push(root);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name }));
  if (source) fs.mkdirSync(path.join(root, '.git'));
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('install-aware update service', () => {
  it('detects full npm, lightweight web, and source distributions', async () => {
    await expect(detectInstallMode({
      packageRoot: packageRoot('aiwg'),
      config: { channel: 'stable' },
    })).resolves.toMatchObject({ mode: 'npm', packageName: 'aiwg' });
    await expect(detectInstallMode({
      packageRoot: packageRoot('@aiwg/cli'),
      config: { channel: 'stable' },
    })).resolves.toMatchObject({ mode: 'web', packageName: '@aiwg/cli' });
    await expect(detectInstallMode({
      packageRoot: packageRoot('aiwg', true),
      config: { channel: 'stable' },
    })).resolves.toMatchObject({ mode: 'source' });
  });

  it.each([
    ['stable', 'aiwg@latest'],
    ['next', 'aiwg@next'],
    ['nightly', 'aiwg@nightly'],
  ])('preserves the %s npm channel', async (channel, expectedPackage) => {
    const execute = vi.fn();
    const root = packageRoot('aiwg');
    const managerExecutable = path.join(root, 'canonical-npm');
    fs.writeFileSync(managerExecutable, '');
    fs.chmodSync(managerExecutable, 0o755);
    const result = await updateInstallation({
      packageRoot: root,
      config: { channel },
      managerExecutable,
      execute,
    });
    expect(execute).toHaveBeenCalledWith(managerExecutable, ['install', '--global', expectedPackage]);
    expect(result).toMatchObject({ mode: 'npm', channel, status: 'updated' });
  });

  it('uses the recorded package manager when PATH points at another manager', async () => {
    const root = packageRoot('aiwg');
    const canonicalManager = path.join(root, 'nvm', 'bin', 'npm');
    fs.mkdirSync(path.dirname(canonicalManager), { recursive: true });
    fs.writeFileSync(canonicalManager, '');
    fs.chmodSync(canonicalManager, 0o755);
    const execute = vi.fn();
    await updateInstallation({
      packageRoot: root,
      config: { channel: 'stable' },
      managerExecutable: canonicalManager,
      env: { PATH: '/opt/homebrew/bin' },
      execute,
    });
    expect(execute).toHaveBeenCalledWith(canonicalManager, ['install', '--global', 'aiwg@latest']);
  });

  it('routes a Windows npm.cmd path with spaces through the command interpreter', async () => {
    const root = packageRoot('aiwg');
    const managerExecutable = path.join(root, 'Program Files', 'nodejs', 'npm.cmd');
    fs.mkdirSync(path.dirname(managerExecutable), { recursive: true });
    fs.writeFileSync(managerExecutable, '');
    fs.chmodSync(managerExecutable, 0o755);
    const execute = vi.fn();

    await updateInstallation({
      packageRoot: root,
      config: { channel: 'stable' },
      managerExecutable,
      platform: 'win32',
      env: { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
      execute,
    });

    expect(execute).toHaveBeenCalledWith(
      'C:\\Windows\\System32\\cmd.exe',
      ['/d', '/s', '/c', expect.stringContaining(`"${managerExecutable}"`)],
    );
    expect(execute.mock.calls[0][1][3]).toContain('"aiwg@latest"');
  });

  it('blocks an npm update when a different global package root wins PATH', async () => {
    const canonicalRoot = packageRoot('aiwg');
    const actualRoot = packageRoot('aiwg');
    const managerExecutable = path.join(canonicalRoot, 'npm');
    fs.writeFileSync(managerExecutable, '');
    fs.chmodSync(managerExecutable, 0o755);
    const identity = createInstallationIdentity({ actualRoot: canonicalRoot, managerExecutable });
    await expect(updateInstallation({
      packageRoot: actualRoot,
      config: { channel: 'stable', installation: identity },
      execute: vi.fn(),
    })).rejects.toMatchObject({ code: 'AIWG_INSTALLATION_DRIFT' });
  });

  it('refreshes signed resources without npm self-install for web-backed mode', async () => {
    const execute = vi.fn();
    const refreshWebResources = vi.fn().mockResolvedValue({ version: 'v2026.7.24' });
    const result = await updateInstallation({
      packageRoot: packageRoot('@aiwg/cli'),
      config: { channel: 'stable' },
      execute,
      refreshWebResources,
    });
    expect(execute).not.toHaveBeenCalled();
    expect(refreshWebResources).toHaveBeenCalledWith('stable');
    expect(result).toMatchObject({
      mode: 'web',
      status: 'updated',
      changed: true,
      version: 'v2026.7.24',
    });
  });

  it('does not persist a transient test/embedded config as global identity', async () => {
    const configDir = packageRoot('config-holder');
    const refreshWebResources = vi.fn().mockResolvedValue({ version: 'v2026.7.24' });
    await updateInstallation({
      packageRoot: packageRoot('@aiwg/cli'),
      configDir,
      config: { channel: 'stable' },
      refreshWebResources,
    });
    expect(fs.existsSync(path.join(configDir, 'installation.json'))).toBe(false);
  });

  it('does not fetch or self-install during a web-backed dry run', async () => {
    const execute = vi.fn();
    const refreshWebResources = vi.fn();
    const result = await updateInstallation({
      packageRoot: packageRoot('@aiwg/cli'),
      config: { channel: 'next' },
      dryRun: true,
      execute,
      refreshWebResources,
    });
    expect(execute).not.toHaveBeenCalled();
    expect(refreshWebResources).not.toHaveBeenCalled();
    expect(result).toMatchObject({ mode: 'web', channel: 'next', status: 'dry-run', changed: false });
  });

  it('reports explicit offline behavior for web-backed mode', async () => {
    const refreshWebResources = vi.fn();
    const result = await updateInstallation({
      packageRoot: packageRoot('@aiwg/cli'),
      config: { channel: 'stable' },
      offline: true,
      refreshWebResources,
    });
    expect(refreshWebResources).not.toHaveBeenCalled();
    expect(result).toMatchObject({ mode: 'web', status: 'unsupported-offline' });
    expect(result.message).toContain('verified cached resources');
  });

  it('does not overwrite a source checkout', async () => {
    const execute = vi.fn();
    const result = await updateInstallation({
      packageRoot: packageRoot('aiwg', true),
      config: { channel: 'stable' },
      execute,
    });
    expect(execute).not.toHaveBeenCalled();
    expect(result).toMatchObject({ mode: 'source', status: 'manual', changed: false });
    expect(result.message).toContain('git pull --ff-only');
  });
});
