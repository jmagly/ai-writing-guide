#!/usr/bin/env node

/**
 * @fileoverview MetadataLoader - Extract and validate YAML frontmatter from markdown files
 *
 * Responsibilities:
 * - Extract YAML frontmatter from markdown files (.claude/commands/*.md, .claude/agents/*.md)
 * - Validate metadata schema (required: framework, optional: output-path, context-paths, version)
 * - Safe YAML parsing (prevent code injection, use yaml safe-load)
 * - Cache metadata to avoid repeated file reads
 * - Batch loading for 103 files (45 commands + 58 agents)
 *
 * Component: FID-007 - Framework-Scoped Workspace Management
 * Implementation Plan: W2-T4 (5 hours)
 * Spec: .aiwg/working/FID-007-implementation-plan.md (Section 4.1, lines 255-303)
 * Use Case: UC-012 (Section 11.2-11.3 - Metadata Format)
 * ADR: ADR-007 (Framework-Scoped Workspace Architecture)
 *
 * @module tools/workspace/metadata-loader
 * @requires yaml
 * @requires fs/promises
 * @requires path
 */

import { readFile, stat } from 'fs/promises';
import { resolve, dirname } from 'path';
import YAML from 'yaml';

/**
 * Custom error class for metadata not found
 */
export class MetadataNotFoundError extends Error {
  constructor(filePath, message = 'No YAML frontmatter found') {
    super(`${message}: ${filePath}`);
    this.name = 'MetadataNotFoundError';
    this.filePath = filePath;
  }
}

/**
 * Custom error class for invalid metadata
 */
export class InvalidMetadataError extends Error {
  constructor(filePath, validationErrors, message = 'Metadata validation failed') {
    super(`${message}: ${filePath}\n  Errors: ${validationErrors.join(', ')}`);
    this.name = 'InvalidMetadataError';
    this.filePath = filePath;
    this.validationErrors = validationErrors;
  }
}

/**
 * Custom error class for YAML parse errors
 */
export class YAMLParseError extends Error {
  constructor(filePath, originalError, message = 'YAML parsing failed') {
    super(`${message}: ${filePath}\n  ${originalError.message}`);
    this.name = 'YAMLParseError';
    this.filePath = filePath;
    this.originalError = originalError;
  }
}

/**
 * MetadataLoader - Extract and validate YAML frontmatter from markdown files
 *
 * @example
 * const loader = new MetadataLoader();
 *
 * // Load single file
 * const metadata = await loader.loadFromFile('.claude/commands/flow-inception-to-elaboration.md');
 * console.log(metadata.framework); // 'sdlc-complete'
 *
 * // Load batch
 * const allMetadata = await loader.loadBatch([
 *   '.claude/commands/flow-inception-to-elaboration.md',
 *   '.claude/commands/flow-security-review-cycle.md'
 * ]);
 *
 * // Load by ID
 * const cmdMeta = await loader.loadCommandMetadata('flow-inception-to-elaboration');
 * const agentMeta = await loader.loadAgentMetadata('architecture-designer');
 */
export class MetadataLoader {
  /**
   * Create a new MetadataLoader instance
   *
   * @param {boolean} [cacheEnabled=true] - Enable in-memory caching of metadata
   * @param {string} [defaultFramework='sdlc-complete'] - Default framework if metadata missing
   */
  constructor(cacheEnabled = true, defaultFramework = 'sdlc-complete') {
    /** @type {boolean} */
    this.cacheEnabled = cacheEnabled;

    /** @type {string} */
    this.defaultFramework = defaultFramework;

    /** @type {Map<string, {metadata: object, mtime: Date}>} */
    this.cache = new Map();

    /** @type {RegExp} */
    this.frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  }

  // ==========================================================================
  // Load Operations
  // ==========================================================================

  /**
   * Load metadata from a single file
   *
   * @param {string} filePath - Absolute path to markdown file
   * @returns {Promise<object>} Parsed and validated metadata
   * @throws {MetadataNotFoundError} If no frontmatter found
   * @throws {YAMLParseError} If YAML is malformed
   * @throws {InvalidMetadataError} If metadata fails validation
   *
   * @example
   * const metadata = await loader.loadFromFile('.claude/commands/flow-inception.md');
   * // Returns: { framework: 'sdlc-complete', 'output-path': '...', ... }
   */
  async loadFromFile(filePath) {
    const absolutePath = resolve(filePath);

    // Check cache first
    if (this.cacheEnabled) {
      const cached = await this.getCached(absolutePath);
      if (cached) {
        return cached;
      }
    }

    // Read file
    const content = await readFile(absolutePath, 'utf-8');

    // Extract frontmatter
    const frontmatter = this.extractFrontmatter(content);
    if (!frontmatter) {
      throw new MetadataNotFoundError(absolutePath);
    }

    // Parse YAML safely
    const metadata = this.parseYAML(frontmatter, absolutePath);

    // Normalize field names (kebab-case to camelCase for internal use)
    const normalized = this.normalizeMetadata(metadata);

    // Validate schema
    this.validateMetadata(normalized, absolutePath);

    // Cache result
    if (this.cacheEnabled) {
      const stats = await stat(absolutePath);
      this.cache.set(absolutePath, {
        metadata: normalized,
        mtime: stats.mtime
      });
    }

    return normalized;
  }

