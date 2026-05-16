#!/usr/bin/env node
/**
 * CLI Workspace Status Tool
 *
 * Shows workspace health, installed frameworks, and migration status.
 *
 * @module tools/cli/workspace-status
 * @version 1.0.0
 * @since 2025-12-09
 *
 * @usage
 * # Show workspace status
 * aiwg -status
 *
 * # Show detailed framework health
 * aiwg -status --verbose
 *
 * # Output as JSON
 * aiwg -status --json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================
// CLI Helpers
// ===========================

/**
 * Display help message
 */
function displayHelp() {
  console.log(`
AIWG - Workspace Status Tool

Shows workspace health, installed frameworks, and migration status.

USAGE
  aiwg -status [options] [project-root]
  node tools/cli/workspace-status.mjs [options] [project-root]

OPTIONS
  --verbose, -v   Show detailed information
  --json          Output as JSON
  --help, -h      Show this help message

ARGUMENTS
  project-root    Path to project root (default: current directory)

EXAMPLES
  # Show workspace status
  aiwg -status

  # Show detailed framework health
  aiwg -status --verbose

  # Output as JSON for scripting
  aiwg -status --json
`);
}

/**
 * Parse command-line arguments
 */
function parseArgs(args) {
  const options = {
    verbose: false,
    json: false,
    projectRoot: process.cwd(),
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
      options.projectRoot = path.resolve(arg);
    }
  }

  return options;
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get status emoji
 */
function statusEmoji(status) {
  switch (status) {
    case 'healthy':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    default:
      return '❓';
  }
}

function normalizeRegistryFrameworks(registry) {
  if (!registry || !registry.frameworks) return [];

  const entries = Array.isArray(registry.frameworks)
    ? registry.frameworks.map((data) => [data?.id, data])
    : Object.entries(registry.frameworks);

  return entries
    .filter(([id]) => typeof id === 'string' && id.length > 0)
    .map(([id, data]) => ({
      id,
      type: data.type || 'framework',
      version: data.version || 'unknown',
      health: data.health || 'healthy',
      installDate: data.installed || data.installedAt || data['install-date'] || 'unknown'
    }));
}

async function countDirEntries(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.length;
  } catch {
    return 0;
  }
}

async function collectProviderDeployments(projectRoot) {
  const providers = [
    { name: 'claude-code', path: '.claude', artifactDirs: ['agents', 'commands', 'skills', 'rules', 'behaviors'] },
    { name: 'codex', path: '.codex', artifactDirs: ['agents', 'prompts', 'skills', 'rules'] },
    { name: 'copilot', path: '.github', artifactDirs: ['prompts', 'instructions'] },
    { name: 'cursor', path: '.cursor', artifactDirs: ['agents', 'commands', 'skills', 'rules'] },
    { name: 'opencode', path: '.opencode', artifactDirs: ['agent', 'command', 'skill', 'rule'] },
    { name: 'warp', path: '.warp', artifactDirs: ['agents', 'commands', 'skills', 'rules'] },
    { name: 'universal', path: '.agents', artifactDirs: ['agents', 'commands', 'skills', 'rules'] }
  ];

  const deployments = [];
  for (const provider of providers) {
    const providerPath = path.join(projectRoot, provider.path);
    try {
      await fs.access(providerPath);
    } catch {
      continue;
    }

    const counts = {};
    for (const dir of provider.artifactDirs) {
      const count = await countDirEntries(path.join(providerPath, dir));
      if (count > 0) counts[dir] = count;
    }
    deployments.push({
      name: provider.name,
      path: provider.path,
      counts
    });
  }
  return deployments;
}

