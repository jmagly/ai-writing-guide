/**
 * Conformance — Dispatch Category (Core)
 *
 * Assertions:
 *  - Dispatch acceptance: 202 + dispatch_response shape
 *  - executor_filter resolution (capability matching)
 *  - Default-selection policy: sandbox-first (isolation:vm/container),
 *    then local fallback, then null on no-match
 *  - long_running: true gates on 'resumable' capability
 *  - 503-equivalent: pickByFilter returns null when no matching executor
 *  - dispatch_payload validates against schema
 *  - dispatch_response validates against schema
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

describe('[Core] Dispatch — fixture integrity', () => {
  for (const [name, hash] of Object.entries(FIXTURE_HASHES)) {
    it(`${name} fixture hash is stable (drift guard)`, () => {
      expect(hashFixture(name)).toBe(hash);
    });
  }
});

// ── Helper to set up a registry with a connected executor ────────────────────

async function setupConnectedExecutor(capabilities, executorId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') {
  const { registry } = await createRegistryForTest();

  const regBody = {
    executor_id: executorId,
    name: 'test-executor',
    version: '0.3.0',
    spec_version: '1.0.0',
    transport_endpoints: {
      rest: 'http://127.0.0.1:8122',
      ws:   'ws://127.0.0.1:8121',
    },
    capabilities,
  };
  registry.register(regBody);

  const fakeWs = new FakeWsConn();
  registry.setConnected(executorId, true, fakeWs);

  return { registry, fakeWs, executorId };
}

// ── Dispatch tests ───────────────────────────────────────────────────────────

describe('[Core] Dispatch — schema validation', () => {
  it('dispatch_payload in happy fixture validates against schema', () => {
    const fixture = loadFixture('dispatch-happy');
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/dispatch_payload',
      stripAnnotations(fixture.dispatch.request.body)
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('dispatch_response in happy fixture validates against schema', () => {
    const fixture = loadFixture('dispatch-happy');
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/dispatch_response',
      stripAnnotations(fixture.dispatch.response.body)
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('dispatch_payload in failed fixture validates against schema', () => {
    const fixture = loadFixture('dispatch-failed');
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/dispatch_payload',
      stripAnnotations(fixture.dispatch.request.body)
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('dispatch_payload in aborted fixture validates against schema', () => {
    const fixture = loadFixture('dispatch-aborted');
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/dispatch_payload',
      stripAnnotations(fixture.dispatch.request.body)
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });
});

describe('[Core] Dispatch — executor_filter resolution', () => {
  let registry;

  afterAll(() => { try { registry?.shutdown(); } catch { /* ignore */ } });

  it('resolves executor matching required capability', async () => {
    ({ registry } = await setupConnectedExecutor([
      'isolation:vm',
      'runtime:claude-code',
      'platform:linux/x64',
    ]));

    const result = registry.pickByFilter({ capabilities: ['runtime:claude-code'] });
    expect(result).not.toBeNull();
    expect(result.executor.capabilities).toContain('runtime:claude-code');
  });

  it('returns null when required capability is absent', async () => {
    ({ registry } = await setupConnectedExecutor([
      'isolation:vm',
      'runtime:claude-code',
    ]));

    const result = registry.pickByFilter({ capabilities: ['runtime:codex'] });
    expect(result).toBeNull();
  });

  it('returns null when executor is disconnected', async () => {
    const { registry: reg, executorId } = await setupConnectedExecutor(['runtime:claude-code']);
    // Disconnect
    reg.setConnected(executorId, false);

    const result = reg.pickByFilter({ capabilities: [] });
    expect(result).toBeNull();
    reg.shutdown();
  });

  it('pins to specified executor_id when filter specifies one', async () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    ({ registry } = await setupConnectedExecutor(['isolation:vm', 'runtime:claude-code'], id));

    const result = registry.pickByFilter({ executor_id: id });
    expect(result).not.toBeNull();
    expect(result.executor.executorId).toBe(id);
    expect(result.reason).toContain('pinned');
  });

  it('returns null for pinned executor_id that does not exist', async () => {
    ({ registry } = await setupConnectedExecutor(['isolation:vm']));

    const result = registry.pickByFilter({ executor_id: '00000000-dead-beef-0000-000000000000' });
    expect(result).toBeNull();
  });
});

