#!/usr/bin/env node
/**
 * Plugin Status CLI
 *
 * Shows status of installed plugins including health, dependencies, and projects.
 *
 * Usage:
 *   node tools/plugin/plugin-status-cli.mjs [plugin-id] [options]
 *
 * Options:
 *   --all              Show all plugins (default if no plugin-id)
 *   --type <type>      Filter by type: framework, add-on, extension
 *   --health           Run health checks
 *   --json             Output as JSON
 *   --help             Show this help message
 *
 * @module tools/plugin/plugin-status-cli
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadPluginStatus() {
  const distPath = resolve(__dirname, '../../dist/plugin/plugin-status.js');
  const srcPath = resolve(__dirname, '../../src/plugin/plugin-status.ts');

  try {
    if (existsSync(distPath)) {
      return await import(distPath);
    }
  } catch (e) {
    // Fall through to src
  }

  try {
    return await import(srcPath);
  } catch (e) {
    console.error('Failed to load plugin-status module');
    console.error('Run `npm run build` to compile TypeScript files');
    process.exit(1);
  }
}

function parseArgs(args) {
  const options = {
    pluginId: null,
    all: false,
    type: null,
    health: false,
    json: false,
    help: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--type') {
      options.type = args[++i];
    } else if (arg === '--health') {
      options.health = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (!arg.startsWith('-') && !options.pluginId) {
      options.pluginId = arg;
    }
    i++;
  }

  // Default to --all if no plugin specified
  if (!options.pluginId) {
    options.all = true;
  }

  return options;
}

function printHelp() {
  console.log(`
Plugin Status CLI

Shows status of installed plugins including health, dependencies, and projects.

USAGE:
  aiwg -plugin-status [plugin-id] [options]

ARGUMENTS:
  [plugin-id]         Plugin ID to check (optional, shows all if omitted)

OPTIONS:
  --all               Show all installed plugins
  --type <type>       Filter by type: framework, add-on, extension
  --health            Run health checks on plugins
  --json              Output as JSON
  --help, -h          Show this help message

EXAMPLES:
  # Show all installed plugins
  aiwg -plugin-status

  # Show specific plugin details
  aiwg -plugin-status sdlc-complete

  # Show only frameworks
  aiwg -plugin-status --type framework

  # Run health checks
  aiwg -plugin-status --health

  # Output as JSON
  aiwg -plugin-status --json
`);
}

function formatPluginStatus(plugin) {
  const lines = [];
  lines.push(`  ${plugin.id} (${plugin.type})`);
  lines.push(`    Version: ${plugin.version || 'unknown'}`);
  lines.push(`    Health: ${plugin.health || 'unknown'}`);
  if (plugin.parent) {
    lines.push(`    Parent: ${plugin.parent}`);
  }
  if (plugin.projects && plugin.projects.length > 0) {
    lines.push(`    Projects: ${plugin.projects.length}`);
  }
  if (plugin['install-date']) {
    lines.push(`    Installed: ${plugin['install-date']}`);
  }
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  try {
    const { PluginStatus } = await loadPluginStatus();

    const status = new PluginStatus();

    let result;
    if (options.pluginId && !options.all) {
      result = await status.getStatus(options.pluginId, { runHealth: options.health });
    } else {
      result = await status.listAll({
        type: options.type,
        runHealth: options.health
      });
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (Array.isArray(result)) {
      if (result.length === 0) {
        console.log('No plugins installed');
        if (options.type) {
          console.log(`(filtered by type: ${options.type})`);
        }
      } else {
        console.log(`Installed Plugins (${result.length}):\n`);
        result.forEach(plugin => {
          console.log(formatPluginStatus(plugin));
          console.log('');
        });
      }
    } else if (result) {
      console.log(`Plugin: ${result.id}\n`);
      console.log(formatPluginStatus(result));
    } else {
      console.log(`Plugin not found: ${options.pluginId}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
