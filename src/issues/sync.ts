import type { LocalIssueRecord, LocalIssueEventWithBody } from './types.js';

export interface ExternalIssueSnapshot {
  provider: 'gitea' | 'github';
  external_id: string;
  external_url?: string | null;
  title: string;
  body: string;
  status: string;
  labels: string[];
  updated_at: string;
  comments?: Array<{
    external_id: string;
    author: string;
    body: string;
    created_at: string;
    updated_at?: string;
  }>;
}

export interface LocalIssueSyncConflict {
  field: string;
  local: unknown;
  external: unknown;
  localUpdatedAt: string;
  externalUpdatedAt: string;
}

export interface LocalIssueSyncConflictReport {
  issue_id: string;
  provider: ExternalIssueSnapshot['provider'];
  external_id: string;
  external_url: string | null;
  conflicts: LocalIssueSyncConflict[];
}

export function attachExternalIssueSource(
  issue: LocalIssueRecord,
  source: Pick<ExternalIssueSnapshot, 'provider' | 'external_id' | 'external_url'>
): LocalIssueRecord {
  return {
    ...issue,
    fields: {
      ...issue.fields,
      source: {
        provider: source.provider,
        external_id: source.external_id,
        external_url: source.external_url ?? null,
      },
    },
  };
}

export function buildLocalIssueConflictReport(
  localIssue: LocalIssueRecord & { events?: LocalIssueEventWithBody[] },
  externalIssue: ExternalIssueSnapshot
): LocalIssueSyncConflictReport {
  const conflicts: LocalIssueSyncConflict[] = [];
  compareField(conflicts, 'title', localIssue.fields.title, externalIssue.title, localIssue.fields.updated_at, externalIssue.updated_at);
  compareField(conflicts, 'body', localIssue.body, externalIssue.body, localIssue.fields.updated_at, externalIssue.updated_at);
  compareField(conflicts, 'status', localIssue.fields.status, normalizeExternalStatus(externalIssue.status), localIssue.fields.updated_at, externalIssue.updated_at);
  compareField(conflicts, 'labels', [...localIssue.fields.labels].sort(), [...externalIssue.labels].sort(), localIssue.fields.updated_at, externalIssue.updated_at);

  return {
    issue_id: localIssue.fields.id,
    provider: externalIssue.provider,
    external_id: externalIssue.external_id,
    external_url: externalIssue.external_url ?? null,
    conflicts,
  };
}

function compareField(
  conflicts: LocalIssueSyncConflict[],
  field: string,
  local: unknown,
  external: unknown,
  localUpdatedAt: string,
  externalUpdatedAt: string
): void {
  if (JSON.stringify(local) === JSON.stringify(external)) return;
  conflicts.push({ field, local, external, localUpdatedAt, externalUpdatedAt });
}

function normalizeExternalStatus(status: string): string {
  return status === 'closed' ? 'closed' : 'open';
}
