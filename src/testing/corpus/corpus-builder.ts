/**
 * Corpus Builder
 *
 * Utility for creating and exporting ground truth corpora with validation.
 *
 * @module testing/corpus/corpus-builder
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  CorpusType,
  CorpusManifest,
  CorpusSchema,
  GroundTruthItem,
  ValidationResult
} from './ground-truth-manager.js';

/**
 * Builder options
 */
export interface CorpusBuilderOptions {
  /** Corpus type */
  type: CorpusType;
  /** Corpus name */
  name: string;
  /** Corpus description */
  description: string;
  /** Schema for ground truth validation */
  schema: CorpusSchema;
  /** Linked NFRs */
  linkedNFRs: string[];
}

/**
 * Export options
 */
export interface ExportOptions {
  /** Output directory */
  outputDir: string;
  /** Version string (semver) */
  version: string;
  /** Maximum items per data file */
  maxItemsPerFile?: number;
}

/**
 * CorpusBuilder - Build and export ground truth corpora
 *
 * @example
 * ```typescript
 * const builder = new CorpusBuilder({
 *   type: 'ai-vs-human',
 *   name: 'AI vs Human Writing Corpus',
 *   description: 'Labeled corpus for AI pattern detection validation',
 *   schema: {
 *     groundTruthType: 'boolean',
 *     formatDescription: 'true for AI-generated, false for human-written'
 *   },
 *   linkedNFRs: ['NFR-ACC-001']
 * });
 *
 * // Add items
 * builder.addItem({
 *   id: 'doc-001',
 *   content: 'This is a sample document...',
 *   groundTruth: true, // AI-generated
 *   metadata: { source: 'gpt-4' }
 * });
 *
 * // Validate and export
 * const validation = builder.validate();
 * if (validation.valid) {
 *   await builder.export({
 *     outputDir: './tests/fixtures/corpora',
 *     version: '1.0.0'
 *   });
 * }
 * ```
 */
export class CorpusBuilder {
  private options: CorpusBuilderOptions;
  private items: Map<string, GroundTruthItem> = new Map();

  constructor(options: CorpusBuilderOptions) {
    this.options = options;
  }

  /**
   * Add an item to the corpus
   *
   * @param item - Ground truth item
   * @throws {Error} If item ID already exists
   */
  addItem(item: GroundTruthItem): void {
    if (this.items.has(item.id)) {
      throw new Error(`Duplicate item ID: ${item.id}`);
    }
    this.items.set(item.id, item);
  }

  /**
   * Add multiple items to the corpus
   *
   * @param items - Array of ground truth items
   */
  addItems(items: GroundTruthItem[]): void {
    for (const item of items) {
      this.addItem(item);
    }
  }

  /**
   * Remove an item from the corpus
   *
   * @param itemId - Item identifier
   * @returns True if item was removed
   */
  removeItem(itemId: string): boolean {
    return this.items.delete(itemId);
  }

  /**
   * Get an item by ID
   *
   * @param itemId - Item identifier
   * @returns Item or undefined
   */
  getItem(itemId: string): GroundTruthItem | undefined {
    return this.items.get(itemId);
  }

  /**
   * Get all items
   *
   * @returns Array of all items
   */
  getAllItems(): GroundTruthItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Get item count
   */
  getItemCount(): number {
    return this.items.size;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items.clear();
  }

