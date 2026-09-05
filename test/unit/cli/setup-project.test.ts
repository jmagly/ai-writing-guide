import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildSetupProjectPlan, parseSetupProjectOptions, setupHandler } from '../../../src/cli/handlers/setup.js';
import { emptyConfig, getConfigPath, writeAiwgConfig } from '../../../src/config/aiwg-config.js';

function makeTmpDir(name: string): string {
  const dir = join(tmpdir(), `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  return dir;
}

function addRemote(dir: string, name: string, url: string): void {
  execFileSync('git', ['remote', 'add', name, url], { cwd: dir });
}

function readConfig(dir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(getConfigPath(dir), 'utf-8')) as Record<string, unknown>;
}

describe('aiwg setup project', () => {
  let tmp: string;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = makeTmpDir('aiwg-setup-project');
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('normalizes the Antigravity agy selector before persistence planning', () => {
    const parsed = parseSetupProjectOptions({ args: ['--providers', 'agy'], cwd: tmp } as never);
    expect(parsed.providers).toEqual(['antigravity']);
  });

  it('builds a new-project policy from detected GitHub origin', async () => {
    addRemote(tmp, 'origin', 'https://github.com/example/project.git');

    const plan = await buildSetupProjectPlan({ projectDir: tmp, yes: true });

    expect(plan.issueProvider).toBe('github');
    expect(plan.next.remotes).toMatchObject({
      primary: 'origin',
      issue_tracker: 'origin',
      issue_provider: 'github',
      ci: 'origin',
      tracker_actor: { via: 'gh' },
    });
    expect(plan.next.delivery).toMatchObject({
      mode: 'pr-required',
      default_branch: 'master',
      require_ci_green: true,
      auto_close_issues: true,
      force_push_policy: 'never',
      committer: { name: 'Test User', email: 'test@example.com' },
    });
    expect(plan.diff).toContain('proposed project policy');
  });

  it('preserves existing config while updating delivery policy choices', async () => {
    const cfg = emptyConfig(['codex']);
    cfg.scripts = { doctor: 'aiwg doctor' };
    cfg.remotes = { primary: 'upstream', issue_tracker: 'upstream', ci: 'upstream' };
    await writeAiwgConfig(tmp, cfg);
    addRemote(tmp, 'upstream', 'https://github.com/example/project.git');

    const plan = await buildSetupProjectPlan({
      projectDir: tmp,
      deliveryMode: 'direct',
      forcePushPolicy: 'never',
      requireSignedCommits: false,
    });

    expect(plan.next.providers).toEqual(['codex']);
    expect(plan.next.scripts).toEqual({ doctor: 'aiwg doctor' });
    expect(plan.next.delivery?.mode).toBe('direct');
    expect(plan.warnings.join('\n')).toContain('Direct delivery');
  });

  it('supports self-hosted Gitea when the provider is selected explicitly', async () => {
    addRemote(tmp, 'origin', 'git@git.integrolabs.net:org/project.git');

    const plan = await buildSetupProjectPlan({
      projectDir: tmp,
      issueProvider: 'gitea',
      trackerActorLogin: 'maintainer',
    });

    expect(plan.issueProvider).toBe('gitea');
    expect(plan.next.remotes?.issue_provider).toBe('gitea');
    expect(plan.next.remotes?.tracker_actor).toEqual({ login: 'maintainer', via: 'tea' });
    expect(plan.warnings.join('\n')).toContain("Remote 'origin' is self-hosted or unknown");
  });

  it('normalizes legacy main-only-blocked force-push policy during setup repair', async () => {
    const cfg = emptyConfig(['codex']);
    cfg.remotes = { primary: 'origin', issue_tracker: 'origin', ci: 'origin' };
    cfg.delivery = {
      ...cfg.delivery,
      force_push_policy: 'main-only-blocked',
    } as typeof cfg.delivery;
    await writeAiwgConfig(tmp, cfg);
    addRemote(tmp, 'origin', 'git@git.integrolabs.net:org/project.git');

    const plan = await buildSetupProjectPlan({
      projectDir: tmp,
      dryRun: true,
      issueProvider: 'gitea',
      trackerActorLogin: 'maintainer',
    });

    expect(plan.next.delivery?.force_push_policy).toBe('own-branch-only');
    expect(plan.warnings.join('\n')).toContain('main-only-blocked is a legacy alias');
  });

  it('classifies a GitHub secondary remote as a public mirror', async () => {
    addRemote(tmp, 'origin', 'git@git.integrolabs.net:org/project.git');
    addRemote(tmp, 'github', 'https://github.com/example/project.git');

    const plan = await buildSetupProjectPlan({
      projectDir: tmp,
      issueProvider: 'gitea',
    });

    expect(plan.next.remotes?.secondary).toEqual([
      { name: 'github', purpose: 'public-mirror', push_on_release: false },
    ]);
  });

  it('configures a distinct customer issue tracker and actor', async () => {
    addRemote(tmp, 'origin', 'git@git.integrolabs.net:org/project.git');
    addRemote(tmp, 'github', 'https://github.com/example/project.git');

    const plan = await buildSetupProjectPlan({
      projectDir: tmp,
      issueProvider: 'gitea',
      customerIssueTracker: 'github',
      customerIssueProvider: 'github',
      customerTrackerActorLogin: 'customer-maintainer',
    });

    expect(plan.next.remotes).toMatchObject({
      issue_tracker: 'origin',
      issue_provider: 'gitea',
      customer_issue_tracker: 'github',
      customer_issue_provider: 'github',
      customer_tracker_actor: { login: 'customer-maintainer', via: 'gh' },
    });
  });

  it('routes issue tracking to the local issue store when initialized', async () => {
    mkdirSync(join(tmp, '.aiwg', 'issues'), { recursive: true });
    writeFileSync(join(tmp, '.aiwg', 'issues', 'config.json'), '{"provider":"local"}\n');
    addRemote(tmp, 'origin', 'https://github.com/example/project.git');

    const plan = await buildSetupProjectPlan({ projectDir: tmp });

    expect(plan.issueProvider).toBe('local');
    expect(plan.next.remotes?.issue_tracker).toBe('local');
    expect(plan.next.remotes?.issue_provider).toBe('local');
    expect(plan.warnings.join('\n')).not.toContain('Local issue store selected');
  });

  it('rejects signed-commit enforcement without signing key material', async () => {
    addRemote(tmp, 'origin', 'https://github.com/example/project.git');

    await expect(
      buildSetupProjectPlan({
        projectDir: tmp,
        requireSignedCommits: true,
        signingKey: '',
      }),
    ).rejects.toMatchObject({
      code: 'ERR_INVALID_PROJECT_SETUP',
      message: expect.stringContaining('delivery.signing.key'),
    });
  });

  it('writes with --yes and leaves files untouched in --dry-run', async () => {
    addRemote(tmp, 'origin', 'https://github.com/example/project.git');

    await setupHandler.execute({
      args: ['project', '--yes', '--dry-run'],
      rawArgs: ['setup', 'project', '--yes', '--dry-run'],
      cwd: tmp,
      frameworkRoot: tmp,
      dryRun: true,
    });
    expect(existsSync(getConfigPath(tmp))).toBe(false);

    await setupHandler.execute({
      args: ['project', '--yes'],
      rawArgs: ['setup', 'project', '--yes'],
      cwd: tmp,
      frameworkRoot: tmp,
    });
    const written = readConfig(tmp) as { remotes?: { primary?: string }; delivery?: { mode?: string } };
    expect(written.remotes?.primary).toBe('origin');
    expect(written.delivery?.mode).toBe('pr-required');
  });

  it('requires an explicit provider before unattended writes for unknown remotes', async () => {
    addRemote(tmp, 'origin', 'git@git.integrolabs.net:org/project.git');

    await expect(
      setupHandler.execute({
        args: ['project', '--yes'],
        rawArgs: ['setup', 'project', '--yes'],
        cwd: tmp,
        frameworkRoot: tmp,
      }),
    ).rejects.toMatchObject({
      code: 'ERR_PROVIDER_CONFIRMATION_REQUIRED',
    });
    expect(existsSync(getConfigPath(tmp))).toBe(false);
  });
});
