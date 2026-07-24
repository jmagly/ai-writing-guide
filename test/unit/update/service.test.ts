import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectInstallMode, updateInstallation } from '../../../src/update/service.mjs';

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
    const result = await updateInstallation({
      packageRoot: packageRoot('aiwg'),
      config: { channel },
      execute,
    });
    expect(execute).toHaveBeenCalledWith('npm', ['install', '--global', expectedPackage]);
    expect(result).toMatchObject({ mode: 'npm', channel, status: 'updated' });
  });

  it('never attempts npm self-install for web-backed mode', async () => {
    const execute = vi.fn();
    const result = await updateInstallation({
      packageRoot: packageRoot('@aiwg/cli'),
      config: { channel: 'stable' },
      execute,
    });
    expect(execute).not.toHaveBeenCalled();
    expect(result).toMatchObject({ mode: 'web', status: 'current', changed: false });
  });

  it('reports explicit offline behavior for web-backed mode', async () => {
    const result = await updateInstallation({
      packageRoot: packageRoot('@aiwg/cli'),
      config: { channel: 'stable' },
      offline: true,
    });
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
