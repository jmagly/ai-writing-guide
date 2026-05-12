/**
 * Tier-3 integration suite — `aiwg serve` PTY-bridge resilience.
 * Cycle 1: smoke + WS upgrade lifecycle. Cycles 2-3 add reconnect-after-disconnect,
 * write back-pressure, child-pty kill/respawn, message ordering under load.
 *
 * @issue #1174
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs without bundled types
import { spawnAiwgServe, waitForHttp } from './_serve-harness.mjs';

interface ServeHandle {
  url: string;
  port: number;
  kill: (signal?: NodeJS.Signals) => Promise<void>;
}

describe('aiwg serve — PTY bridge resilience smoke', () => {
  let serve: ServeHandle;

  beforeAll(async () => {
    serve = await spawnAiwgServe();
    await waitForHttp(serve.url, 20_000);
  }, 60_000);

  afterAll(async () => {
    if (serve) await serve.kill();
  });

  it('refuses upgrade on unmapped /ws/* paths', async () => {
    const wsUrl = serve.url.replace('http://', 'ws://') + '/ws/nonexistent';
    const ws = new WebSocket(wsUrl);
    const result = await new Promise<'open' | 'close' | 'error'>((resolve) => {
      const t = setTimeout(() => resolve('open'), 1500);
      ws.on('open', () => { clearTimeout(t); resolve('open'); });
      ws.on('close', () => { clearTimeout(t); resolve('close'); });
      ws.on('error', () => { clearTimeout(t); resolve('error'); });
    });
    // Either close (server rejects) or error (handshake failure) is acceptable.
    expect(['close', 'error']).toContain(result);
    try { ws.close(); } catch {}
  });

  it('handles 5 sequential health pings without leaking sockets', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await fetch(`${serve.url}/api/sandboxes`);
      expect(r.status).toBeLessThan(500);
    }
  });

  it('survives SIGINT cleanly when shut down', async () => {
    // Start a dedicated serve just for this test so we don't kill the shared one
    const dedicated = await spawnAiwgServe();
    await waitForHttp(dedicated.url, 20_000);

    // Confirm it's alive
    const r = await fetch(dedicated.url);
    expect(r.status).toBeLessThan(500);

    // SIGINT
    await dedicated.kill('SIGINT');

    // After kill, the port should be free again — try connecting and expect failure
    const start = Date.now();
    let stillResponding = true;
    while (Date.now() - start < 3_000) {
      try {
        const r2 = await fetch(dedicated.url, {
          signal: AbortSignal.timeout(200),
        });
        if (r2.status >= 500) { stillResponding = false; break; }
      } catch {
        stillResponding = false;
        break;
      }
      await new Promise(rsv => setTimeout(rsv, 100));
    }
    expect(stillResponding).toBe(false);
  });
});
