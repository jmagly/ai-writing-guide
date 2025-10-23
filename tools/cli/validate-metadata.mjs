#!/usr/bin/env node

/**
 * CLI tool for validating plugin metadata manifests
 *
 * Usage: aiwg-validate-metadata [options] <path>
 *
 * @module tools/cli/validate-metadata
 */

import { MetadataValidator } from '../../dist/plugin/metadata-validator.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';

/**
 * CLI configuration
 */
const config = {
  recursive: false,
  format: 'text',
  strict: false,
  fix: false,
  ci: false,
  path: null
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      showHelp();
      process.exit(0);
    } else if (arg === '--recursive') {
      config.recursive = true;
    } else if (arg === '--format') {
      config.format = args[++i];
      if (config.format !== 'text' && config.format !== 'json') {
        console.error(chalk.red('Error: --format must be "text" or "json"'));
        process.exit(1);
      }
    } else if (arg === '--strict') {
      config.strict = true;
    } else if (arg === '--fix') {
      config.fix = true;
    } else if (arg === '--ci') {
      config.ci = true;
    } else if (!arg.startsWith('-')) {
      config.path = arg;
    } else {
      console.error(chalk.red(`Unknown option: ${arg}`));
      showHelp();
      process.exit(1);
    }
  }

  if (!config.path) {
    console.error(chalk.red('Error: Path argument is required'));
    showHelp();
    process.exit(1);
  }
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
${chalk.bold('aiwg-validate-metadata')} - Validate plugin metadata manifests

${chalk.bold('Usage:')}
  aiwg-validate-metadata [options] <path>

${chalk.bold('Arguments:')}
  path                   Path to manifest.md file or directory

${chalk.bold('Options:')}
  --recursive           Validate all manifests in directory recursively
  --format <type>       Output format: text|json (default: text)
  --strict              Treat warnings as errors
  --fix                 Auto-fix common issues (version format, etc.)
  --ci                  CI mode: exit code 1 on errors, 0 on success
  -h, --help            Show this help message

${chalk.bold('Examples:')}
  # Validate single manifest
  aiwg-validate-metadata .claude/agents/writing-validator.md

  # Validate all manifests in directory
  aiwg-validate-metadata --recursive .claude/agents

  # CI mode with JSON output
  aiwg-validate-metadata --ci --format json --strict .claude/agents

  # Validate with auto-fix
  aiwg-validate-metadata --fix manifest.md
`);
}

/**
 * Check if path is a file or directory
 */
async function getPathType(targetPath) {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isFile() ? 'file' : 'directory';
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Path not found: ${targetPath}`);
    }
    throw error;
  }
}

/**
 * Format file path for display
 */
function formatPath(filePath, basePath) {
  return path.relative(basePath || process.cwd(), filePath);
}

/**
 * Display progress indicator
 */
function showProgress(current, total, message) {
  if (config.ci || config.format === 'json') {
    return; // No progress in CI or JSON mode
  }

  const percentage = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));

  process.stdout.write(`\r[${bar}] ${percentage}% ${message}`);

  if (current === total) {
    process.stdout.write('\n');
  }
}

/**
 * Display colorized text output
 */
