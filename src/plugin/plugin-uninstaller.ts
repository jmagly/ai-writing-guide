/**
 * Plugin Uninstallation System
 *
 * Comprehensive uninstaller supporting frameworks, add-ons, and extensions
 * with dependency validation, artifact cleanup, and safe removal.
 *
 * Features:
 * - Dependency validation (prevent orphaned add-ons)
 * - Active project detection
 * - Artifact cleanup (directories, registry)
 * - Dry-run mode
 * - Force mode (skip dependency checks)
 * - Project preservation (--keep-projects)
 * - Rollback on failure
 *
 * @module src/plugin/plugin-uninstaller
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Plugin types
 */
export type PluginType = 'framework' | 'add-on' | 'extension';

/**
 * Uninstall options
 */
export interface UninstallOptions {
  /** Force uninstall (skip dependency checks) */
  force?: boolean;
  /** Dry-run mode (preview without executing) */
  dryRun?: boolean;
  /** Keep projects (archive instead of delete) */
  keepProjects?: boolean;
  /** Skip confirmation prompts */
  skipConfirmation?: boolean;
}

/**
 * Uninstall result
 */
export interface UninstallResult {
  /** Whether uninstall succeeded */
  success: boolean;
  /** Plugin ID */
  pluginId: string;
  /** Actions taken */
  actions: UninstallAction[];
  /** Errors encountered */
  errors: string[];
  /** Warnings */
  warnings: string[];
  /** Statistics */
  stats: UninstallStats;
}

/**
 * Uninstall statistics
 */
export interface UninstallStats {
  /** Files removed */
  filesRemoved: number;
  /** Directories removed */
  dirsRemoved: number;
  /** Bytes freed */
  bytesFreed: number;
  /** Projects archived (if keepProjects) */
  projectsArchived: number;
}

/**
 * Single uninstall action
 */
export interface UninstallAction {
  /** Action type */
  type: 'validate' | 'check-deps' | 'backup' | 'remove-dir' | 'remove-file' | 'update-registry' | 'archive' | 'rollback';
  /** Action description */
  description: string;
  /** Path affected */
  path?: string;
  /** Whether action was executed or just planned (dry-run) */
  executed: boolean;
}

/**
 * Dependent plugin information
 */
export interface DependentPlugin {
  /** Plugin ID */
  id: string;
  /** Plugin type */
  type: PluginType;
  /** How it depends (parentFramework, extends, etc.) */
  relationship: string;
}

/**
 * Registry entry structure
 */
interface RegistryEntry {
  id: string;
  type: PluginType;
  name: string;
  version: string;
  path: string;
  installedAt: string;
  parentFramework?: string;
  projects?: string[];
}

/**
 * Registry structure
 */
interface Registry {
  version: string;
  lastModified: string;
  plugins: RegistryEntry[];
}

/**
 * PluginUninstaller - Uninstall and cleanup plugins
 *
 * @example
 * ```typescript
 * const uninstaller = new PluginUninstaller('~/.local/share/ai-writing-guide');
 *
 * // Check dependencies before uninstall
 * const deps = await uninstaller.getDependentPlugins('sdlc-complete');
 * if (deps.length > 0) {
 *   console.log('Cannot uninstall - dependent plugins exist');
 * }
 *
 * // Uninstall framework
 * const result = await uninstaller.uninstall('my-framework');
 *
 * // Force uninstall (ignore dependencies)
 * const forceResult = await uninstaller.uninstall('parent-framework', { force: true });
 *
 * // Dry-run preview
 * const preview = await uninstaller.uninstall('plugin', { dryRun: true });
 * ```
 */
export class PluginUninstaller {
  private aiwgRoot: string;
  private registryPath: string;
  private backupDir: string;
  private rollbackActions: Array<() => Promise<void>> = [];

  constructor(aiwgRoot: string) {
    this.aiwgRoot = aiwgRoot;
    this.registryPath = path.join(aiwgRoot, 'registry.json');
    this.backupDir = path.join(aiwgRoot, 'backups');
  }

