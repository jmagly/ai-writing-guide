import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
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
import { PROJECT_AIWG_LOCATION_FILE, projectAiwgPath } from '../../../src/config/project-artifacts.js';

let tempDir: string | undefined;
const REPO_ROOT = resolve(__dirname, '../../..');
const ARTIFACT_ENV_KEYS = [
  'AIWG_ARTIFACTS_PATH',
  'AIWG_PROJECT_ARTIFACTS_PATH',
  'AIWG_PROJECT_AIWG_DIR',
] as const;
let previousArtifactEnv: Record<(typeof ARTIFACT_ENV_KEYS)[number], string | undefined>;

beforeEach(() => {
  previousArtifactEnv = {
    AIWG_ARTIFACTS_PATH: process.env.AIWG_ARTIFACTS_PATH,
    AIWG_PROJECT_ARTIFACTS_PATH: process.env.AIWG_PROJECT_ARTIFACTS_PATH,
    AIWG_PROJECT_AIWG_DIR: process.env.AIWG_PROJECT_AIWG_DIR,
  };
  for (const key of ARTIFACT_ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
  for (const key of ARTIFACT_ENV_KEYS) {
    const value = previousArtifactEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function makeProject(): string {
  tempDir = mkdtempSync(join(tmpdir(), 'aiwg-release-plan-'));
  mkdirSync(projectAiwgPath(tempDir, 'releases'), { recursive: true });
  return tempDir;
}

function writePlan(root: string, name: string, body: string): void {
  writeFileSync(projectAiwgPath(root, 'releases', name), body, 'utf8');
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

  it('discovers plans from a configured artifact root pointer', async () => {
    const root = makeProject();
    const artifactRoot = join(root, 'private-artifacts', 'renamed-aiwg');
    mkdirSync(join(artifactRoot, 'releases'), { recursive: true });
    writeFileSync(join(root, PROJECT_AIWG_LOCATION_FILE), 'private-artifacts/renamed-aiwg\n', 'utf8');
    writeFileSync(join(artifactRoot, 'releases', 'npm.yaml'), validPlan('aiwg-npm'), 'utf8');

    const plans = await discoverReleasePlans(root);

    expect(plans.map(({ plan }) => plan.id)).toEqual(['aiwg-npm']);
    expect(plans[0].path).toBe(join(artifactRoot, 'releases', 'npm.yaml'));
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
    const planPath = join(
      REPO_ROOT,
      'agentic/code/frameworks/sdlc-complete/schemas/flows/examples/aiwg-npm.release-plan.yaml',
    );
    const plan = yaml.load(readFileSync(planPath, 'utf8'));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema as Record<string, unknown>);

    expect(validate(plan), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it('validates the shipped AIWG release config example against its schema', () => {
    const schema = yaml.load(readFileSync(
      join(REPO_ROOT, 'agentic/code/frameworks/sdlc-complete/schemas/flows/release-config.yaml'),
      'utf8',
    ));
    const configPath = join(
      REPO_ROOT,
      'agentic/code/frameworks/sdlc-complete/schemas/flows/examples/aiwg.release.config.yaml',
    );
    const config = yaml.load(readFileSync(configPath, 'utf8'));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema as Record<string, unknown>);

    expect(validate(config), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it('requires stable GitHub discussion verification in the shipped release plan', () => {
    const planPath = join(
      REPO_ROOT,
      'agentic/code/frameworks/sdlc-complete/schemas/flows/examples/aiwg-npm.release-plan.yaml',
    );
    const plan = yaml.load(readFileSync(planPath, 'utf8')) as {
      post_release_verification?: Array<Record<string, unknown>>;
    };
    const discussion = plan.post_release_verification
      ?.find(({ id }) => id === 'github-announcement-discussion');

    expect(discussion).toEqual({
      id: 'github-announcement-discussion',
      run: 'node tools/release/verify-github-release-discussion.mjs --version {version}',
      expect_exit: 0,
      required_for_channels: ['stable'],
      skip_when_flag: '--no-mirror',
    });
  });

  it('keeps the stable GitHub announcement discussion contract in the shipped release config', () => {
    const configPath = join(
      REPO_ROOT,
      'agentic/code/frameworks/sdlc-complete/schemas/flows/examples/aiwg.release.config.yaml',
    );
    const config = yaml.load(readFileSync(configPath, 'utf8')) as {
      gates: Array<{
        name: string;
        actions?: Array<{
          create_github_announcement_discussion?: {
            category: string;
            required_for_channels: string[];
            hard_stop: boolean;
            skip_when_flag: string;
            links: string[];
            style: string;
          };
        }>;
      }>;
    };
    const postRelease = config.gates.find((gate) => gate.name === 'post-release');
    const discussion = postRelease?.actions
      ?.find((action) => action.create_github_announcement_discussion)
      ?.create_github_announcement_discussion;

    expect(discussion).toEqual({
      category: 'Announcements',
      required_for_channels: ['stable'],
      hard_stop: true,
      skip_when_flag: '--no-mirror',
      links: ['github_release', 'npm_version', 'release_notes', 'changelog'],
      style: 'conversational-impact-guidance',
    });
  });

  it('validates the active project release config when one is attached', () => {
    const schema = yaml.load(readFileSync(
      join(REPO_ROOT, 'agentic/code/frameworks/sdlc-complete/schemas/flows/release-config.yaml'),
      'utf8',
    ));
    const configPath = projectAiwgPath(REPO_ROOT, 'release.config');
    if (!existsSync(configPath)) return;
    const config = yaml.load(readFileSync(configPath, 'utf8'));
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
