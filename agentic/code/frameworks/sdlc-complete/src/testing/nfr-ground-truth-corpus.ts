/**
 * NFR Ground Truth Corpus - Manage validated NFR measurement baselines
 *
 * Provides storage, retrieval, and statistical validation of ground truth
 * NFR measurements for accuracy testing and regression detection.
 *
 * Features:
 * - Store validated NFR measurement baselines
 * - Load/save corpus data (JSON format)
 * - Statistical queries (mean, median, percentiles)
 * - Measurement validation against baselines
 * - Category-based filtering and analysis
 * - Environment-specific baselines
 *
 * @module testing/nfr-ground-truth-corpus
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * NFR category types
 */
export type NFRCategory = 'Performance' | 'Accuracy' | 'Reliability' | 'Security' | 'Usability';

/**
 * Measurement data with statistical properties
 */
export interface Measurement {
  /** Measured value */
  value: number;
  /** Unit of measurement (e.g., 'ms', 'MB', 'percentage') */
  unit: string;
  /** Raw sample data (optional) */
  samples?: number[];
  /** Confidence level (0-1) */
  confidence: number;
}

/**
 * Metadata about measurement context
 */
export interface Metadata {
  /** Environment where measurement was taken */
  environment: string;
  /** System architecture */
  system: string;
  /** Node.js version */
  nodeVersion: string;
  /** Additional notes */
  notes?: string;
}

/**
 * Ground truth entry in corpus
 */
export interface GroundTruthEntry {
  /** Unique entry identifier */
  id: string;
  /** NFR identifier (e.g., 'NFR-PERF-001') */
  nfrId: string;
  /** NFR category */
  category: NFRCategory;
  /** Measurement data */
  measurement: Measurement;
  /** Measurement metadata */
  metadata: Metadata;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Human verification flag */
  verified: boolean;
}

/**
 * Statistical baseline summary
 */
export interface BaselineStats {
  /** NFR identifier */
  nfrId: string;
  /** Number of measurements */
  count: number;
  /** Arithmetic mean */
  mean: number;
  /** Median (50th percentile) */
  median: number;
  /** Standard deviation */
  stddev: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** 95th percentile */
  p95: number;
  /** 99th percentile */
  p99: number;
}

/**
 * Validation result comparing measurement to baseline
 */
export interface ValidationResult {
  /** Whether measurement passes validation */
  passes: boolean;
  /** Actual measured value */
  actualValue: number;
  /** Baseline value (mean) */
  baselineValue: number;
  /** Deviation from baseline (percentage) */
  deviation: number;
  /** Whether deviation is within tolerance */
  withinTolerance: boolean;
}

/**
 * Category statistics summary
 */
export interface CategoryStats {
  /** Category name */
  category: NFRCategory;
  /** Total entries in category */
  entryCount: number;
  /** Unique NFR IDs in category */
  uniqueNFRs: number;
  /** Average confidence across category */
  avgConfidence: number;
  /** Verification rate (percentage) */
  verificationRate: number;
}

/**
 * Serialized corpus format
 */
interface CorpusData {
  version: string;
  lastModified: string;
  entries: GroundTruthEntry[];
}

/**
 * NFRGroundTruthCorpus - Manage validated NFR measurement baselines
 *
 * @example
 * ```typescript
 * const corpus = new NFRGroundTruthCorpus('.aiwg/testing/nfr-ground-truth.json');
 * await corpus.load();
 *
 * // Add ground truth measurement
 * corpus.addEntry('NFR-PERF-001', {
 *   value: 42.5,
 *   unit: 'ms',
 *   confidence: 0.95
 * }, {
 *   environment: 'test',
 *   system: 'linux-x64',
 *   nodeVersion: 'v20.0.0'
 * });
 *
 * // Validate new measurement
 * const result = corpus.validateMeasurement('NFR-PERF-001', 45.2);
 * console.log(`Passes: ${result.passes}, Deviation: ${result.deviation.toFixed(2)}%`);
 *
 * await corpus.save();
 * ```
 */
export class NFRGroundTruthCorpus {
  private corpus: Map<string, GroundTruthEntry[]>;
  private corpusPath: string;
  private defaultTolerance: number = 0.10; // 10% deviation tolerance