function displayTextReport(results, targetPath) {
  if (config.format === 'json') {
    return; // Skip text output in JSON mode
  }

  console.log(chalk.bold('\n' + '='.repeat(70)));
  console.log(chalk.bold.cyan('Plugin Metadata Validation Report'));
  console.log(chalk.bold('='.repeat(70)));
  console.log();

  // Summary
  const total = results.size;
  const passed = Array.from(results.values()).filter(r => r.valid).length;
  const failed = total - passed;
  const totalErrors = Array.from(results.values()).reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = Array.from(results.values()).reduce((sum, r) => sum + r.warnings.length, 0);

  console.log(chalk.bold('Summary:'));
  console.log(`  Total Manifests:  ${total}`);
  console.log(`  ${chalk.green('Passed:')}          ${passed}`);
  console.log(`  ${chalk.red('Failed:')}          ${failed}`);
  console.log(`  ${chalk.red('Total Errors:')}    ${totalErrors}`);
  console.log(`  ${chalk.yellow('Total Warnings:')}  ${totalWarnings}`);
  console.log();

  // Individual results
  console.log(chalk.bold('Results:'));
  console.log(chalk.gray('-'.repeat(70)));

  for (const [filePath, result] of results) {
    const status = result.valid
      ? chalk.green('✓ PASS')
      : chalk.red('✗ FAIL');

    const displayPath = formatPath(filePath, targetPath);
    console.log(`\n${status} ${chalk.cyan(displayPath)}`);

    if (result.manifest) {
      console.log(chalk.gray(`  Name:    ${result.manifest.name}`));
      console.log(chalk.gray(`  Version: ${result.manifest.version}`));
      console.log(chalk.gray(`  Type:    ${result.manifest.type}`));
    }

    if (result.errors.length > 0) {
      console.log(chalk.red('  Errors:'));
      for (const error of result.errors) {
        const location = error.field ? chalk.gray(`[${error.field}]`) : '';
        const line = error.line ? chalk.gray(`:${error.line}`) : '';
        console.log(`    ${chalk.red('✗')} ${location}${line} ${error.message}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow('  Warnings:'));
      for (const warning of result.warnings) {
        const location = warning.field ? chalk.gray(`[${warning.field}]`) : '';
        console.log(`    ${chalk.yellow('⚠')} ${location} ${warning.message}`);
      }
    }
  }

  console.log();
  console.log(chalk.bold('='.repeat(70)));

  // Final status
  if (failed === 0) {
    console.log(chalk.green.bold(`\n✓ All ${total} manifest(s) passed validation`));
  } else {
    console.log(chalk.red.bold(`\n✗ ${failed} manifest(s) failed validation`));
  }

  if (totalWarnings > 0 && config.strict) {
    console.log(chalk.yellow.bold(`⚠ ${totalWarnings} warning(s) treated as errors (strict mode)`));
  }

  console.log();
}

/**
 * Main execution function
 */
async function main() {
  try {
    parseArgs();

    const targetPath = path.resolve(config.path);
    const pathType = await getPathType(targetPath);

    if (!config.ci && config.format === 'text') {
      console.log(chalk.cyan('\nValidating plugin metadata...\n'));
    }

    // Create validator with options
    const validator = new MetadataValidator({
      checkFileReferences: true,
      strict: config.strict,
      autoFix: config.fix
    });

    let results;

    if (pathType === 'file') {
      // Validate single file
      if (!config.ci && config.format === 'text') {
        console.log(chalk.gray(`Validating: ${formatPath(targetPath)}`));
      }

      const result = await validator.validateFile(targetPath);
      results = new Map([[targetPath, result]]);
    } else {
      // Validate directory
      if (!config.ci && config.format === 'text') {
        const mode = config.recursive ? 'recursively' : 'non-recursively';
        console.log(chalk.gray(`Scanning directory ${mode}: ${formatPath(targetPath)}`));
      }

      results = await validator.validateDirectory(targetPath, config.recursive);

      if (!config.ci && config.format === 'text') {
        console.log(chalk.gray(`Found ${results.size} manifest(s)\n`));
      }
    }

    // Generate and display report
    if (config.format === 'json') {
      const report = validator.generateReport(results, 'json');
      console.log(report);
    } else {
      displayTextReport(results, targetPath);
    }

    // Determine exit code
    const hasFailures = Array.from(results.values()).some(r => !r.valid);
    const exitCode = (config.ci && hasFailures) ? 1 : 0;

    process.exit(exitCode);

  } catch (error) {
    if (config.format === 'json') {
      console.error(JSON.stringify({
        error: error.message,
        stack: error.stack
      }, null, 2));
    } else {
      console.error(chalk.red('\nError:'), error.message);
      if (!config.ci) {
        console.error(chalk.gray(error.stack));
      }
    }
    process.exit(1);
  }
}

// Run main function
main();
