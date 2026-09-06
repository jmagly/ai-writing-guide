import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn: spawnMock }));
import { inspectDshVersion } from '../../../tools/providers/deepseek-harness-transport.mjs';

function childProcess() {
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(), stderr: new PassThrough(),
    exitCode: null as number | null, signalCode: null,
    kill: vi.fn(() => true),
  });
  spawnMock.mockReturnValue(child);
  return child;
}
afterEach(() => vi.clearAllMocks());

describe('DeepSeek bounded process settlement', () => {
  it('reads trailing version output after exit and before stdio closes', async () => {
    const child = childProcess();
    const version = inspectDshVersion({ binary: 'fixture', cwd: process.cwd(), dshHome: '/tmp/dsh-settlement' });
    child.exitCode = 0;
    child.emit('exit', 0, null);
    child.stdout.write('dsh v0.1.3-alpha.1\n');
    child.stdout.end(); child.stderr.end();
    child.emit('close', 0, null);
    await expect(version).resolves.toBe('0.1.3-alpha.1');
  });

  it('settles teardown when a timed-out child exits but inherited pipes stay open', async () => {
    const child = childProcess();
    child.kill.mockImplementation(() => { child.exitCode = 1; child.emit('exit', 1, null); return true; });
    const version = inspectDshVersion({ binary: 'fixture', cwd: process.cwd(), dshHome: '/tmp/dsh-settlement', timeoutMs: 10 });
    await expect(version).rejects.toThrow('timed out');
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(child.stdout.destroyed).toBe(true);
    expect(child.stderr.destroyed).toBe(true);
  });

  it('keeps the deadline bounded when exited children leave inherited pipes open', async () => {
    const child = childProcess();
    const version = inspectDshVersion({ binary: 'fixture', cwd: process.cwd(), dshHome: '/tmp/dsh-settlement', timeoutMs: 10 });
    child.exitCode = 0;
    child.emit('exit', 0, null);
    await expect(version).rejects.toThrow('timed out');
    expect(child.stdout.destroyed).toBe(true);
    expect(child.stderr.destroyed).toBe(true);
    expect(child.kill).not.toHaveBeenCalled();
  });
});