  /**
   * Uninstall a plugin
   *
   * @param pluginId - Plugin identifier
   * @param options - Uninstall options
   * @returns Uninstall result
   */
  async uninstall(pluginId: string, options: UninstallOptions = {}): Promise<UninstallResult> {
    const result: UninstallResult = {
      success: false,
      pluginId,
      actions: [],
      errors: [],
      warnings: [],
      stats: {
        filesRemoved: 0,
        dirsRemoved: 0,
        bytesFreed: 0,
        projectsArchived: 0
      }
    };

    this.rollbackActions = [];

    try {
      // Step 1: Validate plugin exists
      const plugin = await this.getPlugin(pluginId);
      if (!plugin) {
        result.errors.push(`Plugin '${pluginId}' is not installed`);
        return result;
      }

      result.actions.push({
        type: 'validate',
        description: `Found plugin: ${plugin.name} v${plugin.version} (${plugin.type})`,
        executed: true
      });

      // Step 2: Check for dependent plugins
      if (!options.force) {
        const dependents = await this.getDependentPlugins(pluginId);
        if (dependents.length > 0) {
          const depNames = dependents.map(d => `${d.id} (${d.type})`).join(', ');
          result.errors.push(
            `Cannot uninstall '${pluginId}' - the following plugins depend on it: ${depNames}. ` +
            `Uninstall them first or use --force to skip this check.`
          );

          result.actions.push({
            type: 'check-deps',
            description: `Found ${dependents.length} dependent plugins`,
            executed: true
          });

          return result;
        }

        result.actions.push({
          type: 'check-deps',
          description: 'No dependent plugins found',
          executed: true
        });
      } else {
        result.warnings.push('Dependency check skipped (--force)');
      }

      // Step 3: Check for active projects (warning only)
      if (plugin.type === 'framework') {
        const projects = await this.getActiveProjects(pluginId, plugin.path);
        if (projects.length > 0) {
          result.warnings.push(
            `Plugin has ${projects.length} active project(s): ${projects.join(', ')}`
          );
        }

        // Handle project preservation
        if (projects.length > 0 && options.keepProjects && !options.dryRun) {
          await this.archiveProjects(pluginId, plugin.path, projects, result);
        }
      }

      // Step 4: Backup registry (for rollback)
      if (!options.dryRun) {
        await this.backupRegistry(result);
      }

      // Step 5: Remove plugin directory
      const pluginPath = path.join(this.aiwgRoot, plugin.path);
      if (!options.dryRun) {
        await this.removeDirectory(pluginPath, result);
      } else {
        result.actions.push({
          type: 'remove-dir',
          description: `Would remove directory: ${plugin.path}`,
          path: pluginPath,
          executed: false
        });
      }

      // Step 6: Update registry
      if (!options.dryRun) {
        await this.removeFromRegistry(pluginId, result);
      } else {
        result.actions.push({
          type: 'update-registry',
          description: `Would remove ${pluginId} from registry`,
          path: this.registryPath,
          executed: false
        });
      }

      result.success = true;

    } catch (error) {
      result.errors.push(`Uninstall failed: ${(error as Error).message}`);

      // Rollback on failure
      if (!options.dryRun && this.rollbackActions.length > 0) {
        result.actions.push({
          type: 'rollback',
          description: 'Rolling back changes due to error',
          executed: true
        });

        await this.rollback();
      }
    }

    return result;
  }

  /**
   * Get plugins that depend on the given plugin
   *
   * @param pluginId - Plugin identifier
   * @returns Array of dependent plugins
   */
  async getDependentPlugins(pluginId: string): Promise<DependentPlugin[]> {
    const dependents: DependentPlugin[] = [];

    try {
      const registry = await this.loadRegistry();

      for (const plugin of registry.plugins) {
        if (plugin.parentFramework === pluginId) {
          dependents.push({
            id: plugin.id,
            type: plugin.type,
            relationship: 'parentFramework'
          });
        }
      }
    } catch {
      // Registry doesn't exist
    }

    return dependents;
  }

  /**
   * Get suggested uninstall order for a plugin and its dependents
   *
   * @param pluginId - Plugin identifier
   * @returns Ordered list of plugins to uninstall
   */
  async getUninstallOrder(pluginId: string): Promise<string[]> {
    const order: string[] = [];
    const visited = new Set<string>();

    const visit = async (id: string): Promise<void> => {
      if (visited.has(id)) return;
      visited.add(id);

      const dependents = await this.getDependentPlugins(id);
      for (const dep of dependents) {
        await visit(dep.id);
      }

      order.push(id);
    };

    await visit(pluginId);
    return order;
  }

  /**
   * Get plugin info from registry
   */
  private async getPlugin(pluginId: string): Promise<RegistryEntry | null> {
    try {
      const registry = await this.loadRegistry();
      return registry.plugins.find(p => p.id === pluginId) || null;
    } catch {
      return null;
    }
  }

  /**
   * Get active projects for a framework
   */
  private async getActiveProjects(_pluginId: string, pluginPath: string): Promise<string[]> {
    const projectsDir = path.join(this.aiwgRoot, pluginPath, 'projects');

    try {
      const entries = await fs.readdir(projectsDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .map(e => e.name);
    } catch {
      return [];
    }
  }

  /**
   * Archive projects before uninstall
   */
  private async archiveProjects(
    pluginId: string,
    pluginPath: string,
    projects: string[],
    result: UninstallResult
  ): Promise<void> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const archiveBase = path.join(this.aiwgRoot, 'archive', 'uninstalled', pluginId, yearMonth);

    await fs.mkdir(archiveBase, { recursive: true });

    const projectsDir = path.join(this.aiwgRoot, pluginPath, 'projects');

    for (const project of projects) {
      const srcPath = path.join(projectsDir, project);
      const destPath = path.join(archiveBase, project);

      await this.copyDirectory(srcPath, destPath);
      result.stats.projectsArchived++;

      result.actions.push({
        type: 'archive',
        description: `Archived project: ${project} → ${path.relative(this.aiwgRoot, destPath)}`,
        path: destPath,
        executed: true
      });
    }
  }

