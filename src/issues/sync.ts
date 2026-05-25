import type { ExternalIssueProvider, LocalIssueCommentIdMapping, LocalIssueRecord, LocalIssueEventWithBody } from './types.js';

export interface ExternalIssueSnapshot {
  provider: ExternalIssueProvider;
  external_id: string;
  external_url?: string | null;
  title: string;
  body: string;
  status: string;
  labels: string[];
  created_at?: string;
  updated_at: string;
  comments?: ExternalIssueCommentSnapshot[];
}

export interface ExternalIssueCommentSnapshot {
  external_id?: string | null;
  local_event_id?: string | null;
  author: string;
  body: string;
  created_at: string;
  updated_at?: string;
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


export interface LocalIssueExportSnapshot extends ExternalIssueSnapshot {
  local_issue_id: string;
  comments: Array<ExternalIssueCommentSnapshot & { local_event_id: string }>;
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
      links: {
        ...issue.fields.links,
        external: source.external_url ? uniqueStrings([...issue.fields.links.external, source.external_url]) : issue.fields.links.external,
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

  const commentConflicts = buildCommentConflictReport(localIssue.events ?? [], externalIssue.comments ?? [], localIssue.fields.updated_at, externalIssue.updated_at);
  conflicts.push(...commentConflicts);

  return {
    issue_id: localIssue.fields.id,
    provider: externalIssue.provider,
    external_id: externalIssue.external_id,
    external_url: externalIssue.external_url ?? null,
    conflicts,
  };
}

export function buildExternalIssueSnapshotFromLocal(
  localIssue: LocalIssueRecord & { events?: LocalIssueEventWithBody[] },
  provider: ExternalIssueProvider
): LocalIssueExportSnapshot {
  const comments = (localIssue.events ?? [])
    .filter((event) => (event.type === 'comment' || event.type === 'cycle_status') && event.body)
    .map((event) => ({
      local_event_id: event.event_id,
      external_id: externalCommentId(event),
      author: event.author,
      body: event.body ?? '',
      created_at: event.created_at,
      updated_at: typeof event.data?.external_updated_at === 'string' ? event.data.external_updated_at : event.created_at,
    }));

  return {
    provider,
    local_issue_id: localIssue.fields.id,
    external_id: localIssue.fields.source.provider === provider && localIssue.fields.source.external_id ? localIssue.fields.source.external_id : '',
    external_url: localIssue.fields.source.provider === provider ? localIssue.fields.source.external_url ?? null : null,
    title: localIssue.fields.title,
    body: localIssue.body,
    status: localIssue.fields.status === 'closed' ? 'closed' : 'open',
    labels: [...localIssue.fields.labels],
    created_at: localIssue.fields.created_at,
    updated_at: localIssue.fields.updated_at,
    comments,
  };
}

export function parseExternalIssueSnapshot(value: unknown): ExternalIssueSnapshot {
  if (!value || typeof value !== 'object') throw new Error('external issue snapshot must be an object');
  const candidate = value as Partial<ExternalIssueSnapshot>;
  if (candidate.provider !== 'gitea' && candidate.provider !== 'github') throw new Error('snapshot provider must be gitea or github');
  const externalId = requireString(candidate.external_id, 'external_id');
  const title = requireString(candidate.title, 'title');
  const body = requireString(candidate.body, 'body');
  const status = requireString(candidate.status, 'status');
  const updatedAt = requireString(candidate.updated_at, 'updated_at');
  if (!Array.isArray(candidate.labels) || !candidate.labels.every((label) => typeof label === 'string')) {
    throw new Error('snapshot labels must be a string array');
  }
  if (candidate.comments !== undefined && (!Array.isArray(candidate.comments) || !candidate.comments.every(isExternalComment))) {
    throw new Error('snapshot comments must be an array of comment snapshots');
  }
  return {
    provider: candidate.provider,
    external_id: externalId,
    external_url: candidate.external_url ?? null,
    title,
    body,
    status,
    labels: candidate.labels,
    created_at: candidate.created_at,
    updated_at: updatedAt,
    comments: candidate.comments ?? [],
  };
}

export function parseCommentIdMappings(value: unknown): LocalIssueCommentIdMapping[] {
  if (!Array.isArray(value)) throw new Error('comment mapping file must contain an array');
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`comment mapping at index ${index} must be an object`);
    const mapping = item as Partial<LocalIssueCommentIdMapping>;
    return {
      local_event_id: requireString(mapping.local_event_id, `comment mapping ${index}.local_event_id`),
      external_comment_id: requireString(mapping.external_comment_id, `comment mapping ${index}.external_comment_id`),
    };
  });
}

function buildCommentConflictReport(
  localEvents: LocalIssueEventWithBody[],
  externalComments: ExternalIssueCommentSnapshot[],
  localUpdatedAt: string,
  externalUpdatedAt: string
): LocalIssueSyncConflict[] {
  const conflicts: LocalIssueSyncConflict[] = [];
  const localByExternalId = new Map(
    localEvents
      .map((event) => [externalCommentId(event), event] as const)
      .filter(([externalId]) => externalId)
  );
  for (const externalComment of externalComments) {
    if (!externalComment.external_id) continue;
    const local = localByExternalId.get(externalComment.external_id);
    if (!local) continue;
    compareField(
      conflicts,
      `comment:${externalComment.external_id}:body`,
      local.body ?? '',
      externalComment.body,
      typeof local.data?.external_updated_at === 'string' ? local.data.external_updated_at : localUpdatedAt,
      externalComment.updated_at ?? externalUpdatedAt
    );
  }
  return conflicts;
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

function externalCommentId(event: LocalIssueEventWithBody): string | null {
  const value = event.data?.external_comment_id;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new Error(`snapshot ${field} must be a string`);
  return value;
}

function isExternalComment(value: unknown): value is ExternalIssueCommentSnapshot {
  if (!value || typeof value !== 'object') return false;
  const comment = value as Partial<ExternalIssueCommentSnapshot>;
  return typeof comment.author === 'string' && typeof comment.body === 'string' && typeof comment.created_at === 'string';
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
