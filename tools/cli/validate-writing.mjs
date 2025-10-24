#!/usr/bin/env node

/**
 * CLI Tool for Writing Validation
 *
 * Usage: aiwg-validate-writing [options] <file|directory>
 */

import { readdir, stat } from 'fs/promises';
import { join, extname, resolve } from 'path';
import { existsSync } from 'fs';

// Note: In production, import from compiled dist/
// For development, you may need to compile TypeScript first
const enginePath = process.env.NODE_ENV === 'production'
  ? '../../../dist/writing/validation-engine.js'
  : '../../src/writing/validation-engine.js';

let WritingValidationEngine;
try {
  const module = await import(enginePath);
  WritingValidationEngine = module.WritingValidationEngine;
} catch (error) {
  console.error('Error: Could not load validation engine. Run `npm run build` first.');
  process.exit(1);
}

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function colorize(text, color) {
  if (process.env.NO_COLOR || !process.stdout.isTTY) {
    return text;
  }
  return `${colors[color]}${text}${colors.reset}`;
}

function printHelp() {
  console.log(`
${colorize('Usage:', 'bright')} aiwg-validate-writing [options] <file|directory>

${colorize('Options:', 'bright')}
  --context <type>     Validation context: academic|technical|executive|casual
  --format <type>      Output format: text|json|html (default: text)
  --threshold <num>    Minimum score to pass (default: 70)
  --recursive          Validate all markdown files in directory
  --fix                Auto-fix common issues (experimental, not yet implemented)
  --ci                 CI mode: exit code 1 on failure
  -h, --help           Show help

${colorize('Examples:', 'bright')}
  # Validate single file
  aiwg-validate-writing document.md

  # Validate with technical context
  aiwg-validate-writing --context technical api-docs.md

  # Validate directory recursively
  aiwg-validate-writing --recursive docs/

  # CI mode with custom threshold
  aiwg-validate-writing --ci --threshold 80 README.md

  # Generate HTML report
  aiwg-validate-writing --format html document.md > report.html
`);
}

function parseArgs(args) {
  const options = {
    context: null,
    format: 'text',
    threshold: 70,
    recursive: false,
    fix: false,
    ci: false,
    help: false,
    target: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--context':
        options.context = args[++i];
        if (!['academic', 'technical', 'executive', 'casual'].includes(options.context)) {
          throw new Error(`Invalid context: ${options.context}`);
        }
        break;
      case '--format':
        options.format = args[++i];
        if (!['text', 'json', 'html'].includes(options.format)) {
          throw new Error(`Invalid format: ${options.format}`);
        }
        break;
      case '--threshold':
        options.threshold = parseInt(args[++i], 10);
        if (isNaN(options.threshold) || options.threshold < 0 || options.threshold > 100) {
          throw new Error(`Invalid threshold: ${args[i]}`);
        }
        break;
      case '--recursive':
        options.recursive = true;
        break;
      case '--fix':
        options.fix = true;
        break;
      case '--ci':
        options.ci = true;
        break;
      default:
        if (!arg.startsWith('-')) {
          options.target = arg;
        } else {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }

  return options;
}

async function findMarkdownFiles(dir, recursive = false) {
  const files = [];

  async function scan(currentDir) {
    const entries = await readdir(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        if (recursive && !entry.startsWith('.') && entry !== 'node_modules') {
          await scan(fullPath);
        }
      } else if (stats.isFile()) {
        if (['.md', '.markdown'].includes(extname(entry).toLowerCase())) {
          files.push(fullPath);
        }
      }
    }
  }

  await scan(dir);
  return files;
}

function printProgressBar(current, total, prefix = '') {
  const width = 40;
  const percentage = Math.min(100, (current / total) * 100);
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const text = `${prefix} [${bar}] ${current}/${total} (${percentage.toFixed(0)}%)`;

  if (process.stdout.isTTY) {
    process.stdout.write(`\r${text}`);
    if (current === total) {
      process.stdout.write('\n');
    }
  }
}