  /**
   * Backup registry for rollback
   */
  private async backupRegistry(result: UninstallResult): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });

      const timestamp = Date.now();
      const backupPath = path.join(this.backupDir, `registry-${timestamp}.json`);
      const content = await fs.readFile(this.registryPath, 'utf-8');

      await fs.writeFile(backupPath, content, 'utf-8');

      result.actions.push({
        type: 'backup',
        description: `Backed up registry to ${path.basename(backupPath)}`,
        path: backupPath,
        executed: true
      });

      // Add rollback action
      this.rollbackActions.push(async () => {
        await fs.copyFile(backupPath, this.registryPath);
      });
    } catch {
      // Registry doesn't exist, nothing to backup
    }
  }

  /**
   * Recursively remove directory and track stats
   */
  private async removeDirectory(dirPath: string, result: UninstallResult): Promise<void> {
    try {
      const stats = await this.calculateDirectoryStats(dirPath);
      result.stats.filesRemoved = stats.files;
      result.stats.dirsRemoved = stats.dirs;
      result.stats.bytesFreed = stats.bytes;

      await fs.rm(dirPath, { recursive: true, force: true });

      result.actions.push({
        type: 'remove-dir',
        description: `Removed directory: ${path.relative(this.aiwgRoot, dirPath)} (${stats.files} files, ${this.formatBytes(stats.bytes)})`,
        path: dirPath,
        executed: true
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Calculate directory statistics
   */
  private async calculateDirectoryStats(dirPath: string): Promise<{ files: number; dirs: number; bytes: number }> {
    let files = 0;
    let dirs = 0;
    let bytes = 0;

    const scan = async (currentPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            dirs++;
            await scan(entryPath);
          } else if (entry.isFile()) {
            files++;
            try {
              const stat = await fs.stat(entryPath);
              bytes += stat.size;
            } catch {
              // Ignore stat errors
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    };

    await scan(dirPath);
    return { files, dirs, bytes };
  }

  /**
   * Remove plugin from registry
   */
  private async removeFromRegistry(pluginId: string, result: UninstallResult): Promise<void> {
    const registry = await this.loadRegistry();
    const originalLength = registry.plugins.length;

    registry.plugins = registry.plugins.filter(p => p.id !== pluginId);

    if (registry.plugins.length === originalLength) {
      // Plugin wasn't in registry
      return;
    }

    registry.lastModified = new Date().toISOString();

    await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2), 'utf-8');

    result.actions.push({
      type: 'update-registry',
      description: `Removed ${pluginId} from registry`,
      path: this.registryPath,
      executed: true
    });
  }

  /**
   * Load registry file
   */
  private async loadRegistry(): Promise<Registry> {
    const content = await fs.readFile(this.registryPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Recursively copy directory
   */
  private async copyDirectory(source: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });

    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Rollback changes on failure
   */
  private async rollback(): Promise<void> {
    for (let i = this.rollbackActions.length - 1; i >= 0; i--) {
      try {
        await this.rollbackActions[i]();
      } catch {
        // Ignore rollback errors
      }
    }
    this.rollbackActions = [];
  }

  /**
   * Format bytes as human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * List all installed plugins
   */
  async listInstalled(): Promise<RegistryEntry[]> {
    try {
      const registry = await this.loadRegistry();
      return registry.plugins;
    } catch {
      return [];
    }
  }

  /**
   * Check if a plugin can be safely uninstalled
   *
   * @param pluginId - Plugin identifier
   * @returns Object with canUninstall flag and reason/warnings
   */
  async canUninstall(pluginId: string): Promise<{
    canUninstall: boolean;
    reason?: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // Check if plugin exists
    const plugin = await this.getPlugin(pluginId);
    if (!plugin) {
      return {
        canUninstall: false,
        reason: `Plugin '${pluginId}' is not installed`,
        warnings
      };
    }

    // Check for dependents
    const dependents = await this.getDependentPlugins(pluginId);
    if (dependents.length > 0) {
      return {
        canUninstall: false,
        reason: `Plugin has ${dependents.length} dependent plugin(s): ${dependents.map(d => d.id).join(', ')}`,
        warnings
      };
    }

    // Check for active projects (warning)
    if (plugin.type === 'framework') {
      const projects = await this.getActiveProjects(pluginId, plugin.path);
      if (projects.length > 0) {
        warnings.push(`Plugin has ${projects.length} active project(s)`);
      }
    }

    return {
      canUninstall: true,
      warnings
    };
  }
}

/**
 * Create a PluginUninstaller with default AIWG root
 */
export function createUninstaller(): PluginUninstaller {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const aiwgRoot = path.join(homeDir, '.local', 'share', 'ai-writing-guide');
  return new PluginUninstaller(aiwgRoot);
}
