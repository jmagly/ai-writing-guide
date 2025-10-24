#!/usr/bin/env node

/**
 * AIWG CLI Tool
 *
 * Unified CLI for AI Writing Guide validation and optimization workflows.
 * Supports validate, optimize, workflow, watch, and git hook management.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Listr } from 'listr2';
import { resolve } from 'path';
import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';

// Import our modules (ESM-compatible paths)
import { WorkflowOrchestrator } from '../../src/cli/workflow-orchestrator.js';
import { ConfigLoader } from '../../src/cli/config-loader.js';
import { GitHookInstaller } from '../../src/cli/git-hooks.js';

const program = new Command();

// Version and description
program
  .name('aiwg')
  .description('AI Writing Guide CLI - Validate and optimize content quality')
  .version('1.0.0');

// Global options
program
  .option('-c, --config <path>', 'Path to .aiwgrc.json config file')
  .option('-v, --verbose', 'Verbose output')
  .option('--no-color', 'Disable colored output');

/**
 * Validate command
 */
program
  .command('validate')
  .description('Validate writing quality')
  .argument('<files...>', 'Files or directories to validate')
  .option('--threshold <number>', 'Minimum validation score (0-100)', '70')
  .option('--context <type>', 'Validation context (academic|technical|executive|casual)')
  .option('--format <type>', 'Output format (text|json|html|junit)', 'text')
  .option('--output <path>', 'Output file path')
  .action(async (files, options, command) => {
    const globalOpts = command.parent.opts();

    try {
      const spinner = ora('Initializing...').start();

      const orchestrator = new WorkflowOrchestrator();
      const configLoader = new ConfigLoader();

      // Load config
      let config = await configLoader.load(globalOpts.config);

      // Override with command options
      if (options.threshold) {
        config.validation.threshold = parseInt(options.threshold, 10);
      }
      if (options.context) {
        config.validation.context = options.context;
      }
      if (options.format) {
        config.output.format = options.format;
      }
      config.optimization.enabled = false; // Validate only

      // Expand globs
      spinner.text = 'Finding files...';
      const expandedFiles = await orchestrator.expandGlob(files);

      if (expandedFiles.length === 0) {
        spinner.fail('No files found');
        process.exit(1);
      }

      spinner.succeed(`Found ${expandedFiles.length} file(s)`);

      // Process files
      const results = await orchestrator.processBatch(
        expandedFiles,
        config,
        (progress) => {
          console.log(
            chalk.blue(
              `Progress: ${progress.processed}/${progress.total} (${progress.passed} passed, ${progress.failed} failed)`
            )
          );
        }
      );

      // Generate report
      const report = orchestrator.generateReport(results, config.output.format);

      if (options.output) {
        await orchestrator.saveReport(report, options.output);
        console.log(chalk.green(`Report saved to ${options.output}`));
      } else {
        console.log(report);
      }

      // Exit with error if any failed
      let failed = 0;
      results.forEach((result) => {
        if (result.error || result.validation.before.score < config.validation.threshold) {
          failed++;
        }
      });

      if (failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Optimize command
 */
program
  .command('optimize')
  .description('Optimize prompt or content')
  .argument('<file>', 'File to optimize')
  .option('--voice <type>', 'Voice guidance (academic|technical|executive)')
  .option('--strategies <list>', 'Comma-separated optimization strategies', 'specificity,examples,constraints,anti_pattern')
  .option('--apply', 'Apply optimization to file (creates .original backup)')
  .action(async (file, options, command) => {
    const globalOpts = command.parent.opts();

    try {
      if (!existsSync(file)) {
        console.error(chalk.red(`File not found: ${file}`));
        process.exit(1);
      }

      const spinner = ora('Optimizing...').start();

      const orchestrator = new WorkflowOrchestrator();
      const configLoader = new ConfigLoader();

      let config = await configLoader.load(globalOpts.config);

      // Override with command options
      config.validation.enabled = false; // Optimize only
      config.optimization.enabled = true;
      config.optimization.autoApply = options.apply || false;

      if (options.voice) {
        config.validation.context = options.voice;
      }

      if (options.strategies) {
        config.optimization.strategies = options.strategies.split(',');
      }

      const result = await orchestrator.processFile(file, config);

      spinner.succeed('Optimization complete');

      if (result.optimization) {
        console.log(chalk.bold('\nOptimization Results:'));
        console.log(chalk.gray('─'.repeat(60)));
        console.log(
          chalk.blue('Score:'),
          `${result.optimization.score.before}/100 → ${result.optimization.score.after}/100`,
          chalk.green(`(+${result.optimization.score.delta})`)
        );
        console.log(
          chalk.blue('Improvements:'),
          result.optimization.improvements.length
        );

        console.log(chalk.bold('\nImprovements:'));
        result.optimization.improvements.forEach((imp, i) => {
          console.log(
            chalk.yellow(`${i + 1}.`),
            imp.description,
            chalk.gray(`[${imp.impact}]`)
          );
        });

        if (options.apply) {
          console.log(
            chalk.green(`\nOptimized content written to ${file}`)
          );
          console.log(chalk.gray(`Original saved as ${file}.original`));
        } else {
          console.log(
            chalk.yellow('\nTo apply optimization, run with --apply flag')
          );
        }
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Workflow command (validate → optimize → revalidate)
 */
program
  .command('workflow')
  .description('Run full validate → optimize → revalidate workflow')
  .argument('<files...>', 'Files or directories to process')
  .option('--auto-fix', 'Automatically apply optimizations')
  .option('--threshold <number>', 'Minimum validation score', '70')
  .option('--format <type>', 'Output format (text|json|html|junit)', 'text')
  .option('--output <path>', 'Output file path')
  .action(async (files, options, command) => {
    const globalOpts = command.parent.opts();

    try {
      const orchestrator = new WorkflowOrchestrator();
      const configLoader = new ConfigLoader();

      let config = await configLoader.load(globalOpts.config);

      // Override with command options
      if (options.threshold) {
        config.validation.threshold = parseInt(options.threshold, 10);
      }
      if (options.format) {
        config.output.format = options.format;
      }
      config.optimization.autoApply = options.autoFix || false;

      // Expand globs
      const spinner = ora('Finding files...').start();
      const expandedFiles = await orchestrator.expandGlob(files);

      if (expandedFiles.length === 0) {
        spinner.fail('No files found');
        process.exit(1);
      }

      spinner.succeed(`Found ${expandedFiles.length} file(s)`);

      // Process with progress
      const tasks = new Listr([
        {
          title: 'Processing files',
          task: async (ctx, task) => {
            const results = await orchestrator.processBatch(
              expandedFiles,
              config,
              (progress) => {
                task.output = `${progress.processed}/${progress.total} (${progress.passed} passed, ${progress.failed} failed)`;
              }
            );
            ctx.results = results;
          }
        },
        {
          title: 'Generating report',
          task: (ctx) => {
            ctx.report = orchestrator.generateReport(ctx.results, config.output.format);
          }
        }
      ]);

      const context = await tasks.run();

      if (options.output) {
        await orchestrator.saveReport(context.report, options.output);
        console.log(chalk.green(`\nReport saved to ${options.output}`));
      } else {
        console.log('\n' + context.report);
      }

      // Exit with error if any failed
      let failed = 0;
      context.results.forEach((result) => {
        const finalScore =
          result.validation.after?.score || result.validation.before.score;
        if (result.error || finalScore < config.validation.threshold) {
          failed++;
        }
      });

      if (failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Watch command
 */
program
  .command('watch')
  .description('Watch files and auto-process changes')
  .argument('[patterns...]', 'Glob patterns to watch (default: **/*.md, **/*.txt)')
  .option('--auto-fix', 'Automatically apply optimizations')
  .option('--debounce <ms>', 'Debounce time in milliseconds', '500')
  .action(async (patterns, options, command) => {
    const globalOpts = command.parent.opts();

    try {
      const orchestrator = new WorkflowOrchestrator();
      const configLoader = new ConfigLoader();

      let config = await configLoader.load(globalOpts.config);

      // Override with command options
      config.watch.enabled = true;
      if (patterns && patterns.length > 0) {
        config.watch.patterns = patterns;
      }
      if (options.debounce) {
        config.watch.debounce = parseInt(options.debounce, 10);
      }
      config.optimization.autoApply = options.autoFix || false;

      console.log(chalk.blue('Starting watch mode...'));
      console.log(chalk.gray(`Patterns: ${config.watch.patterns.join(', ')}`));
      console.log(
        chalk.gray(
          `Auto-fix: ${config.optimization.autoApply ? 'enabled' : 'disabled'}`
        )
      );
      console.log(chalk.gray('Press Ctrl+C to stop\n'));

      await orchestrator.startWatchMode(config);

      // Keep process alive
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\nStopping watch mode...'));
        await orchestrator.stopWatchMode();
        process.exit(0);
      });
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Init command (create .aiwgrc.json)
 */
program
  .command('init')
  .description('Create .aiwgrc.json config file')
  .option('-f, --force', 'Overwrite existing config')
  .action(async (options) => {
    try {
      const configPath = resolve(process.cwd(), '.aiwgrc.json');

      if (existsSync(configPath) && !options.force) {
        console.error(
          chalk.red('Config file already exists. Use --force to overwrite.')
        );
        process.exit(1);
      }

      const configLoader = new ConfigLoader();
      const exampleConfig = configLoader.generateExample();

      await writeFile(configPath, exampleConfig, 'utf-8');

      console.log(chalk.green('Created .aiwgrc.json'));
      console.log(chalk.gray('Edit the file to customize settings'));
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

/**
 * Install hooks command
 */
program
  .command('install-hooks')
  .description('Install git pre-commit hooks')
  .option('--pre-commit', 'Install pre-commit hook', true)
  .option('--pre-push', 'Install pre-push hook', false)
  .option('-f, --force', 'Overwrite existing hooks')
  .option('-a, --append', 'Append to existing hooks')
  .action(async (options, command) => {
    const globalOpts = command.parent.opts();

    try {
      const installer = new GitHookInstaller(process.cwd());

      if (!installer.isGitRepository()) {
        console.error(chalk.red('Not a git repository'));
        process.exit(1);
      }

      const tasks = [];

      if (options.preCommit) {
        tasks.push({
          title: 'Installing pre-commit hook',
          task: async () => {
            await installer.installPreCommitHook({
              force: options.force,
              append: options.append,
              configPath: globalOpts.config
            });
          }
        });
      }

      if (options.prePush) {
        tasks.push({
          title: 'Installing pre-push hook',
          task: async () => {
            await installer.installPrePushHook({
              force: options.force,
              append: options.append,
              configPath: globalOpts.config
            });
          }
        });
      }

      const taskRunner = new Listr(tasks);
      await taskRunner.run();

      console.log(chalk.green('\nGit hooks installed successfully'));
      console.log(
        chalk.gray(
          'AIWG validation will run automatically on commit/push'
        )
      );
      console.log(
        chalk.gray('To bypass: git commit --no-verify')
      );
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (globalOpts.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
