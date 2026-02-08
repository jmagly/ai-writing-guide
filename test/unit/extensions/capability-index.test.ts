/**
 * CapabilityIndex test suite
 *
 * @source @src/extensions/capability-index.ts
 * @requirement @.aiwg/requirements/use-cases/UC-004-extension-system.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CapabilityIndex } from '../../../src/extensions/capability-index.js';
import type { Extension } from '../../../src/extensions/types.js';

describe('CapabilityIndex', () => {
  let index: CapabilityIndex;

  // Test fixtures
  const markdownFormatter: Extension = {
    id: 'markdown-formatter',
    type: 'tool',
    version: '1.0.0',
    capabilities: ['format:markdown', 'format:commonmark'],
  };

  const markdownLinter: Extension = {
    id: 'markdown-linter',
    type: 'tool',
    version: '1.0.0',
    capabilities: ['lint:markdown', 'validate:markdown'],
  };

  const multiTool: Extension = {
    id: 'multi-tool',
    type: 'tool',
    version: '1.0.0',
    capabilities: ['format:markdown', 'lint:markdown', 'validate:markdown'],
  };

  const agentExtension: Extension = {
    id: 'test-agent',
    type: 'agent',
    version: '1.0.0',
    capabilities: ['test:unit', 'test:integration'],
  };

  const noCapabilities: Extension = {
    id: 'simple-extension',
    type: 'tool',
    version: '1.0.0',
  };

  beforeEach(() => {
    index = new CapabilityIndex();
  });

  describe('index()', () => {
    it('should index extension capabilities', () => {
      index.index(markdownFormatter);

      expect(index.hasCapability('format:markdown')).toBe(true);
      expect(index.hasCapability('format:commonmark')).toBe(true);
      expect(index.getByCapability('format:markdown')).toContain('markdown-formatter');
    });

    it('should handle extensions with no capabilities', () => {
      index.index(noCapabilities);

      expect(index.getAllCapabilities()).toHaveLength(0);
      expect(index.capabilityCount).toBe(0);
    });

    it('should handle multiple extensions with same capability', () => {
      index.index(markdownFormatter);
      index.index(multiTool);

      const formatters = index.getByCapability('format:markdown');
      expect(formatters).toContain('markdown-formatter');
      expect(formatters).toContain('multi-tool');
      expect(formatters).toHaveLength(2);
    });

    it('should replace existing index data when re-indexing', () => {
      // Index with original capabilities
      index.index(markdownFormatter);
      expect(index.hasCapability('format:markdown')).toBe(true);

      // Re-index with different capabilities
      const updated: Extension = {
        ...markdownFormatter,
        capabilities: ['lint:markdown'],
      };
      index.index(updated);

      expect(index.hasCapability('format:markdown')).toBe(false);
      expect(index.hasCapability('lint:markdown')).toBe(true);
    });

    it('should store extension type for filtering', () => {
      index.index(markdownFormatter);
      index.index(agentExtension);

      const tools = index.query({ type: 'tool' });
      expect(tools).toContain('markdown-formatter');
      expect(tools).not.toContain('test-agent');

      const agents = index.query({ type: 'agent' });
      expect(agents).toContain('test-agent');
      expect(agents).not.toContain('markdown-formatter');
    });
  });

  describe('remove()', () => {
    beforeEach(() => {
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(multiTool);
    });

    it('should remove extension from capability mappings', () => {
      index.remove('markdown-formatter');

      const formatters = index.getByCapability('format:markdown');
      expect(formatters).not.toContain('markdown-formatter');
      expect(formatters).toContain('multi-tool');
    });

    it('should clean up empty capability sets', () => {
      // Only markdown-formatter has format:commonmark
      index.remove('markdown-formatter');

      expect(index.hasCapability('format:commonmark')).toBe(false);
      expect(index.getAllCapabilities()).not.toContain('format:commonmark');
    });

    it('should handle removal edge cases', () => {
      // Test removing non-existent extension
      expect(() => index.remove('non-existent')).not.toThrow();
      expect(index.capabilityCount).toBeGreaterThan(0);

      // Test removing same extension twice
      index.remove('markdown-formatter');
      expect(() => index.remove('markdown-formatter')).not.toThrow();
      expect(index.capabilityCount).toBeGreaterThan(0);
    });
  });

  describe('query() - all mode', () => {
    beforeEach(() => {
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(multiTool);
    });

    it('should find extensions with ALL specified capabilities and handle edge cases', () => {
      // Test basic all query
      const multiCapResult = index.query({
        all: ['format:markdown', 'lint:markdown'],
      });
      expect(multiCapResult).toContain('multi-tool');
      expect(multiCapResult).not.toContain('markdown-formatter');
      expect(multiCapResult).not.toContain('markdown-linter');

      // Test no matches
      const noMatchResult = index.query({
        all: ['format:markdown', 'test:unit'],
      });
      expect(noMatchResult).toHaveLength(0);

      // Test single capability
      const singleCapResult = index.query({
        all: ['format:markdown'],
      });
      expect(singleCapResult).toContain('markdown-formatter');
      expect(singleCapResult).toContain('multi-tool');
      expect(singleCapResult).toHaveLength(2);

      // Test sorted results
      expect(singleCapResult).toEqual([...singleCapResult].sort());
    });
  });

  describe('query() - any mode', () => {
    beforeEach(() => {
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(multiTool);
      index.index(agentExtension);
    });

    it('should find extensions with ANY specified capability and handle edge cases', () => {
      // Test basic any query
      const anyResult = index.query({
        any: ['format:markdown', 'test:unit'],
      });
      expect(anyResult).toContain('markdown-formatter');
      expect(anyResult).toContain('multi-tool');
      expect(anyResult).toContain('test-agent');
      expect(anyResult).not.toContain('markdown-linter');

      // Test no matches
      const noMatchResult = index.query({
        any: ['nonexistent:capability'],
      });
      expect(noMatchResult).toHaveLength(0);

      // Test single capability
      const singleResult = index.query({
        any: ['lint:markdown'],
      });
      expect(singleResult).toContain('markdown-linter');
      expect(singleResult).toContain('multi-tool');
      expect(singleResult).toHaveLength(2);

      // Test deduplication - multi-tool has both capabilities but should appear once
      const dedupResult = index.query({
        any: ['format:markdown', 'lint:markdown'],
      });
      const multiToolCount = dedupResult.filter(id => id === 'multi-tool').length;
      expect(multiToolCount).toBe(1);
    });
  });

  describe('query() - not mode', () => {
    beforeEach(() => {
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(multiTool);
    });

    it('should exclude extensions with specified capabilities', () => {
      const result = index.query({
        all: ['format:markdown'],
        not: ['lint:markdown'],
      });

      expect(result).toContain('markdown-formatter');
      expect(result).not.toContain('multi-tool');
    });

    it('should handle not array without all/any', () => {
      index.index(agentExtension);

      const result = index.query({
        not: ['lint:markdown'],
      });

      expect(result).toContain('markdown-formatter');
      expect(result).toContain('test-agent');
      expect(result).not.toContain('markdown-linter');
      expect(result).not.toContain('multi-tool');
    });

    it('should handle multiple exclusions', () => {
      const result = index.query({
        not: ['lint:markdown', 'validate:markdown'],
      });

      expect(result).toContain('markdown-formatter');
      expect(result).not.toContain('markdown-linter');
      expect(result).not.toContain('multi-tool');
    });
  });

  describe('query() - type filtering', () => {
    beforeEach(() => {
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(agentExtension);
    });

    it('should filter by extension type and combine with capability filters', () => {
      // Test basic type filtering
      const tools = index.query({ type: 'tool' });
      expect(tools).toContain('markdown-formatter');
      expect(tools).toContain('markdown-linter');
      expect(tools).not.toContain('test-agent');

      // Test combining type with capability filter
      const filtered = index.query({
        any: ['format:markdown', 'test:unit'],
        type: 'tool',
      });
      expect(filtered).toContain('markdown-formatter');
      expect(filtered).not.toContain('test-agent');

      // Test non-existent type
      const nonExistent = index.query({ type: 'nonexistent' });
      expect(nonExistent).toHaveLength(0);
    });
  });

  describe('query() - complex combinations', () => {
    beforeEach(() => {
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(multiTool);
      index.index(agentExtension);
    });

    it('should handle all + any + not + type', () => {
      // Not a realistic query but tests all filters work together
      const result = index.query({
        any: ['format:markdown', 'lint:markdown'],
        not: ['validate:markdown'],
        type: 'tool',
      });

      expect(result).toContain('markdown-formatter');
      expect(result).not.toContain('markdown-linter'); // has validate
      expect(result).not.toContain('multi-tool'); // has validate
      expect(result).not.toContain('test-agent'); // wrong type
    });

    it('should handle empty query (all extensions)', () => {
      const result = index.query({});

      expect(result).toContain('markdown-formatter');
      expect(result).toContain('markdown-linter');
      expect(result).toContain('multi-tool');
      expect(result).toContain('test-agent');
      expect(result).toHaveLength(4);
    });
  });

  describe('getAllCapabilities()', () => {
    it('should handle empty index, return unique sorted capabilities, and deduplicate', () => {
      // Test empty index
      expect(index.getAllCapabilities()).toHaveLength(0);

      // Index some extensions
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(multiTool);

      // Test all unique capabilities
      const capabilities = index.getAllCapabilities();
      expect(capabilities).toContain('format:markdown');
      expect(capabilities).toContain('format:commonmark');
      expect(capabilities).toContain('lint:markdown');
      expect(capabilities).toContain('validate:markdown');
      expect(capabilities).toHaveLength(4);

      // Test sorted
      expect(capabilities).toEqual([...capabilities].sort());

      // Test deduplication - format:markdown appears in multiple extensions but only once in result
      const formatMarkdownCount = capabilities.filter(c => c === 'format:markdown').length;
      expect(formatMarkdownCount).toBe(1);
    });
  });

  describe('getByCapability()', () => {
    beforeEach(() => {
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(multiTool);
    });

    it('should return extensions with specified capability, handle non-existent, and sort', () => {
      // Test basic lookup
      const formatters = index.getByCapability('format:markdown');
      expect(formatters).toContain('markdown-formatter');
      expect(formatters).toContain('multi-tool');
      expect(formatters).toHaveLength(2);

      // Test non-existent capability
      const nonExistent = index.getByCapability('nonexistent:capability');
      expect(nonExistent).toHaveLength(0);

      // Test sorted results
      expect(formatters).toEqual([...formatters].sort());
    });
  });

  describe('hasCapability()', () => {
    it('should correctly report capability existence across various states', () => {
      const scenarios = [
        {
          setup: () => {},
          capability: 'format:markdown',
          expected: false,
          description: 'non-existent capability',
        },
        {
          setup: (idx: CapabilityIndex) => idx.index(markdownFormatter),
          capability: 'format:markdown',
          expected: true,
          description: 'existing capability',
        },
        {
          setup: (idx: CapabilityIndex) => {
            idx.index(markdownFormatter);
            idx.remove('markdown-formatter');
          },
          capability: 'format:commonmark',
          expected: false,
          description: 'capability after all extensions removed',
        },
      ];

      for (const scenario of scenarios) {
        const testIndex = new CapabilityIndex();
        scenario.setup(testIndex);
        expect(testIndex.hasCapability(scenario.capability)).toBe(scenario.expected);
      }
    });
  });

  describe('capabilityCount', () => {
    it('should correctly count unique capabilities and reflect changes', () => {
      // Test empty index
      expect(index.capabilityCount).toBe(0);

      // Test counting unique capabilities
      index.index(markdownFormatter);
      expect(index.capabilityCount).toBe(2); // format:markdown, format:commonmark

      index.index(multiTool);
      // multiTool adds: format:markdown (duplicate), lint:markdown (new), validate:markdown (new)
      // Total unique: format:markdown, format:commonmark, lint:markdown, validate:markdown
      expect(index.capabilityCount).toBe(4);

      // Test decrease on removal
      index.index(markdownLinter);
      const before = index.capabilityCount;
      index.remove('markdown-formatter');
      expect(index.capabilityCount).toBeLessThan(before);
    });
  });

  describe('clear()', () => {
    beforeEach(() => {
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(multiTool);
    });

    it('should clear all indexed data and allow re-indexing', () => {
      // Test clear
      index.clear();
      expect(index.capabilityCount).toBe(0);
      expect(index.getAllCapabilities()).toHaveLength(0);
      expect(index.query({})).toHaveLength(0);

      // Test re-indexing after clear
      index.index(markdownFormatter);
      expect(index.hasCapability('format:markdown')).toBe(true);
      expect(index.getByCapability('format:markdown')).toContain('markdown-formatter');
    });
  });

  describe('edge cases', () => {
    it('should handle various edge cases including special characters, empty arrays, and duplicates', () => {
      const testCases = [
        {
          extension: {
            id: 'special',
            type: 'tool' as const,
            version: '1.0.0',
            capabilities: ['format:markdown-gfm', 'lint:js/ts'],
          },
          verifications: [
            { type: 'hasCapability', capability: 'format:markdown-gfm', expected: true },
            { type: 'hasCapability', capability: 'lint:js/ts', expected: true },
          ],
        },
        {
          extension: noCapabilities,
          verifications: [
            { type: 'queryContains', extensionId: 'simple-extension' },
            { type: 'capabilityCount', expectedCount: 0 },
          ],
        },
        {
          extension: {
            id: 'no-caps',
            type: 'tool' as const,
            version: '1.0.0',
          },
          verifications: [
            { type: 'capabilityCount', expectedCount: 0 },
          ],
        },
        {
          extension: {
            id: 'duplicate',
            type: 'tool' as const,
            version: '1.0.0',
            capabilities: ['format:markdown', 'format:markdown'],
          },
          verifications: [
            { type: 'getByCapability', capability: 'format:markdown', extensionId: 'duplicate', expectedCount: 1 },
          ],
        },
      ];

      for (const testCase of testCases) {
        const testIndex = new CapabilityIndex();
        testIndex.index(testCase.extension);

        for (const verification of testCase.verifications) {
          if (verification.type === 'hasCapability') {
            expect(testIndex.hasCapability(verification.capability)).toBe(verification.expected);
          } else if (verification.type === 'queryContains') {
            expect(testIndex.query({})).toContain(verification.extensionId);
          } else if (verification.type === 'capabilityCount') {
            expect(testIndex.capabilityCount).toBe(verification.expectedCount);
          } else if (verification.type === 'getByCapability') {
            const result = testIndex.getByCapability(verification.capability);
            const count = result.filter(id => id === verification.extensionId).length;
            expect(count).toBe(verification.expectedCount);
          }
        }
      }
    });
  });

  describe('performance considerations', () => {
    it('should handle large number of extensions efficiently', () => {
      // Index 1000 extensions
      for (let i = 0; i < 1000; i++) {
        const ext: Extension = {
          id: `ext-${i}`,
          type: 'tool',
          version: '1.0.0',
          capabilities: [`capability-${i % 10}`],
        };
        index.index(ext);
      }

      expect(index.capabilityCount).toBe(10); // 0-9
      expect(index.query({})).toHaveLength(1000);

      // Query should still be fast
      const start = Date.now();
      const result = index.query({ all: ['capability-0'] });
      const elapsed = Date.now() - start;

      expect(result).toHaveLength(100); // Every 10th extension
      expect(elapsed).toBeLessThan(100); // Should be very fast
    });

    it('should handle large number of capabilities per extension', () => {
      const manyCapabilities: string[] = [];
      for (let i = 0; i < 100; i++) {
        manyCapabilities.push(`capability-${i}`);
      }

      const ext: Extension = {
        id: 'poly-tool',
        type: 'tool',
        version: '1.0.0',
        capabilities: manyCapabilities,
      };

      index.index(ext);

      expect(index.capabilityCount).toBe(100);
      expect(index.getByCapability('capability-50')).toContain('poly-tool');
    });
  });
});
