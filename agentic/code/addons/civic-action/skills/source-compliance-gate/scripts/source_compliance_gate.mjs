#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function loadCivicAction() {
  try {
    return (await import('../../../commands/civic-action.mjs')).default;
  } catch (localError) {
    if (!process.env.AIWG_ROOT) throw localError;
    const installed = path.join(process.env.AIWG_ROOT, 'agentic/code/addons/civic-action/commands/civic-action.mjs');
    return (await import(pathToFileURL(installed).href)).default;
  }
}

const civicAction = await loadCivicAction();
const result = await civicAction(process.argv.slice(2), { cwd: process.cwd(), subcommand: 'source-gate' });
process.stdout.write(`${result.message}\n`);
process.exitCode = result.exitCode;
