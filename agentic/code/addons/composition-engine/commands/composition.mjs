import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { validateFlowGraph } from '../lib/validator.mjs';

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function optionMissingValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 && (!args[index + 1] || args[index + 1].startsWith('-'));
}

function positional(args) {
  const valueOptions = new Set(['--format', '--catalog']);
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (valueOptions.has(args[index])) {
      index += 1;
      continue;
    }
    if (!args[index].startsWith('-')) values.push(args[index]);
  }
  return values;
}

function catalogIds(value) {
  if (Array.isArray(value)) {
    return new Set(value.map((entry) => typeof entry === 'string' ? entry : entry?.id).filter(Boolean));
  }
  const entries = value?.artifacts ?? value?.results ?? value?.candidates;
  if (!Array.isArray(entries)) throw new Error('Catalog must be an array or contain artifacts[], results[], or candidates[].');
  return new Set(entries.map((entry) => typeof entry === 'string' ? entry : entry?.id).filter(Boolean));
}

function formatHuman(report, file) {
  if (report.valid) {
    const graph = report.normalized.source.graphId;
    const nodes = report.normalized.graph.spec.nodes.length;
    return `Valid FlowGraph: ${graph} (${nodes} nodes)\nNormalized contract: ${report.normalized.contractVersion}`;
  }
  const lines = [`Invalid FlowGraph: ${file}`, `${report.diagnostics.length} diagnostic(s)`];
  for (const item of report.diagnostics) {
    lines.push(`- [${item.code}] ${item.path}: ${item.message}`);
    if (item.hint) lines.push(`  hint: ${item.hint}`);
  }
  return lines.join('\n');
}

export default async function compositionValidate(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return {
      exitCode: 0,
      message: [
        'Usage: aiwg composition validate <manifest.yaml|json> [--format human|json] [--catalog <index.json>]',
        '',
        'The optional catalog proves authorized candidate IDs against an external AIWG index export.',
        'JSON output is a stable FlowGraphValidationReport and includes the normalized provider-neutral graph when valid.',
        '',
        `Installed schema: ${path.join(addonRoot, 'schemas', 'flow-graph.schema.json')}`,
        `Valid fixtures: ${path.join(addonRoot, 'fixtures')}`,
        `Examples: ${path.join(addonRoot, 'examples')}`,
        'Print or copy a known-valid starter with: aiwg composition example linear-flow',
      ].join('\n'),
    };
  }

  if (optionMissingValue(args, '--catalog')) return { exitCode: 2, message: '--catalog requires a path.' };

  const [manifestArg] = positional(args);
  if (!manifestArg) return { exitCode: 2, message: 'Missing FlowGraph manifest path. Run with --help for usage.' };
  const manifestPath = path.resolve(context.cwd, manifestArg);
  const format = option(args, '--format', 'human');
  if (!['human', 'json'].includes(format)) return { exitCode: 2, message: '--format must be human or json.' };

  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    const manifest = parseYaml(raw);
    const catalogArg = option(args, '--catalog');
    let ids;
    if (catalogArg) {
      const catalog = JSON.parse(await fs.readFile(path.resolve(context.cwd, catalogArg), 'utf8'));
      ids = catalogIds(catalog);
    }
    const report = validateFlowGraph(manifest, { catalogIds: ids });
    return {
      exitCode: report.valid ? 0 : 1,
      message: format === 'json' ? JSON.stringify(report, null, 2) : formatHuman(report, manifestPath),
    };
  } catch (error) {
    const report = {
      schemaVersion: 'flow.aiwg.io/v1alpha1',
      kind: 'FlowGraphValidationReport',
      valid: false,
      diagnostics: [{
        code: 'MANIFEST_READ_FAILED',
        severity: 'error',
        path: '/',
        message: error instanceof Error ? error.message : String(error),
      }],
    };
    return {
      exitCode: 1,
      message: format === 'json' ? JSON.stringify(report, null, 2) : formatHuman(report, manifestPath),
    };
  }
}
