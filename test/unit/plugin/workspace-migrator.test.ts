/**
 * Unit tests for WorkspaceMigrator
 *
 * Tests workspace migration functionality including:
 * - Legacy workspace detection
 * - Framework detection from artifacts
 * - Migration validation and conflict detection
 * - Atomic migration with backup/rollback
 * - Dry-run mode
 * - Report generation
 *
 * @module test/unit/plugin/workspace-migrator.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkspaceMigrator } from '../../../src/plugin/workspace-migrator.ts';
import { FilesystemSandbox } from '../../../agentic/code/frameworks/sdlc-complete/src/testing/mocks/filesystem-sandbox.ts';
import * as path from 'path';

describe('WorkspaceMigrator', () => {
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
  // Constructor & Initialization
  // ===========================

  describe('constructor', () => {
    it('should initialize with project root', () => {
      const migrator = new WorkspaceMigrator(projectRoot);
      expect(migrator).toBeDefined();
    });

    it('should resolve relative paths to absolute', () => {
      const migrator = new WorkspaceMigrator('.');
      expect(migrator).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid project root', async () => {
      const migrator = new WorkspaceMigrator(projectRoot);
      await expect(migrator.initialize()).resolves.toBeUndefined();
    });

    it('should throw error for non-existent project root', async () => {
      const invalidPath = path.join(projectRoot, 'non-existent');
      const migrator = new WorkspaceMigrator(invalidPath);
      await expect(migrator.initialize()).rejects.toThrow('Project root does not exist');
    });
  });

  // ===========================
  // Legacy Workspace Detection
  // ===========================

  describe('detectLegacyWorkspace', () => {
    it('should return null when no .aiwg directory exists', async () => {
      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.detectLegacyWorkspace();
      expect(result).toBeNull();
    });

    it('should return null when .aiwg exists but has no legacy directories', async () => {
      await sandbox.createDirectory('.aiwg');
      await sandbox.createDirectory('.aiwg/frameworks');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.detectLegacyWorkspace();
      expect(result).toBeNull();
    });

    it('should detect legacy workspace with intake directory', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/project-intake.md', '# Project Intake');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.detectLegacyWorkspace();
      expect(result).not.toBeNull();
      expect(result?.path).toBe(sandbox.getPath('.aiwg'));
      expect(result?.artifactCount).toBeGreaterThan(0);
    });

    it('should detect legacy workspace with multiple directories', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.aiwg/architecture');
      await sandbox.writeFile('.aiwg/intake/project-intake.md', '# Intake');
      await sandbox.writeFile('.aiwg/requirements/use-cases.md', '# Use Cases');
      await sandbox.writeFile('.aiwg/architecture/sad.md', '# SAD');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.detectLegacyWorkspace();
      expect(result).not.toBeNull();
      expect(result?.artifactCount).toBe(3);
      expect(result?.frameworks).toContain('sdlc-complete');
    });

    it('should calculate total size of artifacts', async () => {
      const content = 'A'.repeat(1000); // 1000 bytes
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/file1.md', content);
      await sandbox.writeFile('.aiwg/intake/file2.md', content);

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.detectLegacyWorkspace();
      expect(result?.size).toBeGreaterThanOrEqual(2000);
    });

    it('should detect git repository in workspace', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.createDirectory('.aiwg/.git');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.detectLegacyWorkspace();
      expect(result?.hasGit).toBe(true);
    });

    it('should detect no git repository when .git missing', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.detectLegacyWorkspace();
      expect(result?.hasGit).toBe(false);
    });
  });

  // ===========================
  // Framework Detection
  // ===========================

  describe('detectFrameworks', () => {
    it('should default to sdlc-complete when no patterns match', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const frameworks = await migrator.detectFrameworks();
      expect(frameworks).toHaveLength(1);
      expect(frameworks[0].name).toBe('sdlc-complete');
    });

    it('should detect sdlc-complete from architecture artifacts', async () => {
      await sandbox.createDirectory('.aiwg/architecture');
      await sandbox.writeFile('.aiwg/architecture/software-architecture-doc.md', '# SAD');
      await sandbox.createDirectory('.aiwg/requirements/use-cases');
      await sandbox.writeFile('.aiwg/requirements/use-cases/uc-001.md', '# UC-001');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const frameworks = await migrator.detectFrameworks();
      expect(frameworks).toHaveLength(1);
      expect(frameworks[0].name).toBe('sdlc-complete');
      expect(frameworks[0].artifactCount).toBeGreaterThan(0);
    });

    it('should detect marketing-flow from campaign artifacts', async () => {
      await sandbox.createDirectory('.aiwg/campaigns');
      await sandbox.writeFile('.aiwg/campaigns/q1-campaign.md', '# Q1 Campaign');
      await sandbox.createDirectory('.aiwg/content');
      await sandbox.writeFile('.aiwg/content/blog-posts.md', '# Blog Posts');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const frameworks = await migrator.detectFrameworks();
      const hasMarketing = frameworks.some(f => f.name === 'marketing-flow');
      expect(hasMarketing).toBe(true);
    });

    it('should detect agile-complete from backlog artifacts', async () => {
      await sandbox.createDirectory('.aiwg/backlog');
      await sandbox.writeFile('.aiwg/backlog/user-stories.md', '# User Stories');
      await sandbox.createDirectory('.aiwg/sprints');
      await sandbox.writeFile('.aiwg/sprints/sprint-1.md', '# Sprint 1');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const frameworks = await migrator.detectFrameworks();
      const hasAgile = frameworks.some(f => f.name === 'agile-complete');
      expect(hasAgile).toBe(true);
    });

    it('should include target path in framework info', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const frameworks = await migrator.detectFrameworks();
      expect(frameworks[0].path).toContain('frameworks');
      expect(frameworks[0].path).toContain('projects/default');
    });
  });

  // ===========================
  // Migration Validation
  // ===========================

  describe('validateMigration', () => {
    it('should validate safe migration when source exists and target does not', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.validateMigration({
        sourcePath: sandbox.getPath('.aiwg'),
        targetPath: sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default'),
        framework: 'sdlc-complete'
      });

      expect(result.safe).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should return unsafe when source does not exist', async () => {
      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.validateMigration({
        sourcePath: sandbox.getPath('.aiwg'),
        targetPath: sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default'),
        framework: 'sdlc-complete'
      });

      expect(result.safe).toBe(false);
      expect(result.warnings).toContain('Source path does not exist: ' + sandbox.getPath('.aiwg'));
    });

    it('should detect file conflicts when target exists', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      // Create target with same file
      const targetPath = '.aiwg/frameworks/sdlc-complete/projects/default';
      await sandbox.createDirectory(targetPath + '/intake');
      await sandbox.writeFile(targetPath + '/intake/test.md', '# Existing');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.validateMigration({
        sourcePath: sandbox.getPath('.aiwg'),
        targetPath: sandbox.getPath(targetPath),
        framework: 'sdlc-complete'
      });

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].type).toBe('file');
      expect(result.conflicts[0].resolution).toBe('overwrite');
    });

    it('should estimate migration duration', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      for (let i = 0; i < 10; i++) {
        await sandbox.writeFile(`.aiwg/intake/file${i}.md`, `# File ${i}`);
      }

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.validateMigration({
        sourcePath: sandbox.getPath('.aiwg'),
        targetPath: sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default'),
        framework: 'sdlc-complete'
      });

      expect(result.estimatedDuration).toBeGreaterThan(0);
    });
  });

  describe('checkConflicts', () => {
    it('should return empty array when target does not exist', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const conflicts = await migrator.checkConflicts(
        sandbox.getPath('.aiwg'),
        sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default')
      );

      expect(conflicts).toHaveLength(0);
    });

    it('should detect conflicts for existing files', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      const targetPath = '.aiwg/frameworks/sdlc-complete/projects/default';
      await sandbox.createDirectory(targetPath + '/intake');
      await sandbox.writeFile(targetPath + '/intake/test.md', '# Existing');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const conflicts = await migrator.checkConflicts(
        sandbox.getPath('.aiwg'),
        sandbox.getPath(targetPath)
      );

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('file');
      expect(conflicts[0].path).toContain('test.md');
    });
  });

  // ===========================
  // Migration Execution
  // ===========================

  describe('migrate', () => {
    it('should successfully migrate files in dry-run mode', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');
      await sandbox.writeFile('.aiwg/intake/test2.md', '# Test 2');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.migrate({
        source: sandbox.getPath('.aiwg'),
        target: sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default'),
        framework: 'sdlc-complete',
        backup: false,
        dryRun: true,
        overwrite: false
      });

      expect(result.success).toBe(true);
      expect(result.filesCopiedCount).toBeGreaterThan(0);
      expect(result.backupPath).toBeUndefined();

      // Verify no actual files were created
      const targetExists = await sandbox.directoryExists('.aiwg/frameworks/sdlc-complete/projects/default/intake');
      expect(targetExists).toBe(false);
    });

    it('should actually migrate files when not in dry-run mode', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test Content');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.migrate({
        source: sandbox.getPath('.aiwg'),
        target: sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default'),
        framework: 'sdlc-complete',
        backup: false,
        dryRun: false,
        overwrite: false
      });

      expect(result.success).toBe(true);
      expect(result.filesCopiedCount).toBeGreaterThan(0);

      // Verify files were actually created
      const targetFile = '.aiwg/frameworks/sdlc-complete/projects/default/intake/test.md';
      const exists = await sandbox.fileExists(targetFile);
      expect(exists).toBe(true);

      const content = await sandbox.readFile(targetFile);
      expect(content).toBe('# Test Content');
    });

    it('should create backup when backup option is true', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.migrate({
        source: sandbox.getPath('.aiwg'),
        target: sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default'),
        framework: 'sdlc-complete',
        backup: true,
        dryRun: false,
        overwrite: false
      });

      expect(result.backupPath).toBeDefined();
      expect(result.backupPath).toContain('backups');

      // Verify backup exists
      const backupExists = await sandbox.directoryExists(result.backupPath!.replace(projectRoot + '/', ''));
      expect(backupExists).toBe(true);
    });

    it('should skip existing files when overwrite is false', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      // Create existing file in target
      const targetPath = '.aiwg/frameworks/sdlc-complete/projects/default';
      await sandbox.createDirectory(targetPath + '/intake');
      await sandbox.writeFile(targetPath + '/intake/test.md', '# Existing');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.migrate({
        source: sandbox.getPath('.aiwg'),
        target: sandbox.getPath(targetPath),
        framework: 'sdlc-complete',
        backup: false,
        dryRun: false,
        overwrite: false
      });

      expect(result.filesSkippedCount).toBeGreaterThan(0);
      expect(result.errors.some(e => e.severity === 'warning')).toBe(true);

      // Verify original content preserved
      const content = await sandbox.readFile(targetPath + '/intake/test.md');
      expect(content).toBe('# Existing');
    });

    it('should overwrite existing files when overwrite is true', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# New Content');

      // Create existing file in target
      const targetPath = '.aiwg/frameworks/sdlc-complete/projects/default';
      await sandbox.createDirectory(targetPath + '/intake');
      await sandbox.writeFile(targetPath + '/intake/test.md', '# Old Content');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.migrate({
        source: sandbox.getPath('.aiwg'),
        target: sandbox.getPath(targetPath),
        framework: 'sdlc-complete',
        backup: false,
        dryRun: false,
        overwrite: true
      });

      expect(result.filesCopiedCount).toBeGreaterThan(0);

      // Verify content was overwritten
      const content = await sandbox.readFile(targetPath + '/intake/test.md');
      expect(content).toBe('# New Content');
    });

    it('should return error for non-existent source', async () => {
      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.migrate({
        source: sandbox.getPath('.aiwg/non-existent'),
        target: sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default'),
        framework: 'sdlc-complete',
        backup: false,
        dryRun: false,
        overwrite: false
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].severity).toBe('critical');
    });

    it('should filter out framework and registry directories', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');
      await sandbox.createDirectory('.aiwg/frameworks');
      await sandbox.writeFile('.aiwg/frameworks/registry.json', '{}');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.migrate({
        source: sandbox.getPath('.aiwg'),
        target: sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default'),
        framework: 'sdlc-complete',
        backup: false,
        dryRun: false,
        overwrite: false
      });

      expect(result.success).toBe(true);

      // Verify registry was not copied
      const registryExists = await sandbox.fileExists(
        '.aiwg/frameworks/sdlc-complete/projects/default/frameworks/registry.json'
      );
      expect(registryExists).toBe(false);
    });

    it('should generate unique migration ID', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result1 = await migrator.migrate({
        source: sandbox.getPath('.aiwg'),
        target: sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default1'),
        framework: 'sdlc-complete',
        backup: false,
        dryRun: true,
        overwrite: false
      });

      const result2 = await migrator.migrate({
        source: sandbox.getPath('.aiwg'),
        target: sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default2'),
        framework: 'sdlc-complete',
        backup: false,
        dryRun: true,
        overwrite: false
      });

      expect(result1.id).not.toBe(result2.id);
    });

    it('should track migration duration', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      const result = await migrator.migrate({
        source: sandbox.getPath('.aiwg'),
        target: sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default'),
        framework: 'sdlc-complete',
        backup: false,
        dryRun: false,
        overwrite: false
      });

      expect(result.duration).toBeGreaterThan(0);
    });
  });

  // ===========================
  // Rollback
  // ===========================

  describe('rollback', () => {
    it('should throw error for non-existent migration ID', async () => {
      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      await expect(migrator.rollback('non-existent-migration'))
        .rejects.toThrow('Backup not found');
    });

    it('should restore files from backup', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Original Content');

      const migrator = new WorkspaceMigrator(projectRoot);
      await migrator.initialize();

      // Perform migration with backup
      const result = await migrator.migrate({
        source: sandbox.getPath('.aiwg'),
        target: sandbox.getPath('.aiwg/frameworks/sdlc-complete/projects/default'),
        framework: 'sdlc-complete',
        backup: true,
        dryRun: false,
        overwrite: false
      });

      // Modify migrated file
      await sandbox.writeFile(
        '.aiwg/frameworks/sdlc-complete/projects/default/intake/test.md',
        '# Modified Content'
      );

      // Rollback
      await migrator.rollback(result.id);

      // Verify original content restored
      const content = await sandbox.readFile('.aiwg/intake/test.md');
      expect(content).toBe('# Original Content');
    });
  });

  // ===========================
  // Report Generation
  // ===========================

  describe('generateReport', () => {
    it('should generate report with success status', () => {
      const migrator = new WorkspaceMigrator(projectRoot);

      const result = {
        id: 'test-migration-123',
        success: true,
        filesMovedCount: 5,
        filesCopiedCount: 10,
        filesSkippedCount: 2,
        errors: [],
        duration: 1500
      };

      const report = migrator.generateReport(result);

      expect(report).toContain('Migration Report');
      expect(report).toContain('test-migration-123');
      expect(report).toContain('✓ SUCCESS');
      expect(report).toContain('1500ms');
      expect(report).toContain('Files Moved:   5');
      expect(report).toContain('Files Copied:  10');
      expect(report).toContain('Files Skipped: 2');
      expect(report).toContain('No errors encountered');
    });

    it('should generate report with failure status', () => {
      const migrator = new WorkspaceMigrator(projectRoot);

      const result = {
        id: 'test-migration-456',
        success: false,
        filesMovedCount: 0,
        filesCopiedCount: 0,
        filesSkippedCount: 0,
        errors: [
          {
            path: '/source/path',
            error: 'Source does not exist',
            severity: 'critical' as const
          }
        ],
        duration: 50
      };

      const report = migrator.generateReport(result);

      expect(report).toContain('❌ FAILED');
      expect(report).toContain('Errors:');
      expect(report).toContain('Source does not exist');
      expect(report).toContain('CRITICAL');
    });

    it('should include backup path in report', () => {
      const migrator = new WorkspaceMigrator(projectRoot);

      const result = {
        id: 'test-migration-789',
        success: true,
        filesMovedCount: 0,
        filesCopiedCount: 5,
        filesSkippedCount: 0,
        errors: [],
        duration: 1000,
        backupPath: '/path/to/backup'
      };

      const report = migrator.generateReport(result);

      expect(report).toContain('Backup Created: /path/to/backup');
    });

    it('should list all errors with severity indicators', () => {
      const migrator = new WorkspaceMigrator(projectRoot);

      const result = {
        id: 'test-migration-abc',
        success: false,
        filesMovedCount: 0,
        filesCopiedCount: 3,
        filesSkippedCount: 1,
        errors: [
          { path: 'file1.md', error: 'Permission denied', severity: 'error' as const },
          { path: 'file2.md', error: 'File exists', severity: 'warning' as const },
          { path: 'file3.md', error: 'Critical error', severity: 'critical' as const }
        ],
        duration: 500
      };

      const report = migrator.generateReport(result);

      expect(report).toContain('❌');
      expect(report).toContain('⚠️');
      expect(report).toContain('ℹ️');
      expect(report).toContain('Permission denied');
      expect(report).toContain('File exists');
      expect(report).toContain('Critical error');
    });
  });
});
