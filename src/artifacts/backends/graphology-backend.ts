/**
 * Graphology Graph Backend
 *
 * Optional implementation of GraphBackend using the graphology library.
 * Provides typed/attributed edges, BFS/DFS traversal, community detection,
 * and shortest-path algorithms.
 *
 * Enable with: aiwg features install graph
 *
 * @implements #728
 * @source @src/artifacts/graph-backend.ts
 * @tests @test/unit/artifacts/graphology-backend.test.ts
 */

import { compareGraphIds, pageGraphIds, type GraphBackend, type GraphNodeFilters, type GraphNodePage } from '../graph-backend.js';
import type { DependencyGraph, TypedEdge } from '../types.js';
import { normalizeEdges } from '../types.js';
import { loadFeaturePackage } from '../../features/runtime.js';

/**
 * Graphology-backed graph with rich traversal and operator ecosystem.
 *
 * Uses dynamic import so the graphology package is only loaded when this
 * backend is explicitly selected. Projects that don't install graphology
 * pay zero cost.
 */
export class GraphologyBackend implements GraphBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private graph: any;

  private constructor(graphInstance: unknown) {
    this.graph = graphInstance;
  }

  /**
   * Factory: creates a GraphologyBackend with a fresh directed multigraph.
   * Throws a clear error if graphology is not installed.
   */
  static async create(): Promise<GraphologyBackend> {
    try {
      const graphology: any = await loadFeaturePackage('graphology');
      const Graph = graphology.default ?? graphology;
      const graph = new Graph({ type: 'directed', multi: true });
      return new GraphologyBackend(graph);
    } catch {
      throw new Error(
        'graphology backend is unavailable; run `aiwg features install graph`'
      );
    }
  }

  // --- Mutation ---

  addNode(id: string, attrs?: Record<string, unknown>): void {
    if (!this.graph.hasNode(id)) {
      this.graph.addNode(id, attrs ?? {});
    } else if (attrs) {
      this.graph.mergeNodeAttributes(id, attrs);
    }
  }

  addEdge(source: string, target: string, type: string = 'depends-on', attrs?: Record<string, unknown>): void {
    if (!this.graph.hasNode(source)) this.graph.addNode(source, {});
    if (!this.graph.hasNode(target)) this.graph.addNode(target, {});
    this.graph.addEdge(source, target, { type, ...attrs });
  }

  // --- Query ---

  hasNode(id: string): boolean {
    return this.graph.hasNode(id);
  }

  hasEdge(source: string, target: string, edgeType?: string): boolean {
    if (!edgeType) return this.graph.hasEdge(source, target);
    const edges: string[] = this.graph.edges(source, target);
    return edges.some((e: string) => this.graph.getEdgeAttribute(e, 'type') === edgeType);
  }

  getNodeAttrs(id: string): Record<string, unknown> | undefined {
    if (!this.graph.hasNode(id)) return undefined;
    return this.graph.getNodeAttributes(id);
  }

  nodes(): string[] {
    return this.graph.nodes().sort(compareGraphIds);
  }

  queryNodes(filters: GraphNodeFilters): string[] {
    return this.graph.nodes()
      .filter((id: string) => Object.entries(filters).every(([key, value]) => this.graph.getNodeAttribute(id, key) === value))
      .sort(compareGraphIds);
  }

  pageNodes(limit: number, after?: string): GraphNodePage {
    return pageGraphIds(this.graph.nodes(), limit, after);
  }

  // --- Traversal ---

  neighbors(nodeId: string, direction: 'in' | 'out' | 'both', edgeType?: string): string[] {
    if (!this.graph.hasNode(nodeId)) return [];

    let edgeIterator: string[];
    if (direction === 'in') {
      edgeIterator = this.graph.inEdges(nodeId);
    } else if (direction === 'out') {
      edgeIterator = this.graph.outEdges(nodeId);
    } else {
      edgeIterator = this.graph.edges(nodeId);
    }

    const results = new Set<string>();
    for (const edgeKey of edgeIterator) {
      if (edgeType && this.graph.getEdgeAttribute(edgeKey, 'type') !== edgeType) continue;
      const src = this.graph.source(edgeKey);
      const tgt = this.graph.target(edgeKey);
      // Add the "other" node
      results.add(src === nodeId ? tgt : src);
    }
    return [...results].sort(compareGraphIds);
  }

  // --- Set operations ---

  intersection(setA: string[], setB: string[]): string[] {
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
    this.graph.forEachNode((id: string) => {
      const upstream: TypedEdge[] = [];
      const downstream: TypedEdge[] = [];

      for (const edgeKey of this.graph.inEdges(id) as string[]) {
        upstream.push({
          path: this.graph.source(edgeKey) as string,
          type: (this.graph.getEdgeAttribute(edgeKey, 'type') as string) ?? 'depends-on',
        });
      }
      for (const edgeKey of this.graph.outEdges(id) as string[]) {
        downstream.push({
          path: this.graph.target(edgeKey) as string,
          type: (this.graph.getEdgeAttribute(edgeKey, 'type') as string) ?? 'depends-on',
        });
      }

      result[id] = { upstream, downstream };
    });
    return result;
  }

  deserialize(data: DependencyGraph): void {
    this.graph.clear();

    // First pass: add all declared nodes
    for (const id of Object.keys(data)) {
      if (!this.graph.hasNode(id)) this.graph.addNode(id, {});
    }

    // Second pass: add edges (upstream edges define the directed relationships)
    for (const [id, node] of Object.entries(data)) {
      const upEdges = normalizeEdges(node.upstream as (string | TypedEdge)[]);
      for (const edge of upEdges) {
        if (!this.graph.hasNode(edge.path)) this.graph.addNode(edge.path, {});
        this.graph.addEdge(edge.path, id, { type: edge.type });
      }
    }
  }

  nodeCount(): number {
    return this.graph.order;
  }

  edgeCount(): number {
    return this.graph.size;
  }
}
