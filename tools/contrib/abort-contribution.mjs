#!/usr/bin/env node
/**
 * Abort Contribution - Delete Contribution Workspace and Branch
 *
 * Implements contribution abort workflow with safety confirmations.
 *
 * Usage:
 *   aiwg -contribute-abort <feature-name>
 *
 * Workflow:
 *   1. Load workspace data
 *   2. Show what will be deleted
 *   3. Confirm abort (interactive with feature name confirmation)
 *   4. Delete local branch
 *   5. Optionally delete remote branch
 *   6. Delete workspace directory
 *   7. Checkout main branch
 *   8. Suggest aiwg -reinstall for fresh start
 *
 * Safety:
 *   - Requires explicit feature name confirmation
 *   - Shows uncommitted changes before deletion
 *   - Warns about data loss
 *   - Safe defaults (cancel operations)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadWorkspaceData,
  cleanWorkspace,
  workspaceExists,
  getWorkspacePath
} from './lib/workspace-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

/**
 * Execute command with error handling
 * @param {string} command - Command to execute
 * @param {Object} options - Execution options
 * @returns {Object} { success: boolean, stdout: string, stderr: string }
 */
function exec(command, options = {}) {
  try {
    const stdout = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });
    return { success: true, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    return {
      success: false,
      stdout: err.stdout?.toString() || '',
      stderr: err.stderr?.toString() || err.message
    };
  }
}

/**
 * Get current branch
 * @param {string} cwd - Working directory
 * @returns {Object} { success: boolean, branch: string|null }
 */
function getCurrentBranch(cwd) {
  const result = exec('git rev-parse --abbrev-ref HEAD', { cwd });
  if (!result.success) {
    return { success: false, branch: null };
  }
  return { success: true, branch: result.stdout };
}

/**
 * Get uncommitted changes
 * @param {string} cwd - Working directory
 * @returns {Object} { success: boolean, changes: Array<string> }
 */
function getUncommittedChanges(cwd) {
  const result = exec('git status --porcelain', { cwd });
  if (!result.success) {
    return { success: false, changes: [] };
  }

  const changes = result.stdout
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const status = line.substring(0, 2);
      const file = line.substring(3);
      return { status, file };
    });

  return { success: true, changes };
}

/**
 * Get commit count on branch
 * @param {string} branch - Branch name
 * @param {string} cwd - Working directory
 * @returns {Object} { success: boolean, count: number }
 */
function getCommitCount(branch, cwd) {
  const result = exec(`git rev-list --count ${branch} ^main 2>/dev/null || git rev-list --count ${branch} ^master`, { cwd });
  if (!result.success) {
    return { success: false, count: 0 };
  }
  return { success: true, count: parseInt(result.stdout) || 0 };
}

/**
 * Check if branch exists on remote
 * @param {string} branch - Branch name
 * @param {string} remote - Remote name (default: origin)
 * @param {string} cwd - Working directory
 * @returns {boolean} True if branch exists on remote
 */
function branchExistsOnRemote(branch, remote, cwd) {
  const result = exec(`git ls-remote --heads ${remote} ${branch}`, { cwd });
  return result.success && result.stdout.trim() !== '';
}

/**
 * Show abort warning
 * @param {Object} workspaceData - Workspace data
 * @param {Array} changes - Uncommitted changes
 * @param {number} commitCount - Number of commits
 */
function showAbortWarning(workspaceData, changes, commitCount) {
  console.log('');
  console.log('='.repeat(60));
  console.log(`${colors.red}${colors.bold}⚠ WARNING: This will delete all contribution work!${colors.reset}`);
  console.log('='.repeat(60));
  console.log('');

  console.log('This will:');
  console.log(`  ${colors.red}●${colors.reset} Delete branch: ${workspaceData.data.branch}`);
  console.log(`  ${colors.red}●${colors.reset} Delete workspace: .aiwg/contrib/${workspaceData.data.feature}/`);
  console.log(`  ${colors.red}●${colors.reset} Checkout main branch`);

  if (workspaceData.data.pr) {
    console.log(`  ${colors.yellow}●${colors.reset} PR #${workspaceData.data.pr.number} will remain open (close manually if needed)`);
  }

  console.log('');

  if (changes.length > 0) {
    console.log(`${colors.red}Uncommitted changes (${changes.length} files):${colors.reset}`);
    changes.slice(0, 10).forEach(change => {
      const statusText = change.status.trim() === 'M' ? 'modified' :
                         change.status.trim() === 'A' ? 'added' :
                         change.status.trim() === 'D' ? 'deleted' :
                         change.status.trim() === '??' ? 'untracked' :
                         change.status;
      console.log(`  ${colors.yellow}${statusText.padEnd(10)}${colors.reset} ${change.file}`);
    });
    if (changes.length > 10) {
      console.log(`  ... and ${changes.length - 10} more files`);
    }
    console.log('');
    console.log(`${colors.red}${colors.bold}All uncommitted changes will be lost!${colors.reset}`);
    console.log('');
  }

  if (commitCount > 0) {
    console.log(`${colors.yellow}Branch has ${commitCount} commits${colors.reset}`);
    console.log('');
  }
}

