import fs from 'node:fs/promises';
import path from 'node:path';
import { countJsonLines, positionals, requirePipeline, result } from './shared.mjs';

export default async function productionize(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return result(0, 'Usage: aiwg nlp productionize <pipeline-dir> [--dry-run]');
  }
  const [pipelineArg] = positionals(args);
  if (!pipelineArg) return result(1, 'Usage: aiwg nlp productionize <pipeline-dir> [--dry-run]');
  const pipeline = await requirePipeline(context.cwd, pipelineArg);
  const checks = {
    evaluator: await fs.access(path.join(pipeline, 'prompts', 'evaluator.prompt.md')).then(() => true).catch(() => false),
    cases: await countJsonLines(path.join(pipeline, 'eval', 'cases.jsonl')),
    costModel: await fs.access(path.join(pipeline, 'cost-model.yaml')).then(() => true).catch(() => false),
  };
  const ready = checks.evaluator && checks.cases >= 5 && checks.costModel;
  return result(
    ready ? 0 : 1,
    `Production readiness: ${ready ? 'ready' : 'not ready'} (evaluator=${checks.evaluator}, cases=${checks.cases}, cost-model=${checks.costModel}).`,
  );
}
