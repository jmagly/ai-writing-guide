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

  // ===========================
  // Health Monitoring
  // ===========================

  /**
   * Run health check on all installed plugins
   *
   * Verifies each plugin's:
   * - Directory exists at repo-path
   * - Required files present (manifest.json or plugin.yaml)
   * - Parent framework exists (for add-ons)
   * - Extended framework exists (for extensions)
   *
   * @returns {Promise<Object>} Health check results
   * @property {number} total - Total plugins checked
   * @property {number} healthy - Plugins passing all checks
   * @property {number} warning - Plugins with minor issues
   * @property {number} error - Plugins with critical issues
   * @property {Object[]} results - Per-plugin health status
   *
   * @example
   * const health = await registry.healthCheck();
   * console.log(`${health.healthy}/${health.total} plugins healthy`);
   * health.results.filter(r => r.status === 'error').forEach(r => {
   *   console.error(`${r.pluginId}: ${r.issues.join(', ')}`);
   * });
   */
  async healthCheck() {
    const registry = await this._readRegistry();
    const results = [];
    let healthy = 0;
    let warning = 0;
    let error = 0;

    for (const plugin of registry.plugins) {
      const issues = [];
      let status = 'healthy';

      // Check 1: Directory exists
      const repoPath = path.resolve(path.dirname(this.registryPath), '..', plugin['repo-path']);
      try {
        const stat = await fs.stat(repoPath);
        if (!stat.isDirectory()) {
          issues.push(`repo-path '${plugin['repo-path']}' is not a directory`);
          status = 'error';
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          issues.push(`repo-path '${plugin['repo-path']}' does not exist`);
          status = 'error';
        } else {
          issues.push(`Cannot access repo-path: ${err.message}`);
          status = 'warning';
        }
      }

      // Check 2: Required files exist (if directory exists and no error yet)
      if (status !== 'error') {
        const manifestPath = path.join(repoPath, 'manifest.json');
        const pluginYamlPath = path.join(repoPath, 'plugin.yaml');
        const pluginJsonPath = path.join(repoPath, 'plugin.json');

        let hasManifest = false;
        for (const manifestFile of [manifestPath, pluginYamlPath, pluginJsonPath]) {
          try {
            await fs.access(manifestFile);
            hasManifest = true;
            break;
          } catch {
            // File doesn't exist, try next
          }
        }

        if (!hasManifest) {
          issues.push('Missing manifest file (manifest.json, plugin.yaml, or plugin.json)');
          if (status === 'healthy') status = 'warning';
        }
      }

      // Check 3: Parent framework exists (for add-ons)
      if (plugin.type === 'add-on' && plugin['parent-framework']) {
        const parentExists = registry.plugins.some(p => p.id === plugin['parent-framework']);
        if (!parentExists) {
          issues.push(`Parent framework '${plugin['parent-framework']}' not installed`);
          status = 'error';
        }
      }

      // Check 4: Extended framework exists (for extensions)
      if (plugin.type === 'extension' && plugin.extends) {
        const extendedExists = registry.plugins.some(p => p.id === plugin.extends);
        if (!extendedExists) {
          issues.push(`Extended framework '${plugin.extends}' not installed`);
          status = 'error';
        }
      }

      // Update plugin health status in registry
      const healthChanged = plugin.health !== status;
      plugin.health = status;
      plugin['health-checked'] = new Date().toISOString();

      // Count by status
      if (status === 'healthy') healthy++;
      else if (status === 'warning') warning++;
      else error++;

      results.push({
        pluginId: plugin.id,
        type: plugin.type,
        status,
        issues,
        checkedAt: plugin['health-checked']
      });
    }

    // Save updated health statuses
    await this._acquireLock();
    try {
      await this._atomicWrite(registry);
    } finally {
      await this._releaseLock();
    }

    return {
      total: registry.plugins.length,
      healthy,
      warning,
      error,
      results
    };
  }

  /**
   * Get plugins that need attention (warning or error status)
   *
   * @returns {Promise<Object[]>} Array of plugins with issues
   *
   * @example
   * const issues = await registry.getPluginsWithIssues();
   * if (issues.length > 0) {
   *   console.warn('Plugins need attention:', issues.map(p => p.id));
   * }
   */
  async getPluginsWithIssues() {
    const registry = await this._readRegistry();
    return registry.plugins.filter(p => p.health === 'warning' || p.health === 'error');
  }

  /**
   * Update health status for specific plugin
   *
   * @param {string} pluginId - Plugin ID
   * @param {string} status - New health status ('healthy' | 'warning' | 'error' | 'unknown')
   * @param {string[]} [issues=[]] - List of issues (for warning/error status)
   *
   * @returns {Promise<void>}
   *
   * @example
   * await registry.setHealthStatus('my-plugin', 'error', ['Config file missing']);
   */
  async setHealthStatus(pluginId, status, issues = []) {
    if (!['healthy', 'warning', 'error', 'unknown'].includes(status)) {
      throw new Error(`Invalid health status: ${status}`);
    }

    await this.updatePlugin(pluginId, {
      health: status,
      'health-checked': new Date().toISOString(),
      'health-issues': issues.length > 0 ? issues : undefined
    });
  }

  // ===========================
  // Backup and Restore
  // ===========================

  /**
   * Create backup of current registry
   *
   * Saves registry to timestamped backup file in .aiwg/frameworks/backups/
   *
   * @param {string} [reason] - Optional reason for backup (stored in backup metadata)
   *
   * @returns {Promise<string>} Path to backup file
   *
   * @example
   * const backupPath = await registry.createBackup('Before plugin uninstall');
   * console.log(`Backup saved to: ${backupPath}`);
   */
  async createBackup(reason = 'manual') {
    const registry = await this._readRegistry();

    const backupDir = path.join(path.dirname(this.registryPath), 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `registry-${timestamp}.json`);

    const backup = {
      ...registry,
      _backup: {
        createdAt: new Date().toISOString(),
        reason,
        originalPath: this.registryPath,
        schemaVersion: this.schemaVersion
      }
    };

    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
    console.debug(`[PluginRegistry] Backup created: ${backupPath}`);

    return backupPath;
  }

  /**
   * List available registry backups
   *
   * @returns {Promise<Object[]>} Array of backup info objects
   * @property {string} path - Full path to backup file
   * @property {string} filename - Backup filename
   * @property {Date} createdAt - When backup was created
   * @property {number} size - File size in bytes
   *
   * @example
   * const backups = await registry.listBackups();
   * backups.forEach(b => console.log(`${b.filename} (${b.size} bytes)`));
   */
  async listBackups() {
    const backupDir = path.join(path.dirname(this.registryPath), 'backups');

    try {
      const files = await fs.readdir(backupDir);
      const backups = [];

      for (const file of files) {
        if (file.startsWith('registry-') && file.endsWith('.json')) {
          const filePath = path.join(backupDir, file);
          const stat = await fs.stat(filePath);

          // Extract timestamp from filename
          const timestampMatch = file.match(/registry-(.+)\.json/);
          let createdAt = stat.mtime;
          if (timestampMatch) {
            const timestampStr = timestampMatch[1].replace(/-/g, (match, offset) => {
              // Convert back to ISO format: 2025-12-02T14-30-00-000Z -> 2025-12-02T14:30:00.000Z
              if (offset === 4 || offset === 7) return '-';
              if (offset === 10) return 'T';
              if (offset === 13 || offset === 16) return ':';
              if (offset === 19) return '.';
              return match;
            });
            createdAt = new Date(stat.mtime);
          }

          backups.push({
            path: filePath,
            filename: file,
            createdAt,
            size: stat.size
          });
        }
      }

      // Sort by date, newest first
      return backups.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // No backups directory
      }
      throw error;
    }
  }

  /**
   * Restore registry from backup
   *
   * @param {string} backupPath - Path to backup file to restore
   * @param {boolean} [createBackupFirst=true] - Create backup of current state before restoring
   *
   * @returns {Promise<void>}
   * @throws {Error} If backup file doesn't exist or is invalid
   *
   * @example
   * const backups = await registry.listBackups();
   * if (backups.length > 0) {
   *   await registry.restoreFromBackup(backups[0].path);
   *   console.log('Registry restored');
   * }
   */
  async restoreFromBackup(backupPath, createBackupFirst = true) {
    // Verify backup exists
    try {
      await fs.access(backupPath);
    } catch {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Read and validate backup
    const backupJson = await fs.readFile(backupPath, 'utf-8');
    let backup;
    try {
      backup = JSON.parse(backupJson);
    } catch (error) {
      throw new InvalidSchemaError(`Backup file is not valid JSON: ${error.message}`);
    }

    // Remove backup metadata before restoration
    const { _backup, ...registry } = backup;

    // Validate backup schema (without _backup field)
    this._validateRegistrySchema(registry);

    // Create backup of current state before restoring
    if (createBackupFirst) {
      await this.createBackup('pre-restore');
    }

    // Restore registry
    await this._acquireLock();
    try {
      await this._atomicWrite(registry);
      console.debug(`[PluginRegistry] Registry restored from: ${backupPath}`);
    } finally {
      await this._releaseLock();
    }
  }

  /**
   * Clean up old backups, keeping only recent ones
   *
   * @param {number} [keepCount=5] - Number of recent backups to keep
   *
   * @returns {Promise<number>} Number of backups deleted
   *
   * @example
   * const deleted = await registry.cleanBackups(3);
   * console.log(`Deleted ${deleted} old backups`);
   */
  async cleanBackups(keepCount = 5) {
    const backups = await this.listBackups();

    if (backups.length <= keepCount) {
      return 0;
    }

    // Delete oldest backups beyond keepCount
    const toDelete = backups.slice(keepCount);
    let deleted = 0;

    for (const backup of toDelete) {
      try {
        await fs.unlink(backup.path);
        deleted++;
        console.debug(`[PluginRegistry] Deleted old backup: ${backup.filename}`);
      } catch (error) {
        console.error(`[PluginRegistry] Failed to delete backup ${backup.filename}: ${error.message}`);
      }
    }

    return deleted;
  }

  // ===========================
  // Error Recovery
  // ===========================

  /**
   * Attempt to recover corrupted registry
   *
   * Tries multiple recovery strategies:
   * 1. Re-read and validate current registry
   * 2. Restore from most recent backup
   * 3. Scan filesystem and rebuild registry
   *
   * @returns {Promise<Object>} Recovery result
   * @property {boolean} success - Whether recovery succeeded
   * @property {string} method - Recovery method used ('validate' | 'backup' | 'rebuild' | 'none')
   * @property {string} [message] - Additional information
   *
   * @example
   * const result = await registry.recover();
   * if (result.success) {
   *   console.log(`Recovery successful via ${result.method}`);
   * } else {
   *   console.error('Recovery failed:', result.message);
   * }
   */
  async recover() {
    // Strategy 1: Try to read and validate current registry
    try {
      await this._readRegistry();
      return { success: true, method: 'validate', message: 'Registry is valid' };
    } catch (validationError) {
      console.debug(`[PluginRegistry] Registry validation failed: ${validationError.message}`);
    }

    // Strategy 2: Try to restore from most recent backup
    const backups = await this.listBackups();
    for (const backup of backups) {
      try {
        await this.restoreFromBackup(backup.path, false);
        return {
          success: true,
          method: 'backup',
          message: `Restored from backup: ${backup.filename}`
        };
      } catch (restoreError) {
        console.debug(`[PluginRegistry] Backup restore failed for ${backup.filename}: ${restoreError.message}`);
        continue; // Try next backup
      }
    }

    // Strategy 3: Rebuild from filesystem
    try {
      const rebuilt = await this._rebuildFromFilesystem();
      return {
        success: true,
        method: 'rebuild',
        message: `Rebuilt registry with ${rebuilt.plugins.length} plugins from filesystem scan`
      };
    } catch (rebuildError) {
      console.error(`[PluginRegistry] Filesystem rebuild failed: ${rebuildError.message}`);
    }

    return {
      success: false,
      method: 'none',
      message: 'All recovery strategies failed. Manual intervention required.'
    };
  }

  /**
   * Rebuild registry by scanning filesystem for installed plugins
   *
   * Scans .aiwg/frameworks/ for directories containing plugin manifests
   *
   * @private
   * @returns {Promise<Object>} Rebuilt registry object
   */
  async _rebuildFromFilesystem() {
    const frameworksDir = path.dirname(this.registryPath);
    const plugins = [];

    try {
      const entries = await fs.readdir(frameworksDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'backups') {
          continue;
        }

        const pluginDir = path.join(frameworksDir, entry.name);

        // Look for manifest files
        const manifestFiles = ['manifest.json', 'plugin.yaml', 'plugin.json'];
        let manifest = null;

        for (const manifestFile of manifestFiles) {
          const manifestPath = path.join(pluginDir, manifestFile);
          try {
            const content = await fs.readFile(manifestPath, 'utf-8');
            manifest = manifestFile.endsWith('.json') ? JSON.parse(content) : content;
            break;
          } catch {
            continue;
          }
        }

        // Create plugin entry from directory name if no manifest
        const pluginId = entry.name;
        plugins.push({
          id: pluginId,
          type: 'framework', // Default to framework
          name: manifest?.name || pluginId,
          version: manifest?.version || '0.0.0',
          'install-date': new Date().toISOString(),
          'repo-path': `${entry.name}/`,
          projects: [],
          health: 'unknown',
          'health-checked': new Date().toISOString(),
          _recovered: true
        });
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // No frameworks directory, create empty registry
      } else {
        throw error;
      }
    }

    const registry = {
      version: this.schemaVersion,
      plugins,
      _rebuilt: {
        at: new Date().toISOString(),
        reason: 'recovery'
      }
    };

    // Write rebuilt registry
    await this._acquireLock();
    try {
      // Create directory if needed
      await fs.mkdir(path.dirname(this.registryPath), { recursive: true });
      await this._atomicWrite(registry);
    } finally {
      await this._releaseLock();
    }

    console.debug(`[PluginRegistry] Registry rebuilt with ${plugins.length} plugins`);
    return registry;
  }

  /**
   * Verify registry integrity and report issues
   *
   * @returns {Promise<Object>} Integrity check results
   * @property {boolean} valid - Whether registry is valid
   * @property {string[]} errors - List of errors found
   * @property {string[]} warnings - List of warnings
   *
   * @example
   * const integrity = await registry.checkIntegrity();
   * if (!integrity.valid) {
   *   console.error('Registry issues:', integrity.errors);
   * }
   */
  async checkIntegrity() {
    const errors = [];
    const warnings = [];

    try {
      const registry = await this._readRegistry();

      // Check for duplicate IDs
      const ids = registry.plugins.map(p => p.id);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicates.length > 0) {
        errors.push(`Duplicate plugin IDs: ${[...new Set(duplicates)].join(', ')}`);
      }

      // Check for orphaned add-ons/extensions
      for (const plugin of registry.plugins) {
        if (plugin.type === 'add-on' && plugin['parent-framework']) {
          const parentExists = registry.plugins.some(p => p.id === plugin['parent-framework']);
          if (!parentExists) {
            errors.push(`Add-on '${plugin.id}' references non-existent parent framework '${plugin['parent-framework']}'`);
          }
        }

        if (plugin.type === 'extension' && plugin.extends) {
          const extendedExists = registry.plugins.some(p => p.id === plugin.extends);
          if (!extendedExists) {
            errors.push(`Extension '${plugin.id}' references non-existent framework '${plugin.extends}'`);
          }
        }

        // Check for missing required fields
        if (!plugin.id) errors.push('Found plugin with missing ID');
        if (!plugin.type) warnings.push(`Plugin '${plugin.id}' missing type field`);
        if (!plugin.version) warnings.push(`Plugin '${plugin.id}' missing version field`);

        // Check for stale health checks (> 7 days)
        if (plugin['health-checked']) {
          const lastCheck = new Date(plugin['health-checked']);
          const daysSinceCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceCheck > 7) {
            warnings.push(`Plugin '${plugin.id}' health check is ${Math.floor(daysSinceCheck)} days old`);
          }
        }
      }

    } catch (error) {
      errors.push(`Failed to read registry: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
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
