/**
 * Context Curator - Framework Context Isolation and Management
 *
 * Ensures 100% framework context isolation (NFR-REL-06) while enabling
 * unrestricted cross-framework reads (NFR-REL-07).
 *
 * Responsibilities:
 * - Load framework-specific context (templates, agents, commands, artifacts)
 * - Exclude other frameworks to prevent pollution (NFR-REL-06)
 * - Load shared cross-framework resources (team profiles, glossaries)
 * - Support cross-framework reads for novel combinations (NFR-REL-07)
 * - Lazy loading and caching for performance (NFR-PERF-05: <5s target)
 *
 * @module tools/workspace/context-curator
 * @implements {UC-012} Framework-Aware Workspace Management (AC-6)
 * @implements {ADR-007} Framework-Scoped Workspace Architecture
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { FrameworkRegistry } from './registry-manager.mjs';
import { PathResolver } from './path-resolver.mjs';

/**
 * Error thrown when framework context isolation is violated
 */
export class IsolationViolationError extends Error {
  /**
   * @param {string} message - Error description
   * @param {Object} context - Additional context about the violation
   */
  constructor(message, context = {}) {
    super(message);
    this.name = 'IsolationViolationError';
    this.context = context;
  }
}

/**
 * Error thrown when context loading fails
 */
export class ContextLoadError extends Error {
  /**
   * @param {string} message - Error description
   * @param {Error} [cause] - Original error
   */
  constructor(message, cause = null) {
    super(message);
    this.name = 'ContextLoadError';
    this.cause = cause;
  }
}

/**
 * Error thrown when framework not found in registry
 */
export class FrameworkNotFoundError extends Error {
  /**
   * @param {string} frameworkId - Framework ID that was not found
   * @param {string[]} available - List of available frameworks
   */
  constructor(frameworkId, available = []) {
    super(`Framework '${frameworkId}' not found. Available: ${available.join(', ')}`);
    this.name = 'FrameworkNotFoundError';
    this.frameworkId = frameworkId;
    this.availableFrameworks = available;
  }
}

/**
 * Context Curator manages framework-scoped context loading with isolation guarantees
 */
