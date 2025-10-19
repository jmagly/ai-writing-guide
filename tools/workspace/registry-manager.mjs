/**
 * PluginRegistry - CRUD operations for plugin registry management
 *
 * Provides atomic, thread-safe operations for managing installed plugins catalog.
 * Supports frameworks, add-ons, and extensions with health monitoring.
 * Implements file-based locking, JSON schema validation, and graceful error handling.
 *
 * @module tools/workspace/registry-manager
 * @version 2.0.0
 * @since 2025-10-19
 *
 * @example
 * // Initialize registry
 * const registry = new PluginRegistry();
 * await registry.initialize();
 *
 * // Add framework
 * await registry.addPlugin({
 *   id: 'sdlc-complete',
 *   type: 'framework',
 *   name: 'SDLC Complete Framework',
 *   version: '1.0.0',
 *   'install-date': new Date().toISOString(),
 *   'repo-path': 'frameworks/sdlc-complete/repo/',
 *   projects: [],
 *   health: 'healthy',
 *   'health-checked': new Date().toISOString()
 * });
 *
 * // Query plugins
 * const isInstalled = await registry.isInstalled('sdlc-complete');
 * const plugin = await registry.getPlugin('sdlc-complete');
 * const allPlugins = await registry.listPlugins();
 * const frameworks = await registry.getByType('framework');
 * const healthy = await registry.getHealthy();
 *
 * @errors
 * - PluginNotFoundError: Plugin ID not in registry
 * - InvalidSchemaError: Registry JSON schema validation failed
 * - RegistryLockError: Failed to acquire lock after retries
 * - DuplicatePluginError: Plugin ID already exists
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom error classes
class PluginNotFoundError extends Error {
  constructor(pluginId) {
    super(`Plugin '${pluginId}' not found in registry. Install via: aiwg -deploy-framework ${pluginId}`);
    this.name = 'PluginNotFoundError';
    this.pluginId = pluginId;
  }
}

// Backward compatibility alias
class FrameworkNotFoundError extends PluginNotFoundError {
  constructor(frameworkId) {
    super(frameworkId);
    this.name = 'FrameworkNotFoundError';
    this.frameworkId = frameworkId;
  }
}

class InvalidSchemaError extends Error {
  constructor(message, errors = []) {
    super(`Registry schema validation failed: ${message}`);
    this.name = 'InvalidSchemaError';
    this.errors = errors;
  }
}

class RegistryLockError extends Error {
  constructor(message) {
    super(`Failed to acquire registry lock: ${message}`);
    this.name = 'RegistryLockError';
  }
}

class DuplicatePluginError extends Error {
  constructor(pluginId) {
    super(`Plugin '${pluginId}' already exists in registry`);
    this.name = 'DuplicatePluginError';
    this.pluginId = pluginId;
  }
}

// Backward compatibility alias
class DuplicateFrameworkError extends DuplicatePluginError {
  constructor(frameworkId) {
    super(frameworkId);
    this.name = 'DuplicateFrameworkError';
    this.frameworkId = frameworkId;
  }
}

/**
 * PluginRegistry - Manages installed plugins catalog
 *
 * Provides CRUD operations with atomic writes, file locking, and schema validation.
 * Supports frameworks, add-ons, and extensions with health monitoring.
 * Registry stored as JSON at .aiwg/frameworks/registry.json
 *
 * @class
 */
export class PluginRegistry {
  /**
   * Create a PluginRegistry instance
   *
   * @param {string} [registryPath='.aiwg/frameworks/registry.json'] - Absolute or relative path to registry file
   *
   * @example
   * const registry = new PluginRegistry();
   * const customRegistry = new PluginRegistry('/custom/path/registry.json');
   */
  constructor(registryPath = '.aiwg/frameworks/registry.json') {
    this.registryPath = path.resolve(registryPath);
    this.lockPath = `${this.registryPath}.lock`;
    this.maxLockRetries = 3;
    this.lockRetryDelay = 100; // milliseconds
    this.schemaVersion = '1.0';
  }

  // ===========================
  // CRUD Operations
  // ===========================

