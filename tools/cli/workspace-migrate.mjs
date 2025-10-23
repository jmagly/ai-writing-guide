/**
 * CLI Workspace Migration Tool
 *
 * Migrates legacy .aiwg/ workspace structure to framework-scoped structure.
 * Provides interactive migration workflow with validation, backup, and reporting.
 *
 * @module tools/cli/workspace-migrate
 * @version 1.0.0
 * @since 2025-10-23
 *
 * @usage
 * # Detect legacy workspace
 * node tools/cli/workspace-migrate.mjs [project-root]
 * aiwg -migrate-workspace
 *
 * # Dry-run mode (simulate without changes)
 * node tools/cli/workspace-migrate.mjs --dry-run [project-root]
 * aiwg -migrate-workspace --dry-run
 *
 * # Skip backup creation
 * node tools/cli/workspace-migrate.mjs --no-backup [project-root]
 * aiwg -migrate-workspace --no-backup
 *
 * # Force overwrite existing files
 * node tools/cli/workspace-migrate.mjs --force [project-root]
 * aiwg -migrate-workspace --force
 *
 * # Non-interactive mode (auto-accept defaults)
 * node tools/cli/workspace-migrate.mjs --yes [project-root]
 * aiwg -migrate-workspace --yes
 *
 * @example
 * // Output example:
 * AI Writing Guide - Workspace Migration
 * ================================================================================
 *
 * Detecting legacy workspace...
 * ✓ Found legacy workspace at .aiwg/
 *   - Artifacts: 42 files
 *   - Size: 1.2 MB
 *   - Git tracked: Yes
 *
 * Detecting frameworks...
 * ✓ Detected frameworks:
 *   - sdlc-complete (35 artifacts)
 *
 * Validating migration...
 * ✓ Migration validation passed
 *   - Warnings: 0
 *   - Conflicts: 0
 *   - Estimated duration: ~1 second
 *
 * Migration Plan:
 *   Source: .aiwg/
 *   Target: .aiwg/frameworks/sdlc-complete/projects/default/
 *   Framework: sdlc-complete
 *   Backup: Yes
 *
 * Proceed with migration? [Y/n]: y
 *
 * Performing migration...
 * ✓ Backup created: .aiwg/backups/migration-1729699200000-abc123
 * ✓ Migrated 42 files
 * ✓ Migration complete (1.2s)
 *
 * Migration Report
 * ================================================================================
 * Migration ID: migration-1729699200000-abc123
 * Status: ✓ SUCCESS
 * Duration: 1200ms
 *
 * Statistics:
 *   Files Moved:   0
 *   Files Copied:  42
 *   Files Skipped: 0
 *
 * Backup Created: .aiwg/backups/migration-1729699200000-abc123
 *
 * No errors encountered.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

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
AI Writing Guide - Workspace Migration Tool

Migrates legacy .aiwg/ workspace structure to framework-scoped structure.

USAGE
  aiwg -migrate-workspace [options] [project-root]
  node tools/cli/workspace-migrate.mjs [options] [project-root]

OPTIONS
  --dry-run       Simulate migration without making changes
  --no-backup     Skip backup creation (not recommended)
  --force         Overwrite existing files in target
  --yes, -y       Non-interactive mode (auto-accept defaults)
  --help, -h      Show this help message

ARGUMENTS
  project-root    Path to project root (default: current directory)

EXAMPLES
  # Detect and migrate legacy workspace
  aiwg -migrate-workspace

  # Dry-run to preview changes
  aiwg -migrate-workspace --dry-run

  # Force migration without prompts
  aiwg -migrate-workspace --yes --force

  # Migrate specific project
  aiwg -migrate-workspace /path/to/project

MIGRATION PROCESS
  1. Detect legacy workspace structure (.aiwg/intake/, .aiwg/requirements/, etc.)
  2. Detect frameworks from artifact patterns (SDLC, Marketing, Agile)
  3. Validate migration safety (conflicts, permissions, disk space)
  4. Create backup (unless --no-backup specified)
  5. Migrate artifacts to framework-scoped structure
  6. Update framework registry
  7. Generate migration report

OUTPUT
  Displays migration progress, statistics, and detailed report.
  Creates backup at .aiwg/backups/migration-{timestamp}-{id}/
  Updates registry at .aiwg/frameworks/registry.json
`);
}

/**
 * Parse command-line arguments
 */
function parseArgs(args) {
  const options = {
    dryRun: false,
    backup: true,
    overwrite: false,
    interactive: true,
    projectRoot: process.cwd(),
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--no-backup') {
      options.backup = false;
    } else if (arg === '--force') {
      options.overwrite = true;
    } else if (arg === '--yes' || arg === '-y') {
      options.interactive = false;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('--')) {
      options.projectRoot = path.resolve(arg);
    }
  }

  return options;
}

/**
 * Prompt user for confirmation
 */
async function confirm(message, defaultYes = true) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const prompt = defaultYes ? `${message} [Y/n]: ` : `${message} [y/N]: `;

    rl.question(prompt, (answer) => {
      rl.close();

      const normalized = answer.toLowerCase().trim();

      if (!normalized) {
        resolve(defaultYes);
      } else {
        resolve(normalized === 'y' || normalized === 'yes');
      }
    });
  });
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
 * Format duration as human-readable string
 */
