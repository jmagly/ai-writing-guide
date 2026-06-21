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

import { pathToFileURL } from 'url';
import { importImpl } from '../_resolve-impl.mjs';

async function loadPluginUninstaller() {
  try {
    return await importImpl(import.meta.url, 'plugin/plugin-uninstaller.js');
  } catch (e) {
    console.error('Failed to load plugin-uninstaller module');
    console.error('Run `npm run build` to compile TypeScript files');
    process.exit(1);
  }
}

/**
 * Parse CLI arguments. Unknown flags are recorded in `unknownFlag` (the first
 * one seen) rather than silently dropped — `main()` reports them and exits
 * non-zero instead of letting a stray flag shift positionals (#118).
 *
 * @param {string[]} args
 * @returns {{pluginId:string|null, force:boolean, keepData:boolean, dryRun:boolean, help:boolean, unknownFlag:string|null}}
 */
export function parseArgs(args) {
  const options = {
    pluginId: null,
    force: false,
    keepData: false,
    dryRun: false,
    help: false,
    unknownFlag: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--keep-data') {
      options.keepData = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('-')) {
      // Unknown flag — record the first occurrence; main() reports + exits.
      if (!options.unknownFlag) options.unknownFlag = arg;
    } else if (!options.pluginId) {
      options.pluginId = arg;
    }
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

  // Reject unknown flags before any work (#118). `--provider` in particular is
  // a natural reach for scoping removal, but it is not supported here.
  if (options.unknownFlag) {
    console.error(`Error: unknown flag ${options.unknownFlag}`);
    if (options.unknownFlag === '--provider') {
      console.error(
        'Provider-scoped removal is not supported by `aiwg remove`. ' +
        'Remove the plugin by id, or delete the provider-deployed artifacts manually. See jmagly/aiwg#118.'
      );
    }
    console.error('Usage: aiwg remove <plugin-id> [--force] [--keep-data] [--dry-run]');
    process.exit(2);
  }

  if (options.help || !options.pluginId) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  try {
    const { createUninstaller } = await loadPluginUninstaller();

    // Use the factory so the uninstaller is constructed with the resolved AIWG
    // root (a string). The previous `new PluginUninstaller({...})` passed an
    // options object as the `aiwgRoot` constructor arg, so `path.join(obj,
    // 'registry.json')` threw "path argument must be of type string" before
    // doing any work (#118).
    const uninstaller = createUninstaller();

    console.log(`Uninstalling plugin: ${options.pluginId}...`);

    if (options.dryRun) {
      console.log('[DRY RUN] No changes will be made\n');
    }

    // Options must be passed to uninstall() — they were previously collected
    // then dropped, leaving --force/--keep-data/--dry-run inert (#118).
    const result = await uninstaller.uninstall(options.pluginId, {
      force: options.force,
      dryRun: options.dryRun,
      keepProjects: options.keepData
    });

    if (result.success) {
      console.log(`\n✓ Plugin ${options.pluginId} uninstalled successfully`);
      const stats = result.stats || {};
      if (stats.dirsRemoved || stats.filesRemoved) {
        console.log(`  Removed ${stats.dirsRemoved} director${stats.dirsRemoved === 1 ? 'y' : 'ies'}, ${stats.filesRemoved} file${stats.filesRemoved === 1 ? '' : 's'}`);
      }
      if (stats.projectsArchived) {
        console.log(`  Archived ${stats.projectsArchived} project(s)`);
      }
      for (const w of result.warnings || []) console.warn(`  ⚠ ${w}`);
    } else {
      const detail = result.errors && result.errors.length
        ? result.errors.join('; ')
        : 'unknown error';
      console.error(`\n✗ Failed to uninstall plugin: ${detail}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Only run when invoked directly (so the module is importable for testing
// parseArgs without triggering a real uninstall).
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main();
}
