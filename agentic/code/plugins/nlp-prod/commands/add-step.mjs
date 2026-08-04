import fs from 'node:fs/promises';
import path from 'node:path';
import { positionals, requirePipeline, result } from './shared.mjs';

export default async function addStep(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return result(0, 'Usage: aiwg nlp add-step <pipeline-dir> <step-name>');
  }
  const [pipelineArg, step] = positionals(args);
  if (!pipelineArg || !step || !/^[a-z0-9][a-z0-9-]*$/.test(step)) {
    return result(1, 'Usage: aiwg nlp add-step <pipeline-dir> <step-name>');
  }
  const pipeline = await requirePipeline(context.cwd, pipelineArg);
  const prompt = path.join(pipeline, 'prompts', `${step}.prompt.md`);
  await fs.mkdir(path.dirname(prompt), { recursive: true });
  try {
    await fs.writeFile(
      prompt,
      `---\nversion: 1.0.0\nstep: ${step}\n---\n\n## System\n\nDefine the ${step} step.\n\n## User\n\n{{input}}\n`,
      { encoding: 'utf8', flag: 'wx' },
    );
  } catch (error) {
    if (error?.code === 'EEXIST') return result(1, `Step already exists: prompts/${step}.prompt.md`);
    throw error;
  }
  return result(0, `Added step prompt: ${path.relative(context.cwd, prompt)}`);
}
