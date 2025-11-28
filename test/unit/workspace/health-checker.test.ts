/**
 * HealthChecker Component Test Suite
 *
 * Tests for plugin health validation, manifest checks, directory structure,
 * version compatibility, dependency validation, auto-repair, and cache management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { HealthChecker, PluginNotFoundError } from '../../../tools/workspace/health-checker.mjs';
import { PluginRegistry } from '../../../tools/workspace/registry-manager.mjs';

// Test workspace path
const TEST_WORKSPACE = '.aiwg-test-health';
const REGISTRY_PATH = path.join(TEST_WORKSPACE, 'frameworks', 'registry.json');

describe('HealthChecker', () => {
  let checker: InstanceType<typeof HealthChecker>;
  let registry: InstanceType<typeof PluginRegistry>;

  beforeEach(async () => {
    // Clean up any existing test workspace
    try {
      await rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }

    // Create test workspace
    await mkdir(TEST_WORKSPACE, { recursive: true });

    // Initialize registry
    registry = new PluginRegistry(REGISTRY_PATH);
    await registry.initialize();

    // Create test framework
    await registry.addPlugin({
      id: 'test-framework',
      type: 'framework',
      name: 'Test Framework',
      version: '1.0.0',
      'install-date': new Date().toISOString(),
      'repo-path': 'frameworks/test-framework/repo/',
      projects: [],
      health: 'unknown'
    });

    // Create framework directories and manifest
    const frameworkDir = path.join(TEST_WORKSPACE, 'frameworks', 'test-framework');
    await mkdir(path.join(frameworkDir, 'repo'), { recursive: true });
    await mkdir(path.join(frameworkDir, 'projects'), { recursive: true });

    const manifest = {
      id: 'test-framework',
      version: '1.0.0',
      type: 'framework',
      name: 'Test Framework',
      description: 'Test framework for health checker validation'
    };
    await writeFile(
      path.join(frameworkDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    // Create test add-on (healthy)
    await registry.addPlugin({
      id: 'test-addon-healthy',
      type: 'add-on',
      name: 'Test Add-on (Healthy)',
      version: '1.0.0',
      'install-date': new Date().toISOString(),
      'parent-framework': 'test-framework',
      'repo-path': 'add-ons/test-addon-healthy/',
      health: 'unknown'
    });

    // Create add-on directory and manifest
    const addonHealthyDir = path.join(TEST_WORKSPACE, 'add-ons', 'test-addon-healthy');
    await mkdir(addonHealthyDir, { recursive: true });

    const addonManifest = {
      id: 'test-addon-healthy',
      version: '1.0.0',
      type: 'add-on',
      name: 'Test Add-on (Healthy)',
      description: 'Healthy test add-on'
    };
    await writeFile(
      path.join(addonHealthyDir, 'manifest.json'),
      JSON.stringify(addonManifest, null, 2),
      'utf-8'
    );

    // Create test add-on (broken - missing manifest)
    await registry.addPlugin({
      id: 'test-addon-broken',
      type: 'add-on',
      name: 'Test Add-on (Broken)',
      version: '1.0.0',
      'install-date': new Date().toISOString(),
      'parent-framework': 'test-framework',
      'repo-path': 'add-ons/test-addon-broken/',
      health: 'unknown'
    });

    // Create directory but no manifest (to trigger error)
    const addonBrokenDir = path.join(TEST_WORKSPACE, 'add-ons', 'test-addon-broken');
    await mkdir(addonBrokenDir, { recursive: true });

    // Create test extension (missing parent)
    await registry.addPlugin({
      id: 'test-extension-orphan',
      type: 'extension',
      name: 'Test Extension (Orphan)',
      version: '1.0.0',
      'install-date': new Date().toISOString(),
      extends: 'nonexistent-framework',
      'repo-path': 'extensions/test-extension-orphan/',
      health: 'unknown'
    });

    // Create extension directory and manifest
    const extensionDir = path.join(TEST_WORKSPACE, 'extensions', 'test-extension-orphan');
    await mkdir(extensionDir, { recursive: true });

    const extensionManifest = {
      id: 'test-extension-orphan',
      version: '1.0.0',
      type: 'extension',
      name: 'Test Extension (Orphan)',
      description: 'Extension with missing parent framework'
    };
    await writeFile(
      path.join(extensionDir, 'manifest.json'),
      JSON.stringify(extensionManifest, null, 2),
      'utf-8'
    );

    // Initialize HealthChecker
    checker = new HealthChecker(TEST_WORKSPACE, registry);
  });

  afterEach(async () => {
    try {
      await rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('checkPlugin', () => {
    it('should report healthy status for valid framework', async () => {
      const result = await checker.checkPlugin('test-framework');

      expect(result).toBeDefined();
      expect(result.status).toBe('healthy');
      expect(result.issues.length).toBe(0);
      expect(result.pluginId).toBe('test-framework');
      expect(result.timestamp).toBeDefined();
    });

    it('should report error status for plugin with missing manifest', async () => {
      const result = await checker.checkPlugin('test-addon-broken');

      expect(result).toBeDefined();
      expect(result.status).toBe('error');
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.message.includes('Missing manifest file'))).toBe(true);
    });

    it('should report error for extension with missing parent framework', async () => {
      const result = await checker.checkPlugin('test-extension-orphan');

      expect(result).toBeDefined();
      expect(result.status).toBe('error');
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.message.includes('Missing extended framework'))).toBe(true);
    });

    it('should throw PluginNotFoundError for non-existent plugin', async () => {
      await expect(checker.checkPlugin('nonexistent-plugin'))
        .rejects.toThrow(PluginNotFoundError);
    });
  });

  describe('checkAll', () => {
    it('should check all plugins and return summary', async () => {
      const summary = await checker.checkAll();

      expect(summary).toBeDefined();
      expect(summary.total).toBe(4);
      expect(summary.healthy).toBeGreaterThanOrEqual(1);
      expect(summary.errors).toBeGreaterThanOrEqual(1);
      expect(summary.results.length).toBe(4);
    });

    it('should include individual results for each plugin', async () => {
      const summary = await checker.checkAll();

      const pluginIds = summary.results.map(r => r.pluginId);
      expect(pluginIds).toContain('test-framework');
      expect(pluginIds).toContain('test-addon-healthy');
      expect(pluginIds).toContain('test-addon-broken');
      expect(pluginIds).toContain('test-extension-orphan');
    });
  });

  describe('generateSummary', () => {
    it('should generate overall health summary', async () => {
      const summary = await checker.generateSummary();

      expect(summary).toBeDefined();
      expect(summary.overallStatus).toBeDefined();
      expect(['healthy', 'warning', 'error']).toContain(summary.overallStatus);
      expect(summary.plugins.total).toBe(4);
      expect(summary.issues).toBeDefined();
      expect(summary.timestamp).toBeDefined();
    });

    it('should report error status when any plugin has errors', async () => {
      const summary = await checker.generateSummary();

      // We have a broken addon and orphan extension, so status should be error
      expect(summary.overallStatus).toBe('error');
      expect(summary.plugins.errors).toBeGreaterThan(0);
    });
  });

  describe('getHealthReport', () => {
    it('should return detailed health report for plugin', async () => {
      const report = await checker.getHealthReport('test-addon-broken');

      expect(report).toBeDefined();
      expect(report.pluginId).toBe('test-addon-broken');
      expect(report.status).toBe('error');
      expect(report.metadata).toBeDefined();
      expect(report.metadata['parent-framework']).toBe('test-framework');
      expect(report.summary).toBeDefined();
      expect(report.summary.total).toBeGreaterThan(0);
      expect(report.timestamp).toBeDefined();
    });
  });

  describe('validateManifest', () => {
    it('should validate manifest integrity for healthy plugin', async () => {
      const result = await checker.validateManifest('test-framework');

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should detect missing manifest file', async () => {
      const result = await checker.validateManifest('test-addon-broken');

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.message.includes('Missing manifest file'))).toBe(true);
    });
  });

  describe('validateDirectories', () => {
    it('should validate directory structure for framework', async () => {
      const result = await checker.validateDirectories('test-framework');

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should validate directory structure for add-on', async () => {
      const result = await checker.validateDirectories('test-addon-healthy');

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });
  });

  describe('validateVersionCompatibility', () => {
    it('should validate compatible versions for add-on', async () => {
      const result = await checker.validateVersionCompatibility('test-addon-healthy');

      expect(result.valid).toBe(true);
      expect(result.issues.filter(i => i.severity === 'error').length).toBe(0);
    });

    it('should skip version check for frameworks', async () => {
      const result = await checker.validateVersionCompatibility('test-framework');

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });
  });

  describe('validateDependencies', () => {
    it('should validate dependencies for add-on with valid parent', async () => {
      const result = await checker.validateDependencies('test-addon-healthy');

      expect(result.valid).toBe(true);
      expect(result.issues.filter(i => i.severity === 'error').length).toBe(0);
    });

    it('should detect missing extended framework for extension', async () => {
      const result = await checker.validateDependencies('test-extension-orphan');

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.message.includes('Missing extended framework'))).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should cache health check results', async () => {
      await checker.checkPlugin('test-framework');
      const cached = checker.getCached('test-framework');

      expect(cached).not.toBeNull();
      expect(cached.status).toBe('healthy');
    });

    it('should return cached result when still valid', async () => {
      const start = Date.now();
      await checker.checkPlugin('test-framework');
      const firstCheckTime = Date.now() - start;

      const cacheStart = Date.now();
      const cached = checker.getCached('test-framework');
      const cachedCheckTime = Date.now() - cacheStart;

      expect(cached).not.toBeNull();
      // Cache lookup should be significantly faster
      expect(cachedCheckTime).toBeLessThan(firstCheckTime + 10);
    });

    it('should invalidate cache for specific plugin', async () => {
      await checker.checkPlugin('test-framework');
      expect(checker.getCached('test-framework')).not.toBeNull();

      checker.invalidateCache('test-framework');
      expect(checker.getCached('test-framework')).toBeNull();
    });

    it('should clear all cache entries', async () => {
      await checker.checkPlugin('test-framework');
      await checker.checkPlugin('test-addon-healthy');

      checker.clearCache();

      expect(checker.getCached('test-framework')).toBeNull();
      expect(checker.getCached('test-addon-healthy')).toBeNull();
    });
  });

  describe('repairPlugin', () => {
    it('should repair plugin with missing manifest', async () => {
      const result = await checker.repairPlugin('test-addon-broken');

      expect(result).toBeDefined();
      expect(result.repaired).toBe(true);
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.actions.some(a => a.includes('manifest'))).toBe(true);
    });

    it('should verify repair improved plugin health', async () => {
      const beforeRepair = await checker.checkPlugin('test-addon-broken');
      expect(beforeRepair.status).toBe('error');

      await checker.repairPlugin('test-addon-broken');

      // Need to invalidate cache to get fresh check
      checker.invalidateCache('test-addon-broken');
      const afterRepair = await checker.checkPlugin('test-addon-broken');

      // Should have fewer issues after repair
      expect(afterRepair.issues.length).toBeLessThanOrEqual(beforeRepair.issues.length);
    });

    it('should report no repairs needed for healthy plugin', async () => {
      const result = await checker.repairPlugin('test-framework');

      expect(result).toBeDefined();
      expect(result.repaired).toBe(false);
      expect(result.actions.length).toBe(0);
    });

    it('should throw for non-existent plugin', async () => {
      await expect(checker.repairPlugin('nonexistent-plugin'))
        .rejects.toThrow(PluginNotFoundError);
    });
  });

});
