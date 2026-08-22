import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  versionInfo: { version: '2026.8.16', channel: 'stable', devMode: false },
  resolveWebRelease: vi.fn(),
  credentialProvider: vi.fn(async () => undefined),
}));

vi.mock('../../../../src/channel/manager.mjs', () => ({
  getFrameworkRoot: vi.fn(async () => '/fixture/framework'),
  getVersionInfo: vi.fn(async () => state.versionInfo),
}));

vi.mock('../../../../src/resources/web-release.js', () => ({
  loadResourceTrustRootFile: vi.fn(),
  resolveWebRelease: state.resolveWebRelease,
}));

vi.mock('../../../../src/auth/resource-credentials.js', () => ({
  createResourceCredentialProvider: vi.fn(() => state.credentialProvider),
}));

import { resolveProviderReceiptSource } from '../../../../src/cli/handlers/use.js';

const originalResourceEnvironment = {
  AIWG_RESOURCE_BASE_URL: process.env.AIWG_RESOURCE_BASE_URL,
  AIWG_RESOURCE_CACHE_ROOT: process.env.AIWG_RESOURCE_CACHE_ROOT,
  AIWG_RESOURCE_TRUST_ROOT_FILE: process.env.AIWG_RESOURCE_TRUST_ROOT_FILE,
};

const options = {
  projectRoot: '/fixture/project',
  frameworkRoot: '/fixture/framework',
  provider: 'codex',
  scope: 'project' as const,
  requestedBundles: ['sdlc'],
};

beforeEach(() => {
  delete process.env.AIWG_RESOURCE_BASE_URL;
  delete process.env.AIWG_RESOURCE_CACHE_ROOT;
  delete process.env.AIWG_RESOURCE_TRUST_ROOT_FILE;
  state.resolveWebRelease.mockReset();
  state.resolveWebRelease.mockRejectedValue(new Error('verified release cache miss'));
  state.credentialProvider.mockReset();
  state.credentialProvider.mockResolvedValue(undefined);
});

afterEach(() => {
  for (const [key, value] of Object.entries(originalResourceEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('provider receipt source resolution', () => {
  it('marks a development checkout as explicitly local-source without resource access', async () => {
    state.versionInfo = { version: '2026.8.16', channel: 'edge', devMode: true };
    await expect(resolveProviderReceiptSource(options)).resolves.toEqual({ sourceDisposition: 'local-source' });
    expect(state.resolveWebRelease).not.toHaveBeenCalled();
    expect(state.credentialProvider).not.toHaveBeenCalled();
  });

  it('marks a stable cold-cache install without configured resource access as unavailable', async () => {
    state.versionInfo = { version: '2026.8.16', channel: 'stable', devMode: false };
    await expect(resolveProviderReceiptSource(options)).resolves.toEqual({ sourceDisposition: 'source-unavailable' });
    expect(state.resolveWebRelease).toHaveBeenCalledWith(expect.objectContaining({
      selector: '2026.8.16',
      offline: true,
    }));
    expect(state.credentialProvider).toHaveBeenCalledTimes(1);
  });

  it('marks an unreachable configured release endpoint as unavailable without downgrading integrity errors', async () => {
    state.versionInfo = { version: '2026.8.16', channel: 'stable', devMode: false };
    process.env.AIWG_RESOURCE_BASE_URL = 'https://release-fixture.invalid';
    state.resolveWebRelease
      .mockRejectedValueOnce(new Error('offline release cache miss'))
      .mockRejectedValueOnce(new Error('release manifest fetch failed (404)'));
    await expect(resolveProviderReceiptSource(options)).resolves.toEqual({ sourceDisposition: 'source-unavailable' });

    state.resolveWebRelease
      .mockRejectedValueOnce(new Error('offline release cache miss'))
      .mockRejectedValueOnce(new Error('release manifest signature verification failed'));
    await expect(resolveProviderReceiptSource(options)).rejects.toThrow(/signature verification failed/);
  });
});
