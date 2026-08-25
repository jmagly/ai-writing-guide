import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

const usage = `Usage: aiwg mission migrate [--dry-run] [--root <workspace>]
       aiwg mission migrate --apply --target mission.aiwg.io/v1 [--id <id>]
       aiwg mission migrate --verify <id> | --resume <id> | --rollback <id>

Preview is the default. Apply is backup-first and requires an explicit target.`;

export const missionHandler: CommandHandler = {
  id: 'mission',
  name: 'Mission Protocol',
  description: 'Preview, apply, verify, resume, or roll back Mission Protocol migrations',
  category: 'orchestration',
  aliases: [],
  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    if (ctx.args[0] !== 'migrate' || ctx.args.includes('--help') || ctx.args.includes('-h')) {
      return { exitCode: ctx.args[0] === 'migrate' ? 0 : 2, message: usage, rawOutput: true };
    }
    const { spawn } = await import('node:child_process');
    const path = await import('node:path');
    const script = path.join(ctx.frameworkRoot, 'tools/mission-protocol/migrate.mjs');
    return await new Promise(resolve => {
      const child = spawn(process.execPath, [script, ...ctx.args.slice(1), '--root', ctx.cwd], { stdio: 'inherit', signal: ctx.signal });
      child.once('error', error => resolve({ exitCode: 1, error, message: error.message }));
      child.once('exit', code => resolve({ exitCode: code ?? 1 }));
    });
  },
};

export const missionHandlers = [missionHandler];
