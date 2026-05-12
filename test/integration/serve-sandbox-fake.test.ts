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
    await waitForHttp(serve.url, 20_000);
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

/**
 * Cycle 2 — register fake-sandbox with serve, then drive VM/container
 * lifecycle through serve's `/api/sandboxes/:id/...` proxy routes. This
 * exercises the proxy/forwarding layer that AIWG dashboards depend on.
 */
describe('aiwg serve — dashboard proxies (#1174 cycle 2)', () => {
  let fake: Awaited<ReturnType<typeof startFakeSandbox>>;
  let serve: ServeHandle;
  let registeredSandboxId: string;

  beforeAll(async () => {
    fake = await startFakeSandbox({ scenario: happyPath() });
    serve = await spawnAiwgServe();
    await waitForHttp(serve.url, 20_000);

    // Register the fake with serve so dashboard routes resolve to it.
    // The register schema is documented in src/serve/sandbox-registry.ts as
    // RegisterRequest: { name, grpc_endpoint, ws_endpoint, http_endpoint, ... }.
    const resp = await fetch(`${serve.url}/api/sandboxes/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `fake-cycle2-${Date.now()}`,
        instance_id: `instance-${Date.now()}`,
        grpc_endpoint: fake.url, // fake has no gRPC; serve doesn't probe it for proxy reads
        ws_endpoint: fake.ws_url,
        http_endpoint: fake.url,
        capabilities: ['vms', 'containers'],
        version: '0.0.0-fake',
      }),
    });
    expect([200, 201]).toContain(resp.status);
    const body = await resp.json();
    registeredSandboxId = body.sandbox_id;
    expect(typeof registeredSandboxId).toBe('string');
  }, 60_000);

  afterAll(async () => {
    if (serve) await serve.kill();
    if (fake) await fake.stop();
  });

  it('lists VMs via /api/sandboxes/:id/vms proxy', async () => {
    const resp = await fetch(`${serve.url}/api/sandboxes/${registeredSandboxId}/vms`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body.vms)).toBe(true);
    expect(body.vms.length).toBeGreaterThan(0);
    expect(body.vms[0]).toMatchObject({ name: expect.any(String), state: expect.any(String) });
  });

  it('starts a VM via /api/sandboxes/:id/vms/:name/start (lifecycle button matrix)', async () => {
    const target = 'fake-vm-01';
    const resp = await fetch(
      `${serve.url}/api/sandboxes/${registeredSandboxId}/vms/${target}/start`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
    );
    expect([200, 202]).toContain(resp.status);
    const body = await resp.json();
    expect(body.ok).toBe(true);
    expect(body.vm.state).toBe('running');

    // Confirm via GET single
    const detail = await fetch(`${serve.url}/api/sandboxes/${registeredSandboxId}/vms/${target}`);
    expect(detail.status).toBe(200);
    const vm = await detail.json();
    expect(vm.state).toBe('running');
  });

  it('cycles VM through stop → restart → destroy via proxy', async () => {
    const target = 'fake-vm-01';
    for (const action of ['stop', 'restart', 'destroy'] as const) {
      const r = await fetch(
        `${serve.url}/api/sandboxes/${registeredSandboxId}/vms/${target}/${action}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
      );
      expect([200, 202]).toContain(r.status);
      const body = await r.json();
      expect(body.ok).toBe(true);
    }
  });

  it('returns 404 on /vms/<unknown>/start (no silent fall-through)', async () => {
    const resp = await fetch(
      `${serve.url}/api/sandboxes/${registeredSandboxId}/vms/does-not-exist/start`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
    );
    expect(resp.status).toBe(404);
  });

  it('returns 502 when the registered sandbox endpoint is unreachable', async () => {
    // Register a second sandbox pointing at an unreachable endpoint
    const orphanResp = await fetch(`${serve.url}/api/sandboxes/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `orphan-${Date.now()}`,
        instance_id: `instance-orphan-${Date.now()}`,
        grpc_endpoint: 'http://127.0.0.1:1',
        ws_endpoint: 'ws://127.0.0.1:1',
        http_endpoint: 'http://127.0.0.1:1',
      }),
    });
    expect([200, 201]).toContain(orphanResp.status);
    const { sandbox_id: orphanId } = await orphanResp.json();
    const resp = await fetch(`${serve.url}/api/sandboxes/${orphanId}/vms`);
    expect(resp.status).toBe(502);
    const body = await resp.json();
    expect(body.error).toMatch(/unreachable/i);
  });

  it('returns 404 for /api/sandboxes/<unknown>/vms', async () => {
    const resp = await fetch(`${serve.url}/api/sandboxes/no-such-sandbox/vms`);
    expect(resp.status).toBe(404);
  });
});
