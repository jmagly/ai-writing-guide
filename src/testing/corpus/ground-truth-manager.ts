/**
 * Ground Truth Corpus Manager
 *
 * Manages multiple corpus types for NFR validation with versioning,
 * schema validation, and statistics reporting.
 *
 * Supports 5 corpus types:
 * - ai-vs-human: AI vs human writing classification
 * - codebases: Codebase metadata validation
 * - traceability: Requirements traceability links
 * - security-attacks: Known attack pattern detection
 * - template-recommendations: Template selection scenarios
 *
 * @module testing/corpus/ground-truth-manager
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Corpus types supported by the system
 */
export type CorpusType =
  | 'ai-vs-human'
  | 'codebases'
  | 'traceability'
  | 'security-attacks'
  | 'template-recommendations';

/**
 * Version constraint (semver or 'latest')
 */
export type VersionConstraint = string;

/**
 * Ground truth item with labeled data
 */
export interface GroundTruthItem {
  /** Unique item identifier */
  id: string;
  /** Item content or reference */
  content: string | Record<string, unknown>;
  /** Ground truth label */
  groundTruth: unknown;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Corpus manifest structure
 */
export interface CorpusManifest {
  /** Corpus name */
  name: string;
  /** Corpus type */
  type: CorpusType;
  /** Semantic version */
  version: string;
  /** Description */
  description: string;
  /** Creation date (ISO 8601) */
  createdAt: string;
  /** Last update date (ISO 8601) */
  updatedAt: string;
  /** Number of items */
  itemCount: number;
  /** Schema for ground truth labels */
  schema: CorpusSchema;
  /** Label distribution statistics */
  labelDistribution: Record<string, number>;
  /** Associated NFRs */
  linkedNFRs: string[];
  /** Data files */
  dataFiles: string[];
}

/**
 * Schema definition for corpus validation
 */
export interface CorpusSchema {
  /** Ground truth type */
  groundTruthType: 'boolean' | 'string' | 'number' | 'object' | 'array';
  /** Required fields for ground truth object */
  requiredFields?: string[];
  /** Valid enum values (for string type) */
  enumValues?: string[];
  /** Description of expected format */
  formatDescription: string;
}

/**
 * Corpus statistics
 */
export interface CorpusStatistics {
  /** Corpus type */
  type: CorpusType;
  /** Corpus version */
  version: string;
  /** Total items */
  totalItems: number;
  /** Label distribution */
  labelDistribution: Record<string, number>;
  /** Linked NFRs */
  linkedNFRs: string[];
  /** Last updated */
  lastUpdated: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether corpus is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

/**
 * Comparison result for ground truth validation
 */
export interface ComparisonResult {
  /** Item ID */
  itemId: string;
  /** Expected ground truth */
  expected: unknown;
  /** Actual value */
  actual: unknown;
  /** Whether they match */
  matches: boolean;
  /** Confidence score (0-1) if applicable */
  confidence?: number;
}

/**
 * GroundTruthCorpusManager - Manage multiple ground truth corpora
 *
 * @example
 * ```typescript
 * const manager = new GroundTruthCorpusManager('./tests/fixtures/corpora');
 * await manager.initialize();
 *
 * // Load specific corpus
 * const corpus = await manager.loadCorpus('ai-vs-human', '1.0.0');
 *
 * // Get ground truth for item
 * const truth = manager.getGroundTruth('ai-vs-human', 'item-001');
 *
 * // Validate against ground truth
 * const result = manager.validateAgainstGroundTruth('ai-vs-human', 'item-001', actualValue);
 * ```
 */
export class GroundTruthCorpusManager {
  private corporaRoot: string;
  private manifests: Map<string, CorpusManifest> = new Map();
  private loadedCorpora: Map<string, Map<string, GroundTruthItem>> = new Map();
  private initialized: boolean = false;

  constructor(corporaRoot: string = './tests/fixtures/corpora') {
    this.corporaRoot = corporaRoot;
  }

