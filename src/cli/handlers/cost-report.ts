/** OpenRouter fleet cost-report CLI handler. @issue #1187 */

import os from 'node:os';
import path from 'node:path';
import {
  FleetConfigMissingError,
  formatFleetSpendReport,
  generateFleetSpendReport,
} from '../../cost/fleet-report.js';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith('-') ? value : undefined;
}

function usage(): string {
  return [
    'Usage: aiwg cost-report (--fleet | --key <key_ref>) [--source openrouter] [--config <fleet.yaml>] [--json]',
    '',
    'Reads bot-to-key references from ~/.config/aiwg/fleet.yaml and credentials from',
    '~/.config/aiwg/keys/<key_ref> or AIWG_OPENROUTER_KEY_<KEY_REF>.',
    '',
    'AIWG observes and correlates spend; OpenRouter enforces all key limits and caps.',
  ].join('\n');
}

export const costReportHandler: CommandHandler = {
  id: 'cost-report',
  name: 'Cost Report',
  description: 'Observe OpenRouter fleet spend and correlate it with local AIWG activity',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    if (ctx.args.includes('--help') || ctx.args.includes('-h')) return { exitCode: 0, message: usage() };
    const keyRef = option(ctx.args, '--key');
    if (ctx.args.includes('--fleet') && keyRef) return { exitCode: 2, message: 'Choose either --fleet or --key, not both.' };
    if (!ctx.args.includes('--fleet') && !keyRef) {
      return { exitCode: 2, message: `Select --fleet or --key <key_ref>.\n\n${usage()}` };
    }
    const source = option(ctx.args, '--source') ?? 'openrouter';
    if (source !== 'openrouter') return { exitCode: 2, message: `Unsupported source '${source}'. Only openrouter is supported.` };
    const configuredPath = option(ctx.args, '--config');
    const configPath = configuredPath
      ? path.resolve(ctx.cwd, configuredPath)
      : path.join(os.homedir(), '.config', 'aiwg', 'fleet.yaml');
    try {
      const capValue = option(ctx.args, '--monthly-cap');
      const cap = capValue === undefined ? 0 : Number(capValue);
      if (!Number.isFinite(cap) || cap < 0) return { exitCode: 2, message: '--monthly-cap must be a non-negative number.' };
      const report = await generateFleetSpendReport({
        cwd: ctx.cwd,
        configPath,
        signal: ctx.signal,
        ...(keyRef ? {
          fleet: [{
            bot: option(ctx.args, '--bot') ?? keyRef,
            machine: option(ctx.args, '--machine') ?? os.hostname(),
            key_ref: keyRef,
            monthly_cap: cap,
          }],
        } : {}),
      });
      return {
        exitCode: report.bots.some(bot => bot.error) ? 1 : 0,
        message: ctx.args.includes('--json') ? JSON.stringify(report, null, 2) : formatFleetSpendReport(report),
      };
    } catch (error) {
      const message = error instanceof FleetConfigMissingError ? error.message : `Fleet cost report failed: ${error instanceof Error ? error.message : String(error)}`;
      return { exitCode: 1, message };
    }
  },
};
