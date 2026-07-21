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
import { promises as fs } from 'node:fs';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { AiwgError, EXIT_CODES, handlerResultFromError } from '../errors.js';
import * as ui from '../ui.js';
import {
  generate as generateContextFiles,
  discoverDeployedArtifacts,
  shouldEmitContextFiles,
  buildNormalizedAiwgMd,
  writeNormalizedAiwgMd,
  injectLegacyContext,
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
    --workspace             Canonical WORKSPACE.md → AIWG.md graph (default)
    --legacy, --full-inject Legacy inline compatibility branch
    --dry-run               Print what would change; no writes
    --provider <name>       Target provider (default: auto-detect from env)
    --force                 Overwrite operator-modified files (backs up first)
    --no-aiwg-md            Skip AIWG.md emission
    --no-agents-md          Skip AGENTS.md emission
    --no-workspace-md       Skip WORKSPACE.md emission
    --help, -h              Show this help

  Examples:
    aiwg regenerate
    aiwg regenerate --workspace
    aiwg regenerate --full-inject
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
  const legacy = args.includes('--legacy') || args.includes('--full-inject');
  const workspace = args.includes('--workspace');

  const valueFlags = new Set(['--provider']);
  const booleanFlags = new Set([
    '--help', '-h', '--dry-run', '--force', '--no-aiwg-md', '--no-agents-md',
    '--no-workspace-md', '--legacy', '--full-inject', '--workspace',
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (valueFlags.has(arg)) {
      if (!args[index + 1] || args[index + 1].startsWith('-')) throw new AiwgError({
        code: 'ERR_USAGE_MISSING_VALUE', message: `${arg} requires a value`, exitCode: EXIT_CODES.USAGE,
      });
      index += 1;
    } else if (!booleanFlags.has(arg)) {
      throw new AiwgError({
        code: 'ERR_USAGE_UNKNOWN_FLAG', message: `Unknown regenerate option: ${arg}`,
        hint: 'Run aiwg regenerate --help for supported branches and flags.', exitCode: EXIT_CODES.USAGE,
      });
    }
  }
  if (legacy && workspace) throw new AiwgError({
    code: 'ERR_USAGE_CONFLICTING_FLAGS',
    message: 'Choose exactly one regenerate branch: --workspace or --full-inject.',
    exitCode: EXIT_CODES.USAGE,
  });

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
  console.log(`  Branch:   ${legacy ? 'legacy full injection' : 'canonical workspace graph'}`);

  if (legacy) {
    if (skipWorkspaceMd) console.log('  Note: --no-workspace-md is implicit in legacy mode.');
    const normalizedPath = path.join(target, '.aiwg', 'AIWG.md');
    let existing = '';
    try { existing = await fs.readFile(normalizedPath, 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const normalizedContent = await buildNormalizedAiwgMd(target, existing);
    const result = skipAgentsMd
      ? { targets: [], backups: [], changed: [], dryRun, warnings: [] }
      : await injectLegacyContext(provider as Platform, target, normalizedContent, { dryRun });
    if (dryRun) {
      console.log('');
      console.log('  Would regenerate:');
      if (!skipAiwgMd) console.log(`    - ${normalizedPath} (normalized framework source)`);
      for (const changed of result.changed) console.log(`    - ${changed} (legacy inline markers)`);
      for (const warning of result.warnings) console.log(`  WARNING: ${warning}`);
      console.log('');
      console.log('  Dry run complete — no changes made');
      return;
    }
    if (!skipAiwgMd) await writeNormalizedAiwgMd(target);
    for (const changed of result.changed) console.log(`  OK Injected AIWG context into ${path.relative(target, changed)}`);
    for (const backup of result.backups) console.log(`  Backup created: ${backup}`);
    for (const warning of result.warnings) console.log(`  WARNING: ${warning}`);
    console.log('  Legacy regenerate complete');
    return;
  }

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
