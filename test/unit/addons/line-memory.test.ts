import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  DEFAULT_CONFIG,
  runLineMemory,
} from '../../../agentic/code/addons/line-memory/commands/line-memory.mjs';

let projectDir: string;
let output: string[];
let errors: string[];

async function memoryText(): Promise<string> {
  return readFile(path.join(projectDir, DEFAULT_CONFIG.path), 'utf8');
}

beforeEach(async () => {
  projectDir = await mkdtemp(path.join(os.tmpdir(), 'aiwg-line-memory-'));
  output = [];
  errors = [];
  vi.spyOn(console, 'log').mockImplementation((...args) => output.push(args.join(' ')));
  vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.join(' ')));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(projectDir, { recursive: true, force: true });
});

describe('line-memory commands', () => {
  it('adds one normalized memory per line and deduplicates by refreshing recency', async () => {
    expect((await runLineMemory('add', ['first', 'fact'], projectDir)).exitCode).toBe(0);
    expect((await runLineMemory('add', ['second fact'], projectDir)).exitCode).toBe(0);
    expect((await runLineMemory('add', ['first fact'], projectDir)).exitCode).toBe(0);

    expect(await memoryText()).toBe('second fact\nfirst fact\n');
  });

  it('normalizes embedded newlines so one added memory remains one physical line', async () => {
    const result = await runLineMemory('add', ['first line\nsecond line'], projectDir);

    expect(result.exitCode).toBe(0);
    expect(await memoryText()).toBe('first line second line\n');
  });

  it('honors maxLines and prunes oldest memories first', async () => {
    await runLineMemory('config', ['set', 'maxLines', '2'], projectDir);
    await runLineMemory('add', ['oldest'], projectDir);
    await runLineMemory('add', ['middle'], projectDir);
    await runLineMemory('add', ['newest'], projectDir);

    expect(await memoryText()).toBe('middle\nnewest\n');
  });

  it('lists a bounded newest-first slice without loading all entries into output', async () => {
    for (const value of ['one', 'two', 'three', 'four']) {
      await runLineMemory('add', [value], projectDir);
    }
    output.length = 0;

    const result = await runLineMemory('list', ['--limit', '2'], projectDir);

    expect(result.exitCode).toBe(0);
    expect(output).toEqual(['four\nthree']);
    expect(output.join('\n')).not.toContain('one');
    expect(output.join('\n')).not.toContain('two');
  });

  it('searches case-insensitively, bounds results, and refreshes matches', async () => {
    for (const value of ['Alpha old', 'other', 'alpha new', 'tail']) {
      await runLineMemory('add', [value], projectDir);
    }
    output.length = 0;

    const result = await runLineMemory('search', ['ALPHA', '--limit', '2'], projectDir);

    expect(result.exitCode).toBe(0);
    expect(output).toEqual(['alpha new\nAlpha old']);
    expect(await memoryText()).toBe('other\ntail\nAlpha old\nalpha new\n');
  });

  it('keeps a frequently referenced old memory when later pruning removes stale entries', async () => {
    for (const value of ['frequent', 'stale', 'newer']) {
      await runLineMemory('add', [value], projectDir);
    }
    await runLineMemory('search', ['frequent', '--limit', '1'], projectDir);
    await runLineMemory('config', ['set', 'maxLines', '2'], projectDir);

    expect(await memoryText()).toBe('newer\nfrequent\n');
  });

  it('touches the oldest exact duplicate when dedupe is disabled', async () => {
    await runLineMemory('config', ['set', 'dedupe', 'false'], projectDir);
    await runLineMemory('add', ['repeat'], projectDir);
    await runLineMemory('add', ['middle'], projectDir);
    await runLineMemory('add', ['repeat'], projectDir);

    const result = await runLineMemory('touch', ['repeat'], projectDir);

    expect(result.exitCode).toBe(0);
    expect(await memoryText()).toBe('middle\nrepeat\nrepeat\n');
  });

  it('prunes externally added lines and trims blank lines by default', async () => {
    const memoryPath = path.join(projectDir, DEFAULT_CONFIG.path);
    await mkdir(path.dirname(memoryPath), { recursive: true });
    await writeFile(memoryPath, 'oldest\n\nmiddle\nnewest\n');
    await runLineMemory('config', ['set', 'maxLines', '2'], projectDir);

    const result = await runLineMemory('prune', [], projectDir);

    expect(result.exitCode).toBe(0);
    expect(await memoryText()).toBe('middle\nnewest\n');
  });

  it('preserves blank lines when configured while counting only memory lines', async () => {
    await runLineMemory('config', ['set', 'trimBlankLines', 'false'], projectDir);
    const memoryPath = path.join(projectDir, DEFAULT_CONFIG.path);
    await mkdir(path.dirname(memoryPath), { recursive: true });
    await writeFile(memoryPath, 'one\n\ntwo\n');

    await runLineMemory('add', ['three'], projectDir);

    expect(await memoryText()).toBe('one\n\ntwo\nthree\n');
  });

  it('recovers from missing and corrupt config and config set repairs it', async () => {
    const missing = await runLineMemory('add', ['works with defaults'], projectDir);
    expect(missing.exitCode).toBe(0);

    const configPath = path.join(projectDir, '.aiwg/memory/line-memory.config.json');
    await writeFile(configPath, '{broken json');
    const recovered = await runLineMemory('add', ['still works'], projectDir);
    expect(recovered.exitCode).toBe(0);
    expect(errors.join('\n')).toContain('using safe defaults');

    const repaired = await runLineMemory('config', ['set', 'maxLines', '7'], projectDir);
    expect(repaired.exitCode).toBe(0);
    expect(JSON.parse(await readFile(configPath, 'utf8')).maxLines).toBe(7);
  });

  it('gets individual config values and the complete effective config', async () => {
    await runLineMemory('config', ['set', 'maxLines', '17'], projectDir);
    output.length = 0;

    expect((await runLineMemory('config', ['get', 'maxLines'], projectDir)).exitCode).toBe(0);
    expect(output).toEqual(['17']);
    output.length = 0;

    expect((await runLineMemory('config', ['get'], projectDir)).exitCode).toBe(0);
    expect(JSON.parse(output.join('\n'))).toMatchObject({ maxLines: 17, dedupe: true });
  });

  it('rejects memory paths that escape the project', async () => {
    const result = await runLineMemory('config', ['set', 'path', '../../outside.txt'], projectDir);

    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('inside the project');
  });
});
