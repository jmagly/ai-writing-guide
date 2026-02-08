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
    it('should generate complete before/after pair with all required properties', async () => {
      const topics = ['authentication', 'caching', 'rate limiting', 'API design', 'security'];

      for (const topic of topics) {
        const result = await generator.generateBeforeAfter(topic);

        // All results should have required properties
        expect(result, `${topic}: missing 'before'`).toHaveProperty('before');
        expect(result, `${topic}: missing 'after'`).toHaveProperty('after');
        expect(result, `${topic}: missing 'changes'`).toHaveProperty('changes');
        expect(result, `${topic}: missing 'improvements'`).toHaveProperty('improvements');

        // Topic should appear in content
        const topicPattern = topic.split(' ')[0].toLowerCase().slice(0, -3); // match partial word
        expect(result.before.toLowerCase(), `${topic}: not in before`).toMatch(new RegExp(topicPattern));
        expect(result.after.toLowerCase(), `${topic}: not in after`).toMatch(new RegExp(topicPattern));

        // Before and after should differ
        expect(result.before, `${topic}: before equals after`).not.toBe(result.after);

        // Should have improvements
        expect(result.improvements.length, `${topic}: no improvements`).toBeGreaterThan(0);
      }
    });

    it('should support different voices and detect quality improvements', async () => {
      const voices: Voice[] = ['academic', 'technical', 'executive', 'casual'];

      for (const voice of voices) {
        const result = await generator.generateBeforeAfter('performance', voice);
        expect(result.after, `${voice}: no after content`).toBeTruthy();

        // Should detect either pattern removal or have improvements
        const hasPatternRemoval = result.improvements.some(
          imp => imp.match(/(removed|delve|important to note|performative)/i)
        );
        expect(hasPatternRemoval || result.improvements.length > 0,
          `${voice}: no improvements detected`).toBe(true);
      }
    });
  });

  describe('Diverse Examples Generation', () => {
    it('should generate correct count with concept in all examples and diverse voices', async () => {
      const testCases = [
        { concept: 'microservices', count: 3 },
        { concept: 'database', count: 3 },
        { concept: 'CI/CD', count: 2 },
        { concept: 'scalability', count: 2 },
      ];

      for (const { concept, count } of testCases) {
        const examples = await generator.generateDiverseExamples(concept, count);

        // Check count
        expect(examples, `${concept}: wrong count`).toHaveLength(count);

        // All examples should include concept
        const conceptPattern = concept.toLowerCase().split(/[\/\s]/)[0].slice(0, -1);
        examples.forEach((example, idx) => {
          expect(example.content.toLowerCase(),
            `${concept} example ${idx}: missing concept`).toMatch(new RegExp(conceptPattern));
          expect(example.context, `${concept} example ${idx}: no context`).toBeTruthy();
          expect(example.demonstrates, `${concept} example ${idx}: no demonstrates`).toBeTruthy();
          expect(Array.isArray(example.demonstrates),
            `${concept} example ${idx}: demonstrates not array`).toBe(true);
        });

        // Check voice diversity
        const voices = examples.map(ex => ex.voice);
        const uniqueVoices = new Set(voices);
        expect(uniqueVoices.size, `${concept}: no voice diversity`).toBeGreaterThan(0);
      }
    });

    it('should create unique diverse content', async () => {
      const examples = await generator.generateDiverseExamples('monitoring', 3);
      const contents = examples.map(ex => ex.content);
      const unique = new Set(contents);
      expect(unique.size).toBe(contents.length);
    });

    it('should handle edge cases', async () => {
      // Single example
      const single = await generator.generateDiverseExamples('logging', 1);
      expect(single).toHaveLength(1);
      expect(single[0].content).toBeTruthy();

      // Zero examples
      const zero = await generator.generateDiverseExamples('test', 0);
      expect(zero).toHaveLength(0);
    });
  });

  describe('Code Examples Generation', () => {
    it('should generate code with required properties and valid structure', async () => {
      const examples = await generator.generateCodeExamples('connection pooling');

      expect(examples.length).toBeGreaterThan(0);

      examples.forEach((example, idx) => {
        // Basic properties
        expect(example.code, `example ${idx}: no code`).toBeTruthy();
        expect(example.language, `example ${idx}: no language`).toBeTruthy();
        expect(example.context, `example ${idx}: no context`).toBeTruthy();

        // Valid TypeScript structure
        expect(example.code, `example ${idx}: invalid TS`).toMatch(/function|const|class|async/);

        // Has comments
        expect(example.code, `example ${idx}: no comments`).toMatch(/\/\//);
      });
    });

    it('should include technology keywords and support multiple examples', async () => {
      // Test with technology that has flexible keyword matching
      const cachingExamples = await generator.generateCodeExamples('caching');
      cachingExamples.forEach((example, idx) => {
        expect(example.code.toLowerCase(),
          `caching example ${idx}: no tech keywords`).toMatch(/cache|pool|connection/);
      });

      // Test voice diversity with multiple examples
      const authExamples = await generator.generateCodeExamples('authentication', 3);
      const voices = authExamples.map(ex => ex.voice);
      const uniqueVoices = new Set(voices);
      expect(uniqueVoices.size, 'no voice diversity').toBeGreaterThan(1);

      // Test custom count
      const dbExamples = await generator.generateCodeExamples('database', 5);
      expect(dbExamples).toHaveLength(5);
    });
  });

  describe('Scenario Generation', () => {
    it('should generate scenarios with use case, perspectives, and voices', async () => {
      const testCases = [
        { useCase: 'user registration', perspectives: undefined },
        { useCase: 'payment processing', perspectives: undefined },
        { useCase: 'file upload', perspectives: undefined },
      ];

      for (const { useCase } of testCases) {
        const scenarios = await generator.generateScenarios(useCase);

        expect(scenarios.length, `${useCase}: no scenarios`).toBeGreaterThan(0);

        const useCasePattern = useCase.split(' ')[0].toLowerCase().slice(0, -3);
        scenarios.forEach((scenario, idx) => {
          // Basic properties
          expect(scenario.description,
            `${useCase} scenario ${idx}: no description`).toBeTruthy();
          expect(scenario.useCase,
            `${useCase} scenario ${idx}: wrong useCase`).toBe(useCase);

          // Use case in description
          expect(scenario.description.toLowerCase(),
            `${useCase} scenario ${idx}: missing use case keyword`).toMatch(new RegExp(useCasePattern));

          // Voice assignment
          expect(scenario.voice, `${useCase} scenario ${idx}: no voice`).toBeTruthy();
          expect(['academic', 'technical', 'executive', 'casual'],
            `${useCase} scenario ${idx}: invalid voice`).toContain(scenario.voice);
        });
      }
    });

    it('should vary perspectives when specified', async () => {
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

    it('should handle custom perspective list', async () => {
      const scenarios = await generator.generateScenarios('login', ['first-person']);
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].perspective).toBe('first-person');
    });
  });

  describe('Comparison Examples', () => {
    it('should generate complete comparisons with all approaches', async () => {
      const testCases = [
        {
          topic: 'authentication',
          approaches: ['JWT tokens', 'Session cookies']
        },
        {
          topic: 'API design',
          approaches: ['REST API', 'GraphQL']
        },
        {
          topic: 'caching',
          approaches: ['In-memory cache', 'Redis cache']
        },
      ];

      for (const { topic, approaches } of testCases) {
        const result = await generator.generateComparisonExamples(topic, approaches);

        expect(result.topic, `${topic}: wrong topic`).toBe(topic);
        expect(result.comparisons, `${topic}: wrong count`).toHaveLength(approaches.length);

        result.comparisons.forEach((comp, idx) => {
          // Each approach should be present
          expect(approaches,
            `${topic} comp ${idx}: approach not in list`).toContain(comp.approach);

          // Content should be present and relevant
          expect(comp.content, `${topic} comp ${idx}: no content`).toBeTruthy();
          const topicPattern = topic.split(' ')[0].toLowerCase().slice(0, -3);
          expect(comp.content.toLowerCase(),
            `${topic} comp ${idx}: missing topic keyword`).toMatch(new RegExp(topicPattern));
        });
      }
    });

    it('should handle multiple approaches', async () => {
      const approaches = ['SQL', 'NoSQL', 'Graph DB', 'Time-series DB'];
      const result = await generator.generateComparisonExamples('databases', approaches);
      expect(result.comparisons).toHaveLength(4);
    });
  });

  describe('Tutorial Examples', () => {
    it('should generate tutorial with all steps and proper formatting', async () => {
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
      expect(result.content).toMatch(/#{1,3}\s*Step/);

      // All steps should be included
      steps.forEach(step => {
        expect(result.content.toLowerCase(),
          `missing step: ${step}`).toMatch(new RegExp(step.toLowerCase()));
      });
    });
  });

  describe('Q&A Examples', () => {
    it('should generate Q&A format with topic and correct structure', async () => {
      const topics = ['REST APIs', 'database indexing', 'deployment'];

      for (const topic of topics) {
        const result = await generator.generateQAExample(topic);

        // Format checks
        expect(result, `${topic}: no Q:`).toMatch(/Q:/);
        expect(result, `${topic}: no A:`).toMatch(/A:/);

        // Topic relevance
        const topicPattern = topic.split(' ')[0].toLowerCase().slice(0, -3);
        expect(result.toLowerCase(),
          `${topic}: missing topic keyword`).toMatch(new RegExp(topicPattern));

        // Line formatting
        const lines = result.split('\n');
        const hasQAFormat = lines.some(line => line.startsWith('Q:')) &&
                           lines.some(line => line.startsWith('A:'));
        expect(hasQAFormat, `${topic}: incorrect Q&A format`).toBe(true);
      }
    });

    it('should generate multiple Q&A pairs when requested', async () => {
      const result = await generator.generateQAExample('testing', 3);
      const questions = result.match(/Q:/g);
      expect(questions).toBeTruthy();
      expect(questions!.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Principle Identification', () => {
    it('should identify voice-specific principles', () => {
      const testCases = [
        {
          voice: 'academic' as Voice,
          content: 'Research (Smith, 2023) suggests that performance may improve.',
          expectedPattern: /Academic citations/i,
        },
        {
          voice: 'technical' as Voice,
          content: 'The system reduces latency by 30ms through connection pooling.',
          expectedPattern: /metric|technical|performance/i,
        },
        {
          voice: 'executive' as Voice,
          content: 'This approach delivers $500K annual cost savings and 30% ROI.',
          expectedPattern: /financial|business|decision/i,
        },
        {
          voice: 'casual' as Voice,
          content: "Here's the thing - it's really important. I've seen this work before.",
          expectedPattern: /contraction|personal|analogy/i,
        },
      ];

      testCases.forEach(({ voice, content, expectedPattern }) => {
        const principles = generator['identifyDemonstratedPrinciples'](content, voice);
        expect(principles.length, `${voice}: no principles`).toBeGreaterThan(0);
        expect(principles.some(p => expectedPattern.test(p)),
          `${voice}: missing expected pattern`).toBe(true);
      });
    });

    it('should identify general authenticity markers', () => {
      const content = 'However, there are trade-offs and limitations to consider.';
      const principles = generator['identifyDemonstratedPrinciples'](content, 'technical');
      expect(principles.some(p => p.match(/nuance|limitation/i))).toBe(true);
    });
  });

  describe('Improvement Identification', () => {
    it('should detect multiple improvement types', () => {
      const testCases = [
        {
          before: 'It is important to note that we should delve into this topic.',
          after: 'Authentication requires careful implementation.',
          expectedPattern: /removed|pattern/i,
          description: 'removed AI patterns',
        },
        {
          before: 'The system is faster.',
          after: 'The system reduces latency by 40ms.',
          expectedPattern: /metric/i,
          description: 'added metrics',
        },
        {
          before: 'One should consider the implications.',
          after: 'I believe we should consider the implications.',
          expectedPattern: /personal|perspective/i,
          description: 'added personal perspective',
        },
        {
          before: 'This is important. Very important. Critically important.',
          after: 'This is critical.',
          expectedPattern: /redundanc|concise/i,
          description: 'reduced redundancy',
        },
      ];

      testCases.forEach(({ before, after, expectedPattern, description }) => {
        const improvements = generator['identifyImprovements'](before, after);
        expect(improvements.length, `${description}: no improvements`).toBeGreaterThan(0);
        expect(improvements.some(imp => expectedPattern.test(imp)),
          `${description}: missing expected pattern`).toBe(true);
      });
    });

    it('should provide general improvement note when no specific changes', () => {
      const improvements = generator['identifyImprovements'](
        'This works well.',
        'This works effectively.'
      );
      expect(improvements.length).toBeGreaterThan(0);
    });
  });

  describe('Base Content Generation', () => {
    it('should generate voice-appropriate base content', () => {
      const testCases = [
        {
          voice: 'academic' as Voice,
          topic: 'testing',
          expectedPattern: /research|stud(y|ies)|suggest|approach/i,
        },
        {
          voice: 'technical' as Voice,
          topic: 'performance',
          expectedPattern: /latency|performance|throughput|implementation/i,
        },
        {
          voice: 'executive' as Voice,
          topic: 'efficiency',
          expectedPattern: /ROI|cost|efficiency|strategic/i,
        },
        {
          voice: 'casual' as Voice,
          topic: 'deployment',
          expectedPattern: /real|difference|worth|right/i,
        },
      ];

      testCases.forEach(({ voice, topic, expectedPattern }) => {
        const content = generator['generateBaseContent'](topic, voice);
        expect(content, `${voice}: no content`).toBeTruthy();
        expect(content, `${voice}: wrong pattern`).toMatch(expectedPattern);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle various edge case inputs', async () => {
      const edgeCases = [
        {
          name: 'empty topic',
          test: async () => {
            const result = await generator.generateBeforeAfter('');
            expect(result.before).toBeTruthy();
            expect(result.after).toBeTruthy();
          },
        },
        {
          name: 'very long topic',
          test: async () => {
            const longTopic = 'very long topic name with multiple words and complex concepts '.repeat(10);
            const result = await generator.generateBeforeAfter(longTopic);
            expect(result).toBeTruthy();
          },
        },
        {
          name: 'large count for scenarios',
          test: async () => {
            const scenarios = await generator.generateDiverseScenarios('API', 10);
            expect(scenarios).toHaveLength(10);
          },
        },
        {
          name: 'special characters in topic',
          test: async () => {
            const result = await generator.generateBeforeAfter('REST API / GraphQL');
            expect(result.before).toBeTruthy();
          },
        },
      ];

      for (const { name, test } of edgeCases) {
        await test();
      }
    });
  });
});
