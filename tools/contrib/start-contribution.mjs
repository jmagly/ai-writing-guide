#!/usr/bin/env node
/**
 * Start Contribution - Fork and Initialize Workflow
 *
 * Implements the complete fork and initialization workflow for AIWG contributions.
 *
 * Usage:
 *   aiwg -contribute-start <feature-name>
 *
 * Workflow:
 *   1. Check prerequisites (gh CLI, git, authentication)
 *   2. Fork jmagly/ai-writing-guide if not exists
 *   3. Add remotes (origin=fork, upstream=main)
 *   4. Fetch both remotes
 *   5. Create feature branch: contrib/{username}/{feature-name}
 *   6. Initialize workspace: .aiwg/contrib/{feature-name}/
 *   7. Create intake template
 *   8. Optionally deploy SDLC agents
 *   9. Print next steps
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  checkGhAuth,
  getUsername,
  forkRepo
} from './lib/github-client.mjs';
import {
  initWorkspace,
  updateWorkspaceStatus
} from './lib/workspace-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Check if git is installed and configured
 * @returns {Object} { installed: boolean, configured: boolean, error: string|null }
 */
function checkGit() {
  const versionCheck = exec('git --version');
  if (!versionCheck.success) {
    return {
      installed: false,
      configured: false,
      error: 'Git not found. Install git and try again.'
    };
  }

  const nameCheck = exec('git config --global user.name');
  const emailCheck = exec('git config --global user.email');

  if (!nameCheck.success || !emailCheck.success) {
    return {
      installed: true,
      configured: false,
      error: 'Git not configured. Run:\n  git config --global user.name "Your Name"\n  git config --global user.email "your.email@example.com"'
    };
  }

  return {
    installed: true,
    configured: true,
    error: null
  };
}

/**
 * Check if in AIWG installation directory
 * @returns {Object} { inAIWG: boolean, path: string, error: string|null }
 */
function checkInAIWG() {
  const cwd = process.cwd();
  const expectedPath = path.join(process.env.HOME, '.local/share/ai-writing-guide');

  // Check if current directory is AIWG installation
  if (cwd === expectedPath) {
    return {
      inAIWG: true,
      path: cwd,
      error: null
    };
  }

  // Check if inside AIWG installation
  if (cwd.startsWith(expectedPath)) {
    return {
      inAIWG: true,
      path: expectedPath,
      error: null
    };
  }

  // Check if .git exists and remote is AIWG
  const gitConfigPath = path.join(cwd, '.git/config');
  if (fs.existsSync(gitConfigPath)) {
    const config = fs.readFileSync(gitConfigPath, 'utf8');
    if (config.includes('ai-writing-guide')) {
      return {
        inAIWG: true,
        path: cwd,
        error: null
      };
    }
  }

  return {
    inAIWG: false,
    path: cwd,
    error: `Not in AIWG installation directory.\nExpected: ${expectedPath}\nCurrent: ${cwd}\n\nRun: cd ${expectedPath}`
  };
}

/**
 * Check if git repository is initialized
 * @param {string} dir - Directory to check
 * @returns {boolean} True if git repo exists
 */
function isGitRepo(dir) {
  return fs.existsSync(path.join(dir, '.git'));
}

/**
 * Add git remotes if not present
 * @param {string} fork - Fork repository (owner/repo)
 * @param {string} upstream - Upstream repository (owner/repo)
 * @param {string} cwd - Working directory
 * @returns {Object} { success: boolean, error: string|null }
 */
function addRemotes(fork, upstream, cwd) {
  // Check existing remotes
  const remotesResult = exec('git remote -v', { cwd });
  const remotes = remotesResult.stdout;

  // Add origin (fork) if not present
  if (!remotes.includes('origin')) {
    const addOrigin = exec(`git remote add origin https://github.com/${fork}.git`, { cwd });
    if (!addOrigin.success) {
      return {
        success: false,
        error: `Failed to add origin remote: ${addOrigin.stderr}`
      };
    }
    console.log('✓ Added origin remote (fork)');
  } else {
    console.log('✓ Origin remote already configured');
  }

  // Add upstream if not present
  if (!remotes.includes('upstream')) {
    const addUpstream = exec(`git remote add upstream https://github.com/${upstream}.git`, { cwd });
    if (!addUpstream.success) {
      return {
        success: false,
        error: `Failed to add upstream remote: ${addUpstream.stderr}`
      };
    }
    console.log('✓ Added upstream remote (main repo)');
  } else {
    console.log('✓ Upstream remote already configured');
  }

  // Fetch both remotes
  console.log('Fetching remotes...');
  const fetchOrigin = exec('git fetch origin', { cwd });
  if (!fetchOrigin.success) {
    console.warn('⚠ Warning: Failed to fetch origin');
  }

  const fetchUpstream = exec('git fetch upstream', { cwd });
  if (!fetchUpstream.success) {
    console.warn('⚠ Warning: Failed to fetch upstream');
  }

  return {
    success: true,
    error: null
  };
}

