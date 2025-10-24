/**
 * Voice Analyzer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  VoiceAnalyzer,
  type VoiceProfile,
  type ComparisonResult,
} from '../../../src/writing/voice-analyzer.js';

describe('VoiceAnalyzer', () => {
  let analyzer: VoiceAnalyzer;

  beforeEach(() => {
    analyzer = new VoiceAnalyzer();
  });

  describe('Voice Analysis', () => {
    it('should analyze academic voice', () => {
      const content = 'Recent research (Smith, 2023) suggests that performance optimization may demonstrate significant benefits. Furthermore, studies indicate various approaches merit consideration.';
      const profile = analyzer.analyzeVoice(content);

      expect(profile.primaryVoice).toBe('academic');
      expect(profile.characteristics.academic).toBeGreaterThan(0);
    });

    it('should analyze technical voice', () => {
      const content = 'The implementation reduces latency by 40ms through connection pooling. System throughput increases by 30% with the optimized payload structure.';
      const profile = analyzer.analyzeVoice(content);

      expect(profile.primaryVoice).toBe('technical');
      expect(profile.characteristics.technical).toBeGreaterThan(0);
    });

    it('should analyze executive voice', () => {
      const content = 'This approach delivers $500K annual savings with 30% ROI. We recommend strategic adoption to maximize value for stakeholders.';
      const profile = analyzer.analyzeVoice(content);

      expect(profile.primaryVoice).toBe('executive');
      expect(profile.characteristics.executive).toBeGreaterThan(0);
    });

    it('should analyze casual voice', () => {
      const content = "Here's the thing - it's really important. I've seen this pattern work before. Don't overthink it.";
      const profile = analyzer.analyzeVoice(content);

      expect(profile.primaryVoice).toBe('casual');
      expect(profile.characteristics.casual).toBeGreaterThan(0);
    });

    it('should detect mixed voice', () => {
      const content = 'Research (Lee, 2023) shows that the system reduces latency by 30ms. This delivers $200K savings. Here\'s the thing - it works!';
      const profile = analyzer.analyzeVoice(content);

      // Should have characteristics from multiple voices
      expect(profile.characteristics.academic).toBeGreaterThan(0);
      expect(profile.characteristics.technical).toBeGreaterThan(0);
      expect(profile.characteristics.executive).toBeGreaterThan(0);
    });

    it('should provide confidence score', () => {
      const content = 'The implementation optimizes performance through caching with 50ms latency reduction.';
      const profile = analyzer.analyzeVoice(content);

      expect(profile.confidence).toBeGreaterThanOrEqual(0);
      expect(profile.confidence).toBeLessThanOrEqual(100);
    });

    it('should detect voice markers', () => {
      const content = 'Research suggests that latency reduction improves user experience.';
      const profile = analyzer.analyzeVoice(content);

      expect(profile.markers).toBeTruthy();
      expect(Array.isArray(profile.markers)).toBe(true);
    });

    it('should provide metadata', () => {
      const content = 'This is a test. It has multiple sentences. Each sentence contributes to the analysis.';
      const profile = analyzer.analyzeVoice(content);

      expect(profile.metadata.wordCount).toBeGreaterThan(0);
      expect(profile.metadata.sentenceCount).toBeGreaterThan(0);
      expect(profile.metadata.averageSentenceLength).toBeGreaterThan(0);
    });
  });

  describe('Voice Detection', () => {
    it('should detect academic voice', () => {
      const content = 'Studies (Jones, 2022) demonstrate that the approach may yield benefits.';
      const voice = analyzer.detectVoice(content);

      expect(voice).toBe('academic');
    });

    it('should detect technical voice', () => {
      const content = 'The API endpoint returns JSON with 200 status in 15ms average latency.';
      const voice = analyzer.detectVoice(content);

      expect(voice).toBe('technical');
    });

    it('should detect executive voice', () => {
      const content = 'Strategic adoption will deliver 25% cost reduction and $1M annual savings.';
      const voice = analyzer.detectVoice(content);

      expect(voice).toBe('executive');
    });

    it('should detect casual voice', () => {
      const content = "Look, here's what I think - it's pretty straightforward. Just don't overthink it.";
      const voice = analyzer.detectVoice(content);

      expect(voice).toBe('casual');
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

    it('should handle single variation', () => {
      const score = analyzer.scoreDiversity(['Single variation']);

      expect(score).toBe(0);
    });

    it('should handle empty array', () => {
      const score = analyzer.scoreDiversity([]);

      expect(score).toBe(0);
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

    it('should detect length changes', () => {
      const short = 'Brief content.';
      const long = 'This is much longer content with significantly more detail and explanation of various concepts and approaches.';
      const result = analyzer.compareVariations(short, long);

      expect(result.differences.some(d => d.description.match(/length/i))).toBe(true);
    });

    it('should detect perspective changes', () => {
      const firstPerson = 'I implemented the solution.';
      const thirdPerson = 'One implements the solution.';
      const result = analyzer.compareVariations(firstPerson, thirdPerson);

      expect(result.differences.some(d => d.description.match(/perspective/i))).toBe(true);
    });

    it('should detect tone changes', () => {
      const formal = 'The implementation demonstrates efficacy.';
      const casual = "It's working great!";
      const result = analyzer.compareVariations(formal, casual);

      expect(result.differences.some(d => d.description.match(/tone/i))).toBe(true);
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
    it('should detect formal tone', () => {
      const content = 'Furthermore, the implementation demonstrates considerable efficacy. Nevertheless, certain limitations merit acknowledgment.';
      const tone = analyzer.detectTone(content);

      expect(tone).toBe('formal');
    });

    it('should detect conversational tone', () => {
      const content = "Look, here's the thing - it's pretty simple. Just don't overthink it, really.";
      const tone = analyzer.detectTone(content);

      expect(tone).toBe('conversational');
    });

    it('should detect enthusiastic tone', () => {
      const content = 'This is amazing! The results are fantastic! Absolutely brilliant work!';
      const tone = analyzer.detectTone(content);

      expect(tone).toBe('enthusiastic');
    });

    it('should detect matter-of-fact tone', () => {
      const content = 'The system works. Performance is acceptable. Results meet requirements.';
      const tone = analyzer.detectTone(content);

      expect(tone).toBe('matter-of-fact');
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

    it('should calculate Levenshtein distance', () => {
      const distance = analyzer['levenshteinDistance']('kitten', 'sitting');

      expect(distance).toBe(3);
    });

    it('should handle identical strings', () => {
      const distance = analyzer['levenshteinDistance']('test', 'test');

      expect(distance).toBe(0);
    });

    it('should handle empty strings', () => {
      const distance = analyzer['levenshteinDistance']('', 'test');

      expect(distance).toBe(4);
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
    it('should detect strong academic markers', () => {
      const content = 'Research (Smith, 2023) furthermore demonstrates that approaches may suggest benefits.';
      const profile = analyzer.analyzeVoice(content);

      const academicMarkers = profile.markers.filter(m => m.type === 'academic');
      expect(academicMarkers.length).toBeGreaterThan(0);
    });

    it('should detect strong technical markers', () => {
      const content = 'System latency reduced by 40ms with 30% throughput improvement via payload optimization.';
      const profile = analyzer.analyzeVoice(content);

      const technicalMarkers = profile.markers.filter(m => m.type === 'technical');
      expect(technicalMarkers.length).toBeGreaterThan(0);
    });

    it('should detect strong executive markers', () => {
      const content = '$500K annual savings with 30% ROI improvement. Strategic priority for Q3.';
      const profile = analyzer.analyzeVoice(content);

      const executiveMarkers = profile.markers.filter(m => m.type === 'executive');
      expect(executiveMarkers.length).toBeGreaterThan(0);
    });

    it('should detect strong casual markers', () => {
      const content = "Here's the thing - it's really great! Don't worry, I've got this.";
      const profile = analyzer.analyzeVoice(content);

      const casualMarkers = profile.markers.filter(m => m.type === 'casual');
      expect(casualMarkers.length).toBeGreaterThan(0);
    });

    it('should track marker positions', () => {
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
    it('should detect bullet point addition', () => {
      const original = 'First point. Second point.';
      const variation = '- First point\n- Second point';
      const result = analyzer.compareVariations(original, variation);

      expect(result.structuralChanges).toContain('Converted to bullet point format');
    });

    it('should detect bullet point removal', () => {
      const original = '- First point\n- Second point';
      const variation = 'First point. Second point.';
      const result = analyzer.compareVariations(original, variation);

      expect(result.structuralChanges).toContain('Converted from bullet points to narrative');
    });

    it('should detect heading addition', () => {
      const original = 'Plain content here.';
      const variation = '## Heading\n\nPlain content here.';
      const result = analyzer.compareVariations(original, variation);

      expect(result.structuralChanges).toContain('Added section headings');
    });

    it('should detect Q&A format conversion', () => {
      const original = 'Statement about topic.';
      const variation = 'Q: What about topic?\n\nA: Statement about topic.\n\nQ: More questions?\n\nA: More answers.';
      const result = analyzer.compareVariations(original, variation);

      expect(result.structuralChanges).toContain('Converted to Q&A format');
    });

    it('should detect code example addition', () => {
      const original = 'Text content.';
      const variation = 'Text content.\n\n```typescript\nconst x = 10;\n```';
      const result = analyzer.compareVariations(original, variation);

      expect(result.structuralChanges).toContain('Added code examples');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const profile = analyzer.analyzeVoice('');

      expect(profile.primaryVoice).toBeTruthy();
      expect(profile.metadata.wordCount).toBe(0);
    });

    it('should handle very short content', () => {
      const profile = analyzer.analyzeVoice('OK.');

      expect(profile).toBeTruthy();
      expect(profile.metadata.wordCount).toBe(1);
    });

    it('should handle very long content', () => {
      const longContent = 'This is a long sentence. '.repeat(1000);
      const profile = analyzer.analyzeVoice(longContent);

      expect(profile.metadata.sentenceCount).toBe(1000);
    });

    it('should handle content with no punctuation', () => {
      const content = 'content without any punctuation marks at all';
      const profile = analyzer.analyzeVoice(content);

      expect(profile).toBeTruthy();
    });

    it('should handle content with special characters', () => {
      const content = 'Test with $pecial @nd #unusual characters!';
      const profile = analyzer.analyzeVoice(content);

      expect(profile.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should handle multiple consecutive spaces', () => {
      const content = 'Words    with    extra     spaces.';
      const profile = analyzer.analyzeVoice(content);

      expect(profile.metadata.wordCount).toBe(4);
    });

    it('should handle unicode characters', () => {
      const content = 'Content with émojis 🚀 and special chars ñ ü.';
      const profile = analyzer.analyzeVoice(content);

      expect(profile).toBeTruthy();
    });

    it('should handle newlines and formatting', () => {
      const content = 'Line one.\n\nLine two.\n\nLine three.';
      const profile = analyzer.analyzeVoice(content);

      expect(profile.metadata.sentenceCount).toBe(3);
    });
  });
});
