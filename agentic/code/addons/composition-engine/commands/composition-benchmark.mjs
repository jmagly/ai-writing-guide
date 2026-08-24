import fs from 'node:fs/promises';
import path from 'node:path';
import { runCompositionBenchmark, formatBenchmarkMarkdown } from '../lib/evaluation-harness.mjs';

const VALUE_OPTIONS = new Set(['--format', '--raw-out', '--summary-out']);

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function positional(args) {
  const result = [];
  for (let index = 0; index < args.length; index += 1) {
    if (VALUE_OPTIONS.has(args[index])) {
      index += 1;
      continue;
    }
    if (!args[index].startsWith('-')) result.push(args[index]);
  }
  return result;
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(temporary, file);
}

export default async function compositionBenchmark(args, context) {
  if (args.includes('--help') || args.includes('-h')) {
    return {
      exitCode: report.summary.measurement_valid ? 0 : 1,
      message: [
        'Usage: aiwg composition benchmark <benchmark.json> [options]',
        '',
        'Options:',
        '  --format json|markdown    Summary output format (default: json)',
        '  --raw-out <file.json>     Write deterministic machine-readable raw records',
        '  --summary-out <file.json> Write deterministic machine-readable summary',
        '',
        'Synthetic-conformance fixtures validate the harness only; they cannot open the empirical claim gate.',
      ].join('\n'),
    };
  }
  const [manifestArg] = positional(args);
  if (!manifestArg) return { exitCode: 2, message: 'Missing benchmark manifest path. Run with --help for usage.' };
  const format = option(args, '--format', 'json');
  if (!['json', 'markdown'].includes(format)) return { exitCode: 2, message: '--format must be json or markdown.' };
  try {
    const manifest = JSON.parse(await fs.readFile(path.resolve(context.cwd, manifestArg), 'utf8'));
    const report = runCompositionBenchmark(manifest);
    const rawOut = option(args, '--raw-out');
    const summaryOut = option(args, '--summary-out');
    if (rawOut) await writeJson(path.resolve(context.cwd, rawOut), report.raw);
    if (summaryOut) await writeJson(path.resolve(context.cwd, summaryOut), report.summary);
    return {
      exitCode: 0,
      message: format === 'markdown' ? formatBenchmarkMarkdown(report.summary) : JSON.stringify(report.summary, null, 2),
    };
  } catch (error) {
    return { exitCode: 1, message: `COMPOSITION_BENCHMARK_FAILED: ${error instanceof Error ? error.message : String(error)}` };
  }
}
