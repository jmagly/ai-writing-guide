import { createRequire } from 'node:module';
import type {
  CandidateReviewReceipt, DeletionReceipt, ImportCheckpoint, ImportRun,
  IntelligenceCandidate, PromotionDependencyDecision, PromotionReceipt,
  Session, SessionEvent, SessionSource,
} from './contracts.js';
import {
  CandidateReviewReceiptSchema,
  DeletionReceiptSchema,
  IntelligenceCandidateSchema,
  PromotionDependencyDecisionSchema,
  PromotionReceiptSchema,
  SessionContractError,
  sha256,
} from './contracts.js';

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

export interface SessionPurgePreview {
  contractVersion: '1.0.0';
  operationId: string;
  scopeClass: 'session';
  sessionId: string;
  counts: Record<string, number>;
  promotedDependents: Array<{
    dependentId: string;
    candidateId: string;
    candidateVersion: number;
    consumer: string;
    destinationRef: string;
  }>;
  confirmationRequired: true;
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

export interface SessionSearchDocument extends SessionSearchHit {
  searchableText: string;
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
      CREATE TABLE IF NOT EXISTS intelligence_candidates (
        candidate_id TEXT NOT NULL, version INTEGER NOT NULL,
        review_state TEXT NOT NULL, data TEXT NOT NULL,
        PRIMARY KEY(candidate_id, version)
      );
      CREATE TABLE IF NOT EXISTS candidate_review_receipts (
        receipt_id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL,
        candidate_version INTEGER NOT NULL, data TEXT NOT NULL,
        FOREIGN KEY(candidate_id, candidate_version)
          REFERENCES intelligence_candidates(candidate_id, version)
      );
      CREATE TABLE IF NOT EXISTS promotion_receipts (
        receipt_id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL,
        candidate_version INTEGER NOT NULL, consumer TEXT NOT NULL,
        data TEXT NOT NULL,
        UNIQUE(candidate_id, candidate_version, consumer),
        FOREIGN KEY(candidate_id, candidate_version)
          REFERENCES intelligence_candidates(candidate_id, version)
      );
      CREATE TABLE IF NOT EXISTS deletion_receipts (
        operation_id TEXT PRIMARY KEY, scope_id TEXT NOT NULL, data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS promotion_dependency_decisions (
        operation_id TEXT NOT NULL, dependent_id TEXT NOT NULL,
        action TEXT NOT NULL, basis TEXT NOT NULL,
        PRIMARY KEY(operation_id, dependent_id)
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
    appendMetadataFilters(where, params, options);
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

  authorizedSearchDocuments(
    options: Omit<SessionSearchOptions, 'query' | 'cursor'>,
  ): SessionSearchDocument[] {
    if (options.limit < 1 || options.limit > 500) {
      throw new SessionContractError(
        'RESOURCE_LIMIT_EXCEEDED',
        'semantic candidate limit must be between 1 and 500',
      );
    }
    const where = [
      `s.workspace_id = ?`,
      `s.lifecycle != 'tombstoned'`,
      `r.status = 'committed'`,
    ];
    const params: unknown[] = [options.workspaceId];
    appendMetadataFilters(where, params, options);
    return this.db.prepare(`
      SELECT
        e.event_id, e.session_id, e.source_id, e.import_run_id,
        e.sequence_no, e.data AS event_data, s.workspace_id,
        s.data AS session_data, src.data AS source_data,
        json_extract(e.data, '$.searchableText') AS searchable_text,
        length(json_extract(e.data, '$.searchableText')) AS stable_rank
      FROM session_events e
      JOIN sessions s ON s.session_id=e.session_id
      JOIN import_runs r ON r.import_run_id=e.import_run_id
      JOIN session_sources src ON src.source_id=e.source_id
      WHERE ${where.join(' AND ')}
      ORDER BY e.event_id
      LIMIT ?
    `).all(...params, options.limit).map((row) => ({
      ...searchHit(row),
      searchableText: String(row.searchable_text),
    }));
  }

  saveCandidates(candidates: readonly IntelligenceCandidate[]): IntelligenceCandidate[] {
    const save = this.db.transaction(() => {
      const incomingIds = new Set(candidates.map((candidate) => candidate.candidateId));
      for (const candidate of candidates) {
        for (const linkedId of [...candidate.conflictsWith, ...candidate.supersedes]) {
          if (!incomingIds.has(linkedId) && !this.getCandidate(linkedId)) {
            throw new SessionContractError(
              'MALFORMED_SOURCE',
              'candidate conflict or supersession link does not resolve',
            );
          }
        }
      }
      return candidates.map((input) => {
        const parsed = IntelligenceCandidateSchema.parse(input);
        this.assertCandidateEvidence(parsed);
        const priorRow = this.db.prepare(
          `SELECT data FROM intelligence_candidates
           WHERE candidate_id=? ORDER BY version DESC LIMIT 1`,
        ).get(parsed.candidateId);
        if (priorRow) {
          const prior = JSON.parse(String(priorRow.data)) as IntelligenceCandidate;
          if (candidateContentDigest(prior) === candidateContentDigest(parsed)) return prior;
          parsed.version = prior.version + 1;
          parsed.reviewState = 'pending';
        } else {
          parsed.version = 1;
          parsed.reviewState = 'pending';
        }
        this.db.prepare(
          `INSERT INTO intelligence_candidates(candidate_id, version, review_state, data)
           VALUES (?, ?, ?, ?)`,
        ).run(parsed.candidateId, parsed.version, parsed.reviewState, JSON.stringify(parsed));
        return parsed;
      });
    });
    return save();
  }

  getCandidate(candidateId: string, version?: number): IntelligenceCandidate | null {
    const row = version === undefined
      ? this.db.prepare(
          `SELECT data FROM intelligence_candidates
           WHERE candidate_id=? ORDER BY version DESC LIMIT 1`,
        ).get(candidateId)
      : this.db.prepare(
          `SELECT data FROM intelligence_candidates WHERE candidate_id=? AND version=?`,
        ).get(candidateId, version);
    return row ? JSON.parse(String(row.data)) as IntelligenceCandidate : null;
  }

  listCandidates(reviewState?: IntelligenceCandidate['reviewState']): IntelligenceCandidate[] {
    const rows = reviewState
      ? this.db.prepare(
          `SELECT data FROM intelligence_candidates WHERE review_state=?
           ORDER BY candidate_id, version`,
        ).all(reviewState)
      : this.db.prepare(
          'SELECT data FROM intelligence_candidates ORDER BY candidate_id, version',
        ).all();
    return rows.map((row) => JSON.parse(String(row.data)) as IntelligenceCandidate);
  }

  reviewCandidate(input: {
    candidateId: string;
    version: number;
    toState: CandidateReviewReceipt['toState'];
    reviewer: string;
    reason: string;
  }): CandidateReviewReceipt {
    const review = this.db.transaction(() => {
      const candidate = this.getCandidate(input.candidateId, input.version);
      if (!candidate) {
        throw new SessionContractError('MALFORMED_SOURCE', 'candidate version does not exist');
      }
      if (!allowedCandidateTransition(candidate.reviewState, input.toState)) {
        throw new SessionContractError(
          'UNSUPPORTED_OPERATION',
          `candidate transition ${candidate.reviewState} -> ${input.toState} is not allowed`,
        );
      }
      const occurredAt = new Date().toISOString();
      const receipt = CandidateReviewReceiptSchema.parse({
        contractVersion: '1.0.0',
        receiptId: sha256([
          input.candidateId, input.version, candidate.reviewState,
          input.toState, input.reviewer, input.reason,
        ].join('\0')),
        candidateId: input.candidateId,
        candidateVersion: input.version,
        fromState: candidate.reviewState,
        toState: input.toState,
        reviewer: input.reviewer,
        reason: input.reason,
        occurredAt,
      });
      candidate.reviewState = input.toState;
      this.db.prepare(
        `UPDATE intelligence_candidates SET review_state=?, data=?
         WHERE candidate_id=? AND version=?`,
      ).run(input.toState, JSON.stringify(candidate), input.candidateId, input.version);
      this.db.prepare(
        `INSERT OR IGNORE INTO candidate_review_receipts
         (receipt_id, candidate_id, candidate_version, data) VALUES (?, ?, ?, ?)`,
      ).run(receipt.receiptId, input.candidateId, input.version, JSON.stringify(receipt));
      return receipt;
    });
    return review();
  }

  getPromotionReceipt(
    candidateId: string,
    version: number,
    consumer: string,
  ): PromotionReceipt | null {
    const row = this.db.prepare(
      `SELECT data FROM promotion_receipts
       WHERE candidate_id=? AND candidate_version=? AND consumer=?`,
    ).get(candidateId, version, consumer);
    return row ? JSON.parse(String(row.data)) as PromotionReceipt : null;
  }

  recordPromotion(receiptInput: PromotionReceipt): PromotionReceipt {
    const record = this.db.transaction(() => {
      const receipt = PromotionReceiptSchema.parse(receiptInput);
      const existing = this.getPromotionReceipt(
        receipt.candidateId,
        receipt.candidateVersion,
        receipt.consumer,
      );
      if (existing) return { ...existing, duplicate: true };
      const candidate = this.getCandidate(receipt.candidateId, receipt.candidateVersion);
      if (!candidate || candidate.reviewState !== 'accepted') {
        throw new SessionContractError(
          'OPERATION_NOT_AUTHORIZED',
          'promotion requires an accepted exact candidate version',
        );
      }
      const evidenceIds = [...new Set(candidate.evidence.map((item) => item.eventId))].sort();
      if (JSON.stringify(evidenceIds) !== JSON.stringify([...receipt.evidenceEventIds].sort())) {
        throw new SessionContractError('IMPORT_CONFLICT', 'promotion lineage does not match candidate evidence');
      }
      this.db.prepare(
        `INSERT INTO promotion_receipts
         (receipt_id, candidate_id, candidate_version, consumer, data)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(
        receipt.receiptId,
        receipt.candidateId,
        receipt.candidateVersion,
        receipt.consumer,
        JSON.stringify(receipt),
      );
      candidate.reviewState = 'promoted';
      this.db.prepare(
        `UPDATE intelligence_candidates SET review_state='promoted', data=?
         WHERE candidate_id=? AND version=?`,
      ).run(JSON.stringify(candidate), candidate.candidateId, candidate.version);
      return receipt;
    });
    return record();
  }

  private assertCandidateEvidence(candidate: IntelligenceCandidate): void {
    for (const evidence of candidate.evidence) {
      const row = this.db.prepare(
        `SELECT e.data FROM session_events e
         JOIN sessions s ON s.session_id=e.session_id
         JOIN import_runs r ON r.import_run_id=e.import_run_id
         WHERE e.event_id=? AND s.lifecycle!='tombstoned' AND r.status='committed'`,
      ).get(evidence.eventId);
      if (!row) {
        throw new SessionContractError(
          'MALFORMED_SOURCE',
          'candidate evidence does not resolve to a visible committed event',
        );
      }
      const event = JSON.parse(String(row.data)) as SessionEvent;
      if (evidence.end > event.searchableText.length || evidence.start >= evidence.end) {
        throw new SessionContractError('MALFORMED_SOURCE', 'candidate evidence span is invalid');
      }
      if (sha256(event.searchableText.slice(evidence.start, evidence.end)) !== evidence.quoteDigest) {
        throw new SessionContractError('IMPORT_CONFLICT', 'candidate evidence digest does not match');
      }
    }
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
    const row = this.db.prepare('SELECT data FROM sessions WHERE session_id=?').get(sessionId);
    if (!row) return false;
    const session = JSON.parse(String(row.data)) as Session;
    session.lifecycle = 'tombstoned';
    return this.db.prepare(
      `UPDATE sessions SET lifecycle='tombstoned', data=? WHERE session_id=? AND lifecycle!='tombstoned'`,
    ).run(JSON.stringify(session), sessionId).changes > 0;
  }

  restoreSession(sessionId: string): boolean {
    const row = this.db.prepare('SELECT data FROM sessions WHERE session_id=?').get(sessionId);
    if (!row) return false;
    const session = JSON.parse(String(row.data)) as Session;
    session.lifecycle = 'active';
    return this.db.prepare(
      `UPDATE sessions SET lifecycle='active', data=? WHERE session_id=? AND lifecycle='tombstoned'`,
    ).run(JSON.stringify(session), sessionId).changes > 0;
  }

  previewPurge(sessionId: string): SessionPurgePreview {
    const session = this.db.prepare('SELECT data FROM sessions WHERE session_id=?').get(sessionId);
    if (!session) {
      throw new SessionContractError('MALFORMED_SOURCE', 'session does not exist');
    }
    const eventIds = this.db.prepare(
      'SELECT event_id FROM session_events WHERE session_id=? ORDER BY event_id',
    ).all(sessionId).map((row) => String(row.event_id));
    const eventSet = new Set(eventIds);
    const candidates = this.listCandidates()
      .filter((item) => item.evidence.some((evidence) => eventSet.has(evidence.eventId)));
    const candidateKeys = new Set(
      candidates.map((item) => `${item.candidateId}\0${item.version}`),
    );
    const dependents = this.db.prepare(
      'SELECT data FROM promotion_receipts ORDER BY candidate_id, candidate_version, consumer',
    ).all()
      .map((row) => JSON.parse(String(row.data)) as PromotionReceipt)
      .filter((receipt) => candidateKeys.has(`${receipt.candidateId}\0${receipt.candidateVersion}`))
      .map((receipt) => ({
        dependentId: receipt.receiptId,
        candidateId: receipt.candidateId,
        candidateVersion: receipt.candidateVersion,
        consumer: receipt.consumer,
        destinationRef: receipt.destinationRef,
      }));
    const candidateIds = candidates.map((item) => `${item.candidateId}:${item.version}`).sort();
    const counts = {
      sessions: 1,
      events: eventIds.length,
      indexes: eventIds.length,
      embeddings: 0,
      candidates: candidates.length,
      snapshots: 0,
      tags: Number(this.db.prepare(
        'SELECT COUNT(*) AS count FROM session_tags WHERE session_id=?',
      ).get(sessionId)?.count ?? 0),
      promotedDependents: dependents.length,
    };
    const operationId = sha256(JSON.stringify({
      scopeClass: 'session',
      sessionId,
      eventIds,
      candidateIds,
      dependentIds: dependents.map((item) => item.dependentId),
      counts,
    }));
    return {
      contractVersion: '1.0.0',
      operationId,
      scopeClass: 'session',
      sessionId,
      counts,
      promotedDependents: dependents,
      confirmationRequired: true,
    };
  }

  getCompletedPurge(sessionId: string): DeletionReceipt | null {
    if (this.db.prepare('SELECT 1 AS present FROM sessions WHERE session_id=?').get(sessionId)) {
      return null;
    }
    const row = this.db.prepare(
      `SELECT data FROM deletion_receipts WHERE scope_id=? ORDER BY rowid DESC LIMIT 1`,
    ).get(sessionId);
    return row ? JSON.parse(String(row.data)) as DeletionReceipt : null;
  }

  listPromotionDependencyDecisions(operationId: string): PromotionDependencyDecision[] {
    return this.db.prepare(
      `SELECT dependent_id, action, basis FROM promotion_dependency_decisions
       WHERE operation_id=? ORDER BY dependent_id`,
    ).all(operationId).map((row) => PromotionDependencyDecisionSchema.parse({
      dependentId: String(row.dependent_id),
      action: String(row.action),
      basis: String(row.basis),
    }));
  }

  purgeSession(input: {
    preview: SessionPurgePreview;
    actorClass: string;
    reasonCode: string;
    decisions: PromotionDependencyDecision[];
  }): DeletionReceipt {
    const existing = this.db.prepare(
      'SELECT data FROM deletion_receipts WHERE operation_id=?',
    ).get(input.preview.operationId);
    if (existing) return JSON.parse(String(existing.data)) as DeletionReceipt;
    const current = this.previewPurge(input.preview.sessionId);
    if (current.operationId !== input.preview.operationId) {
      throw new SessionContractError('IMPORT_CONFLICT', 'purge scope changed after preview');
    }
    const validatedDecisions = input.decisions.map(
      (item) => PromotionDependencyDecisionSchema.parse(item),
    );
    const expected = new Set(current.promotedDependents.map((item) => item.dependentId));
    const decisions = new Map(validatedDecisions.map((item) => [item.dependentId, item]));
    if (validatedDecisions.length !== expected.size
      || decisions.size !== expected.size
      || [...expected].some((dependentId) => !decisions.has(dependentId))) {
      throw new SessionContractError(
        'OPERATION_NOT_AUTHORIZED',
        'every promoted dependent requires one explicit disposition',
      );
    }
    const apply = this.db.transaction((): DeletionReceipt => {
      for (const decision of validatedDecisions) {
        this.db.prepare(
          `INSERT INTO promotion_dependency_decisions
           (operation_id, dependent_id, action, basis) VALUES (?, ?, ?, ?)`,
        ).run(input.preview.operationId, decision.dependentId, decision.action, decision.basis);
      }
      const eventRows = this.db.prepare(
        'SELECT event_id FROM session_events WHERE session_id=?',
      ).all(input.preview.sessionId);
      for (const row of eventRows) {
        this.db.prepare('DELETE FROM session_event_fts WHERE event_id=?').run(String(row.event_id));
      }
      const eventIds = new Set(eventRows.map((row) => String(row.event_id)));
      const affectedCandidates = this.listCandidates()
        .filter((item) => item.evidence.some((evidence) => eventIds.has(evidence.eventId)));
      for (const candidate of affectedCandidates) {
        this.db.prepare(
          'DELETE FROM candidate_review_receipts WHERE candidate_id=? AND candidate_version=?',
        ).run(candidate.candidateId, candidate.version);
        this.db.prepare(
          'DELETE FROM promotion_receipts WHERE candidate_id=? AND candidate_version=?',
        ).run(candidate.candidateId, candidate.version);
        this.db.prepare(
          'DELETE FROM intelligence_candidates WHERE candidate_id=? AND version=?',
        ).run(candidate.candidateId, candidate.version);
      }
      this.db.prepare('DELETE FROM session_tags WHERE session_id=?').run(input.preview.sessionId);
      this.db.prepare('DELETE FROM session_events WHERE session_id=?').run(input.preview.sessionId);
      this.db.prepare('DELETE FROM sessions WHERE session_id=?').run(input.preview.sessionId);
      const orphanCounts = {
        sessions: Number(this.db.prepare(
          'SELECT COUNT(*) AS count FROM sessions WHERE session_id=?',
        ).get(input.preview.sessionId)?.count ?? 0),
        events: Number(this.db.prepare(
          'SELECT COUNT(*) AS count FROM session_events WHERE session_id=?',
        ).get(input.preview.sessionId)?.count ?? 0),
        indexes: eventRows.reduce((count, row) => count + Number(this.db.prepare(
          'SELECT COUNT(*) AS count FROM session_event_fts WHERE event_id=?',
        ).get(String(row.event_id))?.count ?? 0), 0),
        candidates: affectedCandidates.reduce((count, candidate) => count + Number(
          this.db.prepare(
            'SELECT COUNT(*) AS count FROM intelligence_candidates WHERE candidate_id=? AND version=?',
          ).get(candidate.candidateId, candidate.version)?.count ?? 0,
        ), 0),
      };
      if (Object.values(orphanCounts).some((count) => count !== 0)) {
        throw new SessionContractError('IMPORT_CONFLICT', 'purge orphan check failed');
      }
      const receipt = DeletionReceiptSchema.parse({
        contractVersion: '1.0.0',
        receiptId: sha256(`${input.preview.operationId}\0terminal`),
        operationId: input.preview.operationId,
        scopeClass: 'session',
        counts: input.preview.counts,
        survivingDependentIds: validatedDecisions
          .filter((item) => item.action !== 'revoke')
          .map((item) => item.dependentId)
          .sort(),
        actorClass: input.actorClass,
        reasonCode: input.reasonCode,
        orphanCounts,
        outcome: 'committed',
        occurredAt: new Date().toISOString(),
      });
      this.db.prepare(
        'INSERT INTO deletion_receipts(operation_id, scope_id, data) VALUES (?, ?, ?)',
      ).run(receipt.operationId, input.preview.sessionId, JSON.stringify(receipt));
      return receipt;
    });
    return apply();
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

function appendMetadataFilters(
  where: string[],
  params: unknown[],
  options: Omit<SessionSearchOptions, 'query' | 'cursor'>,
): void {
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
}

function candidateContentDigest(candidate: IntelligenceCandidate): string {
  return sha256(JSON.stringify({
    ...candidate,
    version: undefined,
    reviewState: undefined,
    createdAt: undefined,
  }));
}

function allowedCandidateTransition(
  from: IntelligenceCandidate['reviewState'],
  to: IntelligenceCandidate['reviewState'],
): boolean {
  const transitions: Record<
    IntelligenceCandidate['reviewState'],
    ReadonlySet<IntelligenceCandidate['reviewState']>
  > = {
    pending: new Set(['accepted', 'rejected', 'deferred']),
    deferred: new Set(['pending', 'accepted', 'rejected']),
    accepted: new Set(['superseded']),
    promoted: new Set(['superseded']),
    rejected: new Set(),
    superseded: new Set(),
  };
  return transitions[from].has(to);
}
