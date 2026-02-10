#!/usr/bin/env node

/**
 * @fileoverview Metadata Injection Script
 *
 * Automatically adds `framework: sdlc-complete` metadata to all command and agent
 * markdown files. Handles YAML frontmatter injection, preservation of existing
 * frontmatter, and validation of YAML syntax.
 *
 * Handles malformed YAML by reconstructing frontmatter line-by-line while
 * properly quoting values that contain special YAML characters.
 *
 * @usage
 * ```bash
 * # Preview changes without writing
 * node tools/workspace/inject-metadata.mjs --dry-run
 *
 * # Execute and write changes
 * node tools/workspace/inject-metadata.mjs --write
 *
 * # Target specific directory
 * node tools/workspace/inject-metadata.mjs --target .claude/commands --write
 *
 * # Use custom framework name
 * node tools/workspace/inject-metadata.mjs --framework my-framework --write
 * ```
 *
 * @author AIWG
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import yaml from 'yaml';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse command-line arguments
 * @returns {Object} Parsed configuration
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    dryRun: true, // Default to dry-run for safety
    write: false,
    target: null, // null = both commands and agents
    framework: 'sdlc-complete',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--dry-run':
        config.dryRun = true;
        config.write = false;
        break;
      case '--write':
        config.dryRun = false;
        config.write = true;
        break;
      case '--target':
        config.target = args[++i];
        break;
      case '--framework':
        config.framework = args[++i];
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return config;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Metadata Injection Script - Add framework metadata to agents and commands

USAGE:
  node tools/workspace/inject-metadata.mjs [OPTIONS]

OPTIONS:
  --dry-run          Preview changes without writing (default)
  --write            Execute and write changes to files
  --target <path>    Target specific directory (default: both .claude/commands and .claude/agents)
  --framework <name> Framework name to inject (default: sdlc-complete)
  --verbose, -v      Enable verbose logging
  --help, -h         Show this help message

EXAMPLES:
  # Preview changes
  node tools/workspace/inject-metadata.mjs --dry-run

  # Execute and write
  node tools/workspace/inject-metadata.mjs --write

  # Target specific directory
  node tools/workspace/inject-metadata.mjs --target .claude/commands --write

  # Use custom framework name
  node tools/workspace/inject-metadata.mjs --framework my-framework --write

OUTPUT:
  - Summary report with counts (updated, skipped, errors)
  - Detailed list of affected files
  - Error details if any
`);
}

/**
 * Check if a value needs quoting in YAML
 * @param {string} value - Value to check
 * @returns {boolean} True if value needs quoting
 */