/**
 * Prompt for confirmation
 * @param {string} feature - Feature name
 * @returns {Promise<boolean>} True if confirmed
 */
async function promptConfirmation(feature) {
  if (!process.stdin.isTTY) {
    console.error('Cannot abort in non-interactive mode (requires confirmation)');
    return false;
  }

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`${colors.bold}Type feature name to confirm: ${colors.reset}`);

  return new Promise((resolve) => {
    rl.question('> ', (answer) => {
      rl.close();
      const confirmed = answer.trim() === feature;
      if (!confirmed) {
        console.log('');
        console.log(`${colors.yellow}Feature name does not match. Abort cancelled.${colors.reset}`);
      }
      resolve(confirmed);
    });
  });
}

/**
 * Prompt for remote deletion
 * @param {string} branch - Branch name
 * @returns {Promise<boolean>} True if should delete remote
 */
async function promptDeleteRemote(branch) {
  if (!process.stdin.isTTY) {
    return false;
  }

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('');
  console.log(`Branch exists on remote: ${branch}`);
  console.log('Delete remote branch? [y/n]: ');

  return new Promise((resolve) => {
    rl.question('> ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Delete local branch
 * @param {string} branch - Branch name
 * @param {string} cwd - Working directory
 * @returns {Object} { success: boolean, error: string|null }
 */
function deleteLocalBranch(branch, cwd) {
  console.log('');
  console.log('Deleting local branch...');

  // First checkout main/master
  const mainCheck = exec('git rev-parse --verify main', { cwd });
  const baseBranch = mainCheck.success ? 'main' : 'master';

  const checkoutResult = exec(`git checkout ${baseBranch}`, { cwd });
  if (!checkoutResult.success) {
    return {
      success: false,
      error: `Failed to checkout ${baseBranch}: ${checkoutResult.stderr}`
    };
  }
  console.log(`${colors.green}✓${colors.reset} Checked out ${baseBranch}`);

  // Delete branch (force delete to handle uncommitted changes)
  const deleteResult = exec(`git branch -D ${branch}`, { cwd });
  if (!deleteResult.success) {
    // Branch might already be deleted
    if (deleteResult.stderr.includes('not found')) {
      console.log(`${colors.yellow}⚠${colors.reset} Branch already deleted: ${branch}`);
      return { success: true, error: null };
    }
    return {
      success: false,
      error: `Failed to delete branch: ${deleteResult.stderr}`
    };
  }

  console.log(`${colors.green}✓${colors.reset} Deleted local branch: ${branch}`);
  return { success: true, error: null };
}

/**
 * Delete remote branch
 * @param {string} branch - Branch name
 * @param {string} remote - Remote name (default: origin)
 * @param {string} cwd - Working directory
 * @returns {Object} { success: boolean, error: string|null }
 */
function deleteRemoteBranch(branch, remote, cwd) {
  console.log('');
  console.log('Deleting remote branch...');

  const result = exec(`git push ${remote} --delete ${branch}`, { cwd });
  if (!result.success) {
    // Branch might already be deleted
    if (result.stderr.includes('not found') || result.stderr.includes('does not exist')) {
      console.log(`${colors.yellow}⚠${colors.reset} Remote branch already deleted: ${branch}`);
      return { success: true, error: null };
    }
    return {
      success: false,
      error: `Failed to delete remote branch: ${result.stderr}`
    };
  }

  console.log(`${colors.green}✓${colors.reset} Deleted remote branch: ${remote}/${branch}`);
  return { success: true, error: null };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    console.log('Usage: aiwg -contribute-abort <feature-name>');
    console.log('');
    console.log('Abort contribution and delete all associated work.');
    console.log('');
    console.log('WARNING: This will delete:');
    console.log('  - Local branch');
    console.log('  - Workspace directory (.aiwg/contrib/<feature>/)');
    console.log('  - All uncommitted changes');
    console.log('');
    console.log('Example:');
    console.log('  aiwg -contribute-abort cursor-integration');
    process.exit(0);
  }

  const feature = args[0];
  const cwd = process.cwd();

  console.log('Abort contribution workflow...');
  console.log('Feature:', feature);

  // Check if workspace exists
  if (!workspaceExists(feature, cwd)) {
    console.error('');
    console.error(`${colors.red}✗${colors.reset} Workspace not found: ${feature}`);
    console.error('');
    console.error('No workspace to abort.');
    process.exit(1);
  }

  // Load workspace data
  const workspaceData = loadWorkspaceData(feature, 'status.json', cwd);
  if (!workspaceData.success) {
    console.error(`${colors.red}✗${colors.reset} Failed to load workspace: ${workspaceData.error}`);
    process.exit(1);
  }

  const branch = workspaceData.data.branch;

  // Get current branch
  const currentBranchResult = getCurrentBranch(cwd);
  const onFeatureBranch = currentBranchResult.success && currentBranchResult.branch === branch;

  // Get uncommitted changes (if on feature branch)
  let changes = [];
  if (onFeatureBranch) {
    const changesResult = getUncommittedChanges(cwd);
    if (changesResult.success) {
      changes = changesResult.changes;
    }
  }

  // Get commit count
  const commitCountResult = getCommitCount(branch, cwd);
  const commitCount = commitCountResult.success ? commitCountResult.count : 0;

  // Show warning
  showAbortWarning(workspaceData, changes, commitCount);

  // Prompt for confirmation
  const confirmed = await promptConfirmation(feature);
  if (!confirmed) {
    console.log('');
    console.log('Abort cancelled.');
    process.exit(0);
  }

  console.log('');
  console.log(`${colors.yellow}Proceeding with abort...${colors.reset}`);

  // Delete local branch
  const deleteLocalResult = deleteLocalBranch(branch, cwd);
  if (!deleteLocalResult.success) {
    console.error(`${colors.red}✗${colors.reset} ${deleteLocalResult.error}`);
    console.error('');
    console.error('Delete manually with:');
    console.error(`  git checkout main`);
    console.error(`  git branch -D ${branch}`);
    process.exit(1);
  }

  // Check if branch exists on remote
  const remote = 'origin';
  if (branchExistsOnRemote(branch, remote, cwd)) {
    const shouldDeleteRemote = await promptDeleteRemote(branch);

    if (shouldDeleteRemote) {
      const deleteRemoteResult = deleteRemoteBranch(branch, remote, cwd);
      if (!deleteRemoteResult.success) {
        console.warn(`${colors.yellow}⚠${colors.reset} ${deleteRemoteResult.error}`);
        console.log('');
        console.log('Delete manually with:');
        console.log(`  git push ${remote} --delete ${branch}`);
      }
    } else {
      console.log('');
      console.log(`${colors.yellow}⚠${colors.reset} Remote branch not deleted: ${remote}/${branch}`);
      console.log('Delete manually if needed:');
      console.log(`  git push ${remote} --delete ${branch}`);
    }
  }

  // Delete workspace
  console.log('');
  console.log('Deleting workspace...');
  const cleanResult = cleanWorkspace(feature, cwd);
  if (!cleanResult.success) {
    console.error(`${colors.red}✗${colors.reset} ${cleanResult.error}`);
    const workspacePath = getWorkspacePath(feature, cwd);
    console.error('');
    console.error('Delete manually with:');
    console.error(`  rm -rf ${workspacePath}`);
    process.exit(1);
  }

  console.log(`${colors.green}✓${colors.reset} Deleted workspace: .aiwg/contrib/${feature}/`);

  // Print success
  console.log('');
  console.log('='.repeat(60));
  console.log(`${colors.green}✅ Contribution aborted successfully${colors.reset}`);
  console.log('='.repeat(60));
  console.log('');

  if (workspaceData.data.pr) {
    console.log(`${colors.yellow}Note:${colors.reset} PR #${workspaceData.data.pr.number} remains open`);
    console.log('Close it manually if needed:');
    console.log(`  gh pr close ${workspaceData.data.pr.number}`);
    console.log(`  Or visit: ${workspaceData.data.pr.url}`);
    console.log('');
  }

  console.log('Fresh start options:');
  console.log('  - Start new contribution: aiwg -contribute-start <feature>');
  console.log('  - Clean reinstall: aiwg -reinstall');
  console.log('');

  process.exit(0);
}

// Run main function
main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