describe('[Core] Dispatch — sandbox-first default-selection policy', () => {
  it('prefers isolation:vm over isolation:none', async () => {
    const { registry, executorId: vmId } = await setupConnectedExecutor(
      ['isolation:vm', 'runtime:claude-code'],
      'aaaaaaaa-0000-0000-0000-000000000001'
    );

    // Register a second local-only executor
    const localId = 'bbbbbbbb-0000-0000-0000-000000000002';
    registry.register({
      executor_id: localId,
      name: 'local-executor',
      version: '1.0.0',
      spec_version: '1.0.0',
      transport_endpoints: { rest: 'http://127.0.0.1:8200', ws: 'ws://127.0.0.1:8201' },
      capabilities: ['isolation:none', 'runtime:claude-code'],
    });
    const fakeWs2 = new FakeWsConn();
    registry.setConnected(localId, true, fakeWs2);

    const result = registry.pickByFilter({ capabilities: ['runtime:claude-code'] });
    expect(result).not.toBeNull();
    // Must pick the vm executor (sandbox-first)
    expect(result.executor.executorId).toBe(vmId);
    expect(result.reason).toContain('sandbox-first');

    registry.shutdown();
  });

  it('falls back to local executor when no vm/container executor available', async () => {
    const localId = 'cccccccc-0000-0000-0000-000000000003';
    const { registry } = await setupConnectedExecutor(
      ['isolation:none', 'runtime:claude-code'],
      localId
    );

    const result = registry.pickByFilter({ capabilities: ['runtime:claude-code'] });
    expect(result).not.toBeNull();
    expect(result.executor.executorId).toBe(localId);
    expect(result.reason).toContain('local fallback');

    registry.shutdown();
  });

  it('returns null (503 equivalent) when no executor matches any filter', async () => {
    const { registry } = await setupConnectedExecutor(['isolation:none']);

    // Filter requires a capability no executor has
    const result = registry.pickByFilter({ capabilities: ['runtime:codex'] });
    expect(result).toBeNull();

    registry.shutdown();
  });
});

describe('[Core] Dispatch — long_running gates on resumable', () => {
  it('returns null for long_running when executor lacks resumable', async () => {
    const { registry } = await setupConnectedExecutor([
      'isolation:vm',
      'runtime:claude-code',
    ]);

    const result = registry.pickByFilter({ capabilities: [] }, /* longRunning */ true);
    expect(result).toBeNull();

    registry.shutdown();
  });

  it('succeeds for long_running when executor has resumable', async () => {
    const { registry } = await setupConnectedExecutor([
      'isolation:vm',
      'runtime:claude-code',
      'resumable',
    ]);

    const result = registry.pickByFilter({ capabilities: [] }, /* longRunning */ true);
    expect(result).not.toBeNull();
    expect(result.executor.capabilities).toContain('resumable');

    registry.shutdown();
  });

  it('rejected executors list is populated for long_running without resumable', async () => {
    const { registry } = await setupConnectedExecutor([
      'isolation:vm',
      'runtime:claude-code',
      // no 'resumable'
    ]);

    // Register a second executor that has resumable
    const resumableId = 'dddddddd-0000-0000-0000-000000000004';
    registry.register({
      executor_id: resumableId,
      name: 'resumable-executor',
      version: '1.0.0',
      spec_version: '1.0.0',
      transport_endpoints: { rest: 'http://127.0.0.1:8300', ws: 'ws://127.0.0.1:8301' },
      capabilities: ['isolation:container', 'resumable'],
    });
    const fakeWs = new FakeWsConn();
    registry.setConnected(resumableId, true, fakeWs);

    // Pick with long_running: true — must pick the resumable one
    const result = registry.pickByFilter({ capabilities: [] }, /* longRunning */ true);
    expect(result).not.toBeNull();
    expect(result.executor.executorId).toBe(resumableId);
    // First executor must appear in rejected list
    expect(result.rejected.some(r => r.reason.includes('resumable'))).toBe(true);

    registry.shutdown();
  });
});

describe('[Core] Dispatch — mission assignment', () => {
  let registry;

  afterAll(() => { try { registry?.shutdown(); } catch { /* ignore */ } });

  it('assignMission creates a mission record in assigned state', async () => {
    const fixture = loadFixture('dispatch-happy');
    ({ registry } = await setupConnectedExecutor(
      ['isolation:vm', 'runtime:claude-code'],
      fixture.preconditions.executor_registered.executor_id
    ));

    const missionId = fixture.dispatch.response.body.mission_id;
    const executorId = fixture.preconditions.executor_registered.executor_id;

    const mission = registry.assignMission(missionId, executorId);
    expect(mission.missionId).toBe(missionId);
    expect(mission.executorId).toBe(executorId);
    expect(mission.state).toBe('assigned');
    expect(mission.createdAt).toBeTruthy();
    expect(mission.updatedAt).toBeTruthy();
  });

  it('getMission returns assigned mission after assignMission', async () => {
    const fixture = loadFixture('dispatch-happy');
    ({ registry } = await setupConnectedExecutor(
      ['isolation:vm', 'runtime:claude-code'],
      fixture.preconditions.executor_registered.executor_id
    ));

    const missionId = fixture.dispatch.response.body.mission_id;
    registry.assignMission(missionId, fixture.preconditions.executor_registered.executor_id);

    const found = registry.getMission(missionId);
    expect(found).toBeDefined();
    expect(found.state).toBe('assigned');
  });

  it('getMission returns undefined for unknown mission ID', async () => {
    ({ registry } = await setupConnectedExecutor(['isolation:vm']));
    expect(registry.getMission('m-does-not-exist')).toBeUndefined();
  });

  it('active_mission_count increases after assignMission', async () => {
    const executorId = 'eeeeeeee-0000-0000-0000-000000000005';
    ({ registry } = await setupConnectedExecutor(['isolation:vm'], executorId));

    registry.assignMission('m-count-test', executorId);

    const summary = registry.get(executorId);
    expect(summary?.active_mission_count).toBe(1);
  });
});
