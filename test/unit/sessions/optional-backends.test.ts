import { describe, expect, it, vi } from 'vitest';
import {
  FortemiSessionRepositoryBackend,
  FortemiSessionBackend,
  SESSION_CONTRACT_VERSION,
  SessionSearchService,
  sha256,
  type NormalizedImportBatch,
  type SessionLexicalSearchPort,
  type SessionSearchDocument,
  type SessionSearchOptions,
  type SessionSemanticBackend,
} from '../../../src/sessions/index.js';

const options: SessionSearchOptions = {
  query: 'decision',
  workspaceId: 'workspace-a',
  providers: ['generic'],
  limit: 10,
};

function document(eventId: string, workspaceId = 'workspace-a'): SessionSearchDocument {
  return {
    score: 0.5,
    snippet: `approved ${eventId}`,
    searchableText: `approved ${eventId}`,
    provider: 'generic',
    workspaceId,
    sessionId: 'session-1',
    eventId,
    importRunId: 'run-1',
    sourceId: 'source-1',
    locatorClass: 'fixture',
    sequence: 0,
    role: 'assistant',
    occurredAt: null,
    sensitivity: 'none',
    citation: {
      provider: 'generic',
      sessionId: 'session-1',
      eventId,
      importRunId: 'run-1',
      sourceId: 'source-1',
      locatorClass: 'fixture',
    },
  };
}

function lexicalPort(documents: SessionSearchDocument[]): SessionLexicalSearchPort {
  return {
    search: () => ({
      items: documents.slice(0, 1).map(({ searchableText: _text, ...hit }) => hit),
      nextCursor: null,
    }),
    authorizedSearchDocuments: (scope) =>
      documents.filter((item) => item.workspaceId === scope.workspaceId),
  };
}

function importBatch(): NormalizedImportBatch {
  return {
    source: {
      contractVersion: SESSION_CONTRACT_VERSION,
      sourceId: 'source-1',
      provider: 'generic',
      providerProfile: 'fixture',
      locatorClass: 'manual-export',
      redactedLocator: '<fixture>',
      adapterVersion: '1.0.0',
      sourceSchemaVersion: '1.0.0',
      disposition: 'implemented',
      operationalState: 'available',
      consistency: 'complete',
      authorizedAt: '2026-07-27T00:00:00.000Z',
      extensions: {},
    },
    run: {
      contractVersion: SESSION_CONTRACT_VERSION,
      importRunId: 'run-1',
      sourceId: 'source-1',
      parserVersion: '1.0.0',
      policyVersion: '1.0.0',
      sourceSchemaVersion: '1.0.0',
      consistency: 'complete',
      status: 'running',
      checkpoint: { cursor: '1', recordsRead: 1, bytesRead: 10 },
      startedAt: '2026-07-27T00:00:00.000Z',
      completedAt: null,
      errorCode: null,
    },
    sessions: [{
      contractVersion: SESSION_CONTRACT_VERSION,
      sessionId: 'session-1',
      sourceId: 'source-1',
      provider: 'generic',
      nativeSessionId: 'native-1',
      workspaceId: 'workspace-a',
      startedAt: null,
      updatedAt: null,
      consistency: 'complete',
      lifecycle: 'complete',
      sourceDigest: sha256('source'),
      extensions: {},
    }],
    events: [{
      contractVersion: SESSION_CONTRACT_VERSION,
      eventId: 'event-a',
      sessionId: 'session-1',
      sourceId: 'source-1',
      importRunId: 'run-1',
      nativeId: 'native-event-a',
      sequence: 0,
      kind: 'message',
      role: 'assistant',
      occurredAt: null,
      searchableText: 'approved redacted decision',
      digest: sha256('approved redacted decision'),
      rawReference: { locatorClass: 'manual-export', sequence: 0 },
      adapterVersion: '1.0.0',
      consistency: 'complete',
      sensitivity: { classification: 'none', classes: [] },
      opaque: false,
      extensions: {},
    }],
  };
}

