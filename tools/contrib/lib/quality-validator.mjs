#!/usr/bin/env node
/**
 * Quality Validator
 *
 * Runs quality gates and calculates quality scores for contributions.
 * Reuses existing lint and manifest tools for validation.
 *
 * Quality Score Calculation:
 * Base: 100 points
 * - Missing README update: -20
 * - Missing quick-start: -20
 * - Missing integration doc: -10
 * - Lint errors: -5 per error
 * - Manifest out of sync: -10
 * - Breaking changes undocumented: -30
 * - Missing tests: -10
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Execute command and return structured result
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
 * Run markdown lint validation
 * @param {string} projectRoot - Project root directory
 * @returns {Object} { passed: boolean, errors: number, warnings: number, details: Array }
 */
export function runMarkdownLint(projectRoot = process.cwd()) {
  const result = exec(`npm exec markdownlint-cli2 "**/*.md"`, { cwd: projectRoot });

  if (result.success) {
    return {
      passed: true,
      errors: 0,
      warnings: 0,
      details: []
    };
  }

  // Parse lint output for error count
  const output = result.stderr || result.stdout;
  const lines = output.split('\n').filter(line => line.trim());

  // Count errors (lines with file:line format)
  const errorLines = lines.filter(line => line.match(/^[^:]+:\d+/));

  return {
    passed: false,
    errors: errorLines.length,
    warnings: 0,
    details: errorLines.map(line => {
      const match = line.match(/^([^:]+):(\d+)(?::(\d+))?\s+(.+)$/);
      if (match) {
        return {
          file: match[1],
          line: parseInt(match[2], 10),
          message: match[4]
        };
      }
      return { file: 'unknown', line: 0, message: line };
    })
  };
}

/**
 * Check manifest sync status
 * @param {string} projectRoot - Project root directory
 * @returns {Object} { synced: boolean, outOfSync: number, details: Array }
 */
export function checkManifestSync(projectRoot = process.cwd()) {
  // Use check-manifests.mjs if it exists
  const checkManifestsPath = path.join(projectRoot, 'tools/manifest/check-manifests.mjs');

  if (fs.existsSync(checkManifestsPath)) {
    const result = exec(`node ${checkManifestsPath}`, { cwd: projectRoot });

    // Check if output indicates sync issues
    const needsSync = result.stdout.includes('out of sync') || result.stdout.includes('missing');

    if (!needsSync && result.success) {
      return {
        synced: true,
        outOfSync: 0,
        details: []
      };
    }

    // Parse output for details
    const lines = result.stdout.split('\n').filter(line => line.includes('manifest.json'));

    return {
      synced: false,
      outOfSync: lines.length,
      details: lines.map(line => ({ message: line }))
    };
  }

  // Fallback: check if manifests exist in expected locations
  const manifestDirs = [
    'tools',
    'templates',
    'docs',
    'agentic',
    '.claude'
  ];

  const issues = [];
  for (const dir of manifestDirs) {
    const dirPath = path.join(projectRoot, dir);
    const manifestPath = path.join(dirPath, 'manifest.json');

    if (fs.existsSync(dirPath) && !fs.existsSync(manifestPath)) {
      issues.push({ message: `Missing manifest: ${dir}/manifest.json` });
    }
  }

  return {
    synced: issues.length === 0,
    outOfSync: issues.length,
    details: issues
  };
}

/**
 * Check documentation completeness
 * @param {string} feature - Feature name
 * @param {string} projectRoot - Project root directory
 * @returns {Object} { complete: boolean, missing: Array, present: Array }
 */
export function checkDocumentation(feature, projectRoot = process.cwd()) {
  const checks = [
    {
      name: 'README.md updated',
      check: () => {
        const readmePath = path.join(projectRoot, 'README.md');
        if (!fs.existsSync(readmePath)) return false;

        const content = fs.readFileSync(readmePath, 'utf8');
        // Check if feature is mentioned (case-insensitive)
        return content.toLowerCase().includes(feature.toLowerCase());
      }
    },
    {
      name: 'Quick-start guide present',
      check: () => {
        // Check for quickstart in docs/integrations/ or docs/
        const quickstartPaths = [
          path.join(projectRoot, 'docs/integrations', `${feature}-quickstart.md`),
          path.join(projectRoot, 'docs', `${feature}-quickstart.md`),
          path.join(projectRoot, 'docs/integrations', `${feature}.md`)
        ];

        return quickstartPaths.some(p => fs.existsSync(p));
      }
    },
    {
      name: 'Integration doc present',
      check: () => {
        // Check for integration documentation
        const integrationPaths = [
          path.join(projectRoot, 'docs/integrations', `${feature}.md`),
          path.join(projectRoot, 'docs/integrations', `${feature}-integration.md`),
          path.join(projectRoot, 'docs', `${feature}.md`)
        ];

        return integrationPaths.some(p => fs.existsSync(p));
      }
    }
  ];

  const results = checks.map(({ name, check }) => ({
    name,
    present: check()
  }));

  const missing = results.filter(r => !r.present).map(r => r.name);
  const present = results.filter(r => r.present).map(r => r.name);

  return {
    complete: missing.length === 0,
    missing,
    present
  };
}

