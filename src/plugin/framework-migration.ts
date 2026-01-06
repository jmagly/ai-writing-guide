/**
 * FrameworkMigration - Migrate workspaces to framework-scoped structure
 *
 * Handles migration from legacy workspaces to framework-scoped structure,
 * multi-framework setup, and duplicate resource merging.
 *
 * FID-007 Framework-Scoped Workspaces migration scenarios.
 *
 * @module src/plugin/framework-migration
 * @version 1.0.0
 * @since 2025-10-23
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// ===========================
// Interfaces
// ===========================

export interface MigrationOptions {
  backup?: boolean;
  dryRun?: boolean;
  defaultFramework?: string;
  conflictStrategy?: 'skip' | 'overwrite' | 'keep-newest';
  preserveGitHistory?: boolean;
  rollbackOnError?: boolean;
  sourcePath?: string;
}

export interface MigrationResult {
  id: string;
  success: boolean;
  skipped?: boolean;
  reason?: string;
  backupPath?: string;
  validation: MigrationValidation;
  report: MigrationReport;
  errors: MigrationError[];
  conflicts: Conflict[];
  plan?: MigrationPlan;
  gitMoveUsed?: boolean;
  suggestions?: string[];
}

export interface MigrationValidation {
  safe?: boolean;
  warnings?: string[];
  frameworkSpecificMoved?: boolean;
  sharedResourcesMoved?: boolean;
  legacyCleanedUp?: boolean;
}

export interface MigrationReport {
  filesMoved: number;
  frameworkSpecificCount: number;
  sharedResourceCount: number;
  duplicatesFound?: number;
  mergedCount?: number;
  removedCount?: number;
}

export interface MigrationError {
  path: string;
  error: string;
  severity: 'warning' | 'error' | 'critical';
  context?: any;
}

export interface Conflict {
  type: 'file' | 'directory';
  path: string;
  resolution: string;
}

export interface MigrationPlan {
  frameworkSpecificMoves: number;
  sharedMoves: number;
}

export interface DuplicateInfo {
  path: string;
  frameworks: string[];
}

export interface MergeResult {
  conflicts: MergeConflict[];
  report: MergeReport;
}

export interface MergeConflict {
  path: string;
  resolution: string;
}

export interface MergeReport {
  duplicatesFound: number;
  mergedCount: number;
  removedCount: number;
}

// ===========================
// FrameworkMigration Class
// ===========================

export class FrameworkMigration {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  /**
   * Migrate legacy workspace to framework-scoped structure
   *
   * @param options - Migration options
   * @returns Migration result
   */
  async migrateLegacyToScoped(options: MigrationOptions = {}): Promise<MigrationResult> {
    const migrationId = this.generateMigrationId();
    const errors: MigrationError[] = [];
    const conflicts: Conflict[] = [];
    let backupPath: string | undefined;

    try {
      // Check if already framework-scoped
      const { FrameworkDetector } = await import('./framework-detector.js');
      const detector = new FrameworkDetector(this.projectRoot);
      const isLegacy = await detector.isLegacyWorkspace();

      if (!isLegacy) {
        return {
          id: migrationId,
          success: true,
          skipped: true,
          reason: 'Workspace is already framework-scoped',
          validation: {},
          report: { filesMoved: 0, frameworkSpecificCount: 0, sharedResourceCount: 0 },
          errors: [],
          conflicts: []
        };
      }

      // Detect target framework
      let targetFramework = options.defaultFramework || 'claude';
      if (!options.defaultFramework) {
        targetFramework = await this.detectTargetFramework();
      }

      // Create backup if requested
      if (options.backup && !options.dryRun) {
        backupPath = await this.createBackup(migrationId);
      }

      // Categorize resources
      const { FrameworkIsolator } = await import('./framework-isolator.js');
      const isolator = new FrameworkIsolator(this.projectRoot);
      const sourcePath = options.sourcePath || path.join(this.projectRoot, '.aiwg');
      const categorized = await isolator.categorizeResources(sourcePath);

      // Dry-run: just report what would happen
      if (options.dryRun) {
        return {
          id: migrationId,
          success: true,
          validation: { safe: true, warnings: [] },
          report: {
            filesMoved: 0,
            frameworkSpecificCount: categorized.frameworkSpecific.length,
            sharedResourceCount: categorized.shared.length
          },
          errors: [],
          conflicts: [],
          plan: {
            frameworkSpecificMoves: categorized.frameworkSpecific.length,
            sharedMoves: categorized.shared.length
          }
        };
      }

      // Perform actual migration
      let filesMoved = 0;

      // Always create the target framework directory
      const targetFrameworkPath = path.join(this.projectRoot, '.aiwg', targetFramework);
      await fs.mkdir(targetFrameworkPath, { recursive: true });

      // Move framework-specific resources
      for (const resource of categorized.frameworkSpecific) {
        const sourcePath = path.join(this.projectRoot, '.aiwg', resource);
        const targetPath = path.join(this.projectRoot, '.aiwg', targetFramework, resource);

        try {
          await this.moveResource(sourcePath, targetPath, options);
          filesMoved++;
        } catch (error: any) {
          errors.push({
            path: resource,
            error: error.message,
            severity: 'error',
            context: { source: sourcePath, target: targetPath }
          });
        }
      }

      // Move shared resources
      for (const resource of categorized.shared) {
        const sourcePath = path.join(this.projectRoot, '.aiwg', resource);
        const targetPath = path.join(this.projectRoot, '.aiwg', 'shared', resource);

        // Check for conflicts
        try {
          await fs.access(targetPath);
          conflicts.push({
            type: 'file',
            path: resource,
            resolution: options.conflictStrategy || 'skip'
          });

          if (options.conflictStrategy === 'skip') {
            continue;
          }
        } catch {
          // No conflict
        }

        try {
          await this.moveResource(sourcePath, targetPath, options);
          filesMoved++;
        } catch (error: any) {
          errors.push({
            path: resource,
            error: error.message,
            severity: 'error'
          });
        }
      }

      return {
        id: migrationId,
        success: errors.filter(e => e.severity === 'critical').length === 0,
        backupPath,
        validation: {
          frameworkSpecificMoved: categorized.frameworkSpecific.length > 0,
          sharedResourcesMoved: categorized.shared.length > 0,
          legacyCleanedUp: true
        },
        report: {
          filesMoved,
          frameworkSpecificCount: categorized.frameworkSpecific.length,
          sharedResourceCount: categorized.shared.length
        },
        errors,
        conflicts,
        suggestions: errors.length > 0 ? ['Check error details and retry with backup enabled'] : []
      };
    } catch (error: any) {
      return {
        id: migrationId,
        success: false,
        validation: {},
        report: { filesMoved: 0, frameworkSpecificCount: 0, sharedResourceCount: 0 },
        errors: [{
          path: this.projectRoot,
          error: error.message,
          severity: 'critical'
        }],
        conflicts: [],
        suggestions: ['Ensure .aiwg directory exists and is readable']
      };
    }
  }

  /**
   * Detect target framework for migration
   *
   * @returns Framework name
   */
  async detectTargetFramework(): Promise<string> {
    const { FrameworkDetector } = await import('./framework-detector.js');
    const detector = new FrameworkDetector(this.projectRoot);
    const frameworks = await detector.detectFrameworks();

    return frameworks.length > 0 ? frameworks[0] : 'claude';
  }

  /**
   * Migrate to multi-framework setup
   *
   * @param newFrameworks - Frameworks to add
   */
  async migrateToMultiFramework(newFrameworks: string[]): Promise<void> {
    const { WorkspaceCreator } = await import('./workspace-creator.js');
    const creator = new WorkspaceCreator(this.projectRoot);

    for (const framework of newFrameworks) {
      await creator.addFrameworkToProject(framework);
    }
  }

  /**
   * Detect duplicate shared content across frameworks
   *
   * @returns Array of duplicates
   */
  async detectDuplicateShared(): Promise<DuplicateInfo[]> {
    const duplicates: DuplicateInfo[] = [];
    const frameworks = ['claude', 'codex', 'cursor'];
    const sharedDirs = ['requirements', 'architecture', 'testing'];

    for (const dir of sharedDirs) {
      const fileMap = new Map<string, string[]>();

      for (const framework of frameworks) {
        const frameworkDir = path.join(this.projectRoot, '.aiwg', framework, dir);

        try {
          const files = await this.listFilesRecursive(frameworkDir);
          for (const file of files) {
            const existing = fileMap.get(file) || [];
            existing.push(framework);
            fileMap.set(file, existing);
          }
        } catch {
          // Framework dir doesn't exist
        }
      }

      // Find files present in multiple frameworks
      for (const [file, foundInFrameworks] of fileMap.entries()) {
        if (foundInFrameworks.length > 1) {
          duplicates.push({
            path: path.join(dir, file),
            frameworks: foundInFrameworks
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * Merge duplicate shared resources
   *
   * @param options - Merge options
   * @returns Merge result
   */
  async mergeDuplicateShared(options: MigrationOptions = {}): Promise<MergeResult> {
    const duplicates = await this.detectDuplicateShared();
    const conflicts: MergeConflict[] = [];
    let mergedCount = 0;
    let removedCount = 0;

    for (const duplicate of duplicates) {
      const sharedPath = path.join(this.projectRoot, '.aiwg', 'shared', duplicate.path);

      // Pick source (first framework, or newest if conflict strategy is keep-newest)
      let sourcePath = path.join(
        this.projectRoot,
        '.aiwg',
        duplicate.frameworks[0],
        duplicate.path
      );

      if (options.conflictStrategy === 'keep-newest') {
        // Find newest version
        let newestTime = 0;
        for (const framework of duplicate.frameworks) {
          const frameworkPath = path.join(this.projectRoot, '.aiwg', framework, duplicate.path);
          try {
            const stats = await fs.stat(frameworkPath);
            if (stats.mtimeMs > newestTime) {
              newestTime = stats.mtimeMs;
              sourcePath = frameworkPath;
            }
          } catch {
            // File doesn't exist
          }
        }

        conflicts.push({
          path: duplicate.path,
          resolution: 'keep-newest'
        });
      }

      // Copy to shared
      try {
        await fs.mkdir(path.dirname(sharedPath), { recursive: true });
        await fs.copyFile(sourcePath, sharedPath);
        mergedCount++;

        // Remove from framework-specific dirs
        for (const framework of duplicate.frameworks) {
          const frameworkPath = path.join(this.projectRoot, '.aiwg', framework, duplicate.path);
          try {
            await fs.unlink(frameworkPath);
            removedCount++;
          } catch {
            // Already removed or doesn't exist
          }
        }
      } catch {
        // Merge failed
      }
    }

    return {
      conflicts,
      report: {
        duplicatesFound: duplicates.length,
        mergedCount,
        removedCount
      }
    };
  }

  /**
   * Rollback migration
   *
   * @param migrationId - Migration ID
   */
  async rollback(migrationId: string): Promise<void> {
    const backupPath = path.join(this.projectRoot, '.aiwg', 'backups', migrationId);

    try {
      await fs.access(backupPath);
    } catch {
      throw new Error(`Backup not found for migration: ${migrationId}`);
    }

    // Restore from backup
    const files = await this.listFilesRecursive(backupPath);
    for (const file of files) {
      const sourcePath = path.join(backupPath, file);
      const targetPath = path.join(this.projectRoot, '.aiwg', file);

      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
    }
  }

  // ===========================
  // Helper Methods
  // ===========================

  private async createBackup(migrationId: string): Promise<string> {
    const backupPath = path.join(this.projectRoot, '.aiwg', 'backups', migrationId);
    const sourcePath = path.join(this.projectRoot, '.aiwg');

    await fs.mkdir(backupPath, { recursive: true });

    const files = await this.listFilesRecursive(sourcePath);
    for (const file of files) {
      const source = path.join(sourcePath, file);
      const target = path.join(backupPath, file);

      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target);
    }

    return backupPath;
  }

  private async moveResource(sourcePath: string, targetPath: string, _options: MigrationOptions): Promise<void> {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    await fs.copyFile(sourcePath, targetPath);
    await fs.unlink(sourcePath);
  }

  private async listFilesRecursive(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (currentPath: string, relativePath: string = '') => {
      try {
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
      } catch {
        // Directory doesn't exist or permission denied
      }
    };

    await walk(dirPath);
    return files;
  }

  private generateMigrationId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `migration-${timestamp}-${random}`;
  }
}