function printTextResult(result, filePath, options) {
  const scoreColor = result.score >= options.threshold ? 'green' :
                     result.score >= 50 ? 'yellow' : 'red';

  console.log('');
  console.log(colorize('='.repeat(80), 'gray'));
  console.log(colorize(`File: ${filePath}`, 'bright'));
  console.log(colorize('='.repeat(80), 'gray'));
  console.log('');

  console.log(`${colorize('Overall Score:', 'bright')} ${colorize(result.score.toFixed(1), scoreColor)}/100`);
  console.log(`${colorize('Authenticity:', 'cyan')} ${result.summary.authenticityScore.toFixed(1)}/100`);
  console.log(`${colorize('AI Pattern Score:', 'cyan')} ${result.summary.aiPatternScore.toFixed(1)}/100 ${colorize('(lower is better)', 'gray')}`);
  console.log('');

  console.log(`${colorize('Issues:', 'bright')} ${result.summary.totalIssues}`);
  console.log(`  ${colorize('●', 'red')} Critical: ${result.summary.criticalCount}`);
  console.log(`  ${colorize('●', 'yellow')} Warnings: ${result.summary.warningCount}`);
  console.log(`  ${colorize('●', 'blue')} Info: ${result.summary.infoCount}`);
  console.log('');

  console.log(`${colorize('Content:', 'bright')} ${result.summary.wordCount} words, ${result.summary.sentenceCount} sentences`);

  if (result.issues.length > 0) {
    console.log('');
    console.log(colorize('Issues Found:', 'bright'));

    const maxDisplay = 20;
    const issuesToShow = result.issues.slice(0, maxDisplay);

    for (const issue of issuesToShow) {
      const severityColor = issue.severity === 'critical' ? 'red' :
                           issue.severity === 'warning' ? 'yellow' : 'blue';

      console.log('');
      console.log(`${colorize('●', severityColor)} ${colorize(`Line ${issue.location.line}:`, 'cyan')} ${issue.message}`);

      if (issue.context) {
        console.log(`  ${colorize('Context:', 'gray')} ...${issue.context}...`);
      }

      if (issue.suggestion) {
        console.log(`  ${colorize('→', 'green')} ${issue.suggestion}`);
      }
    }

    if (result.issues.length > maxDisplay) {
      console.log('');
      console.log(colorize(`... and ${result.issues.length - maxDisplay} more issues`, 'gray'));
    }
  }

  if (result.suggestions.length > 0) {
    console.log('');
    console.log(colorize('Suggestions:', 'bright'));
    result.suggestions.forEach((suggestion, i) => {
      console.log(`  ${i + 1}. ${suggestion}`);
    });
  }

  if (result.humanMarkers.length > 0) {
    console.log('');
    console.log(colorize('Human Markers Found:', 'green'));
    result.humanMarkers.forEach(marker => {
      console.log(`  ${colorize('✓', 'green')} ${marker}`);
    });
  }

  if (result.aiTells.length > 0) {
    console.log('');
    console.log(colorize('AI Tells Found:', 'red'));
    result.aiTells.forEach(tell => {
      console.log(`  ${colorize('✗', 'red')} ${tell}`);
    });
  }

  console.log('');
}