/**
 * Check for breaking changes in git diff
 * @param {string} projectRoot - Project root directory
 * @returns {Object} { hasBreaking: boolean, documented: boolean, files: Array }
 */
function checkBreakingChanges(projectRoot = process.cwd()) {
  // Get list of changed files
  const result = exec('git diff --name-only HEAD', { cwd: projectRoot });

  if (!result.success) {
    return {
      hasBreaking: false,
      documented: false,
      files: []
    };
  }

  const files = result.stdout.split('\n').filter(f => f.trim());

  // Check for potentially breaking changes
  const breakingFiles = files.filter(f =>
    f.includes('install.sh') ||
    f.includes('package.json') ||
    f.includes('/commands/') ||
    f.includes('/agents/') ||
    f.includes('CLAUDE.md')
  );

  if (breakingFiles.length === 0) {
    return {
      hasBreaking: false,
      documented: false,
      files: []
    };
  }

  // Check if breaking changes are documented
  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  const hasChangelog = fs.existsSync(changelogPath);

  let documented = false;
  if (hasChangelog) {
    const content = fs.readFileSync(changelogPath, 'utf8');
    documented = content.toLowerCase().includes('breaking') ||
                 content.toLowerCase().includes('migration');
  }

  return {
    hasBreaking: true,
    documented,
    files: breakingFiles
  };
}

/**
 * Check for tests
 * @param {string} feature - Feature name
 * @param {string} projectRoot - Project root directory
 * @returns {Object} { hasTests: boolean, testFiles: Array }
 */
function checkTests(feature, projectRoot = process.cwd()) {
  const testDirs = [
    path.join(projectRoot, 'tests'),
    path.join(projectRoot, 'test'),
    path.join(projectRoot, '__tests__')
  ];

  const testFiles = [];

  for (const testDir of testDirs) {
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir, { recursive: true })
        .filter(f => {
          const name = path.basename(f);
          return (name.includes(feature) || name.includes('all')) &&
                 (name.endsWith('.test.js') ||
                  name.endsWith('.test.mjs') ||
                  name.endsWith('.spec.js') ||
                  name.endsWith('.spec.mjs'));
        });

      testFiles.push(...files.map(f => path.join(testDir, f)));
    }
  }

  return {
    hasTests: testFiles.length > 0,
    testFiles
  };
}

/**
 * Calculate quality score based on validation results
 * @param {Object} results - Validation results from runAllGates
 * @returns {number} Quality score (0-100)
 */
