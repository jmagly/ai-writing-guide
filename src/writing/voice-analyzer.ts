/**
 * Voice Analyzer
 *
 * Analyzes content voice characteristics, detects voice type,
 * and scores diversity between variations.
 */

import { Voice, Perspective, Tone } from './content-diversifier.js';

export interface VoiceProfile {
  primaryVoice: Voice | 'mixed';
  confidence: number; // 0-100
  characteristics: {
    academic: number;
    technical: number;
    executive: number;
    casual: number;
  };
  markers: VoiceMarker[];
  perspective: Perspective;
  tone: Tone;
  metadata: {
    wordCount: number;
    sentenceCount: number;
    averageSentenceLength: number;
  };
}

export interface VoiceMarker {
  type: Voice;
  text: string;
  position: number;
  strength: 'strong' | 'moderate' | 'weak';
}

export interface ComparisonResult {
  similarity: number; // 0-100 (0 = completely different, 100 = identical)
  differences: Difference[];
  voiceShift: {
    from: Voice | 'mixed';
    to: Voice | 'mixed';
    magnitude: number; // 0-100
  };
  structuralChanges: string[];
}

export interface Difference {
  type: 'addition' | 'removal' | 'modification';
  description: string;
  impact: 'high' | 'medium' | 'low';
}

/**
 * Voice Analyzer for content characteristics
 */
export class VoiceAnalyzer {
  private readonly voicePatterns: Map<Voice, VoicePattern>;

  constructor() {
    this.voicePatterns = this.initializeVoicePatterns();
  }

  /**
   * Analyze voice characteristics of content
   */
  analyzeVoice(content: string): VoiceProfile {
    const scores = this.scoreVoices(content);
    const markers = this.detectMarkers(content);
    const perspective = this.detectPerspective(content);
    const tone = this.detectTone(content);

    const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const primaryVoice = sortedScores[0][1] > sortedScores[1][1] * 1.5
      ? (sortedScores[0][0] as Voice)
      : 'mixed';

    const confidence = primaryVoice === 'mixed'
      ? 50
      : Math.round((sortedScores[0][1] / (sortedScores[0][1] + sortedScores[1][1])) * 100);

    const wordCount = this.countWords(content);
    const sentenceCount = this.countSentences(content);

    return {
      primaryVoice,
      confidence,
      characteristics: {
        academic: scores.academic,
        technical: scores.technical,
        executive: scores.executive,
        casual: scores.casual,
      },
      markers,
      perspective,
      tone,
      metadata: {
        wordCount,
        sentenceCount,
        averageSentenceLength: sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0,
      },
    };
  }

  /**
   * Detect primary voice of content
   */
  detectVoice(content: string): Voice | 'mixed' {
    const profile = this.analyzeVoice(content);
    return profile.primaryVoice;
  }

  /**
   * Score diversity between multiple variations
   */
  scoreDiversity(variations: string[]): number {
    if (variations.length < 2) {
      return 0;
    }

    let totalDiversity = 0;
    let comparisons = 0;

    // Compare each pair of variations
    for (let i = 0; i < variations.length; i++) {
      for (let j = i + 1; j < variations.length; j++) {
        const comparison = this.compareVariations(variations[i], variations[j]);
        totalDiversity += (100 - comparison.similarity);
        comparisons++;
      }
    }

    return Math.round(totalDiversity / comparisons);
  }

  /**
   * Compare two variations and identify differences
   */
  compareVariations(original: string, variation: string): ComparisonResult {
    const originalProfile = this.analyzeVoice(original);
    const variationProfile = this.analyzeVoice(variation);

    const similarity = this.calculateSimilarity(original, variation);
    const differences = this.identifyDifferences(original, variation, originalProfile, variationProfile);
    const structuralChanges = this.detectStructuralChanges(original, variation);

    const voiceDiff = Math.abs(
      originalProfile.characteristics[originalProfile.primaryVoice === 'mixed' ? 'casual' : originalProfile.primaryVoice] -
      variationProfile.characteristics[variationProfile.primaryVoice === 'mixed' ? 'casual' : variationProfile.primaryVoice]
    );

    return {
      similarity,
      differences,
      voiceShift: {
        from: originalProfile.primaryVoice,
        to: variationProfile.primaryVoice,
        magnitude: Math.round(voiceDiff),
      },
      structuralChanges,
    };
  }

