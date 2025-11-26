import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitSandbox } from '../../../../../../agentic/code/frameworks/sdlc-complete/src/testing/mocks/git-sandbox.ts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('GitSandbox', () => {
  let sandbox: GitSandbox;

  beforeEach(async () => {
    sandbox = new GitSandbox();
    await sandbox.initialize();
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('initialization', () => {
    it('should create a temporary directory', () => {
      const sandboxPath = sandbox.getPath();
      expect(sandboxPath).toBeTruthy();
      expect(sandboxPath.startsWith(os.tmpdir())).toBe(true);
      expect(fs.existsSync(sandboxPath)).toBe(true);
    });

    it('should throw error if initialized twice', async () => {
      await expect(sandbox.initialize()).rejects.toThrow('Sandbox already initialized');
    });

    it('should throw error if operations called before initialization', async () => {
      const uninitializedSandbox = new GitSandbox();
      await expect(uninitializedSandbox.initRepo()).rejects.toThrow('Sandbox not initialized');
    });

    it('should configure git user identity', async () => {
      await sandbox.initRepo();
      const name = sandbox.executeGit('config user.name').trim();
      const email = sandbox.executeGit('config user.email').trim();

      expect(name).toBe('Test User');
      expect(email).toBe('test@example.com');
    });
  });

  describe('cleanup', () => {
    it('should remove the temporary directory', async () => {
      const sandboxPath = sandbox.getPath();
      expect(fs.existsSync(sandboxPath)).toBe(true);

      await sandbox.cleanup();
      expect(fs.existsSync(sandboxPath)).toBe(false);
    });

    it('should be safe to call cleanup multiple times', async () => {
      await sandbox.cleanup();
      await expect(sandbox.cleanup()).resolves.not.toThrow();
    });

    it('should refuse to cleanup non-temp directories', async () => {
      // Create a new sandbox with manipulated path (for testing safety)
      const unsafeSandbox = new GitSandbox();
      await unsafeSandbox.initialize();

      // Manipulate the path to something outside temp (using object property access)
      (unsafeSandbox as any).sandboxPath = '/home/test';

      // Should fail gracefully (log error but not throw)
      await expect(unsafeSandbox.cleanup()).resolves.not.toThrow();
    });
  });

  describe('git repository initialization', () => {
    it('should initialize a regular git repository', async () => {
      await sandbox.initRepo();
      const gitDir = path.join(sandbox.getPath(), '.git');
      expect(fs.existsSync(gitDir)).toBe(true);
      expect(fs.statSync(gitDir).isDirectory()).toBe(true);
    });

    it('should initialize a bare git repository', async () => {
      await sandbox.initRepo(true);
      const sandboxPath = sandbox.getPath();

      // Bare repos have git files in root
      expect(fs.existsSync(path.join(sandboxPath, 'HEAD'))).toBe(true);
      expect(fs.existsSync(path.join(sandboxPath, 'refs'))).toBe(true);
      expect(fs.existsSync(path.join(sandboxPath, 'objects'))).toBe(true);
    });

    it('should set main as initial branch', async () => {
      await sandbox.initRepo();
      await sandbox.addCommit('Initial commit');

      const branch = sandbox.executeGit('rev-parse --abbrev-ref HEAD').trim();
      expect(branch).toBe('main');
    });
  });

  describe('commit creation', () => {
    beforeEach(async () => {
      await sandbox.initRepo();
    });

    it('should create an empty commit', async () => {
      const hash = await sandbox.addCommit('Initial commit');

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(40); // Full SHA-1 hash
    });

    it('should create a commit with files', async () => {
      const files = {
        'README.md': '# Test Project',
        'src/index.ts': 'console.log("Hello");'
      };

      const hash = await sandbox.addCommit('Add initial files', files);

      expect(hash).toBeTruthy();

      // Verify files exist
      const readme = await sandbox.readFile('README.md');
      const index = await sandbox.readFile('src/index.ts');

      expect(readme).toBe('# Test Project');
      expect(index).toBe('console.log("Hello");');
    });

    it('should handle commit messages with quotes', async () => {
      const message = 'Fix "bug" in module';
      const hash = await sandbox.addCommit(message);

      const log = await sandbox.getLog({ limit: 1 });
      expect(log[0].message).toBe(message);
    });

    it('should create multiple commits', async () => {
      await sandbox.addCommit('First commit');
      await sandbox.addCommit('Second commit');
      await sandbox.addCommit('Third commit');

      const log = await sandbox.getLog();
      expect(log.length).toBe(3);
      expect(log[0].message).toBe('Third commit'); // Most recent first
      expect(log[1].message).toBe('Second commit');
      expect(log[2].message).toBe('First commit');
    });

    it('should return unique commit hashes', async () => {
      const hash1 = await sandbox.addCommit('First');
      const hash2 = await sandbox.addCommit('Second');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('branch operations', () => {
    beforeEach(async () => {
      await sandbox.initRepo();
      await sandbox.addCommit('Initial commit');
    });

    it('should create a new branch', async () => {
      await sandbox.createBranch('feature-branch');

      const branches = sandbox.executeGit('branch').trim();
      expect(branches).toContain('feature-branch');
    });

    it('should checkout existing branch', async () => {
      await sandbox.createBranch('develop');
      await sandbox.checkout('develop');

      const currentBranch = sandbox.executeGit('rev-parse --abbrev-ref HEAD').trim();
      expect(currentBranch).toBe('develop');
    });

    it('should checkout commit by hash', async () => {
      const hash = await sandbox.addCommit('Second commit');
      await sandbox.checkout(hash);

      const currentCommit = sandbox.executeGit('rev-parse HEAD').trim();
      expect(currentCommit).toBe(hash);
    });

    it('should throw error for invalid branch name', async () => {
      await expect(sandbox.createBranch('invalid branch!')).rejects.toThrow('Invalid branch name format');
    });

    it('should support branch names with slashes', async () => {
      await sandbox.createBranch('feature/new-feature');
      await sandbox.checkout('feature/new-feature');

      const currentBranch = sandbox.executeGit('rev-parse --abbrev-ref HEAD').trim();
      expect(currentBranch).toBe('feature/new-feature');
    });
  });

  describe('merge operations', () => {
    beforeEach(async () => {
      await sandbox.initRepo();
      await sandbox.addCommit('Initial commit');
    });

    it('should merge branch into current branch', async () => {
      // Create feature branch and add commit
      await sandbox.createBranch('feature');
      await sandbox.checkout('feature');
      await sandbox.addCommit('Feature commit', { 'feature.txt': 'new feature' });

      // Switch back to main and merge
      await sandbox.checkout('main');
      await sandbox.merge('feature');

      // Verify merge
      const log = await sandbox.getLog();
      expect(log.length).toBe(2);
      expect(await sandbox.readFile('feature.txt')).toBe('new feature');
    });

    it('should handle fast-forward merge', async () => {
      await sandbox.createBranch('hotfix');
      await sandbox.checkout('hotfix');
      await sandbox.addCommit('Hotfix commit');

      await sandbox.checkout('main');
      const logBefore = await sandbox.getLog();

      await sandbox.merge('hotfix');

      const logAfter = await sandbox.getLog();
      expect(logAfter.length).toBe(logBefore.length + 1);
    });
  });

  describe('git log', () => {
    beforeEach(async () => {
      await sandbox.initRepo();
    });

    it('should return empty array for new repository', async () => {
      const log = await sandbox.getLog();
      expect(log).toEqual([]);
    });

    it('should return commit history', async () => {
      await sandbox.addCommit('First commit');
      await sandbox.addCommit('Second commit');
      await sandbox.addCommit('Third commit');

      const log = await sandbox.getLog();

      expect(log.length).toBe(3);
      expect(log[0].message).toBe('Third commit');
      expect(log[0].author).toBe('Test User');
      expect(log[0].hash).toBeTruthy();
      expect(log[0].date).toBeTruthy();
    });

    it('should limit number of commits', async () => {
      await sandbox.addCommit('Commit 1');
      await sandbox.addCommit('Commit 2');
      await sandbox.addCommit('Commit 3');
      await sandbox.addCommit('Commit 4');

      const log = await sandbox.getLog({ limit: 2 });

      expect(log.length).toBe(2);
      expect(log[0].message).toBe('Commit 4');
      expect(log[1].message).toBe('Commit 3');
    });

    it('should filter commits by date', async () => {
      await sandbox.addCommit('Old commit');

      // Get current date for "since" filter
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      await sandbox.addCommit('Recent commit');

      const log = await sandbox.getLog({ since: yesterdayStr });

      expect(log.length).toBeGreaterThanOrEqual(1);
      expect(log.some(c => c.message === 'Recent commit')).toBe(true);
    });

    it('should parse commit fields correctly', async () => {
      const hash = await sandbox.addCommit('Test commit');

      const log = await sandbox.getLog({ limit: 1 });

      expect(log[0].hash).toBe(hash);
      expect(log[0].author).toBe('Test User');
      expect(log[0].message).toBe('Test commit');

      // Verify date format
      expect(log[0].date).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('git status', () => {
    beforeEach(async () => {
      await sandbox.initRepo();
      await sandbox.addCommit('Initial commit');
    });

    it('should return clean status', async () => {
      const status = await sandbox.getStatus();

      expect(status.branch).toBe('main');
      expect(status.staged).toEqual([]);
      expect(status.unstaged).toEqual([]);
      expect(status.untracked).toEqual([]);
      expect(status.ahead).toBe(0);
      expect(status.behind).toBe(0);
    });

    it('should detect untracked files', async () => {
      await sandbox.writeFile('new-file.txt', 'content');

      const status = await sandbox.getStatus();

      expect(status.untracked).toContain('new-file.txt');
      expect(status.staged).toEqual([]);
      expect(status.unstaged).toEqual([]);
    });

    it('should detect staged files', async () => {
      await sandbox.writeFile('staged.txt', 'content');
      sandbox.executeGit('add staged.txt');

      const status = await sandbox.getStatus();

      expect(status.staged).toContain('staged.txt');
      expect(status.untracked).toEqual([]);
    });

    it('should detect unstaged changes', async () => {
      // First create and commit a file
      await sandbox.writeFile('modified.txt', 'original');
      sandbox.executeGit('add modified.txt');
      sandbox.executeGit('commit -m "Add modified.txt"');

      // Now modify it without staging
      await sandbox.writeFile('modified.txt', 'modified');

      const status = await sandbox.getStatus();

      expect(status.unstaged).toContain('modified.txt');
      expect(status.staged).toEqual([]);
      expect(status.untracked).toEqual([]);
    });

    it('should detect current branch', async () => {
      await sandbox.createBranch('feature');
      await sandbox.checkout('feature');

      const status = await sandbox.getStatus();

      expect(status.branch).toBe('feature');
    });

    it('should handle multiple file states', async () => {
      // First commit a base file
      await sandbox.writeFile('base.txt', 'base');
      sandbox.executeGit('add base.txt');
      sandbox.executeGit('commit -m "Base commit"');

      // Modified (committed then changed)
      await sandbox.writeFile('modified.txt', 'original');
      sandbox.executeGit('add modified.txt');
      sandbox.executeGit('commit -m "Add modified"');
      await sandbox.writeFile('modified.txt', 'changed');

      // Untracked
      await sandbox.writeFile('untracked.txt', 'new');

      // Staged
      await sandbox.writeFile('staged.txt', 'content');
      sandbox.executeGit('add staged.txt');

      const status = await sandbox.getStatus();

      expect(status.untracked).toContain('untracked.txt');
      expect(status.staged).toContain('staged.txt');
      expect(status.unstaged).toContain('modified.txt');
    });
  });

  describe('file operations', () => {
    beforeEach(async () => {
      await sandbox.initRepo();
    });

    it('should write and read files', async () => {
      await sandbox.writeFile('test.txt', 'Hello World');

      const content = await sandbox.readFile('test.txt');
      expect(content).toBe('Hello World');
    });

    it('should create nested directories', async () => {
      await sandbox.writeFile('src/lib/utils.ts', 'export const util = true;');

      const content = await sandbox.readFile('src/lib/utils.ts');
      expect(content).toBe('export const util = true;');
    });

    it('should delete files', async () => {
      await sandbox.writeFile('delete-me.txt', 'temporary');
      expect(fs.existsSync(path.join(sandbox.getPath(), 'delete-me.txt'))).toBe(true);

      await sandbox.deleteFile('delete-me.txt');
      expect(fs.existsSync(path.join(sandbox.getPath(), 'delete-me.txt'))).toBe(false);
    });

    it('should handle non-existent file deletion gracefully', async () => {
      await expect(sandbox.deleteFile('does-not-exist.txt')).resolves.not.toThrow();
    });

    it('should prevent path traversal', async () => {
      await expect(sandbox.writeFile('../outside.txt', 'bad')).rejects.toThrow('Path escapes sandbox');
      await expect(sandbox.readFile('../../etc/passwd')).rejects.toThrow('Path escapes sandbox');
      await expect(sandbox.deleteFile('../../../etc/passwd')).rejects.toThrow('Path escapes sandbox');
    });

    it('should handle files with unicode content', async () => {
      const content = '你好世界 🌍 Привет мир';
      await sandbox.writeFile('unicode.txt', content);

      const read = await sandbox.readFile('unicode.txt');
      expect(read).toBe(content);
    });

    it('should overwrite existing files', async () => {
      await sandbox.writeFile('overwrite.txt', 'original');
      await sandbox.writeFile('overwrite.txt', 'updated');

      const content = await sandbox.readFile('overwrite.txt');
      expect(content).toBe('updated');
    });
  });

  describe('executeGit', () => {
    beforeEach(async () => {
      await sandbox.initRepo();
    });

    it('should execute git commands', () => {
      // Create a file and check status returns output
      sandbox.executeGit('status');

      // Better test: verify command returns expected output
      const branch = sandbox.executeGit("symbolic-ref --short HEAD").trim();
      expect(branch).toBe('main');
    });

    it('should throw error for invalid commands', () => {
      expect(() => sandbox.executeGit('invalid-command')).toThrow('Git command failed');
    });

    it('should return command output', () => {
      sandbox.executeGit('config test.key "test value"');
      const value = sandbox.executeGit('config test.key').trim();

      expect(value).toBe('test value');
    });

    it('should work with commands that have no output', () => {
      expect(() => sandbox.executeGit('config test.key2 "value"')).not.toThrow();
    });
  });

  describe('getPath', () => {
    it('should return absolute path', () => {
      const sandboxPath = sandbox.getPath();
      expect(path.isAbsolute(sandboxPath)).toBe(true);
    });

    it('should return path in temp directory', () => {
      const sandboxPath = sandbox.getPath();
      expect(sandboxPath.startsWith(os.tmpdir())).toBe(true);
    });

    it('should return consistent path', () => {
      const path1 = sandbox.getPath();
      const path2 = sandbox.getPath();
      expect(path1).toBe(path2);
    });
  });

  describe('error handling', () => {
    it('should handle git errors gracefully', async () => {
      await sandbox.initRepo();

      // Try to checkout non-existent branch
      await expect(sandbox.checkout('non-existent')).rejects.toThrow('Git command failed');
    });

    it('should handle file system errors', async () => {
      await sandbox.initRepo();

      // Try to read non-existent file
      await expect(sandbox.readFile('does-not-exist.txt')).rejects.toThrow();
    });

    it('should provide helpful error messages', async () => {
      await sandbox.initRepo();

      try {
        await sandbox.checkout('invalid-branch');
      } catch (error: any) {
        expect(error.message).toContain('Git command failed');
        expect(error.message).toContain('checkout');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should support complete git workflow', async () => {
      // Initialize
      await sandbox.initRepo();

      // Initial commit
      await sandbox.addCommit('Initial commit', { 'README.md': '# Project' });

      // Create feature branch
      await sandbox.createBranch('feature');
      await sandbox.checkout('feature');

      // Add feature
      await sandbox.addCommit('Add feature', { 'feature.ts': 'export const feature = true;' });

      // Back to main
      await sandbox.checkout('main');

      // Verify feature not present
      expect(fs.existsSync(path.join(sandbox.getPath(), 'feature.ts'))).toBe(false);

      // Merge feature
      await sandbox.merge('feature');

      // Verify feature present
      const content = await sandbox.readFile('feature.ts');
      expect(content).toBe('export const feature = true;');

      // Check log
      const log = await sandbox.getLog();
      expect(log.length).toBe(2);
    });

    it('should support multiple parallel sandboxes', async () => {
      const sandbox2 = new GitSandbox();
      await sandbox2.initialize();
      await sandbox2.initRepo();

      // Both sandboxes should work independently
      await sandbox.initRepo();
      await sandbox.addCommit('Sandbox 1 commit');
      await sandbox2.addCommit('Sandbox 2 commit');

      const log1 = await sandbox.getLog();
      const log2 = await sandbox2.getLog();

      expect(log1[0].message).toBe('Sandbox 1 commit');
      expect(log2[0].message).toBe('Sandbox 2 commit');
      expect(sandbox.getPath()).not.toBe(sandbox2.getPath());

      await sandbox2.cleanup();
    });

    it('should support realistic commit history', async () => {
      await sandbox.initRepo();

      // Create realistic commit history
      await sandbox.addCommit('Initial project setup', {
        'package.json': '{"name": "test"}',
        'README.md': '# Test Project'
      });

      await sandbox.addCommit('Add source files', {
        'src/index.ts': 'console.log("Hello");',
        'src/utils.ts': 'export const util = true;'
      });

      await sandbox.createBranch('feature/login');
      await sandbox.checkout('feature/login');

      await sandbox.addCommit('Implement login form', {
        'src/login.ts': 'export const login = () => {};'
      });

      await sandbox.addCommit('Add login tests', {
        'test/login.test.ts': 'test("login", () => {});'
      });

      await sandbox.checkout('main');
      await sandbox.merge('feature/login');

      const log = await sandbox.getLog();
      const status = await sandbox.getStatus();

      expect(log.length).toBe(4);
      expect(status.branch).toBe('main');
      expect(status.staged).toEqual([]);
      expect(status.unstaged).toEqual([]);
      expect(await sandbox.readFile('src/login.ts')).toContain('login');
    });
  });
});
