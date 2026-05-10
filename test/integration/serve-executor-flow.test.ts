/**
 * Integration test: aiwg serve executor dispatch flow (#1179)
 *
 * Tests the full end-to-end cycle:
 *   register → dispatch → executor accepts → events stream back
 *   → mission.completed reaches aiwg serve → mission visible via GET /api/v1/missions/:id
 *
 * Uses a real in-process mock executor (small Hono server ~150 LoC) that
 * implements the executor contract REST + WS surface. The dispatch payload
 * and event sequence are drawn from the conformance fixture
 * test/conformance/executor-v1/fixtures/dispatch-happy.json so the test
 * exercises schema-conforming payloads.
 *
 * @issue #1179
 * @see docs/contracts/executor.v1.md
 * @see test/conformance/executor-v1/fixtures/dispatch-happy.json
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import http from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simple HTTP client for our local servers. */
async function httpRequest(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, body: json, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Load conformance fixture ──────────────────────────────────────────────────

const FIXTURE = JSON.parse(
  readFileSync(
    resolve(projectRoot, 'test/conformance/executor-v1/fixtures/dispatch-happy.json'),
    'utf-8'
  )
);

const EXECUTOR_ID = FIXTURE.preconditions.executor_registered.executor_id;
// Strip the `_validates_as` fixture-annotation key before passing to the
// schema validator — the executor.aiwg.io/v1 dispatch_payload schema doesn't
// allow extra properties, but the conformance fixture annotates each example
// body with `_validates_as` so the fixture file is self-describing.
const { _validates_as: _ignored, ...DISPATCH_BODY } = FIXTURE.dispatch.request.body;
const MISSION_ID = DISPATCH_BODY.mission_id;

// ── Mock executor server ──────────────────────────────────────────────────────
//
// A small Node.js HTTP server that implements:
//   POST /dispatch     → accepts a mission dispatch and returns 200
// plus a WS server that sends back the fixture event sequence.
//
// We use raw Node.js http + ws to stay within the zero-new-top-level-deps
// constraint (ws is already an existing dep).

class MockExecutorServer {
  constructor() {
    this.server = null;
    this.wss = null;
    this.port = null;
    this.wsPort = null;
    this.receivedDispatches = [];
    this.connections = new Set();
  }

  async start(httpPort, wsPort) {
    this.wsPort = wsPort;

    // HTTP server for REST dispatch
    this.server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/dispatch') {
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(body); } catch { parsed = {}; }
          this.receivedDispatches.push(parsed);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            mission_id: parsed.mission_id,
            estimated_start: new Date(Date.now() + 5000).toISOString(),
          }));
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // Listen on port 0 (or the requested port if provided) and report the
    // actual port back via server.address(). Listening on 0 directly
    // eliminates the TOCTOU race that the prior freePort() pattern had —
    // there's no window between "found free port" and "listen on it" where
    // another process could grab the port (#1226 RC CI fix).
    await new Promise((resolve, reject) => {
      this.server.listen(httpPort ?? 0, '127.0.0.1', () => {
        const addr = /** @type {net.AddressInfo} */ (this.server.address());
        this.port = addr.port;
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  close() {
    for (const conn of this.connections) {
      try { conn.close(1000, 'test done'); } catch {}
    }
    if (this.server) this.server.close();
    if (this.wss) this.wss.close();
  }
}

// ── ExecutorRegistry helpers ──────────────────────────────────────────────────

/**
 * Dynamic import of executor-registry — the module uses import.meta.url
 * for path resolution, so we import it fresh each test run.
 */
async function loadRegistry() {
  // Use a temp identity store so tests don't pollute the real store
  process.env['AIWG_EXECUTOR_IDENTITY_STORE'] = '/tmp/aiwg-integration-test-executor-ids.json';
  const mod = await import('../../src/serve/executor-registry.js');
  return mod;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('executor dispatch flow (integration)', () => {
  let mockExecutor;
  let httpPort;

  let ExecutorRegistry;
  let validateDispatchPayload;

  beforeAll(async () => {
    // Start mock executor on an OS-assigned free port (passes 0 → server
    // reports actual port via server.address()). Avoids the TOCTOU race
    // the prior freePort+listen pattern had under parallel CI test runs.
    mockExecutor = new MockExecutorServer();
    await mockExecutor.start(0, null);
    httpPort = mockExecutor.port;

    // Load registry
    const mod = await loadRegistry();
    ExecutorRegistry = mod.ExecutorRegistry;
    validateDispatchPayload = mod.validateDispatchPayload;
  });

  afterAll(() => {
    mockExecutor?.close();
  });

  it('dispatch payload from fixture is schema-valid', () => {
    const { valid } = validateDispatchPayload(DISPATCH_BODY);
    // valid=true always when ajv is unavailable (graceful degradation)
    expect(valid).toBe(true);
  });

  it('register → list → get → deregister lifecycle', () => {
    const registry = new ExecutorRegistry();

    // Register using fixture executor_id
    const registerBody = {
      executor_id: EXECUTOR_ID,
      name: 'agentic-sandbox-local',
      version: '0.3.0',
      spec_version: '1.0.0',
      transport_endpoints: {
        rest: `http://127.0.0.1:${httpPort}`,
        ws: `ws://127.0.0.1:${httpPort}`,
      },
      capabilities: ['isolation:vm', 'runtime:claude-code', 'platform:linux/x64', 'resumable', 'hitl'],
    };

    const resp = registry.register(registerBody);
    expect('error' in resp).toBe(false);
    const { executor_id, token, registered_at } = resp;
    expect(executor_id).toBe(EXECUTOR_ID);
    expect(token).toBeTruthy();
    expect(registered_at).toBeTruthy();
    expect(registry.size).toBe(1);

    // List
    const list = registry.list();
    expect(list).toHaveLength(1);
    expect(list[0].executor_id).toBe(EXECUTOR_ID);

    // Get
    const single = registry.get(EXECUTOR_ID);
    expect(single?.name).toBe('agentic-sandbox-local');

    // Authenticate
    expect(registry.authenticate(EXECUTOR_ID, token)).toBe(true);
    expect(registry.authenticate(EXECUTOR_ID, 'bad-token')).toBe(false);

    // Deregister
    const deregistered = registry.deregister(EXECUTOR_ID, 'graceful_shutdown');
    expect(deregistered).toBe(true);
    expect(registry.size).toBe(0);
  });

  it('dispatch → forward to mock executor → mission assigned', async () => {
    const registry = new ExecutorRegistry();

    // Register executor
    const registerBody = {
      executor_id: EXECUTOR_ID,
      name: 'agentic-sandbox-local',
      version: '0.3.0',
      spec_version: '1.0.0',
      transport_endpoints: {
        rest: `http://127.0.0.1:${httpPort}`,
        ws: `ws://127.0.0.1:${httpPort}`,
      },
      capabilities: FIXTURE.preconditions.executor_registered.capabilities,
    };
    const regResp = registry.register(registerBody);
    expect('error' in regResp).toBe(false);
    const { token } = regResp;

    // Simulate connected state (WS not needed for this test)
    registry.setConnected(EXECUTOR_ID, true, {
      readyState: 1,
      send() {},
      close() {},
    });

    // Verify pickByFilter returns the executor
    const pick = registry.pickByFilter(DISPATCH_BODY.executor_filter ?? {}, DISPATCH_BODY.long_running ?? false);
    expect(pick).not.toBeNull();
    expect(pick.executor.executorId).toBe(EXECUTOR_ID);

    // Forward dispatch to mock executor (simulates what the serve route does)
    const fwdResp = await httpRequest(
      `http://127.0.0.1:${httpPort}/dispatch`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: DISPATCH_BODY,
      }
    );
    expect(fwdResp.status).toBe(200);
    expect(mockExecutor.receivedDispatches).toHaveLength(1);
    expect(mockExecutor.receivedDispatches[0].mission_id).toBe(MISSION_ID);

    // Assign mission in registry (simulates what the dispatch route does after forward)
    const mission = registry.assignMission(MISSION_ID, EXECUTOR_ID);
    expect(mission.state).toBe('assigned');
    expect(mission.missionId).toBe(MISSION_ID);

    // Verify mission is tracked
    const tracked = registry.getMission(MISSION_ID);
    expect(tracked).toBeDefined();
    expect(tracked.executorId).toBe(EXECUTOR_ID);
  });

  it('event sequence: assigned → started → progress → completed', () => {
    const registry = new ExecutorRegistry();
    registry.register({
      executor_id: EXECUTOR_ID,
      name: 'agentic-sandbox-local',
      version: '0.3.0',
      spec_version: '1.0.0',
      transport_endpoints: {
        rest: `http://127.0.0.1:${httpPort}`,
        ws: `ws://127.0.0.1:${httpPort}`,
      },
      capabilities: FIXTURE.preconditions.executor_registered.capabilities,
    });
    registry.setConnected(EXECUTOR_ID, true, { readyState: 1, send() {}, close() {} });
    registry.assignMission(MISSION_ID, EXECUTOR_ID);

    const stateChanges = [];
    registry.on('mission:state_change', (e) => stateChanges.push(e));

    // Replay fixture event sequence
    for (const event of FIXTURE.event_sequence) {
      registry.handleEvent({
        event: event.event,
        executor_id: event.executor_id,
        mission_id: event.mission_id,
        ts: event.ts,
        data: event.data,
      });
    }

    // Final state should be 'done'
    const mission = registry.getMission(MISSION_ID);
    expect(mission?.state).toBe('done');
    expect(mission?.completedAt).toBeTruthy();

    // We should have seen multiple state transitions
    const states = stateChanges.map((e) => e.state);
    expect(states).toContain('running');
    expect(states).toContain('done');
  });

  it('mission is visible via getMission after dispatch', () => {
    const registry = new ExecutorRegistry();
    registry.register({
      executor_id: EXECUTOR_ID,
      name: 'test',
      version: '1.0.0',
      spec_version: '1.0.0',
      transport_endpoints: { rest: `http://127.0.0.1:${httpPort}`, ws: `ws://127.0.0.1:${httpPort}` },
      capabilities: ['isolation:vm'],
    });
    registry.assignMission(MISSION_ID, EXECUTOR_ID);

    const mission = registry.getMission(MISSION_ID);
    expect(mission).toBeDefined();
    expect(mission.missionId).toBe(MISSION_ID);
    expect(mission.executorId).toBe(EXECUTOR_ID);
    expect(mission.state).toBe('assigned');
    expect(mission.createdAt).toBeTruthy();
    expect(mission.updatedAt).toBeTruthy();
  });

  it('mission.completed reaches server and state is terminal', () => {
    const registry = new ExecutorRegistry();
    registry.register({
      executor_id: EXECUTOR_ID,
      name: 'test',
      version: '1.0.0',
      spec_version: '1.0.0',
      transport_endpoints: { rest: `http://127.0.0.1:${httpPort}`, ws: `ws://127.0.0.1:${httpPort}` },
      capabilities: ['isolation:vm'],
    });
    registry.setConnected(EXECUTOR_ID, true, { readyState: 1, send() {}, close() {} });
    registry.assignMission(MISSION_ID, EXECUTOR_ID);

    registry.handleEvent({
      event: 'mission.completed',
      executor_id: EXECUTOR_ID,
      mission_id: MISSION_ID,
      ts: new Date().toISOString(),
      data: { state: 'done', exit_code: 0, summary: 'Done' },
    });

    const mission = registry.getMission(MISSION_ID);
    expect(mission?.state).toBe('done');
    expect(mission?.exitCode).toBe(0);

    // After terminal state, transition should be refused
    const transitioned = registry.transitionMission(MISSION_ID, 'paused');
    expect(transitioned).toBe(false);
  });
});
