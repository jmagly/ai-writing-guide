/**
 * Run Command Handler
 *
 * Implements `aiwg run <script>` — executes user-defined scripts from
 * `.aiwg/aiwg.config` `scripts` section.
 *
 * Modelled on `npm run`. With no arguments, lists available scripts.
 *
 * Environment variables available in scripts:
 *   $AIWG_PROJECT   — absolute path to the project root
 *   $AIWG_PROVIDERS — comma-separated list of configured providers
 *
 * @implements #621
 */

import { spawn } from 'child_process';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { readAiwgConfig, getProjectDir } from '../../config/aiwg-config.js';
import { handlerResultFromError } from '../errors.js';
import * as ui from '../ui.js';

/**
 * Execute a shell command with inherited stdio.
 * Returns the exit code.
 */
function runScript(
  command: string,
  env: Record<string, string>,
  cwd: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd' : 'sh';
    const shellFlag = isWindows ? '/c' : '-c';

    const child = spawn(shell, [shellFlag, command], {
      stdio: 'inherit',
      env: { ...process.env, ...env },
      cwd,
    });

    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
}

export const runHandler: CommandHandler = {
  id: 'run',
  name: 'Run Script',
  description: 'Run a user-defined script from aiwg.config',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const scriptName = ctx.args[0];
    const projectDir = getProjectDir(ctx, ctx.args);

    // #1231 — intercept --help/-h before script lookup so the user sees
    // help for both run forms, not "No script named '--help'".
    if (scriptName === '--help' || scriptName === '-h') {
      printRunUsage();
      return { exitCode: 0 };
    }

    // #1227 — `aiwg run skill <name>` dispatches to the script-bearing
    // skill executor in src/skills/run.ts. Routed here so we don't have
    // two handlers competing for `id: "run"` in the dispatch table.
    if (scriptName === 'skill') {
      try {
        const { main } = await import('../../skills/run.js');
        const exitCode = await main(ctx.args);
        return { exitCode };
      } catch (error) {
        const result = handlerResultFromError(error);
        return { ...result, message: `Skill run failed: ${result.message}` };
      }
    }

    const config = await readAiwgConfig(projectDir);

    if (!config) {
      return {
        exitCode: 1,
        message: [
          "Error: No .aiwg/aiwg.config found in this project.",
          '',
          "Run 'aiwg init' to create one and define scripts.",
        ].join('\n'),
      };
    }

    const scripts = config.scripts ?? {};

    // No script name — list available scripts AND mention `run skill <name>`
    // (#1231) so users discover the sibling form.
    if (!scriptName) {
      ui.blank();
      console.log(`  ${ui.brandMark()} ${ui.bold('Available Scripts')}`);
      ui.rule();

      const entries = Object.entries(scripts);
      if (entries.length === 0) {
        ui.dim('  No scripts defined in .aiwg/aiwg.config');
        ui.blank();
        ui.dim('  Add scripts to the "scripts" section, e.g.:');
        ui.dim('    "deploy": "aiwg use all"');
        ui.blank();
      } else {
        const nameWidth = Math.max(...entries.map(([n]) => n.length), 6);
        for (const [name, cmd] of entries) {
          console.log(`  ${name.padEnd(nameWidth)}  ${ui.dimText(cmd)}`);
        }
        ui.blank();
        ui.dim(`  Run with: aiwg run <script-name>`);
        ui.blank();
      }
      ui.dim(`  Or run a script-bearing skill: aiwg run skill <name>`);
      ui.dim(`  See \`aiwg run --help\` for both forms.`);
      ui.blank();
      return { exitCode: 0 };
    }

    // Look up the script
    const command = scripts[scriptName];
    if (!command) {
      const available = Object.keys(scripts);
      const hint = available.length > 0
        ? `\nAvailable: ${available.join(', ')}`
        : '\nNo scripts defined. Run `aiwg init` to add some.';
      return {
        exitCode: 1,
        message: `Error: No script named '${scriptName}'${hint}`,
      };
    }

    // Build environment
    const env: Record<string, string> = {
      AIWG_PROJECT: projectDir,
      AIWG_PROVIDERS: config.providers.join(','),
    };

    ui.blank();
    console.log(`  ${ui.brandMark()} ${ui.bold(`aiwg run ${scriptName}`)}`);
    ui.dim(`  > ${command}`);
    console.log('');

    let exitCode: number;
    try {
      exitCode = await runScript(command, env, projectDir);
    } catch (error) {
      const result = handlerResultFromError(error);
      return { ...result, message: `Error executing script: ${result.message}` };
    }

    if (exitCode !== 0) {
      console.log('');
      ui.warn(`Script '${scriptName}' exited with code ${exitCode}`);
    }

    return { exitCode };
  },
};

function printRunUsage(): void {
  console.log('Usage: aiwg run <script-name> [args...]');
  console.log('       aiwg run skill <skill-name> [--cwd <path>] [-- <args forwarded to script>]');
  console.log('');
  console.log('Two forms share the `run` namespace:');
  console.log('');
  console.log('  aiwg run <script-name>');
  console.log('    Execute a user-defined script from .aiwg/aiwg.config (modeled on `npm run`).');
  console.log('    With no arguments, lists available scripts.');
  console.log('');
  console.log('  aiwg run skill <skill-name>');
  console.log('    Execute a script-bearing skill via the artifact index. Skills with a');
  console.log('    `script:` frontmatter declaration are dispatched through the runtime');
  console.log('    registry (node/python3/bash/sh/pwsh/ruby/auto). Find skills with');
  console.log('    `aiwg discover "<phrase>"` — executable skills are flagged `executable: true`.');
  console.log('');
  console.log('Examples:');
  console.log('  aiwg run                                # list available user scripts');
  console.log('  aiwg run deploy                         # run user script "deploy"');
  console.log('  aiwg run skill voice-apply -- --voice technical-authority --input draft.md');
  console.log('  aiwg run skill template-engine -- render adr-template.md --vars vars.yaml');
  console.log('  aiwg run skill <name> --cwd <path>      # explicit CWD override');
}