async function collectProjectLocalBundles(aiwgPath, installedFrameworkIds = new Set()) {
  const bundleDirs = ['extensions', 'addons', 'frameworks', 'plugins'];
  const bundles = [];
  for (const type of bundleDirs) {
    const typeDir = path.join(aiwgPath, type);
    let entries;
    try {
      entries = await fs.readdir(typeDir, { withFileTypes: true });
    } catch {
      continue;
    }

    const names = entries
      .filter(entry => entry.isDirectory())
      .filter(entry => type !== 'frameworks' || !installedFrameworkIds.has(entry.name))
      .map(entry => entry.name)
      .sort();
    if (names.length > 0) {
      bundles.push({ type, count: names.length, names });
    }
  }
  return bundles;
}

// ===========================
// Main Status Flow
// ===========================

/**
 * Main status command
 */
async function workspaceStatus(args) {
  try {
    // Parse arguments
    const options = parseArgs(args);

    if (options.help) {
      displayHelp();
      return;
    }

    const aiwgPath = path.join(options.projectRoot, '.aiwg');
    const result = {
      workspace: {
        path: aiwgPath,
        exists: false,
        isLegacy: false,
        isFrameworkScoped: false
      },
      frameworks: [],
      providerDeployments: [],
      projectLocalBundles: [],
      health: {
        overall: 'unknown',
        issues: []
      },
      migration: {
        status: 'unknown',
        backupsAvailable: 0
      }
    };

    // Check if .aiwg/ exists
    try {
      await fs.access(aiwgPath);
      result.workspace.exists = true;
    } catch {
      result.workspace.exists = false;
    }

    if (!result.workspace.exists) {
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('\nAIWG - Workspace Status');
        console.log('='.repeat(60));
        console.log('');
        console.log('No .aiwg/ workspace found in this project.');
        console.log('');
        console.log('To create a workspace:');
        console.log('  aiwg use sdlc        # Install SDLC framework');
        console.log('  aiwg use marketing   # Install Marketing framework');
        console.log('  aiwg use all         # Install all frameworks');
      }
      return;
    }

    // Check workspace structure
    const frameworksDir = path.join(aiwgPath, 'frameworks');
    const legacyDirs = ['intake', 'requirements', 'architecture', 'planning', 'testing'];

    // Check for framework-scoped structure
    try {
      await fs.access(frameworksDir);
      result.workspace.isFrameworkScoped = true;
    } catch {
      result.workspace.isFrameworkScoped = false;
    }

    // Check for legacy structure
    for (const dir of legacyDirs) {
      try {
        await fs.access(path.join(aiwgPath, dir));
        result.workspace.isLegacy = true;
        break;
      } catch {
        // Directory doesn't exist
      }
    }

    // Determine migration status
    if (result.workspace.isFrameworkScoped && !result.workspace.isLegacy) {
      result.migration.status = 'completed';
    } else if (result.workspace.isLegacy && !result.workspace.isFrameworkScoped) {
      result.migration.status = 'pending';
    } else if (result.workspace.isLegacy && result.workspace.isFrameworkScoped) {
      result.migration.status = 'partial';
    } else {
      result.migration.status = 'none';
    }

    // Count backups
    const parentDir = path.dirname(aiwgPath);
    try {
      const entries = await fs.readdir(parentDir);
      result.migration.backupsAvailable = entries.filter(
        name => name.startsWith('.aiwg.backup.')
      ).length;
    } catch {
      result.migration.backupsAvailable = 0;
    }

    // Try to load registry for framework info
    const registryPath = path.join(frameworksDir, 'registry.json');
    try {
      const registryContent = await fs.readFile(registryPath, 'utf8');
      const registry = JSON.parse(registryContent);
      result.frameworks = normalizeRegistryFrameworks(registry);
    } catch {
      // Registry not found or invalid
    }

    result.providerDeployments = await collectProviderDeployments(options.projectRoot);
    result.projectLocalBundles = await collectProjectLocalBundles(
      aiwgPath,
      new Set(result.frameworks.map(framework => framework.id))
    );

    // Determine overall health
    if (result.frameworks.length === 0) {
      result.health.overall = 'unknown';
    } else {
      const hasErrors = result.frameworks.some(f => f.health === 'error');
      const hasWarnings = result.frameworks.some(f => f.health === 'warning');

      if (hasErrors) {
        result.health.overall = 'error';
      } else if (hasWarnings) {
        result.health.overall = 'warning';
      } else {
        result.health.overall = 'healthy';
      }
    }

    // Check for common issues
    if (result.workspace.isLegacy && !result.workspace.isFrameworkScoped) {
      result.health.issues.push({
        severity: 'warning',
        message: 'Legacy workspace structure detected. Consider migrating.',
        action: 'aiwg -migrate-workspace'
      });
    }

    // Output results
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // Text output
    console.log('\nAIWG - Workspace Status');
    console.log('='.repeat(60));
    console.log('');

    // Workspace info
    console.log('Workspace:');
    console.log(`  Path: ${result.workspace.path}`);
    console.log(`  Structure: ${result.workspace.isFrameworkScoped ? 'Framework-scoped' : 'Legacy'}`);
    console.log('');

    // Migration status
    console.log('Migration:');
    switch (result.migration.status) {
      case 'completed':
        console.log('  Status: ✅ Completed');
        break;
      case 'pending':
        console.log('  Status: ⚠️  Pending (legacy structure)');
        console.log('  Action: Run "aiwg -migrate-workspace" to migrate');
        break;
      case 'partial':
        console.log('  Status: ⚠️  Partial (mixed structure)');
        console.log('  Action: Run "aiwg -migrate-workspace" to complete');
        break;
      default:
        console.log('  Status: ❓ Unknown');
    }
    if (result.migration.backupsAvailable > 0) {
      console.log(`  Backups: ${result.migration.backupsAvailable} available`);
    }
    console.log('');

    // Frameworks
    console.log('Installed Frameworks (registry):');
    if (result.frameworks.length === 0) {
      console.log('  (none)');
      console.log('');
      console.log('  To install frameworks:');
      console.log('    aiwg use sdlc');
      console.log('    aiwg use marketing');
    } else {
      for (const framework of result.frameworks) {
        const emoji = statusEmoji(framework.health);
        console.log(`  ${emoji} ${framework.id}`);
        if (options.verbose) {
          console.log(`     Type: ${framework.type}`);
          console.log(`     Version: ${framework.version}`);
          console.log(`     Health: ${framework.health}`);
          console.log(`     Installed: ${framework.installDate}`);
        }
      }
    }
    console.log('');

    // Provider deployment summary
    console.log('Provider Deployments:');
    if (result.providerDeployments.length === 0) {
      console.log('  (none detected)');
    } else {
      for (const deployment of result.providerDeployments) {
        const counts = Object.entries(deployment.counts)
          .map(([kind, count]) => `${kind}: ${count}`)
          .join('   ');
        console.log(`  ${deployment.name.padEnd(16)} ${deployment.path.padEnd(12)} ${counts || '(no artifacts counted)'}`);
      }
    }
    console.log('');

    // Project-local bundle summary
    console.log('Project-local Bundles:');
    if (result.projectLocalBundles.length === 0) {
      console.log('  (none detected)');
    } else {
      for (const group of result.projectLocalBundles) {
        console.log(`  ${group.type.padEnd(12)} ${group.count} (${group.names.join(', ')})`);
      }
    }
    console.log('');

    // Health summary
    console.log('Health:');
    console.log(`  Overall: ${statusEmoji(result.health.overall)} ${result.health.overall}`);
    if (result.health.issues.length > 0) {
      console.log('  Issues:');
      for (const issue of result.health.issues) {
        console.log(`    ${statusEmoji(issue.severity)} ${issue.message}`);
        if (issue.action) {
          console.log(`      → ${issue.action}`);
        }
      }
    }
    console.log('');

  } catch (error) {
    console.error(`\nError: ${error.message}`);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ===========================
// CLI Entry Point
// ===========================

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  await workspaceStatus(args);
}

export { workspaceStatus };
