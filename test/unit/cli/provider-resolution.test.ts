import { describe, expect, it, vi } from 'vitest';

const mockReadAiwgConfig = vi.hoisted(() => vi.fn());

vi.mock('../../../src/config/aiwg-config.js', () => ({
  readAiwgConfig: mockReadAiwgConfig,
}));

import {
  resolveActiveProvider,
  commandLooksLikeProvider,
} from '../../../src/cli/provider-resolution.js';

describe('commandLooksLikeProvider (process-tree branch)', () => {
  // Process-tree detection parity for the home-dir global operators. Env-marker
  // detection (OPENHUMAN_HOME / OPENHUMAN_CORE_TOKEN) resolves OpenHuman first,
  // but this gives full parity with the other 8 providers when markers are
  // absent and only the ancestor command name is available (handoff nit).
  it('resolves openhuman from an openhuman-named ancestor command', () => {
    expect(
      commandLooksLikeProvider('/home/u/.local/opt/openhuman/OpenHuman_0.57.39_amd64.AppImage --ozone-platform=x11'),
    ).toBe('openhuman');
  });

  it('keeps openclaw distinct from openhuman (no "open*" cross-match)', () => {
    expect(commandLooksLikeProvider('/usr/bin/openclaw serve')).toBe('openclaw');
    expect(commandLooksLikeProvider('/usr/bin/opencode')).toBe('opencode');
  });

  it('returns null for a non-provider command', () => {
    expect(commandLooksLikeProvider('/usr/bin/bash -c "echo hi"')).toBeNull();
  });
});

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
