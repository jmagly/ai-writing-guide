/**
 * Plugin Metadata Validator
 *
 * Validates plugin manifest YAML files for schema correctness, required fields,
 * version compatibility, and file reference validation.
 *
 * @module src/plugin/metadata-validator
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import semver from 'semver';
import { validateSkillFrontmatter } from '../extensions/validation.js';

/**
 * Severity levels for validation errors and warnings
 */
export type Severity = 'error' | 'warning';

/**
 * Validation error with path and severity
 */
export interface ValidationError {
  path?: string;
  field?: string;
  message: string;
  severity: Severity;
  line?: number;
}

/**
 * Validation warning (non-blocking)
 */
export interface ValidationWarning {
  path?: string;
  field?: string;
  message: string;
  line?: number;
}

/**
 * Plugin manifest structure
 */
export interface PluginManifest {
  name: string;
  version: string;
  type: 'agent' | 'command' | 'template' | 'flow' | 'behavior';
  description: string;
  files: string[];
  dependencies?: Record<string, string>;
  metadata?: Record<string, unknown>;
  model?: string;
  tools?: string | string[];
  framework?: string;
}

/**
 * Validation result for a single manifest
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  manifest?: PluginManifest;
}

/**
 * Options for validation behavior
 */
export interface ValidationOptions {
  /** Check that referenced files exist on filesystem */
  checkFileReferences?: boolean;
  /** Treat warnings as errors */
  strict?: boolean;
  /** Auto-fix common issues (e.g., version format) */
  autoFix?: boolean;
}

/**
 * Batch validation result for multiple manifests
 */
export type BatchValidationResult = Map<string, ValidationResult>;

/**
 * Report format options
 */
export type ReportFormat = 'text' | 'json';

/**
 * MetadataValidator validates plugin manifest files
 */
export class MetadataValidator {
  private options: ValidationOptions;

  constructor(options: ValidationOptions = {}) {
    this.options = {
      checkFileReferences: true,
      strict: false,
      autoFix: false,
      ...options
    };
  }

  /**
   * Validate a manifest file from the filesystem
   *
   * @param manifestPath - Absolute path to manifest.md or BEHAVIOR.md file
   * @returns Validation result with errors and warnings
   */
  async validateFile(manifestPath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: []
    };

