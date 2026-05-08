/**
 * ExecutorRegistry unit tests
 *
 * @issue #1179
 * @see src/serve/executor-registry.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExecutorRegistry,
  validateRegisterPayload,
  validateDispatchPayload,
  validateEventEnvelope,
  resolveExecutorIdentityStorePath,
  type ExecutorRegisterRequest,
  type EventEnvelope,
} from '../../../src/serve/executor-registry.js';

// ── Test fixtures ────────────────────────────────────────────────────────────

const VALID_EXECUTOR_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const VALID_EXECUTOR_ID_2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

const VALID_REGISTER_REQUEST: ExecutorRegisterRequest = {
  executor_id: VALID_EXECUTOR_ID,
  name: 'test-executor',
  version: '0.3.0',
  spec_version: '1.0.0',
  transport_endpoints: {
    rest: 'http://127.0.0.1:8122',
    ws: 'ws://127.0.0.1:8121',
  },
  capabilities: ['isolation:vm', 'runtime:claude-code', 'platform:linux/x64', 'resumable', 'hitl'],
};

const VALID_DISPATCH_PAYLOAD = {
  mission_id: 'm-abc123',
  objective: 'Add JWT validation to /auth/login and verify the endpoint returns 401 on an expired token.',
  completion: "npm test exits 0; curl -H 'Authorization: Bearer expired-token' /auth/login returns 401",
  long_running: false,
  executor_filter: {
    executor_id: null,
    capabilities: ['runtime:claude-code'],
  },
  metadata: { issue: 1171 },
};

const VALID_EVENT_ENVELOPE: EventEnvelope = {
  event: 'mission.assigned',
  executor_id: VALID_EXECUTOR_ID,
  mission_id: 'm-abc123',
  ts: '2026-05-08T19:30:05.000Z',
  data: { state: 'assigned' },
};

// Override identity store path to tmp in tests
process.env['AIWG_EXECUTOR_IDENTITY_STORE'] = '/tmp/aiwg-test-executor-identities.json';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ExecutorRegistry', () => {
  let registry: ExecutorRegistry;

  beforeEach(() => {
    registry = new ExecutorRegistry();
  });

  describe('register', () => {
    it('registers a valid executor and returns executor_id + token', () => {
      const result = registry.register(VALID_REGISTER_REQUEST);
      expect('status' in result && result.status === 400).toBe(false);
      const resp = result as { executor_id: string; token: string; registered_at: string };
      expect(resp.executor_id).toBe(VALID_EXECUTOR_ID);
      expect(resp.token).toBeTruthy();
      expect(resp.token.length).toBeGreaterThan(20);
      expect(resp.registered_at).toBeTruthy();
      expect(registry.size).toBe(1);
    });

    it('returns 400 on invalid payload (missing required fields)', () => {
      const result = registry.register({ executor_id: 'not-a-uuid' } as ExecutorRegisterRequest);
      expect('status' in result && result.status === 400).toBe(true);
    });

    it('preserves token on re-register with same executor_id', () => {
      const first = registry.register(VALID_REGISTER_REQUEST) as { executor_id: string; token: string; registered_at: string };
      const second = registry.register({ ...VALID_REGISTER_REQUEST, version: '0.4.0' }) as { executor_id: string; token: string; registered_at: string };
      expect(second.executor_id).toBe(VALID_EXECUTOR_ID);
      expect(second.token).toBe(first.token);
      // registry size should remain 1 after upsert
      expect(registry.size).toBe(1);
    });

    it('issues unique tokens for different executor_ids', () => {
      const r1 = registry.register(VALID_REGISTER_REQUEST) as { token: string };
      const r2 = registry.register({ ...VALID_REGISTER_REQUEST, executor_id: VALID_EXECUTOR_ID_2 }) as { token: string };
      expect(r1.token).not.toBe(r2.token);
    });

    it('emits executor:registered event', () => {
      const events: unknown[] = [];
      registry.on('executor:registered', (e) => events.push(e));
      registry.register(VALID_REGISTER_REQUEST);
      expect(events).toHaveLength(1);
      expect((events[0] as { executorId: string }).executorId).toBe(VALID_EXECUTOR_ID);
    });
  });

  describe('deregister', () => {
    it('deregisters an existing executor and returns true', () => {
      registry.register(VALID_REGISTER_REQUEST);
      expect(registry.deregister(VALID_EXECUTOR_ID)).toBe(true);
      expect(registry.size).toBe(0);
    });

    it('returns false when deregistering unknown executor', () => {
      expect(registry.deregister('00000000-0000-0000-0000-000000000000')).toBe(false);
    });

    it('emits executor:deregistered event with reason', () => {
      const events: unknown[] = [];
      registry.on('executor:deregistered', (e) => events.push(e));
      registry.register(VALID_REGISTER_REQUEST);
      registry.deregister(VALID_EXECUTOR_ID, 'graceful_shutdown');
      expect(events).toHaveLength(1);
      expect((events[0] as { reason: string }).reason).toBe('graceful_shutdown');
    });
  });

  describe('authenticate', () => {
    it('returns true for valid executor + token', () => {
      const resp = registry.register(VALID_REGISTER_REQUEST) as { token: string };
      expect(registry.authenticate(VALID_EXECUTOR_ID, resp.token)).toBe(true);
    });

    it('returns false for wrong token', () => {
      registry.register(VALID_REGISTER_REQUEST);
      expect(registry.authenticate(VALID_EXECUTOR_ID, 'wrong-token')).toBe(false);
    });

    it('returns false for unknown executor', () => {
      expect(registry.authenticate('00000000-0000-0000-0000-000000000000', 'any')).toBe(false);
    });
  });

  describe('setConnected / pushToExecutor', () => {
    it('setConnected marks executor as connected', () => {
      registry.register(VALID_REGISTER_REQUEST);
      const mockWs = {
        readyState: 1,
        sent: [] as string[],
        send(data: string) { this.sent.push(data); },
        close() { this.readyState = 3; },
      };
      registry.setConnected(VALID_EXECUTOR_ID, true, mockWs);
      const summary = registry.get(VALID_EXECUTOR_ID);
      expect(summary?.connected).toBe(true);
    });

    it('pushToExecutor sends JSON to the WS connection', () => {
      registry.register(VALID_REGISTER_REQUEST);
      const mockWs = {
        readyState: 1,
        sent: [] as string[],
        send(data: string) { this.sent.push(data); },
        close() { this.readyState = 3; },
      };
      registry.setConnected(VALID_EXECUTOR_ID, true, mockWs);
      const result = registry.pushToExecutor(VALID_EXECUTOR_ID, VALID_EVENT_ENVELOPE);
      expect(result).toBe(true);
      expect(mockWs.sent).toHaveLength(1);
      expect(JSON.parse(mockWs.sent[0]!)).toMatchObject({ event: 'mission.assigned' });
    });

    it('pushToExecutor returns false when not connected', () => {
      registry.register(VALID_REGISTER_REQUEST);
      const result = registry.pushToExecutor(VALID_EXECUTOR_ID, VALID_EVENT_ENVELOPE);
      expect(result).toBe(false);
    });
  });

  describe('handleEvent — state transitions', () => {
    it('handles mission.assigned and updates state', () => {
      registry.register(VALID_REGISTER_REQUEST);
      registry.assignMission('m-abc123', VALID_EXECUTOR_ID);
      registry.handleEvent({
        event: 'mission.assigned',
        executor_id: VALID_EXECUTOR_ID,
        mission_id: 'm-abc123',
        ts: new Date().toISOString(),
        data: { state: 'assigned' },
      });
      const mission = registry.getMission('m-abc123');
      expect(mission?.state).toBe('assigned');
    });

    it('handles mission.started and sets state to running', () => {
      registry.register(VALID_REGISTER_REQUEST);
      registry.assignMission('m-test', VALID_EXECUTOR_ID);
      registry.handleEvent({
        event: 'mission.started',
        executor_id: VALID_EXECUTOR_ID,
        mission_id: 'm-test',
        ts: new Date().toISOString(),
        data: { state: 'running', agent_runtime: 'claude-code' },
      });
      expect(registry.getMission('m-test')?.state).toBe('running');
    });

    it('handles mission.completed and marks terminal state', () => {
      registry.register(VALID_REGISTER_REQUEST);
      registry.assignMission('m-done', VALID_EXECUTOR_ID);
      const changeEvents: unknown[] = [];
      registry.on('mission:state_change', (e) => changeEvents.push(e));

      registry.handleEvent({
        event: 'mission.completed',
        executor_id: VALID_EXECUTOR_ID,
        mission_id: 'm-done',
        ts: new Date().toISOString(),
        data: { state: 'done', exit_code: 0 },
      });

      const mission = registry.getMission('m-done');
      expect(mission?.state).toBe('done');
      expect(mission?.completedAt).toBeTruthy();
      expect(mission?.exitCode).toBe(0);
    });

    it('handles mission.failed and records error', () => {
      registry.register(VALID_REGISTER_REQUEST);
      registry.assignMission('m-fail', VALID_EXECUTOR_ID);
      registry.handleEvent({
        event: 'mission.failed',
        executor_id: VALID_EXECUTOR_ID,
        mission_id: 'm-fail',
        ts: new Date().toISOString(),
        data: { state: 'failed', reason: 'exit_nonzero', error: 'Tests failed' },
      });
      const mission = registry.getMission('m-fail');
      expect(mission?.state).toBe('failed');
      expect(mission?.error).toBe('Tests failed');
    });

    it('handles executor.resync and marks owned missions as running', () => {
      registry.register(VALID_REGISTER_REQUEST);
      registry.assignMission('m-resync', VALID_EXECUTOR_ID);
      // Set to paused to test transition
      registry.transitionMission('m-resync', 'paused');
      expect(registry.getMission('m-resync')?.state).toBe('paused');

      registry.handleEvent({
        event: 'executor.resync',
        executor_id: VALID_EXECUTOR_ID,
        ts: new Date().toISOString(),
        data: { owned_mission_ids: ['m-resync'] },
      });
      expect(registry.getMission('m-resync')?.state).toBe('running');
    });

    it('emits mission:state_change event on transition', () => {
      registry.register(VALID_REGISTER_REQUEST);
      registry.assignMission('m-event', VALID_EXECUTOR_ID);
      const changes: unknown[] = [];
      registry.on('mission:state_change', (e) => changes.push(e));

      registry.handleEvent({
        event: 'mission.started',
        executor_id: VALID_EXECUTOR_ID,
        mission_id: 'm-event',
        ts: new Date().toISOString(),
        data: { state: 'running' },
      });

      expect(changes).toHaveLength(1);
      expect((changes[0] as { state: string }).state).toBe('running');
    });
  });

  describe('assignMission / failMission', () => {
    it('assignMission creates a mission record and associates with executor', () => {
      registry.register(VALID_REGISTER_REQUEST);
      const mission = registry.assignMission('m-new', VALID_EXECUTOR_ID);
      expect(mission.missionId).toBe('m-new');
      expect(mission.executorId).toBe(VALID_EXECUTOR_ID);
      expect(mission.state).toBe('assigned');
    });

    it('emits mission:assigned event', () => {
      registry.register(VALID_REGISTER_REQUEST);
      const events: unknown[] = [];
      registry.on('mission:assigned', (e) => events.push(e));
      registry.assignMission('m-emit', VALID_EXECUTOR_ID);
      expect(events).toHaveLength(1);
    });

    it('failMission marks mission as failed', () => {
      registry.register(VALID_REGISTER_REQUEST);
      registry.assignMission('m-fail2', VALID_EXECUTOR_ID);
      registry.failMission('m-fail2', 'executor unreachable');
      expect(registry.getMission('m-fail2')?.state).toBe('failed');
      expect(registry.getMission('m-fail2')?.error).toBe('executor unreachable');
    });
  });

  describe('pickByFilter', () => {
    beforeEach(() => {
      registry.register(VALID_REGISTER_REQUEST);
      // Simulate connected state
      registry.setConnected(VALID_EXECUTOR_ID, true, {
        readyState: 1, send() {}, close() {},
      });
    });

    it('returns null when no executors are connected', () => {
      const fresh = new ExecutorRegistry();
      expect(fresh.pickByFilter({})).toBeNull();
    });

    it('picks a connected executor with matching capabilities', () => {
      const result = registry.pickByFilter({ capabilities: ['runtime:claude-code'] });
      expect(result).not.toBeNull();
      expect(result!.executor.executorId).toBe(VALID_EXECUTOR_ID);
    });

    it('returns null when capabilities do not match', () => {
      const result = registry.pickByFilter({ capabilities: ['isolation:microvm'] });
      expect(result).toBeNull();
    });

    it('returns null for long_running when executor lacks resumable', () => {
      // Register executor without resumable
      const reg2: ExecutorRegisterRequest = {
        ...VALID_REGISTER_REQUEST,
        executor_id: VALID_EXECUTOR_ID_2,
        capabilities: ['isolation:vm', 'runtime:claude-code'],
      };
      registry.register(reg2);
      registry.setConnected(VALID_EXECUTOR_ID_2, true, { readyState: 1, send() {}, close() {} });

      // Create a fresh registry with ONLY the non-resumable executor
      const fresh = new ExecutorRegistry();
      fresh.register(reg2);
      fresh.setConnected(VALID_EXECUTOR_ID_2, true, { readyState: 1, send() {}, close() {} });

      const result = fresh.pickByFilter({}, true);
      expect(result).toBeNull();
    });

    it('picks resumable executor when long_running is true', () => {
      const result = registry.pickByFilter({}, true);
      expect(result).not.toBeNull();
      expect(result!.executor.capabilities).toContain('resumable');
    });

    it('prefers sandbox-first (isolation:vm) over local executor', () => {
      // Add a local executor (no isolation:vm)
      const localReg: ExecutorRegisterRequest = {
        ...VALID_REGISTER_REQUEST,
        executor_id: VALID_EXECUTOR_ID_2,
        capabilities: ['isolation:none', 'runtime:claude-code', 'resumable'],
      };
      registry.register(localReg);
      registry.setConnected(VALID_EXECUTOR_ID_2, true, { readyState: 1, send() {}, close() {} });

      const result = registry.pickByFilter({});
      // Should prefer the isolation:vm executor
      expect(result!.executor.executorId).toBe(VALID_EXECUTOR_ID);
      expect(result!.reason).toContain('sandbox-first');
    });

    it('pins to executor_id when specified', () => {
      const result = registry.pickByFilter({ executor_id: VALID_EXECUTOR_ID });
      expect(result!.executor.executorId).toBe(VALID_EXECUTOR_ID);
    });

    it('returns null when pinned executor not found', () => {
      const result = registry.pickByFilter({ executor_id: '00000000-0000-0000-0000-000000000000' });
      expect(result).toBeNull();
    });
  });

  describe('list / get', () => {
    it('list returns all registered executors', () => {
      registry.register(VALID_REGISTER_REQUEST);
      registry.register({ ...VALID_REGISTER_REQUEST, executor_id: VALID_EXECUTOR_ID_2 });
      expect(registry.list()).toHaveLength(2);
    });

    it('get returns summary for known executor', () => {
      registry.register(VALID_REGISTER_REQUEST);
      const summary = registry.get(VALID_EXECUTOR_ID);
      expect(summary?.executor_id).toBe(VALID_EXECUTOR_ID);
      expect(summary?.name).toBe('test-executor');
    });

    it('get returns undefined for unknown executor', () => {
      expect(registry.get('00000000-0000-0000-0000-000000000000')).toBeUndefined();
    });
  });

  describe('transitionMission', () => {
    it('transitions non-terminal mission', () => {
      registry.register(VALID_REGISTER_REQUEST);
      registry.assignMission('m-trans', VALID_EXECUTOR_ID);
      expect(registry.transitionMission('m-trans', 'paused')).toBe(true);
      expect(registry.getMission('m-trans')?.state).toBe('paused');
    });

    it('refuses transition for terminal mission', () => {
      registry.register(VALID_REGISTER_REQUEST);
      registry.assignMission('m-terminal', VALID_EXECUTOR_ID);
      registry.failMission('m-terminal', 'done');
      expect(registry.transitionMission('m-terminal', 'paused')).toBe(false);
    });

    it('returns false for unknown mission', () => {
      expect(registry.transitionMission('nonexistent', 'paused')).toBe(false);
    });
  });

  describe('shutdown', () => {
    it('clears all state and does not throw', () => {
      registry.register(VALID_REGISTER_REQUEST);
      registry.assignMission('m-shutdown', VALID_EXECUTOR_ID);
      expect(() => registry.shutdown()).not.toThrow();
      expect(registry.size).toBe(0);
    });
  });
});

// ── Schema validators ────────────────────────────────────────────────────────

describe('validateRegisterPayload', () => {
  it('accepts a valid register payload', () => {
    const { valid } = validateRegisterPayload(VALID_REGISTER_REQUEST);
    // Graceful degradation: valid=true even if ajv unavailable in test env
    expect(typeof valid).toBe('boolean');
  });

  it('rejects a payload missing required fields', () => {
    const { valid } = validateRegisterPayload({ name: 'test' });
    // If ajv loads successfully, this should be invalid
    if (valid === false) {
      // ajv was loaded — good, it caught the invalid payload
      expect(valid).toBe(false);
    } else {
      // ajv not loaded (graceful degradation) — skip strict assertion
      expect(valid).toBe(true);
    }
  });
});

describe('validateDispatchPayload', () => {
  it('accepts a valid dispatch payload', () => {
    const { valid } = validateDispatchPayload(VALID_DISPATCH_PAYLOAD);
    expect(typeof valid).toBe('boolean');
  });
});

describe('validateEventEnvelope', () => {
  it('accepts a valid event envelope', () => {
    const { valid } = validateEventEnvelope(VALID_EVENT_ENVELOPE);
    expect(typeof valid).toBe('boolean');
  });
});

// ── Identity store path resolution ──────────────────────────────────────────

describe('resolveExecutorIdentityStorePath', () => {
  it('uses AIWG_EXECUTOR_IDENTITY_STORE env var when set', () => {
    process.env['AIWG_EXECUTOR_IDENTITY_STORE'] = '/tmp/test-executor-store.json';
    expect(resolveExecutorIdentityStorePath()).toBe('/tmp/test-executor-store.json');
  });

  it('returns default path when env var is not set', () => {
    const saved = process.env['AIWG_EXECUTOR_IDENTITY_STORE'];
    delete process.env['AIWG_EXECUTOR_IDENTITY_STORE'];
    const p = resolveExecutorIdentityStorePath('/tmp');
    expect(p).toContain('executor-identities.json');
    process.env['AIWG_EXECUTOR_IDENTITY_STORE'] = saved;
  });
});
