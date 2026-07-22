import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { getProjectDir } from '../../config/aiwg-config.js';
import { moveProjectArtifacts } from '../../artifacts/move.js';

function usage(): string {
  return [
    'aiwg artifacts — Manage the project AIWG artifact root',
    '',
    'Usage:',
    '  aiwg artifacts move --to <path> [--from <path>] [--dry-run] [--force] [--no-reindex] [--no-sync]',
    '',
    'Notes:',
    '  --to points at the artifact directory itself, not its parent.',
    '  AIWG_ARTIFACTS_PATH overrides the generated .aiwg-location pointer.',
  ].join('\n');
}

function valueAfter(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const value = args[index + 1];
  return value && !value.startsWith('-') ? value : undefined;
}

export const artifactsHandler: CommandHandler = {
  id: 'artifacts',
  name: 'Project Artifacts',
  description: 'Move or inspect the configured project AIWG artifact root',
  category: 'index',
  aliases: ['artifact'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const action = ctx.args.find(arg => !arg.startsWith('-')) ?? 'help';
    if (action === 'help' || ctx.args.includes('--help') || ctx.args.includes('-h')) {
      return { exitCode: 0, message: usage() };
    }
    if (action !== 'move') {
      return { exitCode: 1, message: `Unknown artifacts action: ${action}\n\n${usage()}` };
    }

    const to = valueAfter(ctx.args, '--to');
    if (!to) {
      return { exitCode: 1, message: `Error: --to <path> is required.\n\n${usage()}` };
    }

    try {
      const result = await moveProjectArtifacts({
        projectDir: getProjectDir(ctx, ctx.args),
        from: valueAfter(ctx.args, '--from'),
        to,
        dryRun: ctx.dryRun || ctx.args.includes('--dry-run'),
        force: ctx.args.includes('--force'),
        reindex: !ctx.args.includes('--no-reindex'),
        syncFortemi: !ctx.args.includes('--no-sync'),
      });

      const verb = result.dryRun ? 'Would move' : 'Moved';
      return {
        exitCode: 0,
        message: [
          `${verb} AIWG artifacts`,
          `  From: ${result.from}`,
          `  To:   ${result.to}`,
          `  Pointer: ${result.pointerPath} -> ${result.pointerValue}`,
          `  Gitignore: ${result.gitignoreUpdated ? (result.dryRun ? 'would update' : 'updated') : 'already configured'}`,
          `  Reindex: ${result.reindexed ? 'rebuilt project graph' : result.dryRun ? 'would rebuild project graph' : 'skipped'}`,
          `  Fortemi sync: ${result.fortemiSynced ? 'updated' : result.dryRun ? 'would update' : 'skipped'}`,
          '',
          'If AIWG_ARTIFACTS_PATH is set in the shell, update it to the new path or unset it so .aiwg-location is used.',
        ].join('\n'),
      };
    } catch (error) {
      return {
        exitCode: 1,
        error: error instanceof Error ? error : new Error(String(error)),
        message: `Artifact move failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

export const artifactsHandlers: CommandHandler[] = [artifactsHandler];
