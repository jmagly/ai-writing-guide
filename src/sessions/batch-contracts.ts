import type { DiscoveryProviderReport } from './workspace-discovery.js';

export const BATCH_IMPORT_VERSION = '1.0.0' as const;
export const COVERAGE_VERSION = '1.0.0' as const;

export type BatchSourceStatus =
  | 'pending'
  | 'running'
  | 'committed'
  | 'duplicate'
  | 'previously-committed'
  | 'rejected'
  | 'skipped';

export interface BatchSourceDisposition {
  sourceId: string;
  provider: string;
  status: BatchSourceStatus;
  attempts: number;
  sessionsAccepted: number;
  eventsAccepted: number;
  errorCode: string | null;
  diagnostic: string | null;
  updatedAt: string;
}

export interface BatchImportRun {
  schemaVersion: typeof BATCH_IMPORT_VERSION;
  runId: string;
  manifestId: string;
  manifestCreatedAt: string;
  workspaceId: string;
  status: 'running' | 'complete' | 'partial' | 'interrupted';
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  providers: DiscoveryProviderReport[];
  sources: BatchSourceDisposition[];
}

export interface SessionCoverageReport {
  schemaVersion: typeof COVERAGE_VERSION;
  status: 'complete' | 'partial' | 'stale' | 'unknown';
  workspaceId: string;
  manifestId: string | null;
  batchRunId: string | null;
  manifestCreatedAt: string | null;
  manifestAgeMs: number | null;
  providers: {
    checked: string[];
    unavailable: string[];
    exportRequired: string[];
    notChecked: string[];
  };
  sources: {
    discovered: number;
    accepted: number;
    rejected: number;
    skipped: number;
    duplicated: number;
    previouslyCommitted: number;
    pending: number;
  };
  sessionsAccepted: number;
  eventsAccepted: number;
  coverageRatio: number | null;
  rejectionCounts: Record<string, number>;
  sourceDateRange: { earliest: string | null; latest: string | null };
  importedDateRange: { earliest: string | null; latest: string | null };
  remediation: string[];
}

export function coverageFromBatchRun(
  run: BatchImportRun | null,
  now = new Date(),
  staleAfterMs = 24 * 60 * 60 * 1_000,
): SessionCoverageReport {
  if (!run) return unknownCoverage();
  const coveredStatuses = new Set<BatchSourceStatus>([
    'committed', 'duplicate', 'previously-committed',
  ]);
  const accepted = run.sources.filter((source) => source.status === 'committed').length;
  const rejected = run.sources.filter((source) => source.status === 'rejected').length;
  const skipped = run.sources.filter((source) => source.status === 'skipped').length;
  const duplicated = run.sources.filter(
    (source) => source.status === 'duplicate',
  ).length;
  const previouslyCommitted = run.sources.filter(
    (source) => source.status === 'previously-committed',
  ).length;
  const pending = run.sources.filter(
    (source) => source.status === 'pending' || source.status === 'running',
  ).length;
  const checked = providerNames(run, 'checked');
  const unavailable = providerNames(run, 'unavailable');
  const exportRequired = providerNames(run, 'export-required');
  const notChecked = providerNames(run, 'not-checked');
  const manifestAgeMs = Math.max(0, now.getTime() - Date.parse(run.manifestCreatedAt));
  const isStale = manifestAgeMs > staleAfterMs;
  const incomplete = rejected > 0 || pending > 0 || skipped > 0
    || exportRequired.length > 0 || notChecked.length > 0;
  const rejectionCounts: Record<string, number> = {};
  for (const source of run.sources) {
    if (source.status !== 'rejected') continue;
    const code = source.errorCode ?? 'UNKNOWN_REJECTION';
    rejectionCounts[code] = (rejectionCounts[code] ?? 0) + 1;
  }
  const sourceTimestamps = run.providers.flatMap((provider) => [
    provider.dateRange.earliest,
    provider.dateRange.latest,
  ]).filter((value): value is string => value !== null).sort();
  const importedTimestamps = run.sources
    .filter((source) => coveredStatuses.has(source.status))
    .map((source) => source.updatedAt)
    .sort();
  const remediation = [
    ...(rejected > 0
      ? ['Run `aiwg sessions import-discovered --resume --confirm` after correcting rejected sources.']
      : []),
    ...(exportRequired.length > 0
      ? ['Export and explicitly authorize providers marked export-required, then run discovery again.']
      : []),
    ...(isStale ? ['Run `aiwg sessions discover` to refresh the stale manifest.'] : []),
  ];
  return {
    schemaVersion: COVERAGE_VERSION,
    status: isStale ? 'stale' : incomplete ? 'partial' : 'complete',
    workspaceId: run.workspaceId,
    manifestId: run.manifestId,
    batchRunId: run.runId,
    manifestCreatedAt: run.manifestCreatedAt,
    manifestAgeMs,
    providers: { checked, unavailable, exportRequired, notChecked },
    sources: {
      discovered: run.sources.length,
      accepted,
      rejected,
      skipped,
      duplicated,
      previouslyCommitted,
      pending,
    },
    sessionsAccepted: run.sources.reduce((sum, source) => sum + source.sessionsAccepted, 0),
    eventsAccepted: run.sources.reduce((sum, source) => sum + source.eventsAccepted, 0),
    coverageRatio: run.sources.length === 0
      ? null
      : (accepted + duplicated + previouslyCommitted) / run.sources.length,
    rejectionCounts,
    sourceDateRange: {
      earliest: sourceTimestamps.at(0) ?? null,
      latest: sourceTimestamps.at(-1) ?? null,
    },
    importedDateRange: {
      earliest: importedTimestamps.at(0) ?? null,
      latest: importedTimestamps.at(-1) ?? null,
    },
    remediation,
  };
}

function providerNames(
  run: BatchImportRun,
  status: DiscoveryProviderReport['status'],
): string[] {
  return run.providers
    .filter((provider) => provider.status === status)
    .map((provider) => provider.provider)
    .sort();
}

function unknownCoverage(): SessionCoverageReport {
  return {
    schemaVersion: COVERAGE_VERSION,
    status: 'unknown',
    workspaceId: '',
    manifestId: null,
    batchRunId: null,
    manifestCreatedAt: null,
    manifestAgeMs: null,
    providers: {
      checked: [],
      unavailable: [],
      exportRequired: [],
      notChecked: [],
    },
    sources: {
      discovered: 0,
      accepted: 0,
      rejected: 0,
      skipped: 0,
      duplicated: 0,
      previouslyCommitted: 0,
      pending: 0,
    },
    sessionsAccepted: 0,
    eventsAccepted: 0,
    coverageRatio: null,
    rejectionCounts: {},
    sourceDateRange: { earliest: null, latest: null },
    importedDateRange: { earliest: null, latest: null },
    remediation: ['Run `aiwg sessions discover --workspace <path>` to establish coverage.'],
  };
}
