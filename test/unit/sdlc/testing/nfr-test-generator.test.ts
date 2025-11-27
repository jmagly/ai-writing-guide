/**
 * Tests for NFRTestGenerator
 *
 * Validates test suite generation from NFR specifications including:
 * - Performance test generation
 * - Accuracy test generation
 * - Reliability test generation
 * - File generation
 * - Syntax validity
 * - Baseline integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NFRTestGenerator, NFRGroundTruthCorpus, NFRBaseline, PerformanceTarget, AccuracyTarget, ReliabilityTarget } from '../../../../agentic/code/frameworks/sdlc-complete/src/testing/nfr-test-generator.ts';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock filesystem
vi.mock('fs/promises');

/**
 * Create mock NFR corpus for testing
 */
function createMockCorpus(): NFRGroundTruthCorpus {
  const nfrs = new Map<string, NFRBaseline>();

  // Performance NFRs
  nfrs.set('NFR-PERF-001', {
    nfrId: 'NFR-PERF-001',
    category: 'Performance',
    description: 'Content Validation Time',
    target: 5000,
    unit: 'ms',
    baseline: 4850,
    tolerance: 10,
    priority: 'P0',
    measurementMethod: 'Benchmark with 100 iterations, report p95',
    testCases: ['TC-001-015'],
  });

  nfrs.set('NFR-PERF-002', {
    nfrId: 'NFR-PERF-002',
    category: 'Performance',
    description: 'SDLC Deployment Time',
    target: 10000,
    unit: 'ms',
    baseline: 7000,
    tolerance: 15,
    priority: 'P0',
    measurementMethod: 'Time deployment execution, 100 runs',
    testCases: ['TC-002-015'],
  });

  // Accuracy NFRs
  nfrs.set('NFR-ACC-001', {
    nfrId: 'NFR-ACC-001',
    category: 'Accuracy',
    description: 'AI Pattern False Positive Rate',
    target: 0.95, // 95% accuracy
    unit: 'accuracy',
    baseline: 0.96,
    tolerance: 2,
    priority: 'P0',
    measurementMethod: 'Ground truth corpus validation, 1000 samples',
    testCases: ['TC-001-020'],
  });

  nfrs.set('NFR-ACC-002', {
    nfrId: 'NFR-ACC-002',
    category: 'Accuracy',
    description: 'Intake Field Accuracy',
    target: 0.90,
    unit: 'accuracy',
    baseline: 0.92,
    tolerance: 5,
    priority: 'P0',
    measurementMethod: 'Manual validation against ground truth',
    testCases: ['TC-003-012'],
  });

  // Reliability NFRs
  nfrs.set('NFR-REL-001', {
    nfrId: 'NFR-REL-001',
    category: 'Reliability',
    description: 'Plugin Deployment Success Rate',
    target: 0.99, // 99% success rate
    unit: 'success_rate',
    baseline: 0.995,
    tolerance: 1,
    priority: 'P0',
    measurementMethod: '100 deployment runs, count successes',
    testCases: ['TC-002-020'],
  });

  // Usability NFR (generic)
  nfrs.set('NFR-USE-001', {
    nfrId: 'NFR-USE-001',
    category: 'Usability',
    description: 'Learning Curve Time',
    target: 15,
    unit: 'minutes',
    baseline: 12,
    tolerance: 20,
    priority: 'P1',
    measurementMethod: 'User testing with 10 first-time users',
    testCases: ['TC-010-005'],
  });

  return {
    nfrs,
    version: '1.0.0',
    lastUpdated: '2025-10-23',
  };
}

