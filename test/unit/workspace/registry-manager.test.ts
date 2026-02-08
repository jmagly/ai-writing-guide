/**
 * Unit tests for PluginRegistry
 *
 * Tests CRUD operations, health monitoring, backup/restore, and error recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Dynamic import for ESM module
const importRegistry = async () => {
  const module = await import('../../../tools/workspace/registry-manager.mjs');
  return module;
};

describe('PluginRegistry', () => {
  let PluginRegistry: any;
  let PluginNotFoundError: any;
  let DuplicatePluginError: any;
  let InvalidSchemaError: any;
  let tempDir: string;
  let registryPath: string;
  let registry: any;

  beforeEach(async () => {
    // Import module
    const module = await importRegistry();
    PluginRegistry = module.PluginRegistry;
    PluginNotFoundError = module.PluginNotFoundError;
    DuplicatePluginError = module.DuplicatePluginError;
    InvalidSchemaError = module.InvalidSchemaError;

    // Create temp directory for each test
    tempDir = path.join(os.tmpdir(), `registry-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
    registryPath = path.join(tempDir, 'registry.json');
    registry = new PluginRegistry(registryPath);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ===========================
  // Initialization Tests
  // ===========================

  describe('Initialization', () => {
    it('should initialize empty registry', async () => {
      await registry.initialize();

      const content = await fs.readFile(registryPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.version).toBe('1.0');
      expect(data.plugins).toEqual([]);
    });

    it('should not overwrite existing registry', async () => {
      // Create initial registry
      await registry.initialize();
      await registry.addPlugin({
        id: 'test-plugin',
        type: 'framework',
        name: 'Test Plugin',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'test-plugin/'
      });

      // Re-initialize
      await registry.initialize();

      // Plugin should still exist
      const plugin = await registry.getPlugin('test-plugin');
      expect(plugin.id).toBe('test-plugin');
    });
  });

  // ===========================
  // CRUD Tests
  // ===========================

  describe('CRUD Operations', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should add plugin', async () => {
      await registry.addPlugin({
        id: 'sdlc-complete',
        type: 'framework',
        name: 'SDLC Complete Framework',
        version: '1.0.0',
        'install-date': '2025-12-02T12:00:00Z',
        'repo-path': 'sdlc-complete/'
      });

      const plugin = await registry.getPlugin('sdlc-complete');
      expect(plugin.id).toBe('sdlc-complete');
      expect(plugin.type).toBe('framework');
      expect(plugin.name).toBe('SDLC Complete Framework');
    });

    it('should reject duplicate plugin', async () => {
      await registry.addPlugin({
        id: 'test-plugin',
        type: 'framework',
        name: 'Test Plugin',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'test/'
      });

      await expect(
        registry.addPlugin({
          id: 'test-plugin',
          type: 'framework',
          name: 'Test Plugin 2',
          version: '2.0.0',
          'install-date': new Date().toISOString(),
          'repo-path': 'test2/'
        })
      ).rejects.toThrow(DuplicatePluginError);
    });

    it('should update plugin', async () => {
      await registry.addPlugin({
        id: 'test-plugin',
        type: 'framework',
        name: 'Test Plugin',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'test/'
      });

      await registry.updatePlugin('test-plugin', { version: '2.0.0' });

      const plugin = await registry.getPlugin('test-plugin');
      expect(plugin.version).toBe('2.0.0');
    });

    it('should throw when updating non-existent plugin', async () => {
      await expect(
        registry.updatePlugin('non-existent', { version: '1.0.0' })
      ).rejects.toThrow(PluginNotFoundError);
    });

    it('should remove plugin', async () => {
      await registry.addPlugin({
        id: 'test-plugin',
        type: 'framework',
        name: 'Test Plugin',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'test/'
      });

      await registry.removePlugin('test-plugin');

      const isInstalled = await registry.isInstalled('test-plugin');
      expect(isInstalled).toBe(false);
    });

    it('should list all plugins', async () => {
      await registry.addPlugin({
        id: 'plugin-1',
        type: 'framework',
        name: 'Plugin 1',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'plugin-1/'
      });

      await registry.addPlugin({
        id: 'plugin-2',
        type: 'add-on',
        name: 'Plugin 2',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'plugin-2/',
        'parent-framework': 'plugin-1'
      });

      const plugins = await registry.listPlugins();
      expect(plugins.length).toBe(2);
    });
  });

  // ===========================
  // Query Tests
  // ===========================

  describe('Query Operations', () => {
    beforeEach(async () => {
      await registry.initialize();

      // Add test plugins
      await registry.addPlugin({
        id: 'framework-1',
        type: 'framework',
        name: 'Framework 1',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'framework-1/',
        health: 'healthy'
      });

      await registry.addPlugin({
        id: 'addon-1',
        type: 'add-on',
        name: 'Add-on 1',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'addon-1/',
        'parent-framework': 'framework-1',
        health: 'warning'
      });

      await registry.addPlugin({
        id: 'extension-1',
        type: 'extension',
        name: 'Extension 1',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'extension-1/',
        extends: 'framework-1',
        health: 'error'
      });
    });

    it('should perform all query operations correctly', async () => {
      // Test installation checks
      const installChecks = [
        { id: 'framework-1', expected: true },
        { id: 'non-existent', expected: false }
      ];
      for (const check of installChecks) {
        expect(await registry.isInstalled(check.id)).toBe(check.expected);
      }

      // Test type queries
      const typeQueries = [
        { type: 'framework', expectedCount: 1, expectedId: 'framework-1' },
        { type: 'add-on', expectedCount: 1, expectedId: 'addon-1' }
      ];
      for (const query of typeQueries) {
        const results = await registry.getByType(query.type);
        expect(results.length).toBe(query.expectedCount);
        expect(results[0].id).toBe(query.expectedId);
      }

      // Test health queries
      const healthy = await registry.getHealthy();
      expect(healthy.length).toBe(1);
      expect(healthy[0].id).toBe('framework-1');

      const errors = await registry.getErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].id).toBe('extension-1');

      // Test relationship queries
      const addOns = await registry.getAddOnsFor('framework-1');
      expect(addOns.length).toBe(1);
      expect(addOns[0].id).toBe('addon-1');

      const extensions = await registry.getExtensionsFor('framework-1');
      expect(extensions.length).toBe(1);
      expect(extensions[0].id).toBe('extension-1');
    });
  });

  // ===========================
  // Project Management Tests
  // ===========================

  describe('Project Management', () => {
    beforeEach(async () => {
      await registry.initialize();
      await registry.addPlugin({
        id: 'sdlc-complete',
        type: 'framework',
        name: 'SDLC Complete',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'sdlc-complete/',
        projects: []
      });
    });

    it('should add project to framework', async () => {
      await registry.addProject('sdlc-complete', 'my-project');

      const projects = await registry.getProjects('sdlc-complete');
      expect(projects).toContain('my-project');
    });

    it('should not add duplicate project', async () => {
      await registry.addProject('sdlc-complete', 'my-project');
      await registry.addProject('sdlc-complete', 'my-project');

      const projects = await registry.getProjects('sdlc-complete');
      expect(projects.length).toBe(1);
    });

    it('should remove project from framework', async () => {
      await registry.addProject('sdlc-complete', 'my-project');
      await registry.removeProject('sdlc-complete', 'my-project');

      const projects = await registry.getProjects('sdlc-complete');
      expect(projects).not.toContain('my-project');
    });
  });

  // ===========================
  // Health Monitoring Tests
  // ===========================

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await registry.initialize();

      // Create plugin directory structure
      const pluginDir = path.join(tempDir, 'test-plugin');
      await fs.mkdir(pluginDir, { recursive: true });
      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify({ name: 'Test Plugin', version: '1.0.0' })
      );

      await registry.addPlugin({
        id: 'test-plugin',
        type: 'framework',
        name: 'Test Plugin',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'test-plugin/'
      });
    });

    it('should run health check on plugins', async () => {
      const health = await registry.healthCheck();

      expect(health.total).toBe(1);
      expect(typeof health.healthy).toBe('number');
      expect(typeof health.warning).toBe('number');
      expect(typeof health.error).toBe('number');
      expect(health.results.length).toBe(1);
    });

    it('should get plugins with issues', async () => {
      // Add plugin with no directory
      await registry.addPlugin({
        id: 'broken-plugin',
        type: 'framework',
        name: 'Broken Plugin',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'non-existent/',
        health: 'error'
      });

      const issues = await registry.getPluginsWithIssues();
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should set health status', async () => {
      await registry.setHealthStatus('test-plugin', 'warning', ['Test issue']);

      const plugin = await registry.getPlugin('test-plugin');
      expect(plugin.health).toBe('warning');
      expect(plugin['health-issues']).toContain('Test issue');
    });
  });

  // ===========================
  // Backup and Restore Tests
  // ===========================

  describe('Backup and Restore', () => {
    beforeEach(async () => {
      await registry.initialize();
      await registry.addPlugin({
        id: 'test-plugin',
        type: 'framework',
        name: 'Test Plugin',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'test/'
      });
    });

    it('should create and list backups', async () => {
      // Create first backup
      const backupPath1 = await registry.createBackup('backup 1');
      expect(backupPath1).toContain('registry-');
      expect(backupPath1).toContain('.json');

      const backupContent1 = await fs.readFile(backupPath1, 'utf-8');
      const backup1 = JSON.parse(backupContent1);
      expect(backup1.plugins.length).toBe(1);
      expect(backup1._backup.reason).toBe('backup 1');

      // Small delay to ensure unique timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Create second backup
      const backupPath2 = await registry.createBackup('backup 2');
      expect(backupPath2).toContain('registry-');

      // List backups
      const backups = await registry.listBackups();
      expect(backups.length).toBe(2);
      expect(backups[0].filename).toContain('registry-');
    });

    it('should restore from backup', async () => {
      // Create backup
      const backupPath = await registry.createBackup('pre-delete');

      // Delete plugin
      await registry.removePlugin('test-plugin');
      expect(await registry.isInstalled('test-plugin')).toBe(false);

      // Restore
      await registry.restoreFromBackup(backupPath);

      // Plugin should be back
      expect(await registry.isInstalled('test-plugin')).toBe(true);
    });

    it('should clean old backups', async () => {
      // Create multiple backups
      for (let i = 0; i < 7; i++) {
        await registry.createBackup(`backup ${i}`);
        // Small delay to ensure unique timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Clean keeping only 3
      const deleted = await registry.cleanBackups(3);

      expect(deleted).toBe(4);

      const remaining = await registry.listBackups();
      expect(remaining.length).toBe(3);
    });
  });

  // ===========================
  // Error Recovery Tests
  // ===========================

  describe('Error Recovery', () => {
    it('should recover from valid registry', async () => {
      await registry.initialize();

      const result = await registry.recover();

      expect(result.success).toBe(true);
      expect(result.method).toBe('validate');
    });

    it('should recover from backup when registry is corrupted', async () => {
      // Initialize and create backup
      await registry.initialize();
      await registry.addPlugin({
        id: 'test-plugin',
        type: 'framework',
        name: 'Test Plugin',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'test/'
      });
      await registry.createBackup('good state');

      // Corrupt registry
      await fs.writeFile(registryPath, 'invalid json {{{', 'utf-8');

      // Recover
      const result = await registry.recover();

      expect(result.success).toBe(true);
      expect(result.method).toBe('backup');
    });

    it('should check integrity and detect issues', async () => {
      await registry.initialize();

      // First check with valid plugin
      await registry.addPlugin({
        id: 'test-plugin',
        type: 'framework',
        name: 'Test Plugin',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'test/'
      });

      const validIntegrity = await registry.checkIntegrity();
      expect(validIntegrity.valid).toBe(true);
      expect(validIntegrity.errors.length).toBe(0);

      // Add orphan add-on (parent framework doesn't exist)
      await registry.addPlugin({
        id: 'orphan-addon',
        type: 'add-on',
        name: 'Orphan Add-on',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': 'orphan/',
        'parent-framework': 'non-existent-framework'
      });

      const invalidIntegrity = await registry.checkIntegrity();
      expect(invalidIntegrity.valid).toBe(false);
      expect(invalidIntegrity.errors.some(e => e.includes('non-existent parent framework'))).toBe(true);
    });
  });

  // ===========================
  // Validation Tests
  // ===========================

  describe('Validation', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should validate plugin schema requirements', async () => {
      const invalidPlugins = [
        {
          description: 'invalid ID format',
          plugin: {
            id: 'Invalid_Plugin_ID',
            type: 'framework',
            name: 'Test',
            version: '1.0.0',
            'install-date': new Date().toISOString(),
            'repo-path': 'test/'
          }
        },
        {
          description: 'invalid version format',
          plugin: {
            id: 'test-plugin',
            type: 'framework',
            name: 'Test',
            version: 'invalid-version',
            'install-date': new Date().toISOString(),
            'repo-path': 'test/'
          }
        },
        {
          description: 'missing parent-framework for add-on',
          plugin: {
            id: 'test-addon',
            type: 'add-on',
            name: 'Test Add-on',
            version: '1.0.0',
            'install-date': new Date().toISOString(),
            'repo-path': 'test/'
          }
        },
        {
          description: 'missing extends for extension',
          plugin: {
            id: 'test-extension',
            type: 'extension',
            name: 'Test Extension',
            version: '1.0.0',
            'install-date': new Date().toISOString(),
            'repo-path': 'test/'
          }
        }
      ];

      for (const testCase of invalidPlugins) {
        await expect(
          registry.addPlugin(testCase.plugin)
        ).rejects.toThrow();
      }
    });
  });
});
