#!/usr/bin/env node
/**
 * Create Pull Request Tool
 *
 * Creates well-formed pull requests for AIWG contributions with:
 * - Quality validation (>= 80% required)
 * - Interactive PR metadata collection
 * - Automated PR description generation
 * - GitHub label assignment
 * - Workspace metadata persistence
 *
 * Usage:
 *   node tools/contrib/create-pr.mjs <feature-name> [--draft]
 *   aiwg -contribute-pr <feature-name> [--draft]
 */

import { execSync } from 'child_process';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { runAllGates, generateReport } from './lib/quality-validator.mjs';
import { createPR } from './lib/github-client.mjs';
import {
  loadWorkspaceData,
  savePRMetadata,
  updateWorkspaceStatus,
  workspaceExists
} from './lib/workspace-manager.mjs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for input
 * @param {string} question - Question to ask
 * @param {string} defaultValue - Default value if user presses enter
 * @returns {Promise<string>} User input
 */
function prompt(question, defaultValue = '') {
  return new Promise((resolve) => {
    const displayDefault = defaultValue ? ` [${defaultValue}]` : '';
    rl.question(`${question}${displayDefault}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Prompt user to choose from options
 * @param {string} question - Question to ask
 * @param {Array<{value: string, label: string}>} options - Options to choose from
 * @returns {Promise<string>} Selected option value
 */
async function promptChoice(question, options) {
  console.log(`\n${question}`);
  options.forEach((opt, idx) => {
    console.log(`[${idx + 1}] ${opt.label}`);
  });

  while (true) {
    const answer = await prompt('\nChoice', '1');
    const choice = parseInt(answer, 10);
    if (choice >= 1 && choice <= options.length) {
      return options[choice - 1].value;
    }
    console.log(`Invalid choice. Please enter 1-${options.length}`);
  }
}

/**
 * Prompt yes/no question
 * @param {string} question - Question to ask
 * @param {boolean} defaultValue - Default value
 * @returns {Promise<boolean>} User response
 */
async function promptYesNo(question, defaultValue = false) {
  const defaultStr = defaultValue ? 'Y/n' : 'y/N';
  const answer = await prompt(`${question} [${defaultStr}]`);

  if (!answer) return defaultValue;
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

/**
 * Execute git command
 * @param {string} command - Git command
 * @returns {string} Command output
 */
function execGit(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (err) {
    throw new Error(`Git command failed: ${err.message}`);
  }
}

/**
 * Check git status for uncommitted changes
 * @returns {boolean} True if working directory is clean
 */
function isGitClean() {
  const status = execGit('git status --porcelain');
  return status === '';
}

/**
 * Check if branch is pushed to origin
 * @param {string} branch - Branch name
 * @returns {boolean} True if branch exists on origin
 */
function isBranchPushed(branch) {
  try {
    execGit(`git rev-parse origin/${branch}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Push branch to origin
 * @param {string} branch - Branch name
 */
function pushBranch(branch) {
  console.log(`\nPushing branch to origin...`);
  execGit(`git push -u origin ${branch}`);
  console.log('✓ Branch pushed to origin');
}

/**
 * Get current branch name
 * @returns {string} Branch name
 */
function getCurrentBranch() {
  return execGit('git rev-parse --abbrev-ref HEAD');
}

/**
 * Get list of changed files
 * @returns {Array<string>} File paths
 */
function getChangedFiles() {
  const diff = execGit('git diff --name-only main...HEAD');
  return diff.split('\n').filter(f => f.trim());
}

/**
 * Capitalize first letter of each word
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate PR title from feature name and type
 * @param {string} feature - Feature name
 * @param {string} type - PR type (feature, bugfix, docs, refactor)
 * @returns {string} PR title
 */
function generatePRTitle(feature, type) {
  const typePrefix = {
    feature: 'Add',
    bugfix: 'Fix',
    docs: 'Docs',
    refactor: 'Refactor'
  }[type] || 'Add';

  const featureName = capitalize(feature);
  return `${typePrefix} ${featureName}`;
}

/**
 * Generate PR description
 * @param {string} feature - Feature name
 * @param {Object} qualityResults - Quality validation results
 * @param {Object} metadata - Additional metadata (type, breaking, migrationGuide)
 * @returns {string} PR description markdown
 */
function generatePRDescription(feature, qualityResults, metadata) {
  const changedFiles = getChangedFiles();

  // Group files by type
  const tools = changedFiles.filter(f => f.startsWith('tools/'));
  const docs = changedFiles.filter(f => f.startsWith('docs/'));
  const readme = changedFiles.filter(f => f === 'README.md');
  const config = changedFiles.filter(f => f.includes('install.sh') || f.includes('package.json'));
  const tests = changedFiles.filter(f => f.includes('test') || f.includes('spec'));
  const other = changedFiles.filter(f =>
    !tools.includes(f) && !docs.includes(f) && !readme.includes(f) &&
    !config.includes(f) && !tests.includes(f)
  );

  // Build changes section
  const changes = [];
  if (tools.length > 0) {
    changes.push(`- Created/modified tools: ${tools.slice(0, 3).map(f => `\`${f}\``).join(', ')}${tools.length > 3 ? ` (+${tools.length - 3} more)` : ''}`);
  }
  if (docs.length > 0) {
    changes.push(`- Documentation: ${docs.slice(0, 3).map(f => `\`${f}\``).join(', ')}${docs.length > 3 ? ` (+${docs.length - 3} more)` : ''}`);
  }
  if (readme.length > 0) {
    changes.push(`- Updated \`README.md\``);
  }
  if (config.length > 0) {
    changes.push(`- Updated configuration: ${config.map(f => `\`${f}\``).join(', ')}`);
  }
  if (tests.length > 0) {
    changes.push(`- Added/updated tests: ${tests.length} file(s)`);
  }
  if (other.length > 0 && other.length < 5) {
    other.forEach(f => changes.push(`- Modified \`${f}\``));
  }

  // Build testing section
  const testing = [];
  testing.push(`✓ Markdown lint: ${qualityResults.markdownLint.passed ? 'PASSED' : 'FAILED'}`);
  testing.push(`✓ Manifest sync: ${qualityResults.manifestSync.synced ? 'PASSED' : 'NEEDS UPDATE'}`);
  testing.push(`✓ Documentation: ${qualityResults.documentation.complete ? 'COMPLETE' : 'INCOMPLETE'}`);
  if (qualityResults.tests.hasTests) {
    testing.push(`✓ Tests: ${qualityResults.tests.testFiles.length} test file(s)`);
  }
  testing.push(`✓ Quality score: ${qualityResults.score}/100`);

  // Build checklist
  const checklist = [];
  checklist.push(`- [${qualityResults.documentation.complete ? 'x' : ' '}] Documentation updated`);
  checklist.push(`- [${qualityResults.tests.hasTests ? 'x' : ' '}] Tests passing`);
  checklist.push(`- [${qualityResults.score >= 80 ? 'x' : ' '}] Quality gates passed (>= 80%)`);

  if (metadata.breaking) {
    checklist.push(`- [${metadata.migrationGuide ? 'x' : ' '}] Breaking changes documented`);
  } else {
    checklist.push(`- [x] No breaking changes`);
  }

  // Build description
  let description = `## Summary\n\n`;
  description += `Adds ${feature} feature.\n\n`;

  description += `## Changes\n\n`;
  description += changes.join('\n') + '\n\n';

  if (metadata.breaking && metadata.migrationGuide) {
    description += `## Breaking Changes\n\n`;
    description += `⚠️ This PR introduces breaking changes.\n\n`;
    description += `### Migration Guide\n\n`;
    description += metadata.migrationGuide + '\n\n';
  }

  description += `## Testing\n\n`;
  description += testing.join('\n') + '\n\n';

  description += `## Checklist\n\n`;
  description += checklist.join('\n') + '\n\n';

  description += `---\n\n`;
  description += `🤖 Generated using AIWG contributor workflow`;

  return description;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const featureName = args.find(arg => !arg.startsWith('--'));
  const isDraft = args.includes('--draft');

  if (!featureName) {
    console.error('Error: Feature name is required');
    console.error('Usage: aiwg -contribute-pr <feature-name> [--draft]');
    process.exit(1);
  }

  console.log(`Creating pull request for: ${featureName}\n`);

  // Check workspace exists
  if (!workspaceExists(featureName)) {
    console.error(`Error: Workspace not found for feature: ${featureName}`);
    console.error(`Run: aiwg -contribute-start ${featureName}`);
    process.exit(1);
  }

  // Load workspace data
  const workspaceResult = loadWorkspaceData(featureName);
  if (!workspaceResult.success) {
    console.error(`Error: ${workspaceResult.error}`);
    process.exit(1);
  }

  const workspace = workspaceResult.data;

  // Step 1: Prerequisites Check
  console.log('Step 1: Checking prerequisites...\n');

  // Check quality validation
  console.log('Running quality validation...');
  const qualityResults = runAllGates(featureName);

  if (!qualityResults.passed) {
    console.error('\n❌ Quality validation failed\n');
    console.error(generateReport(qualityResults));
    console.error(`\nMinimum quality score: 80/100 (current: ${qualityResults.score}/100)`);
    console.error(`\nFix issues and re-run: aiwg -contribute-test ${featureName}`);
    process.exit(1);
  }

  console.log(`✓ Quality validation passed (${qualityResults.score}/100)`);

  // Check git status
  if (!isGitClean()) {
    console.error('\n❌ Uncommitted changes detected');
    console.error('Please commit all changes before creating PR:');
    console.error('  git add .');
    console.error('  git commit -m "Your commit message"');
    process.exit(1);
  }

  console.log('✓ Working directory clean');

  // Get current branch
  const currentBranch = getCurrentBranch();
  console.log(`✓ Current branch: ${currentBranch}`);

  // Check if branch is pushed
  if (!isBranchPushed(currentBranch)) {
    const shouldPush = await promptYesNo('\nBranch not pushed to origin. Push now?', true);
    if (!shouldPush) {
      console.log('\nCancelled. Push branch manually:');
      console.log(`  git push -u origin ${currentBranch}`);
      rl.close();
      process.exit(0);
    }
    pushBranch(currentBranch);
  } else {
    console.log('✓ Branch pushed to origin');
  }

  // Step 2: Interactive PR Creation
  console.log('\n\nStep 2: PR Metadata\n');

  // PR Title
  const defaultTitle = generatePRTitle(featureName, 'feature');
  const prTitle = await prompt('PR Title', defaultTitle);

  // PR Type
  const prType = await promptChoice('PR Type', [
    { value: 'feature', label: 'feature (new functionality)' },
    { value: 'bugfix', label: 'bugfix (fix existing issue)' },
    { value: 'docs', label: 'docs (documentation only)' },
    { value: 'refactor', label: 'refactor (code improvement, no behavior change)' }
  ]);

  // Breaking Changes
  const hasBreaking = await promptYesNo('\nBreaking Changes?', false);

  let migrationGuide = '';
  if (hasBreaking) {
    console.log('\nBreaking changes detected. Please provide migration guide:');
    console.log('(Enter multi-line text. Press Ctrl+D when done)\n');

    // Read multiline input
    migrationGuide = await new Promise((resolve) => {
      let lines = [];
      const stdin = process.stdin;
      stdin.setRawMode(false);
      stdin.resume();
      stdin.setEncoding('utf8');

      stdin.on('data', (chunk) => {
        lines.push(chunk);
      });

      stdin.on('end', () => {
        resolve(lines.join(''));
      });
    });
  }

  // Step 3: Generate PR Description
  console.log('\n\nStep 3: Generating PR description...\n');

  const prDescription = generatePRDescription(featureName, qualityResults, {
    type: prType,
    breaking: hasBreaking,
    migrationGuide
  });

  console.log('--- PR Description Preview ---');
  console.log(prDescription);
  console.log('--- End Preview ---\n');

  const confirmCreate = await promptYesNo('Create PR with this description?', true);
  if (!confirmCreate) {
    console.log('\nCancelled.');
    rl.close();
    process.exit(0);
  }

  // Step 4: Create PR via GitHub API
  console.log('\n\nStep 4: Creating pull request...\n');

  const labels = ['contribution', prType];
  if (hasBreaking) {
    labels.push('breaking');
  }

  const prResult = createPR(prTitle, prDescription, labels, isDraft);

  if (!prResult.success) {
    console.error(`\n❌ Failed to create PR: ${prResult.error}`);
    rl.close();
    process.exit(1);
  }

  console.log(`✓ PR created: ${prResult.url}`);
  console.log(`✓ PR number: #${prResult.number}`);
  if (isDraft) {
    console.log('✓ PR marked as draft');
  }

  // Step 5: Save PR Metadata
  console.log('\n\nStep 5: Saving PR metadata...\n');

  const prMetadata = {
    number: prResult.number,
    url: prResult.url,
    title: prTitle,
    type: prType,
    breaking: hasBreaking,
    draft: isDraft,
    created_at: new Date().toISOString(),
    quality_score: qualityResults.score
  };

  const saveResult = savePRMetadata(featureName, prMetadata);
  if (!saveResult.success) {
    console.warn(`⚠ Warning: Failed to save PR metadata: ${saveResult.error}`);
  } else {
    console.log(`✓ PR metadata saved to workspace`);
  }

  // Step 6: Output Next Steps
  console.log('\n\n✅ PR created successfully!\n');
  console.log(`PR #${prResult.number}: ${prTitle}`);
  console.log(`URL: ${prResult.url}\n`);
  console.log('Next steps:');
  console.log(`- Monitor PR: aiwg -contribute-monitor ${featureName}`);
  console.log(`- Respond to reviews: aiwg -contribute-respond ${featureName}`);
  console.log(`- View online: gh pr view ${prResult.number} --web`);

  rl.close();
}

// Run main
main().catch(err => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
