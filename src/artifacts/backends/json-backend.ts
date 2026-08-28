/**
 * JSON Graph Backend
 *
 * Default zero-dependency implementation of GraphBackend wrapping the
 * existing DependencyGraph adjacency list format. Suitable for projects
 * with <5k nodes.
 *
 * @implements #727
 * @source @src/artifacts/graph-backend.ts
 * @tests @test/unit/artifacts/graph-backend.test.ts
 */

import { compareGraphIds, pageGraphIds, type GraphBackend, type GraphNodeFilters, type GraphNodePage } from '../graph-backend.js';
import type { DependencyGraph, TypedEdge } from '../types.js';
import { normalizeEdges } from '../types.js';

interface NodeRecord {
  upstream: TypedEdge[];
  downstream: TypedEdge[];
  attrs: Record<string, unknown>;
}

/**
 * JSON-backed graph using plain objects and JS Set operations.
 *
 * This is the default backend — always available, no external dependencies.
 */
export class JsonGraphBackend implements GraphBackend {
  private graph: Map<string, NodeRecord> = new Map();

  // --- Mutation ---

  addNode(id: string, attrs?: Record<string, unknown>): void {
    if (!this.graph.has(id)) {
      this.graph.set(id, { upstream: [], downstream: [], attrs: attrs ?? {} });
    } else if (attrs) {
      const node = this.graph.get(id)!;
      Object.assign(node.attrs, attrs);
    }
  }

  addEdge(source: string, target: string, type: string = 'depends-on', attrs?: Record<string, unknown>): void {
    // Ensure both nodes exist
    this.addNode(source);
    this.addNode(target);

    const sourceNode = this.graph.get(source)!;
    const targetNode = this.graph.get(target)!;

    // Add downstream edge on source
    sourceNode.downstream.push({ path: target, type, ...attrs });
    // Add upstream edge on target
    targetNode.upstream.push({ path: source, type, ...attrs });
  }

  // --- Query ---

  hasNode(id: string): boolean {
    return this.graph.has(id);
  }

  hasEdge(source: string, target: string, edgeType?: string): boolean {
    const node = this.graph.get(source);
    if (!node) return false;
    return node.downstream.some(e =>
      e.path === target && (!edgeType || e.type === edgeType)
    );
  }

  getNodeAttrs(id: string): Record<string, unknown> | undefined {
    return this.graph.get(id)?.attrs;
  }

  nodes(): string[] {
    return [...this.graph.keys()].sort(compareGraphIds);
  }

  queryNodes(filters: GraphNodeFilters): string[] {
    return [...this.graph]
      .filter(([, node]) => Object.entries(filters).every(([key, value]) => node.attrs[key] === value))
      .map(([id]) => id)
      .sort(compareGraphIds);
  }

  pageNodes(limit: number, after?: string): GraphNodePage {
    return pageGraphIds([...this.graph.keys()], limit, after);
  }

  // --- Traversal ---

  neighbors(nodeId: string, direction: 'in' | 'out' | 'both', edgeType?: string): string[] {
    const node = this.graph.get(nodeId);
    if (!node) return [];

    const results = new Set<string>();

    if (direction === 'in' || direction === 'both') {
      for (const edge of node.upstream) {
        if (!edgeType || edge.type === edgeType) {
          results.add(edge.path);
        }
      }
    }

    if (direction === 'out' || direction === 'both') {
      for (const edge of node.downstream) {
        if (!edgeType || edge.type === edgeType) {
          results.add(edge.path);
        }
      }
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
    for (const [id, node] of this.graph) {
      result[id] = {
        upstream: [...node.upstream],
        downstream: [...node.downstream],
      };
    }
    return result;
  }

  deserialize(data: DependencyGraph): void {
    this.graph.clear();

    for (const [id, node] of Object.entries(data)) {
      const upstream = normalizeEdges(node.upstream as (string | TypedEdge)[]);
      const downstream = normalizeEdges(node.downstream as (string | TypedEdge)[]);

      this.graph.set(id, { upstream, downstream, attrs: {} });
    }

    // Ensure all referenced nodes exist
    for (const [, node] of this.graph) {
      for (const edge of [...node.upstream, ...node.downstream]) {
        if (!this.graph.has(edge.path)) {
          this.graph.set(edge.path, { upstream: [], downstream: [], attrs: {} });
        }
      }
    }
  }

  nodeCount(): number {
    return this.graph.size;
  }

  edgeCount(): number {
    let count = 0;
    for (const [, node] of this.graph) {
      count += node.downstream.length;
    }
    return count;
  }
}