  /**
   * Validate the corpus
   *
   * @returns Validation result
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum items
    if (this.items.size === 0) {
      errors.push('Corpus is empty');
    } else if (this.items.size < 10) {
      warnings.push(`Corpus has only ${this.items.size} items - may not be statistically significant`);
    }

    // Validate each item against schema
    for (const [id, item] of this.items) {
      const itemErrors = this.validateItem(item);
      for (const error of itemErrors) {
        errors.push(`Item ${id}: ${error}`);
      }
    }

    // Check label distribution
    const distribution = this.calculateLabelDistribution();
    const labels = Object.keys(distribution);

    if (labels.length === 1 && this.items.size > 1) {
      warnings.push('All items have the same label - corpus may not be useful for validation');
    }

    // Check for severe class imbalance
    if (labels.length > 1) {
      const counts = Object.values(distribution);
      const max = Math.max(...counts);
      const min = Math.min(...counts);

      if (max > min * 10) {
        warnings.push('Severe class imbalance detected - largest class is 10x+ larger than smallest');
      }
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
  private validateItem(item: GroundTruthItem): string[] {
    const errors: string[] = [];
    const schema = this.options.schema;

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
   * Calculate label distribution
   */
  private calculateLabelDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const item of this.items.values()) {
      const label = String(item.groundTruth);
      distribution[label] = (distribution[label] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Export corpus to files
   *
   * @param options - Export options
   * @throws {Error} If corpus is invalid
   */
  async export(options: ExportOptions): Promise<void> {
    // Validate first
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`Cannot export invalid corpus: ${validation.errors.join(', ')}`);
    }

    const maxItemsPerFile = options.maxItemsPerFile || 1000;
    const items = this.getAllItems();

    // Create directories
    const manifestDir = path.join(options.outputDir, 'manifests');
    const dataDir = path.join(options.outputDir, 'data', this.options.type);

    await fs.mkdir(manifestDir, { recursive: true });
    await fs.mkdir(dataDir, { recursive: true });

    // Split items into files
    const dataFiles: string[] = [];
    const chunks = this.chunkArray(items, maxItemsPerFile);

    for (let i = 0; i < chunks.length; i++) {
      const fileName = chunks.length === 1
        ? `${this.options.type}-v${options.version}.json`
        : `${this.options.type}-v${options.version}-part${i + 1}.json`;

      const filePath = path.join(dataDir, fileName);
      await fs.writeFile(filePath, JSON.stringify(chunks[i], null, 2), 'utf-8');
      dataFiles.push(fileName);
    }

    // Create manifest
    const manifest: CorpusManifest = {
      name: this.options.name,
      type: this.options.type,
      version: options.version,
      description: this.options.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      itemCount: items.length,
      schema: this.options.schema,
      labelDistribution: this.calculateLabelDistribution(),
      linkedNFRs: this.options.linkedNFRs,
      dataFiles
    };

    const manifestPath = path.join(manifestDir, `${this.options.type}-v${options.version}.json`);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }

    return chunks;
  }

  /**
   * Import items from existing JSON file
   *
   * @param filePath - Path to JSON file
   * @throws {Error} If file cannot be read or parsed
   */
  async importFromFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (Array.isArray(data)) {
      this.addItems(data);
    } else if (data.items && Array.isArray(data.items)) {
      this.addItems(data.items);
    } else {
      throw new Error('Invalid file format: expected array of items or object with items array');
    }
  }

  /**
   * Get corpus statistics
   */
  getStatistics(): {
    itemCount: number;
    labelDistribution: Record<string, number>;
    type: CorpusType;
  } {
    return {
      itemCount: this.items.size,
      labelDistribution: this.calculateLabelDistribution(),
      type: this.options.type
    };
  }
}

/**
 * Pre-configured builder factories for each corpus type
 */
export const CorpusBuilders = {
  /**
   * Create AI vs Human writing corpus builder
   */
  aiVsHuman(): CorpusBuilder {
    return new CorpusBuilder({
      type: 'ai-vs-human',
      name: 'AI vs Human Writing Corpus',
      description: 'Labeled documents for AI pattern detection validation',
      schema: {
        groundTruthType: 'boolean',
        formatDescription: 'true for AI-generated, false for human-written'
      },
      linkedNFRs: ['NFR-ACC-001']
    });
  },

  /**
   * Create codebase metadata corpus builder
   */
  codebases(): CorpusBuilder {
    return new CorpusBuilder({
      type: 'codebases',
      name: 'Codebase Metadata Corpus',
      description: 'Codebases with verified metadata for intake validation',
      schema: {
        groundTruthType: 'object',
        requiredFields: ['language', 'framework', 'techStack'],
        formatDescription: 'Object with language, framework, techStack fields'
      },
      linkedNFRs: ['NFR-ACC-002']
    });
  },

  /**
   * Create traceability links corpus builder
   */
  traceability(): CorpusBuilder {
    return new CorpusBuilder({
      type: 'traceability',
      name: 'Requirements Traceability Corpus',
      description: 'Requirements with verified traceability links',
      schema: {
        groundTruthType: 'object',
        requiredFields: ['requirementId', 'codeFiles', 'testFiles'],
        formatDescription: 'Object with requirementId, codeFiles array, testFiles array'
      },
      linkedNFRs: ['NFR-TRACE-05', 'NFR-TRACE-06']
    });
  },

  /**
   * Create security attacks corpus builder
   */
  securityAttacks(): CorpusBuilder {
    return new CorpusBuilder({
      type: 'security-attacks',
      name: 'Security Attack Patterns Corpus',
      description: 'Known attack patterns for security detection validation',
      schema: {
        groundTruthType: 'object',
        requiredFields: ['attackType', 'severity'],
        formatDescription: 'Object with attackType (sql-injection, xss, etc.) and severity (critical, high, medium, low)'
      },
      linkedNFRs: ['NFR-SEC-ACC-01']
    });
  },

  /**
   * Create template recommendations corpus builder
   */
  templateRecommendations(): CorpusBuilder {
    return new CorpusBuilder({
      type: 'template-recommendations',
      name: 'Template Recommendation Corpus',
      description: 'Scenarios with expected template recommendations',
      schema: {
        groundTruthType: 'array',
        formatDescription: 'Array of recommended template IDs'
      },
      linkedNFRs: ['NFR-TMPL-07']
    });
  }
};
