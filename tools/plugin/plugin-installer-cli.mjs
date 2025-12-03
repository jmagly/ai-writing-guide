#!/usr/bin/env node
/**
 * Plugin Installer CLI
 *
 * Installs plugins (frameworks, add-ons, extensions) with dependency resolution.
 *
 * Usage:
 *   node tools/plugin/plugin-installer-cli.mjs <plugin-id> [options]
 *
 * Options:
 *   --type <type>      Plugin type: framework, add-on, extension (default: auto-detect)
 *   --parent <id>      Parent framework ID (required for add-ons)
 *   --source <path>    Install from local path instead of registry
 *   --dry-run          Preview without installing
 *   --force            Overwrite existing installation
 *   --help             Show this help message
 *
 * @module tools/plugin/plugin-installer-cli
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to import from dist first, then from src via tsx
async function loadPluginInstaller() {
  const distPath = resolve(__dirname, '../../dist/plugin/plugin-installer.js');
  const srcPath = resolve(__dirname, '../../src/plugin/plugin-installer.ts');

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
    console.error('Failed to load plugin-installer module');
    console.error('Run `npm run build` to compile TypeScript files');
    process.exit(1);
  }
}

function parseArgs(args) {
  const options = {
    pluginId: null,
    type: null,
    parent: null,
    source: null,
    dryRun: false,
    force: false,
    help: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--type') {
      options.type = args[++i];
    } else if (arg === '--parent') {
      options.parent = args[++i];
    } else if (arg === '--source') {
      options.source = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (!arg.startsWith('-') && !options.pluginId) {
      options.pluginId = arg;
    }
    i++;
  }

  return options;
}

function printHelp() {
  console.log(`
Plugin Installer CLI

Installs plugins (frameworks, add-ons, extensions) with dependency resolution.

USAGE:
  aiwg -install-plugin <plugin-id> [options]

ARGUMENTS:
  <plugin-id>         Plugin ID to install (e.g., sdlc-complete, gdpr-compliance)

OPTIONS:
  --type <type>       Plugin type: framework, add-on, extension
  --parent <id>       Parent framework ID (required for add-ons)
  --source <path>     Install from local path instead of registry
  --dry-run           Preview installation without executing
  --force             Overwrite existing installation
  --help, -h          Show this help message

EXAMPLES:
  # Install SDLC framework
  aiwg -install-plugin sdlc-complete

  # Install add-on with parent framework
  aiwg -install-plugin gdpr-compliance --parent sdlc-complete

  # Install from local path
  aiwg -install-plugin ./my-custom-plugin --type extension

  # Preview installation
  aiwg -install-plugin marketing-flow --dry-run
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
    const { PluginInstaller } = await loadPluginInstaller();

    const installer = new PluginInstaller({
      dryRun: options.dryRun,
      force: options.force
    });

    console.log(`Installing plugin: ${options.pluginId}...`);

    if (options.dryRun) {
      console.log('[DRY RUN] No changes will be made\n');
    }

    const result = await installer.install(options.pluginId, {
      type: options.type,
      parent: options.parent,
      source: options.source
    });

    if (result.success) {
      console.log(`\n✓ Plugin ${options.pluginId} installed successfully`);
      if (result.directories) {
        console.log('  Created directories:');
        result.directories.forEach(d => console.log(`    - ${d}`));
      }
    } else {
      console.error(`\n✗ Failed to install plugin: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