/**
 * Create and checkout feature branch
 * @param {string} branchName - Branch name to create
 * @param {string} cwd - Working directory
 * @returns {Object} { success: boolean, error: string|null }
 */
function createBranch(branchName, cwd) {
  // Check if branch already exists
  const branchCheck = exec(`git rev-parse --verify ${branchName}`, { cwd });
  if (branchCheck.success) {
    // Branch exists, just checkout
    const checkout = exec(`git checkout ${branchName}`, { cwd });
    if (!checkout.success) {
      return {
        success: false,
        error: `Failed to checkout existing branch: ${checkout.stderr}`
      };
    }
    console.log(`✓ Checked out existing branch: ${branchName}`);
    return { success: true, error: null };
  }

  // Create new branch from main (or master)
  const mainCheck = exec('git rev-parse --verify main', { cwd });
  const baseBranch = mainCheck.success ? 'main' : 'master';

  const createBranch = exec(`git checkout -b ${branchName} ${baseBranch}`, { cwd });
  if (!createBranch.success) {
    return {
      success: false,
      error: `Failed to create branch: ${createBranch.stderr}`
    };
  }

  console.log(`✓ Created branch: ${branchName}`);
  return { success: true, error: null };
}

/**
 * Create intake template for feature
 * @param {string} feature - Feature name
 * @param {string} workspacePath - Workspace directory path
 * @returns {Object} { success: boolean, error: string|null }
 */
function createIntakeTemplate(feature, workspacePath) {
  const intakePath = path.join(workspacePath, 'intake.md');

  const template = `# Feature Intake: ${feature}

**Feature ID:** ${feature}
**Created:** ${new Date().toISOString().split('T')[0]}
**Status:** Planning

## Feature Overview

**Feature Name:** ${feature}

**Priority:** Medium | High | Low
<!-- Select priority based on business value and urgency -->

**Complexity:** Low | Medium | High
<!-- Estimate implementation complexity -->

**Timeline:** 1 week | 2 weeks | 1 month
<!-- Estimated time to complete -->

## Description

<!-- Provide a clear 2-3 sentence description of what this feature does -->

**Example:**
Add native Cursor Editor support with single-file .cursor/rules integration. This enables AIWG users working in Cursor to deploy agents and commands with a single command.

## Deliverables

<!-- List specific files, commands, or features you'll create -->

**Example:**
- Setup command: aiwg -setup-cursor
- Agent deployment script: tools/cursor/setup-cursor.mjs
- Quick-start documentation: docs/integrations/cursor-quickstart.md
- Update install.sh for --platform cursor routing

## Dependencies

<!-- List tools, libraries, or other features this depends on -->

**Example:**
- Cursor Editor 0.40+
- Node.js 18.20.8+
- Existing agent deployment infrastructure

## Success Criteria

<!-- How will you know the feature is complete and working? -->

**Example:**
- Users can deploy agents with one command: aiwg -setup-cursor
- Documentation is clear and complete (95/100 quality score)
- Works on macOS, Linux, Windows
- Integration test passes

## Notes

<!-- Any additional context, constraints, or considerations -->

---

## Checklist

Before creating PR:
- [ ] Intake complete and reviewed
- [ ] Implementation complete
- [ ] Documentation written (README, quickstart, integration guide)
- [ ] Quality validation passed (aiwg -contribute-test)
- [ ] All lint errors fixed
- [ ] Manifests synced
`;

  try {
    fs.writeFileSync(intakePath, template, 'utf8');
    console.log(`✓ Created intake template: ${path.relative(process.cwd(), intakePath)}`);
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: `Failed to create intake template: ${err.message}`
    };
  }
}

/**
 * Check if SDLC agents are deployed
 * @param {string} cwd - Working directory
 * @returns {boolean} True if agents deployed
 */
