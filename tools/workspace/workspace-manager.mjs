/**
 * WorkspaceManager - Framework-Scoped Workspace Management
 *
 * Core integration component that orchestrates framework-scoped workspace management.
 * Handles framework detection, legacy workspace detection (backward compatibility),
 * 4-tier workspace initialization, path routing, and project context management.
 *
 * @module tools/workspace/workspace-manager
 * @implements FID-007 (Framework-Scoped Workspace Management)
 * @requires UC-012 (Framework-Aware Workspace Management)
 * @see .aiwg/working/FID-007-implementation-plan.md (Section 4.1 - Week 2, Task 5)
 * @see .aiwg/requirements/use-cases/UC-012-framework-aware-workspace-management.md
 * @see .aiwg/architecture/decisions/ADR-007-framework-scoped-workspace-architecture.md
 * @see .aiwg/working/FID-007-reviews/devops-review.md (backward compatibility requirement)
 *
 * ARCHITECTURE: 4-Tier Workspace Model (UC-012 Section 11.4)
 * - Tier 1 (repo/): Framework templates, agents, commands (stable)
 * - Tier 2 (projects/): Project-specific artifacts (active development)
 * - Tier 3 (working/): Temporary collaboration (ephemeral)
 * - Tier 4 (archive/): Completed work (historical)
 *
 * BACKWARD COMPATIBILITY: DevOps review requirement (lines 288-346)
 * - Detects existing root .aiwg/ structure (pre-FID-007)
 * - Graceful fallback to legacy mode if migration not performed
 * - User warned to run migration: aiwg -migrate-workspace
 *
 * PERFORMANCE: NFR-PERF-05 (<5s initialization)
 */

import fs from 'fs/promises';
import path from 'path';
import { FrameworkRegistry, FrameworkNotFoundError } from './registry-manager.mjs';
import { MetadataLoader } from './metadata-loader.mjs';
import { PathResolver } from './path-resolver.mjs';

// ==================== Error Classes ====================

/**
 * Base error class for workspace operations
 */
class WorkspaceError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'WorkspaceError';
    this.details = details;
  }
}

/**
 * Thrown when workspace initialization fails
 */
class WorkspaceInitializationError extends WorkspaceError {
  constructor(message, originalError = null) {
    super(
      `Workspace initialization failed: ${message}` +
      (originalError ? `\n  Original error: ${originalError.message}` : ''),
      { originalError }
    );
    this.name = 'WorkspaceInitializationError';
  }
}

/**
 * Thrown when framework not found in registry
 */
class FrameworkNotInstalledError extends WorkspaceError {
  constructor(frameworkId, availableFrameworks = []) {
    super(
      `Framework '${frameworkId}' not installed.\n` +
      `  Install via: aiwg -deploy-framework ${frameworkId}\n` +
      `  Available frameworks: ${availableFrameworks.join(', ') || 'none'}`,
      { frameworkId, availableFrameworks }
    );
    this.name = 'FrameworkNotInstalledError';
  }
}

/**
 * Thrown when legacy migration is required but not performed
 */
class LegacyMigrationRequiredError extends WorkspaceError {
  constructor(legacyDirectories = []) {
    super(
      `Legacy workspace structure detected. Migration required.\n` +
      `  Legacy directories found: ${legacyDirectories.join(', ')}\n` +
      `  Run migration: aiwg -migrate-workspace\n` +
      `  OR use legacy mode (automatic fallback)`,
      { legacyDirectories }
    );
    this.name = 'LegacyMigrationRequiredError';
  }
}

// ==================== WorkspaceManager ====================

/**
 * WorkspaceManager - Framework-scoped workspace orchestration
 *
 * @class WorkspaceManager
 * @example
 * const workspace = new WorkspaceManager();
 *
 * // Framework Detection
 * const framework = await workspace.detectFramework('.claude/commands/flow-inception-to-elaboration.md');
 * // => { frameworkId: 'sdlc-complete', outputPath: 'frameworks/sdlc-complete/projects/{project-id}/' }
 *
 * // Legacy Detection (backward compatibility)
 * const hasLegacy = await workspace.hasLegacyWorkspace();
 * // => true (if root .aiwg/requirements/ exists)
 *
 * // Workspace Initialization
 * await workspace.initialize(); // Creates .aiwg/frameworks/ structure
 * await workspace.initializeFramework('sdlc-complete'); // Creates 4-tier structure
 *
 * // Path Routing
 * const outputPath = await workspace.routePath('frameworks/{framework-id}/projects/{project-id}/', {
 *   frameworkId: 'sdlc-complete',
 *   projectId: 'plugin-system'
 * });
 * // => 'frameworks/sdlc-complete/projects/plugin-system'
 */
