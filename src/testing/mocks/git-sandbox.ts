import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface GitLogOptions {
  limit?: number;
  since?: string;
  format?: string;
}

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

/**
 * GitSandbox provides isolated git repository environments for testing.
 *
 * Creates temporary git repositories that can be safely manipulated
 * without affecting real repositories. Automatically cleans up on destruction.
 *
 * @example
 * ```typescript
 * const sandbox = new GitSandbox();
 * await sandbox.initialize();
 * await sandbox.initRepo();
 * await sandbox.addCommit('Initial commit', { 'README.md': '# Test' });
 * const log = await sandbox.getLog({ limit: 1 });
 * await sandbox.cleanup();
 * ```
 */
export class GitSandbox {
  private sandboxPath: string = '';
  private initialized: boolean = false;

  constructor() {
    // Sandbox path will be set during initialization
  }

  /**
   * Initialize the sandbox by creating a temporary directory.
   * Must be called before any other operations.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Sandbox already initialized');
    }

    const prefix = path.join(os.tmpdir(), 'git-sandbox-');
    this.sandboxPath = fs.mkdtempSync(prefix);
    this.initialized = true;
  }

  /**
   * Clean up the sandbox by removing the temporary directory.
   * Safe to call multiple times.
   */
  async cleanup(): Promise<void> {
    if (!this.sandboxPath || !this.initialized) {
      return;
    }

    try {
      // Ensure we're cleaning up a temp directory (safety check)
      if (!this.sandboxPath.startsWith(os.tmpdir())) {
        throw new Error('Refusing to cleanup: path is not in temp directory');
      }

      fs.rmSync(this.sandboxPath, { recursive: true, force: true });
      this.initialized = false;
      this.sandboxPath = '';
    } catch (error) {
      // Log error but don't throw - cleanup should be best-effort
      console.error('Error during sandbox cleanup:', error);
    }
  }

  /**
   * Initialize a git repository in the sandbox.
   *
   * @param bareRepo - Whether to create a bare repository
   */
  async initRepo(bareRepo: boolean = false): Promise<void> {
    this.ensureInitialized();

    const args = bareRepo ? '--bare' : '';
    this.executeGit(`init ${args}`);

    // For non-bare repos, configure git identity and set initial branch
    if (!bareRepo) {
      this.executeGit('config user.name "Test User"');
      this.executeGit('config user.email "test@example.com"');
      this.executeGit('checkout -b main');
    }
  }

  /**
   * Create a commit with optional files.
   *
   * @param message - Commit message
   * @param files - Optional map of file paths to contents
   * @returns The commit hash
   */
  async addCommit(message: string, files?: Record<string, string>): Promise<string> {
    this.ensureInitialized();

    // Write files if provided
    if (files) {
      for (const [filePath, content] of Object.entries(files)) {
        await this.writeFile(filePath, content);
      }
    }

    // Stage all changes
    this.executeGit('add -A');

    // Create commit (allow empty commits if no files provided)
    const allowEmpty = files ? '' : '--allow-empty';
    this.executeGit(`commit ${allowEmpty} -m "${this.escapeMessage(message)}"`);

    // Get the commit hash
    const hash = this.executeGit('rev-parse HEAD').trim();
    return hash;
  }

  /**
   * Create a new branch.
   *
   * @param branchName - Name of the branch to create
   */
  async createBranch(branchName: string): Promise<void> {
    this.ensureInitialized();
    this.executeGit(`branch ${this.escapeBranchName(branchName)}`);
  }

  /**
   * Checkout a branch or commit.
   *
   * @param branchOrCommit - Branch name or commit hash
   */
  async checkout(branchOrCommit: string): Promise<void> {
    this.ensureInitialized();
    this.executeGit(`checkout ${this.escapeBranchName(branchOrCommit)}`);
  }

  /**
   * Merge a branch into the current branch.
   *
   * @param branch - Branch name to merge
   */
  async merge(branch: string): Promise<void> {
    this.ensureInitialized();
    this.executeGit(`merge ${this.escapeBranchName(branch)} --no-edit`);
  }

  /**
   * Get commit history.
   *
   * @param options - Log options (limit, since, format)
   * @returns Array of git commits
   */
  async getLog(options: GitLogOptions = {}): Promise<GitCommit[]> {
    this.ensureInitialized();

    const format = options.format || '%H|%an|%ai|%s';
    const limitArg = options.limit ? `-n ${options.limit}` : '';
    const sinceArg = options.since ? `--since="${options.since}"` : '';

    const args = `log --format="${format}" ${limitArg} ${sinceArg}`.trim();

    let output: string;
    try {
      output = this.executeGit(args);
    } catch (error) {
      // No commits yet - return empty array
      return [];
    }

    if (!output.trim()) {
      return [];
    }

    return output
      .trim()
      .split('\n')
      .map(line => {
        const [hash, author, date, message] = line.split('|');
        return {
          hash: hash.trim(),
          author: author.trim(),
          date: date.trim(),
          message: message.trim()
        };
      });
  }