function agentsDeployed(cwd) {
  const agentsDir = path.join(cwd, '.claude/agents');
  return fs.existsSync(agentsDir) && fs.readdirSync(agentsDir).length > 0;
}

/**
 * Prompt user for SDLC agent deployment
 * @param {string} cwd - Working directory
 * @returns {Promise<boolean>} True if user wants to deploy
 */
async function promptDeployAgents(cwd) {
  // Check if already deployed
  if (agentsDeployed(cwd)) {
    console.log('✓ SDLC agents already deployed');
    return false;
  }

  // In non-interactive mode, skip deployment
  if (!process.stdin.isTTY) {
    console.log('⚠ SDLC agents not deployed (non-interactive mode)');
    console.log('  Deploy later with: aiwg -deploy-agents --mode sdlc');
    return false;
  }

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\nDeploy SDLC agents to fork? [y/n]: ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Deploy SDLC agents to fork
 * @param {string} cwd - Working directory
 * @returns {Object} { success: boolean, error: string|null }
 */
function deployAgents(cwd) {
  // Find deploy-agents.mjs
  const deployScript = path.join(__dirname, '../agents/deploy-agents.mjs');

  if (!fs.existsSync(deployScript)) {
    return {
      success: false,
      error: `Deploy script not found: ${deployScript}`
    };
  }

  const result = exec(`node ${deployScript} --target ${cwd} --mode sdlc`, { cwd });

  if (!result.success) {
    return {
      success: false,
      error: `Failed to deploy agents: ${result.stderr}`
    };
  }

  console.log('✓ Deployed SDLC agents to fork');
  return { success: true, error: null };
}

/**
 * Print next steps
 * @param {string} feature - Feature name
 * @param {string} username - GitHub username
 * @param {string} cwd - Working directory
 */
function printNextSteps(feature, username, cwd) {
  console.log('\n' + '='.repeat(60));
  console.log('Next steps:');
  console.log('='.repeat(60));
  console.log('');
  console.log('1. Complete intake (using Claude Code or Warp):');
  console.log('   Natural language: "Complete intake for ' + feature + ' feature"');
  console.log('   Or manually edit: ' + path.join('.aiwg/contrib', feature, 'intake.md'));
  console.log('');
  console.log('2. Start development:');
  console.log('   Natural language: "Start Inception phase for ' + feature + '"');
  console.log('');
  console.log('3. Validate quality:');
  console.log('   Command: aiwg -contribute-test ' + feature);
  console.log('');
  console.log('4. Create PR:');
  console.log('   Command: aiwg -contribute-pr ' + feature);
  console.log('');
  console.log('Quick reference:');
  console.log('  - Status: aiwg -contribute-status ' + feature);
  console.log('  - Monitor PR: aiwg -contribute-monitor ' + feature);
  console.log('  - Sync fork: aiwg -contribute-sync ' + feature);
  console.log('  - Abort: aiwg -contribute-abort ' + feature);
  console.log('');
  console.log('Documentation:');
  console.log('  - Contributor Guide: docs/contributing/contributor-quickstart.md');
  console.log('  - Using AIWG: docs/contributing/using-aiwg-for-contributions.md');
  console.log('');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    console.log('Usage: aiwg -contribute-start <feature-name>');
    console.log('');
    console.log('Initialize contribution workspace with fork and feature branch.');
    console.log('');
    console.log('Example:');
    console.log('  aiwg -contribute-start cursor-integration');
    process.exit(0);
  }

  const feature = args[0];

  console.log('Starting contribution workflow...');
  console.log('Feature:', feature);
  console.log('');

  // Step 1: Check prerequisites
  console.log('[1/8] Checking prerequisites...');

  // Check gh CLI
  const ghCheck = checkGhAuth();
  if (!ghCheck.authenticated) {
    console.error('✗ Error:', ghCheck.error);
    process.exit(1);
  }
  console.log('✓ GitHub CLI authenticated');

  // Check git
  const gitCheck = checkGit();
  if (!gitCheck.configured) {
    console.error('✗ Error:', gitCheck.error);
    process.exit(1);
  }
  console.log('✓ Git installed and configured');

  // Check if in AIWG installation
  const aiwgCheck = checkInAIWG();
  if (!aiwgCheck.inAIWG) {
    console.error('✗ Error:', aiwgCheck.error);
    process.exit(1);
  }
  console.log('✓ In AIWG installation directory');

  const cwd = aiwgCheck.path;

  // Step 2: Get username
  console.log('');
  console.log('[2/8] Getting GitHub username...');
  const usernameResult = getUsername();
  if (!usernameResult.success) {
    console.error('✗ Error:', usernameResult.error);
    process.exit(1);
  }
  const username = usernameResult.username;
  console.log('✓ GitHub username:', username);

  // Step 3: Fork repository
  console.log('');
  console.log('[3/8] Forking repository...');
  const upstream = 'jmagly/ai-writing-guide';
  const forkResult = forkRepo(upstream);

  if (!forkResult.success) {
    console.error('✗ Error:', forkResult.error);
    process.exit(1);
  }

  if (forkResult.alreadyExists) {
    console.log('✓ Fork already exists:', forkResult.fork);
  } else {
    console.log('✓ Forked repository:', forkResult.fork);
  }

  const fork = forkResult.fork;

  // Step 4: Add remotes
  console.log('');
  console.log('[4/8] Configuring git remotes...');

  if (!isGitRepo(cwd)) {
    // Clone the fork if git repo doesn't exist
    console.log('Cloning fork...');
    const cloneResult = exec(`git clone https://github.com/${fork}.git ${cwd}`);
    if (!cloneResult.success) {
      console.error('✗ Error: Failed to clone fork:', cloneResult.stderr);
      process.exit(1);
    }
    console.log('✓ Cloned fork');

    // Add upstream remote
    const addUpstream = exec(`git remote add upstream https://github.com/${upstream}.git`, { cwd });
    if (!addUpstream.success) {
      console.error('✗ Error: Failed to add upstream remote:', addUpstream.stderr);
      process.exit(1);
    }
    console.log('✓ Added upstream remote');
  } else {
    const remotesResult = addRemotes(fork, upstream, cwd);
    if (!remotesResult.success) {
      console.error('✗ Error:', remotesResult.error);
      process.exit(1);
    }
  }

  // Step 5: Create feature branch
  console.log('');
  console.log('[5/8] Creating feature branch...');
  const branchName = path.join('contrib', username, feature);
  const branchResult = createBranch(branchName, cwd);

  if (!branchResult.success) {
    console.error('✗ Error:', branchResult.error);
    process.exit(1);
  }

  // Step 6: Initialize workspace
  console.log('');
  console.log('[6/8] Initializing workspace...');
  const workspaceResult = initWorkspace(feature, {
    branch: branchName,
    upstream,
    projectRoot: cwd
  });

  if (!workspaceResult.success) {
    // Workspace might already exist from previous run
    if (workspaceResult.error.includes('already exists')) {
      console.log('✓ Workspace already initialized:', path.relative(cwd, workspaceResult.error.split(':')[1].trim()));
    } else {
      console.error('✗ Error:', workspaceResult.error);
      process.exit(1);
    }
  } else {
    console.log('✓ Created workspace:', path.relative(cwd, workspaceResult.path));
  }

  // Step 7: Create intake template
  console.log('');
  console.log('[7/8] Creating intake template...');
  const intakeResult = createIntakeTemplate(feature, workspaceResult.path || path.join(cwd, '.aiwg/contrib', feature));

  if (!intakeResult.success) {
    console.error('✗ Error:', intakeResult.error);
    process.exit(1);
  }

  // Step 8: Deploy SDLC agents (optional)
  console.log('');
  console.log('[8/8] SDLC agent deployment...');
  const shouldDeploy = await promptDeployAgents(cwd);

  if (shouldDeploy) {
    const deployResult = deployAgents(cwd);
    if (!deployResult.success) {
      console.warn('⚠ Warning:', deployResult.error);
      console.log('  Deploy later with: aiwg -deploy-agents --mode sdlc');
    }
  } else if (!agentsDeployed(cwd)) {
    console.log('⚠ SDLC agents not deployed');
    console.log('  Deploy later with: aiwg -deploy-agents --mode sdlc');
  }

  // Update workspace status
  updateWorkspaceStatus(feature, 'initialized', {}, cwd);

  // Print success summary
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Contribution workspace initialized successfully!');
  console.log('='.repeat(60));
  console.log('');
  console.log('Summary:');
  console.log('  Fork:', fork);
  console.log('  Branch:', branchName);
  console.log('  Workspace:', path.join('.aiwg/contrib', feature));
  console.log('  Intake:', path.join('.aiwg/contrib', feature, 'intake.md'));

  // Print next steps
  printNextSteps(feature, username, cwd);

  process.exit(0);
}

// Run main function
main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