describe('NFRTestGenerator', () => {
  let generator: NFRTestGenerator;
  let corpus: NFRGroundTruthCorpus;

  beforeEach(() => {
    corpus = createMockCorpus();
    generator = new NFRTestGenerator(corpus);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with corpus', () => {
      expect(generator).toBeDefined();
      expect(generator).toBeInstanceOf(NFRTestGenerator);
    });
  });

  describe('generatePerformanceTest', () => {
    it('should generate valid performance test with p95 target', () => {
      const target: PerformanceTarget = {
        nfrId: 'NFR-PERF-001',
        targetValue: 5000,
        unit: 'ms',
        percentile: 95,
        tolerance: 10,
        baseline: 4850,
      };

      const testCode = generator.generatePerformanceTest('NFR-PERF-001', target);

      // Verify test structure
      expect(testCode).toContain("describe('NFR-PERF-001: Content Validation Time'");
      expect(testCode).toContain("it('should complete in <5000ms (95th percentile)'");
      expect(testCode).toContain('new PerformanceProfiler');
      expect(testCode).toContain('measureAsync');

      // Verify assertions
      expect(testCode).toContain('expect(result.p95).toBeLessThan(5000)');

      // Verify baseline validation with tolerance
      expect(testCode).toContain('Ground truth baseline: 4850ms (±10%)');
      expect(testCode).toContain('expect(result.p95).toBeGreaterThan(4365)'); // 4850 * 0.9
      expect(testCode).toContain('expect(result.p95).toBeLessThan(5335)'); // 4850 * 1.1

      // Verify statistical confidence
      expect(testCode).toContain('confidenceInterval');
    });

    it('should generate test with p99 target', () => {
      const target: PerformanceTarget = {
        nfrId: 'NFR-PERF-002',
        targetValue: 10000,
        unit: 'ms',
        percentile: 99,
        tolerance: 15,
        baseline: 7000,
      };

      const testCode = generator.generatePerformanceTest('NFR-PERF-002', target);

      expect(testCode).toContain('99th percentile');
      expect(testCode).toContain('expect(result.p99).toBeLessThan(10000)');
    });

    it('should omit baseline validation in strict mode', () => {
      const target: PerformanceTarget = {
        nfrId: 'NFR-PERF-001',
        targetValue: 5000,
        unit: 'ms',
        percentile: 95,
        tolerance: 0, // Strict mode (no tolerance)
      };

      const testCode = generator.generatePerformanceTest('NFR-PERF-001', target);

      // Should not contain baseline bounds
      expect(testCode).not.toContain('toBeGreaterThan');
    });

    it('should throw error for unknown NFR ID', () => {
      const target: PerformanceTarget = {
        nfrId: 'NFR-UNKNOWN-999',
        targetValue: 1000,
        unit: 'ms',
        percentile: 95,
      };

      expect(() => generator.generatePerformanceTest('NFR-UNKNOWN-999', target)).toThrow(
        'NFR NFR-UNKNOWN-999 not found in ground truth corpus'
      );
    });
  });

  describe('generateAccuracyTest', () => {
    it('should generate accuracy validation test', () => {
      const target: AccuracyTarget = {
        nfrId: 'NFR-ACC-001',
        expectedAccuracy: 0.95,
        sampleSize: 1000,
      };

      const testCode = generator.generateAccuracyTest('NFR-ACC-001', target);

      // Verify test structure
      expect(testCode).toContain("describe('NFR-ACC-001: AI Pattern False Positive Rate'");
      expect(testCode).toContain('should maintain 95.0% accuracy');
      expect(testCode).toContain('loadValidationCorpus');
      expect(testCode).toContain('getSamples(1000)');

      // Verify accuracy calculation
      expect(testCode).toContain('correctPredictions');
      expect(testCode).toContain('falsePositives');
      expect(testCode).toContain('falseNegatives');

      // Verify assertions
      expect(testCode).toContain('expect(accuracy).toBeGreaterThanOrEqual(0.95)');
      expect(testCode).toContain('max 50 errors'); // 1000 * 0.05 = 50
    });

    it('should include false positive rate assertion when specified', () => {
      const target: AccuracyTarget = {
        nfrId: 'NFR-ACC-001',
        expectedAccuracy: 0.95,
        falsePositiveRate: 0.03,
        sampleSize: 1000,
      };

      const testCode = generator.generateAccuracyTest('NFR-ACC-001', target);

      expect(testCode).toContain('False positive rate target: 3.0%');
      expect(testCode).toContain('expect(fpRate).toBeLessThanOrEqual(0.03)');
    });

    it('should include false negative rate assertion when specified', () => {
      const target: AccuracyTarget = {
        nfrId: 'NFR-ACC-001',
        expectedAccuracy: 0.95,
        falseNegativeRate: 0.02,
        sampleSize: 1000,
      };

      const testCode = generator.generateAccuracyTest('NFR-ACC-001', target);

      expect(testCode).toContain('False negative rate target: 2.0%');
      expect(testCode).toContain('expect(fnRate).toBeLessThanOrEqual(0.02)');
    });

    it('should use default sample size if not specified', () => {
      const target: AccuracyTarget = {
        nfrId: 'NFR-ACC-002',
        expectedAccuracy: 0.90,
      };

      const testCode = generator.generateAccuracyTest('NFR-ACC-002', target);

      // Default sample size is 1000
      expect(testCode).toContain('getSamples(1000)');
    });
  });

  describe('generateReliabilityTest', () => {
    it('should generate reliability test with success rate', () => {
      const target: ReliabilityTarget = {
        nfrId: 'NFR-REL-001',
        successRate: 0.99,
        retryCount: 3,
        timeoutMs: 30000,
      };

      const testCode = generator.generateReliabilityTest('NFR-REL-001', target);

      // Verify test structure
      expect(testCode).toContain("describe('NFR-REL-001: Plugin Deployment Success Rate'");
      expect(testCode).toContain('should maintain 99.0% success rate');
      expect(testCode).toContain('executeOperationWithRetry');

      // Verify test runs
      expect(testCode).toContain('const testRuns = 100');
      expect(testCode).toContain('for (let i = 0; i < testRuns; i++)');

      // Verify retry configuration
      expect(testCode).toContain('maxRetries: 3');
      expect(testCode).toContain('timeoutMs: 30000');

      // Verify assertions
      expect(testCode).toContain('expect(actualSuccessRate).toBeGreaterThanOrEqual(0.99)');
      expect(testCode).toContain('Minimum 99 successes out of 100 runs');
      expect(testCode).toContain('expect(successCount).toBeGreaterThanOrEqual(99)');
      expect(testCode).toContain('expect(failureCount).toBeLessThanOrEqual(1)');
    });

    it('should use default retry count if not specified', () => {
      const target: ReliabilityTarget = {
        nfrId: 'NFR-REL-001',
        successRate: 0.99,
      };

      const testCode = generator.generateReliabilityTest('NFR-REL-001', target);

      expect(testCode).toContain('maxRetries: 3'); // Default
    });

    it('should use default timeout if not specified', () => {
      const target: ReliabilityTarget = {
        nfrId: 'NFR-REL-001',
        successRate: 0.99,
      };

      const testCode = generator.generateReliabilityTest('NFR-REL-001', target);

      expect(testCode).toContain('timeoutMs: 30000'); // Default 30 seconds
    });
  });

  describe('generateTestSuite', () => {
    it('should generate complete test suite for multiple NFRs', () => {
      const nfrIds = ['NFR-PERF-001', 'NFR-ACC-001', 'NFR-REL-001'];
      const testCode = generator.generateTestSuite(nfrIds, {
        includeComments: true,
        includeGroundTruth: true,
        strictMode: false,
        tolerance: 10,
      });

      // Verify file structure
      expect(testCode).toContain('Auto-generated NFR Acceptance Tests');
      expect(testCode).toContain('Corpus version: 1.0.0');
      expect(testCode).toContain('Last updated: 2025-10-23');

      // Verify imports
      expect(testCode).toContain("import { describe, it, expect } from 'vitest'");
      expect(testCode).toContain("import { PerformanceProfiler }");
      expect(testCode).toContain('simulateWorkload');
      expect(testCode).toContain('loadValidationCorpus');
      expect(testCode).toContain('executeOperationWithRetry');

      // Verify all NFRs included
      expect(testCode).toContain('NFR-PERF-001');
      expect(testCode).toContain('NFR-ACC-001');
      expect(testCode).toContain('NFR-REL-001');

      // Verify main describe block
      expect(testCode).toContain("describe('NFR Acceptance Tests'");
    });

    it('should omit comments when includeComments is false', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001'], {
        includeComments: false,
      });

      expect(testCode).not.toContain('Auto-generated NFR Acceptance Tests');
      expect(testCode).not.toContain('DO NOT EDIT MANUALLY');
    });

    it('should apply strict mode to all NFRs', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001'], {
        strictMode: true,
      });

      // Strict mode means no baseline tolerance bounds
      expect(testCode).not.toContain('Baseline validation');
    });


    it('should throw error for unknown NFR ID in suite', () => {
      expect(() => generator.generateTestSuite(['NFR-UNKNOWN-999'])).toThrow(
        'NFR NFR-UNKNOWN-999 not found in ground truth corpus'
      );
    });

    it('should handle mixed NFR categories', () => {
      const testCode = generator.generateTestSuite([
        'NFR-PERF-001',
        'NFR-ACC-001',
        'NFR-REL-001',
        'NFR-USE-001',
      ]);

      // All categories should be present
      expect(testCode).toContain('NFR-PERF-001'); // Performance
      expect(testCode).toContain('NFR-ACC-001'); // Accuracy
      expect(testCode).toContain('NFR-REL-001'); // Reliability
      expect(testCode).toContain('NFR-USE-001'); // Usability (generic)
    });
  });

  describe('generateTestFile', () => {
    it('should write test code to file', async () => {
      const mockMkdir = vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      const mockWriteFile = vi.mocked(fs.writeFile).mockResolvedValue();

      await generator.generateTestFile(
        ['NFR-PERF-001'],
        '/test/output/nfr-perf.test.ts',
        { includeComments: true }
      );

      // Verify directory creation
      expect(mockMkdir).toHaveBeenCalledWith('/test/output', { recursive: true });

      // Verify file write
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/output/nfr-perf.test.ts',
        expect.stringContaining('NFR-PERF-001'),
        'utf-8'
      );
    });

    it('should create nested directories', async () => {
      const mockMkdir = vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();

      await generator.generateTestFile(
        ['NFR-ACC-001'],
        '/deep/nested/path/nfr-acc.test.ts'
      );

      expect(mockMkdir).toHaveBeenCalledWith('/deep/nested/path', { recursive: true });
    });
  });

  describe('generateAllNFRTests', () => {
    it('should generate one file per NFR category', async () => {
      const mockMkdir = vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      const mockWriteFile = vi.mocked(fs.writeFile).mockResolvedValue();

      const fileCount = await generator.generateAllNFRTests('/test/output');

      // Corpus has 4 categories: Performance, Accuracy, Reliability, Usability
      expect(fileCount).toBe(4);

      // Verify file creation for each category
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/output/nfr-performance.test.ts',
        expect.stringContaining('NFR-PERF-001'),
        'utf-8'
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/output/nfr-accuracy.test.ts',
        expect.stringContaining('NFR-ACC-001'),
        'utf-8'
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/output/nfr-reliability.test.ts',
        expect.stringContaining('NFR-REL-001'),
        'utf-8'
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/output/nfr-usability.test.ts',
        expect.stringContaining('NFR-USE-001'),
        'utf-8'
      );
    });

    it('should create output directory if it does not exist', async () => {
      const mockMkdir = vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();

      await generator.generateAllNFRTests('/new/test/output');

      // Each category triggers mkdir
      expect(mockMkdir).toHaveBeenCalledWith('/new/test/output', { recursive: true });
    });
  });

  describe('generated code syntax validation', () => {
    it('should generate syntactically valid TypeScript', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001']);
      // Cannot use Function() with ES6 imports, but we can validate structure


      // Check balanced braces/parens
      const openBraces = (testCode.match(/{/g) || []).length;
      const closeBraces = (testCode.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);

      const openParens = (testCode.match(/\(/g) || []).length;
      const closeParens = (testCode.match(/\)/g) || []).length;
      expect(openParens).toBe(closeParens);
    });

    it('should generate valid Vitest test structure', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001', 'NFR-ACC-001']);

      // Required Vitest patterns
      expect(testCode).toMatch(/describe\(['"].*['"],\s*\(\)\s*=>\s*{/);
      expect(testCode).toMatch(/it\(['"].*['"],\s*async\s*\(\)\s*=>\s*{/);
      expect(testCode).toMatch(/expect\(.*\)\./);
    });

    it('should generate importable module', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001']);

      // Should start with imports
      expect(testCode).toMatch(/^\/\*\*[\s\S]*?\*\/\s*import/);

      // Should have ES6 import syntax
      expect(testCode).toMatch(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"]/);
    });
  });

  describe('baseline integration', () => {
    it('should use corpus baseline values', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001']);

      // NFR-PERF-001 has baseline 4850ms in corpus
      expect(testCode).toContain('Ground truth baseline: 4850ms');
    });

    it('should calculate tolerance bounds from baseline', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001'], {
        tolerance: 10,
      });

      // Baseline 4850ms, 10% tolerance
      // Lower: 4850 * 0.9 = 4365
      // Upper: 4850 * 1.1 = 5335
      expect(testCode).toContain('4365');
      expect(testCode).toContain('5335');
    });

    it('should respect NFR-specific tolerance from corpus', () => {
      // NFR-PERF-002 has 15% tolerance in corpus
      const testCode = generator.generateTestSuite(['NFR-PERF-002']);

      expect(testCode).toContain('±15%');
    });

    it('should include NFR description from corpus', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001']);

      expect(testCode).toContain('Content Validation Time');
    });

    it('should include corpus version in header', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001'], {
        includeComments: true,
      });

      expect(testCode).toContain('Corpus version: 1.0.0');
      expect(testCode).toContain('Last updated: 2025-10-23');
    });
  });

  describe('edge cases', () => {
    it('should handle empty NFR list', () => {
      const testCode = generator.generateTestSuite([]);

      expect(testCode).toContain("describe('NFR Acceptance Tests'");
      expect(testCode).toContain('import');
    });

    it('should handle single NFR', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001']);

      expect(testCode).toContain('NFR-PERF-001');
      expect(testCode).toContain('describe');
      expect(testCode).toContain('it(');
    });

    it('should handle NFR with zero tolerance', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001'], {
        strictMode: true,
        tolerance: 0,
      });

      // Should not include baseline validation
      expect(testCode).not.toContain('Baseline validation');
    });

    it('should handle NFR with 100% success rate', () => {
      const target: ReliabilityTarget = {
        nfrId: 'NFR-REL-001',
        successRate: 1.0,
      };

      const testCode = generator.generateReliabilityTest('NFR-REL-001', target);

      expect(testCode).toContain('100.0% success rate');
      expect(testCode).toContain('expect(actualSuccessRate).toBeGreaterThanOrEqual(1)');
    });

    it('should handle NFR with very small sample size', () => {
      const target: AccuracyTarget = {
        nfrId: 'NFR-ACC-001',
        expectedAccuracy: 0.95,
        sampleSize: 10,
      };

      const testCode = generator.generateAccuracyTest('NFR-ACC-001', target);

      expect(testCode).toContain('getSamples(10)');
      expect(testCode).toContain('max 0 errors'); // 10 * 0.05 = 0.5 -> floor to 0
    });
  });
});
