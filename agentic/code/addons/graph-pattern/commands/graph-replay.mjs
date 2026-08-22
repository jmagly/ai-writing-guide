import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { assessGraphReplay } from '../lib/runtime.mjs';

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
export default async function graphReplay(args, context) {
  const graph = args.find((arg, index) => !arg.startsWith('-') && args[index - 1] !== '--from-checkpoint' && !['json', 'human'].includes(arg));
  const checkpoint = option(args, '--from-checkpoint');
  if (!graph || !checkpoint || args.includes('--help') || args.includes('-h')) return { exitCode: graph && checkpoint ? 0 : 2, message: 'Usage: aiwg graph replay <graph.yaml|json> --from-checkpoint <checkpoint.json>' };
  try {
    const manifest = parseYaml(await fs.readFile(path.resolve(context.cwd, graph), 'utf8'));
    const saved = JSON.parse(await fs.readFile(path.resolve(context.cwd, checkpoint), 'utf8'));
    const report = assessGraphReplay(manifest, saved);
    return { exitCode: report.replayable ? 0 : 1, message: JSON.stringify(report, null, 2) };
  } catch (error) {
    return { exitCode: 1, message: JSON.stringify({ schemaVersion: 'graph.flow.aiwg.io/v1', kind: 'GraphReplayAssessment', replayable: false, reasons: [error.message] }, null, 2) };
  }
}
