#!/usr/bin/env node

/**
 * CLI tool to reset the .aiwg/ workspace directory
 * Usage: aiwg -reset-workspace [options]
 */

import { existsSync, rmSync, cpSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import readline from 'readline';

const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');
const backup = args.includes('--backup') || args.includes('-b');
const keepIntake = args.includes('--keep-intake');
const keepTeam = args.includes('--keep-team');
const reinitialize = args.includes('--reinitialize') || args.includes('--reinit');
const dryRun = args.includes('--dry-run') || args.includes('-n');
const help = args.includes('--help') || args.includes('-h');

// Find project directory (non-flag argument or cwd)
const projectDir = args.find(a => !a.startsWith('-')) || process.cwd();
const aiwgDir = join(projectDir, '.aiwg');

function printHelp() {
  console.log(`
Usage: aiwg -reset-workspace [project-directory] [options]

Completely wipe the .aiwg/ directory and optionally reinitialize.

Options:
  --force, -f       Skip confirmation prompt
  --backup, -b      Create timestamped backup before wiping
  --keep-intake     Preserve .aiwg/intake/ directory
  --keep-team       Preserve .aiwg/team/ directory
  --reinitialize    Create fresh directory structure after reset
  --dry-run, -n     Preview what would be deleted
  --help, -h        Show this help

Examples:
  aiwg -reset-workspace                     # Reset workspace in current project
  aiwg -reset-workspace --backup            # Backup before reset
  aiwg -reset-workspace --keep-intake       # Preserve intake forms
  aiwg -reset-workspace --reinitialize      # Reset and create fresh structure
  aiwg -reset-workspace --force --reinit    # Quick reset without prompts
`);
}

function countFiles(dir) {
  if (!existsSync(dir)) return { count: 0, size: 0 };

  let count = 0;
  let size = 0;

  function walk(d) {
    try {
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
    } catch {}
  }

  walk(dir);
  return { count, size };
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSubdirStats(baseDir) {
  if (!existsSync(baseDir)) return [];

  const stats = [];
  try {
    const entries = readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = join(baseDir, entry.name);
        const { count, size } = countFiles(dirPath);
        if (count > 0) {
          stats.push({ name: entry.name, count, size });
        }
      }
    }
  } catch {}

  return stats;
}

async function confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(message, answer => {
      rl.close();
      resolve(answer.toUpperCase() === 'RESET');
    });
  });
}

function createFreshStructure(baseDir) {
  const directories = [
    'intake',
    'requirements',
    'architecture',
    'planning',
    'risks',
    'testing',
    'security',
    'working',
    'archive',
    'reports',
    'team',
    'gates',
    'decisions',
    'handoffs',
    'deployment',
    'quality'
  ];

  for (const dir of directories) {
    mkdirSync(join(baseDir, dir), { recursive: true });
  }

  // Create README
  const readme = `# AIWG Workspace

This directory contains SDLC artifacts managed by the AIWG framework.

## Structure

| Directory | Purpose |
|-----------|---------|
| intake/ | Project intake forms |
| requirements/ | User stories, use cases, NFRs |
| architecture/ | SAD, ADRs, diagrams |
| planning/ | Phase and iteration plans |
| risks/ | Risk register and spikes |
| testing/ | Test strategy, plans, results |
| security/ | Threat models, security artifacts |
| working/ | Temporary multi-agent work |
| archive/ | Historical documents |
| reports/ | Generated reports |
| team/ | Team profile and assignments |
| gates/ | Quality gate reports |
| decisions/ | Change requests, CCB meetings |
| handoffs/ | Phase transition checklists |
| deployment/ | Deployment plans and runbooks |
| quality/ | Code reviews, retrospectives |

## Getting Started

Run \`/intake-wizard\` in Claude Code to begin project intake.

Or from CLI:
\`\`\`bash
# Analyze existing codebase
/intake-from-codebase .

# Start fresh with wizard
/intake-wizard "your project description"
\`\`\`

## Maintenance Commands

\`\`\`bash
# Sync docs with project state
/workspace-realign

# Clean up temporary files
/workspace-prune-working

# Full reset (destructive)
aiwg -reset-workspace
\`\`\`

---
*Generated by aiwg -reset-workspace --reinitialize*
`;

  writeFileSync(join(baseDir, 'README.md'), readme);

  return directories.length;
}

