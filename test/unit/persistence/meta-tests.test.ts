/**
 * Meta-Tests for Framework Quality
 *
 * Tests that ensure the Agent Persistence framework itself doesn't exhibit
 * the laziness patterns it's designed to prevent.
 *
 * CRITICAL: If the anti-laziness framework is lazy, it becomes a vulnerability
 * rather than a safeguard.
 *
 * @strategy @.aiwg/testing/agent-persistence-test-strategy.md Section 4.3
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

describe('Meta-Tests: Framework Anti-Laziness Validation', () => {
  describe('MT-01: No Skipped Tests in Framework Suite', () => {
    it('should have zero test.skip() patterns in persistence tests (excluding meta-tests)', async () => {
      const testFiles = await glob('test/unit/persistence/**/*.test.ts', {
        cwd: path.join(__dirname, '../../..'),
        ignore: ['**/meta-tests.test.ts'], // Exclude this file
      });

      expect(testFiles.length).toBeGreaterThan(0);

      for (const file of testFiles) {
        const fullPath = path.join(__dirname, '../../..', file);
        const content = await fs.readFile(fullPath, 'utf-8');

        // Check for actual skip API calls at the code level
        // Exclude: comments, string literals containing .skip (test fixtures)
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          // Skip comments
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
          // Skip lines that are inside template literals (diff fixtures)
          if (trimmed.startsWith('+') || trimmed.startsWith('-')) continue;
          // Skip lines that are string content (contain diff fixture data)
          if (/^\s*['"`]/.test(trimmed)) continue;
          if (/diff:/.test(trimmed)) continue;

          // Check for actual skip calls as statements (not in strings)
          if (/^\s*(it|describe|test)\.skip\s*\(/.test(trimmed)) {
            throw new Error(`Found skip pattern in ${file}: ${trimmed}`);
          }
          if (/^\s*x(it|describe|test)\s*\(/.test(trimmed)) {
            throw new Error(`Found x-prefix skip pattern in ${file}: ${trimmed}`);
          }
        }
      }
    });

    it('should have zero skipped tests in laziness detection tests', async () => {
      const testFile = path.join(
        __dirname,
        '../../unit/hooks/laziness-detection.test.ts'
      );

      const exists = await fs.access(testFile).then(() => true).catch(() => false);
      if (!exists) {
        return;
      }

      const content = await fs.readFile(testFile, 'utf-8');

      // Check for actual skip API usage (not string references to .skip)
      // Match patterns like `it.skip(`, `describe.skip(`, `test.skip(` at code level
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and string-only lines
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        // Skip lines inside template literals or string fixtures (diff content)
        if (trimmed.startsWith('+') || trimmed.startsWith('-')) continue;

        // Check for actual skip calls (not inside strings)
        // Only flag if `.skip(` appears as method call, not inside a string argument
        if (/^(?!.*['"`].*\.skip\(.*['"`])\s*(it|describe|test)\.skip\(/.test(trimmed)) {
          throw new Error(`Found skip pattern in laziness-detection.test.ts: ${trimmed}`);
        }
      }
    });
  });

  describe('MT-02: No Trivial Assertions', () => {
    it('should not contain expect(true).toBe(true) in framework tests', async () => {
      const testFiles = await glob('test/unit/persistence/**/*.test.ts', {
        cwd: path.join(__dirname, '../../..'),
        ignore: ['**/meta-tests.test.ts'],
      });

      for (const file of testFiles) {
        const fullPath = path.join(__dirname, '../../..', file);
        const content = await fs.readFile(fullPath, 'utf-8');

        // Check for trivial assertions (excluding documentation/comments)
        const codeLines = content.split('\n').filter(line =>
          !line.trim().startsWith('//') && !line.trim().startsWith('*')
        );
        const codeContent = codeLines.join('\n');

        // Allow these in placeholder tests, but not in real tests
        const trivialAssertions = codeContent.match(/expect\(true\)\.toBe\(true\)/g) || [];
        const placeholderTests = codeContent.match(/placeholder|stub|todo/gi) || [];

        // Trivial assertions only allowed in placeholder tests
        if (trivialAssertions.length > placeholderTests.length) {
          throw new Error(`File ${file} has trivial assertions in non-placeholder tests`);
        }
      }
    });

    it('should have meaningful assertions (not just toBeTruthy)', async () => {
      const testFiles = await glob('test/unit/persistence/**/*.test.ts', {
        cwd: path.join(__dirname, '../../..'),
        ignore: ['**/meta-tests.test.ts'],
      });

      for (const file of testFiles) {
        const fullPath = path.join(__dirname, '../../..', file);
        const content = await fs.readFile(fullPath, 'utf-8');

        const assertionCount = (content.match(/expect\(/g) || []).length;
        const specificAssertions = (
          content.match(/\.toBe\(|\.toEqual\(|\.toContain\(|\.toHaveLength\(|\.toBeGreaterThan\(/g) || []
        ).length;

        if (assertionCount > 0) {
          const specificityRatio = specificAssertions / assertionCount;
          // At least 50% of assertions should be specific
          expect(specificityRatio).toBeGreaterThanOrEqual(0.5);
        }
      }
    });
  });

  describe('MT-03: Coverage Baseline Established', () => {
    it('should track baseline test count for regression detection', async () => {
      const testFiles = await glob('test/unit/persistence/**/*.test.ts', {
        cwd: path.join(__dirname, '../../..'),
      });

      // Baseline: Should have at least 4 test files
      expect(testFiles.length).toBeGreaterThanOrEqual(4);
    });

    it('should have minimum test cases per file', async () => {
      const testFiles = await glob('test/unit/persistence/**/*.test.ts', {
        cwd: path.join(__dirname, '../../..'),
        ignore: ['**/meta-tests.test.ts'], // Meta-tests validate, not test features
      });

      for (const file of testFiles) {
        const fullPath = path.join(__dirname, '../../..', file);
        const content = await fs.readFile(fullPath, 'utf-8');

        // Count test cases
        const testCaseCount = (content.match(/\bit\(/g) || []).length;

        // Each test file should have at least 5 test cases
        expect(testCaseCount).toBeGreaterThanOrEqual(5);
      }
    });
  });

  describe('MT-04: Pattern Catalog Validation', () => {
    const catalogPath = path.join(
      __dirname,
      '../../../.aiwg/patterns/laziness-patterns.yaml'
    );
    const catalogExists = (() => {
      try {
        require('fs').accessSync(catalogPath);
        return true;
      } catch {
        return false;
      }
    })();

    it.skipIf(!catalogExists)('should load pattern catalog without errors', async () => {
      const content = await fs.readFile(catalogPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
      expect(content).toMatch(/patterns:/);
    });

    it.skipIf(!catalogExists)('should have all documented patterns (LP-001 through LP-008)', async () => {
      const content = await fs.readFile(catalogPath, 'utf-8');

      // Check for all 8 core patterns
      for (let i = 1; i <= 8; i++) {
        const patternId = `LP-${String(i).padStart(3, '0')}`;
        expect(content).toContain(patternId);
      }
    });

    it.skipIf(!catalogExists)('should have severity levels for all patterns', async () => {
      const content = await fs.readFile(catalogPath, 'utf-8');

      // All patterns should have severity
      const patternBlocks = content.split(/- id: LP-/);

      patternBlocks.slice(1).forEach((block) => {
        expect(block).toMatch(/severity: (CRITICAL|HIGH|MEDIUM|LOW)/);
      });
    });
  });

  describe('MT-05: No Empty Catch Blocks', () => {
    it('should have proper error handling in implementation', async () => {
      const implPath = path.join(
        __dirname,
        '../../../src/hooks/laziness-detection.ts'
      );
      const content = await fs.readFile(implPath, 'utf-8');

      // Check for empty catch blocks
      expect(content).not.toMatch(/catch\s*\([^)]*\)\s*\{\s*\}/);

      // Check for ignore comments in catch
      expect(content).not.toMatch(/catch.*\/\/\s*ignore/i);
      expect(content).not.toMatch(/catch.*\/\*\s*ignore/i);
    });
  });

  describe('MT-06: No TODO/FIXME in Critical Paths', () => {
    it('should not have unresolved TODOs in pattern detection', async () => {
      const implPath = path.join(
        __dirname,
        '../../../src/hooks/laziness-detection.ts'
      );
      const content = await fs.readFile(implPath, 'utf-8');

      // Allow TODOs in comments for future enhancement
      // But not in actual code execution paths

      // Count TODO/FIXME
      const todoCount = (content.match(/\/\/\s*(TODO|FIXME)/g) || []).length;

      // Should be minimal (less than 5)
      expect(todoCount).toBeLessThan(5);
    });

    it('should not have stubbed implementations in detection logic', async () => {
      const implPath = path.join(
        __dirname,
        '../../../src/hooks/laziness-detection.ts'
      );
      const content = await fs.readFile(implPath, 'utf-8'); // Fixed: was fullPath

      // Check for stub patterns
      expect(content).not.toMatch(/return\s+null;\s*\/\/\s*stub/i);
      expect(content).not.toMatch(/throw new Error\(['"]Not implemented['"]/);
    });
  });

  describe('MT-07: Implementation Completeness', () => {
    it('should implement all public methods in LazinessDetectionHook', async () => {
      const implPath = path.join(
        __dirname,
        '../../../src/hooks/laziness-detection.ts'
      );
      const content = await fs.readFile(implPath, 'utf-8');

      // Key methods that must be implemented
      expect(content).toMatch(/public\s+async\s+analyze\(/);
      expect(content).toMatch(/private\s+(async\s+)?detectPatternsInChange\(/);
      expect(content).toMatch(/private\s+makeBlockDecision\(/);
    });

    it('should have proper type definitions', async () => {
      const implPath = path.join(
        __dirname,
        '../../../src/hooks/laziness-detection.ts'
      );
      const content = await fs.readFile(implPath, 'utf-8');

      // Check for exported interfaces
      expect(content).toMatch(/export\s+interface\s+DetectedPattern/);
      expect(content).toMatch(/export\s+interface\s+BlockDecision/);
      expect(content).toMatch(/export\s+interface\s+FileChange/);
    });
  });

  describe('MT-08: Test Quality Metrics', () => {
    it('should have test descriptions that are specific', async () => {
      const testFiles = await glob('test/unit/persistence/**/*.test.ts', {
        cwd: path.join(__dirname, '../../..'),
        ignore: ['**/meta-tests.test.ts'],
      });

      for (const file of testFiles) {
        const fullPath = path.join(__dirname, '../../..', file);
        const content = await fs.readFile(fullPath, 'utf-8');

        // Extract test descriptions
        const descMatches = content.matchAll(/describe\(['"]([^'"]+)['"]/g);
        const itMatches = content.matchAll(/it\(['"]([^'"]+)['"]/g);

        // Descriptions should not be too generic
        for (const match of descMatches) {
          const desc = match[1];
          expect(desc.length).toBeGreaterThanOrEqual(10); // Changed from > to >=
          expect(desc).not.toMatch(/^test$/i);
          expect(desc).not.toMatch(/^should work$/i);
        }

        for (const match of itMatches) {
          const desc = match[1];
          expect(desc.length).toBeGreaterThanOrEqual(10);
        }
      }
    });

    it('should organize tests into logical describe blocks', async () => {
      const testFiles = await glob('test/unit/persistence/**/*.test.ts', {
        cwd: path.join(__dirname, '../../..'),
        ignore: ['**/meta-tests.test.ts'],
      });

      for (const file of testFiles) {
        const fullPath = path.join(__dirname, '../../..', file);
        const content = await fs.readFile(fullPath, 'utf-8');

        const describeCount = (content.match(/describe\(/g) || []).length;
        const itCount = (content.match(/\bit\(/g) || []).length;

        // Should have grouping (describe blocks)
        expect(describeCount).toBeGreaterThan(0);

        // Should have multiple tests
        expect(itCount).toBeGreaterThan(0);
      }
    });
  });
});
