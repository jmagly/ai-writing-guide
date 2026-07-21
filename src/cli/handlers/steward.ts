/**
 * Steward Command Handler
 *
 * Provider capability awareness and command routing intelligence for the AIWG Steward.
 * Reads the canonical capability matrix and answers:
 *   - What does my current provider support natively?
 *   - What command should I use for feature X?
 *   - Which providers support feature Y?
 *
 * Subcommands:
 *   aiwg steward capabilities --provider <name>   Show capabilities for a provider
 *   aiwg steward capabilities --feature <name>    Show provider support for a feature
 *   aiwg steward capabilities --all               Full capability matrix
 *   aiwg steward find --capability <name>         Routing advice for current provider
 *
 * @source @src/cli/router.ts
 * @issue #599 #1261 #1262
 */

import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { AiwgError, EXIT_CODES, handlerResultFromError } from '../errors.js';
import {
  loadCapabilityMatrix,
  type CapabilityMatrix,
  type ProviderCapabilities,
  type FeatureKey,
} from '../../providers/capability-matrix.js';
import { getProjectDir, readAiwgConfig, writeAiwgConfig } from '../../config/aiwg-config.js';
import {
  auditLegacyPermissions,
  archiveLegacyPermissionManifests,
  backupConfig,
  normalizeProjectPermissions,
} from '../../policy/authorization.js';
import { capabilityProviderId, normalizeProviderId, resolveActiveProvider } from '../provider-resolution.js';
import {
  discoverProjectLocalBundles,
  type ProjectLocalBundle,
} from '../../extensions/project-local-discovery.js';
import { routeModelTier } from '../../models/router.js';
import { buildWrapperRouteEnvelope, type RoutedCapabilityType } from '../../models/wrapper-route.js';
import {
  loadProviderModelCatalog,
  type ProviderModelCatalog,
} from '../../models/provider-policy.js';
import {
  CapabilityResolutionError,
  resolveRoutableCapability,
} from '../../artifacts/capability-resolver.js';

const BASELINE_PROVIDER = 'claude-code';

interface ResolvedStewardProvider {
  id: string;
  provider: ProviderCapabilities;
  projectLocal?: {
    id: string;
    baseAdapter: string;
  };
}

// ── Feature name normalization ────────────────────────────────────────────────

/**
 * Accept both hyphenated (agent-teams) and underscored (agent_teams) feature
 * names; the canonical YAML keys use underscores.
 */
function normalizeFeatureKey(input: string): string {
  return input.trim().toLowerCase().replace(/-/g, '_');
}

// ── Detect current provider ────────────────────────────────────────────────────

async function detectProvider(ctx?: HandlerContext): Promise<string | null> {
  const resolution = await resolveActiveProvider({
    cwd: ctx ? getProjectDir(ctx, ctx.args) : process.cwd(),
    detectProcess: true,
  });
  return capabilityProviderId(resolution.provider);
}

// ── Formatters ────────────────────────────────────────────────────────────────

const NATIVE_MARK = '✓ native';
const EMULATED_MARK = '~ emulated';
const UNSUPPORTED_MARK = '- not supported';

function emulationLabel(strategy: string | null): string {
  if (!strategy) return 'none';
  if (strategy === 'native') return 'native (no fallback needed)';
  return strategy;
}

function formatProvider(
  id: string,
  provider: ProviderCapabilities,
  matrix: CapabilityMatrix,
  meta?: ResolvedStewardProvider['projectLocal'],
): string {
  const lines: string[] = [];
  lines.push(`\n  Provider: ${provider.display_name} (${id})`);
  if (meta) {
    lines.push(`  Project-local: yes`);
    lines.push(`  Base adapter:   ${meta.baseAdapter}`);
  }
  lines.push(`  Status:   ${provider.status}`);
  lines.push(`  Daemon:   ${provider.daemon_tier}${provider.daemon_pty_adapter ? ' (+ pty-adapter)' : ''}`);
  lines.push(`  ${'─'.repeat(60)}`);

  const featureKeys = Object.keys(matrix.features) as FeatureKey[];
  for (const featureId of featureKeys) {
    const isNative = provider.native_features?.[featureId] === true;
    const emulation = provider.emulation?.[featureId] ?? null;
    const status = isNative ? NATIVE_MARK : (emulation ? EMULATED_MARK : UNSUPPORTED_MARK);
    const feat = matrix.features[featureId];

    lines.push(`\n  ${featureId} — ${status}`);
    if (feat?.description) lines.push(`    ${feat.description}`);
    if (isNative) {
      if (feat?.native_example) lines.push(`    example: ${feat.native_example}`);
    } else if (emulation) {
      lines.push(`    fallback: ${emulationLabel(emulation)}`);
    }
  }
  return lines.join('\n');
}

