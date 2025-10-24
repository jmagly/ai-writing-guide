/**
 * Tests for Git Hook Installer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm, chmod, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { GitHookInstaller } from '../../../src/cli/git-hooks.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('GitHookInstaller', () => {
  let installer: GitHookInstaller;
  let testDir: string;

  beforeEach(async () => {
    testDir = resolve(process.cwd(), 'test-temp-git');
    await mkdir(testDir, { recursive: true });

    // Initialize git repo
    await execAsync('git init', { cwd: testDir });

    installer = new GitHookInstaller(testDir);
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('isGitRepository', () => {
    it('should return true for git repository', () => {
      expect(installer.isGitRepository()).toBe(true);
    });

    it('should return false for non-git directory', async () => {
      const nonGitDir = resolve(testDir, 'non-git');
      await mkdir(nonGitDir, { recursive: true });

      const nonGitInstaller = new GitHookInstaller(nonGitDir);
      expect(nonGitInstaller.isGitRepository()).toBe(false);
    });
  });

  describe('installPreCommitHook', () => {
    it('should install pre-commit hook', async () => {
      await installer.installPreCommitHook();

      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      expect(existsSync(hookPath)).toBe(true);
    });

    it('should make hook executable', async () => {
      await installer.installPreCommitHook();

      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('#!/bin/sh');
      expect(content).toContain('# AIWG');
    });

    it('should include AIWG marker', async () => {
      await installer.installPreCommitHook();

      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('# AIWG');
      expect(content).toContain('# END AIWG');
    });

    it('should throw if hook exists without force', async () => {
      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      await mkdir(resolve(testDir, '.git', 'hooks'), { recursive: true });
      await writeFile(hookPath, '#!/bin/sh\necho "existing"', 'utf-8');

      await expect(installer.installPreCommitHook()).rejects.toThrow(
        'already exists'
      );
    });

    it('should overwrite with force option', async () => {
      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      await mkdir(resolve(testDir, '.git', 'hooks'), { recursive: true });
      await writeFile(hookPath, '#!/bin/sh\necho "existing"', 'utf-8');

      await installer.installPreCommitHook({ force: true });

      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('AIWG');
    });

    it('should append to existing hook', async () => {
      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      await mkdir(resolve(testDir, '.git', 'hooks'), { recursive: true });
      const existingContent = '#!/bin/sh\necho "existing hook"';
      await writeFile(hookPath, existingContent, 'utf-8');

      await installer.installPreCommitHook({ append: true });

      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('existing hook');
      expect(content).toContain('AIWG');
    });

    it('should throw if AIWG already exists when appending', async () => {
      await installer.installPreCommitHook();

      await expect(
        installer.installPreCommitHook({ append: true })
      ).rejects.toThrow('already exists');
    });

    it('should use custom config path', async () => {
      await installer.installPreCommitHook({ configPath: '/custom/path/.aiwgrc.json' });

      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('/custom/path/.aiwgrc.json');
    });

    it('should throw for non-git repository', async () => {
      const nonGitDir = resolve(testDir, 'non-git');
      await mkdir(nonGitDir, { recursive: true });

      const nonGitInstaller = new GitHookInstaller(nonGitDir);

      await expect(nonGitInstaller.installPreCommitHook()).rejects.toThrow(
        'Not a git repository'
      );
    });
  });

  describe('installPrePushHook', () => {
    it('should install pre-push hook', async () => {
      await installer.installPrePushHook();

      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-push');
      expect(existsSync(hookPath)).toBe(true);
    });

    it('should include AIWG marker', async () => {
      await installer.installPrePushHook();

      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-push');
      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('# AIWG');
      expect(content).toContain('# END AIWG');
    });
  });

  describe('uninstallHooks', () => {
    it('should remove AIWG hook', async () => {
      await installer.installPreCommitHook();

      await installer.uninstallHooks(testDir);

      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      expect(existsSync(hookPath)).toBe(false);
    });

    it('should preserve non-AIWG content', async () => {
      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      await mkdir(resolve(testDir, '.git', 'hooks'), { recursive: true });

      const existingContent = '#!/bin/sh\necho "keep this"\n';
      await writeFile(hookPath, existingContent, 'utf-8');

      await installer.installPreCommitHook({ append: true });
      await installer.uninstallHooks(testDir);

      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('keep this');
      expect(content).not.toContain('AIWG');
    });

    it('should handle missing hooks', async () => {
      await expect(installer.uninstallHooks(testDir)).resolves.not.toThrow();
    });
  });

  describe('isInstalled', () => {
    it('should return false when not installed', () => {
      expect(installer.isInstalled('pre-commit')).toBe(false);
    });

    it('should return true when installed', async () => {
      await installer.installPreCommitHook();

      expect(installer.isInstalled('pre-commit')).toBe(true);
    });

    it('should return false for non-AIWG hook', async () => {
      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      await mkdir(resolve(testDir, '.git', 'hooks'), { recursive: true });
      await writeFile(hookPath, '#!/bin/sh\necho "other hook"', 'utf-8');

      expect(installer.isInstalled('pre-commit')).toBe(false);
    });
  });

  describe('getHookContent', () => {
    it('should return hook content', async () => {
      await installer.installPreCommitHook();

      const content = await installer.getHookContent('pre-commit');

      expect(content).toBeDefined();
      expect(content).toContain('AIWG');
    });

    it('should return null for nonexistent hook', async () => {
      const content = await installer.getHookContent('pre-commit');

      expect(content).toBeNull();
    });
  });

  describe('listInstalledHooks', () => {
    it('should return empty array when no hooks installed', async () => {
      const hooks = await installer.listInstalledHooks();

      expect(hooks).toEqual([]);
    });

    it('should list installed hooks', async () => {
      await installer.installPreCommitHook();
      await installer.installPrePushHook();

      const hooks = await installer.listInstalledHooks();

      expect(hooks).toContain('pre-commit');
      expect(hooks).toContain('pre-push');
    });

    it('should only list AIWG hooks', async () => {
      // Create non-AIWG hook
      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      await mkdir(resolve(testDir, '.git', 'hooks'), { recursive: true });
      await writeFile(hookPath, '#!/bin/sh\necho "other"', 'utf-8');

      // Install AIWG pre-push
      await installer.installPrePushHook();

      const hooks = await installer.listInstalledHooks();

      expect(hooks).not.toContain('pre-commit');
      expect(hooks).toContain('pre-push');
    });
  });

  describe('validateHook', () => {
    it('should validate installed hook', async () => {
      await installer.installPreCommitHook();

      const result = await installer.validateHook('pre-commit');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for nonexistent hook', async () => {
      const result = await installer.validateHook('pre-commit');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should fail for non-executable hook', async () => {
      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      await mkdir(resolve(testDir, '.git', 'hooks'), { recursive: true });
      await writeFile(hookPath, '#!/bin/sh\n# AIWG\necho "test"', 'utf-8');
      await chmod(hookPath, 0o644); // Not executable

      const result = await installer.validateHook('pre-commit');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not executable');
    });

    it('should fail for hook without AIWG marker', async () => {
      const hookPath = resolve(testDir, '.git', 'hooks', 'pre-commit');
      await mkdir(resolve(testDir, '.git', 'hooks'), { recursive: true });
      await writeFile(hookPath, '#!/bin/sh\necho "test"', 'utf-8');
      await chmod(hookPath, 0o755);

      const result = await installer.validateHook('pre-commit');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('AIWG marker');
    });
  });
});