export class WorkspaceManager {
  /**
   * Create WorkspaceManager instance
   *
   * @param {string} [basePath='.aiwg'] - Base workspace path
   */
  constructor(basePath = '.aiwg') {
    /** @type {string} */
    this.basePath = path.resolve(basePath);

    /** @type {FrameworkRegistry} */
    this.registry = new FrameworkRegistry(path.join(this.basePath, 'frameworks', 'registry.json'));

    /** @type {MetadataLoader} */
    this.metadataLoader = new MetadataLoader(true, 'sdlc-complete');

    /** @type {PathResolver} */
    this.pathResolver = new PathResolver(this.basePath);

    /** @type {string|null} */
    this.activeProjectContext = null;

    /** @type {boolean|null} */
    this._legacyModeCache = null;

    /** @type {string[]} */
    this.legacyDirectories = [
      'intake', 'requirements', 'architecture', 'planning', 'risks',
      'testing', 'security', 'quality', 'deployment', 'handoffs',
      'gates', 'decisions', 'team', 'working', 'reports'
    ];
  }

  // ==================== Framework Detection ====================

  /**
   * Detect framework from command file metadata
   *
   * @param {string} commandPath - Path to command file (.claude/commands/*.md)
   * @returns {Promise<{frameworkId: string, outputPath: string, contextPaths: string[]}>}
   * @throws {FrameworkNotInstalledError} If framework not in registry
   *
   * @example
   * const context = await workspace.detectFramework('.claude/commands/flow-inception-to-elaboration.md');
   * // => { frameworkId: 'sdlc-complete', outputPath: '...', contextPaths: [...] }
   */
  async detectFramework(commandPath) {
    // Load metadata from command file
    const metadata = await this.metadataLoader.loadFromFile(commandPath);

    // Extract framework ID (defaults to sdlc-complete if missing)
    const frameworkId = metadata.framework || 'sdlc-complete';

    // Check if framework installed
    if (!(await this.registry.isInstalled(frameworkId))) {
      const availableFrameworks = (await this.registry.listFrameworks()).map(f => f.id);
      throw new FrameworkNotInstalledError(frameworkId, availableFrameworks);
    }

    return {
      frameworkId,
      outputPath: metadata.outputPath || `frameworks/${frameworkId}/projects/{project-id}/`,
      contextPaths: metadata.contextPaths || [
        `frameworks/${frameworkId}/repo/`,
        `frameworks/${frameworkId}/projects/{project-id}/`,
        'shared/'
      ]
    };
  }

  /**
   * Detect framework from multiple command files (batch operation)
   *
   * @param {string[]} commandPaths - Array of command file paths
   * @returns {Promise<Map<string, object>>} Map of commandPath → framework context
   *
   * @example
   * const contexts = await workspace.detectFrameworkBatch([
   *   '.claude/commands/flow-inception-to-elaboration.md',
   *   '.claude/commands/flow-security-review-cycle.md'
   * ]);
   */
  async detectFrameworkBatch(commandPaths) {
    const promises = commandPaths.map(async (cmdPath) => {
      try {
        const context = await this.detectFramework(cmdPath);
        return [cmdPath, context];
      } catch (error) {
        console.warn(`⚠️  Failed to detect framework for ${cmdPath}: ${error.message}`);
        return [cmdPath, null];
      }
    });

    const results = await Promise.all(promises);
    return new Map(results.filter(([, context]) => context !== null));
  }

  // ==================== Legacy Detection (Backward Compatibility) ====================