  /**
   * Load metadata from multiple files in parallel
   *
   * @param {string[]} filePaths - Array of absolute file paths
   * @returns {Promise<Map<string, object>>} Map of filePath → metadata
   *
   * @example
   * const results = await loader.loadBatch([
   *   '.claude/commands/cmd1.md',
   *   '.claude/commands/cmd2.md'
   * ]);
   * console.log(results.get('.claude/commands/cmd1.md').framework);
   */
  async loadBatch(filePaths) {
    const promises = filePaths.map(async (path) => {
      try {
        const metadata = await this.loadFromFile(path);
        return [path, metadata];
      } catch (error) {
        console.warn(`⚠️  Failed to load metadata from ${path}: ${error.message}`);
        return [path, null];
      }
    });

    const results = await Promise.all(promises);
    return new Map(results.filter(([, metadata]) => metadata !== null));
  }

  /**
   * Load command metadata by command ID
   *
   * @param {string} commandId - Command identifier (e.g., 'flow-inception-to-elaboration')
   * @param {string} [commandsDir='.claude/commands'] - Commands directory
   * @returns {Promise<object>} Command metadata
   *
   * @example
   * const metadata = await loader.loadCommandMetadata('flow-inception-to-elaboration');
   */
  async loadCommandMetadata(commandId, commandsDir = '.claude/commands') {
    const filePath = resolve(commandsDir, `${commandId}.md`);
    return this.loadFromFile(filePath);
  }

