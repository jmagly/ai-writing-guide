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

  it('heavy-flow proof: flow-architecture-evolution playbook (with a fanout step) validates (#1547)', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-playbook.schema.json'));
    const doc = yaml.load(
      fs.readFileSync(path.join(FLOWS_DIR, 'flow-architecture-evolution.playbook.yaml'), 'utf8'),
    ) as { spec: { steps: Array<Record<string, unknown>> } };
    expect(validate(doc), JSON.stringify(validate.errors, null, 2)).toBe(true);
    // It genuinely exercises the agentic-step extension: the review panel is a fanout step.
    const reviewStep = doc.spec.steps.find((s) => s.id === 'architecture-review') as
      | { fanout?: { agents: string[]; synthesize: string } }
      | undefined;
    expect(reviewStep?.fanout, 'review step is a fanout panel').toBeTruthy();
    expect(reviewStep!.fanout!.agents.length, 'four parallel reviewers').toBe(4);
    expect(reviewStep!.fanout!.synthesize).toBe('incorporate-review');
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

describe('forward Flows aliases validate (#1536)', () => {
  it('accepts apiVersion flow.aiwg.io/v1 + kind FlowPlaybook', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-playbook.schema.json'));
    const doc = {
      apiVersion: 'flow.aiwg.io/v1',
      kind: 'FlowPlaybook',
      metadata: { name: 'f' },
      spec: { inventory: 'x', targets: { groups: ['g'] }, steps: [{ id: 's', capability: 'c' }] },
    };
    expect(validate(doc), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it('accepts apiVersion flow.aiwg.io/v1 + kind FlowCapability', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-capability.schema.json'));
    const doc = {
      apiVersion: 'flow.aiwg.io/v1',
      kind: 'FlowCapability',
      metadata: { name: 'c' },
      spec: { description: 'd', version: '1.0.0', inputs: [], outputs: [], agent: 'workflow-executor' },
    };
    expect(validate(doc), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });
});

describe('non-iterating Flows omit inventory/targets (#1539)', () => {
  it('a playbook with only spec.steps (no inventory/targets) validates', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-playbook.schema.json'));
    const doc = {
      apiVersion: 'flow.aiwg.io/v1',
      kind: 'FlowPlaybook',
      metadata: { name: 'project-flow' },
      // SDLC/project Flow: single project context, no host inventory to fan over.
      spec: { steps: [{ id: 'gate', kind: 'gate', description: 'human gate' }] },
    };
    expect(validate(doc), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });
});

describe('agentic fan-out steps (#1547)', () => {
  const base = (step: Record<string, unknown>) => ({
    apiVersion: 'flow.aiwg.io/v1',
    kind: 'FlowPlaybook',
    metadata: { name: 'panel-flow' },
    spec: {
      steps: [
        { id: 'draft', capability: 'primary-author' },
        step,
        { id: 'archive', capability: 'archive-artifact', depends_on: ['review'] },
      ],
    },
  });

  it('a fan-out step (panel + synthesize) validates', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-playbook.schema.json'));
    const doc = base({
      id: 'review',
      fanout: {
        strategy: 'parallel',
        agents: ['security-review', 'test-review', 'architecture-review'],
        synthesize: 'review-synthesizer',
      },
      depends_on: ['draft'],
    });
    expect(validate(doc), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it('rejects a fan-out missing synthesize', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-playbook.schema.json'));
    const doc = base({ id: 'review', fanout: { agents: ['a', 'b'] }, depends_on: ['draft'] });
    expect(validate(doc)).toBe(false);
  });

  it('rejects a fan-out with an empty agents panel', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-playbook.schema.json'));
    const doc = base({
      id: 'review',
      fanout: { agents: [], synthesize: 's' },
      depends_on: ['draft'],
    });
    expect(validate(doc)).toBe(false);
  });

  it('rejects a step that sets both capability and fanout', () => {
    const ajv = makeAjv();
    const validate = ajv.compile(loadSchema('workflow-playbook.schema.json'));
    const doc = base({
      id: 'review',
      capability: 'one-agent',
      fanout: { agents: ['a'], synthesize: 's' },
      depends_on: ['draft'],
    });
    expect(validate(doc)).toBe(false);
  });
});
