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
} from '../../../../agentic/code/frameworks/sdlc-complete/src/testing/nfr-ground-truth-corpus';
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
    it('should initialize with default path', () => {
      const defaultCorpus = new NFRGroundTruthCorpus();
      expect(defaultCorpus).toBeDefined();
      expect(defaultCorpus.getAllNFRs()).toEqual([]);
    });

    it('should initialize with custom path', () => {
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

    it('should add entry to corpus', () => {
      corpus.addEntry('NFR-PERF-001', createMeasurement(42.5), createMetadata());

      const entries = corpus.getEntries('NFR-PERF-001');
      expect(entries).toHaveLength(1);
      expect(entries[0].nfrId).toBe('NFR-PERF-001');
      expect(entries[0].measurement.value).toBe(42.5);
      expect(entries[0].category).toBe('Performance');
      expect(entries[0].verified).toBe(false);
    });

    it('should add entry with custom category', () => {
      corpus.addEntry(
        'NFR-SEC-001',
        createMeasurement(98.5),
        createMetadata(),
        'Security',
        true
      );

      const entries = corpus.getEntries('NFR-SEC-001');
      expect(entries[0].category).toBe('Security');
      expect(entries[0].verified).toBe(true);
    });

    it('should add multiple entries for same NFR', () => {
      corpus.addEntry('NFR-PERF-001', createMeasurement(42.0), createMetadata());
      corpus.addEntry('NFR-PERF-001', createMeasurement(43.5), createMetadata());
      corpus.addEntry('NFR-PERF-001', createMeasurement(41.8), createMetadata());

      const entries = corpus.getEntries('NFR-PERF-001');
      expect(entries).toHaveLength(3);
      expect(entries.map(e => e.measurement.value)).toEqual([42.0, 43.5, 41.8]);
    });

    it('should assign unique IDs to entries', () => {
      corpus.addEntry('NFR-PERF-001', createMeasurement(42.0), createMetadata());
      corpus.addEntry('NFR-PERF-001', createMeasurement(43.0), createMetadata());

      const entries = corpus.getEntries('NFR-PERF-001');
      expect(entries[0].id).not.toBe(entries[1].id);
      expect(entries[0].id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it('should set timestamp on entries', () => {
      const before = new Date().toISOString();
      corpus.addEntry('NFR-PERF-001', createMeasurement(42.0), createMetadata());
      const after = new Date().toISOString();

      const entries = corpus.getEntries('NFR-PERF-001');
      expect(entries[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(entries[0].timestamp >= before && entries[0].timestamp <= after).toBe(true);
    });

    it('should return empty array for non-existent NFR', () => {
      const entries = corpus.getEntries('NFR-NONEXISTENT');
      expect(entries).toEqual([]);
    });

    it('should get all NFR IDs', () => {
      corpus.addEntry('NFR-PERF-001', createMeasurement(42.0), createMetadata());
      corpus.addEntry('NFR-PERF-002', createMeasurement(10.5), createMetadata());
      corpus.addEntry('NFR-ACC-001', createMeasurement(99.9), createMetadata());

      const nfrIds = corpus.getAllNFRs();
      expect(nfrIds).toEqual(['NFR-ACC-001', 'NFR-PERF-001', 'NFR-PERF-002']); // Sorted
    });

    it('should remove entry by ID', () => {
      corpus.addEntry('NFR-PERF-001', createMeasurement(42.0), createMetadata());
      corpus.addEntry('NFR-PERF-001', createMeasurement(43.0), createMetadata());

      const entries = corpus.getEntries('NFR-PERF-001');
      const entryId = entries[0].id;

      const removed = corpus.removeEntry('NFR-PERF-001', entryId);
      expect(removed).toBe(true);

      const remainingEntries = corpus.getEntries('NFR-PERF-001');
      expect(remainingEntries).toHaveLength(1);
      expect(remainingEntries[0].id).toBe(entries[1].id);
    });

    it('should remove NFR when last entry is removed', () => {
      corpus.addEntry('NFR-PERF-001', createMeasurement(42.0), createMetadata());

      const entries = corpus.getEntries('NFR-PERF-001');
      corpus.removeEntry('NFR-PERF-001', entries[0].id);

      expect(corpus.getEntries('NFR-PERF-001')).toEqual([]);
      expect(corpus.getAllNFRs()).toEqual([]);
    });

    it('should return false when removing non-existent entry', () => {
      const removed = corpus.removeEntry('NFR-PERF-001', 'non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('Statistical Queries', () => {
    beforeEach(() => {
      // Add sample data for statistics
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

      expect(stats.median).toBeCloseTo(32.5, 1); // 50th percentile
      expect(stats.p95).toBeGreaterThan(stats.median);
      expect(stats.p99).toBeGreaterThan(stats.p95);
    });

    it('should throw error for non-existent NFR baseline', () => {
      expect(() => {
        corpus.getBaselineStats('NFR-NONEXISTENT');
      }).toThrow('No ground truth entries found for NFR: NFR-NONEXISTENT');
    });

    it('should get specific percentile', () => {
      const p50 = corpus.getPercentile('NFR-PERF-001', 50);
      const p95 = corpus.getPercentile('NFR-PERF-001', 95);
      const p99 = corpus.getPercentile('NFR-PERF-001', 99);

      expect(p50).toBeCloseTo(32.5, 1);
      expect(p95).toBeGreaterThan(p50);
      expect(p99).toBeGreaterThan(p95);
    });

    it('should handle edge percentiles', () => {
      const p0 = corpus.getPercentile('NFR-PERF-001', 0);
      const p100 = corpus.getPercentile('NFR-PERF-001', 100);

      expect(p0).toBe(10);
      expect(p100).toBe(100);
    });

    it('should throw error for invalid percentile', () => {
      expect(() => {
        corpus.getPercentile('NFR-PERF-001', -1);
      }).toThrow('Percentile must be between 0 and 100');

      expect(() => {
        corpus.getPercentile('NFR-PERF-001', 101);
      }).toThrow('Percentile must be between 0 and 100');
    });

    it('should throw error for percentile on non-existent NFR', () => {
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
      corpus.addEntry('NFR-PERF-001', measurement(45), metadata);
      corpus.addEntry('NFR-PERF-001', measurement(50), metadata);
      corpus.addEntry('NFR-PERF-001', measurement(55), metadata);
    });

    it('should validate measurement within tolerance', () => {
      const result = corpus.validateMeasurement('NFR-PERF-001', 52);

      expect(result.passes).toBe(true);
      expect(result.actualValue).toBe(52);
      expect(result.baselineValue).toBeCloseTo(50, 1);
      expect(result.deviation).toBeLessThan(10); // < 10%
      expect(result.withinTolerance).toBe(true);
    });

    it('should fail validation outside tolerance', () => {
      const result = corpus.validateMeasurement('NFR-PERF-001', 75); // 50% deviation

      expect(result.passes).toBe(false);
      expect(result.actualValue).toBe(75);
      expect(result.deviation).toBeGreaterThan(10); // > 10%
      expect(result.withinTolerance).toBe(false);
    });

    it('should use custom tolerance', () => {
      const result = corpus.validateMeasurement('NFR-PERF-001', 60, 0.25); // 25% tolerance

      expect(result.passes).toBe(true);
      expect(result.withinTolerance).toBe(true);
    });

    it('should calculate deviation percentage correctly', () => {
      const result = corpus.validateMeasurement('NFR-PERF-001', 55);

      expect(result.deviation).toBeCloseTo(10, 1); // 10% deviation from mean of 50
    });

    it('should handle negative deviations', () => {
      const result = corpus.validateMeasurement('NFR-PERF-001', 45);

      expect(result.passes).toBe(true);
      expect(result.deviation).toBeCloseTo(10, 1); // Absolute deviation
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
    });

    it('should return empty array for category with no entries', () => {
      const usabilityEntries = corpus.getEntriesByCategory('Usability');
      expect(usabilityEntries).toEqual([]);
    });

    it('should get category statistics', () => {
      const statsMap = corpus.getCategoriesStats();

      const perfStats = statsMap.get('Performance')!;
      expect(perfStats).toBeDefined();
      expect(perfStats.entryCount).toBe(2);
      expect(perfStats.uniqueNFRs).toBe(2);
      expect(perfStats.avgConfidence).toBe(0.95);
      expect(perfStats.verificationRate).toBe(0); // None verified
    });

    it('should calculate verification rate correctly', () => {
      const statsMap = corpus.getCategoriesStats();

      const accStats = statsMap.get('Accuracy')!;
      expect(accStats.verificationRate).toBe(100); // All verified

      const secStats = statsMap.get('Security')!;
      expect(secStats.verificationRate).toBe(100);
    });

    it('should not include categories with no entries', () => {
      const statsMap = corpus.getCategoriesStats();

      expect(statsMap.has('Usability')).toBe(false);
    });

    it('should calculate average confidence', () => {
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

      corpus.addEntry('NFR-PERF-001', measurement, {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      });

      corpus.addEntry('NFR-PERF-002', measurement, {
        environment: 'production',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      });

      corpus.addEntry('NFR-PERF-003', measurement, {
        environment: 'test',
        system: 'darwin-arm64',
        nodeVersion: 'v20.0.0',
      });

      const testEntries = corpus.getEntriesByEnvironment('test');
      expect(testEntries).toHaveLength(2);
      expect(testEntries.every(e => e.metadata.environment === 'test')).toBe(true);

      const prodEntries = corpus.getEntriesByEnvironment('production');
      expect(prodEntries).toHaveLength(1);
    });

    it('should return empty array for non-existent environment', () => {
      const entries = corpus.getEntriesByEnvironment('staging');
      expect(entries).toEqual([]);
    });
  });

  describe('Persistence', () => {
    it('should save corpus to file', async () => {
      const measurement: Measurement = {
        value: 42.5,
        unit: 'ms',
        confidence: 0.95,
      };
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      corpus.addEntry('NFR-PERF-001', measurement, metadata);
      corpus.addEntry('NFR-ACC-001', { ...measurement, value: 99.5 }, metadata, 'Accuracy');

      await corpus.save();

      const fileExists = await fs.access(testCorpusPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should load corpus from file', async () => {
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
      await corpus.save();

      // Create new corpus instance and load
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

    it('should preserve all entry fields on save/load', async () => {
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

      const newCorpus = new NFRGroundTruthCorpus(testCorpusPath);
      await newCorpus.load();

      const entries = newCorpus.getEntries('NFR-PERF-001');
      expect(entries[0].category).toBe('Performance');
      expect(entries[0].verified).toBe(true);
      expect(entries[0].measurement.samples).toEqual([40, 42, 43, 44, 45]);
      expect(entries[0].metadata.notes).toBe('Baseline measurement');
    });

    it('should include version and timestamp in saved file', async () => {
      await corpus.save();

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

    it('should handle zero values', () => {
      const measurement: Measurement = {
        value: 0,
        unit: 'errors',
        confidence: 1.0,
      };
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      corpus.addEntry('NFR-REL-001', measurement, metadata, 'Reliability');

      const stats = corpus.getBaselineStats('NFR-REL-001');
      expect(stats.mean).toBe(0);
      expect(stats.min).toBe(0);
    });

    it('should handle very large values', () => {
      const measurement: Measurement = {
        value: 1e10,
        unit: 'bytes',
        confidence: 0.95,
      };
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      corpus.addEntry('NFR-PERF-001', measurement, metadata);

      const stats = corpus.getBaselineStats('NFR-PERF-001');
      expect(stats.mean).toBe(1e10);
    });

    it('should handle different units', () => {
      const metadata: Metadata = {
        environment: 'test',
        system: 'linux-x64',
        nodeVersion: 'v20.0.0',
      };

      corpus.addEntry('NFR-PERF-001', { value: 42, unit: 'ms', confidence: 0.95 }, metadata);
      corpus.addEntry('NFR-PERF-002', { value: 1024, unit: 'MB', confidence: 0.95 }, metadata);
      corpus.addEntry('NFR-ACC-001', { value: 99.5, unit: 'percentage', confidence: 0.95 }, metadata);

      const entries1 = corpus.getEntries('NFR-PERF-001');
      const entries2 = corpus.getEntries('NFR-PERF-002');
      const entries3 = corpus.getEntries('NFR-ACC-001');

      expect(entries1[0].measurement.unit).toBe('ms');
      expect(entries2[0].measurement.unit).toBe('MB');
      expect(entries3[0].measurement.unit).toBe('percentage');
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

      corpus.addEntry('NFR-PERF-001', measurement(40), metadata, 'Performance', true);
      corpus.addEntry('NFR-PERF-001', measurement(42), metadata, 'Performance', true);
      corpus.addEntry('NFR-PERF-001', measurement(44), metadata, 'Performance', true);

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