  /**
   * Initialize empty registry if not exists
   *
   * Creates .aiwg/frameworks/ directory and empty registry.json with valid schema.
   * Idempotent - safe to call multiple times.
   *
   * @returns {Promise<void>}
   * @throws {Error} If directory creation or file write fails
   *
   * @example
   * await registry.initialize();
   * // Registry created at .aiwg/frameworks/registry.json
   */
  async initialize() {
    const registryDir = path.dirname(this.registryPath);

    // Create directory if missing
    await fs.mkdir(registryDir, { recursive: true });

    // Check if registry already exists
    try {
      await fs.access(this.registryPath);
      console.debug(`[PluginRegistry] Registry already exists at ${this.registryPath}`);
      return;
    } catch {
      // Registry doesn't exist, create it
    }

    // Create empty registry
    const emptyRegistry = {
      version: this.schemaVersion,
      plugins: []
    };

    await this._atomicWrite(emptyRegistry);
    console.debug(`[PluginRegistry] Initialized empty registry at ${this.registryPath}`);
  }

  /**
   * Add new plugin to registry
   *
   * @param {Object} pluginMetadata - Plugin metadata object
   * @param {string} pluginMetadata.id - Plugin ID (kebab-case, e.g., 'sdlc-complete')
   * @param {string} pluginMetadata.type - Plugin type ('framework' | 'add-on' | 'extension')
   * @param {string} pluginMetadata.name - Human-readable plugin name
   * @param {string} pluginMetadata.version - Semantic version (e.g., '1.0.0')
   * @param {string} pluginMetadata['install-date'] - ISO 8601 timestamp
   * @param {string} pluginMetadata['repo-path'] - Relative path to plugin repo directory
   * @param {string} [pluginMetadata['parent-framework']] - Parent framework ID (for add-ons)
   * @param {string} [pluginMetadata.extends] - Extended framework ID (for extensions)
   * @param {string[]} [pluginMetadata.projects=[]] - Array of project IDs (frameworks only)
   * @param {string[]} [pluginMetadata.campaigns=[]] - Array of campaign IDs (marketing)
   * @param {string[]} [pluginMetadata.stories=[]] - Array of story IDs (agile)
   * @param {string} [pluginMetadata.health='unknown'] - Health status ('healthy' | 'warning' | 'error' | 'unknown')
   * @param {string} [pluginMetadata['health-checked']] - ISO 8601 timestamp of last health check
   *
   * @returns {Promise<void>}
   * @throws {DuplicatePluginError} If plugin ID already exists
   * @throws {InvalidSchemaError} If metadata validation fails
   *
   * @example
   * await registry.addPlugin({
   *   id: 'sdlc-complete',
   *   type: 'framework',
   *   name: 'SDLC Complete Framework',
   *   version: '1.0.0',
   *   'install-date': '2025-10-19T12:00:00Z',
   *   'repo-path': 'frameworks/sdlc-complete/repo/',
   *   projects: [],
   *   health: 'healthy',
   *   'health-checked': '2025-10-19T12:00:00Z'
   * });
   */
  async addPlugin(pluginMetadata) {
    // Validate plugin metadata
    this._validatePluginMetadata(pluginMetadata);

    await this._acquireLock();

    try {
      const registry = await this._readRegistry();

      // Check for duplicate
      if (registry.plugins.some(p => p.id === pluginMetadata.id)) {
        throw new DuplicatePluginError(pluginMetadata.id);
      }

      // Add default health status if missing
      if (!pluginMetadata.health) {
        pluginMetadata.health = 'unknown';
      }

      // Add plugin
      registry.plugins.push(pluginMetadata);

      await this._atomicWrite(registry);
      console.debug(`[PluginRegistry] Added plugin: ${pluginMetadata.id} (${pluginMetadata.type})`);
    } finally {
      await this._releaseLock();
    }
  }

