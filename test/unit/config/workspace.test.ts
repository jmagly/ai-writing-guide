import { execFileSync } from 'child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { AiwgConfig } from '../../../src/config/aiwg-config.js';
import {
  authorizeWorkspaceOperation,
  checkTrackerActor,
  findWorkspaceProjectRoot,
  resolveWorkspace,
  resolveWorkspaceMember,
} from '../../../src/config/workspace.js';
import {
  checkRepoAccess,
  loadRepoAccessManifest,
} from '../../../src/policy/repo-access.js';

function baseConfig(overrides: Partial<AiwgConfig> = {}): AiwgConfig {
  return {
    version: '1',
    providers: ['codex'],
    installed: {},
    scripts: {},
    ...overrides,
  };
}

async function writeConfig(repoPath: string, config: AiwgConfig): Promise<void> {
  await fs.mkdir(path.join(repoPath, '.aiwg'), { recursive: true });
  await fs.writeFile(
    path.join(repoPath, '.aiwg', 'aiwg.config'),
    `${JSON.stringify(config, null, 2)}\n`,
  );
}

function initRemote(repoPath: string, name: string, url: string): void {
  execFileSync('git', ['init', '-q', repoPath]);
  execFileSync('git', ['-C', repoPath, 'remote', 'add', name, url]);
}

