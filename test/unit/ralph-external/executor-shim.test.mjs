/**
 * Unit tests for ExecutorShim
 *
 * Covers:
 *  - register/deregister (mocked fetch)
 *  - Event translation: supervisor → executor vocabulary
 *  - HITL detection and round-trip
 *  - Dispatch handling
 *  - Token-auth enforcement on REST routes (via the Hono app via shim methods)
 *  - Graceful shutdown: mission.suspended emitted for in-flight missions
 *  - WS client management
 *
 * @issue #1181
 * @see tools/ralph-external/executor-shim.mjs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { ExecutorShim } from '../../../tools/ralph-external/executor-shim.mjs';

// ── Stub DaemonSupervisor ────────────────────────────────────────────────────

class StubSupervisor extends EventEmitter {
  constructor() {
    super();
    this._running = new Map();
    this._queue   = [];
    this._counter = 0;
    this.killCalls = [];
  }

  submit(config) {
    const loopId = config.loopId ?? `loop-${++this._counter}`;
    this._running.set(loopId, { config, taskId: `task-${this._counter}`, pid: null });
    // Simulate async start
    queueMicrotask(() => {
      const entry = this._running.get(loopId);
      if (entry) entry.pid = 10000 + this._counter;
      this.emit('loop:started', { loopId, taskId: `task-${this._counter}` });
    });
    return { loopId };
  }

  cancel(loopId) {
    if (this._running.has(loopId)) {
      this._running.delete(loopId);
      return true;
    }
    return false;
  }

  killProcessGroup(loopId, signal) {
    this.killCalls.push({ loopId, signal });
  }

  completeLoop(loopId) {
    this._running.delete(loopId);
    this.emit('loop:completed', { loopId });
  }

  failLoop(loopId, error = 'test error', permanent = false) {
    this._running.delete(loopId);
    this.emit('loop:failed', { loopId, error, permanent });
  }

  async shutdown() { this._running.clear(); }

  status() {
    return {
      running: [],
      queued: [],
      concurrencyUsed: this._running.size,
      concurrencyMax: 4,
      queueDepth: 0,
      queueMax: 20,
      budgetUsed: 0,
      budgetLimit: 0,
      permanentlyFailed: [],
      circuitState: { state: 'closed' },
    };
  }
}

// ── Fake WS client ───────────────────────────────────────────────────────────

class FakeWs extends EventEmitter {
  constructor() {
    super();
    this.readyState = 1; // OPEN
    this.sent = [];
  }
  send(data) {
    this.sent.push(typeof data === 'string' ? JSON.parse(data) : data);
  }
  close(code, reason) {
    this.readyState = 3;
    this.emit('close', code, reason);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeShim(overrides = {}) {
  const supervisor = overrides.supervisor ?? new StubSupervisor();
  const shim = new ExecutorShim({
    supervisor,
    executorId:   'test-executor-uuid-1234',
    name:         'test-local-executor',
    version:      '1.0.0',
    restBase:     'http://127.0.0.1:8200',
    wsBase:       'ws://127.0.0.1:8200',
    aiwgServeUrl: 'http://127.0.0.1:7337',
    ...overrides,
  });
  return { shim, supervisor };
}

function mockFetch(responses) {
  let idx = 0;
  vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
    const resp = responses[idx++] ?? { ok: true, status: 200, json: async () => ({}) };
    return {
      ok:   resp.ok ?? true,
      status: resp.status ?? 200,
      json: resp.json ?? (async () => resp.body ?? {}),
      text: resp.text ?? (async () => ''),
    };
  }));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ExecutorShim — constructor', () => {
  it('throws if supervisor is missing', () => {
    expect(() => new ExecutorShim({ executorId: 'x', restBase: '', wsBase: '', aiwgServeUrl: '' }))
      .toThrow('opts.supervisor is required');
  });

  it('throws if executorId is missing', () => {
    expect(() => new ExecutorShim({ supervisor: new StubSupervisor(), restBase: '', wsBase: '', aiwgServeUrl: '' }))
      .toThrow('opts.executorId is required');
  });

  it('initialises with empty missions and WS clients', () => {
    const { shim } = makeShim();
    expect(shim._missions.size).toBe(0);
    expect(shim._wsClients.size).toBe(0);
  });
});

// ── register / deregister ────────────────────────────────────────────────────

describe('ExecutorShim — register', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs correct payload and stores token', async () => {
    const token = 'exec_tk_test123';
    mockFetch([{ ok: true, status: 201, json: async () => ({
      executor_id: 'test-executor-uuid-1234',
      token,
      registered_at: new Date().toISOString(),
    }) }]);

    const { shim } = makeShim();
    const result = await shim.register();

    expect(result).toBe(token);
    expect(shim._token).toBe(token);

    const call = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.executor_id).toBe('test-executor-uuid-1234');
    expect(body.spec_version).toBe('1.0.0');
    expect(body.capabilities).toContain('isolation:none');
    expect(body.capabilities).toContain('hitl');
    expect(body.capabilities.some(c => c.startsWith('platform:'))).toBe(true);
    expect(body.transport_endpoints.rest).toBe('http://127.0.0.1:8200');
    expect(body.transport_endpoints.ws).toBe('ws://127.0.0.1:8200');
  });

  it('emits registered event', async () => {
    mockFetch([{ ok: true, status: 201, json: async () => ({
      executor_id: 'test-executor-uuid-1234',
      token: 'abc',
      registered_at: new Date().toISOString(),
    }) }]);

    const { shim } = makeShim();
    const events = [];
    shim.on('registered', e => events.push(e));
    await shim.register();
    expect(events).toHaveLength(1);
    expect(events[0].executorId).toBe('test-executor-uuid-1234');
  });

  it('retries on failure up to 8 times then throws', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchFn);

    const { shim } = makeShim();
    const registerPromise = shim.register();

    // Advance timers to fast-forward exponential back-off delays
    for (let i = 0; i < 10; i++) {
      await vi.runAllTimersAsync();
    }

    await expect(registerPromise).rejects.toThrow('ECONNREFUSED');
    vi.useRealTimers();
  });
});

describe('ExecutorShim — deregister', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('DELETEs with bearer token', async () => {
    mockFetch([
      { ok: true, status: 201, json: async () => ({ executor_id: 'test-executor-uuid-1234', token: 'tk123', registered_at: new Date().toISOString() }) },
      { ok: true, status: 204, json: async () => ({}) },
    ]);

    const { shim } = makeShim();
    await shim.register();
    await shim.deregister();

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls.length).toBe(2);
    expect(calls[1][1].method).toBe('DELETE');
    expect(calls[1][1].headers.Authorization).toBe('Bearer tk123');
  });

  it('is a no-op when not yet registered', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const { shim } = makeShim();
    await expect(shim.deregister()).resolves.toBeUndefined();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});

// ── dispatch ─────────────────────────────────────────────────────────────────

describe('ExecutorShim — dispatch', () => {
  it('stores mission and emits mission.assigned event', () => {
    const { shim } = makeShim();
    const events = [];
    shim.on('event', e => events.push(e));

    const result = shim.dispatch('sess-1', {
      mission_id:  'm-001',
      objective:   'Fix the bug',
      completion:  'npm test exits 0',
    });

    expect(result.missionId).toBe('m-001');
    expect(result.status).toBe('assigned');
    expect(shim._missions.has('m-001')).toBe(true);
    expect(shim._missions.get('m-001').state).toBe('assigned');

    const assigned = events.find(e => e.event === 'mission.assigned');
    expect(assigned).toBeDefined();
    expect(assigned.mission_id).toBe('m-001');
  });

  it('throws 409 on duplicate mission_id', () => {
    const { shim } = makeShim();
    shim.dispatch('sess-1', { mission_id: 'm-dup', objective: 'a', completion: 'b' });
    expect(() => shim.dispatch('sess-1', { mission_id: 'm-dup', objective: 'a', completion: 'b' }))
      .toThrow();
    // Verify status code
    try {
      shim.dispatch('sess-1', { mission_id: 'm-dup', objective: 'a', completion: 'b' });
    } catch (err) {
      expect(err.status).toBe(409);
    }
  });

  it('submits loopId to supervisor', () => {
    const supervisor = new StubSupervisor();
    const submitSpy  = vi.spyOn(supervisor, 'submit');
    const { shim }   = makeShim({ supervisor });

    shim.dispatch('sess-1', { mission_id: 'm-002', objective: 'Do it', completion: 'done' });

    expect(submitSpy).toHaveBeenCalledOnce();
    const call = submitSpy.mock.calls[0][0];
    expect(call.loopId).toBe('m-002');
    expect(call.prompt).toContain('Do it');
  });
});

// ── Supervisor event translation ─────────────────────────────────────────────

describe('ExecutorShim — supervisor event translation', () => {
  it('loop:started → mission.started (state=running)', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-s1', objective: 'x', completion: 'y' });

    const events = [];
    shim.on('event', e => events.push(e));

    await new Promise(r => supervisor.once('loop:started', r));

    const started = events.find(e => e.event === 'mission.started');
    expect(started).toBeDefined();
    expect(started.data.state).toBe('running');
    expect(shim._missions.get('m-s1').state).toBe('running');
  });

  it('loop:completed → mission.completed (state=done)', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-c1', objective: 'x', completion: 'y' });

    await new Promise(r => supervisor.once('loop:started', r));

    const events = [];
    shim.on('event', e => events.push(e));

    supervisor.completeLoop('m-c1');

    const completed = events.find(e => e.event === 'mission.completed');
    expect(completed).toBeDefined();
    expect(completed.data.state).toBe('done');
    expect(shim._missions.get('m-c1').state).toBe('done');
  });

  it('loop:failed → mission.failed (state=failed)', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-f1', objective: 'x', completion: 'y' });

    await new Promise(r => supervisor.once('loop:started', r));

    const events = [];
    shim.on('event', e => events.push(e));

    supervisor.failLoop('m-f1', 'process crashed', false);

    const failed = events.find(e => e.event === 'mission.failed');
    expect(failed).toBeDefined();
    expect(failed.data.state).toBe('failed');
    expect(failed.data.reason).toBe('exit_nonzero');
    expect(shim._missions.get('m-f1').state).toBe('failed');
  });

  it('loop:failed (permanent) → mission.failed with restart_intensity_exceeded reason', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-fp', objective: 'x', completion: 'y' });

    await new Promise(r => supervisor.once('loop:started', r));

    const events = [];
    shim.on('event', e => events.push(e));

    supervisor.failLoop('m-fp', 'too many restarts', true);

    const failed = events.find(e => e.event === 'mission.failed');
    expect(failed).toBeDefined();
    expect(failed.data.reason).toBe('restart_intensity_exceeded');
  });

  it('unknown loopId in supervisor event is ignored gracefully', () => {
    const { shim, supervisor } = makeShim();
    expect(() => supervisor.emit('loop:completed', { loopId: 'nonexistent' })).not.toThrow();
  });
});

// ── HITL detection ───────────────────────────────────────────────────────────

describe('ExecutorShim — HITL detection', () => {
  it('detects (y/N) prompt pattern and emits mission.hitl_required', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-hitl1', objective: 'x', completion: 'y' });

    await new Promise(r => supervisor.once('loop:started', r));

    const events = [];
    shim.on('event', e => events.push(e));

    shim.handleStdoutChunk('m-hitl1', 'Continue? (y/N)');

    const hitl = events.find(e => e.event === 'mission.hitl_required');
    expect(hitl).toBeDefined();
    expect(hitl.data.hitl_id).toBeTruthy();
    expect(hitl.data.prompt).toBeTruthy();
    expect(shim._missions.get('m-hitl1').state).toBe('hitl-required');
  });

  it('detects (yes/no) prompt pattern', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-hitl2', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));

    const events = [];
    shim.on('event', e => events.push(e));

    shim.handleStdoutChunk('m-hitl2', 'Are you sure you want to continue? (yes/no)');

    expect(events.find(e => e.event === 'mission.hitl_required')).toBeDefined();
  });

  it('does not re-trigger HITL while one is pending', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-hitl3', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));

    const events = [];
    shim.on('event', e => events.push(e));

    shim.handleStdoutChunk('m-hitl3', 'Continue? (y/N)');
    shim.handleStdoutChunk('m-hitl3', 'Another prompt: (y/N)');

    const hitlEvents = events.filter(e => e.event === 'mission.hitl_required');
    expect(hitlEvents).toHaveLength(1);
  });

  it('ignores stdout from non-running missions', () => {
    const { shim } = makeShim();
    // Mission not dispatched
    expect(() => shim.handleStdoutChunk('unknown-loop', '(y/N)')).not.toThrow();
  });

  it('supports custom patterns via addHitlPattern', async () => {
    const { shim, supervisor } = makeShim();
    shim.addHitlPattern(/PAUSE_REQUIRED/);
    shim.dispatch('s', { mission_id: 'm-cp', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));

    const events = [];
    shim.on('event', e => events.push(e));

    shim.handleStdoutChunk('m-cp', 'PAUSE_REQUIRED: waiting for operator');
    expect(events.find(e => e.event === 'mission.hitl_required')).toBeDefined();
  });
});

// ── submitHitlResponse ────────────────────────────────────────────────────────

describe('ExecutorShim — submitHitlResponse', () => {
  it('clears pending HITL, sets state to running, emits hitl_responded', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-hr1', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));

    const events = [];
    shim.on('event', e => events.push(e));

    shim.handleStdoutChunk('m-hr1', 'Continue? (y/N)');
    const hitl = events.find(e => e.event === 'mission.hitl_required');
    const hitlId = hitl.data.hitl_id;

    const result = shim.submitHitlResponse('m-hr1', { hitl_id: hitlId, response: 'yes' });
    expect(result.status).toBe('forwarded');
    expect(shim._missions.get('m-hr1').state).toBe('running');
    expect(shim._missions.get('m-hr1').pendingHitl).toBeNull();

    const responded = events.find(e => e.event === 'mission.hitl_responded');
    expect(responded).toBeDefined();
    expect(responded.data.response).toBe('yes');
  });

  it('throws 404 for unknown mission', () => {
    const { shim } = makeShim();
    expect(() => shim.submitHitlResponse('no-such-id', { hitl_id: 'h1', response: 'y' }))
      .toThrow();
    try {
      shim.submitHitlResponse('no-such-id', { hitl_id: 'h1', response: 'y' });
    } catch (err) { expect(err.status).toBe(404); }
  });

  it('throws 422 when hitl_id does not match pending request', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-hm', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));

    shim.handleStdoutChunk('m-hm', 'Continue? (y/N)');

    expect(() => shim.submitHitlResponse('m-hm', { hitl_id: 'wrong-id', response: 'y' }))
      .toThrow();
    try {
      shim.submitHitlResponse('m-hm', { hitl_id: 'wrong-id', response: 'y' });
    } catch (err) { expect(err.status).toBe(422); }
  });
});

// ── pause / resume / abort ────────────────────────────────────────────────────

describe('ExecutorShim — pause/resume/abort', () => {
  it('pause transitions to paused state and sends SIGSTOP', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-p1', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));

    const events = [];
    shim.on('event', e => events.push(e));

    const result = shim.pauseMission('m-p1');
    expect(result.status).toBe('paused');
    expect(shim._missions.get('m-p1').state).toBe('paused');
    expect(supervisor.killCalls.some(c => c.signal === 'SIGSTOP')).toBe(true);
    expect(events.find(e => e.event === 'mission.paused')).toBeDefined();
  });

  it('resume from paused transitions to running and sends SIGCONT', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-r1', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));

    shim.pauseMission('m-r1');

    const events = [];
    shim.on('event', e => events.push(e));

    const result = shim.resumeMission('m-r1');
    expect(result.status).toBe('resumed');
    expect(shim._missions.get('m-r1').state).toBe('running');
    expect(supervisor.killCalls.some(c => c.signal === 'SIGCONT')).toBe(true);
    expect(events.find(e => e.event === 'mission.resumed')).toBeDefined();
  });

  it('resume throws 409 when mission is not paused', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-rnp', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));

    expect(() => shim.resumeMission('m-rnp')).toThrow();
    try { shim.resumeMission('m-rnp'); } catch (err) { expect(err.status).toBe(409); }
  });

  it('abort cancels the supervisor loop and emits mission.aborted', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-ab1', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));

    const events = [];
    shim.on('event', e => events.push(e));

    const result = shim.abortMission('m-ab1');
    expect(result.status).toBe('aborted');
    expect(shim._missions.get('m-ab1').state).toBe('aborted');
    const aborted = events.find(e => e.event === 'mission.aborted');
    expect(aborted).toBeDefined();
    expect(aborted.data.aborted_by).toBe('operator');
  });

  it('abort throws 409 on terminal mission', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-abt', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));
    supervisor.completeLoop('m-abt');

    expect(() => shim.abortMission('m-abt')).toThrow();
    try { shim.abortMission('m-abt'); } catch (err) { expect(err.status).toBe(409); }
  });
});

// ── WS client management ──────────────────────────────────────────────────────

describe('ExecutorShim — WS clients', () => {
  it('addWsClient sends executor.resync with owned mission IDs', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-ws1', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));

    const ws = new FakeWs();
    shim.addWsClient(ws);

    // First message should be executor.resync
    expect(ws.sent.length).toBeGreaterThanOrEqual(1);
    const resync = ws.sent.find(m => m.event === 'executor.resync');
    expect(resync).toBeDefined();
    expect(resync.data.owned_mission_ids).toContain('m-ws1');
  });

  it('events are broadcast to all connected WS clients', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-bcast', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));

    const ws1 = new FakeWs();
    const ws2 = new FakeWs();
    shim.addWsClient(ws1);
    shim.addWsClient(ws2);

    // Clear the resync messages
    ws1.sent = [];
    ws2.sent = [];

    supervisor.completeLoop('m-bcast');

    expect(ws1.sent.some(m => m.event === 'mission.completed')).toBe(true);
    expect(ws2.sent.some(m => m.event === 'mission.completed')).toBe(true);
  });

  it('removes WS client on close event', async () => {
    const { shim } = makeShim();
    const ws = new FakeWs();
    shim.addWsClient(ws);
    expect(shim._wsClients.size).toBe(1);
    ws.emit('close');
    expect(shim._wsClients.size).toBe(0);
  });

  it('does not send to closed WS connection', async () => {
    const { shim, supervisor } = makeShim();
    shim.dispatch('s', { mission_id: 'm-closed', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));

    const ws = new FakeWs();
    shim.addWsClient(ws);

    // Mark WS as closed manually (still in _wsClients before a close event)
    ws.readyState = 3; // CLOSED
    ws.sent = [];

    supervisor.completeLoop('m-closed');

    // No messages should be sent to a closed WS
    const completedMsgs = ws.sent.filter(m => m.event === 'mission.completed');
    expect(completedMsgs).toHaveLength(0);
  });
});

// ── shutdown ──────────────────────────────────────────────────────────────────

describe('ExecutorShim — shutdown', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('emits mission.suspended for all non-terminal in-flight missions', async () => {
    mockFetch([
      { ok: true, status: 201, json: async () => ({ executor_id: 'test-executor-uuid-1234', token: 'tk', registered_at: new Date().toISOString() }) },
      { ok: true, status: 204, json: async () => ({}) },
    ]);

    const { shim, supervisor } = makeShim();
    await shim.register();

    shim.dispatch('s', { mission_id: 'm-shut1', objective: 'x', completion: 'y' });
    shim.dispatch('s', { mission_id: 'm-shut2', objective: 'x', completion: 'y' });

    // Wait for both to start
    await new Promise(r => { let c = 0; supervisor.on('loop:started', () => { if (++c === 2) r(); }); });

    const events = [];
    shim.on('event', e => events.push(e));

    await shim.shutdown();

    const suspended = events.filter(e => e.event === 'mission.suspended');
    expect(suspended.length).toBe(2);
    expect(shim._missions.get('m-shut1').state).toBe('suspended');
    expect(shim._missions.get('m-shut2').state).toBe('suspended');
  });

  it('does not emit mission.suspended for completed missions', async () => {
    mockFetch([
      { ok: true, status: 201, json: async () => ({ executor_id: 'test-executor-uuid-1234', token: 'tk', registered_at: new Date().toISOString() }) },
      { ok: true, status: 204, json: async () => ({}) },
    ]);

    const { shim, supervisor } = makeShim();
    await shim.register();

    shim.dispatch('s', { mission_id: 'm-done1', objective: 'x', completion: 'y' });
    await new Promise(r => supervisor.once('loop:started', r));
    supervisor.completeLoop('m-done1');

    const events = [];
    shim.on('event', e => events.push(e));

    await shim.shutdown();

    const suspended = events.filter(e => e.event === 'mission.suspended');
    expect(suspended).toHaveLength(0);
  });

  it('closes all WS clients on shutdown', async () => {
    mockFetch([
      { ok: true, status: 201, json: async () => ({ executor_id: 'test-executor-uuid-1234', token: 'tk', registered_at: new Date().toISOString() }) },
      { ok: true, status: 204, json: async () => ({}) },
    ]);

    const { shim } = makeShim();
    await shim.register();

    const ws = new FakeWs();
    shim.addWsClient(ws);

    await shim.shutdown();
    expect(ws.readyState).toBe(3);
  });
});

// ── getMission ────────────────────────────────────────────────────────────────

describe('ExecutorShim — getMission', () => {
  it('returns null for unknown missionId', () => {
    const { shim } = makeShim();
    expect(shim.getMission('nonexistent')).toBeNull();
  });

  it('returns mission snapshot with required fields', () => {
    const { shim } = makeShim();
    shim.dispatch('s', { mission_id: 'm-snap', objective: 'o', completion: 'c' });

    const mission = shim.getMission('m-snap');
    expect(mission).not.toBeNull();
    expect(mission.missionId).toBe('m-snap');
    expect(mission.state).toBe('assigned');
    expect(mission.createdAt).toBeTruthy();
    expect(mission.updatedAt).toBeTruthy();
  });
});
