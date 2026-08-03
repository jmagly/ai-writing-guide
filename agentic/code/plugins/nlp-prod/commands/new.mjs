import path from 'node:path';
import { copyPattern, option, pipelinePath, positionals, result } from './shared.mjs';

export default async function newPipeline(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return result(0, 'Usage: aiwg nlp new <name-or-path> [--pattern PATTERN]');
  }
  const [requested] = positionals(args, ['--pattern', '--language', '--volume']);
  if (!requested) return result(1, 'Usage: aiwg nlp new <name-or-path> [--pattern PATTERN]');
  const relative = requested.includes('/') ? requested : path.join('pipelines', requested);
  const destination = pipelinePath(context.cwd, relative);
  const pattern = option(args, '--pattern', 'simple-chain');
  await copyPattern(pattern, destination);
  return result(0, `Created ${pattern} pipeline at ${path.relative(context.cwd, destination)}/`);
}
