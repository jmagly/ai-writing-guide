/**
 * Regenerate Context Files Handler (#1266)
 *
 * `aiwg regenerate` — regenerates the cross-provider context files
 * (WORKSPACE.md + AIWG.md + provider adapters) without redeploying frameworks, agents, skills, or
 * commands. Use when context drifts (e.g., editing CLAUDE.md, adding a
 * framework manifest entry) and you want a fast, focused refresh.
 *
 * Scope: context-only. For full redeploy use `aiwg refresh` or `aiwg use`.
 *
 * Flags:
 *   --dry-run                Print what would change without writing
 *   --provider <name>        Target provider (default: auto-detect)
 *   --force                  Overwrite operator-modified context files (backs up first)
 *   --no-aiwg-md             Skip AIWG.md emission
 *   --no-agents-md           Skip AGENTS.md emission
 *
 * @source @src/cli/router.ts
 * @issue #1266
 */

import * as path from 'path';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { AiwgError, EXIT_CODES, handlerResultFromError } from '../errors.js';
import * as ui from '../ui.js';
import {
  generate as generateContextFiles,
  discoverDeployedArtifacts,
  shouldEmitContextFiles,
} from '../../smiths/context-pipeline/index.js';
import type { Platform } from '../../agents/types.js';
import { resolveActiveProvider } from '../provider-resolution.js';
import { getProviderContextDiscoveryPathStrings } from '../../providers/provider-definitions.js';

async function handleRegenerate(args: string[], cwd: string): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
  aiwg regenerate — Regenerate canonical workspace context and provider adapters

  Usage:
    aiwg regenerate [options]

  Scope:
    Context-only. Refreshes WORKSPACE.md, AIWG.md, and provider adapters using the
    canonical context pipeline. Does NOT redeploy frameworks, agents, skills,
    or commands — use 'aiwg refresh' for that.

  Options:
    --dry-run               Print what would change; no writes
    --provider <name>       Target provider (default: auto-detect from env)
    --force                 Overwrite operator-modified files (backs up first)
    --no-aiwg-md            Skip AIWG.md emission
    --no-agents-md          Skip AGENTS.md emission
    --no-workspace-md       Skip WORKSPACE.md emission
    --help, -h              Show this help

  Examples:
    aiwg regenerate
    aiwg regenerate --dry-run
    aiwg regenerate --provider codex
    aiwg regenerate --force --no-agents-md
