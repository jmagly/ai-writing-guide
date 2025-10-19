/**
 * PathResolver - Framework-Aware Path Resolution and Security Validation
 *
 * Resolves placeholder variables in path templates while enforcing strict security
 * validation to prevent path traversal attacks and unauthorized filesystem access.
 *
 * @module tools/workspace/path-resolver
 * @implements FID-007 (Framework-Scoped Workspace Management)
 * @requires UC-012 (Framework-Aware Workspace Management)
 * @see .aiwg/working/FID-007-implementation-plan.md (Section 4.1 - Week 2, Task 6)
 * @see .aiwg/requirements/use-cases/UC-012-framework-aware-workspace-management.md (Section 11.4)
 * @see .aiwg/architecture/decisions/ADR-007-framework-scoped-workspace-architecture.md
 *
 * SECURITY: Implements NFR-SEC-05 (path traversal prevention) and NFR-SEC-04 (data integrity)
 * PERFORMANCE: Target <100ms per resolution operation (NFR-PERF-05)
 */

import path from 'path';
import { fileURLToPath } from 'url';

// Error Classes

/**
 * Base error class for path resolution errors
 */
class PathResolutionError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'PathResolutionError';
    this.details = details;
  }
}

/**
 * Thrown when path traversal attack detected (../, ..\, or .. segments)
 */
class PathTraversalError extends PathResolutionError {
  constructor(attemptedPath, details = {}) {
    super(
      `Path traversal detected: ${attemptedPath}\n` +
      `Reason: Path contains forbidden traversal patterns (../, ..\\, or .. segments)\n` +
      `Remediation: Use relative paths within .aiwg/frameworks/ without parent directory references`,
      { attemptedPath, ...details }
    );
    this.name = 'PathTraversalError';
  }
}

/**
 * Thrown when path contains forbidden patterns (/etc/, /root/, etc.)
 */
class ForbiddenPathError extends PathResolutionError {
  constructor(attemptedPath, forbiddenPattern, details = {}) {
    super(
      `Forbidden path pattern detected: ${attemptedPath}\n` +
      `Forbidden pattern: ${forbiddenPattern}\n` +
      `Remediation: Paths must be within .aiwg/frameworks/ workspace`,
      { attemptedPath, forbiddenPattern, ...details }
    );
    this.name = 'ForbiddenPathError';
  }
}

/**
 * Thrown when placeholder in template is not provided in context
 */
class InvalidPlaceholderError extends PathResolutionError {
  constructor(placeholder, availablePlaceholders, details = {}) {
    super(
      `Invalid placeholder: ${placeholder}\n` +
      `Available placeholders: ${availablePlaceholders.join(', ')}\n` +
      `Remediation: Provide value for ${placeholder} in context object`,
      { placeholder, availablePlaceholders, ...details }
    );
    this.name = 'InvalidPlaceholderError';
  }
}

/**
 * Thrown when path contains unsafe characters
 */
class UnsafeCharacterError extends PathResolutionError {
  constructor(attemptedPath, unsafeChars, details = {}) {
    super(
      `Unsafe characters detected: ${attemptedPath}\n` +
      `Unsafe characters: ${unsafeChars.join(', ')}\n` +
      `Remediation: Use only alphanumeric characters, hyphens, underscores, forward slashes, and periods`,
      { attemptedPath, unsafeChars, ...details }
    );
    this.name = 'UnsafeCharacterError';
  }
}

/**
 * PathResolver - Resolve path templates with placeholder variables
 *
 * @class PathResolver
 * @example
 * const resolver = new PathResolver('.aiwg');
 *
 * // Resolve placeholders
 * const context = { frameworkId: 'sdlc-complete', projectId: 'plugin-system' };
 * const path = resolver.resolve('frameworks/{framework-id}/projects/{project-id}/requirements/', context);
 * // => 'frameworks/sdlc-complete/projects/plugin-system/requirements'
 *
 * // Validate path security
 * resolver.validatePath('../../../etc/passwd'); // Throws PathTraversalError
 *
 * // Detect workspace tier
 * resolver.detectTier('frameworks/sdlc-complete/repo/'); // => 'repo'
 */
