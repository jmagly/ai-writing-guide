import path from 'node:path';
import { findPipelines, result } from './shared.mjs';

export default async function pipelineStatus(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return result(0, 'Usage: aiwg nlp status [--json]');
  }
  const pipelines = await findPipelines(context.cwd);
  const relative = pipelines.map(pipeline => path.relative(context.cwd, pipeline));
  if (args.includes('--json')) console.log(JSON.stringify({ pipelines: relative }, null, 2));
  else if (relative.length > 0) console.log(relative.join('\n'));
  return result(0, `Found ${relative.length} pipeline(s).`);
}
