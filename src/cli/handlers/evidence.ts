/** Evidence bundle export and verification CLI. @issue #2039 */

import path from 'node:path';
import { createEvidenceBundle, verifyEvidenceBundle, type EvidenceInput } from '../../evidence/bundle.js';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

function values(args: string[], flag: string): string[] {
  const result: string[] = [];
  for (let index = 0; index < args.length; index++) if (args[index] === flag && args[index + 1]) result.push(args[++index]);
  return result;
}
function value(args: string[], flag: string): string | undefined { return values(args, flag)[0]; }
function versions(items: string[]): Record<string, string> {
  return Object.fromEntries(items.map(item => {
    const index = item.indexOf('=');
    if (index < 1 || index === item.length - 1) throw new Error(`version '${item}' must use name=value`);
    return [item.slice(0, index), item.slice(index + 1)];
  }));
}
function usage(): string {
  return [
    'Usage:',
    '  aiwg evidence export --output <dir> [--activity-export <json>] [--report <file>] [--source <file>]',
    '    [--eval-config <file>] [--provenance <file>] [--model-version name=value] [--tool-version name=value]',
    '    [--check-only --not-run <reason>] [--json]',
    '  aiwg evidence verify <bundle> [--expected-root <sha256>] [--json]',
  ].join('\n');
}

export const evidenceHandler: CommandHandler = {
  id: 'evidence', name: 'Evidence', description: 'Export and verify portable evaluation evidence bundles', category: 'utility', aliases: [],
  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const [subcommand] = ctx.args;
    if (!subcommand || subcommand === '--help' || subcommand === '-h') return { exitCode: 0, message: usage() };
    try {
      if (subcommand === 'verify') {
        const bundle = ctx.args[1];
        if (!bundle || bundle.startsWith('-')) return { exitCode: 2, message: usage() };
        const expectedRoot = value(ctx.args, '--expected-root');
        if (expectedRoot && !/^[0-9a-f]{64}$/i.test(expectedRoot)) return { exitCode: 2, message: '--expected-root must be a SHA-256 hex digest' };
        const result = await verifyEvidenceBundle(path.resolve(ctx.cwd, bundle), expectedRoot?.toLowerCase());
        return { exitCode: result.valid ? 0 : 1, message: ctx.args.includes('--json') ? JSON.stringify(result, null, 2) : [
          `Evidence bundle: ${result.valid ? 'VALID' : 'INVALID'} (${result.status})`,
          ...result.errors.map(error => `ERROR: ${error}`), ...result.warnings.map(warning => `WARN: ${warning}`),
        ].join('\n') };
      }
      if (subcommand !== 'export') return { exitCode: 2, message: usage() };
      const output = value(ctx.args, '--output');
      if (!output) return { exitCode: 2, message: '--output is required.\n\n' + usage() };
      const checkOnly = ctx.args.includes('--check-only');
      const notRunReason = value(ctx.args, '--not-run');
      if (checkOnly !== Boolean(notRunReason)) return { exitCode: 2, message: '--check-only and --not-run <reason> must be used together' };
      const inputs: EvidenceInput[] = [
        ...values(ctx.args, '--activity-export').map(file => ({ file: path.resolve(ctx.cwd, file), role: 'activity-export' as const })),
        ...values(ctx.args, '--report').map(file => ({ file: path.resolve(ctx.cwd, file), role: 'report' as const })),
        ...values(ctx.args, '--source').map(file => ({ file: path.resolve(ctx.cwd, file), role: 'source' as const })),
        ...values(ctx.args, '--eval-config').map(file => ({ file: path.resolve(ctx.cwd, file), role: 'eval-config' as const })),
        ...values(ctx.args, '--provenance').map(file => ({ file: path.resolve(ctx.cwd, file), role: 'provenance' as const })),
      ];
      const manifest = await createEvidenceBundle({
        output: path.resolve(ctx.cwd, output), inputs,
        modelVersions: versions(values(ctx.args, '--model-version')),
        toolVersions: { aiwg: process.env.npm_package_version ?? 'unknown', node: process.version, ...versions(values(ctx.args, '--tool-version')) },
        checkOnly, notRunReason,
      });
      return { exitCode: 0, message: ctx.args.includes('--json') ? JSON.stringify(manifest, null, 2) : `Evidence bundle ${manifest.status}: ${path.resolve(ctx.cwd, output)}\nVerifier root: ${manifest.verifier.root}` };
    } catch (error) {
      return { exitCode: 1, message: `Evidence command failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
};
