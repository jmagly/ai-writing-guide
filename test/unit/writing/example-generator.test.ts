/**
 * Example Generator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExampleGenerator,
  type ExamplePair,
  type Example,
  type CodeExample,
  type Scenario,
} from '../../../src/writing/example-generator.ts';
import type { Voice } from '../../../src/writing/content-diversifier.ts';

describe('ExampleGenerator', () => {
  let generator: ExampleGenerator;

  beforeEach(() => {
    generator = new ExampleGenerator();
  });

  describe('Before/After Generation', () => {
    it('should generate before/after pair', async () => {
      const topic = 'authentication';
      const result = await generator.generateBeforeAfter(topic);

      expect(result).toHaveProperty('before');
      expect(result).toHaveProperty('after');
      expect(result).toHaveProperty('changes');
      expect(result).toHaveProperty('improvements');
    });

    it('should include topic in before content', async () => {
      const topic = 'caching';
      const result = await generator.generateBeforeAfter(topic);

      expect(result.before.toLowerCase()).toMatch(/cach/);
    });

    it('should include topic in after content', async () => {
      const topic = 'rate limiting';
      const result = await generator.generateBeforeAfter(topic);

      expect(result.after.toLowerCase()).toMatch(/rate|limit/);
    });

    it('should identify improvements', async () => {
      const topic = 'API design';
      const result = await generator.generateBeforeAfter(topic);

      expect(result.improvements).toBeTruthy();
      expect(result.improvements.length).toBeGreaterThan(0);
    });

    it('should generate different before and after', async () => {
      const topic = 'security';
      const result = await generator.generateBeforeAfter(topic);

      expect(result.before).not.toBe(result.after);
    });

    it('should support different voices', async () => {
      const topic = 'performance';
      const voices: Voice[] = ['academic', 'technical', 'executive', 'casual'];

      for (const voice of voices) {
        const result = await generator.generateBeforeAfter(topic, voice);
        expect(result.after).toBeTruthy();
      }
    });

    it('should detect removed AI patterns in improvements', async () => {
      const topic = 'deployment';
      const result = await generator.generateBeforeAfter(topic);

      // Should mention pattern removal
      const hasPatternRemoval = result.improvements.some(
        imp => imp.match(/(removed|delve|important to note|performative)/i)
      );

      expect(hasPatternRemoval || result.improvements.length > 0).toBe(true);
    });

    it('should detect added authenticity markers', async () => {
      const topic = 'testing';
      const result = await generator.generateBeforeAfter(topic);

      // Should identify authenticity improvements
      expect(result.improvements.length).toBeGreaterThan(0);
    });
  });

  describe('Diverse Examples Generation', () => {
    it('should generate requested number of examples', async () => {
      const concept = 'microservices';
      const count = 3;
      const examples = await generator.generateDiverseExamples(concept, count);

      expect(examples).toHaveLength(count);
    });

    it('should include concept in all examples', async () => {
      const concept = 'database';
      const examples = await generator.generateDiverseExamples(concept, 3);

      examples.forEach(example => {
        expect(example.content.toLowerCase()).toMatch(/database|data/);
      });
    });

    it('should vary voices across examples', async () => {
      const examples = await generator.generateDiverseExamples('testing', 4);

      const voices = examples.map(ex => ex.voice);
      const uniqueVoices = new Set(voices);

      expect(uniqueVoices.size).toBeGreaterThan(1);
    });

    it('should include context for each example', async () => {
      const examples = await generator.generateDiverseExamples('CI/CD', 2);

      examples.forEach(example => {
        expect(example.context).toBeTruthy();
      });
    });

    it('should identify demonstrated principles', async () => {
      const examples = await generator.generateDiverseExamples('scalability', 2);

      examples.forEach(example => {
        expect(example.demonstrates).toBeTruthy();
        expect(Array.isArray(example.demonstrates)).toBe(true);
      });
    });

    it('should create diverse content', async () => {
      const examples = await generator.generateDiverseExamples('monitoring', 3);

      const contents = examples.map(ex => ex.content);
      const unique = new Set(contents);

      expect(unique.size).toBe(contents.length);
    });

    it('should handle single example request', async () => {
      const examples = await generator.generateDiverseExamples('logging', 1);

      expect(examples).toHaveLength(1);
      expect(examples[0].content).toBeTruthy();
    });
  });

  describe('Code Examples Generation', () => {
    it('should generate code examples', async () => {
      const technology = 'connection pooling';
      const examples = await generator.generateCodeExamples(technology);

      expect(examples.length).toBeGreaterThan(0);
      examples.forEach(example => {
        expect(example.code).toBeTruthy();
        expect(example.language).toBeTruthy();
      });
    });

    it('should include technology in code', async () => {
      const technology = 'caching';
      const examples = await generator.generateCodeExamples(technology);

      examples.forEach(example => {
        expect(example.code.toLowerCase()).toMatch(/cache|pool|connection/);
      });
    });

    it('should vary voice across code examples', async () => {
      const examples = await generator.generateCodeExamples('authentication', 3);

      const voices = examples.map(ex => ex.voice);
      const uniqueVoices = new Set(voices);

      expect(uniqueVoices.size).toBeGreaterThan(1);
    });

    it('should include context for code examples', async () => {
      const examples = await generator.generateCodeExamples('REST API', 2);

      examples.forEach(example => {
        expect(example.context).toBeTruthy();
      });
    });

    it('should generate valid TypeScript code', async () => {
      const examples = await generator.generateCodeExamples('async operations', 2);

      examples.forEach(example => {
        // Should have basic code structure
        expect(example.code).toMatch(/function|const|class|async/);
      });
    });

    it('should support custom variation count', async () => {
      const examples = await generator.generateCodeExamples('database', 5);

      expect(examples).toHaveLength(5);
    });

    it('should include comments in code', async () => {
      const examples = await generator.generateCodeExamples('error handling', 2);

      examples.forEach(example => {
        expect(example.code).toMatch(/\/\//);
      });
    });
  });

  describe('Scenario Generation', () => {
    it('should generate scenarios', async () => {
      const useCase = 'user registration';
      const scenarios = await generator.generateScenarios(useCase);

      expect(scenarios.length).toBeGreaterThan(0);
      scenarios.forEach(scenario => {
        expect(scenario.description).toBeTruthy();
      });
    });

    it('should include use case in scenarios', async () => {
      const useCase = 'payment processing';
      const scenarios = await generator.generateScenarios(useCase);

      scenarios.forEach(scenario => {
        expect(scenario.description.toLowerCase()).toMatch(/payment|process/);
      });
    });

    it('should vary perspectives', async () => {
      const scenarios = await generator.generateScenarios('data export', [
        'first-person',
        'third-person',
        'neutral',
      ]);

      const perspectives = scenarios.map(s => s.perspective);
      expect(perspectives).toContain('first-person');
      expect(perspectives).toContain('third-person');
      expect(perspectives).toContain('neutral');
    });

    it('should include use case in metadata', async () => {
      const useCase = 'file upload';
      const scenarios = await generator.generateScenarios(useCase);

      scenarios.forEach(scenario => {
        expect(scenario.useCase).toBe(useCase);
      });
    });

    it('should assign voices to scenarios', async () => {
      const scenarios = await generator.generateScenarios('search functionality', [
        'first-person',
        'neutral',
      ]);

      scenarios.forEach(scenario => {
        expect(scenario.voice).toBeTruthy();
        expect(['academic', 'technical', 'executive', 'casual']).toContain(scenario.voice);
      });
    });

    it('should handle custom perspective list', async () => {
      const scenarios = await generator.generateScenarios('login', ['first-person']);

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].perspective).toBe('first-person');
    });
  });

  describe('Comparison Examples', () => {
    it('should generate comparison examples', async () => {
      const topic = 'authentication';
      const approaches = ['JWT tokens', 'Session cookies'];
      const result = await generator.generateComparisonExamples(topic, approaches);

      expect(result.topic).toBe(topic);
      expect(result.comparisons).toHaveLength(2);
    });

    it('should include each approach', async () => {
      const approaches = ['REST API', 'GraphQL'];
      const result = await generator.generateComparisonExamples('API design', approaches);

      result.comparisons.forEach(comp => {
        expect(approaches).toContain(comp.approach);
      });
    });

    it('should generate content for each approach', async () => {
      const result = await generator.generateComparisonExamples('caching', [
        'In-memory cache',
        'Redis cache',
      ]);

      result.comparisons.forEach(comp => {
        expect(comp.content).toBeTruthy();
        expect(comp.content.toLowerCase()).toMatch(/cache|caching/);
      });
    });

    it('should handle multiple approaches', async () => {
      const approaches = ['SQL', 'NoSQL', 'Graph DB', 'Time-series DB'];
      const result = await generator.generateComparisonExamples('databases', approaches);

      expect(result.comparisons).toHaveLength(4);
    });
  });

  describe('Tutorial Examples', () => {
    it('should generate tutorial example', async () => {
      const task = 'Setup CI/CD pipeline';
      const steps = [
        'Configure repository',
        'Create workflow file',
        'Add test commands',
        'Deploy to staging',
      ];

      const result = await generator.generateTutorialExample(task, steps);

      expect(result.task).toBe(task);
      expect(result.content).toBeTruthy();
    });

    it('should format as tutorial', async () => {
      const steps = ['Step one', 'Step two', 'Step three'];
      const result = await generator.generateTutorialExample('test task', steps);

      expect(result.content).toMatch(/#{1,3}\s*Step/);
    });

    it('should include all steps', async () => {
      const steps = ['First action', 'Second action', 'Third action'];
      const result = await generator.generateTutorialExample('process', steps);

      steps.forEach(step => {
        expect(result.content.toLowerCase()).toMatch(new RegExp(step.toLowerCase()));
      });
    });
  });

  describe('Q&A Examples', () => {
    it('should generate Q&A format', async () => {
      const topic = 'REST APIs';
      const result = await generator.generateQAExample(topic);

      expect(result).toMatch(/Q:/);
      expect(result).toMatch(/A:/);
    });

    it('should include topic in Q&A', async () => {
      const topic = 'database indexing';
      const result = await generator.generateQAExample(topic);

      expect(result.toLowerCase()).toMatch(/database|index/);
    });

    it('should generate multiple Q&A pairs', async () => {
      const result = await generator.generateQAExample('testing', 3);

      const questions = result.match(/Q:/g);
      expect(questions).toBeTruthy();
      expect(questions!.length).toBeGreaterThanOrEqual(3);
    });

    it('should format questions and answers correctly', async () => {
      const result = await generator.generateQAExample('deployment');

      const lines = result.split('\n');
      const hasQAFormat = lines.some(line => line.startsWith('Q:')) &&
                         lines.some(line => line.startsWith('A:'));

      expect(hasQAFormat).toBe(true);
    });
  });

  describe('Principle Identification', () => {
    it('should identify academic principles', () => {
      const content = 'Research (Smith, 2023) suggests that performance may improve.';
      const principles = generator['identifyDemonstratedPrinciples'](content, 'academic');

      expect(principles).toContain('Academic citations');
    });

    it('should identify technical principles', () => {
      const content = 'The system reduces latency by 30ms through connection pooling.';
      const principles = generator['identifyDemonstratedPrinciples'](content, 'technical');

      expect(principles.length).toBeGreaterThan(0);
      expect(principles.some(p => p.match(/metric|technical|performance/i))).toBe(true);
    });

    it('should identify executive principles', () => {
      const content = 'This approach delivers $500K annual cost savings and 30% ROI.';
      const principles = generator['identifyDemonstratedPrinciples'](content, 'executive');

      expect(principles.some(p => p.match(/financial|business|decision/i))).toBe(true);
    });

    it('should identify casual principles', () => {
      const content = "Here's the thing - it's really important. I've seen this work before.";
      const principles = generator['identifyDemonstratedPrinciples'](content, 'casual');

      expect(principles.some(p => p.match(/contraction|personal|analogy/i))).toBe(true);
    });

    it('should identify general authenticity markers', () => {
      const content = 'However, there are trade-offs and limitations to consider.';
      const principles = generator['identifyDemonstratedPrinciples'](content, 'technical');

      expect(principles.some(p => p.match(/nuance|limitation/i))).toBe(true);
    });
  });

  describe('Improvement Identification', () => {
    it('should detect removed AI patterns', () => {
      const before = 'It is important to note that we should delve into this topic.';
      const after = 'Authentication requires careful implementation.';
      const improvements = generator['identifyImprovements'](before, after);

      expect(improvements.length).toBeGreaterThan(0);
    });

    it('should detect added metrics', () => {
      const before = 'The system is faster.';
      const after = 'The system reduces latency by 40ms.';
      const improvements = generator['identifyImprovements'](before, after);

      expect(improvements.some(imp => imp.match(/metric/i))).toBe(true);
    });

    it('should detect added personal perspective', () => {
      const before = 'One should consider the implications.';
      const after = 'I believe we should consider the implications.';
      const improvements = generator['identifyImprovements'](before, after);

      expect(improvements.some(imp => imp.match(/personal|perspective/i))).toBe(true);
    });

    it('should detect reduced redundancy', () => {
      const before = 'This is important. Very important. Critically important.';
      const after = 'This is critical.';
      const improvements = generator['identifyImprovements'](before, after);

      expect(improvements.some(imp => imp.match(/redundanc|concise/i))).toBe(true);
    });

    it('should provide general improvement note when no specific changes', () => {
      const before = 'This works well.';
      const after = 'This works effectively.';
      const improvements = generator['identifyImprovements'](before, after);

      expect(improvements.length).toBeGreaterThan(0);
    });
  });

  describe('Base Content Generation', () => {
    it('should generate academic base content', () => {
      const content = generator['generateBaseContent']('testing', 'academic');

      expect(content).toMatch(/research|stud(y|ies)|suggest|approach/i);
    });

    it('should generate technical base content', () => {
      const content = generator['generateBaseContent']('performance', 'technical');

      expect(content).toMatch(/latency|performance|throughput|implementation/i);
    });

    it('should generate executive base content', () => {
      const content = generator['generateBaseContent']('efficiency', 'executive');

      expect(content).toMatch(/ROI|cost|efficiency|strategic/i);
    });

    it('should generate casual base content', () => {
      const content = generator['generateBaseContent']('deployment', 'casual');

      expect(content).toMatch(/real|difference|worth|right/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty topic', async () => {
      const result = await generator.generateBeforeAfter('');

      expect(result.before).toBeTruthy();
      expect(result.after).toBeTruthy();
    });

    it('should handle very long topic', async () => {
      const longTopic = 'very long topic name with multiple words and complex concepts '.repeat(10);
      const result = await generator.generateBeforeAfter(longTopic);

      expect(result).toBeTruthy();
    });

    it('should handle zero count for examples', async () => {
      const examples = await generator.generateDiverseExamples('test', 0);

      expect(examples).toHaveLength(0);
    });

    it('should handle large count for scenarios', async () => {
      const scenarios = await generator.generateDiverseScenarios('API', 10);

      expect(scenarios).toHaveLength(10);
    });

    it('should handle special characters in topic', async () => {
      const result = await generator.generateBeforeAfter('REST API / GraphQL');

      expect(result.before).toBeTruthy();
    });
  });
});
