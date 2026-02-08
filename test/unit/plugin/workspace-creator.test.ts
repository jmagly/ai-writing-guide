/**
 * Unit tests for WorkspaceCreator
 *
 * Tests workspace creation for framework-scoped workspaces.
 * FID-007 Framework-Scoped Workspaces creation logic.
 *
 * @module test/unit/plugin/workspace-creator.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkspaceCreator } from '../../../src/plugin/workspace-creator.ts';
import { FilesystemSandbox } from '../../../agentic/code/frameworks/sdlc-complete/src/testing/mocks/filesystem-sandbox.ts';

describe('WorkspaceCreator', () => {
  let sandbox: FilesystemSandbox;
  let projectRoot: string;

  beforeEach(async () => {
    sandbox = new FilesystemSandbox();
    await sandbox.initialize();
    projectRoot = sandbox.getPath();
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  // ===========================
  // Framework Workspace Creation
  // ===========================

  describe('createFrameworkWorkspace', () => {
    it('should create workspace structure for all supported frameworks', async () => {
      const creator = new WorkspaceCreator(projectRoot);
      const frameworks = ['claude', 'codex', 'cursor'];

      for (const framework of frameworks) {
        await creator.createFrameworkWorkspace(framework);
        expect(await sandbox.directoryExists(`.aiwg/${framework}`)).toBe(true);
        expect(await sandbox.directoryExists(`.aiwg/${framework}/agents`)).toBe(true);
        expect(await sandbox.directoryExists(`.aiwg/${framework}/commands`)).toBe(true);
      }
    });

    it('should create shared/ directory for all frameworks', async () => {
      const creator = new WorkspaceCreator(projectRoot);
      await creator.createFrameworkWorkspace('claude');

      expect(await sandbox.directoryExists('.aiwg/shared')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/shared/requirements')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/shared/architecture')).toBe(true);
    });

    it('should not overwrite existing framework workspace', async () => {
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.writeFile('.aiwg/claude/settings.json', JSON.stringify({
        custom: 'value'
      }));

      const creator = new WorkspaceCreator(projectRoot);
      await creator.createFrameworkWorkspace('claude');

      // Original file should still exist
      const content = await sandbox.readFile('.aiwg/claude/settings.json');
      expect(JSON.parse(content).custom).toBe('value');
    });

    it('should create default config files for framework', async () => {
      const creator = new WorkspaceCreator(projectRoot);
      await creator.createFrameworkWorkspace('claude');

      expect(await sandbox.fileExists('.aiwg/claude/settings.json')).toBe(true);

      const config = JSON.parse(await sandbox.readFile('.aiwg/claude/settings.json'));
      expect(config.framework).toBe('claude');
      expect(config.version).toBeDefined();
    });

    it('should set correct permissions on created directories', async () => {
      const creator = new WorkspaceCreator(projectRoot);
      await creator.createFrameworkWorkspace('claude');

      const stats = await sandbox.getFileStats('.aiwg/claude');
      expect(stats.isDirectory).toBe(true);
    });

    it('should create framework-specific subdirectories', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      // Claude-specific
      await creator.createFrameworkWorkspace('claude');
      expect(await sandbox.directoryExists('.aiwg/claude/memory')).toBe(true);

      // Codex-specific
      await creator.createFrameworkWorkspace('codex');
      expect(await sandbox.directoryExists('.aiwg/codex/context')).toBe(true);
    });

    it('should create README and .gitignore in framework directory', async () => {
      const creator = new WorkspaceCreator(projectRoot);
      await creator.createFrameworkWorkspace('claude');

      // README
      expect(await sandbox.fileExists('.aiwg/claude/README.md')).toBe(true);
      const readme = await sandbox.readFile('.aiwg/claude/README.md');
      expect(readme).toContain('Claude Framework Workspace');

      // .gitignore
      expect(await sandbox.fileExists('.aiwg/claude/.gitignore')).toBe(true);
      const gitignore = await sandbox.readFile('.aiwg/claude/.gitignore');
      expect(gitignore).toContain('*.log');
      expect(gitignore).toContain('memory/');
    });

    it('should throw error for unsupported framework', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      await expect(creator.createFrameworkWorkspace('unsupported'))
        .rejects.toThrow('Unsupported framework');
    });

    it('should create all standard SDLC subdirs in shared/', async () => {
      const creator = new WorkspaceCreator(projectRoot);
      await creator.createFrameworkWorkspace('claude');

      const expectedDirs = [
        'requirements',
        'architecture',
        'testing',
        'deployment',
        'security',
        'quality'
      ];

      for (const dir of expectedDirs) {
        expect(await sandbox.directoryExists(`.aiwg/shared/${dir}`))
          .toBe(true);
      }
    });

    it('should create workspace for multiple frameworks in sequence', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      await creator.createFrameworkWorkspace('claude');
      await creator.createFrameworkWorkspace('codex');
      await creator.createFrameworkWorkspace('cursor');

      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/codex')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/cursor')).toBe(true);
    });

    it('should create version-specific config', async () => {
      const creator = new WorkspaceCreator(projectRoot);
      await creator.createFrameworkWorkspace('claude', { version: '2.0.0' });

      const config = JSON.parse(await sandbox.readFile('.aiwg/claude/settings.json'));
      expect(config.version).toBe('2.0.0');
    });
  });

  // ===========================
  // Adding Framework to Project
  // ===========================

  describe('addFrameworkToProject', () => {
    it('should add second framework to existing project', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      // Create first framework
      await creator.createFrameworkWorkspace('claude');

      // Add second framework
      await creator.addFrameworkToProject('codex');

      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/codex')).toBe(true);
    });

    it('should reuse shared/ directory when adding framework', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      await creator.createFrameworkWorkspace('claude');
      await sandbox.writeFile('.aiwg/shared/requirements/test.md', '# Test');

      await creator.addFrameworkToProject('codex');

      // Shared file should still exist
      expect(await sandbox.fileExists('.aiwg/shared/requirements/test.md'))
        .toBe(true);

      const content = await sandbox.readFile('.aiwg/shared/requirements/test.md');
      expect(content).toBe('# Test');
    });

    it('should not duplicate shared content', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      await creator.createFrameworkWorkspace('claude');
      await creator.addFrameworkToProject('codex');

      // Should only have one shared directory
      const aiwgContents = await sandbox.listDirectory('.aiwg');
      const sharedCount = aiwgContents.filter(name => name === 'shared').length;
      expect(sharedCount).toBe(1);
    });

    it('should merge configs and update registry when adding framework', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      await creator.createFrameworkWorkspace('claude');
      await sandbox.writeFile('.aiwg/workspace.json', JSON.stringify({
        frameworks: ['claude']
      }));

      // addFrameworkToProject updates both workspace.json and registry.json
      await creator.addFrameworkToProject('codex');

      // Check workspace.json
      const workspaceConfig = JSON.parse(
        await sandbox.readFile('.aiwg/workspace.json')
      );
      expect(workspaceConfig.frameworks).toContain('claude');
      expect(workspaceConfig.frameworks).toContain('codex');

      // Check registry.json
      expect(await sandbox.fileExists('.aiwg/registry.json')).toBe(true);
      const registry = JSON.parse(await sandbox.readFile('.aiwg/registry.json'));
      expect(registry.frameworks).toContain('codex');
    });

    it('should handle adding already-existing framework gracefully', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      await creator.createFrameworkWorkspace('claude');
      await creator.addFrameworkToProject('claude');

      // Should not throw error
      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
    });

    it('should preserve framework-specific files when adding new framework', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      await creator.createFrameworkWorkspace('claude');
      await sandbox.writeFile('.aiwg/claude/agents/custom.md', '# Custom Agent');

      await creator.addFrameworkToProject('codex');

      expect(await sandbox.fileExists('.aiwg/claude/agents/custom.md'))
        .toBe(true);
    });
  });

  // ===========================
  // Workspace Initialization
  // ===========================

  describe('initializeWorkspace', () => {
    it('should initialize empty .aiwg/ structure', async () => {
      const creator = new WorkspaceCreator(projectRoot);
      await creator.initializeWorkspace();

      expect(await sandbox.directoryExists('.aiwg')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/shared')).toBe(true);
    });

    it('should create framework-scoped subdirs based on detected frameworks', async () => {
      // Simulate detected frameworks
      await sandbox.createDirectory('.claude');

      const creator = new WorkspaceCreator(projectRoot);
      await creator.initializeWorkspace({ autoDetect: true });

      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
    });

    it('should create shared/ with standard SDLC subdirs', async () => {
      const creator = new WorkspaceCreator(projectRoot);
      await creator.initializeWorkspace();

      const expectedDirs = [
        'requirements',
        'architecture',
        'planning',
        'testing',
        'deployment',
        'security',
        'quality',
        'risks'
      ];

      for (const dir of expectedDirs) {
        expect(await sandbox.directoryExists(`.aiwg/shared/${dir}`))
          .toBe(true);
      }
    });

    it('should create workspace configuration file', async () => {
      const creator = new WorkspaceCreator(projectRoot);
      await creator.initializeWorkspace();

      expect(await sandbox.fileExists('.aiwg/workspace.json')).toBe(true);

      const config = JSON.parse(await sandbox.readFile('.aiwg/workspace.json'));
      expect(config.version).toBeDefined();
      expect(config.frameworks).toEqual([]);
    });

    it('should not overwrite existing workspace', async () => {
      await sandbox.createDirectory('.aiwg/shared');
      await sandbox.writeFile('.aiwg/workspace.json', JSON.stringify({
        custom: 'data'
      }));

      const creator = new WorkspaceCreator(projectRoot);
      await creator.initializeWorkspace();

      const config = JSON.parse(await sandbox.readFile('.aiwg/workspace.json'));
      expect(config.custom).toBe('data');
    });

    it('should create .gitignore and README in .aiwg/', async () => {
      const creator = new WorkspaceCreator(projectRoot);
      await creator.initializeWorkspace();

      // .gitignore
      expect(await sandbox.fileExists('.aiwg/.gitignore')).toBe(true);
      const gitignore = await sandbox.readFile('.aiwg/.gitignore');
      expect(gitignore).toContain('*.log');
      expect(gitignore).toContain('working/');

      // README
      expect(await sandbox.fileExists('.aiwg/README.md')).toBe(true);
      const readme = await sandbox.readFile('.aiwg/README.md');
      expect(readme).toContain('AIWG Workspace');
    });

    it('should handle permission errors during initialization', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      // Should handle gracefully
      await expect(creator.initializeWorkspace()).resolves.not.toThrow();
    });

    it('should create working/ and reports/ directories', async () => {
      const creator = new WorkspaceCreator(projectRoot);
      await creator.initializeWorkspace();

      // SDLC directories are created under shared/
      expect(await sandbox.directoryExists('.aiwg/shared/working')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/shared/reports')).toBe(true);
    });
  });
});
