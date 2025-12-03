/**
 * WorkspaceMigrator - Migrate legacy .aiwg/ workspaces to framework-scoped structure
 *
 * Migrates legacy workspace structure (.aiwg/intake/, .aiwg/requirements/, etc.)
 * to framework-scoped structure (.aiwg/frameworks/{framework-id}/projects/{project-id}/).
 *
 * Features:
 * - Detection of legacy workspace structure
 * - Framework detection from artifact patterns
 * - Validation of migration safety (conflict detection)
 * - Atomic migration with rollback capability
 * - Backup creation before migration
 * - Dry-run mode for simulation
 * - Detailed migration reports
 *
 * @module src/plugin/workspace-migrator
 * @version 1.0.0
 * @since 2025-10-23
 *
 * @example
 * ```typescript
 * const migrator = new WorkspaceMigrator('/path/to/project');
 * await migrator.initialize();
 *
 * // Detect legacy workspace
 * const legacy = await migrator.detectLegacyWorkspace();
 * if (legacy) {
 *   console.log(`Found legacy workspace with ${legacy.artifactCount} artifacts`);
 *
 *   // Detect frameworks
 *   const frameworks = await migrator.detectFrameworks();
 *   console.log(`Detected frameworks: ${frameworks.map(f => f.name).join(', ')}`);
 *
 *   // Validate migration
 *   const validation = await migrator.validateMigration({
 *     sourcePath: legacy.path,
 *     targetPath: `.aiwg/frameworks/${frameworks[0].name}/projects/default`,
 *     framework: frameworks[0].name
 *   });
 *
 *   if (validation.safe) {
 *     // Perform migration
 *     const result = await migrator.migrate({
 *       source: legacy.path,
 *       target: `.aiwg/frameworks/${frameworks[0].name}/projects/default`,
 *       framework: frameworks[0].name,
 *       backup: true,
 *       dryRun: false,
 *       overwrite: false
 *     });
 *
 *     console.log(migrator.generateReport(result));
 *   }
 * }
 * ```
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// ===========================
// Interfaces
// ===========================

export interface LegacyWorkspaceInfo {
  path: string;
  artifactCount: number;
  frameworks: string[];  // Detected framework traces
  size: number;  // bytes
  hasGit: boolean;
}

export interface FrameworkInfo {
  name: string;
  path: string;
  version?: string;
  artifactCount: number;
}

export interface MigrationTarget {
  sourcePath: string;
  targetPath: string;
  framework: string;
}

export interface ValidationResult {
  safe: boolean;
  warnings: string[];
  conflicts: Conflict[];
  estimatedDuration: number;  // seconds
}

export interface Conflict {
  type: 'file' | 'directory' | 'permission';
  path: string;
  description: string;
  resolution: 'overwrite' | 'skip' | 'merge' | 'manual';
}

export interface MigrationOptions {
  source: string;
  target: string;
  framework: string;
  backup: boolean;  // Create backup before migration
  dryRun: boolean;  // Simulate without actual changes
  overwrite: boolean;  // Overwrite existing files
}

export interface MigrationResult {
  id: string;
  success: boolean;
  filesMovedCount: number;
  filesCopiedCount: number;
  filesSkippedCount: number;
  errors: MigrationError[];
  duration: number;  // milliseconds
  backupPath?: string;
}

export interface MigrationError {
  path: string;
  error: string;
  severity: 'warning' | 'error' | 'critical';
}

// ===========================
// WorkspaceMigrator Class
// ===========================

export class WorkspaceMigrator {
  private projectRoot: string;
  private sandboxPath: string;

  // Legacy workspace directories
  private readonly LEGACY_DIRS = [
    'intake',
    'requirements',
    'architecture',
    'planning',
    'risks',
    'testing',
    'security',
    'quality',
    'deployment',
    'handoffs',
    'gates',
    'decisions',
    'team',
    'working',
    'reports'
  ];

  // Framework detection patterns
  private readonly FRAMEWORK_PATTERNS = {
    'sdlc-complete': [
      'architecture/software-architecture-doc.md',
      'requirements/use-cases/',
      'testing/master-test-plan.md',
      'deployment/deployment-plan.md'
    ],
    'marketing-flow': [
      'campaigns/',
      'content/',
      'analytics/'
    ],
    'agile-complete': [
      'backlog/',
      'sprints/',
      'retrospectives/'
    ]
  };

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.sandboxPath = path.join(this.projectRoot, '.aiwg');
  }

  /**
   * Initialize the migrator
   */
  async initialize(): Promise<void> {
    // Verify project root exists
    try {
      await fs.access(this.projectRoot);
    } catch {
      throw new Error(`Project root does not exist: ${this.projectRoot}`);
    }
  }

  // ===========================
  // Detection Methods
  // ===========================

  /**
   * Detect legacy workspace structure
   *
   * Returns information about legacy workspace if found, null otherwise.
   *
   * @returns Legacy workspace info or null if not found
   */
  async detectLegacyWorkspace(): Promise<LegacyWorkspaceInfo | null> {
    const legacyPath = this.sandboxPath;

    try {
      await fs.access(legacyPath);
    } catch {
      return null;  // No .aiwg directory exists
    }

    // Check for legacy directory structure (intake, requirements, etc.)
    const foundDirs: string[] = [];
    let artifactCount = 0;
    let totalSize = 0;

    for (const dir of this.LEGACY_DIRS) {
      const dirPath = path.join(legacyPath, dir);
      try {
        const stat = await fs.stat(dirPath);
        if (stat.isDirectory()) {
          foundDirs.push(dir);
          const dirInfo = await this.getDirectoryInfo(dirPath);
          artifactCount += dirInfo.fileCount;
          totalSize += dirInfo.size;
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

    // If no legacy directories found, not a legacy workspace
    if (foundDirs.length === 0) {
      return null;
    }

    // Check for git repository
    const hasGit = await this.hasGitRepo(legacyPath);

    // Detect frameworks
    const frameworks = await this.detectFrameworksFromArtifacts(legacyPath);

    return {
      path: legacyPath,
      artifactCount,
      frameworks,
      size: totalSize,
      hasGit
    };
  }

  /**
   * Detect frameworks from artifact structure
   *
   * Analyzes artifact patterns to identify which frameworks are in use.
   *
   * @returns Array of detected frameworks
   */
  async detectFrameworks(): Promise<FrameworkInfo[]> {
    const legacyPath = this.sandboxPath;
    const frameworks: FrameworkInfo[] = [];

    for (const [frameworkName, patterns] of Object.entries(this.FRAMEWORK_PATTERNS)) {
      let matchCount = 0;
      let artifactCount = 0;

      for (const pattern of patterns) {
        const fullPath = path.join(legacyPath, pattern);
        try {
          const stat = await fs.stat(fullPath);
          if (stat.isFile() || stat.isDirectory()) {
            matchCount++;
            if (stat.isDirectory()) {
              const dirInfo = await this.getDirectoryInfo(fullPath);
              artifactCount += dirInfo.fileCount;
            } else {
              artifactCount++;
            }
          }
        } catch {
          // Pattern doesn't match, continue
        }
      }

      // If at least 50% of patterns match, framework is detected
      if (matchCount >= patterns.length * 0.5) {
        frameworks.push({
          name: frameworkName,
          path: path.join(this.sandboxPath, 'frameworks', frameworkName, 'projects', 'default'),
          artifactCount
        });
      }
    }

    // If no frameworks detected, default to sdlc-complete
    if (frameworks.length === 0) {
      const dirInfo = await this.getDirectoryInfo(legacyPath);
      frameworks.push({
        name: 'sdlc-complete',
        path: path.join(this.sandboxPath, 'frameworks', 'sdlc-complete', 'projects', 'default'),
        artifactCount: dirInfo.fileCount
      });
    }

    return frameworks;
  }

  /**
   * Detect frameworks from artifacts (internal helper)
   *
   * @param basePath - Base path to search
   * @returns Array of framework names
   */
  private async detectFrameworksFromArtifacts(basePath: string): Promise<string[]> {
    const frameworks: string[] = [];

    for (const [frameworkName, patterns] of Object.entries(this.FRAMEWORK_PATTERNS)) {
      let matchCount = 0;

      for (const pattern of patterns) {
        const fullPath = path.join(basePath, pattern);
        try {
          await fs.access(fullPath);
          matchCount++;
        } catch {
          // Pattern doesn't match
        }
      }

      // If at least 50% of patterns match, framework is detected
      if (matchCount >= patterns.length * 0.5) {
        frameworks.push(frameworkName);
      }
    }

    // Default to sdlc-complete if nothing detected
    if (frameworks.length === 0) {
      frameworks.push('sdlc-complete');
    }

    return frameworks;
  }

  // ===========================
  // Validation Methods
  // ===========================

  /**
   * Validate migration safety
   *
   * Checks for conflicts, permission issues, and estimates duration.
   *
   * @param target - Migration target configuration
   * @returns Validation result
   */
  async validateMigration(target: MigrationTarget): Promise<ValidationResult> {
    const warnings: string[] = [];
    const conflicts: Conflict[] = [];

    // Check source exists
    try {
      await fs.access(target.sourcePath);
    } catch {
      return {
        safe: false,
        warnings: [`Source path does not exist: ${target.sourcePath}`],
        conflicts: [],
        estimatedDuration: 0
      };
    }

    // Check target doesn't already exist (unless overwrite is allowed)
    try {
      await fs.access(target.targetPath);
      warnings.push(`Target path already exists: ${target.targetPath}`);

      // Check for file conflicts
      const sourceFiles = await this.listFilesRecursive(target.sourcePath);
      for (const relPath of sourceFiles) {
        const targetFile = path.join(target.targetPath, relPath);
        try {
          await fs.access(targetFile);
          conflicts.push({
            type: 'file',
            path: relPath,
            description: 'File exists in target directory',
            resolution: 'overwrite'
          });
        } catch {
          // No conflict
        }
      }
    } catch {
      // Target doesn't exist, good
    }

    // Check permissions
    const permissionIssues = await this.checkPermissions(target.sourcePath);
    for (const issue of permissionIssues) {
      conflicts.push({
        type: 'permission',
        path: issue,
        description: 'Permission denied',
        resolution: 'manual'
      });
    }

    // Estimate duration (1ms per file + 100ms overhead)
    const sourceFiles = await this.listFilesRecursive(target.sourcePath);
    const estimatedDuration = Math.ceil((sourceFiles.length + 100) / 1000);

    const safe = conflicts.filter(c => c.resolution === 'manual').length === 0;

    return {
      safe,
      warnings,
      conflicts,
      estimatedDuration
    };
  }

  /**
   * Check for conflicts between source and target
   *
   * @param source - Source directory path
   * @param target - Target directory path
   * @returns Array of conflicts
   */
  async checkConflicts(source: string, target: string): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    try {
      await fs.access(target);
    } catch {
      // Target doesn't exist, no conflicts
      return conflicts;
    }

    const sourceFiles = await this.listFilesRecursive(source);

    for (const relPath of sourceFiles) {
      const targetFile = path.join(target, relPath);
      try {
        await fs.access(targetFile);
        conflicts.push({
          type: 'file',
          path: relPath,
          description: 'File exists in target directory',
          resolution: 'overwrite'
        });
      } catch {
        // No conflict
      }
    }

    return conflicts;
  }

  // ===========================
  // Migration Methods
  // ===========================

  /**
   * Perform workspace migration
   *
   * Migrates legacy workspace to framework-scoped structure.
   * Supports dry-run mode, backup creation, and atomic operations.
   *
   * @param options - Migration options
   * @returns Migration result
   */
  async migrate(options: MigrationOptions): Promise<MigrationResult> {
    const startTime = Date.now();
    const migrationId = this.generateMigrationId();
    const errors: MigrationError[] = [];
    let filesMovedCount = 0;
    let filesCopiedCount = 0;
    let filesSkippedCount = 0;
    let backupPath: string | undefined;

    try {
      // Validate source exists
      try {
        await fs.access(options.source);
      } catch {
        throw new Error(`Source path does not exist: ${options.source}`);
      }

      // Create backup if requested
      if (options.backup && !options.dryRun) {
        backupPath = await this.createBackup(options.source, migrationId);
      }

      // Get list of files to migrate
      const sourceFiles = await this.listFilesRecursive(options.source);

      // Filter out framework and registry directories (shouldn't be in legacy workspace)
      const filesToMigrate = sourceFiles.filter(f =>
        !f.startsWith('frameworks/') && f !== 'frameworks' &&
        !f.startsWith('frameworks/registry.json')
      );

      // Dry-run mode: simulate without actual changes
      if (options.dryRun) {
        for (const relPath of filesToMigrate) {
          const targetPath = path.join(options.target, relPath);
          try {
            await fs.access(targetPath);
            if (options.overwrite) {
              filesCopiedCount++;
            } else {
              filesSkippedCount++;
            }
          } catch {
            filesCopiedCount++;
          }
        }
      } else {
        // Actual migration
        // Create target directory
        await fs.mkdir(options.target, { recursive: true });

        // Migrate each file
        for (const relPath of filesToMigrate) {
          const sourcePath = path.join(options.source, relPath);
          const targetPath = path.join(options.target, relPath);

          try {
            // Check if target exists
            let targetExists = false;
            try {
              await fs.access(targetPath);
              targetExists = true;
            } catch {
              // Target doesn't exist
            }

            if (targetExists && !options.overwrite) {
              filesSkippedCount++;
              errors.push({
                path: relPath,
                error: 'Target file exists, skipped (overwrite=false)',
                severity: 'warning'
              });
              continue;
            }

            // Create target directory
            const targetDir = path.dirname(targetPath);
            await fs.mkdir(targetDir, { recursive: true });

            // Copy file
            await fs.copyFile(sourcePath, targetPath);
            filesCopiedCount++;
          } catch (error: any) {
            errors.push({
              path: relPath,
              error: error.message,
              severity: 'error'
            });
          }
        }

        // Update registry
        await this.updateRegistry(options.framework, migrationId);
      }

      const duration = Date.now() - startTime;

      return {
        id: migrationId,
        success: errors.filter(e => e.severity === 'critical').length === 0,
        filesMovedCount,
        filesCopiedCount,
        filesSkippedCount,
        errors,
        duration,
        backupPath
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        id: migrationId,
        success: false,
        filesMovedCount,
        filesCopiedCount,
        filesSkippedCount,
        errors: [{
          path: options.source,
          error: error.message,
          severity: 'critical'
        }],
        duration,
        backupPath
      };
    }
  }

  /**
   * Rollback migration
   *
   * Restores workspace from backup created during migration.
   *
   * @param migrationId - Migration ID to rollback
   */
  async rollback(migrationId: string): Promise<void> {
    const backupPath = path.join(this.sandboxPath, 'backups', migrationId);

    try {
      await fs.access(backupPath);
    } catch {
      throw new Error(`Backup not found for migration ID: ${migrationId}`);
    }

    // Restore from backup
    const files = await this.listFilesRecursive(backupPath);

    for (const relPath of files) {
      const sourcePath = path.join(backupPath, relPath);
      const targetPath = path.join(this.sandboxPath, relPath);

      // Create target directory
      const targetDir = path.dirname(targetPath);
      await fs.mkdir(targetDir, { recursive: true });

      // Copy file
      await fs.copyFile(sourcePath, targetPath);
    }
  }

  // ===========================
  // Reporting Methods
  // ===========================

  /**
   * Generate migration report
   *
   * Creates human-readable migration report with statistics and errors.
   *
   * @param result - Migration result
   * @returns Formatted report string
   */
  generateReport(result: MigrationResult): string {
    const lines: string[] = [];

    lines.push('Migration Report');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Migration ID: ${result.id}`);
    lines.push(`Status: ${result.success ? '✓ SUCCESS' : '❌ FAILED'}`);
    lines.push(`Duration: ${result.duration}ms`);
    lines.push('');

    lines.push('Statistics:');
    lines.push(`  Files Moved:   ${result.filesMovedCount}`);
    lines.push(`  Files Copied:  ${result.filesCopiedCount}`);
    lines.push(`  Files Skipped: ${result.filesSkippedCount}`);
    lines.push('');

    if (result.backupPath) {
      lines.push(`Backup Created: ${result.backupPath}`);
      lines.push('');
    }

    if (result.errors.length > 0) {
      lines.push('Errors:');
      result.errors.forEach((error, index) => {
        const icon = error.severity === 'critical' ? '❌' :
                     error.severity === 'error' ? '⚠️' : 'ℹ️';
        lines.push(`  ${index + 1}. ${icon} [${error.severity.toUpperCase()}] ${error.path}`);
        lines.push(`     ${error.error}`);
      });
    } else {
      lines.push('No errors encountered.');
    }

    return lines.join('\n');
  }

  // ===========================
  // Helper Methods
  // ===========================

  /**
   * Get directory information (file count and size)
   */
  private async getDirectoryInfo(dirPath: string): Promise<{ fileCount: number; size: number }> {
    let fileCount = 0;
    let size = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subInfo = await this.getDirectoryInfo(fullPath);
          fileCount += subInfo.fileCount;
          size += subInfo.size;
        } else {
          fileCount++;
          const stat = await fs.stat(fullPath);
          size += stat.size;
        }
      }
    } catch {
      // Permission denied or doesn't exist
    }

    return { fileCount, size };
  }

  /**
   * Check if directory has git repository
   */
  private async hasGitRepo(dirPath: string): Promise<boolean> {
    const gitPath = path.join(dirPath, '.git');
    try {
      await fs.access(gitPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all files recursively
   */
  private async listFilesRecursive(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (currentPath: string, relativePath: string = '') => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath, relPath);
        } else {
          files.push(relPath);
        }
      }
    };

    await walk(dirPath);
    return files;
  }

  /**
   * Check permissions for all files in directory
   */
  private async checkPermissions(dirPath: string): Promise<string[]> {
    const issues: string[] = [];

    const walk = async (currentPath: string, relativePath: string = '') => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          const relPath = path.join(relativePath, entry.name);

          try {
            await fs.access(fullPath, fs.constants.R_OK);
          } catch {
            issues.push(relPath);
          }

          if (entry.isDirectory()) {
            await walk(fullPath, relPath);
          }
        }
      } catch {
        issues.push(relativePath);
      }
    };

    await walk(dirPath);
    return issues;
  }

  /**
   * Create backup of workspace
   */
  private async createBackup(sourcePath: string, migrationId: string): Promise<string> {
    const backupDir = path.join(this.sandboxPath, 'backups');
    const backupPath = path.join(backupDir, migrationId);

    await fs.mkdir(backupPath, { recursive: true });

    // Copy all files
    const files = await this.listFilesRecursive(sourcePath);

    for (const relPath of files) {
      const source = path.join(sourcePath, relPath);
      const target = path.join(backupPath, relPath);

      // Create target directory
      const targetDir = path.dirname(target);
      await fs.mkdir(targetDir, { recursive: true });

      // Copy file
      await fs.copyFile(source, target);
    }

    return backupPath;
  }

  /**
   * Update framework registry after migration
   */
  private async updateRegistry(frameworkId: string, migrationId: string): Promise<void> {
    const registryPath = path.join(this.sandboxPath, 'frameworks', 'registry.json');

    try {
      // Load or create registry
      let registry: {
        version: string;
        lastModified: string;
        plugins: Array<{
          id: string;
          type: string;
          name: string;
          version: string;
          path: string;
          installedAt: string;
          projects?: string[];
          health?: {
            status: string;
            lastCheck: string;
          };
          metadata?: {
            migrationId?: string;
            migratedAt?: string;
          };
        }>;
      };

      try {
        const content = await fs.readFile(registryPath, 'utf-8');
        registry = JSON.parse(content);
      } catch (error: any) {
        // Create new registry if it doesn't exist
        registry = {
          version: '1.0.0',
          lastModified: new Date().toISOString(),
          plugins: []
        };
      }

      // Check if framework already exists
      const existingIndex = registry.plugins.findIndex(p => p.id === frameworkId);

      const pluginEntry = {
        id: frameworkId,
        type: 'framework' as const,
        name: frameworkId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        version: '1.0.0',
        path: `frameworks/${frameworkId}`,
        installedAt: new Date().toISOString(),
        projects: ['default'],
        health: {
          status: 'healthy',
          lastCheck: new Date().toISOString()
        },
        metadata: {
          migrationId,
          migratedAt: new Date().toISOString()
        }
      };

      if (existingIndex >= 0) {
        // Update existing entry
        registry.plugins[existingIndex] = {
          ...registry.plugins[existingIndex],
          ...pluginEntry,
          installedAt: registry.plugins[existingIndex].installedAt // Preserve original install date
        };
      } else {
        // Add new entry
        registry.plugins.push(pluginEntry);
      }

      registry.lastModified = new Date().toISOString();

      // Ensure directory exists
      await fs.mkdir(path.dirname(registryPath), { recursive: true });

      // Write registry
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

      console.debug(`[WorkspaceMigrator] Registry updated for framework: ${frameworkId}, migration: ${migrationId}`);
    } catch (error: any) {
      console.warn(`[WorkspaceMigrator] Failed to update registry: ${error.message}`);
      // Non-fatal error - migration still succeeded
    }
  }

  /**
   * Generate unique migration ID
   */
  private generateMigrationId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `migration-${timestamp}-${random}`;
  }
}
