/**
 * Test suite for GitWorkflowOrchestrator
 *
 * Tests git workflow automation including branch management, commits,
 * merges, and PR operations with Conventional Commits support.
 *
 * Requirements:
 * - UC-008: Git Workflow Orchestration
 * - NFR-GIT-001: Git operations <5s
 * - NFR-GIT-002: Conflict detection accuracy >90%
 * - NFR-GIT-003: Commit message generation accuracy >85%
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type {
  GitWorkflowOrchestrator,
  GitConfig,
  BranchOptions,
  CommitOptions,
  MergeOptions,
  PROptions
} from '../../../src/git/git-workflow-orchestrator.ts';

const execState = vi.hoisted(() => ({
  calls: [] as Array<{ executable: string; args: string[]; command: string; cwd: string }>
}));

// Mock execFile to avoid actual git commands while preserving argv boundaries.
vi.mock('child_process', () => ({
  execFile: vi.fn((executable: string, args: string[], opts: any, callback: Function) => {
    // Add small delay to ensure duration > 0
    setTimeout(() => {
      const cmd = [executable, ...args]
        .map(value => /\s/.test(value) ? `"${value}"` : value)
        .join(' ');
      // Extract the cwd from options if available
      const cwd = typeof opts === 'object' && opts?.cwd ? opts.cwd : '';
      execState.calls.push({ executable, args: [...args], command: cmd, cwd });

      // Simulate errors for non-existent paths
      if (cwd.includes('/non/existent') || cwd.includes('non-existent')) {
        callback(new Error('fatal: not a git repository (or any of the parent directories): .git'), null);
        return;
      }

      // Simulate errors for specific commands
      if (cmd.includes('non-existent')) {
        callback(new Error('error: pathspec \'non-existent\' did not match any file(s) known to git'), null);
        return;
      }

      if (cmd.includes('merge --no-commit --no-ff conflicting-branch')) {
        callback(new Error('CONFLICT (content): merge conflict in src/conflict.ts'), null);
        return;
      }

      // Simulate successful git commands
      if (cmd.includes('git branch --show-current')) {
        callback(null, { stdout: 'main\n', stderr: '' });
      } else if (cmd.includes('git rev-parse')) {
        callback(null, { stdout: 'origin/main\n', stderr: '' });
      } else if (cmd.includes('git rev-list')) {
        callback(null, { stdout: '0\n', stderr: '' });
      } else if (cmd.includes('git diff --cached --name-only')) {
        callback(null, { stdout: 'src/index.ts\n', stderr: '' });
      } else if (cmd.includes('git diff --name-only --diff-filter=U')) {
        callback(null, { stdout: 'src/conflict.ts\n', stderr: '' });
      } else if (cmd.includes('git diff --name-only')) {
        callback(null, { stdout: '', stderr: '' });
      } else if (cmd.includes('git ls-files --others')) {
        callback(null, { stdout: '', stderr: '' });
      } else if (cmd === 'git branch -a') {
        callback(null, { stdout: '* main\n  remotes/origin/main\n', stderr: '' });
      } else if (cmd === 'git branch') {
        callback(null, { stdout: '* main\n  feature/example\n', stderr: '' });
      } else if (cmd.includes('git log ')) {
        callback(null, { stdout: 'feat: add API\nfeat: add tests\n', stderr: '' });
      } else if (cmd.includes('git checkout')) {
        callback(null, { stdout: 'Switched to branch \'main\'\n', stderr: '' });
      } else if (cmd.includes('git branch -d') || cmd.includes('git branch -D')) {
        callback(null, { stdout: 'Deleted branch feature-branch\n', stderr: '' });
      } else if (cmd.startsWith('gh pr create')) {
        callback(null, { stdout: 'https://example.test/pull/1\n', stderr: '' });
      } else {
        callback(null, { stdout: '', stderr: '' });
      }
    }, 1); // 1ms delay to ensure duration > 0
  })
}));

describe('GitWorkflowOrchestrator', () => {
  let orchestrator: GitWorkflowOrchestrator;
  let testRepo: string;

  beforeEach(async () => {
    execState.calls.length = 0;
    // Create temp git repository for testing
    testRepo = await fs.mkdtemp(path.join(os.tmpdir(), 'git-test-'));

    // Initialize config
    const config: GitConfig = {
      repoPath: testRepo,
      branchStrategy: 'github-flow',
      defaultBranch: 'main',
      remote: 'origin',
      conventionalCommits: true,
      autoGenerateMessages: true
    };

    // Dynamic import
    const { GitWorkflowOrchestrator: Orchestrator } = await import(
      '../../../src/git/git-workflow-orchestrator.js'
    );
    orchestrator = new Orchestrator(config);
  });

  afterEach(async () => {
    // Cleanup test repository
    await fs.rm(testRepo, { recursive: true, force: true });
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', async () => {
      const { GitWorkflowOrchestrator: Orchestrator } = await import(
        '../../../src/git/git-workflow-orchestrator.js'
      );

      const config: GitConfig = {
        repoPath: testRepo
      };

      const orch = new Orchestrator(config);

      const result = await orch.createBranch({ name: 'default-config' });
      expect(result.success).toBe(true);
      expect(execState.calls.map(call => call.command)).toEqual([
        'git checkout main',
        'git pull origin main',
        'git checkout -b default-config'
      ]);
    });

    it('should accept custom branch strategies', async () => {
      const { GitWorkflowOrchestrator: Orchestrator } = await import(
        '../../../src/git/git-workflow-orchestrator.js'
      );

      const strategies: Array<'gitflow' | 'github-flow' | 'trunk-based'> = [
        'gitflow',
        'github-flow',
        'trunk-based'
      ];

      // Test all strategies in single test
      for (const strategy of strategies) {
        execState.calls.length = 0;
        const config: GitConfig = {
          repoPath: testRepo,
          branchStrategy: strategy
        };

        const orch = new Orchestrator(config);
        const result = await orch.createBranch({ name: 'strategy-check' });
        expect(result.success, `Failed strategy: ${strategy}`).toBe(true);
        const expectedBase = strategy === 'gitflow' ? 'develop' : 'main';
        const expectedName = strategy === 'trunk-based'
          ? `${process.env.USER || 'dev'}/strategy-check`
          : strategy === 'gitflow' ? 'feature/strategy-check' : 'strategy-check';
        expect(execState.calls.map(call => call.command)).toEqual([
          `git checkout ${expectedBase}`,
          `git pull origin ${expectedBase}`,
          `git checkout -b ${expectedName}`
        ]);
      }
    });

    it('should default to conventional commits enabled', async () => {
      const { GitWorkflowOrchestrator: Orchestrator } = await import(
        '../../../src/git/git-workflow-orchestrator.js'
      );

      const config: GitConfig = {
        repoPath: testRepo
      };

      const orch = new Orchestrator(config);
      const result = await orch.commit({ files: ['src/index.ts'] });
      expect(result.success).toBe(true);
      expect(execState.calls.at(-1)?.command).toBe('git commit -m "feat: update index.ts"');
    });
  });

  describe('Git Status Operations (NFR-GIT-001)', () => {
    it('should get repository status in <5s with all properties (NFR-GIT-001)', async () => {
      const startTime = Date.now();

      const status = await orchestrator.getStatus();

      expect(status).toEqual({
        branch: 'main',
        remoteBranch: 'origin/main',
        ahead: 0,
        behind: 0,
        staged: ['src/index.ts'],
        unstaged: [],
        untracked: [],
        conflicts: ['src/conflict.ts']
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    }, 10000);
  });

  describe('Branch Operations', () => {
    describe('Branch Creation', () => {
      it('should create branches with all strategies in <5s (NFR-GIT-001)', async () => {
        const { GitWorkflowOrchestrator: Orchestrator } = await import(
          '../../../src/git/git-workflow-orchestrator.js'
        );

        const testCases = [
          { strategy: 'github-flow' as const, options: { name: 'add-feature' } },
          { strategy: 'gitflow' as const, options: { name: 'user-authentication', type: 'feature' as const } },
          { strategy: 'trunk-based' as const, options: { name: 'quick-fix' } },
          { strategy: 'github-flow' as const, options: { name: 'new-feature', baseBranch: 'develop' } },
          { strategy: 'github-flow' as const, options: { name: 'critical-bug-fix', type: 'hotfix' as const } }
        ];

        for (const testCase of testCases) {
          execState.calls.length = 0;
          const config: GitConfig = {
            repoPath: testRepo,
            branchStrategy: testCase.strategy
          };

          const orch = new Orchestrator(config);
          const result = await orch.createBranch(testCase.options);

          expect(result.success, `Failed for strategy: ${testCase.strategy}, options: ${JSON.stringify(testCase.options)}`).toBe(true);
          expect(result.operation, `Failed for strategy: ${testCase.strategy}, options: ${JSON.stringify(testCase.options)}`).toBe('createBranch');
          expect(result.duration, `Duration exceeded for strategy: ${testCase.strategy}`).toBeLessThan(5000);
          expect(result.duration, `Duration should be > 0 for strategy: ${testCase.strategy}`).toBeGreaterThan(0);
          const base = testCase.options.baseBranch || (testCase.strategy === 'gitflow' ? 'develop' : 'main');
          const branch = testCase.strategy === 'gitflow'
            ? `${testCase.options.type || 'feature'}/${testCase.options.name}`
            : testCase.strategy === 'trunk-based'
              ? `${process.env.USER || 'dev'}/${testCase.options.name}`
              : testCase.options.name;
          expect(execState.calls.map(call => call.command)).toEqual([
            `git checkout ${base}`,
            `git pull origin ${base}`,
            `git checkout -b ${branch}`
          ]);
        }
      });
    });

    describe('Branch Switching', () => {
      it('should switch to existing branch in <5s (NFR-GIT-001)', async () => {
        const result = await orchestrator.switchBranch('main');

        expect(result.success).toBe(true);
        expect(result.operation).toBe('switchBranch');
        expect(result.duration).toBeGreaterThanOrEqual(0);
        expect(result.duration).toBeLessThan(5000);
      });

      it('should handle non-existent branch gracefully', async () => {
        const result = await orchestrator.switchBranch('non-existent-branch');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Branch Deletion', () => {
      it('should delete branches with various options', async () => {
        const testCases = [
          { name: 'feature-branch', deleteRemote: false },
          { name: 'feature-branch', deleteRemote: true },
          { name: 'non-existent', deleteRemote: false }
        ];

        for (const testCase of testCases) {
          execState.calls.length = 0;
          const result = await orchestrator.deleteBranch(testCase.name, testCase.deleteRemote);

          expect(result.operation, `Failed for branch: ${testCase.name}, deleteRemote: ${testCase.deleteRemote}`).toBe('deleteBranch');

          if (testCase.name === 'non-existent') {
            expect(result.success, 'Non-existent branch should fail gracefully').toBe(false);
            expect(result.error, 'Non-existent branch should have error').toBeDefined();
          } else {
            expect(result.success, `Existing branch should be deleted: ${testCase.name}`).toBe(true);
            expect(execState.calls.map(call => call.command)).toEqual([
              'git branch -d feature-branch',
              ...(testCase.deleteRemote ? ['git push origin --delete feature-branch'] : [])
            ]);
          }
        }
      });
    });

    describe('Branch Listing', () => {
      it('should list local and remote branches', async () => {
        const testCases = [false, true]; // local only, then local+remote

        for (const includeRemote of testCases) {
          const branches = await orchestrator.listBranches(includeRemote);
          expect(branches, `Failed for includeRemote: ${includeRemote}`).toEqual(
            includeRemote ? ['main', 'remotes/origin/main'] : ['main', 'feature/example']
          );
        }
      });
    });
  });

  describe('Commit Operations (NFR-GIT-003)', () => {
    describe('Conventional Commits', () => {
      it('should create conventional commits with explicit or detected types and scopes in <5s (NFR-GIT-001)', async () => {
        const testCases: Array<{ options: CommitOptions; expected: string }> = [
          { options: { type: 'feat', message: 'add user authentication', autoStage: true, files: ['src/auth.ts'] }, expected: 'feat: add user authentication' },
          { options: { type: 'fix', message: 'resolve null pointer exception', files: ['src/index.ts'] }, expected: 'fix: resolve null pointer exception' },
          { options: { type: 'feat', scope: 'auth', message: 'add JWT validation', files: ['src/auth/jwt.ts'] }, expected: 'feat(auth): add JWT validation' },
          { options: { type: 'feat', scope: 'api', breaking: true, message: 'change API endpoint structure', files: ['src/api.ts'] }, expected: 'feat(api)!: change API endpoint structure' },
          { options: { message: 'update components', autoStage: true, files: ['src/App.tsx', 'src/utils.ts'] }, expected: 'feat: update components' },
          { options: { message: 'test commit', files: ['test.txt'] }, expected: 'test: test commit' }
        ];

        for (const { options, expected } of testCases) {
          execState.calls.length = 0;
          const result = await orchestrator.commit(options);

          expect(result.success, `Failed for commit options: ${JSON.stringify(options)}`).toBe(true);
          expect(result.operation, `Failed for commit options: ${JSON.stringify(options)}`).toBe('commit');
          expect(result.duration, `Duration exceeded for commit: ${options.message}`).toBeLessThan(5000);
          expect(result.output).toBe(`Created commit: ${expected}`);
          expect(execState.calls.at(-1)?.command).toBe(`git commit -m "${expected}"`);
        }
      });

      it('should auto-generate commit messages and detect types from files (NFR-GIT-003)', async () => {
        const testFileSets = [
          { files: ['test/index.test.ts'], expectedType: 'test' },
          { files: ['docs/README.md'], expectedType: 'docs' },
          { files: ['.github/workflows/ci.yml'], expectedType: 'ci' },
          { files: ['package.json'], expectedType: 'build' },
          { files: ['src/index.ts'], expectedType: 'feat' },
          { files: ['src/index.ts', 'src/utils.ts'], expectedType: 'feat' }
        ];

        for (const { files, expectedType } of testFileSets) {
          const options: CommitOptions = {
            generateMessage: true,
            files
          };

          const result = await orchestrator.commit(options);
          expect(result.success, `Failed for files: ${files.join(', ')}`).toBe(true);
          expect(result.operation, `Failed for files: ${files.join(', ')}`).toBe('commit');
          expect(result.output).toMatch(new RegExp(`^Created commit: ${expectedType}(?:\\([^)]*\\))?!?: `));
        }
      });
    });

    describe('Commit Message Generation', () => {
      it('should generate messages for various file patterns', async () => {
        const testCases: Array<{ files: string[]; expected: string }> = [
          { files: ['src/index.ts'], expected: 'feat: update index.ts' },
          { files: ['src/file1.ts', 'src/file2.ts', 'src/file3.ts'], expected: 'feat: update src components' },
          { files: ['README.md', 'docs/guide.md'], expected: 'docs: update 2 files' }
        ];

        for (const testCase of testCases) {
          const options: CommitOptions = {
            generateMessage: true,
            files: testCase.files
          };

          const result = await orchestrator.commit(options);
          expect(result.success, `Failed for files: ${testCase.files.join(', ')}`).toBe(true);
          expect(result.operation, `Failed for files: ${testCase.files.join(', ')}`).toBe('commit');
          expect(execState.calls.at(-1)?.command).toBe(`git commit -m "${testCase.expected}"`);
        }
      });

      it('should preserve shell metacharacters as one literal commit-message argument', async () => {
        const message = 'document $(literal) ; keep "quotes"';
        const result = await orchestrator.commit({ type: 'docs', message });

        expect(result.success).toBe(true);
        expect(execState.calls).toHaveLength(1);
        expect(execState.calls[0]).toMatchObject({
          executable: 'git',
          args: ['commit', '-m', `docs: ${message}`],
          cwd: testRepo
        });
      });
    });
  });

  describe('Merge Operations (NFR-GIT-002)', () => {
    describe('Merge Strategies', () => {
      it('should merge with all strategies and options in <5s (NFR-GIT-001)', async () => {
        const testCases: MergeOptions[] = [
          { sourceBranch: 'feature-branch' },
          { sourceBranch: 'feature-branch', strategy: 'squash' },
          { sourceBranch: 'feature-branch', strategy: 'rebase' },
          { sourceBranch: 'feature-branch', deleteSource: true }
        ];

        for (const options of testCases) {
          execState.calls.length = 0;
          const result = await orchestrator.merge(options);

          expect(result.success, `Failed for merge options: ${JSON.stringify(options)}`).toBe(true);
          expect(result.operation, `Failed for merge options: ${JSON.stringify(options)}`).toBe('merge');
          expect(result.duration, `Duration exceeded for merge strategy: ${options.strategy || 'default'}`).toBeLessThan(5000);
          const expectedMerge = options.strategy === 'squash'
            ? 'git merge --squash feature-branch'
            : options.strategy === 'rebase'
              ? 'git rebase feature-branch'
              : 'git merge feature-branch';
          expect(execState.calls.map(call => call.command)).toEqual([
            expectedMerge,
            ...(options.deleteSource ? ['git branch -d feature-branch'] : [])
          ]);
        }
      });
    });

    describe('Conflict Detection (NFR-GIT-002)', () => {
      it('should detect merge conflicts before merging', async () => {
        await fs.mkdir(path.join(testRepo, 'src'), { recursive: true });
        await fs.writeFile(path.join(testRepo, 'src/conflict.ts'), [
          '<<<<<<< HEAD',
          'const value = 1;',
          '=======',
          'const value = 2;',
          '>>>>>>> conflicting-branch',
          ''
        ].join('\n'));
        const options: MergeOptions = {
          sourceBranch: 'conflicting-branch',
          checkConflicts: true
        };

        const result = await orchestrator.merge(options);
        expect(result.success).toBe(false);
        expect(result.operation).toBe('merge');
        expect(result.error).toBe('Conflicts detected in 1 files');
        expect(result.conflicts).toEqual([
          expect.objectContaining({
            file: 'src/conflict.ts',
            severity: 'trivial',
            lineRanges: [{ start: 0, end: 4 }]
          })
        ]);
      });

      it('should return no conflicts after a successful dry-run merge in <5s (NFR-GIT-001)', async () => {
        const startTime = Date.now();

        const conflicts = await orchestrator.detectMergeConflicts('feature-branch');
        expect(conflicts).toEqual([]);
        expect(execState.calls.map(call => call.command)).toContain('git merge --abort');

        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(5000);
      });
    });
  });

  describe('Pull Request Operations', () => {
    describe('PR Creation', () => {
      it('should create PRs with various options in <5s (NFR-GIT-001)', async () => {
        const testCases: PROptions[] = [
          { title: 'Add user authentication', body: 'This PR adds JWT-based authentication', baseBranch: 'main' },
          { autoGenerate: true, baseBranch: 'main' },
          { title: 'Update documentation', reviewers: ['alice', 'bob'], baseBranch: 'main' },
          { title: 'Fix critical bug', labels: ['bug', 'critical', 'hotfix'], baseBranch: 'main' },
          { title: 'Add feature', assignees: ['john'], baseBranch: 'main' },
          { title: 'Test PR', baseBranch: 'main' }
        ];

        for (const options of testCases) {
          execState.calls.length = 0;
          const result = await orchestrator.createPR(options);

          expect(result.success, `Failed for PR options: ${JSON.stringify(options)}`).toBe(true);
          expect(result.operation, `Failed for PR options: ${JSON.stringify(options)}`).toBe('createPR');
          expect(result.output).toBe('https://example.test/pull/1');
          expect(result.duration, `Duration exceeded for PR: ${options.title || 'auto-generated'}`).toBeLessThan(5000);
          expect(execState.calls.at(-1)?.executable).toBe('gh');
          const command = execState.calls.at(-1)?.command || '';
          expect(command).toContain(`gh pr create --base ${options.baseBranch || 'main'}`);
          expect(command).toContain(`--title "${options.title || 'feat: Multiple updates'}"`);
          if (options.body) expect(command).toContain(`--body "${options.body}"`);
          if (options.reviewers) expect(command).toContain(`--reviewer ${options.reviewers.join(',')}`);
          if (options.labels) expect(command).toContain(`--label ${options.labels.join(',')}`);
          if (options.assignees) expect(command).toContain(`--assignee ${options.assignees.join(',')}`);
        }
      });
    });

    describe('PR Auto-generation', () => {
      it('should generate PR title and body from commit history', async () => {
        // All auto-generation scenarios use same pattern
        const result = await orchestrator.createPR({
          autoGenerate: true,
          baseBranch: 'main'
        });

        expect(result.success).toBe(true);
        expect(result.operation).toBe('createPR');
        expect(execState.calls.at(-1)?.command).toContain('--title "feat: Multiple updates"');
        expect(execState.calls.at(-1)?.command).toContain('## Changes');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow: branch → commit → merge', async () => {
      // Create branch
      const branchResult = await orchestrator.createBranch({
        name: 'feature-workflow'
      });
      expect(branchResult.success).toBe(true);
      expect(branchResult.operation).toBe('createBranch');

      // Create commit
      const commitResult = await orchestrator.commit({
        message: 'add workflow feature',
        files: ['src/workflow.ts']
      });
      expect(commitResult.success).toBe(true);
      expect(commitResult.operation).toBe('commit');

      // Merge
      const mergeResult = await orchestrator.merge({
        sourceBranch: 'feature-workflow',
        deleteSource: true
      });
      expect(mergeResult.success).toBe(true);
      expect(mergeResult.operation).toBe('merge');
    });

    it('should handle GitFlow and trunk-based workflows', async () => {
      const { GitWorkflowOrchestrator: Orchestrator } = await import(
        '../../../src/git/git-workflow-orchestrator.js'
      );

      const workflowTests = [
        {
          strategy: 'gitflow' as const,
          branchOpts: { name: 'user-profile', type: 'feature' as const },
          commitOpts: { type: 'feat', scope: 'profile', message: 'add profile page' }
        },
        {
          strategy: 'trunk-based' as const,
          branchOpts: { name: 'quick-fix' },
          commitOpts: { message: 'fix: resolve edge case' }
        }
      ];

      for (const test of workflowTests) {
        const config: GitConfig = {
          repoPath: testRepo,
          branchStrategy: test.strategy
        };

        const orch = new Orchestrator(config);

        const branchResult = await orch.createBranch(test.branchOpts);
        expect(branchResult.success, `Branch creation failed for strategy: ${test.strategy}`).toBe(true);
        expect(branchResult.operation, `Branch creation failed for strategy: ${test.strategy}`).toBe('createBranch');

        const commitResult = await orch.commit(test.commitOpts);
        expect(commitResult.success, `Commit failed for strategy: ${test.strategy}`).toBe(true);
        expect(commitResult.operation, `Commit failed for strategy: ${test.strategy}`).toBe('commit');
      }
    });
  });

  describe('Performance Tests (NFR-GIT-001)', () => {
    it('should execute all operations in <5s each', async () => {
      const operations = [
        () => orchestrator.createBranch({ name: 'perf-test' }),
        () => orchestrator.switchBranch('main'),
        () => orchestrator.commit({ message: 'test', files: ['test.txt'] }),
        () => orchestrator.merge({ sourceBranch: 'perf-test' }),
        () => orchestrator.deleteBranch('perf-test')
      ];

      for (const op of operations) {
        const result = await op();
        expect(result.success, `Operation failed: ${result.operation}`).toBe(true);
        expect(result.duration, `Operation exceeded 5s: ${result.operation}`).toBeLessThan(5000);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing repository gracefully', async () => {
      const { GitWorkflowOrchestrator: Orchestrator } = await import(
        '../../../src/git/git-workflow-orchestrator.js'
      );

      const config: GitConfig = {
        repoPath: '/non/existent/path'
      };

      const orch = new Orchestrator(config);

      const result = await orch.createBranch({ name: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle merge conflicts and auto-generate missing commit messages', async () => {
      // Test merge conflict handling
      const mergeResult = await orchestrator.merge({
        sourceBranch: 'conflicting-branch',
        checkConflicts: true
      });
      expect(mergeResult.success).toBe(false);
      expect(mergeResult.error).toBe('Conflicts detected in 1 files');
      expect(mergeResult.operation).toBe('merge');

      // Test missing commit message handling
      const commitResult = await orchestrator.commit({
        files: ['test.txt']
        // No message provided
      });
      expect(commitResult.success).toBe(true);
      expect(commitResult.output).toBe('Created commit: test: update test.txt');
      expect(commitResult.operation).toBe('commit');
    });
  });
});
