import { stat } from 'node:fs/promises';
import {
  CLAUDE_ADAPTER_VERSION,
  ClaudeSessionAdapter,
} from './adapters/claude.js';
import {
  CODEX_ADAPTER_VERSION,
  CodexSessionAdapter,
} from './adapters/codex.js';
import {
  CURSOR_ADAPTER_VERSION,
  CursorSessionAdapter,
} from './adapters/cursor.js';
import {
  FACTORY_ADAPTER_VERSION,
  FactorySessionAdapter,
} from './adapters/factory.js';
import {
  SESSION_CONTRACT_VERSION,
  SessionContractError,
  SessionSourceSchema,
  sha256,
  type SelectedSource,
  type SessionSource,
  type SessionSourceAdapter,
} from './contracts.js';
import {
  BATCH_IMPORT_VERSION,
  coverageFromBatchRun,
  type BatchImportRun,
  type BatchSourceDisposition,
  type SessionCoverageReport,
} from './batch-contracts.js';
import { IncrementalSessionImporter, SessionImportFailure } from './importer.js';
import { fingerprintSourceFile } from './readers.js';
import type { SessionRepository } from './repository.js';
import type {
  DiscoveryManifestSource,
  SessionDiscoveryManifest,
} from './workspace-discovery.js';

export interface BatchImportOptions {
  manifest: SessionDiscoveryManifest;
  repository: SessionRepository;
  signal?: AbortSignal;
  inactivityThresholdMs?: number;
  now?: () => Date;
  fault?: (
    boundary: 'run-saved' | 'source-staged' | 'before-publication' | 'after-publication',
    sourceId?: string,
  ) => void;
}

export interface BatchImportReceipt {
  schemaVersion: typeof BATCH_IMPORT_VERSION;
  run: BatchImportRun;
  coverage: SessionCoverageReport;
  totals: {
    discovered: number;
    accepted: number;
    rejected: number;
    skipped: number;
    duplicated: number;
    previouslyCommitted: number;
    pending: number;
    sessionsAccepted: number;
    eventsAccepted: number;
  };
}

