import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDefaultAnalyzerHost } from '../../../src/network-analysis/analyzer.js';

const temporaryDirectories: string[] = [];

async function configRoot(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'aiwg-analyzer-process-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('offline analyzer process boundary (#2280)', () => {
  it('uses the supplied isolated configuration with no ambient PATH', async () => {
    const isolatedConfigRoot = await configRoot();
    const result = await createDefaultAnalyzerHost().run(process.execPath, [
      '-e',
      'console.log(JSON.stringify({home:process.env.HOME,config:process.env.WIRESHARK_CONFIG_DIR,path:process.env.PATH,locale:process.env.LC_ALL,tz:process.env.TZ}))',
    ], { timeoutMs: 2000, maxBufferBytes: 4096, isolatedConfigRoot });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      home: isolatedConfigRoot,
      config: isolatedConfigRoot,
      path: '',
      locale: 'C',
      tz: 'UTC',
    });
    await expect(access(isolatedConfigRoot)).resolves.toBeUndefined();
  });

  it('kills subprocesses at the runtime bound', async () => {
    const isolatedConfigRoot = await configRoot();
    const result = await createDefaultAnalyzerHost().run(process.execPath,
      ['-e', 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'],
      { timeoutMs: 100, maxBufferBytes: 4096, isolatedConfigRoot });
    expect(result.timedOut).toBe(true);
    expect(result.cancelled).not.toBe(true);
  }, 3000);

  it('honors caller cancellation independently from timeout', async () => {
    const isolatedConfigRoot = await configRoot();
    const controller = new AbortController();
    const pending = createDefaultAnalyzerHost().run(process.execPath,
      ['-e', 'setInterval(()=>{},1000)'],
      { timeoutMs: 2000, maxBufferBytes: 4096, isolatedConfigRoot, signal: controller.signal });
    controller.abort();
    const result = await pending;
    expect(result.cancelled).toBe(true);
    expect(result.timedOut).not.toBe(true);
  });

  it('distinguishes output exhaustion from timeout', async () => {
    const isolatedConfigRoot = await configRoot();
    const result = await createDefaultAnalyzerHost().run(process.execPath,
      ['-e', 'process.stdout.write("x".repeat(100000))'],
      { timeoutMs: 2000, maxBufferBytes: 1000, isolatedConfigRoot });
    expect(result.outputLimited).toBe(true);
    expect(result.timedOut).not.toBe(true);
  });
});
