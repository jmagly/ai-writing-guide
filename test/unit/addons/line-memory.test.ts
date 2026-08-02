import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  DEFAULT_CONFIG,
  LineMemoryPromotionDestination,
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

  it('returns stable machine-readable handles and provenance without changing the text contract', async () => {
    const imported = await runLineMemory('import', [
      'Canonical tracker is Gitea',
      '--source-ref', 'wiki:decisions/tracker',
      '--reviewer', 'operator',
      '--reason', 'reviewed decision',
      '--confirm',
      '--json',
    ], projectDir);
    expect(imported.exitCode).toBe(0);
    const created = JSON.parse(output.join('\n'));
    expect(created).toMatchObject({
      schemaVersion: '1.0.0',
      status: 'ok',
      command: 'line-memory.import',
    });
    expect(created.entry.id).toMatch(/^lm_[0-9a-f-]{36}$/);
    expect(created.entry.digest).toMatch(/^sha256:/);
    expect(created.entry.sources).toEqual([
      expect.objectContaining({ ref: 'wiki:decisions/tracker', reviewer: 'operator' }),
    ]);
    expect(await memoryText()).toBe('Canonical tracker is Gitea\n');

    output.length = 0;
    await runLineMemory('search', ['tracker', '--json', '--no-touch'], projectDir);
    const searched = JSON.parse(output.join('\n'));
    expect(searched.entries[0].id).toBe(created.entry.id);
  });

  it('returns schema-stable JSON mutation outcomes across the command surface', async () => {
    await runLineMemory('add', ['one', '--json'], projectDir);
    const added = JSON.parse(output.pop()!);
    expect(added).toMatchObject({
      schemaVersion: '1.0.0', status: 'ok', command: 'line-memory.add',
      operationId: expect.any(String), entry: { recency: 0 },
    });

    await runLineMemory('list', ['--limit', '1', '--no-touch', '--json'], projectDir);
    expect(JSON.parse(output.pop()!)).toMatchObject({
      schemaVersion: '1.0.0', status: 'ok', command: 'line-memory.list',
      entries: [{ id: added.entry.id, recency: 0 }],
    });

    await runLineMemory('touch', ['one', '--json'], projectDir);
    expect(JSON.parse(output.pop()!)).toMatchObject({
      schemaVersion: '1.0.0', status: 'ok', command: 'line-memory.touch',
      operationId: expect.any(String), entry: { id: added.entry.id },
    });

    await runLineMemory('config', ['set', 'maxLines', '1', '--json'], projectDir);
    expect(JSON.parse(output.pop()!)).toMatchObject({
      schemaVersion: '1.0.0', status: 'ok', command: 'line-memory.config',
      key: 'maxLines', value: 1,
    });
    await runLineMemory('add', ['two'], projectDir);
    await runLineMemory('prune', ['--json'], projectDir);
    expect(JSON.parse(output.pop()!)).toMatchObject({
      schemaVersion: '1.0.0', status: 'ok', command: 'line-memory.prune',
      operationId: expect.any(String), pruned: 0, retained: 1,
    });
  });

  it('requires reviewed import evidence and confirmation', async () => {
    expect((await runLineMemory('import', ['fact'], projectDir)).message).toContain('--confirm');
    expect((await runLineMemory('import', ['fact', '--confirm'], projectDir)).message)
      .toContain('--source-ref and --reviewer');
  });

  it('previews reviewed import without mutating either backing file', async () => {
    const result = await runLineMemory('import', [
      'Previewed fact',
      '--source-ref', 'wiki:previewed-fact',
      '--reviewer', 'operator',
      '--dry-run',
      '--json',
    ], projectDir);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(output.join('\n'))).toMatchObject({
      status: 'preview',
      command: 'line-memory.import',
      confirmationRequired: true,
      mutation: { wouldWrite: true, retained: 1, pruned: 0 },
      entry: { id: null, value: 'Previewed fact', existing: false },
    });
    await expect(memoryText()).rejects.toThrow();
    await expect(readFile(
      path.join(projectDir, DEFAULT_CONFIG.metadataPath),
      'utf8',
    )).rejects.toThrow();
  });

  it('returns a stable JSON error envelope for rejected operations', async () => {
    const outcome = await runLineMemory('import', ['fact', '--json'], projectDir);
    expect(outcome.exitCode).toBe(1);
    expect(outcome.message).toBeUndefined();
    expect(JSON.parse(output.join('\n'))).toEqual({
      schemaVersion: '1.0.0',
      status: 'error',
      command: 'line-memory.import',
      error: {
        code: 'LINE_MEMORY_ERROR',
        message: 'Reviewed import requires --confirm.',
      },
    });
  });

  it('archives, removes, and supersedes entries by stable handle with tombstones', async () => {
    await runLineMemory('add', ['archive me', '--json'], projectDir);
    const archiveHandle = JSON.parse(output.pop()!).entry.id;
    await runLineMemory('add', ['remove me', '--json'], projectDir);
    const removeHandle = JSON.parse(output.pop()!).entry.id;
    await runLineMemory('add', ['supersede me', '--json'], projectDir);
    const supersedeHandle = JSON.parse(output.pop()!).entry.id;

    expect((await runLineMemory('archive', [archiveHandle, '--confirm'], projectDir)).exitCode).toBe(0);
    expect((await runLineMemory('remove', [removeHandle, '--confirm'], projectDir)).exitCode).toBe(0);
    expect((await runLineMemory('supersede', [
      supersedeHandle, '--by', 'wiki:new-fact', '--confirm',
    ], projectDir)).exitCode).toBe(0);
    expect(await memoryText()).toBe('');

    const metadata = JSON.parse(await readFile(
      path.join(projectDir, '.aiwg/memory/line-memory.meta.json'),
      'utf8',
    ));
    expect(metadata.entries[archiveHandle].status).toBe('archived');
    expect(metadata.entries[removeHandle].status).toBe('removed');
    expect(metadata.entries[supersedeHandle]).toMatchObject({
      status: 'superseded',
      disposition: { replacement: 'wiki:new-fact' },
    });

    output.length = 0;
    expect((await runLineMemory('archive', [
      archiveHandle, '--confirm', '--json',
    ], projectDir)).exitCode).toBe(0);
    expect(JSON.parse(output.join('\n'))).toMatchObject({
      status: 'ok',
      operation: 'archive',
      duplicate: true,
      entry: { id: archiveHandle, status: 'archived' },
    });
  });

  it('treats duplicate physical lines as one logical fact during handle disposition', async () => {
    await runLineMemory('config', ['set', 'dedupe', 'false'], projectDir);
    await runLineMemory('add', ['repeat', '--json'], projectDir);
    const handle = JSON.parse(output.pop()!).entry.id;
    await runLineMemory('add', ['repeat'], projectDir);
    expect(await memoryText()).toBe('repeat\nrepeat\n');

    expect((await runLineMemory('archive', [handle, '--confirm'], projectDir)).exitCode).toBe(0);
    expect(await memoryText()).toBe('');
    const metadata = JSON.parse(await readFile(
      path.join(projectDir, DEFAULT_CONFIG.metadataPath),
      'utf8',
    ));
    expect(metadata.entries[handle].status).toBe('archived');
  });

  it('previews lifecycle dispositions and preserves active state', async () => {
    await runLineMemory('add', ['keep during preview', '--json'], projectDir);
    const handle = JSON.parse(output.pop()!).entry.id;
    output.length = 0;

    const preview = await runLineMemory('supersede', [
      handle,
      '--by', 'wiki:replacement',
      '--reviewer', 'operator',
      '--dry-run',
      '--json',
    ], projectDir);
    expect(preview.exitCode).toBe(0);
    expect(JSON.parse(output.join('\n'))).toMatchObject({
      status: 'preview',
      command: 'line-memory.supersede',
      confirmationRequired: true,
      mutation: { wouldWrite: true, occurrencesRemoved: 1 },
      entry: {
        id: handle,
        status: 'superseded',
        disposition: { replacement: 'wiki:replacement' },
      },
    });
    expect(await memoryText()).toBe('keep during preview\n');
    const metadata = JSON.parse(await readFile(
      path.join(projectDir, DEFAULT_CONFIG.metadataPath),
      'utf8',
    ));
    expect(metadata.entries[handle].status).toBe('active');
  });

  it('serializes concurrent additions so unrelated facts are not lost', async () => {
    const results = await Promise.all(
      Array.from({ length: 25 }, (_, index) => runLineMemory('add', [`fact ${index}`], projectDir)),
    );
    expect(results.every((item) => item.exitCode === 0)).toBe(true);
    const retained = (await memoryText()).trim().split('\n').sort();
    expect(retained).toHaveLength(25);
    expect(new Set(retained).size).toBe(25);
  });

  it('replays an incomplete dual-file transaction before serving reads', async () => {
    const transactionDir = path.join(projectDir, '.aiwg/memory/transactions');
    await mkdir(transactionDir, { recursive: true });
    const entry = {
      id: 'lm_00000000-0000-4000-8000-000000000001',
      value: 'recovered fact',
      digest: 'sha256:test',
      status: 'active',
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
      lastAccessedAt: '2026-08-02T00:00:00.000Z',
      accessCount: 0,
      sources: [],
    };
    const metadata = {
      schemaVersion: 'aiwg.line-memory.v1',
      version: 1,
      entries: { [entry.id]: entry },
    };
    await writeFile(path.join(transactionDir, 'pending.json'), JSON.stringify({
      schemaVersion: 'aiwg.line-memory.transaction.v1',
      operationId: 'pending',
      operation: 'test-recovery',
      memoryPath: '.aiwg/memory/line-memory.txt',
      metadataPath: '.aiwg/memory/line-memory.meta.json',
      memoryContent: 'recovered fact\n',
      metadataContent: `${JSON.stringify(metadata, null, 2)}\n`,
    }));

    const recovered = await runLineMemory('list', ['--no-touch'], projectDir);
    expect(recovered.exitCode).toBe(0);
    expect(output).toEqual(['recovered fact']);
    await expect(readFile(path.join(transactionDir, 'pending.json'), 'utf8')).rejects.toThrow();
  });

  it('promotes a reviewed session assertion through the same locked store', async () => {
    const destination = new LineMemoryPromotionDestination({ projectRoot: projectDir });
    const candidate = {
      candidateId: 'sha256:0123456789abcdef0123456789abcdef',
      version: 3,
      assertion: '  Project uses Gitea\nfor its canonical tracker.  ',
    };
    const firstPlan = destination.plan(candidate);
    const repeatedPlan = destination.plan(candidate);
    expect(firstPlan).toEqual(repeatedPlan);
    expect(firstPlan.destinationRef).toMatch(/^\.aiwg\/memory\/line-memory\.meta\.json#lm_/);

    await destination.write(firstPlan);
    expect(await memoryText()).toBe('Project uses Gitea for its canonical tracker.\n');
    const metadata = JSON.parse(await readFile(
      path.join(projectDir, '.aiwg/memory/line-memory.meta.json'),
      'utf8',
    ));
    const handle = firstPlan.destinationRef.split('#')[1];
    expect(metadata.entries[handle]).toMatchObject({
      id: handle,
      value: 'Project uses Gitea for its canonical tracker.',
      status: 'active',
      sources: [expect.objectContaining({
        ref: `${'session-candidate'}:${candidate.candidateId}:v3`,
        reviewer: 'session-review-gateway',
      })],
    });

    await destination.write(firstPlan);
    expect(await memoryText()).toBe('Project uses Gitea for its canonical tracker.\n');
  });

  it('reuses the stable handle when a promoted assertion already exists', async () => {
    await runLineMemory('add', ['Existing reviewed fact', '--json'], projectDir);
    const existingHandle = JSON.parse(output.pop()!).entry.id;
    const destination = new LineMemoryPromotionDestination({ projectRoot: projectDir });
    const plan = destination.plan({
      candidateId: 'sha256:abcdef0123456789abcdef0123456789',
      version: 1,
      assertion: 'Existing reviewed fact',
    });

    expect(plan.destinationRef).toBe(
      `${DEFAULT_CONFIG.metadataPath}#${existingHandle}`,
    );
    await destination.write(plan);
    const metadata = JSON.parse(await readFile(
      path.join(projectDir, DEFAULT_CONFIG.metadataPath),
      'utf8',
    ));
    expect(metadata.entries[existingHandle].sources).toEqual([
      expect.objectContaining({
        ref: 'session-candidate:sha256:abcdef0123456789abcdef0123456789:v1',
      }),
    ]);
    expect(await memoryText()).toBe('Existing reviewed fact\n');
  });
});
