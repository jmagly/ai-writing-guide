/**
 * TestCodeGenerator - Generate test code scaffolds from test cases
 *
 * Generates test file skeletons (unit, integration, E2E) implementing
 * the arrange-act-assert pattern with TODO comments for manual completion.
 *
 * @module src/testing/generators/test-code-generator
 */

import { TestCase, TestSuite, TestStep } from './test-case-generator.js';

// ===========================
// Interfaces
// ===========================

export interface CodeGeneratorOptions {
  framework: 'vitest' | 'jest' | 'mocha' | 'playwright';
  language: 'typescript' | 'javascript';
  includeSetup?: boolean;
  includeTeardown?: boolean;
  includeComments?: boolean;
  indentSize?: number;
  generateMocks?: boolean;
}

export interface GeneratedFile {
  filename: string;
  content: string;
  testLevel: 'unit' | 'integration' | 'e2e';
  testCount: number;
}

export interface CodeGenerationResult {
  success: boolean;
  files: GeneratedFile[];
  errors: string[];
  warnings: string[];
  stats: {
    totalFiles: number;
    totalTests: number;
    unitTests: number;
    integrationTests: number;
    e2eTests: number;
  };
}

// ===========================
// TestCodeGenerator Class
// ===========================

export class TestCodeGenerator {
  private options: Required<CodeGeneratorOptions>;

  constructor(options: CodeGeneratorOptions) {
    this.options = {
      framework: options.framework,
      language: options.language,
      includeSetup: true,
      includeTeardown: true,
      includeComments: true,
      indentSize: 2,
      generateMocks: true,
      ...options
    };
  }

  /**
   * Generate test files from a test suite
   *
   * @param suite - Test suite with test cases
   * @returns Code generation result with generated files
   */
  generate(suite: TestSuite): CodeGenerationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const files: GeneratedFile[] = [];