  /**
   * Get repository status.
   *
   * @returns Current git status
   */
  async getStatus(): Promise<GitStatus> {
    this.ensureInitialized();

    // Get branch info
    let branch = 'HEAD';
    try {
      branch = this.executeGit('rev-parse --abbrev-ref HEAD').trim();
    } catch (error) {
      // No commits yet or detached HEAD
    }

    // Get ahead/behind counts
    let ahead = 0;
    let behind = 0;
    try {
      const upstream = this.executeGit('rev-parse --abbrev-ref @{u}').trim();
      const counts = this.executeGit(`rev-list --left-right --count ${upstream}...HEAD`).trim();
      const [behindStr, aheadStr] = counts.split('\t');
      ahead = parseInt(aheadStr, 10) || 0;
      behind = parseInt(behindStr, 10) || 0;
    } catch (error) {
      // No upstream or no commits
    }

    // Get file status
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    let statusOutput: string;
    try {
      statusOutput = this.executeGit('status --porcelain');
    } catch (error) {
      statusOutput = '';
    }

    if (statusOutput) {
      statusOutput.split("\n").filter(l => l.trim()).forEach(line => {
        const xy = line.substring(0, 2);
        const file = line.substring(3).trim();

        // First character: index (staged)
        // Second character: working tree (unstaged)
        const x = xy[0];
        const y = xy[1];

        if (x !== ' ' && x !== '?') {
          staged.push(file);
        }

        if (y !== ' ') {
          if (y === '?') {
            untracked.push(file);
          } else {
            unstaged.push(file);
          }
        }
      });
    }

    return {
      branch,
      ahead,
      behind,
      staged,
      unstaged,
      untracked
    };
  }

  /**
   * Write a file to the sandbox.
   *
   * @param relativePath - Path relative to sandbox root
   * @param content - File content
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    this.ensureInitialized();
    this.validatePath(relativePath);

    const fullPath = path.join(this.sandboxPath, relativePath);
    const dir = path.dirname(fullPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  /**
   * Read a file from the sandbox.
   *
   * @param relativePath - Path relative to sandbox root
   * @returns File content
   */
  async readFile(relativePath: string): Promise<string> {
    this.ensureInitialized();
    this.validatePath(relativePath);

    const fullPath = path.join(this.sandboxPath, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
  }

  /**
   * Delete a file from the sandbox.
   *
   * @param relativePath - Path relative to sandbox root
   */
  async deleteFile(relativePath: string): Promise<void> {
    this.ensureInitialized();
    this.validatePath(relativePath);

    const fullPath = path.join(this.sandboxPath, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  /**
   * Get the absolute path to the sandbox directory.
   *
   * @returns Absolute path to sandbox
   */
  getPath(): string {
    this.ensureInitialized();
    return this.sandboxPath;
  }

  /**
   * Execute a git command in the sandbox.
   *
   * @param command - Git command (without 'git' prefix)
   * @returns Command output
   */
  executeGit(command: string): string {
    this.ensureInitialized();

    try {
      return execSync(`git ${command}`, {
        cwd: this.sandboxPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error: any) {
      // Re-throw with better error message
      const message = error.stderr || error.message || 'Unknown git error';
      throw new Error(`Git command failed: ${command}\n${message}`);
    }
  }

  /**
   * Ensure the sandbox is initialized before operations.
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.sandboxPath) {
      throw new Error('Sandbox not initialized. Call initialize() first.');
    }
  }

  /**
   * Validate that a path doesn't escape the sandbox.
   */
  private validatePath(relativePath: string): void {
    const fullPath = path.resolve(this.sandboxPath, relativePath);
    if (!fullPath.startsWith(this.sandboxPath)) {
      throw new Error('Path escapes sandbox directory');
    }
  }

  /**
   * Escape commit message for shell execution.
   */
  private escapeMessage(message: string): string {
    return message.replace(/"/g, '\\"');
  }

  /**
   * Escape branch name for shell execution.
   */
  private escapeBranchName(branch: string): string {
    // Validate branch name format
    if (!/^[a-zA-Z0-9/_-]+$/.test(branch)) {
      throw new Error('Invalid branch name format');
    }
    return branch;
  }
}
