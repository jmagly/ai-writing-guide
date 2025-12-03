/**
 * Tests for TestCaseGenerator
 *
 * @module test/unit/testing/generators/test-case-generator.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestCaseGenerator, GenerationOptions } from '../../../../src/testing/generators/test-case-generator.js';
import { UseCaseDocument, UseCaseScenario } from '../../../../src/testing/generators/use-case-parser.js';

describe('TestCaseGenerator', () => {
  let generator: TestCaseGenerator;

  const createMockDocument = (overrides?: Partial<UseCaseDocument>): UseCaseDocument => {
    const mainScenario: UseCaseScenario = {
      id: 'UC-001-MSS',
      name: 'Main Success Scenario',
      type: 'main',
      preconditions: [],
      steps: [
        { number: 1, actor: 'user', action: 'User enters username' },
        { number: 2, actor: 'system', action: 'System validates input' },
        { number: 3, actor: 'system', action: 'System displays dashboard' }
      ],
      postconditions: []
    };

    return {
      id: 'UC-001',
      title: 'User Login',
      actor: 'User',
      description: 'User logs into the system',
      preconditions: ['User has an account'],
      postconditions: ['User is authenticated'],
      mainScenario,
      extensions: [],
      exceptions: [],
      nfrs: ['NFR-PERF-001'],
      relatedUseCases: [],
      priority: 'high',
      ...overrides
    };
  };

  beforeEach(() => {
    generator = new TestCaseGenerator();
  });

  describe('generate', () => {
    it('should generate test suite from use case document', () => {
      const doc = createMockDocument();
      const result = generator.generate(doc);

      expect(result.success).toBe(true);
      expect(result.suite).toBeDefined();
      expect(result.suite?.useCaseId).toBe('UC-001');
      expect(result.suite?.testCases.length).toBeGreaterThan(0);
    });

    it('should generate positive test for main scenario', () => {
      const doc = createMockDocument();
      const result = generator.generate(doc);

      const positiveTests = result.suite?.testCases.filter(tc => tc.type === 'positive');
      expect(positiveTests?.length).toBeGreaterThan(0);

      const mainTest = positiveTests?.find(tc => tc.name.includes('Main Success Scenario'));
      expect(mainTest).toBeDefined();
      expect(mainTest?.steps.length).toBeGreaterThan(0);
    });

    it('should generate tests for extensions', () => {
      const extension: UseCaseScenario = {
        id: 'UC-001-EXT-2A',
        name: 'Validation Error',
        type: 'extension',
        preconditions: [],
        steps: [
          { number: 1, actor: 'system', action: 'System displays error' }
        ],
        postconditions: [],
        extensionOf: 'UC-001-MSS',
        triggeredAt: 2
      };

      const doc = createMockDocument({ extensions: [extension] });
      const result = generator.generate(doc);

      const extensionTests = result.suite?.testCases.filter(
        tc => tc.traceability.scenarioId === 'UC-001-EXT-2A'
      );
      expect(extensionTests?.length).toBeGreaterThan(0);
    });

    it('should generate error tests for exceptions', () => {
      const exception: UseCaseScenario = {
        id: 'UC-001-EXC-01',
        name: 'Network Error',
        type: 'exception',
        preconditions: [],
        steps: [
          { number: 1, actor: 'system', action: 'System shows error message' }
        ],
        postconditions: []
      };

      const doc = createMockDocument({ exceptions: [exception] });
      const result = generator.generate(doc);

      const errorTests = result.suite?.testCases.filter(tc => tc.type === 'error');
      expect(errorTests?.length).toBeGreaterThan(0);
    });

    it('should generate negative tests when enabled', () => {
      const doc = createMockDocument();
      const result = generator.generate(doc);

      const negativeTests = result.suite?.testCases.filter(tc => tc.type === 'negative');
      expect(negativeTests?.length).toBeGreaterThan(0);
    });

    it('should generate boundary tests when enabled', () => {
      const doc = createMockDocument();
      const result = generator.generate(doc);

      const boundaryTests = result.suite?.testCases.filter(tc => tc.type === 'boundary');
      expect(boundaryTests?.length).toBeGreaterThan(0);
    });

    it('should respect options to disable test types', () => {
      const options: GenerationOptions = {
        includeNegativeTests: false,
        includeBoundaryTests: false,
        includeErrorTests: false
      };

      generator = new TestCaseGenerator(options);
      const doc = createMockDocument();
      const result = generator.generate(doc);

      const negativeTests = result.suite?.testCases.filter(tc => tc.type === 'negative');
      const boundaryTests = result.suite?.testCases.filter(tc => tc.type === 'boundary');

      expect(negativeTests?.length).toBe(0);
      expect(boundaryTests?.length).toBe(0);
    });

    it('should track generation statistics', () => {
      const doc = createMockDocument();
      const result = generator.generate(doc);

      expect(result.stats.totalTestCases).toBeGreaterThan(0);
      expect(result.stats.generationTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Test Case Structure', () => {
    it('should generate test case with proper ID format', () => {
      const doc = createMockDocument();
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases[0];
      expect(testCase?.id).toMatch(/^TC-001-\d{3}$/);
    });

    it('should include traceability information', () => {
      const doc = createMockDocument();
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases[0];
      expect(testCase?.traceability.useCaseId).toBe('UC-001');
      expect(testCase?.traceability.nfrs).toContain('NFR-PERF-001');
    });

    it('should inherit priority from use case', () => {
      const doc = createMockDocument({ priority: 'critical' });
      const result = generator.generate(doc);

      const positiveTest = result.suite?.testCases.find(tc => tc.type === 'positive');
      expect(positiveTest?.priority).toBe('critical');
    });

    it('should include preconditions from use case', () => {
      const doc = createMockDocument({
        preconditions: ['User is authenticated', 'System is online']
      });
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases.find(tc => tc.type === 'positive');
      expect(testCase?.preconditions).toContain('User is authenticated');
      expect(testCase?.preconditions).toContain('System is online');
    });

    it('should include postconditions from use case', () => {
      const doc = createMockDocument({
        postconditions: ['Data is saved', 'User is notified']
      });
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases.find(tc => tc.type === 'positive');
      expect(testCase?.postconditions).toContain('Data is saved');
      expect(testCase?.postconditions).toContain('User is notified');
    });

    it('should generate tags for test cases', () => {
      const doc = createMockDocument();
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases[0];
      expect(testCase?.tags).toContain('UC-001');
    });

    it('should estimate test duration', () => {
      const doc = createMockDocument();
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases[0];
      expect(testCase?.estimatedDuration).toBeGreaterThan(0);
    });
  });

  describe('Test Steps', () => {
    it('should convert use case steps to test steps', () => {
      const doc = createMockDocument();
      const result = generator.generate(doc);

      const positiveTest = result.suite?.testCases.find(tc => tc.type === 'positive');
      expect(positiveTest?.steps.length).toBeGreaterThan(0);
      expect(positiveTest?.steps[0].action).toBeDefined();
      expect(positiveTest?.steps[0].expectedResult).toBeDefined();
    });

    it('should infer expected results for display actions', () => {
      const mainScenario: UseCaseScenario = {
        id: 'UC-001-MSS',
        name: 'Main',
        type: 'main',
        preconditions: [],
        steps: [
          { number: 1, actor: 'system', action: 'System displays welcome message' }
        ],
        postconditions: []
      };

      const doc = createMockDocument({ mainScenario });
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases.find(tc => tc.type === 'positive');
      const step = testCase?.steps[0];
      expect(step?.expectedResult).toContain('displayed');
    });

    it('should infer expected results for save actions', () => {
      const mainScenario: UseCaseScenario = {
        id: 'UC-001-MSS',
        name: 'Main',
        type: 'main',
        preconditions: [],
        steps: [
          { number: 1, actor: 'system', action: 'System saves the data' }
        ],
        postconditions: []
      };

      const doc = createMockDocument({ mainScenario });
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases.find(tc => tc.type === 'positive');
      const step = testCase?.steps[0];
      expect(step?.expectedResult.toLowerCase()).toContain('persist');
    });
  });

  describe('Test Data Requirements', () => {
    it('should extract data requirements from user input steps', () => {
      const mainScenario: UseCaseScenario = {
        id: 'UC-001-MSS',
        name: 'Main',
        type: 'main',
        preconditions: [],
        steps: [
          { number: 1, actor: 'user', action: 'User enters email address' },
          { number: 2, actor: 'user', action: 'User selects option from dropdown' }
        ],
        postconditions: []
      };

      const doc = createMockDocument({ mainScenario });
      generator = new TestCaseGenerator({ generateDataRequirements: true });
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases.find(tc => tc.type === 'positive');
      expect(testCase?.testData.length).toBeGreaterThan(0);
    });

    it('should skip data requirements when disabled', () => {
      const mainScenario: UseCaseScenario = {
        id: 'UC-001-MSS',
        name: 'Main',
        type: 'main',
        preconditions: [],
        steps: [
          { number: 1, actor: 'user', action: 'User enters data' }
        ],
        postconditions: []
      };

      const doc = createMockDocument({ mainScenario });
      generator = new TestCaseGenerator({ generateDataRequirements: false });
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases.find(tc => tc.type === 'positive');
      expect(testCase?.testData.length).toBe(0);
    });
  });

  describe('Test Level Determination', () => {
    it('should determine unit test level for simple scenarios', () => {
      const mainScenario: UseCaseScenario = {
        id: 'UC-001-MSS',
        name: 'Main',
        type: 'main',
        preconditions: [],
        steps: [
          { number: 1, actor: 'user', action: 'Step 1' },
          { number: 2, actor: 'system', action: 'Step 2' }
        ],
        postconditions: []
      };

      const doc = createMockDocument({ mainScenario });
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases.find(tc => tc.type === 'positive');
      expect(testCase?.level).toBe('unit');
    });

    it('should determine integration level for complex scenarios', () => {
      const mainScenario: UseCaseScenario = {
        id: 'UC-001-MSS',
        name: 'Main',
        type: 'main',
        preconditions: [],
        steps: [
          { number: 1, actor: 'user', action: 'Step 1' },
          { number: 2, actor: 'system', action: 'Step 2' },
          { number: 3, actor: 'system', action: 'Step 3' },
          { number: 4, actor: 'system', action: 'Step 4' },
          { number: 5, actor: 'system', action: 'Step 5' },
          { number: 6, actor: 'system', action: 'Step 6' }
        ],
        postconditions: []
      };

      const doc = createMockDocument({ mainScenario });
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases.find(tc => tc.type === 'positive');
      expect(testCase?.level).toBe('integration');
    });

    it('should determine E2E level for scenarios with external actors', () => {
      const mainScenario: UseCaseScenario = {
        id: 'UC-001-MSS',
        name: 'Main',
        type: 'main',
        preconditions: [],
        steps: [
          { number: 1, actor: 'user', action: 'User sends request' },
          { number: 2, actor: 'external', action: 'External API responds' }
        ],
        postconditions: []
      };

      const doc = createMockDocument({ mainScenario });
      const result = generator.generate(doc);

      const testCase = result.suite?.testCases.find(tc => tc.type === 'positive');
      expect(testCase?.level).toBe('e2e');
    });
  });

  describe('generateBatch', () => {
    it('should generate test suites for multiple documents', () => {
      const doc1 = createMockDocument({ id: 'UC-001', title: 'First' });
      const doc2 = createMockDocument({ id: 'UC-002', title: 'Second' });

      const results = generator.generateBatch([doc1, doc2]);

      expect(results.size).toBe(2);
      expect(results.get('UC-001')?.success).toBe(true);
      expect(results.get('UC-002')?.success).toBe(true);
    });
  });

  describe('Coverage Tracking', () => {
    it('should track coverage in test suite', () => {
      const extension: UseCaseScenario = {
        id: 'UC-001-EXT-2A',
        name: 'Extension',
        type: 'extension',
        preconditions: [],
        steps: [],
        postconditions: []
      };

      const exception: UseCaseScenario = {
        id: 'UC-001-EXC-01',
        name: 'Exception',
        type: 'exception',
        preconditions: [],
        steps: [],
        postconditions: []
      };

      const doc = createMockDocument({
        extensions: [extension],
        exceptions: [exception]
      });

      const result = generator.generate(doc);

      expect(result.suite?.coverage.mainScenario).toBe(true);
      expect(result.suite?.coverage.extensionsCovered).toBe(1);
      expect(result.suite?.coverage.exceptionsCovered).toBe(1);
    });
  });
});
