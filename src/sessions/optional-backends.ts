import { sha256, SessionContractError } from './contracts.js';
import type {
  ImportReceipt,
  NormalizedImportBatch,
  SessionSearchDocument,
  SessionSearchHit,
  SessionSearchOptions,
  SessionSearchResult,
} from './repository.js';
import type { McpClientLike } from '../storage/backends/fortemi.js';
import type { ImportCheckpoint } from './contracts.js';

export type SessionRetrievalMode = 'lexical' | 'hybrid';

export interface SessionLexicalSearchPort {
  search(options: SessionSearchOptions): SessionSearchResult;
  authorizedSearchDocuments(
    options: Omit<SessionSearchOptions, 'query' | 'cursor'>,
  ): SessionSearchDocument[];
}

export interface SemanticRankRequest {
  query: string;
  workspaceId: string;
  documents: ReadonlyArray<{
    eventId: string;
    text: string;
    citation: SessionSearchHit['citation'];
  }>;
}

export interface SemanticCandidate {
  eventId: string;
  score: number;
}

export interface SessionSemanticBackend {
  readonly id: string;
  readonly requiresNetwork: boolean;
  readonly requiresModel: boolean;
  rank(request: SemanticRankRequest): Promise<SemanticCandidate[]>;
}

export interface FortemiSessionBackendOptions {
  client: McpClientLike;
  capabilities: {
    sourceAddressedUpsert: boolean;
    typedMetadataPredicates: boolean;
    evidenceLocators: boolean;
    graphPurge: boolean;
  };
}

export interface OptionalRepositoryAuthorization {
  approved: true;
  operationId: string;
}

export interface OptionalRepositoryPreview {
  contractVersion: '1.0.0';
  operationId: string;
  backend: 'fortemi';
  operation: 'upsert' | 'tombstone';
  workspaceId: string;
  sourceId?: string;
  sessionId?: string;
  eventCount: number;
  transfersApprovedText: boolean;
  requiresNetwork: true;
}

export class FortemiSessionRepositoryBackend {
  constructor(private readonly options: FortemiSessionBackendOptions) {}

  previewImport(batch: NormalizedImportBatch): OptionalRepositoryPreview {
    const workspaceIds = [...new Set(batch.sessions.map((session) => session.workspaceId))];
    if (workspaceIds.length !== 1) {
      throw new SessionContractError(
        'SOURCE_NOT_AUTHORIZED',
        'optional backend import must contain exactly one workspace scope',
      );
    }
    return repositoryPreview({
      operation: 'upsert',
      workspaceId: workspaceIds[0],
      sourceId: batch.source.sourceId,
      eventIdentities: batch.events.map((event) => `${event.eventId}:${event.digest}`),
      transfersApprovedText: true,
    });
  }

  async applyImport(
    batch: NormalizedImportBatch,
    checkpoint: ImportCheckpoint,
    authorization?: OptionalRepositoryAuthorization,
  ): Promise<ImportReceipt> {
    this.assertCapabilities();
    const preview = this.previewImport(batch);
    assertRepositoryAuthorization(preview, authorization);
    const result = await this.options.client.callTool('upsert_external_notes', {
      source_namespace: `aiwg.sessions.${batch.source.provider}`,
      source_id: batch.source.sourceId,
      source_schema_version: batch.source.sourceSchemaVersion,
      import_run_id: batch.run.importRunId,
      workspace_id: preview.workspaceId,
      items: batch.events.map((event) => ({
        external_id: event.eventId,
        content: event.searchableText,
        content_digest: event.digest,
        metadata: {
          session_id: event.sessionId,
          import_run_id: event.importRunId,
          locator_class: batch.source.locatorClass,
          role: event.role,
          sensitivity: event.sensitivity.classification,
        },
      })),
    }) as {
      outcome?: 'committed' | 'duplicate';
      sessions_inserted?: number;
      events_inserted?: number;
    } | null;
    return {
      operationId: batch.run.importRunId,
      outcome: result?.outcome ?? 'committed',
      sessionsInserted: result?.sessions_inserted ?? batch.sessions.length,
      eventsInserted: result?.events_inserted ?? batch.events.length,
      checkpoint,
    };
  }

  previewTombstone(
    workspaceId: string,
    sessionId: string,
    eventIds: readonly string[],
  ): OptionalRepositoryPreview {
    return repositoryPreview({
      operation: 'tombstone',
      workspaceId,
      sessionId,
      eventIdentities: eventIds,
      transfersApprovedText: false,
    });
  }

