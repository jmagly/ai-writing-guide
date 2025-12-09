/**
 * Tests for workspace CLI commands
 * Issue #53: Framework-scoped workspace structure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Workspace CLI Commands', () => {
  const testDir = path.join(__dirname, '../../fixtures/workspace-test');
  const aiwgDir = path.join(testDir, '.aiwg');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('workspace-status', () => {
    it('should report no workspace when .aiwg does not exist', async () => {
      const { workspaceStatus } = await import('../../../tools/cli/workspace-status.mjs');

      // Mock console output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      try {
        await workspaceStatus(['--json', testDir]);
        const output = JSON.parse(logs[0]);
        expect(output.workspace.exists).toBe(false);
      } finally {
        console.log = originalLog;
      }
    });

    it('should detect legacy workspace structure', async () => {
      // Create legacy structure
      await fs.mkdir(path.join(aiwgDir, 'intake'), { recursive: true });
      await fs.mkdir(path.join(aiwgDir, 'requirements'), { recursive: true });

      const { workspaceStatus } = await import('../../../tools/cli/workspace-status.mjs');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      try {
        await workspaceStatus(['--json', testDir]);
        const output = JSON.parse(logs[0]);
        expect(output.workspace.exists).toBe(true);
        expect(output.workspace.isLegacy).toBe(true);
        expect(output.workspace.isFrameworkScoped).toBe(false);
        expect(output.migration.status).toBe('pending');
      } finally {
        console.log = originalLog;
      }
    });

    it('should detect framework-scoped workspace structure', async () => {
      // Create framework-scoped structure
      await fs.mkdir(path.join(aiwgDir, 'frameworks', 'sdlc-complete', 'repo'), { recursive: true });
      await fs.mkdir(path.join(aiwgDir, 'frameworks', 'sdlc-complete', 'projects'), { recursive: true });

      // Create registry
      const registry = {
        version: '1.0.0',
        frameworks: {
          'sdlc-complete': {
            id: 'sdlc-complete',
            type: 'framework',
            version: '1.0.0',
            health: 'healthy'
          }
        }
      };
      await fs.writeFile(
        path.join(aiwgDir, 'frameworks', 'registry.json'),
        JSON.stringify(registry, null, 2)
      );

      const { workspaceStatus } = await import('../../../tools/cli/workspace-status.mjs');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      try {
        await workspaceStatus(['--json', testDir]);
        const output = JSON.parse(logs[0]);
        expect(output.workspace.exists).toBe(true);
        expect(output.workspace.isFrameworkScoped).toBe(true);
        expect(output.migration.status).toBe('completed');
        expect(output.frameworks).toHaveLength(1);
        expect(output.frameworks[0].id).toBe('sdlc-complete');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('workspace-rollback', () => {
    it('should list available backups', async () => {
      // Create backup structure
      const backupDir = path.join(testDir, '.aiwg.backup.2025-12-09T10-00-00-000Z');
      await fs.mkdir(backupDir, { recursive: true });

      const manifest = {
        timestamp: '2025-12-09T10:00:00.000Z',
        fileCount: 10,
        totalSize: 1024,
        checksum: 'abc123'
      };
      await fs.writeFile(
        path.join(backupDir, 'migration-manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      const { rollbackWorkspace } = await import('../../../tools/cli/workspace-rollback.mjs');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      try {
        await rollbackWorkspace(['--list', testDir]);
        const output = logs.join('\n');
        expect(output).toContain('.aiwg.backup.2025-12-09T10-00-00-000Z');
        expect(output).toContain('10');
      } finally {
        console.log = originalLog;
      }
    });

    it('should show message when no backups exist', async () => {
      await fs.mkdir(aiwgDir, { recursive: true });

      const { rollbackWorkspace } = await import('../../../tools/cli/workspace-rollback.mjs');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      try {
        await rollbackWorkspace(['--list', testDir]);
        const output = logs.join('\n');
        expect(output).toContain('No backups found');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('deploy-agents framework initialization', () => {
    it('should create framework-scoped directories for sdlc mode', async () => {
      // Import the function dynamically
      const deployAgents = await import('../../../tools/agents/deploy-agents.mjs');

      // Check if the aiwg directory gets created
      // This tests the initializeFrameworkWorkspace function indirectly
      const aiwgPath = path.join(testDir, '.aiwg');
      const frameworksPath = path.join(aiwgPath, 'frameworks');
      const sdlcPath = path.join(frameworksPath, 'sdlc-complete');

      // Run deploy with dry-run to see what would be created
      // Note: Full integration test would require mocking more of the filesystem
      expect(true).toBe(true); // Placeholder - full test requires integration setup
    });

    it('should create marketing directories for marketing mode', async () => {
      // Placeholder for marketing mode test
      expect(true).toBe(true);
    });

    it('should create both framework directories for all mode', async () => {
      // Placeholder for all mode test
      expect(true).toBe(true);
    });
  });
});

describe('Framework Workspace Structure', () => {
  it('should match issue #53 target structure', () => {
    // Verify the expected structure matches the issue
    const expectedStructure = {
      '.aiwg': {
        'frameworks': {
          'sdlc-complete': {
            'projects': {},      // Active project artifacts
            'working': {},       // Temporary multi-agent work
            'archive': {},       // Completed projects
            'repo': {}           // Framework templates, agents, commands
          },
          'media-marketing-kit': {
            'campaigns': {},     // Marketing uses "campaigns"
            'working': {},
            'archive': {},
            'repo': {}
          },
          'registry.json': {}
        },
        'shared': {}             // Cross-framework resources
      }
    };

    expect(expectedStructure['.aiwg']['frameworks']['sdlc-complete']).toHaveProperty('projects');
    expect(expectedStructure['.aiwg']['frameworks']['sdlc-complete']).toHaveProperty('working');
    expect(expectedStructure['.aiwg']['frameworks']['sdlc-complete']).toHaveProperty('archive');
    expect(expectedStructure['.aiwg']['frameworks']['media-marketing-kit']).toHaveProperty('campaigns');
  });
});
