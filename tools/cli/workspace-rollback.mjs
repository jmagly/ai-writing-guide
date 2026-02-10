/**
 * CLI Workspace Rollback Tool
 *
 * Rolls back workspace migration from backup.
 *
 * @module tools/cli/workspace-rollback
 * @version 1.0.0
 * @since 2025-12-09
 *
 * @usage
 * # Rollback to most recent backup
 * aiwg -rollback-workspace
 *
 * # List available backups
 * aiwg -rollback-workspace --list
 *
 * # Rollback to specific backup
 * aiwg -rollback-workspace --backup <backup-path>
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
AIWG - Workspace Rollback Tool

Rolls back workspace migration from backup.

USAGE
  aiwg -rollback-workspace [options] [project-root]
  node tools/cli/workspace-rollback.mjs [options] [project-root]

OPTIONS
  --list          List available backups
  --backup <path> Rollback to specific backup
  --yes, -y       Non-interactive mode (auto-accept)
  --help, -h      Show this help message

ARGUMENTS
  project-root    Path to project root (default: current directory)

EXAMPLES
  # Rollback to most recent backup
  aiwg -rollback-workspace

  # List available backups
  aiwg -rollback-workspace --list

  # Rollback to specific backup
  aiwg -rollback-workspace --backup .aiwg.backup.2025-12-09T10-30-00-000Z

  # Force rollback without prompts
  aiwg -rollback-workspace --yes

SAFETY
  - Verifies backup integrity before rollback
  - Creates snapshot of current state before rollback
  - Validates checksum after restoration
`);
}

/**
 * Parse command-line arguments
 */
function parseArgs(args) {
  const options = {
    list: false,
    backupPath: null,
    interactive: true,
    projectRoot: process.cwd(),
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--list') {
      options.list = true;
    } else if (arg === '--backup' && args[i + 1]) {
      options.backupPath = args[++i];
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
async function confirm(message, defaultYes = false) {
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

// ===========================
// Main Rollback Flow
// ===========================

/**
 * Main rollback command
 */
async function rollbackWorkspace(args) {
  try {
    // Parse arguments
    const options = parseArgs(args);

    if (options.help) {
      displayHelp();
      return;
    }

    // Display header
    console.log('\nAIWG - Workspace Rollback');
    console.log('='.repeat(80));
    console.log('');

    // Import MigrationTool from tools/workspace
    const { MigrationTool } = await import('../workspace/migration-tool.mjs');

    // Initialize migration tool for rollback
    const aiwgPath = path.join(options.projectRoot, '.aiwg');
    const migrationTool = new MigrationTool(aiwgPath);

    // List backups mode
    if (options.list) {
      console.log('Available backups:');
      console.log('');

      // Check both backup locations:
      // 1. MigrationTool pattern: .aiwg.backup.* (in parent directory)
      // 2. WorkspaceMigrator pattern: .aiwg/backups/* (inside .aiwg)
      let backups = await migrationTool.listBackups();

      // Also check .aiwg/backups/ directory
      const internalBackupsDir = path.join(aiwgPath, 'backups');
      try {
        const entries = await fs.readdir(internalBackupsDir);
        const internalBackups = entries
          .filter(name => name.startsWith('migration-'))
          .map(name => path.join(internalBackupsDir, name));
        backups = [...backups, ...internalBackups];
      } catch {
        // Directory doesn't exist
      }

      if (backups.length === 0) {
        console.log('  No backups found.');
        console.log('');
        console.log('Backups are created automatically when running:');
        console.log('  aiwg -migrate-workspace');
        return;
      }

      for (const backupPath of backups) {
        try {
          const manifestPath = path.join(backupPath, 'migration-manifest.json');
          const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

          console.log(`  ${path.basename(backupPath)}`);
          console.log(`    Created: ${manifest.timestamp}`);
          console.log(`    Files: ${manifest.fileCount}`);
          console.log(`    Size: ${formatBytes(manifest.totalSize)}`);
          console.log('');
        } catch {
          // No manifest - try to get info from directory
          const backupName = path.basename(backupPath);
          console.log(`  ${backupName}`);

          // Try to extract timestamp from backup name (migration-{timestamp}-{id})
          const match = backupName.match(/migration-(\d+)-/);
          if (match) {
            const timestamp = new Date(parseInt(match[1], 10));
            console.log(`    Created: ${timestamp.toISOString()}`);
          }

          // Count files in backup
          try {
            const countFiles = async (dir) => {
              let count = 0;
              const entries = await fs.readdir(dir, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.isDirectory()) {
                  count += await countFiles(path.join(dir, entry.name));
                } else {
                  count++;
                }
              }
              return count;
            };
            const fileCount = await countFiles(backupPath);
            console.log(`    Files: ${fileCount}`);
          } catch {
            // Ignore
          }
          console.log('');
        }
      }

      return;
    }

    // Get available backups
    const backups = await migrationTool.listBackups();

    if (backups.length === 0) {
      console.log('No backups found.');
      console.log('');
      console.log('Backups are created automatically when running:');
      console.log('  aiwg -migrate-workspace');
      console.log('');
      console.log('If you need to undo changes manually, check git history:');
      console.log('  git status');
      console.log('  git diff .aiwg/');
      return;
    }

    // Select backup
    let targetBackup = options.backupPath;

    if (!targetBackup) {
      // Use most recent backup
      targetBackup = backups[0];
      console.log(`Most recent backup: ${path.basename(targetBackup)}`);
    } else {
      // Resolve backup path
      if (!path.isAbsolute(targetBackup)) {
        targetBackup = path.resolve(options.projectRoot, targetBackup);
      }

      // Check if backup exists
      try {
        await fs.access(targetBackup);
      } catch {
        console.error(`Error: Backup not found at ${targetBackup}`);
        console.log('');
        console.log('Available backups:');
        backups.forEach(b => console.log(`  ${path.basename(b)}`));
        process.exit(1);
      }
    }

    // Read backup manifest
    let manifest;
    try {
      const manifestPath = path.join(targetBackup, 'migration-manifest.json');
      manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    } catch (error) {
      console.error(`Error: Could not read backup manifest: ${error.message}`);
      process.exit(1);
    }

    console.log('');
    console.log('Backup Details:');
    console.log(`  Path: ${targetBackup}`);
    console.log(`  Created: ${manifest.timestamp}`);
    console.log(`  Files: ${manifest.fileCount}`);
    console.log(`  Size: ${formatBytes(manifest.totalSize)}`);
    console.log(`  Checksum: ${manifest.checksum.slice(0, 16)}...`);
    console.log('');

    // Warning
    console.log('⚠️  WARNING: This will replace the current .aiwg/ directory with the backup.');
    console.log('');

    // Confirm rollback
    if (options.interactive) {
      const proceed = await confirm('Proceed with rollback?', false);

      if (!proceed) {
        console.log('Rollback cancelled by user.');
        return;
      }
      console.log('');
    }

    // Perform rollback
    console.log('Performing rollback...');

    const result = await migrationTool.rollback();

    console.log('');
    console.log('✓ Rollback complete');
    console.log(`  Restored from: ${result.restoredFrom}`);
    console.log(`  Timestamp: ${result.timestamp}`);
    console.log(`  Checksum verified: ${result.checksum.slice(0, 16)}...`);
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
  await rollbackWorkspace(args);
}

export { rollbackWorkspace };
