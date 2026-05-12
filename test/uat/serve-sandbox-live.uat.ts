/**
 * Tier-4 live UAT — `aiwg serve` against a real agentic-sandbox instance.
 *
 * Gated on AIWG_SANDBOX_ENDPOINT (default http://127.0.0.1:8122). When the
 * sandbox is unreachable, every test skips with a clear message so this UAT
 * is safe to run in any environment.
 *
 * Run on demand:
 *   npm run uat:serve-live
 *
 * @issue #1176
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs without bundled types
import { spawnAiwgServe, waitForHttp } from '../integration/_serve-harness.mjs';

const SANDBOX_ENDPOINT = process.env.AIWG_SANDBOX_ENDPOINT || 'http://127.0.0.1:8122';

/** Probe the sandbox once up-front so we can skip the whole suite if it's unreachable. */
async function probeSandbox(): Promise<{ reachable: boolean; status?: Record<string, unknown>; error?: string }> {
  try {
    const resp = await fetch(`${SANDBOX_ENDPOINT}/api/v1/aiwg/status`, {
      signal: AbortSignal.timeout(2_000),
    });
    if (!resp.ok) return { reachable: false, error: `status ${resp.status}` };
    const status = await resp.json();
    return { reachable: true, status };
  } catch (err) {
    return { reachable: false, error: String((err as Error).message || err) };
  }
}

interface ServeHandle {
  url: string;
  port: number;
  kill: (signal?: NodeJS.Signals) => Promise<void>;
}

describe('aiwg serve — live UAT vs real agentic-sandbox', () => {
  let sandboxReachable = false;
  let sandboxStatus: Record<string, unknown> | undefined;
  let serve: ServeHandle | undefined;

  beforeAll(async () => {
    const probe = await probeSandbox();
    sandboxReachable = probe.reachable;
    sandboxStatus = probe.status;
    if (!sandboxReachable) {
      // eslint-disable-next-line no-console
      console.log(
        `\n  ⚠ Skipping serve-sandbox-live UAT — sandbox at ${SANDBOX_ENDPOINT} unreachable (${probe.error}).\n  Run a sandbox locally or set AIWG_SANDBOX_ENDPOINT to test against a different host.\n`,
      );
      return;
    }
    serve = await spawnAiwgServe();
    await waitForHttp(serve.url, 5_000);
  }, 60_000);

  afterAll(async () => {
    if (serve) await serve.kill();
  });

  // Wrap each test in a guard so they skip cleanly when the sandbox is absent.
  function liveIt(name: string, body: () => Promise<void> | void, timeout?: number) {
    it(
      name,
      async () => {
        if (!sandboxReachable) {
          // eslint-disable-next-line no-console
          console.log(`  ⏭  ${name} — skipped (no sandbox)`);
          return;
        }
        await body();
      },
      timeout,
    );
  }

  liveIt('sandbox /api/v1/aiwg/status reports configured + endpoint', () => {
    expect(sandboxStatus).toBeDefined();
    expect(sandboxStatus!.configured).toBe(true);
    expect(typeof sandboxStatus!.endpoint).toBe('string');
  });

  liveIt('sandbox /api/v1/agents responds with an agents array', async () => {
    const resp = await fetch(`${SANDBOX_ENDPOINT}/api/v1/agents`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body.agents)).toBe(true);
  });

  liveIt('aiwg serve health endpoint responds (smoke)', async () => {
    expect(serve).toBeDefined();
    const resp = await fetch(serve!.url);
    expect(resp.status).toBeLessThan(500);
  });

  liveIt('serve POST /api/v1/executors/register accepts a synthetic executor', async () => {
    expect(serve).toBeDefined();
    const executorId = `uat-exec-${Date.now()}`;
    const resp = await fetch(`${serve!.url}/api/v1/executors/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executor_id: executorId,
        name: 'uat-synthetic',
        version: '0.0.0-uat',
        spec_version: '1.0.0',
        transport_endpoints: {
          rest: SANDBOX_ENDPOINT,
          ws: SANDBOX_ENDPOINT.replace('http', 'ws'),
        },
        capabilities: ['isolation:container', 'runtime:claude-code', 'platform:linux/x64'],
      }),
    });
    expect([200, 201]).toContain(resp.status);
    const body = await resp.json();
    expect(body.executor_id).toBe(executorId);
    expect(typeof body.token).toBe('string');
  }, 30_000);

  liveIt('serve GET /api/v1/executors lists a registered executor', async () => {
    expect(serve).toBeDefined();
    const list = await fetch(`${serve!.url}/api/v1/executors`);
    expect(list.status).toBe(200);
    const body = await list.json();
    expect(Array.isArray(body.executors)).toBe(true);
    expect(body.executors.length).toBeGreaterThan(0);
  }, 30_000);

  // Out of cycle 1 (deferred to cycle 2-3 of #1176):
  // - End-to-end mission lifecycle (register → dispatch → execute → terminate)
  // - Multi-pane attach against a real VM
  // - Mid-PTY-session VM stop
  // - Network partition reconnect
  // - Concurrent registers from two serves
  // - Telemetry round-trip
});