function needsQuoting(value) {
  if (typeof value !== 'string') return false;

  // Characters that require quoting in YAML
  const specialChars = /[:\[\]{}#&*!|>'"%@`]/;

  // Values starting with special markers
  const startsWithSpecial = /^[-?:,\[\]{}#&*!|>'"%@`]/;

  return specialChars.test(value) || startsWithSpecial.test(value);
}

/**
 * Quote a YAML value if necessary
 * @param {string} value - Value to potentially quote
 * @returns {string} Quoted or original value
 */
function quoteValue(value) {
  if (typeof value !== 'string') return value;

  if (needsQuoting(value)) {
    // Escape internal quotes
    const escaped = value.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  return value;
}

/**
 * Parse YAML frontmatter line-by-line (handles malformed YAML)
 * @param {string} yamlBlock - Raw YAML content
 * @returns {Object} Parsed metadata object
 */
function parseYamlLineByLine(yamlBlock) {
  const metadata = {};
  const lines = yamlBlock.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Match key: value pattern
    const match = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      metadata[key] = value;
    }
  }

  return metadata;
}

/**
 * Rebuild YAML frontmatter from metadata object
 * @param {Object} metadata - Metadata object
 * @returns {string} YAML string
 */
function buildYaml(metadata) {
  const lines = [];

  for (const [key, value] of Object.entries(metadata)) {
    const quotedValue = quoteValue(value);
    lines.push(`${key}: ${quotedValue}`);
  }

  return lines.join('\n');
}

/**
 * Inject framework metadata into markdown content
 *
 * @param {string} content - Original markdown content
 * @param {string} framework - Framework name to inject
 * @returns {string} Modified content with injected metadata
 * @throws {Error} If frontmatter is malformed
 */
function injectFrameworkMetadata(content, framework = 'sdlc-complete') {
  // Check if frontmatter exists
  if (content.startsWith('---\n')) {
    // Parse existing frontmatter
    const endIndex = content.indexOf('\n---\n', 4);
    if (endIndex === -1) {
      throw new Error('Invalid frontmatter: missing closing ---');
    }

    const yamlBlock = content.substring(4, endIndex);
    const bodyContent = content.substring(endIndex + 5);

    // Try standard YAML parsing first
    let metadata;
    try {
      metadata = yaml.parse(yamlBlock);
    } catch (error) {
      // Fall back to line-by-line parsing for malformed YAML
      try {
        metadata = parseYamlLineByLine(yamlBlock);
      } catch (lineError) {
        throw new Error(`YAML parse error: ${error.message}`);
      }
    }

    // Add framework field if missing
    if (!metadata.framework) {
      metadata.framework = framework;
    }

    // Rebuild frontmatter
    const newYaml = buildYaml(metadata);
    return `---\n${newYaml}\n---\n${bodyContent}`;

  } else {
    // No frontmatter, add it
    const metadata = { framework };
    const yamlBlock = buildYaml(metadata);
    return `---\n${yamlBlock}\n---\n\n${content}`;
  }
}

/**
 * Validate frontmatter in content
 *
 * @param {string} content - Content to validate
 * @throws {Error} If validation fails
 */
function validateFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    throw new Error('No frontmatter found');
  }

  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    throw new Error('Invalid frontmatter: missing closing ---');
  }

  const yamlBlock = content.substring(4, endIndex);

  // Try to parse YAML to validate
  let metadata;
  try {
    metadata = yaml.parse(yamlBlock);
  } catch (error) {
    // Try line-by-line parsing
    try {
      metadata = parseYamlLineByLine(yamlBlock);
    } catch (lineError) {
      throw new Error(`YAML validation failed: ${error.message}`);
    }
  }

  // Check framework field exists
  if (!metadata.framework) {
    throw new Error('Framework field missing after injection');
  }

  return true;
}

/**
 * Check if file already has framework field
 *
 * @param {string} content - File content
 * @returns {boolean} True if framework field exists
 */
function hasFrameworkField(content) {
  if (!content.startsWith('---\n')) {
    return false;
  }

  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    return false;
  }

  const yamlBlock = content.substring(4, endIndex);

  try {
    const metadata = yaml.parse(yamlBlock);
    return metadata && typeof metadata.framework !== 'undefined';
  } catch (error) {
    // Try line-by-line parsing
    try {
      const metadata = parseYamlLineByLine(yamlBlock);
      return metadata && typeof metadata.framework !== 'undefined';
    } catch (lineError) {
      return false;
    }
  }
}

/**
 * Process a single file
 *
 * @param {string} filePath - Absolute path to file
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Result object with status
 */
async function processFile(filePath, options = {}) {
  const { dryRun = false, framework = 'sdlc-complete', verbose = false } = options;

  try {
    // Read file
    const content = await fs.readFile(filePath, 'utf8');

    // Check if already has framework field
    if (hasFrameworkField(content)) {
      return {
        filePath,
        status: 'skipped',
        reason: 'already has framework field'
      };
    }

    // Inject metadata
    let newContent;
    try {
      newContent = injectFrameworkMetadata(content, framework);
    } catch (error) {
      return {
        filePath,
        status: 'error',
        reason: error.message
      };
    }

    // Validate YAML
    try {
      validateFrontmatter(newContent);
    } catch (error) {
      return {
        filePath,
        status: 'error',
        reason: `Validation failed: ${error.message}`
      };
    }

    // Write (if not dry-run)
    if (!dryRun) {
      await fs.writeFile(filePath, newContent, 'utf8');
    }

    if (verbose) {
      console.log(`  ✓ ${dryRun ? '(DRY-RUN) ' : ''}${path.basename(filePath)}`);
    }

    return { filePath, status: 'updated', dryRun };

  } catch (error) {
    return {
      filePath,
      status: 'error',
      reason: `File error: ${error.message}`
    };
  }
}

