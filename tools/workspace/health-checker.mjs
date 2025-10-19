/**
 * HealthChecker - Plugin health validation and monitoring
 *
 * Validates plugin integrity across manifest, directories, versions, and dependencies.
 * Returns health status ('healthy' | 'warning' | 'error') with detailed issue reports.
 * Caches health check results for 5 minutes to optimize performance.
 * Supports auto-repair for common issues (missing directories, corrupted manifests).
 *
 * @module tools/workspace/health-checker
 * @version 1.0.0
 * @since 2025-10-19
 *
 * @example
 * // Initialize health checker
 * const checker = new HealthChecker('.aiwg', registry);
 *
 * // Check single plugin
 * const result = await checker.checkPlugin('sdlc-complete');
 * console.log(result.status); // 'healthy' | 'warning' | 'error'
 * console.log(result.issues); // Array of issue objects
 *
 * // Check all plugins
 * const summary = await checker.checkAll();
 * console.log(summary.healthy); // Number of healthy plugins
 * console.log(summary.warnings); // Number with warnings
 * console.log(summary.errors); // Number with errors
 *
 * // Get detailed report
 * const report = await checker.getHealthReport('sdlc-complete');
 * report.issues.forEach(issue => {
 *   console.log(`[${issue.severity}] ${issue.check}: ${issue.message}`);
 * });
 *
 * // Auto-repair plugin
 * const repairResult = await checker.repairPlugin('broken-plugin');
 * if (repairResult.repaired) {
 *   console.log('Repair actions:', repairResult.actions);
 * }
 *
 * @errors
 * - HealthCheckError: Health check validation failed
 * - PluginNotFoundError: Plugin ID not in registry (re-exported from PluginRegistry)
 */

import fs from 'fs/promises';
import path from 'path';
import { PluginRegistry, PluginNotFoundError } from './registry-manager.mjs';

// Custom error class
class HealthCheckError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'HealthCheckError';
    this.details = details;
  }
}

/**
 * HealthChecker - Validate plugin health and integrity
 *
 * Performs comprehensive health checks across:
 * - Manifest integrity (existence, valid JSON, required fields)
 * - Directory structure (required directories present)
 * - Version compatibility (add-ons compatible with parent framework)
 * - Dependencies (parent frameworks exist, no circular dependencies)
 * - Disk usage (large plugin warnings)
 *
 * @class
 */
export class HealthChecker {
  /**
   * Create HealthChecker instance
   *
   * @param {string} [basePath='.aiwg'] - Base path to .aiwg workspace directory
   * @param {PluginRegistry} [registry] - Existing PluginRegistry instance (optional, will create if not provided)
   *
   * @example
   * const checker = new HealthChecker();
   * const customChecker = new HealthChecker('/custom/path/.aiwg', existingRegistry);
   */
  constructor(basePath = '.aiwg', registry = null) {
    this.basePath = path.resolve(basePath);
    this.registry = registry || new PluginRegistry(path.join(this.basePath, 'frameworks', 'registry.json'));

    // Cache settings
    this.cache = new Map(); // pluginId -> { status, issues, timestamp }
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Health check thresholds
    this.diskUsageWarningThreshold = 500 * 1024 * 1024; // 500 MB
  }

  // ===========================
  // Health Checks
  // ===========================