export function calculateQualityScore(results) {
  let score = 100;

  // Markdown lint: -5 per error
  if (!results.markdownLint.passed) {
    score -= results.markdownLint.errors * 5;
  }

  // Manifest sync: -10
  if (!results.manifestSync.synced) {
    score -= 10;
  }

  // Documentation: -20 for README, -20 for quickstart, -10 for integration doc
  if (results.documentation.missing.includes('README.md updated')) {
    score -= 20;
  }
  if (results.documentation.missing.includes('Quick-start guide present')) {
    score -= 20;
  }
  if (results.documentation.missing.includes('Integration doc present')) {
    score -= 10;
  }

  // Breaking changes undocumented: -30
  if (results.breakingChanges.hasBreaking && !results.breakingChanges.documented) {
    score -= 30;
  }

  // Missing tests: -10
  if (!results.tests.hasTests) {
    score -= 10;
  }

  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Run all quality gates
 * @param {string} feature - Feature name
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Comprehensive validation results
 */
export function runAllGates(feature, projectRoot = process.cwd()) {
  const results = {
    markdownLint: runMarkdownLint(projectRoot),
    manifestSync: checkManifestSync(projectRoot),
    documentation: checkDocumentation(feature, projectRoot),
    breakingChanges: checkBreakingChanges(projectRoot),
    tests: checkTests(feature, projectRoot)
  };

  const score = calculateQualityScore(results);
  const passed = score >= 80;

  return {
    score,
    passed,
    ...results
  };
}

/**
 * Generate quality report from validation results
 * @param {Object} results - Results from runAllGates
 * @returns {string} Human-readable report
 */
export function generateReport(results) {
  const lines = [];

  lines.push('Quality Validation Report');
  lines.push('========================');
  lines.push('');

  // Overall score
  lines.push(`Quality Score: ${results.score}/100`);
  lines.push(`Status: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push('');

  // Markdown lint
  lines.push(`Markdown Lint: ${results.markdownLint.passed ? '✓' : '✗'} ${results.markdownLint.passed ? 'PASSED' : 'FAILED'}`);
  if (!results.markdownLint.passed) {
    lines.push(`  Errors: ${results.markdownLint.errors}`);
    results.markdownLint.details.slice(0, 5).forEach(detail => {
      lines.push(`  - ${detail.file}:${detail.line} ${detail.message}`);
    });
    if (results.markdownLint.details.length > 5) {
      lines.push(`  ... and ${results.markdownLint.details.length - 5} more`);
    }
  }
  lines.push('');

  // Manifest sync
  lines.push(`Manifest Sync: ${results.manifestSync.synced ? '✓' : '⚠'} ${results.manifestSync.synced ? 'PASSED' : 'NEEDS UPDATE'}`);
  if (!results.manifestSync.synced) {
    lines.push(`  Out of sync: ${results.manifestSync.outOfSync}`);
    results.manifestSync.details.forEach(detail => {
      lines.push(`  - ${detail.message}`);
    });
  }
  lines.push('');

  // Documentation
  lines.push(`Documentation: ${results.documentation.complete ? '✓' : '✗'} ${results.documentation.complete ? 'COMPLETE' : 'INCOMPLETE'}`);
  results.documentation.present.forEach(doc => {
    lines.push(`  ✓ ${doc}`);
  });
  results.documentation.missing.forEach(doc => {
    lines.push(`  ✗ ${doc}`);
  });
  lines.push('');

  // Breaking changes
  if (results.breakingChanges.hasBreaking) {
    lines.push(`Breaking Changes: ${results.breakingChanges.documented ? '✓' : '✗'} ${results.breakingChanges.documented ? 'DOCUMENTED' : 'UNDOCUMENTED'}`);
    lines.push(`  Files with potential breaking changes:`);
    results.breakingChanges.files.forEach(file => {
      lines.push(`  - ${file}`);
    });
  } else {
    lines.push('Breaking Changes: ✓ NONE');
  }
  lines.push('');

  // Tests
  lines.push(`Tests: ${results.tests.hasTests ? '✓' : '⚠'} ${results.tests.hasTests ? 'PRESENT' : 'MISSING'}`);
  if (results.tests.hasTests) {
    lines.push(`  Test files: ${results.tests.testFiles.length}`);
    results.tests.testFiles.forEach(file => {
      lines.push(`  - ${path.relative(process.cwd(), file)}`);
    });
  }
  lines.push('');

  // Summary
  if (!results.passed) {
    lines.push('Issues to Fix:');
    let issueNum = 1;

    if (!results.markdownLint.passed) {
      lines.push(`${issueNum++}. Fix markdown lint errors (${results.markdownLint.errors} errors)`);
      lines.push('   Run: npm exec markdownlint-cli2-fix "**/*.md"');
    }

    if (!results.manifestSync.synced) {
      lines.push(`${issueNum++}. Sync manifests`);
      lines.push('   Run: node tools/manifest/sync-manifests.mjs --fix --write-md');
    }

    results.documentation.missing.forEach(doc => {
      lines.push(`${issueNum++}. Add ${doc}`);
    });

    if (results.breakingChanges.hasBreaking && !results.breakingChanges.documented) {
      lines.push(`${issueNum++}. Document breaking changes in CHANGELOG.md`);
    }

    if (!results.tests.hasTests) {
      lines.push(`${issueNum++}. Add tests for your feature (optional but recommended)`);
    }

    lines.push('');
    lines.push(`Minimum quality score: 80/100 (current: ${results.score}/100)`);
  } else {
    lines.push('✅ Ready for PR creation');
  }

  return lines.join('\n');
}
