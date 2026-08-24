import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { classifyContractChanges } from '../../../tools/mission-protocol/contract-diff.mjs';
import {
  MISSION_API_VERSION,
  decodeMission,
  encodeMission,
  normalizeMissionState,
  type CanonicalMission,
  type MissionSource,
  type MissionTarget,
} from '../../../src/mission-protocol/index.js';

const canonical: CanonicalMission = {
  apiVersion: MISSION_API_VERSION,
  kind: 'Mission',
  metadata: { id: 'mission-42', parentId: 'mission-parent', lineage: [{ relation: 'continued-from', id: 'mission-41' }] },
  spec: { objective: 'Verify the release', completionCriterion: 'All gates pass', budgets: { maxAttempts: 3, timeoutSeconds: 600, maxTokens: 12000 } },
  status: {
    state: 'incomplete', terminal: true, nativeState: 'budget-exhausted', partialOutput: { summary: 'partial' },
    artifacts: [{ id: 'report', kind: 'verifier', uri: 'artifact://report', sha256: 'a'.repeat(64) }],
    verification: [{ name: 'tests', status: 'passed', evidence: 'fixture' }],
  },
  provenance: { sourceContract: 'fixture', sourceVersion: 'v1', sourceId: 'native-42' },
  extensions: { 'fixture.vendor': { retained: true } },
};

describe('Mission Protocol v1 schema and state contract', () => {
  it('validates the canonical golden record and rejects undeclared top-level fields', async () => {
    const schema = JSON.parse(await readFile(path.join(process.cwd(), 'schemas/mission-v1.schema.json'), 'utf8'));
    const validate = new Ajv2020({ strict: false, validateFormats: false }).compile(schema);
    expect(validate(canonical), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...canonical, surprise: true })).toBe(false);
  });

  it.each([
    ['done', 'completed'], ['completed', 'completed'], ['aborted', 'cancelled'], ['cancelled', 'cancelled'],
    ['failed', 'failed'], ['budget-exhausted', 'incomplete'], ['disconnected', 'unknown'],
    ['operator-review-required', 'operator-review'], ['input-required', 'blocked'],
  ])('maps %s without collapsing it into the wrong terminal class', (native, normalized) => {
    expect(normalizeMissionState(native)).toBe(normalized);
  });

  it('fails closed on unknown canonical major versions and contradictory terminality', () => {
    expect(() => decodeMission({ ...canonical, apiVersion: 'mission.aiwg.io/v2' }, 'canonical')).toThrow(/Unsupported canonical Mission version/);
    expect(() => decodeMission({ missionId: 'future', goal: 'future', apiVersion: 'mission.aiwg.io/v2' }, 'mission-plan')).toThrow(/Unsupported Mission source major version/);
    expect(() => decodeMission({ ...canonical, status: { ...canonical.status, terminal: false } }, 'canonical')).toThrow(/terminal flag contradicts/);
  });
});

describe('legacy and transport adapter matrix', () => {
  const sources: Array<[MissionSource, Record<string, unknown>]> = [
    ['mission-plan', { missionId: 'plan-1', goal: 'Plan', completionCriterion: 'done', cycles: [], vendor_field: 1 }],
    ['mission-ledger', { missionId: 'ledger-1', goal: 'Ledger', status: 'done', artifacts: [{ id: 'a', kind: 'result', sha256: 'b'.repeat(64) }] }],
    ['mission-control-session', { id: 'session-1', objective: 'Session', status: 'running' }],
    ['executor-v1', { mission_id: 'exec-1', objective: 'Executor', state: 'aborted' }],
    ['fleet-workload-v1', { mission_id: 'fleet-1', objective: 'Fleet', state: 'operator-review-required' }],
    ['a2a', { id: 'task-1', objective: 'A2A', status: { state: 'input-required' }, contextId: 'ctx-1' }],
    ['uhp-2026-08-11', { responseId: 'resp_1', objective: 'UHP', nativeState: 'incomplete', endpointProfile: 'fixture' }],
    ['graph-flow-v1', { id: 'run-1', objective: 'Graph', nodeState: 'disconnected', schemaVersion: 'graph.flow.aiwg.io/v1' }],
    ['cockpit', { id: 'ui-1', title: 'Cockpit', status: 'completed' }],
    ['activity-v1', { missionId: 'event-1', objective: 'Audit', state: 'failed', apiVersion: 'activity.aiwg.io/v1' }],
  ];

  it.each(sources)('decodes %s with source version, native state, warnings, extensions, and loss report', (source, input) => {
    const decoded = decodeMission(input, source);
    expect(decoded.value.apiVersion).toBe(MISSION_API_VERSION);
    expect(decoded.value.metadata.id).toBeTruthy();
    expect(decoded.value.status.nativeState).toBeTruthy();
    expect(decoded.sourceVersion).toBeTruthy();
    expect(decoded.lossReport).toEqual([]);
    expect(decoded.preservedExtensions).toBeTypeOf('object');
  });

  const targets: MissionTarget[] = ['mission-plan', 'mission-ledger', 'mission-control-session', 'executor-v1', 'fleet-workload-v1', 'a2a', 'uhp-2026-08-11', 'graph-flow-v1', 'cockpit', 'activity-v1'];
  it.each(targets)('records intentional loss when projecting canonical state to %s', target => {
    if (['mission-ledger', 'fleet-workload-v1'].includes(target)) expect(encodeMission(canonical, target).lossReport.length).toBeGreaterThan(0);
    else expect(() => encodeMission(canonical, target)).toThrow(/silently lose required semantics/);
    const encoded = encodeMission(canonical, target, { allowLoss: true });
    expect(encoded.value).toBeTypeOf('object');
    expect(encoded.lossReport.length).toBeGreaterThan(0);
  });

  it('supports mixed legacy/canonical reads while writes remain explicitly targeted', () => {
    const legacy = decodeMission(sources[0][1], 'mission-plan').value;
    const canonicalRead = decodeMission(canonical, 'canonical').value;
    expect(legacy.apiVersion).toBe(canonicalRead.apiVersion);
    expect(encodeMission(legacy, 'mission-plan').targetVersion).toBe('mission-plan');
  });

  it('preserves raw UHP metadata, unknown fields, partial output, and nested file artifacts', async () => {
    const response = JSON.parse(await readFile(path.join(process.cwd(), 'test/fixtures/uhp/2026-08-11/response.json'), 'utf8'));
    const decoded = decodeMission(response, 'uhp-2026-08-11');
    expect(decoded.value.status.artifacts).toMatchObject([{ id: 'file_fixture', kind: 'uhp-file' }]);
    expect(decoded.preservedExtensions).toMatchObject({ metadata: { session_id: 'hsessfixture' }, fixture_vendor_receipt: { retained: true } });
  });

  it.each(['mission-ledger', 'fleet-workload-v1'] as const)('preserves applicable identity, completion, budgets, partial output, artifacts, hashes, and lineage through %s', target => {
    const encoded = encodeMission(canonical, target).value as Record<string, unknown>;
    const decoded = decodeMission(encoded, target).value;
    expect(decoded.metadata).toMatchObject({ id: 'mission-42', lineage: [{ relation: 'continued-from', id: 'mission-41' }] });
    expect(decoded.spec).toMatchObject({ objective: 'Verify the release', completionCriterion: 'All gates pass' });
    expect(decoded.status).toMatchObject({ state: 'incomplete', partialOutput: { summary: 'partial' }, artifacts: [{ id: 'report', sha256: 'a'.repeat(64) }] });
    if (target === 'fleet-workload-v1') expect(decoded.spec.budgets).toMatchObject({ maxAttempts: 3, timeoutSeconds: 600, maxTokens: 12000 });
  });
});