export class PathResolver {
  /**
   * Create PathResolver instance
   *
   * @param {string} basePath - Base workspace path (default: '.aiwg')
   */
  constructor(basePath = '.aiwg') {
    this.basePath = basePath;

    // Supported placeholder variables
    this.placeholders = {
      'framework-id': 'frameworkId',
      'project-id': 'projectId',
      'campaign-id': 'campaignId',
      'story-id': 'storyId',
      'epic-id': 'epicId',
      'YYYY-MM': () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      }
    };

    // Forbidden path patterns (security blacklist)
    this.forbiddenPatterns = [
      '/etc/',
      '/root/',
      '/home/',
      '/usr/',
      '/sys/',
      '/var/',
      '/tmp/',
      '/proc/',
      '/dev/',
      'C:\\',
      'D:\\',
      '\\Windows\\',
      '\\System32\\'
    ];

    // Workspace tiers (from UC-012 Section 11.4)
    this.tiers = ['repo', 'projects', 'working', 'archive', 'campaigns', 'stories', 'sprints'];
  }

  // ==================== Resolution ====================

  /**
   * Resolve path template with placeholder variables
   *
   * @param {string} pathTemplate - Path template with placeholders (e.g., 'frameworks/{framework-id}/projects/{project-id}/')
   * @param {object} context - Placeholder values (e.g., { frameworkId: 'sdlc-complete', projectId: 'plugin-system' })
   * @returns {string} Resolved path with placeholders replaced
   * @throws {InvalidPlaceholderError} If placeholder not in context
   * @throws {PathTraversalError} If resolved path contains traversal patterns
   * @throws {ForbiddenPathError} If resolved path matches forbidden patterns
   *
   * @example
   * resolver.resolve('frameworks/{framework-id}/projects/{project-id}/', {
   *   frameworkId: 'sdlc-complete',
   *   projectId: 'plugin-system'
   * });
   * // => 'frameworks/sdlc-complete/projects/plugin-system'
   */
  resolve(pathTemplate, context = {}) {
    if (!pathTemplate || typeof pathTemplate !== 'string') {
      throw new PathResolutionError('Path template must be a non-empty string', { pathTemplate });
    }

    let resolvedPath = pathTemplate;

    // Extract all placeholders from template
    const placeholdersInTemplate = this.extractPlaceholders(pathTemplate);

    // Replace each placeholder with context value
    for (const placeholder of placeholdersInTemplate) {
      const contextKey = this.placeholders[placeholder];

      if (!contextKey) {
        throw new InvalidPlaceholderError(
          placeholder,
          this.getAvailablePlaceholders(),
          { pathTemplate, context }
        );
      }

      // Handle function-based placeholders (e.g., {YYYY-MM})
      let value;
      if (typeof contextKey === 'function') {
        value = contextKey();
      } else {
        value = context[contextKey];

        if (value === undefined || value === null) {
          throw new InvalidPlaceholderError(
            placeholder,
            this.getAvailablePlaceholders(),
            { pathTemplate, context, missingKey: contextKey }
          );
        }
      }

      // Replace placeholder with value
      const placeholderPattern = new RegExp(`\\{${placeholder}\\}`, 'g');
      resolvedPath = resolvedPath.replace(placeholderPattern, value);
    }

    // Normalize and validate resolved path
    resolvedPath = this.normalize(resolvedPath);
    this.validatePath(resolvedPath);

    return resolvedPath;
  }

  /**
   * Resolve path template to absolute path
   *
   * @param {string} pathTemplate - Path template with placeholders
   * @param {object} context - Placeholder values
   * @returns {string} Absolute resolved path
   *
   * @example
   * resolver.resolveAbsolute('frameworks/{framework-id}/repo/', { frameworkId: 'sdlc-complete' });
   * // => '/home/user/project/.aiwg/frameworks/sdlc-complete/repo'
   */
  resolveAbsolute(pathTemplate, context = {}) {
    const relativePath = this.resolve(pathTemplate, context);
    return this.toAbsolute(relativePath);
  }

  /**
   * Resolve multiple path templates in batch
   *
   * @param {string[]} pathTemplates - Array of path templates
   * @param {object} context - Shared placeholder values
   * @returns {string[]} Array of resolved paths
   *
   * @example
   * resolver.resolveBatch([
   *   'frameworks/{framework-id}/repo/',
   *   'frameworks/{framework-id}/projects/{project-id}/'
   * ], { frameworkId: 'sdlc-complete', projectId: 'plugin-system' });
   * // => ['frameworks/sdlc-complete/repo', 'frameworks/sdlc-complete/projects/plugin-system']
   */
  resolveBatch(pathTemplates, context = {}) {
    if (!Array.isArray(pathTemplates)) {
      throw new PathResolutionError('Path templates must be an array', { pathTemplates });
    }

    return pathTemplates.map(template => this.resolve(template, context));
  }

  // ==================== Validation ====================

  /**
   * Validate path security (no traversal, no forbidden patterns)
   *
   * @param {string} pathToValidate - Path to validate
   * @throws {PathTraversalError} If path contains traversal patterns
   * @throws {ForbiddenPathError} If path matches forbidden patterns
   * @throws {UnsafeCharacterError} If path contains unsafe characters
   *
   * @example
   * resolver.validatePath('frameworks/sdlc-complete/repo/'); // OK
   * resolver.validatePath('../../../etc/passwd'); // Throws PathTraversalError
   */
  validatePath(pathToValidate) {
    if (!pathToValidate || typeof pathToValidate !== 'string') {
      throw new PathResolutionError('Path must be a non-empty string', { path: pathToValidate });
    }

    // Check for path traversal patterns
    if (!this.isSafe(pathToValidate)) {
      throw new PathTraversalError(pathToValidate);
    }

    // Check for forbidden patterns
    const normalizedPath = pathToValidate.toLowerCase().replace(/\\/g, '/');
    for (const forbiddenPattern of this.forbiddenPatterns) {
      if (normalizedPath.includes(forbiddenPattern.toLowerCase())) {
        throw new ForbiddenPathError(pathToValidate, forbiddenPattern);
      }
    }

    // Check for null bytes (security)
    if (pathToValidate.includes('\0')) {
      throw new UnsafeCharacterError(pathToValidate, ['\\0 (null byte)']);
    }

    // Check for unsafe characters (restrict to safe character set)
    const safeCharPattern = /^[a-zA-Z0-9\-_\/\.\s]+$/;
    if (!safeCharPattern.test(pathToValidate)) {
      const unsafeChars = pathToValidate
        .split('')
        .filter(char => !safeCharPattern.test(char))
        .filter((char, index, self) => self.indexOf(char) === index); // unique

      throw new UnsafeCharacterError(pathToValidate, unsafeChars);
    }

    return true;
  }

  /**
   * Check if path is safe (no traversal patterns)
   *
   * @param {string} pathToCheck - Path to check
   * @returns {boolean} True if safe, false if contains traversal patterns
   *
   * @example
   * resolver.isSafe('frameworks/sdlc-complete/repo/'); // true
   * resolver.isSafe('../../../etc/passwd'); // false
   */
  isSafe(pathToCheck) {
    if (!pathToCheck || typeof pathToCheck !== 'string') {
      return false;
    }

    // Normalize slashes for consistent checking
    const normalizedPath = pathToCheck.replace(/\\/g, '/');

    // Check for explicit traversal patterns
    if (normalizedPath.includes('../')) {
      return false;
    }

    // Check for backslash traversal (Windows)
    if (pathToCheck.includes('..\\')) {
      return false;
    }

    // Check for .. segments in path (after splitting)
    const segments = normalizedPath.split('/').filter(seg => seg.length > 0);
    if (segments.includes('..')) {
      return false;
    }

    // Check for absolute paths (should be relative to basePath)
    if (normalizedPath.startsWith('/') || /^[a-zA-Z]:/.test(pathToCheck)) {
      return false;
    }

    return true;
  }

  /**
   * Detect workspace tier from path (repo | projects | working | archive)
   *
   * @param {string} pathToAnalyze - Path to analyze
   * @returns {string|null} Tier name or null if not in workspace
   *
   * @example
   * resolver.detectTier('frameworks/sdlc-complete/repo/'); // 'repo'
   * resolver.detectTier('frameworks/sdlc-complete/projects/plugin-system/'); // 'projects'
   * resolver.detectTier('frameworks/marketing-flow/campaigns/launch/'); // 'campaigns'
   */
  detectTier(pathToAnalyze) {
    if (!pathToAnalyze || typeof pathToAnalyze !== 'string') {
      return null;
    }

    const normalizedPath = this.normalize(pathToAnalyze);
    const segments = normalizedPath.split('/').filter(seg => seg.length > 0);

    // Expected structure: frameworks/{framework-id}/{tier}/...
    if (segments.length < 3 || segments[0] !== 'frameworks') {
      return null;
    }

    const tierSegment = segments[2];
    return this.tiers.includes(tierSegment) ? tierSegment : null;
  }

  // ==================== Normalization ====================

  /**
   * Normalize path (forward slashes, no trailing slash)
   *
   * @param {string} pathToNormalize - Path to normalize
   * @returns {string} Normalized path
   *
   * @example
   * resolver.normalize('frameworks\\sdlc-complete\\repo\\'); // 'frameworks/sdlc-complete/repo'
   * resolver.normalize('frameworks/sdlc-complete/repo/'); // 'frameworks/sdlc-complete/repo'
   */
  normalize(pathToNormalize) {
    if (!pathToNormalize || typeof pathToNormalize !== 'string') {
      return '';
    }

    // Convert backslashes to forward slashes
    let normalized = pathToNormalize.replace(/\\/g, '/');

    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');

    // Collapse multiple slashes to single
    normalized = normalized.replace(/\/+/g, '/');

    // Remove leading slash if present (paths should be relative)
    normalized = normalized.replace(/^\//, '');

    return normalized;
  }

  /**
   * Convert absolute path to relative path (relative to basePath)
   *
   * @param {string} absolutePath - Absolute path to convert
   * @returns {string} Relative path
   *
   * @example
   * resolver.toRelative('/home/user/project/.aiwg/frameworks/sdlc-complete/repo');
   * // => 'frameworks/sdlc-complete/repo'
   */
  toRelative(absolutePath) {
    if (!absolutePath || typeof absolutePath !== 'string') {
      throw new PathResolutionError('Absolute path must be a non-empty string', { absolutePath });
    }

    // Get current working directory
    const cwd = process.cwd();
    const baseAbsolute = path.join(cwd, this.basePath);

    // Calculate relative path from basePath
    let relativePath = path.relative(baseAbsolute, absolutePath);

    // Normalize slashes
    relativePath = relativePath.replace(/\\/g, '/');

    return relativePath;
  }

  /**
   * Convert relative path to absolute path (relative to basePath)
   *
   * @param {string} relativePath - Relative path to convert
   * @returns {string} Absolute path
   *
   * @example
   * resolver.toAbsolute('frameworks/sdlc-complete/repo');
   * // => '/home/user/project/.aiwg/frameworks/sdlc-complete/repo'
   */
  toAbsolute(relativePath) {
    if (!relativePath || typeof relativePath !== 'string') {
      throw new PathResolutionError('Relative path must be a non-empty string', { relativePath });
    }

    // Validate relative path first
    this.validatePath(relativePath);

    // Get current working directory
    const cwd = process.cwd();
    const baseAbsolute = path.join(cwd, this.basePath);

    // Join with base path and normalize
    const absolutePath = path.join(baseAbsolute, relativePath);

    return absolutePath;
  }

  // ==================== Utilities ====================

  /**
   * Extract all placeholders from path template
   *
   * @param {string} pathTemplate - Path template to analyze
   * @returns {string[]} Array of placeholder names (without braces)
   *
   * @example
   * resolver.extractPlaceholders('frameworks/{framework-id}/projects/{project-id}/');
   * // => ['framework-id', 'project-id']
   */
  extractPlaceholders(pathTemplate) {
    if (!pathTemplate || typeof pathTemplate !== 'string') {
      return [];
    }

    const placeholderPattern = /\{([a-zA-Z0-9\-]+)\}/g;
    const matches = [];
    let match;

    while ((match = placeholderPattern.exec(pathTemplate)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }

  /**
   * Get list of all supported placeholders
   *
   * @returns {string[]} Array of supported placeholder names
   *
   * @example
   * resolver.getAvailablePlaceholders();
   * // => ['framework-id', 'project-id', 'campaign-id', 'story-id', 'epic-id', 'YYYY-MM']
   */
  getAvailablePlaceholders() {
    return Object.keys(this.placeholders);
  }
}

// ==================== Unit Test Examples ====================

/**
 * UNIT TEST EXAMPLES (for reference - actual tests in tests/unit/path-resolver.test.mjs)
 *
 * Test 1: Resolve {framework-id} placeholder
 * -------------------------------------------
 * const resolver = new PathResolver();
 * const path = resolver.resolve('frameworks/{framework-id}/repo/', { frameworkId: 'sdlc-complete' });
 * assert.strictEqual(path, 'frameworks/sdlc-complete/repo');
 *
 * Test 2: Resolve {project-id} placeholder
 * -----------------------------------------
 * const path = resolver.resolve('frameworks/{framework-id}/projects/{project-id}/', {
 *   frameworkId: 'sdlc-complete',
 *   projectId: 'plugin-system'
 * });
 * assert.strictEqual(path, 'frameworks/sdlc-complete/projects/plugin-system');
 *
 * Test 3: Resolve {YYYY-MM} date placeholder
 * -------------------------------------------
 * const path = resolver.resolve('frameworks/{framework-id}/archive/{YYYY-MM}/', {
 *   frameworkId: 'sdlc-complete'
 * });
 * // path => 'frameworks/sdlc-complete/archive/2025-10' (current month)
 *
 * Test 4: Reject path traversal (../)
 * ------------------------------------
 * assert.throws(
 *   () => resolver.validatePath('../../../etc/passwd'),
 *   PathTraversalError
 * );
 *
 * Test 5: Reject forbidden patterns (/etc/)
 * ------------------------------------------
 * assert.throws(
 *   () => resolver.validatePath('/etc/passwd'),
 *   ForbiddenPathError
 * );
 *
 * Test 6: Detect workspace tier
 * ------------------------------
 * const tier = resolver.detectTier('frameworks/sdlc-complete/repo/');
 * assert.strictEqual(tier, 'repo');
 *
 * Test 7: Normalize path (backslashes → forward slashes)
 * -------------------------------------------------------
 * const normalized = resolver.normalize('frameworks\\sdlc-complete\\projects\\plugin-system\\');
 * assert.strictEqual(normalized, 'frameworks/sdlc-complete/projects/plugin-system');
 *
 * Test 8: Extract placeholders from template
 * -------------------------------------------
 * const placeholders = resolver.extractPlaceholders('frameworks/{framework-id}/projects/{project-id}/');
 * assert.deepStrictEqual(placeholders, ['framework-id', 'project-id']);
 *
 * PERFORMANCE TARGET: <100ms per resolution operation (NFR-PERF-05)
 * -------------------------------------------------------------------
 * const start = Date.now();
 * for (let i = 0; i < 1000; i++) {
 *   resolver.resolve('frameworks/{framework-id}/projects/{project-id}/', {
 *     frameworkId: 'sdlc-complete',
 *     projectId: 'plugin-system'
 *   });
 * }
 * const elapsed = Date.now() - start;
 * const avgPerOp = elapsed / 1000;
 * assert(avgPerOp < 100, `Average resolution time ${avgPerOp}ms exceeds 100ms target`);
 */

// ==================== Exports ====================

export {
  PathResolutionError,
  PathTraversalError,
  ForbiddenPathError,
  InvalidPlaceholderError,
  UnsafeCharacterError
};

export default PathResolver;
