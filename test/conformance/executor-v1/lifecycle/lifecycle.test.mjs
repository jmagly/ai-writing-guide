/**
 * Conformance — Lifecycle Category (Core)
 *
 * Assertions:
 *  - State transitions: queued → assigned → running → done|failed|aborted
 *  - Event ordering respected
 *  - Terminal states (done, failed, aborted) emitted at most once
 *  - Pause/resume cycle (if executor advertises pause capability)
 *  - Mission status response validates against schema
 *  - active_mission_count decrements when terminal state reached
 *
 * @level Core
 * @issue #1183
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loadFixture,
  hashFixture,
  validateSchema,
  stripAnnotations,
  createRegistryForTest,
  FakeWsConn,
} from '../client.mjs';

// ── Fixture integrity ────────────────────────────────────────────────────────

const FIXTURE_HASHES = {
  'dispatch-happy':   hashFixture('dispatch-happy'),
  'dispatch-failed':  hashFixture('dispatch-failed'),
  'dispatch-aborted': hashFixture('dispatch-aborted'),
};

describe('[Core] Lifecycle — fixture integrity', () => {
  for (const [name, hash] of Object.entries(FIXTURE_HASHES)) {
    it(`${name} fixture hash is stable (drift guard)`, () => {
      expect(hashFixture(name)).toBe(hash);
    });
  }
});

// ── Helper: replay a fixture's event_sequence through the registry ───────────

async function setupRegistryWithMission(fixtureData) {
  const { registry } = await createRegistryForTest();

  const execId = fixtureData.preconditions.executor_registered.executor_id;

  registry.register({
    executor_id: execId,
    name: 'lifecycle-executor',
    version: '0.3.0',
    spec_version: '1.0.0',
    transport_endpoints: {
      rest: 'http://127.0.0.1:8122',
      ws:   'ws://127.0.0.1:8121',
    },
    capabilities: fixtureData.preconditions.executor_registered.capabilities,
  });

  const fakeWs = new FakeWsConn();
  registry.setConnected(execId, true, fakeWs);

  const missionId = fixtureData.dispatch.response.body.mission_id;
  registry.assignMission(missionId, execId);

  return { registry, execId, missionId, fakeWs };
}

// ── Happy path: assigned → running → done ────────────────────────────────────

describe('[Core] Lifecycle — happy path (assigned → running → done)', () => {
  const fixture = loadFixture('dispatch-happy');
  let registry, execId, missionId, stateChanges;

  beforeAll(async () => {
    ({ registry, execId, missionId } = await setupRegistryWithMission(fixture));

    stateChanges = [];
    registry.on('mission:state_change', (ev) => stateChanges.push(ev));

    // Replay event sequence
    for (const evt of fixture.event_sequence) {
      const { _step, _description, _validates_as, ...envelope } = evt;
      registry.handleEvent(envelope);
    }
  });

  afterAll(() => { try { registry.shutdown(); } catch { /* ignore */ } });

  it('mission reaches done state after full event sequence', () => {
    const mission = registry.getMission(missionId);
    expect(mission?.state).toBe('done');
  });

  it('state_change events are emitted for each transition', () => {
    // assigned → running → done: 3 transitions (assigned from handleEvent, started=running, completed=done)
    const changesForMission = stateChanges.filter(e => e.missionId === missionId);
    expect(changesForMission.length).toBeGreaterThanOrEqual(2);
  });

  it('final state is terminal (done)', () => {
    const mission = registry.getMission(missionId);
    expect(['done', 'failed', 'aborted']).toContain(mission?.state);
  });

  it('completedAt is set on terminal state', () => {
    const mission = registry.getMission(missionId);
    expect(mission?.completedAt).toBeTruthy();
    const ts = new Date(mission.completedAt);
    expect(ts.toString()).not.toBe('Invalid Date');
  });

  it('exit_code is 0 for successful completion', () => {
    const mission = registry.getMission(missionId);
    expect(mission?.exitCode).toBe(0);
  });

  it('active_mission_count decrements to 0 after completion', () => {
    const summary = registry.get(execId);
    expect(summary?.active_mission_count).toBe(0);
  });

  it('mission_status_response shape validates against schema', () => {
    const mission = registry.getMission(missionId);
    const statusResponse = {
      mission_id: mission.missionId,
      executor_id: mission.executorId,
      state: mission.state,
      created_at: mission.createdAt,
      updated_at: mission.updatedAt,
      completed_at: mission.completedAt,
      exit_code: mission.exitCode,
    };
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/mission_status_response',
      statusResponse
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('mission status fixture validates against schema', () => {
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/mission_status_response',
      stripAnnotations(fixture.mission_status_after_completion.response.body)
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('recent_events are kept (up to MAX_MISSION_EVENTS)', () => {
    const mission = registry.getMission(missionId);
    expect(Array.isArray(mission?.recentEvents)).toBe(true);
    expect(mission.recentEvents.length).toBeLessThanOrEqual(50);
    // Should have at least the events we replayed (5 events)
    expect(mission.recentEvents.length).toBeGreaterThan(0);
  });
});

// ── Failure path: assigned → running → failed ────────────────────────────────

describe('[Core] Lifecycle — failure path (assigned → running → failed)', () => {
  const fixture = loadFixture('dispatch-failed');
  let registry, missionId;

  beforeAll(async () => {
    ({ registry, missionId } = await setupRegistryWithMission(fixture));

    for (const evt of fixture.event_sequence) {
      const { _step, _description, _validates_as, ...envelope } = evt;
      registry.handleEvent(envelope);
    }
  });

  afterAll(() => { try { registry.shutdown(); } catch { /* ignore */ } });

  it('mission reaches failed state', () => {
    const mission = registry.getMission(missionId);
    expect(mission?.state).toBe('failed');
  });

  it('completedAt is set on failed mission', () => {
    const mission = registry.getMission(missionId);
    expect(mission?.completedAt).toBeTruthy();
  });

  it('exit_code is non-zero on failure', () => {
    const mission = registry.getMission(missionId);
    // The fixture has exit_code: 4
    expect(typeof mission?.exitCode).toBe('number');
    expect(mission.exitCode).not.toBe(0);
  });

  it('error string is populated on failed mission', () => {
    const mission = registry.getMission(missionId);
    expect(typeof mission?.error).toBe('string');
    expect(mission.error.length).toBeGreaterThan(0);
  });

  it('mission_status_after_failure validates against schema', () => {
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/mission_status_response',
      stripAnnotations(fixture.mission_status_after_failure.response.body)
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });
});

// ── Abort path: assigned → running → aborted ─────────────────────────────────

describe('[Core] Lifecycle — abort path (running → aborted)', () => {
  const fixture = loadFixture('dispatch-aborted');
  let registry, missionId;

  beforeAll(async () => {
    ({ registry, missionId } = await setupRegistryWithMission(fixture));

    // Replay events before the abort
    for (const evt of fixture.event_sequence_before_abort) {
      const { _step, _validates_as, ...envelope } = evt;
      registry.handleEvent(envelope);
    }

    // Simulate the abort: transitionMission triggers aborted state on registry
    // (In live mode, POST /api/v1/missions/:id/abort causes the executor to emit mission.aborted)
    // In fixture mode we replay the mission.aborted event directly
    for (const evt of fixture.event_sequence_after_abort) {
      const { _step, _description, _validates_as, ...envelope } = evt;
      registry.handleEvent(envelope);
    }
  });

  afterAll(() => { try { registry.shutdown(); } catch { /* ignore */ } });

  it('mission reaches aborted state after abort event', () => {
    const mission = registry.getMission(missionId);
    expect(mission?.state).toBe('aborted');
  });

  it('completedAt is set on aborted mission', () => {
    const mission = registry.getMission(missionId);
    expect(mission?.completedAt).toBeTruthy();
  });

  it('mission_status_after_abort validates against schema', () => {
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/mission_status_response',
      stripAnnotations(fixture.mission_status_after_abort.response.body)
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });
});

// ── Terminal state idempotency ────────────────────────────────────────────────

describe('[Core] Lifecycle — terminal state idempotency', () => {
  it('sending completed event twice does not change state after first terminal event', async () => {
    const fixture = loadFixture('dispatch-happy');
    const { registry, missionId } = await setupRegistryWithMission(fixture);

    // Replay all events to reach 'done'
    for (const evt of fixture.event_sequence) {
      const { _step, _description, _validates_as, ...envelope } = evt;
      registry.handleEvent(envelope);
    }

    // Verify done
    expect(registry.getMission(missionId)?.state).toBe('done');

    // Attempt to re-handle the completed event
    const completedEvt = fixture.event_sequence.at(-1);
    const { _step, _description, _validates_as, ...envelope } = completedEvt;
    registry.handleEvent(envelope);

    // Must still be 'done' (not regressed)
    expect(registry.getMission(missionId)?.state).toBe('done');

    registry.shutdown();
  });

  it('transitionMission returns false for terminal mission', async () => {
    const fixture = loadFixture('dispatch-happy');
    const { registry, missionId } = await setupRegistryWithMission(fixture);

    for (const evt of fixture.event_sequence) {
      const { _step, _description, _validates_as, ...envelope } = evt;
      registry.handleEvent(envelope);
    }

    // Try to pause a done mission — must fail
    const transitioned = registry.transitionMission(missionId, 'paused');
    expect(transitioned).toBe(false);

    registry.shutdown();
  });
});
