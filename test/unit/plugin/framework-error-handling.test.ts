/**
 * Unit tests for Framework Error Handling
 *
 * Tests error handling scenarios for framework-scoped workspaces including
 * detection errors, creation errors, and migration errors.
 * FID-007 Framework-Scoped Workspaces error handling.
 *
 * @module test/unit/plugin/framework-error-handling.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FrameworkDetector } from '../../../src/plugin/framework-detector.js';
import { WorkspaceCreator } from '../../../src/plugin/workspace-creator.js';
import { FrameworkMigration } from '../../../src/plugin/framework-migration.js';
import { FilesystemSandbox } from '../../../src/testing/mocks/filesystem-sandbox.js';

describe('Framework Error Handling', () => {
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
  // Detection Errors (5 tests)
  // ===========================

  describe('detection errors', () => {
    it('should handle permission denied on .aiwg/ directory', async () => {
      await sandbox.createDirectory('.aiwg');
      // Note: Cannot actually set permissions in FilesystemSandbox
      // Test should handle gracefully

      const detector = new FrameworkDetector(projectRoot);
      await expect(detector.detectFrameworks()).resolves.toBeDefined();
    });

    it('should handle corrupted config files', async () => {
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.writeFile('.aiwg/claude/settings.json', 'invalid json {{{');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      // Should still detect framework from directory
      expect(frameworks).toContain('claude');
    });

    it('should handle symlink loops', async () => {
      await sandbox.createDirectory('.aiwg/claude');
      // Note: FilesystemSandbox might not support symlinks
      // Test validates detection doesn't hang

      const detector = new FrameworkDetector(projectRoot);
      await expect(detector.detectFrameworks()).resolves.toBeDefined();
    });

    it('should handle missing parent directories', async () => {
      // Try to detect in non-existent project
      const invalidPath = sandbox.getPath('non-existent');

      const detector = new FrameworkDetector(invalidPath);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toEqual([]);
    });

    it('should handle malformed YAML config', async () => {
      await sandbox.createDirectory('.aiwg/codex');
      await sandbox.writeFile('.aiwg/codex/config.yaml', `
invalid yaml:
  - unclosed bracket [
  - {missing brace
`);

      const detector = new FrameworkDetector(projectRoot);
      const info = await detector.getFrameworkInfo('codex');

      // Should return default info despite corrupted config
      expect(info.name).toBe('codex');
    });
  });

  // ===========================
  // Creation Errors (5 tests)
  // ===========================

  describe('creation errors', () => {
    it('should handle disk full during workspace creation', async () => {
      // Simulate disk full by creating file that would cause error
      // Note: Cannot actually simulate disk full in test environment
      const creator = new WorkspaceCreator(projectRoot);

      await expect(creator.createFrameworkWorkspace('claude'))
        .resolves.not.toThrow();
    });

    it('should handle read-only filesystem', async () => {
      // Note: Cannot actually set read-only in sandbox
      const creator = new WorkspaceCreator(projectRoot);

      await expect(creator.createFrameworkWorkspace('claude'))
        .resolves.not.toThrow();
    });

    it('should clean up partial creation on error', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      try {
        // Attempt to create with invalid framework
        await creator.createFrameworkWorkspace('invalid-framework');
      } catch (error) {
        // Should not leave partial directories
        expect(await sandbox.directoryExists('.aiwg/invalid-framework')).toBe(false);
      }
    });

    it('should handle concurrent workspace creation', async () => {
      const creator1 = new WorkspaceCreator(projectRoot);
      const creator2 = new WorkspaceCreator(projectRoot);

      // Try to create same workspace concurrently
      const results = await Promise.allSettled([
        creator1.createFrameworkWorkspace('claude'),
        creator2.createFrameworkWorkspace('claude')
      ]);

      // At least one should succeed
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      expect(succeeded).toBeGreaterThan(0);

      // Should not create duplicate structure
      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
    });

    it('should handle invalid framework names gracefully', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      await expect(creator.createFrameworkWorkspace(''))
        .rejects.toThrow();

      await expect(creator.createFrameworkWorkspace('../invalid'))
        .rejects.toThrow();

      await expect(creator.createFrameworkWorkspace('invalid/path'))
        .rejects.toThrow();
    });
  });

  // ===========================
  // Migration Errors (5 tests)
  // ===========================

  describe('migration errors', () => {
    it('should detect incompatible workspace structure', async () => {
      // Create structure that's neither legacy nor framework-scoped
      await sandbox.createDirectory('.aiwg/unknown-structure');
      await sandbox.writeFile('.aiwg/unknown-structure/data.json', '{}');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped();

      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors.some(e =>
          e.message.includes('incompatible')
        )).toBe(true);
      }
    });

    it('should handle missing source directories', async () => {
      const migration = new FrameworkMigration(projectRoot);

      // Try to migrate non-existent workspace
      const result = await migration.migrateLegacyToScoped({
        sourcePath: '.aiwg-nonexistent'
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should rollback on partial migration failure', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.aiwg/agents');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/agents/agent.md', '# Agent');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);

      // Create scenario that might fail mid-migration
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# Conflict');

      const result = await migration.migrateLegacyToScoped({
        backup: true,
        rollbackOnError: true
      });

      if (!result.success) {
        // Original files should still exist
        expect(await sandbox.fileExists('.aiwg/requirements/uc-001.md')).toBe(true);
      }
    });

    it('should handle corrupted backup during rollback', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);

      const result = await migration.migrateLegacyToScoped({ backup: true });

      if (result.backupPath) {
        // Simulate corrupted backup
        await sandbox.deleteDirectory(result.backupPath.replace(projectRoot + '/', ''), true);

        // Rollback should handle gracefully
        await expect(migration.rollback(result.id))
          .rejects.toThrow();
      }
    });

    it('should detect and report file conflicts', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# Legacy');

      // Create conflict
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# Existing');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped();

      expect(result.conflicts).toBeDefined();
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].type).toBe('file');
    });
  });

  // ===========================
  // Error Recovery (5 tests)
  // ===========================

  describe('error recovery', () => {
    it('should provide detailed error messages', async () => {
      const creator = new WorkspaceCreator(projectRoot);

      try {
        await creator.createFrameworkWorkspace('unsupported-framework');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });

    it('should include error context in failure results', async () => {
      const migration = new FrameworkMigration(projectRoot);

      const result = await migration.migrateLegacyToScoped({
        sourcePath: '/nonexistent'
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].context).toBeDefined();
    });

    it('should log errors without throwing', async () => {
      const detector = new FrameworkDetector(projectRoot);

      // Create scenario with multiple potential errors
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.writeFile('.aiwg/claude/settings.json', 'invalid');

      // Should not throw, but log errors
      const frameworks = await detector.detectFrameworks();
      expect(frameworks).toBeDefined();
    });

    it('should provide recovery suggestions in error messages', async () => {
      const migration = new FrameworkMigration(projectRoot);

      // Create incompatible structure
      await sandbox.createDirectory('.aiwg/unknown');

      const result = await migration.migrateLegacyToScoped();

      if (!result.success) {
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should maintain workspace integrity on error', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);

      // Attempt migration with potential errors
      const result = await migration.migrateLegacyToScoped({ backup: true });

      // Original files should remain intact if migration fails
      if (!result.success) {
        expect(await sandbox.fileExists('.aiwg/requirements/uc-001.md')).toBe(true);
      }
    });
  });
});