    try {
      // Group test cases by level
      const unitTests = suite.testCases.filter(tc => tc.level === 'unit');
      const integrationTests = suite.testCases.filter(tc => tc.level === 'integration');
      const e2eTests = suite.testCases.filter(tc => tc.level === 'e2e');

      // Generate unit test file
      if (unitTests.length > 0) {
        const unitFile = this.generateTestFile(unitTests, suite, 'unit');
        files.push(unitFile);
      }

      // Generate integration test file
      if (integrationTests.length > 0) {
        const integrationFile = this.generateTestFile(integrationTests, suite, 'integration');
        files.push(integrationFile);
      }

      // Generate E2E test file
      if (e2eTests.length > 0) {
        const e2eFile = this.generateE2ETestFile(e2eTests, suite);
        files.push(e2eFile);
      }

      return {
        success: true,
        files,
        errors: [],
        warnings,
        stats: {
          totalFiles: files.length,
          totalTests: suite.testCases.length,
          unitTests: unitTests.length,
          integrationTests: integrationTests.length,
          e2eTests: e2eTests.length
        }
      };
    } catch (error: any) {
      return {
        success: false,
        files,
        errors: [`Code generation failed: ${error.message}`],
        warnings,
        stats: {
          totalFiles: 0,
          totalTests: 0,
          unitTests: 0,
          integrationTests: 0,
          e2eTests: 0
        }
      };
    }
  }

  /**
   * Generate a test file for unit or integration tests
   */
  private generateTestFile(
    testCases: TestCase[],
    suite: TestSuite,
    level: 'unit' | 'integration'
  ): GeneratedFile {
    const indent = ' '.repeat(this.options.indentSize);
    const ext = this.options.language === 'typescript' ? '.ts' : '.js';
    const filename = `${suite.useCaseId.toLowerCase()}.${level}.test${ext}`;

    const lines: string[] = [];

    // File header
    lines.push(this.generateFileHeader(suite, level));
    lines.push('');

    // Imports
    lines.push(this.generateImports(level));
    lines.push('');

    // Test suite
    lines.push(`describe('${suite.name} - ${level.charAt(0).toUpperCase() + level.slice(1)} Tests', () => {`);

    // Setup/teardown
    if (this.options.includeSetup) {
      lines.push(this.generateSetup(indent, suite));
    }

    if (this.options.includeTeardown) {
      lines.push(this.generateTeardown(indent));
    }

    // Test cases
    for (const testCase of testCases) {
      lines.push('');
      lines.push(this.generateTestCase(testCase, indent));
    }

    lines.push('});');
    lines.push('');

    return {
      filename,
      content: lines.join('\n'),
      testLevel: level,
      testCount: testCases.length
    };
  }

  /**
   * Generate an E2E test file (Playwright format)
   */
  private generateE2ETestFile(testCases: TestCase[], suite: TestSuite): GeneratedFile {
    const indent = ' '.repeat(this.options.indentSize);
    const ext = this.options.language === 'typescript' ? '.ts' : '.js';
    const filename = `${suite.useCaseId.toLowerCase()}.e2e.test${ext}`;

    const lines: string[] = [];

    // File header
    lines.push(this.generateFileHeader(suite, 'e2e'));
    lines.push('');

    // Playwright imports
    if (this.options.framework === 'playwright') {
      lines.push("import { test, expect } from '@playwright/test';");
    } else {
      lines.push(this.generateImports('e2e'));
    }
    lines.push('');

    // Test suite
    lines.push(`test.describe('${suite.name} - E2E Tests', () => {`);

    // Setup
    if (this.options.includeSetup) {
      lines.push(`${indent}test.beforeEach(async ({ page }) => {`);
      lines.push(`${indent}${indent}// TODO: Navigate to application and set up initial state`);
      lines.push(`${indent}${indent}await page.goto('/');`);
      lines.push(`${indent}});`);
      lines.push('');
    }

    // Test cases
    for (const testCase of testCases) {
      lines.push(this.generateE2ETestCase(testCase, indent));
      lines.push('');
    }

    lines.push('});');
    lines.push('');

    return {
      filename,
      content: lines.join('\n'),
      testLevel: 'e2e',
      testCount: testCases.length
    };
  }

  /**
   * Generate file header with metadata
   */
  private generateFileHeader(suite: TestSuite, level: string): string {
    if (!this.options.includeComments) return '';

    return `/**
 * ${level.toUpperCase()} Tests: ${suite.name}
 *
 * Auto-generated from ${suite.useCaseId}
 * Generated at: ${suite.generatedAt}
 *
 * @module test/${level}/${suite.useCaseId.toLowerCase()}
 */`;
  }

  /**
   * Generate imports based on framework
   */
  private generateImports(level: 'unit' | 'integration' | 'e2e'): string {
    switch (this.options.framework) {
      case 'vitest':
        return "import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';";
      case 'jest':
        return "import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';";
      case 'mocha':
        return "import { describe, it, before, after } from 'mocha';\nimport { expect } from 'chai';";
      case 'playwright':
        return "import { test, expect } from '@playwright/test';";
      default:
        return '';
    }
  }

  /**
   * Generate setup block
   */
  private generateSetup(indent: string, suite: TestSuite): string {
    const lines: string[] = [];
    const mockFn = this.options.framework === 'vitest' ? 'vi.fn()' : 'jest.fn()';

    lines.push(`${indent}// Test fixtures`);

    if (this.options.language === 'typescript') {
      lines.push(`${indent}let testContext: Record<string, any>;`);
    } else {
      lines.push(`${indent}let testContext;`);
    }

    lines.push('');
    lines.push(`${indent}beforeEach(() => {`);
    lines.push(`${indent}${indent}// Arrange: Set up test context`);
    lines.push(`${indent}${indent}testContext = {`);
    lines.push(`${indent}${indent}${indent}// TODO: Add test fixtures`);
    lines.push(`${indent}${indent}};`);

    if (this.options.generateMocks) {
      lines.push('');
      lines.push(`${indent}${indent}// TODO: Set up mocks`);
      lines.push(`${indent}${indent}// const mockDependency = ${mockFn};`);
    }

    lines.push(`${indent}});`);

    return lines.join('\n');
  }

  /**
   * Generate teardown block
   */
  private generateTeardown(indent: string): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(`${indent}afterEach(() => {`);
    lines.push(`${indent}${indent}// TODO: Clean up after each test`);

    if (this.options.framework === 'vitest') {
      lines.push(`${indent}${indent}vi.clearAllMocks();`);
    } else if (this.options.framework === 'jest') {
      lines.push(`${indent}${indent}jest.clearAllMocks();`);
    }

    lines.push(`${indent}});`);

    return lines.join('\n');
  }

  /**
   * Generate a single test case
   */
  private generateTestCase(testCase: TestCase, indent: string): string {
    const lines: string[] = [];
    const indent2 = indent + indent;
    const indent3 = indent2 + indent;

    // Test description comment
    if (this.options.includeComments) {
      lines.push(`${indent}/**`);
      lines.push(`${indent} * ${testCase.id}: ${testCase.name}`);
      lines.push(`${indent} * ${testCase.description}`);
      lines.push(`${indent} * Type: ${testCase.type}`);
      lines.push(`${indent} * Priority: ${testCase.priority}`);
      lines.push(`${indent} */`);
    }

    // Test function
    lines.push(`${indent}it('${this.escapeString(testCase.name)}', async () => {`);

    // Preconditions
    if (testCase.preconditions.length > 0) {
      lines.push(`${indent2}// Preconditions:`);
      for (const pre of testCase.preconditions) {
        lines.push(`${indent2}// - ${pre}`);
      }
      lines.push('');
    }

    // Arrange
    lines.push(`${indent2}// Arrange`);
    if (testCase.testData.length > 0) {
      lines.push(`${indent2}const testData = {`);
      for (const data of testCase.testData) {
        lines.push(`${indent3}${data.name}: ${this.getExampleValue(data.examples)}, // ${data.type}: ${data.constraints.join(', ')}`);
      }
      lines.push(`${indent2}};`);
    } else {
      lines.push(`${indent2}// TODO: Set up test data`);
    }
    lines.push('');

    // Act
    lines.push(`${indent2}// Act`);
    for (const step of testCase.steps) {
      if (step.action.toLowerCase().includes('verify') ||
          step.action.toLowerCase().includes('check')) {
        continue;  // Skip verification steps for Act section
      }
      lines.push(`${indent2}// Step ${step.number}: ${step.action}`);
      lines.push(`${indent2}// TODO: Implement action`);
    }
    lines.push('');

    // Assert
    lines.push(`${indent2}// Assert`);
    for (const step of testCase.steps) {
      if (!step.action.toLowerCase().includes('verify') &&
          !step.action.toLowerCase().includes('check')) {
        continue;  // Skip action steps for Assert section
      }
      lines.push(`${indent2}// ${step.expectedResult}`);
      lines.push(`${indent2}// expect(result).toEqual(expected);`);
    }

    // Default assertion if no verify steps
    const hasVerifySteps = testCase.steps.some(s =>
      s.action.toLowerCase().includes('verify') ||
      s.action.toLowerCase().includes('check')
    );
    if (!hasVerifySteps) {
      lines.push(`${indent2}// TODO: Add assertions`);
      lines.push(`${indent2}expect(true).toBe(true); // Placeholder`);
    }

    // Postconditions
    if (testCase.postconditions.length > 0) {
      lines.push('');
      lines.push(`${indent2}// Postconditions:`);
      for (const post of testCase.postconditions) {
        lines.push(`${indent2}// - ${post}`);
      }
    }

    lines.push(`${indent}});`);

    return lines.join('\n');
  }

  /**
   * Generate E2E test case (Playwright format)
   */
  private generateE2ETestCase(testCase: TestCase, indent: string): string {
    const lines: string[] = [];
    const indent2 = indent + indent;

    // Test description comment
    if (this.options.includeComments) {
      lines.push(`${indent}/**`);
      lines.push(`${indent} * ${testCase.id}: ${testCase.name}`);
      lines.push(`${indent} * ${testCase.description}`);
      lines.push(`${indent} */`);
    }

    // Test function
    lines.push(`${indent}test('${this.escapeString(testCase.name)}', async ({ page }) => {`);

    // Steps
    for (const step of testCase.steps) {
      lines.push(`${indent2}// Step ${step.number}: ${step.action}`);
      lines.push(this.generateE2EStepCode(step, indent2));
      lines.push('');
    }

    // Final assertion
    lines.push(`${indent2}// TODO: Add final assertions`);
    lines.push(`${indent2}await expect(page).toHaveURL(/.*expected/);`);

    lines.push(`${indent}});`);

    return lines.join('\n');
  }

  /**
   * Generate code for an E2E step
   */
  private generateE2EStepCode(step: TestStep, indent: string): string {
    const action = step.action.toLowerCase();

    if (action.includes('click') || action.includes('press')) {
      return `${indent}await page.click('selector'); // TODO: Update selector`;
    }
    if (action.includes('enter') || action.includes('type') || action.includes('input')) {
      return `${indent}await page.fill('selector', '${step.testData || 'test-data'}'); // TODO: Update`;
    }
    if (action.includes('navigate') || action.includes('go to')) {
      return `${indent}await page.goto('/path'); // TODO: Update path`;
    }
    if (action.includes('wait')) {
      return `${indent}await page.waitForSelector('selector'); // TODO: Update selector`;
    }
    if (action.includes('verify') || action.includes('check') || action.includes('see')) {
      return `${indent}await expect(page.locator('selector')).toBeVisible(); // ${step.expectedResult}`;
    }

    return `${indent}// TODO: Implement step - ${step.action}`;
  }

  /**
   * Escape string for use in test names
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  /**
   * Get example value from test data
   */
  private getExampleValue(examples: string[]): string {
    if (examples.length === 0) return "'test-value'";
    const example = examples[0];
    if (example.match(/^\d+$/)) return example;
    return `'${example}'`;
  }
}