    try {
      // Check file exists
      const stats = await fs.stat(manifestPath);
      if (!stats.isFile()) {
        result.errors.push({
          path: manifestPath,
          message: 'Path is not a file',
          severity: 'error'
        });
        return result;
      }

      // Read file content
      const content = await fs.readFile(manifestPath, 'utf-8');

      // Dispatch by filename — each artifact type has its own self-contained
      // validator. Adding a new artifact type means adding a new method, not
      // editing a growing if/else inside validateManifest.
      const filename = path.basename(manifestPath);
      const basePath = path.dirname(manifestPath);
      const contentResult = filename === 'SKILL.md'
        ? await this.validateSkillManifest(content, basePath, filename)
        : await this.validateManifest(content, basePath, filename);

      // Merge results
      result.errors = contentResult.errors;
      result.warnings = contentResult.warnings;
      result.manifest = contentResult.manifest;
      result.valid = contentResult.valid;

      return result;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        result.errors.push({
          path: manifestPath,
          message: 'File not found',
          severity: 'error'
        });
      } else {
        result.errors.push({
          path: manifestPath,
          message: `Failed to read file: ${error.message}`,
          severity: 'error'
        });
      }
      return result;
    }
  }

  /**
   * Validate manifest content from string
   *
   * @param content - Manifest file content
   * @param basePath - Optional base path for file reference validation
   * @param filename - Optional filename to infer type (e.g., 'BEHAVIOR.md')
   * @returns Validation result
   */
  async validateManifest(content: string, basePath?: string, filename?: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: []
    };

    // Parse YAML frontmatter
    const manifest = this.parseFrontmatter(content, result);
    if (!manifest) {
      return result;
    }

    // Infer type from filename for BEHAVIOR.md files that omit `type`
    const manifestRec = manifest as unknown as Record<string, unknown>;
    const isBehaviorFile = filename === 'BEHAVIOR.md' ||
      (basePath && !('type' in manifestRec) &&
       ('triggers' in manifestRec || 'hooks' in manifestRec));
    if (isBehaviorFile && !('type' in manifestRec)) {
      manifestRec.type = 'behavior';
    }

    // Schema validation — use behavior-specific validation for behavior files
    const schemaResult = isBehaviorFile
      ? this.validateBehaviorSchema(manifest)
      : this.validateSchema(manifest);
    result.errors.push(...schemaResult.errors);
    result.warnings.push(...schemaResult.warnings);

    if (schemaResult.valid) {
      result.manifest = manifest;

      // Required fields validation
      const requiredErrors = this.validateRequiredFields(manifest);
      result.errors.push(...requiredErrors);

      // Version validation
      const versionErrors = this.validateVersion(manifest.version);
      result.errors.push(...versionErrors);

      // Dependency validation
      if (manifest.dependencies) {
        const depErrors = this.validateDependencies(manifest.dependencies);
        result.errors.push(...depErrors);
      }

      // File reference validation (if basePath provided and option enabled)
      if (basePath && this.options.checkFileReferences && manifest.files) {
        const fileErrors = await this.validateFileReferences(manifest, basePath);
        result.errors.push(...fileErrors);
      }

      // Metadata completeness warnings
      const metadataWarnings = this.checkMetadataCompleteness(manifest);
      result.warnings.push(...metadataWarnings);

      // Memory topology validation (if declared)
      const topologyWarnings = this.validateMemoryTopology(manifest);
      result.warnings.push(...topologyWarnings);
    }

    // Determine if valid (no errors, or warnings only if not strict)
    result.valid = result.errors.length === 0 &&
      (!this.options.strict || result.warnings.length === 0);

    return result;
  }

  /**
   * Validate a SKILL.md frontmatter file.
   *
   * SKILL.md is a separate artifact type from manifest.md/BEHAVIOR.md and
   * has its own schema ({@link SkillFrontmatterSchema} in
   * `src/extensions/validation.ts`). It does NOT carry `version`, `type`,
   * `dependencies`, or `files` fields, so we route it through a dedicated
   * validator instead of branching inside {@link validateManifest}.
   *
   * Adding a new artifact type? Add a sibling method here, then dispatch
   * to it from {@link validateFile} based on filename.
   *
   * @param content - Full SKILL.md file contents (frontmatter + body)
   * @param _basePath - Reserved for future cross-file checks
   * @param filename - File basename, used in error.path for diagnostics
   * @returns Validation result
   */
  async validateSkillManifest(
    content: string,
    _basePath?: string,
    filename?: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: []
    };

    const manifest = this.parseFrontmatter(content, result);
    if (!manifest) {
      return result;
    }

    const skillResult = validateSkillFrontmatter(manifest);
    if (skillResult.success) {
      result.manifest = manifest;
    } else {
      for (const issue of skillResult.errors.errors) {
        result.errors.push({
          path: filename,
          field: issue.path.join('.'),
          message: issue.message,
          severity: 'error',
        });
      }
    }

    result.valid = result.errors.length === 0 &&
      (!this.options.strict || result.warnings.length === 0);
    return result;
  }

  /**
   * Validate manifest schema structure
   *
   * @param manifest - Parsed manifest object
   * @returns Validation result
   */
  validateSchema(manifest: unknown): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!manifest || typeof manifest !== 'object') {
      result.valid = false;
      result.errors.push({
        message: 'Manifest must be an object',
        severity: 'error'
      });
      return result;
    }

    const obj = manifest as Record<string, unknown>;

    // Check required top-level fields exist
    const requiredFields = ['name', 'version', 'type', 'description'];
    for (const field of requiredFields) {
      if (!(field in obj)) {
        result.valid = false;
        result.errors.push({
          field,
          message: `Missing required field: ${field}`,
          severity: 'error'
        });
      }
    }

    // Type validations
    if ('name' in obj && typeof obj.name !== 'string') {
      result.valid = false;
      result.errors.push({
        field: 'name',
        message: 'Field "name" must be a string',
        severity: 'error'
      });
    }

    if ('version' in obj && typeof obj.version !== 'string') {
      result.valid = false;
      result.errors.push({
        field: 'version',
        message: 'Field "version" must be a string',
        severity: 'error'
      });
    }

    if ('type' in obj) {
      const validTypes = ['agent', 'command', 'template', 'flow', 'behavior'];
      if (typeof obj.type !== 'string' || !validTypes.includes(obj.type)) {
        result.valid = false;
        result.errors.push({
          field: 'type',
          message: `Field "type" must be one of: ${validTypes.join(', ')}`,
          severity: 'error'
        });
      }
    }

    if ('description' in obj && typeof obj.description !== 'string') {
      result.valid = false;
      result.errors.push({
        field: 'description',
        message: 'Field "description" must be a string',
        severity: 'error'
      });
    }

    if ('files' in obj) {
      if (!Array.isArray(obj.files)) {
        result.valid = false;
        result.errors.push({
          field: 'files',
          message: 'Field "files" must be an array',
          severity: 'error'
        });
      } else if (!obj.files.every(f => typeof f === 'string')) {
        result.valid = false;
        result.errors.push({
          field: 'files',
          message: 'All items in "files" must be strings',
          severity: 'error'
        });
      }
    }

    if ('dependencies' in obj && obj.dependencies !== null) {
      if (typeof obj.dependencies !== 'object' || Array.isArray(obj.dependencies)) {
        result.valid = false;
        result.errors.push({
          field: 'dependencies',
          message: 'Field "dependencies" must be an object',
          severity: 'error'
        });
      }
    }

    if ('metadata' in obj && obj.metadata !== null) {
      if (typeof obj.metadata !== 'object' || Array.isArray(obj.metadata)) {
        result.valid = false;
        result.errors.push({
          field: 'metadata',
          message: 'Field "metadata" must be an object',
          severity: 'error'
        });
      }
    }

    return result;
  }

  /**
   * Validate BEHAVIOR.md schema structure
   *
   * BEHAVIOR.md files use a different schema than manifest.md:
   * - Required: name, version, description, platforms
   * - Optional: triggers, inputs, hooks, scripts, manifest, scope, tone, routing, memory
   *
   * @param manifest - Parsed frontmatter object
   * @returns Validation result
   */
  validateBehaviorSchema(manifest: unknown): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!manifest || typeof manifest !== 'object') {
      result.valid = false;
      result.errors.push({
        message: 'Behavior manifest must be an object',
        severity: 'error'
      });
      return result;
    }

    const obj = manifest as Record<string, unknown>;

    // Required fields for BEHAVIOR.md
    const requiredFields = ['name', 'version', 'description', 'platforms'];
    for (const field of requiredFields) {
      if (!(field in obj)) {
        result.valid = false;
        result.errors.push({
          field,
          message: `Missing required field: ${field}`,
          severity: 'error'
        });
      }
    }

    // Type validations
    if ('name' in obj && typeof obj.name !== 'string') {
      result.valid = false;
      result.errors.push({
        field: 'name',
        message: 'Field "name" must be a string',
        severity: 'error'
      });
    }

    if ('version' in obj) {
      const version = obj.version;
      if (typeof version !== 'string' && typeof version !== 'number') {
        result.valid = false;
        result.errors.push({
          field: 'version',
          message: 'Field "version" must be a string or number',
          severity: 'error'
        });
      }
    }

    if ('description' in obj && typeof obj.description !== 'string') {
      result.valid = false;
      result.errors.push({
        field: 'description',
        message: 'Field "description" must be a string',
        severity: 'error'
      });
    }

    if ('platforms' in obj && !Array.isArray(obj.platforms)) {
      result.valid = false;
      result.errors.push({
        field: 'platforms',
        message: 'Field "platforms" must be an array',
        severity: 'error'
      });
    }

    // Optional field type checks
    if ('triggers' in obj && !Array.isArray(obj.triggers)) {
      result.valid = false;
      result.errors.push({
        field: 'triggers',
        message: 'Field "triggers" must be an array of strings',
        severity: 'error'
      });
    }

    if ('inputs' in obj && !Array.isArray(obj.inputs)) {
      result.valid = false;
      result.errors.push({
        field: 'inputs',
        message: 'Field "inputs" must be an array',
        severity: 'error'
      });
    }

    if ('hooks' in obj && (typeof obj.hooks !== 'object' || Array.isArray(obj.hooks))) {
      result.valid = false;
      result.errors.push({
        field: 'hooks',
        message: 'Field "hooks" must be an object mapping event names to action arrays',
        severity: 'error'
      });
    }

    if ('scripts' in obj && (typeof obj.scripts !== 'object' || Array.isArray(obj.scripts))) {
      result.valid = false;
      result.errors.push({
        field: 'scripts',
        message: 'Field "scripts" must be an object mapping names to paths',
        severity: 'error'
      });
    }

    if ('scope' in obj) {
      const validScopes = ['daemon', 'interactive', 'both'];
      if (typeof obj.scope !== 'string' || !validScopes.includes(obj.scope)) {
        result.valid = false;
        result.errors.push({
          field: 'scope',
          message: `Field "scope" must be one of: ${validScopes.join(', ')}`,
          severity: 'error'
        });
      }
    }

    // Completeness warnings
    if (!('triggers' in obj) && !('hooks' in obj)) {
      result.warnings.push({
        field: 'triggers/hooks',
        message: 'Behavior has neither triggers nor hooks — it cannot be activated',
      });
    }

    if ('hooks' in obj && !('scripts' in obj)) {
      result.warnings.push({
        field: 'scripts',
        message: 'Behavior has hooks but no scripts — hooks will have no effect',
      });
    }

    return result;
  }

  /**
   * Validate required fields are present and non-empty
   *
   * @param manifest - Validated manifest object
   * @returns Array of validation errors
   */
  validateRequiredFields(manifest: PluginManifest): ValidationError[] {
    const errors: ValidationError[] = [];

    // Name validation
    if (!manifest.name || manifest.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Field "name" cannot be empty',
        severity: 'error'
      });
    }

    // Description validation
    if (!manifest.description || manifest.description.trim() === '') {
      errors.push({
        field: 'description',
        message: 'Field "description" cannot be empty',
        severity: 'error'
      });
    }

    // Files validation (should have at least one file for agent/command types)
    if (manifest.type === 'agent' || manifest.type === 'command') {
      if (!manifest.files || manifest.files.length === 0) {
        errors.push({
          field: 'files',
          message: `Field "files" is required for type "${manifest.type}"`,
          severity: 'error'
        });
      }
    }

    // Behavior-specific validation (#609, #1025)
    // Canonical shape per #1025: behavior fields nest under `metadata:`.
    // The daemon loader (tools/daemon/behavior-loader.mjs) reads
    // metadata.scope and metadata.triggers (plural).
    if (manifest.type === 'behavior') {
      const meta = manifest.metadata as Record<string, unknown> | undefined;
      if (!meta || !('triggers' in meta)) {
        errors.push({
          field: 'metadata.triggers',
          message: 'Behavior must declare a triggers array in metadata',
          severity: 'error'
        });
      }
      if (!meta?.scope) {
        errors.push({
          field: 'metadata.scope',
          message: 'Behavior should declare scope (daemon, interactive, or both)',
          severity: 'warning' as const
        });
      }
    }

    return errors;
  }

  /**
   * Validate version string is valid semver
   *
   * @param version - Version string to validate
   * @returns Array of validation errors
   */
  validateVersion(version: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!version) {
      errors.push({
        field: 'version',
        message: 'Version is required',
        severity: 'error'
      });
      return errors;
    }

    // Check if valid semver
    const parsed = semver.valid(version);
    if (!parsed) {
      errors.push({
        field: 'version',
        message: `Invalid semantic version: "${version}". Must follow semver format (e.g., 1.0.0)`,
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Validate file references exist on filesystem
   *
   * @param manifest - Validated manifest object
   * @param basePath - Base directory path for resolving relative file paths
   * @returns Array of validation errors
   */
  async validateFileReferences(
    manifest: PluginManifest,
    basePath: string
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!manifest.files || manifest.files.length === 0) {
      return errors;
    }

    for (const file of manifest.files) {
      const filePath = path.resolve(basePath, file);

      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
          errors.push({
            field: 'files',
            path: file,
            message: `Referenced path is not a file: ${file}`,
            severity: 'error'
          });
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          errors.push({
            field: 'files',
            path: file,
            message: `Referenced file does not exist: ${file}`,
            severity: 'error'
          });
        } else {
          errors.push({
            field: 'files',
            path: file,
            message: `Failed to access file "${file}": ${error.message}`,
            severity: 'error'
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate dependency version ranges
   *
   * @param dependencies - Dependency map with version ranges
   * @returns Array of validation errors
   */
  validateDependencies(dependencies: Record<string, string>): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [name, versionRange] of Object.entries(dependencies)) {
      if (!name || name.trim() === '') {
        errors.push({
          field: 'dependencies',
          message: 'Dependency name cannot be empty',
          severity: 'error'
        });
        continue;
      }

      if (!versionRange || versionRange.trim() === '') {
        errors.push({
          field: 'dependencies',
          path: name,
          message: `Dependency "${name}" has empty version range`,
          severity: 'error'
        });
        continue;
      }

      // Validate semver range
      const validRange = semver.validRange(versionRange);
      if (!validRange) {
        errors.push({
          field: 'dependencies',
          path: name,
          message: `Dependency "${name}" has invalid version range: "${versionRange}"`,
          severity: 'error'
        });
      }
    }

    return errors;
  }

  /**
   * Check metadata completeness and provide warnings
   *
   * @param manifest - Validated manifest object
   * @returns Array of warnings
   */
  checkMetadataCompleteness(manifest: PluginManifest): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Agent-specific warnings
    if (manifest.type === 'agent') {
      if (!manifest.model) {
        warnings.push({
          field: 'model',
          message: 'Agent should specify a "model" field (e.g., "sonnet", "gpt-4")'
        });
      }

      if (!manifest.tools) {
        warnings.push({
          field: 'tools',
          message: 'Agent should specify a "tools" field listing available tools'
        });
      }
    }

    // Framework recommendation
    if (!manifest.framework) {
      warnings.push({
        field: 'framework',
        message: 'Consider specifying a "framework" field for better organization'
      });
    }

    // Empty metadata object
    if (manifest.metadata && Object.keys(manifest.metadata).length === 0) {
      warnings.push({
        field: 'metadata',
        message: 'Metadata object is empty, consider removing or populating it'
      });
    }

    return warnings;
  }

  /**
   * Validate memory.topology contract if declared
   *
   * Checks that declared paths follow .aiwg/ convention and required fields
   * are present when topology is declared.
   *
   * @see ADR-021 — Semantic memory kernel architecture
   */
  validateMemoryTopology(manifest: PluginManifest): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const memory = (manifest as unknown as Record<string, unknown>).memory as Record<string, unknown> | undefined;
    if (!memory) return warnings;

    const topology = memory.topology as Record<string, unknown> | undefined;
    if (!topology) return warnings;

    const VALID_CROSS_REF_STYLES = ['at-mention', 'wikilink', 'markdown-link', 'yaml-ref'];

    // Required topology fields
    const requiredFields = ['namespace', 'rawSources', 'derivedPages', 'index', 'log', 'crossRefStyle'];
    for (const field of requiredFields) {
      if (!(field in topology)) {
        warnings.push({
          field: `memory.topology.${field}`,
          message: `Missing required topology field: ${field}`,
        });
      }
    }

    // Namespace must start with .aiwg/
    if (typeof topology.namespace === 'string' && !topology.namespace.startsWith('.aiwg/')) {
      warnings.push({
        field: 'memory.topology.namespace',
        message: `Topology namespace should start with ".aiwg/" (got "${topology.namespace}")`,
      });
    }

    // crossRefStyle must be a valid enum value
    if (typeof topology.crossRefStyle === 'string' && !VALID_CROSS_REF_STYLES.includes(topology.crossRefStyle)) {
      warnings.push({
        field: 'memory.topology.crossRefStyle',
        message: `Invalid crossRefStyle "${topology.crossRefStyle}". Valid: ${VALID_CROSS_REF_STYLES.join(', ')}`,
      });
    }

    // derivedPages must be a non-empty object
    if (topology.derivedPages) {
      if (typeof topology.derivedPages !== 'object' || Array.isArray(topology.derivedPages)) {
        warnings.push({
          field: 'memory.topology.derivedPages',
          message: 'derivedPages must be an object mapping category names to directory paths',
        });
      } else if (Object.keys(topology.derivedPages as object).length === 0) {
        warnings.push({
          field: 'memory.topology.derivedPages',
          message: 'derivedPages is empty — at least one page category should be declared',
        });
      }
    }

    // lintRules should be an array of strings if present
    if ('lintRules' in topology && topology.lintRules !== undefined) {
      if (!Array.isArray(topology.lintRules)) {
        warnings.push({
          field: 'memory.topology.lintRules',
          message: 'lintRules must be an array of rule ID strings',
        });
      }
    }

    // ingestRequires should be an array of strings if present
    if ('ingestRequires' in topology && topology.ingestRequires !== undefined) {
      if (!Array.isArray(topology.ingestRequires)) {
        warnings.push({
          field: 'memory.topology.ingestRequires',
          message: 'ingestRequires must be an array of capability strings',
        });
      }
    }

    return warnings;
  }

  /**
   * Validate all manifests in a directory
   *
   * @param dirPath - Directory path to scan
   * @param recursive - Whether to scan subdirectories recursively
   * @returns Map of file paths to validation results
   */
  async validateDirectory(
    dirPath: string,
    recursive: boolean = false
  ): Promise<BatchValidationResult> {
    const results = new Map<string, ValidationResult>();

    try {
      const manifestFiles = await this.findManifestFiles(dirPath, recursive);

      for (const manifestPath of manifestFiles) {
        const result = await this.validateFile(manifestPath);
        results.set(manifestPath, result);
      }

      return results;
    } catch (error: any) {
      // Return empty results with error for the directory itself
      const errorResult: ValidationResult = {
        valid: false,
        errors: [{
          path: dirPath,
          message: `Failed to scan directory: ${error.message}`,
          severity: 'error'
        }],
        warnings: []
      };
      results.set(dirPath, errorResult);
      return results;
    }
  }

  /**
   * Generate validation report in specified format
   *
   * @param results - Batch validation results
   * @param format - Report format (text or json)
   * @returns Formatted report string
   */
  generateReport(results: BatchValidationResult, format: ReportFormat = 'text'): string {
    if (format === 'json') {
      return this.generateJsonReport(results);
    }
    return this.generateTextReport(results);
  }

  /**
   * Parse YAML frontmatter from manifest content
   *
   * @param content - File content
   * @param result - Validation result to populate with errors
   * @returns Parsed manifest or null if parsing failed
   */
  private parseFrontmatter(content: string, result: ValidationResult): PluginManifest | null {
    try {
      // Extract YAML frontmatter between --- delimiters
      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);

      if (!frontmatterMatch) {
        result.errors.push({
          message: 'No YAML frontmatter found. Manifest must start with --- delimiter',
          severity: 'error',
          line: 1
        });
        return null;
      }

      const yamlContent = frontmatterMatch[1];
      const parsed = yaml.load(yamlContent) as PluginManifest;

      return parsed;
    } catch (error: any) {
      result.errors.push({
        message: `Failed to parse YAML: ${error.message}`,
        severity: 'error',
        line: error.mark?.line
      });
      return null;
    }
  }

  /**
   * Find all manifest.md, BEHAVIOR.md, and SKILL.md files in a directory.
   *
   * Each filename routes to a different schema in {@link validateManifest}:
   * - manifest.md — plugin manifest schema (requires version, type)
   * - BEHAVIOR.md — behavior schema (triggers/hooks)
   * - SKILL.md — skill frontmatter schema (name, description, …)
   *
   * @param dirPath - Directory to search
   * @param recursive - Whether to search subdirectories
   * @returns Array of absolute artifact file paths
   */
  private async findManifestFiles(dirPath: string, recursive: boolean): Promise<string[]> {
    const manifestFiles: string[] = [];

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory() && recursive) {
        const subManifests = await this.findManifestFiles(fullPath, recursive);
        manifestFiles.push(...subManifests);
      } else if (entry.isFile() && (
        entry.name === 'manifest.md' ||
        entry.name === 'BEHAVIOR.md' ||
        entry.name === 'SKILL.md'
      )) {
        manifestFiles.push(fullPath);
      }
    }

    return manifestFiles;
  }

  /**
   * Generate text format report
   *
   * @param results - Batch validation results
   * @returns Formatted text report
   */
  private generateTextReport(results: BatchValidationResult): string {
    const lines: string[] = [];

    // Header
    lines.push('Plugin Metadata Validation Report');
    lines.push('='.repeat(50));
    lines.push('');

    // Summary statistics
    const total = results.size;
    const passed = Array.from(results.values()).filter(r => r.valid).length;
    const failed = total - passed;
    const totalErrors = Array.from(results.values()).reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = Array.from(results.values()).reduce((sum, r) => sum + r.warnings.length, 0);

    lines.push('Summary:');
    lines.push(`  Total Manifests: ${total}`);
    lines.push(`  Passed:          ${passed}`);
    lines.push(`  Failed:          ${failed}`);
    lines.push(`  Total Errors:    ${totalErrors}`);
    lines.push(`  Total Warnings:  ${totalWarnings}`);
    lines.push('');

    // Individual results
    lines.push('Results:');
    lines.push('-'.repeat(50));

    for (const [filePath, result] of results) {
      const status = result.valid ? '✓ PASS' : '✗ FAIL';
      lines.push(`\n${status} ${filePath}`);

      if (result.manifest) {
        lines.push(`  Name:    ${result.manifest.name}`);
        lines.push(`  Version: ${result.manifest.version}`);
        lines.push(`  Type:    ${result.manifest.type}`);
      }

      if (result.errors.length > 0) {
        lines.push('  Errors:');
        for (const error of result.errors) {
          const location = error.field ? `[${error.field}]` : '';
          const line = error.line ? `:${error.line}` : '';
          lines.push(`    ✗ ${location}${line} ${error.message}`);
        }
      }

      if (result.warnings.length > 0) {
        lines.push('  Warnings:');
        for (const warning of result.warnings) {
          const location = warning.field ? `[${warning.field}]` : '';
          lines.push(`    ⚠ ${location} ${warning.message}`);
        }
      }
    }

    lines.push('');
    lines.push('='.repeat(50));

    return lines.join('\n');
  }

  /**
   * Generate JSON format report
   *
   * @param results - Batch validation results
   * @returns JSON string
   */
  private generateJsonReport(results: BatchValidationResult): string {
    const data = {
      summary: {
        total: results.size,
        passed: Array.from(results.values()).filter(r => r.valid).length,
        failed: Array.from(results.values()).filter(r => !r.valid).length,
        totalErrors: Array.from(results.values()).reduce((sum, r) => sum + r.errors.length, 0),
        totalWarnings: Array.from(results.values()).reduce((sum, r) => sum + r.warnings.length, 0)
      },
      results: Array.from(results.entries()).map(([path, result]) => ({
        path,
        valid: result.valid,
        manifest: result.manifest,
        errors: result.errors,
        warnings: result.warnings
      }))
    };

    return JSON.stringify(data, null, 2);
  }
}
