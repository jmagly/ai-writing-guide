#!/usr/bin/env node

/**
 * Agent Deployment CLI
 *
 * Command-line interface for deploying AI Writing Guide agents to various platforms.
 *
 * Usage:
 *   aiwg-deploy-agents [options]
 *
 * Examples:
 *   aiwg-deploy-agents --platform claude
 *   aiwg-deploy-agents --platform all --category writing-quality
 *   aiwg-deploy-agents --agents writing-validator,prompt-optimizer
 *   aiwg-deploy-agents --dry-run --verbose
 *   aiwg-deploy-agents --rollback .agents-backup-2025-10-24
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AgentDeployer } from '../../dist/agents/agent-deployer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('aiwg-deploy-agents')
  .description('Deploy AI Writing Guide agents to target platforms')
  .version('1.0.0');

program
  .option('--platform <type>', 'Target platform: claude|cursor|codex|generic|all', 'claude')
  .option('--project <path>', 'Project directory path', process.cwd())
  .option('--category <categories>', 'Deploy only agents from specific categories (comma-separated)')
  .option('--agents <names>', 'Deploy specific agents by name (comma-separated)')
  .option('--dry-run', 'Show what would be deployed without actually deploying', false)
  .option('--force', 'Overwrite existing agents', false)
  .option('--backup', 'Create backup before deployment', false)
  .option('--rollback <path>', 'Rollback to a previous backup')
  .option('--verbose', 'Show detailed output', false);

program.parse(process.argv);

const options = program.opts();

/**
 * Main deployment function
 */
