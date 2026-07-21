import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import yaml from 'js-yaml';
import Ajv2020 from 'ajv/dist/2020.js';
import {
  ReleasePlanError,
  buildReleasePlanExecutionFlow,
  discoverReleasePlans,
  selectReleasePlan,
} from '../../../src/release/plan.js';

let tempDir: string | undefined;
const REPO_ROOT = resolve(__dirname, '../../..');

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

function makeProject(): string {
  tempDir = mkdtempSync(join(tmpdir(), 'aiwg-release-plan-'));
  mkdirSync(join(tempDir, '.aiwg', 'releases'), { recursive: true });
  return tempDir;
}

function writePlan(root: string, name: string, body: string): void {
  writeFileSync(join(root, '.aiwg', 'releases', name), body, 'utf8');
}

describe('release plan sidecars', () => {
  it('discovers JSON and YAML plans from .aiwg/releases', async () => {
    const root = makeProject();
    writePlan(root, 'npm.yaml', validPlan('aiwg-npm'));
    writePlan(root, 'docs.json', JSON.stringify({
      version: 1,
      id: 'docs-site',
      target: { type: 'site', name: 'docs.aiwg.io' },
      delivery: { mode: 'dispatch-only' },
    }));

    const plans = await discoverReleasePlans(root);

    expect(plans.map(({ plan }) => plan.id)).toEqual(['docs-site', 'aiwg-npm']);
  });

  it('selects an explicit plan and reports it before release actions', async () => {
    const root = makeProject();
    writePlan(root, 'npm.yaml', validPlan('aiwg-npm'));
    writePlan(root, 'plugin.yaml', validPlan('codex-plugin', 'pr'));

    const selected = await selectReleasePlan(root, {
      planId: 'aiwg-npm',
      projectDeliveryMode: 'pr-required',
    });

    expect(selected.activePlan.id).toBe('aiwg-npm');
    expect(selected.effectiveDeliveryMode).toBe('tag-only');
    expect(selected.projectDeliveryMode).toBe('pr-required');
    expect(selected.report).toContain('Active release plan: aiwg-npm');
    expect(selected.report).toContain('Delivery mode: tag-only (project default: pr-required)');
  });

  it('uses the sidecar delivery mode over broad project defaults', async () => {
    const root = makeProject();
    writePlan(root, 'npm.yaml', validPlan('aiwg-npm'));

    const selected = await selectReleasePlan(root, { projectDeliveryMode: 'direct' });

    expect(selected.effectiveDeliveryMode).toBe('tag-only');
  });

  it('fails actionably when multiple plans are present without selection', async () => {
    const root = makeProject();
    writePlan(root, 'a.yaml', validPlan('a-plan'));
    writePlan(root, 'b.yaml', validPlan('b-plan'));

    await expect(selectReleasePlan(root)).rejects.toThrow(
      'Multiple release plans are available (a-plan, b-plan). Select one explicitly with --plan <id>.',
    );
  });

  it('fails actionably when a selected plan is missing', async () => {
    const root = makeProject();
    writePlan(root, 'npm.yaml', validPlan('aiwg-npm'));

    await expect(selectReleasePlan(root, { planId: 'docs-site' })).rejects.toThrow(
      "Release plan 'docs-site' was not found. Available plans: aiwg-npm.",
    );
  });

  it('fails on conflicting duplicate plan ids', async () => {
    const root = makeProject();
    writePlan(root, 'a.yaml', validPlan('same-plan'));
    writePlan(root, 'b.yaml', validPlan('same-plan'));

    await expect(discoverReleasePlans(root)).rejects.toBeInstanceOf(ReleasePlanError);
    await expect(discoverReleasePlans(root)).rejects.toThrow('duplicate plan id');
  });

  it('builds the happy-path command flow from build, gates, and post-release verification', async () => {
    const root = makeProject();
    writePlan(root, 'npm.yaml', validPlan('aiwg-npm'));

    const selected = await selectReleasePlan(root);
    const commands = buildReleasePlanExecutionFlow(selected.activePlan);

    expect(commands.map((command) => command.id)).toEqual([
      'typecheck',
      'unit-tests',
      'metadata',
      'publication-proof',
    ]);
  });

  it('validates the shipped AIWG example sidecar against the release-plan schema', () => {
    const schema = yaml.load(readFileSync(
      join(REPO_ROOT, 'agentic/code/frameworks/sdlc-complete/schemas/flows/release-plan.schema.yaml'),
      'utf8',
    ));
    const plan = yaml.load(readFileSync(join(REPO_ROOT, '.aiwg/releases/aiwg-npm.yaml'), 'utf8'));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema as Record<string, unknown>);

    expect(validate(plan), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it('validates the shipped project release config against its schema', () => {
    const schema = yaml.load(readFileSync(
      join(REPO_ROOT, 'agentic/code/frameworks/sdlc-complete/schemas/flows/release-config.yaml'),
      'utf8',
    ));
    const config = yaml.load(readFileSync(join(REPO_ROOT, '.aiwg/release.config'), 'utf8'));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema as Record<string, unknown>);

    expect(validate(config), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });
});

function validPlan(id: string, deliveryMode = 'tag-only'): string {
  return `
version: 1
id: ${id}
name: ${id}
target:
  type: package
  name: aiwg
delivery:
  mode: ${deliveryMode}
  overrides_project_default: true
build:
  commands:
    - id: typecheck
      run: npm run typecheck
    - id: unit-tests
      run: npm test
validation_gates:
  - id: metadata
    run: npm run validate-metadata
publish_targets:
  - type: npm
    package: aiwg
post_release_verification:
  - id: publication-proof
    run: aiwg show skill release-publication-verify
`;
}
