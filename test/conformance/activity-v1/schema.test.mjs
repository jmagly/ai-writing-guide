import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

import { validateActivityEvent } from '../../../apps/cockpit/bridge/src/activity-contract.mjs';

const root = resolve(import.meta.dirname, '../../..');
const schemaDir = resolve(root, 'schemas/activity');
const cockpitContractDir = resolve(root, 'apps/cockpit/bridge/contracts');
const fixturesDir = resolve(import.meta.dirname, 'fixtures');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const fixture = (name) => readJson(resolve(fixturesDir, name));
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const eventSchema = readJson(resolve(schemaDir, 'activity-event-v1.schema.json'));
const evidenceSchema = readJson(resolve(schemaDir, 'activity-operational-evidence-v1.schema.json'));
const upstream = readJson(resolve(schemaDir, 'upstream-contract.json'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateEventSchema = ajv.compile(eventSchema);
const validateEvidenceSchema = ajv.compile(evidenceSchema);

describe('Agentic Sandbox activity v1 mirrored contracts', () => {
  it('pins the exact v2026.8.3 schema bytes and Cockpit runtime copies', () => {
    expect(upstream).toMatchObject({ tag: 'v2026.8.3', commit: '201221e5a26f7f0cc719ab584520ce3164065825' });
    for (const [name, contract] of Object.entries(upstream.files)) {
      const canonical = resolve(schemaDir, name);
      const runtime = resolve(cockpitContractDir, name);
      expect(digest(canonical)).toBe(contract.sha256);
      expect(digest(runtime)).toBe(contract.sha256);
      expect(readFileSync(runtime)).toEqual(readFileSync(canonical));
    }
  });

  it('accepts canonical event and daily operational evidence fixtures', () => {
    expect(validateEventSchema(fixture('valid-event.json')), JSON.stringify(validateEventSchema.errors)).toBe(true);
    expect(validateEvidenceSchema(fixture('valid-operational-evidence.json')), JSON.stringify(validateEvidenceSchema.errors)).toBe(true);
  });

  it('fails closed on malformed schema values and evidence integrity metadata', () => {
    expect(validateEventSchema(fixture('invalid-schema-event.json'))).toBe(false);
    expect(validateEvidenceSchema(fixture('invalid-operational-evidence.json'))).toBe(false);
  });

  it('applies Cockpit restricted-content and correlation policy over the canonical event schema', () => {
    const scope = { tenant_id: 'tenant-1', host_id: 'host-1', instance_id: 'instance-1', agent_id: 'agent-1' };
    expect(validateActivityEvent(fixture('valid-event.json'), scope)).toEqual({ valid: true, errors: [] });
    expect(validateActivityEvent(fixture('invalid-restricted-event.json'), scope)).toMatchObject({ valid: false });
    expect(validateActivityEvent(fixture('valid-event.json'), { ...scope, agent_id: 'other' })).toMatchObject({ valid: false });
  });
});
