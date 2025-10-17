#!/usr/bin/env node
/**
 * Test Contribution Quality
 *
 * Runs quality validation for contributor workflow before PR creation.
 * Ensures contributions meet AIWG quality standards.
 *
 * Usage:
 *   aiwg -contribute-test <feature-name> [--verbose]
 *
 * Exit Codes:
 *   0 - Quality score >= 80 (ready for PR)
 *   1 - Quality score < 80 (not ready)
 *   2 - Prerequisites not met (workspace/branch)
 *   3 - Validation error
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  runAllGates,
  generateReport
} from './lib/quality-validator.mjs';
import {
  workspaceExists,
  saveQualityReport,
  getWorkspacePath
} from './lib/workspace-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse command-line arguments
 * @param {Array<string>} args - Process arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs(args) {
  const feature = args.find(arg => !arg.startsWith('--'));
  const verbose = args.includes('--verbose') || args.includes('-v');

  return { feature, verbose };
}

/**
 * Check if current branch matches expected pattern
 * @param {string} expectedBranch - Expected branch name
 * @returns {Object} { onCorrectBranch: boolean, currentBranch: string }
 */
function checkBranch(expectedBranch) {
  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    return {
      onCorrectBranch: currentBranch === expectedBranch,
      currentBranch
    };
  } catch (err) {
    return {
      onCorrectBranch: false,
      currentBranch: null,
      error: err.message
    };
  }
}

/**
 * Get username from git config
 * @returns {string|null} Username or null
 */