  /**
   * Check if legacy workspace structure exists (pre-FID-007)
   *
   * BACKWARD COMPATIBILITY: DevOps review requirement (lines 288-346)
   * Detects existing root .aiwg/ structure before migration to framework-scoped.
   *
   * @returns {Promise<boolean>} True if legacy structure detected
   *
   * @example
   * const hasLegacy = await workspace.hasLegacyWorkspace();
   * if (hasLegacy) {
   *   console.warn('Legacy workspace detected. Run migration: aiwg -migrate-workspace');
   * }
   */
  async hasLegacyWorkspace() {
    // Check if base .aiwg/ directory exists
    try {
      await fs.access(this.basePath);
    } catch {
      return false; // .aiwg/ doesn't exist = no legacy structure
    }

    // Check if ANY legacy directory exists at root level
    const checks = await Promise.all(
      this.legacyDirectories.map(async (dir) => {
        const dirPath = path.join(this.basePath, dir);
        try {
          await fs.access(dirPath);
          return true; // Directory exists
        } catch {
          return false; // Directory doesn't exist
        }
      })
    );

    return checks.some(exists => exists); // True if ANY legacy dir found
  }

  /**
   * Get legacy mode status (true = fallback to root .aiwg/, false = use framework-scoped)
   *
   * BACKWARD COMPATIBILITY: Graceful fallback to legacy structure if migration not performed
   *
   * @returns {Promise<boolean>} True if in legacy mode
   *
   * @example
   * const legacyMode = await workspace.getLegacyMode();
   * if (legacyMode) {
   *   console.warn('Running in legacy mode. Output paths: .aiwg/requirements/, .aiwg/architecture/, etc.');
   * }
   */
  async getLegacyMode() {
    // Check cache first (avoid repeated filesystem checks)
    if (this._legacyModeCache !== null) {
      return this._legacyModeCache;
    }

    const hasLegacy = await this.hasLegacyWorkspace();

    if (hasLegacy) {
      console.warn('⚠️  Legacy workspace detected. Fallback mode enabled.');
      console.warn('   Output paths: .aiwg/requirements/, .aiwg/architecture/, etc.');
      console.warn('   Run migration: aiwg -migrate-workspace');
      console.warn('   OR continue using legacy mode (automatic fallback)');
    }

    this._legacyModeCache = hasLegacy;
    return hasLegacy;
  }

  /**
   * Set legacy mode manually (for testing or forced fallback)
   *
   * @param {boolean} enabled - True to enable legacy mode, false to disable
   *
   * @example
   * workspace.setLegacyMode(true); // Force legacy mode (use root .aiwg/)
   * workspace.setLegacyMode(false); // Force framework-scoped mode
   */
  setLegacyMode(enabled) {
    this._legacyModeCache = enabled;

    if (enabled) {
      console.debug('[WorkspaceManager] Legacy mode enabled');
    } else {
      console.debug('[WorkspaceManager] Framework-scoped mode enabled');
    }
  }

  // ==================== Workspace Initialization ====================

  /**
   * Initialize base workspace structure (.aiwg/frameworks/)
   *
   * Creates:
   * - .aiwg/frameworks/ directory
   * - .aiwg/frameworks/registry.json (empty registry)
   * - .aiwg/shared/ directory (cross-framework resources)
   *
   * Idempotent - safe to call multiple times (auto-initialization on first use).
   *
   * @returns {Promise<void>}
   * @throws {WorkspaceInitializationError} If directory creation fails
   *
   * @example
   * await workspace.initialize();
   * // Created: .aiwg/frameworks/, .aiwg/frameworks/registry.json, .aiwg/shared/
   */
  async initialize() {
    try {
      // Create base .aiwg/ directory
      await fs.mkdir(this.basePath, { recursive: true });

      // Create frameworks/ directory
      const frameworksDir = path.join(this.basePath, 'frameworks');
      await fs.mkdir(frameworksDir, { recursive: true });

      // Initialize registry
      await this.registry.initialize();

      // Create shared/ directory (cross-framework resources)
      const sharedDir = path.join(this.basePath, 'shared');
      await fs.mkdir(sharedDir, { recursive: true });

      console.debug('[WorkspaceManager] Base workspace initialized');
    } catch (error) {
      throw new WorkspaceInitializationError('Failed to create base structure', error);
    }
  }

