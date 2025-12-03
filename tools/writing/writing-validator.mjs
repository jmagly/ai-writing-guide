#!/usr/bin/env node
/**
 * Writing Validator CLI
 *
 * Validates content files for AI detection patterns and calculates authenticity scores.
 *
 * Usage:
 *   node tools/writing/writing-validator.mjs <file-or-directory> [options]
 *
 * Options:
 *   --context <type>    Validation context: academic, technical, executive, casual
 *   --format <type>     Output format: text, json, html (default: text)
 *   --output <path>     Save report to file
 *   --threshold <num>   Minimum passing score (default: 70)
 *   --verbose           Show detailed analysis
 *   --quiet             Only show score and pass/fail
 *   --help              Show this help message
 *
 * @module tools/writing/writing-validator
 */

import { readFile, readdir, stat, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the validation engine from src
const srcPath = resolve(__dirname, '../../src/writing/validation-engine.ts');

/**
 * Convert 0-100 score to Likert scale (1-5)
 */
function scoreToLikert(score) {
  if (score < 40) return 1;
  if (score < 60) return 2;
  if (score < 75) return 3;
  if (score < 86) return 4;
  return 5;
}

/**
 * Get Likert scale description
 */
function getLikertDescription(likert) {
  const descriptions = {
    1: 'Very Low (AI-like)',
    2: 'Low',
    3: 'Moderate',
    4: 'High',
    5: 'Very High (Human-like)'
  };
  return descriptions[likert] || 'Unknown';
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    files: [],
    context: undefined,
    format: 'text',
    output: undefined,
    threshold: 70,
    verbose: false,
    quiet: false,
    help: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--context') {
      options.context = args[++i];
    } else if (arg === '--format') {
      options.format = args[++i];
    } else if (arg === '--output') {
      options.output = args[++i];
    } else if (arg === '--threshold') {
      options.threshold = parseInt(args[++i], 10);
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
    } else if (!arg.startsWith('-')) {
      options.files.push(arg);
    }

    i++;
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Writing Validator CLI

Validates content files for AI detection patterns and calculates authenticity scores.

USAGE:
  node tools/writing/writing-validator.mjs <file-or-directory> [options]

ARGUMENTS:
  <file-or-directory>   Path to a file or directory to validate

OPTIONS:
  --context <type>      Validation context: academic, technical, executive, casual
  --format <type>       Output format: text, json, html (default: text)
  --output <path>       Save report to file
  --threshold <num>     Minimum passing score 0-100 (default: 70)
  --verbose, -v         Show detailed analysis
  --quiet, -q           Only show score and pass/fail
  --help, -h            Show this help message

SCORING:
  The validator produces two scores:
  - Raw Score (0-100): Higher is more authentic/human-like
  - Likert Scale (1-5): Converted authenticity rating
    1 = Very Low (AI-like)
    2 = Low
    3 = Moderate
    4 = High
    5 = Very High (Human-like)

EXAMPLES:
  # Validate a single file
  node tools/writing/writing-validator.mjs docs/readme.md

  # Validate with technical context
  node tools/writing/writing-validator.mjs src/ --context technical

  # Output as JSON
  node tools/writing/writing-validator.mjs content.md --format json

  # Set custom threshold
  node tools/writing/writing-validator.mjs docs/ --threshold 80 --verbose
`);
}

/**
 * Find all markdown/text files in a directory
 */
async function findFiles(dirPath, extensions = ['.md', '.txt', '.markdown']) {
  const files = [];
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    // Skip hidden files and common non-content directories
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await findFiles(fullPath, extensions);
      files.push(...subFiles);
    } else if (extensions.includes(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Format a single result for console output
 */
function formatResult(filePath, result, options) {
  const likert = scoreToLikert(result.score);
  const passed = result.score >= options.threshold;
  const status = passed ? '✓ PASS' : '✗ FAIL';
  const statusColor = passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';

  if (options.quiet) {
    return `${statusColor}${status}${reset} ${filePath}: ${result.score}/100 (Likert: ${likert}/5)`;
  }

  const lines = [];
  lines.push(`\n${'='.repeat(60)}`);
  lines.push(`${statusColor}${status}${reset} ${filePath}`);
  lines.push(`${'='.repeat(60)}`);

  lines.push(`\nSCORES:`);
  lines.push(`  Raw Score:      ${result.score}/100`);
  lines.push(`  Likert Scale:   ${likert}/5 (${getLikertDescription(likert)})`);
  lines.push(`  Authenticity:   ${result.summary.authenticityScore}/100`);
  lines.push(`  AI Pattern:     ${result.summary.aiPatternScore}/100 (lower is better)`);

  lines.push(`\nSTATISTICS:`);
  lines.push(`  Word Count:     ${result.summary.wordCount}`);
  lines.push(`  Sentence Count: ${result.summary.sentenceCount}`);
  lines.push(`  Total Issues:   ${result.summary.totalIssues}`);
  lines.push(`    Critical:     ${result.summary.criticalCount}`);
  lines.push(`    Warnings:     ${result.summary.warningCount}`);
  lines.push(`    Info:         ${result.summary.infoCount}`);

  if (options.verbose) {
    if (result.humanMarkers.length > 0) {
      lines.push(`\nHUMAN MARKERS FOUND:`);
      result.humanMarkers.forEach(m => lines.push(`  ✓ ${m}`));
    }

    if (result.aiTells.length > 0) {
      lines.push(`\nAI TELLS FOUND:`);
      result.aiTells.forEach(t => lines.push(`  ✗ ${t}`));
    }

    if (result.issues.length > 0) {
      lines.push(`\nISSUES (showing first 10):`);
      result.issues.slice(0, 10).forEach(issue => {
        const sevColor = issue.severity === 'critical' ? '\x1b[31m' :
                         issue.severity === 'warning' ? '\x1b[33m' : '\x1b[36m';
        lines.push(`  ${sevColor}[${issue.severity.toUpperCase()}]${reset} Line ${issue.location.line}: ${issue.message}`);
        if (issue.suggestion) {
          lines.push(`    → ${issue.suggestion}`);
        }
      });

      if (result.issues.length > 10) {
        lines.push(`  ... and ${result.issues.length - 10} more issues`);
      }
    }
  }

  if (result.suggestions.length > 0) {
    lines.push(`\nSUGGESTIONS:`);
    result.suggestions.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  }

  return lines.join('\n');
}

/**
 * Format batch summary
 */
function formatBatchSummary(results, options) {
  let totalScore = 0;
  let passed = 0;
  let failed = 0;
  let totalIssues = 0;

  results.forEach((result) => {
    totalScore += result.score;
    totalIssues += result.issues.length;
    if (result.score >= options.threshold) {
      passed++;
    } else {
      failed++;
    }
  });

  const avgScore = results.size > 0 ? totalScore / results.size : 0;
  const avgLikert = scoreToLikert(avgScore);

  const lines = [];
  lines.push(`\n${'='.repeat(60)}`);
  lines.push(`BATCH SUMMARY`);
  lines.push(`${'='.repeat(60)}`);
  lines.push(`  Files Validated:  ${results.size}`);
  lines.push(`  Average Score:    ${avgScore.toFixed(1)}/100 (Likert: ${avgLikert}/5)`);
  lines.push(`  Passed (>=${options.threshold}):  ${passed}`);
  lines.push(`  Failed (<${options.threshold}):   ${failed}`);
  lines.push(`  Total Issues:     ${totalIssues}`);

  return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help || options.files.length === 0) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  // Dynamically import the validation engine
  let WritingValidationEngine;
  try {
    const module = await import(srcPath);
    WritingValidationEngine = module.WritingValidationEngine;
  } catch (error) {
    console.error('Failed to load validation engine:', error.message);
    console.error('Make sure to run from the ai-writing-guide root directory.');
    process.exit(1);
  }

  const engine = new WritingValidationEngine();
  await engine.initialize();

  // Collect all files to validate
  let filesToValidate = [];

  for (const filePath of options.files) {
    const fullPath = resolve(filePath);

    if (!existsSync(fullPath)) {
      console.error(`File or directory not found: ${filePath}`);
      continue;
    }

    const stats = await stat(fullPath);
    if (stats.isDirectory()) {
      const found = await findFiles(fullPath);
      filesToValidate.push(...found);
    } else {
      filesToValidate.push(fullPath);
    }
  }

  if (filesToValidate.length === 0) {
    console.error('No files found to validate.');
    process.exit(1);
  }

  console.log(`Validating ${filesToValidate.length} file(s)...\n`);

  const startTime = Date.now();
  let allPassed = true;

  if (filesToValidate.length === 1) {
    // Single file validation
    const filePath = filesToValidate[0];
    let result;

    if (options.context) {
      result = await engine.validateForContext(
        await readFile(filePath, 'utf-8'),
        options.context
      );
    } else {
      result = await engine.validateFile(filePath);
    }

    if (options.format === 'json') {
      const output = {
        ...result,
        likertScore: scoreToLikert(result.score),
        likertDescription: getLikertDescription(scoreToLikert(result.score)),
        passed: result.score >= options.threshold
      };
      console.log(JSON.stringify(output, null, 2));
    } else if (options.format === 'html') {
      const report = engine.generateReport(result, 'html');
      if (options.output) {
        await mkdir(dirname(options.output), { recursive: true });
        await writeFile(options.output, report);
        console.log(`HTML report saved to: ${options.output}`);
      } else {
        console.log(report);
      }
    } else {
      console.log(formatResult(filePath, result, options));
    }

    allPassed = result.score >= options.threshold;
  } else {
    // Batch validation
    const results = await engine.validateBatch(filesToValidate);

    if (options.format === 'json') {
      const output = {};
      results.forEach((result, filePath) => {
        output[filePath] = {
          ...result,
          likertScore: scoreToLikert(result.score),
          likertDescription: getLikertDescription(scoreToLikert(result.score)),
          passed: result.score >= options.threshold
        };
      });
      console.log(JSON.stringify(output, null, 2));
    } else {
      results.forEach((result, filePath) => {
        console.log(formatResult(filePath, result, options));
        if (result.score < options.threshold) {
          allPassed = false;
        }
      });

      console.log(formatBatchSummary(results, options));
    }

    // Check if all passed
    results.forEach((result) => {
      if (result.score < options.threshold) {
        allPassed = false;
      }
    });
  }

  const duration = Date.now() - startTime;
  console.log(`\nCompleted in ${duration}ms`);

  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
