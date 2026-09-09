import { EventEmitter } from 'node:events';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';

import { createServeIsolation, spawnAiwgServe } from '../../integration/_serve-harness.mjs';

const callerOwned: string[] = [];
const ownedIsolations: Array<{ cleanup: () => void }> = [];

afterEach(() => {
  for (const isolation of ownedIsolations.splice(0)) isolation.cleanup();
  for (const directory of callerOwned.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('serve integration configuration isolation', () => {
  it('replaces inherited operator configuration with unique owned directories and cleans idempotently', () => {
    const inherited = '/operator/config/must-not-be-used';
    const first = createServeIsolation({ AIWG_CONFIG: inherited, KEEP: 'yes' }, {});
    const second = createServeIsolation({ AIWG_CONFIG: inherited }, {});
    ownedIsolations.push(first, second);

    expect(first.owned).toBe(true);
    expect(first.env).toMatchObject({ AIWG_CONFIG: first.configDir, KEEP: 'yes' });
    expect(first.configDir).not.toBe(inherited);
    expect(second.configDir).not.toBe(first.configDir);
    expect(existsSync(first.configDir)).toBe(true);
    expect(existsSync(second.configDir)).toBe(true);

    first.cleanup();
    first.cleanup();
    second.cleanup();
    expect(existsSync(first.configDir)).toBe(false);
    expect(existsSync(second.configDir)).toBe(false);
  });

  it('preserves an explicit caller-owned override and never removes it', () => {
    const directory = mkdtempSync(join(tmpdir(), 'aiwg-serve-caller-config-'));
    callerOwned.push(directory);
    const isolation = createServeIsolation(
      { AIWG_CONFIG: '/operator/config/must-not-be-used' },
      { AIWG_CONFIG: directory, AIWG_A2A_PROTOCOL_POLICY: '0.3' },
    );

    expect(isolation).toMatchObject({ configDir: directory, owned: false });
    expect(isolation.env).toMatchObject({
      AIWG_CONFIG: directory,
      AIWG_A2A_PROTOCOL_POLICY: '0.3',
    });
    isolation.cleanup();
    expect(existsSync(directory)).toBe(true);
  });

  it('cleans owned configuration when process creation throws', async () => {
    const isolation = createServeIsolation({}, {});
    ownedIsolations.push(isolation);

    await expect(spawnAiwgServe({
      isolation,
      spawnProcess: () => { throw new Error('synthetic spawn failure'); },
    })).rejects.toThrow('synthetic spawn failure');
    expect(existsSync(isolation.configDir)).toBe(false);
  });

  it('cleans owned configuration when a child exits before startup', async () => {
    const isolation = createServeIsolation({}, {});
    ownedIsolations.push(isolation);
    const child = fakeChild();

    await expect(spawnAiwgServe({
      isolation,
      spawnProcess: () => {
        queueMicrotask(() => child.emit('exit', 2));
        return child;
      },
    })).rejects.toThrow('did not announce a Dashboard URL');
    expect(existsSync(isolation.configDir)).toBe(false);
  });

  it('keeps owned configuration for a live child and cleans it after normal kill', async () => {
    const isolation = createServeIsolation({}, {});
    ownedIsolations.push(isolation);
    const child = fakeChild();
    const handle = await spawnAiwgServe({
      isolation,
      spawnProcess: () => {
        queueMicrotask(() => child.stdout.write('Dashboard: http://127.0.0.1:43210\n'));
        return child;
      },
    });

    expect(existsSync(isolation.configDir)).toBe(true);
    expect(handle).toMatchObject({ port: 43210, configDir: isolation.configDir, ownsConfigDir: true });
    await handle.kill();
    expect(existsSync(isolation.configDir)).toBe(false);
  });
});

function fakeChild() {
  const child = new EventEmitter() as any;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.exitCode = null;
  child.kill = () => {
    child.exitCode = 0;
    queueMicrotask(() => child.emit('exit', 0));
    return true;
  };
  return child;
}
