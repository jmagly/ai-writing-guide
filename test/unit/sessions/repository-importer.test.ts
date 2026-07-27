import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import {
  CandidateExtractionService,
  IncrementalSessionImporter,
  SESSION_CONTRACT_VERSION,
  SessionRepository,
  StructuralCandidateExtractor,
  sha256,
  stableSessionId,
  type ProviderRecord,
  type SessionSource,
  type SessionSourceAdapter,
} from '../../../src/sessions/index.js';

function adapter(records: ProviderRecord[]): SessionSourceAdapter {
  return {
    provider: 'generic',
    adapterVersion: '1.0.0',
    disposition: 'implemented',
    supportedOperations: ['discover', 'inspect', 'stream'],
    acquisitionModes: ['jsonl'],
    async *discover() { /* explicit fixture has no ambient discovery */ },
    async inspect() {
      return { sourceSchemaVersion: '1.0.0', consistency: 'complete', operationalState: 'available' };
    },
    async *stream(_source, cursor) {
      const start = Number(cursor?.value ?? 0);
      for (const record of records.slice(start)) yield record;
    },
  };
}

const source: SessionSource = {
  contractVersion: SESSION_CONTRACT_VERSION,
  sourceId: 'source-fixture',
  provider: 'generic',
  providerProfile: 'fixture',
  locatorClass: 'synthetic-fixture',
  redactedLocator: '<fixture>',
  adapterVersion: '1.0.0',
  sourceSchemaVersion: '1.0.0',
  disposition: 'implemented',
  operationalState: 'available',
  consistency: 'complete',
  authorizedAt: '2026-07-26T00:00:00.000Z',
  extensions: { 'native.generic': {} },
};

const records: ProviderRecord[] = [
  {
    nativeSessionId: 'native-1', nativeEventId: 'event-a', sequence: 0,
    kind: 'message', role: 'user', occurredAt: '2026-07-26T00:00:00.000Z',
    text: 'password=redaction-canary-123', rawReference: { locatorClass: 'fixture', sequence: 0 },
  },
  {
    nativeSessionId: 'native-1', nativeEventId: 'event-b', sequence: 1,
    kind: 'future-provider-kind', role: 'assistant', occurredAt: '2026-07-26T00:00:01.000Z',
    text: 'opaque but preserved', rawReference: { locatorClass: 'fixture', sequence: 1 },
    extensions: { futureField: 42 },
  },
];

