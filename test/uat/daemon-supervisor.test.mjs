/**
 * Daemon Headend Stack — User Acceptance Tests
 *
 * End-to-end validation of the daemon headend components using stubs only.
 * No real AI sessions are spawned. Tests run the actual module code paths
 * (DaemonSupervisor, BehaviorRegistry, WebServer, IPCServer, ops handlers)
 * with a deterministic StubAgentSupervisor in place of the real agent runner.
 *
 * CI-safe — no external dependencies, random high ports to avoid conflicts.
 *
 * Run on demand:
 *   npx vitest run test/uat/daemon-supervisor.test.mjs
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

// ── Resolve module paths ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - import.meta works in vitest ESM
const __filename = fileURLToPath(import.meta.url);
const __dirnameFile = dirname(__filename);
const PROJECT_ROOT = resolve(__dirnameFile, '../..');

const { DaemonSupervisor } = await import(
  join(PROJECT_ROOT, 'tools/ralph-external/daemon-supervisor.mjs')
);
const { BehaviorRegistry } = await import(
  join(PROJECT_ROOT, 'tools/ralph-external/lib/behavior-registry.mjs')
);
const { WebServer } = await import(
  join(PROJECT_ROOT, 'tools/daemon/web-server.mjs')
);
const { IPCServer } = await import(
  join(PROJECT_ROOT, 'tools/daemon/ipc-server.mjs')
);
const { registerOpsHandlers } = await import(
  join(PROJECT_ROOT, 'tools/daemon/ipc-ops-handlers.mjs')
);

// ── StubAgentSupervisor ─────────────────────────────────────────────────────

class StubAgentSupervisor extends EventEmitter {
  constructor() {
    super();
    this._taskIdCounter = 0;
    this._running = new Map();
  }

  submit(prompt, options) {
    const taskId = `task-${++this._taskIdCounter}`;
    const task = { id: taskId, state: 'running', prompt };
    this._running.set(taskId, task);
    // Emit started after microtask to simulate async scheduling
    setTimeout(() => this.emit('task:started', { taskId, pid: 10000 + this._taskIdCounter }), 5);
    return task;
  }

  cancel(taskId) {
    if (this._running.has(taskId)) {
      this._running.delete(taskId);
      this.emit('task:cancelled', { taskId });
      return true;
    }
    return false;
  }

  getStatus() {
    return { running: this._running.size, queued: 0, maxConcurrency: 4, tasks: { running: [], queued: [] } };
  }

  get runningCount() { return this._running.size; }
  get queuedCount() { return 0; }

  async shutdown() { this._running.clear(); }

  // Test helpers — drive the event lifecycle from outside
  completeTask(taskId) {
    this._running.delete(taskId);
    this.emit('task:completed', { taskId, duration: 100 });
  }

  failTask(taskId, error = 'stub failure') {
    this._running.delete(taskId);
    this.emit('task:failed', { taskId, error });
  }
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function makeSupervisor(overrides = {}) {
  const stub = new StubAgentSupervisor();
  const ds = new DaemonSupervisor({
    agentSupervisor: stub,
    maxConcurrent: 4,
    maxQueueDepth: 20,
    dailyBudgetUsd: 0,
    restartIntensity: { maxRestarts: 3, windowMs: 300_000 },
    circuitBreaker: { failureThreshold: 5, cooldownMs: 120_000 },
    ...overrides,
  });
  return { ds, stub };
}

/** Wait for a specific event on an emitter, with a short timeout. */
function waitForEvent(emitter, event, timeoutMs = 200) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for '${event}'`)), timeoutMs);
    emitter.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/**
 * Sentinel value passed to listen() so the OS picks a free port.
 *
 * We previously rolled a random port in 40000-59999, which produced
 * occasional EADDRINUSE flakes when two consecutive WebServer instances
 * happened to land on the same port (or collided with OS services or
 * sockets stuck in TIME_WAIT). Using port 0 lets the kernel hand back
 * a guaranteed-free port via server.address().port — readable on the
 * WebServer instance after start() resolves.
 */
const OS_ASSIGNED_PORT = 0;

/** Make a simple HTTP request and return { statusCode, body }. */
function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/** Send a JSON-RPC 2.0 request over a Unix socket and read the response. */
function ipcCall(socketPath, method, params = {}, id = 1) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let buffer = '';

    socket.on('connect', () => {
      const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
      socket.write(msg);
    });

    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      const newlineIdx = buffer.indexOf('\n');
      if (newlineIdx !== -1) {
        const line = buffer.slice(0, newlineIdx);
        socket.destroy();
        try {
          resolve(JSON.parse(line));
        } catch (err) {
          reject(err);
        }
      }
    });

    socket.on('error', reject);
    setTimeout(() => {
      socket.destroy();
      reject(new Error(`IPC call timeout: ${method}`));
    }, 2000);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 1. DaemonSupervisor Tests
// ════════════════════════════════════════════════════════════════════════════

describe('DaemonSupervisor', () => {
  let ds;
  let stub;

  beforeEach(() => {
    ({ ds, stub } = makeSupervisor());
  });

  afterEach(async () => {
    await ds.shutdown(1000);
  });

  it('throws when constructed without agentSupervisor', () => {
    expect(() => new DaemonSupervisor({})).toThrow('agentSupervisor');
  });

  describe('submit lifecycle', () => {
    it('returns loopId and queued:false when under concurrency cap', () => {
      const result = ds.submit({ loopId: 'loop-a', prompt: 'hello' });
      expect(result.loopId).toBe('loop-a');
      expect(result.queued).toBe(false);
      expect(result.position).toBe(0);
    });

    it('generates a loopId when none provided', () => {
      const result = ds.submit({ prompt: 'auto-id test' });
      expect(typeof result.loopId).toBe('string');
      expect(result.loopId.length).toBeGreaterThan(0);
    });

    it('emits loop:started event after submission', async () => {
      const startedPromise = waitForEvent(ds, 'loop:started');
      ds.submit({ loopId: 'loop-start-event', prompt: 'task' });
      const evt = await startedPromise;
      expect(evt.loopId).toBe('loop-start-event');
      expect(typeof evt.taskId).toBe('string');
    });

    it('reflects running loop in status()', async () => {
      ds.submit({ loopId: 'loop-status', prompt: 'task' });
      // Give the microtask a tick to process
      await new Promise((r) => setTimeout(r, 20));
      const s = ds.status();
      const loop = s.running.find((r) => r.loopId === 'loop-status');
      expect(loop).toBeDefined();
    });
  });

  describe('concurrency cap', () => {
    it('queues the 5th submission when maxConcurrent=4', () => {
      ds.submit({ loopId: 'loop-1', prompt: 'a' });
      ds.submit({ loopId: 'loop-2', prompt: 'b' });
      ds.submit({ loopId: 'loop-3', prompt: 'c' });
      ds.submit({ loopId: 'loop-4', prompt: 'd' });
      const fifth = ds.submit({ loopId: 'loop-5', prompt: 'e' });
      expect(fifth.queued).toBe(true);
      expect(fifth.position).toBe(1);
    });

    it('dequeues and starts a waiting loop when a running loop completes', async () => {
      // Fill capacity
      ds.submit({ loopId: 'c1', prompt: 'a' });
      ds.submit({ loopId: 'c2', prompt: 'b' });
      ds.submit({ loopId: 'c3', prompt: 'c' });
      const task4 = stub._running.keys();
      ds.submit({ loopId: 'c4', prompt: 'd' });

      // Queue one more
      ds.submit({ loopId: 'c5', prompt: 'e' });

      // Wait for all task:started events to fire
      await new Promise((r) => setTimeout(r, 30));

      const startedPromise = waitForEvent(ds, 'loop:started', 500);

      // Complete c1 — should drain queue and start c5
      const taskIdOfC1 = [...stub._running.entries()].find(([, t]) => t.prompt === 'a')?.[0];
      if (taskIdOfC1) stub.completeTask(taskIdOfC1);

      const startedEvt = await startedPromise;
      expect(startedEvt.loopId).toBe('c5');
    });
  });

  describe('queue overflow rejection', () => {
    it('throws when queue is full', () => {
      const { ds: ds2 } = makeSupervisor({ maxConcurrent: 1, maxQueueDepth: 2 });

      ds2.submit({ loopId: 'q1', prompt: 'running' }); // fills concurrency slot
      ds2.submit({ loopId: 'q2', prompt: 'queued-1' }); // queue depth 1
      ds2.submit({ loopId: 'q3', prompt: 'queued-2' }); // queue depth 2 (full)

      expect(() => ds2.submit({ loopId: 'q4', prompt: 'overflow' })).toThrow(/[Qq]ueue full/);
    });

    it('emits loop:rejected when queue overflows', () => {
      const { ds: ds2 } = makeSupervisor({ maxConcurrent: 1, maxQueueDepth: 1 });
      const rejected = [];
      ds2.on('loop:rejected', (evt) => rejected.push(evt));

      ds2.submit({ loopId: 'r1', prompt: 'running' });
      ds2.submit({ loopId: 'r2', prompt: 'queued' });
      try { ds2.submit({ loopId: 'r3', prompt: 'overflow' }); } catch { /* expected */ }

      expect(rejected.length).toBeGreaterThan(0);
      expect(rejected[0].loopId).toBe('r3');
      expect(rejected[0].reason).toBe('queue full');
    });
  });

  describe('cancel', () => {
    it('returns false for unknown loopId', () => {
      expect(ds.cancel('does-not-exist')).toBe(false);
    });

    it('removes a queued loop from the queue', () => {
      const { ds: ds2 } = makeSupervisor({ maxConcurrent: 1, maxQueueDepth: 5 });
      ds2.submit({ loopId: 'x1', prompt: 'running' });
      ds2.submit({ loopId: 'x2', prompt: 'queued' });

      const cancelled = ds2.cancel('x2');
      expect(cancelled).toBe(true);

      const status = ds2.status();
      expect(status.queued.find((q) => q.loopId === 'x2')).toBeUndefined();
    });
  });

  describe('restart intensity', () => {
    it('marks loop permanently failed after maxRestarts within window', async () => {
      // Use a dedicated stub so taskId lookups are isolated
      const stub2 = new StubAgentSupervisor();
      const ds2 = new DaemonSupervisor({
        agentSupervisor: stub2,
        maxConcurrent: 4,
        maxQueueDepth: 20,
        restartIntensity: { maxRestarts: 3, windowMs: 60_000 },
        circuitBreaker: { failureThreshold: 100, cooldownMs: 1 },
      });

      const failedEvents = [];
      ds2.on('loop:failed', (evt) => failedEvents.push(evt));

      ds2.submit({ loopId: 'ri-loop', prompt: 'risky task' });
      await new Promise((r) => setTimeout(r, 30));

      // Helper: find the current taskId for ri-loop in the DaemonSupervisor
      const getTaskId = () => {
        const entry = ds2._running.get('ri-loop');
        return entry?.taskId;
      };

      // Fail once — history=[1], 1 < 3 → restart
      let taskId = getTaskId();
      expect(taskId).toBeDefined();
      stub2.failTask(taskId, 'err-1');
      await new Promise((r) => setTimeout(r, 30));

      // Fail second restart — history=[1,2], 2 < 3 → restart
      taskId = getTaskId();
      expect(taskId).toBeDefined();
      stub2.failTask(taskId, 'err-2');
      await new Promise((r) => setTimeout(r, 30));

      // Fail third — history=[1,2,3], 3 >= 3 → permanently failed (no restart)
      taskId = getTaskId();
      expect(taskId).toBeDefined();
      stub2.failTask(taskId, 'err-3');
      await new Promise((r) => setTimeout(r, 30));

      const permanentFail = failedEvents.find((e) => e.permanent === true);
      expect(permanentFail).toBeDefined();
      expect(permanentFail.loopId).toBe('ri-loop');
      expect(permanentFail.reason).toMatch(/restart intensity/i);

      const status = ds2.status();
      expect(status.permanentlyFailed).toContain('ri-loop');

      await ds2.shutdown(500);
    });
  });

  describe('circuit breaker', () => {
    it('blocks new submissions after consecutive failure threshold', async () => {
      const { ds: ds2, stub: stub2 } = makeSupervisor({
        circuitBreaker: { failureThreshold: 3, cooldownMs: 60_000 },
        restartIntensity: { maxRestarts: 100, windowMs: 60_000 },
      });

      // Trigger 3 distinct loops each failing once
      for (let i = 0; i < 3; i++) {
        ds2.submit({ loopId: `cb-loop-${i}`, prompt: `task ${i}` });
        await new Promise((r) => setTimeout(r, 20));
        const taskId = [...stub2._running.keys()].pop();
        if (taskId) stub2.failTask(taskId, 'circuit-failure');
        await new Promise((r) => setTimeout(r, 20));
      }

      // Circuit should now be open
      expect(() => ds2.submit({ loopId: 'cb-blocked', prompt: 'blocked' }))
        .toThrow(/[Cc]ircuit breaker/);

      await ds2.shutdown(500);
    });
  });

  describe('budget gate', () => {
    it('blocks spawning when daily budget is fully consumed', () => {
      const { ds: ds2 } = makeSupervisor({ dailyBudgetUsd: 1.00 });

      // Record cost right up to the limit
      ds2.recordCost('any-loop', 1.00);

      expect(() =>
        ds2.submit({ loopId: 'budget-blocked', prompt: 'costly', estimatedCostUsd: 0.01 })
      ).toThrow(/[Bb]udget exceeded/);
    });

    it('emits budget:exceeded event when budget is hit', () => {
      const { ds: ds2 } = makeSupervisor({ dailyBudgetUsd: 0.50 });
      ds2.recordCost('prior', 0.50);

      const exceeded = [];
      ds2.on('budget:exceeded', (e) => exceeded.push(e));

      try {
        ds2.submit({ loopId: 'over-budget', prompt: 'task', estimatedCostUsd: 0.01 });
      } catch { /* expected */ }

      expect(exceeded.length).toBe(1);
      expect(exceeded[0].dailyLimit).toBe(0.50);
    });

    it('allows submission when budget is 0 (unlimited)', () => {
      const { ds: ds2 } = makeSupervisor({ dailyBudgetUsd: 0 });
      ds2.recordCost('any', 999);
      expect(() => ds2.submit({ loopId: 'unlimited', prompt: 'task' })).not.toThrow();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. BehaviorRegistry Tests
// ════════════════════════════════════════════════════════════════════════════

describe('BehaviorRegistry — ops-toolset.yaml', () => {
  let registry;

  beforeEach(async () => {
    registry = new BehaviorRegistry({
      projectRoot: PROJECT_ROOT,
      frameworkRoot: PROJECT_ROOT,
    });
    await registry.loadAll();
  });

  it('discovers and loads ops-toolset.yaml from the framework tier', () => {
    const behaviors = registry._behaviors;
    expect(behaviors.has('ops-toolset')).toBe(true);
    const b = behaviors.get('ops-toolset');
    expect(b._tier).toBe('framework');
  });

  it('loads ops-toolset directly by name', async () => {
    const behavior = await registry.load('ops-toolset');
    expect(behavior.name).toBe('ops-toolset');
    expect(behavior.version).toBe('1.0.0');
  });

  it('getDirectives("daemon") returns 5 directives', () => {
    const directives = registry.getDirectives('daemon');
    expect(directives.length).toBe(5);
  });

  it('directive ids are the expected ops directives', () => {
    const ids = registry.getDirectives('daemon').map((d) => d.id);
    expect(ids).toContain('process-group-kill');
    expect(ids).toContain('restart-intensity');
    expect(ids).toContain('concurrency-cap');
    expect(ids).toContain('budget-gate');
    expect(ids).toContain('zombie-reap');
  });

  it('getToolset("daemon") returns 7 tools', () => {
    const tools = registry.getToolset('daemon');
    expect(tools.length).toBe(7);
  });

  it('toolset contains expected tool names', () => {
    const toolNames = registry.getToolset('daemon').map((t) => t.tool);
    expect(toolNames).toContain('process-list');
    expect(toolNames).toContain('process-kill');
    expect(toolNames).toContain('resource-snapshot');
    expect(toolNames).toContain('circuit-status');
    expect(toolNames).toContain('queue-inspect');
    expect(toolNames).toContain('loop-history');
    expect(toolNames).toContain('budget-remaining');
  });

  it('validate() passes for the loaded ops-toolset behavior', async () => {
    const behavior = await registry.load('ops-toolset');
    const result = registry.validate(behavior);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validate() fails for a null behavior', () => {
    const result = registry.validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('getDirectives returns empty array for unknown agentType', () => {
    const directives = registry.getDirectives('nonexistent-agent-type');
    expect(directives).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. Web Interface Tests
// ════════════════════════════════════════════════════════════════════════════

describe('WebServer', () => {
  let web;
  let ds;
  let stub;
  let port;
  const TOKEN = 'test-uat-token-abc123';

  beforeEach(async () => {
    ({ ds, stub } = makeSupervisor());

    web = new WebServer({
      port: OS_ASSIGNED_PORT,    // OS picks a free port; read back below
      host: '127.0.0.1',
      token: TOKEN,
      daemonSupervisor: ds,
    });
    await web.start();
    port = web.port;             // updated by start() to the actual bound port
  });

  afterEach(async () => {
    await web.stop();
    await ds.shutdown(500);
  });

  it('server starts and responds to requests', async () => {
    const result = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/status',
      method: 'GET',
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    expect(result.statusCode).toBe(200);
  });

  it('rejects requests missing auth token with 401', async () => {
    const result = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/status',
      method: 'GET',
      // No Authorization header
    });
    expect(result.statusCode).toBe(401);
  });

  it('rejects requests with wrong auth token with 401', async () => {
    const result = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/status',
      method: 'GET',
      headers: { Authorization: 'Bearer wrong-token' },
    });
    expect(result.statusCode).toBe(401);
  });

  it('accepts auth via query param token', async () => {
    const result = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: `/api/status?token=${TOKEN}`,
      method: 'GET',
    });
    expect(result.statusCode).toBe(200);
  });

  it('/api/status returns daemon health JSON', async () => {
    const result = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/status',
      method: 'GET',
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    expect(result.statusCode).toBe(200);
    expect(result.body.status).toBe('healthy');
    expect(result.body).toHaveProperty('concurrency');
    expect(result.body).toHaveProperty('queue');
    expect(result.body).toHaveProperty('circuit');
    expect(result.body).toHaveProperty('budget');
    expect(typeof result.body.uptime).toBe('number');
  });

  it('POST /api/submit creates a loop and returns 201', async () => {
    const result = await httpRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/submit',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
      { loopId: 'web-loop-1', prompt: 'via web', priority: 0 }
    );
    expect(result.statusCode).toBe(201);
    expect(result.body.loopId).toBe('web-loop-1');
    expect(typeof result.body.queued).toBe('boolean');
  });

  it('POST /api/submit with missing prompt returns 400', async () => {
    const result = await httpRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/submit',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
      { loopId: 'bad-loop' } // missing prompt
    );
    expect(result.statusCode).toBe(400);
    expect(result.body.error).toMatch(/prompt/i);
  });

  it('GET /sse/events responds with SSE content-type and initial comment', async () => {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/sse/events',
        method: 'GET',
        headers: { Authorization: `Bearer ${TOKEN}` },
      }, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/event-stream/);

        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
          if (data.includes(':connected')) {
            res.destroy(); // we got what we needed
            resolve();
          }
        });

        res.on('error', (err) => {
          // ECONNRESET is expected when we call res.destroy()
          if (err.code !== 'ECONNRESET') reject(err);
        });
      });
      req.on('error', reject);
      req.end();

      setTimeout(() => reject(new Error('SSE connect timeout')), 2000);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. IPC Integration Tests
// ════════════════════════════════════════════════════════════════════════════

describe('IPC ops handlers', () => {
  let ipcServer;
  let ds;
  let stub;
  let opsHandlers;
  let socketPath;

  beforeEach(async () => {
    // Use a temp socket path unique to this test run
    socketPath = join(tmpdir(), `aiwg-uat-ipc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.sock`);

    ({ ds, stub } = makeSupervisor({ dailyBudgetUsd: 10.00 }));
    ipcServer = new IPCServer(socketPath);
    opsHandlers = registerOpsHandlers(ipcServer, ds, { historyLimit: 50 });
    await ipcServer.start();
  });

  afterEach(async () => {
    await ipcServer.stop();
    await ds.shutdown(500);
  });

  it('daemon.process.list returns array of process entries', async () => {
    ds.submit({ loopId: 'ipc-loop-1', prompt: 'ipc test' });
    await new Promise((r) => setTimeout(r, 30));

    const response = await ipcCall(socketPath, 'daemon.process.list', { filter: 'all' });
    expect(response.jsonrpc).toBe('2.0');
    expect(Array.isArray(response.result)).toBe(true);
  });

  it('daemon.process.list with filter=running returns only running entries', async () => {
    ds.submit({ loopId: 'ipc-loop-run', prompt: 'running task' });
    ds.submit({ loopId: 'ipc-loop-run2', prompt: 'running task 2' });
    ds.submit({ loopId: 'ipc-loop-run3', prompt: 'running task 3' });
    ds.submit({ loopId: 'ipc-loop-run4', prompt: 'running task 4' });
    ds.submit({ loopId: 'ipc-loop-queued', prompt: 'queued task' }); // will be queued
    await new Promise((r) => setTimeout(r, 30));

    const response = await ipcCall(socketPath, 'daemon.process.list', { filter: 'running' });
    expect(Array.isArray(response.result)).toBe(true);
    // All returned entries should have status=running
    for (const entry of response.result) {
      expect(entry.status).toBe('running');
    }
  });

  it('daemon.circuit.status returns circuit breaker state', async () => {
    const response = await ipcCall(socketPath, 'daemon.circuit.status');
    expect(response.error).toBeUndefined();
    expect(response.result).toHaveProperty('state');
    expect(['closed', 'open', 'half-open']).toContain(response.result.state);
    expect(typeof response.result.consecutiveFailures).toBe('number');
  });

  it('daemon.circuit.status shows closed state when no failures', async () => {
    const response = await ipcCall(socketPath, 'daemon.circuit.status');
    expect(response.result.state).toBe('closed');
    expect(response.result.consecutiveFailures).toBe(0);
  });

  it('daemon.budget.remaining returns budget info', async () => {
    ds.recordCost('test-loop', 2.50);
    const response = await ipcCall(socketPath, 'daemon.budget.remaining');
    expect(response.error).toBeUndefined();
    expect(response.result).toHaveProperty('dailyLimit');
    expect(response.result).toHaveProperty('spent');
    expect(response.result).toHaveProperty('remaining');
    expect(response.result).toHaveProperty('percentUsed');
    expect(response.result.currency).toBe('USD');
    expect(response.result.spent).toBeCloseTo(2.50, 2);
    expect(response.result.dailyLimit).toBe(10.00);
  });

  it('daemon.budget.remaining shows unlimited when dailyBudget=0', async () => {
    const { ds: ds2 } = makeSupervisor({ dailyBudgetUsd: 0 });
    const ipcServer2 = new IPCServer(
      join(tmpdir(), `aiwg-uat-ipc-unlim-${Date.now()}.sock`)
    );
    registerOpsHandlers(ipcServer2, ds2);
    await ipcServer2.start();

    try {
      const response = await ipcCall(ipcServer2.socketPath, 'daemon.budget.remaining');
      expect(response.result.remaining).toBe('unlimited');
      expect(response.result.dailyLimit).toBe(0);
    } finally {
      await ipcServer2.stop();
      await ds2.shutdown(500);
    }
  });

  it('daemon.loop.history returns empty array initially', async () => {
    const response = await ipcCall(socketPath, 'daemon.loop.history', { limit: 10 });
    expect(response.error).toBeUndefined();
    expect(Array.isArray(response.result)).toBe(true);
    expect(response.result).toHaveLength(0);
  });

  it('daemon.loop.history records completed loops', async () => {
    ds.submit({ loopId: 'hist-loop', prompt: 'history test' });
    await new Promise((r) => setTimeout(r, 20));

    // Complete the task via the stub
    const taskId = [...stub._running.keys()][0];
    if (taskId) stub.completeTask(taskId);
    await new Promise((r) => setTimeout(r, 20));

    const response = await ipcCall(socketPath, 'daemon.loop.history', { limit: 5 });
    expect(response.result.length).toBeGreaterThan(0);
    const entry = response.result.find((h) => h.loopId === 'hist-loop');
    expect(entry).toBeDefined();
    expect(entry.outcome).toBe('completed');
  });

  it('unknown method returns JSON-RPC method-not-found error', async () => {
    const response = await ipcCall(socketPath, 'daemon.nonexistent.method');
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe(-32601);
  });
});
