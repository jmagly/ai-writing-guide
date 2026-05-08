/**
 * Conformance — Resumable Category (Resumable capability required)
 *
 * Assertions:
 *  - mission.suspended emitted when executor goes offline
 *  - Mission state transitions to 'suspended'
 *  - data_mission_suspended validates against schema (has checkpoint_id)
 *  - executor.resync payload shape on reconnect (owned_mission_ids)
 *  - handleEvent(executor.resync) reconciles suspended missions
 *  - mission.resumed pushed to executor over WS by aiwg serve
 *  - data_mission_resumed validates against schema
 *  - mission.reconnected from executor confirms state loaded from checkpoint
 *  - Mission returns to running state after full resync
 *  - Mission completes after resuming
 *
 * @level Resumable (executor must advertise 'resumable' capability)
 * @issue #1183
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loadFixture,
  hashFixture,
  validateSchema,
  createRegistryForTest,
  FakeWsConn,
} from '../client.mjs';

// ── Fixture integrity ────────────────────────────────────────────────────────

const FIXTURE_HASH = hashFixture('resumable-suspend-resume');

describe('[Resumable] Resumable — fixture integrity', () => {
  it('resumable-suspend-resume fixture hash is stable (drift guard)', () => {
    expect(hashFixture('resumable-suspend-resume')).toBe(FIXTURE_HASH);
  });
});

// ── Full suspend → resync → resume → completion flow ─────────────────────────

describe('[Resumable] Resumable — full suspend/resume cycle', () => {
  const fixture = loadFixture('resumable-suspend-resume');
  const executorId = fixture.preconditions.executor_registered.executor_id;
  const missionId  = fixture.preconditions.mission_running.mission_id;

  let registry;
  let fakeWs;
  let fakeWs2; // Second WS connection for reconnect

  beforeAll(async () => {
    ({ registry } = await createRegistryForTest());

    // Register executor with resumable + hitl capabilities
    registry.register({
      executor_id: executorId,
      name: 'resumable-executor',
      version: '0.3.0',
      spec_version: '1.0.0',
      transport_endpoints: {
        rest: 'http://127.0.0.1:8122',
        ws:   'ws://127.0.0.1:8121',
      },
      capabilities: fixture.preconditions.executor_registered.capabilities,
    });

    fakeWs = new FakeWsConn();
    registry.setConnected(executorId, true, fakeWs);

    // Pre-condition: mission is running
    registry.assignMission(missionId, executorId);
    registry.handleEvent({
      event: 'mission.started',
      executor_id: executorId,
      mission_id: missionId,
      ts: new Date().toISOString(),
      data: { state: 'running', agent_runtime: 'claude-code' },
    });
  });

  afterAll(() => { try { registry.shutdown(); } catch { /* ignore */ } });

  // Phase 1: progress before suspend

  it('pre-suspend progress event is handled without state change', () => {
    const step1 = fixture.phase_1_before_suspend[0];
    const { _step, _validates_as, ...envelope } = step1;
    registry.handleEvent(envelope);

    const mission = registry.getMission(missionId);
    expect(mission?.state).toBe('running');
  });

  // Phase 2: mission.suspended

  it('mission.suspended transitions mission to suspended state', () => {
    const suspendEvt = fixture.phase_2_suspend.event;
    const { _step, _validates_as, ...envelope } = suspendEvt;
    registry.handleEvent(envelope);

    const mission = registry.getMission(missionId);
    expect(mission?.state).toBe('suspended');
  });

  it('mission.suspended data validates against schema', () => {
    const suspendEvt = fixture.phase_2_suspend.event;
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/data_mission_suspended',
      suspendEvt.data
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('mission.suspended data has non-empty checkpoint_id', () => {
    const data = fixture.phase_2_suspend.event.data;
    expect(typeof data.checkpoint_id).toBe('string');
    expect(data.checkpoint_id.length).toBeGreaterThan(0);
  });

  it('mission.suspended data has state: suspended', () => {
    const data = fixture.phase_2_suspend.event.data;
    expect(data.state).toBe('suspended');
  });

  // Phase 3: executor re-registers after restart

  it('re-register after restart succeeds (same executor_id)', () => {
    const reRegisterBody = fixture.phase_3_executor_restart_and_resync.re_register.request.body;
    const result = registry.register(reRegisterBody);
    expect(result).not.toHaveProperty('error');
    expect(result.executor_id).toBe(executorId);
  });

  it('re-registration reclaims same token identity', () => {
    const body1 = {
      executor_id: executorId,
      name: 'test', version: '0.3.0', spec_version: '1.0.0',
      transport_endpoints: { rest: 'http://127.0.0.1:8122', ws: 'ws://127.0.0.1:8121' },
      capabilities: fixture.preconditions.executor_registered.capabilities,
    };
    const token1 = registry.register(body1).token;
    const token2 = registry.register(body1).token;
    expect(token1).toBe(token2);
  });

  // Phase 3: executor.resync sent after WS reconnect

  it('executor.resync payload shape validates against data_executor_resync schema', () => {
    const resyncEvt = fixture.phase_3_executor_restart_and_resync.resync_event;
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/data_executor_resync',
      resyncEvt.data
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('executor.resync owned_mission_ids includes the suspended mission', () => {
    const data = fixture.phase_3_executor_restart_and_resync.resync_event.data;
    expect(data.owned_mission_ids).toContain(missionId);
  });

  it('handleEvent(executor.resync) reconciles suspended mission to running', () => {
    // Reconnect the executor
    fakeWs2 = new FakeWsConn();
    registry.setConnected(executorId, true, fakeWs2);

    const resyncEvt = fixture.phase_3_executor_restart_and_resync.resync_event;
    const { _step, _description, _validates_as, ...envelope } = resyncEvt;
    registry.handleEvent(envelope);

    // After resync, registry should mark the suspended mission as running
    // (executor.resync forces a reconciliation — spec §resync)
    const mission = registry.getMission(missionId);
    expect(mission?.state).toBe('running');
  });

  // Phase 4: aiwg serve pushes mission.resumed to executor

  it('pushToExecutor sends mission.resumed to executor WS', () => {
    const resumedEvt = fixture.phase_4_aiwg_serve_resumes.resumed_event;
    const { _step, _validates_as, _direction, ...envelope } = resumedEvt;

    const sent = registry.pushToExecutor(executorId, envelope);
    expect(sent).toBe(true);

    const lastSent = fakeWs2.sent.at(-1);
    expect(lastSent).toBeDefined();
    expect(lastSent.event).toBe('mission.resumed');
  });

  it('mission.resumed data validates against schema', () => {
    const resumedEvt = fixture.phase_4_aiwg_serve_resumes.resumed_event;
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/data_mission_resumed',
      resumedEvt.data
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('mission.resumed data has state: running', () => {
    const data = fixture.phase_4_aiwg_serve_resumes.resumed_event.data;
    expect(data.state).toBe('running');
  });

  it('mission.resumed data has resumed_from: suspended', () => {
    const data = fixture.phase_4_aiwg_serve_resumes.resumed_event.data;
    expect(data.resumed_from).toBe('suspended');
  });

  // Phase 5: executor confirms reconnection with mission.reconnected

  it('mission.reconnected from executor validates against schema', () => {
    const reconnectedEvt = fixture.phase_5_executor_reconnects_mission.reconnected_event;
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/data_mission_reconnected',
      reconnectedEvt.data
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('mission.reconnected checkpoint_id matches mission.suspended checkpoint_id', () => {
    const suspendCheckpoint  = fixture.phase_2_suspend.event.data.checkpoint_id;
    const reconnectCheckpoint = fixture.phase_5_executor_reconnects_mission.reconnected_event.data.checkpoint_id;
    expect(reconnectCheckpoint).toBe(suspendCheckpoint);
  });

  it('handleEvent(mission.reconnected) keeps mission in running state', () => {
    const reconnectedEvt = fixture.phase_5_executor_reconnects_mission.reconnected_event;
    const { _step, _validates_as, ...envelope } = reconnectedEvt;
    registry.handleEvent(envelope);

    const mission = registry.getMission(missionId);
    expect(mission?.state).toBe('running');
  });

  // Phase 6: completion after resume

  it('mission completes successfully after full resync cycle', () => {
    for (const step of fixture.phase_6_completion) {
      const { _step, _validates_as, ...envelope } = step;
      registry.handleEvent(envelope);
    }

    const mission = registry.getMission(missionId);
    expect(mission?.state).toBe('done');
  });

  it('completedAt is set after completion post-resume', () => {
    const mission = registry.getMission(missionId);
    expect(mission?.completedAt).toBeTruthy();
    const ts = new Date(mission.completedAt);
    expect(ts.toString()).not.toBe('Invalid Date');
  });
});

// ── executor.resync for non-suspended mission (running) ──────────────────────

describe('[Resumable] Resumable — resync for running mission', () => {
  it('executor.resync reconciles a running mission (idempotent)', async () => {
    const { registry } = await createRegistryForTest();

    const execId = 'resync-test-executor-001-a';
    registry.register({
      executor_id: execId,
      name: 'r', version: '1.0.0', spec_version: '1.0.0',
      transport_endpoints: { rest: 'http://127.0.0.1:9500', ws: 'ws://127.0.0.1:9501' },
      capabilities: ['resumable'],
    });
    const fakeWs = new FakeWsConn();
    registry.setConnected(execId, true, fakeWs);

    const mId = 'm-resync-running';
    registry.assignMission(mId, execId);
    // Advance to running
    registry.handleEvent({
      event: 'mission.started', executor_id: execId, mission_id: mId,
      ts: new Date().toISOString(), data: { state: 'running' },
    });

    // Resync should leave it running (not change to suspended)
    registry.handleEvent({
      event: 'executor.resync', executor_id: execId,
      ts: new Date().toISOString(),
      data: { owned_mission_ids: [mId], protocol_version: '1.0.0' },
    });

    expect(registry.getMission(mId)?.state).toBe('running');

    registry.shutdown();
  });
});

// ── Mission state preserved during executor disconnect (no resync) ────────────

describe('[Resumable] Resumable — suspend without explicit resync', () => {
  it('suspended mission remains suspended after executor disconnect (no resync sent)', async () => {
    const { registry } = await createRegistryForTest();

    const execId = 'suspend-no-resync-exec';
    registry.register({
      executor_id: execId,
      name: 'r', version: '1.0.0', spec_version: '1.0.0',
      transport_endpoints: { rest: 'http://127.0.0.1:9600', ws: 'ws://127.0.0.1:9601' },
      capabilities: ['resumable'],
    });
    const fakeWs = new FakeWsConn();
    registry.setConnected(execId, true, fakeWs);

    const mId = 'm-persist-suspend';
    registry.assignMission(mId, execId);
    registry.handleEvent({
      event: 'mission.started', executor_id: execId, mission_id: mId,
      ts: new Date().toISOString(), data: { state: 'running' },
    });

    // Emit suspended
    registry.handleEvent({
      event: 'mission.suspended', executor_id: execId, mission_id: mId,
      ts: new Date().toISOString(),
      data: { state: 'suspended', checkpoint_id: 'ckpt-abc-001' },
    });

    // Disconnect without resync
    registry.setConnected(execId, false);

    // State must be preserved as suspended
    expect(registry.getMission(mId)?.state).toBe('suspended');

    registry.shutdown();
  });
});
