/**
 * Tests for RegistryValidator
 *
 * @module test/unit/plugin/registry-validator.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  RegistryValidator,
  Registry,
  RegistryEntry,
  RegistryValidationResult
} from '../../../src/plugin/registry-validator.js';

describe('RegistryValidator', () => {
  let testDir: string;
  let validator: RegistryValidator;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = path.join(os.tmpdir(), `registry-validator-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create default directories
    await fs.mkdir(path.join(testDir, 'frameworks'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'add-ons'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'extensions'), { recursive: true });

    validator = new RegistryValidator(testDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a registry file
   */
  async function createRegistry(plugins: RegistryEntry[] = []): Promise<void> {
    const registry: Registry = {
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
  async function createPluginDir(pluginPath: string, withManifest: boolean = true): Promise<void> {
    const fullPath = path.join(testDir, pluginPath);
    await fs.mkdir(fullPath, { recursive: true });

    if (withManifest) {
      await fs.writeFile(
        path.join(fullPath, 'manifest.json'),
        JSON.stringify({ name: path.basename(pluginPath), version: '1.0.0' })
      );
    }
  }

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const v = new RegistryValidator(testDir);
      expect(v).toBeDefined();
    });

    it('should accept custom options', () => {
      const v = new RegistryValidator(testDir, {
        checkFilesystem: false,
        checkFrameworkRefs: false,
        healthStaleThresholdHours: 48
      });
      expect(v).toBeDefined();
    });
  });

  describe('Registry Loading', () => {
    it('should fail when registry file is missing', async () => {
      const result = await validator.validate();

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBe(1);
      expect(result.issues[0].category).toBe('missing');
      expect(result.issues[0].message).toContain('Failed to load registry');
    });

    it('should fail when registry file is invalid JSON', async () => {
      await fs.writeFile(path.join(testDir, 'registry.json'), 'not valid json');

      const result = await validator.validate();

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('Failed to load registry');
    });

    it('should succeed with empty registry', async () => {
      await createRegistry([]);

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.stats.totalPlugins).toBe(0);
    });
  });

  describe('Plugin Validation', () => {
    it('should validate plugin with existing directory', async () => {
      const plugin: RegistryEntry = {
        id: 'test-framework',
        type: 'framework',
        name: 'Test Framework',
        version: '1.0.0',
        path: 'frameworks/test-framework',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/test-framework');

      const result = await validator.validate();

      expect(result.valid).toBe(true);
      expect(result.stats.totalPlugins).toBe(1);
    });

    it('should report error for missing plugin directory', async () => {
      const plugin: RegistryEntry = {
        id: 'missing-plugin',
        type: 'framework',
        name: 'Missing Plugin',
        version: '1.0.0',
        path: 'frameworks/missing-plugin',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      // Don't create the directory

      const result = await validator.validate();

      expect(result.valid).toBe(false);
      expect(result.issues.some(i =>
        i.category === 'missing' && i.pluginId === 'missing-plugin'
      )).toBe(true);
    });

    it('should report warning for missing manifest.json', async () => {
      const plugin: RegistryEntry = {
        id: 'no-manifest',
        type: 'framework',
        name: 'No Manifest',
        version: '1.0.0',
        path: 'frameworks/no-manifest',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/no-manifest', false); // No manifest

      const result = await validator.validate();

      expect(result.issues.some(i =>
        i.category === 'missing' &&
        i.message.includes('manifest not found')
      )).toBe(true);
    });
  });

  describe('Orphaned Directory Detection', () => {
    it('should detect orphaned directories', async () => {
      await createRegistry([]);
      await createPluginDir('frameworks/orphaned-plugin');

      const result = await validator.validate();

      expect(result.stats.orphanedPlugins).toBe(1);
      expect(result.issues.some(i =>
        i.category === 'orphaned' &&
        i.message.includes('orphaned-plugin')
      )).toBe(true);
    });

    it('should not report registered directories as orphaned', async () => {
      const plugin: RegistryEntry = {
        id: 'registered',
        type: 'framework',
        name: 'Registered',
        version: '1.0.0',
        path: 'frameworks/registered',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/registered');

      const result = await validator.validate();

      expect(result.stats.orphanedPlugins).toBe(0);
    });
  });

  describe('Framework Reference Validation', () => {
    it('should validate valid parent framework reference', async () => {
      const framework: RegistryEntry = {
        id: 'parent-framework',
        type: 'framework',
        name: 'Parent Framework',
        version: '1.0.0',
        path: 'frameworks/parent-framework',
        installedAt: new Date().toISOString()
      };

      const addon: RegistryEntry = {
        id: 'child-addon',
        type: 'add-on',
        name: 'Child Add-on',
        version: '1.0.0',
        path: 'add-ons/child-addon',
        installedAt: new Date().toISOString(),
        parentFramework: 'parent-framework'
      };

      await createRegistry([framework, addon]);
      await createPluginDir('frameworks/parent-framework');
      await createPluginDir('add-ons/child-addon');

      const result = await validator.validate();

      expect(result.stats.invalidRefs).toBe(0);
    });

    it('should report invalid parent framework reference', async () => {
      const addon: RegistryEntry = {
        id: 'orphan-addon',
        type: 'add-on',
        name: 'Orphan Add-on',
        version: '1.0.0',
        path: 'add-ons/orphan-addon',
        installedAt: new Date().toISOString(),
        parentFramework: 'non-existent-framework'
      };

      await createRegistry([addon]);
      await createPluginDir('add-ons/orphan-addon');

      const result = await validator.validate();

      expect(result.valid).toBe(false);
      expect(result.stats.invalidRefs).toBe(1);
      expect(result.issues.some(i =>
        i.category === 'invalid-ref' &&
        i.message.includes('non-existent-framework')
      )).toBe(true);
    });
  });

  describe('Health Staleness Check', () => {
    it('should report stale health status', async () => {
      const staleDate = new Date();
      staleDate.setHours(staleDate.getHours() - 48); // 48 hours ago

      const plugin: RegistryEntry = {
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
      await createPluginDir('frameworks/stale-plugin');

      const result = await validator.validate();

      expect(result.issues.some(i =>
        i.category === 'stale-health' &&
        i.pluginId === 'stale-plugin'
      )).toBe(true);
    });

    it('should not report fresh health status as stale', async () => {
      const freshDate = new Date();
      freshDate.setHours(freshDate.getHours() - 1); // 1 hour ago

      const plugin: RegistryEntry = {
        id: 'fresh-plugin',
        type: 'framework',
        name: 'Fresh Plugin',
        version: '1.0.0',
        path: 'frameworks/fresh-plugin',
        installedAt: new Date().toISOString(),
        health: {
          status: 'healthy',
          lastCheck: freshDate.toISOString()
        }
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/fresh-plugin');

      const result = await validator.validate();

      expect(result.issues.filter(i => i.category === 'stale-health').length).toBe(0);
    });
  });

  describe('Helper Methods', () => {
    it('isConsistent should return true for valid registry', async () => {
      await createRegistry([]);

      const consistent = await validator.isConsistent();

      expect(consistent).toBe(true);
    });

    it('isConsistent should return false for invalid registry', async () => {
      // No registry file
      const consistent = await validator.isConsistent();

      expect(consistent).toBe(false);
    });

    it('getOrphanedPlugins should return orphaned plugin IDs', async () => {
      const plugin: RegistryEntry = {
        id: 'orphaned-in-registry',
        type: 'framework',
        name: 'Orphaned',
        version: '1.0.0',
        path: 'frameworks/orphaned-in-registry',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);
      // Don't create directory

      const orphaned = await validator.getOrphanedPlugins();

      expect(orphaned).toContain('orphaned-in-registry');
    });

    it('getMissingPlugins should return orphaned directory paths', async () => {
      await createRegistry([]);
      await createPluginDir('frameworks/not-in-registry');

      const missing = await validator.getMissingPlugins();

      expect(missing.some(p => p.includes('not-in-registry'))).toBe(true);
    });
  });

  describe('Report Generation', () => {
    it('should generate text report', async () => {
      await createRegistry([]);

      const report = await validator.generateReport('text');

      expect(report).toContain('Registry Validation Report');
      expect(report).toContain('Status:');
      expect(report).toContain('Statistics:');
    });

    it('should generate JSON report', async () => {
      await createRegistry([]);

      const report = await validator.generateReport('json');
      const parsed = JSON.parse(report);

      expect(parsed).toHaveProperty('valid');
      expect(parsed).toHaveProperty('issues');
      expect(parsed).toHaveProperty('stats');
    });

    it('should include issues in text report', async () => {
      const plugin: RegistryEntry = {
        id: 'missing-dir',
        type: 'framework',
        name: 'Missing Dir',
        version: '1.0.0',
        path: 'frameworks/missing-dir',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);

      const report = await validator.generateReport('text');

      expect(report).toContain('Issues:');
      expect(report).toContain('missing-dir');
    });
  });

  describe('Options', () => {
    it('should skip filesystem check when disabled', async () => {
      const v = new RegistryValidator(testDir, { checkFilesystem: false });

      const plugin: RegistryEntry = {
        id: 'missing-plugin',
        type: 'framework',
        name: 'Missing',
        version: '1.0.0',
        path: 'frameworks/missing-plugin',
        installedAt: new Date().toISOString()
      };

      await createRegistry([plugin]);

      const result = await v.validate();

      // Should not report missing directory because filesystem check is disabled
      expect(result.issues.filter(i => i.category === 'missing').length).toBe(0);
    });

    it('should skip framework refs check when disabled', async () => {
      const v = new RegistryValidator(testDir, { checkFrameworkRefs: false });

      const addon: RegistryEntry = {
        id: 'orphan-addon',
        type: 'add-on',
        name: 'Orphan',
        version: '1.0.0',
        path: 'add-ons/orphan-addon',
        installedAt: new Date().toISOString(),
        parentFramework: 'non-existent'
      };

      await createRegistry([addon]);
      await createPluginDir('add-ons/orphan-addon');

      const result = await v.validate();

      expect(result.stats.invalidRefs).toBe(0);
    });

    it('should respect custom health staleness threshold', async () => {
      const v = new RegistryValidator(testDir, { healthStaleThresholdHours: 1 });

      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const plugin: RegistryEntry = {
        id: 'stale-plugin',
        type: 'framework',
        name: 'Stale',
        version: '1.0.0',
        path: 'frameworks/stale-plugin',
        installedAt: new Date().toISOString(),
        health: {
          status: 'healthy',
          lastCheck: twoHoursAgo.toISOString()
        }
      };

      await createRegistry([plugin]);
      await createPluginDir('frameworks/stale-plugin');

      const result = await v.validate();

      // With 1 hour threshold, 2 hours ago should be stale
      expect(result.issues.some(i => i.category === 'stale-health')).toBe(true);
    });
  });

  describe('Stats Tracking', () => {
    it('should track healthy plugins count', async () => {
      const healthyPlugin: RegistryEntry = {
        id: 'healthy',
        type: 'framework',
        name: 'Healthy',
        version: '1.0.0',
        path: 'frameworks/healthy',
        installedAt: new Date().toISOString(),
        health: {
          status: 'healthy',
          lastCheck: new Date().toISOString()
        }
      };

      const unhealthyPlugin: RegistryEntry = {
        id: 'unhealthy',
        type: 'framework',
        name: 'Unhealthy',
        version: '1.0.0',
        path: 'frameworks/unhealthy',
        installedAt: new Date().toISOString(),
        health: {
          status: 'error',
          lastCheck: new Date().toISOString(),
          issues: ['Something wrong']
        }
      };

      await createRegistry([healthyPlugin, unhealthyPlugin]);
      await createPluginDir('frameworks/healthy');
      await createPluginDir('frameworks/unhealthy');

      const result = await validator.validate();

      expect(result.stats.totalPlugins).toBe(2);
      expect(result.stats.healthyPlugins).toBe(1);
    });
  });
});