function printBatchSummary(results, options) {
  console.log('');
  console.log(colorize('='.repeat(80), 'gray'));
  console.log(colorize('Batch Validation Summary', 'bright'));
  console.log(colorize('='.repeat(80), 'gray'));
  console.log('');

  let totalScore = 0;
  let passed = 0;
  let failed = 0;
  const fileResults = [];

  results.forEach((result, file) => {
    totalScore += result.score;
    if (result.score >= options.threshold) {
      passed++;
    } else {
      failed++;
    }
    fileResults.push({ file, result });
  });

  const avgScore = results.size > 0 ? totalScore / results.size : 0;
  const avgColor = avgScore >= options.threshold ? 'green' :
                   avgScore >= 50 ? 'yellow' : 'red';

  console.log(`${colorize('Total Files:', 'bright')} ${results.size}`);
  console.log(`${colorize('Average Score:', 'bright')} ${colorize(avgScore.toFixed(1), avgColor)}/100`);
  console.log(`${colorize('Passed:', 'green')} ${passed} (>= ${options.threshold})`);
  console.log(`${colorize('Failed:', 'red')} ${failed} (< ${options.threshold})`);
  console.log('');

  console.log(colorize('File Results:', 'bright'));
  fileResults
    .sort((a, b) => a.result.score - b.result.score) // Sort by score (worst first)
    .forEach(({ file, result }) => {
      const status = result.score >= options.threshold ?
        colorize('PASS', 'green') : colorize('FAIL', 'red');

      const scoreColor = result.score >= options.threshold ? 'green' :
                        result.score >= 50 ? 'yellow' : 'red';

      console.log(`  [${status}] ${colorize(result.score.toFixed(1), scoreColor)}/100 - ${file}`);

      if (result.summary.criticalCount > 0) {
        console.log(`        ${colorize(`${result.summary.criticalCount} critical issue(s)`, 'red')}`);
      }
    });

  console.log('');
}

async function main() {
  const args = process.argv.slice(2);

  try {
    const options = parseArgs(args);

    if (options.help || !options.target) {
      printHelp();
      process.exit(0);
    }

    const targetPath = resolve(options.target);

    if (!existsSync(targetPath)) {
      console.error(colorize(`Error: Path not found: ${targetPath}`, 'red'));
      process.exit(1);
    }

    const engine = new WritingValidationEngine();
    await engine.initialize();

    const stats = await stat(targetPath);
    let filesToValidate = [];

    if (stats.isDirectory()) {
      if (!options.recursive) {
        console.error(colorize('Error: Target is a directory. Use --recursive to validate all files.', 'red'));
        process.exit(1);
      }

      console.log(colorize(`Scanning directory: ${targetPath}`, 'cyan'));
      filesToValidate = await findMarkdownFiles(targetPath, options.recursive);

      if (filesToValidate.length === 0) {
        console.log(colorize('No markdown files found.', 'yellow'));
        process.exit(0);
      }

      console.log(colorize(`Found ${filesToValidate.length} markdown file(s)`, 'cyan'));
    } else {
      filesToValidate = [targetPath];
    }

    // Validate files
    if (filesToValidate.length === 1) {
      // Single file - detailed output
      const result = options.context
        ? await engine.validateForContext(await (await import('fs/promises')).readFile(filesToValidate[0], 'utf-8'), options.context)
        : await engine.validateFile(filesToValidate[0], options.context);

      if (options.format === 'json') {
        console.log(engine.generateReport(result, 'json'));
      } else if (options.format === 'html') {
        console.log(engine.generateReport(result, 'html'));
      } else {
        printTextResult(result, filesToValidate[0], options);
      }

      if (options.ci && result.score < options.threshold) {
        process.exit(1);
      }
    } else {
      // Multiple files - batch processing
      console.log('');
      console.log(colorize('Validating files...', 'cyan'));

      const results = new Map();
      let completed = 0;

      for (const file of filesToValidate) {
        const result = await engine.validateFile(file, options.context);
        results.set(file, result);
        completed++;

        if (process.stdout.isTTY) {
          printProgressBar(completed, filesToValidate.length, 'Progress:');
        }
      }

      if (options.format === 'json') {
        console.log(engine.generateReport(results, 'json'));
      } else if (options.format === 'html') {
        console.log('<html><body><h1>Batch results not supported in HTML format yet</h1></body></html>');
      } else {
        printBatchSummary(results, options);
      }

      if (options.ci) {
        const failedCount = Array.from(results.values()).filter(r => r.score < options.threshold).length;
        if (failedCount > 0) {
          console.error(colorize(`CI Mode: ${failedCount} file(s) failed validation`, 'red'));
          process.exit(1);
        }
      }
    }

  } catch (error) {
    console.error(colorize(`Error: ${error.message}`, 'red'));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
