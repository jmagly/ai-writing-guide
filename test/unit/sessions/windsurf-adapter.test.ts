import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  IncrementalSessionImporter,
  SESSION_CONTRACT_VERSION,
  SessionRepository,
  SessionSourceAdapterRegistry,
  WINDSURF_ADAPTER_VERSION,
  WINDSURF_TRANSCRIPT_SCHEMA_VERSION,
  WindsurfSessionAdapter,
  type SelectedSource,
  type SessionSource,
} from '../../../src/sessions/index.js';

const fixturesRoot = resolve('test/fixtures/sessions/windsurf');

function selected(name: string, locatorClass = 'windsurf-cascade-hook-jsonl'): SelectedSource {
  return {
    provider: 'windsurf',
    locator: resolve(fixturesRoot, name),
    locatorClass,
    sourceId: `windsurf-${name}`,
    authorizedScope: { workspaceId: 'workspace-fixture', allowedRoots: [fixturesRoot] },
  };
}

describe('Devin Desktop (Windsurf compatibility) session adapter', () => {
  const adapter = new WindsurfSessionAdapter();

  it('reports opt-in hook acquisition and performs no discovery', async () => {
    const registry = new SessionSourceAdapterRegistry();
    registry.register(adapter);
    expect(registry.report('windsurf', {
      state: 'available',
      evidence: {
        adapterVersion: WINDSURF_ADAPTER_VERSION,
        sourceSchemaVersion: WINDSURF_TRANSCRIPT_SCHEMA_VERSION,
        verifiedAt: '2026-07-27',
        reference: 'docs/providers/windsurf-sessions.md',
      },
      reason: null,
      remediation: null,
    })).toMatchObject({
      classification: 'implemented',
      acquisitionModes: ['hook', 'jsonl'],
    });
    expect(await collect(adapter.discover({
      workspaceId: 'workspace-fixture', allowedRoots: [fixturesRoot],
    }))).toEqual([]);
  });

  it('imports current transcript steps provisionally with hook provenance', async () => {
    await expect(adapter.inspect(selected('current.jsonl'))).resolves.toEqual({
      sourceSchemaVersion: '1.0.0',
      consistency: 'provisional',
      operationalState: 'available',
    });
    const records = await collect(adapter.stream(selected('current.jsonl')));
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      nativeSessionId: 'trajectory-1920',
      nativeEventId: 'event-1',
      occurredAt: '2026-07-27T12:00:00.000Z',
      role: 'user',
      text: 'Create a hello world file',
      extensions: {
        trajectoryId: 'trajectory-1920',
        executionId: 'execution-1',
        model: 'Claude Sonnet 4',
        sensitiveContentWarning: true,
        nativeStep: { future_field: { preserved: true } },
        provenance: {
          product: 'Devin Desktop',
          compatibilityProviderId: 'windsurf',
          optInRequired: true,
          hookConfiguredByAiWG: false,
          credentialsInspected: false,
          environmentSecretsInspected: false,
          liveTokenCapture: false,
          completeHistoricalCapture: false,
          providerRetention: { maximumFiles: 100, evictionOrder: 'oldest-mtime' },
        },
      },
    });
  });

  it('rejects legacy stores and fails closed on drift', async () => {
    await expect(adapter.inspect(selected('current.jsonl', 'windsurf-legacy-protobuf')))
      .rejects.toMatchObject({ code: 'UNSUPPORTED_OPERATION' });
    await expect(adapter.inspect(selected('unknown-major.jsonl')))
      .rejects.toMatchObject({ code: 'UNKNOWN_SCHEMA_MAJOR' });
    await expect(adapter.inspect(selected('mixed.jsonl')))
      .rejects.toMatchObject({ code: 'SCHEMA_DRIFT' });
    await expect(adapter.inspect(selected('malformed.jsonl')))
      .rejects.toMatchObject({ code: 'MALFORMED_SOURCE' });
  });
});

describe.runIf(hasBetterSqlite3())('Devin Desktop adapter repository conformance', () => {
  it('redacts searchable content and makes identical replay a no-op', async () => {
    const adapter = new WindsurfSessionAdapter();
    const selectedSource = selected('redaction.jsonl');
    const source: SessionSource = {
      contractVersion: SESSION_CONTRACT_VERSION,
      sourceId: selectedSource.sourceId,
      provider: 'windsurf',
      providerProfile: 'devin-desktop-cascade-transcript-hook',
      locatorClass: selectedSource.locatorClass,
      redactedLocator: '<session-source>/redaction.jsonl',
      adapterVersion: WINDSURF_ADAPTER_VERSION,
      sourceSchemaVersion: WINDSURF_TRANSCRIPT_SCHEMA_VERSION,
      disposition: 'implemented',
      operationalState: 'available',
      consistency: 'provisional',
      authorizedAt: '2026-07-27T00:00:00.000Z',
      extensions: { 'native.windsurf': { product: 'Devin Desktop' } },
    };
    const repository = new SessionRepository();
    const importer = new IncrementalSessionImporter(repository);
    const request = {
      source, selectedSource, adapter, workspaceId: 'workspace-fixture', policyVersion: '1.0.0',
    };
    expect((await importer.import(request))
      .reduce((sum, receipt) => sum + receipt.eventsInserted, 0)).toBe(1);
    const stored = JSON.stringify(repository.authorizedSearchDocuments({
      workspaceId: 'workspace-fixture', limit: 10,
    }));
    expect(stored).not.toContain('redaction-canary-1920');
    expect(stored).not.toContain('devin-synthetic@example.test');
    expect(await importer.import(request)).toEqual([]);
    repository.close();
  });
});

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of iterable) values.push(value);
  return values;
}

function hasBetterSqlite3(): boolean {
  const require = createRequire(import.meta.url);
  try {
    require.resolve('better-sqlite3');
    return true;
  } catch {
    return false;
  }
}