export async function importDiscoveryManifest(
  options: BatchImportOptions,
): Promise<BatchImportReceipt> {
  const now = options.now ?? (() => new Date());
  const runId = sha256([
    'workspace-import-v1',
    options.manifest.manifestId,
    options.manifest.workspaceId,
  ].join('\0'));
  const prior = options.repository.getBatchImportRunForManifest(
    options.manifest.manifestId,
    options.manifest.workspaceId,
  );
  const run = prior ?? newBatchRun(options.manifest, runId, now());
  if (run.runId !== runId) {
    throw new SessionContractError(
      'IMPORT_CONFLICT',
      'discovery manifest is already associated with a different batch run',
    );
  }
  run.status = 'running';
  run.updatedAt = now().toISOString();
  run.completedAt = null;
  options.repository.saveBatchImportRun(run);
  injectFault(options, run, 'run-saved');

  for (const manifestSource of options.manifest.sources) {
    const disposition = run.sources.find(
      (candidate) => candidate.sourceId === manifestSource.sourceId,
    );
    if (!disposition) {
      throw new SessionContractError(
        'IMPORT_CONFLICT',
        `batch run is missing discovered source ${manifestSource.sourceId}`,
      );
    }
    if (isAccepted(disposition.status)) {
      disposition.status = 'previously-committed';
      disposition.updatedAt = now().toISOString();
      continue;
    }
    if (options.signal?.aborted) {
      run.status = 'interrupted';
      run.updatedAt = now().toISOString();
      options.repository.saveBatchImportRun(run);
      throw new SessionContractError(
        'IMPORT_INTERRUPTED',
        'workspace batch import was cancelled and can be resumed',
      );
    }

    disposition.status = 'running';
    disposition.attempts += 1;
    disposition.errorCode = null;
    disposition.diagnostic = null;
    disposition.updatedAt = now().toISOString();
    persistProgress(options.repository, run, now());
    try {
      await assertManifestSourceUnchanged(manifestSource);
      const selectedSource: SelectedSource = {
        provider: manifestSource.provider,
        locator: manifestSource.locator,
        locatorClass: manifestSource.locatorClass,
        sourceId: manifestSource.sourceId,
        authorizedScope: {
          workspaceId: options.manifest.workspaceId,
          allowedRoots: [manifestSource.authorizedRoot],
        },
      };
      const adapter = adapterFor(manifestSource.provider);
      const source = await sessionSource(selectedSource, adapter);
      const receipts = await new IncrementalSessionImporter(options.repository).import({
        source,
        selectedSource,
        adapter,
        workspaceId: options.manifest.workspaceId,
        policyVersion: '1.0.0',
        batchRunId: run.runId,
        publish: false,
        signal: options.signal,
        inactivityThresholdMs: options.inactivityThresholdMs,
      });
      await assertManifestSourceUnchanged(manifestSource);
      const totals = options.repository.sourceImportTotals(
        manifestSource.sourceId,
        run.runId,
      );
      disposition.sessionsAccepted = totals.sessions;
      disposition.eventsAccepted = totals.events;
      disposition.status = receipts.length > 0
        && receipts.every((receipt) => receipt.outcome === 'duplicate')
        ? 'duplicate'
        : receipts.length === 0
          ? 'previously-committed'
          : 'committed';
    } catch (error) {
      disposition.status = 'rejected';
      disposition.errorCode = importErrorCode(error);
      disposition.diagnostic = [
        `provider=${manifestSource.provider}`,
        `source=${manifestSource.sourceId}`,
        `code=${disposition.errorCode}`,
      ].join(' ');
    }
    disposition.updatedAt = now().toISOString();
    persistProgress(options.repository, run, now());
    injectFault(options, run, 'source-staged', manifestSource.sourceId);
  }

  const rejected = run.sources.some((source) => source.status === 'rejected');
  const pending = run.sources.some(
    (source) => source.status === 'pending' || source.status === 'running',
  );
  const providerGap = run.providers.some(
    (provider) => provider.status === 'export-required' || provider.status === 'not-checked',
  );
  const publishable = run.sources
    .filter((source) => isAccepted(source.status))
    .map((source) => source.sourceId);
  injectFault(options, run, 'before-publication');
  options.repository.commitStagedBatch(run.runId, publishable);
  injectFault(options, run, 'after-publication');
  run.status = pending ? 'interrupted' : rejected || providerGap ? 'partial' : 'complete';
  run.updatedAt = now().toISOString();
  run.completedAt = pending ? null : run.updatedAt;
  options.repository.saveBatchImportRun(run);
  return receiptFor(run, now());
}

function injectFault(
  options: BatchImportOptions,
  run: BatchImportRun,
  boundary: 'run-saved' | 'source-staged' | 'before-publication' | 'after-publication',
  sourceId?: string,
): void {
  if (!options.fault) return;
  try {
    options.fault(boundary, sourceId);
  } catch (error) {
    run.status = 'interrupted';
    run.updatedAt = (options.now ?? (() => new Date()))().toISOString();
    run.completedAt = null;
    options.repository.saveBatchImportRun(run);
    throw error;
  }
}

export function previewDiscoveryImport(
  manifest: SessionDiscoveryManifest,
  existing: BatchImportRun | null,
  now = new Date(),
): BatchImportReceipt {
  const run = existing ?? newBatchRun(
    manifest,
    sha256(['workspace-import-v1', manifest.manifestId, manifest.workspaceId].join('\0')),
    now,
  );
  return receiptFor(run, now);
}

function newBatchRun(
  manifest: SessionDiscoveryManifest,
  runId: string,
  now: Date,
): BatchImportRun {
  const timestamp = now.toISOString();
  return {
    schemaVersion: BATCH_IMPORT_VERSION,
    runId,
    manifestId: manifest.manifestId,
    manifestCreatedAt: manifest.createdAt,
    workspaceId: manifest.workspaceId,
    status: 'running',
    startedAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    providers: manifest.providers,
    sources: manifest.sources.map((source): BatchSourceDisposition => ({
      sourceId: source.sourceId,
      provider: source.provider,
      status: 'pending',
      attempts: 0,
      sessionsAccepted: 0,
      eventsAccepted: 0,
      errorCode: null,
      diagnostic: null,
      updatedAt: timestamp,
    })),
  };
}

