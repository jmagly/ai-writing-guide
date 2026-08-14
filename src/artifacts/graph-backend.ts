/**
 * Graph Backend Abstraction
 *
 * Swappable interface for graph storage and traversal. The default
 * JsonGraphBackend wraps the existing DependencyGraph type with zero
 * additional dependencies. Optional backends (graphology, SQLite) provide
 * richer traversal and persistence at the cost of extra packages.
 *
 * @implements #727
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/graph-backend.test.ts
 */

import type { DependencyGraph } from './types.js';

/**
 * Abstract graph backend interface.
 *
 * All index modules interact with graphs through this interface.
 * Implementations must handle node/edge mutation, directional traversal,
 * set operations, and serialization to/from DependencyGraph for backward
 * compatibility with dependencies.json.
 */
export interface GraphBackend {
  // --- Mutation ---

  /** Add a node with optional attributes */
  addNode(id: string, attrs?: Record<string, unknown>): void;

  /** Add a directed edge from source to target */
  addEdge(source: string, target: string, type?: string, attrs?: Record<string, unknown>): void;

  // --- Query ---

  /** Check if a node exists */
  hasNode(id: string): boolean;

  /** Check if an edge exists (optionally filtered by type) */
  hasEdge(source: string, target: string, edgeType?: string): boolean;

  /** Get node attributes (returns undefined if node does not exist) */
  getNodeAttrs(id: string): Record<string, unknown> | undefined;

  /** List all node IDs */
  nodes(): string[];

  // --- Traversal ---

  /**
   * Get neighbors of a node.
   *
   * @param nodeId - Node to look up
   * @param direction - 'in' (upstream), 'out' (downstream), or 'both'
   * @param edgeType - Optional filter by relationship type
   * @returns Array of neighbor node IDs
   */
  neighbors(nodeId: string, direction: 'in' | 'out' | 'both', edgeType?: string): string[];

  // --- Set operations ---

  /** Set intersection of two node arrays */
  intersection(setA: string[], setB: string[]): string[];

  /** Set difference: elements in setA but not in setB */
  difference(setA: string[], setB: string[]): string[];

  /** Set union of two node arrays */
  union(setA: string[], setB: string[]): string[];

  // --- Persistence ---

  /** Serialize to DependencyGraph format (backward-compatible JSON output) */
  serialize(): DependencyGraph;

  /** Load from DependencyGraph format */
  deserialize(data: DependencyGraph): void;

  /** Number of nodes in the graph */
  nodeCount(): number;

  /** Number of edges in the graph */
  edgeCount(): number;
}

/**
 * Supported backend identifiers for configuration.
 */
export type GraphBackendType = 'json' | 'graphology' | 'sqlite';

/**
 * Create a graph backend instance.
 *
 * The json backend is always available. graphology and sqlite require
 * their respective optional dependencies to be installed.
 *
 * @param type - Backend type identifier
 * @returns A new GraphBackend instance
 * @throws Error if the requested backend's dependencies are not installed
 */
export async function createGraphBackend(type: GraphBackendType = 'json'): Promise<GraphBackend> {
  switch (type) {
    case 'json': {
      const { JsonGraphBackend } = await import('./backends/json-backend.js');
      return new JsonGraphBackend();
    }
    case 'graphology': {
      try {
        const { GraphologyBackend } = await import('./backends/graphology-backend.js');
        return GraphologyBackend.create();
      } catch {
        throw new Error(
          'graphology backend is unavailable; run `aiwg features install graph`'
        );
      }
    }
    case 'sqlite': {
      try {
        const { SqliteGraphBackend } = await import('./backends/sqlite-backend.js');
        return new SqliteGraphBackend();
      } catch {
        throw new Error(
          'sqlite backend is unavailable; run `aiwg features install sqlite`'
        );
      }
    }
    default:
      throw new Error(`Unknown graph backend: ${type}`);
  }
}
