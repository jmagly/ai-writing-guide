import { describe, expect, it, vi } from 'vitest';
import { createKeychainAdapter } from '../../../apps/cockpit/shell-core/keychain.mjs';

const TOKEN = 'generated-per-launch-token';
const ACCOUNT = 'bridge-contract-test';

function harness({ os, available, env = {} }) {
  const calls = [];
  const run = vi.fn(async (command, args, input) => {
    calls.push({ command, args, input });
    return input === undefined ? `${TOKEN}\n` : '';
  });
  const commandAvailable = vi.fn(async (command) => available.includes(command));
  return {
    adapter: createKeychainAdapter({ os, env, run, commandAvailable }),
    calls,
  };
}

describe('Cockpit OS-keychain adapter contracts (#1595)', () => {
  it('round-trips through the native macOS security command contract', async () => {
    const { adapter, calls } = harness({ os: 'darwin', available: ['security'] });
    const ref = await adapter.store(TOKEN, ACCOUNT);
    expect(await adapter.read(ref)).toBe(TOKEN);
    expect(ref).toEqual({ backend: 'macos-keychain', service: 'aiwg-cockpit-bridge', account: ACCOUNT });
    expect(calls[0]).toEqual({
      command: 'security',
      args: ['add-generic-password', '-a', ACCOUNT, '-s', 'aiwg-cockpit-bridge', '-w', TOKEN, '-U'],
      input: undefined,
    });
    expect(calls[1].args).toEqual(['find-generic-password', '-a', ACCOUNT, '-s', 'aiwg-cockpit-bridge', '-w']);
  });

  it('round-trips through Windows PasswordVault with token input on stdin', async () => {
    const { adapter, calls } = harness({ os: 'win32', available: ['powershell'] });
    const ref = await adapter.store(TOKEN, ACCOUNT);
    expect(await adapter.read(ref)).toBe(TOKEN);
    expect(ref.backend).toBe('windows-credential-manager');
    expect(calls[0].command).toBe('powershell');
    expect(calls[0].args.slice(-2)).toEqual(['aiwg-cockpit-bridge', ACCOUNT]);
    expect(calls[0].input).toBe(TOKEN);
    expect(calls[1].args.slice(-2)).toEqual(['aiwg-cockpit-bridge', ACCOUNT]);
    expect(calls[1].input).toBeUndefined();
  });

  it('round-trips through Linux libsecret with token input on stdin', async () => {
    const { adapter, calls } = harness({ os: 'linux', available: ['secret-tool'] });
    const ref = await adapter.store(TOKEN, ACCOUNT);
    expect(await adapter.read(ref)).toBe(TOKEN);
    expect(ref.backend).toBe('libsecret');
    expect(calls).toEqual([
      {
        command: 'secret-tool',
        args: ['store', '--label', 'AIWG Cockpit Bridge', 'service', 'aiwg-cockpit-bridge', 'account', ACCOUNT],
        input: TOKEN,
      },
      {
        command: 'secret-tool',
        args: ['lookup', 'service', 'aiwg-cockpit-bridge', 'account', ACCOUNT],
        input: undefined,
      },
    ]);
  });

  it('uses KWallet only when explicitly enabled and libsecret is unavailable', async () => {
    const { adapter, calls } = harness({
      os: 'linux',
      available: ['kwallet-query'],
      env: { AIWG_COCKPIT_ENABLE_KWALLET: '1', AIWG_COCKPIT_KWALLET: 'test-wallet' },
    });
    const ref = await adapter.store(TOKEN, ACCOUNT);
    expect(await adapter.read(ref)).toBe(TOKEN);
    expect(ref.backend).toBe('kwallet');
    expect(calls[0]).toEqual({
      command: 'kwallet-query',
      args: ['-f', 'AIWG Cockpit', '-w', ACCOUNT, 'test-wallet'],
      input: TOKEN,
    });
    expect(calls[1].args).toEqual(['-f', 'AIWG Cockpit', '-r', ACCOUNT, 'test-wallet']);
  });

  it('fails closed when keychain use is disabled', async () => {
    const { adapter, calls } = harness({
      os: 'linux',
      available: ['secret-tool'],
      env: { AIWG_COCKPIT_KEYCHAIN_DISABLED: '1' },
    });
    await expect(adapter.store(TOKEN, ACCOUNT)).rejects.toThrow(/disabled/);
    expect(calls).toHaveLength(0);
  });
});
