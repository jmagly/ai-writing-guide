// AIWG Cockpit — in-process integration + a11y coverage for CI.
// Exercises the Bridge control surface against the mock executor without shelling
// the aiwg CLI (registry endpoints are covered by the standalone bridge smoke), so
// this stays fast and deterministic in CI. Imports cockpit source directly (apps/
// cockpit is in the repo checkout though excluded from the published tarball).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { createExecutor } from '../../apps/cockpit/mock-executor/src/server.mjs';
import { createBridge, resolveBridgePort, DEFAULT_BRIDGE_PORT, EXECUTOR_RESERVED_PORTS } from '../../apps/cockpit/bridge/src/server.mjs';

let mock, bridge, base, token;
const f = (p, o = {}) => fetch(base + p, { ...o, headers: { ...(o.headers || {}), authorization: `Bearer ${token}` } });

beforeAll(async () => {
  mock = createExecutor();
  await new Promise((r) => mock.listen(0, '127.0.0.1', r));
  bridge = createBridge({ executorUrl: `http://127.0.0.1:${mock.address().port}`, allowMockExecutor: true });
  await new Promise((r) => bridge.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${bridge.address().port}`;
  token = bridge.cockpitToken;
});
afterAll(() => { bridge?.close(); mock?.close(); });

describe('cockpit Bridge — control surface', () => {
  it('gates /api with the per-launch token; /healthz is open', async () => {
    expect((await fetch(`${base}/api/inventory`)).status).toBe(401);
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
    expect((await f('/api/inventory')).status).toBe(200);
  });

  it('serves inventory, running, and sessions with a ws attach_url', async () => {
    const inv = await (await f('/api/inventory')).json();
    expect(inv.count).toBe(4);
    expect(inv.source).toMatch(/^http:\/\/127\.0\.0\.1:/);
    expect(inv.instances.find((x) => x.runtime === 'host')?.runtime_posture).toMatchObject({ isolation: 'least' });
    expect(inv.instances.find((x) => x.runtime === 'wasm-edge')?.runtime_posture).toMatchObject({ isolation: 'opaque' });
    expect(inv.instances.find((x) => x.transport?.trust === 'compatibility')?.transport.evidence).not.toMatch(/secret-value|token/i);
    const run = await (await f('/api/running')).json();
    expect(run.count).toBeGreaterThanOrEqual(2);
    expect(run.running[0]).toHaveProperty('runtime_posture');
    expect(run.running[0]).toHaveProperty('transport');
    const s = await (await f('/api/sessions?instance=550e8400-e29b-41d4-a716-446655440000')).json();
    expect(s.sessions.find((x) => x.id === 'demo-shell')?.attach_url).toMatch(/^ws:\/\/.*\/attach$/);
    expect(s.sessions.find((x) => x.id === 'demo-shell')).toMatchObject({ mode: 'direct', backend: 'native', role_policy: 'observe-default' });
  });

  it('creates sessions with sandbox-advertised direct or managed backend selection', async () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const created = await (await f(`/api/instances/${id}/sessions?mode=managed&backend=tmux`, { method: 'POST' })).json();
    expect(created.attach_url).toMatch(/^ws:\/\/.*\/attach$/);
    const s = await (await f(`/api/sessions?instance=${id}`)).json();
    expect(s.sessions.find((x) => x.id === created.id)).toMatchObject({ mode: 'managed', backend: 'tmux' });
  });

  it('reports the configured agentic-sandbox executor seam', async () => {
    const h = await (await f('/api/health')).json();
    expect(h).toMatchObject({ status: 'ok' });
    expect(h.executor_url).toMatch(/^http:\/\/127\.0\.0\.1:/);
    expect(h).not.toHaveProperty('mock');
  });

  it('loads declarative contributions whose actions inject commands (no Bridge CLI run)', async () => {
    const c = await (await f('/api/contributions')).json();
    expect(c.sources.some((x) => x.id === 'aiwg-core')).toBe(true);
    const audit = c.actions.find((a) => a.id === 'audit-issues');
    expect(audit?.inject?.command).toMatch(/issue-audit/);
    // the spawn-aiwg action-run endpoint is gone
    expect((await f('/api/actions/audit-issues/run', { method: 'POST' })).status).toBe(404);
  });

  it('drives lifecycle, approvals (no flip), and cost', async () => {
    const id = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b';
    expect((await (await f(`/api/instances/${id}/start`, { method: 'POST' })).json()).state).toBe('running');
    expect((await (await f(`/api/instances/${id}/stop`, { method: 'POST' })).json()).state).toBe('stopped');
    expect((await (await f('/api/approvals/apr-001?decision=approve', { method: 'POST' })).json()).status).toBe('approved');
    expect((await f('/api/approvals/apr-001?decision=deny', { method: 'POST' })).status).toBe(409);
    expect((await (await f('/api/cost')).json()).total.usd).toBeGreaterThan(0);
  });
});

describe('cockpit Bridge — mock executor guard', () => {
  let guardedMock, guardedBridge, guardedBase, guardedToken;
  beforeAll(async () => {
    guardedMock = createExecutor();
    await new Promise((r) => guardedMock.listen(0, '127.0.0.1', r));
    guardedBridge = createBridge({ executorUrl: `http://127.0.0.1:${guardedMock.address().port}` });
    await new Promise((r) => guardedBridge.listen(0, '127.0.0.1', r));
    guardedBase = `http://127.0.0.1:${guardedBridge.address().port}`;
    guardedToken = guardedBridge.cockpitToken;
  });
  afterAll(() => { guardedBridge?.close(); guardedMock?.close(); });

  it('refuses mock-like executors unless an automated harness opts in', async () => {
    const res = await fetch(`${guardedBase}/api/inventory`, {
      headers: { authorization: `Bearer ${guardedToken}` },
    });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: 'mock_executor_refused' });
  });
});

