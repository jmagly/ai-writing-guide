/**
 * SQLite Graph Backend
 *
 * Optional implementation of GraphBackend using better-sqlite3.
 * Provides persistent on-disk storage, native SQL set operations
 * (INTERSECT/EXCEPT/UNION), recursive CTE traversal, and transactional
 * row reconciliation. Cross-graph ATTACH federation is intentionally not
 * exposed because its trust, lifecycle, and snapshot boundary is undefined.
 *
 * Enable with: aiwg features install sqlite
 *
 * @implements #729
 * @source @src/artifacts/graph-backend.ts
 * @tests @test/unit/artifacts/sqlite-backend.test.ts
 */

import { compareGraphIds, pageGraphIds, type GraphBackend, type GraphNodeFilters, type GraphNodePage } from '../graph-backend.js';
import type { DependencyGraph, TypedEdge } from '../types.js';
import { normalizeEdges } from '../types.js';
import { requireFeaturePackage } from '../../features/runtime.js';

const SCHEMA_VERSION = 1;
const DEFAULT_BUSY_TIMEOUT_MS = 5_000;

export interface SqliteGraphBackendOptions {
  busyTimeoutMs?: number;
  synchronous?: 'NORMAL' | 'FULL';
}

export class SqliteBusyError extends Error {
  readonly code = 'AIWG_SQLITE_BUSY';
  constructor(operation: string, cause: unknown) {
    super(`sqlite backend remained busy while ${operation} after bounded waiting`);
    this.name = 'SqliteBusyError';
    this.cause = cause;
  }
}

/**
 * SQLite-backed graph with persistent storage and native SQL operations.
 *
 * Each graph lives in a `.db` file under `.aiwg/.index/{graphName}/`.
 * Uses WAL mode for concurrent read access.
 */
