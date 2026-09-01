import fs from 'node:fs/promises';
import path from 'node:path';
import { evaluateMeeting, evaluatePublication, evaluateSourceRegistry, exitCodeFor } from '../lib/gate-engine.mjs';
import { assertCivicSchema, CivicSchemaValidationError } from '../lib/schema-validator.mjs';

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
      const registry = await readJson(cwd, args[0]);
      assertCivicSchema('source-registry', registry);
      result = evaluateSourceRegistry(registry);
    } else if (subcommand === 'meeting-gate') {
      if (!args[0] || !args[1]) throw new Error('meeting-gate requires <ledger.json> <reconciliation.json>');
      const ledger = await readJson(cwd, args[0]);
      const reconciliation = await readJson(cwd, args[1]);
      assertCivicSchema('vote-ledger', ledger);
      assertCivicSchema('meeting-reconciliation', reconciliation);
      result = evaluateMeeting(ledger, reconciliation);
    } else if (subcommand === 'publish-gate') {
      if (!args[0]) throw new Error('publish-gate requires <packet.json>');
      const packet = await readJson(cwd, args[0]);
      assertCivicSchema('publication-packet', packet);
      result = evaluatePublication(packet);
    } else throw new Error(`Unknown civic gate: ${subcommand ?? '(missing)'}`);
    assertCivicSchema('gate-result', result);
    return { exitCode: exitCodeFor(result), message: JSON.stringify(result, null, 2) };
  } catch (error) {
    const payload = {
      schema: 'aiwg.civic.gate-error.v1',
      code: error instanceof CivicSchemaValidationError ? error.code : 'CIVIC_INPUT_INVALID',
      error: error instanceof Error ? error.message : String(error),
      ...(error instanceof CivicSchemaValidationError ? { validation_errors: error.validationErrors } : {}),
    };
    return { exitCode: 2, message: JSON.stringify(payload, null, 2) };
  }
}
