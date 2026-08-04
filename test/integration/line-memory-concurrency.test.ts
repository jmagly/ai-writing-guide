import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const execute = promisify(execFile);
const moduleUrl = pathToFileURL(path.resolve(
  __dirname,
  '../../agentic/code/addons/line-memory/commands/line-memory.mjs',
)).href;

let projectDir: string;

async function runFromProcess(subcommand: string, args: string[]): Promise<void> {
  const script = [
    `import { runLineMemory } from ${JSON.stringify(moduleUrl)};`,
    `const result = await runLineMemory(${JSON.stringify(subcommand)}, ${JSON.stringify(args)}, ${JSON.stringify(projectDir)});`,
    'if (result.exitCode !== 0) { console.error(result.message); process.exit(result.exitCode); }',
  ].join('\n');
  await execute(process.execPath, ['--input-type=module', '--eval', script], {
    timeout: 15_000,
  });
}

async function addFromProcess(value: string): Promise<void> {
  await runFromProcess('add', [value]);
}

async function batchTouchFromProcess(values: string[]): Promise<void> {
  const script = [
    `import { loadConfig, touchMemoryValues } from ${JSON.stringify(moduleUrl)};`,
    `const { config } = await loadConfig(${JSON.stringify(projectDir)}, { warn: false });`,
    `await touchMemoryValues(${JSON.stringify(values)}, ${JSON.stringify(projectDir)}, config);`,
  ].join('\n');
  await execute(process.execPath, ['--input-type=module', '--eval', script], { timeout: 15_000 });
}

beforeEach(async () => {
  projectDir = await mkdtemp(path.join(os.tmpdir(), 'aiwg-line-memory-processes-'));
});

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true });
});

describe('line-memory process concurrency', () => {
  it('retains every unrelated fact across parallel processes', async () => {
    const facts = Array.from({ length: 12 }, (_, index) => `parallel fact ${index}`);
    await Promise.all(facts.map(addFromProcess));

    const text = await readFile(
      path.join(projectDir, '.aiwg/memory/line-memory.txt'),
      'utf8',
    );
    const retained = text.trim().split('\n');
    expect(retained).toHaveLength(facts.length);
    expect(new Set(retained)).toEqual(new Set(facts));

    const metadata = JSON.parse(await readFile(
      path.join(projectDir, '.aiwg/memory/line-memory.meta.json'),
      'utf8',
    ));
    const active = Object.values(metadata.entries)
      .filter((entry: any) => entry.status === 'active');
    expect(active).toHaveLength(facts.length);
    expect(new Set(active.map((entry: any) => entry.value))).toEqual(new Set(facts));
  });

  it('deduplicates the same fact across parallel processes', async () => {
    await Promise.all(Array.from({ length: 8 }, () => addFromProcess('shared fact')));
    const text = await readFile(
      path.join(projectDir, '.aiwg/memory/line-memory.txt'),
      'utf8',
    );
    expect(text).toBe('shared fact\n');
  });

  it('serializes mixed add, search, touch, and prune operations without losing facts', async () => {
    const initial = Array.from({ length: 8 }, (_, index) => `initial fact ${index}`);
    for (const fact of initial) await addFromProcess(fact);
    const added = Array.from({ length: 4 }, (_, index) => `added fact ${index}`);

    await Promise.all([
      ...added.map(addFromProcess),
      runFromProcess('search', ['initial', '--limit', '3', '--no-touch']),
      runFromProcess('search', ['fact', '--limit', '4']),
      runFromProcess('touch', ['initial fact 0']),
      runFromProcess('prune', []),
    ]);

    const text = await readFile(
      path.join(projectDir, '.aiwg/memory/line-memory.txt'),
      'utf8',
    );
    const retained = text.trim().split('\n');
    expect(retained).toHaveLength(initial.length + added.length);
    expect(new Set(retained)).toEqual(new Set([...initial, ...added]));
  });

  it('serializes context-pack batch touches with concurrent writers', async () => {
    const initial = Array.from({ length: 8 }, (_, index) => `context fact ${index}`);
    for (const fact of initial) await addFromProcess(fact);
    const added = Array.from({ length: 6 }, (_, index) => `concurrent fact ${index}`);

    await Promise.all([
      ...added.map(addFromProcess),
      ...Array.from({ length: 6 }, () => batchTouchFromProcess(initial.slice(0, 4))),
    ]);

    const text = await readFile(path.join(projectDir, '.aiwg/memory/line-memory.txt'), 'utf8');
    expect(new Set(text.trim().split('\n'))).toEqual(new Set([...initial, ...added]));
  });
});