`);
    return;
  }

  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const skipAiwgMd = args.includes('--no-aiwg-md');
  const skipAgentsMd = args.includes('--no-agents-md');
  const skipWorkspaceMd = args.includes('--no-workspace-md');

  const providerFlag = args.indexOf('--provider');
  const explicitProvider = providerFlag >= 0 ? args[providerFlag + 1] : undefined;
  const resolution = await resolveActiveProvider({ cwd, explicitProvider, detectProcess: true });
  if (!resolution.provider) {
    throw new AiwgError({
      code: 'ERR_USAGE_PROVIDER_AMBIGUOUS',
      message: 'Could not determine provider for regenerate: ' + resolution.reason,
      hint: resolution.candidates.length
        ? 'Specify --provider (' + resolution.candidates.join(', ') + ')'
        : 'Specify --provider <name>',
      exitCode: EXIT_CODES.USAGE,
    });
  }
  const provider = resolution.provider;

  const target = cwd;

  console.log(`${ui.brandMark()} aiwg regenerate${dryRun ? '  (dry run)' : ''}`);
  console.log(`  Provider: ${provider}`);
  console.log(`  Target:   ${target}`);

  if (!shouldEmitContextFiles(provider as Platform)) {
    console.log(`  Adapter:  provider '${provider}' has no verified project startup loader; WORKSPACE.md is still maintained.`);
  }

  if (dryRun) {
    const aiwgMd = path.join(target, 'AIWG.md');
    const agentsMd = path.join(target, 'AGENTS.md');
    const claudeMd = path.join(target, 'CLAUDE.md');
    console.log('');
    console.log(`  Would regenerate:`);
    if (!skipWorkspaceMd) console.log(`    - ${path.join(target, 'WORKSPACE.md')} (managed graph; operator section preserved)`);
    console.log(`    - ${path.join(target, '.aiwg', 'AIWG.md')}`);
    if (!skipAiwgMd) console.log(`    - ${aiwgMd}`);
    if (provider === 'claude') {
      console.log(`    - ${claudeMd} (managed @WORKSPACE.md then @AIWG.md hook; operator content preserved)`);
    } else {
      if (!skipAgentsMd) console.log(`    - ${agentsMd}`);
      if (provider === 'copilot' && !skipAgentsMd) console.log(`    - ${path.join(target, '.github', 'copilot-instructions.md')}`);
    }
    if (force) console.log(`    (with --force: any operator-modified files are backed up first)`);
    console.log('');
    console.log(`  Dry run complete — no changes made`);
    return;
  }

  const paths = getProviderContextDiscoveryPathStrings(provider) ?? getProviderContextDiscoveryPathStrings('claude');
  if (!paths) throw new Error(`Missing context discovery paths for provider ${provider}`);
  const sections = await discoverDeployedArtifacts(target, {
    agents: paths.agents,
    rules: paths.rules,
    skills: paths.skills,
    behaviors: paths.behaviors,
  });

  const result = await generateContextFiles({
    provider: provider as Platform,
    projectPath: target,
    sections,
    detectExistingFiles: true,
    force,
    skip: { workspaceMd: skipWorkspaceMd, aiwgMd: skipAiwgMd, agentsMd: skipAgentsMd },
  });

  if (result.workspaceMdPath) {
    console.log(`  OK ${result.workspaceMdAction === 'created' ? 'Created' : 'Refreshed'} WORKSPACE.md`);
  }

  if (result.agentsMdPath) {
    console.log(`  OK Wrote AGENTS.md (${result.agentsMdBytes} bytes)`);
  }
  if (result.aiwgMdPath) {
    console.log(`  OK Wrote AIWG.md`);
  }
  if (result.normalizedAiwgMdPath) {
    console.log(`  OK Wrote .aiwg/AIWG.md`);
  }
  if (result.claudeMdHookPath && result.claudeMdHookAction && result.claudeMdHookAction !== 'unchanged' && result.claudeMdHookAction !== 'skipped') {
    const verb =
      result.claudeMdHookAction === 'created' ? 'Created' :
      result.claudeMdHookAction === 'inserted' ? 'Inserted hook into' :
      'Updated hook in';
    console.log(`  OK ${verb} CLAUDE.md (@WORKSPACE.md then @AIWG.md block managed by AIWG)`);
  } else if (result.claudeMdHookPath && result.claudeMdHookAction === 'unchanged') {
    console.log(`  OK CLAUDE.md hook already up to date`);
  }
  for (const w of result.warnings) {
    // #1579: loud warnings (non-managed twin/bridge left untouched) are prefixed
    // `WARNING:` and rendered prominently so the consequence + remediation isn't
    // buried among the routine OK lines.
    if (w.startsWith('WARNING:')) {
      console.log(`  ⚠ context-pipeline: ${w.slice('WARNING:'.length).trim()}`);
    } else {
      console.log(`  context-pipeline: ${w}`);
    }
  }
  for (const b of result.backupPaths) {
    console.log(`  Backup created: ${b}`);
  }
  for (const registration of result.contextRegistrationPaths) {
    console.log(`  OK Registered context graph in ${path.relative(target, registration)}`);
  }
  if (!result.agentsMdPath && !result.aiwgMdPath && !result.claudeMdHookPath) {
    console.log(`  No files regenerated (all skipped or refused without --force).`);
  } else {
    console.log(`  Regenerate complete`);
  }
}

export const regenerateHandler: CommandHandler = {
  id: 'regenerate',
  name: 'Regenerate Context Files',
  description: 'Regenerate WORKSPACE.md, AIWG.md, and provider adapters without redeploying',
  category: 'maintenance',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      await handleRegenerate(ctx.args, ctx.cwd);
      return { exitCode: 0 };
    } catch (error) {
      return handlerResultFromError(error);
    }
  },
};

export const regenerateHandlers: CommandHandler[] = [regenerateHandler];