async function main() {
  const deployer = new AgentDeployer();

  // Handle rollback
  if (options.rollback) {
    await handleRollback(deployer, options);
    return;
  }

  // Determine platforms
  const platforms = options.platform === 'all'
    ? ['claude', 'cursor', 'codex', 'generic']
    : [options.platform];

  // Validate platforms
  const validPlatforms = ['claude', 'cursor', 'codex', 'generic'];
  for (const platform of platforms) {
    if (!validPlatforms.includes(platform)) {
      console.error(chalk.red(`✗ Invalid platform: ${platform}`));
      console.log(chalk.gray(`  Valid platforms: ${validPlatforms.join(', ')}`));
      process.exit(1);
    }
  }

  // Parse filter options
  const deploymentOptions = {
    categories: options.category ? options.category.split(',').map((c) => c.trim()) : undefined,
    agentNames: options.agents ? options.agents.split(',').map((a) => a.trim()) : undefined,
    dryRun: options.dryRun,
    force: options.force,
    backup: options.backup,
    verbose: options.verbose,
  };

  // Show deployment summary
  console.log(chalk.bold('\n📦 Agent Deployment'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.cyan('Project:'), options.project);
  console.log(chalk.cyan('Platforms:'), platforms.join(', '));

  if (deploymentOptions.categories) {
    console.log(chalk.cyan('Categories:'), deploymentOptions.categories.join(', '));
  }
  if (deploymentOptions.agentNames) {
    console.log(chalk.cyan('Agents:'), deploymentOptions.agentNames.join(', '));
  }

  console.log(chalk.cyan('Mode:'), options.dryRun ? chalk.yellow('DRY RUN') : 'Live');
  console.log(chalk.cyan('Force:'), options.force ? 'Yes' : 'No');
  console.log(chalk.cyan('Backup:'), options.backup ? 'Yes' : 'No');
  console.log(chalk.gray('─'.repeat(60)));
  console.log();

  // Deploy to each platform
  const allResults = [];

  for (const platform of platforms) {
    const spinner = ora(`Deploying to ${platform}...`).start();

    try {
      const target = {
        platform,
        projectPath: options.project,
      };

      const result = await deployer.deploy(target, deploymentOptions);
      allResults.push({ platform, result });

      spinner.succeed(`${platform} deployment complete`);

      // Show results
      displayResults(result, options.verbose);
    } catch (error) {
      spinner.fail(`${platform} deployment failed`);
      console.error(chalk.red(`  Error: ${error.message}`));
      if (options.verbose && error.stack) {
        console.error(chalk.gray(error.stack));
      }
    }
  }

  // Summary
  displaySummary(allResults);

  // Exit with error if any deployment failed
  const hasFailures = allResults.some((r) => r.result.failedCount > 0);
  if (hasFailures && !options.dryRun) {
    process.exit(1);
  }
}

/**
 * Display results for a single deployment
 */
function displayResults(result, verbose) {
  console.log();

  if (result.deployedCount > 0) {
    console.log(chalk.green(`✓ Deployed: ${result.deployedCount} agents`));
    if (verbose) {
      for (const deployed of result.deployed) {
        console.log(chalk.gray(`  • ${deployed.agent.metadata.name} → ${deployed.targetPath}`));
      }
    }
  }

  if (result.skippedCount > 0) {
    console.log(chalk.yellow(`⊘ Skipped: ${result.skippedCount} agents`));
    if (verbose) {
      for (const skipped of result.skipped) {
        console.log(chalk.gray(`  • ${skipped.metadata.name} (already exists)`));
      }
    }
  }

  if (result.failedCount > 0) {
    console.log(chalk.red(`✗ Failed: ${result.failedCount} agents`));
    for (const failed of result.failed) {
      console.log(chalk.red(`  • ${failed.agent.metadata.name}: ${failed.error}`));
    }
  }

  if (result.backupPath) {
    console.log(chalk.cyan(`💾 Backup: ${result.backupPath}`));
  }
}

/**
 * Display summary across all platforms
 */
function displaySummary(allResults) {
  if (allResults.length === 0) {
    return;
  }

  console.log();
  console.log(chalk.bold('📊 Deployment Summary'));
  console.log(chalk.gray('─'.repeat(60)));

  let totalDeployed = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const { platform, result } of allResults) {
    totalDeployed += result.deployedCount;
    totalSkipped += result.skippedCount;
    totalFailed += result.failedCount;

    const status =
      result.failedCount > 0
        ? chalk.red('FAILED')
        : result.deployedCount > 0
        ? chalk.green('SUCCESS')
        : chalk.yellow('NO CHANGES');

    console.log(
      `${chalk.cyan(platform.padEnd(10))} ${status.padEnd(20)} ` +
      `${chalk.green(`${result.deployedCount} deployed`)} ` +
      `${chalk.yellow(`${result.skippedCount} skipped`)} ` +
      `${result.failedCount > 0 ? chalk.red(`${result.failedCount} failed`) : ''}`
    );
  }

  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.bold('Total:'));
  console.log(`  ${chalk.green(`✓ ${totalDeployed} deployed`)}`);
  console.log(`  ${chalk.yellow(`⊘ ${totalSkipped} skipped`)}`);
  if (totalFailed > 0) {
    console.log(`  ${chalk.red(`✗ ${totalFailed} failed`)}`);
  }
  console.log();
}

/**
 * Handle rollback operation
 */
async function handleRollback(deployer, options) {
  console.log(chalk.bold('\n🔄 Rolling back agents'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.cyan('Backup:'), options.rollback);
  console.log(chalk.cyan('Project:'), options.project);
  console.log(chalk.gray('─'.repeat(60)));
  console.log();

  const spinner = ora('Rolling back...').start();

  try {
    const target = {
      platform: options.platform,
      projectPath: options.project,
    };

    await deployer.rollback(options.rollback, target);
    spinner.succeed('Rollback complete');
    console.log(chalk.green('\n✓ Agents restored from backup'));
  } catch (error) {
    spinner.fail('Rollback failed');
    console.error(chalk.red(`\n✗ Error: ${error.message}`));
    if (options.verbose && error.stack) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

/**
 * Error handler
 */
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n✗ Unexpected error:'));
  console.error(error);
  process.exit(1);
});

// Run
main().catch((error) => {
  console.error(chalk.red('\n✗ Deployment failed:'));
  console.error(error);
  process.exit(1);
});
