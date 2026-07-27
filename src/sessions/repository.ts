import { createRequire } from 'node:module';
import type {
  ImportCheckpoint, ImportRun, Session, SessionEvent, SessionSource,
} from './contracts.js';
import { SessionContractError } from './contracts.js';

const require = createRequire(import.meta.url);

interface SqliteStatement {
  run(...params: unknown[]): { changes: number };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Array<Record<string, unknown>>;
}
interface SqliteDatabase {
  exec(sql: string): void;
  pragma(value: string): unknown;
  prepare(sql: string): SqliteStatement;
  transaction<T extends (...args: never[]) => unknown>(fn: T): T;
  close(): void;
}

export interface NormalizedImportBatch {
  source: SessionSource;
  run: ImportRun;
  sessions: Session[];
  events: SessionEvent[];
}
export interface ImportReceipt {
  operationId: string;
  outcome: 'staged' | 'committed' | 'duplicate';
  sessionsInserted: number;
  eventsInserted: number;
  checkpoint: ImportCheckpoint;
}

export interface SessionListOptions {
  provider?: string;
  workspaceId?: string;
  tag?: string;
  limit: number;
  offset: number;
}

export interface SessionCatalogHealth {
  integrity: 'ok' | 'failed';
  sources: number;
  sessions: number;
  events: number;
  stagedImports: number;
}

export interface SessionSearchOptions {
  query: string;
  workspaceId: string;
  providers?: string[];
  dateFrom?: string;
  dateTo?: string;
  participant?: string;
  model?: string;
  role?: string;
  tool?: string;
  tag?: string;
  entity?: string;
  sensitivity?: string;
  extractionState?: string;
  limit: number;
  cursor?: string;
}

export interface SessionSearchHit {
  score: number;
  snippet: string;
  provider: string;
  workspaceId: string;
  sessionId: string;
  eventId: string;
  importRunId: string;
  sourceId: string;
  locatorClass: string;
  sequence: number;
  role: string | null;
  occurredAt: string | null;
  sensitivity: string;
  citation: {
    provider: string;
    sessionId: string;
    eventId: string;
    importRunId: string;
    sourceId: string;
    locatorClass: string;
  };
}

export interface SessionSearchResult {
  items: SessionSearchHit[];
  nextCursor: string | null;
}

export class SessionRepository {
  private readonly db: SqliteDatabase;