function formatDuration(seconds) {
  if (seconds < 1) {
    return `~${Math.ceil(seconds * 1000)}ms`;
  } else if (seconds < 60) {
    return `~${seconds} second${seconds !== 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `~${minutes}m ${remainingSeconds}s`;
  }
}

// ===========================
// Main Migration Flow
// ===========================

/**
 * Main migration command
 */
async function migrateWorkspace(args) {
  try {
    // Parse arguments
    const options = parseArgs(args);

    if (options.help) {
      displayHelp();
      return;
    }

    // Display header
    console.log('\nAI Writing Guide - Workspace Migration');
    console.log('='.repeat(80));
    console.log('');

    // Import WorkspaceMigrator (must use dynamic import for ES modules)
    const { WorkspaceMigrator } = await import('../../dist/plugin/workspace-migrator.js');

    // Initialize migrator
    const migrator = new WorkspaceMigrator(options.projectRoot);
    await migrator.initialize();

    // Step 1: Detect legacy workspace
    console.log('Detecting legacy workspace...');
    const legacy = await migrator.detectLegacyWorkspace();

    if (!legacy) {
      console.log('No legacy workspace detected.');
      console.log('');
      console.log('This project is either:');
      console.log('  - Already using framework-scoped workspace structure');
      console.log('  - Has no .aiwg/ directory yet');
      console.log('');
      console.log('No migration needed.');
      return;
    }

    console.log(`✓ Found legacy workspace at ${legacy.path}`);
    console.log(`  - Artifacts: ${legacy.artifactCount} files`);
    console.log(`  - Size: ${formatBytes(legacy.size)}`);
    console.log(`  - Git tracked: ${legacy.hasGit ? 'Yes' : 'No'}`);
    console.log('');

    // Step 2: Detect frameworks
    console.log('Detecting frameworks...');
    const frameworks = await migrator.detectFrameworks();

    if (frameworks.length === 0) {
      console.error('Error: Could not detect any frameworks from artifacts.');
      console.error('Defaulting to sdlc-complete framework.');
    }

    console.log('✓ Detected frameworks:');
    frameworks.forEach(framework => {
      console.log(`  - ${framework.name} (${framework.artifactCount} artifacts)`);
    });
    console.log('');

    // Use first detected framework
    const targetFramework = frameworks[0];

    // Step 3: Validate migration
    console.log('Validating migration...');
    const validation = await migrator.validateMigration({
      sourcePath: legacy.path,
      targetPath: targetFramework.path,
      framework: targetFramework.name
    });

    if (!validation.safe) {
      console.error('❌ Migration validation failed');
      console.error('');
      console.error('Issues found:');
      validation.conflicts
        .filter(c => c.resolution === 'manual')
        .forEach((conflict, index) => {
          console.error(`  ${index + 1}. [${conflict.type.toUpperCase()}] ${conflict.path}`);
          console.error(`     ${conflict.description}`);
        });
      console.error('');
      console.error('Please resolve these issues manually before migration.');
      process.exit(1);
    }

    console.log('✓ Migration validation passed');
    console.log(`  - Warnings: ${validation.warnings.length}`);
    console.log(`  - Conflicts: ${validation.conflicts.length}`);
    console.log(`  - Estimated duration: ${formatDuration(validation.estimatedDuration)}`);
    console.log('');

    if (validation.warnings.length > 0) {
      console.log('Warnings:');
      validation.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
      console.log('');
    }

    if (validation.conflicts.length > 0 && options.overwrite) {
      console.log('Conflicts (will be overwritten with --force):');
      validation.conflicts.forEach((conflict, index) => {
        console.log(`  ${index + 1}. ${conflict.path}`);
      });
      console.log('');
    }

    // Step 4: Display migration plan
    console.log('Migration Plan:');
    console.log(`  Source: ${legacy.path}`);
    console.log(`  Target: ${targetFramework.path}`);
    console.log(`  Framework: ${targetFramework.name}`);
    console.log(`  Backup: ${options.backup ? 'Yes' : 'No (--no-backup)'}`);
    console.log(`  Mode: ${options.dryRun ? 'Dry-run (no changes)' : 'Live migration'}`);
    console.log('');

    // Step 5: Confirm migration
    if (options.interactive) {
      const proceed = await confirm('Proceed with migration?', true);

      if (!proceed) {
        console.log('Migration cancelled by user.');
        return;
      }
      console.log('');
    }

    // Step 6: Perform migration
    console.log('Performing migration...');
    const result = await migrator.migrate({
      source: legacy.path,
      target: targetFramework.path,
      framework: targetFramework.name,
      backup: options.backup,
      dryRun: options.dryRun,
      overwrite: options.overwrite
    });

    if (result.backupPath) {
      console.log(`✓ Backup created: ${result.backupPath}`);
    }

    if (options.dryRun) {
      console.log(`✓ Dry-run complete (no changes made)`);
    } else {
      console.log(`✓ Migrated ${result.filesCopiedCount} files`);
    }

    console.log(`✓ Migration ${result.success ? 'complete' : 'completed with errors'} (${(result.duration / 1000).toFixed(1)}s)`);
    console.log('');

    // Step 7: Display report
    const report = migrator.generateReport(result);
    console.log(report);

    if (!result.success) {
      process.exit(1);
    }

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
  await migrateWorkspace(args);
}

export { migrateWorkspace };
