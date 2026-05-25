export type LocalIssueStatus = 'open' | 'closed' | 'archived';
export type LocalIssueType = 'bug' | 'feature' | 'research' | 'task' | 'epic';
export type LocalIssuePriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface LocalIssueConfig {
  provider: 'local';
  issue_key: {
    prefix: string;
    padding: number;
    next: number;
  };
}

export interface LocalIssueLinks {
  external: string[];
  parent: string | null;
  children: string[];
  related: string[];
}

export interface LocalIssueSource {
  provider: 'local' | 'gitea' | 'github';
  external_id: string | null;
  external_url?: string | null;
}

export interface LocalIssueFields {
  id: string;
  status: LocalIssueStatus;
  title: string;
  type: LocalIssueType;
  priority: LocalIssuePriority;
  labels: string[];
  assignees: string[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  links: LocalIssueLinks;
  source: LocalIssueSource;
}

export interface LocalIssueRecord {
  fields: LocalIssueFields;
  body: string;
}

export type LocalIssueEventType =
  | 'created'
  | 'comment'
  | 'status_changed'
  | 'label_added'
  | 'label_removed'
  | 'linked'
  | 'cycle_status'
  | 'closed';

export interface LocalIssueEvent {
  event_id: string;
  issue_id: string;
  type: LocalIssueEventType;
  author: string;
  created_at: string;
  body_path?: string;
  data?: Record<string, unknown>;
}

export interface LocalIssueEventWithBody extends LocalIssueEvent {
  body?: string;
}

export interface LocalIssueIndexEntry {
  id: string;
  title: string;
  status: LocalIssueStatus;
  type: LocalIssueType;
  priority: LocalIssuePriority;
  labels: string[];
  assignees: string[];
  updated_at: string;
  closed_at: string | null;
  path: string;
}

export interface LocalIssueIndex {
  provider: 'local';
  rebuilt_at: string;
  issues: LocalIssueIndexEntry[];
}

export interface LocalIssueFilter {
  status?: LocalIssueStatus | LocalIssueStatus[];
  labels?: string[];
  type?: LocalIssueType | LocalIssueType[];
  priority?: LocalIssuePriority | LocalIssuePriority[];
  assignee?: string;
  search?: string;
}

export interface ListLocalIssuesOptions {
  filter?: LocalIssueFilter;
  limit?: number;
  cursor?: string;
}

export interface ListLocalIssuesResult {
  issues: LocalIssueIndexEntry[];
  nextCursor: string | null;
}

export interface CreateLocalIssueInput {
  title: string;
  body: string;
  type?: LocalIssueType;
  priority?: LocalIssuePriority;
  labels?: string[];
  assignees?: string[];
  author?: string;
}

export type UpdateLocalIssueFieldsInput = Partial<
  Pick<LocalIssueFields, 'title' | 'status' | 'type' | 'priority' | 'labels' | 'assignees' | 'links'>
>;

export interface GetLocalIssueOptions {
  body?: boolean;
  comments?: `last:${number}` | 'all' | number;
}

export interface LocalIssueProvider {
  init(options?: { prefix?: string; padding?: number }): Promise<LocalIssueConfig>;
  createIssue(input: CreateLocalIssueInput): Promise<LocalIssueRecord>;
  getIssue(id: string, options?: GetLocalIssueOptions): Promise<LocalIssueRecord & { events: LocalIssueEventWithBody[] }>;
  listIssues(options?: ListLocalIssuesOptions): Promise<ListLocalIssuesResult>;
  updateIssueFields(id: string, patch: UpdateLocalIssueFieldsInput): Promise<LocalIssueRecord>;
  appendIssueEvent(
    id: string,
    event: Omit<LocalIssueEvent, 'event_id' | 'issue_id' | 'created_at'> & { created_at?: string; body?: string }
  ): Promise<LocalIssueEvent>;
  commentIssue(id: string, body: string, options?: { author?: string; type?: 'comment' | 'cycle_status' }): Promise<LocalIssueEvent>;
  closeIssue(id: string, options?: { author?: string; reason?: string }): Promise<LocalIssueRecord>;
  getIssueThreadSince(id: string, since: string): Promise<LocalIssueEventWithBody[]>;
  rebuildIssueIndex(): Promise<LocalIssueIndex>;
}