  constructor(path = ':memory:') {
    try {
      const Database = require('better-sqlite3') as new (path: string) => SqliteDatabase;
      this.db = new Database(path);
    } catch {
      throw new Error('session SQLite repository requires optional peer dependency better-sqlite3');
    }
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_sources (
        source_id TEXT PRIMARY KEY, provider TEXT NOT NULL, data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS import_runs (
        import_run_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, parser_version TEXT NOT NULL,
        status TEXT NOT NULL, checkpoint TEXT NOT NULL, data TEXT NOT NULL,
        FOREIGN KEY(source_id) REFERENCES session_sources(source_id)
      );
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, native_session_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL, source_digest TEXT NOT NULL, lifecycle TEXT NOT NULL, data TEXT NOT NULL,
        UNIQUE(source_id, native_session_id, source_digest),
        FOREIGN KEY(source_id) REFERENCES session_sources(source_id)
      );
      CREATE TABLE IF NOT EXISTS session_events (
        event_id TEXT PRIMARY KEY, session_id TEXT NOT NULL, source_id TEXT NOT NULL,
        import_run_id TEXT NOT NULL, sequence_no INTEGER NOT NULL, digest TEXT NOT NULL, data TEXT NOT NULL,
        UNIQUE(session_id, event_id, digest),
        FOREIGN KEY(session_id) REFERENCES sessions(session_id),
        FOREIGN KEY(source_id) REFERENCES session_sources(source_id),
        FOREIGN KEY(import_run_id) REFERENCES import_runs(import_run_id)
      );
      CREATE TABLE IF NOT EXISTS import_receipts (
        operation_id TEXT PRIMARY KEY, import_run_id TEXT NOT NULL UNIQUE,
        outcome TEXT NOT NULL, counts TEXT NOT NULL, checkpoint TEXT NOT NULL,
        FOREIGN KEY(import_run_id) REFERENCES import_runs(import_run_id)
      );
      CREATE TABLE IF NOT EXISTS mutation_audit (
        operation_id TEXT PRIMARY KEY, operation TEXT NOT NULL, actor TEXT NOT NULL,
        counts TEXT NOT NULL, adapter_version TEXT NOT NULL, policy_version TEXT NOT NULL,
        outcome TEXT NOT NULL, occurred_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS session_tags (
        session_id TEXT NOT NULL, tag TEXT NOT NULL,
        PRIMARY KEY(session_id, tag),
        FOREIGN KEY(session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_session_workspace_provider
        ON sessions(workspace_id, source_id, lifecycle);
      CREATE INDEX IF NOT EXISTS idx_event_session_sequence
        ON session_events(session_id, sequence_no);
      CREATE VIRTUAL TABLE IF NOT EXISTS session_event_fts USING fts5(
        event_id UNINDEXED, searchable_text, tokenize='unicode61'
      );
    `);
  }

  applyImport(
    batch: NormalizedImportBatch,
    checkpoint: ImportCheckpoint,
    publish = true,
  ): ImportReceipt {
    const apply = this.db.transaction((): ImportReceipt => {
      const existing = this.db.prepare(
        'SELECT outcome, counts, checkpoint FROM import_receipts WHERE import_run_id = ?',
      ).get(batch.run.importRunId);
      if (existing) {
        const counts = JSON.parse(String(existing.counts)) as { sessions: number; events: number };
        return {
          operationId: batch.run.importRunId,
          outcome: 'duplicate',
          sessionsInserted: counts.sessions,
          eventsInserted: counts.events,
          checkpoint: JSON.parse(String(existing.checkpoint)) as ImportCheckpoint,
        };
      }
      this.db.prepare(
        `INSERT INTO session_sources(source_id, provider, data) VALUES (?, ?, ?)
         ON CONFLICT(source_id) DO UPDATE SET data=excluded.data`,
      ).run(batch.source.sourceId, batch.source.provider, JSON.stringify(batch.source));
      this.db.prepare(
        `INSERT INTO import_runs(import_run_id, source_id, parser_version, status, checkpoint, data)
         VALUES (?, ?, ?, 'running', ?, ?)`,
      ).run(batch.run.importRunId, batch.source.sourceId, batch.run.parserVersion, JSON.stringify(checkpoint), JSON.stringify(batch.run));

      let sessionsInserted = 0;
      let eventsInserted = 0;
      const insertSession = this.db.prepare(
        `INSERT OR IGNORE INTO sessions
         (session_id, source_id, native_session_id, workspace_id, source_digest, lifecycle, data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const session of batch.sessions) {
        sessionsInserted += insertSession.run(
          session.sessionId, session.sourceId, session.nativeSessionId,
          session.workspaceId, session.sourceDigest, session.lifecycle, JSON.stringify(session),
        ).changes;
      }
      const insertEvent = this.db.prepare(
        `INSERT OR IGNORE INTO session_events
         (event_id, session_id, source_id, import_run_id, sequence_no, digest, data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const event of batch.events) {
        const prior = this.db.prepare('SELECT digest FROM session_events WHERE event_id=?')
          .get(event.eventId);
        if (prior && String(prior.digest) !== event.digest) {
          throw new SessionContractError(
            'IMPORT_CONFLICT',
            `stable event identity changed content: ${event.eventId}`,
          );
        }
        const inserted = insertEvent.run(
          event.eventId, event.sessionId, event.sourceId,
          event.importRunId, event.sequence, event.digest, JSON.stringify(event),
        ).changes;
        eventsInserted += inserted;
        if (inserted > 0) {
          this.db.prepare(
            'INSERT INTO session_event_fts(event_id, searchable_text) VALUES (?, ?)',
          ).run(event.eventId, event.searchableText);
        }
      }
      const outcome = publish ? 'committed' : 'staged';
      this.db.prepare(
        `UPDATE import_runs SET status=?, checkpoint=? WHERE import_run_id=?`,
      ).run(outcome, JSON.stringify(checkpoint), batch.run.importRunId);
      const counts = { sessions: sessionsInserted, events: eventsInserted };
      this.db.prepare(
        `INSERT INTO import_receipts(operation_id, import_run_id, outcome, counts, checkpoint)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(batch.run.importRunId, batch.run.importRunId, outcome, JSON.stringify(counts), JSON.stringify(checkpoint));
      this.db.prepare(
        `INSERT INTO mutation_audit
         (operation_id, operation, actor, counts, adapter_version, policy_version, outcome, occurred_at)
         VALUES (?, 'session.import', 'local-operator', ?, ?, ?, ?, ?)`,
      ).run(
        batch.run.importRunId, JSON.stringify(counts), batch.source.adapterVersion,
        batch.run.policyVersion, outcome, new Date().toISOString(),
      );
      return {
        operationId: batch.run.importRunId, outcome,
        sessionsInserted, eventsInserted, checkpoint,
      };
    });
    return apply();
  }

  commitStagedImports(sourceId: string, parserVersion: string): number {
    const commit = this.db.transaction((): number => {
      const result = this.db.prepare(
        `UPDATE import_runs SET status='committed'
         WHERE source_id=? AND parser_version=? AND status='staged'`,
      ).run(sourceId, parserVersion);
      this.db.prepare(
        `UPDATE import_receipts SET outcome='committed'
         WHERE import_run_id IN (
           SELECT import_run_id FROM import_runs
           WHERE source_id=? AND parser_version=? AND status='committed'
         ) AND outcome='staged'`,
      ).run(sourceId, parserVersion);
      return result.changes;
    });
    return commit();
  }

  getSession(id: string): Session | null {
    const row = this.db.prepare(
      `SELECT s.data FROM sessions s
       WHERE s.session_id=? AND s.lifecycle != ?
       AND EXISTS (
         SELECT 1 FROM session_events e
         JOIN import_runs r ON r.import_run_id=e.import_run_id
         WHERE e.session_id=s.session_id AND r.status='committed'
       )`,
    )
      .get(id, 'tombstoned');
    return row ? JSON.parse(String(row.data)) as Session : null;
  }

  listSources(): SessionSource[] {
    return this.db.prepare(
      'SELECT data FROM session_sources ORDER BY provider, source_id',
    ).all().map((row) => JSON.parse(String(row.data)) as SessionSource);
  }

  listSessions(options: SessionListOptions): { items: Session[]; total: number } {
    const where = [`s.lifecycle != 'tombstoned'`, `EXISTS (
      SELECT 1 FROM session_events e
      JOIN import_runs r ON r.import_run_id=e.import_run_id
      WHERE e.session_id=s.session_id AND r.status='committed'
    )`];
    const params: unknown[] = [];
    if (options.provider) {
      where.push('json_extract(s.data, \'$.provider\') = ?');
      params.push(options.provider);
    }
    if (options.workspaceId) {
      where.push('s.workspace_id = ?');
      params.push(options.workspaceId);
    }
    if (options.tag) {
      where.push('EXISTS (SELECT 1 FROM session_tags t WHERE t.session_id=s.session_id AND t.tag=?)');
      params.push(options.tag);
    }
    const clause = where.join(' AND ');
    const totalRow = this.db.prepare(`SELECT COUNT(*) AS count FROM sessions s WHERE ${clause}`)
      .get(...params);
    const items = this.db.prepare(
      `SELECT s.data FROM sessions s WHERE ${clause}
       ORDER BY COALESCE(json_extract(s.data, '$.updatedAt'), ''), s.session_id
       LIMIT ? OFFSET ?`,
    ).all(...params, options.limit, options.offset)
      .map((row) => JSON.parse(String(row.data)) as Session);
    return { items, total: Number(totalRow?.count ?? 0) };
  }

  listTags(sessionId: string): string[] {
    return this.db.prepare(
      'SELECT tag FROM session_tags WHERE session_id=? ORDER BY tag',
    ).all(sessionId).map((row) => String(row.tag));
  }

  tagSession(sessionId: string, tag: string): boolean {
    if (!this.getSession(sessionId)) return false;
    return this.db.prepare(
      'INSERT OR IGNORE INTO session_tags(session_id, tag) VALUES (?, ?)',
    ).run(sessionId, tag).changes > 0;
  }

  listEvents(sessionId: string): SessionEvent[] {
    return this.db.prepare(
      `SELECT e.data FROM session_events e
       JOIN import_runs r ON r.import_run_id=e.import_run_id
       WHERE e.session_id=? AND r.status='committed'
       ORDER BY e.sequence_no, e.event_id`,
    ).all(sessionId).map((row) => JSON.parse(String(row.data)) as SessionEvent);
  }

  search(options: SessionSearchOptions): SessionSearchResult {
    const query = options.query.trim();
    if (!query) throw new SessionContractError('MALFORMED_SOURCE', 'search query must not be empty');
    if (options.limit < 1 || options.limit > 500) {
      throw new SessionContractError('RESOURCE_LIMIT_EXCEEDED', 'search limit must be between 1 and 500');
    }
    const cursor = decodeSearchCursor(options.cursor);
    const snapshotRowid = cursor?.snapshotRowid ?? Number(
      this.db.prepare('SELECT COALESCE(MAX(rowid), 0) AS value FROM session_events').get()?.value ?? 0,
    );
    const where = [
      `f.searchable_text MATCH ?`,
      `e.rowid <= ?`,
      `s.workspace_id = ?`,
      `s.lifecycle != 'tombstoned'`,
      `r.status = 'committed'`,
    ];
    const params: unknown[] = [query, snapshotRowid, options.workspaceId];
    if (options.providers?.length) {
      where.push(`json_extract(s.data, '$.provider') IN (${options.providers.map(() => '?').join(',')})`);
      params.push(...options.providers);
    }
    if (options.dateFrom) {
      where.push(`json_extract(e.data, '$.occurredAt') >= ?`);
      params.push(options.dateFrom);
    }
    if (options.dateTo) {
      where.push(`json_extract(e.data, '$.occurredAt') <= ?`);
      params.push(options.dateTo);
    }
    if (options.role) {
      where.push(`json_extract(e.data, '$.role') = ?`);
      params.push(options.role);
    }
    if (options.participant) {
      where.push(`json_extract(e.data, '$.role') = ?`);
      params.push(options.participant);
    }
    if (options.tool) {
      where.push(`(json_extract(e.data, '$.kind') IN ('tool-call','tool-result')
        AND json_extract(e.data, '$.searchableText') LIKE ? ESCAPE '\\')`);
      params.push(`%${escapeLike(options.tool)}%`);
    }
    if (options.tag) {
      where.push(`EXISTS (
        SELECT 1 FROM session_tags t WHERE t.session_id=s.session_id AND t.tag=?
      )`);
      params.push(options.tag);
    }
    if (options.sensitivity) {
      where.push(`json_extract(e.data, '$.sensitivity.classification') = ?`);
      params.push(options.sensitivity);
    }
    for (const [filter, key] of [
      [options.model, 'model'],
      [options.entity, 'entity'],
      [options.extractionState, 'extractionState'],
    ] as const) {
      if (filter) {
        where.push(`EXISTS (
          SELECT 1 FROM json_tree(e.data)
          WHERE json_tree.key=? AND CAST(json_tree.value AS TEXT)=?
        )`);
        params.push(key, filter);
      }
    }
    if (cursor) {
      where.push(`(
        length(json_extract(e.data, '$.searchableText')) > ?
        OR (
          length(json_extract(e.data, '$.searchableText')) = ?
          AND e.event_id > ?
        )
      )`);
      params.push(cursor.textLength, cursor.textLength, cursor.eventId);
    }
    const rows = this.db.prepare(`
      WITH authorized AS (
        SELECT
          e.rowid AS event_rowid, e.event_id, e.session_id, e.source_id,
          e.import_run_id, e.sequence_no, e.data AS event_data,
          s.workspace_id, s.data AS session_data, src.data AS source_data,
          f.searchable_text,
          length(f.searchable_text) AS stable_rank
        FROM session_event_fts f
        JOIN session_events e ON e.event_id=f.event_id
        JOIN sessions s ON s.session_id=e.session_id
        JOIN import_runs r ON r.import_run_id=e.import_run_id
        JOIN session_sources src ON src.source_id=e.source_id
        WHERE ${where.join(' AND ')}
      )
      SELECT * FROM authorized
      ORDER BY stable_rank, event_id
      LIMIT ?
    `).all(...params, options.limit + 1);
    const page = rows.slice(0, options.limit);
    const items = page.map(searchHit);
    const last = page.at(-1);
    return {
      items,
      nextCursor: rows.length > options.limit && last
        ? encodeSearchCursor({
            snapshotRowid,
            textLength: Number(last.stable_rank),
            eventId: String(last.event_id),
          })
        : null,
    };
  }

  getCheckpoint(sourceId: string, parserVersion: string): ImportCheckpoint | null {
    const row = this.db.prepare(
      `SELECT checkpoint FROM import_runs
       WHERE source_id=? AND parser_version=? AND status='committed'
       ORDER BY rowid DESC LIMIT 1`,
    ).get(sourceId, parserVersion);
    return row ? JSON.parse(String(row.checkpoint)) as ImportCheckpoint : null;
  }

  relocateSource(sourceId: string, redactedLocator: string): void {
    const row = this.db.prepare('SELECT data FROM session_sources WHERE source_id=?').get(sourceId);
    if (!row) return;
    const source = JSON.parse(String(row.data)) as SessionSource;
    source.redactedLocator = redactedLocator;
    this.db.prepare('UPDATE session_sources SET data=? WHERE source_id=?')
      .run(JSON.stringify(source), sourceId);
  }

  getSource(sourceId: string): SessionSource | null {
    const row = this.db.prepare('SELECT data FROM session_sources WHERE source_id=?').get(sourceId);
    return row ? JSON.parse(String(row.data)) as SessionSource : null;
  }

  deletionPreview(sessionId: string): { sessions: number; events: number; tags: number } {
    const session = this.db.prepare(
      `SELECT COUNT(*) AS count FROM sessions WHERE session_id=? AND lifecycle!='tombstoned'`,
    ).get(sessionId);
    const events = this.db.prepare(
      'SELECT COUNT(*) AS count FROM session_events WHERE session_id=?',
    ).get(sessionId);
    const tags = this.db.prepare(
      'SELECT COUNT(*) AS count FROM session_tags WHERE session_id=?',
    ).get(sessionId);
    return {
      sessions: Number(session?.count ?? 0),
      events: Number(events?.count ?? 0),
      tags: Number(tags?.count ?? 0),
    };
  }

  tombstoneSession(sessionId: string): boolean {
    return this.db.prepare(`UPDATE sessions SET lifecycle='tombstoned' WHERE session_id=?`)
      .run(sessionId).changes > 0;
  }

  reindex(): void {
    const rebuild = this.db.transaction(() => {
      this.db.exec('REINDEX');
      this.db.exec('DELETE FROM session_event_fts');
      this.db.exec(`
        INSERT INTO session_event_fts(event_id, searchable_text)
        SELECT event_id, json_extract(data, '$.searchableText') FROM session_events
      `);
    });
    rebuild();
  }

  doctor(): SessionCatalogHealth {
    const integrity = this.db.pragma('integrity_check') as Array<{ integrity_check?: string }>;
    const count = (table: string, where = ''): number => {
      const row = this.db.prepare(`SELECT COUNT(*) AS count FROM ${table} ${where}`).get();
      return Number(row?.count ?? 0);
    };
    return {
      integrity: integrity[0]?.integrity_check === 'ok' ? 'ok' : 'failed',
      sources: count('session_sources'),
      sessions: count('sessions', `WHERE lifecycle!='tombstoned'`),
      events: count('session_events'),
      stagedImports: count('import_runs', `WHERE status='staged'`),
    };
  }

  close(): void {
    this.db.close();
  }
}

interface SearchCursor {
  snapshotRowid: number;
  textLength: number;
  eventId: string;
}

function searchHit(row: Record<string, unknown>): SessionSearchHit {
  const event = JSON.parse(String(row.event_data)) as SessionEvent;
  const session = JSON.parse(String(row.session_data)) as Session;
  const source = JSON.parse(String(row.source_data)) as SessionSource;
  const citation = {
    provider: session.provider,
    sessionId: event.sessionId,
    eventId: event.eventId,
    importRunId: event.importRunId,
    sourceId: event.sourceId,
    locatorClass: source.locatorClass,
  };
  return {
    score: 1 / (1 + Number(row.stable_rank)),
    snippet: boundedSnippet(String(row.searchable_text), 240),
    provider: session.provider,
    workspaceId: session.workspaceId,
    sessionId: event.sessionId,
    eventId: event.eventId,
    importRunId: event.importRunId,
    sourceId: event.sourceId,
    locatorClass: source.locatorClass,
    sequence: event.sequence,
    role: event.role,
    occurredAt: event.occurredAt,
    sensitivity: event.sensitivity.classification,
    citation,
  };
}

function boundedSnippet(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function encodeSearchCursor(cursor: SearchCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeSearchCursor(value?: string): SearchCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as SearchCursor;
    if (!Number.isSafeInteger(parsed.snapshotRowid)
      || !Number.isSafeInteger(parsed.textLength)
      || typeof parsed.eventId !== 'string') throw new Error('invalid cursor');
    return parsed;
  } catch {
    throw new SessionContractError('SCHEMA_DRIFT', 'search cursor is invalid');
  }
}

function escapeLike(value: string): string {
  return value.replaceAll('%', '\\%').replaceAll('_', '\\_');
}
