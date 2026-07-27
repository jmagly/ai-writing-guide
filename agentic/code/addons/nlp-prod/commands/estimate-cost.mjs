import fs from 'node:fs/promises';
import path from 'node:path';
import { option, positionals, requirePipeline, result } from './shared.mjs';

export default async function estimateCost(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return result(0, 'Usage: aiwg nlp estimate-cost <pipeline-dir> [--volume N]');
  }
  const [pipelineArg] = positionals(args, ['--volume']);
  if (!pipelineArg) return result(1, 'Usage: aiwg nlp estimate-cost <pipeline-dir> [--volume N]');
  const pipeline = await requirePipeline(context.cwd, pipelineArg);
  const volumeRaw = option(args, '--volume', '100000');
  if (!/^\d+$/.test(volumeRaw)) return result(1, '--volume must be a non-negative integer.');
  const volume = Number(volumeRaw);
  const promptDir = path.join(pipeline, 'prompts');
  const promptFiles = await fs.readdir(promptDir).catch(() => []);
  const estimatedCalls = Math.max(1, promptFiles.filter(name => name.endsWith('.md')).length - 1);
  const costPerCall = estimatedCalls * 0.0001;
  return result(
    0,
    `Estimated cost: $${costPerCall.toFixed(6)}/call; $${(costPerCall * volume).toFixed(2)} at ${volume} calls.`,
  );
}
