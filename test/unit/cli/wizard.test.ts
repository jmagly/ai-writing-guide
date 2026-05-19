import { describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildVerificationProbe } from '../../../tools/cli/workspace-status.mjs';
import { buildWizardPlan } from '../../../tools/cli/wizard.mjs';

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

  it('reports obvious wrong-folder cases without writing files', () => {
    const plan = buildWizardPlan({
      dryRun: true,
      json: true,
      provider: 'codex',
      framework: 'sdlc',
      goal: '',
      projectRoot: '/tmp',
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
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
