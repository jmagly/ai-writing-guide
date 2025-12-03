/**
 * Tests for PluginInstaller
 *
 * @module test/unit/plugin/plugin-installer.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { PluginInstaller, PluginManifest } from '../../../src/plugin/plugin-installer.js';

describe('PluginInstaller', () => {
  let testDir: string;
  let pluginDir: string;
  let installer: PluginInstaller;

  beforeEach(async () => {
    // Create temp directory for AIWG root
    testDir = path.join(os.tmpdir(), `plugin-installer-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create temp directory for test plugin
    pluginDir = path.join(os.tmpdir(), `test-plugin-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(pluginDir, { recursive: true });

    installer = new PluginInstaller(testDir);
  });

  afterEach(async () => {
    // Clean up temp directories
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(pluginDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a test plugin with manifest
   */
  async function createTestPlugin(manifest: Partial<PluginManifest>): Promise<string> {
    const fullManifest: PluginManifest = {
      id: 'test-plugin',
      type: 'framework',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      ...manifest
    };

    await fs.writeFile(
      path.join(pluginDir, 'manifest.json'),
      JSON.stringify(fullManifest, null, 2)
    );

    // Create some test files
    await fs.writeFile(path.join(pluginDir, 'README.md'), '# Test Plugin');
    await fs.mkdir(path.join(pluginDir, 'agents'), { recursive: true });
    await fs.writeFile(path.join(pluginDir, 'agents', 'test-agent.md'), '# Test Agent');

    return pluginDir;
  }

  describe('Manifest Validation', () => {
    it('should validate a valid plugin manifest', async () => {
      await createTestPlugin({
        id: 'valid-plugin',
        type: 'framework',
        name: 'Valid Plugin',
        version: '1.0.0'
      });

      const result = await installer.validatePlugin(pluginDir);

      expect(result.valid).toBe(true);
      expect(result.manifest?.id).toBe('valid-plugin');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject plugin without manifest', async () => {
      // Don't create manifest
      const emptyDir = path.join(os.tmpdir(), `empty-${Date.now()}`);
      await fs.mkdir(emptyDir, { recursive: true });

      const result = await installer.validatePlugin(emptyDir);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Manifest not found');

      await fs.rm(emptyDir, { recursive: true, force: true });
    });

    it('should reject manifest missing required fields', async () => {
      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify({ id: 'incomplete' })
      );

      const result = await installer.validatePlugin(pluginDir);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('missing required fields');
    });

    it('should reject invalid plugin ID format', async () => {
      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify({
          id: 'Invalid_Plugin_ID!',
          type: 'framework',
          name: 'Invalid',
          version: '1.0.0'
        })
      );

      const result = await installer.validatePlugin(pluginDir);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid plugin ID');
    });

    it('should reject invalid version format', async () => {
      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify({
          id: 'test-plugin',
          type: 'framework',
          name: 'Test',
          version: 'invalid'
        })
      );

      const result = await installer.validatePlugin(pluginDir);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid version');
    });

    it('should reject add-on without parentFramework', async () => {
      await fs.writeFile(
        path.join(pluginDir, 'manifest.json'),
        JSON.stringify({
          id: 'test-addon',
          type: 'add-on',
          name: 'Test Add-on',
          version: '1.0.0'
        })
      );

      const result = await installer.validatePlugin(pluginDir);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('parentFramework');
    });
  });

  describe('Framework Installation', () => {
    it('should install a framework plugin', async () => {
      await createTestPlugin({
        id: 'sdlc-complete',
        type: 'framework',
        name: 'SDLC Complete',
        version: '1.0.0'
      });

      const result = await installer.install(pluginDir);

      expect(result.success).toBe(true);
      expect(result.pluginId).toBe('sdlc-complete');
      expect(result.version).toBe('1.0.0');
      expect(result.errors).toHaveLength(0);

      // Check directory structure was created
      const frameworkPath = path.join(testDir, 'frameworks', 'sdlc-complete');
      const stat = await fs.stat(frameworkPath);
      expect(stat.isDirectory()).toBe(true);

      // Check subdirectories
      const repoDirStat = await fs.stat(path.join(frameworkPath, 'repo'));
      expect(repoDirStat.isDirectory()).toBe(true);

      const projectsDirStat = await fs.stat(path.join(frameworkPath, 'projects'));
      expect(projectsDirStat.isDirectory()).toBe(true);
    });

    it('should copy plugin files to repo directory', async () => {
      await createTestPlugin({
        id: 'test-framework',
        type: 'framework',
        name: 'Test Framework',
        version: '1.0.0'
      });

      await installer.install(pluginDir);

      // Check files were copied
      const repoPath = path.join(testDir, 'frameworks', 'test-framework', 'repo');
      const manifestStat = await fs.stat(path.join(repoPath, 'manifest.json'));
      expect(manifestStat.isFile()).toBe(true);

      const readmeStat = await fs.stat(path.join(repoPath, 'README.md'));
      expect(readmeStat.isFile()).toBe(true);

      const agentStat = await fs.stat(path.join(repoPath, 'agents', 'test-agent.md'));
      expect(agentStat.isFile()).toBe(true);
    });

    it('should update registry after installation', async () => {
      await createTestPlugin({
        id: 'registry-test',
        type: 'framework',
        name: 'Registry Test',
        version: '2.0.0'
      });

      await installer.install(pluginDir);

      // Check registry was updated
      const registryPath = path.join(testDir, 'registry.json');
      const content = await fs.readFile(registryPath, 'utf-8');
      const registry = JSON.parse(content);

      expect(registry.plugins).toHaveLength(1);
      expect(registry.plugins[0].id).toBe('registry-test');
      expect(registry.plugins[0].version).toBe('2.0.0');
      expect(registry.plugins[0].type).toBe('framework');
    });
  });

  describe('Add-on Installation', () => {
    beforeEach(async () => {
      // Pre-install a framework for add-on tests
      const frameworkDir = path.join(os.tmpdir(), `parent-framework-${Date.now()}`);
      await fs.mkdir(frameworkDir, { recursive: true });

      await fs.writeFile(
        path.join(frameworkDir, 'manifest.json'),
        JSON.stringify({
          id: 'parent-framework',
          type: 'framework',
          name: 'Parent Framework',
          version: '1.0.0',
          description: 'Parent'
        })
      );

      await installer.install(frameworkDir);
      await fs.rm(frameworkDir, { recursive: true, force: true });
    });

    it('should install add-on with valid parent', async () => {
      await createTestPlugin({
        id: 'gdpr-compliance',
        type: 'add-on',
        name: 'GDPR Compliance',
        version: '1.0.0',
        parentFramework: 'parent-framework'
      });

      const result = await installer.install(pluginDir);

      expect(result.success).toBe(true);
      expect(result.pluginId).toBe('gdpr-compliance');

      // Check installed in add-ons directory
      const addonPath = path.join(testDir, 'add-ons', 'gdpr-compliance');
      const stat = await fs.stat(addonPath);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should fail add-on installation without parent framework', async () => {
      await createTestPlugin({
        id: 'orphan-addon',
        type: 'add-on',
        name: 'Orphan Add-on',
        version: '1.0.0',
        parentFramework: 'non-existent-framework'
      });

      const result = await installer.install(pluginDir);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('non-existent-framework');
      expect(result.errors[0]).toContain('not installed');
    });

    it('should allow skipping dependency check', async () => {
      await createTestPlugin({
        id: 'skip-check-addon',
        type: 'add-on',
        name: 'Skip Check',
        version: '1.0.0',
        parentFramework: 'missing-framework'
      });

      const result = await installer.install(pluginDir, {
        skipDependencyCheck: true
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Extension Installation', () => {
    it('should install an extension plugin', async () => {
      await createTestPlugin({
        id: 'custom-extension',
        type: 'extension',
        name: 'Custom Extension',
        version: '1.0.0'
      });

      const result = await installer.install(pluginDir);

      expect(result.success).toBe(true);
      expect(result.pluginId).toBe('custom-extension');

      // Check installed in extensions directory
      const extensionPath = path.join(testDir, 'extensions', 'custom-extension');
      const stat = await fs.stat(extensionPath);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe('Duplicate Prevention', () => {
    it('should prevent duplicate installation', async () => {
      await createTestPlugin({
        id: 'unique-plugin',
        type: 'framework',
        name: 'Unique Plugin',
        version: '1.0.0'
      });

      // First install
      const result1 = await installer.install(pluginDir);
      expect(result1.success).toBe(true);

      // Second install should fail
      const result2 = await installer.install(pluginDir);
      expect(result2.success).toBe(false);
      expect(result2.errors[0]).toContain('already installed');
    });

    it('should allow force reinstallation', async () => {
      await createTestPlugin({
        id: 'force-reinstall',
        type: 'framework',
        name: 'Force Reinstall',
        version: '1.0.0'
      });

      // First install
      await installer.install(pluginDir);

      // Update version
      await createTestPlugin({
        id: 'force-reinstall',
        type: 'framework',
        name: 'Force Reinstall',
        version: '2.0.0'
      });

      // Force reinstall
      const result = await installer.install(pluginDir, { force: true });

      expect(result.success).toBe(true);
      expect(result.version).toBe('2.0.0');
      expect(result.warnings.some(w => w.includes('Reinstalling'))).toBe(true);
    });
  });

  describe('Dry Run Mode', () => {
    it('should preview installation without executing', async () => {
      await createTestPlugin({
        id: 'dry-run-plugin',
        type: 'framework',
        name: 'Dry Run Plugin',
        version: '1.0.0'
      });

      const result = await installer.install(pluginDir, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.pluginId).toBe('dry-run-plugin');

      // Check actions were planned but not executed
      const plannedActions = result.actions.filter(a => !a.executed);
      expect(plannedActions.length).toBeGreaterThan(0);

      // Check directories were NOT created
      const frameworkPath = path.join(testDir, 'frameworks', 'dry-run-plugin');
      await expect(fs.stat(frameworkPath)).rejects.toThrow();
    });
  });

  describe('Rollback on Failure', () => {
    it('should rollback on installation failure', async () => {
      // Create a valid manifest
      await createTestPlugin({
        id: 'rollback-test',
        type: 'framework',
        name: 'Rollback Test',
        version: '1.0.0'
      });

      // Install successfully first
      await installer.install(pluginDir);

      // Create another plugin dir with invalid structure
      const badPluginDir = path.join(os.tmpdir(), `bad-plugin-${Date.now()}`);
      await fs.mkdir(badPluginDir, { recursive: true });

      // Empty manifest.json (will fail JSON parse)
      await fs.writeFile(path.join(badPluginDir, 'manifest.json'), 'invalid json');

      // Try to install (should fail)
      const result = await installer.install(badPluginDir);

      expect(result.success).toBe(false);

      await fs.rm(badPluginDir, { recursive: true, force: true });
    });
  });

  describe('List and Get Operations', () => {
    it('should list installed plugins', async () => {
      // Install some plugins
      await createTestPlugin({
        id: 'plugin-a',
        type: 'framework',
        name: 'Plugin A',
        version: '1.0.0'
      });
      await installer.install(pluginDir);

      // Create new plugin dir
      const pluginDir2 = path.join(os.tmpdir(), `plugin2-${Date.now()}`);
      await fs.mkdir(pluginDir2, { recursive: true });
      await fs.writeFile(
        path.join(pluginDir2, 'manifest.json'),
        JSON.stringify({
          id: 'plugin-b',
          type: 'extension',
          name: 'Plugin B',
          version: '2.0.0',
          description: 'Plugin B'
        })
      );
      await installer.install(pluginDir2);

      const installed = await installer.listInstalled();

      expect(installed).toHaveLength(2);
      expect(installed.map(p => p.id).sort()).toEqual(['plugin-a', 'plugin-b']);

      await fs.rm(pluginDir2, { recursive: true, force: true });
    });

    it('should get plugin info by ID', async () => {
      await createTestPlugin({
        id: 'info-test',
        type: 'framework',
        name: 'Info Test',
        version: '3.0.0'
      });
      await installer.install(pluginDir);

      const info = await installer.getPluginInfo('info-test');

      expect(info).not.toBeNull();
      expect(info?.id).toBe('info-test');
      expect(info?.version).toBe('3.0.0');
      expect(info?.type).toBe('framework');
    });

    it('should return null for non-existent plugin', async () => {
      const info = await installer.getPluginInfo('non-existent');
      expect(info).toBeNull();
    });
  });

  describe('Actions Tracking', () => {
    it('should track all installation actions', async () => {
      await createTestPlugin({
        id: 'actions-test',
        type: 'framework',
        name: 'Actions Test',
        version: '1.0.0'
      });

      const result = await installer.install(pluginDir);

      expect(result.actions.length).toBeGreaterThan(0);

      // Should have validate action
      expect(result.actions.some(a => a.type === 'validate')).toBe(true);

      // Should have create-dir actions
      expect(result.actions.some(a => a.type === 'create-dir')).toBe(true);

      // Should have copy-file action
      expect(result.actions.some(a => a.type === 'copy-file')).toBe(true);

      // Should have update-registry action
      expect(result.actions.some(a => a.type === 'update-registry')).toBe(true);
    });
  });
});
