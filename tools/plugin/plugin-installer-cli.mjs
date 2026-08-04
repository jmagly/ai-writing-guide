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

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importImpl } from '../_resolve-impl.mjs';

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Try to import from dist first, then from src via tsx
async function loadPluginInstaller() {
  try {
    return await importImpl(import.meta.url, 'plugin/plugin-installer.js');
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
      options.type = requiredValue(args, ++i, '--type');
    } else if (arg === '--parent') {
      options.parent = requiredValue(args, ++i, '--parent');
    } else if (arg === '--source') {
      options.source = requiredValue(args, ++i, '--source');
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

function requiredValue(args, index, flag) {
  const value = args[index];
  if (typeof value !== 'string' || value.length === 0 || value.startsWith('-')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function isGitUrl(value) {
  return /^(?:https?|ssh|git):\/\//i.test(value) || /^git@[^:]+:.+/.test(value);
}

async function resolveSource(options) {
  const requested = options.source ?? options.pluginId;
  if (isGitUrl(requested)) {
    throw new Error(
      `Git URL sources are handled by the package installer. Run \`aiwg install ${requested}${options.dryRun ? ' --dry-run' : ''}\`, then \`aiwg use <plugin-id>\`.`,
    );
  }
  const source = path.resolve(process.cwd(), requested);
  let stat;
  try {
    stat = await fs.stat(source);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Plugin source does not exist: ${source}`);
    }
    throw error;
  }
  if (!stat.isDirectory()) throw new Error(`Plugin source must be a directory: ${source}`);

  const manifestPath = path.join(source, 'manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`Plugin manifest not found: ${manifestPath}`);
    if (error instanceof SyntaxError) throw new Error(`Plugin manifest is not valid JSON: ${manifestPath}`);
    throw error;
  }
  if (manifest?.type === 'plugin' || manifest?.pluginConfig) {
    throw new Error(
      `Standalone plugin wrappers use the package workflow. Run \`aiwg install ${source}${options.dryRun ? ' --dry-run' : ''}\`, then \`aiwg use ${manifest?.id ?? options.pluginId}\`.`,
    );
  }
  return source;
}

function printHelp() {
  console.log(`
Plugin Installer CLI

Installs plugins (frameworks, add-ons, extensions) with dependency resolution.

USAGE:
  aiwg install-plugin <plugin-id> [options]

ARGUMENTS:
  <plugin-id>         Plugin ID to install (e.g., sdlc-complete, gdpr-compliance)

OPTIONS:
  --type <type>       Plugin type: framework, add-on, extension
  --parent <id>       Parent framework ID (required for add-ons)
  --source <path>     Install a legacy framework/add-on/extension manifest from a local directory
  --dry-run           Preview installation without executing
  --force             Overwrite existing installation
  --help, -h          Show this help message

EXAMPLES:
  # Install SDLC framework
  aiwg -install-plugin sdlc-complete

  # Install add-on with parent framework
  aiwg -install-plugin gdpr-compliance --parent sdlc-complete

  # Install a legacy local manifest
  aiwg install-plugin my-custom-plugin --source ./my-custom-plugin --type extension

  # Standalone wrappers and Git URLs use the package workflow
  aiwg install <path-or-git-url> --dry-run
  aiwg use <plugin-id>

  # Preview installation
  aiwg -install-plugin marketing-flow --dry-run
`);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(2);
  }

  if (options.help || !options.pluginId) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  try {
    const { PluginInstaller } = await loadPluginInstaller();

    const aiwgRoot = process.env.AIWG_ROOT
      ? path.resolve(process.env.AIWG_ROOT)
      : SCRIPT_ROOT;
    const installer = new PluginInstaller(aiwgRoot);
    const source = await resolveSource(options);

    console.log(`Installing plugin: ${options.pluginId}...`);

    if (options.dryRun) {
      console.log('[DRY RUN] No changes will be made\n');
    }

    const result = await installer.install(source, {
      type: options.type,
      parentFramework: options.parent,
      dryRun: options.dryRun,
      force: options.force,
    });

    if (result.success) {
      console.log(`\n✓ Plugin ${options.pluginId} installed successfully`);
      if (result.directories) {
        console.log('  Created directories:');
        result.directories.forEach(d => console.log(`    - ${d}`));
      }
    } else {
      console.error(`\n✗ Failed to install plugin: ${(result.errors ?? []).join('; ') || 'unknown installer error'}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
