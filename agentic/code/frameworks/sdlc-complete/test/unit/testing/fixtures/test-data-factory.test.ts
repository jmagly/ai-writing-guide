/**
 * Tests for TestDataFactory
 * Validates test data generation for all SDLC artifact types
 * Target: 80%+ unit test coverage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TestDataFactory,
  type UseCase,
  type NFR,
  type NFRCategory,
  type ADR,
  type TestCase,
  type TestPlan,
  type GitCommit,
  type PullRequest,
  type ProjectIntake,
  type RiskRegister,
  type IterationPlan,
  type ComponentDesign,
  type SupplementalSpec
} from '../../../../src/testing/fixtures/test-data-factory.ts';

describe('TestDataFactory', () => {
  let factory: TestDataFactory;

  beforeEach(() => {
    factory = new TestDataFactory();
  });

  describe('Seeded Random Generation', () => {
    it('should produce reproducible results with same seed', () => {
      const factory1 = new TestDataFactory(12345);
      const factory2 = new TestDataFactory(12345);

      const useCase1 = factory1.generateUseCase();
      const useCase2 = factory2.generateUseCase();

      expect(useCase1).toEqual(useCase2);
    });

    it('should produce different results with different seeds', () => {
      const factory1 = new TestDataFactory(12345);
      const factory2 = new TestDataFactory(67890);

      const useCase1 = factory1.generateUseCase();
      const useCase2 = factory2.generateUseCase();

      expect(useCase1).not.toEqual(useCase2);
    });

    it('should allow seed to be set after construction and produce varied but consistent output', () => {
      const factory1 = new TestDataFactory();
      const factory2 = new TestDataFactory();

      factory1.seed(99999);
      factory2.seed(99999);

      const useCase1 = factory1.generateUseCase();
      const useCase2 = factory2.generateUseCase();

      expect(useCase1).toEqual(useCase2);

      // Verify varied output with same seed
      factory.seed(42);
      const useCases: UseCase[] = [];
      for (let i = 0; i < 5; i++) {
        useCases.push(factory.generateUseCase());
      }

      // All use cases should be unique
      const ids = useCases.map(uc => uc.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);

      // But reproducible with same seed
      factory.seed(42);
      const useCases2: UseCase[] = [];
      for (let i = 0; i < 5; i++) {
        useCases2.push(factory.generateUseCase());
      }

      expect(useCases).toEqual(useCases2);
    });
  });

  describe('Use Case Generation', () => {
    it('should generate valid use case with default options and respect custom options', () => {
      // Default generation
      const useCase = factory.generateUseCase();
      expect(useCase.id).toMatch(/^UC-\d{3}$/);
      expect(useCase.title).toBeTruthy();
      expect(useCase.actors.length).toBeGreaterThan(0);
      expect(useCase.preconditions.length).toBeGreaterThan(0);
      expect(useCase.mainScenario.length).toBeGreaterThan(0);
      expect(useCase.acceptanceCriteria.length).toBeGreaterThan(0);

      // Custom options
      const customActors = ['Actor1', 'Actor2', 'Actor3'];
      const custom = factory.generateUseCase({
        id: 'UC-CUSTOM',
        title: 'Custom Title',
        actors: customActors,
        scenarioStepCount: 10,
        alternateFlowCount: 3
      });
      expect(custom.id).toBe('UC-CUSTOM');
      expect(custom.title).toBe('Custom Title');
      expect(custom.actors).toEqual(customActors);
      expect(custom.mainScenario).toHaveLength(10);
      expect(custom.alternateFlows).toHaveLength(3);
    });

    it('should generate properly formatted scenario steps, alternate flows, and acceptance criteria', () => {
      const useCase = factory.generateUseCase({ alternateFlowCount: 2 });

      // Main scenario numbered steps
      useCase.mainScenario.forEach((step, index) => {
        expect(step).toMatch(new RegExp(`^${index + 1}\\.`));
      });

      // Alternate flows as nested arrays
      expect(Array.isArray(useCase.alternateFlows)).toBe(true);
      useCase.alternateFlows.forEach(flow => {
        expect(Array.isArray(flow)).toBe(true);
        expect(flow.length).toBeGreaterThan(0);
      });

      // Acceptance criteria with identifiers
      useCase.acceptanceCriteria.forEach(ac => {
        expect(ac).toMatch(/^AC\d+:/);
      });
    });

    it('should handle edge cases for use case generation', () => {
      const zeroFlows = factory.generateUseCase({ alternateFlowCount: 0 });
      expect(zeroFlows.alternateFlows).toHaveLength(0);

      const minSteps = factory.generateUseCase({ scenarioStepCount: 1 });
      expect(minSteps.mainScenario).toHaveLength(1);
    });
  });

  describe('NFR Generation', () => {
    it('should generate valid NFRs for all categories with proper structure and custom options', () => {
      const categories: NFRCategory[] = ['Performance', 'Security', 'Reliability', 'Usability', 'Scalability'];

      for (const category of categories) {
        const nfr = factory.generateNFR(category);
        expect(nfr.id, `NFR id format failed for ${category}`).toMatch(/^NFR-[A-Z]{4}-\d{3}$/);
        expect(nfr.category, `Category mismatch for ${category}`).toBe(category);
        expect(nfr.description, `Description missing for ${category}`).toBeTruthy();
        expect(nfr.target, `Target missing for ${category}`).toBeTruthy();
        expect(nfr.measurement, `Measurement missing for ${category}`).toBeTruthy();
        expect(['P0', 'P1', 'P2'], `Invalid priority for ${category}`).toContain(nfr.priority);
      }

      // Custom options
      const custom = factory.generateNFR('Performance', {
        id: 'NFR-CUSTOM',
        description: 'Custom description',
        priority: 'P0'
      });
      expect(custom.id).toBe('NFR-CUSTOM');
      expect(custom.description).toBe('Custom description');
      expect(custom.priority).toBe('P0');
    });

    it('should generate category-specific content', () => {
      factory.seed(42);
      const perfNFR = factory.generateNFR('Performance');
      const secNFR = factory.generateNFR('Security');

      // Performance NFRs should have performance-related content
      expect(
        perfNFR.description.toLowerCase().includes('performance') ||
        perfNFR.description.toLowerCase().includes('response') ||
        perfNFR.description.toLowerCase().includes('latency') ||
        perfNFR.description.toLowerCase().includes('concurrent') ||
        perfNFR.description.toLowerCase().includes('time')
      ).toBe(true);

      // Security NFRs should have security-related content
      expect(
        secNFR.description.toLowerCase().includes('security') ||
        secNFR.description.toLowerCase().includes('encrypt') ||
        secNFR.description.toLowerCase().includes('authentication') ||
        secNFR.description.toLowerCase().includes('log')
      ).toBe(true);
    });
  });

  describe('Supplemental Spec Generation', () => {
    it('should generate supplemental spec with valid NFRs and handle custom counts', () => {
      // Default
      const spec = factory.generateSupplementalSpec();
      expect(spec.id).toMatch(/^SUPP-\d{3}$/);
      expect(spec.title).toBe('Supplemental Specification');
      expect(spec.nfrs).toHaveLength(5);
      expect(spec.createdAt).toBeTruthy();

      spec.nfrs.forEach(nfr => {
        expect(nfr.id).toBeTruthy();
        expect(nfr.category).toBeTruthy();
        expect(nfr.description).toBeTruthy();
      });

      // Custom count
      const custom = factory.generateSupplementalSpec(10);
      expect(custom.nfrs).toHaveLength(10);

      // Edge case
      const empty = factory.generateSupplementalSpec(0);
      expect(empty.nfrs).toHaveLength(0);
    });
  });

  describe('ADR Generation', () => {
    it('should generate valid ADR with proper structure and custom options', () => {
      // Default
      const adr = factory.generateADR();
      expect(adr.number).toBeGreaterThan(0);
      expect(adr.title).toBeTruthy();
      expect(['Proposed', 'Accepted', 'Deprecated', 'Superseded']).toContain(adr.status);
      expect(adr.context).toBeTruthy();
      expect(adr.decision).toBeTruthy();
      expect(adr.consequences.length).toBeGreaterThan(0);
      expect(adr.alternatives.length).toBeGreaterThan(0);
      expect(adr.date).toBeTruthy();

      // Valid ISO date
      const date = new Date(adr.date);
      expect(date.toString()).not.toBe('Invalid Date');

      // Custom options
      const custom = factory.generateADR({
        number: 42,
        title: 'Custom ADR Title',
        status: 'Deprecated'
      });
      expect(custom.number).toBe(42);
      expect(custom.title).toBe('Custom ADR Title');
      expect(custom.status).toBe('Deprecated');
    });

    it('should generate properly formatted consequences and alternatives', () => {
      const adr = factory.generateADR();

      // Consequences with positive/negative markers
      adr.consequences.forEach(consequence => {
        expect(
          consequence.startsWith('Positive:') || consequence.startsWith('Negative:')
        ).toBe(true);
      });

      // Alternatives with labels
      adr.alternatives.forEach(alt => {
        expect(alt).toMatch(/^Alternative \d+:/);
      });
    });
  });

  describe('SAD Section Generation', () => {
    it('should generate all SAD sections with proper formatting', () => {
      const sections = [
        'overview', 'goals', 'constraints', 'principles',
        'components', 'deployment', 'security', 'performance'
      ] as const;

      for (const section of sections) {
        const content = factory.generateSADSection(section);
        expect(content, `Content missing for ${section}`).toBeTruthy();
        expect(typeof content, `Wrong type for ${section}`).toBe('string');
        expect(content.length, `Content too short for ${section}`).toBeGreaterThan(10);
      }

      // Section-specific formatting checks
      const overview = factory.generateSADSection('overview');
      expect(overview).toContain('# Architecture Overview');

      const goals = factory.generateSADSection('goals');
      expect(goals).toContain('# Architecture Goals');
      expect(goals).toMatch(/\d+\./);

      const constraints = factory.generateSADSection('constraints');
      expect(constraints).toContain('# Constraints');
      expect(constraints).toContain('-');

      const principles = factory.generateSADSection('principles');
      const knownPrinciples = ['Separation of Concerns', 'DRY', 'SOLID', 'KISS', 'YAGNI'];
      expect(knownPrinciples.some(p => principles.includes(p))).toBe(true);

      const components = factory.generateSADSection('components');
      expect(components).toContain('# Components');
      expect(components).toContain('##');
    });
  });

  describe('Component Design Generation', () => {
    it('should generate component design with valid structure and proper interface naming', () => {
      const component = factory.generateComponentDesign('UserService');

      expect(component.name).toBe('UserService');
      expect(component.purpose).toBeTruthy();
      expect(component.responsibilities.length).toBeGreaterThan(0);
      expect(component.interfaces.length).toBeGreaterThan(0);
      expect(component.dependencies.length).toBeGreaterThan(0);

      // Interface naming convention
      component.interfaces.forEach(iface => {
        expect(iface).toMatch(/^I[A-Z]/);
      });

      // Different component names
      const names = ['AuthService', 'DataRepository', 'APIGateway'];
      for (const name of names) {
        const comp = factory.generateComponentDesign(name);
        expect(comp.name, `Name mismatch for ${name}`).toBe(name);
      }
    });
  });

  describe('Test Case Generation', () => {
    it('should generate valid test case with proper structure and custom options', () => {
      // Default
      const testCase = factory.generateTestCase();
      expect(testCase.id).toMatch(/^TC-\d{3}$/);
      expect(testCase.title).toBeTruthy();
      expect(testCase.preconditions.length).toBeGreaterThan(0);
      expect(testCase.steps.length).toBeGreaterThan(0);
      expect(testCase.expectedResults.length).toBeGreaterThan(0);
      expect(['P0', 'P1', 'P2']).toContain(testCase.priority);

      // Step-to-result correspondence
      expect(testCase.steps.length).toBe(testCase.expectedResults.length);

      // Custom options
      const custom = factory.generateTestCase({
        id: 'TC-CUSTOM',
        title: 'Custom Test',
        priority: 'P0',
        stepCount: 8
      });
      expect(custom.id).toBe('TC-CUSTOM');
      expect(custom.title).toBe('Custom Test');
      expect(custom.priority).toBe('P0');
      expect(custom.steps).toHaveLength(8);
      expect(custom.expectedResults).toHaveLength(8);
    });

    it('should generate properly formatted steps and expected results', () => {
      const testCase = factory.generateTestCase();

      // Steps with labels
      testCase.steps.forEach((step, index) => {
        expect(step).toMatch(new RegExp(`^Step ${index + 1}:`));
      });

      // Expected results with labels
      testCase.expectedResults.forEach(result => {
        expect(result).toMatch(/^Expected:/);
      });
    });
  });

  describe('Test Plan Generation', () => {
    it('should generate valid test plan with valid test cases and handle custom counts', () => {
      // Default
      const plan = factory.generateTestPlan();
      expect(plan.id).toMatch(/^TP-\d{3}$/);
      expect(plan.title).toBe('Test Plan');
      expect(plan.objectives.length).toBeGreaterThan(0);
      expect(plan.scope).toBeTruthy();
      expect(plan.testCases).toHaveLength(5);
      expect(plan.schedule).toBeTruthy();
      expect(plan.schedule).toMatch(/^Week \d+$/);

      plan.testCases.forEach(tc => {
        expect(tc.id).toBeTruthy();
        expect(tc.title).toBeTruthy();
        expect(tc.steps.length).toBeGreaterThan(0);
      });

      // Custom count
      const custom = factory.generateTestPlan(10);
      expect(custom.testCases).toHaveLength(10);

      // Edge case
      const empty = factory.generateTestPlan(0);
      expect(empty.testCases).toHaveLength(0);
    });
  });

  describe('Test Result Generation', () => {
    let testCase: TestCase;

    beforeEach(() => {
      testCase = factory.generateTestCase();
    });

    it('should generate passed result with proper structure', () => {
      const result = factory.generateTestResult(testCase, true);

      expect(result.testCaseId).toBe(testCase.id);
      expect(result.status).toBe('passed');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.message).toBeUndefined();
      expect(result.timestamp).toBeTruthy();

      // Valid ISO timestamp
      const date = new Date(result.timestamp);
      expect(date.toString()).not.toBe('Invalid Date');

      // Realistic execution time
      expect(result.executionTime).toBeGreaterThanOrEqual(10);
      expect(result.executionTime).toBeLessThanOrEqual(5000);
    });

    it('should generate failed or skipped result with error messages', () => {
      const result = factory.generateTestResult(testCase, false);

      expect(result.testCaseId).toBe(testCase.id);
      expect(['failed', 'skipped']).toContain(result.status);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeTruthy();

      // Error message for failed tests
      factory.seed(12345);
      const failedResult = factory.generateTestResult(testCase, false);
      if (failedResult.status === 'failed') {
        expect(failedResult.message).toBeTruthy();
        expect(failedResult.message).toContain('Assertion failed:');
      }
    });
  });

  describe('Git Commit Generation', () => {
    it('should generate valid git commit with proper structure and custom options', () => {
      // Default
      const commit = factory.generateGitCommit();
      expect(commit.hash).toMatch(/^[a-f0-9]{40}$/);
      expect(commit.author).toBeTruthy();
      expect(commit.email).toMatch(/.+@.+\..+/);
      expect(commit.date).toBeTruthy();
      expect(commit.message).toBeTruthy();
      expect(commit.files.length).toBeGreaterThan(0);

      // Unique hashes
      const commit2 = factory.generateGitCommit();
      expect(commit.hash).not.toBe(commit2.hash);

      // Custom options
      const custom = factory.generateGitCommit({
        author: 'John Doe',
        message: 'feat: custom message',
        fileCount: 7
      });
      expect(custom.author).toBe('John Doe');
      expect(custom.email).toContain('john.doe');
      expect(custom.message).toBe('feat: custom message');
      expect(custom.files).toHaveLength(7);
    });

    it('should generate proper email from author name and conventional commit messages', () => {
      const commit = factory.generateGitCommit({ author: 'Alice Johnson' });
      expect(commit.email).toContain('alice.johnson');

      // Conventional commit format
      const prefixes = ['feat', 'fix', 'docs', 'refactor', 'test', 'chore'];
      const hasValidPrefix = prefixes.some(prefix => commit.message.startsWith(prefix + ':'));
      expect(hasValidPrefix).toBe(true);

      // File paths with directories
      commit.files.forEach(file => {
        expect(file).toMatch(/^[^/]+\/.+\.[a-z]+$/);
      });
    });
  });

  describe('Pull Request Generation', () => {
    it('should generate valid pull request with proper structure and custom options', () => {
      // Default
      const pr = factory.generatePullRequest();
      expect(pr.number).toBeGreaterThan(0);
      expect(pr.title).toBeTruthy();
      expect(pr.description).toBeTruthy();
      expect(pr.author).toBeTruthy();
      expect(['open', 'merged', 'closed']).toContain(pr.status);
      expect(pr.commits.length).toBeGreaterThan(0);
      expect(pr.createdAt).toBeTruthy();

      // Description sections
      expect(pr.description).toContain('## Changes');
      expect(pr.description).toContain('-');

      // Custom options
      const custom = factory.generatePullRequest({
        number: 123,
        title: 'Custom PR Title',
        commitCount: 8
      });
      expect(custom.number).toBe(123);
      expect(custom.title).toBe('Custom PR Title');
      expect(custom.commits).toHaveLength(8);
    });

    it('should use same author for all commits in PR', () => {
      const pr = factory.generatePullRequest({ commitCount: 5 });

      const authors = new Set(pr.commits.map(c => c.author));
      expect(authors.size).toBe(1);
      expect(authors.has(pr.author)).toBe(true);
    });
  });

  describe('Git History Generation', () => {
    it('should generate specified number of valid commits and handle edge cases', () => {
      // Standard
      const history = factory.generateGitHistory(10);
      expect(history).toHaveLength(10);

      history.forEach(commit => {
        expect(commit.hash).toBeTruthy();
        expect(commit.author).toBeTruthy();
        expect(commit.message).toBeTruthy();
      });

      // Edge cases
      const empty = factory.generateGitHistory(0);
      expect(empty).toHaveLength(0);

      const single = factory.generateGitHistory(1);
      expect(single).toHaveLength(1);
    });
  });

  describe('Project Intake Generation', () => {
    it('should generate valid project intake with proper structure and custom options', () => {
      // Default
      const intake = factory.generateProjectIntake();
      expect(intake.projectName).toBeTruthy();
      expect(intake.description).toBeTruthy();
      expect(intake.stakeholders.length).toBeGreaterThan(0);
      expect(intake.objectives.length).toBeGreaterThan(0);
      expect(intake.constraints.length).toBeGreaterThan(0);
      expect(intake.risks.length).toBeGreaterThan(0);

      // Custom options
      const custom = factory.generateProjectIntake({
        projectName: 'Custom Project',
        stakeholderCount: 7
      });
      expect(custom.projectName).toBe('Custom Project');
      expect(custom.stakeholders).toHaveLength(7);
    });
  });

  describe('Risk Register Generation', () => {
    it('should generate valid risk register with valid risks and handle custom counts', () => {
      // Default
      const register = factory.generateRiskRegister();
      expect(register.id).toMatch(/^RR-\d{3}$/);
      expect(register.risks).toHaveLength(5);
      expect(register.createdAt).toBeTruthy();

      register.risks.forEach(risk => {
        expect(risk.id).toMatch(/^RISK-\d{3}$/);
        expect(risk.description).toBeTruthy();
        expect(['High', 'Medium', 'Low']).toContain(risk.impact);
        expect(['High', 'Medium', 'Low']).toContain(risk.probability);
        expect(risk.mitigation).toBeTruthy();
      });

      // Custom count
      const custom = factory.generateRiskRegister(10);
      expect(custom.risks).toHaveLength(10);

      // Edge case
      const empty = factory.generateRiskRegister(0);
      expect(empty.risks).toHaveLength(0);
    });
  });

  describe('Iteration Plan Generation', () => {
    it('should generate valid iteration plan with user story IDs and handle different weeks', () => {
      const plan = factory.generateIterationPlan(2);

      expect(plan.id).toMatch(/^ITER-\d{3}$/);
      expect(plan.iteration).toBeGreaterThan(0);
      expect(plan.startDate).toBeTruthy();
      expect(plan.endDate).toBeTruthy();
      expect(plan.objectives.length).toBeGreaterThan(0);
      expect(plan.stories.length).toBeGreaterThan(0);

      // User story IDs
      plan.stories.forEach(story => {
        expect(story).toMatch(/^US-\d{3}$/);
      });

      // Different week counts
      const plan1 = factory.generateIterationPlan(1);
      const plan4 = factory.generateIterationPlan(4);
      expect(plan1.startDate).toBeTruthy();
      expect(plan4.startDate).toBeTruthy();
    });
  });

  describe('Utility Methods', () => {
    it('should generate random text with specified word count and proper formatting', () => {
      const text = factory.generateRandomText(10);
      const words = text.split(/\s+/);
      expect(words.length).toBe(10);

      // Capitalization and punctuation
      expect(text.charAt(0)).toBe(text.charAt(0).toUpperCase());
      expect(text.endsWith('.')).toBe(true);

      // Edge cases
      const single = factory.generateRandomText(1);
      expect(single).toBeTruthy();
      expect(single.endsWith('.')).toBe(true);

      const empty = factory.generateRandomText(0);
      expect(empty).toBe('.');
    });

    it('should generate dates with proper formatting and handle day offsets', () => {
      // Current date
      const dateStr = factory.generateDate(0);
      const date = new Date(dateStr);
      const now = new Date();
      expect(date.getDate()).toBe(now.getDate());

      // Past date
      const pastStr = factory.generateDate(7);
      const past = new Date(pastStr);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      expect(past.getDate()).toBe(weekAgo.getDate());

      // ISO 8601 format
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should generate IDs with specified prefix and proper formatting', () => {
      const id = factory.generateId('TEST');
      expect(id).toMatch(/^TEST-\d{3}$/);

      // Zero-padded numbers
      factory.seed(12345);
      const zeroId = factory.generateId('ID');
      expect(zeroId).toMatch(/^ID-\d{3}$/);

      // Different prefixes
      const prefixes = ['UC', 'TC', 'NFR', 'ADR'];
      for (const prefix of prefixes) {
        const prefixId = factory.generateId(prefix);
        expect(prefixId.startsWith(prefix + '-'), `Failed for prefix ${prefix}`).toBe(true);
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should generate complete test suite with multiple artifacts', () => {
      factory.seed(99999);

      const useCase = factory.generateUseCase();
      const nfr = factory.generateNFR('Performance');
      const adr = factory.generateADR();
      const testCase = factory.generateTestCase();
      const commit = factory.generateGitCommit();

      expect(useCase.id).toBeTruthy();
      expect(nfr.id).toBeTruthy();
      expect(adr.number).toBeGreaterThan(0);
      expect(testCase.id).toBeTruthy();
      expect(commit.hash).toBeTruthy();
    });

    it('should support reproducible multi-artifact generation', () => {
      factory.seed(42);
      const artifacts1 = {
        useCase: factory.generateUseCase(),
        nfr: factory.generateNFR('Security'),
        testCase: factory.generateTestCase()
      };

      factory.seed(42);
      const artifacts2 = {
        useCase: factory.generateUseCase(),
        nfr: factory.generateNFR('Security'),
        testCase: factory.generateTestCase()
      };

      expect(artifacts1).toEqual(artifacts2);
    });

    it('should generate realistic SDLC workflow artifacts', () => {
      // Inception phase
      const intake = factory.generateProjectIntake();
      const risks = factory.generateRiskRegister();

      // Elaboration phase
      const useCases = [
        factory.generateUseCase(),
        factory.generateUseCase(),
        factory.generateUseCase()
      ];
      const spec = factory.generateSupplementalSpec(5);
      const adrs = [
        factory.generateADR(),
        factory.generateADR()
      ];

      // Construction phase
      const testPlan = factory.generateTestPlan(10);
      const commits = factory.generateGitHistory(20);

      // Transition phase
      const pr = factory.generatePullRequest({ commitCount: 5 });

      // Validate all artifacts
      expect(intake.projectName).toBeTruthy();
      expect(risks.risks.length).toBeGreaterThan(0);
      expect(useCases.length).toBe(3);
      expect(spec.nfrs.length).toBe(5);
      expect(adrs.length).toBe(2);
      expect(testPlan.testCases.length).toBe(10);
      expect(commits.length).toBe(20);
      expect(pr.commits.length).toBe(5);
    });

    it('should handle edge cases across all generators', () => {
      // Minimum values
      const minUseCase = factory.generateUseCase({
        scenarioStepCount: 1,
        alternateFlowCount: 0
      });
      const minTestPlan = factory.generateTestPlan(0);
      const minHistory = factory.generateGitHistory(0);
      const minRisks = factory.generateRiskRegister(0);

      expect(minUseCase.mainScenario).toHaveLength(1);
      expect(minUseCase.alternateFlows).toHaveLength(0);
      expect(minTestPlan.testCases).toHaveLength(0);
      expect(minHistory).toHaveLength(0);
      expect(minRisks.risks).toHaveLength(0);
    });
  });
});