  /**
   * Load agent metadata by agent ID
   *
   * @param {string} agentId - Agent identifier (e.g., 'architecture-designer')
   * @param {string} [agentsDir='.claude/agents'] - Agents directory
   * @returns {Promise<object>} Agent metadata
   *
   * @example
   * const metadata = await loader.loadAgentMetadata('architecture-designer');
   */
  async loadAgentMetadata(agentId, agentsDir = '.claude/agents') {
    const filePath = resolve(agentsDir, `${agentId}.md`);
    return this.loadFromFile(filePath);
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate metadata against schema
   *
   * @param {object} metadata - Metadata object to validate
   * @param {string} filePath - File path (for error messages)
   * @throws {InvalidMetadataError} If validation fails
   *
   * Required fields: framework
   * Optional fields: frameworkVersion, outputPath, contextPaths, version
   */
  validateMetadata(metadata, filePath) {
    const errors = [];

    // Check required fields
    if (!this.hasRequiredFields(metadata)) {
      // Framework property missing - use default with warning
      console.warn(`⚠️  Framework property missing in ${filePath}, defaulting to '${this.defaultFramework}'`);
      metadata.framework = this.defaultFramework;
    }

    // Validate framework format (kebab-case)
    if (metadata.framework && !/^[a-z0-9-]+$/.test(metadata.framework)) {
      errors.push(`Invalid framework ID format: '${metadata.framework}' (must be kebab-case: lowercase letters, numbers, hyphens)`);
    }

    // Validate frameworkVersion format (semver-ish: X.Y)
    if (metadata.frameworkVersion && !/^\d+\.\d+$/.test(metadata.frameworkVersion)) {
      errors.push(`Invalid framework-version format: '${metadata.frameworkVersion}' (must be X.Y format, e.g., '1.0')`);
    }

    // Validate contextPaths is array if present
    if (metadata.contextPaths && !Array.isArray(metadata.contextPaths)) {
      errors.push(`context-paths must be an array, got ${typeof metadata.contextPaths}`);
    }

    // Validate outputPath is string if present
    if (metadata.outputPath && typeof metadata.outputPath !== 'string') {
      errors.push(`output-path must be a string, got ${typeof metadata.outputPath}`);
    }

    if (errors.length > 0) {
      throw new InvalidMetadataError(filePath, errors);
    }
  }

  /**
   * Check if metadata has all required fields
   *
   * @param {object} metadata - Metadata object
   * @returns {boolean} True if all required fields present
   */
  hasRequiredFields(metadata) {
    return metadata && typeof metadata.framework === 'string';
  }

  // ==========================================================================
  // Cache Operations
  // ==========================================================================

  /**
   * Get metadata from cache if valid
   *
   * @param {string} filePath - Absolute file path
   * @returns {Promise<object|null>} Cached metadata or null if cache miss/stale
   */
  async getCached(filePath) {
    if (!this.cache.has(filePath)) {
      return null;
    }

    // Check if file has been modified since cache
    try {
      const stats = await stat(filePath);
      const cached = this.cache.get(filePath);

      if (stats.mtime.getTime() === cached.mtime.getTime()) {
        return cached.metadata;
      }

      // File modified, invalidate cache
      this.cache.delete(filePath);
      return null;
    } catch (error) {
      // File doesn't exist or stat failed, invalidate cache
      this.cache.delete(filePath);
      return null;
    }
  }

  /**
   * Clear all cached metadata
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Invalidate cache for a specific file
   *
   * @param {string} filePath - Absolute file path
   */
  invalidateCache(filePath) {
    const absolutePath = resolve(filePath);
    this.cache.delete(absolutePath);
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Extract YAML frontmatter from markdown content
   *
   * @param {string} content - Markdown file content
   * @returns {string|null} YAML string or null if no frontmatter
   *
   * @example
   * const yaml = loader.extractFrontmatter('---\nframework: sdlc\n---\n# Doc');
   * // Returns: 'framework: sdlc\n'
   */
  extractFrontmatter(content) {
    const match = content.match(this.frontmatterRegex);
    return match ? match[1] : null;
  }

  /**
   * Parse YAML string safely (prevents code injection)
   *
   * @param {string} yamlString - YAML content
   * @param {string} filePath - File path (for error messages)
   * @returns {object} Parsed YAML object
   * @throws {YAMLParseError} If parsing fails
   *
   * Security: Uses YAML.parse with strict mode to prevent arbitrary code execution
   * Only allows: strings, numbers, booleans, null, arrays, objects
   */
  parseYAML(yamlString, filePath) {
    try {
      // Use YAML.parse with strict mode - safe by default, prevents code execution
      // The yaml library (v2.x) is safe by default and doesn't execute arbitrary code
      const parsed = YAML.parse(yamlString, {
        strict: true,
        uniqueKeys: true,
        maxAliasCount: 100 // Prevent billion laughs attack
      });

      return parsed || {};
    } catch (error) {
      throw new YAMLParseError(filePath, error);
    }
  }

  /**
   * Normalize metadata field names from kebab-case to camelCase
   *
   * Converts:
   * - framework-version → frameworkVersion
   * - output-path → outputPath
   * - context-paths → contextPaths
   * - command-id → commandId
   * - agent-id → agentId
   *
   * Preserves: framework, version (no hyphens)
   *
   * @param {object} raw - Raw metadata object with kebab-case keys
   * @returns {object} Normalized metadata with camelCase keys
   *
   * @example
   * const normalized = loader.normalizeMetadata({
   *   'framework': 'sdlc-complete',
   *   'framework-version': '1.0',
   *   'output-path': 'frameworks/...'
   * });
   * // Returns: { framework: 'sdlc-complete', frameworkVersion: '1.0', outputPath: '...' }
   */
  normalizeMetadata(raw) {
    const normalized = {};

    const keyMap = {
      'framework': 'framework',
      'framework-version': 'frameworkVersion',
      'output-path': 'outputPath',
      'context-paths': 'contextPaths',
      'command-id': 'commandId',
      'agent-id': 'agentId',
      'template-id': 'templateId',
      'output-base': 'outputBase',
      'version': 'version',
      'description': 'description',
      'name': 'name'
    };

    for (const [kebabKey, value] of Object.entries(raw)) {
      const camelKey = keyMap[kebabKey] || kebabKey;
      normalized[camelKey] = value;
    }

    return normalized;
  }
}

// ==========================================================================
// CLI Usage (if run directly)
// ==========================================================================

/**
 * CLI usage: node metadata-loader.mjs <file-path>
 *
 * Loads and displays metadata from a single file
 */
async function main() {
  if (process.argv.length < 3) {
    console.error('Usage: node metadata-loader.mjs <file-path>');
    console.error('');
    console.error('Example:');
    console.error('  node metadata-loader.mjs .claude/commands/flow-inception-to-elaboration.md');
    process.exit(1);
  }

  const filePath = process.argv[2];
  const loader = new MetadataLoader();

  try {
    const metadata = await loader.loadFromFile(filePath);
    console.log('✓ Metadata loaded successfully:');
    console.log(JSON.stringify(metadata, null, 2));
  } catch (error) {
    if (error instanceof MetadataNotFoundError) {
      console.error(`✗ ${error.message}`);
      console.error('  Make sure the file has YAML frontmatter between --- delimiters');
    } else if (error instanceof YAMLParseError) {
      console.error(`✗ ${error.message}`);
      console.error('  Check YAML syntax (indentation, quotes, etc.)');
    } else if (error instanceof InvalidMetadataError) {
      console.error(`✗ ${error.message}`);
      console.error('  Fix validation errors and try again');
    } else {
      console.error(`✗ Unexpected error: ${error.message}`);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