function receiptFor(run: BatchImportRun, now: Date): BatchImportReceipt {
  const coverage = coverageFromBatchRun(run, now);
  return {
    schemaVersion: BATCH_IMPORT_VERSION,
    run,
    coverage,
    totals: {
      discovered: coverage.sources.discovered,
      accepted: coverage.sources.accepted,
      rejected: coverage.sources.rejected,
      skipped: coverage.sources.skipped,
      duplicated: coverage.sources.duplicated,
      previouslyCommitted: coverage.sources.previouslyCommitted,
      pending: coverage.sources.pending,
      sessionsAccepted: coverage.sessionsAccepted,
      eventsAccepted: coverage.eventsAccepted,
    },
  };
}

function persistProgress(
  repository: SessionRepository,
  run: BatchImportRun,
  now: Date,
): void {
  run.updatedAt = now.toISOString();
  repository.saveBatchImportRun(run);
}

async function assertManifestSourceUnchanged(source: DiscoveryManifestSource): Promise<void> {
  let details;
  try {
    details = await stat(source.locator);
  } catch {
    throw new SessionContractError(
      'SCHEMA_DRIFT',
      'discovered source is no longer available; run discovery again',
    );
  }
  if (details.size !== source.sizeBytes || details.mtime.toISOString() !== source.modifiedAt) {
    throw new SessionContractError(
      'SCHEMA_DRIFT',
      'discovered source changed after manifest creation; run discovery again',
    );
  }
  const fingerprint = await fingerprintSourceFile({
    selectedPath: source.locator,
    allowedRoots: [source.authorizedRoot],
  });
  if (fingerprint.digest !== source.digest || fingerprint.size !== source.sizeBytes) {
    throw new SessionContractError(
      'SCHEMA_DRIFT',
      'discovered source content changed after manifest creation; run discovery again',
    );
  }
}

function adapterFor(provider: DiscoveryManifestSource['provider']): SessionSourceAdapter {
  if (provider === 'claude') return new ClaudeSessionAdapter();
  if (provider === 'codex') return new CodexSessionAdapter();
  if (provider === 'cursor') return new CursorSessionAdapter();
  if (provider === 'factory') return new FactorySessionAdapter();
  throw new SessionContractError(
    'UNSUPPORTED_OPERATION',
    `batch discovery import is not implemented for ${provider}`,
  );
}

async function sessionSource(
  selected: SelectedSource,
  adapter: SessionSourceAdapter,
): Promise<SessionSource> {
  const probe = await adapter.inspect(selected);
  return SessionSourceSchema.parse({
    contractVersion: SESSION_CONTRACT_VERSION,
    sourceId: selected.sourceId,
    provider: selected.provider,
    providerProfile: providerProfile(selected.provider, selected.locatorClass),
    locatorClass: selected.locatorClass,
    redactedLocator: '<discovered-session-source>',
    adapterVersion: adapterVersion(selected.provider),
    sourceSchemaVersion: probe.sourceSchemaVersion,
    disposition: 'implemented',
    operationalState: probe.operationalState,
    consistency: probe.consistency,
    authorizedAt: new Date().toISOString(),
    extensions: { [`native.${selected.provider}`]: {} },
  });
}

function adapterVersion(provider: DiscoveryManifestSource['provider']): string {
  if (provider === 'claude') return CLAUDE_ADAPTER_VERSION;
  if (provider === 'codex') return CODEX_ADAPTER_VERSION;
  if (provider === 'cursor') return CURSOR_ADAPTER_VERSION;
  if (provider === 'factory') return FACTORY_ADAPTER_VERSION;
  return '1.0.0';
}

function providerProfile(
  provider: DiscoveryManifestSource['provider'],
  locatorClass: string,
): string {
  if (provider === 'claude') return 'documented-local-jsonl';
  if (provider === 'codex') return 'app-server-v2-rollout-fallback';
  if (provider === 'cursor') {
    return locatorClass === 'cursor-agent-transcript-jsonl'
      ? 'agent-transcript-jsonl'
      : 'cli-stream-json';
  }
  if (provider === 'factory') return 'documented-project-jsonl';
  return 'manual-interchange';
}

function importErrorCode(error: unknown): string {
  if (error instanceof SessionImportFailure) return error.failureReceipt.errorCode;
  if (error instanceof SessionContractError) return error.code;
  return 'IMPORT_INTERRUPTED';
}

function isAccepted(status: BatchSourceDisposition['status']): boolean {
  return status === 'committed'
    || status === 'duplicate'
    || status === 'previously-committed';
}
