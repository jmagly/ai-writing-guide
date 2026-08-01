import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { CodexJobExecutor } from '../../jobs/executor.js';
import { loadJobFlow, resolveWorkspaceFile } from '../../jobs/flow.js';
import { GiteaWorkItemClient } from '../../jobs/gitea.js';
import { renderExternalTrigger, type SchedulerFormat } from '../../jobs/render.js';
import { runExternalJob } from '../../jobs/runner.js';
import { AiwgError, EXIT_CODES, handlerResultFromError } from '../errors.js';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function usage(message: string): never {
  throw new AiwgError({ code: 'ERR_USAGE_JOB', message, exitCode: EXIT_CODES.USAGE, hint: 'Run `aiwg job help` for usage.' });
}

function help(): void {
  console.log(`AIWG external-trigger jobs

Usage:
  aiwg job validate <flow>
  aiwg job render-cron <flow> [--format cron|systemd|gitea-actions]
  aiwg job run <flow> --once [--state-dir <absolute-path>] [--json]

The operating system or CI owns time. AIWG validates and executes one reviewed job.`);
}

async function validateFiles(flow: Awaited<ReturnType<typeof loadJobFlow>>['flow']): Promise<void> {
  const workspace = await fs.realpath(flow.spec.executor.workspace);
  if (workspace !== flow.spec.executor.workspace) {
    throw new Error('executor.workspace must be canonical (no symlink or relative segments)');
  }
  const prompt = resolveWorkspaceFile(flow, flow.spec.executor.prompt);
  const schema = resolveWorkspaceFile(flow, flow.spec.executor.resultSchema);
  const [promptStat, schemaSource] = await Promise.all([fs.stat(prompt), fs.readFile(schema, 'utf8'), fs.access(flow.spec.executor.binary, constants.X_OK)]);
  if (!promptStat.isFile()) throw new Error('executor.prompt must resolve to a regular file');
  JSON.parse(schemaSource);
  for (const root of flow.spec.security.approvedAttachmentRoots) {
    const [canonical, stat] = await Promise.all([fs.realpath(root), fs.stat(root)]);
    if (canonical !== root || !stat.isDirectory()) throw new Error('approvedAttachmentRoots must contain canonical directories');
  }
}

async function execute(ctx: HandlerContext): Promise<HandlerResult> {
  try {
    const [subcommand = 'help', flowArg] = ctx.args;
    if (subcommand === 'help' || subcommand === '--help' || subcommand === '-h') { help(); return { exitCode: 0 }; }
    if (!['validate', 'render-cron', 'run'].includes(subcommand)) usage(`Unknown job subcommand: ${subcommand}`);
    if (!flowArg || flowArg.startsWith('-')) usage(`job ${subcommand} requires a flow file`);
    const loaded = await loadJobFlow(flowArg, ctx.cwd);
    await validateFiles(loaded.flow);

    if (subcommand === 'validate') {
      console.log(JSON.stringify({ valid: true, apiVersion: loaded.flow.apiVersion, kind: loaded.flow.kind, name: loaded.flow.metadata.name }));
      return { exitCode: 0 };
    }
    if (subcommand === 'render-cron') {
      const format = (option(ctx.args.slice(2), '--format') ?? 'cron') as SchedulerFormat;
      if (!['cron', 'systemd', 'gitea-actions'].includes(format)) usage(`Unsupported scheduler format: ${format}`);
      console.log(renderExternalTrigger(loaded.flow, loaded.file, format));
      return { exitCode: 0 };
    }
    if (!ctx.args.includes('--once')) usage('job run requires --once; AIWG does not own a resident scheduler');
    const stateRoot = option(ctx.args.slice(2), '--state-dir');
    if (stateRoot && !stateRoot.startsWith('/')) usage('--state-dir must be absolute');
    if (stateRoot && path.resolve(stateRoot) === path.parse(path.resolve(stateRoot)).root) usage('--state-dir must not be a filesystem root');
    const client = await GiteaWorkItemClient.create(loaded.flow);
    const result = await runExternalJob({
      flow: loaded.flow,
      client,
      executor: new CodexJobExecutor(),
      ...(stateRoot ? { stateRoot } : {}),
      signal: ctx.signal,
    });
    console.log(JSON.stringify(result, null, ctx.args.includes('--json') ? 2 : 0));
    return { exitCode: result.status === 'failed-verification' ? EXIT_CODES.GENERAL : EXIT_CODES.OK };
  } catch (error) {
    return handlerResultFromError(error);
  }
}

export const jobHandler: CommandHandler = {
  id: 'job',
  name: 'External Job',
  description: 'Validate, render, or run one externally triggered provider job',
  category: 'orchestration',
  aliases: ['job'],
  execute,
};
