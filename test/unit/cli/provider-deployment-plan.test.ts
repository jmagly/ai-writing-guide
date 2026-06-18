import { describe, expect, it } from 'vitest';
import type { InstalledEntry } from '../../../src/config/aiwg-config.js';
import {
  buildProviderDeploymentPlan,
  renderProviderDeploymentPlan,
} from '../../../src/cli/provider-deployment-plan.js';

function installed(providers: string[]): InstalledEntry {
  return {
    version: '2026.6.1',
    source: 'bundled',
    installedAt: '2026-06-17T00:00:00.000Z',
    deployedTo: Object.fromEntries(
      providers.map((provider) => [
        provider,
        { agents: 1, commands: 1, skills: 1, rules: 1 },
      ]),
    ),
  };
}

describe('buildProviderDeploymentPlan', () => {
  it('use mode adds missing project providers and updates installed ones', () => {
    const plan = buildProviderDeploymentPlan({
      mode: 'use',
      scope: 'project',
      requestedProviders: ['codex', 'claude'],
      projectConfig: {
        providers: ['claude'],
        installed: {
          sdlc: installed(['claude']),
        },
      },
      bundles: ['sdlc'],
      dryRun: true,
    });

    expect(plan.upgrade.action).toBe('check');
    expect(plan.items).toEqual([
      expect.objectContaining({ scope: 'project', provider: 'claude', action: 'updated' }),
      expect.objectContaining({ scope: 'project', provider: 'codex', action: 'added' }),
    ]);
  });

  it('refresh mode only touches already installed project providers', () => {
    const plan = buildProviderDeploymentPlan({
      mode: 'refresh',
      scope: 'project',
      requestedProviders: ['codex', 'claude'],
      projectConfig: {
        providers: ['claude', 'codex'],
        installed: {
          research: installed(['claude']),
        },
      },
    });

    expect(plan.upgrade.action).toBe('skip');
    expect(plan.items).toEqual([
      expect.objectContaining({ scope: 'project', provider: 'claude', action: 'refreshed' }),
      expect.objectContaining({ scope: 'project', provider: 'codex', action: 'skipped' }),
    ]);
  });

  it('update mode preserves separate project and global footprints', () => {
    const plan = buildProviderDeploymentPlan({
      mode: 'update',
      scope: 'both',
      requestedProviders: ['claude', 'codex'],
      projectConfig: {
        providers: ['claude'],
        installed: {
          sdlc: installed(['claude']),
        },
      },
      userRegistry: {
        installed: {
          research: installed(['codex']),
        },
      },
    });

    expect(plan.items).toEqual([
      expect.objectContaining({ scope: 'project', provider: 'claude', action: 'refreshed' }),
      expect.objectContaining({ scope: 'project', provider: 'codex', action: 'skipped' }),
      expect.objectContaining({ scope: 'global', provider: 'claude', action: 'skipped' }),
      expect.objectContaining({ scope: 'global', provider: 'codex', action: 'refreshed' }),
    ]);
  });

  it('use all can target all supported providers even from an empty install state', () => {
    const plan = buildProviderDeploymentPlan({
      mode: 'use',
      scope: 'both',
      supportedProviders: ['claude', 'codex', 'opencode'],
      projectConfig: { providers: [], installed: {} },
      userRegistry: { installed: {} },
    });

    expect(plan.items).toHaveLength(6);
    expect(plan.items.every((item) => item.action === 'added')).toBe(true);
    expect(plan.items.map((item) => `${item.scope}:${item.provider}`)).toEqual([
      'project:claude',
      'project:codex',
      'project:opencode',
      'global:claude',
      'global:codex',
      'global:opencode',
    ]);
  });
});

describe('renderProviderDeploymentPlan', () => {
  it('prints dry-run provider actions and upgrade preflight intent', () => {
    const plan = buildProviderDeploymentPlan({
      mode: 'use',
      scope: 'project',
      requestedProviders: ['codex'],
      projectConfig: { providers: [], installed: {} },
      bundles: ['sdlc', 'research'],
      dryRun: true,
    });

    const rendered = renderProviderDeploymentPlan(plan);

    expect(rendered).toContain('[dry-run] Provider use plan (project)');
    expect(rendered).toContain('Upgrade preflight: check');
    expect(rendered).toContain('project:codex added');
    expect(rendered).toContain('bundles=research,sdlc');
  });
});
