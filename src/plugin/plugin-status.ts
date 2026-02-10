/**
 * Plugin Status Command
 *
 * Provides status reporting and health monitoring for all plugin types
 * (frameworks, add-ons, extensions).
 *
 * @module src/plugin/plugin-status
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Plugin types
 */
export type PluginType = 'framework' | 'add-on' | 'extension';

/**
 * Health status levels
 */
export type HealthStatus = 'healthy' | 'warning' | 'error';

/**
 * Plugin entry from registry
 */
export interface PluginEntry {
  id: string;
  type: PluginType;
  name: string;
  version: string;
  path: string;
  installedAt: string;
  parentFramework?: string;
  projects?: string[];
  health?: {
    status: HealthStatus;
    lastCheck: string;
    issues?: string[];
  };
}

/**
 * Plugin status result
 */
export interface PluginStatusResult {
  id: string;
  type: PluginType;
  name: string;
  version: string;
  installedAt: string;
  path: string;
  health: HealthStatus;
  healthDetails: string[];
  projects?: string[];
  parentFramework?: string;
  diskUsage?: number;
}

/**
 * Status summary
 */
export interface StatusSummary {
  totalPlugins: number;
  healthyCount: number;
  warningCount: number;
  errorCount: number;
  frameworkCount: number;
  addOnCount: number;
  extensionCount: number;
  totalDiskUsage: number;
  legacyMode: boolean;
}

/**
 * Status command options
 */
export interface StatusOptions {
  type?: PluginType;
  pluginId?: string;
  verbose?: boolean;
}

/**
 * PluginStatus provides status reporting for plugins
 */
export class PluginStatus {
  private aiwgRoot: string;
  private registryPath: string;

  constructor(aiwgRoot: string) {
    this.aiwgRoot = aiwgRoot;
    this.registryPath = path.join(aiwgRoot, 'registry.json');
  }

  /**
   * Get status of all plugins or filtered by options
   *
   * @param options - Filter options
   * @returns Array of plugin status results
   */
  async getStatus(options: StatusOptions = {}): Promise<PluginStatusResult[]> {
    const plugins = await this.loadPlugins();
    let results: PluginStatusResult[] = [];

    for (const plugin of plugins) {
      // Filter by type if specified
      if (options.type && plugin.type !== options.type) {
        continue;
      }

      // Filter by ID if specified
      if (options.pluginId && plugin.id !== options.pluginId) {
        continue;
      }

      const status = await this.getPluginStatus(plugin, options.verbose);
      results.push(status);
    }

    return results;
  }

  /**
   * Get status summary
   *
   * @returns Summary statistics
   */
  async getSummary(): Promise<StatusSummary> {
    const plugins = await this.loadPlugins();
    const statuses = await Promise.all(plugins.map(p => this.getPluginStatus(p, false)));

    return {
      totalPlugins: plugins.length,
      healthyCount: statuses.filter(s => s.health === 'healthy').length,
      warningCount: statuses.filter(s => s.health === 'warning').length,
      errorCount: statuses.filter(s => s.health === 'error').length,
      frameworkCount: plugins.filter(p => p.type === 'framework').length,
      addOnCount: plugins.filter(p => p.type === 'add-on').length,
      extensionCount: plugins.filter(p => p.type === 'extension').length,
      totalDiskUsage: statuses.reduce((sum, s) => sum + (s.diskUsage || 0), 0),
      legacyMode: await this.isLegacyMode()
    };
  }

  /**
   * Get status of a single plugin
   *
   * @param plugin - Plugin entry
   * @param verbose - Include detailed information
   * @returns Plugin status result
   */
  private async getPluginStatus(plugin: PluginEntry, verbose: boolean = false): Promise<PluginStatusResult> {
    const healthCheck = await this.performHealthCheck(plugin);

    const result: PluginStatusResult = {
      id: plugin.id,
      type: plugin.type,
      name: plugin.name,
      version: plugin.version,
      installedAt: plugin.installedAt,
      path: plugin.path,
      health: healthCheck.status,
      healthDetails: healthCheck.issues,
      projects: plugin.projects,
      parentFramework: plugin.parentFramework
    };

    if (verbose) {
      result.diskUsage = await this.getPluginDiskUsage(plugin);
    }

    return result;
  }

