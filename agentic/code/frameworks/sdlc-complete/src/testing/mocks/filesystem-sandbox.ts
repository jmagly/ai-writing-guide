import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface WriteOptions {
  encoding?: BufferEncoding;
  mode?: number;
  flag?: string;
}

export interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * FilesystemSandbox provides isolated temporary filesystems for testing.
 *
 * Creates temporary directory structures that can be safely manipulated
 * without affecting the real filesystem. Automatically cleans up on destruction.
 *
 * @example
 * ```typescript
 * const sandbox = new FilesystemSandbox();
 * await sandbox.initialize();
 * await sandbox.writeFile('test.txt', 'Hello World');
 * const content = await sandbox.readFile('test.txt');
 * await sandbox.cleanup();
 * ```
 */
export class FilesystemSandbox {
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

    const prefix = path.join(os.tmpdir(), 'aiwg-sandbox-');
    this.sandboxPath = await fs.mkdtemp(prefix);
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

      await fs.rm(this.sandboxPath, { recursive: true, force: true });
      this.initialized = false;
      this.sandboxPath = '';
    } catch (error) {
      // Log error but don't throw - cleanup should be best-effort
      console.error('Error during sandbox cleanup:', error);
    }
  }

  /**
   * Write a file to the sandbox.
   *
   * @param relativePath - Path relative to sandbox root
   * @param content - File content (string or Buffer)
   * @param options - Write options (encoding, mode, flag)
   */
  async writeFile(
    relativePath: string,
    content: string | Buffer,
    options?: WriteOptions
  ): Promise<void> {
    this.ensureInitialized();
    this.validatePath(relativePath);

    const fullPath = this.resolvePath(relativePath);
    const dir = path.dirname(fullPath);

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    // Write file with options
    await fs.writeFile(fullPath, content, options);
  }

  /**
   * Read a file from the sandbox.
   *
   * @param relativePath - Path relative to sandbox root
   * @param encoding - Optional encoding (if not provided, returns Buffer)
   * @returns File content as string or Buffer
   */
  async readFile(relativePath: string): Promise<string>;
  async readFile(relativePath: string, encoding: BufferEncoding): Promise<string>;
  async readFile(relativePath: string, encoding: null): Promise<Buffer>;
  async readFile(
    relativePath: string,
    encoding?: BufferEncoding | null
  ): Promise<string | Buffer> {
    this.ensureInitialized();
    this.validatePath(relativePath);

    const fullPath = this.resolvePath(relativePath);

    if (encoding === null) {
      return await fs.readFile(fullPath);
    }

    return await fs.readFile(fullPath, encoding || 'utf-8');
  }

  /**
   * Delete a file from the sandbox.
   *
   * @param relativePath - Path relative to sandbox root
   */
  async deleteFile(relativePath: string): Promise<void> {
    this.ensureInitialized();
    this.validatePath(relativePath);

    const fullPath = this.resolvePath(relativePath);
    await fs.unlink(fullPath);
  }

  /**
   * Check if a file exists.
   *
   * @param relativePath - Path relative to sandbox root
   * @returns True if file exists
   */
  async fileExists(relativePath: string): Promise<boolean> {
    this.ensureInitialized();
    this.validatePath(relativePath);

    const fullPath = this.resolvePath(relativePath);

    try {
      const stat = await fs.stat(fullPath);
      return stat.isFile();
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file statistics.
   *
   * @param relativePath - Path relative to sandbox root
   * @returns File statistics
   */
  async getFileStats(relativePath: string): Promise<FileStats> {
    this.ensureInitialized();
    this.validatePath(relativePath);

    const fullPath = this.resolvePath(relativePath);
    const stat = await fs.stat(fullPath);

    return {
      size: stat.size,
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      createdAt: stat.birthtime,
      modifiedAt: stat.mtime
    };
  }

  /**
   * Create a directory in the sandbox.
   *
   * @param relativePath - Path relative to sandbox root
   */
  async createDirectory(relativePath: string): Promise<void> {
    this.ensureInitialized();
    this.validatePath(relativePath);

    const fullPath = this.resolvePath(relativePath);
    await fs.mkdir(fullPath, { recursive: true });
  }

  /**
   * Delete a directory from the sandbox.
   *
   * @param relativePath - Path relative to sandbox root
   * @param recursive - Whether to delete recursively (default: false)
   */
  async deleteDirectory(relativePath: string, recursive: boolean = false): Promise<void> {
    this.ensureInitialized();
    this.validatePath(relativePath);

    const fullPath = this.resolvePath(relativePath);

    if (recursive) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.rmdir(fullPath);
    }
  }

  /**
   * List directory contents.
   *
   * @param relativePath - Path relative to sandbox root (default: root)
   * @returns Array of file/directory names
   */
  async listDirectory(relativePath: string = '.'): Promise<string[]> {
    this.ensureInitialized();
    this.validatePath(relativePath);

    const fullPath = this.resolvePath(relativePath);
    return await fs.readdir(fullPath);
  }

  /**
   * Check if a directory exists.
   *
   * @param relativePath - Path relative to sandbox root
   * @returns True if directory exists
   */
  async directoryExists(relativePath: string): Promise<boolean> {
    this.ensureInitialized();
    this.validatePath(relativePath);

    const fullPath = this.resolvePath(relativePath);

    try {
      const stat = await fs.stat(fullPath);
      return stat.isDirectory();
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get the absolute path to a file/directory in the sandbox.
   *
   * @param relativePath - Optional relative path (default: sandbox root)
   * @returns Absolute path
   */
  getPath(relativePath?: string): string {
    this.ensureInitialized();

    if (!relativePath) {
      return this.sandboxPath;
    }

    this.validatePath(relativePath);
    return this.resolvePath(relativePath);
  }

  /**
   * Copy a file from the real filesystem into the sandbox.
   *
   * @param realPath - Path in the real filesystem
   * @param sandboxPath - Target path in sandbox (relative)
   */
  async copyFromReal(realPath: string, sandboxPath: string): Promise<void> {
    this.ensureInitialized();
    this.validatePath(sandboxPath);

    const sourcePath = path.resolve(realPath);
    const targetPath = this.resolvePath(sandboxPath);
    const targetDir = path.dirname(targetPath);

    // Create target directory if needed
    await fs.mkdir(targetDir, { recursive: true });

    // Copy file
    await fs.copyFile(sourcePath, targetPath);
  }

  /**
   * Copy a file from the sandbox to the real filesystem.
   *
   * @param sandboxPath - Source path in sandbox (relative)
   * @param realPath - Target path in the real filesystem
   */
  async copyToReal(sandboxPath: string, realPath: string): Promise<void> {
    this.ensureInitialized();
    this.validatePath(sandboxPath);

    const sourcePath = this.resolvePath(sandboxPath);
    const targetPath = path.resolve(realPath);
    const targetDir = path.dirname(targetPath);

    // Create target directory if needed
    await fs.mkdir(targetDir, { recursive: true });

    // Copy file
    await fs.copyFile(sourcePath, targetPath);
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
   *
   * @param relativePath - Path to validate
   * @throws Error if path is invalid or escapes sandbox
   */
  private validatePath(relativePath: string): void {
    // Reject absolute paths
    if (path.isAbsolute(relativePath)) {
      throw new Error('Absolute paths are not allowed in sandbox');
    }

    // Reject paths with null bytes
    if (relativePath.includes('\0')) {
      throw new Error('Path contains null bytes');
    }

    // Resolve the full path and ensure it's within sandbox
    const fullPath = path.resolve(this.sandboxPath, relativePath);
    if (!fullPath.startsWith(this.sandboxPath)) {
      throw new Error('Path escapes sandbox directory');
    }
  }

  /**
   * Resolve a relative path to an absolute path within the sandbox.
   *
   * @param relativePath - Relative path
   * @returns Absolute path
   */
  private resolvePath(relativePath: string): string {
    return path.join(this.sandboxPath, relativePath);
  }
}
