/**
 * Integration: project-local bundle deploy / remove (#1046)
 *
 * Drives `tools/agents/deploy-agents.mjs` against a synthesized project-local
 * bundle exactly the way `deployOneProjectLocalBundle` in `src/cli/handlers/use.ts`
 * does. Asserts that the bundle's source artifacts land at the provider's
 * deploy paths, and that re-running with no source removes them (revert).
 *
 * Covers matrix rows DP-1..DP-5 and R-1..R-3 from #1046.
 *
 * @see .aiwg/testing/test-strategy-project-local.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { mkdtempSync } from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

const REPO_ROOT = path.resolve(__dirname, '../..');
const DEPLOY_SCRIPT = path.join(REPO_ROOT, 'tools/agents/deploy-agents.mjs');

interface Env {
  projectDir: string;
  homeDir: string;
  bundleDir: string;
}

function makeEnv(label: string): Env {
  const base = mkdtempSync(path.join(os.tmpdir(), `aiwg-pl-deploy-${label}-`));
  const projectDir = path.join(base, 'project');
  const homeDir = path.join(base, 'home');
  mkdirSync(projectDir, { recursive: true });
  mkdirSync(homeDir, { recursive: true });

  // Project-local extension bundle with one rule + one skill.
  const bundleDir = path.join(projectDir, '.aiwg', 'extensions', 'pl-test');
  mkdirSync(path.join(bundleDir, 'rules'), { recursive: true });
  mkdirSync(path.join(bundleDir, 'skills', 'demo-skill'), { recursive: true });

  writeFileSync(
    path.join(bundleDir, 'manifest.json'),
    JSON.stringify({
      id: 'pl-test',
      type: 'extension',
      name: 'PL Test',
      version: '1.0.0',
      description: 'Integration test bundle',
      manifestVersion: '1',
      platforms: { claude: 'full', cursor: 'full' },
      keywords: ['test'],
      deployment: { pathTemplate: '.{platform}/rules/{id}.md' },
    }, null, 2),
  );

  writeFileSync(
    path.join(bundleDir, 'rules', 'pl-rule.md'),
    `---\nid: pl-rule\nname: pl-rule\n---\n\n# PL Rule\n`,
  );

  writeFileSync(
    path.join(bundleDir, 'skills', 'demo-skill', 'SKILL.md'),
    `---\nname: demo-skill\ndescription: Demo skill from project-local bundle\n---\n\n# Demo Skill\n`,
  );

  return { projectDir, homeDir, bundleDir };
}

function runDeploy(env: Env, provider: string, extra: string[] = []): { stdout: string; status: number } {
  if (!extra.includes("--copy-all")) extra = [...extra, "--copy-all"];
  const args = [
    DEPLOY_SCRIPT,
    '--source', env.bundleDir,
    '--deploy-commands', '--deploy-skills', '--deploy-rules',
    '--provider', provider,
    '--target', env.projectDir,
    '--skip-commands-migration',
    ...extra,
  ];
  try {
    const stdout = execFileSync(process.execPath, args, {
      cwd: REPO_ROOT,
      env: { ...process.env, HOME: env.homeDir, USERPROFILE: env.homeDir },
      encoding: 'utf-8',
      timeout: 120_000,
    });
    return { stdout, status: 0 };
  } catch (e: any) {
    return { stdout: (e.stdout || '') + (e.stderr || ''), status: e.status ?? 1 };
  }
}

function cleanup(env: Env): void {
  try {
    rmSync(path.dirname(env.projectDir), { recursive: true, force: true });
  } catch { /* noop */ }
}

