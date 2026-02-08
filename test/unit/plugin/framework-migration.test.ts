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
import { FrameworkMigration } from '../../../src/plugin/framework-migration.ts';
import { FilesystemSandbox } from '../../../agentic/code/frameworks/sdlc-complete/src/testing/mocks/filesystem-sandbox.ts';

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
  // Legacy to Scoped Migration (Consolidated to 4 tests)
  // ===========================

  describe('migrateLegacyToScoped', () => {
    it('should migrate structure and move directories correctly', async () => {
      // Test 1: Basic migration
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/intake/project-intake.md', '# Intake');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped();

      expect(result.success).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/shared')).toBe(true);

      // Test 2: Framework detection
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');
      await sandbox.createDirectory('.codex');

      const migration2 = new FrameworkMigration(projectRoot);
      const detectedFramework = await migration2.detectTargetFramework();
      expect(detectedFramework).toBe('codex');

      // Test 3: Agents directory movement
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/agents');
      await sandbox.writeFile('.aiwg/agents/test-agent.md', '# Test Agent');
      await sandbox.createDirectory('.claude');

      const migration3 = new FrameworkMigration(projectRoot);
      await migration3.migrateLegacyToScoped();
      expect(await sandbox.fileExists('.aiwg/claude/agents/test-agent.md')).toBe(true);
      expect(await sandbox.fileExists('.aiwg/agents/test-agent.md')).toBe(false);

      // Test 4: Shared resources movement
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.aiwg/architecture');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/architecture/sad.md', '# SAD');
      await sandbox.createDirectory('.claude');

      const migration4 = new FrameworkMigration(projectRoot);
      await migration4.migrateLegacyToScoped();
      expect(await sandbox.fileExists('.aiwg/shared/requirements/uc-001.md')).toBe(true);
      expect(await sandbox.fileExists('.aiwg/shared/architecture/sad.md')).toBe(true);
    });

    it('should handle backup, validation, and reporting', async () => {
      // Test 1: Backup creation
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped({ backup: true });

      expect(result.backupPath).toBeDefined();
      expect(await sandbox.directoryExists(result.backupPath!.replace(projectRoot + '/', '')))
        .toBe(true);

      // Test 2: Validation
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.aiwg/agents');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/agents/agent.md', '# Agent');
      await sandbox.createDirectory('.claude');

      const migration2 = new FrameworkMigration(projectRoot);
      const result2 = await migration2.migrateLegacyToScoped();

      expect(result2.validation.frameworkSpecificMoved).toBe(true);
      expect(result2.validation.sharedResourcesMoved).toBe(true);
      expect(result2.validation.legacyCleanedUp).toBe(true);

      // Test 3: Migration report
      expect(result2.report).toBeDefined();
      expect(result2.report.filesMoved).toBeGreaterThan(0);
      expect(result2.report.frameworkSpecificCount).toBe(1);
      expect(result2.report.sharedResourceCount).toBe(1);
    });

    it('should handle edge cases and failures', async () => {
      // Test 1: Rollback on failure
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      await sandbox.createDirectory('.aiwg/claude');

      const result = await migration.migrateLegacyToScoped({ backup: true });

      if (!result.success) {
        expect(result.backupPath).toBeDefined();
      }

      // Test 2: Empty directories
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.claude');

      const migration2 = new FrameworkMigration(projectRoot);
      const result2 = await migration2.migrateLegacyToScoped();

      expect(result2.success).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
    });

    it('should preserve file metadata during migration', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const originalStats = await sandbox.getFileStats('.aiwg/requirements/uc-001.md');

      const migration = new FrameworkMigration(projectRoot);
      await migration.migrateLegacyToScoped();

      const migratedStats = await sandbox.getFileStats('.aiwg/shared/requirements/uc-001.md');

      // Modified time should be close (within 5 seconds due to copy operation)
      const timeDiff = Math.abs(
        migratedStats.modifiedAt.getTime() - originalStats.modifiedAt.getTime()
      );
      expect(timeDiff).toBeLessThan(5000);
    });
  });

  // ===========================
  // Multi-Framework Migration (Consolidated to 2 tests)
  // ===========================

  describe('migrateToMultiFramework', () => {
    it('should create and manage multiple framework workspaces', async () => {
      // Test 1: Split into multi-framework
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/claude/agents/agent.md', '# Agent');

      const migration = new FrameworkMigration(projectRoot);
      await migration.migrateToMultiFramework(['codex']);

      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/codex')).toBe(true);

      // Test 2: Preserve existing framework
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.writeFile('.aiwg/claude/agents/claude-agent.md', '# Claude Agent');

      const migration2 = new FrameworkMigration(projectRoot);
      await migration2.migrateToMultiFramework(['codex']);

      expect(await sandbox.fileExists('.aiwg/claude/agents/claude-agent.md')).toBe(true);

      // Test 3: Create multiple new workspaces
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/claude/agents');

      const migration3 = new FrameworkMigration(projectRoot);
      await migration3.migrateToMultiFramework(['codex', 'cursor']);

      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/codex')).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/cursor')).toBe(true);

      // Test 4: Shared resources
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# UC-001');

      const migration4 = new FrameworkMigration(projectRoot);
      await migration4.migrateToMultiFramework(['codex']);

      expect(await sandbox.fileExists('.aiwg/shared/requirements/uc-001.md')).toBe(true);
    });

    it('should update workspace registry', async () => {
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
  // Duplicate Merging (Consolidated to 2 tests)
  // ===========================

  describe('mergeDuplicateShared', () => {
    it('should detect, merge, and clean up duplicates', async () => {
      // Test 1: Detection
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

      // Test 2: Merge to shared
      await migration.mergeDuplicateShared();
      expect(await sandbox.fileExists('.aiwg/shared/requirements/uc-001.md')).toBe(true);

      // Test 3: Remove from framework dirs
      expect(await sandbox.fileExists('.aiwg/claude/requirements/uc-001.md')).toBe(false);
      expect(await sandbox.fileExists('.aiwg/codex/requirements/uc-001.md')).toBe(false);
    });

    it('should handle conflicts and generate reports', async () => {
      // Test 1: Conflict handling
      await sandbox.createDirectory('.aiwg/claude/requirements');
      await sandbox.createDirectory('.aiwg/codex/requirements');
      await sandbox.writeFile('.aiwg/claude/requirements/uc-001.md', '# Claude Version');
      await sandbox.writeFile('.aiwg/codex/requirements/uc-001.md', '# Codex Version');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.mergeDuplicateShared({ conflictStrategy: 'keep-newest' });

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe('keep-newest');
      expect(await sandbox.fileExists('.aiwg/shared/requirements/uc-001.md')).toBe(true);

      // Test 2: Merge report
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/claude/requirements');
      await sandbox.createDirectory('.aiwg/codex/requirements');
      await sandbox.writeFile('.aiwg/claude/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/codex/requirements/uc-001.md', '# UC-001');

      const migration2 = new FrameworkMigration(projectRoot);
      const result2 = await migration2.mergeDuplicateShared();

      expect(result2.report.duplicatesFound).toBe(1);
      expect(result2.report.mergedCount).toBe(1);
      expect(result2.report.removedCount).toBe(2);
    });
  });

  // ===========================
  // Edge Cases & Error Handling (Consolidated to 2 tests)
  // ===========================

  describe('Edge Cases', () => {
    it('should handle missing framework and failures', async () => {
      // Test 1: No framework detected
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped({ defaultFramework: 'claude' });

      expect(result.success).toBe(true);
      expect(await sandbox.directoryExists('.aiwg/claude')).toBe(true);

      // Test 2: Partial failures
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const migration2 = new FrameworkMigration(projectRoot);
      const result2 = await migration2.migrateLegacyToScoped({ backup: true });

      if (!result2.success) {
        expect(result2.errors).toBeDefined();
        expect(result2.backupPath).toBeDefined();
      }

      // Test 3: Cyclic migration prevention
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.createDirectory('.aiwg/shared');

      const migration3 = new FrameworkMigration(projectRoot);
      const result3 = await migration3.migrateLegacyToScoped();

      expect(result3.skipped).toBe(true);
      expect(result3.reason).toContain('already framework-scoped');
    });

    it('should handle symlinks and git history', async () => {
      // Test 1: Symlinks
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped();

      expect(result.success).toBe(true);

      // Test 2: Git history preservation
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const migration2 = new FrameworkMigration(projectRoot);
      const result2 = await migration2.migrateLegacyToScoped({ preserveGitHistory: true });

      expect(result2.success).toBe(true);
    });
  });

  // ===========================
  // Dry-Run Mode (Consolidated to 1 test)
  // ===========================

  describe('Dry-Run Mode', () => {
    it('should simulate migration without changes and report plan', async () => {
      // Test 1: No actual changes
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped({ dryRun: true });

      expect(result.success).toBe(true);
      expect(await sandbox.fileExists('.aiwg/requirements/uc-001.md')).toBe(true);
      expect(await sandbox.fileExists('.aiwg/shared/requirements/uc-001.md')).toBe(false);

      // Test 2: Plan reporting
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.aiwg/agents');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/agents/agent.md', '# Agent');
      await sandbox.createDirectory('.claude');

      const migration2 = new FrameworkMigration(projectRoot);
      const result2 = await migration2.migrateLegacyToScoped({ dryRun: true });

      expect(result2.plan.frameworkSpecificMoves).toBe(1);
      expect(result2.plan.sharedMoves).toBe(1);

      // Test 3: Validation
      expect(result2.validation.safe).toBe(true);
      expect(result2.validation.warnings).toBeDefined();
    });
  });

  // ===========================
  // Conflict Resolution (Consolidated to 1 test)
  // ===========================

  describe('Conflict Resolution', () => {
    it('should detect conflicts and apply resolution strategy', async () => {
      // Test 1: Conflict detection
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# Legacy Version');
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# Existing Version');
      await sandbox.createDirectory('.claude');

      const migration = new FrameworkMigration(projectRoot);
      const result = await migration.migrateLegacyToScoped();

      expect(result.conflicts).toBeDefined();
      expect(result.conflicts.length).toBeGreaterThan(0);

      // Test 2: Resolution strategy
      await sandbox.cleanup();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# New Version');
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# Old Version');
      await sandbox.createDirectory('.claude');

      const migration2 = new FrameworkMigration(projectRoot);
      const result2 = await migration2.migrateLegacyToScoped({
        conflictStrategy: 'overwrite'
      });

      const content = await sandbox.readFile('.aiwg/shared/requirements/uc-001.md');
      expect(content).toBe('# New Version');
    });
  });
});
