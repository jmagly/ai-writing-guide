import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { access, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  compoundMemoryStatus,
  default as compoundMemoryCommand,
} from '../../../agentic/code/addons/compound-memory/commands/compound-memory.mjs';

let projectDir: string;
let frameworkRoot: string;

const digest = (value: string) => `sha256:${createHash('sha256').update(value).digest('hex')}`;

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
      schemaVersion: 'aiwg.compound-memory.status.v1',
      status: 'ready',
      review: { pending: 0, status: 'ready', bounded: true },
    });
  });
});

describe('compound-memory output capture', () => {
  it('previews, confirms, and idempotently registers exact output lineage', async () => {
    const repositoryRoot = path.resolve(__dirname, '../../..');
    await mkdir(path.join(projectDir, 'output/reports'), { recursive: true });
    await writeFile(path.join(projectDir, 'output/reports/result.md'), '# Result\n');
    const baseArgs = [
      'output/reports/result.md',
      '--media-type', 'text/markdown',
      '--context-pack-id', 'context-pack:test',
      '--context-pack-digest', digest('bounded context'),
      '--source-ref', 'session:opaque-test',
      '--source-digest', digest('session evidence'),
      '--json',
    ];
    const output: string[] = [];
    vi.spyOn(console, 'log').mockImplementation(value => output.push(String(value)));

    const previewResult = await compoundMemoryCommand(baseArgs, {
      cwd: projectDir,
      frameworkRoot: repositoryRoot,
      namespace: 'compound-memory',
      subcommand: 'capture-output',
    });
    expect(previewResult.exitCode).toBe(0);
    const preview = JSON.parse(output.pop()!);
    expect(preview).toMatchObject({
      status: 'preview',
      mutation: { wouldRegister: true, wouldPromoteKnowledge: false },
    });
    expect(await fileExists(path.join(projectDir, '.aiwg/memory/output-registration'))).toBe(false);

    const confirmed = await compoundMemoryCommand([
      ...baseArgs,
      '--confirm',
      '--operation-id', preview.preview.operationId,
    ], {
      cwd: projectDir,
      frameworkRoot: repositoryRoot,
      namespace: 'compound-memory',
      subcommand: 'capture-output',
    });
    expect(confirmed.exitCode).toBe(0);
    const receipt = JSON.parse(output.pop()!);
    expect(receipt).toMatchObject({
      status: 'ok',
      knowledgePromotion: 'not-performed',
      receipt: { duplicate: false, sourceRefs: ['session:opaque-test'] },
    });

    await compoundMemoryCommand([
      ...baseArgs,
      '--confirm',
      '--operation-id', preview.preview.operationId,
    ], {
      cwd: projectDir,
      frameworkRoot: repositoryRoot,
      namespace: 'compound-memory',
      subcommand: 'capture-output',
    });
    expect(JSON.parse(output.pop()!).receipt.duplicate).toBe(true);
  });
});

describe('compound-memory review and maintenance', () => {
  it('returns an empty bounded review queue without creating a session catalog', async () => {
    const output: string[] = [];
    vi.spyOn(console, 'log').mockImplementation(value => output.push(String(value)));
    const result = await compoundMemoryCommand(['--limit', '10', '--json'], {
      cwd: projectDir,
      frameworkRoot: path.resolve(__dirname, '../../..'),
      namespace: 'compound-memory',
      subcommand: 'review',
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(output.pop()!)).toMatchObject({
      schemaVersion: 'aiwg.compound-memory.review.v1',
      status: 'ready',
      items: [],
      count: 0,
      limit: 10,
      mutation: false,
    });
    expect(await fileExists(path.join(projectDir, '.aiwg/sessions/catalog.sqlite'))).toBe(false);
  });

  it('requires an exact preview and records a restart-safe maintenance receipt', async () => {
    const output: string[] = [];
    vi.spyOn(console, 'log').mockImplementation(value => output.push(String(value)));
    const context = {
      cwd: projectDir,
      frameworkRoot: path.resolve(__dirname, '../../..'),
      namespace: 'compound-memory',
      subcommand: 'maintain',
    };
    const previewResult = await compoundMemoryCommand(['--json'], context);
    expect(previewResult.exitCode).toBe(0);
    const preview = JSON.parse(output.pop()!);
    expect(preview).toMatchObject({
      schemaVersion: 'aiwg.compound-memory.maintenance-preview.v1',
      confirmationRequired: true,
      actions: [expect.objectContaining({ id: 'wiki-index', mode: 'delegated' })],
    });
    expect(await fileExists(path.join(projectDir, '.aiwg/memory/compound-memory'))).toBe(false);

    const stale = await compoundMemoryCommand([
      '--confirm', '--operation-id', digest('wrong'), '--json',
    ], context);
    expect(stale.exitCode).toBe(1);
    expect(JSON.parse(output.pop()!).status).toBe('error');

    const confirmed = await compoundMemoryCommand([
      '--confirm', '--operation-id', preview.operationId, '--json',
    ], context);
    expect(confirmed.exitCode).toBe(0);
    expect(JSON.parse(output.pop()!)).toMatchObject({
      schemaVersion: 'aiwg.compound-memory.maintenance-receipt.v1',
      operationId: preview.operationId,
      duplicate: false,
      results: [expect.objectContaining({ id: 'wiki-index', status: 'deferred' })],
    });

    await compoundMemoryCommand([
      '--confirm', '--operation-id', preview.operationId, '--json',
    ], context);
    expect(JSON.parse(output.pop()!).duplicate).toBe(true);
  });
});

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