  constructor(corpusPath?: string) {
    this.corpus = new Map();
    this.corpusPath = corpusPath ?? '.aiwg/testing/nfr-ground-truth.json';
  }

  /**
   * Load corpus from file
   *
   * @throws {Error} If file exists but cannot be parsed
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.corpusPath, 'utf-8');
      const corpusData: CorpusData = JSON.parse(data);

      this.corpus.clear();
      for (const entry of corpusData.entries) {
        if (!this.corpus.has(entry.nfrId)) {
          this.corpus.set(entry.nfrId, []);
        }
        this.corpus.get(entry.nfrId)!.push(entry);
      }
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        // File doesn't exist, start with empty corpus
        this.corpus.clear();
      } else {
        throw new Error(`Failed to load corpus: ${err.message}`);
      }
    }
  }

  /**
   * Save corpus to file
   *
   * @throws {Error} If file cannot be written
   */
  async save(): Promise<void> {
    const entries: GroundTruthEntry[] = [];
    for (const entryList of this.corpus.values()) {
      entries.push(...entryList);
    }

    const corpusData: CorpusData = {
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      entries,
    };

    // Ensure directory exists
    const dir = path.dirname(this.corpusPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(this.corpusPath, JSON.stringify(corpusData, null, 2), 'utf-8');
  }

  /**
   * Add ground truth entry to corpus
   *
   * @param nfrId - NFR identifier
   * @param measurement - Measurement data
   * @param metadata - Measurement metadata
   * @param category - NFR category (default: 'Performance')
   * @param verified - Human verification flag (default: false)
   */
  addEntry(
    nfrId: string,
    measurement: Measurement,
    metadata: Metadata,
    category: NFRCategory = 'Performance',
    verified: boolean = false
  ): void {
    const entry: GroundTruthEntry = {
      id: randomUUID(),
      nfrId,
      category,
      measurement,
      metadata,
      timestamp: new Date().toISOString(),
      verified,
    };

    if (!this.corpus.has(nfrId)) {
      this.corpus.set(nfrId, []);
    }

    this.corpus.get(nfrId)!.push(entry);
  }

  /**
   * Get all entries for a specific NFR
   *
   * @param nfrId - NFR identifier
   * @returns Array of ground truth entries
   */
  getEntries(nfrId: string): GroundTruthEntry[] {
    return this.corpus.get(nfrId) ?? [];
  }

  /**
   * Get all NFR IDs in corpus
   *
   * @returns Array of NFR identifiers
   */
  getAllNFRs(): string[] {
    return Array.from(this.corpus.keys()).sort();
  }

  /**
   * Remove specific entry from corpus
   *
   * @param nfrId - NFR identifier
   * @param entryId - Entry unique identifier
   * @returns true if entry was removed, false if not found
   */
  removeEntry(nfrId: string, entryId: string): boolean {
    const entries = this.corpus.get(nfrId);
    if (!entries) {
      return false;
    }

    const initialLength = entries.length;
    const filtered = entries.filter(e => e.id !== entryId);

    if (filtered.length === initialLength) {
      return false;
    }

    if (filtered.length === 0) {
      this.corpus.delete(nfrId);
    } else {
      this.corpus.set(nfrId, filtered);
    }

    return true;
  }

  /**
   * Calculate statistical baseline for NFR
   *
   * @param nfrId - NFR identifier
   * @returns Baseline statistics
   * @throws {Error} If no entries exist for NFR
   */
  getBaselineStats(nfrId: string): BaselineStats {
    const entries = this.corpus.get(nfrId);
    if (!entries || entries.length === 0) {
      throw new Error(`No ground truth entries found for NFR: ${nfrId}`);
    }

    const values = entries.map(e => e.measurement.value);
    const sorted = [...values].sort((a, b) => a - b);

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    // Calculate standard deviation (handle single-value case)
    let stddev: number;
    if (values.length === 1) {
      stddev = 0; // No variance with single measurement
    } else {
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
      stddev = Math.sqrt(variance);
    }

    return {
      nfrId,
      count: values.length,
      mean,
      median: this.calculatePercentile(sorted, 50),
      stddev,
      min: Math.min(...values),
      max: Math.max(...values),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99),
    };
  }

