/**
 * Cross-Graph Set Queries
 *
 * Provides neighbor lookup and set operations (intersection, union, difference)
 * across dependency graphs. Supports typed edge filtering and cross-graph joins.
 *
 * @implements #725
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/graph-query.test.ts
 */

import type { DependencyGraph, GraphType, TypedEdge } from './types.js';
import { normalizeEdges } from './types.js';
import { loadGraphIndexFile } from './index-reader.js';
import { buildFortemiCoreDependencyGraph } from './fortemi-core-query-adapter.js';

export interface NeighborsOptions {
  /** Graph to query */
  graph: GraphType;
  /** Node identifier (file path or REF-XXX) */
  node: string;
  /** Direction: in (upstream/cited-by), out (downstream/cites), or both */
  direction?: 'in' | 'out' | 'both';
  /** Filter by edge type (e.g., "cites", "depends-on") */
  edgeType?: string;
  /** Output format */
  json?: boolean;
  /** Query backend */
  backend?: 'local' | 'fortemi-core';
}

export interface SetQueryOptions {
  /** Graph to query */
  graph: GraphType;
  /** Set operation */
  op: 'intersection' | 'union' | 'difference';
  /** First operand: neighbors of this node */
  nodeA: string;
  /** Second operand: neighbors of this node */
  nodeB: string;
  /** Direction for neighbor lookup */
  direction?: 'in' | 'out';
  /** Filter by edge type */
  edgeType?: string;
  /** Output format */
  json?: boolean;
  /** Query backend */
  backend?: 'local' | 'fortemi-core';
}

/**
 * Get neighbors of a node in a dependency graph.
 *
 * @param graph - Loaded dependency graph
 * @param node - Node path to look up
 * @param direction - "in" (upstream), "out" (downstream), or "both"
 * @param edgeType - Optional filter by edge type
 * @returns Array of neighbor paths
 */
export function getNeighbors(
  graph: DependencyGraph,
  node: string,
  direction: 'in' | 'out' | 'both' = 'both',
  edgeType?: string
): string[] {
  const entry = graph[node];
  if (!entry) return [];

  const results = new Set<string>();

  if (direction === 'in' || direction === 'both') {
    const edges: TypedEdge[] = normalizeEdges(entry.upstream as (string | TypedEdge)[]);
    for (const edge of edges) {
      if (!edgeType || edge.type === edgeType) {
        results.add(edge.path);
      }
    }
  }

  if (direction === 'out' || direction === 'both') {
    const edges: TypedEdge[] = normalizeEdges(entry.downstream as (string | TypedEdge)[]);
    for (const edge of edges) {
      if (!edgeType || edge.type === edgeType) {
        results.add(edge.path);
      }
    }
  }

  return [...results];
}

/**
 * Resolve a node identifier to a graph key.
 *
 * Supports:
 * - Exact path match ("documentation/citations/REF-008-citations.md")
 * - REF-XXX shorthand — finds the first key containing the REF identifier
 * - Partial path match — finds the first key ending with the given string
 */
export function resolveNode(graph: DependencyGraph, node: string): string | null {
  // Exact match
  if (graph[node]) return node;

  // REF-XXX shorthand
  if (/^REF-\d+$/.test(node)) {
    const key = Object.keys(graph).find(k => k.includes(node));
    return key ?? null;
  }

  // Partial path match
  const key = Object.keys(graph).find(k => k.endsWith(node));
  return key ?? null;
}

/**
 * Set intersection of two arrays
 */
export function setIntersection(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter(x => setB.has(x));
}

/**
 * Set union of two arrays
 */
