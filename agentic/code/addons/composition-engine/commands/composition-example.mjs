import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = path.join(addonRoot, 'fixtures');

async function fixtureNames() {
  return (await fs.readdir(fixtureRoot))
    .filter((name) => name.endsWith('.json') && name !== 'empty-catalog.json')
    .map((name) => name.slice(0, -5))
    .sort();
}

export default async function compositionExample(args, context) {
  const names = await fixtureNames();
  if (args.includes('--help') || args.includes('-h')) {
    return {
      exitCode: 0,
      message: [
        'Usage: aiwg composition example [name] [--output <graph.json>]',
        '',
        'Print a shipped, validated FlowGraph fixture or copy it to --output.',
        `Available examples: ${names.join(', ')}`,
        `Installed fixtures: ${fixtureRoot}`,
      ].join('\n'),
    };
  }

  const outputIndex = args.indexOf('--output');
  const outputArg = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
  if (outputIndex >= 0 && !outputArg) return { exitCode: 2, message: '--output requires a path.' };
  const name = args.find((value, index) => !value.startsWith('-') && index !== outputIndex + 1) ?? 'linear-flow';
  if (!names.includes(name)) {
    return { exitCode: 2, message: `Unknown example '${name}'. Available: ${names.join(', ')}` };
  }

  const content = await fs.readFile(path.join(fixtureRoot, `${name}.json`), 'utf8');
  if (!outputArg) return { exitCode: 0, message: content.trimEnd() };
  const outputPath = path.resolve(context.cwd, outputArg);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content);
  return { exitCode: 0, message: `Copied '${name}' to ${outputPath}` };
}
