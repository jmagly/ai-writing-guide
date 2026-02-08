/**
 * NFR Ground Truth Corpus Tests
 *
 * Comprehensive test suite for NFRGroundTruthCorpus component
 * covering corpus management, statistical queries, validation,
 * category filtering, and persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NFRGroundTruthCorpus,
  GroundTruthEntry,
  Measurement,
  Metadata,
  BaselineStats,
  ValidationResult,
  CategoryStats,
  NFRCategory,
} from '../../../src/testing/nfr-ground-truth-corpus';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('NFRGroundTruthCorpus', () => {
  let corpus: NFRGroundTruthCorpus;
  let testCorpusPath: string;

  beforeEach(() => {
    testCorpusPath = path.join('/tmp', `test-corpus-${Date.now()}.json`);
    corpus = new NFRGroundTruthCorpus(testCorpusPath);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testCorpusPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('Constructor', () => {
    it('should initialize with default and custom paths', () => {
      // Test default path
      const defaultCorpus = new NFRGroundTruthCorpus();
      expect(defaultCorpus).toBeDefined();
      expect(defaultCorpus.getAllNFRs()).toEqual([]);

      // Test custom path
      const customCorpus = new NFRGroundTruthCorpus('/custom/path/corpus.json');
      expect(customCorpus).toBeDefined();
    });
  });

  describe('Entry Management', () => {
    const createMeasurement = (value: number): Measurement => ({
      value,
      unit: 'ms',
      confidence: 0.95,
    });

    const createMetadata = (environment: string = 'test'): Metadata => ({
      environment,
      system: 'linux-x64',
      nodeVersion: 'v20.0.0',
    });

    it('should add entries and manage entry properties', () => {
      // Test basic entry addition
      corpus.addEntry('NFR-PERF-001', createMeasurement(42.5), createMetadata());
      const entries = corpus.getEntries('NFR-PERF-001');
      expect(entries).toHaveLength(1);
      expect(entries[0].nfrId).toBe('NFR-PERF-001');
      expect(entries[0].measurement.value).toBe(42.5);
      expect(entries[0].category).toBe('Performance');
      expect(entries[0].verified).toBe(false);

      // Test entry with custom category
      corpus.addEntry('NFR-SEC-001', createMeasurement(98.5), createMetadata(), 'Security', true);
      const secEntries = corpus.getEntries('NFR-SEC-001');
      expect(secEntries[0].category).toBe('Security');
      expect(secEntries[0].verified).toBe(true);
    });

    it('should handle multiple entries for same NFR', () => {
      const values = [42.0, 43.5, 41.8];
      for (const value of values) {
        corpus.addEntry('NFR-PERF-001', createMeasurement(value), createMetadata());
      }

      const entries = corpus.getEntries('NFR-PERF-001');
      expect(entries).toHaveLength(3);
      expect(entries.map(e => e.measurement.value)).toEqual(values);
    });

    it('should assign unique IDs and timestamps', () => {
      const before = new Date().toISOString();
      corpus.addEntry('NFR-PERF-001', createMeasurement(42.0), createMetadata());
      corpus.addEntry('NFR-PERF-001', createMeasurement(43.0), createMetadata());
      const after = new Date().toISOString();

      const entries = corpus.getEntries('NFR-PERF-001');

      // Check unique IDs
      expect(entries[0].id).not.toBe(entries[1].id);
      expect(entries[0].id).toMatch(/^[0-9a-f-]{36}$/); // UUID format

      // Check timestamps
      expect(entries[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(entries[0].timestamp >= before && entries[0].timestamp <= after).toBe(true);
    });

    it('should return empty array for non-existent NFR', () => {
      const entries = corpus.getEntries('NFR-NONEXISTENT');
      expect(entries).toEqual([]);
    });

    it('should get all NFR IDs sorted', () => {
      const nfrIds = ['NFR-PERF-001', 'NFR-PERF-002', 'NFR-ACC-001'];
      for (const id of nfrIds) {
        corpus.addEntry(id, createMeasurement(42.0), createMetadata());
      }

      const allNFRs = corpus.getAllNFRs();
      expect(allNFRs).toEqual(['NFR-ACC-001', 'NFR-PERF-001', 'NFR-PERF-002']); // Sorted
    });

    it('should remove entries and clean up empty NFRs', () => {
      corpus.addEntry('NFR-PERF-001', createMeasurement(42.0), createMetadata());
      corpus.addEntry('NFR-PERF-001', createMeasurement(43.0), createMetadata());

      const entries = corpus.getEntries('NFR-PERF-001');
      const entryId = entries[0].id;

      // Remove first entry
      const removed = corpus.removeEntry('NFR-PERF-001', entryId);
      expect(removed).toBe(true);

      const remainingEntries = corpus.getEntries('NFR-PERF-001');
      expect(remainingEntries).toHaveLength(1);
      expect(remainingEntries[0].id).toBe(entries[1].id);

      // Remove last entry - should clean up NFR
      corpus.removeEntry('NFR-PERF-001', entries[1].id);
      expect(corpus.getEntries('NFR-PERF-001')).toEqual([]);
      expect(corpus.getAllNFRs()).toEqual([]);

      // Test removing non-existent entry
      const removedNonExistent = corpus.removeEntry('NFR-PERF-001', 'non-existent-id');
      expect(removedNonExistent).toBe(false);
    });
  });

  describe('Statistical Queries', () => {
    beforeEach(() => {
      const measurement = (value: number): Measurement => ({
        value,
        unit: 'ms',
        confidence: 0.95,
      });
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      // Add 10 measurements with known distribution
      const values = [10, 15, 20, 25, 30, 35, 40, 45, 50, 100]; // Last one is outlier
      for (const value of values) {
        corpus.addEntry('NFR-PERF-001', measurement(value), metadata);
      }
    });

    it('should calculate baseline statistics', () => {
      const stats = corpus.getBaselineStats('NFR-PERF-001');

      expect(stats.nfrId).toBe('NFR-PERF-001');
      expect(stats.count).toBe(10);
      expect(stats.mean).toBeCloseTo(37.0, 1);
      expect(stats.median).toBeCloseTo(32.5, 1);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(100);
      expect(stats.stddev).toBeGreaterThan(0);
    });

    it('should calculate percentiles correctly', () => {
      const stats = corpus.getBaselineStats('NFR-PERF-001');

      // Test percentiles: median (p50), p95, p99
      expect(stats.median).toBeCloseTo(32.5, 1); // 50th percentile
      expect(stats.p95).toBeGreaterThan(stats.median);
      expect(stats.p99).toBeGreaterThan(stats.p95);

      // Test getPercentile method for multiple specific percentiles
      const percentiles = [
        { p: 0, expected: 10 },
        { p: 50, expected: 32.5 },
        { p: 100, expected: 100 },
      ];

      for (const { p, expected } of percentiles) {
        const value = corpus.getPercentile('NFR-PERF-001', p);
        if (p === 0 || p === 100) {
          expect(value).toBe(expected);
        } else {
          expect(value).toBeCloseTo(expected, 1);
        }
      }

      // Verify ordering: p95 > p50, p99 > p95
      const p50 = corpus.getPercentile('NFR-PERF-001', 50);
      const p95 = corpus.getPercentile('NFR-PERF-001', 95);
      const p99 = corpus.getPercentile('NFR-PERF-001', 99);
      expect(p95).toBeGreaterThan(p50);
      expect(p99).toBeGreaterThan(p95);
    });

    it('should throw errors for invalid inputs', () => {
      // Non-existent NFR baseline
      expect(() => {
        corpus.getBaselineStats('NFR-NONEXISTENT');
      }).toThrow('No ground truth entries found for NFR: NFR-NONEXISTENT');

      // Invalid percentile values
      const invalidPercentiles = [-1, 101];
      for (const value of invalidPercentiles) {
        expect(() => {
          corpus.getPercentile('NFR-PERF-001', value);
        }).toThrow('Percentile must be between 0 and 100');
      }

      // Percentile on non-existent NFR
      expect(() => {
        corpus.getPercentile('NFR-NONEXISTENT', 50);
      }).toThrow('No ground truth entries found for NFR: NFR-NONEXISTENT');
    });
  });

  describe('Measurement Validation', () => {
    beforeEach(() => {
      const measurement = (value: number): Measurement => ({
        value,
        unit: 'ms',
        confidence: 0.95,
      });
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      // Add measurements with mean of 50
      const values = [45, 50, 55];
      for (const value of values) {
        corpus.addEntry('NFR-PERF-001', measurement(value), metadata);
      }
    });

    it('should validate measurements within and outside tolerance', () => {
      // Within tolerance
      const withinResult = corpus.validateMeasurement('NFR-PERF-001', 52);
      expect(withinResult.passes).toBe(true);
      expect(withinResult.actualValue).toBe(52);
      expect(withinResult.baselineValue).toBeCloseTo(50, 1);
      expect(withinResult.deviation).toBeLessThan(10);
      expect(withinResult.withinTolerance).toBe(true);

      // Outside tolerance
      const outsideResult = corpus.validateMeasurement('NFR-PERF-001', 75);
      expect(outsideResult.passes).toBe(false);
      expect(outsideResult.actualValue).toBe(75);
      expect(outsideResult.deviation).toBeGreaterThan(10);
      expect(outsideResult.withinTolerance).toBe(false);
    });

    it('should use custom tolerance and handle deviation correctly', () => {
      // Custom tolerance
      const result = corpus.validateMeasurement('NFR-PERF-001', 60, 0.25); // 25% tolerance
      expect(result.passes).toBe(true);
      expect(result.withinTolerance).toBe(true);

      // Deviation percentage
      const deviationResult = corpus.validateMeasurement('NFR-PERF-001', 55);
      expect(deviationResult.deviation).toBeCloseTo(10, 1); // 10% deviation from mean of 50

      // Negative deviations (should be absolute)
      const negResult = corpus.validateMeasurement('NFR-PERF-001', 45);
      expect(negResult.passes).toBe(true);
      expect(negResult.deviation).toBeCloseTo(10, 1); // Absolute deviation
    });

    it('should throw error for validation without baseline', () => {
      expect(() => {
        corpus.validateMeasurement('NFR-NONEXISTENT', 100);
      }).toThrow('No ground truth entries found for NFR: NFR-NONEXISTENT');
    });
  });

  describe('Category Filtering', () => {
    beforeEach(() => {
      const measurement = (value: number): Measurement => ({
        value,
        unit: 'ms',
        confidence: 0.95,
      });
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      corpus.addEntry('NFR-PERF-001', measurement(42), metadata, 'Performance');
      corpus.addEntry('NFR-PERF-002', measurement(15), metadata, 'Performance');
      corpus.addEntry('NFR-ACC-001', measurement(99.5), metadata, 'Accuracy', true);
      corpus.addEntry('NFR-SEC-001', measurement(100), metadata, 'Security', true);
      corpus.addEntry('NFR-REL-001', measurement(99.9), metadata, 'Reliability');
    });

    it('should get entries by category', () => {
      const perfEntries = corpus.getEntriesByCategory('Performance');
      expect(perfEntries).toHaveLength(2);
      expect(perfEntries.every(e => e.category === 'Performance')).toBe(true);

      // Empty category
      const usabilityEntries = corpus.getEntriesByCategory('Usability');
      expect(usabilityEntries).toEqual([]);
    });

    it('should calculate category statistics', () => {
      const statsMap = corpus.getCategoriesStats();

      // Performance stats
      const perfStats = statsMap.get('Performance')!;
      expect(perfStats).toBeDefined();
      expect(perfStats.entryCount).toBe(2);
      expect(perfStats.uniqueNFRs).toBe(2);
      expect(perfStats.avgConfidence).toBe(0.95);
      expect(perfStats.verificationRate).toBe(0); // None verified

      // Verification rates
      const verificationTests = [
        { category: 'Accuracy', expected: 100 },
        { category: 'Security', expected: 100 },
      ];

      for (const { category, expected } of verificationTests) {
        const stats = statsMap.get(category)!;
        expect(stats.verificationRate).toBe(expected);
      }

      // Should not include empty categories
      expect(statsMap.has('Usability')).toBe(false);
    });

    it('should calculate average confidence for categories', () => {
      const measurement = (value: number, confidence: number): Measurement => ({
        value,
        unit: 'ms',
        confidence,
      });
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      corpus.addEntry('NFR-US-001', measurement(100, 0.90), metadata, 'Usability');
      corpus.addEntry('NFR-US-002', measurement(100, 0.80), metadata, 'Usability');

      const statsMap = corpus.getCategoriesStats();
      const usStats = statsMap.get('Usability')!;

      expect(usStats.avgConfidence).toBeCloseTo(0.85, 2);
    });
  });

  describe('Environment Filtering', () => {
    it('should get entries by environment', () => {
      const measurement: Measurement = {
        value: 42,
        unit: 'ms',
        confidence: 0.95,
      };

      const environments = [
        { nfrId: 'NFR-PERF-001', env: 'test', system: 'linux-x64' },
        { nfrId: 'NFR-PERF-002', env: 'production', system: 'linux-x64' },
        { nfrId: 'NFR-PERF-003', env: 'test', system: 'darwin-arm64' },
      ];

      for (const { nfrId, env, system } of environments) {
        corpus.addEntry(nfrId, measurement, {
          environment: env,
          system,
          nodeVersion: 'v20.0.0',
        });
      }

      const testEntries = corpus.getEntriesByEnvironment('test');
      expect(testEntries).toHaveLength(2);
      expect(testEntries.every(e => e.metadata.environment === 'test')).toBe(true);

      const prodEntries = corpus.getEntriesByEnvironment('production');
      expect(prodEntries).toHaveLength(1);

      // Non-existent environment
      const stagingEntries = corpus.getEntriesByEnvironment('staging');
      expect(stagingEntries).toEqual([]);
    });
  });

  describe('Persistence', () => {
    it('should save and load corpus', async () => {
      const measurement: Measurement = {
        value: 42.5,
        unit: 'ms',
        confidence: 0.95,
      };
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
        notes: 'Test measurement',
      };

      corpus.addEntry('NFR-PERF-001', measurement, metadata);
      corpus.addEntry('NFR-ACC-001', { ...measurement, value: 99.5 }, metadata, 'Accuracy');

      await corpus.save();

      // Verify file exists
      const fileExists = await fs.access(testCorpusPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Load into new corpus instance
      const newCorpus = new NFRGroundTruthCorpus(testCorpusPath);
      await newCorpus.load();

      const entries = newCorpus.getEntries('NFR-PERF-001');
      expect(entries).toHaveLength(1);
      expect(entries[0].measurement.value).toBe(42.5);
      expect(entries[0].metadata.notes).toBe('Test measurement');
    });

    it('should handle loading non-existent file', async () => {
      const newCorpus = new NFRGroundTruthCorpus('/tmp/non-existent.json');
      await expect(newCorpus.load()).resolves.not.toThrow();
      expect(newCorpus.getAllNFRs()).toEqual([]);
    });

    it('should create directory if it does not exist', async () => {
      const deepPath = path.join('/tmp', `test-${Date.now()}`, 'nested', 'corpus.json');
      const deepCorpus = new NFRGroundTruthCorpus(deepPath);

      const measurement: Measurement = {
        value: 42,
        unit: 'ms',
        confidence: 0.95,
      };
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      deepCorpus.addEntry('NFR-PERF-001', measurement, metadata);
      await deepCorpus.save();

      const fileExists = await fs.access(deepPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Cleanup
      await fs.rm(path.dirname(path.dirname(deepPath)), { recursive: true, force: true });
    });

    it('should preserve all entry fields and include version/timestamp', async () => {
      const measurement: Measurement = {
        value: 42.5,
        unit: 'ms',
        samples: [40, 42, 43, 44, 45],
        confidence: 0.95,
      };
      const metadata: Metadata = {
        environment: 'production',
        system: 'darwin-arm64',
        nodeVersion: 'v18.12.0',
        notes: 'Baseline measurement',
      };

      corpus.addEntry('NFR-PERF-001', measurement, metadata, 'Performance', true);
      await corpus.save();

      // Load and verify all fields preserved
      const newCorpus = new NFRGroundTruthCorpus(testCorpusPath);
      await newCorpus.load();

      const entries = newCorpus.getEntries('NFR-PERF-001');
      expect(entries[0].category).toBe('Performance');
      expect(entries[0].verified).toBe(true);
      expect(entries[0].measurement.samples).toEqual([40, 42, 43, 44, 45]);
      expect(entries[0].metadata.notes).toBe('Baseline measurement');

      // Verify version and timestamp in file
      const data = await fs.readFile(testCorpusPath, 'utf-8');
      const parsed = JSON.parse(data);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(parsed.entries).toBeInstanceOf(Array);
    });
  });

  describe('Utility Methods', () => {
    it('should clear all entries', () => {
      const measurement: Measurement = {
        value: 42,
        unit: 'ms',
        confidence: 0.95,
      };
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      corpus.addEntry('NFR-PERF-001', measurement, metadata);
      corpus.addEntry('NFR-PERF-002', measurement, metadata);

      expect(corpus.getAllNFRs()).toHaveLength(2);

      corpus.clear();

      expect(corpus.getAllNFRs()).toEqual([]);
      expect(corpus.getTotalEntries()).toBe(0);
    });

    it('should get total entry count', () => {
      const measurement: Measurement = {
        value: 42,
        unit: 'ms',
        confidence: 0.95,
      };
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      expect(corpus.getTotalEntries()).toBe(0);

      corpus.addEntry('NFR-PERF-001', measurement, metadata);
      expect(corpus.getTotalEntries()).toBe(1);

      corpus.addEntry('NFR-PERF-001', measurement, metadata);
      expect(corpus.getTotalEntries()).toBe(2);

      corpus.addEntry('NFR-PERF-002', measurement, metadata);
      expect(corpus.getTotalEntries()).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single measurement statistics', () => {
      const measurement: Measurement = {
        value: 42,
        unit: 'ms',
        confidence: 0.95,
      };
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      corpus.addEntry('NFR-PERF-001', measurement, metadata);

      const stats = corpus.getBaselineStats('NFR-PERF-001');
      expect(stats.mean).toBe(42);
      expect(stats.median).toBe(42);
      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
      expect(stats.stddev).toBe(0); // No variance with single point
    });

    it('should handle measurements with samples array', () => {
      const measurement: Measurement = {
        value: 42.5,
        unit: 'ms',
        samples: [40, 42, 43, 44, 45],
        confidence: 0.95,
      };
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      corpus.addEntry('NFR-PERF-001', measurement, metadata);

      const entries = corpus.getEntries('NFR-PERF-001');
      expect(entries[0].measurement.samples).toEqual([40, 42, 43, 44, 45]);
    });

    it('should handle special values', () => {
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      // Zero values
      corpus.addEntry('NFR-REL-001', {
        value: 0,
        unit: 'errors',
        confidence: 1.0,
      }, metadata, 'Reliability');

      const zeroStats = corpus.getBaselineStats('NFR-REL-001');
      expect(zeroStats.mean).toBe(0);
      expect(zeroStats.min).toBe(0);

      // Very large values
      corpus.addEntry('NFR-PERF-001', {
        value: 1e10,
        unit: 'bytes',
        confidence: 0.95,
      }, metadata);

      const largeStats = corpus.getBaselineStats('NFR-PERF-001');
      expect(largeStats.mean).toBe(1e10);
    });

    it('should handle different units across NFRs', () => {
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      const unitTests = [
        { nfrId: 'NFR-PERF-001', value: 42, unit: 'ms' },
        { nfrId: 'NFR-PERF-002', value: 1024, unit: 'MB' },
        { nfrId: 'NFR-ACC-001', value: 99.5, unit: 'percentage' },
      ];

      for (const { nfrId, value, unit } of unitTests) {
        corpus.addEntry(nfrId, { value, unit, confidence: 0.95 }, metadata);
      }

      for (const { nfrId, unit } of unitTests) {
        const entries = corpus.getEntries(nfrId);
        expect(entries[0].measurement.unit).toBe(unit);
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should support NFR regression testing workflow', async () => {
      // 1. Add baseline measurements
      const measurement = (value: number): Measurement => ({
        value,
        unit: 'ms',
        confidence: 0.95,
      });
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      const baselineValues = [40, 42, 44];
      for (const value of baselineValues) {
        corpus.addEntry('NFR-PERF-001', measurement(value), metadata, 'Performance', true);
      }

      // 2. Save baseline
      await corpus.save();

      // 3. Simulate new test run
      const newCorpus = new NFRGroundTruthCorpus(testCorpusPath);
      await newCorpus.load();

      // 4. Validate new measurement
      const result = newCorpus.validateMeasurement('NFR-PERF-001', 43);

      expect(result.passes).toBe(true);
      expect(result.deviation).toBeLessThan(10);
    });

    it('should support multi-environment baselines', () => {
      const measurement: Measurement = {
        value: 50,
        unit: 'ms',
        confidence: 0.95,
      };

      corpus.addEntry('NFR-PERF-001', measurement, {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      });

      corpus.addEntry('NFR-PERF-001', { ...measurement, value: 100 }, {
        environment: 'production',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      });

      const testEntries = corpus.getEntriesByEnvironment('test');
      const prodEntries = corpus.getEntriesByEnvironment('production');

      expect(testEntries[0].measurement.value).toBe(50);
      expect(prodEntries[0].measurement.value).toBe(100);
    });

    it('should generate comprehensive category report', () => {
      const measurement = (value: number, confidence: number): Measurement => ({
        value,
        unit: 'ms',
        confidence,
      });
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      // Add diverse entries
      corpus.addEntry('NFR-PERF-001', measurement(40, 0.95), metadata, 'Performance', true);
      corpus.addEntry('NFR-PERF-002', measurement(15, 0.90), metadata, 'Performance', false);
      corpus.addEntry('NFR-ACC-001', measurement(99, 0.99), metadata, 'Accuracy', true);
      corpus.addEntry('NFR-SEC-001', measurement(100, 1.0), metadata, 'Security', true);

      const statsMap = corpus.getCategoriesStats();

      expect(statsMap.size).toBeGreaterThan(0);

      const perfStats = statsMap.get('Performance')!;
      expect(perfStats.entryCount).toBe(2);
      expect(perfStats.uniqueNFRs).toBe(2);
      expect(perfStats.verificationRate).toBe(50); // 1 of 2 verified

      const accStats = statsMap.get('Accuracy')!;
      expect(accStats.verificationRate).toBe(100);
    });
  });
});