describe('workspace repository resolution', () => {
  let tmpDir: string;
  let workspaceDir: string;
  let githubRepo: string;
  let externalRepo: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-workspace-'));
    workspaceDir = path.join(tmpDir, 'home');
    githubRepo = path.join(workspaceDir, 'widget');
    externalRepo = path.join(tmpDir, 'external-sysops');
    await fs.mkdir(githubRepo, { recursive: true });
    await fs.mkdir(externalRepo, { recursive: true });

    initRemote(githubRepo, 'origin', 'git@github.com:example/widget.git');
    initRemote(externalRepo, 'primary', 'ssh://git@gitea.example.net/ops/sysops.git');
    initRemote(externalRepo, 'tickets', 'https://gitlab.example.net/ops/sysops.git');

    await writeConfig(workspaceDir, baseConfig({
      workspace: { name: 'home' },
      repos: [
        {
          name: 'widget',
          path: './widget',
          allowed: ['read', 'write', 'commit', 'push', 'issue-comment'],
        },
        {
          name: 'sysops',
          path: externalRepo,
          allowed: ['read', 'issue-comment'],
        },
      ],
    }));

    await writeConfig(githubRepo, baseConfig({
      remotes: {
        primary: 'origin',
        issue_tracker: 'origin',
        tracker_actor: {
          login: 'widget-maintainer',
          via: 'gh',
          forbid_actors: ['shared-bot'],
        },
      },
      delivery: {
        mode: 'pr-required',
        default_branch: 'main',
        signing: { format: 'ssh', key: 'widget-key', enforce: 'commits' },
      },
    }));

    await writeConfig(externalRepo, baseConfig({
      workspace: { member_of: '../home' },
      remotes: {
        primary: 'primary',
        issue_tracker: 'tickets',
        tracker_actor: {
          login: 'ops-maintainer',
          via: 'tea',
          forbid_actors: ['shared-bot'],
        },
      },
      delivery: {
        mode: 'direct',
        default_branch: 'trunk',
        signing: { format: 'openpgp', key: 'ops-key', enforce: 'all' },
      },
    }));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('resolves child and absolute members from one manifest', async () => {
    const workspace = await resolveWorkspace(workspaceDir);

    expect(workspace.name).toBe('home');
    expect(workspace.members.map((member) => member.path)).toEqual([
      githubRepo,
      externalRepo,
    ]);
  });

  it('uses each member config for delivery, remotes, actors, and signing', async () => {
    const workspace = await resolveWorkspace(workspaceDir);
    const widget = workspace.members.find((member) => member.name === 'widget');
    const sysops = workspace.members.find((member) => member.name === 'sysops');

    expect(widget?.delivery.mode).toBe('pr-required');
    expect(widget?.delivery.signing?.key).toBe('widget-key');
    expect(widget?.remotes.tracker_actor?.login).toBe('widget-maintainer');
    expect(widget?.primary).toMatchObject({
      provider: 'github',
      domain: 'github.com',
      providerSource: 'remote',
    });

    expect(sysops?.delivery.mode).toBe('direct');
    expect(sysops?.delivery.default_branch).toBe('trunk');
    expect(sysops?.delivery.signing?.key).toBe('ops-key');
    expect(sysops?.remotes.tracker_actor?.login).toBe('ops-maintainer');
    expect(sysops?.primary).toMatchObject({
      provider: 'gitea',
      domain: 'gitea.example.net',
      providerSource: 'remote',
    });
    expect(sysops?.issueTracker).toMatchObject({
      name: 'tickets',
      provider: 'gitlab',
      domain: 'gitlab.example.net',
    });
  });

  it('uses remotes.issue_provider for ambiguous self-hosted issue trackers', async () => {
    execFileSync('git', ['-C', externalRepo, 'remote', 'set-url', 'tickets', 'git@git.integrolabs.net:ops/sysops.git']);
    await writeConfig(externalRepo, baseConfig({
      workspace: { member_of: '../home' },
      remotes: {
        primary: 'primary',
        issue_tracker: 'tickets',
        issue_provider: 'gitea',
        tracker_actor: {
          login: 'ops-maintainer',
          via: 'tea',
        },
      },
    }));

    const workspace = await resolveWorkspace(workspaceDir);
    const sysops = workspace.members.find((member) => member.name === 'sysops');

    expect(sysops?.issueTracker).toMatchObject({
      name: 'tickets',
      provider: 'gitea',
      domain: 'git.integrolabs.net',
      providerSource: 'manifest-hint',
    });
    expect(sysops?.drift).not.toContain("issue tracker provider is unknown for 'git.integrolabs.net'");
  });

  it('discovers an external workspace through member_of', async () => {
    expect(await findWorkspaceProjectRoot(externalRepo)).toBe(workspaceDir);

    const { member } = await resolveWorkspaceMember(externalRepo);
    expect(member?.name).toBe('sysops');

    const manifest = loadRepoAccessManifest(externalRepo);
    expect(manifest.workspaceProjectRoot).toBe(workspaceDir);
    expect(checkRepoAccess(manifest, externalRepo, 'issue-comment', externalRepo).allowed)
      .toBe(true);
  });

  it('intersects operations with workspace capabilities and denies unlisted paths', async () => {
    const allowed = await authorizeWorkspaceOperation(
      workspaceDir,
      externalRepo,
      'issue-comment',
    );
    const denied = await authorizeWorkspaceOperation(
      workspaceDir,
      externalRepo,
      'push',
    );
    const unlisted = await authorizeWorkspaceOperation(
      workspaceDir,
      path.join(tmpDir, 'other'),
      'write',
    );

    expect(allowed.allowed).toBe(true);
    expect(denied).toMatchObject({ allowed: false, reason: "repo 'sysops' does not allow push" });
    expect(unlisted).toMatchObject({ allowed: false, member: null });
  });

  it('enforces tracker actor and forbid_actors from the member config', async () => {
    const workspace = await resolveWorkspace(workspaceDir);
    const sysops = workspace.members.find((member) => member.name === 'sysops');
    expect(sysops).toBeDefined();

    expect(checkTrackerActor(sysops!, 'ops-maintainer').allowed).toBe(true);
    expect(checkTrackerActor(sysops!, 'shared-bot')).toMatchObject({
      allowed: false,
      actor: 'shared-bot',
    });
    expect(checkTrackerActor(sysops!, 'someone-else').allowed).toBe(false);
  });
});