describe('cockpit Bridge — real sandbox v2 admin compatibility', () => {
  let upstream, compatBridge, compatBase, compatToken;
  beforeAll(async () => {
    upstream = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const send = (status, body) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (url.pathname === '/admin/instances') return send(404, { error: 'legacy_admin_absent' });
      if (url.pathname === '/api/v2/admin/instances') {
        return send(200, {
          data: {
            instances: [{
              instanceId: 'v2-host-1',
              runtime: { kind: 'host' },
              loadout: 'host-tools',
              status: 'running',
              tenantId: 'default',
              launchContext: { cwd: '/work', selectedTier: 'host' },
              hostDaemon: { status: 'degraded', detail: 'reachable with warnings' },
              security: { transport: { mode: 'mtls-local-ca', source: 'v2 admin', evidence: 'peer cert fingerprint' } },
            }],
          },
        });
      }
      if (url.pathname === '/admin/running') return send(404, { error: 'legacy_running_absent' });
      if (url.pathname === '/api/v2/admin/running') {
        return send(200, { tasks: [{ instanceId: 'v2-host-1', taskId: 'task-1', status: 'working', tenantId: 'default' }] });
      }
      if (url.pathname === '/admin/instances/v2-host-1/start' || url.pathname === '/admin/instances/v2-host-1/stop') {
        return send(404, { error: 'legacy_lifecycle_absent' });
      }
      if (url.pathname === '/api/v2/admin/instances/v2-host-1/start' && req.method === 'POST') {
        return send(200, { instanceId: 'v2-host-1', status: 'running' });
      }
      if (url.pathname === '/api/v2/admin/instances/v2-host-1/stop' && req.method === 'POST') {
        return send(200, { instanceId: 'v2-host-1', status: 'stopped' });
      }
      if (url.pathname === '/admin/instances/v2-host-1' && req.method === 'DELETE') {
        return send(404, { error: 'legacy_delete_absent' });
      }
      if (url.pathname === '/api/v2/admin/instances/v2-host-1' && req.method === 'DELETE') {
        return send(200, { destroyed: 'v2-host-1' });
      }
      if (url.pathname === '/api/v1/agents') {
        return send(200, { agents: [{ id: 'agent-v2-host-1', instance_id: 'v2-host-1', status: 'Ready' }] });
      }
      if (url.pathname === '/agents/v2-host-1/sessions') return send(404, { error: 'legacy_sessions_absent' });
      if (url.pathname === '/agents/v2-host-1/v1/sessions') return send(404, { error: 'preformal_sessions_absent' });
      if (url.pathname === '/api/v1/agents/v2-host-1/sessions') return send(404, { error: 'instance_id_is_not_session_agent_id' });
      if (url.pathname === '/api/v1/agents/agent-v2-host-1/sessions' && req.method === 'GET') {
        return send(200, { items: [{ sessionId: 'sess-v2', seq: 2, members: 1, role_policy: 'observe-default', pty_ws_url: 'wss://{host}/agents/v2-host-1/sessions/sess-v2/attach' }] });
      }
      if (url.pathname === '/api/v1/agents/agent-v2-host-1/sessions' && req.method === 'POST') {
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', () => {
          const body = raw ? JSON.parse(raw) : {};
          send(201, { session_id: 'sess-created-v1', requested: body, pty_ws_url: 'wss://{host}/agents/v2-host-1/sessions/sess-created-v1/attach' });
        });
        return;
      }
      return send(404, { error: 'not_found', path: url.pathname });
    });
    await new Promise((r) => upstream.listen(0, '127.0.0.1', r));
    compatBridge = createBridge({ executorUrl: `http://127.0.0.1:${upstream.address().port}` });
    await new Promise((r) => compatBridge.listen(0, '127.0.0.1', r));
    compatBase = `http://127.0.0.1:${compatBridge.address().port}`;
    compatToken = compatBridge.cockpitToken;
  });
  afterAll(() => { compatBridge?.close(); upstream?.close(); });

  const cf = (p, o = {}) => fetch(compatBase + p, { ...o, headers: { ...(o.headers || {}), authorization: `Bearer ${compatToken}` } });

  it('falls back to /api/v2/admin/instances and normalizes v2-shaped fields', async () => {
    const inv = await (await cf('/api/inventory')).json();
    expect(inv.admin_path).toBe('/api/v2/admin/instances');
    expect(inv.instances[0]).toMatchObject({
      id: 'v2-host-1',
      runtime: 'host',
      state: 'running',
      tenant: 'default',
      runtime_posture: { isolation: 'least' },
      transport: { trust: 'secure' },
      host_daemon: { status: 'degraded' },
    });
    expect(inv.instances[0].session_backends[0]).toMatchObject({ mode: 'managed', backend: 'tmux', available: true, drive: true });

    const running = await (await cf('/api/running')).json();
    expect(running.running[0]).toMatchObject({ instance_id: 'v2-host-1', task_id: 'task-1', state: 'working' });
    expect(running.running[0].runtime_posture).toMatchObject({ isolation: 'least' });

    const sessions = await (await cf('/api/sessions?instance=v2-host-1')).json();
    expect(sessions.sessions[0]).toMatchObject({ id: 'sess-v2', instance_id: 'v2-host-1' });
    expect(sessions.sessions[0].attach_url).toMatch(/^ws:\/\/127\.0\.0\.1:.*\/agents\/v2-host-1\/sessions\/sess-v2\/attach$/);
  });

  it('creates sessions through the formal agentic-sandbox v1 session API', async () => {
    const created = await (await cf('/api/instances/v2-host-1/sessions', { method: 'POST' })).json();
    expect(created).toMatchObject({
      id: 'sess-created-v1',
      requested: { session_backend: 'tmux', session_class: 'managed', command: 'bash' },
    });
    expect(created.attach_url).toMatch(/^ws:\/\/127\.0\.0\.1:.*\/agents\/v2-host-1\/sessions\/sess-created-v1\/attach$/);
  });

  it('falls back to v2 lifecycle routes for start, stop, and destroy', async () => {
    expect(await (await cf('/api/instances/v2-host-1/start', { method: 'POST' })).json()).toMatchObject({ status: 'running' });
    expect(await (await cf('/api/instances/v2-host-1/stop', { method: 'POST' })).json()).toMatchObject({ status: 'stopped' });
    expect(await (await cf('/api/instances/v2-host-1', { method: 'DELETE' })).json()).toMatchObject({ destroyed: 'v2-host-1' });
  });
});

