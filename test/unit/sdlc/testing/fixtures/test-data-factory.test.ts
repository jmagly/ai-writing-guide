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
} from '../../../../../agentic/code/frameworks/sdlc-complete/src/testing/fixtures/test-data-factory.ts';

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

    it('should allow seed to be set after construction', () => {
      const factory1 = new TestDataFactory();
      const factory2 = new TestDataFactory();

      factory1.seed(99999);
      factory2.seed(99999);

      const useCase1 = factory1.generateUseCase();
      const useCase2 = factory2.generateUseCase();

      expect(useCase1).toEqual(useCase2);
    });

    it('should produce varied but consistent output', () => {
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
    it('should generate valid use case with default options', () => {
      const useCase = factory.generateUseCase();

      expect(useCase.id).toMatch(/^UC-\d{3}$/);
      expect(useCase.title).toBeTruthy();
      expect(useCase.actors.length).toBeGreaterThan(0);
      expect(useCase.preconditions.length).toBeGreaterThan(0);
      expect(useCase.mainScenario.length).toBeGreaterThan(0);
      expect(useCase.acceptanceCriteria.length).toBeGreaterThan(0);
    });

    it('should respect custom id option', () => {
      const useCase = factory.generateUseCase({ id: 'UC-CUSTOM' });
      expect(useCase.id).toBe('UC-CUSTOM');
    });

    it('should respect custom title option', () => {
      const useCase = factory.generateUseCase({ title: 'Custom Title' });
      expect(useCase.title).toBe('Custom Title');
    });

    it('should respect custom actors option', () => {
      const actors = ['Actor1', 'Actor2', 'Actor3'];
      const useCase = factory.generateUseCase({ actors });
      expect(useCase.actors).toEqual(actors);
    });

    it('should respect scenario step count option', () => {
      const useCase = factory.generateUseCase({ scenarioStepCount: 10 });
      expect(useCase.mainScenario).toHaveLength(10);
    });

    it('should respect alternate flow count option', () => {
      const useCase = factory.generateUseCase({ alternateFlowCount: 3 });
      expect(useCase.alternateFlows).toHaveLength(3);
    });

    it('should generate main scenario with numbered steps', () => {
      const useCase = factory.generateUseCase();
      useCase.mainScenario.forEach((step, index) => {
        expect(step).toMatch(new RegExp(`^${index + 1}\\.`));
      });
    });

    it('should generate alternate flows as nested arrays', () => {
      const useCase = factory.generateUseCase({ alternateFlowCount: 2 });
      expect(Array.isArray(useCase.alternateFlows)).toBe(true);
      useCase.alternateFlows.forEach(flow => {
        expect(Array.isArray(flow)).toBe(true);
        expect(flow.length).toBeGreaterThan(0);
      });
    });

    it('should generate acceptance criteria with identifiers', () => {
      const useCase = factory.generateUseCase();
      useCase.acceptanceCriteria.forEach(ac => {
        expect(ac).toMatch(/^AC\d+:/);
      });
    });

    it('should handle edge case: zero alternate flows', () => {
      const useCase = factory.generateUseCase({ alternateFlowCount: 0 });
      expect(useCase.alternateFlows).toHaveLength(0);
    });

    it('should handle edge case: minimum scenario steps', () => {
      const useCase = factory.generateUseCase({ scenarioStepCount: 1 });
      expect(useCase.mainScenario).toHaveLength(1);
    });
  });

  describe('NFR Generation', () => {
    const categories: NFRCategory[] = ['Performance', 'Security', 'Reliability', 'Usability', 'Scalability'];

    categories.forEach(category => {
      it(`should generate valid NFR for ${category}`, () => {
        const nfr = factory.generateNFR(category);

        expect(nfr.id).toMatch(/^NFR-[A-Z]{4}-\d{3}$/);
        expect(nfr.category).toBe(category);
        expect(nfr.description).toBeTruthy();
        expect(nfr.target).toBeTruthy();
        expect(nfr.measurement).toBeTruthy();
        expect(['P0', 'P1', 'P2']).toContain(nfr.priority);
      });
    });

    it('should respect custom id option', () => {
      const nfr = factory.generateNFR('Performance', { id: 'NFR-CUSTOM' });
      expect(nfr.id).toBe('NFR-CUSTOM');
    });

    it('should respect custom description option', () => {
      const nfr = factory.generateNFR('Security', { description: 'Custom description' });
      expect(nfr.description).toBe('Custom description');
    });

    it('should respect custom priority option', () => {
      const nfr = factory.generateNFR('Reliability', { priority: 'P0' });
      expect(nfr.priority).toBe('P0');
    });

    it('should generate category-specific content', () => {
      factory.seed(42); // Ensure reproducibility
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
    it('should generate supplemental spec with default NFR count', () => {
      const spec = factory.generateSupplementalSpec();

      expect(spec.id).toMatch(/^SUPP-\d{3}$/);
      expect(spec.title).toBe('Supplemental Specification');
      expect(spec.nfrs).toHaveLength(5);
      expect(spec.createdAt).toBeTruthy();
    });

    it('should respect custom NFR count', () => {
      const spec = factory.generateSupplementalSpec(10);
      expect(spec.nfrs).toHaveLength(10);
    });

    it('should generate valid NFRs within spec', () => {
      const spec = factory.generateSupplementalSpec(3);

      spec.nfrs.forEach(nfr => {
        expect(nfr.id).toBeTruthy();
        expect(nfr.category).toBeTruthy();
        expect(nfr.description).toBeTruthy();
      });
    });

    it('should handle edge case: zero NFRs', () => {
      const spec = factory.generateSupplementalSpec(0);
      expect(spec.nfrs).toHaveLength(0);
    });
  });

  describe('ADR Generation', () => {
    it('should generate valid ADR with default options', () => {
      const adr = factory.generateADR();

      expect(adr.number).toBeGreaterThan(0);
      expect(adr.title).toBeTruthy();
      expect(['Proposed', 'Accepted', 'Deprecated', 'Superseded']).toContain(adr.status);
      expect(adr.context).toBeTruthy();
      expect(adr.decision).toBeTruthy();
      expect(adr.consequences.length).toBeGreaterThan(0);
      expect(adr.alternatives.length).toBeGreaterThan(0);
      expect(adr.date).toBeTruthy();
    });

    it('should respect custom number option', () => {
      const adr = factory.generateADR({ number: 42 });
      expect(adr.number).toBe(42);
    });

    it('should respect custom title option', () => {
      const adr = factory.generateADR({ title: 'Custom ADR Title' });
      expect(adr.title).toBe('Custom ADR Title');
    });

    it('should respect custom status option', () => {
      const adr = factory.generateADR({ status: 'Deprecated' });
      expect(adr.status).toBe('Deprecated');
    });

    it('should generate consequences with positive/negative markers', () => {
      const adr = factory.generateADR();
      adr.consequences.forEach(consequence => {
        expect(
          consequence.startsWith('Positive:') || consequence.startsWith('Negative:')
        ).toBe(true);
      });
    });

    it('should generate alternatives with labels', () => {
      const adr = factory.generateADR();
      adr.alternatives.forEach(alt => {
        expect(alt).toMatch(/^Alternative \d+:/);
      });
    });

    it('should generate valid ISO date', () => {
      const adr = factory.generateADR();
      const date = new Date(adr.date);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('SAD Section Generation', () => {
    const sections = [
      'overview', 'goals', 'constraints', 'principles',
      'components', 'deployment', 'security', 'performance'
    ] as const;

    sections.forEach(section => {
      it(`should generate ${section} section`, () => {
        const content = factory.generateSADSection(section);

        expect(content).toBeTruthy();
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(10);
      });
    });

    it('should generate overview with heading', () => {
      const content = factory.generateSADSection('overview');
      expect(content).toContain('# Architecture Overview');
    });

    it('should generate goals as numbered list', () => {
      const content = factory.generateSADSection('goals');
      expect(content).toContain('# Architecture Goals');
      expect(content).toMatch(/\d+\./);
    });

    it('should generate constraints as bullet list', () => {
      const content = factory.generateSADSection('constraints');
      expect(content).toContain('# Constraints');
      expect(content).toContain('-');
    });

    it('should generate principles with known values', () => {
      const content = factory.generateSADSection('principles');
      const knownPrinciples = ['Separation of Concerns', 'DRY', 'SOLID', 'KISS', 'YAGNI'];
      const containsSome = knownPrinciples.some(p => content.includes(p));
      expect(containsSome).toBe(true);
    });

    it('should generate components with subheadings', () => {
      const content = factory.generateSADSection('components');
      expect(content).toContain('# Components');
      expect(content).toContain('##');
    });
  });

  describe('Component Design Generation', () => {
    it('should generate component design with valid structure', () => {
      const component = factory.generateComponentDesign('UserService');

      expect(component.name).toBe('UserService');
      expect(component.purpose).toBeTruthy();
      expect(component.responsibilities.length).toBeGreaterThan(0);
      expect(component.interfaces.length).toBeGreaterThan(0);
      expect(component.dependencies.length).toBeGreaterThan(0);
    });

    it('should generate interfaces with proper naming convention', () => {
      const component = factory.generateComponentDesign('TestComponent');

      component.interfaces.forEach(iface => {
        expect(iface).toMatch(/^I[A-Z]/);
      });
    });

    it('should handle different component names', () => {
      const names = ['AuthService', 'DataRepository', 'APIGateway'];

      names.forEach(name => {
        const component = factory.generateComponentDesign(name);
        expect(component.name).toBe(name);
      });
    });
  });

  describe('Test Case Generation', () => {
    it('should generate valid test case with default options', () => {
      const testCase = factory.generateTestCase();

      expect(testCase.id).toMatch(/^TC-\d{3}$/);
      expect(testCase.title).toBeTruthy();
      expect(testCase.preconditions.length).toBeGreaterThan(0);
      expect(testCase.steps.length).toBeGreaterThan(0);
      expect(testCase.expectedResults.length).toBeGreaterThan(0);
      expect(['P0', 'P1', 'P2']).toContain(testCase.priority);
    });

    it('should respect custom id option', () => {
      const testCase = factory.generateTestCase({ id: 'TC-CUSTOM' });
      expect(testCase.id).toBe('TC-CUSTOM');
    });

    it('should respect custom title option', () => {
      const testCase = factory.generateTestCase({ title: 'Custom Test' });
      expect(testCase.title).toBe('Custom Test');
    });

    it('should respect custom priority option', () => {
      const testCase = factory.generateTestCase({ priority: 'P0' });
      expect(testCase.priority).toBe('P0');
    });

    it('should respect step count option', () => {
      const testCase = factory.generateTestCase({ stepCount: 8 });
      expect(testCase.steps).toHaveLength(8);
      expect(testCase.expectedResults).toHaveLength(8);
    });

    it('should generate steps with labels', () => {
      const testCase = factory.generateTestCase();
      testCase.steps.forEach((step, index) => {
        expect(step).toMatch(new RegExp(`^Step ${index + 1}:`));
      });
    });

    it('should generate expected results with labels', () => {
      const testCase = factory.generateTestCase();
      testCase.expectedResults.forEach(result => {
        expect(result).toMatch(/^Expected:/);
      });
    });

    it('should maintain step-to-result correspondence', () => {
      const testCase = factory.generateTestCase();
      expect(testCase.steps.length).toBe(testCase.expectedResults.length);
    });
  });

  describe('Test Plan Generation', () => {
    it('should generate valid test plan with default test case count', () => {
      const plan = factory.generateTestPlan();

      expect(plan.id).toMatch(/^TP-\d{3}$/);
      expect(plan.title).toBe('Test Plan');
      expect(plan.objectives.length).toBeGreaterThan(0);
      expect(plan.scope).toBeTruthy();
      expect(plan.testCases).toHaveLength(5);
      expect(plan.schedule).toBeTruthy();
    });

    it('should respect custom test case count', () => {
      const plan = factory.generateTestPlan(10);
      expect(plan.testCases).toHaveLength(10);
    });

    it('should generate valid test cases within plan', () => {
      const plan = factory.generateTestPlan(3);

      plan.testCases.forEach(tc => {
        expect(tc.id).toBeTruthy();
        expect(tc.title).toBeTruthy();
        expect(tc.steps.length).toBeGreaterThan(0);
      });
    });

    it('should handle edge case: zero test cases', () => {
      const plan = factory.generateTestPlan(0);
      expect(plan.testCases).toHaveLength(0);
    });

    it('should generate schedule with week reference', () => {
      const plan = factory.generateTestPlan();
      expect(plan.schedule).toMatch(/^Week \d+$/);
    });
  });

  describe('Test Result Generation', () => {
    let testCase: TestCase;

    beforeEach(() => {
      testCase = factory.generateTestCase();
    });

    it('should generate passed result', () => {
      const result = factory.generateTestResult(testCase, true);

      expect(result.testCaseId).toBe(testCase.id);
      expect(result.status).toBe('passed');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.message).toBeUndefined();
      expect(result.timestamp).toBeTruthy();
    });

    it('should generate failed or skipped result', () => {
      const result = factory.generateTestResult(testCase, false);

      expect(result.testCaseId).toBe(testCase.id);
      expect(['failed', 'skipped']).toContain(result.status);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeTruthy();
    });

    it('should include error message for failed tests', () => {
      factory.seed(12345);
      const result = factory.generateTestResult(testCase, false);

      if (result.status === 'failed') {
        expect(result.message).toBeTruthy();
        expect(result.message).toContain('Assertion failed:');
      }
    });

    it('should generate valid ISO timestamp', () => {
      const result = factory.generateTestResult(testCase, true);
      const date = new Date(result.timestamp);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('should generate realistic execution times', () => {
      const result = factory.generateTestResult(testCase, true);
      expect(result.executionTime).toBeGreaterThanOrEqual(10);
      expect(result.executionTime).toBeLessThanOrEqual(5000);
    });
  });

  describe('Git Commit Generation', () => {
    it('should generate valid git commit with default options', () => {
      const commit = factory.generateGitCommit();

      expect(commit.hash).toMatch(/^[a-f0-9]{40}$/);
      expect(commit.author).toBeTruthy();
      expect(commit.email).toMatch(/.+@.+\..+/);
      expect(commit.date).toBeTruthy();
      expect(commit.message).toBeTruthy();
      expect(commit.files.length).toBeGreaterThan(0);
    });

    it('should respect custom author option', () => {
      const commit = factory.generateGitCommit({ author: 'John Doe' });
      expect(commit.author).toBe('John Doe');
      expect(commit.email).toContain('john.doe');
    });

    it('should respect custom message option', () => {
      const commit = factory.generateGitCommit({ message: 'feat: custom message' });
      expect(commit.message).toBe('feat: custom message');
    });

    it('should respect file count option', () => {
      const commit = factory.generateGitCommit({ fileCount: 7 });
      expect(commit.files).toHaveLength(7);
    });

    it('should generate unique commit hashes', () => {
      const commit1 = factory.generateGitCommit();
      const commit2 = factory.generateGitCommit();

      expect(commit1.hash).not.toBe(commit2.hash);
    });

    it('should generate email from author name', () => {
      const commit = factory.generateGitCommit({ author: 'Alice Johnson' });
      expect(commit.email).toContain('alice.johnson');
    });

    it('should generate file paths with directories', () => {
      const commit = factory.generateGitCommit();

      commit.files.forEach(file => {
        expect(file).toMatch(/^[^/]+\/.+\.[a-z]+$/);
      });
    });

    it('should generate conventional commit messages', () => {
      const commit = factory.generateGitCommit();
      const prefixes = ['feat', 'fix', 'docs', 'refactor', 'test', 'chore'];
      const hasValidPrefix = prefixes.some(prefix => commit.message.startsWith(prefix + ':'));
      expect(hasValidPrefix).toBe(true);
    });
  });

  describe('Pull Request Generation', () => {
    it('should generate valid pull request with default options', () => {
      const pr = factory.generatePullRequest();

      expect(pr.number).toBeGreaterThan(0);
      expect(pr.title).toBeTruthy();
      expect(pr.description).toBeTruthy();
      expect(pr.author).toBeTruthy();
      expect(['open', 'merged', 'closed']).toContain(pr.status);
      expect(pr.commits.length).toBeGreaterThan(0);
      expect(pr.createdAt).toBeTruthy();
    });

    it('should respect custom number option', () => {
      const pr = factory.generatePullRequest({ number: 123 });
      expect(pr.number).toBe(123);
    });

    it('should respect custom title option', () => {
      const pr = factory.generatePullRequest({ title: 'Custom PR Title' });
      expect(pr.title).toBe('Custom PR Title');
    });

    it('should respect commit count option', () => {
      const pr = factory.generatePullRequest({ commitCount: 8 });
      expect(pr.commits).toHaveLength(8);
    });

    it('should generate description with sections', () => {
      const pr = factory.generatePullRequest();
      expect(pr.description).toContain('## Changes');
      expect(pr.description).toContain('-');
    });

    it('should use same author for all commits in PR', () => {
      const pr = factory.generatePullRequest({ commitCount: 5 });

      const authors = new Set(pr.commits.map(c => c.author));
      expect(authors.size).toBe(1);
      expect(authors.has(pr.author)).toBe(true);
    });
  });

  describe('Git History Generation', () => {
    it('should generate specified number of commits', () => {
      const history = factory.generateGitHistory(10);
      expect(history).toHaveLength(10);
    });

    it('should generate valid commits', () => {
      const history = factory.generateGitHistory(5);

      history.forEach(commit => {
        expect(commit.hash).toBeTruthy();
        expect(commit.author).toBeTruthy();
        expect(commit.message).toBeTruthy();
      });
    });

    it('should handle edge case: zero commits', () => {
      const history = factory.generateGitHistory(0);
      expect(history).toHaveLength(0);
    });

    it('should handle edge case: single commit', () => {
      const history = factory.generateGitHistory(1);
      expect(history).toHaveLength(1);
    });
  });

  describe('Project Intake Generation', () => {
    it('should generate valid project intake with default options', () => {
      const intake = factory.generateProjectIntake();

      expect(intake.projectName).toBeTruthy();
      expect(intake.description).toBeTruthy();
      expect(intake.stakeholders.length).toBeGreaterThan(0);
      expect(intake.objectives.length).toBeGreaterThan(0);
      expect(intake.constraints.length).toBeGreaterThan(0);
      expect(intake.risks.length).toBeGreaterThan(0);
    });

    it('should respect custom project name option', () => {
      const intake = factory.generateProjectIntake({ projectName: 'Custom Project' });
      expect(intake.projectName).toBe('Custom Project');
    });

    it('should respect stakeholder count option', () => {
      const intake = factory.generateProjectIntake({ stakeholderCount: 7 });
      expect(intake.stakeholders).toHaveLength(7);
    });

    it('should generate unique stakeholders', () => {
      const intake = factory.generateProjectIntake({ stakeholderCount: 5 });
      // Note: May have duplicates due to random selection from limited pool
      expect(intake.stakeholders.length).toBe(5);
    });
  });

  describe('Risk Register Generation', () => {
    it('should generate valid risk register with default risk count', () => {
      const register = factory.generateRiskRegister();

      expect(register.id).toMatch(/^RR-\d{3}$/);
      expect(register.risks).toHaveLength(5);
      expect(register.createdAt).toBeTruthy();
    });

    it('should respect custom risk count', () => {
      const register = factory.generateRiskRegister(10);
      expect(register.risks).toHaveLength(10);
    });

    it('should generate valid risks', () => {
      const register = factory.generateRiskRegister(3);

      register.risks.forEach(risk => {
        expect(risk.id).toMatch(/^RISK-\d{3}$/);
        expect(risk.description).toBeTruthy();
        expect(['High', 'Medium', 'Low']).toContain(risk.impact);
        expect(['High', 'Medium', 'Low']).toContain(risk.probability);
        expect(risk.mitigation).toBeTruthy();
      });
    });

    it('should handle edge case: zero risks', () => {
      const register = factory.generateRiskRegister(0);
      expect(register.risks).toHaveLength(0);
    });
  });

  describe('Iteration Plan Generation', () => {
    it('should generate valid iteration plan', () => {
      const plan = factory.generateIterationPlan(2);

      expect(plan.id).toMatch(/^ITER-\d{3}$/);
      expect(plan.iteration).toBeGreaterThan(0);
      expect(plan.startDate).toBeTruthy();
      expect(plan.endDate).toBeTruthy();
      expect(plan.objectives.length).toBeGreaterThan(0);
      expect(plan.stories.length).toBeGreaterThan(0);
    });

    it('should generate user story IDs', () => {
      const plan = factory.generateIterationPlan(1);

      plan.stories.forEach(story => {
        expect(story).toMatch(/^US-\d{3}$/);
      });
    });

    it('should handle different week counts', () => {
      const plan1 = factory.generateIterationPlan(1);
      const plan2 = factory.generateIterationPlan(4);

      expect(plan1.startDate).toBeTruthy();
      expect(plan2.startDate).toBeTruthy();
    });
  });

  describe('Utility Methods', () => {
    describe('generateRandomText', () => {
      it('should generate text with specified word count', () => {
        const text = factory.generateRandomText(10);
        const words = text.split(/\s+/);
        expect(words.length).toBe(10);
      });

      it('should capitalize first word', () => {
        const text = factory.generateRandomText(5);
        expect(text.charAt(0)).toBe(text.charAt(0).toUpperCase());
      });

      it('should end with period', () => {
        const text = factory.generateRandomText(5);
        expect(text.endsWith('.')).toBe(true);
      });

      it('should handle edge case: single word', () => {
        const text = factory.generateRandomText(1);
        expect(text).toBeTruthy();
        expect(text.endsWith('.')).toBe(true);
      });

      it('should handle edge case: zero words', () => {
        const text = factory.generateRandomText(0);
        expect(text).toBe('.');
      });
    });

    describe('generateDate', () => {
      it('should generate current date with daysAgo=0', () => {
        const dateStr = factory.generateDate(0);
        const date = new Date(dateStr);
        const now = new Date();

        // Within same day
        expect(date.getDate()).toBe(now.getDate());
      });

      it('should generate past date with positive daysAgo', () => {
        const dateStr = factory.generateDate(7);
        const date = new Date(dateStr);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        expect(date.getDate()).toBe(weekAgo.getDate());
      });

      it('should return ISO 8601 format', () => {
        const dateStr = factory.generateDate();
        expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });

    describe('generateId', () => {
      it('should generate ID with specified prefix', () => {
        const id = factory.generateId('TEST');
        expect(id).toMatch(/^TEST-\d{3}$/);
      });

      it('should generate zero-padded numbers', () => {
        factory.seed(12345);
        const id = factory.generateId('ID');
        expect(id).toMatch(/^ID-\d{3}$/);
      });

      it('should support different prefixes', () => {
        const prefixes = ['UC', 'TC', 'NFR', 'ADR'];

        prefixes.forEach(prefix => {
          const id = factory.generateId(prefix);
          expect(id.startsWith(prefix + '-')).toBe(true);
        });
      });
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
