import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { checkVersionLockstep } from '../../../tools/workspace/check-marketplace-version.mjs';

let tempRoot: string | null = null;

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function makeRepo({
  packageVersion = '2026.5.7',
  lockVersion = packageVersion,
  lockRootVersion = packageVersion,
  marketplaceVersion = packageVersion,
  cliVersion = packageVersion,
}: {
  packageVersion?: string;
  lockVersion?: string;
  lockRootVersion?: string;
  marketplaceVersion?: string;
  cliVersion?: string;
} = {}) {
  tempRoot = mkdtempSync(join(tmpdir(), 'aiwg-version-lockstep-'));
  mkdirSync(join(tempRoot, '.claude-plugin'), { recursive: true });
  mkdirSync(join(tempRoot, 'packages', 'cli'), { recursive: true });

  writeJson(join(tempRoot, 'package.json'), {
    name: 'aiwg',
    version: packageVersion,
  });
  writeJson(join(tempRoot, 'package-lock.json'), {
    name: 'aiwg',
    version: lockVersion,
    lockfileVersion: 3,
    packages: {
      '': {
        name: 'aiwg',
        version: lockRootVersion,
      },
    },
  });
  writeJson(join(tempRoot, '.claude-plugin', 'marketplace.json'), {
    metadata: {
      version: marketplaceVersion,
    },
  });
  writeJson(join(tempRoot, 'packages', 'cli', 'package.json'), {
    name: '@aiwg/cli',
    version: cliVersion,
  });

  return tempRoot;
}

afterEach(() => {
  if (tempRoot) {
    rmSync(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
});

describe('checkVersionLockstep', () => {
  it('passes when package, lockfile, and marketplace versions match', () => {
    const root = makeRepo();

    const result = checkVersionLockstep(root);

    expect(result.ok).toBe(true);
    expect(result.message).toContain('match package.json');
  });

  it('fails when package-lock.json top-level version drifts', () => {
    const root = makeRepo({ lockVersion: '2026.5.2' });

    const result = checkVersionLockstep(root);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('package-lock.json version');
    expect(result.message).toContain('2026.5.2');
  });

  it('fails when package-lock.json root package version drifts', () => {
    const root = makeRepo({ lockRootVersion: '2026.5.2' });

    const result = checkVersionLockstep(root);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('packages[""].version');
    expect(result.message).toContain('2026.5.2');
  });

  it('fails when marketplace metadata version drifts', () => {
    const root = makeRepo({ marketplaceVersion: '2026.5.6' });

    const result = checkVersionLockstep(root);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('marketplace metadata.version');
    expect(result.message).toContain('2026.5.6');
  });

  it('fails when @aiwg/cli CalVer drifts from the main package', () => {
    const root = makeRepo({ cliVersion: '2026.5.6' });

    const result = checkVersionLockstep(root);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('@aiwg/cli version');
    expect(result.message).toContain('2026.5.6');
  });

  it('allows marketplace pre-release suffix mismatch only when requested', () => {
    const root = makeRepo({
      packageVersion: '2026.5.7-rc.1',
      lockVersion: '2026.5.7-rc.1',
      lockRootVersion: '2026.5.7-rc.1',
      marketplaceVersion: '2026.5.7',
    });

    expect(checkVersionLockstep(root).ok).toBe(false);
    expect(checkVersionLockstep(root, { allowPrereleaseMismatch: true }).ok).toBe(true);
  });
});
