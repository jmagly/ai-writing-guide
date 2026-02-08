/**
 * Voice Analyzer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  VoiceAnalyzer,
  type VoiceProfile,
  type ComparisonResult,
} from '../../../src/writing/voice-analyzer.ts';

describe('VoiceAnalyzer', () => {
  let analyzer: VoiceAnalyzer;

  beforeEach(() => {
    analyzer = new VoiceAnalyzer();
  });

  describe('Voice Analysis', () => {
    it('should analyze all voice types and provide complete profile data', () => {
      const voiceTests = [
        {
          type: 'academic',
          content: 'Recent research (Smith, 2023) suggests that performance optimization may demonstrate significant benefits. Furthermore, studies indicate various approaches merit consideration.',
        },
        {
          type: 'technical',
          content: 'The implementation reduces latency by 40ms through connection pooling. System throughput increases by 30% with the optimized payload structure.',
        },
        {
          type: 'executive',
          content: 'This approach delivers $500K annual savings with 30% ROI. We recommend strategic adoption to maximize value for stakeholders.',
        },
        {
          type: 'casual',
          content: "Here's the thing - it's really important. I've seen this pattern work before. Don't overthink it.",
        },
      ];

      voiceTests.forEach(({ type, content }) => {
        const profile = analyzer.analyzeVoice(content);
        expect(profile.primaryVoice, `failed to detect ${type} voice`).toBe(type);
        expect(profile.characteristics[type], `${type} characteristics should be present`).toBeGreaterThan(0);
      });
    });

    it('should detect mixed voice', () => {
      const content = 'Research (Lee, 2023) shows that the system reduces latency by 30ms. This delivers $200K savings. Here\'s the thing - it works!';
      const profile = analyzer.analyzeVoice(content);

      // Should have characteristics from multiple voices
      expect(profile.characteristics.academic).toBeGreaterThan(0);
      expect(profile.characteristics.technical).toBeGreaterThan(0);
      expect(profile.characteristics.executive).toBeGreaterThan(0);
    });

    it('should provide confidence score, markers, and metadata', () => {
      const content = 'This is a test. It has multiple sentences. Each sentence contributes to the analysis with performance optimization through caching.';
      const profile = analyzer.analyzeVoice(content);

      // Confidence
      expect(profile.confidence).toBeGreaterThanOrEqual(0);
      expect(profile.confidence).toBeLessThanOrEqual(100);

      // Markers
      expect(profile.markers).toBeTruthy();
      expect(Array.isArray(profile.markers)).toBe(true);

      // Metadata
      expect(profile.metadata.wordCount).toBeGreaterThan(0);
      expect(profile.metadata.sentenceCount).toBeGreaterThan(0);
      expect(profile.metadata.averageSentenceLength).toBeGreaterThan(0);
    });
  });

  describe('Voice Detection', () => {
    it('should detect all voice types correctly', () => {
      const voiceTests = [
        {
          type: 'academic',
          content: 'Studies (Jones, 2022) demonstrate that the approach may yield benefits.',
        },
        {
          type: 'technical',
          content: 'The API endpoint returns JSON with 200 status in 15ms average latency.',
        },
        {
          type: 'executive',
          content: 'Strategic adoption will deliver 25% cost reduction and $1M annual savings.',
        },
        {
          type: 'casual',
          content: "Look, here's what I think - it's pretty straightforward. Just don't overthink it.",
        },
      ];

      voiceTests.forEach(({ type, content }) => {
        const voice = analyzer.detectVoice(content);
        expect(voice, `failed to detect ${type} voice`).toBe(type);
      });
    });

    it('should detect mixed voice when appropriate', () => {
      const content = 'The standard approach works fine.';
      const voice = analyzer.detectVoice(content);

      expect(['academic', 'technical', 'executive', 'casual', 'mixed']).toContain(voice);
    });
  });

  describe('Diversity Scoring', () => {
    it('should score diversity between variations', () => {
      const variations = [
        'This is the first variation with specific content.',
        'Here is a completely different second variation.',
        'And now for something entirely distinct as variation three.',
      ];

      const score = analyzer.scoreDiversity(variations);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give low diversity for similar content', () => {
      const variations = [
        'This is a test.',
        'This is a test!',
        'This is a test?',
      ];

      const score = analyzer.scoreDiversity(variations);

      expect(score).toBeLessThan(30);
    });

    it('should give high diversity for very different content', () => {
      const variations = [
        'Short text.',
        'This is a much longer piece of content with significantly more detail and completely different structure.',
        'Academic research (Smith, 2023) suggests that approaches may vary considerably.',
      ];

      const score = analyzer.scoreDiversity(variations);

      expect(score).toBeGreaterThan(40);
    });

    it('should handle edge cases', () => {
      expect(analyzer.scoreDiversity(['Single variation'])).toBe(0);
      expect(analyzer.scoreDiversity([])).toBe(0);
    });
  });

  describe('Variation Comparison', () => {
    it('should compare variations', () => {
      const original = 'The system provides good performance.';
      const variation = 'Implementation reduces latency by 30ms through caching.';
      const result = analyzer.compareVariations(original, variation);

      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(100);
      expect(result.differences).toBeTruthy();
      expect(result.voiceShift).toBeTruthy();
    });

    it('should detect voice shift', () => {
      const original = 'Research suggests this may work.';
      const variation = "Here's the thing - it definitely works!";
      const result = analyzer.compareVariations(original, variation);

      expect(result.voiceShift.from).toBeTruthy();
      expect(result.voiceShift.to).toBeTruthy();
      expect(result.voiceShift.magnitude).toBeGreaterThanOrEqual(0);
    });

    it('should identify differences', () => {
      const original = 'The approach is effective.';
      const variation = 'The approach demonstrates 40% efficiency improvement.';
      const result = analyzer.compareVariations(original, variation);

      expect(result.differences.length).toBeGreaterThan(0);
      result.differences.forEach(diff => {
        expect(diff.type).toMatch(/addition|removal|modification/);
        expect(diff.impact).toMatch(/high|medium|low/);
      });
    });

    it('should detect structural changes', () => {
      const original = 'First point. Second point. Third point.';
      const variation = '- First point\n- Second point\n- Third point';
      const result = analyzer.compareVariations(original, variation);

      expect(result.structuralChanges.length).toBeGreaterThan(0);
    });

    it('should calculate similarity accurately', () => {
      const identical1 = 'This is identical text.';
      const identical2 = 'This is identical text.';
      const result = analyzer.compareVariations(identical1, identical2);

      expect(result.similarity).toBeGreaterThan(90);
    });

    it('should detect specific change types', () => {
      const changeTests = [
        {
          type: 'length',
          original: 'Brief content.',
          variation: 'This is much longer content with significantly more detail and explanation of various concepts and approaches.',
        },
        {
          type: 'perspective',
          original: 'I implemented the solution.',
          variation: 'One implements the solution.',
        },
        {
          type: 'tone',
          original: 'The implementation demonstrates efficacy.',
          variation: "It's working great!",
        },
      ];

      changeTests.forEach(({ type, original, variation }) => {
        const result = analyzer.compareVariations(original, variation);
        expect(result.differences.some(d => d.description.match(new RegExp(type, 'i'))), `failed to detect ${type} change`).toBe(true);
      });
    });
  });

  describe('Perspective Detection', () => {
    it('should detect first-person', () => {
      const content = 'I believe we should implement this approach. Our team will handle it.';
      const perspective = analyzer.detectPerspective(content);

      expect(perspective).toBe('first-person');
    });

    it('should detect third-person', () => {
      const content = 'They implemented the solution. Their approach demonstrates efficacy.';
      const perspective = analyzer.detectPerspective(content);

      expect(perspective).toBe('third-person');
    });

    it('should detect neutral', () => {
      const content = 'The system processes requests efficiently. Users benefit from improved performance.';
      const perspective = analyzer.detectPerspective(content);

      expect(perspective).toBe('neutral');
    });

    it('should handle mixed perspective', () => {
      const content = 'I think the system works well. Users will benefit.';
      const perspective = analyzer.detectPerspective(content);

      expect(['first-person', 'third-person', 'neutral']).toContain(perspective);
    });
  });

  describe('Tone Detection', () => {
    it('should detect all tone types', () => {
      const toneTests = [
        {
          tone: 'formal',
          content: 'Furthermore, the implementation demonstrates considerable efficacy. Nevertheless, certain limitations merit acknowledgment.',
        },
        {
          tone: 'conversational',
          content: "Look, here's the thing - it's pretty simple. Just don't overthink it, really.",
        },
        {
          tone: 'enthusiastic',
          content: 'This is amazing! The results are fantastic! Absolutely brilliant work!',
        },
        {
          tone: 'matter-of-fact',
          content: 'The system works. Performance is acceptable. Results meet requirements.',
        },
      ];

      toneTests.forEach(({ tone, content }) => {
        const detected = analyzer.detectTone(content);
        expect(detected, `failed to detect ${tone} tone`).toBe(tone);
      });
    });
  });

  describe('Consistency Analysis', () => {
    it('should analyze voice consistency', () => {
      const content = 'Technical content with latency metrics. '.repeat(50) +
                     'More technical details about performance. '.repeat(50);
      const result = analyzer.analyzeConsistency(content);

      expect(result.overallConsistency).toBeGreaterThanOrEqual(0);
      expect(result.overallConsistency).toBeLessThanOrEqual(100);
      expect(result.sectionProfiles).toBeTruthy();
    });

    it('should detect inconsistencies', () => {
      const content =
        'Research (Smith, 2023) suggests academic approach. '.repeat(30) +
        "Here's the thing - it's really casual now. ".repeat(30);
      const result = analyzer.analyzeConsistency(content);

      expect(result.inconsistencies.length).toBeGreaterThan(0);
    });

    it('should handle short content', () => {
      const shortContent = 'Brief text.';
      const result = analyzer.analyzeConsistency(shortContent);

      expect(result.overallConsistency).toBe(100);
    });

    it('should identify section profiles', () => {
      const content = 'Technical details about performance. '.repeat(50);
      const result = analyzer.analyzeConsistency(content, 100);

      expect(result.sectionProfiles.length).toBeGreaterThan(0);
      result.sectionProfiles.forEach(profile => {
        expect(profile.primaryVoice).toBeTruthy();
      });
    });

    it('should use custom section size', () => {
      const content = 'Word '.repeat(500);
      const result = analyzer.analyzeConsistency(content, 50);

      expect(result.sectionProfiles.length).toBeGreaterThan(5);
    });
  });

  describe('Helper Methods', () => {
    it('should count words correctly', () => {
      const content = 'This is a test with seven words.';
      const count = analyzer['countWords'](content);

      expect(count).toBe(7);
    });

    it('should count sentences correctly', () => {
      const content = 'First sentence. Second sentence! Third sentence?';
      const count = analyzer['countSentences'](content);

      expect(count).toBe(3);
    });

    it('should calculate Levenshtein distance for various cases', () => {
      const distanceTests = [
        { str1: 'kitten', str2: 'sitting', expected: 3 },
        { str1: 'test', str2: 'test', expected: 0 },
        { str1: '', str2: 'test', expected: 4 },
      ];

      distanceTests.forEach(({ str1, str2, expected }) => {
        const distance = analyzer['levenshteinDistance'](str1, str2);
        expect(distance, `failed for '${str1}' vs '${str2}'`).toBe(expected);
      });
    });

    it('should split content into sections', () => {
      const content = 'word '.repeat(300);
      const sections = analyzer['splitIntoSections'](content, 100);

      expect(sections.length).toBe(3);
    });

    it('should find most common element', () => {
      const items = ['a', 'b', 'a', 'c', 'a', 'b'];
      const mostCommon = analyzer['findMostCommon'](items);

      expect(mostCommon).toBe('a');
    });
  });

  describe('Voice Markers', () => {
    it('should detect all voice marker types', () => {
      const markerTests = [
        {
          type: 'academic',
          content: 'Research (Smith, 2023) furthermore demonstrates that approaches may suggest benefits.',
        },
        {
          type: 'technical',
          content: 'System latency reduced by 40ms with 30% throughput improvement via payload optimization.',
        },
        {
          type: 'executive',
          content: '$500K annual savings with 30% ROI improvement. Strategic priority for Q3.',
        },
        {
          type: 'casual',
          content: "Here's the thing - it's really great! Don't worry, I've got this.",
        },
      ];

      markerTests.forEach(({ type, content }) => {
        const profile = analyzer.analyzeVoice(content);
        const typeMarkers = profile.markers.filter(m => m.type === type);
        expect(typeMarkers.length, `failed to detect ${type} markers`).toBeGreaterThan(0);
      });
    });

    it('should track marker positions correctly', () => {
      const content = 'First part. Research (Smith, 2023) in middle. End part.';
      const profile = analyzer.analyzeVoice(content);

      profile.markers.forEach(marker => {
        expect(marker.position).toBeGreaterThanOrEqual(0);
        expect(marker.position).toBeLessThan(content.length);
      });
    });

    it('should sort markers by position', () => {
      const content = 'End marker research (Lee, 2023). Start furthermore text.';
      const profile = analyzer.analyzeVoice(content);

      for (let i = 1; i < profile.markers.length; i++) {
        expect(profile.markers[i].position).toBeGreaterThanOrEqual(profile.markers[i - 1].position);
      }
    });
  });

  describe('Structural Change Detection', () => {
    it('should detect all structural change types', () => {
      const structureTests = [
        {
          type: 'Converted to bullet point format',
          original: 'First point. Second point.',
          variation: '- First point\n- Second point',
        },
        {
          type: 'Converted from bullet points to narrative',
          original: '- First point\n- Second point',
          variation: 'First point. Second point.',
        },
        {
          type: 'Added section headings',
          original: 'Plain content here.',
          variation: '## Heading\n\nPlain content here.',
        },
        {
          type: 'Converted to Q&A format',
          original: 'Statement about topic.',
          variation: 'Q: What about topic?\n\nA: Statement about topic.\n\nQ: More questions?\n\nA: More answers.',
        },
        {
          type: 'Added code examples',
          original: 'Text content.',
          variation: 'Text content.\n\n```typescript\nconst x = 10;\n```',
        },
      ];

      structureTests.forEach(({ type, original, variation }) => {
        const result = analyzer.compareVariations(original, variation);
        expect(result.structuralChanges, `failed to detect: ${type}`).toContain(type);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle various edge cases correctly', () => {
      const edgeCases = [
        {
          name: 'empty content',
          content: '',
          checks: (profile: VoiceProfile) => {
            expect(profile.primaryVoice).toBeTruthy();
            expect(profile.metadata.wordCount).toBe(0);
          },
        },
        {
          name: 'very short content',
          content: 'OK.',
          checks: (profile: VoiceProfile) => {
            expect(profile).toBeTruthy();
            expect(profile.metadata.wordCount).toBe(1);
          },
        },
        {
          name: 'very long content',
          content: 'This is a long sentence. '.repeat(1000),
          checks: (profile: VoiceProfile) => {
            expect(profile.metadata.sentenceCount).toBe(1000);
          },
        },
        {
          name: 'no punctuation',
          content: 'content without any punctuation marks at all',
          checks: (profile: VoiceProfile) => {
            expect(profile).toBeTruthy();
          },
        },
        {
          name: 'special characters',
          content: 'Test with $pecial @nd #unusual characters!',
          checks: (profile: VoiceProfile) => {
            expect(profile.metadata.wordCount).toBeGreaterThan(0);
          },
        },
        {
          name: 'multiple consecutive spaces',
          content: 'Words    with    extra     spaces.',
          checks: (profile: VoiceProfile) => {
            expect(profile.metadata.wordCount).toBe(4);
          },
        },
        {
          name: 'unicode characters',
          content: 'Content with émojis 🚀 and special chars ñ ü.',
          checks: (profile: VoiceProfile) => {
            expect(profile).toBeTruthy();
          },
        },
        {
          name: 'newlines and formatting',
          content: 'Line one.\n\nLine two.\n\nLine three.',
          checks: (profile: VoiceProfile) => {
            expect(profile.metadata.sentenceCount).toBe(3);
          },
        },
      ];

      edgeCases.forEach(({ name, content, checks }) => {
        const profile = analyzer.analyzeVoice(content);
        checks(profile);
      });
    });
  });
});
