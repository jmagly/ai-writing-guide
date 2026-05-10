/**
 * Help Command Handler
 *
 * Displays comprehensive CLI help information.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @source @src/cli/router.ts
 * @issue #33
 */

import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import * as ui from '../ui.js';

/**
 * Help command handler
 */
export const helpHandler: CommandHandler = {
  id: 'help',
  name: 'Help',
  description: 'Show CLI help message',
  category: 'maintenance',
  aliases: ['-h', '-help', '--help'],

  async execute(_ctx: HandlerContext): Promise<HandlerResult> {
    displayHelp();
    return { exitCode: 0 };
  },
};

/**
 * Format a help group — bold header, aligned command/description pairs
 */
function helpGroup(title: string, commands: [string, string][]): void {
  ui.header(`  ${title}`);
  const maxCmd = Math.max(...commands.map(([cmd]) => cmd.length));
  for (const [cmd, desc] of commands) {
    console.log(`    ${ui.bold(cmd.padEnd(maxCmd + 2))}${ui.dimText(desc)}`);
  }
  console.log('');
}

/**
 * Display comprehensive help information
 */
function displayHelp(): void {
  ui.blank();
  console.log(`  ${ui.brandMark()} ${ui.bold('AIWG')}`);
  ui.rule();
  ui.blank();
  console.log(`  ${ui.dimText('Usage:')} aiwg ${ui.accent('<command>')} ${ui.dimText('[options]')}`);
  ui.blank();

  helpGroup('FRAMEWORK', [
    ['use <framework>', 'Deploy framework (sdlc, marketing, media-curator, research, forensics, security-engineering, ops, knowledge-base, all)'],
    ['list', 'List installed frameworks and addons'],
    ['remove <id>', 'Remove a framework or addon'],
  ]);

  helpGroup('PROJECT', [
    ['new <name>', 'Create new project with SDLC templates'],
  ]);

  helpGroup('WORKSPACE', [
    ['status', 'Show workspace health and installed frameworks'],
    ['migrate-workspace', 'Migrate legacy .aiwg/ to framework-scoped structure'],
    ['rollback-workspace', 'Rollback workspace migration from backup'],
  ]);

  helpGroup('MCP SERVER', [
    ['mcp serve', 'Start AIWG MCP server (stdio transport)'],
    ['mcp install [target]', 'Generate MCP client config (claude, copilot, factory, cursor)'],
    ['mcp info', 'Show MCP server capabilities'],
  ]);

  helpGroup('TOOLSMITH', [
    ['runtime-info', 'Show runtime environment summary'],
    ['runtime-info --discover', 'Full tool discovery and catalog generation'],
    ['runtime-info --check <tool>', 'Check specific tool availability'],
  ]);

  helpGroup('CATALOG', [
    ['catalog list', 'List all models in catalog'],
    ['catalog info <id>', 'Show detailed model information'],
    ['catalog search <q>', 'Search models by query'],
  ]);

  helpGroup('DISCOVERY', [
    ['discover "<phrase>"', 'Find skills/agents/commands/rules by capability'],
    ['show <type> <name>', 'Stream the body of an indexed artifact'],
    ['index <subcommand>', 'Manage the artifact index (build/query/discover/deps/stats)'],
  ]);

  helpGroup('DISPATCH', [
    ['run skill <name>', 'Execute a script-bearing skill'],
    ['run <script-name>', 'Run a user-defined script from .aiwg/aiwg.config'],
  ]);

  helpGroup('FEATURES', [
    ['features', 'Show optional feature install status'],
  ]);

  helpGroup('SCAFFOLDING', [
    ['add-agent <name>', 'Add agent to addon/framework'],
    ['add-command <name>', 'Add command to addon/framework'],
    ['add-skill <name>', 'Add skill to addon/framework'],
    ['scaffold-addon <name>', 'Create new addon package'],
    ['scaffold-framework <name>', 'Create new framework package'],
  ]);

  helpGroup('RALPH LOOP', [
    ['ralph "<task>"', 'Execute iterative task loop (--completion, --max-iterations)'],
    ['ralph-status', 'Check current loop status'],
    ['ralph-abort', 'Abort running loop'],
    ['ralph-resume', 'Resume interrupted loop'],
  ]);

  helpGroup('MAINTENANCE', [
    ['doctor', 'Check installation health'],
    ['version', 'Show version and channel info'],
    ['refresh', 'Update AIWG and redeploy frameworks (formerly: sync)'],
    ['update', 'Check for updates'],
    ['help', 'Show this help message'],
  ]);

  helpGroup('CHANNEL', [
    ['--use-dev [path]', 'Customize AIWG live from a local clone or fork'],
    ['--use-main', 'Switch to edge channel (bleeding edge)'],
    ['--use-stable', 'Switch back to stable npm package'],
  ]);

  ui.rule();
  ui.blank();
  console.log(`  ${ui.dimText('Providers:')} claude (default), copilot, factory, codex, cursor, opencode, warp, windsurf`);
  ui.blank();
  console.log(`  ${ui.dimText('Examples:')}`);
  console.log(`    aiwg use sdlc                   ${ui.dimText('Install SDLC framework')}`);
  console.log(`    aiwg discover "deploy"          ${ui.dimText('Find skills by capability')}`);
  console.log(`    aiwg show skill intake-wizard   ${ui.dimText('Stream a skill body')}`);
  console.log(`    aiwg doctor                     ${ui.dimText('Check installation health')}`);
  console.log(`    aiwg refresh                    ${ui.dimText('Pull latest + redeploy frameworks')}`);
  ui.blank();
}