  /**
   * Initialize framework workspace (4-tier structure)
   *
   * Creates:
   * - Tier 1: frameworks/{framework-id}/repo/ (framework templates, agents, commands)
   * - Tier 2: frameworks/{framework-id}/projects/ (project-specific artifacts)
   * - Tier 3: frameworks/{framework-id}/working/ (temporary collaboration)
   * - Tier 4: frameworks/{framework-id}/archive/ (completed work)
   *
   * @param {string} frameworkId - Framework ID (kebab-case, e.g., 'sdlc-complete')
   * @returns {Promise<void>}
   * @throws {WorkspaceInitializationError} If directory creation fails
   *
   * @example
   * await workspace.initializeFramework('sdlc-complete');
   * // Created: frameworks/sdlc-complete/repo/, frameworks/sdlc-complete/projects/, ...
   */
  async initializeFramework(frameworkId) {
    try {
      // Validate framework ID format
      if (!/^[a-z0-9-]+$/.test(frameworkId)) {
        throw new Error(`Invalid framework ID '${frameworkId}': must be kebab-case (lowercase letters, numbers, hyphens only)`);
      }

      const frameworkBase = path.join(this.basePath, 'frameworks', frameworkId);

      // Create 4-tier structure
      const tiers = ['repo', 'projects', 'working', 'archive'];
      await Promise.all(
        tiers.map(tier => fs.mkdir(path.join(frameworkBase, tier), { recursive: true }))
      );

      console.debug(`[WorkspaceManager] Framework workspace initialized: ${frameworkId}`);
    } catch (error) {
      throw new WorkspaceInitializationError(`Failed to initialize framework '${frameworkId}'`, error);
    }
  }

  /**
   * Initialize project workspace (Tier 2: projects/{project-id}/)
   *
   * Creates project-specific subdirectories for artifacts:
   * - requirements/, architecture/, planning/, testing/, security/, deployment/, etc.
   *
   * @param {string} frameworkId - Framework ID
   * @param {string} projectId - Project ID (kebab-case)
   * @returns {Promise<void>}
   * @throws {WorkspaceInitializationError} If directory creation fails
   *
   * @example
   * await workspace.initializeProject('sdlc-complete', 'plugin-system');
   * // Created: frameworks/sdlc-complete/projects/plugin-system/requirements/, .../architecture/, etc.
   */
  async initializeProject(frameworkId, projectId) {
    try {
      // Validate project ID format
      if (!/^[a-z0-9-]+$/.test(projectId)) {
        throw new Error(`Invalid project ID '${projectId}': must be kebab-case (lowercase letters, numbers, hyphens only)`);
      }

      const projectBase = path.join(this.basePath, 'frameworks', frameworkId, 'projects', projectId);

      // Create project subdirectories (SDLC artifact types)
      const subdirs = [
        'intake', 'requirements', 'architecture', 'planning', 'risks',
        'testing', 'security', 'quality', 'deployment', 'handoffs',
        'gates', 'decisions', 'team', 'working', 'reports'
      ];

      await Promise.all(
        subdirs.map(dir => fs.mkdir(path.join(projectBase, dir), { recursive: true }))
      );

      // Register project in framework
      await this.registry.addProject(frameworkId, projectId);

      console.debug(`[WorkspaceManager] Project workspace initialized: ${frameworkId}/${projectId}`);
    } catch (error) {
      throw new WorkspaceInitializationError(`Failed to initialize project '${frameworkId}/${projectId}'`, error);
    }
  }

  // ==================== Path Routing ====================

  /**
   * Route path template to resolved framework-scoped path
   *
   * @param {string} pathTemplate - Path template with placeholders (e.g., 'frameworks/{framework-id}/projects/{project-id}/')
   * @param {object} context - Placeholder values (e.g., { frameworkId: 'sdlc-complete', projectId: 'plugin-system' })
   * @returns {Promise<string>} Resolved path
   *
   * @example
   * const path = await workspace.routePath('frameworks/{framework-id}/projects/{project-id}/', {
   *   frameworkId: 'sdlc-complete',
   *   projectId: 'plugin-system'
   * });
   * // => 'frameworks/sdlc-complete/projects/plugin-system'
   */
  async routePath(pathTemplate, context = {}) {
    // Check legacy mode (backward compatibility)
    const legacyMode = await this.getLegacyMode();

    if (legacyMode) {
      // Fallback to root .aiwg/ structure (pre-FID-007)
      console.debug('[WorkspaceManager] Legacy mode: routing to root .aiwg/ structure');
      return this._routeLegacyPath(pathTemplate);
    }

    // Framework-scoped routing
    return this.pathResolver.resolve(pathTemplate, context);
  }