export class SqliteGraphBackend implements GraphBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;
  private readonly busyTimeoutMs: number;

  /**
   * Create a new SQLite graph backend.
   *
   * @param dbPath - Path to the SQLite database file. Use ':memory:' for in-memory.
   */
  constructor(dbPath: string = ':memory:', options: SqliteGraphBackendOptions = {}) {
    this.busyTimeoutMs = options.busyTimeoutMs ?? DEFAULT_BUSY_TIMEOUT_MS;
    try {
      const Database = requireFeaturePackage('better-sqlite3') as new (
        path: string,
        options?: { timeout?: number },
      ) => any;
      this.db = new Database(dbPath, { timeout: this.busyTimeoutMs });
    } catch {
      throw new Error(
        'sqlite backend is unavailable; run `aiwg features install sqlite`'
      );
    }

    try {
      // Changing journal mode may return SQLITE_BUSY without invoking SQLite's
      // busy handler during a lock upgrade. Retry initialization as a whole:
      // pragmas are idempotent and failed schema transactions roll back.
      this.withBusyContext('initializing the graph database', () => {
        this.assertSafeSqliteVersion();
        const requestedJournal = dbPath === ':memory:' ? 'memory' : 'wal';
        const actualJournal = String(this.db.pragma(`journal_mode = ${requestedJournal}`, { simple: true })).toLowerCase();
        if (actualJournal !== requestedJournal) {
          throw new Error(`sqlite backend requested journal_mode=${requestedJournal} but received ${actualJournal}`);
        }
        this.db.pragma(`synchronous = ${options.synchronous ?? 'NORMAL'}`);
        this.db.pragma('wal_autocheckpoint = 1000');
        this.migrateSchema();
      });
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  private assertSafeSqliteVersion(): void {
    const version = String(this.db.prepare('SELECT sqlite_version() AS version').get().version);
    if (!isWalResetSafeVersion(version)) {
      throw new Error(
        `sqlite backend requires a WAL-reset-safe SQLite build (3.44.6, 3.50.7, or >=3.51.3); found ${version}`,
      );
    }
  }

  private migrateSchema(): void {
    const current = Number(this.db.pragma('user_version', { simple: true }));
    if (current > SCHEMA_VERSION) {
      throw new Error(`sqlite graph schema ${current} is newer than supported schema ${SCHEMA_VERSION}`);
    }
    if (current === SCHEMA_VERSION) return;
    this.db.transaction(() => {
      this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id       TEXT PRIMARY KEY,
        type     TEXT,
        phase    TEXT,
        title    TEXT,
        summary  TEXT,
        checksum TEXT,
        attrs    TEXT DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS edges (
        source    TEXT NOT NULL,
        target    TEXT NOT NULL,
        edge_type TEXT NOT NULL DEFAULT 'depends-on',
        attrs     TEXT DEFAULT '{}',
        PRIMARY KEY (source, target, edge_type)
      );

      CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target, edge_type);
      CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source, edge_type);
      CREATE INDEX IF NOT EXISTS idx_nodes_type_phase ON nodes(type, phase, id);
      `);
      this.db.pragma(`user_version = ${SCHEMA_VERSION}`);
    })();
  }

  // --- Mutation ---

  addNode(id: string, attrs?: Record<string, unknown>): void {
    this.withBusyContext('adding a node', () => this.upsertNode(id, attrs));
  }

  addEdge(source: string, target: string, type: string = 'depends-on', attrs?: Record<string, unknown>): void {
    this.withBusyContext('adding an edge', () => this.db.transaction(() => {
      this.upsertNode(source);
      this.upsertNode(target);
      this.db.prepare(
        `INSERT INTO edges (source, target, edge_type, attrs) VALUES (?, ?, ?, ?)
         ON CONFLICT(source, target, edge_type) DO UPDATE SET attrs = excluded.attrs`
      ).run(source, target, type, JSON.stringify(attrs ?? {}));
    })());
  }

  // --- Query ---

  hasNode(id: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM nodes WHERE id = ?').get(id);
  }

  hasEdge(source: string, target: string, edgeType?: string): boolean {
    if (edgeType) {
      return !!this.db.prepare(
        'SELECT 1 FROM edges WHERE source = ? AND target = ? AND edge_type = ?'
      ).get(source, target, edgeType);
    }
    return !!this.db.prepare(
      'SELECT 1 FROM edges WHERE source = ? AND target = ?'
    ).get(source, target);
  }

  getNodeAttrs(id: string): Record<string, unknown> | undefined {
    const row = this.db.prepare('SELECT attrs FROM nodes WHERE id = ?').get(id);
    if (!row) return undefined;
    return JSON.parse(row.attrs);
  }

  nodes(): string[] {
    return this.db.prepare('SELECT id FROM nodes ORDER BY id COLLATE BINARY').all()
      .map((r: { id: string }) => r.id);
  }

  queryNodes(filters: GraphNodeFilters): string[] {
    const clauses: string[] = [];
    const values: string[] = [];
    if (filters.type !== undefined) {
      if (filters.type === null) clauses.push('type IS NULL');
      else { clauses.push('type = ?'); values.push(filters.type); }
    }
    if (filters.phase !== undefined) {
      if (filters.phase === null) clauses.push('phase IS NULL');
      else { clauses.push('phase = ?'); values.push(filters.phase); }
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return this.db.prepare(`SELECT id FROM nodes ${where} ORDER BY id COLLATE BINARY`).all(...values)
      .map((row: { id: string }) => row.id);
  }

  pageNodes(limit: number, after?: string): GraphNodePage {
    return pageGraphIds(this.nodes(), limit, after);
  }

  // --- Traversal ---

  neighbors(nodeId: string, direction: 'in' | 'out' | 'both', edgeType?: string): string[] {
    const results = new Set<string>();

    if (direction === 'in' || direction === 'both') {
      const sql = edgeType
        ? 'SELECT source FROM edges WHERE target = ? AND edge_type = ?'
        : 'SELECT source FROM edges WHERE target = ?';
      const rows = edgeType
        ? this.db.prepare(sql).all(nodeId, edgeType)
        : this.db.prepare(sql).all(nodeId);
      for (const row of rows) results.add(row.source);
    }

    if (direction === 'out' || direction === 'both') {
      const sql = edgeType
        ? 'SELECT target FROM edges WHERE source = ? AND edge_type = ?'
        : 'SELECT target FROM edges WHERE source = ?';
      const rows = edgeType
        ? this.db.prepare(sql).all(nodeId, edgeType)
        : this.db.prepare(sql).all(nodeId);
      for (const row of rows) results.add(row.target);
    }

    return [...results].sort(compareGraphIds);
  }

  // --- Set operations (native SQL) ---

  intersection(setA: string[], setB: string[]): string[] {
    if (setA.length === 0 || setB.length === 0) return [];
    return this.sqlSetOperation(setA, setB, 'INTERSECT');
  }

  difference(setA: string[], setB: string[]): string[] {
    if (setA.length === 0) return [];
    return this.sqlSetOperation(setA, setB, 'EXCEPT');
  }

  union(setA: string[], setB: string[]): string[] {
    return this.sqlSetOperation(setA, setB, 'UNION');
  }

  /** Bounded recursive traversal with deterministic ordering and optional edge filtering. */
  traverse(
    nodeId: string,
    direction: 'in' | 'out',
    maxDepth: number,
    edgeType?: string,
  ): Array<{ id: string; depth: number }> {
    if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 100) {
      throw new Error('sqlite traversal maxDepth must be an integer from 1 through 100');
    }
    const from = direction === 'out' ? 'source' : 'target';
    const to = direction === 'out' ? 'target' : 'source';
    const rows = this.db.prepare(`
      WITH RECURSIVE walk(id, depth, visited) AS (
        SELECT ?, 0, char(31) || ? || char(31)
        UNION ALL
        SELECT e.${to}, walk.depth + 1, walk.visited || e.${to} || char(31)
        FROM walk JOIN edges e ON e.${from} = walk.id
        WHERE walk.depth < ?
          AND (? IS NULL OR e.edge_type = ?)
          AND instr(walk.visited, char(31) || e.${to} || char(31)) = 0
      )
      SELECT id, MIN(depth) AS depth FROM walk WHERE depth > 0
      GROUP BY id ORDER BY depth, id
    `).all(nodeId, nodeId, maxDepth, edgeType ?? null, edgeType ?? null);
    return rows.map((row: { id: string; depth: number }) => row);
  }

  // --- Persistence ---

  serialize(): DependencyGraph {
    const result: DependencyGraph = {};

    const allNodes = this.db.prepare('SELECT id FROM nodes').all();
    for (const { id } of allNodes) {
      result[id] = { upstream: [], downstream: [] };
    }

    const allEdges = this.db.prepare('SELECT source, target, edge_type FROM edges').all();
    for (const { source, target, edge_type } of allEdges) {
      if (!result[source]) result[source] = { upstream: [], downstream: [] };
      if (!result[target]) result[target] = { upstream: [], downstream: [] };
      result[source].downstream.push({ path: target, type: edge_type });
      result[target].upstream.push({ path: source, type: edge_type });
    }

    return result;
  }

  deserialize(data: DependencyGraph): void {
    this.reconcile(data);
  }

  /** Transactionally applies a full desired graph and removes stale rows. */
  reconcile(data: DependencyGraph): void {
    const insertNode = this.db.prepare('INSERT OR IGNORE INTO nodes (id) VALUES (?)');
    const insertEdge = this.db.prepare(
      'INSERT OR IGNORE INTO edges (source, target, edge_type) VALUES (?, ?, ?)'
    );

    const runBatch = this.db.transaction(() => {
      const desiredNodes = new Set<string>();
      const desiredEdges = new Set<string>();
      // Add all nodes
      for (const id of Object.keys(data)) {
        desiredNodes.add(id);
        insertNode.run(id);
      }

      // Add edges from upstream relationships
      for (const [id, node] of Object.entries(data)) {
        const upEdges = normalizeEdges(node.upstream as (string | TypedEdge)[]);
        for (const edge of upEdges) {
          insertNode.run(edge.path); // Ensure referenced nodes exist
          desiredNodes.add(edge.path);
          desiredEdges.add(`${edge.path}\0${id}\0${edge.type}`);
          insertEdge.run(edge.path, id, edge.type);
        }
        const downEdges = normalizeEdges(node.downstream as (string | TypedEdge)[]);
        for (const edge of downEdges) {
          insertNode.run(edge.path);
          desiredNodes.add(edge.path);
          desiredEdges.add(`${id}\0${edge.path}\0${edge.type}`);
          insertEdge.run(id, edge.path, edge.type);
        }
      }
      for (const edge of this.db.prepare('SELECT source, target, edge_type FROM edges').all()) {
        if (!desiredEdges.has(`${edge.source}\0${edge.target}\0${edge.edge_type}`)) {
          this.db.prepare('DELETE FROM edges WHERE source=? AND target=? AND edge_type=?')
            .run(edge.source, edge.target, edge.edge_type);
        }
      }
      for (const { id } of this.db.prepare('SELECT id FROM nodes').all()) {
        if (!desiredNodes.has(id)) this.db.prepare('DELETE FROM nodes WHERE id=?').run(id);
      }
    });
    this.withBusyContext('reconciling graph rows', runBatch);
  }

  schemaVersion(): number {
    return Number(this.db.pragma('user_version', { simple: true }));
  }

  engineVersion(): string {
    return String(this.db.prepare('SELECT sqlite_version() AS version').get().version);
  }

  journalMode(): string {
    return String(this.db.pragma('journal_mode', { simple: true })).toLowerCase();
  }

  walMetrics(): { busy: number; logFrames: number; checkpointedFrames: number } {
    const row = this.db.pragma('wal_checkpoint(NOOP)')[0] ?? {};
    return {
      busy: Number(row.busy ?? 0),
      logFrames: Number(row.log ?? 0),
      checkpointedFrames: Number(row.checkpointed ?? 0),
    };
  }

  checkpoint(mode: 'PASSIVE' | 'RESTART' | 'TRUNCATE' = 'PASSIVE'): void {
    this.withBusyContext('checkpointing the WAL', () => this.db.pragma(`wal_checkpoint(${mode})`));
  }

  async backup(destination: string): Promise<void> {
    await this.db.backup(destination);
  }

  nodeCount(): number {
    return this.db.prepare('SELECT COUNT(*) as c FROM nodes').get().c;
  }

  edgeCount(): number {
    return this.db.prepare('SELECT COUNT(*) as c FROM edges').get().c;
  }

  /**
   * Close the database connection.
   * Call this when the backend is no longer needed.
   */
  close(): void {
    this.db.close();
  }

  private upsertNode(id: string, attrs?: Record<string, unknown>): void {
    const existing = this.db.prepare('SELECT attrs FROM nodes WHERE id = ?').get(id);
    const merged = { ...(existing ? JSON.parse(existing.attrs) : {}), ...(attrs ?? {}) };
    this.db.prepare(`
      INSERT INTO nodes (id, type, phase, title, summary, checksum, attrs)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type=excluded.type, phase=excluded.phase, title=excluded.title,
        summary=excluded.summary, checksum=excluded.checksum, attrs=excluded.attrs
    `).run(
      id,
      stringAttr(merged, 'type'),
      stringAttr(merged, 'phase'),
      stringAttr(merged, 'title'),
      stringAttr(merged, 'summary'),
      stringAttr(merged, 'checksum'),
      JSON.stringify(merged),
    );
  }

  private sqlSetOperation(setA: string[], setB: string[], operation: 'INTERSECT' | 'EXCEPT' | 'UNION'): string[] {
    const rows = this.db.prepare(`
      SELECT value AS id FROM json_each(?)
      ${operation}
      SELECT value AS id FROM json_each(?)
      ORDER BY id
    `).all(JSON.stringify(setA), JSON.stringify(setB));
    return rows.map((row: { id: string }) => row.id);
  }

  private withBusyContext<T>(operation: string, fn: () => T): T {
    const deadline = Date.now() + this.busyTimeoutMs;
    let backoffMs = 2;
    for (;;) {
      try {
        return fn();
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (!code?.startsWith('SQLITE_BUSY') && !code?.startsWith('SQLITE_LOCKED')) throw error;
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new SqliteBusyError(operation, error);
        const delay = Math.min(backoffMs, remaining, 100);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
        backoffMs = Math.min(backoffMs * 2, 100);
      }
    }
  }
}

function stringAttr(attrs: Record<string, unknown>, key: string): string | null {
  return typeof attrs[key] === 'string' ? attrs[key] : null;
}

export function isWalResetSafeVersion(version: string): boolean {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isInteger(part) || part < 0)) return false;
  const [major, minor, patch] = parts;
  if (major !== 3) return major > 3;
  if (minor === 44) return patch >= 6;
  if (minor === 50) return patch >= 7;
  if (minor < 51) return false;
  if (minor === 51) return patch >= 3;
  if (minor === 52) return false; // withdrawn upstream
  return minor >= 53;
}
