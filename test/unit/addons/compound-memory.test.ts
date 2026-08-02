import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  compoundMemoryStatus,
  default as compoundMemoryCommand,
} from '../../../agentic/code/addons/compound-memory/commands/compound-memory.mjs';

let projectDir: string;
let frameworkRoot: string;

beforeEach(async () => {
  projectDir = await mkdtemp(path.join(os.tmpdir(), 'aiwg-compound-memory-'));
  frameworkRoot = await mkdtemp(path.join(os.tmpdir(), 'aiwg-compound-framework-'));
  for (const id of ['aiwg-utils', 'semantic-memory', 'llm-wiki', 'line-memory']) {
    const dir = path.join(frameworkRoot, 'agentic/code/addons', id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'manifest.json'), JSON.stringify({ id }));
  }
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(projectDir, { recursive: true, force: true });
  await rm(frameworkRoot, { recursive: true, force: true });
});

describe('compound-memory status', () => {
  it('reports an empty but ready bounded memory workspace', async () => {
    const report = await compoundMemoryStatus(projectDir, frameworkRoot);
    expect(report).toMatchObject({
      schemaVersion: 'aiwg.compound-memory.status.v1',
      status: 'ready',
      lineMemory: { initialized: false, facts: 0, integrity: 'ok' },
      wiki: { initialized: false, indexPresent: false, stale: false },
      review: { status: 'query-required' },
      integrityFailures: [],
    });
    expect(report.wiki.scan.filesVisited).toBeLessThanOrEqual(1000);
  });

  it('reports missing dependencies, corrupt sidecars, and stale wiki indexes', async () => {
    await rm(path.join(frameworkRoot, 'agentic/code/addons/llm-wiki'), {
      recursive: true, force: true,
    });
    await mkdir(path.join(projectDir, '.aiwg/memory'), { recursive: true });
    await writeFile(path.join(projectDir, '.aiwg/memory/line-memory.txt'), 'fact\n');
    await writeFile(path.join(projectDir, '.aiwg/memory/line-memory.meta.json'), '{broken');
    await mkdir(path.join(projectDir, '.aiwg/wiki/concepts'), { recursive: true });
    await writeFile(path.join(projectDir, '.aiwg/wiki/concepts/fact.md'), '# Fact\n');

    const report = await compoundMemoryStatus(projectDir, frameworkRoot);
    expect(report).toMatchObject({
      status: 'degraded',
      lineMemory: { integrity: 'invalid', detail: 'metadata is not valid JSON' },
      wiki: { initialized: true, indexPresent: false, stale: true },
      integrityFailures: [{ component: 'line-memory' }],
    });
    expect(report.dependencies.find(item => item.id === 'llm-wiki')?.available).toBe(false);
    expect(report.nextActions).toContain('aiwg use compound-memory');
  });

  it('emits the versioned JSON status contract', async () => {
    const output: string[] = [];
    vi.spyOn(console, 'log').mockImplementation(value => output.push(String(value)));
    const result = await compoundMemoryCommand(['--json'], {
      cwd: projectDir,
      frameworkRoot,
      namespace: 'compound-memory',
      subcommand: 'status',
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(output.join('\n'))).toMatchObject({
      schemaVersion: 'aiwg.compound-memory.status.v1', status: 'ready',
    });
  });
});