export class ContextCurator {
  /**
   * Create a ContextCurator instance
   * @param {string} [basePath='.aiwg'] - Base path for workspace (default: '.aiwg')
   */
  constructor(basePath = '.aiwg') {
    this.basePath = basePath;
    this.registry = new FrameworkRegistry(path.join(basePath, 'frameworks/registry.json'));
    this.pathResolver = new PathResolver(basePath);

    // Context cache: { 'framework:project' -> { data, timestamp } }
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Load framework-scoped context with isolation guarantees
   *
   * Implements UC-012 Section 7 Step 5-6: Load framework context, exclude others
   *
   * @param {string} frameworkId - Framework ID (e.g., 'sdlc-complete')
   * @param {string} projectId - Project ID within framework
   * @param {Object} [options={}] - Loading options
   * @param {boolean} [options.lazyLoad=true] - Return paths without loading files
   * @param {boolean} [options.includeShared=true] - Include shared resources
   * @param {boolean} [options.verifyIsolation=true] - Verify no cross-framework pollution
   * @returns {Promise<Object>} Context structure with files and metadata
   * @throws {FrameworkNotFoundError} If framework not installed
   * @throws {ContextLoadError} If context loading fails
   *
   * @example
   * const context = await curator.loadContext('sdlc-complete', 'plugin-system');
   * // Returns:
   * // {
   * //   frameworkId: 'sdlc-complete',
   * //   projectId: 'plugin-system',
   * //   contextPaths: [...],
   * //   excludedPaths: [...],
   * //   files: [...],
   * //   fileCount: 42,
   * //   totalSize: 125000
   * // }
   */
  async loadContext(frameworkId, projectId, options = {}) {
    const {
      lazyLoad = true,
      includeShared = true,
      verifyIsolation = true
    } = options;

    // Check cache first
    const cacheKey = `${frameworkId}:${projectId}`;
    const cached = this.getCached(frameworkId, projectId);
    if (cached) {
      return cached;
    }

    try {
      // Verify framework exists (throws FrameworkNotFoundError if not)
      const frameworkExists = await this.registry.frameworkExists(frameworkId);
      if (!frameworkExists) {
        const allFrameworks = await this.registry.getFrameworks();
        const availableIds = allFrameworks.map(f => f.id);
        throw new FrameworkNotFoundError(frameworkId, availableIds);
      }

      // Build context paths (UC-012 Section 7 Step 5)
      const contextPaths = await this._getContextPaths(frameworkId, projectId, includeShared);

      // Get excluded paths (all other frameworks) - UC-012 Section 7 Step 6
      const excludedPaths = await this.getExcludedPaths(frameworkId);

      // Lazy load: return paths only
      if (lazyLoad) {
        const context = {
          frameworkId,
          projectId,
          contextPaths,
          excludedPaths,
          lazyLoad: true,
          timestamp: Date.now()
        };

        // Cache result
        this._setCached(frameworkId, projectId, context);
        return context;
      }

      // Eager load: load all files
      const files = [];
      for (const contextPath of contextPaths) {
        const pathFiles = await this._loadFilesFromPath(contextPath, excludedPaths);
        files.push(...pathFiles);
      }

      const context = {
        frameworkId,
        projectId,
        contextPaths,
        excludedPaths,
        files,
        fileCount: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        lazyLoad: false,
        timestamp: Date.now()
      };

      // Verify isolation (NFR-REL-06: 100% no pollution)
      if (verifyIsolation) {
        await this.verifyIsolation(context);
      }

      // Cache result
      this._setCached(frameworkId, projectId, context);
      return context;

    } catch (error) {
      if (error instanceof FrameworkNotFoundError) {
        throw error; // Re-throw as-is
      }
      throw new ContextLoadError(
        `Failed to load context for framework '${frameworkId}', project '${projectId}'`,
        error
      );
    }
  }

  /**
   * Load context from specific paths (supports custom path lists)
   *
   * @param {string[]} paths - Array of paths to load
   * @param {Object} [options={}] - Loading options
   * @returns {Promise<Object>} Context with loaded files
   */
  async loadContextPaths(paths, options = {}) {
    const files = [];

    for (const contextPath of paths) {
      const pathFiles = await this._loadFilesFromPath(contextPath, []);
      files.push(...pathFiles);
    }

    return {
      contextPaths: paths,
      files,
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      timestamp: Date.now()
    };
  }

  /**
   * Explicitly exclude frameworks from context
   *
   * @param {string[]} frameworkIds - Framework IDs to exclude
   * @returns {Promise<string[]>} Excluded paths
   */
  async excludeFrameworks(frameworkIds) {
    const excludedPaths = [];

    for (const frameworkId of frameworkIds) {
      const frameworkPath = path.join(this.basePath, 'frameworks', frameworkId);
      excludedPaths.push(frameworkPath);
    }

    return excludedPaths;
  }

  /**
   * Get all context files for a framework and project
   *
   * @param {string} frameworkId - Framework ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object[]>} Array of file metadata
   */
  async getContextFiles(frameworkId, projectId) {
    const context = await this.loadContext(frameworkId, projectId, { lazyLoad: false });
    return context.files;
  }

  /**
   * Search context files by pattern
   *
   * @param {string} frameworkId - Framework ID
   * @param {string} pattern - Glob pattern (e.g., '** /*.md')
   * @returns {Promise<Object[]>} Matching files
   */
  async searchContext(frameworkId, pattern) {
    const frameworkPath = path.join(this.basePath, 'frameworks', frameworkId);
    const fullPattern = path.join(frameworkPath, pattern);

    const matches = await glob(fullPattern, { nodir: true, absolute: true });

    const files = await Promise.all(
      matches.map(async (filePath) => {
        const stats = await fs.stat(filePath);
        return {
          path: path.relative(this.basePath, filePath),
          absolutePath: filePath,
          size: stats.size,
          type: this._detectFileType(filePath)
        };
      })
    );

    return files;
  }

  /**
   * Check if framework context exists
   *
   * @param {string} frameworkId - Framework ID
   * @returns {Promise<boolean>} True if framework installed
   */
  async hasContext(frameworkId) {
    return await this.registry.frameworkExists(frameworkId);
  }

  /**
   * Read file from another framework (NFR-REL-07: unrestricted reads)
   *
   * Supports novel framework combinations (e.g., Marketing reads SDLC ADRs)
   *
   * @param {string} frameworkId - Source framework ID
   * @param {string} relativePath - Path relative to framework root
   * @returns {Promise<Object>} File content and metadata
   * @throws {FrameworkNotFoundError} If framework not installed
   *
   * @example
   * // Marketing agent reading SDLC architecture decisions
   * const adr = await curator.readFromFramework(
   *   'sdlc-complete',
   *   'projects/plugin-system/architecture/decisions/ADR-007.md'
   * );
   */
  async readFromFramework(frameworkId, relativePath) {
    // Verify framework exists
    const exists = await this.registry.frameworkExists(frameworkId);
    if (!exists) {
      const allFrameworks = await this.registry.getFrameworks();
      const availableIds = allFrameworks.map(f => f.id);
      throw new FrameworkNotFoundError(frameworkId, availableIds);
    }

    // Build full path
    const fullPath = path.join(this.basePath, 'frameworks', frameworkId, relativePath);

    // Validate path safety (no ../ escapes)
    await this.pathResolver.validatePath(fullPath);

    try {
      const content = await fs.readFile(fullPath, 'utf8');
      const stats = await fs.stat(fullPath);

      return {
        frameworkId,
        path: relativePath,
        absolutePath: fullPath,
        content,
        size: stats.size,
        type: this._detectFileType(fullPath)
      };
    } catch (error) {
      throw new ContextLoadError(
        `Failed to read file '${relativePath}' from framework '${frameworkId}'`,
        error
      );
    }
  }

  /**
   * Enable cross-framework linking by updating metadata
   *
   * Links source framework to target framework for context sharing
   *
   * @param {string} sourceFrameworkId - Source framework ID
   * @param {string} targetFrameworkId - Target framework ID
   * @returns {Promise<Object>} Link metadata
   */
  async linkFrameworks(sourceFrameworkId, targetFrameworkId) {
    // Get source framework metadata
    const metadata = await this.registry.getFramework(sourceFrameworkId);

    // Initialize linkedFrameworks if not present
    if (!metadata.linkedFrameworks) {
      metadata.linkedFrameworks = [];
    }

    // Add target framework if not already linked
    if (!metadata.linkedFrameworks.includes(targetFrameworkId)) {
      metadata.linkedFrameworks.push(targetFrameworkId);
      await this.registry.updateFramework(sourceFrameworkId, metadata);
    }

    return {
      source: sourceFrameworkId,
      target: targetFrameworkId,
      linkedFrameworks: metadata.linkedFrameworks
    };
  }

  /**
   * Get cached context if valid
   *
   * @param {string} frameworkId - Framework ID
   * @param {string} projectId - Project ID
   * @returns {Object|null} Cached context or null if expired
   */
  getCached(frameworkId, projectId) {
    const cacheKey = `${frameworkId}:${projectId}`;
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if cache expired
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Clear all cached contexts
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Invalidate cache for specific framework
   *
   * @param {string} frameworkId - Framework ID to invalidate
   */
  invalidateCache(frameworkId) {
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${frameworkId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get excluded paths for framework isolation
   *
   * Returns all framework paths EXCEPT the current framework
   *
   * @param {string} currentFrameworkId - Current framework ID
   * @returns {Promise<string[]>} Excluded framework paths
   */
  async getExcludedPaths(currentFrameworkId) {
    const allFrameworks = await this.registry.getFrameworks();

    const excludedPaths = allFrameworks
      .filter(f => f.id !== currentFrameworkId)
      .map(f => path.join(this.basePath, 'frameworks', f.id));

    return excludedPaths;
  }

  /**
   * Get shared resource paths (always loaded)
   *
   * @returns {Promise<string[]>} Shared resource paths
   */
  async getSharedPaths() {
    return [
      path.join(this.basePath, 'shared')
    ];
  }

  /**
   * Estimate context size before loading
   *
   * @param {string} frameworkId - Framework ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Size estimate
   */
  async detectContextSize(frameworkId, projectId) {
    const contextPaths = await this._getContextPaths(frameworkId, projectId, true);
    let totalFiles = 0;
    let totalSize = 0;

    for (const contextPath of contextPaths) {
      try {
        const files = await glob(path.join(contextPath, '**/*'), { nodir: true, absolute: true });

        for (const file of files) {
          const stats = await fs.stat(file);
          totalFiles++;
          totalSize += stats.size;
        }
      } catch (error) {
        // Skip inaccessible paths
        continue;
      }
    }

    return {
      frameworkId,
      projectId,
      estimatedFiles: totalFiles,
      estimatedSize: totalSize,
      estimatedSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Verify 100% framework isolation (NFR-REL-06)
   *
   * Ensures no cross-framework files leaked into context
   *
   * @param {Object} context - Context object with files
   * @throws {IsolationViolationError} If cross-framework pollution detected
   * @returns {Promise<Object>} Isolation verification result
   */
  async verifyIsolation(context) {
    const { frameworkId, files } = context;
    const violations = [];

    for (const file of files) {
      // Check if file belongs to another framework
      const otherFrameworksRegex = /frameworks\/([^/]+)\//;
      const match = file.path.match(otherFrameworksRegex);

      if (match && match[1] !== frameworkId && !file.path.includes('shared/')) {
        violations.push({
          file: file.path,
          expectedFramework: frameworkId,
          actualFramework: match[1]
        });
      }
    }

    if (violations.length > 0) {
      throw new IsolationViolationError(
        `Framework isolation violated: ${violations.length} file(s) from other frameworks leaked into ${frameworkId} context`,
        { violations, frameworkId }
      );
    }

    return {
      isolated: true,
      frameworkId,
      fileCount: files.length,
      verificationType: 'NFR-REL-06'
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Get context paths for framework and project
   *
   * @private
   * @param {string} frameworkId - Framework ID
   * @param {string} projectId - Project ID
   * @param {boolean} includeShared - Include shared resources
   * @returns {Promise<string[]>} Context paths
   */
  async _getContextPaths(frameworkId, projectId, includeShared) {
    const paths = [
      // Tier 1: Framework repo (global docs)
      path.join(this.basePath, 'frameworks', frameworkId, 'repo'),

      // Tier 2: Project artifacts
      path.join(this.basePath, 'frameworks', frameworkId, 'projects', projectId)
    ];

    // Add shared resources (cross-framework)
    if (includeShared) {
      const sharedPaths = await this.getSharedPaths();
      paths.push(...sharedPaths);
    }

    return paths;
  }

  /**
   * Load files from path with exclusion filtering
   *
   * @private
   * @param {string} basePath - Base path to load from
   * @param {string[]} excludedPaths - Paths to exclude
   * @returns {Promise<Object[]>} File metadata
   */
  async _loadFilesFromPath(basePath, excludedPaths) {
    try {
      // Check if path exists
      await fs.access(basePath);
    } catch (error) {
      // Path doesn't exist, skip silently
      return [];
    }

    // Find all files in path
    const pattern = path.join(basePath, '**/*');
    const allFiles = await glob(pattern, { nodir: true, absolute: true });

    // Filter out excluded paths
    const filtered = allFiles.filter(file => {
      return !excludedPaths.some(excluded => file.startsWith(excluded));
    });

    // Load file metadata
    const files = await Promise.all(
      filtered.map(async (filePath) => {
        const stats = await fs.stat(filePath);
        return {
          path: path.relative(this.basePath, filePath),
          absolutePath: filePath,
          size: stats.size,
          type: this._detectFileType(filePath)
        };
      })
    );

    return files;
  }

  /**
   * Detect file type from path
   *
   * @private
   * @param {string} filePath - File path
   * @returns {string} File type
   */
  _detectFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (['.md', '.markdown'].includes(ext)) return 'markdown';
    if (['.json'].includes(ext)) return 'json';
    if (['.yaml', '.yml'].includes(ext)) return 'yaml';
    if (['.js', '.mjs'].includes(ext)) return 'javascript';
    if (['.py'].includes(ext)) return 'python';
    if (['.txt', '.log'].includes(ext)) return 'text';

    if (filePath.includes('/templates/')) return 'template';
    if (filePath.includes('/agents/')) return 'agent';
    if (filePath.includes('/commands/')) return 'command';
    if (filePath.includes('/requirements/')) return 'requirement';
    if (filePath.includes('/architecture/')) return 'architecture';
    if (filePath.includes('/shared/')) return 'shared';

    return 'unknown';
  }

  /**
   * Set cached context
   *
   * @private
   * @param {string} frameworkId - Framework ID
   * @param {string} projectId - Project ID
   * @param {Object} context - Context data
   */
  _setCached(frameworkId, projectId, context) {
    const cacheKey = `${frameworkId}:${projectId}`;
    this.cache.set(cacheKey, {
      data: context,
      timestamp: Date.now()
    });
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example 1: Load framework context with isolation verification
 */
async function example1_loadContextWithIsolation() {
  const curator = new ContextCurator('.aiwg');

  try {
    // Load SDLC context (excludes Marketing, Agile frameworks)
    const context = await curator.loadContext('sdlc-complete', 'plugin-system', {
      lazyLoad: false,
      verifyIsolation: true
    });

    console.log('Context loaded successfully:');
    console.log(`- Framework: ${context.frameworkId}`);
    console.log(`- Project: ${context.projectId}`);
    console.log(`- Files loaded: ${context.fileCount}`);
    console.log(`- Total size: ${(context.totalSize / 1024).toFixed(2)} KB`);
    console.log(`- Context paths: ${context.contextPaths.length}`);
    console.log(`- Excluded paths: ${context.excludedPaths.length}`);
    console.log(`- Isolation verified: ✓`);

  } catch (error) {
    if (error instanceof IsolationViolationError) {
      console.error('Isolation violation detected:');
      console.error(error.context.violations);
    } else {
      console.error('Context load failed:', error.message);
    }
  }
}

/**
 * Example 2: Cross-framework read (Marketing reads SDLC)
 */
async function example2_crossFrameworkRead() {
  const curator = new ContextCurator('.aiwg');

  try {
    // Marketing agent reading SDLC architecture decision
    const adr = await curator.readFromFramework(
      'sdlc-complete',
      'projects/plugin-system/architecture/decisions/ADR-007.md'
    );

    console.log('Cross-framework read successful (NFR-REL-07):');
    console.log(`- Source framework: ${adr.frameworkId}`);
    console.log(`- File: ${adr.path}`);
    console.log(`- Size: ${adr.size} bytes`);
    console.log(`- Content preview: ${adr.content.substring(0, 100)}...`);

  } catch (error) {
    console.error('Cross-framework read failed:', error.message);
  }
}

/**
 * Example 3: Estimate context size before loading
 */
async function example3_estimateContextSize() {
  const curator = new ContextCurator('.aiwg');

  const estimate = await curator.detectContextSize('sdlc-complete', 'plugin-system');

  console.log('Context size estimate:');
  console.log(`- Framework: ${estimate.frameworkId}`);
  console.log(`- Project: ${estimate.projectId}`);
  console.log(`- Estimated files: ${estimate.estimatedFiles}`);
  console.log(`- Estimated size: ${estimate.estimatedSizeMB} MB`);

  if (estimate.estimatedSize > 10 * 1024 * 1024) {
    console.warn('⚠️ Large context (>10MB), consider lazy loading');
  }
}

// Uncomment to run examples:
// example1_loadContextWithIsolation();
// example2_crossFrameworkRead();
// example3_estimateContextSize();
