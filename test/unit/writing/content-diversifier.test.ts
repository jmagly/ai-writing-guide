/**
 * Content Diversifier Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContentDiversifier,
  type DiversificationOptions,
  type Voice,
} from '../../../src/writing/content-diversifier.js';

describe('ContentDiversifier', () => {
  let diversifier: ContentDiversifier;

  beforeEach(() => {
    diversifier = new ContentDiversifier();
  });

  describe('Voice Transformation', () => {
    const testContent = 'This system provides improved performance for data processing tasks.';

    it('should transform to academic voice', () => {
      const result = diversifier.toAcademicVoice(testContent);

      expect(result).toBeTruthy();
      expect(result).not.toBe(testContent);
      // Should contain academic markers
      expect(result.toLowerCase()).toMatch(/(suggests?|appears?|may|might|furthermore|moreover)/);
    });

    it('should transform to technical voice', () => {
      const result = diversifier.toTechnicalVoice(testContent);

      expect(result).toBeTruthy();
      expect(result).not.toBe(testContent);
      // Should contain technical metrics or terminology
      expect(result).toMatch(/(\d+%|\d+ms|latency|throughput|payload|implementation)/i);
    });

    it('should transform to executive voice', () => {
      const result = diversifier.toExecutiveVoice(testContent);

      expect(result).toBeTruthy();
      expect(result).not.toBe(testContent);
      // Should contain business metrics or decision language
      expect(result).toMatch(/(\$|ROI|recommend|strategic|priority)/i);
    });

    it('should transform to casual voice', () => {
      const result = diversifier.toCasualVoice(testContent);

      expect(result).toBeTruthy();
      expect(result).not.toBe(testContent);
      // Should contain contractions or casual language
      expect(result).toMatch(/(don't|can't|it's|here's|thing)/i);
    });

    it('should preserve core message across voices', () => {
      const voices: Voice[] = ['academic', 'technical', 'executive', 'casual'];
      const results = voices.map(voice => diversifier.transformVoice(testContent, 'technical', voice));

      // All should mention system/performance
      results.forEach(result => {
        expect(result.toLowerCase()).toMatch(/(system|performance|process)/);
      });
    });

    it('should detect source voice before transforming', () => {
      const academicContent = 'Recent studies (Smith, 2023) suggest that performance optimization may demonstrate significant benefits.';
      const voice = diversifier.detectVoice(academicContent);

      expect(voice).toBe('academic');
    });

    it('should handle mixed voice content', () => {
      const mixedContent = 'The system (Jones, 2023) reduces latency by 30ms. We recommend strategic adoption.';
      const voice = diversifier.detectVoice(mixedContent);

      // Should detect as mixed or one of the voices
      expect(['academic', 'technical', 'executive', 'mixed']).toContain(voice);
    });

    it('should add citations to academic voice', () => {
      const result = diversifier.toAcademicVoice(testContent);

      // Should have citation-like patterns
      expect(result).toMatch(/\([A-Z]\w+,?\s*\d{4}\)/);
    });

    it('should add metrics to technical voice', () => {
      const result = diversifier.toTechnicalVoice('The system is faster.');

      // Should add specific measurements
      expect(result).toMatch(/\d+(\.\d+)?\s*(ms|%|x|MB|GB|seconds)/);
    });

    it('should add business metrics to executive voice', () => {
      const result = diversifier.toExecutiveVoice('This saves money.');

      // Should add dollar amounts or percentages
      expect(result).toMatch(/(\$\d+|\d+%)/);
    });

    it('should add personal examples to casual voice', () => {
      const result = diversifier.toCasualVoice(testContent);

      // Should have personal or conversational elements
      expect(result).toMatch(/(I've|we|you|here's|thing)/i);
    });

    it('should remove hedging in executive voice', () => {
      const hedgedContent = 'We might possibly consider this approach.';
      const result = diversifier.toExecutiveVoice(hedgedContent);

      expect(result).not.toMatch(/might|possibly/i);
      expect(result).toMatch(/will|must|recommend/i);
    });

    it('should add contractions to casual voice', () => {
      const formalContent = 'We do not think it is necessary.';
      const result = diversifier.toCasualVoice(formalContent);

      expect(result).toMatch(/(don't|isn't)/);
    });

    it('should maintain technical accuracy in transformations', () => {
      const technicalContent = 'The API endpoint returns JSON with 200 status code.';
      const result = diversifier.toAcademicVoice(technicalContent);

      // Should preserve technical terms
      expect(result).toMatch(/API|endpoint|JSON|200/i);
    });

    it('should handle empty content gracefully', () => {
      const result = diversifier.toAcademicVoice('');
      expect(result).toBe('');
    });

    it('should handle single sentence content', () => {
      const shortContent = 'This works well.';
      const result = diversifier.toTechnicalVoice(shortContent);

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Perspective Shifting', () => {
    it('should convert to first-person', () => {
      const content = 'One should consider the implications carefully.';
      const result = diversifier.toFirstPerson(content);

      expect(result).toMatch(/\b(I|my|we)\b/);
      expect(result).not.toMatch(/\bone\b/);
    });

    it('should convert to third-person', () => {
      const content = 'I think we should implement this approach.';
      const result = diversifier.toThirdPerson(content);

      expect(result).not.toMatch(/\b(I|we|my|our)\b/g);
      expect(result).toMatch(/\b(one|they|their)\b/);
    });

    it('should convert to neutral', () => {
      const content = 'I can configure the system to handle your requests.';
      const result = diversifier.toNeutral(content);

      expect(result).not.toMatch(/\b(I|you|we|my|your)\b/);
      expect(result).toMatch(/(system|approach|users?)/i);
    });

    it('should handle existing perspective markers', () => {
      const firstPersonContent = 'I believe this works.';
      const result = diversifier.changePerspective(firstPersonContent, 'third-person');

      expect(result).not.toMatch(/\bI\b/);
    });

    it('should preserve meaning when changing perspective', () => {
      const content = 'I implemented the caching layer.';
      const result = diversifier.toThirdPerson(content);

      expect(result).toMatch(/caching|cache/i);
      expect(result).toMatch(/implement/i);
    });
  });

  describe('Structure Variation', () => {
    const narrativeContent = 'First, we analyze the problem. Then we design a solution. Finally, we implement the code.';

    it('should convert to bullet points', () => {
      const result = diversifier.toBulletPoints(narrativeContent);

      expect(result).toMatch(/^-\s+/m);
      const bullets = result.split('\n').filter(line => line.startsWith('-'));
      expect(bullets.length).toBeGreaterThan(0);
    });

    it('should convert to narrative', () => {
      const bulletContent = '- First point\n- Second point\n- Third point';
      const result = diversifier.toNarrative(bulletContent);

      expect(result).not.toMatch(/^-\s+/m);
      expect(result).toMatch(/(furthermore|additionally|moreover|also)/i);
    });

    it('should convert to Q&A format', () => {
      const result = diversifier.toQA(narrativeContent);

      expect(result).toMatch(/Q:/);
      expect(result).toMatch(/A:/);
      const questions = result.match(/Q:/g);
      expect(questions).toBeTruthy();
      expect(questions!.length).toBeGreaterThan(0);
    });

    it('should convert to tutorial format', () => {
      const result = diversifier.toTutorial(narrativeContent);

      expect(result).toMatch(/#{1,3}\s*Step\s+\d+/);
      expect(result).toMatch(/Step 1/);
    });

    it('should convert to comparison format', () => {
      const result = diversifier.toComparison(narrativeContent);

      expect(result).toMatch(/#{1,3}\s*Approach [AB]/);
      expect(result).toMatch(/Approach A/);
      expect(result).toMatch(/Approach B/);
    });

    it('should preserve content when restructuring', () => {
      const content = 'Authentication is critical for security.';
      const result = diversifier.restructure(content, 'bullets');

      expect(result).toMatch(/authentication/i);
      expect(result).toMatch(/security/i);
    });
  });

  describe('Tone Adjustment', () => {
    const casualContent = "Here's the thing - it's really great!";

    it('should convert to formal tone', () => {
      const result = diversifier.toFormal(casualContent);

      expect(result).not.toMatch(/(here's|it's|really)/i);
      expect(result).toMatch(/\w+\s+is\b/);
    });

    it('should convert to conversational tone', () => {
      const formalContent = 'The implementation demonstrates efficacy.';
      const result = diversifier.toConversational(formalContent);

      expect(result).toMatch(/(well|so|now|see)/i);
    });

    it('should convert to enthusiastic tone', () => {
      const plainContent = 'This approach is effective.';
      const result = diversifier.toEnthusiastic(plainContent);

      expect(result).toMatch(/(!|amazing|fantastic|excellent|great)/i);
    });

    it('should convert to matter-of-fact tone', () => {
      const enthusiasticContent = 'This is absolutely amazing! Really fantastic work!';
      const result = diversifier.toMatterOfFact(enthusiasticContent);

      expect(result).not.toMatch(/!/);
      expect(result).not.toMatch(/(really|very|extremely|absolutely)/i);
    });

    it('should expand contractions in formal tone', () => {
      const result = diversifier.toFormal("Don't worry, it's fine.");

      expect(result).toMatch(/do not/i);
      expect(result).toMatch(/it is/i);
    });

    it('should remove emphatic words in matter-of-fact tone', () => {
      const result = diversifier.toMatterOfFact('This is clearly very important.');

      expect(result).not.toMatch(/(clearly|very)/i);
    });
  });

  describe('Length Variation', () => {
    const longContent = 'This is a comprehensive explanation. It covers multiple aspects. Each aspect requires detailed discussion. The implementation involves several steps. Testing is crucial for quality. Documentation ensures maintainability.';

    it('should shorten content', () => {
      const result = diversifier.toConcise(longContent);

      expect(result.length).toBeLessThan(longContent.length);
      // Should keep key sentences
      expect(result).toMatch(/\w+/);
    });

    it('should expand content', () => {
      const shortContent = 'This works well. It is efficient.';
      const result = diversifier.toComprehensive(shortContent);

      expect(result.length).toBeGreaterThan(shortContent.length);
    });

    it('should maintain core message when adjusting length', () => {
      const content = 'Caching improves performance.';
      const expanded = diversifier.toComprehensive(content);

      expect(expanded).toMatch(/cach/i);
      expect(expanded).toMatch(/performance/i);
    });

    it('should keep first and last sentences when shortening', () => {
      const result = diversifier.toConcise(longContent);

      expect(result).toMatch(/comprehensive explanation/i);
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

    it('should generate diverse scenarios', async () => {
      const concept = 'API rate limiting';
      const count = 3;
      const scenarios = await diversifier.generateDiverseScenarios(concept, count);

      expect(scenarios).toHaveLength(count);
      scenarios.forEach(scenario => {
        expect(scenario).toBeTruthy();
        expect(scenario).toMatch(/API|rate|limit/i);
      });
    });

    it('should create variations with different voices in scenarios', async () => {
      const scenarios = await diversifier.generateDiverseScenarios('caching', 4);

      // Scenarios should be different from each other
      const unique = new Set(scenarios);
      expect(unique.size).toBeGreaterThan(1);
    });
  });

  describe('Diversity Analysis', () => {
    it('should score authenticity with specific metrics', () => {
      const contentWithMetrics = 'The system reduces latency by 30ms and costs $500K annually.';
      const result = diversifier['scoreAuthenticity'](contentWithMetrics);

      expect(result).toBeGreaterThan(50);
    });

    it('should penalize AI detection patterns', () => {
      const aiContent = 'It is important to note that we should delve into this. At the end of the day, it is crucial.';
      const result = diversifier['scoreAuthenticity'](aiContent);

      expect(result).toBeLessThan(50);
    });

    it('should calculate diversity between variations', () => {
      const original = 'This is a test.';
      const variation = 'This is a completely different test with more content.';
      const diversity = diversifier['scoreDiversity'](original, variation);

      expect(diversity).toBeGreaterThan(0);
      expect(diversity).toBeLessThanOrEqual(100);
    });

    it('should give low diversity for similar content', () => {
      const content1 = 'This is a test.';
      const content2 = 'This is a test!';
      const diversity = diversifier['scoreDiversity'](content1, content2);

      expect(diversity).toBeLessThan(20);
    });

    it('should give high diversity for very different content', () => {
      const content1 = 'Short.';
      const content2 = 'This is a completely different and much longer piece of content with various details.';
      const diversity = diversifier['scoreDiversity'](content1, content2);

      expect(diversity).toBeGreaterThan(50);
    });
  });

  describe('Full Diversification Flow', () => {
    const testContent = 'API rate limiting prevents abuse and ensures fair resource allocation.';

    it('should diversify with multiple options', async () => {
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

    it('should generate variations with all options combined', async () => {
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
    });

    it('should track changes made', async () => {
      const options: DiversificationOptions = {
        voice: 'academic',
        tone: 'formal',
      };

      const result = await diversifier.generateVariation(testContent, options);

      expect(result.changes).toBeTruthy();
      expect(result.changes.length).toBeGreaterThan(0);
      result.changes.forEach(change => {
        expect(change).toMatch(/voice|tone|perspective|structure|length/i);
      });
    });

    it('should maintain authenticity in variations', async () => {
      const options: DiversificationOptions[] = [
        { voice: 'technical', tone: 'conversational' },
        { voice: 'executive', tone: 'formal' },
      ];

      const result = await diversifier.diversify(testContent, options);

      result.variations.forEach(variation => {
        expect(variation.score.authenticity).toBeGreaterThan(30);
      });
    });

    it('should create diverse variations', async () => {
      const options: DiversificationOptions[] = [
        { voice: 'academic' },
        { voice: 'casual' },
      ];

      const result = await diversifier.diversify(testContent, options);

      expect(result.variations[0].content).not.toBe(result.variations[1].content);
      expect(result.variations[0].score.diversity).toBeGreaterThan(0);
    });
  });

  describe('Helper Methods', () => {
    it('should split content into sentences', () => {
      const content = 'First sentence. Second sentence! Third sentence?';
      const sentences = diversifier['splitIntoSentences'](content);

      expect(sentences.length).toBe(3);
      sentences.forEach(sentence => {
        expect(sentence).toMatch(/[.!?]$/);
      });
    });

    it('should convert statements to questions', () => {
      const statement = 'The system is reliable.';
      const question = diversifier['statementToQuestion'](statement);

      expect(question).toMatch(/\?$/);
      expect(question).toMatch(/what|how|why|when/i);
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

    it('should calculate Levenshtein distance', () => {
      const distance = diversifier['levenshteinDistance']('kitten', 'sitting');

      expect(distance).toBe(3);
    });

    it('should handle empty strings in Levenshtein', () => {
      const distance = diversifier['levenshteinDistance']('', 'test');

      expect(distance).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short content', async () => {
      const shortContent = 'OK.';
      const result = await diversifier.generateVariation(shortContent, { voice: 'academic' });

      expect(result.content).toBeTruthy();
    });

    it('should handle very long content', async () => {
      const longContent = 'This is a test. '.repeat(100);
      const result = await diversifier.generateVariation(longContent, { length: 'concise' });

      expect(result.content.length).toBeLessThan(longContent.length);
    });

    it('should handle content without punctuation', () => {
      const content = 'no punctuation here';
      const result = diversifier.toBulletPoints(content);

      expect(result).toBeTruthy();
    });

    it('should handle content with special characters', () => {
      const content = 'Test with $pecial ch@racters & symbols!';
      const result = diversifier.toAcademicVoice(content);

      expect(result).toBeTruthy();
    });

    it('should handle multiple consecutive spaces', () => {
      const content = 'Content   with    extra   spaces.';
      const result = diversifier.toFormal(content);

      expect(result).not.toMatch(/\s{2,}/);
    });

    it('should handle content with code blocks', () => {
      const content = 'Here is code: `const x = 10;` and more text.';
      const result = diversifier.toTechnicalVoice(content);

      expect(result).toContain('`const x = 10;`');
    });
  });
});
