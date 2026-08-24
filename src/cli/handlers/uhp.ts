import { readAiwgConfig } from '../../config/aiwg-config.js';
import { resolveUhpProfile } from '../../uhp/config.js';
import { UhpClient } from '../../uhp/client.js';
import { projectUhpResponseToCanonicalMission, projectUhpResponseToMission, unknownUhpMissionEvidence } from '../../uhp/mission.js';
import { UhpError } from '../../uhp/errors.js';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

function valueAfter(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function usage(): string {
  return `Usage: aiwg uhp <discover|harnesses|models|run> --profile <name> [options]

Experimental UHP ${'2026-08-11'} client (client support only; no server conformance claim)

  discover                         Inspect unauthenticated capability discovery
  harnesses                        List configured remote harnesses
  models [--harness <id>]          List global or per-harness model availability
  run --input <text> [--harness <id>] [--model <id>] [--stream]
                                   Run an explicit smoke task

All commands require --profile. Credentials are resolved from the profile's
secret reference at request time; bearer values are never accepted as CLI arguments.`;
}

async function executeUhp(ctx: HandlerContext): Promise<HandlerResult> {
  const [operation] = ctx.args;
  if (!operation || operation === 'help' || operation === '--help') return { exitCode: 0, message: usage(), rawOutput: true };
  const profileName = valueAfter(ctx.args, '--profile');
  if (!profileName) return { exitCode: 2, message: 'UHP routing requires explicit --profile <name> selection.' };
  const config = await readAiwgConfig(ctx.cwd);
  const profile = resolveUhpProfile(config?.uhp, profileName);
  const client = new UhpClient(profileName, profile);

  if (operation === 'discover') return { exitCode: 0, message: JSON.stringify(await client.discover(), null, 2), rawOutput: true };
  if (operation === 'harnesses') return { exitCode: 0, message: JSON.stringify(await client.listHarnesses(), null, 2), rawOutput: true };
  if (operation === 'models') return { exitCode: 0, message: JSON.stringify(await client.listModels(valueAfter(ctx.args, '--harness')), null, 2), rawOutput: true };
  if (operation !== 'run') return { exitCode: 2, message: `Unknown UHP operation '${operation}'.\n${usage()}`, rawOutput: true };

  const input = valueAfter(ctx.args, '--input');
  if (!input) return { exitCode: 2, message: 'aiwg uhp run requires --input <text>.' };
  const request = {
    input,
    ...(valueAfter(ctx.args, '--model') ? { model: valueAfter(ctx.args, '--model') } : {}),
    metadata: { ...(valueAfter(ctx.args, '--harness') ? { harness_id: valueAfter(ctx.args, '--harness') } : {}) },
  };
  if (ctx.args.includes('--stream')) {
    const events = [];
    let terminal;
    try {
      for await (const event of client.streamResponse(request, { signal: ctx.signal })) {
        events.push(event);
        if (event.response) terminal = event.response;
      }
      const canonical = terminal ? projectUhpResponseToCanonicalMission(profileName, terminal, request, events.at(-1)) : undefined;
      return { exitCode: 0, message: JSON.stringify({ events, evidence: terminal ? projectUhpResponseToMission(profileName, terminal, request, events.at(-1)) : unknownUhpMissionEvidence(profileName, 'Stream ended without a response'), ...(canonical ? { mission: canonical.value, adapter: { sourceVersion: canonical.sourceVersion, warnings: canonical.warnings, lossReport: canonical.lossReport } } : {}) }, null, 2), rawOutput: true };
    } catch (error) {
      if (error instanceof UhpError && error.options.remoteState === 'unknown') {
        return { exitCode: 1, message: JSON.stringify({ error: { code: error.code, message: error.message }, evidence: unknownUhpMissionEvidence(profileName, error.message, terminal?.id, events.at(-1)?.sequence_number) }, null, 2), rawOutput: true };
      }
      throw error;
    }
  }
  const response = await client.createResponse(request, { signal: ctx.signal });
  const canonical = projectUhpResponseToCanonicalMission(profileName, response, request);
  return { exitCode: 0, message: JSON.stringify({ response, evidence: projectUhpResponseToMission(profileName, response, request), mission: canonical.value, adapter: { sourceVersion: canonical.sourceVersion, warnings: canonical.warnings, lossReport: canonical.lossReport } }, null, 2), rawOutput: true };
}

export const uhpHandler: CommandHandler = {
  id: 'uhp',
  name: 'Unified Harness Protocol',
  description: 'Inspect and smoke-test an explicitly selected experimental UHP endpoint profile',
  category: 'toolsmith',
  aliases: [],
  async execute(ctx) {
    try { return await executeUhp(ctx); }
    catch (error) {
      return { exitCode: error instanceof UhpError || error instanceof Error ? 1 : 1, message: error instanceof Error ? error.message : 'UHP operation failed' };
    }
  },
};