describe.runIf(hasBetterSqlite3())('transactional session repository and importer', () => {
  it('imports incrementally, redacts, preserves opaque events, and makes replay a no-op', async () => {
    const repository = new SessionRepository();
    const importer = new IncrementalSessionImporter(repository);
    const request = {
      source,
      selectedSource: {
        provider: 'generic' as const, locator: '<fixture>', locatorClass: 'synthetic-fixture',
        sourceId: source.sourceId, authorizedScope: { workspaceId: 'workspace-1', allowedRoots: ['/fixture'] },
      },
      adapter: adapter(records), workspaceId: 'workspace-1', policyVersion: '1.0.0',
      limits: { batchSize: 1 },
    };
    const first = await importer.import(request);
    expect(first).toHaveLength(2);
    expect(first.reduce((sum, receipt) => sum + receipt.eventsInserted, 0)).toBe(2);

    const sessionId = stableSessionId('generic', source.sourceId, 'native-1');
    const events = repository.listEvents(sessionId);
    expect(events).toHaveLength(2);
    expect(JSON.stringify(events)).not.toContain('redaction-canary-123');
    expect(events[1].opaque).toBe(true);
    expect(events[1].extensions['native.generic']).toEqual({ futureField: 42 });

    const replay = await importer.import(request);
    expect(replay).toEqual([]);
    expect(repository.listEvents(sessionId)).toHaveLength(2);

    const search = repository.search({
      query: 'opaque', workspaceId: 'workspace-1', providers: ['generic'], limit: 10,
      role: 'assistant', sensitivity: 'none',
    });
    expect(search.items).toHaveLength(1);
    expect(search.items[0]).toMatchObject({
      provider: 'generic',
      workspaceId: 'workspace-1',
      sessionId,
      importRunId: expect.any(String),
      sourceId: source.sourceId,
      locatorClass: source.locatorClass,
      role: 'assistant',
      citation: {
        provider: 'generic',
        sessionId,
        eventId: expect.any(String),
        importRunId: expect.any(String),
        sourceId: source.sourceId,
        locatorClass: source.locatorClass,
      },
    });
    expect(repository.search({
      query: 'opaque', workspaceId: 'other-workspace', limit: 10,
    }).items).toEqual([]);
    expect(repository.authorizedSearchDocuments({
      workspaceId: 'workspace-1', providers: ['generic'], role: 'assistant',
      sensitivity: 'none', limit: 10,
    })).toMatchObject([{
      eventId: search.items[0].eventId,
      searchableText: 'opaque but preserved',
      citation: search.items[0].citation,
    }]);
    repository.tombstoneSession(sessionId);
    expect(repository.search({
      query: 'opaque', workspaceId: 'workspace-1', limit: 10,
    }).items).toEqual([]);
    expect(repository.authorizedSearchDocuments({
      workspaceId: 'workspace-1', limit: 10,
    })).toEqual([]);
    repository.close();
  });

  it('keeps cursor pagination stable when a concurrent import adds earlier-ranked hits', async () => {
    const repository = new SessionRepository();
    const importer = new IncrementalSessionImporter(repository);
    const selectedSource = {
      provider: 'generic' as const, locator: '<fixture>', locatorClass: 'synthetic-fixture',
      sourceId: source.sourceId,
      authorizedScope: { workspaceId: 'workspace-1', allowedRoots: ['/fixture'] },
    };
    await importer.import({
      source, selectedSource, adapter: adapter(records),
      workspaceId: 'workspace-1', policyVersion: '1.0.0',
    });
    const firstPage = repository.search({
      query: 'opaque OR redacted', workspaceId: 'workspace-1', limit: 1,
    });
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.nextCursor).not.toBeNull();

    const concurrentSource = { ...source, sourceId: 'concurrent-source' };
    await importer.import({
      source: concurrentSource,
      selectedSource: { ...selectedSource, sourceId: concurrentSource.sourceId },
      adapter: adapter([{
        nativeSessionId: 'native-2', nativeEventId: 'event-new', sequence: 0,
        kind: 'message', role: 'user', text: 'opaque',
        rawReference: { locatorClass: 'fixture', sequence: 0 },
      }]),
      workspaceId: 'workspace-1', policyVersion: '1.0.0',
    });
    const secondPage = repository.search({
      query: 'opaque OR redacted', workspaceId: 'workspace-1', limit: 1,
      cursor: firstPage.nextCursor!,
    });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0].sourceId).toBe(source.sourceId);
    expect(secondPage.items[0].eventId).not.toBe(firstPage.items[0].eventId);
    repository.close();
  });

  it('persists versioned candidates and enforces the review state machine', async () => {
    const repository = new SessionRepository();
    const importer = new IncrementalSessionImporter(repository);
    const candidateSource = { ...source, sourceId: 'candidate-source' };
    await importer.import({
      source: candidateSource,
      selectedSource: {
        provider: 'generic', locator: '<fixture>', locatorClass: 'synthetic-fixture',
        sourceId: candidateSource.sourceId,
        authorizedScope: { workspaceId: 'workspace-1', allowedRoots: ['/fixture'] },
      },
      adapter: adapter([{
        nativeSessionId: 'candidate-session',
        nativeEventId: 'candidate-event',
        sequence: 0,
        kind: 'message',
        role: 'assistant',
        text: 'Decision: retain evidence citations',
        rawReference: { locatorClass: 'fixture', sequence: 0 },
      }]),
      workspaceId: 'workspace-1',
      policyVersion: '1.0.0',
    });
    const documents = repository.authorizedSearchDocuments({
      workspaceId: 'workspace-1',
      limit: 10,
    });
    const service = new CandidateExtractionService(repository);
    const extracted = await service.extract({
      documents,
      extractor: new StructuralCandidateExtractor(),
      policy: {
        version: '1.0.0',
        projectScope: 'workspace-1',
        temporalScope: 'source-event',
        minimumConfidence: 0.5,
      },
    });
    expect(extracted).toHaveLength(1);
    const candidate = extracted[0];
    expect(repository.getCandidate(candidate.candidateId, 1)).toEqual(candidate);
    expect(repository.listCandidates('pending')).toEqual([candidate]);

    const repeated = await service.extract({
      documents,
      extractor: new StructuralCandidateExtractor(),
      policy: {
        version: '1.0.0',
        projectScope: 'workspace-1',
        temporalScope: 'source-event',
        minimumConfidence: 0.5,
      },
    });
    expect(repeated).toEqual([candidate]);
    expect(repository.listCandidates()).toHaveLength(1);

    expect(repository.reviewCandidate({
      candidateId: candidate.candidateId,
      version: 1,
      toState: 'accepted',
      reviewer: 'reviewer-a',
      reason: 'evidence verified',
    })).toMatchObject({ fromState: 'pending', toState: 'accepted' });
    expect(() => repository.reviewCandidate({
      candidateId: candidate.candidateId,
      version: 1,
      toState: 'rejected',
      reviewer: 'reviewer-a',
      reason: 'invalid reversal',
    })).toThrow(/not allowed/);
    expect(repository.reviewCandidate({
      candidateId: candidate.candidateId,
      version: 1,
      toState: 'promoted',
      reviewer: 'reviewer-a',
      reason: 'promotion receipt linked',
    })).toMatchObject({ fromState: 'accepted', toState: 'promoted' });
    expect(repository.reviewCandidate({
      candidateId: candidate.candidateId,
      version: 1,
      toState: 'superseded',
      reviewer: 'reviewer-a',
      reason: 'replacement accepted',
    })).toMatchObject({ fromState: 'promoted', toState: 'superseded' });

    const revised = repository.saveCandidates([{
      ...candidate,
      assertion: 'retain exact evidence citations',
      reviewState: 'pending',
      createdAt: new Date().toISOString(),
    }]);
    expect(revised).toMatchObject([{ version: 2, reviewState: 'pending' }]);
    expect(repository.reviewCandidate({
      candidateId: candidate.candidateId,
      version: 2,
      toState: 'deferred',
      reviewer: 'reviewer-b',
      reason: 'needs another source',
    })).toMatchObject({ fromState: 'pending', toState: 'deferred' });
    expect(repository.reviewCandidate({
      candidateId: candidate.candidateId,
      version: 2,
      toState: 'pending',
      reviewer: 'reviewer-b',
      reason: 'additional source received',
    })).toMatchObject({ fromState: 'deferred', toState: 'pending' });
    expect(repository.reviewCandidate({
      candidateId: candidate.candidateId,
      version: 2,
      toState: 'rejected',
      reviewer: 'reviewer-b',
      reason: 'replacement unsupported',
    })).toMatchObject({ fromState: 'pending', toState: 'rejected' });
    expect(repository.saveCandidates([{
      ...candidate,
      candidateId: sha256('alternate-candidate'),
      version: 99,
      reviewState: 'promoted',
      createdAt: new Date().toISOString(),
    }])).toMatchObject([{ version: 1, reviewState: 'pending' }]);
    expect(repository.listCandidates()).toHaveLength(3);
    repository.close();
  });

  it('rolls back an invalid batch without visible partial records', () => {
    const repository = new SessionRepository();
    expect(() => repository.applyImport({
      source,
      run: {
        contractVersion: SESSION_CONTRACT_VERSION, importRunId: sha256('invalid-run'),
        sourceId: source.sourceId, parserVersion: '1.0.0', policyVersion: '1.0.0',
        sourceSchemaVersion: '1.0.0', consistency: 'complete', status: 'running',
        checkpoint: { cursor: '1', recordsRead: 1, bytesRead: 1 },
        startedAt: '2026-07-26T00:00:00.000Z', completedAt: null, errorCode: null,
      },
      sessions: [],
      events: [{
        contractVersion: SESSION_CONTRACT_VERSION, eventId: 'orphan',
        sessionId: 'missing', sourceId: source.sourceId, importRunId: sha256('invalid-run'),
        nativeId: null, sequence: 0, kind: 'message', role: null, occurredAt: null,
        searchableText: '', digest: sha256(''), rawReference: { locatorClass: 'fixture' },
        adapterVersion: '1.0.0', consistency: 'complete',
        sensitivity: { classification: 'none', classes: [] },
        opaque: false, extensions: {},
      }],
    }, { cursor: '1', recordsRead: 1, bytesRead: 1 })).toThrow();
    expect(repository.getCheckpoint(source.sourceId, '1.0.0')).toBeNull();
    repository.close();
  });

  it('fails unknown major schemas before persistence', async () => {
    const repository = new SessionRepository();
    const importer = new IncrementalSessionImporter(repository);
    await expect(importer.import({
      source: { ...source, sourceSchemaVersion: '2.0.0' },
      selectedSource: {
        provider: 'generic', locator: '<fixture>', locatorClass: 'synthetic-fixture',
        sourceId: source.sourceId, authorizedScope: { workspaceId: 'workspace-1', allowedRoots: ['/fixture'] },
      },
      adapter: adapter(records), workspaceId: 'workspace-1', policyVersion: '1.0.0',
    })).rejects.toMatchObject({ code: 'UNKNOWN_SCHEMA_MAJOR' });
    expect(repository.getCheckpoint(source.sourceId, '1.0.0')).toBeNull();
    repository.close();
  });

  it('marks active tails provisional and persists only complete yielded records', async () => {
    const repository = new SessionRepository();
    const importer = new IncrementalSessionImporter(repository);
    const activeSource = { ...source, consistency: 'provisional' as const, sourceId: 'active-source' };
    await importer.import({
      source: activeSource,
      selectedSource: {
        provider: 'generic', locator: '<active-fixture>', locatorClass: 'synthetic-fixture',
        sourceId: activeSource.sourceId,
        authorizedScope: { workspaceId: 'workspace-1', allowedRoots: ['/fixture'] },
      },
      adapter: adapter(records.slice(0, 1)), workspaceId: 'workspace-1', policyVersion: '1.0.0',
    });
    const sessionId = stableSessionId('generic', activeSource.sourceId, 'native-1');
    expect(repository.getSession(sessionId)).toMatchObject({
      consistency: 'provisional', lifecycle: 'active',
    });
    expect(repository.listEvents(sessionId)).toHaveLength(1);
    repository.close();
  });

  it('keeps interrupted complete-source batches invisible and safely retries', async () => {
    const repository = new SessionRepository();
    const importer = new IncrementalSessionImporter(repository);
    let interrupted = true;
    const unstableAdapter: SessionSourceAdapter = {
      ...adapter(records),
      async *stream() {
        yield records[0];
        if (interrupted) throw new Error('simulated reader interruption');
        yield records[1];
      },
    };
    const request = {
      source: { ...source, sourceId: 'interrupted-source' },
      selectedSource: {
        provider: 'generic' as const, locator: '<fixture>', locatorClass: 'synthetic-fixture',
        sourceId: 'interrupted-source',
        authorizedScope: { workspaceId: 'workspace-1', allowedRoots: ['/fixture'] },
      },
      adapter: unstableAdapter, workspaceId: 'workspace-1', policyVersion: '1.0.0',
      limits: { batchSize: 1 },
    };
    await expect(importer.import(request)).rejects.toThrow('simulated reader interruption');
    const sessionId = stableSessionId('generic', 'interrupted-source', 'native-1');
    expect(repository.getSession(sessionId)).toBeNull();
    expect(repository.listEvents(sessionId)).toEqual([]);
    expect(repository.getCheckpoint('interrupted-source', '1.0.0')).toBeNull();

    interrupted = false;
    await expect(importer.import(request)).resolves.toHaveLength(2);
    expect(repository.listEvents(sessionId)).toHaveLength(2);
    expect(repository.getCheckpoint('interrupted-source', '1.0.0')).toMatchObject({
      cursor: '2', recordsRead: 2,
    });
    repository.close();
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