async function findProjectLocalProvider(
  projectDir: string,
  requestedProvider: string,
): Promise<ProjectLocalBundle | undefined> {
  const discovery = await discoverProjectLocalBundles(projectDir);
  const requested = requestedProvider.trim().toLowerCase();
  return discovery.bundles.find((bundle) => {
    if (bundle.type !== 'provider') return false;
    const config = bundle.manifest.providerConfig;
    return bundle.id === requested || config?.aliases?.some((alias) => alias.toLowerCase() === requested);
  });
}

async function resolveStewardProvider(
  matrix: CapabilityMatrix,
  requestedProvider: string,
  ctx?: HandlerContext,
): Promise<ResolvedStewardProvider | null> {
  const normalizedProvider = normalizeProviderId(requestedProvider);
  const builtInCapabilityId = capabilityProviderId(normalizedProvider);
  if (builtInCapabilityId && matrix.providers[builtInCapabilityId]) {
    return {
      id: builtInCapabilityId,
      provider: matrix.providers[builtInCapabilityId],
    };
  }

  const projectDir = ctx ? getProjectDir(ctx, ctx.args) : process.cwd();
  const bundle = await findProjectLocalProvider(projectDir, requestedProvider);
  const providerConfig = bundle?.manifest.providerConfig;
  if (!bundle || !providerConfig) return null;

  const baseCapabilityId = capabilityProviderId(normalizeProviderId(providerConfig.extends)) ?? providerConfig.extends;
  const baseProvider = matrix.providers[baseCapabilityId];
  if (!baseProvider) return null;

  const overrides = providerConfig.capabilities;
  const provider: ProviderCapabilities = {
    ...baseProvider,
    display_name: providerConfig.displayName ?? bundle.manifest.name ?? bundle.id,
    aliases: providerConfig.aliases,
    native_features: {
      ...baseProvider.native_features,
      ...(overrides?.nativeFeatures ?? {}),
    },
    emulation: {
      ...baseProvider.emulation,
      ...(overrides?.emulation ?? {}),
    },
  };

  return {
    id: bundle.id,
    provider,
    projectLocal: {
      id: bundle.id,
      baseAdapter: providerConfig.extends,
    },
  };
}

function printFullMatrix(matrix: CapabilityMatrix): void {
  const { providers, features } = matrix;
  const providerIds = Object.keys(providers);
  const featureIds = Object.keys(features) as FeatureKey[];

  console.log(`\n  Provider Capability Matrix (v${matrix.version})`);
  console.log(`  ✓ = native   ~ = AIWG emulation   - = not supported\n`);

  const featureColW = 20;
  const provColW = 14;
  const header = '  ' + 'Feature'.padEnd(featureColW) + providerIds.map(p => p.padEnd(provColW)).join('');
  console.log(header);
  console.log('  ' + '─'.repeat(featureColW + providerIds.length * provColW));

  for (const featureId of featureIds) {
    const feat = features[featureId];
    let row = '  ' + featureId.padEnd(featureColW);
    for (const providerId of providerIds) {
      const provider = providers[providerId];
      const isNative = provider?.native_features?.[featureId] === true;
      const emulation = provider?.emulation?.[featureId] ?? null;
      const mark = isNative ? '✓' : (emulation ? '~' : '-');
      row += mark.padEnd(provColW);
    }
    console.log(row);
    if (feat?.description) {
      console.log('  ' + ' '.repeat(featureColW) + feat.description);
    }
    console.log('');
  }
}

// ── Main execution ─────────────────────────────────────────────────────────────

