/**
 * Workflow Metalanguage Schema Validation
 *
 * Foundational validation harness for the AIWG workflow metalanguage (the
 * declarative YAML "Flow" spec under agentic/code/addons/aiwg-utils/workflow/).
 * Before this, the schemas shipped with example documents but NO test proved
 * the examples conform — and any flow-* → YAML Flow migration (#1539) needs a
 * validator to assert converted flows are well-formed.
 *
 * This harness:
 *   1. Compiles every workflow-*.schema.json (draft-07) — guards malformed schemas.
 *   2. Validates each shipped example YAML against its kind's schema.
 *   3. Negative test: a structurally-broken doc is rejected.
 *
 * @issue #1539 (flows → YAML Flow spec), #1534 (epic)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const WF_DIR = path.join(REPO_ROOT, 'agentic/code/addons/aiwg-utils/workflow');
const SCHEMA_DIR = path.join(WF_DIR, 'schemas');
const EXAMPLE_DIR = path.join(WF_DIR, 'examples');

function makeAjv(): Ajv {
  // Schemas are draft-07; strict:false tolerates the descriptive keywords
  // these schemas use without erroring on unknown formats.
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

function loadSchema(name: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, name), 'utf8'));
}

function loadYaml(name: string): unknown {
  return yaml.load(fs.readFileSync(path.join(EXAMPLE_DIR, name), 'utf8'));
}

const SCHEMA_FILES = [
  'workflow-capability.schema.json',
  'workflow-playbook.schema.json',
  'workflow-inventory.schema.json',
  'workflow-target.schema.json',
  'workflow-gate.schema.json',
  'workflow-role.schema.json',
  'workflow-extension.schema.json',
];

describe('workflow metalanguage schemas', () => {
  it('every workflow-*.schema.json compiles under ajv (draft-07)', () => {
    const ajv = makeAjv();
    for (const file of SCHEMA_FILES) {
      const schema = loadSchema(file);
      expect(() => ajv.compile(schema), `${file} should compile`).not.toThrow();
    }
  });

  it('all seven documented kinds have a schema file present', () => {
    for (const file of SCHEMA_FILES) {
      expect(fs.existsSync(path.join(SCHEMA_DIR, file)), `${file} exists`).toBe(true);
    }
  });
});

describe('workflow metalanguage example documents conform to their schemas', () => {
  it('capability-minimal.yaml validates against WorkflowCapability', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-capability.schema.json'));
    const doc = loadYaml('capability-minimal.yaml');
    const ok = validate(doc);
    expect(ok, JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it('playbook-with-gate.yaml validates against WorkflowPlaybook', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-playbook.schema.json'));
    const doc = loadYaml('playbook-with-gate.yaml');
    const ok = validate(doc);
    expect(ok, JSON.stringify(validate.errors, null, 2)).toBe(true);
  });
});

describe('pilot Flow conversion validates against the schema (#1539)', () => {
  const FLOWS_DIR = path.join(REPO_ROOT, 'agentic/code/frameworks/sdlc-complete/flows');

  it('flow-release.playbook.yaml validates against WorkflowPlaybook', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-playbook.schema.json'));
    const doc = yaml.load(fs.readFileSync(path.join(FLOWS_DIR, 'flow-release.playbook.yaml'), 'utf8'));
    const ok = validate(doc);
    expect(ok, JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it('every pilot release capability validates against WorkflowCapability', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-capability.schema.json'));
    const capDir = path.join(FLOWS_DIR, 'capabilities');
    const caps = fs.readdirSync(capDir).filter((f) => f.endsWith('.yaml'));
    expect(caps.length, 'pilot capabilities present').toBeGreaterThan(0);
    for (const f of caps) {
      const doc = yaml.load(fs.readFileSync(path.join(capDir, f), 'utf8'));
      const ok = validate(doc);
      expect(ok, `${f}: ${JSON.stringify(validate.errors, null, 2)}`).toBe(true);
    }
  });
});

describe('workflow schema rejects malformed documents (negative guard)', () => {
  it('rejects a playbook missing required spec.steps', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-playbook.schema.json'));
    const broken = {
      apiVersion: 'workflow.aiwg.io/v1',
      kind: 'WorkflowPlaybook',
      metadata: { name: 'broken' },
      spec: { inventory: 'x', targets: { groups: ['edge'] } }, // no steps
    };
    expect(validate(broken)).toBe(false);
  });

  it('rejects a capability with the wrong kind const', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-capability.schema.json'));
    const broken = {
      apiVersion: 'workflow.aiwg.io/v1',
      kind: 'NotACapability',
      metadata: { name: 'x' },
      spec: { description: 'x', agent: 'workflow-executor' },
    };
    expect(validate(broken)).toBe(false);
  });
});