describe('optional session search backends', () => {
  it('keeps lexical search fully functional without a backend', async () => {
    const service = new SessionSearchService(lexicalPort([document('event-a')]));
    await expect(service.search({ options })).resolves.toMatchObject({
      items: [{ eventId: 'event-a', citation: { eventId: 'event-a' } }],
    });
  });

  it('requires exact preview approval before model or network use', async () => {
    const backend: SessionSemanticBackend = {
      id: 'remote-model',
      requiresNetwork: true,
      requiresModel: true,
      rank: vi.fn().mockResolvedValue([]),
    };
    const service = new SessionSearchService(lexicalPort([document('event-a')]));
    const preview = service.preview(options, backend);
    expect(preview).toMatchObject({
      backend: 'remote-model',
      workspaceId: 'workspace-a',
      candidateCount: 1,
      transfersApprovedText: true,
      requiresNetwork: true,
      requiresModel: true,
    });
    await expect(service.search({ options, mode: 'hybrid', backend }))
      .rejects.toMatchObject({ code: 'NETWORK_NOT_AUTHORIZED' });
    expect(backend.rank).not.toHaveBeenCalled();
    await expect(service.search({
      options,
      mode: 'hybrid',
      backend,
      authorization: { approved: true, operationId: 'wrong-preview' },
    })).rejects.toMatchObject({ code: 'NETWORK_NOT_AUTHORIZED' });
    expect(backend.rank).not.toHaveBeenCalled();
    await service.search({
      options,
      mode: 'hybrid',
      backend,
      authorization: { approved: true, operationId: preview.operationId },
    });
    expect(backend.rank).toHaveBeenCalledOnce();
  });

  it('drops out-of-scope and stale semantic candidates while preserving citations and identity', async () => {
    const documents = [document('event-a'), document('event-b'), document('event-other', 'workspace-b')];
    const backend: SessionSemanticBackend = {
      id: 'fixture',
      requiresNetwork: false,
      requiresModel: true,
      rank: vi.fn().mockResolvedValue([
        { eventId: 'event-b', score: 0.9 },
        { eventId: 'event-other', score: 1 },
        { eventId: 'deleted-event', score: 1 },
        { eventId: 'event-b', score: 0.8 },
      ]),
    };
    const service = new SessionSearchService(lexicalPort(documents));
    const preview = service.preview(options, backend);
    const result = await service.search({
      options,
      mode: 'hybrid',
      backend,
      authorization: { approved: true, operationId: preview.operationId },
    });
    expect(result.items.map((item) => item.eventId).sort()).toEqual(['event-a', 'event-b']);
    expect(result.items.find((item) => item.eventId === 'event-b')?.citation)
      .toEqual(document('event-b').citation);
    expect(result.items.every((item) => !('searchableText' in item))).toBe(true);
  });

  it('retains late lexical hits outside the bounded semantic candidate window', async () => {
    const semanticDocuments = Array.from({ length: 500 }, (_, index) =>
      document(`semantic-${String(index).padStart(3, '0')}`));
    const late = document('event-501');
    const port: SessionLexicalSearchPort = {
      search: () => {
        const { searchableText: _text, ...hit } = late;
        return { items: [hit], nextCursor: null };
      },
      authorizedSearchDocuments: () => semanticDocuments,
    };
    const backend: SessionSemanticBackend = {
      id: 'bounded-fixture',
      requiresNetwork: false,
      requiresModel: true,
      rank: vi.fn().mockResolvedValue([]),
    };
    const service = new SessionSearchService(port);
    const preview = service.preview(options, backend);
    const result = await service.search({
      options,
      mode: 'hybrid',
      backend,
      authorization: { approved: true, operationId: preview.operationId },
    });
    expect(result.items.map((item) => item.eventId)).toContain('event-501');
  });

  it('invalidates approval after replay/lifecycle scope changes and excludes deleted identities', async () => {
    let documents = [document('event-a'), document('event-b')];
    const port: SessionLexicalSearchPort = {
      search: () => ({
        items: documents.map(({ searchableText: _text, ...hit }) => hit),
        nextCursor: null,
      }),
      authorizedSearchDocuments: () => documents,
    };
    const backend: SessionSemanticBackend = {
      id: 'fixture',
      requiresNetwork: false,
      requiresModel: true,
      rank: vi.fn().mockResolvedValue([
        { eventId: 'event-a', score: 1 },
        { eventId: 'event-b', score: 0.9 },
      ]),
    };
    const service = new SessionSearchService(port);
    const original = service.preview(options, backend);

    // Identical replay preserves the exact preview identity.
    expect(service.preview(options, backend).operationId).toBe(original.operationId);

    // Tombstone/purge simulation removes an authorized document and changes the approval boundary.
    documents = [document('event-b')];
    const afterDeletion = service.preview(options, backend);
    expect(afterDeletion.operationId).not.toBe(original.operationId);
    await expect(service.search({
      options,
      mode: 'hybrid',
      backend,
      authorization: { approved: true, operationId: original.operationId },
    })).rejects.toMatchObject({ code: 'OPERATION_NOT_AUTHORIZED' });
    const result = await service.search({
      options,
      mode: 'hybrid',
      backend,
      authorization: { approved: true, operationId: afterDeletion.operationId },
    });
    expect(result.items.map((item) => item.eventId)).toEqual(['event-b']);
  });

  it('gates the Fortemi adapter on the required upstream capabilities', async () => {
    const callTool = vi.fn();
    const backend = new FortemiSessionBackend({
      client: { callTool },
      capabilities: {
        sourceAddressedUpsert: false,
        typedMetadataPredicates: false,
        evidenceLocators: false,
        graphPurge: false,
      },
    });
    await expect(backend.rank({
      query: 'decision',
      workspaceId: 'workspace-a',
      documents: [],
    })).rejects.toMatchObject({ code: 'UNSUPPORTED_OPERATION' });
    expect(callTool).not.toHaveBeenCalled();
  });

  it('uses typed workspace predicates and evidence-addressed candidates when Fortemi is ready', async () => {
    const callTool = vi.fn().mockResolvedValue({
      results: [
        { external_id: 'event-b', score: 0.9 },
        { external_id: 'event-outside', score: 1 },
      ],
    });
    const backend = new FortemiSessionBackend({
      client: { callTool },
      capabilities: {
        sourceAddressedUpsert: true,
        typedMetadataPredicates: true,
        evidenceLocators: true,
        graphPurge: true,
      },
    });
    const result = await backend.rank({
      query: 'decision',
      workspaceId: 'workspace-a',
      documents: [{
        eventId: 'event-b',
        text: 'approved event-b',
        citation: document('event-b').citation,
      }],
    });
    expect(result).toEqual([
      { eventId: 'event-b', score: 0.9 },
      { eventId: 'event-outside', score: 1 },
    ]);
    expect(callTool).toHaveBeenCalledWith('search', {
      query: 'decision',
      mode: 'hybrid',
      predicates: [{ path: 'workspace_id', op: 'eq', value: 'workspace-a' }],
      candidates: [{
        external_id: 'event-b',
        content: 'approved event-b',
        citation: document('event-b').citation,
      }],
    });
  });

  it('applies the same preview, identity, replay, and deletion contract to Fortemi', async () => {
    const callTool = vi.fn()
      .mockResolvedValueOnce({
        outcome: 'committed',
        sessions_inserted: 1,
        events_inserted: 1,
      })
      .mockResolvedValueOnce({
        outcome: 'duplicate',
        sessions_inserted: 0,
        events_inserted: 0,
      })
      .mockResolvedValueOnce({ affected: 1 });
    const repository = new FortemiSessionRepositoryBackend({
      client: { callTool },
      capabilities: {
        sourceAddressedUpsert: true,
        typedMetadataPredicates: true,
        evidenceLocators: true,
        graphPurge: true,
      },
    });
    const batch = importBatch();
    const preview = repository.previewImport(batch);
    await expect(repository.applyImport(batch, batch.run.checkpoint))
      .rejects.toMatchObject({ code: 'NETWORK_NOT_AUTHORIZED' });
    const authorization = { approved: true as const, operationId: preview.operationId };
    await expect(repository.applyImport(batch, batch.run.checkpoint, authorization))
      .resolves.toMatchObject({
        operationId: 'run-1',
        outcome: 'committed',
        sessionsInserted: 1,
        eventsInserted: 1,
      });
    await expect(repository.applyImport(batch, batch.run.checkpoint, authorization))
      .resolves.toMatchObject({
        operationId: 'run-1',
        outcome: 'duplicate',
        eventsInserted: 0,
      });
    expect(callTool.mock.calls[0][1]).toMatchObject({
      source_id: 'source-1',
      import_run_id: 'run-1',
      workspace_id: 'workspace-a',
      items: [{
        external_id: 'event-a',
        content: 'approved redacted decision',
        metadata: {
          session_id: 'session-1',
          import_run_id: 'run-1',
          locator_class: 'manual-export',
        },
      }],
    });

    const deletionPreview = repository.previewTombstone(
      'workspace-a',
      'session-1',
      ['event-a'],
    );
    await expect(repository.tombstone(
      'workspace-a',
      'session-1',
      ['event-a'],
      { approved: true, operationId: deletionPreview.operationId },
    )).resolves.toMatchObject({ outcome: 'committed', affected: 1 });
    expect(callTool.mock.calls[2][1]).toEqual({
      workspace_id: 'workspace-a',
      session_id: 'session-1',
      external_ids: ['event-a'],
      mode: 'tombstone',
    });
  });
});