/**
 * Find all markdown files in target directories
 *
 * @param {string|null} target - Target directory or null for default
 * @param {string} repoRoot - Repository root path
 * @returns {Promise<string[]>} Array of absolute file paths
 */
async function findMarkdownFiles(target, repoRoot) {
  const files = [];

  if (target) {
    // Target specific directory
    const targetPath = path.isAbsolute(target) ? target : path.join(repoRoot, target);
    const pattern = path.join(targetPath, '**/*.md');
    const matches = await glob(pattern, { absolute: true });
    files.push(...matches);
  } else {
    // Default: both commands and agents
    const commandsPattern = path.join(repoRoot, '.claude/commands/**/*.md');
    const agentsPattern = path.join(repoRoot, '.claude/agents/**/*.md');

    const commandMatches = await glob(commandsPattern, { absolute: true });
    const agentMatches = await glob(agentsPattern, { absolute: true });

    files.push(...commandMatches, ...agentMatches);
  }

  return files;
}

/**
 * Generate summary report
 *
 * @param {Array<Object>} results - Array of result objects
 * @param {Object} config - Configuration object
 */
function generateReport(results, config) {
  const updated = results.filter(r => r.status === 'updated');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');

  console.log('\n=== Metadata Injection Report ===\n');

  if (config.dryRun) {
    console.log('MODE: DRY-RUN (no files modified)\n');
  } else {
    console.log('MODE: WRITE (files modified)\n');
  }

  console.log(`Framework: ${config.framework}`);
  console.log(`Target: ${config.target || 'commands + agents (default)'}\n`);

  console.log(`Total files processed: ${results.length}`);
  console.log(`✓ Updated: ${updated.length}`);
  console.log(`⊘ Skipped: ${skipped.length}`);
  console.log(`✗ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n--- Errors ---');
    errors.forEach(e => {
      console.log(`  ✗ ${path.basename(e.filePath)}`);
      console.log(`    Reason: ${e.reason}`);
    });
  }

  if (updated.length > 0 && config.verbose) {
    console.log('\n--- Updated Files ---');
    updated.forEach(u => {
      const dryRunLabel = u.dryRun ? ' (DRY-RUN)' : '';
      console.log(`  ✓ ${path.basename(u.filePath)}${dryRunLabel}`);
    });
  } else if (updated.length > 0 && !config.verbose) {
    console.log('\n--- Updated Files (summary) ---');
    console.log(`  ${updated.length} files ${config.dryRun ? 'would be' : 'were'} updated`);
    console.log('  Use --verbose to see full list');
  }

  if (skipped.length > 0 && config.verbose) {
    console.log('\n--- Skipped Files ---');
    skipped.forEach(s => {
      console.log(`  ⊘ ${path.basename(s.filePath)}`);
      console.log(`    Reason: ${s.reason}`);
    });
  }

  if (config.dryRun) {
    console.log('\n💡 Run with --write to apply changes');
  } else {
    console.log('\n✓ Changes applied successfully');
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('Metadata Injection Script\n');

  // Parse arguments
  const config = parseArgs();

  // Determine repository root
  const repoRoot = path.resolve(__dirname, '../..');

  if (config.verbose) {
    console.log('Configuration:');
    console.log(`  Repository root: ${repoRoot}`);
    console.log(`  Dry-run: ${config.dryRun}`);
    console.log(`  Framework: ${config.framework}`);
    console.log(`  Target: ${config.target || 'commands + agents (default)'}\n`);
  }

  // Find markdown files
  console.log('Scanning for markdown files...');
  const files = await findMarkdownFiles(config.target, repoRoot);
  console.log(`Found ${files.length} files to process\n`);

  if (files.length === 0) {
    console.log('No files found. Exiting.');
    return;
  }

  // Process files
  console.log('Processing files...');
  const results = [];

  for (const file of files) {
    const result = await processFile(file, {
      dryRun: config.dryRun,
      framework: config.framework,
      verbose: config.verbose,
    });
    results.push(result);
  }

  // Generate report
  generateReport(results, config);

  // Exit with error code if any errors occurred
  const errorCount = results.filter(r => r.status === 'error').length;
  if (errorCount > 0) {
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('\nFATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