  /**
   * Detect perspective used in content
   */
  detectPerspective(content: string): Perspective {
    const firstPersonCount = (content.match(/\b(I|me|my|we|us|our)\b/gi) || []).length;
    const thirdPersonCount = (content.match(/\b(he|she|they|their|one)\b/gi) || []).length;
    const impersonalCount = (content.match(/\b(the system|the approach|users|developers)\b/gi) || []).length;

    if (firstPersonCount > thirdPersonCount && firstPersonCount > impersonalCount) {
      return 'first-person';
    }

    if (thirdPersonCount > firstPersonCount && thirdPersonCount > impersonalCount) {
      return 'third-person';
    }

    return 'neutral';
  }

  /**
   * Detect tone of content
   */
  detectTone(content: string): Tone {
    const formalMarkers = (content.match(/\b(furthermore|moreover|nevertheless|consequently)\b/gi) || []).length;
    const casualMarkers = (content.match(/\b(just|really|pretty|basically)\b/gi) || []).length;
    const enthusiasticMarkers = (content.match(/!/g) || []).length +
      (content.match(/\b(amazing|fantastic|excellent|brilliant)\b/gi) || []).length;
    const contractions = (content.match(/\b(don't|can't|won't|it's|that's)\b/gi) || []).length;

    if (enthusiasticMarkers > 3) {
      return 'enthusiastic';
    }

    if (contractions > formalMarkers && casualMarkers > 0) {
      return 'conversational';
    }

    if (formalMarkers > casualMarkers && contractions === 0) {
      return 'formal';
    }

    return 'matter-of-fact';
  }

  /**
   * Analyze voice consistency across content sections
   */
  analyzeConsistency(content: string, sectionSize: number = 200): {
    overallConsistency: number;
    sectionProfiles: VoiceProfile[];
    inconsistencies: string[];
  } {
    const sections = this.splitIntoSections(content, sectionSize);
    const sectionProfiles = sections.map(section => this.analyzeVoice(section));

    if (sectionProfiles.length < 2) {
      return {
        overallConsistency: 100,
        sectionProfiles,
        inconsistencies: [],
      };
    }

    // Check voice consistency
    const primaryVoices = sectionProfiles.map(p => p.primaryVoice);
    const dominantVoice = this.findMostCommon(primaryVoices);
    const consistentSections = primaryVoices.filter(v => v === dominantVoice).length;
    const consistency = Math.round((consistentSections / primaryVoices.length) * 100);

    // Identify inconsistencies
    const inconsistencies: string[] = [];
    for (let i = 0; i < sectionProfiles.length; i++) {
      if (sectionProfiles[i].primaryVoice !== dominantVoice) {
        inconsistencies.push(
          `Section ${i + 1}: ${sectionProfiles[i].primaryVoice} (expected ${dominantVoice})`
        );
      }
    }

    return {
      overallConsistency: consistency,
      sectionProfiles,
      inconsistencies,
    };
  }

  // Private helper methods

  private initializeVoicePatterns(): Map<Voice, VoicePattern> {
    const patterns = new Map<Voice, VoicePattern>();

    patterns.set('academic', {
      strongMarkers: [
        /\([\w\s,&]+,\s*\d{4}\)/,  // Citations
        /\b(furthermore|moreover|nevertheless|consequently)\b/i,
        /\b(suggests? that|appears? to|may indicate)\b/i,
        /\b(research|study|analysis|empirical)\b/i,
      ],
      moderateMarkers: [
        /\b(however|although|while)\b/i,
        /\b(demonstrate|illustrate|indicate)\b/i,
        /\b(approach|methodology|framework)\b/i,
      ],
      weakMarkers: [
        /\b(consider|examine|explore)\b/i,
      ],
    });

    patterns.set('technical', {
      strongMarkers: [
        /\d+(\.\d+)?\s*(ms|MB|GB|KB|%|seconds)/,  // Metrics
        /\b(latency|throughput|payload|optimization)\b/i,
        /\b(implementation|configuration|deployment)\b/i,
        /```[\s\S]*?```/,  // Code blocks
      ],
      moderateMarkers: [
        /\b(system|architecture|performance|scalability)\b/i,
        /\b(API|HTTP|TCP|SQL|REST)\b/,
        /\b(cache|buffer|queue|pool)\b/i,
      ],
      weakMarkers: [
        /\b(code|function|method|class)\b/i,
      ],
    });

    patterns.set('executive', {
      strongMarkers: [
        /\$[\d,]+[KMB]?/,  // Dollar amounts
        /\d+%\s*(increase|decrease|improvement|growth|reduction)/i,
        /\b(ROI|revenue|cost savings|profit)\b/i,
        /\b(strategic|leverage|maximize|optimize)\b/i,
      ],
      moderateMarkers: [
        /\b(recommend|priority|decision|initiative)\b/i,
        /\b(stakeholder|business impact|value proposition)\b/i,
        /\bQ[1-4]\b/,  // Quarters
      ],
      weakMarkers: [
        /\b(advantage|benefit|opportunity|risk)\b/i,
      ],
    });

    patterns.set('casual', {
      strongMarkers: [
        /\b(don't|can't|won't|it's|that's|we're|you're)\b/,  // Contractions
        /\b(here's the thing|look|basically|pretty much)\b/i,
        /\b(like|you know|I mean)\b/i,
      ],
      moderateMarkers: [
        /\b(just|really|very|pretty|quite)\b/i,
        /\b(cool|nice|great|awesome)\b/i,
        /[.!?]\s+([A-Z])/,  // Sentence fragments
      ],
      weakMarkers: [
        /\b(thing|stuff|kind of|sort of)\b/i,
      ],
    });

    return patterns;
  }

  private scoreVoices(content: string): Record<Voice, number> {
    const scores: Record<Voice, number> = {
      academic: 0,
      technical: 0,
      executive: 0,
      casual: 0,
    };

    for (const [voice, patterns] of this.voicePatterns.entries()) {
      // Strong markers worth 3 points
      for (const pattern of patterns.strongMarkers) {
        const matches = content.match(new RegExp(pattern, 'g'));
        if (matches) {
          scores[voice] += matches.length * 3;
        }
      }

      // Moderate markers worth 2 points
      for (const pattern of patterns.moderateMarkers) {
        const matches = content.match(new RegExp(pattern, 'g'));
        if (matches) {
          scores[voice] += matches.length * 2;
        }
      }

      // Weak markers worth 1 point
      for (const pattern of patterns.weakMarkers) {
        const matches = content.match(new RegExp(pattern, 'g'));
        if (matches) {
          scores[voice] += matches.length;
        }
      }
    }

    return scores;
  }

  private detectMarkers(content: string): VoiceMarker[] {
    const markers: VoiceMarker[] = [];

    for (const [voice, patterns] of this.voicePatterns.entries()) {
      // Strong markers
      for (const pattern of patterns.strongMarkers) {
        const regex = new RegExp(pattern, 'gi');
        let match;
        while ((match = regex.exec(content)) !== null) {
          markers.push({
            type: voice,
            text: match[0],
            position: match.index,
            strength: 'strong',
          });
        }
      }

      // Moderate markers (sample first 3)
      for (const pattern of patterns.moderateMarkers.slice(0, 3)) {
        const regex = new RegExp(pattern, 'gi');
        let match;
        while ((match = regex.exec(content)) !== null) {
          markers.push({
            type: voice,
            text: match[0],
            position: match.index,
            strength: 'moderate',
          });
        }
      }
    }

    return markers.sort((a, b) => a.position - b.position);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Use Levenshtein distance
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return Math.round((1 - distance / maxLength) * 100);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private identifyDifferences(
    original: string,
    variation: string,
    originalProfile: VoiceProfile,
    variationProfile: VoiceProfile
  ): Difference[] {
    const differences: Difference[] = [];

    // Voice change
    if (originalProfile.primaryVoice !== variationProfile.primaryVoice) {
      differences.push({
        type: 'modification',
        description: `Voice changed from ${originalProfile.primaryVoice} to ${variationProfile.primaryVoice}`,
        impact: 'high',
      });
    }

    // Perspective change
    if (originalProfile.perspective !== variationProfile.perspective) {
      differences.push({
        type: 'modification',
        description: `Perspective shifted from ${originalProfile.perspective} to ${variationProfile.perspective}`,
        impact: 'medium',
      });
    }

    // Tone change
    if (originalProfile.tone !== variationProfile.tone) {
      differences.push({
        type: 'modification',
        description: `Tone adjusted from ${originalProfile.tone} to ${variationProfile.tone}`,
        impact: 'medium',
      });
    }

    // Length change
    const lengthDiff = Math.abs(original.length - variation.length);
    if (lengthDiff > original.length * 0.2) {
      differences.push({
        type: original.length > variation.length ? 'removal' : 'addition',
        description: `Content length ${original.length > variation.length ? 'reduced' : 'expanded'} by ${Math.round((lengthDiff / original.length) * 100)}%`,
        impact: 'medium',
      });
    }

    // Sentence structure change
    const originalSentences = this.countSentences(original);
    const variationSentences = this.countSentences(variation);
    if (Math.abs(originalSentences - variationSentences) > 2) {
      differences.push({
        type: 'modification',
        description: `Sentence count changed from ${originalSentences} to ${variationSentences}`,
        impact: 'low',
      });
    }

    return differences;
  }

  private detectStructuralChanges(original: string, variation: string): string[] {
    const changes: string[] = [];

    const originalBullets = (original.match(/^[-*]\s/gm) || []).length;
    const variationBullets = (variation.match(/^[-*]\s/gm) || []).length;

    if (originalBullets === 0 && variationBullets > 0) {
      changes.push('Converted to bullet point format');
    } else if (originalBullets > 0 && variationBullets === 0) {
      changes.push('Converted from bullet points to narrative');
    }

    const originalHeadings = (original.match(/^#{1,6}\s/gm) || []).length;
    const variationHeadings = (variation.match(/^#{1,6}\s/gm) || []).length;

    if (variationHeadings > originalHeadings) {
      changes.push('Added section headings');
    }

    const originalQuestions = (original.match(/\?/g) || []).length;
    const variationQuestions = (variation.match(/\?/g) || []).length;

    if (variationQuestions > originalQuestions * 2) {
      changes.push('Converted to Q&A format');
    }

    const originalCode = (original.match(/```/g) || []).length;
    const variationCode = (variation.match(/```/g) || []).length;

    if (variationCode > originalCode) {
      changes.push('Added code examples');
    }

    return changes;
  }

  private countWords(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  private countSentences(content: string): number {
    return content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }

  private splitIntoSections(content: string, sectionSize: number): string[] {
    const words = content.split(/\s+/);
    const sections: string[] = [];

    for (let i = 0; i < words.length; i += sectionSize) {
      sections.push(words.slice(i, i + sectionSize).join(' '));
    }

    return sections;
  }

  private findMostCommon<T>(items: T[]): T {
    const counts = new Map<T, number>();

    for (const item of items) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommon = items[0];

    for (const [item, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }

    return mostCommon;
  }
}

interface VoicePattern {
  strongMarkers: RegExp[];
  moderateMarkers: RegExp[];
  weakMarkers: RegExp[];
}
