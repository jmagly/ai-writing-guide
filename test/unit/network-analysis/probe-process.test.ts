import { access } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createDefaultProbeHost } from '../../../src/network-analysis/probe.js';

describe('probe process boundary', () => {
  it('uses an isolated config and cleans it after execution', async () => {
    const host = createDefaultProbeHost();
    const result = await host.run(process.execPath, ['-e', 'console.log(JSON.stringify({config:process.env.WIRESHARK_CONFIG_DIR,path:process.env.PATH,locale:process.env.LC_ALL}))'], { timeoutMs: 2000, maxBufferBytes: 4096 });
    expect(result.exitCode).toBe(0);
    const settings = JSON.parse(result.stdout);
    expect(settings.path).toBe('');
    expect(settings.locale).toBe('C');
    expect(settings.config).toContain('aiwg-network-probe-');
    await expect(access(settings.config)).rejects.toThrow();
  });

  it('terminates a child that ignores SIGTERM', async () => {
    const result = await createDefaultProbeHost().run(process.execPath,
      ['-e', 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'],
      { timeoutMs: 150, maxBufferBytes: 4096 });
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).not.toBe(0);
  }, 3000);

  it('distinguishes output exhaustion from timeout', async () => {
    const result = await createDefaultProbeHost().run(process.execPath,
      ['-e', 'process.stdout.write("x".repeat(100000))'],
      { timeoutMs: 2000, maxBufferBytes: 1000 });
    expect(result.outputLimited).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.stdout.length).toBeLessThanOrEqual(1000);
  });
});