  async tombstone(
    workspaceId: string,
    sessionId: string,
    eventIds: readonly string[],
    authorization?: OptionalRepositoryAuthorization,
  ): Promise<{ operationId: string; outcome: 'committed'; affected: number }> {
    this.assertCapabilities(true);
    const preview = this.previewTombstone(workspaceId, sessionId, eventIds);
    assertRepositoryAuthorization(preview, authorization);
    const result = await this.options.client.callTool('purge_external_notes', {
      workspace_id: workspaceId,
      session_id: sessionId,
      external_ids: [...eventIds],
      mode: 'tombstone',
    }) as { affected?: number } | null;
    return {
      operationId: preview.operationId,
      outcome: 'committed',
      affected: result?.affected ?? eventIds.length,
    };
  }

  private assertCapabilities(requireGraphPurge = false): void {
    if (!this.options.capabilities.sourceAddressedUpsert
      || !this.options.capabilities.typedMetadataPredicates
      || !this.options.capabilities.evidenceLocators
      || (requireGraphPurge && !this.options.capabilities.graphPurge)) {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        'Fortemi session repository requires source upsert, typed predicates, evidence locators, and graph purge for deletion',
      );
    }
  }
}

export class FortemiSessionBackend implements SessionSemanticBackend {
  readonly id = 'fortemi';
  readonly requiresNetwork = true;
  readonly requiresModel = true;

  constructor(private readonly options: FortemiSessionBackendOptions) {}

  async rank(request: SemanticRankRequest): Promise<SemanticCandidate[]> {
    if (!this.options.capabilities.sourceAddressedUpsert
      || !this.options.capabilities.typedMetadataPredicates
      || !this.options.capabilities.evidenceLocators) {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        'Fortemi session integration requires source upsert, typed predicates, and evidence locators',
      );
    }
    const result = await this.options.client.callTool('search', {
      query: request.query,
      mode: 'hybrid',
      predicates: [{ path: 'workspace_id', op: 'eq', value: request.workspaceId }],
      candidates: request.documents.map((document) => ({
        external_id: document.eventId,
        content: document.text,
        citation: document.citation,
      })),
    }) as { results?: Array<{ external_id?: string; score?: number }> } | null;
    return (result?.results ?? [])
      .filter((entry): entry is { external_id: string; score: number } =>
        typeof entry.external_id === 'string' && typeof entry.score === 'number')
      .map((entry) => ({ eventId: entry.external_id, score: entry.score }));
  }
}

export interface OptionalBackendPreview {
  contractVersion: '1.0.0';
  operationId: string;
  backend: string;
  mode: 'hybrid';
  workspaceId: string;
  candidateCount: number;
  transfersApprovedText: true;
  requiresNetwork: boolean;
  requiresModel: boolean;
}

export interface HybridSearchRequest {
  options: SessionSearchOptions;
  mode?: SessionRetrievalMode;
  backend?: SessionSemanticBackend;
  authorization?: {
    approved: true;
    operationId: string;
  };
}

export class SessionSearchService {
  constructor(private readonly lexical: SessionLexicalSearchPort) {}

  preview(
    options: SessionSearchOptions,
    backend: SessionSemanticBackend,
  ): OptionalBackendPreview {
    const documents = this.documents(options);
    return createPreview(options, backend, documents);
  }