describe('Mission schema compatibility classification', () => {
  const base = { type: 'object', required: ['id'], properties: { id: { type: 'string' }, note: { type: 'string' }, state: { enum: ['running', 'completed'] } } };
  it('classifies removed/renamed fields, type changes, enum removals, stricter constraints, and required additions as breaking', () => {
    const next = { type: 'object', required: ['id', 'added'], properties: { id: { type: 'number' }, state: { enum: ['running'] }, added: { type: 'string', minLength: 2 } } };
    const details = classifyContractChanges(base, next).filter(change => change.kind === 'breaking').map(change => change.detail);
    expect(details).toEqual(expect.arrayContaining(['new required field \'added\'', 'property removed or renamed', 'type changed', 'enum value removed: "completed"', 'new required property']));
  });

  it('classifies optional fields and enum additions as additive', () => {
    const next = { ...base, properties: { ...base.properties, optional: { type: 'string' }, state: { enum: ['running', 'completed', 'unknown'] } } };
    expect(classifyContractChanges(base, next).every(change => change.kind === 'additive')).toBe(true);
  });
});

describe('mixed-version consumer conformance', () => {
  it('classifies every required consumer against the machine inventory', async () => {
    const matrix = JSON.parse(await readFile(path.join(process.cwd(), 'schemas/mission-protocol/consumer-matrix-v1.json'), 'utf8'));
    const inventory = JSON.parse(await readFile(path.join(process.cwd(), 'schemas/mission-protocol/inventory-v1.json'), 'utf8'));
    expect(matrix.consumers.map((consumer: { id: string }) => consumer.id)).toEqual([
      'mc-cli', 'mission-conductor', 'fleet-conductor', 'serve-executor', 'a2a', 'uhp', 'graph', 'cockpit-web', 'mcp', 'audit', 'activity',
    ]);
    for (const consumer of matrix.consumers) expect(inventory.entries.some((entry: { path: string }) => entry.path === consumer.inventoryMatch), consumer.id).toBe(true);
  });

  it('preserves active, reconciled, cancelled, incomplete, artifact, and rollback evidence across upgrade reads', () => {
    const activeLegacy = decodeMission({ missionId: 'active', goal: 'active mission', checkpoint: { completed: ['one'], pending: ['two'], failed: [] }, artifacts: [{ id: 'checkpoint', kind: 'result', sha256: 'c'.repeat(64) }] }, 'mission-ledger');
    expect(activeLegacy.value.status).toMatchObject({ state: 'running', terminal: false, artifacts: [{ id: 'checkpoint', sha256: 'c'.repeat(64) }] });
    const rollbackSnapshot = encodeMission(activeLegacy.value, 'mission-ledger');
    expect(rollbackSnapshot.value).toMatchObject({ missionId: 'active', status: 'running' });
    const reconciled = decodeMission({ id: 'task-reconciled', objective: 'reconcile', status: { state: 'completed' } }, 'a2a').value;
    const cancelled = decodeMission({ mission_id: 'cancelled', objective: 'cancel', state: 'aborted' }, 'executor-v1').value;
    const incomplete = decodeMission({ responseId: 'resp_incomplete', objective: 'bounded', nativeState: 'budget-exhausted', partialOutput: 'partial' }, 'uhp-2026-08-11').value;
    expect([reconciled.status.state, cancelled.status.state, incomplete.status.state]).toEqual(['completed', 'cancelled', 'incomplete']);
    expect(incomplete.status.partialOutput).toBe('partial');
  });
});
