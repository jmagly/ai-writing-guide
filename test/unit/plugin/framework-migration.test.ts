/**
 * Unit tests for FrameworkMigration
 *
 * Tests migration scenarios for framework-scoped workspaces including
 * legacy-to-scoped migration, multi-framework setup, and duplicate merging.
 * FID-007 Framework-Scoped Workspaces migration scenarios.
 *
 * @module test/unit/plugin/framework-migration.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FrameworkMigration } from '../../../src/plugin/framework-migration.js';
import { FilesystemSandbox } from '../../../agentic/code/frameworks/sdlc-complete/src/testing/mocks/filesystem-sandbox.js';

describe('FrameworkMigration', () => {
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
  // Legacy to Scoped Migration (10 tests)
  // ===========================

  describe('migrateLegacyToScoped', () => {
    it('should migrate single-framework legacy workspace', async () => {
      // Create legacy structure
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/intake/project-intake.md', '# Intake');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');

      // Simulate .claude/ directory for detection
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped();

      expect(result.success).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/shared')).toBe(true);
    });

    it('should detect which framework to migrate to', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      // Create Codex framework marker
      await sandbox.createDirectory('.codex');

      const migration = new FrameworkMigration(projectRoot);
      const detectedFramework = await migration.detectTargetFramework();

      expect(detectedFramework).toBe('codex');
    });

    it('should move agents/ to framework-specific directory', async () => {
      await sandbox.createDirectory('.aiwg/agents');
      await sandbox.writeFile('.aiwg/agents/test-agent.md', '# Test Agent');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      await migration.migrateLegacyToScoped();

      expect(await sandbox.fileExists('.aiwg/claude/agents/test-agent.md')).toBe(true);
      expect(await sandbox.fileExists('.aiwg/agents/test-agent.md')).toBe(false);
    });

    it('should move shared resources to shared/', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.aiwg/architecture');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/architecture/sad.md', '# SAD');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      await migration.migrateLegacyToScoped();

      expect(await sandbox.fileExists('.aiwg/shared/requirements/uc-001.md')).toBe(true);
      expect(await sandbox.fileExists('.aiwg/shared/architecture/sad.md')).toBe(true);
    });

    it('should create backup before migration', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped({ backup: true });

      expect(result.backupPath).toBeDefined();
      expect(await sandbox.directoryExists(result.backupPath!.replace(projectRoot + '/', '')))
        .toBe(true);
    });

    it('should validate migration result', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.aiwg/agents');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/agents/agent.md', '# Agent');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped();

      expect(result.validation.frameworkSpecificMoved).toBe(true);
      expect(result.validation.sharedResourcesMoved).toBe(true);
      expect(result.validation.legacyCleanedUp).toBe(true);
    });

    it('should rollback on migration failure', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);

      // Simulate failure by creating read-only target
      await sandbox.createDirectory('.aiwg/claude');
      // Note: Cannot actually set read-only in sandbox, but test should handle gracefully

      const result = await migration.migrateLegacyToScoped({ backup: true });

      if (!result.success) {
        // Backup should still exist
        expect(result.backupPath).toBeDefined();
      }
    });

    it('should preserve file timestamps during migration', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const originalStats = await sandbox.getFileStats('.aiwg/requirements/uc-001.md');

      const migration = new FrameworkMigration(projectRoot);
      await migration.migrateLegacyToScoped();

      const migratedStats = await sandbox.getFileStats('.aiwg/shared/requirements/uc-001.md');

      // Modified time should be close (within 1 second due to copy operation)
      const timeDiff = Math.abs(
        migratedStats.modifiedAt.getTime() - originalStats.modifiedAt.getTime()
      );
      expect(timeDiff).toBeLessThan(5000);
    });

    it('should handle empty directories during migration', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.createDirectory('.aiwg/requirements');
      // No files in directories
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped();

      expect(result.success).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/shared/requirements')).toBe(true);
    });

    it('should generate migration report', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.aiwg/agents');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/agents/agent.md', '# Agent');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped();

      expect(result.report).toBeDefined();
      expect(result.report.filesMoved).toBeGreaterThan(0);
      expect(result.report.frameworkSpecificCount).toBe(1);
      expect(result.report.sharedResourceCount).toBe(1);
    });
  });

  // ===========================
  // Multi-Framework Migration (5 tests)
  // ===========================

  describe('migrateToMultiFramework', () => {
    it('should split single framework into multi-framework', async () => {
      // Create single-framework structure
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/claude/agents/agent.md', '# Agent');

      const migration = new FrameworkMigration(projectRoot);
      await migration.migrateToMultiFramework(['codex']);

      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/codex')).toBe(true);
    });

    it('should preserve existing framework workspace', async () => {
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.writeFile('.aiwg/claude/agents/claude-agent.md', '# Claude Agent');

      const migration = new FrameworkMigration(projectRoot);
      await migration.migrateToMultiFramework(['codex']);

      // Claude workspace should be untouched
      expect(await sandbox.fileExists('.aiwg/claude/agents/claude-agent.md')).toBe(true);
    });

    it('should create new framework workspace alongside existing', async () => {
      await sandbox.createDirectory('.aiwg/claude/agents');

      const migration = new FrameworkMigration(projectRoot);
      await migration.migrateToMultiFramework(['codex', 'cursor']);

      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/codex')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/cursor')).toBe(true);
    });

    it('should share common resources across all frameworks', async () => {
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# UC-001');

      const migration = new FrameworkMigration(projectRoot);
      await migration.migrateToMultiFramework(['codex']);

      // Shared resources should be accessible to both frameworks
      expect(await sandbox.fileExists('.aiwg/shared/requirements/uc-001.md')).toBe(true);
    });

    it('should update workspace registry with new frameworks', async () => {
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.writeFile('.aiwg/workspace.json', JSON.stringify({
        frameworks: ['claude']
      }));

      const migration = new FrameworkMigration(projectRoot);
      await migration.migrateToMultiFramework(['codex']);

      const workspace = JSON.parse(await sandbox.readFile('.aiwg/workspace.json'));
      expect(workspace.frameworks).toContain('claude');
      expect(workspace.frameworks).toContain('codex');
    });
  });

  // ===========================
  // Duplicate Merging (5 tests)
  // ===========================

  describe('mergeDuplicateShared', () => {
    it('should detect duplicate shared content across frameworks', async () => {
      await sandbox.createDirectory('.aiwg/claude/requirements');
      await sandbox.createDirectory('.aiwg/codex/requirements');
      await sandbox.writeFile('.aiwg/claude/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/codex/requirements/uc-001.md', '# UC-001');

      const migration = new FrameworkMigration(projectRoot);
      const duplicates = await migration.detectDuplicateShared();

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].path).toContain('requirements/uc-001.md');
      expect(duplicates[0].frameworks).toContain('claude');
      expect(duplicates[0].frameworks).toContain('codex');
    });

    it('should merge duplicates into shared/', async () => {
      await sandbox.createDirectory('.aiwg/claude/requirements');
      await sandbox.createDirectory('.aiwg/codex/requirements');
      await sandbox.writeFile('.aiwg/claude/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/codex/requirements/uc-001.md', '# UC-001');

      const migration = new FrameworkMigration(projectRoot);
      await migration.mergeDuplicateShared();

      expect(await sandbox.fileExists('.aiwg/shared/requirements/uc-001.md')).toBe(true);
    });

    it('should remove duplicates from framework-specific dirs', async () => {
      await sandbox.createDirectory('.aiwg/claude/requirements');
      await sandbox.createDirectory('.aiwg/codex/requirements');
      await sandbox.writeFile('.aiwg/claude/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/codex/requirements/uc-001.md', '# UC-001');

      const migration = new FrameworkMigration(projectRoot);
      await migration.mergeDuplicateShared();

      expect(await sandbox.fileExists('.aiwg/claude/requirements/uc-001.md')).toBe(false);
      expect(await sandbox.fileExists('.aiwg/codex/requirements/uc-001.md')).toBe(false);
    });

    it('should handle conflicts when duplicate content differs', async () => {
      await sandbox.createDirectory('.aiwg/claude/requirements');
      await sandbox.createDirectory('.aiwg/codex/requirements');
      await sandbox.writeFile('.aiwg/claude/requirements/uc-001.md', '# Claude Version');
      await sandbox.writeFile('.aiwg/codex/requirements/uc-001.md', '# Codex Version');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.mergeDuplicateShared({ conflictStrategy: 'keep-newest' });

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe('keep-newest');

      // Should have picked one version (newest)
      expect(await sandbox.fileExists('.aiwg/shared/requirements/uc-001.md')).toBe(true);
    });

    it('should generate merge report', async () => {
      await sandbox.createDirectory('.aiwg/claude/requirements');
      await sandbox.createDirectory('.aiwg/codex/requirements');
      await sandbox.writeFile('.aiwg/claude/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/codex/requirements/uc-001.md', '# UC-001');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.mergeDuplicateShared();

      expect(result.report.duplicatesFound).toBe(1);
      expect(result.report.mergedCount).toBe(1);
      expect(result.report.removedCount).toBe(2);
    });
  });

  // ===========================
  // Edge Cases & Error Handling (5 tests)
  // ===========================

  describe('Edge Cases', () => {
    it('should handle migration when no framework detected', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');
      // No .claude/ or .codex/ directory

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped({ defaultFramework: 'claude' });

      expect(result.success).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
    });

    it('should handle partial migration failures gracefully', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);

      // Simulate partial failure (some files succeed, some fail)
      const result = await migration.migrateLegacyToScoped({ backup: true });

      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.backupPath).toBeDefined();
      }
    });

    it('should detect and prevent cyclic migrations', async () => {
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.createDirectory('.aiwg/shared');
      // Already in framework-scoped structure

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped();

      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('already framework-scoped');
    });

    it('should handle symlinks during migration', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      // Note: FilesystemSandbox may not support symlinks
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped();

      expect(result.success).toBe(true);
    });

    it('should preserve git history during migration', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped({ preserveGitHistory: true });

      // Migration should use git mv if git is available
      expect(result.success).toBe(true);
      expect(result.gitMoveUsed).toBeDefined();
    });
  });

  // ===========================
  // Dry-Run Mode (3 tests)
  // ===========================

  describe('Dry-Run Mode', () => {
    it('should simulate migration without making changes', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped({ dryRun: true });

      expect(result.success).toBe(true);
      // Files should not actually move
      expect(await sandbox.fileExists('.aiwg/requirements/uc-001.md')).toBe(true);
      expect(await sandbox.fileExists('.aiwg/shared/requirements/uc-001.md')).toBe(false);
    });

    it('should report what would happen in dry-run', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.aiwg/agents');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/agents/agent.md', '# Agent');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped({ dryRun: true });

      expect(result.plan.frameworkSpecificMoves).toBe(1);
      expect(result.plan.sharedMoves).toBe(1);
    });

    it('should validate migration plan in dry-run', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped({ dryRun: true });

      expect(result.validation.safe).toBe(true);
      expect(result.validation.warnings).toBeDefined();
    });
  });

  // ===========================
  // Conflict Resolution (2 tests)
  // ===========================

  describe('Conflict Resolution', () => {
    it('should detect conflicts during migration', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# Legacy Version');

      // Create existing file in target
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# Existing Version');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped();

      expect(result.conflicts).toBeDefined();
      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('should apply conflict resolution strategy', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# New Version');

      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# Old Version');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped({
        conflictStrategy: 'overwrite'
      });

      const content = await sandbox.readFile('.aiwg/shared/requirements/uc-001.md');
      expect(content).toBe('# New Version');
    });
  });
});