  /**
   * Initialize manager and discover available corpora
   */
  async initialize(): Promise<void> {
    this.manifests.clear();
    this.loadedCorpora.clear();

    try {
      await fs.access(this.corporaRoot);
    } catch {
      // Create directory structure if it doesn't exist
      await this.createDirectoryStructure();
    }

    // Discover manifests
    await this.discoverManifests();
    this.initialized = true;
  }

  /**
   * Create the corpora directory structure
   */
  private async createDirectoryStructure(): Promise<void> {
    const dirs = [
      'manifests',
      'data/ai-vs-human',
      'data/codebases',
      'data/traceability',
      'data/security-attacks',
      'data/template-recommendations'
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(this.corporaRoot, dir), { recursive: true });
    }
  }

  /**
   * Discover available corpus manifests
   */
  private async discoverManifests(): Promise<void> {
    const manifestsDir = path.join(this.corporaRoot, 'manifests');

    try {
      const files = await fs.readdir(manifestsDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const manifestPath = path.join(manifestsDir, file);
          try {
            const content = await fs.readFile(manifestPath, 'utf-8');
            const manifest: CorpusManifest = JSON.parse(content);
            const key = this.getCorpusKey(manifest.type, manifest.version);
            this.manifests.set(key, manifest);
          } catch (error) {
            // Skip invalid manifests
            console.warn(`Warning: Could not parse manifest ${file}`);
          }
        }
      }
    } catch {
      // Manifests directory doesn't exist yet
    }
  }

  /**
   * Get corpus key for map lookup
   */
  private getCorpusKey(type: CorpusType, version: string): string {
    return `${type}@${version}`;
  }

  /**
   * Load a corpus by type and version
   *
   * @param type - Corpus type
   * @param version - Semantic version or 'latest'
   * @returns Loaded corpus items
   */
  async loadCorpus(type: CorpusType, version: VersionConstraint = 'latest'): Promise<Map<string, GroundTruthItem>> {
    if (!this.initialized) {
      await this.initialize();
    }

    const resolvedVersion = version === 'latest'
      ? this.getLatestVersion(type)
      : version;

    if (!resolvedVersion) {
      throw new Error(`No corpus found for type: ${type}`);
    }

    const key = this.getCorpusKey(type, resolvedVersion);

    // Check if already loaded
    if (this.loadedCorpora.has(key)) {
      return this.loadedCorpora.get(key)!;
    }

    // Load from manifest
    const manifest = this.manifests.get(key);
    if (!manifest) {
      throw new Error(`Corpus not found: ${type}@${resolvedVersion}`);
    }

    // Load data files
    const items = new Map<string, GroundTruthItem>();
    for (const dataFile of manifest.dataFiles) {
      const dataPath = path.join(this.corporaRoot, 'data', type, dataFile);
      try {
        const content = await fs.readFile(dataPath, 'utf-8');
        const data: GroundTruthItem[] = JSON.parse(content);

        for (const item of data) {
          items.set(item.id, item);
        }
      } catch (error) {
        throw new Error(`Failed to load corpus data file: ${dataFile}`);
      }
    }

    this.loadedCorpora.set(key, items);
    return items;
  }

  /**
   * Get the latest version for a corpus type
   */
  private getLatestVersion(type: CorpusType): string | null {
    const versions: string[] = [];

    for (const [_key, manifest] of this.manifests) {
      if (manifest.type === type) {
        versions.push(manifest.version);
      }
    }

    if (versions.length === 0) {
      return null;
    }

    // Sort by semver
    versions.sort((a, b) => this.compareSemver(b, a));
    return versions[0];
  }

  /**
   * Compare semver versions
   */
  private compareSemver(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (partsA[i] > partsB[i]) return 1;
      if (partsA[i] < partsB[i]) return -1;
    }