  /**
   * Get output path for command (from metadata)
   *
   * @param {string} commandId - Command ID (e.g., 'flow-inception-to-elaboration')
   * @param {object} context - Context with frameworkId, projectId
   * @returns {Promise<string>} Resolved output path
   *
   * @example
   * const outputPath = await workspace.getOutputPath('flow-inception-to-elaboration', {
   *   frameworkId: 'sdlc-complete',
   *   projectId: 'plugin-system'
   * });
   */
  async getOutputPath(commandId, context = {}) {
    const metadata = await this.metadataLoader.loadCommandMetadata(commandId);
    return this.routePath(metadata.outputPath, context);
  }

  /**
   * Get context paths for command (from metadata)
   *
   * @param {string} commandId - Command ID
   * @param {object} context - Context with frameworkId, projectId
   * @returns {Promise<string[]>} Resolved context paths
   *
   * @example
   * const contextPaths = await workspace.getContextPaths('flow-inception-to-elaboration', {
   *   frameworkId: 'sdlc-complete',
   *   projectId: 'plugin-system'
   * });
   * // => ['frameworks/sdlc-complete/repo/', 'frameworks/sdlc-complete/projects/plugin-system/', 'shared/']
   */
  async getContextPaths(commandId, context = {}) {
    const metadata = await this.metadataLoader.loadCommandMetadata(commandId);
    return this.pathResolver.resolveBatch(metadata.contextPaths || [], context);
  }

