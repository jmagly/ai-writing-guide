import { describe, expect, it } from 'vitest';
import {
  chooseTrackerAccess,
  renderTrackerProtocol,
  resolveTrackerAuthority,
  type TrackerAccessProbe,
} from '../../../src/tracker/capability-protocol.js';
import type { AiwgConfig } from '../../../src/config/aiwg-config.js';

function baseConfig(): AiwgConfig {
  return {
    version: '1',
    providers: ['codex'],
    installed: {},
    scripts: {},
    remotes: {
      primary: 'origin',
      issue_tracker: 'origin',
      ci: 'origin',
      secondary: [{ name: 'github', purpose: 'backup-mirror' }],
    },
    delivery: {
      mode: 'pr-required',
      issue_storage: 'gitea-only',
    },
  };
}

describe('tracker capability protocol', () => {
  it('resolves canonical Gitea tracker from config and chooses MCP before unauthenticated tea', () => {
    const authority = resolveTrackerAuthority(baseConfig(), {
      origin: 'git@git.integrolabs.net:roctinam/aiwg.git',
      github: 'git@github.com:jmagly/aiwg.git',
    });
    const probes: TrackerAccessProbe[] = [
      { kind: 'cli', provider: 'gitea', cli: 'tea', available: true, authenticated: false },
      { kind: 'cli', provider: 'github', cli: 'gh', available: true, authenticated: true },
      { kind: 'mcp-app', provider: 'gitea', available: true, authenticated: true, label: 'Gitea MCP' },
    ];

    expect(authority.provider).toBe('gitea');
    expect(authority.issueTrackerRemote).toBe('origin');
    expect(authority.secondaryRemotes[0].name).toBe('github');
    expect(chooseTrackerAccess(authority, probes)).toEqual({
      kind: 'mcp-app',
      provider: 'gitea',
      label: 'Gitea MCP',
    });
  });

  it('blocks when only Git SSH repo access exists and no tracker write API is usable', () => {
    const authority = resolveTrackerAuthority(baseConfig(), {
      origin: 'git@git.integrolabs.net:roctinam/aiwg.git',
      github: 'git@github.com:jmagly/aiwg.git',
    });
    const decision = chooseTrackerAccess(authority, [
      { kind: 'cli', provider: 'gitea', cli: 'tea', available: true, authenticated: false },
    ]);

    expect(decision.kind).toBe('blocker');
    expect(decision.blocker).toContain('Git SSH remote access only proves repository sync');
    expect(decision.blocker).toContain('Do not file on mirror or secondary remotes');
  });

  it('uses remotes.issue_provider for ambiguous self-hosted issue tracker remotes', () => {
    const config = baseConfig();
    config.delivery = { mode: 'pr-required' };
    config.remotes = {
      primary: 'origin',
      issue_tracker: 'origin',
      ci: 'origin',
      issue_provider: 'gitea',
      secondary: [{ name: 'github', purpose: 'publish-target' }],
    };

    const authority = resolveTrackerAuthority(config, {
      origin: 'git@git.integrolabs.net:roctinam/strategy.git',
      github: 'git@github.com:jmagly/strategy.git',
    });

    expect(authority.provider).toBe('gitea');
    expect(authority.issueTrackerRemote).toBe('origin');
  });

  it('lets remotes.issue_provider override legacy delivery.issue_storage hints', () => {
    const config = baseConfig();
    config.delivery = { mode: 'pr-required', issue_storage: 'github-only' };
    config.remotes = {
      primary: 'origin',
      issue_tracker: 'local',
      ci: 'origin',
      issue_provider: 'local',
    };

    const authority = resolveTrackerAuthority(config, {
      origin: 'git@git.integrolabs.net:roctinam/strategy.git',
    });

    expect(authority.provider).toBe('local');
    expect(authority.issueTrackerRemote).toBe('local');
  });

  it('renders concise generated protocol with a direct config link', () => {
    const authority = resolveTrackerAuthority(baseConfig(), {
      origin: 'git@git.integrolabs.net:roctinam/aiwg.git',
      github: 'git@github.com:jmagly/aiwg.git',
    });
    const rendered = renderTrackerProtocol(authority);

    expect(rendered).toContain('Source of truth: [.aiwg/aiwg.config](./.aiwg/aiwg.config)');
    expect(rendered).toContain('Canonical tracker: `origin` (gitea; git@git.integrolabs.net:roctinam/aiwg.git)');
    expect(rendered).toContain('Secondary/mirror remotes: github (backup-mirror)');
    expect(rendered).toContain('Issue storage mode: gitea-only');
    expect(rendered).toContain('MCP/app tools for the configured tracker');
    expect(rendered).toContain('Git SSH remote access is repository sync, not issue-tracker API access');
  });
});