  /**
   * Perform health check on a plugin
   *
   * @param plugin - Plugin entry
   * @returns Health check result
   */
  private async performHealthCheck(plugin: PluginEntry): Promise<{ status: HealthStatus; issues: string[] }> {
    const issues: string[] = [];
    let status: HealthStatus = 'healthy';

    const pluginPath = path.join(this.aiwgRoot, plugin.path);

    // Check 1: Directory exists
    try {
      const stats = await fs.stat(pluginPath);
      if (!stats.isDirectory()) {
        issues.push('Plugin path exists but is not a directory');
        status = 'error';
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        issues.push('Plugin directory not found');
        status = 'error';
      } else {
        issues.push(`Cannot access plugin directory: ${error.message}`);
        status = 'error';
      }
    }

    // Check 2: Manifest exists
    const manifestPath = path.join(pluginPath, 'manifest.json');
    try {
      await fs.stat(manifestPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        issues.push('Manifest file not found');
        if (status === 'healthy') status = 'warning';
      }
    }

    // Check 3: For frameworks, check projects directory
    if (plugin.type === 'framework' && status !== 'error') {
      const projectsPath = path.join(pluginPath, 'projects');
      try {
        const stats = await fs.stat(projectsPath);
        if (!stats.isDirectory()) {
          issues.push('Projects path exists but is not a directory');
          if (status === 'healthy') status = 'warning';
        }
      } catch (error: any) {
        // Projects directory might not exist yet - just a warning
        if (error.code === 'ENOENT') {
          issues.push('No projects directory (framework has no active projects)');
          if (status === 'healthy') status = 'warning';
        }
      }
    }

    // Check 4: For add-ons, check parent framework exists
    if (plugin.type === 'add-on' && plugin.parentFramework && status !== 'error') {
      const plugins = await this.loadPlugins();
      const parentExists = plugins.some(
        p => p.type === 'framework' && p.id === plugin.parentFramework
      );

      if (!parentExists) {
        issues.push(`Parent framework not found: ${plugin.parentFramework}`);
        status = 'error';
      }
    }

    // Check 5: Health staleness (if cached health exists)
    if (plugin.health?.lastCheck) {
      const lastCheck = new Date(plugin.health.lastCheck);
      const now = new Date();
      const hoursSinceCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCheck > 24 && status === 'healthy') {
        issues.push('Health check is stale (>24 hours old)');
        status = 'warning';
      }
    }