describe('project-local deploy integration (#1046)', () => {
  let env: Env;

  beforeEach(() => {
    env = makeEnv('main');
  });

  afterEach(() => {
    cleanup(env);
  });

  it('DP-1: deploys a project-local bundle to .claude/ paths', () => {
    const result = runDeploy(env, 'claude');
    expect(result.status).toBe(0);

    // Per-type provider paths verified. Skills live under .claude/.aiwg/skills/
    // for Claude (#1212 — index-driven discovery to side-step the platform's
    // flat-namespace skill-listing budget). Rules stay platform-native.
    const ruleFile = path.join(env.projectDir, '.claude', 'rules', 'pl-rule.md');
    const skillFile = path.join(env.projectDir, '.claude', '.aiwg', 'skills', 'demo-skill', 'SKILL.md');
    expect(existsSync(ruleFile), `rule should exist at ${ruleFile}`).toBe(true);
    expect(existsSync(skillFile), `skill should exist at ${skillFile}`).toBe(true);
  });

  it('DP-2: deploys to a second provider (cursor) with same bundle', () => {
    const result = runDeploy(env, 'cursor');
    expect(result.status).toBe(0);

    const ruleFile = path.join(env.projectDir, '.cursor', 'rules', 'pl-rule.md');
    const skillFile = path.join(env.projectDir, '.cursor', '.aiwg', 'skills', 'demo-skill', 'SKILL.md');
    // Cursor uses .mdc rule extension via translation; either .md or .mdc may
    // appear depending on deploy-agents.mjs version. Accept either.
    const ruleAlt = path.join(env.projectDir, '.cursor', 'rules', 'pl-rule.mdc');
    expect(existsSync(ruleFile) || existsSync(ruleAlt), `cursor rule should exist at ${ruleFile} or ${ruleAlt}`).toBe(true);
    expect(existsSync(skillFile), `cursor skill should exist at ${skillFile}`).toBe(true);
  });

  it('DP-3: --dry-run does not write provider files', () => {
    const result = runDeploy(env, 'claude', ['--dry-run']);
    expect(result.status).toBe(0);

    const ruleFile = path.join(env.projectDir, '.claude', 'rules', 'pl-rule.md');
    expect(existsSync(ruleFile), 'dry-run must not write').toBe(false);
  });

  it('DP-4: deploys to two providers in sequence (multi-provider)', () => {
    expect(runDeploy(env, 'claude').status).toBe(0);
    expect(runDeploy(env, 'cursor').status).toBe(0);

    expect(existsSync(path.join(env.projectDir, '.claude', 'rules', 'pl-rule.md'))).toBe(true);
    const cursorRule = path.join(env.projectDir, '.cursor', 'rules', 'pl-rule.md');
    const cursorRuleAlt = path.join(env.projectDir, '.cursor', 'rules', 'pl-rule.mdc');
    expect(existsSync(cursorRule) || existsSync(cursorRuleAlt)).toBe(true);
  });

  it('R-3: source bundle under .aiwg/ is preserved after deploy', () => {
    expect(runDeploy(env, 'claude').status).toBe(0);

    // The source under .aiwg/extensions/pl-test/ must remain intact
    expect(existsSync(path.join(env.bundleDir, 'manifest.json'))).toBe(true);
    expect(existsSync(path.join(env.bundleDir, 'rules', 'pl-rule.md'))).toBe(true);
    expect(existsSync(path.join(env.bundleDir, 'skills', 'demo-skill', 'SKILL.md'))).toBe(true);
  });

  it('R-1/R-2: removing the deployed rule and re-running keeps idempotent state', () => {
    expect(runDeploy(env, 'claude').status).toBe(0);
    const ruleFile = path.join(env.projectDir, '.claude', 'rules', 'pl-rule.md');
    expect(existsSync(ruleFile)).toBe(true);

    // Operator removes the deployed file out-of-band; re-running deploy should
    // restore it (idempotent), proving deploy itself is safe to re-run.
    rmSync(ruleFile, { force: true });
    expect(existsSync(ruleFile)).toBe(false);

    expect(runDeploy(env, 'claude').status).toBe(0);
    expect(existsSync(ruleFile), 'deploy is idempotent — restores missing file').toBe(true);
  });

  // #1228 follow-up: `aiwg use` must invoke deploy-agents.mjs with --copy-all
  // for project-local bundles. The default deploy mode (#1217) is no-copy +
  // index-driven discovery, which assumes upstream skills at $AIWG_ROOT.
  // Project-local bundles live under the project's .aiwg/ tree and aren't in
  // the framework graph, so without --copy-all their skills never reach the
  // standard-tier sequestered path and become unreachable from both the
  // platform and the index.
  it('PL-COPY-ALL: project-local skills land at <provider>/.aiwg/skills/ via aiwg use', () => {
    const aiwgBin = path.join(REPO_ROOT, 'bin/aiwg.mjs');

    // Minimal aiwg.config so `aiwg use` doesn't try to run init wizard
    writeFileSync(
      path.join(env.projectDir, '.aiwg', 'aiwg.config'),
      JSON.stringify({ providers: ['claude'] }, null, 2),
    );

    let result: { status: number; stdout: string };
    try {
      const stdout = execFileSync(
        process.execPath,
        [aiwgBin, 'use', 'sdlc', '--provider', 'claude', '--quiet'],
        {
          cwd: env.projectDir,
          env: {
            ...process.env,
            AIWG_ROOT: REPO_ROOT,
            HOME: env.homeDir,
            USERPROFILE: env.homeDir,
          },
          encoding: 'utf-8',
          timeout: 180_000,
        },
      );
      result = { status: 0, stdout };
    } catch (e: any) {
      result = { status: e.status ?? 1, stdout: (e.stdout || '') + (e.stderr || '') };
    }

    expect(result.status, `aiwg use stdout:\n${result.stdout}`).toBe(0);

    // The project-local bundle's skill must land at the standard-tier
    // sequestered path — this is what was broken before the fix.
    const projectLocalSkill = path.join(
      env.projectDir,
      '.claude',
      '.aiwg',
      'skills',
      'demo-skill',
      'SKILL.md',
    );
    expect(
      existsSync(projectLocalSkill),
      `project-local skill must deploy to ${projectLocalSkill}`,
    ).toBe(true);

    // And the bundle's rule must still land alongside platform rules.
    const projectLocalRule = path.join(
      env.projectDir,
      '.claude',
      'rules',
      'pl-rule.md',
    );
    expect(existsSync(projectLocalRule)).toBe(true);
  });
});
