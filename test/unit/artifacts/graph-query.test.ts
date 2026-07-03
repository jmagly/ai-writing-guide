/**
 * Cross-Graph Set Query Tests
 *
 * @source @src/artifacts/graph-query.ts
 * @implements #725
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  getNeighbors,
  resolveNode,
  setIntersection,
  setUnion,
  setDifference,
  showNeighbors,
  executeSetQuery,
} from '../../../src/artifacts/graph-query.js';
import type { DependencyGraph } from '../../../src/artifacts/types.js';

// Sample citation graph for testing
const citationGraph: DependencyGraph = {
  'citations/REF-008-citations.md': {
    upstream: [
      { path: 'citations/REF-029-citations.md', type: 'cites' },
      { path: 'citations/REF-009-citations.md', type: 'cites' },
    ],
    downstream: [
      { path: 'citations/REF-015-citations.md', type: 'cited-by' },
      { path: 'citations/REF-042-citations.md', type: 'cited-by' },
    ],
  },
  'citations/REF-016-citations.md': {
    upstream: [
      { path: 'citations/REF-029-citations.md', type: 'cites' },
      { path: 'citations/REF-052-citations.md', type: 'cites' },
    ],
    downstream: [
      { path: 'citations/REF-015-citations.md', type: 'cited-by' },
    ],
  },
  'citations/REF-029-citations.md': {
    upstream: [],
    downstream: [
      { path: 'citations/REF-008-citations.md', type: 'cites' },
      { path: 'citations/REF-016-citations.md', type: 'cites' },
    ],
  },
  'citations/REF-009-citations.md': {
    upstream: [],
    downstream: [
      { path: 'citations/REF-008-citations.md', type: 'cites' },
    ],
  },
  'citations/REF-015-citations.md': {
    upstream: [
      { path: 'citations/REF-008-citations.md', type: 'cites' },
      { path: 'citations/REF-016-citations.md', type: 'cites' },
    ],
    downstream: [],
  },
  'citations/REF-042-citations.md': {
    upstream: [
      { path: 'citations/REF-008-citations.md', type: 'cites' },
    ],
    downstream: [],
  },
  'citations/REF-052-citations.md': {
    upstream: [],
    downstream: [
      { path: 'citations/REF-016-citations.md', type: 'cites' },
    ],
  },
  'citations/REF-001-citations.md': {
    upstream: [
      { path: 'citations/REF-029-citations.md', type: 'cites' },
      { path: 'citations/REF-008-citations.md', type: 'depends-on' },
    ],
    downstream: [],
  },
};

describe('Cross-Graph Set Queries', () => {
  describe('getNeighbors', () => {
    it('should return upstream (in) neighbors', () => {
      const result = getNeighbors(citationGraph, 'citations/REF-008-citations.md', 'in');
      expect(result).toEqual(['citations/REF-029-citations.md', 'citations/REF-009-citations.md']);
    });

    it('should return downstream (out) neighbors', () => {
      const result = getNeighbors(citationGraph, 'citations/REF-008-citations.md', 'out');
      expect(result).toEqual(['citations/REF-015-citations.md', 'citations/REF-042-citations.md']);
    });

    it('should return both directions', () => {
      const result = getNeighbors(citationGraph, 'citations/REF-008-citations.md', 'both');
      expect(result).toHaveLength(4);
      expect(result).toContain('citations/REF-029-citations.md');
      expect(result).toContain('citations/REF-015-citations.md');
    });

    it('should filter by edge type', () => {
      // REF-001 has both "cites" and "depends-on" upstream edges
      const cites = getNeighbors(citationGraph, 'citations/REF-001-citations.md', 'in', 'cites');
      expect(cites).toEqual(['citations/REF-029-citations.md']);

      const dependsOn = getNeighbors(citationGraph, 'citations/REF-001-citations.md', 'in', 'depends-on');
      expect(dependsOn).toEqual(['citations/REF-008-citations.md']);
    });

    it('should return empty array for unknown node', () => {
      expect(getNeighbors(citationGraph, 'nonexistent.md', 'both')).toEqual([]);
    });

    it('should return empty array for node with no edges in direction', () => {
      expect(getNeighbors(citationGraph, 'citations/REF-029-citations.md', 'in')).toEqual([]);
    });

    it('should deduplicate when same node appears in both directions', () => {
      // REF-015 appears in upstream of REF-008's downstream
      // But getNeighbors only looks at direct edges, not transitive
      const result = getNeighbors(citationGraph, 'citations/REF-008-citations.md', 'both');
      const unique = new Set(result);
      expect(unique.size).toBe(result.length);
    });
  });

  describe('resolveNode', () => {
    it('should resolve exact path', () => {
      expect(resolveNode(citationGraph, 'citations/REF-008-citations.md'))
        .toBe('citations/REF-008-citations.md');
    });

    it('should resolve REF-XXX shorthand', () => {
      expect(resolveNode(citationGraph, 'REF-008'))
        .toBe('citations/REF-008-citations.md');
    });

    it('should resolve partial path', () => {
      expect(resolveNode(citationGraph, 'REF-008-citations.md'))
        .toBe('citations/REF-008-citations.md');
    });

    it('should return null for unknown node', () => {
      expect(resolveNode(citationGraph, 'REF-999')).toBeNull();
      expect(resolveNode(citationGraph, 'nonexistent.md')).toBeNull();
    });
  });

  describe('set operations', () => {
    it('intersection should return common elements', () => {
      // Papers that cite both REF-008 and REF-016
      const citedBy008 = getNeighbors(citationGraph, 'citations/REF-008-citations.md', 'out');
      const citedBy016 = getNeighbors(citationGraph, 'citations/REF-016-citations.md', 'out');

      const result = setIntersection(citedBy008, citedBy016);
      // REF-015 cites both REF-008 and REF-016
      expect(result).toEqual(['citations/REF-015-citations.md']);
    });

    it('union should return all unique elements', () => {
      const a = ['REF-001', 'REF-002', 'REF-003'];
      const b = ['REF-002', 'REF-003', 'REF-004'];
      expect(setUnion(a, b).sort()).toEqual(['REF-001', 'REF-002', 'REF-003', 'REF-004']);
    });

    it('difference should return elements in A but not B', () => {
      // Papers cited by REF-008 but not by REF-016 (upstream = "cites" direction)
      const cites008 = getNeighbors(citationGraph, 'citations/REF-008-citations.md', 'in', 'cites');
      const cites016 = getNeighbors(citationGraph, 'citations/REF-016-citations.md', 'in', 'cites');

      const result = setDifference(cites008, cites016);
      // REF-008 cites REF-029 and REF-009; REF-016 cites REF-029 and REF-052
      // Difference: REF-009 (in 008's cites but not 016's)
      expect(result).toEqual(['citations/REF-009-citations.md']);
    });

    it('intersection of disjoint sets should be empty', () => {
      expect(setIntersection(['a', 'b'], ['c', 'd'])).toEqual([]);
    });

    it('difference of identical sets should be empty', () => {
      expect(setDifference(['a', 'b'], ['a', 'b'])).toEqual([]);
    });
  });

  describe('showNeighbors', () => {
    let tmpDir: string;
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-neighbors-test-'));
      const indexDir = path.join(tmpDir, '.aiwg', '.index', 'citation-network');
      fs.mkdirSync(indexDir, { recursive: true });
      fs.writeFileSync(path.join(indexDir, 'dependencies.json'), JSON.stringify(citationGraph));

      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should output JSON with neighbors', async () => {
      await showNeighbors(tmpDir, {
        graph: 'citation-network',
        node: 'REF-008',
        direction: 'in',
        edgeType: 'cites',
        json: true,
        backend: 'local',
      });

      const output = consoleSpy.mock.calls.map(c => c[0]).join('');
      const parsed = JSON.parse(output);
      expect(parsed.node).toBe('citations/REF-008-citations.md');
      expect(parsed.neighbors).toHaveLength(2);
      expect(parsed.count).toBe(2);
    });

    it('should output human-readable format', async () => {
      await showNeighbors(tmpDir, {
        graph: 'citation-network',
        node: 'REF-008',
        direction: 'out',
        backend: 'local',
      });

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('REF-015');
      expect(output).toContain('REF-042');
      expect(output).toContain('Total: 2');
    });
  });

  describe('executeSetQuery', () => {
    let tmpDir: string;
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-setquery-test-'));
      const indexDir = path.join(tmpDir, '.aiwg', '.index', 'citation-network');
      fs.mkdirSync(indexDir, { recursive: true });
      fs.writeFileSync(path.join(indexDir, 'dependencies.json'), JSON.stringify(citationGraph));

      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should compute intersection of downstream neighbor sets', async () => {
      // Papers that cited both REF-008 and REF-016 (downstream = cited-by)
      await executeSetQuery(tmpDir, {
        graph: 'citation-network',
        op: 'intersection',
        nodeA: 'REF-008',
        nodeB: 'REF-016',
        direction: 'out',
        json: true,
        backend: 'local',
      });

      const output = consoleSpy.mock.calls.map(c => c[0]).join('');
      const parsed = JSON.parse(output);
      expect(parsed.op).toBe('intersection');
      expect(parsed.result).toContain('citations/REF-015-citations.md');
      expect(parsed.count).toBe(1);
    });

    it('should compute difference of upstream neighbor sets', async () => {
      // Papers cited by REF-008 but not by REF-016
      await executeSetQuery(tmpDir, {
        graph: 'citation-network',
        op: 'difference',
        nodeA: 'REF-008',
        nodeB: 'REF-016',
        direction: 'in',
        edgeType: 'cites',
        json: true,
        backend: 'local',
      });

      const output = consoleSpy.mock.calls.map(c => c[0]).join('');
      const parsed = JSON.parse(output);
      expect(parsed.op).toBe('difference');
      expect(parsed.result).toContain('citations/REF-009-citations.md');
      expect(parsed.result).not.toContain('citations/REF-029-citations.md');
    });

    it('should compute union of neighbor sets', async () => {
      await executeSetQuery(tmpDir, {
        graph: 'citation-network',
        op: 'union',
        nodeA: 'REF-008',
        nodeB: 'REF-016',
        direction: 'in',
        edgeType: 'cites',
        json: true,
        backend: 'local',
      });

      const output = consoleSpy.mock.calls.map(c => c[0]).join('');
      const parsed = JSON.parse(output);
      expect(parsed.result).toHaveLength(3); // REF-029, REF-009, REF-052
    });
  });
});
