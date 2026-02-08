/**
 * Tests for TestCodeGenerator
 *
 * @module test/unit/testing/generators/test-code-generator.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestCodeGenerator, CodeGeneratorOptions } from '../../../../src/testing/generators/test-code-generator.js';
import { TestSuite, TestCase } from '../../../../src/testing/generators/test-case-generator.js';

describe('TestCodeGenerator', () => {
  let generator: TestCodeGenerator;

  const createMockTestCase = (overrides?: Partial<TestCase>): TestCase => ({
    id: 'TC-001-001',
    name: 'Test Case Name',
    description: 'Test case description',
    priority: 'high',
    type: 'positive',
    level: 'unit',
    preconditions: ['User is logged in'],
    steps: [
      { number: 1, action: 'User enters data', expectedResult: 'Data is accepted' },
      { number: 2, action: 'Verify result', expectedResult: 'Result is displayed' }
    ],
    postconditions: ['Data is saved'],
    testData: [
      { name: 'email', type: 'email', constraints: ['valid format'], examples: ['test@example.com'] }
    ],
    traceability: {
      useCaseId: 'UC-001',
      scenarioId: 'UC-001-MSS',
      nfrs: ['NFR-PERF-001']
    },
    tags: ['UC-001', 'unit'],
    estimatedDuration: 1000,
    ...overrides
  });

  const createMockTestSuite = (testCases: TestCase[]): TestSuite => ({
    id: 'TS-UC-001',
    name: 'Test Suite: User Login',
    description: 'Auto-generated test suite',
    useCaseId: 'UC-001',
    testCases,
    coverage: {
      mainScenario: true,
      extensionsCovered: 0,
      exceptionsCovered: 0,
      total: testCases.length
    },
    generatedAt: new Date().toISOString()
  });

  beforeEach(() => {
    generator = new TestCodeGenerator({
      framework: 'vitest',
      language: 'typescript'
    });
  });

  describe('generate', () => {
    it('should generate code from test suite', () => {
      const testCase = createMockTestCase();
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);

      expect(result.success).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('should track generation statistics', () => {
      const testCase = createMockTestCase();
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);

      expect(result.stats.totalTests).toBe(1);
      expect(result.stats.unitTests).toBe(1);
    });

    it('should separate tests by level', () => {
      const unitTest = createMockTestCase({ level: 'unit' });
      const integrationTest = createMockTestCase({ level: 'integration' });
      const e2eTest = createMockTestCase({ level: 'e2e' });
      const suite = createMockTestSuite([unitTest, integrationTest, e2eTest]);

      const result = generator.generate(suite);

      expect(result.stats.unitTests).toBe(1);
      expect(result.stats.integrationTests).toBe(1);
      expect(result.stats.e2eTests).toBe(1);
      expect(result.files.length).toBe(3);
    });
  });

  describe('File Generation', () => {
    it('should generate test files for each level', () => {
      // Test all three levels in one test
      const levels: Array<'unit' | 'integration' | 'e2e'> = ['unit', 'integration', 'e2e'];
      const filenameSuffixes = ['.unit.test.ts', '.integration.test.ts', '.e2e.test.ts'];

      for (let i = 0; i < levels.length; i++) {
        const testCase = createMockTestCase({ level: levels[i] });
        const suite = createMockTestSuite([testCase]);
        const result = generator.generate(suite);

        const file = result.files.find(f => f.testLevel === levels[i]);
        expect(file).toBeDefined();
        expect(file?.filename).toContain(filenameSuffixes[i]);
      }
    });

    it('should not generate file for level with no tests', () => {
      const testCase = createMockTestCase({ level: 'unit' });
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);

      const integrationFile = result.files.find(f => f.testLevel === 'integration');
      const e2eFile = result.files.find(f => f.testLevel === 'e2e');

      expect(integrationFile).toBeUndefined();
      expect(e2eFile).toBeUndefined();
    });
  });

  describe('Vitest Output', () => {
    beforeEach(() => {
      generator = new TestCodeGenerator({
        framework: 'vitest',
        language: 'typescript'
      });
    });

    it('should include vitest imports and structure', () => {
      const testCase = createMockTestCase();
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);
      const content = result.files[0].content;

      // Check all vitest patterns
      expect(content).toContain("import { describe, it, expect");
      expect(content).toContain("from 'vitest'");
      expect(content).toContain('describe(');
      expect(content).toContain('it(');
    });

    it('should include vi.fn() for mocks', () => {
      generator = new TestCodeGenerator({
        framework: 'vitest',
        language: 'typescript',
        generateMocks: true
      });

      const testCase = createMockTestCase();
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);
      const content = result.files[0].content;

      expect(content).toContain('vi.fn()');
    });
  });

  describe('Jest Output', () => {
    it('should include jest imports', () => {
      generator = new TestCodeGenerator({
        framework: 'jest',
        language: 'typescript'
      });

      const testCase = createMockTestCase();
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);
      const content = result.files[0].content;

      expect(content).toContain("from '@jest/globals'");
    });
  });

  describe('Playwright Output', () => {
    beforeEach(() => {
      generator = new TestCodeGenerator({
        framework: 'playwright',
        language: 'typescript'
      });
    });

    it('should include playwright imports and structure for E2E', () => {
      const testCase = createMockTestCase({ level: 'e2e' });
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);
      const content = result.files[0].content;

      // Check all playwright patterns
      expect(content).toContain("from '@playwright/test'");
      expect(content).toContain('test.describe(');
      expect(content).toContain('{ page }');
    });

    it('should generate page actions', () => {
      const testCase = createMockTestCase({
        level: 'e2e',
        steps: [
          { number: 1, action: 'Click submit button', expectedResult: 'Form submitted' },
          { number: 2, action: 'Enter username', expectedResult: 'Username accepted', testData: 'testuser' }
        ]
      });
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);
      const content = result.files[0].content;

      expect(content).toContain('await page.click');
      expect(content).toContain('await page.fill');
    });
  });

  describe('JavaScript Output', () => {
    it('should generate .js file extension', () => {
      generator = new TestCodeGenerator({
        framework: 'vitest',
        language: 'javascript'
      });

      const testCase = createMockTestCase();
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);

      expect(result.files[0].filename).toContain('.test.js');
    });
  });

  describe('Test Structure', () => {
    it('should include Arrange-Act-Assert comments', () => {
      const testCase = createMockTestCase();
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);
      const content = result.files[0].content;

      expect(content).toContain('// Arrange');
      expect(content).toContain('// Act');
      expect(content).toContain('// Assert');
    });

    it('should include test case metadata and conditions in comments', () => {
      generator = new TestCodeGenerator({
        framework: 'vitest',
        language: 'typescript',
        includeComments: true
      });

      const testCase = createMockTestCase({
        id: 'TC-001-005',
        priority: 'critical',
        preconditions: ['User is authenticated', 'System is online'],
        postconditions: ['Data is persisted', 'User is notified']
      });
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);
      const content = result.files[0].content;

      // Check all metadata and conditions
      expect(content).toContain('TC-001-005');
      expect(content).toContain('critical');
      expect(content).toContain('User is authenticated');
      expect(content).toContain('System is online');
      expect(content).toContain('Data is persisted');
      expect(content).toContain('User is notified');
    });

    it('should include test data setup', () => {
      const testCase = createMockTestCase({
        testData: [
          { name: 'username', type: 'string', constraints: [], examples: ['testuser'] }
        ]
      });
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);
      const content = result.files[0].content;

      expect(content).toContain('testData');
      expect(content).toContain('username');
    });
  });

  describe('Setup and Teardown', () => {
    it('should include beforeEach and afterEach when enabled', () => {
      const configs = [
        { includeSetup: true, includeTeardown: false, expected: 'beforeEach' },
        { includeSetup: false, includeTeardown: true, expected: 'afterEach' }
      ];

      for (const config of configs) {
        generator = new TestCodeGenerator({
          framework: 'vitest',
          language: 'typescript',
          ...config
        });

        const testCase = createMockTestCase();
        const suite = createMockTestSuite([testCase]);
        const result = generator.generate(suite);
        const content = result.files[0].content;

        expect(content).toContain(config.expected);
      }
    });

    it('should not include setup when disabled', () => {
      generator = new TestCodeGenerator({
        framework: 'vitest',
        language: 'typescript',
        includeSetup: false,
        includeTeardown: false
      });

      const testCase = createMockTestCase();
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);
      const content = result.files[0].content;

      // Note: imports still include beforeEach/afterEach, but no actual blocks
      expect(content).not.toMatch(/^\s+beforeEach\s*\(/m);
      expect(content).not.toMatch(/^\s+afterEach\s*\(/m);
    });
  });

  describe('Comment Options', () => {
    it('should include or exclude file header comments based on option', () => {
      const configs = [
        { includeComments: true, shouldContain: true },
        { includeComments: false, shouldContain: false }
      ];

      for (const config of configs) {
        generator = new TestCodeGenerator({
          framework: 'vitest',
          language: 'typescript',
          includeComments: config.includeComments
        });

        const testCase = createMockTestCase();
        const suite = createMockTestSuite([testCase]);
        const result = generator.generate(suite);
        const content = result.files[0].content;

        if (config.shouldContain) {
          expect(content).toContain('/**');
          expect(content).toContain('@module');
        } else {
          expect(content).not.toContain('/**');
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty test suite', () => {
      const suite = createMockTestSuite([]);

      const result = generator.generate(suite);

      expect(result.success).toBe(true);
      expect(result.files.length).toBe(0);
    });

    it('should escape quotes in test names', () => {
      const testCase = createMockTestCase({
        name: "Test with 'single' and \"double\" quotes"
      });
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);
      const content = result.files[0].content;

      expect(content).toContain("\\'single\\'");
    });

    it('should handle test case with no steps', () => {
      const testCase = createMockTestCase({ steps: [] });
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);

      expect(result.success).toBe(true);
    });

    it('should handle test case with no test data', () => {
      const testCase = createMockTestCase({ testData: [] });
      const suite = createMockTestSuite([testCase]);

      const result = generator.generate(suite);
      const content = result.files[0].content;

      expect(content).toContain('TODO');
    });
  });
});
