/**
 * Execution Mode Handler
 *
 * Persists the reproducibility mode for AIWG workflows in the project tree.
 */

import { mkdir, readFile, writeFile } from 'fs/promises';
import { randomInt } from 'crypto';
import { join } from 'path';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

type ExecutionMode = 'standard' | 'seeded' | 'strict' | 'audit';

interface ExecutionModeConfig {
  version: '1';
  mode: ExecutionMode;
  seed: string | null;
  externalCalls: 'allowed' | 'blocked';
  pinnedVersions: boolean;
  decisionLog: boolean;
  updatedAt: string;
}

const MODES = new Set<ExecutionMode>(['standard', 'seeded', 'strict', 'audit']);

function usage(): string {
  return [
    'Usage: aiwg execution-mode [standard|seeded|strict|audit] [--seed <value>]',
    '',
    'Modes:',
    '  standard  No reproducibility constraints',
    '  seeded    Fixed random seed; external calls allowed',
    '  strict    Seeded, external calls blocked, versions pinned',
    '  audit     Strict mode plus decision logging',
  ].join('\n');
}

function configPath(cwd: string): string {
  return join(cwd, '.aiwg', 'execution-mode.json');
}

function buildConfig(mode: ExecutionMode, seed: string | null): ExecutionModeConfig {
  const constrained = mode === 'strict' || mode === 'audit';
  return {
    version: '1',
    mode,
    seed: mode === 'standard' ? null : seed,
    externalCalls: constrained ? 'blocked' : 'allowed',
    pinnedVersions: constrained,
    decisionLog: mode === 'audit',
    updatedAt: new Date().toISOString(),
  };
}

async function readConfig(cwd: string): Promise<ExecutionModeConfig> {
  try {
    const raw = await readFile(configPath(cwd), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ExecutionModeConfig>;
    if (parsed.mode && MODES.has(parsed.mode)) {
      return buildConfig(parsed.mode, parsed.seed ?? null);
    }
  } catch {
    // Missing or malformed config falls back to standard mode.
  }
  return buildConfig('standard', null);
}

async function writeConfig(cwd: string, config: ExecutionModeConfig): Promise<void> {
  await mkdir(join(cwd, '.aiwg'), { recursive: true });
  await writeFile(configPath(cwd), JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

function parseSeed(args: string[]): string | null {
  const idx = args.indexOf('--seed');
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return null;
}

function formatConfig(config: ExecutionModeConfig): string {
  const seed = config.seed ? ` (seed: ${config.seed})` : '';
  return [
    `Current execution mode: ${config.mode}${seed}`,
    `External calls: ${config.externalCalls}`,
    `Pinned versions: ${config.pinnedVersions ? 'yes' : 'no'}`,
    `Decision log: ${config.decisionLog ? 'yes' : 'no'}`,
  ].join('\n');
}

export const executionModeHandler: CommandHandler = {
  id: 'execution-mode',
  name: 'Execution Mode',
  description: 'Set or report reproducibility mode for deterministic workflow execution',
  category: 'config',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const [modeArg] = ctx.args;

    if (modeArg === '--help' || modeArg === '-h') {
      return { exitCode: 0, message: usage() };
    }

    if (!modeArg) {
      return { exitCode: 0, message: formatConfig(await readConfig(ctx.cwd)) };
    }

    if (!MODES.has(modeArg as ExecutionMode)) {
      return {
        exitCode: 1,
        message: `Error: unknown execution mode '${modeArg}'\n\n${usage()}`,
      };
    }

    const mode = modeArg as ExecutionMode;
    const seed = mode === 'standard'
      ? null
      : parseSeed(ctx.args) ?? String(randomInt(1, 1_000_000_000));
    const config = buildConfig(mode, seed);
    await writeConfig(ctx.cwd, config);

    return {
      exitCode: 0,
      message: `Execution mode set to ${mode}${seed ? ` (seed: ${seed})` : ''}\n${formatConfig(config)}`,
    };
  },
};