async function handleSteward(args: string[], ctx?: HandlerContext): Promise<void> {
  const subcommand = args[0];

  if (!subcommand || subcommand === '--help' || subcommand === 'help') {
    console.log(`
  aiwg steward — Provider capability awareness and command routing

  Usage:
    aiwg steward capabilities --provider <name>   Capabilities for a specific provider
    aiwg steward capabilities --feature <name>    Provider support matrix for a feature
    aiwg steward capabilities --all               Full matrix (all providers x features)
    aiwg steward find --capability <name>         Routing advice for your current provider
    aiwg steward models [--complex|--high-impact] Model policy/discovery routing advice
    aiwg steward models --route --capability-type <agent|skill|rule|workflow>
      --capability <id> --assignment <text> [--provider <name>] [--json]
                                                  Emit a capability-bound wrapper launch envelope
    aiwg steward permissions audit                Find normalized-model errors and legacy grants
    aiwg steward permissions migrate --dry-run    Preview legacy permission normalization
    aiwg steward permissions migrate --apply      Back up and atomically normalize config

  Providers:
    claude-code, codex, copilot, cursor, factory, opencode, warp, windsurf, hermes, openclaw

  Features:
    cron, agent_teams, tasks, mcp, behaviors, mission_control, daemon
    (hyphens accepted: agent-teams → agent_teams)

  Models:
    Use aiwg models sources|refresh for effective catalogs, audit|resolve for
    provider-compiled role/tier policy, and cheap-first defaults unless policy
    or human rationale escalates.
`);
    return;
  }

  if (subcommand === 'permissions') {
    const operation = args[1];
    const projectDir = ctx ? getProjectDir(ctx, args) : process.cwd();
    const config = await readAiwgConfig(projectDir);
    if (!config) throw new AiwgError({
      code: 'ERR_CONFIG_NOT_FOUND',
      message: `No .aiwg/aiwg.config found in ${projectDir}`,
      exitCode: EXIT_CODES.CONFIG,
    });
    if (operation === 'audit') {
      const diagnostics = await auditLegacyPermissions(projectDir, config);
      if (!diagnostics.length) console.log('  ✓ Permission model is normalized and valid.');
      for (const item of diagnostics) console.log(`  ${item.severity === 'error' ? '✗' : item.severity === 'warning' ? '⚠' : '·'} [${item.code}] ${item.message}${item.source ? ` (${item.source})` : ''}`);
      if (diagnostics.some(item => item.severity === 'error')) throw new AiwgError({
        code: 'ERR_AUTHORIZATION_INVALID',
        message: 'Normalized permission model has errors.',
        hint: 'Correct the reported references; authorization remains fail-closed.',
        exitCode: EXIT_CODES.CONFIG,
      });
      return;
    }
    if (operation === 'migrate') {
      const apply = args.includes('--apply');
      const dryRun = args.includes('--dry-run');
      if (apply === dryRun) throw new AiwgError({
        code: 'ERR_USAGE_PERMISSION_MIGRATION_MODE',
        message: 'Choose exactly one of --dry-run or --apply.',
        exitCode: EXIT_CODES.USAGE,
      });
      const normalized = await normalizeProjectPermissions(projectDir, config);
      if (normalized === config) {
        console.log('  ✓ Permission model is already normalized; no changes needed.');
        return;
      }
      const diagnostics = await auditLegacyPermissions(projectDir, config);
      console.log(`  ${dryRun ? 'Would normalize' : 'Normalizing'} ${diagnostics.filter(d => d.code.startsWith('legacy-')).length} legacy permission source(s).`);
      console.log(`  Result: ${Object.keys(normalized.authorization?.permissions ?? {}).length} permissions, ${Object.keys(normalized.authorization?.roles ?? {}).length} roles, ${normalized.authorization?.assignments.length ?? 0} assignments; default deny.`);
      if (apply) {
        const backup = await backupConfig(projectDir);
        await writeAiwgConfig(projectDir, normalized);
        const archived = await archiveLegacyPermissionManifests(projectDir);
        console.log(`  ✓ Migration applied atomically. Backup: ${backup}`);
        if (archived.length) console.log(`  ✓ Archived legacy manifests: ${archived.join(', ')}`);
      }
      return;
    }
    throw new AiwgError({
      code: 'ERR_USAGE_UNKNOWN_PERMISSION_OPERATION',
      message: `Unknown permissions operation: ${operation ?? '(missing)'}`,
      hint: 'Use audit or migrate --dry-run|--apply.',
      exitCode: EXIT_CODES.USAGE,
    });
  }

  const matrix = loadCapabilityMatrix();

  if (subcommand === 'capabilities') {
    const providerFlag = args.indexOf('--provider');
    const featureFlag = args.indexOf('--feature');
    const allFlag = args.includes('--all');

    if (allFlag) {
      printFullMatrix(matrix);
      return;
    }

    if (providerFlag >= 0) {
      const requestedProvider = args[providerFlag + 1];
      if (!requestedProvider) throw new AiwgError({
        code: 'ERR_USAGE_MISSING_VALUE',
        message: '--provider requires a provider name',
        hint: 'Example: aiwg steward capabilities --provider claude-code',
        exitCode: EXIT_CODES.USAGE,
      });
      const resolved = await resolveStewardProvider(matrix, requestedProvider, ctx);
      if (!resolved) {
        const known = Object.keys(matrix.providers).join(', ');
        throw new AiwgError({
          code: 'ERR_USAGE_UNKNOWN_PROVIDER',
          message: `Unknown provider: ${requestedProvider}`,
          hint: `Known providers: ${known}. Project-local providers must live under .aiwg/providers/<id>/manifest.json.`,
          exitCode: EXIT_CODES.USAGE,
        });
      }
      console.log(formatProvider(resolved.id, resolved.provider, matrix, resolved.projectLocal));
      return;
    }

    if (featureFlag >= 0) {
      const rawFeatureId = args[featureFlag + 1];
      if (!rawFeatureId) throw new AiwgError({
        code: 'ERR_USAGE_MISSING_VALUE',
        message: '--feature requires a feature name',
        hint: "Example: aiwg steward capabilities --feature cron",
        exitCode: EXIT_CODES.USAGE,
      });
      const featureId = normalizeFeatureKey(rawFeatureId);
      const feat = matrix.features[featureId as FeatureKey];
      if (!feat) {
        const known = Object.keys(matrix.features).join(', ');
        throw new AiwgError({
          code: 'ERR_USAGE_UNKNOWN_FEATURE',
          message: `Unknown feature: ${rawFeatureId}`,
          hint: `Known features: ${known}`,
          exitCode: EXIT_CODES.USAGE,
        });
      }

      console.log(`\n  Feature: ${featureId}`);
      if (feat.description) console.log(`  ${feat.description}`);
      if (feat.native_example) console.log(`  Native example: ${feat.native_example}`);
      console.log(`\n  Provider support:\n`);

      for (const [providerId, provider] of Object.entries(matrix.providers)) {
        const isNative = provider.native_features?.[featureId as FeatureKey] === true;
        const emulation = provider.emulation?.[featureId as FeatureKey] ?? null;
        const status = isNative
          ? `✓ native`
          : (emulation ? `~ emulated (${emulationLabel(emulation)})` : `- not supported`);
        console.log(`    ${provider.display_name.padEnd(20)} (${providerId.padEnd(12)}) ${status}`);
      }
      console.log('');
      return;
    }

    // No flag — show current provider
    const detected = await detectProvider(ctx);
    if (!detected) {
      console.log(`  Could not detect active provider. Specify with --provider <name>.`);
      console.log(`  Detection checks explicit env, runtime markers, process ancestry, and unambiguous project config.`);
      console.log(`  Run 'aiwg runtime-info' to verify provider detection.`);
      return;
    }
    const provider = matrix.providers[detected];
    if (!provider) {
      console.log(`  Detected provider ${detected} not found in capability matrix.`);
      return;
    }
    console.log(`  (Detected provider: ${detected})`);
    console.log(formatProvider(detected, provider, matrix));
    return;
  }

  if (subcommand === 'find') {
    const capFlag = args.indexOf('--capability');
    if (capFlag < 0) throw new AiwgError({
      code: 'ERR_USAGE_MISSING_FLAG',
      message: "'aiwg steward find' requires --capability <name>",
      hint: 'Example: aiwg steward find --capability cron',
      exitCode: EXIT_CODES.USAGE,
    });

    const rawCapId = args[capFlag + 1];
    if (!rawCapId) throw new AiwgError({
      code: 'ERR_USAGE_MISSING_VALUE',
      message: '--capability requires a feature name',
      hint: 'Example: aiwg steward find --capability cron',
      exitCode: EXIT_CODES.USAGE,
    });

    const capabilityId = normalizeFeatureKey(rawCapId);
    const feat = matrix.features[capabilityId as FeatureKey];
    if (!feat) {
      const known = Object.keys(matrix.features).join(', ');
      throw new AiwgError({
        code: 'ERR_USAGE_UNKNOWN_CAPABILITY',
        message: `Unknown capability: ${rawCapId}`,
        hint: `Known capabilities: ${known}`,
        exitCode: EXIT_CODES.USAGE,
      });
    }

    const detected = await detectProvider(ctx) ?? BASELINE_PROVIDER;
    const provider = matrix.providers[detected];

    console.log(`\n  Routing advice for: ${capabilityId}`);
    console.log(`  Provider: ${provider?.display_name ?? detected}`);
    console.log('');

    if (!provider) {
      console.log(`  No capability data for provider ${detected}.`);
      return;
    }

    const isNative = provider.native_features?.[capabilityId as FeatureKey] === true;
    const emulation = provider.emulation?.[capabilityId as FeatureKey] ?? null;

    if (isNative) {
      console.log(`  ✓ Native support available`);
      if (feat.native_example) console.log(`  Example: ${feat.native_example}`);
    } else if (emulation) {
      console.log(`  ~ Use AIWG emulation`);
      console.log(`  Strategy: ${emulationLabel(emulation)}`);
      const strategyDetail = feat.emulation_strategies?.[emulation];
      if (strategyDetail) console.log(`  Detail:   ${strategyDetail}`);
    } else {
      console.log(`  - Not supported on this provider`);
      const strategies = feat.emulation_strategies ?? {};
      const available = Object.keys(strategies);
      if (available.length) {
        console.log(`  Available strategies in matrix: ${available.join(', ')}`);
      }
    }
    return;
  }

  if (subcommand === 'models' || subcommand === 'model-routing') {
    const flagValue = (name: string): string | undefined => {
      const index = args.indexOf(name);
      if (index < 0) return undefined;
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new AiwgError({
        code: 'ERR_USAGE_MISSING_VALUE',
        message: `${name} requires a value.`,
        exitCode: EXIT_CODES.USAGE,
      });
      return value;
    };
    if (args.includes('--route')) {
      const rawProvider = flagValue('--provider') ?? await resolveActiveProvider({
        cwd: ctx ? getProjectDir(ctx, ctx.args) : process.cwd(),
        detectProcess: true,
      }).then(result => result.provider ?? undefined);
      const provider = normalizeProviderId(rawProvider);
      if (!provider || provider === 'generic') throw new AiwgError({
        code: 'ERR_USAGE_UNKNOWN_PROVIDER',
        message: `Cannot compile a wrapper route for provider: ${rawProvider ?? '(undetected)'}`,
        hint: 'Pass --provider with a supported provider id.',
        exitCode: EXIT_CODES.USAGE,
      });
      const capabilityType = flagValue('--capability-type') as RoutedCapabilityType | undefined;
      const capability = flagValue('--capability');
      const assignment = flagValue('--assignment');
      if (!capabilityType || !['agent', 'skill', 'rule', 'workflow'].includes(capabilityType)) throw new AiwgError({
        code: 'ERR_USAGE_MISSING_VALUE',
        message: '--capability-type requires agent, skill, rule, or workflow.',
        exitCode: EXIT_CODES.USAGE,
      });
      if (!capability || !assignment) throw new AiwgError({
        code: 'ERR_USAGE_MISSING_VALUE',
        message: '--route requires both --capability <id> and --assignment <bounded text>.',
        exitCode: EXIT_CODES.USAGE,
      });
      const capabilityProvider = capabilityProviderId(provider);
      const providerCapabilities = capabilityProvider ? matrix.providers[capabilityProvider] : undefined;
      const launchMechanism = providerCapabilities?.native_features.tasks
        ? 'native-subagent'
        : providerCapabilities?.emulation.tasks === 'aiwg-mc' ? 'aiwg-mc' : 'manual';
      const premiumAuthorized = args.includes('--allow-premium');
      const { collectProviderInventory } = await import('../../providers/provider-inventory.js');
      const { resolveDynamicModelCatalog } = await import('../../models/model-discovery.js');
      const projectDir = ctx ? getProjectDir(ctx, ctx.args) : process.cwd();
      const requestedAiwgRoot = ctx?.frameworkRoot ?? process.cwd();
      const aiwgRoot = await access(join(
        requestedAiwgRoot,
        'agentic/code/providers/model-catalog.v1.json',
      )).then(() => requestedAiwgRoot).catch(() => process.cwd());
      const resolvedCapability = await resolveRoutableCapability(
        aiwgRoot,
        capabilityType,
        capability,
      ).catch(error => {
        if (!(error instanceof CapabilityResolutionError)) throw error;
        throw new AiwgError({
          code: error.kind === 'ambiguous'
            ? 'ERR_USAGE_AMBIGUOUS_CAPABILITY'
            : 'ERR_USAGE_UNKNOWN_CAPABILITY',
          message: error.message,
          hint: 'Run aiwg discover "<capability>" --json and pass an exact name or stable id.',
          exitCode: EXIT_CODES.USAGE,
        });
      });
      const catalog = await resolveDynamicModelCatalog({
        aiwgRoot,
        inventory: await collectProviderInventory(projectDir),
        allowNetwork: false,
      });
      const baselineCatalog = loadProviderModelCatalog();
      const effectiveCatalog = {
        ...baselineCatalog,
        ...catalog,
        refreshedAt: catalog.refreshedAt ?? baselineCatalog.refreshedAt,
        staleAfterDays: baselineCatalog.staleAfterDays,
        providers: { ...baselineCatalog.providers, ...catalog.providers },
      } as ProviderModelCatalog;
      const envelope = buildWrapperRouteEnvelope({
        provider,
        capability: resolvedCapability,
        assignment,
        launchMechanism,
        deterministic: args.includes('--deterministic'),
        routine: args.includes('--routine'),
        complex: args.includes('--complex'),
        highImpact: args.includes('--high-impact'),
        requestedPremium: args.includes('--premium'),
        unattended: args.includes('--unattended'),
        premiumAuthorized,
        maxAutoTier: premiumAuthorized ? 3 : undefined,
        catalog: effectiveCatalog,
      });
      if (args.includes('--json')) console.log(JSON.stringify(envelope, null, 2));
      else {
        console.log('\n  Model wrapper route');
        console.log(`  Provider:   ${envelope.provider}`);
        console.log(`  Capability: ${envelope.capability.type} ${envelope.capability.name} (${envelope.capability.id})`);
        console.log(`  Tier/role:  ${envelope.tier ?? 'deterministic'}/${envelope.role ?? 'none'}`);
        console.log(`  Wrapper:    ${envelope.wrapper ?? 'none'}`);
        console.log(`  Model:      ${envelope.model?.effectiveModel ?? 'inherited or no model call'} (${envelope.model?.outcome ?? 'deterministic'})`);
        console.log(`  Launch:     ${envelope.launch.mechanism}`);
        console.log(`  Confirmation: ${envelope.decision.requiresConfirmation ? 'required' : 'not required'}`);
        console.log('\n  Wrapper prompt:\n');
        console.log(envelope.launch.prompt);
      }
      return;
    }
    const decision = routeModelTier({
      deterministic: args.includes('--deterministic'),
      routine: args.includes('--routine'),
      complex: args.includes('--complex'),
      highImpact: args.includes('--high-impact'),
      requestedPremium: args.includes('--premium'),
      unattended: args.includes('--unattended'),
      premiumAuthorized: args.includes('--allow-premium'),
      maxAutoTier: args.includes('--allow-premium') ? 3 : undefined,
    });
    console.log('\n  Model policy routing');
    console.log(`  Default stance: cheap-first role/tier intent, compiled per provider from the effective catalog.`);
    console.log(`  Suggested tier: ${decision.tier}${decision.modelTier ? ` (${decision.modelTier})` : ' (no model call)'}`);
    console.log(`  Confirmation: ${decision.requiresConfirmation ? 'required' : 'not required'}`);
    console.log(`  Summary before escalation: ${decision.summaryRequired ? 'required' : 'not required'}`);
    console.log(`  Rationale: ${decision.rationale.join('; ')}`);
    console.log('\n  Commands:');
    console.log('    aiwg models sources --json        # inspect effective cache/static/remote catalog provenance');
    console.log('    aiwg models refresh --json        # refresh dynamic provider catalog where supported');
    console.log('    aiwg models audit --provider P    # compile artifact policy and diagnostics');
    console.log('    aiwg models resolve --provider P  # show selected provider model for matching artifacts');
    console.log('\n  Authoring:');
    console.log('    Agents: use model-role/model-tier; avoid exact provider IDs in source scaffolds.');
    console.log('    Skills/commands: use commandHint.modelRole and commandHint.modelTier.');
    return;
  }

  throw new AiwgError({
    code: 'ERR_USAGE_UNKNOWN_SUBCOMMAND',
    message: `Unknown steward subcommand: ${subcommand}`,
    hint: "Run 'aiwg steward --help' for usage",
    exitCode: EXIT_CODES.USAGE,
  });
}

// ── Handler export ────────────────────────────────────────────────────────────

export const stewardHandler: CommandHandler = {
  id: 'steward',
  name: 'Steward',
  description: 'Provider capability routing and permission normalization',
  category: 'maintenance',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      await handleSteward(ctx.args, ctx);
      return { exitCode: 0 };
    } catch (error) {
      // Preserve AiwgError.exitCode (USAGE=2, etc.) through the catch.
      return handlerResultFromError(error);
    }
  },
};

export const stewardHandlers: CommandHandler[] = [stewardHandler];
