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
import { AiwgError, EXIT_CODES, handlerResultFromError } from '../errors.js';
import {
  loadCapabilityMatrix,
  type CapabilityMatrix,
  type ProviderCapabilities,
  type FeatureKey,
} from '../../providers/capability-matrix.js';

const BASELINE_PROVIDER = 'claude-code';

// ── Feature name normalization ────────────────────────────────────────────────

/**
 * Accept both hyphenated (agent-teams) and underscored (agent_teams) feature
 * names; the canonical YAML keys use underscores.
 */
function normalizeFeatureKey(input: string): string {
  return input.trim().toLowerCase().replace(/-/g, '_');
}

// ── Detect current provider ────────────────────────────────────────────────────

function detectProvider(): string | null {
  if (process.env.CLAUDE_CODE_VERSION || process.env.ANTHROPIC_API_KEY) return 'claude-code';
  if (process.env.OPENAI_API_KEY && !process.env.CURSOR_TRACE_ID) return 'codex';
  if (process.env.CURSOR_TRACE_ID || process.env.CURSOR_VERSION) return 'cursor';
  if (process.env.WINDSURF_VERSION) return 'windsurf';
  if (process.env.WARP_SESSION_ID || process.env.WARP_TERMINAL) return 'warp';
  if (process.env.COPILOT_AGENT || process.env.GITHUB_COPILOT_TOKEN) return 'copilot';
  if (process.env.OPENCLAW_VERSION) return 'openclaw';
  if (process.env.FACTORY_AGENT_ID) return 'factory';
  if (process.env.OPENCODE_VERSION) return 'opencode';
  return null;
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

function formatProvider(id: string, provider: ProviderCapabilities, matrix: CapabilityMatrix): string {
  const lines: string[] = [];
  lines.push(`\n  Provider: ${provider.display_name} (${id})`);
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

async function handleSteward(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (!subcommand || subcommand === '--help' || subcommand === 'help') {
    console.log(`
  aiwg steward — Provider capability awareness and command routing

  Usage:
    aiwg steward capabilities --provider <name>   Capabilities for a specific provider
    aiwg steward capabilities --feature <name>    Provider support matrix for a feature
    aiwg steward capabilities --all               Full matrix (all providers x features)
    aiwg steward find --capability <name>         Routing advice for your current provider

  Providers:
    claude-code, codex, copilot, cursor, factory, opencode, warp, windsurf, openclaw

  Features:
    cron, agent_teams, tasks, mcp, behaviors, mission_control, daemon
    (hyphens accepted: agent-teams → agent_teams)
`);
    return;
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
      const providerId = args[providerFlag + 1];
      if (!providerId) throw new AiwgError({
        code: 'ERR_USAGE_MISSING_VALUE',
        message: '--provider requires a provider name',
        hint: 'Example: aiwg steward capabilities --provider claude-code',
        exitCode: EXIT_CODES.USAGE,
      });
      const provider = matrix.providers[providerId];
      if (!provider) {
        const known = Object.keys(matrix.providers).join(', ');
        throw new AiwgError({
          code: 'ERR_USAGE_UNKNOWN_PROVIDER',
          message: `Unknown provider: ${providerId}`,
          hint: `Known providers: ${known}`,
          exitCode: EXIT_CODES.USAGE,
        });
      }
      console.log(formatProvider(providerId, provider, matrix));
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
    const detected = detectProvider();
    if (!detected) {
      console.log(`  Could not detect active provider. Specify with --provider <name>.`);
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

    const detected = detectProvider() ?? BASELINE_PROVIDER;
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
  description: 'Provider capability awareness and command routing (capabilities, find)',
  category: 'maintenance',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      await handleSteward(ctx.args);
      return { exitCode: 0 };
    } catch (error) {
      // Preserve AiwgError.exitCode (USAGE=2, etc.) through the catch.
      return handlerResultFromError(error);
    }
  },
};

export const stewardHandlers: CommandHandler[] = [stewardHandler];
