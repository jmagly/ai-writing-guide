import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import {
  ingestSkillUsageTranscript,
  printSkillUsageReport,
  type SkillUsageScope,
} from '../skill-usage.js';

export const skillUsageHandler: CommandHandler = {
  id: 'skill-usage',
  name: 'Skill Usage',
  description: 'Report opt-in local skill, agent, and command usage events',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    if (ctx.args[0] === 'ingest-transcript') {
      const transcriptPath = ctx.args[1];
      if (!transcriptPath) {
        return { exitCode: 2, message: 'Usage: aiwg skill-usage ingest-transcript <path> --provider claude-code [--project-root <path>] [--dry-run] [--json]' };
      }
      const provider = readStringFlag(ctx.args, '--provider') ?? 'claude-code';
      const projectRoot = readStringFlag(ctx.args, '--project-root');
      const dryRun = ctx.args.includes('--dry-run');
      const json = ctx.args.includes('--json');
      const result = await ingestSkillUsageTranscript({
        transcriptPath,
        provider,
        cwd: ctx.cwd,
        projectRoot,
        frameworkRoot: ctx.frameworkRoot,
        dryRun,
      });
      if (json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const verb = dryRun ? 'Would append' : 'Appended';
        console.log(`${verb} ${result.appended || result.events.length} skill-usage event(s); skipped ${result.skipped} line(s).`);
        if (result.paths.length > 0) console.log(`Stores: ${result.paths.join(', ')}`);
      }
      return { exitCode: 0 };
    }

    const json = ctx.args.includes('--json');
    const limit = readNumberFlag(ctx.args, '--limit') ?? 20;
    const scope = readScopeFlag(ctx.args);
    const suggestFor = readStringFlag(ctx.args, '--suggest-for');
    await printSkillUsageReport({
      cwd: ctx.cwd,
      frameworkRoot: ctx.frameworkRoot,
      json,
      limit,
      scope,
      suggestFor,
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

function readStringFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  const raw = args[idx + 1];
  return raw && !raw.startsWith('-') ? raw : undefined;
}

function readScopeFlag(args: string[]): SkillUsageScope | 'all' {
  const idx = args.indexOf('--scope');
  const raw = idx === -1 ? 'all' : args[idx + 1];
  if (raw === 'project' || raw === 'global' || raw === 'all') return raw;
  return 'all';
}
