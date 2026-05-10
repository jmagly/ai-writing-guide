/**
 * Integration tests for ops-toolset IPC method handlers
 *
 * Tests the full IPC request/response cycle for all 7 daemon.* methods.
 * Uses a real IPCServer + stub DaemonSupervisor to verify JSON-RPC integration.
 *
 * @implements #518
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import net from 'node:net';
import { IPCServer } from '../../tools/daemon/ipc-server.mjs';
import { registerOpsHandlers } from '../../tools/daemon/ipc-ops-handlers.mjs';

// --- Stub DaemonSupervisor ---

class StubCircuitBreaker extends EventEmitter {
  constructor() {
    super();
    this._state = { state: 'closed', consecutiveFailures: 0, cooldownRemainingMs: 0 };
  }
  getState() { return { ...this._state }; }
  canExecute() { return this._state.state !== 'open'; }
  recordSuccess() {}
  recordFailure() {}
  destroy() {}
}

class StubDaemonSupervisor extends EventEmitter {
  constructor() {
    super();
    this.circuitBreaker = new StubCircuitBreaker();
    this._running = new Map();
    this._queue = [];
    this._budgetUsed = 0;
    this._budgetLimit = 10;
    this._permanentlyFailed = new Set();
  }

  status() {
    return {
      running: Array.from(this._running.entries()).map(([id, e]) => ({
        loopId: id,
        pid: e.pid,
        startedAt: e.startedAt,
        taskId: e.taskId,
      })),
      queued: this._queue.map((q, i) => ({
        loopId: q.loopId,
        position: i + 1,
        priority: q.priority || 0,
        enqueuedAt: q.enqueuedAt || new Date().toISOString(),
      })),
      circuitState: this.circuitBreaker.getState(),
      concurrencyUsed: this._running.size,
      concurrencyMax: 4,
      queueDepth: this._queue.length,
      queueMax: 20,
      budgetUsed: this._budgetUsed,
      budgetLimit: this._budgetLimit,
      permanentlyFailed: Array.from(this._permanentlyFailed),
    };
  }

  killProcessGroup(loopId, signal) {
    const entry = this._running.get(loopId);
    if (!entry || !entry.pid) return false;
    // Stub: just remove from running
    this._running.delete(loopId);
    return true;
  }

  // Test helpers
  addRunning(loopId, { pid = 12345, taskId = 'task-1', startedAt = new Date().toISOString() } = {}) {
    this._running.set(loopId, { pid, taskId, startedAt });
  }

  addQueued(loopId, { priority = 0, enqueuedAt = new Date().toISOString() } = {}) {
    this._queue.push({ loopId, priority, enqueuedAt });
  }

  addPermanentlyFailed(loopId) {
    this._permanentlyFailed.add(loopId);
  }
}

// --- IPC Client helper ---

function sendRPC(socketPath, method, params = {}) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath, () => {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }) + '\n';
      client.write(request);
    });

    let buffer = '';
    client.on('data', (chunk) => {
      buffer += chunk.toString();
      const idx = buffer.indexOf('\n');
      if (idx !== -1) {
        const line = buffer.slice(0, idx);
        client.end();
        try {
          resolve(JSON.parse(line));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${line}`));
        }
      }
    });

    client.on('error', reject);
    client.setTimeout(5000, () => {
      client.destroy();
      reject(new Error('IPC request timed out'));
    });
  });
}

// --- Tests ---

describe('ops-toolset IPC method handlers', () => {
  let testDir;
  let socketPath;
  let ipcServer;
  let supervisor;
  let handlersApi;

  beforeEach(async () => {
    testDir = join(tmpdir(), `ipc-ops-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    socketPath = join(testDir, 'test.sock');

    ipcServer = new IPCServer(socketPath);
    supervisor = new StubDaemonSupervisor();
    handlersApi = registerOpsHandlers(ipcServer, supervisor);
    await ipcServer.start();
  });

  afterEach(async () => {
    await ipcServer.stop();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('daemon.process.list', () => {
    it('should return empty lists when nothing is running', async () => {
      const res = await sendRPC(socketPath, 'daemon.process.list');
      expect(res.result).toEqual([]);
      expect(res.error).toBeUndefined();
    });

    it('should list running loops', async () => {
      supervisor.addRunning('loop-a', { pid: 100, taskId: 'task-a' });
      const res = await sendRPC(socketPath, 'daemon.process.list', { filter: 'running' });
      expect(res.result).toHaveLength(1);
      expect(res.result[0].loopId).toBe('loop-a');
      expect(res.result[0].pid).toBe(100);
      expect(res.result[0].status).toBe('running');
    });

    it('should list queued loops', async () => {
      supervisor.addQueued('loop-q', { priority: 5 });
      const res = await sendRPC(socketPath, 'daemon.process.list', { filter: 'queued' });
      expect(res.result).toHaveLength(1);
      expect(res.result[0].loopId).toBe('loop-q');
      expect(res.result[0].status).toBe('queued');
    });

    it('should list permanently failed loops', async () => {
      supervisor.addPermanentlyFailed('loop-dead');
      const res = await sendRPC(socketPath, 'daemon.process.list', { filter: 'failed' });
      expect(res.result).toHaveLength(1);
      expect(res.result[0].loopId).toBe('loop-dead');
      expect(res.result[0].status).toBe('permanently-failed');
    });

    it('should return all categories with filter=all', async () => {
      supervisor.addRunning('loop-r');
      supervisor.addQueued('loop-q');
      supervisor.addPermanentlyFailed('loop-f');
      const res = await sendRPC(socketPath, 'daemon.process.list', { filter: 'all' });
      expect(res.result).toHaveLength(3);
    });
  });

  describe('daemon.process.kill', () => {
    it('should kill a running process group', async () => {
      supervisor.addRunning('loop-x', { pid: 999 });
      const res = await sendRPC(socketPath, 'daemon.process.kill', { loopId: 'loop-x' });
      expect(res.result.killed).toBe(true);
      expect(res.result.loopId).toBe('loop-x');
      expect(res.result.signal).toBe('SIGTERM');
    });

    it('should return killed=false for unknown loop', async () => {
      const res = await sendRPC(socketPath, 'daemon.process.kill', { loopId: 'nope' });
      expect(res.result.killed).toBe(false);
    });

    it('should reject missing loopId', async () => {
      const res = await sendRPC(socketPath, 'daemon.process.kill', {});
      expect(res.error).toBeDefined();
      expect(res.error.code).toBe(-32602); // INVALID_PARAMS
    });

    it('should reject invalid signal', async () => {
      const res = await sendRPC(socketPath, 'daemon.process.kill', {
        loopId: 'loop-x',
        signal: 'SIGBOGUS',
      });
      expect(res.error).toBeDefined();
      expect(res.error.code).toBe(-32602);
    });

    it('should accept SIGKILL signal', async () => {
      supervisor.addRunning('loop-y', { pid: 888 });
      const res = await sendRPC(socketPath, 'daemon.process.kill', {
        loopId: 'loop-y',
        signal: 'SIGKILL',
      });
      expect(res.result.killed).toBe(true);
      expect(res.result.signal).toBe('SIGKILL');
    });
  });

  describe('daemon.resource.snapshot', () => {
    it('should return system metrics', async () => {
      const res = await sendRPC(socketPath, 'daemon.resource.snapshot');
      const r = res.result;
      expect(r.cpu).toBeDefined();
      expect(r.cpu.cores).toBeGreaterThan(0);
      expect(typeof r.cpu.percent).toBe('number');
      expect(r.memory.totalMb).toBeGreaterThan(0);
      expect(r.memory.usedMb).toBeGreaterThan(0);
      expect(r.loadAvg['1m']).toBeDefined();
      expect(typeof r.queueDepth).toBe('number');
      expect(typeof r.uptime).toBe('number');
    });
  });

  describe('daemon.circuit.status', () => {
    it('should return circuit breaker state', async () => {
      const res = await sendRPC(socketPath, 'daemon.circuit.status');
      expect(res.result.state).toBe('closed');
      expect(res.result.consecutiveFailures).toBe(0);
      expect(res.result.cooldownRemainingMs).toBe(0);
    });

    it('should reflect changed circuit state', async () => {
      supervisor.circuitBreaker._state = {
        state: 'open',
        consecutiveFailures: 5,
        cooldownRemainingMs: 60000,
      };
      const res = await sendRPC(socketPath, 'daemon.circuit.status');
      expect(res.result.state).toBe('open');
      expect(res.result.consecutiveFailures).toBe(5);
    });
  });

  describe('daemon.queue.inspect', () => {
    it('should return empty queue info', async () => {
      const res = await sendRPC(socketPath, 'daemon.queue.inspect');
      expect(res.result.depth).toBe(0);
      expect(res.result.maxDepth).toBe(20);
      expect(res.result.oldest).toBeNull();
      expect(res.result.priorityDistribution).toEqual({});
    });

    it('should report queue depth and priority distribution', async () => {
      supervisor.addQueued('q1', { priority: 0 });
      supervisor.addQueued('q2', { priority: 5 });
      supervisor.addQueued('q3', { priority: 5 });
      const res = await sendRPC(socketPath, 'daemon.queue.inspect');
      expect(res.result.depth).toBe(3);
      expect(res.result.priorityDistribution).toEqual({ '0': 1, '5': 2 });
      expect(res.result.oldest).toBeDefined();
    });
  });

  describe('daemon.loop.history', () => {
    it('should return empty history initially', async () => {
      const res = await sendRPC(socketPath, 'daemon.loop.history');
      expect(res.result).toEqual([]);
    });

    it('should track completed loops', async () => {
      supervisor.emit('loop:completed', { loopId: 'done-1', taskId: 't1' });
      supervisor.emit('loop:completed', { loopId: 'done-2', taskId: 't2' });

      const res = await sendRPC(socketPath, 'daemon.loop.history');
      expect(res.result).toHaveLength(2);
      // Most recent first
      expect(res.result[0].loopId).toBe('done-2');
      expect(res.result[0].outcome).toBe('completed');
      expect(res.result[1].loopId).toBe('done-1');
    });

    it('should track failed loops', async () => {
      supervisor.emit('loop:failed', {
        loopId: 'fail-1',
        error: 'timeout',
        permanent: true,
        reason: 'restart intensity exceeded',
      });

      const res = await sendRPC(socketPath, 'daemon.loop.history');
      expect(res.result).toHaveLength(1);
      expect(res.result[0].outcome).toBe('permanently-failed');
      expect(res.result[0].error).toBe('timeout');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        supervisor.emit('loop:completed', { loopId: `loop-${i}`, taskId: `t-${i}` });
      }
      const res = await sendRPC(socketPath, 'daemon.loop.history', { limit: 3 });
      expect(res.result).toHaveLength(3);
      expect(res.result[0].loopId).toBe('loop-9');
    });
  });

  describe('daemon.budget.remaining', () => {
    it('should return budget info', async () => {
      supervisor._budgetUsed = 3.50;
      supervisor._budgetLimit = 10;
      const res = await sendRPC(socketPath, 'daemon.budget.remaining');
      expect(res.result.dailyLimit).toBe(10);
      expect(res.result.spent).toBe(3.5);
      expect(res.result.remaining).toBe(6.5);
      expect(res.result.percentUsed).toBe(35);
      expect(res.result.currency).toBe('USD');
    });

    it('should return unlimited when no budget set', async () => {
      supervisor._budgetLimit = 0;
      const res = await sendRPC(socketPath, 'daemon.budget.remaining');
      expect(res.result.dailyLimit).toBe(0);
      expect(res.result.remaining).toBe('unlimited');
      expect(res.result.percentUsed).toBe(0);
    });
  });

  describe('method registration', () => {
    it('should register all 7 methods', () => {
      const methods = ipcServer.methods;
      const expected = [
        'daemon.process.list',
        'daemon.process.kill',
        'daemon.resource.snapshot',
        'daemon.circuit.status',
        'daemon.queue.inspect',
        'daemon.loop.history',
        'daemon.budget.remaining',
      ];
      for (const m of expected) {
        expect(methods).toContain(m);
      }
    });
  });
});
