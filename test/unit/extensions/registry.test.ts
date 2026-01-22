/**
 * Unit tests for ExtensionRegistry
 *
 * Tests the extension registry for storing, indexing, and querying extensions.
 *
 * @source @src/extensions/registry.ts
 * @architecture @.aiwg/architecture/unified-extension-schema.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionRegistry, createRegistry, getRegistry } from '../../../src/extensions/registry.js';
import type { Extension, ExtensionType } from '../../../src/extensions/types.js';

describe('ExtensionRegistry', () => {
  let registry: ExtensionRegistry;

  // Test fixture: minimal valid extension
  const createTestExtension = (id: string, type: ExtensionType = 'command'): Extension => ({
    id,
    type,
    name: `Test ${id}`,
    description: `Test extension ${id}`,
    version: '1.0.0',
    capabilities: ['test-capability'],
    keywords: ['test', 'keyword'],
    platforms: {
      claude: 'full',
    },
    deployment: {
      pathTemplate: '.claude/commands/{id}.md',
    },
    metadata: {
      type: 'command',
      template: 'utility',
    },
  });

  beforeEach(() => {
    registry = createRegistry();
  });

  describe('register()', () => {
    it('should register a new extension', () => {
      const ext = createTestExtension('test-cmd');
      registry.register(ext);

      expect(registry.has('test-cmd')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should store extension by ID', () => {
      const ext = createTestExtension('test-cmd');
      registry.register(ext);

      const retrieved = registry.get('test-cmd');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-cmd');
      expect(retrieved?.name).toBe('Test test-cmd');
    });

    it('should overwrite existing extension with same ID', () => {
      const ext1 = createTestExtension('test-cmd');
      const ext2 = { ...ext1, name: 'Updated Name' };

      registry.register(ext1);
      registry.register(ext2);

      expect(registry.size).toBe(1);
      expect(registry.get('test-cmd')?.name).toBe('Updated Name');
    });

    it('should index extension by type', () => {
      const cmd = createTestExtension('test-cmd', 'command');
      const agent = createTestExtension('test-agent', 'agent');

      registry.register(cmd);
      registry.register(agent);

      const commands = registry.getByType('command');
      expect(commands).toHaveLength(1);
      expect(commands[0].id).toBe('test-cmd');
    });

    it('should handle multiple extensions of same type', () => {
      const cmd1 = createTestExtension('cmd-1', 'command');
      const cmd2 = createTestExtension('cmd-2', 'command');
      const cmd3 = createTestExtension('cmd-3', 'command');

      registry.register(cmd1);
      registry.register(cmd2);
      registry.register(cmd3);

      const commands = registry.getByType('command');
      expect(commands).toHaveLength(3);
      expect(commands.map((c) => c.id).sort()).toEqual(['cmd-1', 'cmd-2', 'cmd-3']);
    });

    it('should register command aliases if metadata includes them', () => {
      const ext = createTestExtension('mention-wire', 'command');
      // Add alias metadata
      (ext.metadata as any).aliases = ['wire', 'link'];

      registry.register(ext);

      // Aliases should be registered
      expect(registry.resolveCommand('wire')).toBe('mention-wire');
      expect(registry.resolveCommand('link')).toBe('mention-wire');
      expect(registry.resolveCommand('mention-wire')).toBe('mention-wire');
    });
  });

  describe('get()', () => {
    it('should return extension by ID', () => {
      const ext = createTestExtension('test-cmd');
      registry.register(ext);

      const retrieved = registry.get('test-cmd');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-cmd');
    });

    it('should return undefined for non-existent ID', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('getByType()', () => {
    it('should return empty array for type with no extensions', () => {
      const result = registry.getByType('agent');
      expect(result).toEqual([]);
    });

    it('should return all extensions of specified type', () => {
      registry.register(createTestExtension('cmd-1', 'command'));
      registry.register(createTestExtension('agent-1', 'agent'));
      registry.register(createTestExtension('cmd-2', 'command'));
      registry.register(createTestExtension('skill-1', 'skill'));

      const commands = registry.getByType('command');
      expect(commands).toHaveLength(2);
      expect(commands.every((e) => e.type === 'command')).toBe(true);
    });

    it('should support all extension types', () => {
      const types: ExtensionType[] = [
        'agent',
        'command',
        'skill',
        'hook',
        'tool',
        'mcp-server',
        'framework',
        'addon',
        'template',
        'prompt',
      ];

      types.forEach((type) => {
        registry.register(createTestExtension(`test-${type}`, type));
      });

      types.forEach((type) => {
        const results = registry.getByType(type);
        expect(results).toHaveLength(1);
        expect(results[0].type).toBe(type);
      });
    });
  });

  describe('resolveCommand()', () => {
    it('should resolve command by primary ID', () => {
      const ext = createTestExtension('mention-wire', 'command');
      registry.register(ext);

      expect(registry.resolveCommand('mention-wire')).toBe('mention-wire');
    });

    it('should resolve command by alias', () => {
      const ext = createTestExtension('mention-wire', 'command');
      registry.registerAlias('wire', 'mention-wire');

      expect(registry.resolveCommand('wire')).toBe('mention-wire');
    });

    it('should return undefined for unknown command', () => {
      expect(registry.resolveCommand('unknown-cmd')).toBeUndefined();
    });

    it('should handle multiple aliases for same command', () => {
      registry.registerAlias('w', 'mention-wire');
      registry.registerAlias('wire', 'mention-wire');
      registry.registerAlias('link', 'mention-wire');

      expect(registry.resolveCommand('w')).toBe('mention-wire');
      expect(registry.resolveCommand('wire')).toBe('mention-wire');
      expect(registry.resolveCommand('link')).toBe('mention-wire');
    });
  });

  describe('registerAlias()', () => {
    it('should register a command alias', () => {
      registry.registerAlias('wire', 'mention-wire');

      expect(registry.resolveCommand('wire')).toBe('mention-wire');
    });

    it('should overwrite existing alias', () => {
      registry.registerAlias('wire', 'old-command');
      registry.registerAlias('wire', 'new-command');

      expect(registry.resolveCommand('wire')).toBe('new-command');
    });

    it('should allow multiple aliases to same extension', () => {
      registry.registerAlias('w', 'mention-wire');
      registry.registerAlias('wire', 'mention-wire');

      expect(registry.resolveCommand('w')).toBe('mention-wire');
      expect(registry.resolveCommand('wire')).toBe('mention-wire');
    });
  });

  describe('getAll()', () => {
    it('should return empty array when registry is empty', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered extensions', () => {
      registry.register(createTestExtension('ext-1', 'command'));
      registry.register(createTestExtension('ext-2', 'agent'));
      registry.register(createTestExtension('ext-3', 'skill'));

      const all = registry.getAll();
      expect(all).toHaveLength(3);
      expect(all.map((e) => e.id).sort()).toEqual(['ext-1', 'ext-2', 'ext-3']);
    });

    it('should return a new array (not internal state)', () => {
      registry.register(createTestExtension('ext-1'));

      const all1 = registry.getAll();
      const all2 = registry.getAll();

      expect(all1).not.toBe(all2); // Different array instances
      expect(all1).toEqual(all2); // Same content
    });
  });

  describe('size', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.size).toBe(0);
    });

    it('should return count of registered extensions', () => {
      expect(registry.size).toBe(0);

      registry.register(createTestExtension('ext-1'));
      expect(registry.size).toBe(1);

      registry.register(createTestExtension('ext-2'));
      expect(registry.size).toBe(2);

      registry.register(createTestExtension('ext-3'));
      expect(registry.size).toBe(3);
    });

    it('should not increase when overwriting existing extension', () => {
      registry.register(createTestExtension('ext-1'));
      expect(registry.size).toBe(1);

      registry.register(createTestExtension('ext-1')); // Overwrite
      expect(registry.size).toBe(1);
    });
  });

  describe('has()', () => {
    it('should return false for empty registry', () => {
      expect(registry.has('any-id')).toBe(false);
    });

    it('should return true for registered extension', () => {
      registry.register(createTestExtension('test-cmd'));

      expect(registry.has('test-cmd')).toBe(true);
    });

    it('should return false for non-existent extension', () => {
      registry.register(createTestExtension('test-cmd'));

      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should clear all extensions', () => {
      registry.register(createTestExtension('ext-1'));
      registry.register(createTestExtension('ext-2'));
      registry.register(createTestExtension('ext-3'));

      expect(registry.size).toBe(3);

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });

    it('should clear type index', () => {
      registry.register(createTestExtension('cmd-1', 'command'));
      registry.register(createTestExtension('agent-1', 'agent'));

      registry.clear();

      expect(registry.getByType('command')).toEqual([]);
      expect(registry.getByType('agent')).toEqual([]);
    });

    it('should clear alias map', () => {
      registry.registerAlias('wire', 'mention-wire');
      registry.registerAlias('link', 'mention-wire');

      registry.clear();

      expect(registry.resolveCommand('wire')).toBeUndefined();
      expect(registry.resolveCommand('link')).toBeUndefined();
    });
  });

  describe('type index integrity', () => {
    it('should maintain type index when registering multiple types', () => {
      registry.register(createTestExtension('cmd-1', 'command'));
      registry.register(createTestExtension('agent-1', 'agent'));
      registry.register(createTestExtension('skill-1', 'skill'));
      registry.register(createTestExtension('cmd-2', 'command'));

      expect(registry.getByType('command')).toHaveLength(2);
      expect(registry.getByType('agent')).toHaveLength(1);
      expect(registry.getByType('skill')).toHaveLength(1);
    });

    it('should update type index when overwriting extension', () => {
      registry.register(createTestExtension('test-ext', 'command'));
      expect(registry.getByType('command')).toHaveLength(1);

      const updated = createTestExtension('test-ext', 'agent');
      registry.register(updated);

      expect(registry.getByType('command')).toHaveLength(0);
      expect(registry.getByType('agent')).toHaveLength(1);
    });
  });

  describe('O(1) performance characteristics', () => {
    it('should provide O(1) lookup by ID', () => {
      // Register many extensions
      for (let i = 0; i < 1000; i++) {
        registry.register(createTestExtension(`ext-${i}`));
      }

      // Lookup should be fast (O(1) via Map)
      const start = performance.now();
      const result = registry.get('ext-500');
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1); // Should be nearly instant
    });

    it('should provide O(1) command resolution', () => {
      // Register many aliases
      for (let i = 0; i < 1000; i++) {
        registry.registerAlias(`alias-${i}`, `command-${i}`);
      }

      // Resolution should be fast (O(1) via Map)
      const start = performance.now();
      const result = registry.resolveCommand('alias-500');
      const duration = performance.now() - start;

      expect(result).toBe('command-500');
      expect(duration).toBeLessThan(1); // Should be nearly instant
    });
  });
});

describe('createRegistry()', () => {
  it('should create a new registry instance', () => {
    const reg1 = createRegistry();
    const reg2 = createRegistry();

    expect(reg1).not.toBe(reg2);
    expect(reg1).toBeInstanceOf(ExtensionRegistry);
    expect(reg2).toBeInstanceOf(ExtensionRegistry);
  });

  it('should create independent registries', () => {
    const reg1 = createRegistry();
    const reg2 = createRegistry();

    const ext = {
      id: 'test-cmd',
      type: 'command' as const,
      name: 'Test',
      description: 'Test',
      version: '1.0.0',
      capabilities: [],
      keywords: [],
      platforms: {},
      deployment: { pathTemplate: '' },
      metadata: { type: 'command' as const, template: 'utility' as const },
    };

    reg1.register(ext);

    expect(reg1.has('test-cmd')).toBe(true);
    expect(reg2.has('test-cmd')).toBe(false);
  });
});

describe('getRegistry()', () => {
  it('should return a singleton instance', () => {
    const reg1 = getRegistry();
    const reg2 = getRegistry();

    expect(reg1).toBe(reg2);
  });

  it('should return an ExtensionRegistry instance', () => {
    const reg = getRegistry();
    expect(reg).toBeInstanceOf(ExtensionRegistry);
  });

  it('should share state across calls', () => {
    const reg1 = getRegistry();
    const ext = {
      id: 'test-cmd',
      type: 'command' as const,
      name: 'Test',
      description: 'Test',
      version: '1.0.0',
      capabilities: [],
      keywords: [],
      platforms: {},
      deployment: { pathTemplate: '' },
      metadata: { type: 'command' as const, template: 'utility' as const },
    };

    reg1.register(ext);

    const reg2 = getRegistry();
    expect(reg2.has('test-cmd')).toBe(true);
  });
});
