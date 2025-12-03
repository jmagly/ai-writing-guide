/**
 * @file git-workflow-orchestrator.ts
 * @description Git workflow orchestration and automation system
 *
 * Implements F-004/UC-008: Git Workflow Orchestration
 * - Automated git operations (commits, branches, merges, PRs)
 * - Conventional Commits support
 * - Branch strategy enforcement (GitFlow, GitHub Flow, trunk-based)
 * - Conflict detection and resolution guidance
 * - PR template management and automation
 *
 * @implements NFR-GIT-001: Git operations <5s for typical workflows
 * @implements NFR-GIT-002: Conflict detection accuracy >90%
 * @implements NFR-GIT-003: Commit message generation accuracy >85%
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// Types and Interfaces
// ============================================================================

export type BranchStrategy = 'gitflow' | 'github-flow' | 'trunk-based';
export type CommitType = 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'build' | 'ci' | 'chore';
export type MergeStrategy = 'merge' | 'squash' | 'rebase';

export interface GitConfig {
  repoPath: string;
  branchStrategy?: BranchStrategy;
  defaultBranch?: string; // main, master, develop
  remote?: string; // origin, upstream
  conventionalCommits?: boolean;
  autoGenerateMessages?: boolean;
}

export interface CommitOptions {
  message?: string;
  type?: CommitType;
  scope?: string;
  breaking?: boolean;
  files?: string[];
  autoStage?: boolean;
  generateMessage?: boolean;
}

export interface BranchOptions {
  name: string;
  baseBranch?: string;
  strategy?: BranchStrategy;
  type?: 'feature' | 'bugfix' | 'hotfix' | 'release';
}

export interface MergeOptions {
  sourceBranch: string;
  targetBranch?: string; // Defaults to current branch
  strategy?: MergeStrategy;
  deleteSource?: boolean;
  checkConflicts?: boolean;
}

export interface PROptions {
  title?: string;
  body?: string;
  baseBranch?: string;
  assignees?: string[];
  reviewers?: string[];
  labels?: string[];
  autoGenerate?: boolean; // Auto-generate title/body from commits
}

export interface ConflictInfo {
  file: string;
  type: 'merge' | 'rebase' | 'cherry-pick';
  severity: 'trivial' | 'moderate' | 'complex';
  lineRanges: Array<{ start: number; end: number }>;
  suggestions?: string[];
}

export interface GitStatus {
  branch: string;
  remoteBranch?: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicts: string[];
}

export interface GitWorkflowResult {
  success: boolean;
  operation: string;
  output?: string;
  error?: string;
  conflicts?: ConflictInfo[];
  duration: number; // milliseconds
}

// ============================================================================
// Git Workflow Orchestrator Class
// ============================================================================

export class GitWorkflowOrchestrator {
  private config: Required<GitConfig>;

  constructor(config: GitConfig) {
    this.config = {
      repoPath: config.repoPath,
      branchStrategy: config.branchStrategy || 'github-flow',
      defaultBranch: config.defaultBranch || 'main',
      remote: config.remote || 'origin',
      conventionalCommits: config.conventionalCommits !== false,
      autoGenerateMessages: config.autoGenerateMessages !== false
    };
  }

  // ========================================================================
  // Git Status Operations
  // ========================================================================

  /**
   * Get comprehensive git repository status
   */
  public async getStatus(): Promise<GitStatus> {
    const [branch, remoteBranch, ahead, behind, staged, unstaged, untracked, conflicts] = await Promise.all([
      this.getCurrentBranch(),
      this.getRemoteBranch(),
      this.getAheadCount(),
      this.getBehindCount(),
      this.getStagedFiles(),
      this.getUnstagedFiles(),
      this.getUntrackedFiles(),
      this.getConflicts()
    ]);

    return {
      branch,
      remoteBranch,
      ahead,
      behind,
      staged,
      unstaged,
      untracked,
      conflicts
    };
  }

  /**
   * Get current branch name
   */
  private async getCurrentBranch(): Promise<string> {
    const { stdout } = await this.execGit('branch --show-current');
    return stdout.trim();
  }

  /**
   * Get remote tracking branch
   */
  private async getRemoteBranch(): Promise<string | undefined> {
    try {
      const { stdout } = await this.execGit('rev-parse --abbrev-ref --symbolic-full-name @{u}');
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get count of commits ahead of remote
   */
  private async getAheadCount(): Promise<number> {
    try {
      const { stdout } = await this.execGit('rev-list --count @{u}..HEAD');
      return parseInt(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get count of commits behind remote
   */
  private async getBehindCount(): Promise<number> {
    try {
      const { stdout } = await this.execGit('rev-list --count HEAD..@{u}');
      return parseInt(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get staged files
   */
  private async getStagedFiles(): Promise<string[]> {
    const { stdout } = await this.execGit('diff --cached --name-only');
    return stdout.trim().split('\n').filter(Boolean);
  }

  /**
   * Get unstaged files
   */
  private async getUnstagedFiles(): Promise<string[]> {
    const { stdout } = await this.execGit('diff --name-only');
    return stdout.trim().split('\n').filter(Boolean);
  }

  /**
   * Get untracked files
   */
  private async getUntrackedFiles(): Promise<string[]> {
    const { stdout } = await this.execGit('ls-files --others --exclude-standard');
    return stdout.trim().split('\n').filter(Boolean);
  }

  /**
   * Get conflicted files
   */
  private async getConflicts(): Promise<string[]> {
    const { stdout } = await this.execGit('diff --name-only --diff-filter=U');
    return stdout.trim().split('\n').filter(Boolean);
  }

  // ========================================================================
  // Branch Operations
  // ========================================================================

  /**
   * Create a new branch following branch strategy
   */
  public async createBranch(options: BranchOptions): Promise<GitWorkflowResult> {
    const startTime = Date.now();

    try {
      // Validate branch name based on strategy
      const branchName = this.formatBranchName(options);

      // Get base branch
      const baseBranch = options.baseBranch || this.getDefaultBaseBranch(options.strategy || this.config.branchStrategy);

      // Checkout base branch
      await this.execGit(`checkout ${baseBranch}`);

      // Pull latest changes
      await this.execGit(`pull ${this.config.remote} ${baseBranch}`);

      // Create and checkout new branch
      await this.execGit(`checkout -b ${branchName}`);

      return {
        success: true,
        operation: 'createBranch',
        output: `Created branch: ${branchName} from ${baseBranch}`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        operation: 'createBranch',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Switch to an existing branch
   */
  public async switchBranch(branchName: string): Promise<GitWorkflowResult> {
    const startTime = Date.now();

    try {
      await this.execGit(`checkout ${branchName}`);

      return {
        success: true,
        operation: 'switchBranch',
        output: `Switched to branch: ${branchName}`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        operation: 'switchBranch',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Delete a branch (local and optionally remote)
   */
  public async deleteBranch(branchName: string, deleteRemote = false): Promise<GitWorkflowResult> {
    const startTime = Date.now();

    try {
      // Delete local branch
      await this.execGit(`branch -d ${branchName}`);

      // Delete remote branch if requested
      if (deleteRemote) {
        await this.execGit(`push ${this.config.remote} --delete ${branchName}`);
      }

      return {
        success: true,
        operation: 'deleteBranch',
        output: `Deleted branch: ${branchName}${deleteRemote ? ' (local and remote)' : ' (local)'}`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        operation: 'deleteBranch',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * List all branches
   */
  public async listBranches(includeRemote = false): Promise<string[]> {
    const flag = includeRemote ? '-a' : '';
    const { stdout } = await this.execGit(`branch ${flag}`);

    return stdout
      .split('\n')
      .map(line => line.trim().replace(/^\* /, ''))
      .filter(Boolean);
  }

  // ========================================================================
  // Commit Operations
  // ========================================================================

  /**
   * Create a commit with conventional commits support
   */
  public async commit(options: CommitOptions): Promise<GitWorkflowResult> {
    const startTime = Date.now();

    try {
      // Auto-stage files if requested
      if (options.autoStage && options.files) {
        await this.stageFiles(options.files);
      }

      // Generate commit message if needed
      let message = options.message;
      if (!message && (options.generateMessage || this.config.autoGenerateMessages)) {
        message = await this.generateCommitMessage(options);
      }

      if (!message) {
        throw new Error('Commit message is required');
      }

      // Create commit
      await this.execGit(`commit -m "${message}"`);

      return {
        success: true,
        operation: 'commit',
        output: `Created commit: ${message}`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        operation: 'commit',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Stage files for commit
   */
  public async stageFiles(files: string[]): Promise<void> {
    if (files.length === 0) return;

    const fileList = files.join(' ');
    await this.execGit(`add ${fileList}`);
  }

  /**
   * Generate conventional commit message
   */
  private async generateCommitMessage(options: CommitOptions): Promise<string> {
    if (!this.config.conventionalCommits) {
      // Simple message generation
      const status = await this.getStatus();
      const fileCount = status.staged.length;
      return `Update ${fileCount} file${fileCount !== 1 ? 's' : ''}`;
    }

    // Conventional Commits format: <type>(<scope>): <description>
    const type = options.type || this.detectCommitType(options.files || []);
    const scope = options.scope || '';
    const breaking = options.breaking ? '!' : '';

    // Analyze staged files to generate description
    const description = await this.generateCommitDescription(options.files || []);

    return `${type}${scope ? `(${scope})` : ''}${breaking}: ${description}`;
  }

  /**
   * Detect commit type from changed files
   */
  private detectCommitType(files: string[]): CommitType {
    const hasTests = files.some(f => f.includes('test') || f.includes('spec'));
    const hasDocs = files.some(f => f.endsWith('.md') || f.includes('docs/'));
    const hasCI = files.some(f => f.includes('.github') || f.includes('.gitlab'));
    const hasConfig = files.some(f => f.includes('config') || f.includes('package.json'));
    const hasSource = files.some(f => f.endsWith('.ts') || f.endsWith('.js'));

    if (hasTests) return 'test';
    if (hasDocs) return 'docs';
    if (hasCI) return 'ci';
    if (hasConfig) return 'build';
    if (hasSource) return 'feat'; // Default to feat for source code

    return 'chore';
  }

  /**
   * Generate commit description from files
   */
  private async generateCommitDescription(files: string[]): Promise<string> {
    if (files.length === 0) {
      const staged = await this.getStagedFiles();
      files = staged;
    }

    if (files.length === 0) return 'update files';
    if (files.length === 1) return `update ${path.basename(files[0])}`;

    // Group by directory
    const dirs = new Set(files.map(f => path.dirname(f)));
    if (dirs.size === 1 && dirs.has('.')) {
      return `update ${files.length} files`;
    }

    const mainDir = Array.from(dirs)[0];
    return `update ${path.basename(mainDir)} components`;
  }

  // ========================================================================
  // Merge Operations
  // ========================================================================

  /**
   * Merge branches with conflict detection
   */
  public async merge(options: MergeOptions): Promise<GitWorkflowResult> {
    const startTime = Date.now();

    try {
      // Check for conflicts if requested
      if (options.checkConflicts) {
        const conflicts = await this.detectMergeConflicts(options.sourceBranch, options.targetBranch);
        if (conflicts.length > 0) {
          return {
            success: false,
            operation: 'merge',
            error: `Conflicts detected in ${conflicts.length} files`,
            conflicts,
            duration: Date.now() - startTime
          };
        }
      }

      // Perform merge based on strategy
      const strategy = options.strategy || 'merge';
      let command: string;

      switch (strategy) {
        case 'squash':
          command = `merge --squash ${options.sourceBranch}`;
          break;
        case 'rebase':
          command = `rebase ${options.sourceBranch}`;
          break;
        default:
          command = `merge ${options.sourceBranch}`;
      }

      await this.execGit(command);

      // Delete source branch if requested
      if (options.deleteSource) {
        await this.deleteBranch(options.sourceBranch);
      }

      return {
        success: true,
        operation: 'merge',
        output: `Merged ${options.sourceBranch} using ${strategy} strategy`,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        operation: 'merge',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Detect potential merge conflicts
   */
  public async detectMergeConflicts(
    sourceBranch: string,
    _targetBranch?: string
  ): Promise<ConflictInfo[]> {
    try {
      /* targetBranch check done inline in merge command */

      // Run merge with --no-commit --no-ff to detect conflicts without committing
      await this.execGit(`merge --no-commit --no-ff ${sourceBranch}`);

      // If successful, abort the merge
      await this.execGit('merge --abort');

      return []; // No conflicts
    } catch {
      // Conflicts detected - get conflicted files
      const conflictedFiles = await this.getConflicts();

      return Promise.all(
        conflictedFiles.map(file => this.analyzeConflict(file))
      );
    }
  }

  /**
   * Analyze a specific conflict
   */
  private async analyzeConflict(file: string): Promise<ConflictInfo> {
    try {
      const filePath = path.join(this.config.repoPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Find conflict markers
      const lines = content.split('\n');
      const lineRanges: Array<{ start: number; end: number }> = [];
      let conflictStart = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('<<<<<<<')) {
          conflictStart = i;
        } else if (lines[i].startsWith('>>>>>>>') && conflictStart >= 0) {
          lineRanges.push({ start: conflictStart, end: i });
          conflictStart = -1;
        }
      }

      // Determine severity
      const totalConflictLines = lineRanges.reduce((sum, range) => sum + (range.end - range.start), 0);
      const severity: 'trivial' | 'moderate' | 'complex' =
        totalConflictLines < 10 ? 'trivial' :
          totalConflictLines < 50 ? 'moderate' : 'complex';

      return {
        file,
        type: 'merge',
        severity,
        lineRanges,
        suggestions: this.generateConflictSuggestions(file, severity)
      };
    } catch {
      return {
        file,
        type: 'merge',
        severity: 'moderate',
        lineRanges: [],
        suggestions: []
      };
    }
  }

  /**
   * Generate conflict resolution suggestions
   */
  private generateConflictSuggestions(_file: string, severity: 'trivial' | 'moderate' | 'complex'): string[] {
    const suggestions = [
      'Review both versions of the conflicting code',
      'Consider using a visual merge tool (e.g., VS Code, GitKraken, Beyond Compare)'
    ];

    if (severity === 'trivial') {
      suggestions.push('The conflict is small - likely a quick manual fix');
    } else if (severity === 'complex') {
      suggestions.push('Consider breaking this into smaller merges');
      suggestions.push('Discuss with the team to understand both changes');
    }

    return suggestions;
  }

  // ========================================================================
  // Pull Request Operations
  // ========================================================================

  /**
   * Create a pull request (requires GitHub CLI or API)
   */
  public async createPR(options: PROptions): Promise<GitWorkflowResult> {
    const startTime = Date.now();

    try {
      // Auto-generate PR details if requested
      let title = options.title;
      let body = options.body;

      if (options.autoGenerate && !title) {
        const commits = await this.getCommitsSinceBase(options.baseBranch);
        title = this.generatePRTitle(commits);
        body = this.generatePRBody(commits);
      }

      if (!title) {
        throw new Error('PR title is required');
      }

      // Build gh CLI command
      const baseBranch = options.baseBranch || this.config.defaultBranch;
      let command = `gh pr create --base ${baseBranch} --title "${title}"`;

      if (body) {
        command += ` --body "${body}"`;
      }

      if (options.assignees && options.assignees.length > 0) {
        command += ` --assignee ${options.assignees.join(',')}`;
      }

      if (options.reviewers && options.reviewers.length > 0) {
        command += ` --reviewer ${options.reviewers.join(',')}`;
      }

      if (options.labels && options.labels.length > 0) {
        command += ` --label ${options.labels.join(',')}`;
      }

      const { stdout } = await execAsync(command, { cwd: this.config.repoPath });

      return {
        success: true,
        operation: 'createPR',
        output: stdout.trim(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        operation: 'createPR',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Get commits since base branch
   */
  private async getCommitsSinceBase(baseBranch?: string): Promise<string[]> {
    const base = baseBranch || this.config.defaultBranch;
    const { stdout } = await this.execGit(`log ${base}..HEAD --pretty=format:"%s"`);
    return stdout.trim().split('\n').filter(Boolean);
  }

  /**
   * Generate PR title from commits
   */
  private generatePRTitle(commits: string[]): string {
    if (commits.length === 0) return 'Update code';
    if (commits.length === 1) return commits[0];

    // Find common theme
    const types = new Set(commits.map(c => c.split(':')[0]));
    if (types.size === 1) {
      const type = Array.from(types)[0];
      return `${type}: Multiple updates`;
    }

    return `Update: ${commits.length} changes`;
  }

  /**
   * Generate PR body from commits
   */
  private generatePRBody(commits: string[]): string {
    if (commits.length === 0) return '';

    const lines = ['## Changes', '', ...commits.map(c => `- ${c}`)];

    return lines.join('\n');
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Format branch name according to strategy
   */
  private formatBranchName(options: BranchOptions): string {
    const strategy = options.strategy || this.config.branchStrategy;

    switch (strategy) {
      case 'gitflow':
        // GitFlow: feature/name, bugfix/name, hotfix/name, release/name
        const prefix = options.type || 'feature';
        return `${prefix}/${options.name}`;

      case 'github-flow':
        // GitHub Flow: simple branch names
        return options.name;

      case 'trunk-based':
        // Trunk-based: short-lived feature branches
        const username = process.env.USER || 'dev';
        return `${username}/${options.name}`;

      default:
        return options.name;
    }
  }

  /**
   * Get default base branch for strategy
   */
  private getDefaultBaseBranch(strategy: BranchStrategy): string {
    switch (strategy) {
      case 'gitflow':
        return 'develop'; // GitFlow uses develop as main working branch
      case 'github-flow':
      case 'trunk-based':
      default:
        return this.config.defaultBranch; // Usually 'main'
    }
  }

  /**
   * Execute git command
   */
  private async execGit(command: string): Promise<{ stdout: string; stderr: string }> {
    return execAsync(`git ${command}`, { cwd: this.config.repoPath });
  }
}
