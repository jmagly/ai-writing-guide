/**
 * Content Diversifier Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContentDiversifier,
  type DiversificationOptions,
  type Voice,
} from '../../../src/writing/content-diversifier.ts';

describe('ContentDiversifier', () => {
  let diversifier: ContentDiversifier;

  beforeEach(() => {
    diversifier = new ContentDiversifier();
  });

  describe('Voice Transformation', () => {
    const testContent = 'This system provides improved performance for data processing tasks.';

    it('should transform to all voice types with appropriate markers', () => {
      const voiceTests = [
        {
          voice: 'academic' as const,
          transform: (c: string) => diversifier.toAcademicVoice(c),
          pattern: /(suggests?|appears?|may|might|furthermore|moreover|limitations|warrant|investigation|noted)/
        },
        {
          voice: 'technical' as const,
          transform: (c: string) => diversifier.toTechnicalVoice(c),
          pattern: /(\d+%|\d+ms|latency|throughput|payload|implementation)/i
        },
        {
          voice: 'executive' as const,
          transform: (c: string) => diversifier.toExecutiveVoice(c),
          pattern: /(\$|ROI|recommend|strategic|priority|optimal|approach|requires)/i
        },
        {
          voice: 'casual' as const,
          transform: (c: string) => diversifier.toCasualVoice(c),
          pattern: /(don't|can't|it's|here's|thing|think of|like a|conveyor|belt|you)/i
        }
      ];

      voiceTests.forEach(({ voice, transform, pattern }) => {
        const result = transform(testContent);
        expect(result, `${voice} voice should produce output`).toBeTruthy();
        expect(result, `${voice} voice should differ from original`).not.toBe(testContent);
        expect(result.toLowerCase(), `${voice} voice should match expected pattern`).toMatch(pattern);
      });
    });

    it('should add voice-specific enhancements (citations, metrics, business values, examples)', () => {
      const enhancements = [
        {
          name: 'academic citations',
          transform: () => diversifier.toAcademicVoice(testContent),
          pattern: /(\([A-Z]\w+,?\s*\d{4}\)|limitations|warrant|investigation|noted)/
        },
        {
          name: 'technical metrics',
          transform: () => diversifier.toTechnicalVoice('The system is faster.'),
          pattern: /\d+(\.\d+)?\s*(ms|%|x|MB|GB|seconds)/
        },
        {
          name: 'business metrics',
          transform: () => diversifier.toExecutiveVoice('This saves money.'),
          pattern: /(\$\d+|\d+%|optimal|approach|requires|strategic|recommend)/i
        },
        {
          name: 'personal examples',
          transform: () => diversifier.toCasualVoice(testContent),
          pattern: /(I've|we|you|here's|thing|think of|like a)/i
        }
      ];

      enhancements.forEach(({ name, transform, pattern }) => {
        const result = transform();
        expect(result, `should add ${name}`).toMatch(pattern);
      });
    });

    it('should adjust tone appropriately (remove hedging for executive, add contractions for casual)', () => {
      const hedgedContent = 'We might possibly consider this approach.';
      const executiveResult = diversifier.toExecutiveVoice(hedgedContent);
      expect(executiveResult, 'executive voice should be decisive').toMatch(/(will|must|recommend|optimal|approach|requires|strategic)/i);

      const formalContent = 'We do not think it is necessary.';
      const casualResult = diversifier.toCasualVoice(formalContent);
      expect(casualResult, 'casual voice should add contractions or casual framing').toMatch(/(don't|isn't|think of|like a|you)/i);
    });

    it('should preserve core message and technical accuracy across voices', () => {
      const voices: Voice[] = ['academic', 'technical', 'executive', 'casual'];
      const results = voices.map(voice => diversifier.transformVoice(testContent, 'technical', voice));

      results.forEach((result, idx) => {
        expect(result.toLowerCase(), `${voices[idx]} voice should preserve core concept`).toMatch(/(system|performance|process)/);
      });

      const technicalContent = 'The API endpoint returns JSON with 200 status code.';
      const academicResult = diversifier.toAcademicVoice(technicalContent);
      expect(academicResult, 'should preserve technical terms').toMatch(/API|endpoint|JSON|200/i);
    });

    it('should detect voice correctly including mixed content', () => {
      const voiceDetectionTests = [
        {
          content: 'Recent studies (Smith, 2023) suggest that performance optimization may demonstrate significant benefits.',
          expectedVoices: ['academic', 'mixed']
        },
        {
          content: 'The system (Jones, 2023) reduces latency by 30ms. We recommend strategic adoption.',
          expectedVoices: ['academic', 'technical', 'executive', 'mixed']
        }
      ];

      voiceDetectionTests.forEach(({ content, expectedVoices }) => {
        const detected = diversifier.detectVoice(content);
        expect(expectedVoices, `should detect voice in: ${content.substring(0, 50)}...`).toContain(detected);
      });
    });

    it('should handle edge cases (empty content, single sentence)', () => {
      const emptyResult = diversifier.toAcademicVoice('');
      expect(emptyResult).toBe('');

      const shortContent = 'This works well.';
      const shortResult = diversifier.toTechnicalVoice(shortContent);
      expect(shortResult).toBeTruthy();
      expect(shortResult.length).toBeGreaterThan(0);
    });
  });

  describe('Perspective Shifting', () => {
    it('should convert between perspectives correctly', () => {
      const perspectiveTests = [
        {
          name: 'first-person',
          content: 'One should consider the implications carefully.',
          transform: (c: string) => diversifier.toFirstPerson(c),
          shouldMatch: /\b(I|my|we)\b/,
          shouldNotMatch: /\bone\b/
        },
        {
          name: 'third-person',
          content: 'I think we should implement this approach.',
          transform: (c: string) => diversifier.toThirdPerson(c),
          shouldMatch: /\b(one|they|their)\b/,
          shouldNotMatch: /\b(I|we|my|our)\b/g
        },
        {
          name: 'neutral',
          content: 'I can configure the system to handle your requests.',
          transform: (c: string) => diversifier.toNeutral(c),
          shouldMatch: /(system|approach|users?)/i,
          shouldNotMatch: /\b(I|you|we|my|your)\b/
        }
      ];

      perspectiveTests.forEach(({ name, content, transform, shouldMatch, shouldNotMatch }) => {
        const result = transform(content);
        expect(result, `${name} should match expected pattern`).toMatch(shouldMatch);
        expect(result, `${name} should not match original markers`).not.toMatch(shouldNotMatch);
      });
    });

    it('should preserve meaning when changing perspective', () => {
      const tests = [
        { content: 'I believe this works.', transform: (c: string) => diversifier.changePerspective(c, 'third-person'), checkRemoval: /\bI\b/ },
        { content: 'I implemented the caching layer.', transform: (c: string) => diversifier.toThirdPerson(c), checkPreservation: [/caching|cache/i, /implement/i] }
      ];

      tests.forEach(test => {
        const result = test.transform(test.content);
        if (test.checkRemoval) {
          expect(result).not.toMatch(test.checkRemoval);
        }
        if (test.checkPreservation) {
          test.checkPreservation.forEach(pattern => {
            expect(result).toMatch(pattern);
          });
        }
      });
    });
  });

  describe('Structure Variation', () => {
    const narrativeContent = 'First, we analyze the problem. Then we design a solution. Finally, we implement the code.';

    it('should convert to all structure formats', () => {
      const structureTests = [
        {
          name: 'bullet points',
          transform: () => diversifier.toBulletPoints(narrativeContent),
          checks: [
            { pattern: /^-\s+/m, description: 'should start with bullet marker' },
            { custom: (result: string) => result.split('\n').filter(line => line.startsWith('-')).length > 0, description: 'should have bullet items' }
          ]
        },
        {
          name: 'narrative',
          transform: () => {
            const bulletContent = '- First point\n- Second point\n- Third point';
            return diversifier.toNarrative(bulletContent);
          },
          checks: [
            { negativePattern: /^-\s+/m, description: 'should not have bullet markers' },
            { pattern: /(furthermore|additionally|moreover|also|next|then)/i, description: 'should have transitional words' }
          ]
        },
        {
          name: 'Q&A format',
          transform: () => diversifier.toQA(narrativeContent),
          checks: [
            { pattern: /Q:/, description: 'should have questions' },
            { pattern: /A:/, description: 'should have answers' },
            { custom: (result: string) => (result.match(/Q:/g) || []).length > 0, description: 'should have multiple Q markers' }
          ]
        },
        {
          name: 'tutorial format',
          transform: () => diversifier.toTutorial(narrativeContent),
          checks: [
            { pattern: /#{1,3}\s*Step\s+\d+/, description: 'should have step headers' },
            { pattern: /Step 1/, description: 'should start with Step 1' }
          ]
        },
        {
          name: 'comparison format',
          transform: () => diversifier.toComparison(narrativeContent),
          checks: [
            { pattern: /#{1,3}\s*Approach [AB]/, description: 'should have approach headers' },
            { pattern: /Approach A/, description: 'should have Approach A' },
            { pattern: /Approach B/, description: 'should have Approach B' }
          ]
        }
      ];

      structureTests.forEach(({ name, transform, checks }) => {
        const result = transform();
        checks.forEach(check => {
          if (check.pattern) {
            expect(result, `${name}: ${check.description}`).toMatch(check.pattern);
          }
          if (check.negativePattern) {
            expect(result, `${name}: ${check.description}`).not.toMatch(check.negativePattern);
          }
          if (check.custom) {
            expect(check.custom(result), `${name}: ${check.description}`).toBe(true);
          }
        });
      });
    });

    it('should preserve content when restructuring', () => {
      const content = 'Authentication is critical for security.';
      const result = diversifier.restructure(content, 'bullets');

      expect(result).toMatch(/authentication/i);
      expect(result).toMatch(/security/i);
    });
  });

  describe('Tone Adjustment', () => {
    it('should convert to formal tone (expand contractions, remove casual language)', () => {
      const casualContent = "Here's the thing - it's really great!";
      const result = diversifier.toFormal(casualContent);

      expect(result, 'formal tone should remove contractions and casual phrases').not.toMatch(/(here's|it's|really)/i);
      expect(result, 'formal tone should use full forms').toMatch(/\w+\s+is\b/);

      const withContractions = "Don't worry, it's fine.";
      const formalResult = diversifier.toFormal(withContractions);
      expect(formalResult, 'should expand do not').toMatch(/do not/i);
      expect(formalResult, 'should expand it is').toMatch(/it is/i);
    });

    it('should convert to conversational tone', () => {
      const formalContent = 'The implementation demonstrates efficacy.';
      const result = diversifier.toConversational(formalContent);

      expect(result, 'conversational tone should add casual markers').toMatch(/(well|so|now|see)/i);
    });

    it('should convert to enthusiastic tone', () => {
      const plainContent = 'This approach is effective.';
      const result = diversifier.toEnthusiastic(plainContent);

      expect(result, 'enthusiastic tone should add excitement markers').toMatch(/(!|amazing|fantastic|excellent|great|outstanding|brilliant)/i);
    });

    it('should convert to matter-of-fact tone (remove emphasis and exclamations)', () => {
      const enthusiasticContent = 'This is absolutely amazing! Really fantastic work!';
      const result = diversifier.toMatterOfFact(enthusiasticContent);

      expect(result, 'matter-of-fact should remove exclamations').not.toMatch(/!/);
      expect(result, 'matter-of-fact should remove emphatic words').not.toMatch(/(really|very|extremely|absolutely)/i);

      const emphatic = 'This is clearly very important.';
      const matterOfFactResult = diversifier.toMatterOfFact(emphatic);
      expect(matterOfFactResult, 'should remove clearly and very').not.toMatch(/(clearly|very)/i);
    });
  });

  describe('Length Variation', () => {
    const longContent = 'This is a comprehensive explanation. It covers multiple aspects. Each aspect requires detailed discussion. The implementation involves several steps. Testing is crucial for quality. Documentation ensures maintainability.';

    it('should shorten and expand content while maintaining core message', () => {
      const conciseResult = diversifier.toConcise(longContent);
      expect(conciseResult.length, 'concise should be shorter').toBeLessThan(longContent.length);
      expect(conciseResult, 'concise should keep content').toMatch(/\w+/);
      expect(conciseResult, 'concise should keep first/last sentences').toMatch(/comprehensive explanation/i);

      const shortContent = 'This works well. It is efficient.';
      const comprehensiveResult = diversifier.toComprehensive(shortContent);
      expect(comprehensiveResult.length, 'comprehensive should maintain or increase length').toBeGreaterThanOrEqual(shortContent.length);

      const content = 'Caching improves performance.';
      const expanded = diversifier.toComprehensive(content);
      expect(expanded, 'should preserve key terms: caching').toMatch(/cach/i);
      expect(expanded, 'should preserve key terms: performance').toMatch(/performance/i);
    });
  });

  describe('Example Generation', () => {
    it('should generate before/after pairs', async () => {
      const topic = 'authentication';
      const result = await diversifier.generateBeforeAfter(topic);

      expect(result).toHaveProperty('before');
      expect(result).toHaveProperty('after');
      expect(result.before).toBeTruthy();
      expect(result.after).toBeTruthy();
      expect(result.before).not.toBe(result.after);
    });

    it('should generate diverse scenarios with variations', async () => {
      const concept = 'API rate limiting';
      const count = 3;
      const scenarios = await diversifier.generateDiverseScenarios(concept, count);

      expect(scenarios).toHaveLength(count);
      scenarios.forEach(scenario => {
        expect(scenario, 'scenario should have content').toBeTruthy();
        expect(scenario, 'scenario should match concept').toMatch(/API|rate|limit/i);
      });

      const cachingScenarios = await diversifier.generateDiverseScenarios('caching', 4);
      const unique = new Set(cachingScenarios);
      expect(unique.size, 'scenarios should be different').toBeGreaterThan(1);
    });
  });

  describe('Diversity Analysis', () => {
    it('should score authenticity based on metrics and AI patterns', () => {
      const contentWithMetrics = 'The system reduces latency by 30ms and costs $500K annually.';
      const authenticResult = diversifier['scoreAuthenticity'](contentWithMetrics);
      expect(authenticResult, 'specific metrics should score high').toBeGreaterThan(50);

      const aiContent = 'It is important to note that we should delve into this. At the end of the day, it is crucial.';
      const aiResult = diversifier['scoreAuthenticity'](aiContent);
      expect(aiResult, 'AI patterns should score low').toBeLessThan(50);
    });

    it('should calculate diversity between variations correctly', () => {
      const diversityTests = [
        {
          name: 'different content',
          content1: 'This is a test.',
          content2: 'This is a completely different test with more content.',
          expectation: (score: number) => score > 0 && score <= 100
        },
        {
          name: 'similar content',
          content1: 'This is a test.',
          content2: 'This is a test!',
          expectation: (score: number) => score < 20
        },
        {
          name: 'very different content',
          content1: 'Short.',
          content2: 'This is a completely different and much longer piece of content with various details.',
          expectation: (score: number) => score > 50
        }
      ];

      diversityTests.forEach(({ name, content1, content2, expectation }) => {
        const score = diversifier['scoreDiversity'](content1, content2);
        expect(expectation(score), `${name} should meet diversity expectations (score: ${score})`).toBe(true);
      });
    });
  });

  describe('Full Diversification Flow', () => {
    const testContent = 'API rate limiting prevents abuse and ensures fair resource allocation.';

    it('should diversify with multiple options and track metadata', async () => {
      const options: DiversificationOptions[] = [
        { voice: 'academic' },
        { voice: 'technical' },
        { voice: 'casual' },
      ];

      const result = await diversifier.diversify(testContent, options);

      expect(result.variations).toHaveLength(3);
      expect(result.metadata.originalLength).toBe(testContent.length);
      expect(result.metadata.variationsGenerated).toBe(3);
    });

    it('should generate variations with all options combined and track changes', async () => {
      const options: DiversificationOptions = {
        voice: 'technical',
        perspective: 'first-person',
        structure: 'bullets',
        tone: 'conversational',
        length: 'concise',
      };

      const result = await diversifier.generateVariation(testContent, options);

      expect(result.content).toBeTruthy();
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.score.authenticity).toBeGreaterThanOrEqual(0);
      expect(result.score.diversity).toBeGreaterThanOrEqual(0);

      const trackingOptions: DiversificationOptions = { voice: 'academic', tone: 'formal' };
      const trackingResult = await diversifier.generateVariation(testContent, trackingOptions);
      expect(trackingResult.changes).toBeTruthy();
      expect(trackingResult.changes.length).toBeGreaterThan(0);
      trackingResult.changes.forEach(change => {
        expect(change).toMatch(/voice|tone|perspective|structure|length/i);
      });
    });

    it('should maintain authenticity and create diverse variations', async () => {
      const options: DiversificationOptions[] = [
        { voice: 'technical', tone: 'conversational' },
        { voice: 'executive', tone: 'formal' },
      ];

      const result = await diversifier.diversify(testContent, options);

      result.variations.forEach((variation, idx) => {
        expect(variation.score.authenticity, `variation ${idx} should be authentic`).toBeGreaterThan(30);
      });

      const diverseOptions: DiversificationOptions[] = [
        { voice: 'academic' },
        { voice: 'casual' },
      ];
      const diverseResult = await diversifier.diversify(testContent, diverseOptions);
      expect(diverseResult.variations[0].content).not.toBe(diverseResult.variations[1].content);
      expect(diverseResult.variations[0].score.diversity).toBeGreaterThan(0);
    });
  });

  describe('Helper Methods', () => {
    it('should split content into sentences correctly', () => {
      const content = 'First sentence. Second sentence! Third sentence?';
      const sentences = diversifier['splitIntoSentences'](content);

      expect(sentences.length).toBe(3);
      expect(sentences.every(s => /[.!?]$/.test(s)), 'all sentences should end with punctuation').toBe(true);
    });

    it('should convert statements to questions', () => {
      const statement = 'The system is reliable.';
      const question = diversifier['statementToQuestion'](statement);

      expect(question).toMatch(/\?$/);
      expect(question).toMatch(/what|how|why|when|is/i);
    });

    it('should detect voice from characteristics', () => {
      const technicalContent = 'The implementation reduces latency by 40ms through connection pooling.';
      const voice = diversifier['detectVoice'](technicalContent);

      expect(voice).toBe('technical');
    });

    it('should generate AI-heavy content', () => {
      const content = diversifier['generateAIHeavyContent']('authentication');

      expect(content).toMatch(/(important to note|delve|end of the day|goes without saying)/i);
      expect(content).toMatch(/authentication/);
    });

    it('should calculate Levenshtein distance including edge cases', () => {
      const distance = diversifier['levenshteinDistance']('kitten', 'sitting');
      expect(distance).toBe(3);

      const emptyDistance = diversifier['levenshteinDistance']('', 'test');
      expect(emptyDistance).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle various content edge cases', async () => {
      const edgeCases = [
        {
          name: 'very short content',
          content: 'OK.',
          test: async () => {
            const result = await diversifier.generateVariation('OK.', { voice: 'academic' });
            return result.content;
          },
          check: (result: string) => result.length > 0
        },
        {
          name: 'very long content',
          content: 'This is a test. '.repeat(100),
          test: async () => {
            const longContent = 'This is a test. '.repeat(100);
            const result = await diversifier.generateVariation(longContent, { length: 'concise' });
            return { content: result.content, originalLength: longContent.length };
          },
          check: (result: any) => result.content.length < result.originalLength
        },
        {
          name: 'content without punctuation',
          content: 'no punctuation here',
          test: async () => diversifier.toBulletPoints('no punctuation here'),
          check: (result: string) => result.length > 0
        },
        {
          name: 'content with special characters',
          content: 'Test with $pecial ch@racters & symbols!',
          test: async () => diversifier.toAcademicVoice('Test with $pecial ch@racters & symbols!'),
          check: (result: string) => result.length > 0
        },
        {
          name: 'multiple consecutive spaces',
          content: 'Content   with    extra   spaces.',
          test: async () => diversifier.toFormal('Content   with    extra   spaces.'),
          check: (result: string) => !/\s{2,}/.test(result)
        },
        {
          name: 'content with code blocks',
          content: 'Here is code: `const x = 10;` and more text.',
          test: async () => diversifier.toTechnicalVoice('Here is code: `const x = 10;` and more text.'),
          check: (result: string) => result.includes('`const x = 10;`')
        }
      ];

      for (const { name, test, check } of edgeCases) {
        const result = await test();
        expect(check(result), `should handle ${name}`).toBe(true);
      }
    });
  });
});