describe('cockpit Bridge — executor without running/approvals admin surface (#1638)', () => {
  // The real agentic-sandbox v2 admin router exposes instances/lifecycle but no
  // /running and no /approvals route. The Bridge must degrade those to empty
  // 200s (not 502/404) so the operator Home view binds inventory and stays usable.
  let upstream, b, ubase, utoken;
  beforeAll(async () => {
    upstream = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const send = (status, body) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (url.pathname === '/api/v2/admin/instances') {
        return send(200, { data: { instances: [{
          instanceId: 'host-only-1', runtime: { kind: 'host' }, loadout: 'host-tools',
          status: 'running', tenantId: 'default', launchContext: { selectedTier: 'host' },
        }] } });
      }
      if (url.pathname === '/api/v1/agents') return send(200, { agents: [] });
      // No running / approvals admin routes on this executor — everything else 404s.
      return send(404, { error: 'not_found', path: url.pathname });
    });
    await new Promise((r) => upstream.listen(0, '127.0.0.1', r));
    b = createBridge({ executorUrl: `http://127.0.0.1:${upstream.address().port}` });
    await new Promise((r) => b.listen(0, '127.0.0.1', r));
    ubase = `http://127.0.0.1:${b.address().port}`;
    utoken = b.cockpitToken;
  });
  afterAll(() => { b?.close(); upstream?.close(); });

  const uf = (p) => fetch(ubase + p, { headers: { authorization: `Bearer ${utoken}` } });

  it('binds inventory while degrading running + approvals to empty 200s', async () => {
    const inv = await uf('/api/inventory');
    expect(inv.status).toBe(200);
    expect((await inv.json()).count).toBe(1);

    const running = await uf('/api/running');
    expect(running.status).toBe(200);
    expect(await running.json()).toMatchObject({ count: 0, running: [] });

    const approvals = await uf('/api/approvals?status=pending');
    expect(approvals.status).toBe(200);
    expect(await approvals.json()).toMatchObject({ approvals: [] });
  });
});

