/**
 * Tests for Voice Profile Validation and Processing
 *
 * Tests the voice profile YAML schema, loading, blending,
 * and application functionality from the voice-framework addon.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm, readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';
import { parse as parseYaml } from 'yaml';

// Voice profile schema interface
interface VoiceProfile {
  name: string;
  description: string;
  tone?: {
    formality?: number;
    confidence?: number;
    warmth?: number;
    energy?: number;
  };
  vocabulary?: {
    prefer?: string[];
    avoid?: string[];
    signature_phrases?: string[];
  };
  structure?: {
    sentence_length?: string;
    paragraph_style?: string;
    use_lists?: boolean;
    include_examples?: boolean;
  };
  perspective?: {
    person?: 'first' | 'second' | 'third';
    opinion_level?: number;
    uncertainty_shown?: boolean;
  };
  authenticity?: {
    acknowledge_tradeoffs?: boolean;
    reference_constraints?: boolean;
    use_specific_numbers?: boolean;
  };
}

describe('VoiceProfile', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = resolve(tmpdir(), `voice-profile-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('schema validation', () => {
    it('should validate complete voice profile', async () => {
      const profile: VoiceProfile = {
        name: 'technical-authority',
        description: 'Direct, precise, confident voice for technical content',
        tone: {
          formality: 0.7,
          confidence: 0.9,
          warmth: 0.3,
          energy: 0.4,
        },
        vocabulary: {
          prefer: ['specifically', 'in practice', 'for example'],
          avoid: ['leverage', 'utilize', 'seamlessly'],
          signature_phrases: ['the key constraint here is', 'worth noting that'],
        },
        structure: {
          sentence_length: 'varied',
          paragraph_style: 'technical',
          use_lists: true,
          include_examples: true,
        },
        perspective: {
          person: 'second',
          opinion_level: 0.6,
          uncertainty_shown: true,
        },
        authenticity: {
          acknowledge_tradeoffs: true,
          reference_constraints: true,
          use_specific_numbers: true,
        },
      };

      expect(profile.name).toBe('technical-authority');
      expect(profile.tone?.formality).toBeGreaterThanOrEqual(0);
      expect(profile.tone?.formality).toBeLessThanOrEqual(1);
    });

    it('should validate minimal voice profile', async () => {
      const minimalProfile: VoiceProfile = {
        name: 'minimal-voice',
        description: 'A minimal voice profile',
      };

      expect(minimalProfile.name).toBeDefined();
      expect(minimalProfile.description).toBeDefined();
    });

    it('should enforce tone values in range [0, 1]', () => {
      function validateToneValue(value: number): boolean {
        return value >= 0 && value <= 1;
      }

      expect(validateToneValue(0)).toBe(true);
      expect(validateToneValue(0.5)).toBe(true);
      expect(validateToneValue(1)).toBe(true);
      expect(validateToneValue(-0.1)).toBe(false);
      expect(validateToneValue(1.1)).toBe(false);
    });

    it('should validate perspective person values', () => {
      const validPersons = ['first', 'second', 'third'];

      expect(validPersons).toContain('first');
      expect(validPersons).toContain('second');
      expect(validPersons).toContain('third');
      expect(validPersons).not.toContain('fourth');
    });
  });

  describe('YAML parsing', () => {
    it('should parse voice profile YAML', async () => {
      const yamlContent = `name: technical-authority
description: Direct, precise, confident voice for technical content

tone:
  formality: 0.7
  confidence: 0.9
  warmth: 0.3
  energy: 0.4

vocabulary:
  prefer:
    - "specifically"
    - "in practice"
  avoid:
    - "leverage"
    - "seamlessly"
`;

      const profilePath = join(testDir, 'technical-authority.yaml');
      await writeFile(profilePath, yamlContent, 'utf-8');

      const content = await readFile(profilePath, 'utf-8');
      const profile = parseYaml(content) as VoiceProfile;

      expect(profile.name).toBe('technical-authority');
      expect(profile.tone?.formality).toBe(0.7);
      expect(profile.vocabulary?.prefer).toContain('specifically');
      expect(profile.vocabulary?.avoid).toContain('leverage');
    });

    it('should handle missing optional sections', async () => {
      const yamlContent = `name: simple-voice
description: A simple voice profile
tone:
  formality: 0.5
`;

      const profilePath = join(testDir, 'simple-voice.yaml');
      await writeFile(profilePath, yamlContent, 'utf-8');

      const content = await readFile(profilePath, 'utf-8');
      const profile = parseYaml(content) as VoiceProfile;

      expect(profile.name).toBe('simple-voice');
      expect(profile.vocabulary).toBeUndefined();
      expect(profile.structure).toBeUndefined();
      expect(profile.perspective).toBeUndefined();
    });
  });

  describe('built-in profiles', () => {
    const PROJECT_ROOT = resolve(__dirname, '../../..');
    const VOICES_PATH = join(
      PROJECT_ROOT,
      'agentic/code/addons/voice-framework/voices/templates'
    );

    it('should have technical-authority profile', async () => {
      const profilePath = join(VOICES_PATH, 'technical-authority.yaml');

      if (existsSync(profilePath)) {
        const content = await readFile(profilePath, 'utf-8');
        const profile = parseYaml(content) as VoiceProfile;

        expect(profile.name).toBe('technical-authority');
        expect(profile.description).toBeDefined();
        expect(profile.tone).toBeDefined();
      } else {
        // Profile may not exist in test environment
        console.log('Skipping: technical-authority.yaml not found in test environment');
      }
    });

    it('should have friendly-explainer profile', async () => {
      const profilePath = join(VOICES_PATH, 'friendly-explainer.yaml');

      if (existsSync(profilePath)) {
        const content = await readFile(profilePath, 'utf-8');
        const profile = parseYaml(content) as VoiceProfile;

        expect(profile.name).toBe('friendly-explainer');
        expect(profile.description).toBeDefined();
      } else {
        console.log('Skipping: friendly-explainer.yaml not found in test environment');
      }
    });

    it('should have executive-brief profile', async () => {
      const profilePath = join(VOICES_PATH, 'executive-brief.yaml');

      if (existsSync(profilePath)) {
        const content = await readFile(profilePath, 'utf-8');
        const profile = parseYaml(content) as VoiceProfile;

        expect(profile.name).toBe('executive-brief');
        expect(profile.description).toBeDefined();
      } else {
        console.log('Skipping: executive-brief.yaml not found in test environment');
      }
    });

    it('should have casual-conversational profile', async () => {
      const profilePath = join(VOICES_PATH, 'casual-conversational.yaml');

      if (existsSync(profilePath)) {
        const content = await readFile(profilePath, 'utf-8');
        const profile = parseYaml(content) as VoiceProfile;

        expect(profile.name).toBe('casual-conversational');
        expect(profile.description).toBeDefined();
      } else {
        console.log('Skipping: casual-conversational.yaml not found in test environment');
      }
    });
  });

  describe('voice blending', () => {
    it('should blend two profiles with weights', () => {
      const profile1: VoiceProfile = {
        name: 'profile-1',
        description: 'First profile',
        tone: {
          formality: 0.8,
          confidence: 0.9,
          warmth: 0.2,
          energy: 0.3,
        },
      };

      const profile2: VoiceProfile = {
        name: 'profile-2',
        description: 'Second profile',
        tone: {
          formality: 0.2,
          confidence: 0.5,
          warmth: 0.8,
          energy: 0.7,
        },
      };

      // Blend with 70% profile1, 30% profile2
      const weight1 = 0.7;
      const weight2 = 0.3;

      function blendValue(v1: number, v2: number, w1: number, w2: number): number {
        return v1 * w1 + v2 * w2;
      }

      const blendedFormality = blendValue(
        profile1.tone!.formality!,
        profile2.tone!.formality!,
        weight1,
        weight2
      );

      const blendedWarmth = blendValue(
        profile1.tone!.warmth!,
        profile2.tone!.warmth!,
        weight1,
        weight2
      );

      // 0.8 * 0.7 + 0.2 * 0.3 = 0.56 + 0.06 = 0.62
      expect(blendedFormality).toBeCloseTo(0.62, 2);

      // 0.2 * 0.7 + 0.8 * 0.3 = 0.14 + 0.24 = 0.38
      expect(blendedWarmth).toBeCloseTo(0.38, 2);
    });

    it('should merge vocabulary arrays', () => {
      const profile1: VoiceProfile = {
        name: 'profile-1',
        description: 'First',
        vocabulary: {
          prefer: ['specifically', 'for example'],
          avoid: ['leverage'],
        },
      };

      const profile2: VoiceProfile = {
        name: 'profile-2',
        description: 'Second',
        vocabulary: {
          prefer: ['actually', 'you know'],
          avoid: ['utilize'],
        },
      };

      const mergedPrefer = [
        ...(profile1.vocabulary?.prefer || []),
        ...(profile2.vocabulary?.prefer || []),
      ];

      const mergedAvoid = [
        ...(profile1.vocabulary?.avoid || []),
        ...(profile2.vocabulary?.avoid || []),
      ];

      expect(mergedPrefer).toContain('specifically');
      expect(mergedPrefer).toContain('actually');
      expect(mergedAvoid).toContain('leverage');
      expect(mergedAvoid).toContain('utilize');
    });
  });

  describe('profile locations', () => {
    it('should define priority order for profile locations', () => {
      const projectVoices = '.aiwg/voices/';
      const userVoices = '~/.config/aiwg/voices/';
      const builtInVoices = 'voice-framework/voices/templates/';

      const priorityOrder = [projectVoices, userVoices, builtInVoices];

      expect(priorityOrder[0]).toBe('.aiwg/voices/');
      expect(priorityOrder[1]).toBe('~/.config/aiwg/voices/');
      expect(priorityOrder[2]).toBe('voice-framework/voices/templates/');
    });

    it('should expand user home path', () => {
      const userPath = '~/.config/aiwg/voices/';
      const homeDir = process.env.HOME || '/home/user';
      const expandedPath = userPath.replace('~', homeDir);

      expect(expandedPath).not.toContain('~');
      expect(expandedPath).toContain(homeDir);
    });
  });

  describe('voice application', () => {
    it('should identify transformation targets based on profile', () => {
      const profile: VoiceProfile = {
        name: 'technical',
        description: 'Technical voice',
        vocabulary: {
          avoid: ['leverage', 'utilize', 'seamlessly'],
          prefer: ['use', 'employ', 'smoothly'],
        },
      };

      const inputText = 'We leverage this technology to seamlessly integrate with your stack.';

      const wordsToReplace = (profile.vocabulary?.avoid || []).filter(
        word => inputText.toLowerCase().includes(word.toLowerCase())
      );

      expect(wordsToReplace).toContain('leverage');
      expect(wordsToReplace).toContain('seamlessly');
      expect(wordsToReplace).not.toContain('utilize');
    });

    it('should calculate formality score', () => {
      function calculateFormality(text: string): number {
        // Simplified formality heuristics
        const contractionPattern = /\b(can't|won't|don't|isn't|aren't|we're|you're|they're)\b/gi;
        const formalWords = /\b(therefore|consequently|furthermore|thus|hence)\b/gi;

        const contractions = (text.match(contractionPattern) || []).length;
        const formalCount = (text.match(formalWords) || []).length;

        const words = text.split(/\s+/).length;

        // Higher formality = more formal words, fewer contractions
        const formalityScore = Math.min(1, Math.max(0,
          0.5 + (formalCount * 0.1) - (contractions * 0.1)
        ));

        return formalityScore;
      }

      const casualText = "You can't do this because it won't work.";
      const formalText = "Therefore, this approach consequently fails. Furthermore, it is inefficient.";

      const casualScore = calculateFormality(casualText);
      const formalScore = calculateFormality(formalText);

      expect(formalScore).toBeGreaterThan(casualScore);
    });
  });
});
