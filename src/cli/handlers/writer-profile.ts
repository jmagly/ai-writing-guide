import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { WriterProfileStore } from '../../writing/writer-profile-store.js';
import { compileWriterProfile, exportWriterProfile, inspectWriterProfile, revokeWriterSample } from '../../writing/writer-profile.js';

function argumentsFor(args: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    if (!['--scope', '--output', '--revision', '--mode'].includes(arg) || flags[arg] !== undefined) throw new Error('Unknown or duplicate writer-profile option');
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error('Missing writer-profile option value');
    flags[arg] = value;
  }
  const scope = flags['--scope'] ?? 'project';
  if (scope !== 'project' && scope !== 'user') throw new Error('Scope must be project or user');
  return { positional, flags, scope } as const;
}

async function execute(ctx: HandlerContext): Promise<HandlerResult> {
  const { positional: [action, id, extra, ...rest], flags, scope } = argumentsFor(ctx.args);
  if (rest.length) throw new Error('Too many writer-profile arguments');
  const store = new WriterProfileStore({ cwd: ctx.cwd, scope });
  let result: unknown;
  const revision = () => {
    const raw = flags['--revision'];
    if (raw === undefined || !/^(0|[1-9]\d*)$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new Error('A nonnegative --revision is required');
    return Number(raw);
  };
  const destination = () => {
    if (!flags['--output']) throw new Error('--output is required; profile content is never printed');
    return path.resolve(ctx.cwd, flags['--output']);
  };
  if (ctx.dryRun) return { exitCode: 1, message: 'writer-profile does not support dry-run; use inspect before changing a profile' };
  if (action === 'list' && !id) result = await store.list();
  else if (action === 'import' && id && !extra) {
    const input = JSON.parse(await readFile(path.resolve(ctx.cwd, id), 'utf8'));
    result = inspectWriterProfile(await store.save(input, revision()));
  } else if (action === 'inspect' && id && !extra) result = inspectWriterProfile(await store.read(id));
  else if (action === 'version' && id && !extra) {
    const profile = await store.read(id);
    result = { schemaVersion: profile.schemaVersion, version: profile.version, revision: profile.revision };
  } else if (action === 'delete' && id && !extra) {
    await store.delete(id, revision()); result = { deleted: true };
  } else if (action === 'revoke' && id && extra) {
    const profile = await store.read(id);
    result = inspectWriterProfile(await store.save(revokeWriterSample(profile, extra), revision()));
  } else if ((action === 'export' || action === 'compile') && id && !extra) {
    const file = destination();
    const profile = await store.read(id);
    let output: unknown;
    if (action === 'compile') {
      const compiled = compileWriterProfile(profile);
      output = compiled.profile;
      result = { written: true, fallback: compiled.fallback, diagnostics: compiled.diagnostics, activated: false };
    } else {
      const mode = flags['--mode'] ?? 'shared';
      if (mode !== 'shared' && mode !== 'private') throw new Error('Export mode must be shared or private');
      output = exportWriterProfile(profile, mode);
      result = { written: true, mode };
    }
    await writeFile(file, JSON.stringify(output, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  } else throw new Error('Invalid writer-profile command; see aiwg writer-profile --help');
  return { exitCode: 0, rawOutput: true, message: JSON.stringify(result, null, 2) };
}

export const writerProfileHandler: CommandHandler = {
  id: 'writer-profile', name: 'Writer Profiles', description: 'Manage opt-in author-controlled writer profile sidecars', category: 'project', aliases: [],
  async help() { return { exitCode: 0, rawOutput: true, message: [
    'aiwg writer-profile list|inspect <id>|version <id> [--scope project|user]',
    'aiwg writer-profile import <sidecar.json> --revision 0 [--scope project|user]',
    'aiwg writer-profile import <updated.json> --revision <current> [--scope project|user]',
    'aiwg writer-profile export <id> --output <new-file> [--mode shared|private] [--scope project|user]',
    'aiwg writer-profile compile <id> --output <new-file> [--scope project|user]',
    'aiwg writer-profile revoke <id> <sample-id> --revision <current> [--scope project|user]',
    'aiwg writer-profile delete <id> --revision <current> [--scope project|user]',
    'Import and compile do not select an output mode. Export destinations must not exist.',
  ].join('\n') }; },
  async execute(ctx) {
    try { return await execute(ctx); }
    catch { return { exitCode: 1, message: 'Writer profile operation failed. Check the command, schema, file permissions and current revision; sample content is omitted.' }; }
  },
};
