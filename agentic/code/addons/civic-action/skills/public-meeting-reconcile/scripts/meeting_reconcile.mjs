#!/usr/bin/env node
import civicAction from '../../../commands/civic-action.mjs';
const result = await civicAction(process.argv.slice(2), { cwd: process.cwd(), subcommand: 'meeting-gate' });
process.stdout.write(`${result.message}\n`);
process.exitCode = result.exitCode;