  /**
   * Route legacy path (backward compatibility)
   *
   * @private
   * @param {string} pathTemplate - Path template (may contain framework placeholders)
   * @returns {string} Legacy path (root .aiwg/ structure)
   *
   * Maps framework-scoped paths to legacy paths:
   * - frameworks/{framework-id}/projects/{project-id}/requirements/ → requirements/
   * - frameworks/{framework-id}/projects/{project-id}/architecture/ → architecture/
   * - frameworks/{framework-id}/repo/intake/ → intake/
   */
  _routeLegacyPath(pathTemplate) {
    // Extract artifact type from path template
    // Pattern: frameworks/{framework-id}/projects/{project-id}/{artifact-type}/
    const match = pathTemplate.match(/projects\/\{project-id\}\/([a-z-]+)\//);

    if (match) {
      const artifactType = match[1];
      return artifactType; // Return just artifact type (e.g., 'requirements', 'architecture')
    }

    // Fallback: return template as-is (warning logged)
    console.warn(`⚠️  Could not map framework path to legacy: ${pathTemplate}`);
    return pathTemplate;
  }

  // ==================== Workspace Queries ====================

  /**
   * Get workspace information for framework/project
   *
   * @param {string} frameworkId - Framework ID
   * @param {string} [projectId] - Project ID (optional)
   * @returns {Promise<object>} Workspace info with paths and status
   *
   * @example
   * const workspace = await workspace.getWorkspace('sdlc-complete', 'plugin-system');
   * // => { frameworkId, projectId, repoPath, projectPath, workingPath, archivePath, exists }
   */
  async getWorkspace(frameworkId, projectId = null) {
    const baseInfo = {
      frameworkId,
      projectId,
      repoPath: path.join(this.basePath, 'frameworks', frameworkId, 'repo'),
      projectPath: projectId ? path.join(this.basePath, 'frameworks', frameworkId, 'projects', projectId) : null,
      workingPath: path.join(this.basePath, 'frameworks', frameworkId, 'working'),
      archivePath: path.join(this.basePath, 'frameworks', frameworkId, 'archive')
    };

    // Check if workspace exists
    const exists = {
      framework: await this._directoryExists(path.join(this.basePath, 'frameworks', frameworkId)),
      repo: await this._directoryExists(baseInfo.repoPath),
      project: projectId ? await this._directoryExists(baseInfo.projectPath) : null,
      working: await this._directoryExists(baseInfo.workingPath),
      archive: await this._directoryExists(baseInfo.archivePath)
    };

    return { ...baseInfo, exists };
  }

  /**
   * List projects for framework
   *
   * @param {string} frameworkId - Framework ID
   * @returns {Promise<string[]>} Array of project IDs
   *
   * @example
   * const projects = await workspace.listProjects('sdlc-complete');
   * // => ['plugin-system', 'auth-service']
   */
  async listProjects(frameworkId) {
    return this.registry.getProjects(frameworkId);
  }

  /**
   * Determine active tier from path (repo | projects | working | archive)
   *
   * @param {string} pathToAnalyze - Path to analyze
   * @returns {string|null} Tier name or null if not in workspace
   *
   * @example
   * const tier = workspace.getActiveTier('frameworks/sdlc-complete/repo/');
   * // => 'repo'
   */
  getActiveTier(pathToAnalyze) {
    return this.pathResolver.detectTier(pathToAnalyze);
  }

  // ==================== Project Context ====================

  /**
   * Set active project context (for path resolution)
   *
   * @param {string} projectId - Project ID to set as active
   *
   * @example
   * workspace.setProjectContext('plugin-system');
   * // All subsequent path resolutions will use projectId: 'plugin-system'
   */
  setProjectContext(projectId) {
    this.activeProjectContext = projectId;
    console.debug(`[WorkspaceManager] Active project context: ${projectId}`);
  }

  /**
   * Get active project context
   *
   * @returns {string|null} Active project ID or null
   *
   * @example
   * const projectId = workspace.getProjectContext();
   * // => 'plugin-system'
   */
  getProjectContext() {
    return this.activeProjectContext;
  }

  /**
   * Clear active project context
   *
   * @example
   * workspace.clearProjectContext();
   */
  clearProjectContext() {
    this.activeProjectContext = null;
    console.debug('[WorkspaceManager] Project context cleared');
  }

  // ==================== Utilities ====================

  /**
   * Ensure directory exists (create if missing)
   *
   * @param {string} dirPath - Directory path (absolute or relative)
   * @returns {Promise<void>}
   *
   * @example
   * await workspace.ensureDirectoryExists('frameworks/sdlc-complete/projects/plugin-system/requirements');
   */
  async ensureDirectoryExists(dirPath) {
    const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.join(this.basePath, dirPath);

    try {
      await fs.mkdir(absolutePath, { recursive: true });
    } catch (error) {
      throw new WorkspaceInitializationError(`Failed to create directory: ${dirPath}`, error);
    }
  }

  /**
   * Clean workspace tier (delete old files, preserve directory structure)
   *
   * @param {string} frameworkId - Framework ID
   * @param {string} tier - Tier to clean ('working' | 'archive')
   * @param {number} [olderThanDays=7] - Delete files older than N days (default: 7)
   * @returns {Promise<{deleted: number, preserved: number}>} Cleanup statistics
   *
   * @example
   * const stats = await workspace.cleanWorkspace('sdlc-complete', 'working', 7);
   * // => { deleted: 12, preserved: 3 }
   */
  async cleanWorkspace(frameworkId, tier, olderThanDays = 7) {
    const tierPath = path.join(this.basePath, 'frameworks', frameworkId, tier);

    const stats = { deleted: 0, preserved: 0 };
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    try {
      const files = await this._getAllFiles(tierPath);

      for (const file of files) {
        const fileStats = await fs.stat(file);

        if (fileStats.mtime.getTime() < cutoffTime) {
          await fs.unlink(file);
          stats.deleted++;
        } else {
          stats.preserved++;
        }
      }

      console.debug(`[WorkspaceManager] Cleaned workspace: ${frameworkId}/${tier} (deleted: ${stats.deleted}, preserved: ${stats.preserved})`);
      return stats;
    } catch (error) {
      console.error(`[WorkspaceManager] Failed to clean workspace: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if directory exists
   *
   * @private
   * @param {string} dirPath - Directory path
   * @returns {Promise<boolean>} True if exists
   */
  async _directoryExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get all files in directory recursively
   *
   * @private
   * @param {string} dirPath - Directory path
   * @returns {Promise<string[]>} Array of file paths
   */
  async _getAllFiles(dirPath) {
    const files = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this._getAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    return files;
  }
}

// ==================== Exports ====================

export {
  WorkspaceManager,
  WorkspaceError,
  WorkspaceInitializationError,
  FrameworkNotInstalledError,
  LegacyMigrationRequiredError
};

export default WorkspaceManager;
