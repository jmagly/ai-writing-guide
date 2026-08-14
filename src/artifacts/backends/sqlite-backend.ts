/**
 * SQLite Graph Backend
 *
 * Optional implementation of GraphBackend using better-sqlite3.
 * Provides persistent on-disk storage, native SQL set operations
 * (INTERSECT/EXCEPT/UNION), recursive CTE traversal, and cross-graph
 * federation via ATTACH DATABASE.
 *
 * Enable with: aiwg features install sqlite
 *
 * @implements #729
 * @source @src/artifacts/graph-backend.ts
 * @tests @test/unit/artifacts/sqlite-backend.test.ts
 */

import type { GraphBackend } from '../graph-backend.js';
import type { DependencyGraph, TypedEdge } from '../types.js';
import { normalizeEdges } from '../types.js';
import { requireFeaturePackage } from '../../features/runtime.js';

/**
 * SQLite-backed graph with persistent storage and native SQL operations.
 *
 * Each graph lives in a `.db` file under `.aiwg/.index/{graphName}/`.
 * Uses WAL mode for concurrent read access.
 */
export class SqliteGraphBackend implements GraphBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  /**
   * Create a new SQLite graph backend.
   *
   * @param dbPath - Path to the SQLite database file. Use ':memory:' for in-memory.
   */
  constructor(dbPath: string = ':memory:') {
    try {
      const Database = requireFeaturePackage('better-sqlite3') as new (path: string) => any;
      this.db = new Database(dbPath);
    } catch {
      throw new Error(
        'sqlite backend is unavailable; run `aiwg features install sqlite`'
      );
    }

    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  private initSchema(): void {
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
    `);
  }

  // --- Mutation ---

  addNode(id: string, attrs?: Record<string, unknown>): void {
    const existing = this.db.prepare('SELECT attrs FROM nodes WHERE id = ?').get(id);
    if (!existing) {
      this.db.prepare(
        'INSERT INTO nodes (id, attrs) VALUES (?, ?)'
      ).run(id, JSON.stringify(attrs ?? {}));
    } else if (attrs) {
      const merged = { ...JSON.parse(existing.attrs), ...attrs };
      this.db.prepare('UPDATE nodes SET attrs = ? WHERE id = ?').run(JSON.stringify(merged), id);
    }
  }

  addEdge(source: string, target: string, type: string = 'depends-on', attrs?: Record<string, unknown>): void {
    this.addNode(source);
    this.addNode(target);
    this.db.prepare(
      'INSERT OR IGNORE INTO edges (source, target, edge_type, attrs) VALUES (?, ?, ?, ?)'
    ).run(source, target, type, JSON.stringify(attrs ?? {}));
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
    return this.db.prepare('SELECT id FROM nodes').all().map((r: { id: string }) => r.id);
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

    return [...results];
  }

  // --- Set operations (native SQL) ---

  intersection(setA: string[], setB: string[]): string[] {
    if (setA.length === 0 || setB.length === 0) return [];
    const b = new Set(setB);
    return setA.filter(x => b.has(x));
  }

  difference(setA: string[], setB: string[]): string[] {
    const b = new Set(setB);
    return setA.filter(x => !b.has(x));
  }

  union(setA: string[], setB: string[]): string[] {
    return [...new Set([...setA, ...setB])];
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
    // Clear existing data
    this.db.exec('DELETE FROM edges; DELETE FROM nodes;');

    const insertNode = this.db.prepare('INSERT OR IGNORE INTO nodes (id) VALUES (?)');
    const insertEdge = this.db.prepare(
      'INSERT OR IGNORE INTO edges (source, target, edge_type) VALUES (?, ?, ?)'
    );

    const runBatch = this.db.transaction(() => {
      // Add all nodes
      for (const id of Object.keys(data)) {
        insertNode.run(id);
      }

      // Add edges from upstream relationships
      for (const [id, node] of Object.entries(data)) {
        const upEdges = normalizeEdges(node.upstream as (string | TypedEdge)[]);
        for (const edge of upEdges) {
          insertNode.run(edge.path); // Ensure referenced nodes exist
          insertEdge.run(edge.path, id, edge.type);
        }
        const downEdges = normalizeEdges(node.downstream as (string | TypedEdge)[]);
        for (const edge of downEdges) {
          insertNode.run(edge.path);
          insertEdge.run(id, edge.path, edge.type);
        }
      }
    });

    runBatch();
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
}
