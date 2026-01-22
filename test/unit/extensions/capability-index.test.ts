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

    it('should handle removing non-existent extension', () => {
      expect(() => index.remove('non-existent')).not.toThrow();
      expect(index.capabilityCount).toBeGreaterThan(0);
    });

    it('should handle removing same extension twice', () => {
      index.remove('markdown-formatter');
      expect(() => index.remove('markdown-formatter')).not.toThrow();
    });
  });

  describe('query() - all mode', () => {
    beforeEach(() => {
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(multiTool);
    });

    it('should find extensions with ALL specified capabilities', () => {
      const result = index.query({
        all: ['format:markdown', 'lint:markdown'],
      });

      expect(result).toContain('multi-tool');
      expect(result).not.toContain('markdown-formatter');
      expect(result).not.toContain('markdown-linter');
    });

    it('should return empty array if no extension has all capabilities', () => {
      const result = index.query({
        all: ['format:markdown', 'test:unit'],
      });

      expect(result).toHaveLength(0);
    });

    it('should handle single capability in all array', () => {
      const result = index.query({
        all: ['format:markdown'],
      });

      expect(result).toContain('markdown-formatter');
      expect(result).toContain('multi-tool');
      expect(result).toHaveLength(2);
    });

    it('should return sorted results', () => {
      const result = index.query({
        all: ['format:markdown'],
      });

      expect(result).toEqual([...result].sort());
    });
  });

  describe('query() - any mode', () => {
    beforeEach(() => {
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(multiTool);
      index.index(agentExtension);
    });

    it('should find extensions with ANY specified capability', () => {
      const result = index.query({
        any: ['format:markdown', 'test:unit'],
      });

      expect(result).toContain('markdown-formatter');
      expect(result).toContain('multi-tool');
      expect(result).toContain('test-agent');
      expect(result).not.toContain('markdown-linter');
    });

    it('should return empty array if no capability matches', () => {
      const result = index.query({
        any: ['nonexistent:capability'],
      });

      expect(result).toHaveLength(0);
    });

    it('should handle single capability in any array', () => {
      const result = index.query({
        any: ['lint:markdown'],
      });

      expect(result).toContain('markdown-linter');
      expect(result).toContain('multi-tool');
      expect(result).toHaveLength(2);
    });

    it('should deduplicate results when extension matches multiple capabilities', () => {
      const result = index.query({
        any: ['format:markdown', 'lint:markdown'],
      });

      // multi-tool has both capabilities but should appear once
      const multiToolCount = result.filter(id => id === 'multi-tool').length;
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

    it('should filter by extension type', () => {
      const tools = index.query({ type: 'tool' });

      expect(tools).toContain('markdown-formatter');
      expect(tools).toContain('markdown-linter');
      expect(tools).not.toContain('test-agent');
    });

    it('should combine type filter with capability filters', () => {
      const result = index.query({
        any: ['format:markdown', 'test:unit'],
        type: 'tool',
      });

      expect(result).toContain('markdown-formatter');
      expect(result).not.toContain('test-agent');
    });

    it('should return empty array for non-existent type', () => {
      const result = index.query({ type: 'nonexistent' });
      expect(result).toHaveLength(0);
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
    it('should return empty array for empty index', () => {
      expect(index.getAllCapabilities()).toHaveLength(0);
    });

    it('should return all unique capabilities', () => {
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(multiTool);

      const capabilities = index.getAllCapabilities();

      expect(capabilities).toContain('format:markdown');
      expect(capabilities).toContain('format:commonmark');
      expect(capabilities).toContain('lint:markdown');
      expect(capabilities).toContain('validate:markdown');
      expect(capabilities).toHaveLength(4);
    });

    it('should return sorted capabilities', () => {
      index.index(markdownFormatter);
      index.index(markdownLinter);

      const capabilities = index.getAllCapabilities();
      expect(capabilities).toEqual([...capabilities].sort());
    });

    it('should deduplicate capabilities across extensions', () => {
      index.index(markdownFormatter);
      index.index(multiTool);

      const capabilities = index.getAllCapabilities();
      const formatMarkdownCount = capabilities.filter(
        c => c === 'format:markdown'
      ).length;

      expect(formatMarkdownCount).toBe(1);
    });
  });

  describe('getByCapability()', () => {
    beforeEach(() => {
      index.index(markdownFormatter);
      index.index(markdownLinter);
      index.index(multiTool);
    });

    it('should return extensions with specified capability', () => {
      const formatters = index.getByCapability('format:markdown');

      expect(formatters).toContain('markdown-formatter');
      expect(formatters).toContain('multi-tool');
      expect(formatters).toHaveLength(2);
    });

    it('should return empty array for non-existent capability', () => {
      const result = index.getByCapability('nonexistent:capability');
      expect(result).toHaveLength(0);
    });

    it('should return sorted results', () => {
      const formatters = index.getByCapability('format:markdown');
      expect(formatters).toEqual([...formatters].sort());
    });
  });

  describe('hasCapability()', () => {
    beforeEach(() => {
      index.index(markdownFormatter);
    });

    it('should return true for existing capability', () => {
      expect(index.hasCapability('format:markdown')).toBe(true);
    });

    it('should return false for non-existent capability', () => {
      expect(index.hasCapability('nonexistent:capability')).toBe(false);
    });

    it('should return false after all extensions with capability are removed', () => {
      index.remove('markdown-formatter');
      expect(index.hasCapability('format:commonmark')).toBe(false);
    });
  });

  describe('capabilityCount', () => {
    it('should return 0 for empty index', () => {
      expect(index.capabilityCount).toBe(0);
    });

    it('should count unique capabilities', () => {
      index.index(markdownFormatter);
      expect(index.capabilityCount).toBe(2); // format:markdown, format:commonmark

      index.index(multiTool);
      // multiTool adds: format:markdown (duplicate), lint:markdown (new), validate:markdown (new)
      // Total unique: format:markdown, format:commonmark, lint:markdown, validate:markdown
      expect(index.capabilityCount).toBe(4);
    });

    it('should decrease when capabilities are removed', () => {
      index.index(markdownFormatter);
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

    it('should clear all indexed data', () => {
      index.clear();

      expect(index.capabilityCount).toBe(0);
      expect(index.getAllCapabilities()).toHaveLength(0);
      expect(index.query({})).toHaveLength(0);
    });

    it('should allow re-indexing after clear', () => {
      index.clear();
      index.index(markdownFormatter);

      expect(index.hasCapability('format:markdown')).toBe(true);
      expect(index.getByCapability('format:markdown')).toContain('markdown-formatter');
    });
  });

  describe('edge cases', () => {
    it('should handle capability names with special characters', () => {
      const specialExt: Extension = {
        id: 'special',
        type: 'tool',
        version: '1.0.0',
        capabilities: ['format:markdown-gfm', 'lint:js/ts'],
      };

      index.index(specialExt);

      expect(index.hasCapability('format:markdown-gfm')).toBe(true);
      expect(index.hasCapability('lint:js/ts')).toBe(true);
    });

    it('should handle empty capability arrays', () => {
      index.index(noCapabilities);

      expect(index.query({})).toContain('simple-extension');
      expect(index.capabilityCount).toBe(0);
    });

    it('should handle undefined capabilities field', () => {
      const ext: Extension = {
        id: 'no-caps',
        type: 'tool',
        version: '1.0.0',
      };

      expect(() => index.index(ext)).not.toThrow();
      expect(index.capabilityCount).toBe(0);
    });

    it('should handle duplicate capabilities in same extension', () => {
      const duplicateExt: Extension = {
        id: 'duplicate',
        type: 'tool',
        version: '1.0.0',
        capabilities: ['format:markdown', 'format:markdown'],
      };

      index.index(duplicateExt);

      const formatters = index.getByCapability('format:markdown');
      const duplicateCount = formatters.filter(id => id === 'duplicate').length;
      expect(duplicateCount).toBe(1);
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
