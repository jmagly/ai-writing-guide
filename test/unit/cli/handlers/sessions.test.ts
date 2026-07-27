import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildHandlerMap } from '../../../../src/cli/handlers/index.js';
import { sessionsHandler } from '../../../../src/cli/handlers/sessions.js';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

function context(args: string[], cwd = process.cwd()): HandlerContext {
  return { args, rawArgs: ['sessions', ...args], cwd, frameworkRoot: process.cwd() };
}

function jsonOutput(spy: ReturnType<typeof vi.spyOn>): Record<string, any> {
  return JSON.parse(String(spy.mock.calls.at(-1)?.[0]));
}

describe('sessions CLI contracts', () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers plural management without changing singular launcher routing', () => {
    const handlers = buildHandlerMap();
    expect(handlers.get('session')?.description).toContain('Start an agentic session');
    expect(handlers.get('sessions')).toBe(sessionsHandler);
  });

  it('returns one explicit deterministic disposition for every canonical provider', async () => {
    const result = await sessionsHandler.execute(context(['sources', '--json']));
    const output = jsonOutput(log);
    expect(result.exitCode).toBe(0);
    expect(output).toMatchObject({
      contractVersion: '1.0.0',
      command: 'sessions.sources',
      status: 'ok',
      error: null,
      data: { count: 12 },
    });
    expect(output.data.providers.map((item: any) => item.provider))
      .toEqual([...output.data.providers.map((item: any) => item.provider)].sort());
    expect(output.data.providers.find((item: any) => item.provider === 'generic'))
      .toMatchObject({ disposition: 'manual-only', reasonCode: 'MANUAL_SOURCE_SELECTION_REQUIRED' });
    expect(output.data.providers.filter((item: any) => item.disposition === 'unsupported'))
      .toHaveLength(11);
  });

  it('uses stable JSON and exit codes for unsupported provider import', async () => {
    const result = await sessionsHandler.execute(context([
      'import', 'anything.jsonl', '--provider', 'claude', '--source-id', 'source', '--json',
    ]));
    expect(result.exitCode).toBe(3);
    expect(jsonOutput(log)).toMatchObject({
      contractVersion: '1.0.0',
      command: 'sessions.import',
      status: 'error',
      error: { code: 'UNSUPPORTED_OPERATION' },
    });
  });
});

describe.runIf(hasBetterSqlite3())('sessions CLI catalog lifecycle', () => {
  let root: string;
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    root = mkdtempSync(resolve(tmpdir(), 'aiwg-sessions-cli-'));
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  it('imports, paginates, shows, tags, relocates, reindexes, previews deletion, and diagnoses', async () => {
    const fixture = resolve('test/fixtures/sessions/generic/valid-v1.jsonl');
    const dbArgs = ['--db', resolve(root, 'catalog.sqlite'), '--json'];

    expect((await sessionsHandler.execute(context([
      'import', fixture, '--source-id', 'generic-fixture-v1', '--workspace', 'workspace-fixture',
      ...dbArgs,
    ]))).exitCode).toBe(0);
    const importOutput = jsonOutput(log);
    expect(importOutput.data.totals).toEqual({ sessionsInserted: 1, eventsInserted: 2 });

    await sessionsHandler.execute(context(['list', '--limit', '1', ...dbArgs]));
    const list = jsonOutput(log);
    expect(list.data.page).toMatchObject({ limit: 1, cursor: '0', total: 1, nextCursor: null });
    const sessionId = list.data.items[0].sessionId;

    await sessionsHandler.execute(context(['show', sessionId, ...dbArgs]));
    expect(jsonOutput(log).data.events).toHaveLength(2);

    await sessionsHandler.execute(context(['tag', sessionId, 'decision', '--dry-run', ...dbArgs]));
    expect(jsonOutput(log).status).toBe('preview');
    await sessionsHandler.execute(context(['tag', sessionId, 'decision', ...dbArgs]));
    expect(jsonOutput(log).data.tags).toEqual(['decision']);

    await sessionsHandler.execute(context([
      'relocate', 'generic-fixture-v1', '/private/new/location.jsonl', '--dry-run', ...dbArgs,
    ]));
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: { redactedLocator: '<session-source>/location.jsonl' },
    });

    await sessionsHandler.execute(context(['reindex', '--dry-run', ...dbArgs]));
    expect(jsonOutput(log).status).toBe('preview');

    await sessionsHandler.execute(context(['delete', sessionId, ...dbArgs]));
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: { providerLogsModified: false, confirmationRequired: true },
    });

    await sessionsHandler.execute(context(['doctor', ...dbArgs]));
    expect(jsonOutput(log)).toMatchObject({
      status: 'ok',
      data: { health: { integrity: 'ok', sources: 1, sessions: 1, events: 2 } },
    });
  });

  it('tombstones only after explicit confirmation and keeps JSON errors stable', async () => {
    const fixture = resolve('test/fixtures/sessions/generic/valid-v1.jsonl');
    const dbArgs = ['--db', resolve(root, 'catalog.sqlite'), '--json'];
    await sessionsHandler.execute(context([
      'import', fixture, '--source-id', 'generic-fixture-v1', ...dbArgs,
    ]));
    await sessionsHandler.execute(context(['list', ...dbArgs]));
    const sessionId = jsonOutput(log).data.items[0].sessionId;
    await sessionsHandler.execute(context(['delete', sessionId, '--confirm', ...dbArgs]));
    expect(jsonOutput(log)).toMatchObject({ status: 'ok', data: { outcome: 'tombstoned' } });
    await sessionsHandler.execute(context(['list', ...dbArgs]));
    expect(jsonOutput(log).data.items).toEqual([]);
    const missing = await sessionsHandler.execute(context(['show', sessionId, ...dbArgs]));
    expect(missing.exitCode).toBe(4);
    expect(jsonOutput(log).error.code).toBe('SESSION_NOT_FOUND');
  });
});

function hasBetterSqlite3(): boolean {
  const require = createRequire(import.meta.url);
  try {
    require.resolve('better-sqlite3');
    return true;
  } catch {
    return false;
  }
}
