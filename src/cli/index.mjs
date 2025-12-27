/**
 * AIWG CLI Command Router
 *
 * Routes CLI commands to appropriate handlers.
 * Works with both npm-installed (stable) and git-based (edge) installations.
 *
 * @module src/cli/index
 * @version 2024.12.0
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { getFrameworkRoot, getVersionInfo, getChannel } from '../channel/manager.mjs';
import { forceUpdateCheck } from '../update/checker.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Command alias registry - maps all command variants to canonical form
 * This eliminates the "shotgun fix" anti-pattern of handling -flag, --flag, flag separately
 */
const COMMAND_ALIASES = {
  // Project setup
  '-new': 'new',
  '--new': 'new',

  // Workspace management
  '-status': 'status',
  '--status': 'status',
  '-migrate-workspace': 'migrate-workspace',
  '--migrate-workspace': 'migrate-workspace',
  '-rollback-workspace': 'rollback-workspace',
  '--rollback-workspace': 'rollback-workspace',

  // Utilities
  '-prefill-cards': 'prefill-cards',
  '--prefill-cards': 'prefill-cards',
  '-contribute-start': 'contribute-start',
  '--contribute-start': 'contribute-start',
  '-validate-metadata': 'validate-metadata',
  '--validate-metadata': 'validate-metadata',
  '-install-plugin': 'install-plugin',
  '--install-plugin': 'install-plugin',
  '-uninstall-plugin': 'uninstall-plugin',
  '--uninstall-plugin': 'uninstall-plugin',
  '-plugin-status': 'plugin-status',
  '--plugin-status': 'plugin-status',
  '-package-plugin': 'package-plugin',
  '--package-plugin': 'package-plugin',
  '-package-all-plugins': 'package-all-plugins',
  '--package-all-plugins': 'package-all-plugins',

  // Maintenance
  '-doctor': 'doctor',
  '--doctor': 'doctor',
  '-version': 'version',
  '--version': 'version',
  '-update': 'update',
  '--update': 'update',
  '-h': 'help',
  '-help': 'help',
  '--help': 'help',
};

/**
 * Normalize command to canonical form
 * @param {string} cmd - Raw command from CLI
 * @returns {string} Canonical command name
 */
function normalizeCommand(cmd) {
  return COMMAND_ALIASES[cmd] || cmd;
}

/**
 * Display help message
 */
function displayHelp() {
  console.log(`
AIWG - AI Writing Guide CLI

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
`);
}

/**
 * Display version information
 */
async function displayVersion() {
  const info = await getVersionInfo();

  console.log(`aiwg version: ${info.version}`);
  console.log(`Channel: ${info.channel}`);

  if (info.channel === 'edge' && info.gitHash) {
    console.log(`Git: ${info.gitHash} (${info.gitBranch})`);
    console.log(`Edge path: ${info.edgePath}`);
  } else {
    console.log(`Package root: ${info.packageRoot}`);
  }
}

/**
 * Run a Node.js script from the framework
 * @param {string} scriptPath - Relative path to script from framework root
 * @param {string[]} args - Arguments to pass to script
 * @param {object} options - Execution options
 */
