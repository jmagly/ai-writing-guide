import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const schema = JSON.parse(readFileSync(resolve(root, 'schemas/fleet-workload-v1.schema.json'), 'utf8'));
const fixture = (name) => JSON.parse(readFileSync(
  resolve(root, 'test/conformance/fleet-workload-v1/fixtures', name),
  'utf8'
));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

describe('fleet workload v1 contract', () => {
  it.each([
    'mixed-workload-inventory.json',
    'reconciliation-after-restart.json',
  ])('accepts valid fixture %s', (name) => {
    expect(validate(fixture(name)), JSON.stringify(validate.errors)).toBe(true);
  });

  it.each([
    'invalid-unknown-completed.json',
    'invalid-credential-material.json',
  ])('rejects safety-invalid fixture %s', (name) => {
    expect(validate(fixture(name))).toBe(false);
  });

  it('keeps the contract identity orchestrator-neutral', () => {
    expect(schema.$id).toBe('urn:agentic-orchestration:fleet-workload:v1');
    expect(schema.$id).not.toContain('aiwg');
    expect(schema.$id).not.toContain('sandbox');
  });

  it('carries stable substrate session, task, and command identity when assigned', () => {
    const inventory = fixture('mixed-workload-inventory.json');
    const byKind = new Map(inventory.records.map((record) => [record.kind, record.lineage]));
    expect(byKind.get('persistent-agent')).toMatchObject({
      session_id: 'session-agent-1',
      task_id: 'task-agent-1',
      command_id: null,
    });
    expect(byKind.get('scheduled-collector')).toMatchObject({
      task_id: 'task-collector-1',
      command_id: 'collector-run-42',
    });
    expect(byKind.get('one-shot-command')).toMatchObject({
      task_id: 'task-command-1',
      command_id: 'command-1',
    });
  });
});