  /**
   * Check plugin health
   *
   * Runs all validation checks and returns health status with issues.
   * Results cached for 5 minutes for performance.
   *
   * @param {string} pluginId - Plugin ID to check
   *
   * @returns {Promise<Object>} Health check result
   * @returns {string} .pluginId - Plugin ID
   * @returns {string} .status - Health status ('healthy' | 'warning' | 'error')
   * @returns {Object[]} .issues - Array of issue objects
   * @returns {string} .timestamp - ISO 8601 timestamp of check
   *
   * @throws {PluginNotFoundError} If plugin ID not in registry
   *
   * @example
   * const result = await checker.checkPlugin('sdlc-complete');
   * if (result.status === 'error') {
   *   console.error('Critical issues found:', result.issues);
   * }
   */
  async checkPlugin(pluginId) {
    // Check cache first
    const cached = this.getCached(pluginId);
    if (cached) {
      return cached;
    }

    // Verify plugin exists in registry
    await this.registry.getPlugin(pluginId); // Throws PluginNotFoundError if missing

    const issues = [];
    let status = 'healthy';

    // 1. Manifest integrity
    const manifestCheck = await this.validateManifest(pluginId);
    if (!manifestCheck.valid) {
      issues.push(...manifestCheck.issues);
      if (manifestCheck.issues.some(i => i.severity === 'error')) {
        status = 'error';
      } else if (status === 'healthy') {
        status = 'warning';
      }
    }

    // 2. Directory structure
    const dirCheck = await this.validateDirectories(pluginId);
    if (!dirCheck.valid) {
      issues.push(...dirCheck.issues);
      if (dirCheck.issues.some(i => i.severity === 'error')) {
        status = 'error';
      } else if (status === 'healthy') {
        status = 'warning';
      }
    }

    // 3. Version compatibility (for add-ons)
    const versionCheck = await this.validateVersionCompatibility(pluginId);
    if (!versionCheck.valid) {
      issues.push(...versionCheck.issues);
      if (versionCheck.issues.some(i => i.severity === 'error')) {
        status = 'error';
      } else if (status === 'healthy') {
        status = 'warning';
      }
    }

    // 4. Dependencies (for add-ons/extensions)
    const depCheck = await this.validateDependencies(pluginId);
    if (!depCheck.valid) {
      issues.push(...depCheck.issues);
      if (depCheck.issues.some(i => i.severity === 'error')) {
        status = 'error';
      } else if (status === 'healthy') {
        status = 'warning';
      }
    }

    // 5. Disk usage check (warning only)
    const diskUsage = await this._getDiskUsage(pluginId);
    if (diskUsage > this.diskUsageWarningThreshold) {
      issues.push({
        check: 'disk-usage',
        severity: 'warning',
        message: `Large disk usage: ${this._formatBytes(diskUsage)}`,
        details: { diskUsage, threshold: this.diskUsageWarningThreshold }
      });
      if (status === 'healthy') {
        status = 'warning';
      }
    }

    const result = {
      pluginId,
      status,
      issues,
      timestamp: new Date().toISOString()
    };

    // Cache result
    this.cache.set(pluginId, result);

    // Update registry health status
    try {
      await this.registry.updatePlugin(pluginId, {
        health: status,
        'health-checked': result.timestamp
      });
    } catch (error) {
      console.warn(`[HealthChecker] Failed to update registry health for '${pluginId}':`, error.message);
    }

    return result;
  }

  /**
   * Check all plugins
   *
   * Runs health checks on all installed plugins and returns summary statistics.
   *
   * @returns {Promise<Object>} Summary object
   * @returns {number} .total - Total number of plugins checked
   * @returns {number} .healthy - Number of healthy plugins
   * @returns {number} .warnings - Number with warnings
   * @returns {number} .errors - Number with errors
   * @returns {Object[]} .results - Array of individual health check results
   *
   * @example
   * const summary = await checker.checkAll();
   * console.log(`${summary.healthy}/${summary.total} plugins healthy`);
   * summary.results.forEach(r => {
   *   console.log(`${r.pluginId}: ${r.status}`);
   * });
   */
  async checkAll() {
    const plugins = await this.registry.listPlugins();
    const results = [];

    for (const plugin of plugins) {
      try {
        const result = await this.checkPlugin(plugin.id);
        results.push(result);
      } catch (error) {
        console.error(`[HealthChecker] Failed to check plugin '${plugin.id}':`, error.message);
        results.push({
          pluginId: plugin.id,
          status: 'error',
          issues: [{
            check: 'health-check-failed',
            severity: 'error',
            message: `Health check failed: ${error.message}`,
            details: { error: error.message }
          }],
          timestamp: new Date().toISOString()
        });
      }
    }

    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      warnings: results.filter(r => r.status === 'warning').length,
      errors: results.filter(r => r.status === 'error').length,
      results
    };

