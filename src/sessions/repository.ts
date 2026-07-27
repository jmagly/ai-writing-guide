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
        eventsInserted += insertEvent.run(
          event.eventId, event.sessionId, event.sourceId,
          event.importRunId, event.sequence, event.digest, JSON.stringify(event),
        ).changes;
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
    this.db.exec('REINDEX');
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
