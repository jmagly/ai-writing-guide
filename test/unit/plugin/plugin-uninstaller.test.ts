/**
 * Tests for PluginUninstaller
 *
 * @module test/unit/plugin/plugin-uninstaller.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { PluginUninstaller } from '../../../src/plugin/plugin-uninstaller.js';
import { PluginInstaller } from '../../../src/plugin/plugin-installer.js';

describe('PluginUninstaller', () => {
  let testDir: string;
  let uninstaller: PluginUninstaller;
  let installer: PluginInstaller;

  beforeEach(async () => {
    // Create temp directory for AIWG root
    testDir = path.join(os.tmpdir(), `plugin-uninstaller-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });

    uninstaller = new PluginUninstaller(testDir);
    installer = new PluginInstaller(testDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  /**
   * Helper to install a test plugin
   */
  async function installTestPlugin(manifest: {
    id: string;
    type: 'framework' | 'add-on' | 'extension';
    name: string;
    version: string;
    parentFramework?: string;
  }): Promise<void> {
    const pluginDir = path.join(os.tmpdir(), `test-plugin-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(pluginDir, { recursive: true });

    await fs.writeFile(
      path.join(pluginDir, 'manifest.json'),
      JSON.stringify({
        ...manifest,
        description: 'Test plugin'
      }, null, 2)
    );

    // Create test files
    await fs.writeFile(path.join(pluginDir, 'README.md'), '# Test');
    await fs.mkdir(path.join(pluginDir, 'agents'), { recursive: true });
    await fs.writeFile(path.join(pluginDir, 'agents', 'agent.md'), '# Agent');

    await installer.install(pluginDir, {
      skipDependencyCheck: manifest.type === 'add-on' && !manifest.parentFramework
    });

    await fs.rm(pluginDir, { recursive: true, force: true });
  }

  describe('Basic Uninstall', () => {
    it('should uninstall a framework plugin', async () => {
      await installTestPlugin({
        id: 'test-framework',
        type: 'framework',
        name: 'Test Framework',
        version: '1.0.0'
      });

      const result = await uninstaller.uninstall('test-framework');

      expect(result.success).toBe(true);
      expect(result.pluginId).toBe('test-framework');
      expect(result.errors).toHaveLength(0);

      // Verify directory was removed
      const frameworkPath = path.join(testDir, 'frameworks', 'test-framework');
      await expect(fs.stat(frameworkPath)).rejects.toThrow();
    });

    it('should uninstall an add-on plugin', async () => {
      // First install parent framework
      await installTestPlugin({
        id: 'parent-framework',
        type: 'framework',
        name: 'Parent',
        version: '1.0.0'
      });

      // Install add-on
      await installTestPlugin({
        id: 'test-addon',
        type: 'add-on',
        name: 'Test Add-on',
        version: '1.0.0',
        parentFramework: 'parent-framework'
      });

      const result = await uninstaller.uninstall('test-addon');

      expect(result.success).toBe(true);
      expect(result.pluginId).toBe('test-addon');

      // Verify directory was removed
      const addonPath = path.join(testDir, 'add-ons', 'test-addon');
      await expect(fs.stat(addonPath)).rejects.toThrow();
    });

    it('should uninstall an extension plugin', async () => {
      await installTestPlugin({
        id: 'test-extension',
        type: 'extension',
        name: 'Test Extension',
        version: '1.0.0'
      });

      const result = await uninstaller.uninstall('test-extension');

      expect(result.success).toBe(true);

      // Verify directory was removed
      const extensionPath = path.join(testDir, 'extensions', 'test-extension');
      await expect(fs.stat(extensionPath)).rejects.toThrow();
    });
  });

  describe('Registry Updates', () => {
    it('should remove plugin from registry', async () => {
      await installTestPlugin({
        id: 'registry-test',
        type: 'framework',
        name: 'Registry Test',
        version: '1.0.0'
      });

      // Verify plugin is in registry
      let installed = await uninstaller.listInstalled();
      expect(installed.some(p => p.id === 'registry-test')).toBe(true);

      // Uninstall
      await uninstaller.uninstall('registry-test');

      // Verify plugin is not in registry
      installed = await uninstaller.listInstalled();
      expect(installed.some(p => p.id === 'registry-test')).toBe(false);
    });
  });

  describe('Dependency Checks', () => {
    it('should block uninstall when dependent plugins exist', async () => {
      // Install parent framework
      await installTestPlugin({
        id: 'parent-with-dep',
        type: 'framework',
        name: 'Parent',
        version: '1.0.0'
      });

      // Install dependent add-on
      await installTestPlugin({
        id: 'dependent-addon',
        type: 'add-on',
        name: 'Dependent',
        version: '1.0.0',
        parentFramework: 'parent-with-dep'
      });

      // Try to uninstall parent
      const result = await uninstaller.uninstall('parent-with-dep');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('depend on it');
      expect(result.errors[0]).toContain('dependent-addon');
    });

    it('should return dependent plugins list', async () => {
      // Install parent framework
      await installTestPlugin({
        id: 'parent-fw',
        type: 'framework',
        name: 'Parent',
        version: '1.0.0'
      });

      // Install multiple dependents
      await installTestPlugin({
        id: 'addon-1',
        type: 'add-on',
        name: 'Add-on 1',
        version: '1.0.0',
        parentFramework: 'parent-fw'
      });

      await installTestPlugin({
        id: 'addon-2',
        type: 'add-on',
        name: 'Add-on 2',
        version: '1.0.0',
        parentFramework: 'parent-fw'
      });

      const dependents = await uninstaller.getDependentPlugins('parent-fw');

      expect(dependents).toHaveLength(2);
      expect(dependents.map(d => d.id).sort()).toEqual(['addon-1', 'addon-2']);
    });

    it('should allow force uninstall (skip dependency checks)', async () => {
      // Install parent framework
      await installTestPlugin({
        id: 'force-parent',
        type: 'framework',
        name: 'Force Parent',
        version: '1.0.0'
      });

      // Install dependent add-on
      await installTestPlugin({
        id: 'force-addon',
        type: 'add-on',
        name: 'Force Add-on',
        version: '1.0.0',
        parentFramework: 'force-parent'
      });

      // Force uninstall parent
      const result = await uninstaller.uninstall('force-parent', { force: true });

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('skipped'))).toBe(true);
    });
  });

  describe('Uninstall Order', () => {
    it('should return correct uninstall order', async () => {
      // Install parent framework
      await installTestPlugin({
        id: 'order-parent',
        type: 'framework',
        name: 'Order Parent',
        version: '1.0.0'
      });

      // Install dependent add-on
      await installTestPlugin({
        id: 'order-addon',
        type: 'add-on',
        name: 'Order Add-on',
        version: '1.0.0',
        parentFramework: 'order-parent'
      });

      const order = await uninstaller.getUninstallOrder('order-parent');

      // Add-on should come before parent
      expect(order.indexOf('order-addon')).toBeLessThan(order.indexOf('order-parent'));
    });
  });

  describe('Non-Existent Plugin', () => {
    it('should error when uninstalling non-existent plugin', async () => {
      const result = await uninstaller.uninstall('non-existent-plugin');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('not installed');
    });
  });

  describe('Dry Run Mode', () => {
    it('should preview uninstall without executing', async () => {
      await installTestPlugin({
        id: 'dry-run-plugin',
        type: 'framework',
        name: 'Dry Run Plugin',
        version: '1.0.0'
      });

      const result = await uninstaller.uninstall('dry-run-plugin', { dryRun: true });

      expect(result.success).toBe(true);

      // Check actions were planned but not executed
      const plannedActions = result.actions.filter(a => !a.executed);
      expect(plannedActions.length).toBeGreaterThan(0);

      // Verify directory was NOT removed
      const frameworkPath = path.join(testDir, 'frameworks', 'dry-run-plugin');
      const stat = await fs.stat(frameworkPath);
      expect(stat.isDirectory()).toBe(true);

      // Verify plugin is still in registry
      const installed = await uninstaller.listInstalled();
      expect(installed.some(p => p.id === 'dry-run-plugin')).toBe(true);
    });
  });

  describe('Project Preservation', () => {
    it('should archive projects with --keepProjects', async () => {
      // Install framework
      await installTestPlugin({
        id: 'project-framework',
        type: 'framework',
        name: 'Project Framework',
        version: '1.0.0'
      });

      // Create a project in the framework
      const projectsDir = path.join(testDir, 'frameworks', 'project-framework', 'projects');
      await fs.mkdir(path.join(projectsDir, 'my-project'), { recursive: true });
      await fs.writeFile(
        path.join(projectsDir, 'my-project', 'project.json'),
        JSON.stringify({ name: 'My Project' })
      );

      // Uninstall with keepProjects
      const result = await uninstaller.uninstall('project-framework', { keepProjects: true });

      expect(result.success).toBe(true);
      expect(result.stats.projectsArchived).toBe(1);

      // Verify project was archived
      const archiveDir = path.join(testDir, 'archive', 'uninstalled', 'project-framework');
      const archiveExists = await fs.stat(archiveDir).then(() => true).catch(() => false);
      expect(archiveExists).toBe(true);
    });
  });

  describe('Can Uninstall Check', () => {
    it('should return true when plugin can be safely uninstalled', async () => {
      await installTestPlugin({
        id: 'safe-plugin',
        type: 'framework',
        name: 'Safe Plugin',
        version: '1.0.0'
      });

      const result = await uninstaller.canUninstall('safe-plugin');

      expect(result.canUninstall).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return false when plugin has dependents', async () => {
      // Install parent framework
      await installTestPlugin({
        id: 'unsafe-parent',
        type: 'framework',
        name: 'Unsafe Parent',
        version: '1.0.0'
      });

      // Install dependent add-on
      await installTestPlugin({
        id: 'unsafe-addon',
        type: 'add-on',
        name: 'Unsafe Add-on',
        version: '1.0.0',
        parentFramework: 'unsafe-parent'
      });

      const result = await uninstaller.canUninstall('unsafe-parent');

      expect(result.canUninstall).toBe(false);
      expect(result.reason).toContain('dependent');
    });

    it('should return false for non-existent plugin', async () => {
      const result = await uninstaller.canUninstall('does-not-exist');

      expect(result.canUninstall).toBe(false);
      expect(result.reason).toContain('not installed');
    });

    it('should warn about active projects', async () => {
      // Install framework
      await installTestPlugin({
        id: 'project-warn-fw',
        type: 'framework',
        name: 'Project Warn',
        version: '1.0.0'
      });

      // Create a project
      const projectsDir = path.join(testDir, 'frameworks', 'project-warn-fw', 'projects');
      await fs.mkdir(path.join(projectsDir, 'active-project'), { recursive: true });

      const result = await uninstaller.canUninstall('project-warn-fw');

      expect(result.canUninstall).toBe(true);
      expect(result.warnings.some(w => w.includes('active project'))).toBe(true);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track uninstall statistics', async () => {
      await installTestPlugin({
        id: 'stats-plugin',
        type: 'framework',
        name: 'Stats Plugin',
        version: '1.0.0'
      });

      const result = await uninstaller.uninstall('stats-plugin');

      expect(result.success).toBe(true);
      expect(result.stats.filesRemoved).toBeGreaterThan(0);
      expect(result.stats.dirsRemoved).toBeGreaterThan(0);
    });
  });

  describe('Actions Tracking', () => {
    it('should track all uninstall actions', async () => {
      await installTestPlugin({
        id: 'actions-plugin',
        type: 'framework',
        name: 'Actions Plugin',
        version: '1.0.0'
      });

      const result = await uninstaller.uninstall('actions-plugin');

      expect(result.actions.length).toBeGreaterThan(0);

      // Should have validate action
      expect(result.actions.some(a => a.type === 'validate')).toBe(true);

      // Should have check-deps action
      expect(result.actions.some(a => a.type === 'check-deps')).toBe(true);

      // Should have remove-dir action
      expect(result.actions.some(a => a.type === 'remove-dir')).toBe(true);

      // Should have update-registry action
      expect(result.actions.some(a => a.type === 'update-registry')).toBe(true);
    });
  });
});
