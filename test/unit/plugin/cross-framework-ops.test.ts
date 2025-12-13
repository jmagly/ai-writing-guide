/**
 * Tests for CrossFrameworkOps
 *
 * @module test/unit/plugin/cross-framework-ops.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { CrossFrameworkOps, getInverseRelationship } from '../../../src/plugin/cross-framework-ops.js';
import { PluginInstaller } from '../../../src/plugin/plugin-installer.js';

describe('CrossFrameworkOps', () => {
  let testDir: string;
  let ops: CrossFrameworkOps;
  let installer: PluginInstaller;

  beforeEach(async () => {
    // Create temp directory for AIWG root
    testDir = path.join(os.tmpdir(), `cross-framework-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });

    ops = new CrossFrameworkOps(testDir);
    installer = new PluginInstaller(testDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  /**
   * Helper to install a test framework
   */
  async function installFramework(id: string, name: string): Promise<void> {
    const pluginDir = path.join(os.tmpdir(), `framework-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(pluginDir, { recursive: true });

    await fs.writeFile(
      path.join(pluginDir, 'manifest.json'),
      JSON.stringify({
        id,
        type: 'framework',
        name,
        version: '1.0.0',
        description: 'Test framework'
      })
    );

    await installer.install(pluginDir);
    await fs.rm(pluginDir, { recursive: true, force: true });
  }

  /**
   * Helper to create a project in a framework
   */
  async function createProject(frameworkId: string, projectId: string, phase?: string): Promise<void> {
    const projectPath = path.join(testDir, 'frameworks', frameworkId, 'projects', projectId);
    await fs.mkdir(projectPath, { recursive: true });

    const metadata = {
      framework: frameworkId,
      id: projectId,
      type: 'project',
      status: 'active',
      phase: phase || 'Construction',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedWork: []
    };

    await fs.writeFile(
      path.join(projectPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
  }

  describe('Inverse Relationship', () => {
    it('should return correct inverse relationships', () => {
      expect(getInverseRelationship('promotes')).toBe('promoted-by');
      expect(getInverseRelationship('promoted-by')).toBe('promotes');
      expect(getInverseRelationship('implements')).toBe('implemented-by');
      expect(getInverseRelationship('blocks')).toBe('blocked-by');
      expect(getInverseRelationship('depends-on')).toBe('required-by');
      expect(getInverseRelationship('relates-to')).toBe('relates-to');
    });
  });

  describe('Link Work Items', () => {
    beforeEach(async () => {
      await installFramework('sdlc-complete', 'SDLC Complete');
      await installFramework('marketing-flow', 'Marketing Flow');
      await createProject('sdlc-complete', 'plugin-system');
      await createProject('marketing-flow', 'plugin-launch');
    });

    it('should link two work items across frameworks', async () => {
      const result = await ops.linkWork(
        'sdlc-complete', 'plugin-system',
        'marketing-flow', 'plugin-launch',
        'promotes'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify source link
      const sourceLinks = await ops.listLinks('sdlc-complete', 'plugin-system');
      expect(sourceLinks).toHaveLength(1);
      expect(sourceLinks[0].framework).toBe('marketing-flow');
      expect(sourceLinks[0].id).toBe('plugin-launch');
      expect(sourceLinks[0].relationship).toBe('promotes');

      // Verify target link (inverse)
      const targetLinks = await ops.listLinks('marketing-flow', 'plugin-launch');
      expect(targetLinks).toHaveLength(1);
      expect(targetLinks[0].framework).toBe('sdlc-complete');
      expect(targetLinks[0].id).toBe('plugin-system');
      expect(targetLinks[0].relationship).toBe('promoted-by');
    });

    it('should fail when source framework not installed', async () => {
      const result = await ops.linkWork(
        'non-existent', 'project',
        'marketing-flow', 'plugin-launch',
        'promotes'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not installed');
    });

    it('should fail when target framework not installed', async () => {
      const result = await ops.linkWork(
        'sdlc-complete', 'plugin-system',
        'non-existent', 'project',
        'promotes'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not installed');
    });

    it('should fail when source work item not found', async () => {
      const result = await ops.linkWork(
        'sdlc-complete', 'non-existent',
        'marketing-flow', 'plugin-launch',
        'promotes'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail when target work item not found', async () => {
      const result = await ops.linkWork(
        'sdlc-complete', 'plugin-system',
        'marketing-flow', 'non-existent',
        'promotes'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should prevent duplicate links', async () => {
      // First link
      await ops.linkWork(
        'sdlc-complete', 'plugin-system',
        'marketing-flow', 'plugin-launch',
        'promotes'
      );

      // Try to link again
      const result = await ops.linkWork(
        'sdlc-complete', 'plugin-system',
        'marketing-flow', 'plugin-launch',
        'relates-to'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('Unlink Work Items', () => {
    beforeEach(async () => {
      await installFramework('sdlc-complete', 'SDLC Complete');
      await installFramework('marketing-flow', 'Marketing Flow');
      await createProject('sdlc-complete', 'plugin-system');
      await createProject('marketing-flow', 'plugin-launch');

      // Create link
      await ops.linkWork(
        'sdlc-complete', 'plugin-system',
        'marketing-flow', 'plugin-launch',
        'promotes'
      );
    });

    it('should remove link between work items', async () => {
      const result = await ops.unlinkWork(
        'sdlc-complete', 'plugin-system',
        'marketing-flow', 'plugin-launch'
      );

      expect(result.success).toBe(true);

      // Verify links removed
      const sourceLinks = await ops.listLinks('sdlc-complete', 'plugin-system');
      expect(sourceLinks).toHaveLength(0);

      const targetLinks = await ops.listLinks('marketing-flow', 'plugin-launch');
      expect(targetLinks).toHaveLength(0);
    });
  });

  describe('List Links', () => {
    beforeEach(async () => {
      await installFramework('sdlc-complete', 'SDLC Complete');
      await installFramework('marketing-flow', 'Marketing Flow');
      await installFramework('agile-lite', 'Agile Lite');
      await createProject('sdlc-complete', 'plugin-system');
      await createProject('marketing-flow', 'plugin-launch');
      await createProject('agile-lite', 'story-123');

      // Create multiple links
      await ops.linkWork(
        'sdlc-complete', 'plugin-system',
        'marketing-flow', 'plugin-launch',
        'promotes'
      );
      await ops.linkWork(
        'sdlc-complete', 'plugin-system',
        'agile-lite', 'story-123',
        'implements'
      );
    });

    it('should list all links for a work item', async () => {
      const links = await ops.listLinks('sdlc-complete', 'plugin-system');

      expect(links).toHaveLength(2);
      expect(links.map(l => l.framework).sort()).toEqual(['agile-lite', 'marketing-flow']);
    });

    it('should return empty array for work item with no links', async () => {
      await createProject('sdlc-complete', 'isolated-project');

      const links = await ops.listLinks('sdlc-complete', 'isolated-project');

      expect(links).toHaveLength(0);
    });
  });

  describe('List All Work', () => {
    beforeEach(async () => {
      await installFramework('sdlc-complete', 'SDLC Complete');
      await installFramework('marketing-flow', 'Marketing Flow');
      await createProject('sdlc-complete', 'project-a', 'Construction');
      await createProject('sdlc-complete', 'project-b', 'Elaboration');
      await createProject('marketing-flow', 'campaign-1');
    });

    it('should list all work across all frameworks', async () => {
      const allWork = await ops.listAllWork();

      expect(allWork).toHaveLength(3);
      expect(allWork.map(w => `${w.framework}/${w.id}`).sort()).toEqual([
        'marketing-flow/campaign-1',
        'sdlc-complete/project-a',
        'sdlc-complete/project-b'
      ]);
    });

    it('should filter by framework', async () => {
      const sdlcWork = await ops.listAllWork('sdlc-complete');

      expect(sdlcWork).toHaveLength(2);
      expect(sdlcWork.every(w => w.framework === 'sdlc-complete')).toBe(true);
    });
  });

  describe('Visualize Work Graph', () => {
    beforeEach(async () => {
      await installFramework('sdlc-complete', 'SDLC Complete');
      await installFramework('marketing-flow', 'Marketing Flow');
      await createProject('sdlc-complete', 'plugin-system', 'Construction');
      await createProject('marketing-flow', 'plugin-launch');

      await ops.linkWork(
        'sdlc-complete', 'plugin-system',
        'marketing-flow', 'plugin-launch',
        'promotes'
      );
    });

    it('should generate Mermaid diagram', async () => {
      const mermaid = await ops.visualizeWorkGraph();

      expect(mermaid).toContain('graph TD');
      expect(mermaid).toContain('sdlc_complete_plugin_system');
      expect(mermaid).toContain('marketing_flow_plugin_launch');
      expect(mermaid).toContain('promotes');
    });
  });

  describe('Orphaned Link Detection', () => {
    beforeEach(async () => {
      await installFramework('sdlc-complete', 'SDLC Complete');
      await installFramework('marketing-flow', 'Marketing Flow');
      await createProject('sdlc-complete', 'plugin-system');
      await createProject('marketing-flow', 'plugin-launch');

      // Create link
      await ops.linkWork(
        'sdlc-complete', 'plugin-system',
        'marketing-flow', 'plugin-launch',
        'promotes'
      );
    });

    it('should detect orphaned links', async () => {
      // Delete target project (simulate)
      const targetPath = path.join(testDir, 'frameworks', 'marketing-flow', 'projects', 'plugin-launch');
      await fs.rm(targetPath, { recursive: true, force: true });

      const orphaned = await ops.detectOrphanedLinks();

      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].source.framework).toBe('sdlc-complete');
      expect(orphaned[0].source.id).toBe('plugin-system');
      expect(orphaned[0].target.framework).toBe('marketing-flow');
      expect(orphaned[0].target.id).toBe('plugin-launch');
    });

    it('should clean orphaned links', async () => {
      // Delete target project
      const targetPath = path.join(testDir, 'frameworks', 'marketing-flow', 'projects', 'plugin-launch');
      await fs.rm(targetPath, { recursive: true, force: true });

      const cleaned = await ops.cleanOrphanedLinks();

      expect(cleaned).toBe(1);

      // Verify link was removed
      const links = await ops.listLinks('sdlc-complete', 'plugin-system');
      expect(links).toHaveLength(0);
    });
  });

  describe('Archive Work', () => {
    beforeEach(async () => {
      await installFramework('sdlc-complete', 'SDLC Complete');
      await createProject('sdlc-complete', 'completed-project');
    });

    it('should archive a work item', async () => {
      const result = await ops.archiveWork('sdlc-complete', 'completed-project', 'Project complete');

      expect(result).toBe(true);

      // Verify project moved to archive
      const projectPath = path.join(testDir, 'frameworks', 'sdlc-complete', 'projects', 'completed-project');
      await expect(fs.stat(projectPath)).rejects.toThrow();

      // Verify archive exists
      const archiveDir = path.join(testDir, 'frameworks', 'sdlc-complete', 'archive');
      const archiveExists = await fs.stat(archiveDir).then(() => true).catch(() => false);
      expect(archiveExists).toBe(true);
    });

    it('should return false for non-existent work item', async () => {
      const result = await ops.archiveWork('sdlc-complete', 'non-existent', 'Test');

      expect(result).toBe(false);
    });
  });

  describe('Work Summary', () => {
    beforeEach(async () => {
      await installFramework('sdlc-complete', 'SDLC Complete');
      await installFramework('marketing-flow', 'Marketing Flow');
      await createProject('sdlc-complete', 'linked-project');
      await createProject('marketing-flow', 'campaign-1');

      await ops.linkWork(
        'sdlc-complete', 'linked-project',
        'marketing-flow', 'campaign-1',
        'promotes'
      );
    });

    it('should include link count in work summary', async () => {
      const allWork = await ops.listAllWork();
      const linkedProject = allWork.find(w => w.id === 'linked-project');

      expect(linkedProject?.linkCount).toBe(1);
    });
  });
});