describe('cockpit Bridge — port defaults off the executor range (#1634)', () => {
  it('defaults to an off-range port and never into the agentic-sandbox 8120-8122 range', () => {
    expect(DEFAULT_BRIDGE_PORT).toBe(8140);
    expect(EXECUTOR_RESERVED_PORTS).toEqual([8120, 8121, 8122]);
    expect(resolveBridgePort({})).toBe(DEFAULT_BRIDGE_PORT);
    expect(EXECUTOR_RESERVED_PORTS).not.toContain(resolveBridgePort({}));
  });

  it('honours an explicit PORT', () => {
    expect(resolveBridgePort({ PORT: '8155' })).toBe(8155);
    expect(resolveBridgePort({ AIWG_COCKPIT_BRIDGE_PORT: '8160' })).toBe(8160);
  });

  it('refuses to start on a reserved executor port instead of silently squatting', () => {
    for (const p of EXECUTOR_RESERVED_PORTS) {
      expect(() => resolveBridgePort({ PORT: String(p) })).toThrow(/collides with the agentic-sandbox/);
    }
  });

  it('rejects an invalid PORT', () => {
    expect(() => resolveBridgePort({ PORT: 'nope' })).toThrow(/Invalid Bridge port/);
    expect(() => resolveBridgePort({ PORT: '70000' })).toThrow(/Invalid Bridge port/);
  });
});

describe('cockpit web — app shell served', () => {
  let html;
  beforeAll(async () => { html = await (await fetch(base + '/')).text(); });

  it('declares a document language', () => expect(html).toMatch(/<html lang="en"/));
  it('renders the Cockpit title', () => expect(html).toMatch(/AIWG.?Cockpit/i));
  it('injects the per-launch token', () => expect(html).toContain(`window.__COCKPIT_TOKEN__=${JSON.stringify(token)}`));
  it('references + serves the built bundle outside comments when a React build is present', async () => {
    // strip comments first: a module script trapped in a comment must not count.
    const live = html.replace(/<!--[\s\S]*?-->/g, '');
    if (/assets\//.test(html)) {
      const m = live.match(/<script[^>]+type="module"[^>]+src="([^"]*assets\/[^"]+\.js)"/);
      expect(m, 'module bundle must be referenced outside comments').toBeTruthy();
      expect((await fetch(base + m[1].replace(/^\.\//, '/'))).status).toBe(200);
    }
    // a11y of the *rendered* UI is asserted by the React-render tests in T6 (jsdom).
  });
});
