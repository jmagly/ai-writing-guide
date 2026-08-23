import { readFileSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const schema = JSON.parse(readFileSync(path.join(ROOT, 'schemas/flow/graph-sandbox-node-event.v1.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const digest = `sha256:${'a'.repeat(64)}`;
const base = {
  api_version: 'flow.aiwg.io/v1alpha1', kind: 'GraphSandboxNodeEvent',
  metadata: {
    namespace: 'https://aiwg.io/extensions/flow-graph/v1', graph_id: 'graph',
    graph_version: '1.0.0', run_id: 'run', node_id: 'sandbox', node_run_id: 'run:sandbox', edge_id: 'dispatch',
  },
  task: { task_id: 'task-1', session_id: 'session-1', runtime_binding: 'a2a-sandbox', idempotency_key: 'run:sandbox:input' },
};

describe('Flow graph Sandbox node event contract', () => {
  it('accepts exact successful terminal evidence', () => {
    const value = { ...base, event: {
      type: 'terminal', state: 'succeeded', started_at: '2026-08-22T20:00:00Z', ended_at: '2026-08-22T20:00:01Z',
      duration_ms: 1000, exit: { status: 'code', code: 0 },
      evidence: [{ kind: 'result', availability: 'available', uri: 'sandbox://task-1/result', digest, redaction_status: 'redacted' }],
    } };
    expect(validate(value), JSON.stringify(validate.errors)).toBe(true);
  });

  it('accepts explicit unknown outcome and missing evidence', () => {
    const value = { ...base, event: {
      type: 'terminal', state: 'unknown', started_at: '2026-08-22T20:00:00Z', ended_at: '2026-08-22T20:00:02Z',
      duration_ms: 2000, termination_reason: 'worker disconnected before durable terminal observation',
      exit: { status: 'unknown', reason: 'no durable process result' },
      evidence: [{ kind: 'result', availability: 'unknown', redaction_status: 'unknown' }],
    } };
    expect(validate(value), JSON.stringify(validate.errors)).toBe(true);
  });

  it('accepts checkpoint lineage and rejects ambiguous terminal facts', () => {
    expect(validate({ ...base, task: { ...base.task, replay_of_task_id: 'task-0' }, event: {
      type: 'checkpoint', state: 'restored', observed_at: '2026-08-22T20:00:00Z',
      resumability: 'resumable', checkpoint_id: 'cp-1', checkpoint_digest: digest,
    } })).toBe(true);

    expect(validate({ ...base, event: {
      type: 'terminal', state: 'failed', started_at: '2026-08-22T20:00:00Z', ended_at: '2026-08-22T20:00:01Z',
      duration_ms: 1000, evidence: [],
    } })).toBe(false);
  });

  it('rejects a successful state paired with a non-zero exit', () => {
    expect(validate({ ...base, event: {
      type: 'terminal', state: 'succeeded', started_at: '2026-08-22T20:00:00Z', ended_at: '2026-08-22T20:00:01Z',
      duration_ms: 1000, exit: { status: 'code', code: 2 }, evidence: [],
    } })).toBe(false);
  });

  it('documents every cross-repository owner and fail-closed unknown mapping', () => {
    const contract = readFileSync(path.join(ROOT, 'docs/contracts/flow-graph-sandbox-node.v1.md'), 'utf8');
    for (const phrase of ['AIWG', 'Bridge', 'Sandbox', 'Conformance harness', 'never assume failure or success', 'replay_of_task_id']) {
      expect(contract).toContain(phrase);
    }
  });
});
