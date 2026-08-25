/**
 * Artifact Dependency Graph
 *
 * Traverses the artifact dependency graph built from @-mention relationships.
 * Shows upstream (what this depends on) and downstream (what depends on this).
 *
 * @implements #417
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/dep-graph.test.ts
 */

import type { DependencyGraph, GraphType, TypedEdge } from './types.js';
import { normalizeEdges } from './types.js';
import { loadDependencyGraph } from './index-reader.js';
import { buildFortemiCoreDependencyGraph } from './fortemi-core-query-adapter.js';
import { closeGraphBackend, openGraphBackend } from './backend-runtime.js';

export interface DepsOptions {
  direction?: 'upstream' | 'downstream' | 'both';
  depth?: number;
  json?: boolean;
  graph?: GraphType;
  edgeType?: string;
  backend?: 'local' | 'fortemi-core';
}

interface TraversalResult {
  path: string;
  depth: number;
  children: TraversalResult[];
}

/**
 * Traverse the dependency graph in one direction
 *
 * @param edgeType - Optional filter: only follow edges of this type
 */
function traverse(
  graph: DependencyGraph,
  startPath: string,
  direction: 'upstream' | 'downstream',
  maxDepth: number,
  visited: Set<string> = new Set(),
  currentDepth: number = 0,
  edgeType?: string
): TraversalResult[] {
  if (currentDepth >= maxDepth) return [];

  const node = graph[startPath];
  if (!node) return [];

  const rawEdges = direction === 'upstream' ? node.upstream : node.downstream;
  // Normalize for backward compat (old indexes may have string arrays)
  const edges: TypedEdge[] = normalizeEdges(rawEdges as (string | TypedEdge)[]);
  // Filter by edge type if specified
  const filtered = edgeType ? edges.filter(e => e.type === edgeType) : edges;
  const results: TraversalResult[] = [];

  for (const edge of filtered) {
    if (visited.has(edge.path)) continue; // Cycle detection
    visited.add(edge.path);

    const children = traverse(graph, edge.path, direction, maxDepth, visited, currentDepth + 1, edgeType);
    results.push({ path: edge.path, depth: currentDepth + 1, children });
  }

  return results;
}

/**
 * Format tree output for human readability
 */
function formatTree(results: TraversalResult[], prefix: string = ''): string {
  let output = '';
  for (let i = 0; i < results.length; i++) {
    const isLast = i === results.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';

    output += `${prefix}${connector}${results[i].path}\n`;
    if (results[i].children.length > 0) {
      output += formatTree(results[i].children, prefix + childPrefix);
    }
  }
  return output;
}

/**
 * Flatten traversal results into a unique path list
 */
function flattenResults(results: TraversalResult[]): string[] {
  const paths: string[] = [];
  for (const r of results) {
    paths.push(r.path);
    paths.push(...flattenResults(r.children));
  }
  return [...new Set(paths)];
}

/**
 * Show dependencies for an artifact
 */
export async function showDeps(
  cwd: string,
  artifactPath: string,
  options: DepsOptions = {}
): Promise<void> {
  const { direction = 'both', depth = 3, json = false, graph: graphType, edgeType, backend = 'fortemi-core' } = options;

  let depGraph: DependencyGraph | null = null;
  let graphBackend: string | undefined;

  if (backend === 'fortemi-core') {
    const loaded = buildFortemiCoreDependencyGraph(cwd, graphType ?? 'project');
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
            "Run 'aiwg index sync' first, or pass '--backend local' to use the legacy local index.",
        );
      }
      process.exit(1);
    }
    depGraph = loaded.graph;
  } else if (graphType) {
    const active = await openGraphBackend(cwd, graphType);
    graphBackend = active.type;
    try { depGraph = active.backend.serialize(); } finally { await closeGraphBackend(active); }
    if (!depGraph) {
      console.error(`Error: No artifact index found for graph '${graphType}'.`);
      console.log("Run 'aiwg index build' first to create the index.");
      process.exit(1);
    }
  } else {
    // Merge dependency graphs from project-local graphs
    const graphTypes: GraphType[] = ['project', 'codebase'];
    const merged: DependencyGraph = {};
    for (const g of graphTypes) {
      try {
        const active = await openGraphBackend(cwd, g);
        try { Object.assign(merged, active.backend.serialize()); } finally { await closeGraphBackend(active); }
      } catch (error) {
        // Missing optional graph data is ignorable; unavailable configured
        // backends are actionable and must not silently fall back to JSON.
        if ((error as Error).message.includes('backend is unavailable')) throw error;
      }
    }

    if (Object.keys(merged).length > 0) {
      depGraph = merged;
    } else {
      // Legacy fallback
      depGraph = loadDependencyGraph(cwd);
      if (!depGraph) {
        console.error('Error: No artifact index found.');
        console.log("Run 'aiwg index build' first to create the index.");
        process.exit(1);
      }
    }
  }

  if (!depGraph[artifactPath]) {
    console.error(`Error: '${artifactPath}' not found in the dependency index.`);
    console.log('Check the path or run `aiwg index build` to refresh.');
    process.exit(1);
  }

  const showUpstream = direction === 'upstream' || direction === 'both';
  const showDownstream = direction === 'downstream' || direction === 'both';

  const upstreamResults = showUpstream
    ? traverse(depGraph, artifactPath, 'upstream', depth, new Set([artifactPath]), 0, edgeType)
    : [];
  const downstreamResults = showDownstream
    ? traverse(depGraph, artifactPath, 'downstream', depth, new Set([artifactPath]), 0, edgeType)
    : [];

  if (json) {
    console.log(JSON.stringify({
      artifact: artifactPath,
      backend,
      ...(graphBackend ? { graphBackend } : {}),
      direction,
      depth,
      upstream: flattenResults(upstreamResults),
      downstream: flattenResults(downstreamResults),
      upstreamCount: flattenResults(upstreamResults).length,
      downstreamCount: flattenResults(downstreamResults).length,
    }, null, 2));
  } else {
    console.log(`Dependencies for ${artifactPath}:`);
    console.log('');

    if (showUpstream) {
      console.log('  UPSTREAM (this artifact depends on):');
      if (upstreamResults.length === 0) {
        console.log('    (none)');
      } else {
        const tree = formatTree(upstreamResults, '    ');
        process.stdout.write(tree);
      }
      console.log('');
    }

    if (showDownstream) {
      console.log('  DOWNSTREAM (depends on this artifact):');
      if (downstreamResults.length === 0) {
        console.log('    (none)');
      } else {
        const tree = formatTree(downstreamResults, '    ');
        process.stdout.write(tree);
      }
      console.log('');
    }

    const upCount = flattenResults(upstreamResults).length;
    const downCount = flattenResults(downstreamResults).length;
    console.log(`  Upstream: ${upCount} | Downstream: ${downCount} | Total: ${upCount + downCount}`);
  }
}