    return { status, issues };
  }

  /**
   * Get disk usage for a plugin
   *
   * @param plugin - Plugin entry
   * @returns Disk usage in bytes
   */
  private async getPluginDiskUsage(plugin: PluginEntry): Promise<number> {
    const pluginPath = path.join(this.aiwgRoot, plugin.path);

    try {
      return await this.calculateDirectorySize(pluginPath);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate total size of a directory
   */
  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await this.calculateDirectorySize(entryPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(entryPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return totalSize;
  }

  /**
   * Check if workspace is in legacy mode
   *
   * @returns True if no frameworks directory exists
   */
  private async isLegacyMode(): Promise<boolean> {
    const frameworksPath = path.join(this.aiwgRoot, 'frameworks');

    try {
      await fs.stat(frameworksPath);
      return false;
    } catch (error) {
      return true;
    }
  }

  /**
   * Load plugins from registry
   *
   * @returns Array of plugin entries
   */
  private async loadPlugins(): Promise<PluginEntry[]> {
    try {
      const content = await fs.readFile(this.registryPath, 'utf-8');
      const registry = JSON.parse(content);
      return registry.plugins || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Generate text report
   *
   * @param options - Status options
   * @returns Formatted text report
   */
  async generateReport(options: StatusOptions = {}): Promise<string> {
    const statuses = await this.getStatus(options);
    const summary = await this.getSummary();
    const lines: string[] = [];

    // Header
    lines.push('AIWG - Plugin Status');
    lines.push('='.repeat(80));
    lines.push('');

    // Summary
    lines.push('Summary:');
    lines.push(`  Total Plugins:   ${summary.totalPlugins}`);
    lines.push(`  Frameworks:      ${summary.frameworkCount}`);
    lines.push(`  Add-ons:         ${summary.addOnCount}`);
    lines.push(`  Extensions:      ${summary.extensionCount}`);
    lines.push('');
    lines.push(`  Healthy:         ${summary.healthyCount}`);
    lines.push(`  Warnings:        ${summary.warningCount}`);
    lines.push(`  Errors:          ${summary.errorCount}`);
    lines.push('');
    lines.push(`  Workspace Mode:  ${summary.legacyMode ? 'Legacy' : 'Framework-scoped'}`);

    if (options.verbose) {
      lines.push(`  Total Disk Usage: ${this.formatBytes(summary.totalDiskUsage)}`);
    }

    lines.push('');

    // Group by type
    const frameworks = statuses.filter(s => s.type === 'framework');
    const addOns = statuses.filter(s => s.type === 'add-on');
    const extensions = statuses.filter(s => s.type === 'extension');

    // Frameworks
    if (!options.type || options.type === 'framework') {
      lines.push(`FRAMEWORKS (${frameworks.length} installed)`);
      lines.push('-'.repeat(80));

      if (frameworks.length === 0) {
        lines.push('  No frameworks installed.');
      } else {
        for (const fw of frameworks) {
          const icon = this.getHealthIcon(fw.health);
          lines.push(`  ${icon} ${fw.id} (v${fw.version})`);
          lines.push(`     Path: ${fw.path}`);
          lines.push(`     Projects: ${fw.projects?.length || 0}`);

          if (options.verbose && fw.healthDetails.length > 0) {
            lines.push(`     Issues:`);
            for (const issue of fw.healthDetails) {
              lines.push(`       - ${issue}`);
            }
          }
        }
      }

      lines.push('');
    }

    // Add-ons
    if (!options.type || options.type === 'add-on') {
      lines.push(`ADD-ONS (${addOns.length} installed)`);
      lines.push('-'.repeat(80));

      if (addOns.length === 0) {
        lines.push('  No add-ons installed.');
      } else {
        for (const addon of addOns) {
          const icon = this.getHealthIcon(addon.health);
          lines.push(`  ${icon} ${addon.id} (v${addon.version})`);
          lines.push(`     Parent: ${addon.parentFramework || 'none'}`);

          if (options.verbose && addon.healthDetails.length > 0) {
            lines.push(`     Issues:`);
            for (const issue of addon.healthDetails) {
              lines.push(`       - ${issue}`);
            }
          }
        }
      }

      lines.push('');
    }

    // Extensions
    if (!options.type || options.type === 'extension') {
      lines.push(`EXTENSIONS (${extensions.length} installed)`);
      lines.push('-'.repeat(80));

      if (extensions.length === 0) {
        lines.push('  No extensions installed.');
      } else {
        for (const ext of extensions) {
          const icon = this.getHealthIcon(ext.health);
          lines.push(`  ${icon} ${ext.id} (v${ext.version})`);

          if (options.verbose && ext.healthDetails.length > 0) {
            lines.push(`     Issues:`);
            for (const issue of ext.healthDetails) {
              lines.push(`       - ${issue}`);
            }
          }
        }
      }

      lines.push('');
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Get health status icon
   */
  private getHealthIcon(status: HealthStatus): string {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✗';
      default:
        return '?';
    }
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
}