  async search(request: HybridSearchRequest): Promise<SessionSearchResult> {
    if ((request.mode ?? 'lexical') === 'lexical' || !request.backend) {
      return this.lexical.search(request.options);
    }
    const documents = this.documents(request.options);
    const preview = createPreview(request.options, request.backend, documents);
    if (!request.authorization?.approved
      || request.authorization.operationId !== preview.operationId) {
      throw new SessionContractError(
        request.backend.requiresNetwork ? 'NETWORK_NOT_AUTHORIZED' : 'OPERATION_NOT_AUTHORIZED',
        'optional semantic/backend search requires approval of the exact preview operation',
      );
    }
    const ranked = await request.backend.rank({
      query: request.options.query,
      workspaceId: request.options.workspaceId,
      documents: documents.map((document) => ({
        eventId: document.eventId,
        text: document.searchableText,
        citation: document.citation,
      })),
    });
    const authorized = new Map(documents.map((document) => [document.eventId, document]));
    const semanticByEvent = new Map<string, number>();
    for (const candidate of ranked) {
      if (!Number.isFinite(candidate.score) || !authorized.has(candidate.eventId)) continue;
      semanticByEvent.set(
        candidate.eventId,
        Math.max(semanticByEvent.get(candidate.eventId) ?? Number.NEGATIVE_INFINITY, candidate.score),
      );
    }
    const semantic = [...semanticByEvent.entries()]
      .map(([eventId, score]) => ({ eventId, score }))
      .sort((left, right) => right.score - left.score || left.eventId.localeCompare(right.eventId));
    const lexical = this.lexical.search({
      ...request.options,
      limit: Math.min(500, Math.max(request.options.limit * 2, request.options.limit)),
      cursor: undefined,
    }).items;
    const scores = new Map<string, number>();
    lexical.forEach((hit, index) => scores.set(hit.eventId, 1 / (60 + index + 1)));
    semantic.forEach((hit, index) => {
      scores.set(hit.eventId, (scores.get(hit.eventId) ?? 0) + 1 / (60 + index + 1));
    });
    const items = [...scores.entries()]
      .map(([eventId, score]) => ({ hit: authorized.get(eventId), score }))
      .filter((entry): entry is { hit: SessionSearchDocument; score: number } => Boolean(entry.hit))
      .sort((left, right) => right.score - left.score
        || left.hit.eventId.localeCompare(right.hit.eventId))
      .slice(0, request.options.limit)
      .map(({ hit, score }) => {
        const { searchableText: _searchableText, ...publicHit } = hit;
        return { ...publicHit, score };
      });
    return { items, nextCursor: null };
  }

  private documents(options: SessionSearchOptions): SessionSearchDocument[] {
    const { query: _query, cursor: _cursor, ...scope } = options;
    return this.lexical.authorizedSearchDocuments({
      ...scope,
      limit: Math.min(500, Math.max(100, options.limit * 20)),
    });
  }
}

function createPreview(
  options: SessionSearchOptions,
  backend: SessionSemanticBackend,
  documents: SessionSearchDocument[],
): OptionalBackendPreview {
  const operationId = sha256(JSON.stringify({
    backend: backend.id,
    mode: 'hybrid',
    workspaceId: options.workspaceId,
    queryDigest: sha256(options.query),
    scopeDigest: sha256(JSON.stringify({
      providers: options.providers ?? [],
      dateFrom: options.dateFrom ?? null,
      dateTo: options.dateTo ?? null,
      participant: options.participant ?? null,
      model: options.model ?? null,
      role: options.role ?? null,
      tool: options.tool ?? null,
      tag: options.tag ?? null,
      entity: options.entity ?? null,
      sensitivity: options.sensitivity ?? null,
      extractionState: options.extractionState ?? null,
      limit: options.limit,
    })),
    eventIds: documents.map((document) => document.eventId),
    requiresNetwork: backend.requiresNetwork,
    requiresModel: backend.requiresModel,
  }));
  return {
    contractVersion: '1.0.0',
    operationId,
    backend: backend.id,
    mode: 'hybrid',
    workspaceId: options.workspaceId,
    candidateCount: documents.length,
    transfersApprovedText: true,
    requiresNetwork: backend.requiresNetwork,
    requiresModel: backend.requiresModel,
  };
}

function repositoryPreview(input: {
  operation: 'upsert' | 'tombstone';
  workspaceId: string;
  sourceId?: string;
  sessionId?: string;
  eventIdentities: readonly string[];
  transfersApprovedText: boolean;
}): OptionalRepositoryPreview {
  return {
    contractVersion: '1.0.0',
    operationId: sha256(JSON.stringify(input)),
    backend: 'fortemi',
    operation: input.operation,
    workspaceId: input.workspaceId,
    sourceId: input.sourceId,
    sessionId: input.sessionId,
    eventCount: input.eventIdentities.length,
    transfersApprovedText: input.transfersApprovedText,
    requiresNetwork: true,
  };
}

function assertRepositoryAuthorization(
  preview: OptionalRepositoryPreview,
  authorization?: OptionalRepositoryAuthorization,
): void {
  if (!authorization?.approved || authorization.operationId !== preview.operationId) {
    throw new SessionContractError(
      'NETWORK_NOT_AUTHORIZED',
      'optional repository operation requires approval of the exact preview operation',
    );
  }
}
