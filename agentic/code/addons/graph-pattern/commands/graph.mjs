import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { validateGraphPlaybook } from '../lib/validator.mjs';

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function manifestArg(args) {
  const valueOptions = new Set(['--format']);
  for (let index = 0; index < args.length; index += 1) {
    if (valueOptions.has(args[index])) { index += 1; continue; }
    if (!args[index].startsWith('-')) return args[index];
  }
  return undefined;
}

function human(report, file) {
  if (report.valid) return `Valid GraphPlaybook: ${report.normalized.identity.graphId} (${report.normalized.identity.nodeIds.length} nodes, ${report.normalized.identity.edgeIds.length} edges)\nBase Flow validation: passed`;
  return [`Invalid GraphPlaybook: ${file}`, `${report.diagnostics.length} diagnostic(s)`, ...report.diagnostics.flatMap((item) => [`- [${item.code}] ${item.path}: ${item.message}`, ...(item.hint ? [`  hint: ${item.hint}`] : [])])].join('\n');
}

export default async function graphValidate(args, context) {
  if (args.includes('--help') || args.includes('-h')) return { exitCode: 0, message: 'Usage: aiwg graph validate <graph.yaml|json> [--format human|json]' };
  const input = manifestArg(args);
  if (!input) return { exitCode: 2, message: 'Missing GraphPlaybook path. Run with --help for usage.' };
  const format = option(args, '--format', 'human');
  if (!['human', 'json'].includes(format)) return { exitCode: 2, message: '--format must be human or json.' };
  const file = path.resolve(context.cwd, input);
  try {
    const manifest = parseYaml(await fs.readFile(file, 'utf8'));
    const report = validateGraphPlaybook(manifest);
    return { exitCode: report.valid ? 0 : 1, message: format === 'json' ? JSON.stringify(report, null, 2) : human(report, file) };
  } catch (error) {
    const report = { schemaVersion: 'graph.flow.aiwg.io/v1', kind: 'GraphPlaybookValidationReport', valid: false, diagnostics: [{ code: 'MANIFEST_READ_FAILED', severity: 'error', path: '/', message: error instanceof Error ? error.message : String(error) }] };
    return { exitCode: 1, message: format === 'json' ? JSON.stringify(report, null, 2) : human(report, file) };
  }
}
