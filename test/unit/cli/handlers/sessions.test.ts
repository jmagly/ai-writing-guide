import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    expect(output.data.providers.find((item: any) => item.provider === 'claude'))
      .toMatchObject({
        disposition: 'implemented',
        supportedOperations: ['discover', 'inspect', 'stream'],
        acquisitionModes: ['jsonl', 'hook'],
      });
    expect(output.data.providers.find((item: any) => item.provider === 'codex'))
      .toMatchObject({
        disposition: 'implemented',
        supportedOperations: ['discover', 'inspect', 'stream'],
        acquisitionModes: ['api', 'jsonl'],
      });
    expect(output.data.providers.find((item: any) => item.provider === 'copilot'))
      .toMatchObject({
        disposition: 'implemented',
        supportedOperations: ['inspect', 'stream'],
        acquisitionModes: ['manual-export'],
      });
    expect(output.data.providers.find((item: any) => item.provider === 'cursor'))
      .toMatchObject({
        disposition: 'implemented',
        supportedOperations: ['inspect', 'stream'],
        acquisitionModes: ['api', 'jsonl', 'manual-export'],
      });
    expect(output.data.providers.find((item: any) => item.provider === 'factory'))
      .toMatchObject({
        disposition: 'implemented',
        supportedOperations: ['discover', 'inspect', 'stream'],
        acquisitionModes: ['jsonl', 'api'],
      });
    expect(output.data.providers.find((item: any) => item.provider === 'hermes'))
      .toMatchObject({
        disposition: 'implemented',
        supportedOperations: ['inspect', 'stream'],
        acquisitionModes: ['jsonl', 'api', 'sqlite-snapshot'],
      });
    expect(output.data.providers.find((item: any) => item.provider === 'opencode'))
      .toMatchObject({
        disposition: 'implemented',
        supportedOperations: ['inspect', 'stream'],
        acquisitionModes: ['manual-export', 'api', 'jsonl'],
      });
    expect(output.data.providers.find((item: any) => item.provider === 'openclaw'))
      .toMatchObject({
        disposition: 'implemented',
        supportedOperations: ['inspect', 'stream'],
        acquisitionModes: ['api', 'sqlite-snapshot', 'jsonl'],
      });
    expect(output.data.providers.find((item: any) => item.provider === 'openhuman'))
      .toMatchObject({
        disposition: 'implemented',
        supportedOperations: ['inspect', 'stream'],
        acquisitionModes: ['jsonl'],
      });
    expect(output.data.providers.filter((item: any) => item.disposition === 'unsupported'))
      .toHaveLength(2);
  });

  it('uses stable JSON and exit codes for unsupported provider import', async () => {
    const result = await sessionsHandler.execute(context([
      'import', 'anything.jsonl', '--provider', 'warp', '--source-id', 'source', '--json',
    ]));
    expect(result.exitCode).toBe(3);
    expect(jsonOutput(log)).toMatchObject({
      contractVersion: '1.0.0',
      command: 'sessions.import',
      status: 'error',
      error: { code: 'UNSUPPORTED_OPERATION' },
    });
  });

  it('previews a documented Claude transcript import without persisting it', async () => {
    const fixture = resolve('test/fixtures/sessions/claude/active-session.jsonl');
    const result = await sessionsHandler.execute(context([
      'import', fixture, '--provider', 'claude', '--source-id', 'claude-active',
      '--workspace', 'workspace-fixture', '--dry-run', '--json',
    ]));
    expect(result.exitCode).toBe(0);
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: {
        source: {
          provider: 'claude',
          providerProfile: 'documented-local-jsonl',
          locatorClass: 'claude-transcript-jsonl',
          disposition: 'implemented',
          consistency: 'provisional',
        },
        wouldInspect: true,
        wouldPersist: false,
      },
    });
  });

  it('previews a Codex App Server export without persisting it', async () => {
    const fixture = resolve('test/fixtures/sessions/codex/threads.app-server.jsonl');
    const result = await sessionsHandler.execute(context([
      'import', fixture, '--provider', 'codex', '--source-id', 'codex-app',
      '--workspace', 'workspace-fixture', '--dry-run', '--json',
    ]));
    expect(result.exitCode).toBe(0);
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: {
        source: {
          provider: 'codex',
          providerProfile: 'app-server-v2-rollout-fallback',
          locatorClass: 'codex-app-server-jsonl',
          disposition: 'implemented',
          consistency: 'provisional',
        },
        wouldInspect: true,
        wouldPersist: false,
      },
    });
  });

  it('previews a supported Copilot chat JSON export without persisting it', async () => {
    const fixture = resolve('test/fixtures/sessions/copilot/complete.chat.json');
    const result = await sessionsHandler.execute(context([
      'import', fixture, '--provider', 'copilot', '--source-id', 'copilot-export',
      '--workspace', 'workspace-fixture', '--dry-run', '--json',
    ]));
    expect(result.exitCode).toBe(0);
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: {
        source: {
          provider: 'copilot',
          providerProfile: 'vscode-chat-json-export',
          locatorClass: 'copilot-chat-json-export',
          disposition: 'implemented',
          consistency: 'provisional',
        },
        wouldInspect: true,
        wouldPersist: false,
      },
    });
  });

  it('previews each supported Cursor surface without persisting it', async () => {
    const cases = [
      ['cli-complete.jsonl', 'cli-stream-json', 'cursor-cli-stream-json', 'complete'],
      ['cloud-lifecycle.cloud.jsonl', 'cloud-agents-api-v1', 'cursor-cloud-events-jsonl', 'complete'],
      ['editor-export.md', 'editor-markdown-lossy', 'cursor-editor-markdown', 'complete'],
    ];
    for (const [name, providerProfile, locatorClass, consistency] of cases) {
      const fixture = resolve(`test/fixtures/sessions/cursor/${name}`);
      const result = await sessionsHandler.execute(context([
        'import', fixture, '--provider', 'cursor', '--source-id', `cursor-${name}`,
        '--workspace', 'workspace-fixture', '--dry-run', '--json',
      ]));
      expect(result.exitCode).toBe(0);
      expect(jsonOutput(log)).toMatchObject({
        status: 'preview',
        data: {
          source: {
            provider: 'cursor',
            providerProfile,
            locatorClass,
            disposition: 'implemented',
            consistency,
          },
          wouldInspect: true,
          wouldPersist: false,
        },
      });
    }
  });

  it('previews a documented Factory Droid transcript without persisting it', async () => {
    const fixture = resolve('test/fixtures/sessions/factory/complete.jsonl');
    const result = await sessionsHandler.execute(context([
      'import', fixture, '--provider', 'factory', '--source-id', 'factory-complete',
      '--workspace', 'workspace-fixture', '--dry-run', '--json',
    ]));
    expect(result.exitCode).toBe(0);
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: {
        source: {
          provider: 'factory',
          providerProfile: 'documented-project-jsonl',
          locatorClass: 'factory-droid-jsonl',
          disposition: 'implemented',
          consistency: 'complete',
        },
        wouldInspect: true,
        wouldPersist: false,
      },
    });
  });

  it('previews a native Hermes schema-23 export without persisting it', async () => {
    const fixture = resolve('test/fixtures/sessions/hermes/complete.jsonl');
    const result = await sessionsHandler.execute(context([
      'import', fixture, '--provider', 'hermes', '--source-id', 'hermes-complete',
      '--workspace', 'workspace-fixture', '--dry-run', '--json',
    ]));
    expect(result.exitCode).toBe(0);
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: {
        source: {
          provider: 'hermes',
          providerProfile: 'native-schema-23-export',
          locatorClass: 'hermes-export-jsonl',
          sourceSchemaVersion: '1.0.0',
          disposition: 'implemented',
          consistency: 'complete',
        },
        wouldInspect: true,
        wouldPersist: false,
      },
    });
  });

  it('previews a sanitized OpenCode JSON export without persisting it', async () => {
    const fixture = resolve('test/fixtures/sessions/opencode/complete.json');
    const result = await sessionsHandler.execute(context([
      'import', fixture, '--provider', 'opencode', '--source-id', 'opencode-complete',
      '--workspace', 'workspace-fixture', '--dry-run', '--json',
    ]));
    expect(result.exitCode).toBe(0);
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: {
        source: {
          provider: 'opencode',
          providerProfile: 'sanitized-json-export',
          locatorClass: 'opencode-export-json',
          sourceSchemaVersion: '1.0.0',
          disposition: 'implemented',
          consistency: 'complete',
        },
        wouldInspect: true,
        wouldPersist: false,
      },
    });
  });

  it('previews an OpenClaw schema-16/event-v3 consistent snapshot without persisting it', async () => {
    const fixture = resolve('test/fixtures/sessions/openclaw/complete.jsonl');
    const result = await sessionsHandler.execute(context([
      'import', fixture, '--provider', 'openclaw', '--source-id', 'openclaw-complete',
      '--workspace', 'workspace-fixture', '--dry-run', '--json',
    ]));
    expect(result.exitCode).toBe(0);
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: {
        source: {
          provider: 'openclaw',
          providerProfile: 'schema-16-event-v3-consistent-snapshot',
          locatorClass: 'openclaw-consistent-snapshot-jsonl',
          sourceSchemaVersion: '1.0.0',
          disposition: 'implemented',
          consistency: 'consistent-snapshot',
        },
        wouldInspect: true,
        wouldPersist: false,
      },
    });
  });

  it('previews an enriched OpenHuman schema-1 raw transcript without persisting it', async () => {
    const fixture = resolve('test/fixtures/sessions/openhuman/complete.jsonl');
    const result = await sessionsHandler.execute(context([
      'import', fixture, '--provider', 'openhuman', '--source-id', 'openhuman-complete',
      '--workspace', 'workspace-fixture', '--dry-run', '--json',
    ]));
    expect(result.exitCode).toBe(0);
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: {
        source: {
          provider: 'openhuman',
          providerProfile: 'schema-1-session-raw-enriched',
          locatorClass: 'openhuman-enriched-jsonl',
          sourceSchemaVersion: '1.0.0',
          disposition: 'implemented',
          consistency: 'complete',
        },
        wouldInspect: true,
        wouldPersist: false,
      },
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

    await sessionsHandler.execute(context([
      'search', 'opaque', '--workspace', 'workspace-fixture', '--role', 'assistant', ...dbArgs,
    ]));
    expect(jsonOutput(log)).toMatchObject({
      status: 'ok',
      data: {
        items: [{
          provider: 'generic',
          workspaceId: 'workspace-fixture',
          sessionId,
          citation: {
            provider: 'generic',
            sessionId,
            eventId: expect.any(String),
            importRunId: expect.any(String),
            sourceId: 'generic-fixture-v1',
            locatorClass: 'manual-export',
          },
        }],
        page: { limit: 50, nextCursor: null },
      },
    });

    await sessionsHandler.execute(context([
      'extract', sessionId, '--workspace', 'workspace-fixture', '--dry-run', ...dbArgs,
    ]));
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: {
        count: 1,
        durableMemoryWrites: 0,
        items: [{
          type: 'decision',
          reviewState: 'pending',
          evidence: [{ eventId: expect.any(String), quoteDigest: expect.any(String) }],
        }],
      },
    });
    await sessionsHandler.execute(context([
      'extract', sessionId, '--workspace', 'workspace-fixture', ...dbArgs,
    ]));
    const extracted = jsonOutput(log);
    const candidateId = extracted.data.items[0].candidateId;
    await sessionsHandler.execute(context(['candidates', '--state', 'pending', ...dbArgs]));
    expect(jsonOutput(log).data.items).toHaveLength(1);
    await sessionsHandler.execute(context([
      'review', candidateId, '1', 'accepted',
      '--reviewer', 'fixture-reviewer', '--reason', 'evidence verified', ...dbArgs,
    ]));
    expect(jsonOutput(log)).toMatchObject({
      status: 'ok',
      data: { candidateId, candidateVersion: 1, fromState: 'pending', toState: 'accepted' },
    });
    await sessionsHandler.execute(context(['candidates', '--state', 'accepted', ...dbArgs]));
    expect(jsonOutput(log).data.items).toHaveLength(1);
    const manifestDir = resolve(root, 'agentic/code/frameworks/memory');
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(resolve(manifestDir, 'manifest.json'), JSON.stringify({
      id: 'memory',
      memory: { topology: {
        namespace: '.aiwg/memory',
        derivedPages: { session: '.aiwg/memory/session-knowledge' },
      } },
    }));
    await sessionsHandler.execute(context([
      'promote', candidateId, '1', '--consumer', 'memory',
      '--reviewer', 'fixture-reviewer', ...dbArgs,
    ], root));
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: {
        candidateId,
        candidateVersion: 1,
        consumer: 'memory',
        confirmationRequired: true,
        conflictsWith: [],
        supersedes: [],
      },
    });
    await sessionsHandler.execute(context([
      'promote', candidateId, '1', '--consumer', 'memory',
      '--reviewer', 'fixture-reviewer', '--confirm', ...dbArgs,
    ], root));
    const promoted = jsonOutput(log);
    expect(promoted).toMatchObject({
      status: 'ok',
      data: { receipt: {
        candidateId,
        candidateVersion: 1,
        consumer: 'memory',
        duplicate: false,
        evidenceEventIds: [expect.any(String)],
      } },
    });
    expect(readFileSync(resolve(root, promoted.data.receipt.destinationRef), 'utf8'))
      .toContain(`candidate_id: ${candidateId}`);

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
    await sessionsHandler.execute(context(['restore', sessionId, ...dbArgs]));
    expect(jsonOutput(log)).toMatchObject({
      status: 'ok',
      data: { sessionId, outcome: 'restored', providerLogsModified: false },
    });
    await sessionsHandler.execute(context(['purge', sessionId, ...dbArgs]));
    expect(jsonOutput(log)).toMatchObject({
      status: 'preview',
      data: {
        sessionId,
        counts: { sessions: 1, events: 2, indexes: 2 },
        providerLogsModified: false,
        confirmationRequired: true,
      },
    });
    await sessionsHandler.execute(context([
      'purge', sessionId, '--confirm',
      '--actor-class', 'operator', '--reason-code', 'user_request', ...dbArgs,
    ]));
    expect(jsonOutput(log)).toMatchObject({
      status: 'ok',
      data: {
        providerLogsModified: false,
        receipt: { outcome: 'committed', orphanCounts: {
          sessions: 0, events: 0, indexes: 0, candidates: 0,
        } },
      },
    });
    await sessionsHandler.execute(context([
      'purge', sessionId, '--confirm',
      '--actor-class', 'operator', '--reason-code', 'retry', ...dbArgs,
    ]));
    expect(jsonOutput(log)).toMatchObject({
      status: 'ok',
      data: { duplicate: true, receipt: { outcome: 'committed' } },
    });
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