  /**
   * Update existing plugin metadata
   *
   * @param {string} pluginId - Plugin ID to update
   * @param {Object} updates - Partial plugin metadata to merge
   *
   * @returns {Promise<void>}
   * @throws {PluginNotFoundError} If plugin ID not found
   * @throws {InvalidSchemaError} If updated metadata fails validation
   *
   * @example
   * await registry.updatePlugin('sdlc-complete', {
   *   version: '1.1.0',
   *   projects: ['plugin-system', 'auth-service']
   * });
   */
  async updatePlugin(pluginId, updates) {
    this._validatePluginId(pluginId);

    await this._acquireLock();

    try {
      const registry = await this._readRegistry();

      const pluginIndex = registry.plugins.findIndex(p => p.id === pluginId);
      if (pluginIndex === -1) {
        throw new PluginNotFoundError(pluginId);
      }

      // Merge updates
      const updated = { ...registry.plugins[pluginIndex], ...updates };

      // Validate merged metadata
      this._validatePluginMetadata(updated);

      registry.plugins[pluginIndex] = updated;

      await this._atomicWrite(registry);
      console.debug(`[PluginRegistry] Updated plugin: ${pluginId}`);
    } finally {
      await this._releaseLock();
    }
  }

  /**
   * Remove plugin from registry
   *
   * @param {string} pluginId - Plugin ID to remove
   *
   * @returns {Promise<void>}
   * @throws {PluginNotFoundError} If plugin ID not found
   *
   * @example
   * await registry.removePlugin('old-plugin');
   */
  async removePlugin(pluginId) {
    this._validatePluginId(pluginId);

    await this._acquireLock();

    try {
      const registry = await this._readRegistry();

      const pluginIndex = registry.plugins.findIndex(p => p.id === pluginId);
      if (pluginIndex === -1) {
        throw new PluginNotFoundError(pluginId);
      }

      // Remove plugin
      registry.plugins.splice(pluginIndex, 1);

      await this._atomicWrite(registry);
      console.debug(`[PluginRegistry] Removed plugin: ${pluginId}`);
    } finally {
      await this._releaseLock();
    }
  }

  /**
   * Get single plugin metadata
   *
   * @param {string} pluginId - Plugin ID to retrieve
   *
   * @returns {Promise<Object>} Plugin metadata object
   * @throws {PluginNotFoundError} If plugin ID not found
   *
   * @example
   * const plugin = await registry.getPlugin('sdlc-complete');
   * console.log(plugin.version); // "1.0.0"
   */
  async getPlugin(pluginId) {
    this._validatePluginId(pluginId);

    const registry = await this._readRegistry();

    const plugin = registry.plugins.find(p => p.id === pluginId);
    if (!plugin) {
      throw new PluginNotFoundError(pluginId);
    }

    return plugin;
  }

  /**
   * List all installed plugins
   *
   * @returns {Promise<Object[]>} Array of plugin metadata objects
   *
   * @example
   * const plugins = await registry.listPlugins();
   * plugins.forEach(p => console.log(p.id, p.type, p.name));
   */
  async listPlugins() {
    const registry = await this._readRegistry();
    return registry.plugins;
  }

  // ===========================
  // Query Operations
  // ===========================

