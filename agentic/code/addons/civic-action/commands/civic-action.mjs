import fs from 'node:fs/promises';
import path from 'node:path';
import { evaluateMeeting, evaluatePublication, evaluateSourceRegistry, exitCodeFor } from '../lib/gate-engine.mjs';

async function readJson(cwd, file) {
  return JSON.parse(await fs.readFile(path.resolve(cwd, file), 'utf8'));
}

export default async function civicAction(args, context = {}) {
  const cwd = context.cwd ?? process.cwd();
  const subcommand = context.subcommand ?? args.shift();
  if (args.includes('--help') || args.includes('-h')) return { exitCode: 0, message: 'Usage: aiwg civic source-gate <registry.json> | meeting-gate <ledger.json> <reconciliation.json> | publish-gate <packet.json>' };
  try {
    let result;
    if (subcommand === 'source-gate') {
      if (!args[0]) throw new Error('source-gate requires <registry.json>');
      result = evaluateSourceRegistry(await readJson(cwd, args[0]));
    } else if (subcommand === 'meeting-gate') {
      if (!args[0] || !args[1]) throw new Error('meeting-gate requires <ledger.json> <reconciliation.json>');
      result = evaluateMeeting(await readJson(cwd, args[0]), await readJson(cwd, args[1]));
    } else if (subcommand === 'publish-gate') {
      if (!args[0]) throw new Error('publish-gate requires <packet.json>');
      result = evaluatePublication(await readJson(cwd, args[0]));
    } else throw new Error(`Unknown civic gate: ${subcommand ?? '(missing)'}`);
    return { exitCode: exitCodeFor(result), message: JSON.stringify(result, null, 2) };
  } catch (error) {
    return { exitCode: 2, message: JSON.stringify({ schema: 'aiwg.civic.gate-error.v1', error: error instanceof Error ? error.message : String(error) }, null, 2) };
  }
}
