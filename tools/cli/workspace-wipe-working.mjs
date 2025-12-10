#!/usr/bin/env node

/**
 * CLI tool to wipe the .aiwg/working/ directory
 * Usage: aiwg -wipe-working [--force] [--backup]
 */

import { existsSync, rmSync, cpSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import readline from 'readline';

const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');
const backup = args.includes('--backup') || args.includes('-b');
const dryRun = args.includes('--dry-run') || args.includes('-n');
const help = args.includes('--help') || args.includes('-h');

// Find project directory (non-flag argument or cwd)
const projectDir = args.find(a => !a.startsWith('-')) || process.cwd();
const workingDir = join(projectDir, '.aiwg', 'working');

function printHelp() {
  console.log(`
Usage: aiwg -wipe-working [project-directory] [options]

Wipe the .aiwg/working/ directory, removing all temporary files.

Options:
  --force, -f     Skip confirmation prompt
  --backup, -b    Create backup before wiping
  --dry-run, -n   Preview what would be deleted
  --help, -h      Show this help

Examples:
  aiwg -wipe-working                    # Wipe working dir in current project
  aiwg -wipe-working --force            # Skip confirmation
  aiwg -wipe-working --backup           # Backup before wiping
  aiwg -wipe-working /path/to/project   # Specify project directory
`);
}

function countFiles(dir) {
  if (!existsSync(dir)) return { count: 0, size: 0 };

  let count = 0;
  let size = 0;

  function walk(d) {
    const entries = readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        count++;
        try {
          size += statSync(fullPath).size;
        } catch {}
      }
    }
  }

  walk(dir);
  return { count, size };
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(message, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  if (help) {
    printHelp();
    process.exit(0);
  }

  // Check if .aiwg/working exists
  if (!existsSync(workingDir)) {
    console.log('No .aiwg/working/ directory found. Nothing to wipe.');
    process.exit(0);
  }

  // Count files
  const { count, size } = countFiles(workingDir);

  if (count === 0) {
    console.log('.aiwg/working/ is already empty.');
    process.exit(0);
  }

  console.log(`\nWorking Directory Contents:`);
  console.log(`  Location: ${workingDir}`);
  console.log(`  Files:    ${count}`);
  console.log(`  Size:     ${formatSize(size)}`);

  // Dry run mode
  if (dryRun) {
    console.log('\n[DRY RUN] Would delete:');
    function listFiles(dir, indent = '  ') {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          console.log(`${indent}${entry.name}/`);
          listFiles(fullPath, indent + '  ');
        } else {
          console.log(`${indent}${entry.name}`);
        }
      }
    }
    listFiles(workingDir);
    console.log('\nRun without --dry-run to execute.');
    process.exit(0);
  }

  // Confirm unless --force
  if (!force) {
    console.log(`\n⚠️  This will permanently delete ${count} files (${formatSize(size)})`);
    const confirmed = await confirm('Continue? [y/N]: ');
    if (!confirmed) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  // Create backup if requested
  if (backup) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = join(projectDir, `.aiwg-working-backup-${timestamp}`);

    console.log(`\nCreating backup: ${backupDir}`);
    cpSync(workingDir, backupDir, { recursive: true });
    console.log(`Backup created: ${count} files`);
  }

  // Wipe the directory
  console.log('\nWiping .aiwg/working/...');
  rmSync(workingDir, { recursive: true, force: true });

  // Recreate empty directory
  mkdirSync(workingDir, { recursive: true });

  console.log(`\n✓ Wiped ${count} files (${formatSize(size)})`);
  console.log('  .aiwg/working/ is now empty');

  if (backup) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    console.log(`  Backup available at: .aiwg-working-backup-${timestamp}/`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
