import type { ImportCheckpoint } from './contracts.js';
import type {
  ImportReceipt,
  NormalizedImportBatch,
  SessionSearchDocument,
  SessionSearchOptions,
  SessionSearchResult,
} from './repository.js';
import type {
  OptionalRepositoryAuthorization,
  OptionalRepositoryPreview,
} from './optional-backends.js';

export interface SessionRepositoryPort {
  applyImport(
    batch: NormalizedImportBatch,
    checkpoint: ImportCheckpoint,
    publish?: boolean,
  ): ImportReceipt;
  getCheckpoint(sourceId: string, parserVersion: string): ImportCheckpoint | null;
  getBatchCheckpoint(
    sourceId: string,
    parserVersion: string,
    batchRunId: string,
  ): ImportCheckpoint | null;
  commitStagedImports(sourceId: string, parserVersion: string): number;
}

export interface SessionSearchPort {
  search(options: SessionSearchOptions): SessionSearchResult;
  authorizedSearchDocuments(
    options: Omit<SessionSearchOptions, 'query' | 'cursor'>,
  ): SessionSearchDocument[];
}

export interface OptionalSessionRepositoryPort {
  previewImport(batch: NormalizedImportBatch): OptionalRepositoryPreview;
  applyImport(
    batch: NormalizedImportBatch,
    checkpoint: ImportCheckpoint,
    authorization?: OptionalRepositoryAuthorization,
  ): Promise<ImportReceipt>;
  previewTombstone(
    workspaceId: string,
    sessionId: string,
    eventIds: readonly string[],
  ): OptionalRepositoryPreview;
  tombstone(
    workspaceId: string,
    sessionId: string,
    eventIds: readonly string[],
    authorization?: OptionalRepositoryAuthorization,
  ): Promise<{ operationId: string; outcome: 'committed'; affected: number }>;
}