    return summary;
  }

  // ===========================
  // Detailed Reports
  // ===========================

  /**
   * Get detailed health report
   *
   * Returns comprehensive health report with issue breakdown by category.
   *
   * @param {string} pluginId - Plugin ID
   *
   * @returns {Promise<Object>} Detailed health report
   * @returns {string} .pluginId - Plugin ID
   * @returns {string} .status - Health status
   * @returns {Object} .metadata - Plugin metadata from registry
   * @returns {Object[]} .issues - Array of issues grouped by check type
   * @returns {Object} .summary - Issue count summary
   * @returns {string} .timestamp - ISO 8601 timestamp
   *
   * @throws {PluginNotFoundError} If plugin ID not in registry
   *
   * @example
   * const report = await checker.getHealthReport('sdlc-complete');
   * console.log('Status:', report.status);
   * console.log('Issues:', report.summary);
   * report.issues.forEach(issue => {
   *   console.log(`- [${issue.severity}] ${issue.message}`);
   * });
   */
  async getHealthReport(pluginId) {
    const healthCheck = await this.checkPlugin(pluginId);
    const metadata = await this.registry.getPlugin(pluginId);

    const summary = {
      total: healthCheck.issues.length,
      errors: healthCheck.issues.filter(i => i.severity === 'error').length,
      warnings: healthCheck.issues.filter(i => i.severity === 'warning').length
    };

    return {
      pluginId,
      status: healthCheck.status,
      metadata,
      issues: healthCheck.issues,
      summary,
      timestamp: healthCheck.timestamp
    };
  }

  /**
   * Generate summary across all plugins
   *
   * Returns high-level summary of overall plugin ecosystem health.
   *
   * @returns {Promise<Object>} Overall health summary
   *
   * @example
   * const summary = await checker.generateSummary();
   * console.log(`Overall health: ${summary.overallStatus}`);
   * console.log(`Plugins: ${summary.plugins.total} total, ${summary.plugins.healthy} healthy`);
   */
  async generateSummary() {
    const checkResults = await this.checkAll();

    const overallStatus = checkResults.errors > 0 ? 'error' :
                          checkResults.warnings > 0 ? 'warning' : 'healthy';

    const totalIssues = checkResults.results.reduce((sum, r) => sum + r.issues.length, 0);
    const errorIssues = checkResults.results.reduce(
      (sum, r) => sum + r.issues.filter(i => i.severity === 'error').length, 0
    );
    const warningIssues = checkResults.results.reduce(
      (sum, r) => sum + r.issues.filter(i => i.severity === 'warning').length, 0
    );

    return {
      overallStatus,
      plugins: {
        total: checkResults.total,
        healthy: checkResults.healthy,
        warnings: checkResults.warnings,
        errors: checkResults.errors
      },
      issues: {
        total: totalIssues,
        errors: errorIssues,
        warnings: warningIssues
      },
      timestamp: new Date().toISOString()
    };
  }

  // ===========================
  // Validation Methods
  // ===========================

  /**
   * Validate plugin manifest integrity
   *
   * Checks:
   * - Manifest file exists at correct path
   * - Valid JSON parsing
   * - Required fields present (id, version, type)
   *
   * @param {string} pluginId - Plugin ID
   *
   * @returns {Promise<Object>} Validation result
   * @returns {boolean} .valid - True if all checks passed
   * @returns {Object[]} .issues - Array of issues found
   *
   * @example
   * const result = await checker.validateManifest('sdlc-complete');
   * if (!result.valid) {
   *   console.error('Manifest issues:', result.issues);
   * }
   */
  async validateManifest(pluginId) {
    const issues = [];

    try {
      const plugin = await this.registry.getPlugin(pluginId);
      const manifestPath = this._getManifestPath(plugin);

      // Check if manifest file exists
      try {
        await fs.access(manifestPath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          issues.push({
            check: 'manifest-integrity',
            severity: 'error',
            message: `Missing manifest file: ${manifestPath}`,
            details: { path: manifestPath }
          });
          return { valid: false, issues };
        }
        throw error;
      }

      // Try to parse manifest JSON
      let manifest;
      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        manifest = JSON.parse(manifestContent);
      } catch (error) {
        if (error instanceof SyntaxError) {
          issues.push({
            check: 'manifest-integrity',
            severity: 'error',
            message: `Corrupted manifest (invalid JSON): ${error.message}`,
            details: { path: manifestPath, error: error.message }
          });
          return { valid: false, issues };
        }
        throw error;
      }

      // Validate required fields
      const requiredFields = ['id', 'version', 'type'];
      const missingFields = requiredFields.filter(field => !manifest[field]);

      if (missingFields.length > 0) {
        issues.push({
          check: 'manifest-integrity',
          severity: 'error',
          message: `Missing required fields in manifest: ${missingFields.join(', ')}`,
          details: { path: manifestPath, missingFields }
        });
      }

      // Validate ID matches
      if (manifest.id && manifest.id !== pluginId) {
        issues.push({
          check: 'manifest-integrity',
          severity: 'warning',
          message: `Manifest ID mismatch: expected '${pluginId}', got '${manifest.id}'`,
          details: { expected: pluginId, actual: manifest.id }
        });
      }

    } catch (error) {
      if (error instanceof PluginNotFoundError) {
        throw error;
      }
      issues.push({
        check: 'manifest-integrity',
        severity: 'error',
        message: `Manifest validation failed: ${error.message}`,
        details: { error: error.message }
      });
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Validate plugin directory structure
   *
   * Checks:
   * - Framework: repo/ and projects/ directories exist
   * - Add-on: repo/ directory exists
   * - Extension: repo/ directory exists
   *
   * @param {string} pluginId - Plugin ID
   *
   * @returns {Promise<Object>} Validation result
   * @returns {boolean} .valid - True if all checks passed
   * @returns {Object[]} .issues - Array of issues found
   *
   * @example
   * const result = await checker.validateDirectories('sdlc-complete');
   */
  async validateDirectories(pluginId) {
    const issues = [];

    try {
      const plugin = await this.registry.getPlugin(pluginId);
      const repoPath = path.join(this.basePath, plugin['repo-path']);

      // Check repo/ directory (required for all plugin types)
      try {
        const repoStats = await fs.stat(repoPath);
        if (!repoStats.isDirectory()) {
          issues.push({
            check: 'directory-structure',
            severity: 'error',
            message: `Invalid repo path: ${repoPath} is not a directory`,
            details: { path: repoPath }
          });
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          issues.push({
            check: 'directory-structure',
            severity: 'error',
            message: `Missing required directory: repo/ at ${repoPath}`,
            details: { path: repoPath }
          });
        } else {
          throw error;
        }
      }

      // Framework-specific: check projects/ directory
      if (plugin.type === 'framework') {
        const projectsPath = path.join(this.basePath, path.dirname(plugin['repo-path']), 'projects');

        try {
          const projectsStats = await fs.stat(projectsPath);
          if (!projectsStats.isDirectory()) {
            issues.push({
              check: 'directory-structure',
              severity: 'error',
              message: `Invalid projects path: ${projectsPath} is not a directory`,
              details: { path: projectsPath }
            });
          }
        } catch (error) {
          if (error.code === 'ENOENT') {
            issues.push({
              check: 'directory-structure',
              severity: 'error',
              message: `Missing required directory: projects/ at ${projectsPath}`,
              details: { path: projectsPath }
            });
          } else {
            throw error;
          }
        }
      }

    } catch (error) {
      if (error instanceof PluginNotFoundError) {
        throw error;
      }
      issues.push({
        check: 'directory-structure',
        severity: 'error',
        message: `Directory validation failed: ${error.message}`,
        details: { error: error.message }
      });
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Validate version compatibility
   *
   * For add-ons: checks parent framework version compatibility using semantic versioning.
   * For frameworks/extensions: no version compatibility checks (returns valid).
   *
   * @param {string} pluginId - Plugin ID
   *
   * @returns {Promise<Object>} Validation result
   * @returns {boolean} .valid - True if compatible
   * @returns {Object[]} .issues - Array of issues found
   *
   * @example
   * const result = await checker.validateVersionCompatibility('gdpr-compliance');
   */
  async validateVersionCompatibility(pluginId) {
    const issues = [];

    try {
      const plugin = await this.registry.getPlugin(pluginId);

      // Only check for add-ons
      if (plugin.type !== 'add-on') {
        return { valid: true, issues: [] };
      }

      // Verify parent framework exists
      const parentId = plugin['parent-framework'];
      if (!parentId) {
        issues.push({
          check: 'version-compatibility',
          severity: 'error',
          message: `Add-on missing parent-framework field`,
          details: { pluginId }
        });
        return { valid: false, issues };
      }

      let parentPlugin;
      try {
        parentPlugin = await this.registry.getPlugin(parentId);
      } catch (error) {
        if (error instanceof PluginNotFoundError) {
          issues.push({
            check: 'version-compatibility',
            severity: 'error',
            message: `Parent framework '${parentId}' not found`,
            details: { parentId }
          });
          return { valid: false, issues };
        }
        throw error;
      }

      // Parse semantic versions
      const addonVersion = this._parseSemver(plugin.version);
      const parentVersion = this._parseSemver(parentPlugin.version);

      if (!addonVersion || !parentVersion) {
        issues.push({
          check: 'version-compatibility',
          severity: 'warning',
          message: `Invalid version format (expected semver): add-on=${plugin.version}, parent=${parentPlugin.version}`,
          details: { addonVersion: plugin.version, parentVersion: parentPlugin.version }
        });
        return { valid: false, issues };
      }

      // Check major version compatibility (major versions must match)
      if (addonVersion.major !== parentVersion.major) {
        issues.push({
          check: 'version-compatibility',
          severity: 'error',
          message: `Incompatible major version: add-on v${plugin.version} requires parent v${parentPlugin.version}`,
          details: {
            addonVersion: plugin.version,
            parentVersion: parentPlugin.version,
            reason: 'Major version mismatch'
          }
        });
      }

      // Warn if add-on minor version exceeds parent
      if (addonVersion.major === parentVersion.major && addonVersion.minor > parentVersion.minor) {
        issues.push({
          check: 'version-compatibility',
          severity: 'warning',
          message: `Add-on minor version exceeds parent: add-on v${plugin.version}, parent v${parentPlugin.version}`,
          details: {
            addonVersion: plugin.version,
            parentVersion: parentPlugin.version
          }
        });
      }

    } catch (error) {
      if (error instanceof PluginNotFoundError) {
        throw error;
      }
      issues.push({
        check: 'version-compatibility',
        severity: 'error',
        message: `Version compatibility check failed: ${error.message}`,
        details: { error: error.message }
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }

  /**
   * Validate plugin dependencies
   *
   * Checks:
   * - Add-ons: parent framework exists and is healthy
   * - Extensions: extended framework exists
   * - No circular dependencies
   *
   * @param {string} pluginId - Plugin ID
   *
   * @returns {Promise<Object>} Validation result
   * @returns {boolean} .valid - True if dependencies satisfied
   * @returns {Object[]} .issues - Array of issues found
   *
   * @example
   * const result = await checker.validateDependencies('gdpr-compliance');
   */
  async validateDependencies(pluginId) {
    const issues = [];

    try {
      const plugin = await this.registry.getPlugin(pluginId);

      // Check add-on dependencies
      if (plugin.type === 'add-on') {
        const parentId = plugin['parent-framework'];

        if (!parentId) {
          issues.push({
            check: 'dependencies',
            severity: 'error',
            message: `Add-on missing parent-framework field`,
            details: { pluginId }
          });
        } else {
          // Verify parent framework exists
          try {
            const parentPlugin = await this.registry.getPlugin(parentId);

            // Verify parent is a framework
            if (parentPlugin.type !== 'framework') {
              issues.push({
                check: 'dependencies',
                severity: 'error',
                message: `Parent '${parentId}' is not a framework (type: ${parentPlugin.type})`,
                details: { parentId, parentType: parentPlugin.type }
              });
            }

            // Warn if parent framework has errors
            if (parentPlugin.health === 'error') {
              issues.push({
                check: 'dependencies',
                severity: 'warning',
                message: `Parent framework '${parentId}' has health errors`,
                details: { parentId, parentHealth: parentPlugin.health }
              });
            }

          } catch (error) {
            if (error instanceof PluginNotFoundError) {
              issues.push({
                check: 'dependencies',
                severity: 'error',
                message: `Missing parent framework: ${parentId}`,
                details: { parentId }
              });
            } else {
              throw error;
            }
          }
        }
      }

      // Check extension dependencies
      if (plugin.type === 'extension') {
        const extendsId = plugin.extends;

        if (!extendsId) {
          issues.push({
            check: 'dependencies',
            severity: 'error',
            message: `Extension missing 'extends' field`,
            details: { pluginId }
          });
        } else {
          // Verify extended framework exists
          try {
            const extendedPlugin = await this.registry.getPlugin(extendsId);

            // Verify extended plugin is a framework
            if (extendedPlugin.type !== 'framework') {
              issues.push({
                check: 'dependencies',
                severity: 'warning',
                message: `Extended plugin '${extendsId}' is not a framework (type: ${extendedPlugin.type})`,
                details: { extendsId, extendedType: extendedPlugin.type }
              });
            }

          } catch (error) {
            if (error instanceof PluginNotFoundError) {
              issues.push({
                check: 'dependencies',
                severity: 'error',
                message: `Missing extended framework: ${extendsId}`,
                details: { extendsId }
              });
            } else {
              throw error;
            }
          }
        }
      }

      // Check for circular dependencies
      const circularCheck = await this._checkCircularDependencies(pluginId);
      if (!circularCheck.valid) {
        issues.push(...circularCheck.issues);
      }

    } catch (error) {
      if (error instanceof PluginNotFoundError) {
        throw error;
      }
      issues.push({
        check: 'dependencies',
        severity: 'error',
        message: `Dependency validation failed: ${error.message}`,
        details: { error: error.message }
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }

  // ===========================
  // Cache Management
  // ===========================

  /**
   * Get cached health check result
   *
   * @param {string} pluginId - Plugin ID
   *
   * @returns {Object|null} Cached result or null if expired/missing
   *
   * @example
   * const cached = checker.getCached('sdlc-complete');
   * if (cached) {
   *   console.log('Using cached result:', cached.status);
   * }
   */
  getCached(pluginId) {
    const cached = this.cache.get(pluginId);

    if (!cached) {
      return null;
    }

    const age = Date.now() - new Date(cached.timestamp).getTime();

    if (age > this.cacheTTL) {
      // Cache expired
      this.cache.delete(pluginId);
      return null;
    }

    return cached;
  }

  /**
   * Clear all cached health checks
   *
   * @example
   * checker.clearCache();
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Invalidate cache for specific plugin
   *
   * @param {string} pluginId - Plugin ID
   *
   * @example
   * checker.invalidateCache('sdlc-complete');
   */
  invalidateCache(pluginId) {
    this.cache.delete(pluginId);
  }

  // ===========================
  // Auto-Repair
  // ===========================

  /**
   * Attempt auto-repair for common plugin issues
   *
   * Supports:
   * - Creating missing directories (repo/, projects/)
   * - Regenerating missing manifest with defaults
   *
   * @param {string} pluginId - Plugin ID to repair
   *
   * @returns {Promise<Object>} Repair result
   * @returns {boolean} .repaired - True if repairs were applied
   * @returns {string[]} .actions - Array of repair actions taken
   * @returns {Object[]} .failures - Array of failed repair attempts
   *
   * @throws {PluginNotFoundError} If plugin ID not in registry
   *
   * @example
   * const result = await checker.repairPlugin('broken-plugin');
   * if (result.repaired) {
   *   console.log('Repairs applied:', result.actions);
   * } else {
   *   console.log('No repairs needed');
   * }
   */
  async repairPlugin(pluginId) {
    const actions = [];
    const failures = [];

    try {
      const plugin = await this.registry.getPlugin(pluginId);

      // 1. Check and create missing directories
      const dirCheck = await this.validateDirectories(pluginId);

      for (const issue of dirCheck.issues) {
        if (issue.check === 'directory-structure' && issue.severity === 'error') {
          const dirPath = issue.details.path;

          try {
            await fs.mkdir(dirPath, { recursive: true });
            actions.push(`Created missing directory: ${dirPath}`);
          } catch (error) {
            failures.push({
              action: `Create directory: ${dirPath}`,
              error: error.message
            });
          }
        }
      }

      // 2. Check and regenerate missing manifest
      const manifestCheck = await this.validateManifest(pluginId);
      const missingManifest = manifestCheck.issues.some(
        i => i.check === 'manifest-integrity' && i.message.includes('Missing manifest file')
      );

      if (missingManifest) {
        const manifestPath = this._getManifestPath(plugin);

        try {
          const defaultManifest = {
            id: plugin.id,
            version: plugin.version,
            type: plugin.type,
            name: plugin.name,
            description: `Auto-generated manifest for ${plugin.name}`,
            'install-date': plugin['install-date']
          };

          // Ensure directory exists
          await fs.mkdir(path.dirname(manifestPath), { recursive: true });

          await fs.writeFile(manifestPath, JSON.stringify(defaultManifest, null, 2), 'utf-8');
          actions.push(`Regenerated missing manifest: ${manifestPath}`);
        } catch (error) {
          failures.push({
            action: `Regenerate manifest: ${manifestPath}`,
            error: error.message
          });
        }
      }

      // Invalidate cache after repairs
      if (actions.length > 0) {
        this.invalidateCache(pluginId);
      }

    } catch (error) {
      if (error instanceof PluginNotFoundError) {
        throw error;
      }
      failures.push({
        action: 'Auto-repair',
        error: error.message
      });
    }

    return {
      repaired: actions.length > 0,
      actions,
      failures
    };
  }

  // ===========================
  // Internal Helpers
  // ===========================

  /**
   * Get manifest file path for plugin
   *
   * Handles both frameworks (with repo/ subdirectory) and add-ons/extensions (without).
   *
   * @private
   * @param {Object} plugin - Plugin metadata object
   * @returns {string} Absolute path to manifest.json
   */
  _getManifestPath(plugin) {
    // Normalize repo-path (remove trailing slash)
    const repoPath = plugin['repo-path'].replace(/\/$/, '');

    // Determine plugin directory based on structure
    let pluginDir;

    if (repoPath.endsWith('/repo')) {
      // Framework structure: frameworks/{id}/repo/ → manifest at frameworks/{id}/manifest.json
      pluginDir = path.join(this.basePath, path.dirname(repoPath));
    } else {
      // Add-on/Extension structure: add-ons/{id}/ → manifest at add-ons/{id}/manifest.json
      pluginDir = path.join(this.basePath, repoPath);
    }

    return path.join(pluginDir, 'manifest.json');
  }

  /**
   * Calculate disk usage for plugin
   *
   * @private
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<number>} Disk usage in bytes
   */
  async _getDiskUsage(pluginId) {
    try {
      const plugin = await this.registry.getPlugin(pluginId);
      const repoPath = path.join(this.basePath, plugin['repo-path']);

      return await this._getDirectorySize(repoPath);
    } catch (error) {
      console.warn(`[HealthChecker] Failed to calculate disk usage for '${pluginId}':`, error.message);
      return 0;
    }
  }

  /**
   * Recursively calculate directory size
   *
   * @private
   * @param {string} dirPath - Directory path
   * @returns {Promise<number>} Total size in bytes
   */
  async _getDirectorySize(dirPath) {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await this._getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore permission errors, missing directories
      if (error.code !== 'ENOENT' && error.code !== 'EACCES') {
        console.warn(`[HealthChecker] Error calculating directory size for ${dirPath}:`, error.message);
      }
    }

    return totalSize;
  }

  /**
   * Format bytes as human-readable string
   *
   * @private
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string (e.g., "125 MB")
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Parse semantic version string
   *
   * @private
   * @param {string} version - Version string (e.g., "1.2.3")
   * @returns {Object|null} Parsed version { major, minor, patch } or null if invalid
   */
  _parseSemver(version) {
    if (!version) return null;

    const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return null;

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10)
    };
  }

  /**
   * Check for circular dependencies
   *
   * @private
   * @param {string} pluginId - Plugin ID to check
   * @param {Set<string>} [visited=new Set()] - Set of visited plugin IDs (for recursion)
   * @returns {Promise<Object>} Validation result
   */
  async _checkCircularDependencies(pluginId, visited = new Set()) {
    const issues = [];

    try {
      // Detect cycle
      if (visited.has(pluginId)) {
        issues.push({
          check: 'dependencies',
          severity: 'error',
          message: `Circular dependency detected: ${Array.from(visited).join(' -> ')} -> ${pluginId}`,
          details: { cycle: Array.from(visited).concat(pluginId) }
        });
        return { valid: false, issues };
      }

      visited.add(pluginId);

      const plugin = await this.registry.getPlugin(pluginId);

      // Check parent framework (add-ons)
      if (plugin.type === 'add-on' && plugin['parent-framework']) {
        const parentCheck = await this._checkCircularDependencies(
          plugin['parent-framework'],
          new Set(visited)
        );
        issues.push(...parentCheck.issues);
      }

      // Check extended framework (extensions)
      if (plugin.type === 'extension' && plugin.extends) {
        const extendsCheck = await this._checkCircularDependencies(
          plugin.extends,
          new Set(visited)
        );
        issues.push(...extendsCheck.issues);
      }

    } catch (error) {
      if (error instanceof PluginNotFoundError) {
        // Missing dependency already caught by validateDependencies
        return { valid: true, issues: [] };
      }
      // Ignore other errors in circular dependency check
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Export error classes
export { HealthCheckError, PluginNotFoundError };

// Example usage
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const checker = new HealthChecker();

  // Check single plugin
  console.log('\n=== Check Single Plugin ===');
  try {
    const result = await checker.checkPlugin('sdlc-complete');
    console.log(`Status: ${result.status}`);
    console.log(`Issues: ${result.issues.length}`);
    result.issues.forEach(issue => {
      console.log(`  [${issue.severity}] ${issue.check}: ${issue.message}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Check all plugins
  console.log('\n=== Check All Plugins ===');
  try {
    const summary = await checker.checkAll();
    console.log(`Total: ${summary.total}`);
    console.log(`Healthy: ${summary.healthy}`);
    console.log(`Warnings: ${summary.warnings}`);
    console.log(`Errors: ${summary.errors}`);
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Generate summary
  console.log('\n=== Overall Summary ===');
  try {
    const summary = await checker.generateSummary();
    console.log(`Overall Status: ${summary.overallStatus}`);
    console.log(`Plugins: ${summary.plugins.healthy}/${summary.plugins.total} healthy`);
    console.log(`Issues: ${summary.issues.total} total (${summary.issues.errors} errors, ${summary.issues.warnings} warnings)`);
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Get detailed report
  console.log('\n=== Detailed Report ===');
  try {
    const report = await checker.getHealthReport('sdlc-complete');
    console.log(`Plugin: ${report.pluginId}`);
    console.log(`Status: ${report.status}`);
    console.log(`Type: ${report.metadata.type}`);
    console.log(`Version: ${report.metadata.version}`);
    console.log(`Summary: ${report.summary.total} issues (${report.summary.errors} errors, ${report.summary.warnings} warnings)`);
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Auto-repair example
  console.log('\n=== Auto-Repair ===');
  try {
    const repairResult = await checker.repairPlugin('sdlc-complete');
    if (repairResult.repaired) {
      console.log('Repairs applied:');
      repairResult.actions.forEach(action => console.log(`  - ${action}`));
    } else {
      console.log('No repairs needed');
    }
    if (repairResult.failures.length > 0) {
      console.log('Failed repairs:');
      repairResult.failures.forEach(failure => {
        console.log(`  - ${failure.action}: ${failure.error}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}
