/**
 * Init Command Handler
 *
 * Implements `aiwg init` — the first-run wizard that creates
 * `.aiwg/aiwg.config` for the current project.
 *
 * Prompts:
 *   1. Which AI provider toolchains does this project target?
 *   2. Would you like to add any scripts? (optional)
 *
 * Runs automatically on first `aiwg use` when no config exists.
 * Can also be run explicitly to reconfigure.
 *
 * @implements #621
 */

import readline from 'readline';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import {
  readAiwgConfig,
  writeAiwgConfig,
  emptyConfig,
  populateDeployedTo,
  VALID_PROVIDERS,
  getConfigPath,
} from '../../config/aiwg-config.js';
import * as ui from '../ui.js';
import { askString as sharedAskString, askYesNo as sharedAskYesNo } from '../prompt-utils.js';

const PROVIDER_LABELS: Record<string, string> = {
  claude:    'Claude Code       .claude/',
  copilot:   'GitHub Copilot    .github/',
  cursor:    'Cursor            .cursor/',
  opencode:  'OpenCode          .opencode/',
  warp:      'Warp Terminal     .warp/',
  windsurf:  'Windsurf          AGENTS.md',
  factory:   'Factory AI        .factory/',
  codex:     'OpenAI Codex      ~/.codex/',
  openclaw:  'OpenClaw          ~/.openclaw/',
  hermes:    'Hermes (MCP)      aiwg mcp',
};

// Local aliases for the shared prompt utilities. These preserve existing
// call sites (askYesNo/askString) while routing through a single timeout
// and unref-discipline implementation in `src/cli/prompt-utils.ts`.
// Phase 3 (#920) will replace these with @clack/prompts.

const askYesNo = sharedAskYesNo;
const askString = sharedAskString;

/**
 * Prompt for a comma-separated provider selection
 */
async function askProviders(rl: readline.Interface, signal?: AbortSignal): Promise<string[]> {
  const list = VALID_PROVIDERS.map((p, i) => `  ${i + 1}. ${PROVIDER_LABELS[p] ?? p}`).join('\n');
  console.log('');
  console.log('  Available providers:');
  console.log(list);
  console.log('');

  // Multi-select (comma-separated) — stays hand-rolled rather than adopting
  // listSelect because #926's POC targets single-select only. `signal`
  // threading is the full migration from the spike.
  const answer = await askString(
    rl,
    '  Enter provider numbers (comma-separated) or names [1]: ',
    '',
    signal,
  );

  if (!answer) return ['claude']; // default

  const parts = answer.split(',').map(s => s.trim()).filter(Boolean);
  const selected: string[] = [];

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (!isNaN(num) && num >= 1 && num <= VALID_PROVIDERS.length) {
      selected.push(VALID_PROVIDERS[num - 1]);
    } else if (VALID_PROVIDERS.includes(part as typeof VALID_PROVIDERS[number])) {
      selected.push(part);
    } else {
      ui.warn(`  Unknown provider '${part}' — skipped`);
    }
  }

  return selected.length > 0 ? selected : ['claude'];
}

export const initHandler: CommandHandler = {
  id: 'init',
  name: 'Init',
  description: 'Initialise project with .aiwg/aiwg.config (provider registry + scripts)',
  category: 'project',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const force = ctx.args.includes('--force');
    // Treat a missing stdin TTY as non-interactive so piped/backgrounded
    // invocations never attempt to create a readline interface. This is a
    // single authoritative check — downstream code MUST NOT re-derive
    // interactive-ness from process.stdin.isTTY again.
    const nonInteractive =
      ctx.args.includes('--non-interactive') ||
      ctx.args.includes('--yes') ||
      !process.stdin.isTTY ||
      !process.stdout.isTTY ||
      process.env['CI'] === 'true';
    const projectDir = ctx.cwd;

    ui.blank();
    console.log(`  ${ui.brandMark()} ${ui.bold('AIWG Project Setup')}`);
    ui.rule();

    // Check for existing config
    const existing = await readAiwgConfig(projectDir);
    if (existing && !force) {
      ui.info(`Config already exists: ${getConfigPath(projectDir)}`);
      console.log(`  Providers: ${existing.providers.join(', ')}`);
      const scriptCount = Object.keys(existing.scripts).length;
      if (scriptCount > 0) {
        console.log(`  Scripts: ${Object.keys(existing.scripts).join(', ')}`);
      }
      ui.blank();
      ui.dim('  Run `aiwg init --force` to overwrite.');
      ui.blank();
      return { exitCode: 0 };
    }

    let providers: string[];
    let scripts: Record<string, string> = {};

    if (nonInteractive) {
      // Non-interactive: use defaults
      providers = ['claude'];
      scripts = {
        deploy: 'aiwg use all',
        doctor: 'aiwg doctor',
        sync: 'aiwg sync',
      };
    } else {
      // Interactive wizard
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      try {
        // Thread ctx.signal through every prompt so Ctrl-C during the wizard
        // cancels cleanly instead of being absorbed by readline (POC #926).
        providers = await askProviders(rl, ctx.signal);

        console.log('');
        const addScripts = await askYesNo(rl, '  Add default scripts (deploy, doctor, sync)? [Y/n]: ', true, ctx.signal);
        if (addScripts) {
          scripts = {
            deploy: 'aiwg use all',
            doctor: 'aiwg doctor',
            sync: 'aiwg sync',
          };

          const addCustom = await askYesNo(rl, '  Add a custom script? [y/N]: ', false, ctx.signal);
          if (addCustom) {
            const name = await askString(rl, '  Script name: ', '', ctx.signal);
            const cmd = await askString(rl, '  Command: ', '', ctx.signal);
            if (name && cmd) {
              scripts[name] = cmd;
            }
          }
        }
      } finally {
        rl.close();
      }
    }

    // Build config
    let config = emptyConfig(providers);
    config.scripts = scripts;

    // Populate deployedTo from disk for entries with empty deployedTo (#721)
    config = await populateDeployedTo(config, projectDir);

    // Write
    await writeAiwgConfig(projectDir, config);

    ui.blank();
    ui.success(`Created ${getConfigPath(projectDir)}`);
    ui.success(`Providers: ${providers.join(', ')}`);
    if (Object.keys(scripts).length > 0) {
      ui.success(`Scripts: ${Object.keys(scripts).join(', ')}`);
    }
    ui.blank();
    console.log('  Next steps:');
    console.log('    aiwg use sdlc         Deploy SDLC framework to all configured providers');
    console.log('    aiwg run deploy       Run the deploy script');
    console.log('    aiwg run              List all defined scripts');
    ui.blank();

    return { exitCode: 0 };
  },
};
