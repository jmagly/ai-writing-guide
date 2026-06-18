import type { AiwgConfig, InstalledEntry } from '../config/aiwg-config.js';
import type { UserRegistry } from '../config/user-registry.js';

export type ProviderDeploymentMode = 'use' | 'refresh' | 'update';
export type ProviderDeploymentScope = 'project' | 'global' | 'both';
export type ProviderDeploymentAction = 'added' | 'updated' | 'refreshed' | 'skipped' | 'failed';

export interface ProviderUpgradePlan {
  action: 'check' | 'skip';
  reason: string;
}

export interface ProviderDeploymentPlanRequest {
  mode: ProviderDeploymentMode;
  scope: ProviderDeploymentScope;
  requestedProviders?: string[];
  supportedProviders?: string[];
  projectConfig?: Pick<AiwgConfig, 'providers' | 'installed'> | null;
  userRegistry?: Pick<UserRegistry, 'installed'> | null;
  bundles?: string[];
  dryRun?: boolean;
  interactive?: boolean;
}

export interface ProviderDeploymentPlanItem {
  scope: Exclude<ProviderDeploymentScope, 'both'>;
  provider: string;
  action: ProviderDeploymentAction;
  reason: string;
  bundles: string[];
}

export interface ProviderDeploymentPlan {
  mode: ProviderDeploymentMode;
  scope: ProviderDeploymentScope;
  dryRun: boolean;
  interactive: boolean;
  upgrade: ProviderUpgradePlan;
  items: ProviderDeploymentPlanItem[];
}

const DEFAULT_PROVIDER = 'claude';

function normalizeUnique(values: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  for (const value of values ?? []) {
    const normalized = value.trim();
    if (normalized.length > 0) seen.add(normalized);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

function deployedProviders(installed: Record<string, InstalledEntry> | undefined): string[] {
  const providers = new Set<string>();
  for (const entry of Object.values(installed ?? {})) {
    for (const provider of Object.keys(entry.deployedTo ?? {})) {
      if (provider.trim().length > 0) providers.add(provider);
    }
  }
  return [...providers].sort((a, b) => a.localeCompare(b));
}

function projectCandidates(request: ProviderDeploymentPlanRequest): string[] {
  const requested = normalizeUnique(request.requestedProviders);
  if (requested.length > 0) return requested;

  const supported = normalizeUnique(request.supportedProviders);
  if (request.mode === 'use' && supported.length > 0) return supported;

  const configured = normalizeUnique(request.projectConfig?.providers);
  if (request.mode === 'use' && configured.length > 0) return configured;

  const installed = deployedProviders(request.projectConfig?.installed);
  if (installed.length > 0) return installed;

  return request.mode === 'use' ? [DEFAULT_PROVIDER] : [];
}

function globalCandidates(request: ProviderDeploymentPlanRequest): string[] {
  const requested = normalizeUnique(request.requestedProviders);
  if (requested.length > 0) return requested;

  const supported = normalizeUnique(request.supportedProviders);
  if (request.mode === 'use' && supported.length > 0) return supported;

  const installed = deployedProviders(request.userRegistry?.installed);
  if (installed.length > 0) return installed;

  return request.mode === 'use' ? [DEFAULT_PROVIDER] : [];
}

function scopesFor(scope: ProviderDeploymentScope): Array<Exclude<ProviderDeploymentScope, 'both'>> {
  if (scope === 'both') return ['project', 'global'];
  return [scope];
}

function planScope(
  request: ProviderDeploymentPlanRequest,
  scope: Exclude<ProviderDeploymentScope, 'both'>,
): ProviderDeploymentPlanItem[] {
  const candidates = scope === 'project' ? projectCandidates(request) : globalCandidates(request);
  const installed = scope === 'project'
    ? deployedProviders(request.projectConfig?.installed)
    : deployedProviders(request.userRegistry?.installed);
  const installedSet = new Set(installed);
  const bundles = normalizeUnique(request.bundles);

  return candidates.map((provider) => {
    const hasProvider = installedSet.has(provider);

    if (request.mode === 'use') {
      return {
        scope,
        provider,
        action: hasProvider ? 'updated' : 'added',
        reason: hasProvider
          ? 'provider already has an AIWG deployment in this scope'
          : 'use mode expands the selected scope to this provider',
        bundles,
      };
    }

    if (!hasProvider) {
      return {
        scope,
        provider,
        action: 'skipped',
        reason: 'refresh/update mode only acts on providers already installed in this scope',
        bundles,
      };
    }

    return {
      scope,
      provider,
      action: 'refreshed',
      reason: 'provider already has an AIWG deployment in this scope',
      bundles,
    };
  });
}

export function buildProviderDeploymentPlan(request: ProviderDeploymentPlanRequest): ProviderDeploymentPlan {
  const dryRun = request.dryRun ?? false;
  const interactive = request.interactive ?? false;
  const mode = request.mode;
  const items = scopesFor(request.scope).flatMap((scope) => planScope(request, scope));

  return {
    mode,
    scope: request.scope,
    dryRun,
    interactive,
    upgrade: {
      action: mode === 'use' ? 'check' : 'skip',
      reason: mode === 'use'
        ? 'use mode performs stale-installed CLI preflight before provider deployment'
        : 'refresh/update mode preserves the existing provider footprint',
    },
    items,
  };
}

export function renderProviderDeploymentPlan(plan: ProviderDeploymentPlan): string {
  const header = `${plan.dryRun ? '[dry-run] ' : ''}Provider ${plan.mode} plan (${plan.scope})`;
  const lines = [
    header,
    `Upgrade preflight: ${plan.upgrade.action} - ${plan.upgrade.reason}`,
  ];

  if (plan.items.length === 0) {
    lines.push('No provider deployments selected.');
    return lines.join('\n');
  }

  for (const item of plan.items) {
    const bundleText = item.bundles.length > 0 ? ` bundles=${item.bundles.join(',')}` : '';
    lines.push(`- ${item.scope}:${item.provider} ${item.action} - ${item.reason}${bundleText}`);
  }

  return lines.join('\n');
}