async function runScript(scriptPath, args = [], options = {}) {
  const frameworkRoot = await getFrameworkRoot();
  const fullPath = path.join(frameworkRoot, scriptPath);

  return new Promise((resolve, reject) => {
    const child = spawn('node', [fullPath, ...args], {
      stdio: 'inherit',
      cwd: options.cwd || process.cwd(),
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

/**
 * Handle 'use' command - install and deploy a framework
 */
async function handleUse(args) {
  const framework = args[0];
  const remainingArgs = args.slice(1);

  if (!framework) {
    console.error('Error: Framework name required');
    console.log('Available: sdlc, marketing, writing, all');
    process.exit(1);
  }

  const validFrameworks = ['sdlc', 'marketing', 'writing', 'general', 'all'];
  if (!validFrameworks.includes(framework)) {
    console.error(`Error: Unknown framework '${framework}'`);
    console.log('Available: sdlc, marketing, writing, all');
    process.exit(1);
  }

  // Map framework names to deploy modes
  const modeMap = {
    sdlc: 'sdlc',
    marketing: 'marketing',
    writing: 'general',
    general: 'general',
    all: 'all',
  };

  const mode = modeMap[framework];
  const deployArgs = ['--mode', mode, '--deploy-commands', '--deploy-skills', ...remainingArgs];

  // Check if --no-utils was passed
  const skipUtils = remainingArgs.includes('--no-utils');
  const filteredArgs = deployArgs.filter(a => a !== '--no-utils');

  await runScript('tools/agents/deploy-agents.mjs', filteredArgs);

  // Deploy aiwg-utils unless --no-utils
  if (!skipUtils) {
    console.log('');
    console.log('Deploying aiwg-utils addon...');
    const frameworkRoot = await getFrameworkRoot();
    const utilsSource = path.join(frameworkRoot, 'agentic/code/addons/aiwg-utils');
    await runScript('tools/agents/deploy-agents.mjs', [
      '--source', utilsSource,
      '--deploy-commands',
      '--deploy-skills',
    ]);
  }
}

/**
 * Handle 'runtime-info' command - Toolsmith runtime discovery
 */
async function handleRuntimeInfo(args) {
  const { RuntimeDiscovery } = await import('../smiths/toolsmith/runtime-discovery.mjs');
  const discovery = new RuntimeDiscovery();

  const hasDiscover = args.includes('--discover');
  const hasVerify = args.includes('--verify');
  const hasJson = args.includes('--json');
  const checkIndex = args.indexOf('--check');
  const hasCheck = checkIndex >= 0;

  try {
    if (hasDiscover) {
      // Full discovery
      const catalog = await discovery.discover();

      if (hasJson) {
        console.log(JSON.stringify(catalog, null, 2));
      } else {
        console.log(`\nDiscovery complete!`);
        console.log(`Discovered ${catalog.tools.length} tools`);
        console.log(`Unavailable: ${catalog.unavailable.length}`);
        console.log(`\nCatalog saved to: ${path.join(discovery.basePath, 'runtime.json')}`);
        console.log(`Human-readable: ${path.join(discovery.basePath, 'runtime-info.md')}`);
      }
    } else if (hasVerify) {
      // Verify existing catalog
      const result = await discovery.verify();

      if (hasJson) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\nVerification complete!`);
        console.log(`Valid: ${result.valid}/${result.total}`);

        if (result.failed.length > 0) {
          console.log(`\nFailed tools:`);
          result.failed.forEach(tool => {
            console.log(`  - ${tool.name} (${tool.id})`);
          });
        }
      }
    } else if (hasCheck) {
      // Check specific tool
      const toolName = args[checkIndex + 1];

      if (!toolName) {
        console.error('Error: Tool name required for --check');
        process.exit(1);
      }

      const check = await discovery.checkTool(toolName);

      if (hasJson) {
        console.log(JSON.stringify(check, null, 2));
      } else {
        console.log(`\nTool: ${toolName}`);

        if (check.available) {
          console.log(`Status: Available`);
          console.log(`Version: ${check.version}`);
          console.log(`Path: ${check.path}`);
          console.log(`Verified: ${check.lastVerified}`);
        } else {
          console.log(`Status: Not Available`);
          console.log(`Install: ${check.installHint}`);
        }
      }
    } else {
      // Show summary (default)
      const summary = await discovery.getSummary();

      if (hasJson) {
        console.log(JSON.stringify(summary, null, 2));
      } else {
        console.log(`\nRuntime Environment Summary`);
        console.log(`===========================`);
        console.log(`\nOS: ${summary.environment.os} (${summary.environment.osVersion}) ${summary.environment.arch}`);
        console.log(`Shell: ${summary.environment.shell}`);
        console.log(`Memory: ${summary.resources.memoryAvailableGb} GB available / ${summary.resources.memoryTotalGb} GB total`);
        console.log(`Disk: ${summary.resources.diskFreeGb} GB free`);
        console.log(`CPU Cores: ${summary.resources.cpuCores}`);

        console.log(`\nTool Categories:`);
        console.log(`  Core:       ${summary.toolCounts.core} tools`);
        console.log(`  Languages:  ${summary.toolCounts.languages} tools`);
        console.log(`  Utilities:  ${summary.toolCounts.utilities} tools`);
        console.log(`  Custom:     ${summary.toolCounts.custom} tools`);

        console.log(`\nTotal: ${summary.totalTools} verified tools`);
        console.log(`\nLast Discovery: ${summary.lastDiscovery}`);
        console.log(`Catalog: ${summary.catalogPath}`);

        console.log(`\nRun 'aiwg runtime-info --discover' to refresh catalog`);
        console.log(`\nRun 'aiwg runtime-info --check <tool>' to check a specific tool`);
      }
    }
  } catch (error) {
    if (error.message.includes('No catalog found')) {
      console.log(`\nNo runtime catalog found.`);
      console.log(`Run 'aiwg runtime-info --discover' to create one.`);
    } else {
      console.error(`\nError: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

/**
 * Main CLI runner
 * @param {string[]} args - Command line arguments
 * @param {object} options - Options including packageRoot
 */
export async function run(args, options = {}) {
  const rawCommand = args[0];
  const command = normalizeCommand(rawCommand);
  const commandArgs = args.slice(1);

  // No command - show help
  if (!command) {
    displayHelp();
    return;
  }

  // Route commands (using canonical forms only)
  switch (command) {
    // Framework management
    case 'use':
      await handleUse(commandArgs);
      break;

    case 'list':
      await runScript('tools/plugin/plugin-status-cli.mjs', commandArgs);
      break;

    case 'remove':
      await runScript('tools/plugin/plugin-uninstaller-cli.mjs', commandArgs);
      break;

    // Project setup
    case 'new':
      await runScript('tools/install/new-project.mjs', commandArgs);
      break;

    // Workspace management
    case 'status':
      await runScript('tools/cli/workspace-status.mjs', commandArgs);
      break;

    case 'migrate-workspace':
      await runScript('tools/cli/workspace-migrate.mjs', commandArgs);
      break;

    case 'rollback-workspace':
      await runScript('tools/cli/workspace-rollback.mjs', commandArgs);
      break;

    // MCP Server
    case 'mcp':
      const { main: mcpMain } = await import('../mcp/cli.mjs');
      await mcpMain(commandArgs);
      break;

    // Toolsmith - Runtime Discovery
    case 'runtime-info':
      await handleRuntimeInfo(commandArgs);
      break;

    // Model Catalog
    case 'catalog':
      const { main: catalogMain } = await import('../catalog/cli.mjs');
      await catalogMain(commandArgs);
      break;

    // Utilities
    case 'prefill-cards':
      await runScript('tools/cards/prefill-cards.mjs', commandArgs);
      break;

    case 'contribute-start':
      await runScript('tools/contrib/start-contribution.mjs', commandArgs);
      break;

    case 'validate-metadata':
      await runScript('tools/cli/validate-metadata.mjs', commandArgs);
      break;

    case 'install-plugin':
      await runScript('tools/plugin/plugin-installer-cli.mjs', commandArgs);
      break;

    case 'uninstall-plugin':
      await runScript('tools/plugin/plugin-uninstaller-cli.mjs', commandArgs);
      break;

    case 'plugin-status':
      await runScript('tools/plugin/plugin-status-cli.mjs', commandArgs);
      break;

    case 'package-plugin':
      await runScript('tools/plugin/package-plugins.mjs', ['--plugin', ...commandArgs]);
      break;

    case 'package-all-plugins':
      await runScript('tools/plugin/package-plugins.mjs', ['--all', ...commandArgs]);
      break;

    // Maintenance
    case 'doctor':
      await runScript('tools/cli/doctor.mjs', commandArgs);
      break;

    case 'version':
      await displayVersion();
      break;

    case 'update':
      await forceUpdateCheck();
      break;

    case 'help':
      displayHelp();
      break;

    default:
      console.error(`Unknown command: ${rawCommand}`);
      console.log('Run `aiwg help` for usage information.');
      process.exit(1);
  }
}
