/**
 * Tests for Runtime Discovery Module
 *
 * Tests tool discovery, version detection, environment detection, and catalog generation.
 *
 * @tests @src/smiths/toolsmith/runtime-discovery.mjs
 * @architecture @.aiwg/architecture/decisions/ADR-014-toolsmith-feature-architecture.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir, platform } from 'os';

// We'll import the actual module for integration tests
// For unit tests, we'll mock child_process

describe('RuntimeDiscovery', () => {
  let testDir: string;
  let RuntimeDiscovery: any;

  beforeEach(async () => {
    testDir = resolve(tmpdir(), `runtime-discovery-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Dynamic import to avoid caching issues
    const module = await import('../../../../src/smiths/toolsmith/runtime-discovery.mjs');
    RuntimeDiscovery = module.RuntimeDiscovery;
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should create RuntimeDiscovery instance with default path', () => {
      const discovery = new RuntimeDiscovery();

      expect(discovery).toBeDefined();
      expect(discovery.basePath).toContain('.aiwg/smiths/toolsmith');
    });

    it('should create RuntimeDiscovery instance with custom path', () => {
      const customPath = join(testDir, 'custom');
      const discovery = new RuntimeDiscovery(customPath);

      expect(discovery.basePath).toBe(customPath);
    });
  });

  describe('getEnvironment', () => {
    it('should detect OS information', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      const env = await discovery.getEnvironment();

      expect(env.os).toBeDefined();
      expect(env.os).toMatch(/linux|darwin|win32/);
      expect(env.osVersion).toBeDefined();
      expect(env.arch).toBeDefined();
      expect(env.arch).toMatch(/x64|arm64|x86/);
      expect(env.shell).toBeDefined();
      expect(env.homeDir).toBeDefined();
      expect(env.workingDir).toBeDefined();
    });

    it('should include shell information', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      const env = await discovery.getEnvironment();

      expect(env.shell).toBeTruthy();
      // Should be a path or command
      expect(env.shell.length).toBeGreaterThan(0);
    });
  });

  describe('getResources', () => {
    it('should detect system resources', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      const resources = await discovery.getResources();

      expect(resources.diskFreeGb).toBeGreaterThan(0);
      expect(resources.memoryTotalGb).toBeGreaterThan(0);
      expect(resources.memoryAvailableGb).toBeGreaterThan(0);
      expect(resources.cpuCores).toBeGreaterThan(0);
    });

    it('should have logical memory values', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      const resources = await discovery.getResources();

      // Available memory should be <= total memory
      expect(resources.memoryAvailableGb).toBeLessThanOrEqual(resources.memoryTotalGb);
    });
  });

  describe('checkTool', () => {
    it('should detect git if installed', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      const result = await discovery.checkTool('git');

      // Git is almost certainly installed in test environment
      if (result.available) {
        expect(result.version).toBeDefined();
        expect(result.path).toBeDefined();
        expect(result.status).toBe('verified');
        expect(result.lastVerified).toBeDefined();
      } else {
        // If not available, should have install hint
        expect(result.installHint).toBeDefined();
      }
    });

    it('should detect node if installed', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      const result = await discovery.checkTool('node');

      // Node is required to run tests, so should be available
      expect(result.available).toBe(true);
      expect(result.version).toBeDefined();
      expect(result.path).toBeDefined();
    });

    it('should return unavailable for non-existent tool', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      const result = await discovery.checkTool('nonexistent-tool-xyz-abc-123');

      expect(result.available).toBe(false);
      expect(result.installHint).toBeDefined();
    });

    it('should provide platform-specific install hints', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      const result = await discovery.checkTool('jq');

      if (!result.available) {
        expect(result.installHint).toBeDefined();

        // Should mention package manager based on platform
        if (platform() === 'darwin') {
          expect(result.installHint).toContain('brew');
        } else if (platform() === 'linux') {
          expect(result.installHint).toMatch(/apt|dnf/);
        } else if (platform() === 'win32') {
          expect(result.installHint).toMatch(/choco|scoop/);
        }
      }
    });
  });

  describe('discover', () => {
    it('should discover common tools', async () => {
      const discovery = new RuntimeDiscovery(testDir);

      // This is a slow operation, so increase timeout if needed
      const catalog = await discovery.discover();

      expect(catalog).toBeDefined();
      expect(catalog.version).toBe('1.0');
      expect(catalog.generated).toBeDefined();
      expect(catalog.environment).toBeDefined();
      expect(catalog.resources).toBeDefined();
      expect(catalog.tools).toBeDefined();
      expect(Array.isArray(catalog.tools)).toBe(true);

      // Should find at least some tools
      expect(catalog.tools.length).toBeGreaterThan(0);

      // Should find node (required for tests)
      const nodeTool = catalog.tools.find(t => t.id === 'node' || t.id === 'nodejs');
      expect(nodeTool).toBeDefined();
    }, 60000); // 60 second timeout for discovery

    it('should categorize tools correctly', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      const catalog = await discovery.discover();

      const categories = new Set(catalog.tools.map(t => t.category));

      // Should use only valid categories
      for (const category of categories) {
        expect(['core', 'languages', 'utilities', 'custom']).toContain(category);
      }
    }, 60000);

    it('should create catalog files', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      await discovery.discover();

      const catalogPath = join(testDir, 'runtime.json');
      const infoPath = join(testDir, 'runtime-info.md');

      expect(existsSync(catalogPath)).toBe(true);
      expect(existsSync(infoPath)).toBe(true);
    }, 60000);
  });

  describe('verify', () => {
    it('should verify existing catalog', async () => {
      const discovery = new RuntimeDiscovery(testDir);

      // First create a catalog
      await discovery.discover();

      // Then verify it
      const result = await discovery.verify();

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.failed).toBeDefined();
      expect(Array.isArray(result.failed)).toBe(true);

      // Most tools should still be valid
      expect(result.valid).toBeGreaterThan(0);
    }, 60000);

    it('should throw error if no catalog exists', async () => {
      const discovery = new RuntimeDiscovery(testDir);

      await expect(discovery.verify()).rejects.toThrow('No catalog found');
    });
  });

  describe('getSummary', () => {
    it('should return runtime summary', async () => {
      const discovery = new RuntimeDiscovery(testDir);

      // Create catalog first
      await discovery.discover();

      const summary = await discovery.getSummary();

      expect(summary.environment).toBeDefined();
      expect(summary.resources).toBeDefined();
      expect(summary.toolCounts).toBeDefined();
      expect(summary.totalTools).toBeGreaterThan(0);
      expect(summary.lastDiscovery).toBeDefined();
      expect(summary.catalogPath).toBeDefined();

      // Tool counts should add up
      const sumCounts =
        summary.toolCounts.core +
        summary.toolCounts.languages +
        summary.toolCounts.utilities +
        summary.toolCounts.custom;

      expect(sumCounts).toBe(summary.totalTools);
    }, 60000);

    it('should throw error if no catalog exists', async () => {
      const discovery = new RuntimeDiscovery(testDir);

      await expect(discovery.getSummary()).rejects.toThrow('No catalog found');
    });
  });

  describe('addCustomTool', () => {
    it('should add custom tool to catalog', async () => {
      const discovery = new RuntimeDiscovery(testDir);

      // Create initial catalog
      await discovery.discover();

      // Add node as a custom tool (we know it exists)
      const nodePath = await discovery.checkTool('node');

      if (nodePath.available) {
        await discovery.addCustomTool({
          id: 'my-node',
          name: 'My Custom Node',
          path: nodePath.path,
          category: 'custom',
          capabilities: ['javascript', 'runtime'],
          documentation: 'https://example.com',
          aliases: ['mynode']
        });

        // Verify it was added
        const summary = await discovery.getSummary();
        expect(summary.toolCounts.custom).toBeGreaterThan(0);

        // Check the catalog
        const catalogPath = join(testDir, 'runtime.json');
        const catalogContent = await readFile(catalogPath, 'utf-8');
        const catalog = JSON.parse(catalogContent);

        const customTool = catalog.tools.find((t: any) => t.id === 'my-node');
        expect(customTool).toBeDefined();
        expect(customTool.name).toBe('My Custom Node');
        expect(customTool.category).toBe('custom');
      }
    }, 60000);

    it('should throw error for non-existent tool', async () => {
      const discovery = new RuntimeDiscovery(testDir);

      await discovery.discover();

      await expect(
        discovery.addCustomTool({
          id: 'fake-tool',
          name: 'Fake Tool',
          path: '/nonexistent/path/fake',
          category: 'custom',
          capabilities: ['testing']
        })
      ).rejects.toThrow();
    }, 60000);
  });

  describe('catalog format', () => {
    it('should generate valid JSON catalog', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      const catalog = await discovery.discover();

      // Should be valid JSON (no circular refs)
      const jsonString = JSON.stringify(catalog);
      const parsed = JSON.parse(jsonString);

      expect(parsed.version).toBe('1.0');
      expect(parsed.$schema).toContain('runtime-catalog');
    }, 60000);

    it('should include ISO 8601 timestamps', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      const catalog = await discovery.discover();

      // Validate ISO 8601 format
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(catalog.generated).toMatch(dateRegex);

      for (const tool of catalog.tools) {
        expect(tool.lastVerified).toMatch(dateRegex);
      }
    }, 60000);

    it('should generate human-readable markdown', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      await discovery.discover();

      const infoPath = join(testDir, 'runtime-info.md');
      const content = await readFile(infoPath, 'utf-8');

      expect(content).toContain('# Runtime Environment Summary');
      expect(content).toContain('## Environment');
      expect(content).toContain('## Resources');
      expect(content).toContain('## Installed Tools');
      expect(content).toContain('## Summary');
    }, 60000);
  });

  describe('version extraction', () => {
    it('should extract node version', async () => {
      const discovery = new RuntimeDiscovery(testDir);
      const result = await discovery.checkTool('node');

      if (result.available) {
        // Version should be semver-like
        expect(result.version).toMatch(/\d+\.\d+/);
      }
    });

    it('should handle tools with unknown versions gracefully', async () => {
      const discovery = new RuntimeDiscovery(testDir);

      // Some tools might not have --version
      const catalog = await discovery.discover();

      for (const tool of catalog.tools) {
        // Version should be defined (even if "unknown")
        expect(tool.version).toBeDefined();
        expect(typeof tool.version).toBe('string');
      }
    }, 60000);
  });
});
