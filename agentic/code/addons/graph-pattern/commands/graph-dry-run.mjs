import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { dryRunGraphPlaybook } from '../lib/runtime.mjs';

export default async function graphDryRun(args, context) {
  const input = args.find((arg) => !arg.startsWith('-') && !['json', 'human'].includes(arg));
  if (!input || args.includes('--help') || args.includes('-h')) return { exitCode: input ? 0 : 2, message: 'Usage: aiwg graph dry-run <graph.yaml|json> [--format human|json]' };
  try {
    const manifest = parseYaml(await fs.readFile(path.resolve(context.cwd, input), 'utf8'));
    const report = dryRunGraphPlaybook(manifest);
    const human = `Graph dry-run ${report.graphId}: runnable [${report.runnableNodeIds.join(', ')}], ${report.nodes.length} nodes, ${report.routes.length} routes; side effects executed: no`;
    return { exitCode: 0, message: args.includes('human') ? human : JSON.stringify(report, null, 2) };
  } catch (error) {
    return { exitCode: 1, message: JSON.stringify({ schemaVersion: 'graph.flow.aiwg.io/v1', kind: 'GraphDryRunReport', valid: false, code: error.code ?? 'DRY_RUN_FAILED', message: error.message, diagnostics: error.details?.diagnostics ?? [] }, null, 2) };
  }
}