  /**
   * Check if plugin is installed
   *
   * @param {string} pluginId - Plugin ID to check
   *
   * @returns {Promise<boolean>} True if plugin exists in registry
   *
   * @example
   * if (await registry.isInstalled('sdlc-complete')) {
   *   console.log('SDLC framework ready');
   * }
   */
  async isInstalled(pluginId) {
    this._validatePluginId(pluginId);

    try {
      const registry = await this._readRegistry();
      return registry.plugins.some(p => p.id === pluginId);
    } catch (error) {
      // Registry doesn't exist = no plugins installed
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get plugins by type
   *
   * @param {string} type - Plugin type ('framework' | 'add-on' | 'extension')
   *
   * @returns {Promise<Object[]>} Array of plugins matching type
   *
   * @example
   * const frameworks = await registry.getByType('framework');
   * const addOns = await registry.getByType('add-on');
   */
  async getByType(type) {
    if (!['framework', 'add-on', 'extension'].includes(type)) {
      throw new Error(`Invalid plugin type: ${type}. Must be 'framework', 'add-on', or 'extension'`);
    }

    const registry = await this._readRegistry();
    return registry.plugins.filter(p => p.type === type);
  }

  /**
   * Get all healthy plugins
   *
   * @returns {Promise<Object[]>} Array of plugins with health: 'healthy'
   *
   * @example
   * const healthy = await registry.getHealthy();
   */
  async getHealthy() {
    const registry = await this._readRegistry();
    return registry.plugins.filter(p => p.health === 'healthy');
  }

  /**
   * Get plugins with errors
   *
   * @returns {Promise<Object[]>} Array of plugins with health: 'error'
   *
   * @example
   * const errors = await registry.getErrors();
   * if (errors.length > 0) {
   *   console.warn('Plugins with errors:', errors.map(p => p.id));
   * }
   */
  async getErrors() {
    const registry = await this._readRegistry();
    return registry.plugins.filter(p => p.health === 'error');
  }

  /**
   * Get add-ons for specific framework
   *
   * @param {string} frameworkId - Framework ID
   *
   * @returns {Promise<Object[]>} Array of add-ons extending this framework
   *
   * @example
   * const addOns = await registry.getAddOnsFor('sdlc-complete');
   * // [{ id: 'gdpr-compliance', type: 'add-on', parent-framework: 'sdlc-complete', ... }]
   */
  async getAddOnsFor(frameworkId) {
    this._validatePluginId(frameworkId);

    const registry = await this._readRegistry();
    return registry.plugins.filter(
      p => p.type === 'add-on' && p['parent-framework'] === frameworkId
    );
  }

  /**
   * Get extensions for specific framework
   *
   * @param {string} frameworkId - Framework ID
   *
   * @returns {Promise<Object[]>} Array of extensions extending this framework
   *
   * @example
   * const extensions = await registry.getExtensionsFor('sdlc-complete');
   */
  async getExtensionsFor(frameworkId) {
    this._validatePluginId(frameworkId);

    const registry = await this._readRegistry();
    return registry.plugins.filter(
      p => p.type === 'extension' && p.extends === frameworkId
    );
  }

  /**
   * Get projects associated with framework
   *
   * @param {string} frameworkId - Framework ID
   *
   * @returns {Promise<string[]>} Array of project IDs
   * @throws {PluginNotFoundError} If framework ID not found
   *
   * @example
   * const projects = await registry.getProjects('sdlc-complete');
   * // ['plugin-system', 'auth-service']
   */
  async getProjects(frameworkId) {
    const plugin = await this.getPlugin(frameworkId);

    if (plugin.type !== 'framework') {
      throw new Error(`Plugin '${frameworkId}' is not a framework (type: ${plugin.type})`);
    }

    return plugin.projects || [];
  }

  /**
   * Add project to framework
   *
   * @param {string} frameworkId - Framework ID
   * @param {string} projectId - Project ID to add
   *
   * @returns {Promise<void>}
   * @throws {PluginNotFoundError} If framework ID not found
   *
   * @example
   * await registry.addProject('sdlc-complete', 'new-project');
   */
  async addProject(frameworkId, projectId) {
    this._validatePluginId(frameworkId);
    this._validateProjectId(projectId);

    await this._acquireLock();

    try {
      const registry = await this._readRegistry();

      const plugin = registry.plugins.find(p => p.id === frameworkId);
      if (!plugin) {
        throw new PluginNotFoundError(frameworkId);
      }

      if (plugin.type !== 'framework') {
        throw new Error(`Plugin '${frameworkId}' is not a framework (type: ${plugin.type})`);
      }

      // Initialize projects array if missing
      if (!plugin.projects) {
        plugin.projects = [];
      }

      // Add project if not already present
      if (!plugin.projects.includes(projectId)) {
        plugin.projects.push(projectId);
        await this._atomicWrite(registry);
        console.debug(`[PluginRegistry] Added project '${projectId}' to framework '${frameworkId}'`);
      }
    } finally {
      await this._releaseLock();
    }
  }

  /**
   * Remove project from framework
   *
   * @param {string} frameworkId - Framework ID
   * @param {string} projectId - Project ID to remove
   *
   * @returns {Promise<void>}
   * @throws {PluginNotFoundError} If framework ID not found
   *
   * @example
   * await registry.removeProject('sdlc-complete', 'completed-project');
   */
  async removeProject(frameworkId, projectId) {
    this._validatePluginId(frameworkId);
    this._validateProjectId(projectId);

    await this._acquireLock();

    try {
      const registry = await this._readRegistry();

      const plugin = registry.plugins.find(p => p.id === frameworkId);
      if (!plugin) {
        throw new PluginNotFoundError(frameworkId);
      }

      if (plugin.type !== 'framework') {
        throw new Error(`Plugin '${frameworkId}' is not a framework (type: ${plugin.type})`);
      }

      if (plugin.projects) {
        const projectIndex = plugin.projects.indexOf(projectId);
        if (projectIndex !== -1) {
          plugin.projects.splice(projectIndex, 1);
          await this._atomicWrite(registry);
          console.debug(`[PluginRegistry] Removed project '${projectId}' from framework '${frameworkId}'`);
        }
      }
    } finally {
      await this._releaseLock();
    }
  }

  // ===========================
  // Backward Compatibility (Framework-specific methods)
  // ===========================

  /**
   * Add new framework to registry (backward compatibility)
   *
   * @deprecated Use addPlugin() instead
   * @param {Object} frameworkMetadata - Framework metadata object
   * @returns {Promise<void>}
   */
  async addFramework(frameworkMetadata) {
    // Auto-add type field if missing
    if (!frameworkMetadata.type) {
      frameworkMetadata.type = 'framework';
    }

    return this.addPlugin(frameworkMetadata);
  }

  /**
   * Update framework metadata (backward compatibility)
   *
   * @deprecated Use updatePlugin() instead
   * @param {string} frameworkId - Framework ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<void>}
   */
  async updateFramework(frameworkId, updates) {
    return this.updatePlugin(frameworkId, updates);
  }

  /**
   * Remove framework (backward compatibility)
   *
   * @deprecated Use removePlugin() instead
   * @param {string} frameworkId - Framework ID
   * @returns {Promise<void>}
   */
  async removeFramework(frameworkId) {
    return this.removePlugin(frameworkId);
  }

  /**
   * Get framework metadata (backward compatibility)
   *
   * @deprecated Use getPlugin() instead
   * @param {string} frameworkId - Framework ID
   * @returns {Promise<Object>}
   */
  async getFramework(frameworkId) {
    return this.getPlugin(frameworkId);
  }

  /**
   * List all frameworks (backward compatibility)
   *
   * @deprecated Use getByType('framework') instead
   * @returns {Promise<Object[]>}
   */
  async listFrameworks() {
    return this.getByType('framework');
  }

  // ===========================
  // Validation
  // ===========================

  /**
   * Validate registry against JSON schema
   *
   * @returns {Promise<boolean>} True if registry is valid
   * @throws {InvalidSchemaError} If validation fails
   *
   * @example
   * try {
   *   await registry.validateRegistry();
   *   console.log('Registry valid');
   * } catch (error) {
   *   console.error('Validation failed:', error.errors);
   * }
   */
  async validateRegistry() {
    const registry = await this._readRegistry();
    return this._validateRegistrySchema(registry);
  }

  /**
   * Validate registry schema (internal)
   *
   * @private
   * @param {Object} registry - Registry object to validate
   * @returns {boolean} True if valid
   * @throws {InvalidSchemaError} If validation fails
   */
  _validateRegistrySchema(registry) {
    const errors = [];

    // Check version
    if (!registry.version || registry.version !== this.schemaVersion) {
      errors.push(`Invalid version: expected '${this.schemaVersion}', got '${registry.version}'`);
    }

    // Check plugins array exists
    if (!Array.isArray(registry.plugins)) {
      errors.push('Missing or invalid plugins array');
    } else {
      // Validate each plugin
      registry.plugins.forEach((plugin, index) => {
        try {
          this._validatePluginMetadata(plugin);
        } catch (error) {
          errors.push(`Plugin ${index} (${plugin?.id || 'unknown'}): ${error.message}`);
        }
      });
    }

    if (errors.length > 0) {
      throw new InvalidSchemaError('Registry validation failed', errors);
    }

    return true;
  }

  /**
   * Validate plugin metadata (internal)
   *
   * @private
   * @param {Object} plugin - Plugin metadata to validate
   * @throws {InvalidSchemaError} If validation fails
   */
  _validatePluginMetadata(plugin) {
    const errors = [];

    // Required fields (all plugins)
    const requiredFields = ['id', 'type', 'name', 'version', 'install-date', 'repo-path'];
    requiredFields.forEach(field => {
      if (!plugin[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Validate plugin type
    if (plugin.type && !['framework', 'add-on', 'extension'].includes(plugin.type)) {
      errors.push(`Invalid plugin type '${plugin.type}': must be 'framework', 'add-on', or 'extension'`);
    }

    // Type-specific validation
    if (plugin.type === 'add-on' && !plugin['parent-framework']) {
      errors.push(`Add-on '${plugin.id}' missing required field: parent-framework`);
    }

    if (plugin.type === 'extension' && !plugin.extends) {
      errors.push(`Extension '${plugin.id}' missing required field: extends`);
    }

    // Validate plugin ID format (kebab-case)
    if (plugin.id && !/^[a-z0-9-]+$/.test(plugin.id)) {
      errors.push(`Invalid plugin ID '${plugin.id}': must be kebab-case (lowercase letters, numbers, hyphens only)`);
    }

    // Validate version format (semver)
    if (plugin.version && !/^\d+\.\d+\.\d+$/.test(plugin.version)) {
      errors.push(`Invalid version '${plugin.version}': must be semantic version (e.g., '1.0.0')`);
    }

    // Validate install-date format (ISO 8601)
    if (plugin['install-date']) {
      try {
        new Date(plugin['install-date']);
      } catch {
        errors.push(`Invalid install-date '${plugin['install-date']}': must be ISO 8601 format`);
      }
    }

    // Validate health status
    if (plugin.health && !['healthy', 'warning', 'error', 'unknown'].includes(plugin.health)) {
      errors.push(`Invalid health status '${plugin.health}': must be 'healthy', 'warning', 'error', or 'unknown'`);
    }

    if (errors.length > 0) {
      throw new InvalidSchemaError(`Plugin metadata validation failed for '${plugin.id || 'unknown'}'`, errors);
    }
  }

  /**
   * Validate plugin ID format (internal)
   *
   * @private
   * @param {string} pluginId - Plugin ID to validate
   * @throws {Error} If ID is invalid
   */
  _validatePluginId(pluginId) {
    if (!pluginId || typeof pluginId !== 'string') {
      throw new Error('Plugin ID must be a non-empty string');
    }

    if (!/^[a-z0-9-]+$/.test(pluginId)) {
      throw new Error(`Invalid plugin ID '${pluginId}': must be kebab-case (lowercase letters, numbers, hyphens only)`);
    }
  }

  /**
   * Validate project ID format (internal)
   *
   * @private
   * @param {string} projectId - Project ID to validate
   * @throws {Error} If ID is invalid
   */
  _validateProjectId(projectId) {
    if (!projectId || typeof projectId !== 'string') {
      throw new Error('Project ID must be a non-empty string');
    }

    if (!/^[a-z0-9-]+$/.test(projectId)) {
      throw new Error(`Invalid project ID '${projectId}': must be kebab-case (lowercase letters, numbers, hyphens only)`);
    }
  }

  // ===========================
  // Migration Logic
  // ===========================

  /**
   * Migrate old registry format to new schema (internal)
   *
   * Converts `frameworks` array to `plugins` array with type: 'framework'
   * Adds default health: 'unknown' for migrated plugins
   *
   * @private
   * @param {Object} registry - Registry object to migrate
   * @returns {Object} Migrated registry
   */
  _migrateRegistry(registry) {
    // Check if migration needed
    if (registry.plugins) {
      // Already using new schema
      return registry;
    }

    if (!registry.frameworks || !Array.isArray(registry.frameworks)) {
      // Invalid registry, return empty
      return {
        version: this.schemaVersion,
        plugins: []
      };
    }

    console.debug(`[PluginRegistry] Migrating registry from 'frameworks' to 'plugins' schema`);

    // Migrate frameworks to plugins
    const plugins = registry.frameworks.map(framework => ({
      ...framework,
      type: 'framework',
      health: framework.health || 'unknown',
      'health-checked': framework['health-checked'] || null
    }));

    return {
      version: this.schemaVersion,
      plugins
    };
  }

  // ===========================
  // Atomic Operations
  // ===========================

  /**
   * Acquire file lock with retry
   *
   * @private
   * @returns {Promise<void>}
   * @throws {RegistryLockError} If lock acquisition fails after retries
   */
  async _acquireLock() {
    let retries = 0;

    while (retries < this.maxLockRetries) {
      try {
        // Try to create lock file (exclusive)
        await fs.writeFile(this.lockPath, process.pid.toString(), { flag: 'wx' });
        console.debug(`[PluginRegistry] Lock acquired: ${this.lockPath}`);
        return;
      } catch (error) {
        if (error.code === 'EEXIST') {
          // Lock file exists, check if stale
          try {
            const lockContent = await fs.readFile(this.lockPath, 'utf-8');
            const lockPid = parseInt(lockContent, 10);

            // Check if process still running (simplified check)
            if (lockPid !== process.pid) {
              console.debug(`[PluginRegistry] Lock held by PID ${lockPid}, retrying...`);
            }
          } catch {
            // Ignore lock file read errors
          }

          // Wait before retry
          retries++;
          if (retries < this.maxLockRetries) {
            await new Promise(resolve => setTimeout(resolve, this.lockRetryDelay * retries));
          }
        } else {
          throw error;
        }
      }
    }

    throw new RegistryLockError(`Failed to acquire lock after ${this.maxLockRetries} retries`);
  }

  /**
   * Release file lock
   *
   * @private
   * @returns {Promise<void>}
   */
  async _releaseLock() {
    try {
      await fs.unlink(this.lockPath);
      console.debug(`[PluginRegistry] Lock released: ${this.lockPath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`[PluginRegistry] Failed to release lock: ${error.message}`);
      }
    }
  }

  /**
   * Atomic write with lock and validation
   *
   * Writes registry to temporary file, validates, then renames atomically.
   *
   * @private
   * @param {Object} registry - Registry data to write
   * @returns {Promise<void>}
   */
  async _atomicWrite(registry) {
    // Validate before writing
    this._validateRegistrySchema(registry);

    const tempPath = `${this.registryPath}.tmp`;
    const registryJson = JSON.stringify(registry, null, 2);

    try {
      // Write to temp file
      await fs.writeFile(tempPath, registryJson, 'utf-8');

      // Atomic rename (overwrites existing)
      await fs.rename(tempPath, this.registryPath);

      console.debug(`[PluginRegistry] Atomic write complete: ${this.registryPath}`);
    } catch (error) {
      // Cleanup temp file on failure
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

      throw new Error(`Failed to write registry: ${error.message}`);
    }
  }

  /**
   * Read registry from disk
   *
   * @private
   * @returns {Promise<Object>} Registry object
   * @throws {Error} If registry file doesn't exist or is invalid JSON
   */
  async _readRegistry() {
    try {
      const registryJson = await fs.readFile(this.registryPath, 'utf-8');
      let registry = JSON.parse(registryJson);

      // Auto-migrate if needed
      registry = this._migrateRegistry(registry);

      // If migration occurred, write back to disk
      if (!registryJson.includes('"plugins"')) {
        console.debug(`[PluginRegistry] Writing migrated registry to disk`);
        await this._atomicWrite(registry);
      }

      // Validate schema on read
      this._validateRegistrySchema(registry);

      return registry;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Registry doesn't exist, auto-initialize
        console.debug(`[PluginRegistry] Registry not found, initializing...`);
        await this.initialize();
        return { version: this.schemaVersion, plugins: [] };
      }

      if (error instanceof SyntaxError) {
        throw new InvalidSchemaError(`Registry JSON is malformed: ${error.message}`);
      }

      throw error;
    }
  }
}

// Backward compatibility alias
export const FrameworkRegistry = PluginRegistry;

// Export error classes for external use
export {
  PluginNotFoundError,
  FrameworkNotFoundError,
  InvalidSchemaError,
  RegistryLockError,
  DuplicatePluginError,
  DuplicateFrameworkError
};
