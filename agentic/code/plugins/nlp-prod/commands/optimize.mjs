import fs from 'node:fs/promises';
import path from 'node:path';
import { positionals, requirePipeline, result } from './shared.mjs';

export default async function optimizePipeline(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return result(0, 'Usage: aiwg nlp optimize <pipeline-dir>');
  }
  const [pipelineArg] = positionals(args, ['--volume']);
  if (!pipelineArg) return result(1, 'Usage: aiwg nlp optimize <pipeline-dir>');
  const pipeline = await requirePipeline(context.cwd, pipelineArg);
  const config = await fs.readFile(path.join(pipeline, 'pipeline.config.yaml'), 'utf8');
  const recommendations = [
    !/cache_prefix:\s*true/.test(config) && 'review stable-prefix caching',
    /model:\s*(?:sonnet|opus)/i.test(config) && 'eval a lower-cost model tier',
  ].filter(Boolean);
  return result(
    0,
    recommendations.length
      ? `Optimization opportunities: ${recommendations.join('; ')}.`
      : 'No static optimization opportunities detected.',
  );
}
