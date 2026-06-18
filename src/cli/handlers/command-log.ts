import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { printCommandLogReport, type CommandLogScope } from '../command-log.js';

export const commandLogHandler: CommandHandler = {
  id: 'command-log',
  name: 'Command Log',
  description: 'Report opt-in local CLI command invocation logs',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const json = ctx.args.includes('--json');
    const limit = readNumberFlag(ctx.args, '--limit') ?? 20;
    const scope = readScopeFlag(ctx.args);
    await printCommandLogReport({
      cwd: ctx.cwd,
      frameworkRoot: ctx.frameworkRoot,
      json,
      limit,
      scope,
    });
    return { exitCode: 0 };
  },
};

function readNumberFlag(args: string[], flag: string): number | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  const raw = args[idx + 1];
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

function readScopeFlag(args: string[]): CommandLogScope | 'all' {
  const idx = args.indexOf('--scope');
  const raw = idx === -1 ? 'all' : args[idx + 1];
  if (raw === 'project' || raw === 'global' || raw === 'all') return raw;
  return 'all';
}
