import { describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildVerificationProbe } from '../../../tools/cli/workspace-status.mjs';
import { buildContextFinalizationBlock } from '../../../src/smiths/context-pipeline/finalization.js';
import { buildWizardPlan, detectProviders, enforceExecutionGuards, executeWizardPlan, promptWizardOptions } from '../../../tools/cli/wizard.mjs';

describe('wizard MVP plan', () => {
  it('builds a no-write dry-run plan with all guided steps', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-wizard-'));
    try {
      fs.writeFileSync(path.join(tmp, 'package.json'), '{"name":"demo"}\n');
      const plan = buildWizardPlan({
        dryRun: true,
        json: true,
        provider: 'codex',
        framework: 'sdlc',
        goal: 'help me start a project',
        projectRoot: tmp,
      });

      expect(plan.dry_run).toBe(true);
      expect(plan.writes_files).toBe(false);
      expect(plan.non_interactive).toBe(false);
      expect(plan.recommendation.provider).toBe('codex');
      expect(plan.recommendation.framework).toBe('sdlc');
      expect(plan.project_detection.found).toBe(true);
      expect(plan.steps.map((step) => step.id)).toEqual([
        'provider',
        'project',
        'framework',
        'deploy',
        'verify',
      ]);
      expect(plan.steps.find((step) => step.id === 'verify')?.command).toBe('aiwg status --probe --json');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('detects zero, one, and multiple provider branches', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-provider-detect-'));
    try {
      expect(detectProviders(tmp, {}).status).toBe('none-detected');

      fs.mkdirSync(path.join(tmp, '.codex'), { recursive: true });
      const single = detectProviders(tmp, {});
      expect(single.status).toBe('single-detected');
      expect(single.primary).toBe('codex');

      fs.mkdirSync(path.join(tmp, '.cursor'), { recursive: true });
      const multiple = detectProviders(tmp, {});
      expect(multiple.status).toBe('multiple-detected');
      expect(multiple.primary).toBeNull();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('requires an explicit provider when multiple providers are detected interactively', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-provider-multiple-'));
    try {
      fs.mkdirSync(path.join(tmp, '.codex'), { recursive: true });
      fs.mkdirSync(path.join(tmp, '.cursor'), { recursive: true });
      const plan = buildWizardPlan({
        dryRun: false,
        json: true,
        provider: null,
        framework: 'sdlc',
        goal: '',
        projectRoot: tmp,
      });

      expect(plan.writes_files).toBe(false);
      expect(plan.provider_detection.status).toBe('multiple-detected');
      expect(plan.warnings.some((warning) => warning.severity === 'error' && /Multiple providers/.test(warning.message))).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('uses profile presets for explicit non-interactive execution plans', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-profile-'));
    try {
      const plan = buildWizardPlan({
        dryRun: false,
        json: false,
        provider: 'codex',
        framework: null,
        profile: 'research',
        nonInteractive: true,
        goal: '',
        projectRoot: tmp,
      });

      expect(plan.non_interactive).toBe(true);
      expect(plan.writes_files).toBe(true);
      expect(plan.recommendation.framework).toBe('research');
      expect(plan.deployment.args).toEqual(['use', 'research', '--provider', 'codex', '--target', tmp, '--non-interactive']);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('treats JSON wizard output as a plan-only dry run', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-wizard-json-'));
    try {
      const options = enforceExecutionGuards({
        dryRun: false,
        json: true,
        provider: 'codex',
        framework: 'sdlc',
        profile: null,
        nonInteractive: true,
        executionGuard: null,
        goal: '',
        projectRoot: tmp,
      }, { isTTY: false }, { isTTY: false });
      const plan = buildWizardPlan(options);
      let executed = false;
      const result = await executeWizardPlan(plan, {
        runCommand: async () => {
          executed = true;
          return { exitCode: 0, stdout: '', stderr: '' };
        },
      });

      expect(plan.dry_run).toBe(true);
      expect(plan.writes_files).toBe(false);
      expect(plan.warnings.some((warning) => /JSON output is plan-only/.test(warning.message))).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.deploy).toBeNull();
      expect(executed).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('requires --non-interactive before unattended wizard execution writes files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-wizard-unattended-'));
    try {
      const options = enforceExecutionGuards({
        dryRun: false,
        json: false,
        provider: 'codex',
        framework: 'sdlc',
        profile: null,
        nonInteractive: false,
        executionGuard: null,
        goal: '',
        projectRoot: tmp,
      }, { isTTY: false }, { isTTY: false });
      const plan = buildWizardPlan(options);

      expect(plan.dry_run).toBe(true);
      expect(plan.writes_files).toBe(false);
      expect(plan.warnings.some((warning) => /Unattended execution requires --non-interactive/.test(warning.message))).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('prompts for goal, provider, framework, and deploy confirmation in TTY mode', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-wizard-prompt-'));
    try {
      fs.mkdirSync(path.join(tmp, '.codex'), { recursive: true });
      fs.mkdirSync(path.join(tmp, '.cursor'), { recursive: true });
      const answers = ['organize research citations', '1', '', 'n'];
      const input = { isTTY: true };
      const output = { isTTY: true };
      const readlineInterface = {
        question: async () => answers.shift() ?? '',
        close: () => {},
      };

      const options = await promptWizardOptions({
        dryRun: false,
        json: false,
        provider: null,
        framework: null,
        profile: null,
        nonInteractive: false,
        goal: '',
        projectRoot: tmp,
      }, { input, output, readlineInterface });

      expect(options.goal).toBe('organize research citations');
      expect(options.provider).toBe('codex');
      expect(options.framework).toBe('research');
      expect(options.dryRun).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('executes deployment and verification through injectable command runner', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-wizard-exec-'));
    try {
      const plan = buildWizardPlan({
        dryRun: false,
        json: true,
        provider: 'codex',
        framework: 'sdlc',
        goal: '',
        projectRoot: tmp,
      });
      const seenArgs = [];
      const result = await executeWizardPlan(plan, {
        runCommand: async (args) => {
          seenArgs.push(args);
          fs.mkdirSync(path.join(tmp, '.aiwg', 'frameworks'), { recursive: true });
          fs.writeFileSync(
            path.join(tmp, '.aiwg', 'frameworks', 'registry.json'),
            JSON.stringify({ frameworks: { sdlc: { version: 'test', health: 'healthy' } } })
          );
          fs.mkdirSync(path.join(tmp, '.codex', 'agents'), { recursive: true });
          fs.writeFileSync(path.join(tmp, '.codex', 'agents', 'agent.md'), '# Agent\n');
          return { exitCode: 0, stdout: '', stderr: '' };
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.probe?.engaged).toBe(true);
      expect(seenArgs[0]).toEqual(['use', 'sdlc', '--provider', 'codex', '--target', tmp, '--non-interactive']);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('returns failed verification when deployment does not produce an engaged workspace', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-wizard-fail-'));
    try {
      const plan = buildWizardPlan({
        dryRun: false,
        json: true,
        provider: 'codex',
        framework: 'sdlc',
        goal: '',
        projectRoot: tmp,
      });
      const result = await executeWizardPlan(plan, {
        runCommand: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
      });

      expect(result.exitCode).toBe(1);
      expect(result.probe?.status).toBe('not-configured');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('reports obvious wrong-folder cases without writing files', () => {
    // Use '/' rather than '/tmp': both are "unsuitable" deploy roots, but the
    // world-writable /tmp can hold a stray .git on dev boxes that the bounded
    // parent walk picks up as a false project signal. '/' is reliably
    // signal-free and its walk cannot escape upward. #1629.
    const plan = buildWizardPlan({
      dryRun: true,
      json: true,
      provider: 'codex',
      framework: 'sdlc',
      goal: '',
      projectRoot: '/',
    });

    expect(plan.writes_files).toBe(false);
    expect(plan.project_detection.found).toBe(false);
    expect(plan.warnings.some((warning) => /No project detected/.test(warning.message))).toBe(true);
  });
});

describe('status verification probe', () => {
  it('returns deterministic not-configured probe data for an empty project', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-probe-empty-'));
    try {
      const probe = await buildVerificationProbe(tmp);
      expect(probe.schema).toBe('aiwg.status.probe.v1');
      expect(probe.engaged).toBe(false);
      expect(probe.status).toBe('not-configured');
      expect(probe.checks.workspace_exists).toBe(false);
      expect(probe.verification.next_command).toBe('aiwg wizard --dry-run');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('returns ready when a workspace, framework registry, and provider deployment exist', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-probe-ready-'));
    try {
      fs.mkdirSync(path.join(tmp, '.aiwg', 'frameworks'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, '.aiwg', 'frameworks', 'registry.json'),
        JSON.stringify({ frameworks: { sdlc: { version: 'test', health: 'healthy' } } })
      );
      fs.mkdirSync(path.join(tmp, '.codex', 'agents'), { recursive: true });
      fs.writeFileSync(path.join(tmp, '.codex', 'agents', 'agent.md'), '# Agent\n');

      const probe = await buildVerificationProbe(tmp);
      expect(probe.engaged).toBe(true);
      expect(probe.status).toBe('ready');
      expect(probe.checks.framework_count).toBe(1);
      expect(probe.checks.provider_deployment_count).toBe(1);
      expect(probe.verification.next_command).toBeNull();
      expect(probe.agent_response_guidance.no_attribution_default).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('reports malformed config or registry as needs-repair', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-probe-malformed-'));
    try {
      fs.mkdirSync(path.join(tmp, '.aiwg', 'frameworks'), { recursive: true });
      fs.writeFileSync(path.join(tmp, '.aiwg', 'frameworks', 'registry.json'), '{not-json');

      const probe = await buildVerificationProbe(tmp);
      expect(probe.engaged).toBe(false);
      expect(probe.status).toBe('needs-repair');
      expect(probe.checks.malformed_config).toBe(true);
      expect(probe.verification.next_command).toBe('aiwg doctor --project-local');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('engagement context guidance', () => {
  it('places natural-language AIWG engagement instructions in shared context finalization', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-context-finalization-'));
    try {
      const block = await buildContextFinalizationBlock(tmp);
      expect(block).toContain('### Engagement Verification');
      expect(block).toContain('aiwg status --probe --json');
      expect(block).toContain('Do not add AIWG attribution');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
