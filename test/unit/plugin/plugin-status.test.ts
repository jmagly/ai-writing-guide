/**
 * Tests for PluginStatus
 *
 * @module test/unit/plugin/plugin-status.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  PluginStatus,
  PluginEntry,
  PluginStatusResult,
  StatusSummary,
  HealthStatus
} from '../../../src/plugin/plugin-status.js';

describe('PluginStatus', () => {
  let testDir: string;
  let pluginStatus: PluginStatus;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = path.join(os.tmpdir(), `plugin-status-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });

    pluginStatus = new PluginStatus(testDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a registry file
   */
  async function createRegistry(plugins: PluginEntry[] = []): Promise<void> {
    const registry = {
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      plugins
    };
    await fs.writeFile(
      path.join(testDir, 'registry.json'),
      JSON.stringify(registry, null, 2)
    );
  }

  /**
   * Helper to create a plugin directory
   */
  async function createPluginDir(pluginPath: string, options: { withManifest?: boolean; withProjects?: boolean } = {}): Promise<void> {
    const fullPath = path.join(testDir, pluginPath);
    await fs.mkdir(fullPath, { recursive: true });

    if (options.withManifest !== false) {
      await fs.writeFile(
        path.join(fullPath, 'manifest.json'),
        JSON.stringify({ name: path.basename(pluginPath), version: '1.0.0' })
      );
    }

    if (options.withProjects) {
      await fs.mkdir(path.join(fullPath, 'projects'), { recursive: true });
    }
  }

  describe('getStatus', () => {
    it('should return empty array when no registry exists', async () => {
      const result = await pluginStatus.getStatus();
      expect(result).toEqual([]);
    });

    it('should return empty array when registry has no plugins', async () => {
      await createRegistry([]);
      const result = await pluginStatus.getStatus();
      expect(result).toEqual([]);
    });

    it('should return status for all plugins', async () => {
      const plugin: PluginEntry = {
        id: 'test-framework',
        type: 'framework',
        name: 'Test Framework',
        version: '1.0.0',
        path: 'frameworks/test-framework',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/test-framework', { withManifest: true, withProjects: true });

      const result = await pluginStatus.getStatus();

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('test-framework');
      expect(result[0].type).toBe('framework');
    });

    it('should filter by type', async () => {
      const framework: PluginEntry = {
        id: 'test-framework',
        type: 'framework',
        name: 'Test Framework',
        version: '1.0.0',
        path: 'frameworks/test-framework',
        installedAt: new Date().toISOString()
      };

      const addon: PluginEntry = {
        id: 'test-addon',
        type: 'add-on',
        name: 'Test Add-on',
        version: '1.0.0',
        path: 'add-ons/test-addon',
        installedAt: new Date().toISOString(),
        parentFramework: 'test-framework'
      };

      await createRegistry([framework, addon]);
      await createPluginDir('frameworks/test-framework');
      await createPluginDir('add-ons/test-addon');

      const result = await pluginStatus.getStatus({ type: 'framework' });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('test-framework');
    });

    it('should filter by plugin ID', async () => {
      const plugin1: PluginEntry = {
        id: 'plugin-1',
        type: 'framework',
        name: 'Plugin 1',
        version: '1.0.0',
        path: 'frameworks/plugin-1',
        installedAt: new Date().toISOString()
      };

      const plugin2: PluginEntry = {
        id: 'plugin-2',
        type: 'framework',
        name: 'Plugin 2',
        version: '1.0.0',
        path: 'frameworks/plugin-2',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin1, plugin2]);
      await createPluginDir('frameworks/plugin-1');
      await createPluginDir('frameworks/plugin-2');

      const result = await pluginStatus.getStatus({ pluginId: 'plugin-1' });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('plugin-1');
    });
  });

  describe('Health Checks', () => {
    it('should report healthy for valid plugin', async () => {
      const plugin: PluginEntry = {
        id: 'healthy-plugin',
        type: 'framework',
        name: 'Healthy Plugin',
        version: '1.0.0',
        path: 'frameworks/healthy-plugin',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/healthy-plugin', { withManifest: true, withProjects: true });

      const result = await pluginStatus.getStatus();

      expect(result[0].health).toBe('healthy');
      expect(result[0].healthDetails.length).toBe(0);
    });

    it('should report error for missing directory', async () => {
      const plugin: PluginEntry = {
        id: 'missing-plugin',
        type: 'framework',
        name: 'Missing Plugin',
        version: '1.0.0',
        path: 'frameworks/missing-plugin',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      // Don't create the directory

      const result = await pluginStatus.getStatus();

      expect(result[0].health).toBe('error');
      expect(result[0].healthDetails).toContain('Plugin directory not found');
    });

    it('should report warning for missing manifest', async () => {
      const plugin: PluginEntry = {
        id: 'no-manifest',
        type: 'framework',
        name: 'No Manifest',
        version: '1.0.0',
        path: 'frameworks/no-manifest',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/no-manifest', { withManifest: false, withProjects: true });

      const result = await pluginStatus.getStatus();

      expect(result[0].health).toBe('warning');
      expect(result[0].healthDetails).toContain('Manifest file not found');
    });

    it('should report warning for framework without projects directory', async () => {
      const plugin: PluginEntry = {
        id: 'no-projects',
        type: 'framework',
        name: 'No Projects',
        version: '1.0.0',
        path: 'frameworks/no-projects',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/no-projects', { withManifest: true, withProjects: false });

      const result = await pluginStatus.getStatus();

      expect(result[0].health).toBe('warning');
      expect(result[0].healthDetails.some(d => d.includes('No projects directory'))).toBe(true);
    });

    it('should report error for add-on with missing parent framework', async () => {
      const addon: PluginEntry = {
        id: 'orphan-addon',
        type: 'add-on',
        name: 'Orphan Add-on',
        version: '1.0.0',
        path: 'add-ons/orphan-addon',
        installedAt: new Date().toISOString(),
        parentFramework: 'non-existent'
      };

      await createRegistry([addon]);
      await createPluginDir('add-ons/orphan-addon');

      const result = await pluginStatus.getStatus();

      expect(result[0].health).toBe('error');
      expect(result[0].healthDetails.some(d => d.includes('Parent framework not found'))).toBe(true);
    });

    it('should report warning for stale health check', async () => {
      const staleDate = new Date();
      staleDate.setHours(staleDate.getHours() - 48); // 48 hours ago

      const plugin: PluginEntry = {
        id: 'stale-plugin',
        type: 'framework',
        name: 'Stale Plugin',
        version: '1.0.0',
        path: 'frameworks/stale-plugin',
        installedAt: new Date().toISOString(),
        health: {
          status: 'healthy',
          lastCheck: staleDate.toISOString()
        }
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/stale-plugin', { withManifest: true, withProjects: true });

      const result = await pluginStatus.getStatus();

      expect(result[0].health).toBe('warning');
      expect(result[0].healthDetails.some(d => d.includes('stale'))).toBe(true);
    });
  });

  describe('getSummary', () => {
    it('should return summary with zero counts for empty registry', async () => {
      await createRegistry([]);

      const summary = await pluginStatus.getSummary();

      expect(summary.totalPlugins).toBe(0);
      expect(summary.healthyCount).toBe(0);
      expect(summary.warningCount).toBe(0);
      expect(summary.errorCount).toBe(0);
      expect(summary.frameworkCount).toBe(0);
      expect(summary.addOnCount).toBe(0);
      expect(summary.extensionCount).toBe(0);
    });

    it('should count plugins by type', async () => {
      const framework: PluginEntry = {
        id: 'fw-1',
        type: 'framework',
        name: 'Framework 1',
        version: '1.0.0',
        path: 'frameworks/fw-1',
        installedAt: new Date().toISOString()
      };

      const addon: PluginEntry = {
        id: 'addon-1',
        type: 'add-on',
        name: 'Add-on 1',
        version: '1.0.0',
        path: 'add-ons/addon-1',
        installedAt: new Date().toISOString(),
        parentFramework: 'fw-1'
      };

      const extension: PluginEntry = {
        id: 'ext-1',
        type: 'extension',
        name: 'Extension 1',
        version: '1.0.0',
        path: 'extensions/ext-1',
        installedAt: new Date().toISOString()
      };

      await createRegistry([framework, addon, extension]);
      await createPluginDir('frameworks/fw-1', { withManifest: true, withProjects: true });
      await createPluginDir('add-ons/addon-1');
      await createPluginDir('extensions/ext-1');

      const summary = await pluginStatus.getSummary();

      expect(summary.totalPlugins).toBe(3);
      expect(summary.frameworkCount).toBe(1);
      expect(summary.addOnCount).toBe(1);
      expect(summary.extensionCount).toBe(1);
    });

    it('should count health statuses', async () => {
      const healthy: PluginEntry = {
        id: 'healthy',
        type: 'framework',
        name: 'Healthy',
        version: '1.0.0',
        path: 'frameworks/healthy',
        installedAt: new Date().toISOString()
      };

      const warning: PluginEntry = {
        id: 'warning',
        type: 'framework',
        name: 'Warning',
        version: '1.0.0',
        path: 'frameworks/warning',
        installedAt: new Date().toISOString()
      };

      const error: PluginEntry = {
        id: 'error',
        type: 'framework',
        name: 'Error',
        version: '1.0.0',
        path: 'frameworks/error',
        installedAt: new Date().toISOString()
      };

      await createRegistry([healthy, warning, error]);
      await createPluginDir('frameworks/healthy', { withManifest: true, withProjects: true });
      await createPluginDir('frameworks/warning', { withManifest: false, withProjects: true }); // Missing manifest = warning
      // Don't create error directory = error

      const summary = await pluginStatus.getSummary();

      expect(summary.healthyCount).toBe(1);
      expect(summary.warningCount).toBe(1);
      expect(summary.errorCount).toBe(1);
    });

    it('should detect legacy mode', async () => {
      await createRegistry([]);
      // No frameworks directory

      const summary = await pluginStatus.getSummary();

      expect(summary.legacyMode).toBe(true);
    });

    it('should detect framework-scoped mode', async () => {
      await createRegistry([]);
      await fs.mkdir(path.join(testDir, 'frameworks'), { recursive: true });

      const summary = await pluginStatus.getSummary();

      expect(summary.legacyMode).toBe(false);
    });
  });

  describe('generateReport', () => {
    it('should generate text report', async () => {
      const plugin: PluginEntry = {
        id: 'test-framework',
        type: 'framework',
        name: 'Test Framework',
        version: '1.0.0',
        path: 'frameworks/test-framework',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/test-framework', { withManifest: true, withProjects: true });

      const report = await pluginStatus.generateReport();

      expect(report).toContain('AIWG - Plugin Status');
      expect(report).toContain('Summary:');
      expect(report).toContain('FRAMEWORKS');
      expect(report).toContain('test-framework');
    });

    it('should filter report by type', async () => {
      const framework: PluginEntry = {
        id: 'fw',
        type: 'framework',
        name: 'Framework',
        version: '1.0.0',
        path: 'frameworks/fw',
        installedAt: new Date().toISOString()
      };

      const addon: PluginEntry = {
        id: 'addon',
        type: 'add-on',
        name: 'Add-on',
        version: '1.0.0',
        path: 'add-ons/addon',
        installedAt: new Date().toISOString(),
        parentFramework: 'fw'
      };

      await createRegistry([framework, addon]);
      await createPluginDir('frameworks/fw');
      await createPluginDir('add-ons/addon');

      const report = await pluginStatus.generateReport({ type: 'framework' });

      expect(report).toContain('fw');
      expect(report).not.toContain('ADD-ONS');
    });

    it('should show health issues in verbose mode', async () => {
      const plugin: PluginEntry = {
        id: 'broken',
        type: 'framework',
        name: 'Broken',
        version: '1.0.0',
        path: 'frameworks/broken',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      // Don't create directory - will cause error

      const report = await pluginStatus.generateReport({ verbose: true });

      expect(report).toContain('Issues:');
      expect(report).toContain('Plugin directory not found');
    });
  });

  describe('Verbose Mode', () => {
    it('should include disk usage in verbose mode', async () => {
      const plugin: PluginEntry = {
        id: 'test-plugin',
        type: 'framework',
        name: 'Test Plugin',
        version: '1.0.0',
        path: 'frameworks/test-plugin',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/test-plugin', { withManifest: true, withProjects: true });

      // Create a file with some content
      await fs.writeFile(
        path.join(testDir, 'frameworks/test-plugin/test.txt'),
        'Some test content that takes up space'
      );

      const result = await pluginStatus.getStatus({ verbose: true });

      expect(result[0].diskUsage).toBeDefined();
      expect(result[0].diskUsage).toBeGreaterThan(0);
    });

    it('should not include disk usage when not verbose', async () => {
      const plugin: PluginEntry = {
        id: 'test-plugin',
        type: 'framework',
        name: 'Test Plugin',
        version: '1.0.0',
        path: 'frameworks/test-plugin',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/test-plugin');

      const result = await pluginStatus.getStatus({ verbose: false });

      expect(result[0].diskUsage).toBeUndefined();
    });
  });
});
