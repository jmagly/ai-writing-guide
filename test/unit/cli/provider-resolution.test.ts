import { describe, expect, it, vi } from 'vitest';

const mockReadAiwgConfig = vi.hoisted(() => vi.fn());

vi.mock('../../../src/config/aiwg-config.js', () => ({
  readAiwgConfig: mockReadAiwgConfig,
}));

import { resolveActiveProvider } from '../../../src/cli/provider-resolution.js';

describe('resolveActiveProvider', () => {
  it('detects Codex from process ancestry when Codex env markers are absent', async () => {
    mockReadAiwgConfig.mockResolvedValue({
      version: '1',
      providers: ['claude', 'codex'],
      installed: {},
      scripts: {},
    });

    const resolution = await resolveActiveProvider({
      cwd: '/mock/project',
      env: { AIWG_TEST_PROCESS_PROVIDER: 'codex' },
      detectProcess: true,
    });

    expect(resolution.provider).toBe('codex');
    expect(resolution.source).toBe('process');
  });

  it('returns ambiguous instead of selecting the first configured provider in mixed workspaces', async () => {
    mockReadAiwgConfig.mockResolvedValue({
      version: '1',
      providers: ['claude', 'codex'],
      installed: {},
      scripts: {},
    });

    const resolution = await resolveActiveProvider({
      cwd: '/mock/project',
      env: { AIWG_DISABLE_PROCESS_PROVIDER_DETECTION: '1' },
      detectProcess: true,
    });

    expect(resolution.provider).toBeNull();
    expect(resolution.source).toBe('ambiguous');
    expect(resolution.candidates).toEqual(['claude', 'codex']);
  });
});