  /**
   * Validate measurement against baseline
   *
   * @param nfrId - NFR identifier
   * @param value - Measured value to validate
   * @param tolerance - Acceptable deviation (default: 0.10 = 10%)
   * @returns Validation result
   * @throws {Error} If no baseline exists
   */
  validateMeasurement(nfrId: string, value: number, tolerance?: number): ValidationResult {
    const stats = this.getBaselineStats(nfrId);
    const actualTolerance = tolerance ?? this.defaultTolerance;

    const deviation = Math.abs(value - stats.mean) / stats.mean;
    const withinTolerance = deviation <= actualTolerance;

    return {
      passes: withinTolerance,
      actualValue: value,
      baselineValue: stats.mean,
      deviation: deviation * 100, // Convert to percentage
      withinTolerance,
    };
  }

  /**
   * Get specific percentile value for NFR
   *
   * @param nfrId - NFR identifier
   * @param percentile - Percentile to calculate (0-100)
   * @returns Percentile value
   * @throws {Error} If no entries exist or percentile is invalid
   */
  getPercentile(nfrId: string, percentile: number): number {
    const entries = this.corpus.get(nfrId);
    if (!entries || entries.length === 0) {
      throw new Error(`No ground truth entries found for NFR: ${nfrId}`);
    }

    if (percentile < 0 || percentile > 100) {
      throw new Error('Percentile must be between 0 and 100');
    }

    const values = entries.map(e => e.measurement.value).sort((a, b) => a - b);
    return this.calculatePercentile(values, percentile);
  }

  /**
   * Get all entries by category
   *
   * @param category - NFR category to filter
   * @returns Array of entries in category
   */
  getEntriesByCategory(category: NFRCategory): GroundTruthEntry[] {
    const entries: GroundTruthEntry[] = [];
    for (const entryList of this.corpus.values()) {
      entries.push(...entryList.filter(e => e.category === category));
    }
    return entries;
  }

  /**
   * Get statistics by category
   *
   * @returns Map of category to statistics
   */
  getCategoriesStats(): Map<NFRCategory, CategoryStats> {
    const statsMap = new Map<NFRCategory, CategoryStats>();
    const categories: NFRCategory[] = ['Performance', 'Accuracy', 'Reliability', 'Security', 'Usability'];

    for (const category of categories) {
      const entries = this.getEntriesByCategory(category);
      if (entries.length === 0) {
        continue;
      }

      const uniqueNFRs = new Set(entries.map(e => e.nfrId)).size;
      const avgConfidence = entries.reduce((sum, e) => sum + e.measurement.confidence, 0) / entries.length;
      const verifiedCount = entries.filter(e => e.verified).length;
      const verificationRate = (verifiedCount / entries.length) * 100;

      statsMap.set(category, {
        category,
        entryCount: entries.length,
        uniqueNFRs,
        avgConfidence,
        verificationRate,
      });
    }

    return statsMap;
  }

  /**
   * Get entries by environment
   *
   * @param environment - Environment name
   * @returns Array of entries from environment
   */
  getEntriesByEnvironment(environment: string): GroundTruthEntry[] {
    const entries: GroundTruthEntry[] = [];
    for (const entryList of this.corpus.values()) {
      entries.push(...entryList.filter(e => e.metadata.environment === environment));
    }
    return entries;
  }

  /**
   * Clear all entries from corpus
   */
  clear(): void {
    this.corpus.clear();
  }

  /**
   * Get total number of entries in corpus
   *
   * @returns Total entry count
   */
  getTotalEntries(): number {
    let count = 0;
    for (const entries of this.corpus.values()) {
      count += entries.length;
    }
    return count;
  }

  /**
   * Calculate percentile from sorted array
   *
   * @private
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) {
      throw new Error('Cannot calculate percentile of empty array');
    }

    const index = (percentile / 100) * (sortedValues.length - 1);

    if (Number.isInteger(index)) {
      return sortedValues[index];
    }

    // Linear interpolation for non-integer indices
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }
}
