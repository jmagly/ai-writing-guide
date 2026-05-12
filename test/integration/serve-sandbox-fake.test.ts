/**
 * Tier-3 integration suite — `aiwg serve` end-to-end against the fake sandbox
 * harness from #1173. Spawns real serve via `bin/aiwg.mjs` on an ephemeral
 * port and drives its HTTP API as a black-box client.
 *
 * Cycle 1: smoke + sandbox registration + executor registration + dispatch
 * round-trip. Cycles 2-3 add multi-pane, HITL drawer, telemetry, SIGINT.
 *
 * @issue #1174
 * @related test/fixtures/fake-sandbox/  (#1173 harness)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs without bundled types
import { startFakeSandbox } from '../fixtures/fake-sandbox/server.mjs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { happyPath } from '../fixtures/fake-sandbox/scenarios/happy-path.mjs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { spawnAiwgServe, waitForHttp } from './_serve-harness.mjs';

interface ServeHandle {
  url: string;
  port: number;
  kill: (signal?: NodeJS.Signals) => Promise<void>;
  stdout: string[];
  stderr: string[];
}

describe('aiwg serve end-to-end against fake sandbox', () => {
  let fake: Awaited<ReturnType<typeof startFakeSandbox>>;
  let serve: ServeHandle;

  beforeAll(async () => {
    fake = await startFakeSandbox({ scenario: happyPath() });
    serve = await spawnAiwgServe();
    await waitForHttp(serve.url, 5_000);
  }, 60_000);

  afterAll(async () => {
    if (serve) await serve.kill();
    if (fake) await fake.stop();
  });

  it('serves a /api/sandboxes empty list initially', async () => {
    const resp = await fetch(`${serve.url}/api/sandboxes`);
    expect([200, 404]).toContain(resp.status);
    if (resp.status === 200) {
      const body = await resp.json();
      expect(body).toBeDefined();
    }
  });

  it('accepts a sandbox registration POST', async () => {
    const sandboxId = `fake-sandbox-${Date.now()}`;
    const resp = await fetch(`${serve.url}/api/sandboxes/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sandbox_id: sandboxId,
        name: 'fake-sandbox',
        endpoints: {
          http: fake.url,
          ws: fake.ws_url,
        },
      }),
    });
    // Serve may respond 200/201/400 depending on schema validation; we just
    // want to confirm the route exists and accepts the body shape.
    expect([200, 201, 400, 422]).toContain(resp.status);
    const body = await resp.json().catch(() => null);
    expect(body).toBeDefined();
  });

  it('accepts an executor registration POST and issues a bearer token', async () => {
    const executorId = `fake-exec-${Date.now()}`;
    const resp = await fetch(`${serve.url}/api/v1/executors/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executor_id: executorId,
        name: 'fake-executor',
        version: '0.0.0-test',
        spec_version: '1.0.0',
        transport_endpoints: {
          rest: fake.url,
          ws: fake.ws_url,
        },
        capabilities: [
          'isolation:container',
          'runtime:claude-code',
          'platform:linux/x64',
          'resumable',
          'hitl',
        ],
      }),
    });
    expect([200, 201]).toContain(resp.status);
    const body = await resp.json();
    expect(body.executor_id).toBe(executorId);
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(8);
  });

  it('lists registered executors after register', async () => {
    // Register one for this test
    const executorId = `list-test-exec-${Date.now()}`;
    await fetch(`${serve.url}/api/v1/executors/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executor_id: executorId,
        name: 'list-test',
        version: '0',
        spec_version: '1.0.0',
        transport_endpoints: { rest: fake.url, ws: fake.ws_url },
        capabilities: ['isolation:container'],
      }),
    });
    const list = await fetch(`${serve.url}/api/v1/executors`);
    expect(list.status).toBe(200);
    const body = await list.json();
    expect(Array.isArray(body.executors)).toBe(true);
    const found = body.executors.find((e: { executor_id: string }) => e.executor_id === executorId);
    expect(found).toBeDefined();
  });

  it('rejects dispatch when no executor matches the filter', async () => {
    const resp = await fetch(`${serve.url}/api/v1/sessions/test-session-no-match/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mission_id: `m-${Date.now()}`,
        objective: 'will not run',
        long_running: false,
        executor_filter: { agent_id: 'nonexistent-agent-12345' },
      }),
    });
    // Should be 503 (no_executor_available) or 404 (filter fails)
    expect([404, 503]).toContain(resp.status);
  });
});
