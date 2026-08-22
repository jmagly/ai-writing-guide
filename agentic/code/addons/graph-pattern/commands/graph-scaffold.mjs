import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templates = new Set(['loop-with-approval', 'screen-fanout-synthesize', 'sandbox-task-with-retry']);

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

export default async function graphScaffold(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return { exitCode: 0, message: 'Usage: aiwg graph scaffold <graph-id> [--template screen-fanout-synthesize] [--out .aiwg/workflow/graph/<graph-id>]' };
  }
  const graphId = args.find((arg, index) => !arg.startsWith('-') && !['--template', '--out'].includes(args[index - 1]));
  if (!graphId || !/^[a-z][a-z0-9-]*$/.test(graphId)) return { exitCode: 2, message: 'graph-id must be a lowercase DNS-style identifier.' };
  const template = option(args, '--template', 'screen-fanout-synthesize');
  if (!templates.has(template)) return { exitCode: 2, message: `Unknown template '${template}'. Available: ${[...templates].join(', ')}` };
  const output = path.resolve(context.cwd, option(args, '--out', `.aiwg/workflow/graph/${graphId}`));
  const graphFile = path.join(output, 'graph.json');
  try {
    await fs.access(output);
    return { exitCode: 1, message: `Refusing to overwrite existing path: ${output}` };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const manifest = JSON.parse(await fs.readFile(path.join(addonRoot, 'fixtures', `${template}.json`), 'utf8'));
  manifest.metadata.name = graphId;
  manifest.metadata.graphId = graphId;
  manifest.metadata.graphVersion = '0.1.0';
  manifest.spec.stateSchema = './state.schema.json';
  const stateSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: `${graphId} state`,
    type: 'object',
    properties: Object.fromEntries((manifest.spec.state.fields ?? []).map((field) => [field.name, field.schema])),
    additionalProperties: false,
  };
  await fs.mkdir(output, { recursive: true });
  await Promise.all([
    fs.writeFile(graphFile, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' }),
    fs.writeFile(path.join(output, 'state.schema.json'), `${JSON.stringify(stateSchema, null, 2)}\n`, { flag: 'wx' }),
  ]);
  return { exitCode: 0, message: `Created ${path.relative(context.cwd, graphFile)} and state.schema.json from '${template}'.` };
}
