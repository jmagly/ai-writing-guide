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
 * Display comprehensive help information
 */
function displayHelp(): void {
  console.log(`
AIWG CLI

Usage: aiwg <command> [options]

Framework Management:
  use <framework>       Install and deploy framework (sdlc, marketing, writing, all)
                        Options: --no-utils, --provider <claude|copilot|factory|openai|windsurf>, --force
  list                  List installed frameworks and addons
  remove <id>           Remove a framework or addon

Project Setup:
  -new                  Create new project with SDLC templates
                        Options: --no-agents, --provider <...>

Workspace Management:
  -status               Show workspace health and installed frameworks
  -migrate-workspace    Migrate legacy .aiwg/ to framework-scoped structure
  -rollback-workspace   Rollback workspace migration from backup

MCP Server:
  mcp serve             Start AIWG MCP server (stdio transport)
  mcp install [target]  Generate MCP client config (claude, copilot, factory, cursor)
  mcp info              Show MCP server capabilities

Toolsmith (Runtime Discovery):
  runtime-info          Show runtime environment summary
  runtime-info --discover        Full tool discovery and catalog generation
  runtime-info --verify          Verify existing catalog accuracy
  runtime-info --check <tool>    Check specific tool availability
  runtime-info --json            Output as JSON

Model Catalog:
  catalog list          List all models in catalog
  catalog info <id>     Show detailed model information
  catalog search <q>    Search models by query
                        Options: --provider, --status, --tag, --min-context

Utilities:
  -prefill-cards        Prefill SDLC card metadata from team profile
  -contribute-start     Start AIWG contribution workflow
  -validate-metadata    Validate plugin/agent metadata

Plugin Packaging (for Claude Code marketplace):
  -package-plugin <name>    Package specific plugin for Claude Code
  -package-all-plugins      Package all plugins for Claude Code marketplace
                            Options: --clean, --dry-run

Scaffolding:
  add-agent <name>          Add agent to addon/framework (--to <target>, --template <simple|complex|orchestrator>)
  add-command <name>        Add command to addon/framework (--to <target>, --template <utility|transform|orchestration>)
  add-skill <name>          Add skill to addon/framework (--to <target>)
  add-template <name>       Add template to addon/framework (--to <target>, --category <category>)
  scaffold-addon <name>     Create new addon package
  scaffold-extension <name> Create new extension package
  scaffold-framework <name> Create new framework package

Channel Management:
  --use-main            Switch to edge channel (bleeding edge from main branch)
  --use-stable          Switch to stable channel (npm package)

Maintenance:
  doctor                Check installation health and diagnose issues
  -version              Show version and channel info
  -update               Check for and apply updates
  -help                 Show this help message

Platform Options:
  --provider copilot    Deploy for GitHub Copilot
  --provider factory    Deploy for Factory AI
  --provider openai     Deploy for OpenAI/Codex
  --provider windsurf   Deploy for Windsurf (EXPERIMENTAL)

Model Selection (for 'use' command):
  --reasoning-model <name>   Override model for reasoning tier (opus-level agents)
  --coding-model <name>      Override model for coding tier (sonnet-level agents)
  --efficiency-model <name>  Override model for efficiency tier (haiku-level agents)
  --filter <pattern>         Only deploy agents matching pattern (glob)
  --filter-role <role>       Only deploy agents of role: reasoning|coding|efficiency
  --save                     Save model selection to project models.json
  --save-user                Save model selection to ~/.config/aiwg/models.json

Ralph Loop (Iterative Execution):
  ralph "<task>" --completion "<criteria>"
                        Execute iterative task loop until criteria met
                        Options: --max-iterations N, --timeout M, --interactive
  ralph-status          Check current Ralph loop status
  ralph-abort           Abort running Ralph loop
  ralph-resume          Resume interrupted Ralph loop

Examples:
  aiwg use sdlc                    Install SDLC framework
  aiwg use all --provider factory  Install all frameworks for Factory AI
  aiwg use sdlc --reasoning-model opus-4-2   Deploy with custom reasoning model
  aiwg use sdlc --coding-model sonnet-5 --save   Deploy with custom model and save
  aiwg -new                        Create new project
  aiwg doctor                      Check installation health
  aiwg --use-main                  Switch to bleeding edge mode
  aiwg mcp serve                   Start MCP server
  aiwg mcp install claude          Configure Claude Code to use AIWG MCP
  aiwg runtime-info --discover     Discover installed tools
  aiwg runtime-info --check git    Check if git is available
  aiwg catalog list                List available models
  aiwg catalog info opus           Show model details
  aiwg ralph "fix tests" --completion "npm test passes"   Run Ralph loop
`);
}
