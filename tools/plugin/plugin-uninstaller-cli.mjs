#!/usr/bin/env node
/**
 * Plugin Uninstaller CLI
 *
 * Uninstalls plugins with dependency checking and cleanup.
 *
 * Usage:
 *   node tools/plugin/plugin-uninstaller-cli.mjs <plugin-id> [options]
 *
 * Options:
 *   --force            Skip dependency checks and force removal
 *   --keep-data        Keep plugin data/projects (only remove code)
 *   --dry-run          Preview without uninstalling
 *   --help             Show this help message
 *
 * @module tools/plugin/plugin-uninstaller-cli
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadPluginUninstaller() {
  const distPath = resolve(__dirname, '../../dist/plugin/plugin-uninstaller.js');
  const srcPath = resolve(__dirname, '../../src/plugin/plugin-uninstaller.ts');

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
    console.error('Failed to load plugin-uninstaller module');
    console.error('Run `npm run build` to compile TypeScript files');
    process.exit(1);
  }
}

function parseArgs(args) {
  const options = {
    pluginId: null,
    force: false,
    keepData: false,
    dryRun: false,
    help: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--keep-data') {
      options.keepData = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (!arg.startsWith('-') && !options.pluginId) {
      options.pluginId = arg;
    }
    i++;
  }

  return options;
}

function printHelp() {
  console.log(`
Plugin Uninstaller CLI

Uninstalls plugins with dependency checking and cleanup.

USAGE:
  aiwg -uninstall-plugin <plugin-id> [options]

ARGUMENTS:
  <plugin-id>         Plugin ID to uninstall

OPTIONS:
  --force             Skip dependency checks and force removal
  --keep-data         Keep plugin data/projects (only remove code)
  --dry-run           Preview uninstallation without executing
  --help, -h          Show this help message

EXAMPLES:
  # Uninstall a plugin
  aiwg -uninstall-plugin gdpr-compliance

  # Force uninstall (ignores dependencies)
  aiwg -uninstall-plugin sdlc-complete --force

  # Keep project data
  aiwg -uninstall-plugin marketing-flow --keep-data

  # Preview uninstallation
  aiwg -uninstall-plugin my-plugin --dry-run
`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help || !options.pluginId) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  try {
    const { PluginUninstaller } = await loadPluginUninstaller();

    const uninstaller = new PluginUninstaller({
      dryRun: options.dryRun,
      force: options.force,
      keepData: options.keepData
    });

    console.log(`Uninstalling plugin: ${options.pluginId}...`);

    if (options.dryRun) {
      console.log('[DRY RUN] No changes will be made\n');
    }

    const result = await uninstaller.uninstall(options.pluginId);

    if (result.success) {
      console.log(`\n✓ Plugin ${options.pluginId} uninstalled successfully`);
      if (result.removedDirectories) {
        console.log('  Removed directories:');
        result.removedDirectories.forEach(d => console.log(`    - ${d}`));
      }
    } else {
      console.error(`\n✗ Failed to uninstall plugin: ${result.error}`);
      if (result.dependents && result.dependents.length > 0) {
        console.error('  Dependent plugins that must be removed first:');
        result.dependents.forEach(d => console.error(`    - ${d}`));
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
