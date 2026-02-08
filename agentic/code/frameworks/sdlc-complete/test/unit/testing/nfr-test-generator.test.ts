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
import { NFRTestGenerator, NFRGroundTruthCorpus, NFRBaseline, PerformanceTarget, AccuracyTarget, ReliabilityTarget } from '../../../src/testing/nfr-test-generator.ts';
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
    it('should generate valid performance tests with various configurations', () => {
      // Test p95 target with baseline validation
      const p95Target: PerformanceTarget = {
        nfrId: 'NFR-PERF-001',
        targetValue: 5000,
        unit: 'ms',
        percentile: 95,
        tolerance: 10,
        baseline: 4850,
      };
      const p95Test = generator.generatePerformanceTest('NFR-PERF-001', p95Target);

      // Verify p95 test structure
      expect(p95Test).toContain("describe('NFR-PERF-001: Content Validation Time'");
      expect(p95Test).toContain("it('should complete in <5000ms (95th percentile)'");
      expect(p95Test).toContain('new PerformanceProfiler');
      expect(p95Test).toContain('measureAsync');
      expect(p95Test).toContain('expect(result.p95).toBeLessThan(5000)');

      // Verify baseline validation with tolerance
      expect(p95Test).toContain('Ground truth baseline: 4850ms (±10%)');
      expect(p95Test).toContain('expect(result.p95).toBeGreaterThan(4365)'); // 4850 * 0.9
      expect(p95Test).toContain('expect(result.p95).toBeLessThan(5335)'); // 4850 * 1.1
      expect(p95Test).toContain('confidenceInterval');

      // Test p99 target
      const p99Target: PerformanceTarget = {
        nfrId: 'NFR-PERF-002',
        targetValue: 10000,
        unit: 'ms',
        percentile: 99,
        tolerance: 15,
        baseline: 7000,
      };
      const p99Test = generator.generatePerformanceTest('NFR-PERF-002', p99Target);
      expect(p99Test).toContain('99th percentile');
      expect(p99Test).toContain('expect(result.p99).toBeLessThan(10000)');

      // Test strict mode (no tolerance)
      const strictTarget: PerformanceTarget = {
        nfrId: 'NFR-PERF-001',
        targetValue: 5000,
        unit: 'ms',
        percentile: 95,
        tolerance: 0, // Strict mode
      };
      const strictTest = generator.generatePerformanceTest('NFR-PERF-001', strictTarget);
      expect(strictTest).not.toContain('toBeGreaterThan'); // No baseline bounds
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
    it('should generate accuracy validation tests with optional rate assertions', () => {
      // Basic accuracy test
      const basicTarget: AccuracyTarget = {
        nfrId: 'NFR-ACC-001',
        expectedAccuracy: 0.95,
        sampleSize: 1000,
      };
      const basicTest = generator.generateAccuracyTest('NFR-ACC-001', basicTarget);

      expect(basicTest).toContain("describe('NFR-ACC-001: AI Pattern False Positive Rate'");
      expect(basicTest).toContain('should maintain 95.0% accuracy');
      expect(basicTest).toContain('loadValidationCorpus');
      expect(basicTest).toContain('getSamples(1000)');
      expect(basicTest).toContain('correctPredictions');
      expect(basicTest).toContain('falsePositives');
      expect(basicTest).toContain('falseNegatives');
      expect(basicTest).toContain('expect(accuracy).toBeGreaterThanOrEqual(0.95)');
      expect(basicTest).toContain('max 50 errors'); // 1000 * 0.05 = 50

      // Test with false positive rate
      const fpTarget: AccuracyTarget = {
        nfrId: 'NFR-ACC-001',
        expectedAccuracy: 0.95,
        falsePositiveRate: 0.03,
        sampleSize: 1000,
      };
      const fpTest = generator.generateAccuracyTest('NFR-ACC-001', fpTarget);
      expect(fpTest).toContain('False positive rate target: 3.0%');
      expect(fpTest).toContain('expect(fpRate).toBeLessThanOrEqual(0.03)');

      // Test with false negative rate
      const fnTarget: AccuracyTarget = {
        nfrId: 'NFR-ACC-001',
        expectedAccuracy: 0.95,
        falseNegativeRate: 0.02,
        sampleSize: 1000,
      };
      const fnTest = generator.generateAccuracyTest('NFR-ACC-001', fnTarget);
      expect(fnTest).toContain('False negative rate target: 2.0%');
      expect(fnTest).toContain('expect(fnRate).toBeLessThanOrEqual(0.02)');

      // Test default sample size
      const defaultTarget: AccuracyTarget = {
        nfrId: 'NFR-ACC-002',
        expectedAccuracy: 0.90,
      };
      const defaultTest = generator.generateAccuracyTest('NFR-ACC-002', defaultTarget);
      expect(defaultTest).toContain('getSamples(1000)'); // Default
    });
  });

  describe('generateReliabilityTest', () => {
    it('should generate reliability tests with retry and timeout configuration', () => {
      // Full configuration
      const fullTarget: ReliabilityTarget = {
        nfrId: 'NFR-REL-001',
        successRate: 0.99,
        retryCount: 3,
        timeoutMs: 30000,
      };
      const fullTest = generator.generateReliabilityTest('NFR-REL-001', fullTarget);

      expect(fullTest).toContain("describe('NFR-REL-001: Plugin Deployment Success Rate'");
      expect(fullTest).toContain('should maintain 99.0% success rate');
      expect(fullTest).toContain('executeOperationWithRetry');
      expect(fullTest).toContain('const testRuns = 100');
      expect(fullTest).toContain('for (let i = 0; i < testRuns; i++)');
      expect(fullTest).toContain('maxRetries: 3');
      expect(fullTest).toContain('timeoutMs: 30000');
      expect(fullTest).toContain('expect(actualSuccessRate).toBeGreaterThanOrEqual(0.99)');
      expect(fullTest).toContain('Minimum 99 successes out of 100 runs');
      expect(fullTest).toContain('expect(successCount).toBeGreaterThanOrEqual(99)');
      expect(fullTest).toContain('expect(failureCount).toBeLessThanOrEqual(1)');

      // Test defaults
      const defaultTarget: ReliabilityTarget = {
        nfrId: 'NFR-REL-001',
        successRate: 0.99,
      };
      const defaultTest = generator.generateReliabilityTest('NFR-REL-001', defaultTarget);
      expect(defaultTest).toContain('maxRetries: 3'); // Default retry
      expect(defaultTest).toContain('timeoutMs: 30000'); // Default timeout
    });
  });

  describe('generateTestSuite', () => {
    it('should generate complete test suite with various configurations', () => {
      const nfrIds = ['NFR-PERF-001', 'NFR-ACC-001', 'NFR-REL-001'];

      // Full suite with comments and ground truth
      const fullSuite = generator.generateTestSuite(nfrIds, {
        includeComments: true,
        includeGroundTruth: true,
        strictMode: false,
        tolerance: 10,
      });

      expect(fullSuite).toContain('Auto-generated NFR Acceptance Tests');
      expect(fullSuite).toContain('Corpus version: 1.0.0');
      expect(fullSuite).toContain('Last updated: 2025-10-23');
      expect(fullSuite).toContain("import { describe, it, expect } from 'vitest'");
      expect(fullSuite).toContain("import { PerformanceProfiler }");
      expect(fullSuite).toContain('simulateWorkload');
      expect(fullSuite).toContain('loadValidationCorpus');
      expect(fullSuite).toContain('executeOperationWithRetry');
      expect(fullSuite).toContain('NFR-PERF-001');
      expect(fullSuite).toContain('NFR-ACC-001');
      expect(fullSuite).toContain('NFR-REL-001');
      expect(fullSuite).toContain("describe('NFR Acceptance Tests'");

      // Without comments
      const noComments = generator.generateTestSuite(['NFR-PERF-001'], {
        includeComments: false,
      });
      expect(noComments).not.toContain('Auto-generated NFR Acceptance Tests');
      expect(noComments).not.toContain('DO NOT EDIT MANUALLY');

      // Strict mode
      const strict = generator.generateTestSuite(['NFR-PERF-001'], {
        strictMode: true,
      });
      expect(strict).not.toContain('Baseline validation');

      // Mixed categories
      const mixed = generator.generateTestSuite([
        'NFR-PERF-001',
        'NFR-ACC-001',
        'NFR-REL-001',
        'NFR-USE-001',
      ]);
      expect(mixed).toContain('NFR-PERF-001'); // Performance
      expect(mixed).toContain('NFR-ACC-001'); // Accuracy
      expect(mixed).toContain('NFR-REL-001'); // Reliability
      expect(mixed).toContain('NFR-USE-001'); // Usability
    });

    it('should throw error for unknown NFR ID in suite', () => {
      expect(() => generator.generateTestSuite(['NFR-UNKNOWN-999'])).toThrow(
        'NFR NFR-UNKNOWN-999 not found in ground truth corpus'
      );
    });
  });

  describe('generateTestFile', () => {
    it('should write test code to file and create nested directories', async () => {
      const mockMkdir = vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      const mockWriteFile = vi.mocked(fs.writeFile).mockResolvedValue();

      // Test basic file write
      await generator.generateTestFile(
        ['NFR-PERF-001'],
        '/test/output/nfr-perf.test.ts',
        { includeComments: true }
      );

      expect(mockMkdir).toHaveBeenCalledWith('/test/output', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/output/nfr-perf.test.ts',
        expect.stringContaining('NFR-PERF-001'),
        'utf-8'
      );

      // Test nested directory creation
      vi.clearAllMocks();
      await generator.generateTestFile(
        ['NFR-ACC-001'],
        '/deep/nested/path/nfr-acc.test.ts'
      );

      expect(mockMkdir).toHaveBeenCalledWith('/deep/nested/path', { recursive: true });
    });
  });

  describe('generateAllNFRTests', () => {
    it('should generate one file per NFR category and create output directory', async () => {
      const mockMkdir = vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      const mockWriteFile = vi.mocked(fs.writeFile).mockResolvedValue();

      const fileCount = await generator.generateAllNFRTests('/test/output');

      // Corpus has 4 categories: Performance, Accuracy, Reliability, Usability
      expect(fileCount).toBe(4);

      // Verify file creation for each category
      const expectedFiles = [
        { path: '/test/output/nfr-performance.test.ts', content: 'NFR-PERF-001' },
        { path: '/test/output/nfr-accuracy.test.ts', content: 'NFR-ACC-001' },
        { path: '/test/output/nfr-reliability.test.ts', content: 'NFR-REL-001' },
        { path: '/test/output/nfr-usability.test.ts', content: 'NFR-USE-001' },
      ];

      for (const file of expectedFiles) {
        expect(mockWriteFile).toHaveBeenCalledWith(
          file.path,
          expect.stringContaining(file.content),
          'utf-8'
        );
      }

      // Test new directory creation
      vi.clearAllMocks();
      await generator.generateAllNFRTests('/new/test/output');
      expect(mockMkdir).toHaveBeenCalledWith('/new/test/output', { recursive: true });
    });
  });

  describe('generated code syntax validation', () => {
    it('should generate syntactically valid TypeScript with balanced braces and parens', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001']);

      const openBraces = (testCode.match(/{/g) || []).length;
      const closeBraces = (testCode.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);

      const openParens = (testCode.match(/\(/g) || []).length;
      const closeParens = (testCode.match(/\)/g) || []).length;
      expect(openParens).toBe(closeParens);
    });

    it('should generate valid Vitest test structure', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001', 'NFR-ACC-001']);

      expect(testCode).toMatch(/describe\(['"].*['"],\s*\(\)\s*=>\s*{/);
      expect(testCode).toMatch(/it\(['"].*['"],\s*async\s*\(\)\s*=>\s*{/);
      expect(testCode).toMatch(/expect\(.*\)\./);
    });

    it('should generate importable module', () => {
      const testCode = generator.generateTestSuite(['NFR-PERF-001']);

      expect(testCode).toMatch(/^\/\*\*[\s\S]*?\*\/\s*import/);
      expect(testCode).toMatch(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"]/);
    });
  });

  describe('baseline integration', () => {
    it('should integrate corpus baseline values with tolerance calculations', () => {
      // Test baseline usage
      const baselineTest = generator.generateTestSuite(['NFR-PERF-001']);
      expect(baselineTest).toContain('Ground truth baseline: 4850ms');

      // Test tolerance bounds calculation
      const toleranceTest = generator.generateTestSuite(['NFR-PERF-001'], {
        tolerance: 10,
      });
      // Baseline 4850ms, 10% tolerance
      // Lower: 4850 * 0.9 = 4365
      // Upper: 4850 * 1.1 = 5335
      expect(toleranceTest).toContain('4365');
      expect(toleranceTest).toContain('5335');

      // Test NFR-specific tolerance from corpus
      const nfrTolerance = generator.generateTestSuite(['NFR-PERF-002']);
      expect(nfrTolerance).toContain('±15%'); // NFR-PERF-002 has 15% tolerance

      // Test description inclusion
      const description = generator.generateTestSuite(['NFR-PERF-001']);
      expect(description).toContain('Content Validation Time');

      // Test corpus version in header
      const version = generator.generateTestSuite(['NFR-PERF-001'], {
        includeComments: true,
      });
      expect(version).toContain('Corpus version: 1.0.0');
      expect(version).toContain('Last updated: 2025-10-23');
    });
  });

  describe('edge cases', () => {
    it('should handle various edge cases correctly', () => {
      // Empty NFR list
      const empty = generator.generateTestSuite([]);
      expect(empty).toContain("describe('NFR Acceptance Tests'");
      expect(empty).toContain('import');

      // Single NFR
      const single = generator.generateTestSuite(['NFR-PERF-001']);
      expect(single).toContain('NFR-PERF-001');
      expect(single).toContain('describe');
      expect(single).toContain('it(');

      // Zero tolerance
      const zeroTolerance = generator.generateTestSuite(['NFR-PERF-001'], {
        strictMode: true,
        tolerance: 0,
      });
      expect(zeroTolerance).not.toContain('Baseline validation');

      // 100% success rate
      const perfectSuccess: ReliabilityTarget = {
        nfrId: 'NFR-REL-001',
        successRate: 1.0,
      };
      const perfectTest = generator.generateReliabilityTest('NFR-REL-001', perfectSuccess);
      expect(perfectTest).toContain('100.0% success rate');
      expect(perfectTest).toContain('expect(actualSuccessRate).toBeGreaterThanOrEqual(1)');

      // Very small sample size
      const smallSample: AccuracyTarget = {
        nfrId: 'NFR-ACC-001',
        expectedAccuracy: 0.95,
        sampleSize: 10,
      };
      const smallTest = generator.generateAccuracyTest('NFR-ACC-001', smallSample);
      expect(smallTest).toContain('getSamples(10)');
      expect(smallTest).toContain('max 0 errors'); // 10 * 0.05 = 0.5 -> floor to 0
    });
  });
});