export function setUnion(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

/**
 * Set difference: elements in a but not in b
 */
export function setDifference(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter(x => !setB.has(x));
}

/**
 * Load a dependency graph for a given graph type
 */
function loadGraph(cwd: string, graphType: GraphType): DependencyGraph | null {
  return loadGraphIndexFile<DependencyGraph>(cwd, 'dependencies.json', graphType);
}

/**
 * Execute the `neighbors` subcommand
 */
export async function showNeighbors(
  cwd: string,
  options: NeighborsOptions
): Promise<void> {
  const { graph: graphType, node, direction = 'both', edgeType, json = false, backend = 'local' } = options;

  let graph: DependencyGraph | null = null;
  if (backend === 'fortemi-core') {
    const loaded = buildFortemiCoreDependencyGraph(cwd, graphType);
    if (!loaded.graph) {
      if (json) {
        console.log(
          JSON.stringify(
            { error: 'fortemi-core-index-unavailable', hint: loaded.reason },
            null,
            2,
          ),
        );
      } else {
        console.error('Error: Fortemi Core static index is unavailable.');
        console.log(
          loaded.reason ??
            "Run 'aiwg index sync --backend fortemi-core' first.",
        );
      }
      process.exit(1);
    }
    graph = loaded.graph;
  } else {
    graph = loadGraph(cwd, graphType);
  }
  if (!graph) {
    console.error(`Error: No index found for graph '${graphType}'.`);
    console.log("Run 'aiwg index build --graph " + graphType + "' first.");
    process.exit(1);
  }

  const resolved = resolveNode(graph, node);
  if (!resolved) {
    console.error(`Error: Node '${node}' not found in graph '${graphType}'.`);
    const keys = Object.keys(graph);
    // Suggest similar nodes
    const similar = keys.filter(k => k.toLowerCase().includes(node.toLowerCase())).slice(0, 5);
    if (similar.length > 0) {
      console.log('Similar nodes:');
      for (const s of similar) console.log(`  ${s}`);
    }
    process.exit(1);
  }

  const neighbors = getNeighbors(graph, resolved, direction, edgeType);

  if (json) {
    console.log(JSON.stringify({
      graph: graphType,
      backend,
      node: resolved,
      direction,
      edgeType: edgeType ?? null,
      neighbors,
      count: neighbors.length,
    }, null, 2));
  } else {
    const dirLabel = direction === 'in' ? 'IN' : direction === 'out' ? 'OUT' : 'ALL';
    const typeLabel = edgeType ? ` [${edgeType}]` : '';
    console.log(`Neighbors of ${resolved} (${dirLabel}${typeLabel}):`);
    if (neighbors.length === 0) {
      console.log('  (none)');
    } else {
      for (const n of neighbors) {
        console.log(`  ${n}`);
      }
    }
    console.log(`\nTotal: ${neighbors.length}`);
  }
}

/**
 * Execute a set query (intersection, union, difference) on neighbor sets
 */
export async function executeSetQuery(
  cwd: string,
  options: SetQueryOptions
): Promise<void> {
  const { graph: graphType, op, nodeA, nodeB, direction = 'in', edgeType, json = false, backend = 'local' } = options;

  let graph: DependencyGraph | null = null;
  if (backend === 'fortemi-core') {
    const loaded = buildFortemiCoreDependencyGraph(cwd, graphType);
    if (!loaded.graph) {
      if (json) {
        console.log(
          JSON.stringify(
            { error: 'fortemi-core-index-unavailable', hint: loaded.reason },
            null,
            2,
          ),
        );
      } else {
        console.error('Error: Fortemi Core static index is unavailable.');
        console.log(
          loaded.reason ??
            "Run 'aiwg index sync --backend fortemi-core' first.",
        );
      }
      process.exit(1);
    }
    graph = loaded.graph;
  } else {
    graph = loadGraph(cwd, graphType);
  }
  if (!graph) {
    console.error(`Error: No index found for graph '${graphType}'.`);
    process.exit(1);
  }

  const resolvedA = resolveNode(graph, nodeA);
  const resolvedB = resolveNode(graph, nodeB);

  if (!resolvedA) {
    console.error(`Error: Node '${nodeA}' not found in graph '${graphType}'.`);
    process.exit(1);
  }
  if (!resolvedB) {
    console.error(`Error: Node '${nodeB}' not found in graph '${graphType}'.`);
    process.exit(1);
  }

  const neighborsA = getNeighbors(graph, resolvedA, direction, edgeType);
  const neighborsB = getNeighbors(graph, resolvedB, direction, edgeType);

  let result: string[];
  switch (op) {
    case 'intersection':
      result = setIntersection(neighborsA, neighborsB);
      break;
    case 'union':
      result = setUnion(neighborsA, neighborsB);
      break;
    case 'difference':
      result = setDifference(neighborsA, neighborsB);
      break;
  }

  if (json) {
    console.log(JSON.stringify({
      graph: graphType,
      backend,
      op,
      nodeA: resolvedA,
      nodeB: resolvedB,
      direction,
      edgeType: edgeType ?? null,
      result,
      count: result.length,
      setA_count: neighborsA.length,
      setB_count: neighborsB.length,
    }, null, 2));
  } else {
    const dirLabel = direction === 'in' ? 'IN' : 'OUT';
    const typeLabel = edgeType ? ` [${edgeType}]` : '';
    console.log(`${op.toUpperCase()}(${dirLabel}${typeLabel}):`);
    console.log(`  A: ${resolvedA} (${neighborsA.length} neighbors)`);
    console.log(`  B: ${resolvedB} (${neighborsB.length} neighbors)`);
    console.log('');
    if (result.length === 0) {
      console.log('  (empty set)');
    } else {
      for (const r of result) {
        console.log(`  ${r}`);
      }
    }
    console.log(`\nResult: ${result.length} nodes`);
  }
}