async function main() {
  if (help) {
    printHelp();
    process.exit(0);
  }

  // Check if .aiwg exists
  if (!existsSync(aiwgDir)) {
    console.log('No .aiwg/ directory found. Nothing to reset.');
    if (reinitialize) {
      console.log('\nCreating fresh workspace structure...');
      mkdirSync(aiwgDir, { recursive: true });
      const dirCount = createFreshStructure(aiwgDir);
      console.log(`✓ Created ${dirCount} directories`);
      console.log(`✓ Created .aiwg/README.md`);
      console.log('\nRun /intake-wizard to begin project intake.');
    }
    process.exit(0);
  }

  // Gather stats
  const totalStats = countFiles(aiwgDir);
  const subdirStats = getSubdirStats(aiwgDir);

  console.log(`\nWorkspace Contents:`);
  console.log(`  Location: ${aiwgDir}`);
  console.log(`  Total:    ${totalStats.count} files (${formatSize(totalStats.size)})`);
  console.log('');

  if (subdirStats.length > 0) {
    console.log('  By Directory:');
    for (const { name, count, size } of subdirStats.sort((a, b) => b.count - a.count)) {
      const preserve = (name === 'intake' && keepIntake) || (name === 'team' && keepTeam);
      const marker = preserve ? ' [KEEP]' : '';
      console.log(`    ${name.padEnd(15)} ${String(count).padStart(3)} files (${formatSize(size).padStart(8)})${marker}`);
    }
  }

  // Dry run mode
  if (dryRun) {
    console.log('\n[DRY RUN] Would delete:');
    for (const { name, count } of subdirStats) {
      const preserve = (name === 'intake' && keepIntake) || (name === 'team' && keepTeam);
      if (!preserve) {
        console.log(`  - ${name}/ (${count} files)`);
      }
    }
    if (keepIntake) console.log('  [PRESERVED] intake/');
    if (keepTeam) console.log('  [PRESERVED] team/');
    if (reinitialize) {
      console.log('\nWould create fresh structure with 16 directories.');
    }
    console.log('\nRun without --dry-run to execute.');
    process.exit(0);
  }

  // Confirm unless --force
  if (!force) {
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║                 ⚠️  DESTRUCTIVE OPERATION ⚠️                   ║`);
    console.log(`╠══════════════════════════════════════════════════════════════╣`);
    console.log(`║  This will DELETE ${String(totalStats.count).padStart(3)} files (${formatSize(totalStats.size).padStart(8)}) from .aiwg/          ║`);
    if (keepIntake || keepTeam) {
      console.log(`║                                                              ║`);
      if (keepIntake) console.log(`║  [PRESERVED] intake/ will be kept                           ║`);
      if (keepTeam) console.log(`║  [PRESERVED] team/ will be kept                             ║`);
    }
    console.log(`╚══════════════════════════════════════════════════════════════╝`);
    console.log('');

    const confirmed = await confirm("Type 'RESET' to confirm deletion: ");
    if (!confirmed) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  // Create backup if requested
  let backupPath = null;
  if (backup) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    backupPath = join(projectDir, `.aiwg-backup-${timestamp}`);

    console.log(`\nCreating backup: ${backupPath}`);
    cpSync(aiwgDir, backupPath, { recursive: true });

    // Add manifest to backup
    const manifest = `# .aiwg Backup

**Created:** ${new Date().toISOString()}
**Reason:** Workspace reset
**Files:** ${totalStats.count}
**Size:** ${formatSize(totalStats.size)}

## Restore Command

\`\`\`bash
rm -rf .aiwg && cp -r "${backupPath}" .aiwg
\`\`\`
`;
    writeFileSync(join(backupPath, 'BACKUP_MANIFEST.md'), manifest);
    console.log(`✓ Backup created: ${totalStats.count} files`);
  }

  // Preserve directories if requested
  let preservedIntake = null;
  let preservedTeam = null;

  if (keepIntake && existsSync(join(aiwgDir, 'intake'))) {
    preservedIntake = join(projectDir, '.aiwg-temp-intake');
    cpSync(join(aiwgDir, 'intake'), preservedIntake, { recursive: true });
  }

  if (keepTeam && existsSync(join(aiwgDir, 'team'))) {
    preservedTeam = join(projectDir, '.aiwg-temp-team');
    cpSync(join(aiwgDir, 'team'), preservedTeam, { recursive: true });
  }

  // Execute wipe
  console.log('\nWiping .aiwg/...');
  rmSync(aiwgDir, { recursive: true, force: true });
  console.log(`✓ Deleted ${totalStats.count} files (${formatSize(totalStats.size)})`);

  // Restore preserved or reinitialize
  if (reinitialize || preservedIntake || preservedTeam) {
    mkdirSync(aiwgDir, { recursive: true });
  }

  if (reinitialize) {
    console.log('\nReinitializing workspace...');
    const dirCount = createFreshStructure(aiwgDir);
    console.log(`✓ Created ${dirCount} directories`);
    console.log(`✓ Created .aiwg/README.md`);
  }

  // Restore preserved directories
  if (preservedIntake) {
    cpSync(preservedIntake, join(aiwgDir, 'intake'), { recursive: true });
    rmSync(preservedIntake, { recursive: true, force: true });
    console.log('✓ Restored intake/');
  }

  if (preservedTeam) {
    cpSync(preservedTeam, join(aiwgDir, 'team'), { recursive: true });
    rmSync(preservedTeam, { recursive: true, force: true });
    console.log('✓ Restored team/');
  }

  // Summary
  console.log('\n════════════════════════════════════════');
  console.log('Workspace Reset Complete');
  console.log('════════════════════════════════════════');

  if (backupPath) {
    console.log(`\nBackup: ${backupPath}`);
  }

  if (preservedIntake || preservedTeam) {
    console.log('\nPreserved:');
    if (preservedIntake) console.log('  - intake/');
    if (preservedTeam) console.log('  - team/');
  }

  if (reinitialize) {
    console.log('\nNext steps:');
    console.log('  1. Run /intake-wizard to start fresh intake');
    console.log('  2. Or /intake-from-codebase to analyze existing code');
  }

  console.log('');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
