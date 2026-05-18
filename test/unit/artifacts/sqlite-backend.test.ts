/**
 * SQLite Backend Tests
 *
 * @source @src/artifacts/backends/sqlite-backend.ts
 * @implements #729
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import type { GraphBackend } from '../../../src/artifacts/graph-backend.js';
import type { DependencyGraph } from '../../../src/artifacts/types.js';
import { SqliteGraphBackend } from '../../../src/artifacts/backends/sqlite-backend.js';

const require = createRequire(import.meta.url);
const sqliteAvailable = (() => {
  try {
    require.resolve('better-sqlite3');
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!sqliteAvailable)('SqliteGraphBackend', () => {
  let g: (GraphBackend & { close(): void }) | undefined;

  beforeEach(() => {
    g = new SqliteGraphBackend(':memory:');
  });

  afterEach(() => {
    g?.close();
    g = undefined;
  });

  describe('addNode / hasNode', () => {
    it('adds and detects nodes', () => {
      expect(g.hasNode('A')).toBe(false);
      g.addNode('A');
      expect(g.hasNode('A')).toBe(true);
      expect(g.nodeCount()).toBe(1);
    });

    it('stores and retrieves node attributes', () => {
      g.addNode('A', { type: 'paper', year: 2024 });
      expect(g.getNodeAttrs('A')).toEqual({ type: 'paper', year: 2024 });
    });

    it('merges attributes on duplicate addNode', () => {
      g.addNode('A', { type: 'paper' });
      g.addNode('A', { year: 2024 });
      expect(g.getNodeAttrs('A')).toEqual({ type: 'paper', year: 2024 });
    });

    it('returns undefined attrs for missing node', () => {
      expect(g.getNodeAttrs('missing')).toBeUndefined();
    });
  });

  describe('addEdge / hasEdge', () => {
    it('creates directed edges and auto-creates nodes', () => {
      g.addEdge('A', 'B', 'cites');
      expect(g.hasNode('A')).toBe(true);
      expect(g.hasNode('B')).toBe(true);
      expect(g.hasEdge('A', 'B')).toBe(true);
      expect(g.hasEdge('A', 'B', 'cites')).toBe(true);
      expect(g.hasEdge('B', 'A')).toBe(false);
      expect(g.edgeCount()).toBe(1);
    });

    it('filters hasEdge by type', () => {
      g.addEdge('A', 'B', 'cites');
      expect(g.hasEdge('A', 'B', 'depends-on')).toBe(false);
      expect(g.hasEdge('A', 'B', 'cites')).toBe(true);
    });

    it('defaults edge type to depends-on', () => {
      g.addEdge('A', 'B');
      expect(g.hasEdge('A', 'B', 'depends-on')).toBe(true);
    });

    it('deduplicates same source+target+type (INSERT OR IGNORE)', () => {
      g.addEdge('A', 'B', 'cites');
      g.addEdge('A', 'B', 'cites');
      expect(g.edgeCount()).toBe(1);
    });
  });

  describe('neighbors', () => {
    it('returns outbound neighbors', () => {
      g.addEdge('A', 'B', 'cites');
      g.addEdge('A', 'C', 'cites');
      g.addEdge('D', 'A', 'cites');

      const out = g.neighbors('A', 'out');
      expect(out).toEqual(expect.arrayContaining(['B', 'C']));
      expect(out).toHaveLength(2);
    });

    it('returns inbound neighbors', () => {
      g.addEdge('A', 'B', 'cites');
      g.addEdge('C', 'B', 'depends-on');

      expect(g.neighbors('B', 'in')).toEqual(expect.arrayContaining(['A', 'C']));
    });

    it('returns both directions', () => {
      g.addEdge('A', 'B', 'cites');
      g.addEdge('C', 'A', 'depends-on');

      const both = g.neighbors('A', 'both');
      expect(both).toEqual(expect.arrayContaining(['B', 'C']));
      expect(both).toHaveLength(2);
    });

    it('filters by edge type', () => {
      g.addEdge('A', 'B', 'cites');
      g.addEdge('A', 'C', 'depends-on');

      expect(g.neighbors('A', 'out', 'cites')).toEqual(['B']);
      expect(g.neighbors('A', 'out', 'depends-on')).toEqual(['C']);
    });

    it('returns empty for missing node', () => {
      expect(g.neighbors('missing', 'both')).toEqual([]);
    });
  });

  describe('set operations', () => {
    it('computes intersection', () => {
      expect(g.intersection(['A', 'B', 'C'], ['B', 'C', 'D'])).toEqual(['B', 'C']);
    });

    it('computes difference', () => {
      expect(g.difference(['A', 'B', 'C'], ['B', 'C', 'D'])).toEqual(['A']);
    });

    it('computes union', () => {
      const result = g.union(['A', 'B'], ['B', 'C']);
      expect(result).toEqual(expect.arrayContaining(['A', 'B', 'C']));
      expect(result).toHaveLength(3);
    });

    it('handles empty sets', () => {
      expect(g.intersection([], ['A'])).toEqual([]);
      expect(g.difference(['A'], [])).toEqual(['A']);
      expect(g.union([], [])).toEqual([]);
    });
  });

  describe('serialize / deserialize', () => {
    it('round-trips through DependencyGraph format', () => {
      g.addEdge('A', 'B', 'cites');
      g.addEdge('A', 'C', 'depends-on');
      g.addEdge('D', 'A', 'cited-by');

      const serialized = g.serialize();

      const g2 = new SqliteGraphBackend!(':memory:');
      g2.deserialize(serialized);

      expect(g2.hasNode('A')).toBe(true);
      expect(g2.hasNode('B')).toBe(true);
      expect(g2.hasNode('C')).toBe(true);
      expect(g2.hasNode('D')).toBe(true);
      expect(g2.nodeCount()).toBe(g.nodeCount());
      expect(g2.edgeCount()).toBe(g.edgeCount());
      g2.close();
    });

    it('deserializes a DependencyGraph with upstream/downstream', () => {
      const data: DependencyGraph = {
        'A': {
          upstream: [{ path: 'B', type: 'cites' }],
          downstream: [{ path: 'C', type: 'depends-on' }],
        },
        'B': { upstream: [], downstream: [{ path: 'A', type: 'cites' }] },
        'C': { upstream: [{ path: 'A', type: 'depends-on' }], downstream: [] },
      };

      g.deserialize(data);

      expect(g.hasNode('A')).toBe(true);
      expect(g.hasNode('B')).toBe(true);
      expect(g.hasNode('C')).toBe(true);
      expect(g.neighbors('A', 'in')).toContain('B');
      expect(g.neighbors('A', 'out')).toContain('C');
    });
  });

  describe('nodes()', () => {
    it('lists all node IDs', () => {
      g.addNode('X');
      g.addEdge('A', 'B');
      const nodeList = g.nodes();
      expect(nodeList).toEqual(expect.arrayContaining(['X', 'A', 'B']));
      expect(nodeList).toHaveLength(3);
    });
  });
});
