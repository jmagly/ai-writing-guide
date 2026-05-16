/**
 * Regenerate Context Files Handler (#1266)
 *
 * `aiwg regenerate` — regenerates the cross-provider context files
 * (AIWG.md + AGENTS.md) without redeploying frameworks, agents, skills, or
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
import { handlerResultFromError } from '../errors.js';
import * as ui from '../ui.js';
import {
  generate as generateContextFiles,
  discoverDeployedArtifacts,
  shouldEmitContextFiles,
} from '../../smiths/context-pipeline/index.js';
import type { Platform } from '../../agents/types.js';

// Provider detection mirrors the one in steward.ts (#1262 fix). Kept inline
// because they're invoked in different contexts; consolidation can come later.
function detectProviderFromEnv(): string {
  if (process.env.CLAUDE_CODE_VERSION || process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.OPENAI_API_KEY && !process.env.CURSOR_TRACE_ID) return 'codex';
  if (process.env.CURSOR_TRACE_ID || process.env.CURSOR_VERSION) return 'cursor';
  if (process.env.WINDSURF_VERSION) return 'windsurf';
  if (process.env.WARP_SESSION_ID || process.env.WARP_TERMINAL) return 'warp';
  if (process.env.COPILOT_AGENT || process.env.GITHUB_COPILOT_TOKEN) return 'copilot';
  if (process.env.OPENCLAW_VERSION) return 'openclaw';
  if (process.env.FACTORY_AGENT_ID) return 'factory';
  if (process.env.OPENCODE_VERSION) return 'opencode';
  return 'claude';
}

// Minimal provider paths — only what the generator needs to discover deployed
// artifacts. Mirrors PROVIDER_PATHS in use.ts; consolidating is a separate
// follow-up.
const PROVIDER_PATHS_MIN: Record<string, { agents: string; skills: string; rules: string; behaviors: string }> = {
  claude:    { agents: '.claude/agents',    skills: '.claude/.aiwg/skills',    rules: '.claude/rules',    behaviors: '' },
  codex:     { agents: '.codex/agents',     skills: '.agents/skills',          rules: '.codex/rules',     behaviors: '' },
  copilot:   { agents: '.github/agents',    skills: '.github/.aiwg/skills',    rules: '.github/instructions', behaviors: '' },
  cursor:    { agents: '.cursor/agents',    skills: '.cursor/.aiwg/skills',    rules: '.cursor/rules',    behaviors: '' },
  factory:   { agents: '.factory/droids',   skills: '.factory/.aiwg/skills',   rules: '.factory/rules',   behaviors: '' },
  opencode:  { agents: '.opencode/agent',   skills: '.opencode/.aiwg/skill',   rules: '.opencode/rule',   behaviors: '' },
  warp:      { agents: '.warp/agents',      skills: '.warp/.aiwg/skills',      rules: '.warp/rules',      behaviors: '' },
  windsurf:  { agents: '.windsurf/agents',  skills: '.windsurf/.aiwg/skills',  rules: '.windsurf/rules',  behaviors: '' },
};

async function handleRegenerate(args: string[], cwd: string): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
  aiwg regenerate — Regenerate cross-provider context files (AIWG.md + AGENTS.md)

  Usage:
    aiwg regenerate [options]

  Scope:
    Context-only. Regenerates AIWG.md and AGENTS.md at project root using the
    canonical context pipeline. Does NOT redeploy frameworks, agents, skills,
    or commands — use 'aiwg refresh' for that.

  Options:
    --dry-run               Print what would change; no writes
    --provider <name>       Target provider (default: auto-detect from env)
    --force                 Overwrite operator-modified files (backs up first)
    --no-aiwg-md            Skip AIWG.md emission
    --no-agents-md          Skip AGENTS.md emission
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

  const providerFlag = args.indexOf('--provider');
  const provider = providerFlag >= 0 && args[providerFlag + 1]
    ? args[providerFlag + 1]
    : detectProviderFromEnv();

  const target = cwd;

  console.log(`${ui.brandMark()} aiwg regenerate${dryRun ? '  (dry run)' : ''}`);
  console.log(`  Provider: ${provider}`);
  console.log(`  Target:   ${target}`);

  if (!shouldEmitContextFiles(provider as Platform)) {
    console.log(`  Skip:     context files are not emitted for provider '${provider}' (claude uses CLAUDE.md natively; openclaw is home-dir-only).`);
    return;
  }

  if (dryRun) {
    const aiwgMd = path.join(target, 'AIWG.md');
    const agentsMd = path.join(target, 'AGENTS.md');
    console.log('');
    console.log(`  Would regenerate:`);
    console.log(`    - ${path.join(target, '.aiwg', 'AIWG.md')}`);
    if (!skipAiwgMd) console.log(`    - ${aiwgMd}`);
    if (!skipAgentsMd) console.log(`    - ${agentsMd}`);
    if (provider === 'copilot' && !skipAgentsMd) console.log(`    - ${path.join(target, '.github', 'copilot-instructions.md')}`);
    if (force) console.log(`    (with --force: any operator-modified files are backed up first)`);
    console.log('');
    console.log(`  Dry run complete — no changes made`);
    return;
  }

  const paths = PROVIDER_PATHS_MIN[provider] ?? PROVIDER_PATHS_MIN.claude;
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
    skip: { aiwgMd: skipAiwgMd, agentsMd: skipAgentsMd },
  });

  if (result.agentsMdPath) {
    console.log(`  OK Wrote AGENTS.md (${result.agentsMdBytes} bytes)`);
  }
  if (result.aiwgMdPath) {
    console.log(`  OK Wrote AIWG.md`);
  }
  if (result.normalizedAiwgMdPath) {
    console.log(`  OK Wrote .aiwg/AIWG.md`);
  }
  for (const w of result.warnings) {
    console.log(`  context-pipeline: ${w}`);
  }
  for (const b of result.backupPaths) {
    console.log(`  Backup created: ${b}`);
  }
  if (!result.agentsMdPath && !result.aiwgMdPath) {
    console.log(`  No files regenerated (all skipped or refused without --force).`);
  } else {
    console.log(`  Regenerate complete`);
  }
}

export const regenerateHandler: CommandHandler = {
  id: 'regenerate',
  name: 'Regenerate Context Files',
  description: 'Regenerate AIWG.md + AGENTS.md without redeploying frameworks (#1266)',
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
