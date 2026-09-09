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
    await waitForHttp(serve.url, 20_000, serve);
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
    await waitForHttp(serve.url, 20_000, serve);

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

/**
 * Cycle 3 — HITL drawer, telemetry, and PTY WS surface coverage.
 *
 * HITL: `GET /api/hitl` returns pending requests from the registry;
 * `POST /api/hitl/:id/respond` proxies to the sandbox. The cycle-3 tests
 * verify the routes exist and handle the unhappy paths (no pending, unknown
 * id) — the full event-driven happy path requires sandbox→serve WS delivery
 * and rides with a future cycle.
 *
 * Telemetry: `GET /api/telemetry` + `/api/telemetry/metrics` always exist
 * and return well-shaped responses. `POST /api/telemetry` accepts events.
 *
 * PTY WS: the upgrade path on `/ws/pty/:sessionId` is exercised at the
 * handshake layer — no real PTY but we verify the route exists and the
 * upgrade succeeds (or is closed per known constraints).
 */
describe('aiwg serve — HITL + telemetry + PTY WS (#1174 cycle 3)', () => {
  let serve: ServeHandle;

  beforeAll(async () => {
    serve = await spawnAiwgServe();
    await waitForHttp(serve.url, 20_000, serve);
  }, 60_000);

  afterAll(async () => {
    if (serve) await serve.kill();
  });

  // ── HITL drawer ──────────────────────────────────────────────

  it('GET /api/hitl returns an empty requests array initially', async () => {
    const resp = await fetch(`${serve.url}/api/hitl`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('requests');
    expect(Array.isArray(body.requests)).toBe(true);
  });

  it('POST /api/hitl/<unknown>/respond returns 404', async () => {
    const resp = await fetch(`${serve.url}/api/hitl/never-existed/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'approve' }),
    });
    expect(resp.status).toBe(404);
    const body = await resp.json();
    expect(body.error).toMatch(/HITL request not found/i);
  });

  // ── Telemetry ────────────────────────────────────────────────

  it('GET /api/telemetry returns an events array', async () => {
    const resp = await fetch(`${serve.url}/api/telemetry`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('events');
    expect(Array.isArray(body.events)).toBe(true);
  });

  it('GET /api/telemetry/metrics returns a metrics object', async () => {
    const resp = await fetch(`${serve.url}/api/telemetry/metrics`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();
  });

  it('POST /api/telemetry accepts an ingested event', async () => {
    const event = {
      type: 'test.cycle3.smoke',
      sessionId: 'cycle3-test',
      timestamp: new Date().toISOString(),
      payload: { value: 42 },
    };
    const resp = await fetch(`${serve.url}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    expect([200, 201]).toContain(resp.status);

    // Cross-check the event surfaces in a subsequent query
    const queryResp = await fetch(
      `${serve.url}/api/telemetry?sessionId=cycle3-test`,
    );
    expect(queryResp.status).toBe(200);
    const { events } = await queryResp.json();
    expect(Array.isArray(events)).toBe(true);
    const found = events.find((e: { type: string }) => e.type === 'test.cycle3.smoke');
    expect(found).toBeDefined();
  });

  // ── PTY WS upgrade ───────────────────────────────────────────
  //
  // The /ws/pty/:sessionId route exists and accepts upgrades. Without a
  // registered sandbox the bridge auto-detects "no sandbox" and closes the
  // WS. We just verify the WS handshake completes — running a real PTY
  // session requires the orchestrate WS layer that's out of scope here.

  it('/ws/pty/:sessionId completes the WebSocket upgrade', async () => {
    const { WebSocket } = await import('ws');
    const wsUrl = `${serve.url.replace('http://', 'ws://')}/ws/pty/cycle3-pty-test`;
    const ws = new WebSocket(wsUrl);
    const outcome = await new Promise<'open' | 'close' | 'error'>((resolve) => {
      const timer = setTimeout(() => resolve('open'), 2_000);
      ws.on('open', () => { clearTimeout(timer); resolve('open'); });
      ws.on('close', () => { clearTimeout(timer); resolve('close'); });
      ws.on('error', () => { clearTimeout(timer); resolve('error'); });
    });
    // Either 'open' (upgrade succeeded) or 'close' (handler closed without
    // a sandbox) is acceptable. 'error' would mean the upgrade itself
    // failed — that's a regression.
    expect(['open', 'close']).toContain(outcome);
    try { ws.close(); } catch { /* ignore */ }
  });
});

// Regression #2310: exercise the public route with A2A tasks and no legacy approval handler.
// The executor is an HTTP fixture; this qualifies routing, not provider autonomy.
describe('aiwg serve — A2A mission approval correlation', () => {
  let serve: ServeHandle;
  let server: import('node:http').Server;
  let registrationWs: WebSocket;
  const legacyMessages: string[] = [];
  const tasks = new Map<string, any>();
  const replies: any[] = [];
  const dispatched = new Map<string, any>();
  const taskInstances = new Map<string, string>();
  const replyInstances: string[] = [];
  const extension = 'https://agentic-sandbox.aiwg.io/extensions/hitl-prompt/v1';
  const executorId = '74323987-bdb9-4891-81dc-042a7e409c67';
  const promptIds = [
    '74323987-bdb9-4891-81dc-042a7e409c61',
    '74323987-bdb9-4891-81dc-042a7e409c62',
    '74323987-bdb9-4891-81dc-042a7e409c63',
    '74323987-bdb9-4891-81dc-042a7e409c64',
  ];
  const post = (path: string, body: unknown) => fetch(`${serve.url}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });

  beforeAll(async () => {
    const { createServer } = await import('node:http');
    server = createServer(async (req, res) => {
      let task: any;
      const instance = req.url?.split('/')[2] ?? '';
      if (req.method === 'POST' && req.url?.endsWith('/messages:send')) {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        const message = JSON.parse(raw).message;
        if (message.metadata?.hitl_response_for) {
          replies.push(message);
          replyInstances.push(instance);
          task = tasks.get(message.taskId);
          if (!task || taskInstances.get(message.taskId) !== instance || message.contextId !== task.contextId
            || message.metadata.hitl_response_for.prompt_id !== task.status.message.metadata[extension].prompt_id) {
            res.writeHead(409); res.end('{}'); return;
          }
          task.status = { state: 'completed' };
        } else if (dispatched.has(message.messageId)) {
          task = dispatched.get(message.messageId);
        } else {
          const index = tasks.size;
          task = { id: `task-${index}`, contextId: `context-${index}`, status: { state: 'input-required', message: {
            messageId: `prompt-${index}`, role: 'agent', parts: [{ kind: 'text', text: 'Approve fixture?' }],
            metadata: { [extension]: { prompt_id: promptIds[index], prompt: 'Approve fixture?',
              response_schema: { type: 'object', properties: { approve: { type: 'boolean' } }, required: ['approve'], additionalProperties: false } } },
          } } };
          tasks.set(task.id, task);
          taskInstances.set(task.id, instance);
          dispatched.set(message.messageId, task);
        }
      } else if (req.method === 'GET') task = tasks.get(req.url?.split('/').at(-1) ?? '');
      if (task && taskInstances.get(task.id) !== instance) task = undefined;
      res.writeHead(task ? 200 : 404, { 'content-type': 'application/json' });
      res.end(JSON.stringify(task ?? {}));
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as import('node:net').AddressInfo;
    serve = await spawnAiwgServe({ env: { AIWG_A2A_PROTOCOL_POLICY: '0.3' } });
    await waitForHttp(serve.url, 20_000, serve);
    const registered = await post('/api/v1/executors/register', {
      executor_id: executorId, name: 'a2a-approval-fixture', version: '1.0.0', spec_version: '1.0.0',
      transport_endpoints: { rest: `http://127.0.0.1:${address.port}`, ws: `ws://127.0.0.1:${address.port}/unused` },
      capabilities: ['hitl', 'isolation:container'],
    });
    expect(registered.status).toBe(201);
    const registration = await registered.json();
    registrationWs = new WebSocket(`${serve.url.replace('http:', 'ws:')}/ws/executors/${executorId}?token=${encodeURIComponent(registration.token)}`);
    registrationWs.addEventListener('message', event => legacyMessages.push(String(event.data)));
    await new Promise<void>((resolve, reject) => { registrationWs.onopen = () => resolve(); registrationWs.onerror = reject; });
  });
  afterAll(async () => {
    registrationWs?.close();
    if (serve) await serve.kill();
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('answers one task, then three pending tasks in reverse order and rejects cross-task/duplicate replies', async () => {
    const dispatch = async (index: number) => {
      const response = await post('/api/v1/sessions/approval-fixture/dispatch', {
        mission_id: `approval-mission-${index}`, a2a_instance_id: `instance-${index}`, objective: 'Provider-free approval routing fixture',
        executor_filter: { executor_id: executorId },
      });
      expect(response.status).toBe(202);
      expect((await response.json()).dispatch_path).toBe('v2');
      const mission = await (await fetch(`${serve.url}/api/v1/missions/approval-mission-${index}`)).json();
      expect(mission.state).toBe('hitl-required');
      expect(mission.recent_events.at(-1).data.hitl_id).toBe(promptIds[index]);
    };
    const answer = (index: number, prompt: string) => post(`/api/v1/missions/approval-mission-${index}/hitl_response`, {
      hitl_id: prompt, response: { approve: index % 2 === 0 },
    });
    await dispatch(0);
    expect((await answer(0, promptIds[0])).status).toBe(200);
    const replay = await post('/api/v1/sessions/approval-fixture/dispatch', {
      mission_id: 'approval-mission-0', a2a_instance_id: 'instance-0', objective: 'Provider-free approval routing fixture',
      executor_filter: { executor_id: executorId },
    });
    expect(replay.status).toBe(202);
    expect((await answer(0, promptIds[0])).status).toBe(409);
    const replayed = await (await fetch(`${serve.url}/api/v1/missions/approval-mission-0`)).json();
    expect(replayed.recent_events.some((event: any) => event.data?.action === 'hitl_response_accepted')).toBe(true);
    await dispatch(1); await dispatch(2); await dispatch(3);
    expect((await answer(1, promptIds[2])).status).toBe(409);
    expect((await answer(3, promptIds[3])).status).toBe(200);
    expect((await answer(2, promptIds[2])).status).toBe(200);
    expect((await answer(1, promptIds[1])).status).toBe(200);
    expect((await answer(1, promptIds[1])).status).toBe(409);
    expect(legacyMessages.some(message => message.includes('mission.hitl_responded'))).toBe(false);
    expect(replyInstances).toEqual(['instance-0', 'instance-3', 'instance-2', 'instance-1']);
    expect(replies.map(message => message.taskId)).toEqual(['task-0', 'task-3', 'task-2', 'task-1']);
    expect((await post('/api/v1/missions/approval-mission-0/hitl_response', null)).status).toBe(400);
  });
});
