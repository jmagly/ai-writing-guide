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
 * Display help message
 */
function displayHelp() {
  console.log(`
AIWG - AI Writing Guide CLI

Usage: aiwg <command> [options]

Framework Management:
  use <framework>       Install and deploy framework (sdlc, marketing, writing, all)
                        Options: --no-utils, --provider <claude|factory|openai>, --force
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
  mcp install [target]  Generate MCP client config (claude, factory, cursor)
  mcp info              Show MCP server capabilities

Utilities:
  -prefill-cards        Prefill SDLC card metadata from team profile
  -contribute-start     Start AIWG contribution workflow
  -validate-metadata    Validate plugin/agent metadata

Channel Management:
  --use-main            Switch to edge channel (bleeding edge from main branch)
  --use-stable          Switch to stable channel (npm package)

Maintenance:
  -version              Show version and channel info
  -update               Check for and apply updates
  -help                 Show this help message

Platform Options:
  --provider factory    Deploy for Factory AI
  --provider openai     Deploy for OpenAI/Codex

Examples:
  aiwg use sdlc                    Install SDLC framework
  aiwg use all --provider factory  Install all frameworks for Factory AI
  aiwg -new                        Create new project
  aiwg --use-main                  Switch to bleeding edge mode
  aiwg mcp serve                   Start MCP server
  aiwg mcp install claude          Configure Claude Code to use AIWG MCP
  aiwg mcp install factory         Configure Factory AI to use AIWG MCP
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
 * Main CLI runner
 * @param {string[]} args - Command line arguments
 * @param {object} options - Options including packageRoot
 */
export async function run(args, options = {}) {
  const command = args[0];
  const commandArgs = args.slice(1);

  // No command - show help
  if (!command) {
    displayHelp();
    return;
  }

  // Route commands
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
    case '-new':
    case '--new':
      await runScript('tools/install/new-project.mjs', commandArgs);
      break;

    // Workspace management
    case '-status':
    case '--status':
    case 'status':
      await runScript('tools/cli/workspace-status.mjs', commandArgs);
      break;

    case '-migrate-workspace':
    case '--migrate-workspace':
      await runScript('tools/cli/workspace-migrate.mjs', commandArgs);
      break;

    case '-rollback-workspace':
    case '--rollback-workspace':
      await runScript('tools/cli/workspace-rollback.mjs', commandArgs);
      break;

    // MCP Server
    case 'mcp':
      const { main: mcpMain } = await import('../mcp/cli.mjs');
      await mcpMain(commandArgs);
      break;

    // Utilities
    case '-prefill-cards':
    case '--prefill-cards':
      await runScript('tools/cards/prefill-cards.mjs', commandArgs);
      break;

    case '-contribute-start':
    case '--contribute-start':
      await runScript('tools/contrib/start-contribution.mjs', commandArgs);
      break;

    case '-validate-metadata':
    case '--validate-metadata':
      await runScript('tools/cli/validate-metadata.mjs', commandArgs);
      break;

    case '-install-plugin':
    case '--install-plugin':
      await runScript('tools/plugin/plugin-installer-cli.mjs', commandArgs);
      break;

    case '-uninstall-plugin':
    case '--uninstall-plugin':
      await runScript('tools/plugin/plugin-uninstaller-cli.mjs', commandArgs);
      break;

    case '-plugin-status':
    case '--plugin-status':
      await runScript('tools/plugin/plugin-status-cli.mjs', commandArgs);
      break;

    // Legacy commands (deprecated)
    case '-deploy-agents':
    case '--deploy-agents':
      console.log('[DEPRECATED] Use: aiwg use <framework> instead');
      await runScript('tools/agents/deploy-agents.mjs', commandArgs);
      break;

    case '-deploy-commands':
    case '--deploy-commands':
      console.log('[DEPRECATED] Use: aiwg use <framework> instead');
      await runScript('tools/agents/deploy-agents.mjs', ['--deploy-commands', ...commandArgs]);
      break;

    // Maintenance
    case '-version':
    case '--version':
    case 'version':
      await displayVersion();
      break;

    case '-update':
    case '--update':
    case 'update':
      await forceUpdateCheck();
      break;

    case '-h':
    case '--help':
    case '-help':
    case 'help':
      displayHelp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run `aiwg -help` for usage information.');
      process.exit(1);
  }
}
