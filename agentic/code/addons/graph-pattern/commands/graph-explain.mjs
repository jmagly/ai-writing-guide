import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { validateGraphPlaybook } from '../lib/validator.mjs';

export default async function graphExplain(args, context) {
  const input = args.find((arg) => !arg.startsWith('-'));
  if (!input || args.includes('--help') || args.includes('-h')) return { exitCode: input ? 0 : 2, message: 'Usage: aiwg graph explain <graph.yaml|json> [--format human|json]' };
  const manifest = parseYaml(await fs.readFile(path.resolve(context.cwd, input), 'utf8'));
  const validation = validateGraphPlaybook(manifest);
  if (!validation.valid) return { exitCode: 1, message: JSON.stringify(validation, null, 2) };
  const report = {
    schemaVersion: 'graph.flow.aiwg.io/v1',
    kind: 'GraphPlaybookExplanation',
    graph: validation.normalized.identity,
    runnable: [...manifest.spec.entry].sort(),
    nodes: manifest.spec.nodes.map((node) => ({ id: node.id, runtimeBinding: node.runtimeBinding, sideEffectMode: node.sideEffectMode, retry: node.retry ?? null, hitl: node.hitl ?? null })),
    routes: manifest.spec.routes.map((route) => ({ id: route.id, from: route.from, to: route.to, predicate: route.when ?? null, guard: route.guard ?? null, maxIterations: route.maxIterations ?? null, evidenceField: route.evidenceField, onFailure: route.onFailure })),
    joins: manifest.spec.joins,
    checkpoint: manifest.spec.checkpoint,
  };
  return { exitCode: 0, message: args.includes('--format') && args[args.indexOf('--format') + 1] === 'human' ? `Graph ${report.graph.graphId}: ${report.nodes.length} nodes, ${report.routes.length} routes, ${report.joins.length} joins; runnable: ${report.runnable.join(', ')}` : JSON.stringify(report, null, 2) };
}
