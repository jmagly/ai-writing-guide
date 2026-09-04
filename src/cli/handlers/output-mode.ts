import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { loadOutputModeRegistry, readOutputModeState, resolveOutputModes, writeOutputModeState } from '../../output-modes/registry.js';
import type { OutputModeScope } from '../../output-modes/types.js';

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseScope(args: string[]): OutputModeScope {
  const scope = flagValue(args, '--scope') ?? 'session';
  if (!['invocation', 'session', 'project'].includes(scope)) throw new Error(`Invalid scope '${scope}'; expected invocation, session, or project.`);
  return scope as OutputModeScope;
}

async function execute(ctx: HandlerContext): Promise<HandlerResult> {
  const [action = 'status', id] = ctx.args.filter((arg, index, all) => !arg.startsWith('-') && all[index - 1] !== '--scope');
  const registry = await loadOutputModeRegistry(ctx.cwd, ctx.frameworkRoot);
  if (action === 'list') {
    const rows = [...registry.values()].sort((a, b) => a.id.localeCompare(b.id)).map(p => `${p.id}\t${p.kind}\t${p.validation.level}\t${p.source}\t${p.description}`);
    return { exitCode: 0, rawOutput: true, message: `ID\tKIND\tVALIDATION\tSOURCE\tDESCRIPTION\n${rows.join('\n')}` };
  }
  if (action === 'show') {
    if (!id) return { exitCode: 1, message: 'Usage: aiwg output-mode show <id>' };
    const p = registry.get(id);
    if (!p) return { exitCode: 1, message: `Unknown output mode '${id}'.` };
    return { exitCode: 0, rawOutput: true, message: JSON.stringify(p, null, 2) };
  }
  if (action === 'status') {
    const invocation = ctx.args.flatMap((arg, i) => arg === '--output-mode' && ctx.args[i + 1] ? [ctx.args[i + 1]] : []);
    const resolved = await resolveOutputModes(ctx.cwd, ctx.frameworkRoot, invocation);
    if (resolved.modes.length === 0) return { exitCode: 0, rawOutput: true, message: 'Effective output mode: unaltered\nContext cost: 0 tokens\nNo transformations active.' };
    const lines = resolved.modes.map((p, i) => `${i + 1}. ${p.id} [${p.kind}/${p.stage}] source=${p.source} scope=${p.scope} validation=${p.validation.level} context≈${p.contextCost ?? 0}`);
    return { exitCode: 0, rawOutput: true, message: `Effective ordered stack:\n${lines.join('\n')}\nEstimated context cost: ${resolved.modes.reduce((n, p) => n + (p.contextCost ?? 0), 0)} tokens` };
  }
  if (!['enable', 'disable', 'clear'].includes(action)) return { exitCode: 1, message: `Unknown output-mode action '${action}'.` };
  const scope = parseScope(ctx.args);
  if (scope === 'invocation') {
    if (action !== 'enable' || !id) return { exitCode: 1, message: 'Invocation scope is ephemeral; pass --output-mode <id> to the command being run.' };
    if (!registry.has(id)) return { exitCode: 1, message: `Unknown output mode '${id}'.` };
    return { exitCode: 0, message: `Invocation mode '${id}' validated. Pass --output-mode ${id} to the command being run; no files were modified.` };
  }
  const state = await readOutputModeState(ctx.cwd, scope);
  let modes = [...state.modes];
  if (action === 'clear') modes = [];
  else {
    if (!id) return { exitCode: 1, message: `Usage: aiwg output-mode ${action} <id> --scope ${scope}` };
    if (!registry.has(id)) return { exitCode: 1, message: `Unknown output mode '${id}'.` };
    modes = action === 'enable' ? [...new Set([...modes, id])] : modes.filter(value => value !== id);
  }
  await resolveOutputModes(ctx.cwd, ctx.frameworkRoot, [], { [scope]: modes });
  const path = await writeOutputModeState(ctx.cwd, scope, modes);
  return { exitCode: 0, message: `${action === 'clear' ? 'Cleared' : `${action}d`} ${scope} output modes (${modes.join(', ') || 'unaltered'}) at ${path}` };
}

export const outputModeHandler: CommandHandler = {
  id: 'output-mode', name: 'Output Modes', description: 'List, inspect, and select composable output modes', category: 'project', aliases: ['output-modes'],
  async help() {
    return {
      exitCode: 0,
      rawOutput: true,
      message: [
        'Usage:',
        '  aiwg output-mode list',
        '  aiwg output-mode show <id>',
        '  aiwg output-mode enable <id> --scope invocation|session|project',
        '  aiwg output-mode disable <id> --scope session|project',
        '  aiwg output-mode clear --scope session|project',
        '  aiwg output-mode status [--output-mode <id>]...',
        '',
        'Use repeated --output-mode flags with aiwg run for a one-command stack.',
      ].join('\n'),
    };
  },
  async execute(ctx) { try { return await execute(ctx); } catch (error) { return { exitCode: 1, message: (error as Error).message }; } },
};