function getUsername() {
  try {
    const username = execSync('git config user.name', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return username.toLowerCase().replace(/\s+/g, '-');
  } catch (err) {
    return null;
  }
}

/**
 * Print visual indicator with status
 * @param {string} label - Status label
 * @param {string} status - Status value
 * @param {string} symbol - Visual symbol (✓, ✗, ⚠)
 */
function printStatus(label, status, symbol = '✓') {
  const symbols = {
    '✓': '\x1b[32m✓\x1b[0m', // green checkmark
    '✗': '\x1b[31m✗\x1b[0m', // red X
    '⚠': '\x1b[33m⚠\x1b[0m'  // yellow warning
  };

  const coloredSymbol = symbols[symbol] || symbol;
  console.log(`${coloredSymbol} ${label}: ${status}`);
}

/**
 * Print verbose details
 * @param {Object} results - Validation results
 */
function printVerboseDetails(results) {
  console.log('\n--- Detailed Validation Results ---\n');

  // Markdown lint details
  if (!results.markdownLint.passed && results.markdownLint.details.length > 0) {
    console.log('Markdown Lint Errors:');
    results.markdownLint.details.forEach(detail => {
      console.log(`  ${detail.file}:${detail.line} - ${detail.message}`);
    });
    console.log('');
  }

  // Manifest sync details
  if (!results.manifestSync.synced && results.manifestSync.details.length > 0) {
    console.log('Manifest Sync Issues:');
    results.manifestSync.details.forEach(detail => {
      console.log(`  ${detail.message}`);
    });
    console.log('');
  }

  // Documentation details
  if (results.documentation.missing.length > 0) {
    console.log('Missing Documentation:');
    results.documentation.missing.forEach(doc => {
      console.log(`  - ${doc}`);
    });
    console.log('');
  }

  // Breaking changes details
  if (results.breakingChanges.hasBreaking) {
    console.log('Potentially Breaking Files:');
    results.breakingChanges.files.forEach(file => {
      console.log(`  - ${file}`);
    });
    console.log('');
  }

  // Test files
  if (results.tests.hasTests && results.tests.testFiles.length > 0) {
    console.log('Test Files Found:');
    results.tests.testFiles.forEach(file => {
      console.log(`  - ${path.relative(process.cwd(), file)}`);
    });
    console.log('');
  }
}

/**
 * Print issues to fix
 * @param {Object} results - Validation results
 */
function printIssuesToFix(results) {
  console.log('\nIssues to Fix:\n');
  let issueNum = 1;

  if (!results.markdownLint.passed) {
    console.log(`${issueNum++}. Fix markdown lint errors (${results.markdownLint.errors} errors)`);
    console.log('   Run: npm exec markdownlint-cli2-fix "**/*.md"');
  }

  if (!results.manifestSync.synced) {
    console.log(`${issueNum++}. Sync manifests`);
    console.log('   Run: node tools/manifest/sync-manifests.mjs --fix --write-md');
  }

  results.documentation.missing.forEach(doc => {
    if (doc.includes('README.md')) {
      console.log(`${issueNum++}. Update README.md to mention your feature`);
    } else if (doc.includes('Quick-start')) {
      console.log(`${issueNum++}. Add quick-start guide`);
      console.log(`   Location: docs/integrations/${results.feature}-quickstart.md`);
    } else if (doc.includes('Integration doc')) {
      console.log(`${issueNum++}. Add integration documentation`);
      console.log(`   Location: docs/integrations/${results.feature}.md`);
    }
  });

  if (results.breakingChanges.hasBreaking && !results.breakingChanges.documented) {
    console.log(`${issueNum++}. Document breaking changes in CHANGELOG.md`);
  }

  if (!results.tests.hasTests) {
    console.log(`${issueNum++}. Add tests for your feature (optional but recommended)`);
  }

  console.log(`\nMinimum quality score: 80/100 (current: ${results.score}/100)`);
}

/**
 * Main function
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Validate feature name
  if (!args.feature) {
    console.error('Error: Feature name is required');
    console.error('Usage: aiwg -contribute-test <feature-name> [--verbose]');
    process.exit(1);
  }

  const feature = args.feature;

  console.log('Running quality validation...\n');

  // 1. Check prerequisites
  console.log('Checking prerequisites...\n');

  // Check workspace exists
  if (!workspaceExists(feature)) {
    console.error(`Error: Workspace not found for feature "${feature}"`);
    console.error(`Run: aiwg -contribute-start ${feature}`);
    process.exit(2);
  }

  printStatus('Workspace exists', getWorkspacePath(feature));

  // Check current branch
  const username = getUsername();
  const expectedBranch = `contrib/${username}/${feature}`;
  const branchCheck = checkBranch(expectedBranch);

  if (!branchCheck.onCorrectBranch) {
    printStatus(
      'Current branch',
      `${branchCheck.currentBranch} (expected: ${expectedBranch})`,
      '⚠'
    );
    console.log('\nWarning: You are not on the expected feature branch.');
    console.log(`Expected: ${expectedBranch}`);
    console.log(`Current:  ${branchCheck.currentBranch}`);
    console.log('\nContinuing validation anyway...\n');
  } else {
    printStatus('Current branch', expectedBranch);
  }

  console.log('');

  // 2. Run quality gates
  console.log('Running quality gates...\n');

  let results;
  try {
    results = runAllGates(feature, process.cwd());
  } catch (err) {
    console.error('Error: Quality validation failed');
    console.error(err.message);
    if (args.verbose) {
      console.error(err.stack);
    }
    process.exit(3);
  }

  // 3. Display results
  printStatus(
    'Markdown lint',
    results.markdownLint.passed ? 'PASSED' : `FAILED (${results.markdownLint.errors} errors)`,
    results.markdownLint.passed ? '✓' : '✗'
  );

  printStatus(
    'Manifest sync',
    results.manifestSync.synced ? 'PASSED' : 'NEEDS UPDATE',
    results.manifestSync.synced ? '✓' : '⚠'
  );

  printStatus(
    'Documentation',
    results.documentation.complete ? 'COMPLETE' : 'INCOMPLETE',
    results.documentation.complete ? '✓' : '✗'
  );

  printStatus(
    'Breaking changes',
    results.breakingChanges.hasBreaking
      ? (results.breakingChanges.documented ? 'DOCUMENTED' : 'UNDOCUMENTED')
      : 'NONE',
    results.breakingChanges.hasBreaking
      ? (results.breakingChanges.documented ? '✓' : '✗')
      : '✓'
  );

  printStatus(
    'Tests',
    results.tests.hasTests ? 'PRESENT' : 'MISSING',
    results.tests.hasTests ? '✓' : '⚠'
  );

  console.log('');

  // 4. Display quality score
  console.log(`Quality Score: ${results.score}/100`);
  console.log(`Status: ${results.passed ? '\x1b[32m✅ READY for PR creation\x1b[0m' : '\x1b[31m❌ NOT READY\x1b[0m'}`);

  // 5. Show verbose details if requested
  if (args.verbose) {
    printVerboseDetails(results);
  }

  // 6. Show issues to fix if not passing
  if (!results.passed) {
    printIssuesToFix(results);
  }

  // 7. Save quality report to workspace
  console.log('');
  try {
    const saveResult = saveQualityReport(feature, {
      score: results.score,
      passed: results.passed,
      timestamp: new Date().toISOString(),
      gates: {
        markdownLint: {
          passed: results.markdownLint.passed,
          errors: results.markdownLint.errors
        },
        manifestSync: {
          synced: results.manifestSync.synced,
          outOfSync: results.manifestSync.outOfSync
        },
        documentation: {
          complete: results.documentation.complete,
          missing: results.documentation.missing
        },
        breakingChanges: {
          hasBreaking: results.breakingChanges.hasBreaking,
          documented: results.breakingChanges.documented
        },
        tests: {
          hasTests: results.tests.hasTests,
          testFiles: results.tests.testFiles.length
        }
      }
    });

    if (saveResult.success) {
      console.log(`Quality report saved: ${getWorkspacePath(feature)}/quality.json`);
    } else {
      console.warn(`Warning: Failed to save quality report: ${saveResult.error}`);
    }
  } catch (err) {
    console.warn(`Warning: Failed to save quality report: ${err.message}`);
  }

  // 8. Exit with appropriate code
  process.exit(results.passed ? 0 : 1);
}

// Run main function
main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(3);
});
