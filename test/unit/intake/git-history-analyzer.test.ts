/**
 * Tests for GitHistoryAnalyzer
 *
 * @module test/unit/intake/git-history-analyzer.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  GitHistoryAnalyzer,
  CommitInfo,
  VelocityMetrics,
  MaturityClassification,
  TeamInfo,
  analyzeGitHistory,
  getProjectMaturity,
  getTeamComposition
} from '../../../src/intake/git-history-analyzer.js';

const execAsync = promisify(exec);

describe('GitHistoryAnalyzer', () => {
  let testRepoPath: string;
  let analyzer: GitHistoryAnalyzer;

  beforeEach(async () => {
    // Create a temporary Git repository for testing
    testRepoPath = join(tmpdir(), `git-analyzer-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testRepoPath, { recursive: true });

    // Initialize Git repo
    await execAsync('git init', { cwd: testRepoPath });
    await execAsync('git config user.email "test@example.com"', { cwd: testRepoPath });
    await execAsync('git config user.name "Test User"', { cwd: testRepoPath });

    // Create initial commit
    writeFileSync(join(testRepoPath, 'README.md'), '# Test Repo');
    await execAsync('git add .', { cwd: testRepoPath });
    await execAsync('git commit -m "Initial commit"', { cwd: testRepoPath });

    analyzer = new GitHistoryAnalyzer(testRepoPath);
  });

  afterEach(async () => {
    try {
      rmSync(testRepoPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('validateRepository', () => {
    it('should validate a valid Git repository', async () => {
      await expect(analyzer.validateRepository()).resolves.not.toThrow();
    });

    it('should throw for non-Git directory', async () => {
      const nonGitPath = join(tmpdir(), `non-git-${Date.now()}`);
      mkdirSync(nonGitPath, { recursive: true });

      const badAnalyzer = new GitHistoryAnalyzer(nonGitPath);
      await expect(badAnalyzer.validateRepository()).rejects.toThrow('Not a Git repository');

      rmSync(nonGitPath, { recursive: true, force: true });
    });
  });

  describe('executeGitCommand', () => {
    it('should execute git commands', async () => {
      const result = await analyzer.executeGitCommand('--version');
      expect(result).toContain('git version');
    });

    it('should execute log command', async () => {
      const result = await analyzer.executeGitCommand('log --oneline');
      expect(result).toContain('Initial commit');
    });

    it('should throw for invalid commands', async () => {
      await expect(analyzer.executeGitCommand('invalid-command-xyz')).rejects.toThrow();
    });
  });

  describe('parseCommitLog', () => {
    it('should parse standard commit log format', () => {
      const logOutput = `abc123|John Doe|john@example.com|1700000000|Initial commit
def456|Jane Smith|jane@example.com|1700100000|Add feature`;

      const commits = analyzer.parseCommitLog(logOutput);

      expect(commits).toHaveLength(2);
      expect(commits[0].hash).toBe('abc123');
      expect(commits[0].author).toBe('John Doe');
      expect(commits[0].email).toBe('john@example.com');
      expect(commits[0].message).toBe('Initial commit');
    });

    it('should handle edge cases', () => {
      // Test empty log
      expect(analyzer.parseCommitLog('')).toHaveLength(0);

      // Test messages with pipe characters
      const withPipe = `abc123|John|john@example.com|1700000000|Fix: update | operator`;
      const pipeCommits = analyzer.parseCommitLog(withPipe);
      expect(pipeCommits[0].message).toBe('Fix: update | operator');

      // Test malformed lines
      const malformed = `abc123|John|john@example.com|1700000000|Valid commit
invalid line with no pipes
def456|Jane|jane@example.com|1700100000|Another commit`;
      const malformedCommits = analyzer.parseCommitLog(malformed);
      expect(malformedCommits).toHaveLength(2);

      // Test timestamp conversion
      const timestamp = 1700000000;
      const timestampLog = `abc123|John|john@example.com|${timestamp}|Test`;
      const timestampCommits = analyzer.parseCommitLog(timestampLog);
      expect(timestampCommits[0].timestamp).toBe(timestamp);
      expect(timestampCommits[0].date.getTime()).toBe(timestamp * 1000);
    });
  });

  describe('calculateVelocity', () => {
    it('should calculate velocity for multiple commits', () => {
      const now = Math.floor(Date.now() / 1000);
      const dayInSeconds = 24 * 60 * 60;

      const commits: CommitInfo[] = [
        { hash: '1', author: 'A', email: 'a@x.com', timestamp: now - 7 * dayInSeconds, message: 'm1', date: new Date((now - 7 * dayInSeconds) * 1000) },
        { hash: '2', author: 'A', email: 'a@x.com', timestamp: now - 6 * dayInSeconds, message: 'm2', date: new Date((now - 6 * dayInSeconds) * 1000) },
        { hash: '3', author: 'B', email: 'b@x.com', timestamp: now - 5 * dayInSeconds, message: 'm3', date: new Date((now - 5 * dayInSeconds) * 1000) },
        { hash: '4', author: 'A', email: 'a@x.com', timestamp: now - 4 * dayInSeconds, message: 'm4', date: new Date((now - 4 * dayInSeconds) * 1000) },
        { hash: '5', author: 'B', email: 'b@x.com', timestamp: now - 3 * dayInSeconds, message: 'm5', date: new Date((now - 3 * dayInSeconds) * 1000) },
        { hash: '6', author: 'A', email: 'a@x.com', timestamp: now - 2 * dayInSeconds, message: 'm6', date: new Date((now - 2 * dayInSeconds) * 1000) },
        { hash: '7', author: 'A', email: 'a@x.com', timestamp: now, message: 'm7', date: new Date(now * 1000) }
      ];

      const velocity = analyzer.calculateVelocity(commits);

      expect(velocity.commitsPerDay).toBeGreaterThan(0);
      expect(velocity.commitsPerWeek).toBeCloseTo(7, 0);
      expect(velocity.averageCommitsPerAuthor).toBeCloseTo(3.5, 1);
      expect(velocity.activeDaysRatio).toBeGreaterThan(0);
    });

    it('should handle empty commits array', () => {
      const velocity = analyzer.calculateVelocity([]);

      expect(velocity.commitsPerDay).toBe(0);
      expect(velocity.commitsPerWeek).toBe(0);
      expect(velocity.activeDaysRatio).toBe(0);
    });

    it('should calculate team velocity correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const dayInSeconds = 24 * 60 * 60;

      // 10 commits over 10 days by 2 authors
      const commits: CommitInfo[] = [];
      for (let i = 0; i < 10; i++) {
        commits.push({
          hash: `hash${i}`,
          author: i % 2 === 0 ? 'Alice' : 'Bob',
          email: i % 2 === 0 ? 'alice@x.com' : 'bob@x.com',
          timestamp: now - i * dayInSeconds,
          message: `Commit ${i}`,
          date: new Date((now - i * dayInSeconds) * 1000)
        });
      }

      const velocity = analyzer.calculateVelocity(commits);

      expect(velocity.averageCommitsPerAuthor).toBeCloseTo(5, 1);
    });

    it('should identify peak day', () => {
      const now = Math.floor(Date.now() / 1000);
      const dayInSeconds = 24 * 60 * 60;
      const peakDate = new Date((now - dayInSeconds) * 1000).toISOString().split('T')[0];

      // 5 commits on peak day, 1 commit on other days
      const commits: CommitInfo[] = [
        ...Array(5).fill(null).map((_, i) => ({
          hash: `peak${i}`,
          author: 'A',
          email: 'a@x.com',
          timestamp: now - dayInSeconds + i * 60,
          message: `Peak commit ${i}`,
          date: new Date((now - dayInSeconds + i * 60) * 1000)
        })),
        { hash: 'other', author: 'A', email: 'a@x.com', timestamp: now, message: 'Other', date: new Date(now * 1000) }
      ];

      const velocity = analyzer.calculateVelocity(commits);

      expect(velocity.peakDay).toBe(peakDate);
    });
  });

  describe('classifyMaturity', () => {
    it.each([
      {
        level: 'nascent' as const,
        ageMonths: 2,
        totalCommits: 30,
        checkAge: true,
        description: 'nascent project'
      },
      {
        level: 'mvp' as const,
        ageMonths: 4,
        totalCommits: 100,
        checkAge: false,
        description: 'MVP project'
      },
      {
        level: 'production' as const,
        ageMonths: 8,
        totalCommits: 500,
        checkAge: false,
        description: 'production project'
      },
      {
        level: 'mature' as const,
        ageMonths: 24,
        totalCommits: 2000,
        checkAge: false,
        description: 'mature project'
      }
    ])('should classify $description', ({ level, ageMonths, totalCommits, checkAge }) => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - ageMonths * 30 * 24 * 60 * 60 * 1000);

      const commits: CommitInfo[] = level === 'nascent'
        ? Array(totalCommits).fill(null).map((_, i) => ({
            hash: `h${i}`,
            author: 'A',
            email: 'a@x.com',
            timestamp: Math.floor(pastDate.getTime() / 1000) + i * 1000,
            message: `Commit ${i}`,
            date: new Date(pastDate.getTime() + i * 1000)
          }))
        : [];

      const repository = {
        path: '/test',
        name: 'test',
        firstCommitDate: pastDate,
        lastCommitDate: now,
        totalCommits,
        branches: [],
        defaultBranch: 'main',
        hasRemote: false
      };

      const maturity = analyzer.classifyMaturity(commits, repository);

      expect(maturity.level).toBe(level);

      if (checkAge) {
        expect(maturity.ageMonths).toBeLessThan(3);
      }

      if (level === 'mature') {
        expect(maturity.indicators).toContain('Mature project with established history');
      }
    });

    it('should include indicators', () => {
      const repository = {
        path: '/test',
        name: 'test',
        firstCommitDate: new Date(),
        lastCommitDate: new Date(),
        totalCommits: 10,
        branches: [],
        defaultBranch: 'main',
        hasRemote: false
      };

      const maturity = analyzer.classifyMaturity([], repository);

      expect(maturity.indicators.length).toBeGreaterThan(0);
      expect(maturity.indicators.some(i => i.includes('commits'))).toBe(true);
    });
  });

  describe('extractTeamInfo', () => {
    it('should extract team info from commits', () => {
      const now = Math.floor(Date.now() / 1000);
      const commits: CommitInfo[] = [
        { hash: '1', author: 'Alice', email: 'alice@x.com', timestamp: now, message: 'm1', date: new Date(now * 1000) },
        { hash: '2', author: 'Alice', email: 'alice@x.com', timestamp: now, message: 'm2', date: new Date(now * 1000) },
        { hash: '3', author: 'Bob', email: 'bob@x.com', timestamp: now, message: 'm3', date: new Date(now * 1000) }
      ];

      const team = analyzer.extractTeamInfo(commits);

      expect(team.totalAuthors).toBe(2);
      expect(team.topContributors[0].name).toBe('Alice');
      expect(team.topContributors[0].commitCount).toBe(2);
    });

    it('should identify solo project', () => {
      const now = Math.floor(Date.now() / 1000);
      const commits: CommitInfo[] = [
        { hash: '1', author: 'Solo', email: 'solo@x.com', timestamp: now, message: 'm1', date: new Date(now * 1000) },
        { hash: '2', author: 'Solo', email: 'solo@x.com', timestamp: now, message: 'm2', date: new Date(now * 1000) }
      ];

      const team = analyzer.extractTeamInfo(commits);

      expect(team.issoloProject).toBe(true);
      expect(team.teamSize).toBe('solo');
    });

    it.each([
      { teamSize: 'small' as const, authorCount: 3, description: 'Small team (2-5)' },
      { teamSize: 'medium' as const, authorCount: 10, description: 'Medium team (6-15)' },
      { teamSize: 'large' as const, authorCount: 20, description: 'Large team (>15)' }
    ])('should categorize $description', ({ teamSize, authorCount }) => {
      const now = Math.floor(Date.now() / 1000);

      const commits: CommitInfo[] = Array(authorCount).fill(null).map((_, i) => ({
        hash: `h${i}`,
        author: `Author${i}`,
        email: `author${i}@x.com`,
        timestamp: now,
        message: 'm',
        date: new Date(now * 1000)
      }));

      expect(analyzer.extractTeamInfo(commits).teamSize).toBe(teamSize);
    });

    it('should count active authors correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const dayInSeconds = 24 * 60 * 60;

      const commits: CommitInfo[] = [
        // Active author (recent)
        { hash: '1', author: 'Active', email: 'active@x.com', timestamp: now - 30 * dayInSeconds, message: 'm1', date: new Date((now - 30 * dayInSeconds) * 1000) },
        // Inactive author (>3 months ago)
        { hash: '2', author: 'Inactive', email: 'inactive@x.com', timestamp: now - 120 * dayInSeconds, message: 'm2', date: new Date((now - 120 * dayInSeconds) * 1000) }
      ];

      const team = analyzer.extractTeamInfo(commits);

      expect(team.totalAuthors).toBe(2);
      expect(team.activeAuthors).toBe(1);
    });

    it('should handle empty commits', () => {
      const team = analyzer.extractTeamInfo([]);

      expect(team.totalAuthors).toBe(0);
      expect(team.issoloProject).toBe(true);
      expect(team.teamSize).toBe('solo');
    });
  });

  describe('analyze (integration)', () => {
    it('should perform complete analysis on test repo', async () => {
      const result = await analyzer.analyze();

      expect(result.repository.name).toBeDefined();
      expect(result.repository.totalCommits).toBeGreaterThanOrEqual(1);
      expect(result.velocity).toBeDefined();
      expect(result.maturity).toBeDefined();
      expect(result.team).toBeDefined();
      expect(result.analysisTimeMs).toBeGreaterThan(0);
    });

    it('should include commit history', async () => {
      // Add more commits
      for (let i = 0; i < 5; i++) {
        writeFileSync(join(testRepoPath, `file${i}.txt`), `content ${i}`);
        await execAsync('git add .', { cwd: testRepoPath });
        await execAsync(`git commit -m "Add file ${i}"`, { cwd: testRepoPath });
      }

      const result = await analyzer.analyze();

      expect(result.commits.length).toBeGreaterThan(0);
      expect(result.commits[0].hash).toBeDefined();
      expect(result.commits[0].message).toBeDefined();
    });

    it('should handle multiple authors', async () => {
      // Add commit with different author
      await execAsync('git config user.email "other@example.com"', { cwd: testRepoPath });
      await execAsync('git config user.name "Other User"', { cwd: testRepoPath });

      writeFileSync(join(testRepoPath, 'other.txt'), 'other content');
      await execAsync('git add .', { cwd: testRepoPath });
      await execAsync('git commit -m "Other commit"', { cwd: testRepoPath });

      const result = await analyzer.analyze();

      expect(result.team.totalAuthors).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getRepositoryMetadata', () => {
    it('should extract repository metadata', async () => {
      const metadata = await analyzer.getRepositoryMetadata();

      expect(metadata.path).toBe(testRepoPath);
      expect(metadata.name).toBeDefined();
      expect(metadata.firstCommitDate).toBeInstanceOf(Date);
      expect(metadata.totalCommits).toBeGreaterThanOrEqual(1);
      expect(metadata.defaultBranch).toBeDefined();
    });
  });

  describe('Options', () => {
    it('should respect constructor options', () => {
      const limitedAnalyzer = new GitHistoryAnalyzer(testRepoPath, { maxCommits: 5 });
      expect(limitedAnalyzer).toBeDefined();

      const recentAnalyzer = new GitHistoryAnalyzer(testRepoPath, { sinceMonths: 1 });
      expect(recentAnalyzer).toBeDefined();
    });

    it('should filter excluded authors', () => {
      const analyzer = new GitHistoryAnalyzer(testRepoPath, {
        excludeAuthors: ['Bot User']
      });

      const commits = analyzer.parseCommitLog(
        `abc|Bot User|bot@x.com|1700000000|Automated commit
def|Human|human@x.com|1700100000|Human commit`
      );

      expect(commits.length).toBe(1);
      expect(commits[0].author).toBe('Human');
    });

    it('should filter excluded patterns', () => {
      const analyzer = new GitHistoryAnalyzer(testRepoPath, {
        excludePatterns: [/^Merge branch/]
      });

      const commits = analyzer.parseCommitLog(
        `abc|User|user@x.com|1700000000|Merge branch 'main'
def|User|user@x.com|1700100000|Real commit`
      );

      expect(commits.length).toBe(1);
      expect(commits[0].message).toBe('Real commit');
    });
  });

  describe('Helper functions', () => {
    describe('analyzeGitHistory', () => {
      it('should provide quick analysis', async () => {
        const result = await analyzeGitHistory(testRepoPath);

        expect(result.repository).toBeDefined();
        expect(result.velocity).toBeDefined();
        expect(result.maturity).toBeDefined();
      });
    });

    describe('getProjectMaturity', () => {
      it('should return maturity classification', async () => {
        const maturity = await getProjectMaturity(testRepoPath);

        expect(maturity.level).toBeDefined();
        expect(['nascent', 'mvp', 'production', 'mature']).toContain(maturity.level);
      });
    });

    describe('getTeamComposition', () => {
      it('should return team info', async () => {
        const team = await getTeamComposition(testRepoPath);

        expect(team.totalAuthors).toBeDefined();
        expect(team.teamSize).toBeDefined();
      });
    });
  });
});
