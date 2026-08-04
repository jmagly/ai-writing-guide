import fs from 'node:fs/promises';
import path from 'node:path';
import { countJsonLines, option, positionals, requirePipeline, result } from './shared.mjs';

export default async function evaluatePipeline(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return result(0, 'Usage: aiwg nlp eval <pipeline-dir> [--cases PATH] [--threshold N]');
  }
  const [pipelineArg] = positionals(args, ['--cases', '--threshold', '--max-attempts']);
  if (!pipelineArg) return result(1, 'Usage: aiwg nlp eval <pipeline-dir>');
  const pipeline = await requirePipeline(context.cwd, pipelineArg);
  const cases = option(args, '--cases', path.join(pipeline, 'eval', 'cases.jsonl'));
  const casesPath = path.isAbsolute(cases) ? cases : path.resolve(context.cwd, cases);
  const count = await countJsonLines(casesPath);
  const evaluator = path.join(pipeline, 'prompts', 'evaluator.prompt.md');
  const isolated = await fs.access(evaluator).then(() => true).catch(() => false);
  return result(
    isolated && count > 0 ? 0 : 1,
    `Eval preflight: ${count} case(s); evaluator prompt ${isolated ? 'present' : 'missing'}.`,
  );
}
