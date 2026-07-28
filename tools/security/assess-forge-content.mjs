#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { assessThreat, formatThreatAssessment } from './threat-assessment.mjs';

function parseArgs(argv) {
  const options = { input: '', config: '', format: 'json' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--input') options.input = argv[++index] ?? '';
    else if (argv[index] === '--config') options.config = argv[++index] ?? '';
    else if (argv[index] === '--format') options.format = argv[++index] ?? 'json';
    else if (argv[index] === '--help' || argv[index] === '-h') {
      console.log('Usage: assess-forge-content.mjs [--input <json>] [--config <aiwg.config>] [--format json|markdown]');
      process.exit(0);
    }
  }
  return options;
}

function readJson(file, fallbackStdin = false) {
  const content = file
    ? fs.readFileSync(path.resolve(file), 'utf8')
    : fallbackStdin ? fs.readFileSync(0, 'utf8') : '';
  return content ? JSON.parse(content) : undefined;
}

const options = parseArgs(process.argv.slice(2));
try {
  const input = readJson(options.input, true);
  if (!input) throw new Error('A JSON assessment input is required');
  const defaultConfigPath = path.join(process.cwd(), '.aiwg', 'aiwg.config');
  const configPath = options.config || (fs.existsSync(defaultConfigPath) ? defaultConfigPath : '');
  const projectConfig = configPath ? readJson(configPath) : undefined;
  const report = assessThreat(input, projectConfig?.security?.threatAssessment);
  if (options.format === 'markdown') console.log(formatThreatAssessment(report));
  else if (options.format === 'json') console.log(JSON.stringify(report, null, 2));
  else throw new Error(`Unknown format '${options.format}'`);
} catch (error) {
  console.error(`threat-assessment: ${error.message}`);
  process.exitCode = 1;
}