    return 0;
  }

  /**
   * Get ground truth for a specific item
   *
   * @param type - Corpus type
   * @param itemId - Item identifier
   * @param version - Version constraint
   * @returns Ground truth value
   */
  async getGroundTruth(type: CorpusType, itemId: string, version: VersionConstraint = 'latest'): Promise<unknown> {
    const corpus = await this.loadCorpus(type, version);
    const item = corpus.get(itemId);

    if (!item) {
      throw new Error(`Item not found: ${itemId} in corpus ${type}`);
    }

    return item.groundTruth;
  }

  /**
   * Validate actual value against ground truth
   *
   * @param type - Corpus type
   * @param itemId - Item identifier
   * @param actualValue - Value to compare
   * @param version - Version constraint
   * @returns Comparison result
   */
  async validateAgainstGroundTruth(
    type: CorpusType,
    itemId: string,
    actualValue: unknown,
    version: VersionConstraint = 'latest'
  ): Promise<ComparisonResult> {
    const groundTruth = await this.getGroundTruth(type, itemId, version);

    const matches = this.deepEquals(groundTruth, actualValue);

    return {
      itemId,
      expected: groundTruth,
      actual: actualValue,
      matches
    };
  }

  /**
   * Deep equality check
   */
  private deepEquals(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, i) => this.deepEquals(val, b[i]));
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a as object);
      const keysB = Object.keys(b as object);

      if (keysA.length !== keysB.length) return false;

      return keysA.every(key =>
        this.deepEquals((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
      );
    }

    return false;
  }

  /**
   * Get corpus statistics
   *
   * @param type - Corpus type
   * @param version - Version constraint
   * @returns Statistics object
   */
  async getCorpusStatistics(type: CorpusType, version: VersionConstraint = 'latest'): Promise<CorpusStatistics> {
    if (!this.initialized) {
      await this.initialize();
    }

    const resolvedVersion = version === 'latest'
      ? this.getLatestVersion(type)
      : version;

    if (!resolvedVersion) {
      throw new Error(`No corpus found for type: ${type}`);
    }

    const key = this.getCorpusKey(type, resolvedVersion);
    const manifest = this.manifests.get(key);

    if (!manifest) {
      throw new Error(`Corpus not found: ${type}@${resolvedVersion}`);
    }

    return {
      type: manifest.type,
      version: manifest.version,
      totalItems: manifest.itemCount,
      labelDistribution: manifest.labelDistribution,
      linkedNFRs: manifest.linkedNFRs,
      lastUpdated: manifest.updatedAt
    };
  }

  /**
   * Validate corpus schema and completeness
   *
   * @param type - Corpus type
   * @param version - Version constraint
   * @returns Validation result
   */
  async validateCorpus(type: CorpusType, version: VersionConstraint = 'latest'): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const corpus = await this.loadCorpus(type, version);
      const resolvedVersion = version === 'latest'
        ? this.getLatestVersion(type)!
        : version;

      const key = this.getCorpusKey(type, resolvedVersion);
      const manifest = this.manifests.get(key)!;

      // Check item count matches
      if (corpus.size !== manifest.itemCount) {
        errors.push(`Item count mismatch: manifest says ${manifest.itemCount}, actual is ${corpus.size}`);
      }

      // Validate each item against schema
      for (const [id, item] of corpus) {
        const itemErrors = this.validateItem(item, manifest.schema);
        for (const error of itemErrors) {
          errors.push(`Item ${id}: ${error}`);
        }
      }

      // Check for duplicate IDs (already handled by Map)

      // Warn if corpus is small
      if (corpus.size < 10) {
        warnings.push(`Corpus has only ${corpus.size} items - may not be statistically significant`);
      }

    } catch (error) {
      errors.push(`Failed to load corpus: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a single item against schema
   */
  private validateItem(item: GroundTruthItem, schema: CorpusSchema): string[] {
    const errors: string[] = [];

    // Check required item fields
    if (!item.id) {
      errors.push('Missing required field: id');
    }
    if (item.content === undefined) {
      errors.push('Missing required field: content');
    }
    if (item.groundTruth === undefined) {
      errors.push('Missing required field: groundTruth');
    }

    // Validate ground truth type
    const gtType = typeof item.groundTruth;
    if (schema.groundTruthType === 'boolean' && gtType !== 'boolean') {
      errors.push(`Ground truth should be boolean, got ${gtType}`);
    }
    if (schema.groundTruthType === 'string' && gtType !== 'string') {
      errors.push(`Ground truth should be string, got ${gtType}`);
    }
    if (schema.groundTruthType === 'number' && gtType !== 'number') {
      errors.push(`Ground truth should be number, got ${gtType}`);
    }
    if (schema.groundTruthType === 'object' && (gtType !== 'object' || Array.isArray(item.groundTruth))) {
      errors.push(`Ground truth should be object, got ${gtType}`);
    }
    if (schema.groundTruthType === 'array' && !Array.isArray(item.groundTruth)) {
      errors.push(`Ground truth should be array, got ${gtType}`);
    }

    // Check required fields for object type
    if (schema.groundTruthType === 'object' && schema.requiredFields && typeof item.groundTruth === 'object') {
      for (const field of schema.requiredFields) {
        if (!(field in (item.groundTruth as object))) {
          errors.push(`Ground truth missing required field: ${field}`);
        }
      }
    }

    // Check enum values for string type
    if (schema.groundTruthType === 'string' && schema.enumValues && typeof item.groundTruth === 'string') {
      if (!schema.enumValues.includes(item.groundTruth)) {
        errors.push(`Ground truth value '${item.groundTruth}' not in allowed values: ${schema.enumValues.join(', ')}`);
      }
    }

    return errors;
  }

  /**
   * List all available corpora
   *
   * @returns Array of corpus type and version pairs
   */
  async listCorpora(): Promise<Array<{ type: CorpusType; version: string }>> {
    if (!this.initialized) {
      await this.initialize();
    }

    const result: Array<{ type: CorpusType; version: string }> = [];

    for (const manifest of this.manifests.values()) {
      result.push({
        type: manifest.type,
        version: manifest.version
      });
    }

    return result.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      return this.compareSemver(b.version, a.version);
    });
  }

  /**
   * Check if a corpus exists
   *
   * @param type - Corpus type
   * @param version - Version constraint
   * @returns True if corpus exists
   */
  async hasCorpus(type: CorpusType, version: VersionConstraint = 'latest'): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (version === 'latest') {
      return this.getLatestVersion(type) !== null;
    }

    const key = this.getCorpusKey(type, version);
    return this.manifests.has(key);
  }

  /**
   * Get all items from a corpus
   *
   * @param type - Corpus type
   * @param version - Version constraint
   * @returns Array of all items
   */
  async getAllItems(type: CorpusType, version: VersionConstraint = 'latest'): Promise<GroundTruthItem[]> {
    const corpus = await this.loadCorpus(type, version);
    return Array.from(corpus.values());
  }

  /**
   * Batch validate multiple items against ground truth
   *
   * @param type - Corpus type
   * @param predictions - Map of itemId to predicted value
   * @param version - Version constraint
   * @returns Array of comparison results with overall statistics
   */
  async batchValidate(
    type: CorpusType,
    predictions: Map<string, unknown>,
    version: VersionConstraint = 'latest'
  ): Promise<{
    results: ComparisonResult[];
    accuracy: number;
    totalCorrect: number;
    totalItems: number;
  }> {
    const results: ComparisonResult[] = [];
    let totalCorrect = 0;

    for (const [itemId, actualValue] of predictions) {
      try {
        const result = await this.validateAgainstGroundTruth(type, itemId, actualValue, version);
        results.push(result);
        if (result.matches) {
          totalCorrect++;
        }
      } catch {
        results.push({
          itemId,
          expected: undefined,
          actual: actualValue,
          matches: false
        });
      }
    }

    return {
      results,
      accuracy: results.length > 0 ? totalCorrect / results.length : 0,
      totalCorrect,
      totalItems: results.length
    };
  }

  /**
   * Get the corpora root path
   */
  getRoot(): string {
    return this.corporaRoot;
  }
}
