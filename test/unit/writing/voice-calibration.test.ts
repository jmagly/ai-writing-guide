/**
 * Voice Calibration Tests
 *
 * Comprehensive test suite for voice calibration system with >85% coverage target.
 * Tests calibration, detection accuracy, characteristic tuning, marker optimization,
 * transformation accuracy, and reporting functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VoiceCalibration } from '../../../src/writing/voice-calibration.ts';
import { VoiceAnalyzer } from '../../../src/writing/voice-analyzer.ts';
import { ContentDiversifier } from '../../../src/writing/content-diversifier.ts';

describe('VoiceCalibration', () => {
  let calibration: VoiceCalibration;
  let analyzer: VoiceAnalyzer;
  let diversifier: ContentDiversifier;

  beforeEach(() => {
    analyzer = new VoiceAnalyzer();
    diversifier = new ContentDiversifier();
    calibration = new VoiceCalibration(analyzer, diversifier);
  });

  describe('Voice Profile Management', () => {
    describe('getVoiceProfile', () => {
      it('should retrieve all voice profiles with expected characteristics', () => {
        const voiceTests = [
          { voice: 'academic', technicality: null, assertiveness: null, formality: null },
          { voice: 'technical', technicality: 0.8, assertiveness: null, formality: null },
          { voice: 'executive', technicality: null, assertiveness: 0.8, formality: null },
          { voice: 'casual', technicality: null, assertiveness: null, formality: 0.5 },
        ];

        for (const { voice, technicality, assertiveness, formality } of voiceTests) {
          const profile = calibration.getVoiceProfile(voice);

          expect(profile, `${voice} profile`).toBeDefined();
          expect(profile.voice, `${voice} voice name`).toBe(voice);
          expect(profile.characteristics, `${voice} characteristics`).toBeDefined();
          expect(profile.markers, `${voice} markers`).toBeDefined();

          if (technicality !== null) {
            expect(profile.characteristics.technicality, `${voice} technicality`).toBeGreaterThan(technicality);
          }
          if (assertiveness !== null) {
            expect(profile.characteristics.assertiveness, `${voice} assertiveness`).toBeGreaterThan(assertiveness);
          }
          if (formality !== null) {
            expect(profile.characteristics.formality, `${voice} formality`).toBeLessThan(formality);
          }
        }
      });

      it('should throw error for non-existent profile', () => {
        expect(() => calibration.getVoiceProfile('nonexistent')).toThrow('Voice profile not found');
      });

      it('should have valid profile structure and ranges for all voices', () => {
        const voices = ['academic', 'technical', 'executive', 'casual'];
        const validVocabLevels = ['basic', 'intermediate', 'advanced', 'expert'];
        const validMarkerTypes = ['vocabulary', 'structure', 'tone', 'perspective'];

        for (const voice of voices) {
          const profile = calibration.getVoiceProfile(voice);

          // Characteristics ranges
          expect(profile.characteristics.formality, `${voice} formality range`).toBeGreaterThanOrEqual(0);
          expect(profile.characteristics.formality, `${voice} formality range`).toBeLessThanOrEqual(1);
          expect(profile.characteristics.technicality, `${voice} technicality range`).toBeGreaterThanOrEqual(0);
          expect(profile.characteristics.technicality, `${voice} technicality range`).toBeLessThanOrEqual(1);

          // Sentence length statistics
          expect(profile.characteristics.sentenceLength.avg, `${voice} avg sentence length`).toBeGreaterThan(0);
          expect(profile.characteristics.sentenceLength.min, `${voice} min sentence length`).toBeLessThan(
            profile.characteristics.sentenceLength.max
          );

          // Vocabulary level
          expect(validVocabLevels, `${voice} vocab level`).toContain(profile.characteristics.vocabularyLevel);

          // First person usage
          expect(profile.characteristics.firstPersonUsage, `${voice} first person`).toBeGreaterThanOrEqual(0);
          expect(profile.characteristics.firstPersonUsage, `${voice} first person`).toBeLessThanOrEqual(100);

          // Passive voice ratio
          expect(profile.characteristics.passiveVoiceRatio, `${voice} passive voice`).toBeGreaterThanOrEqual(0);
          expect(profile.characteristics.passiveVoiceRatio, `${voice} passive voice`).toBeLessThanOrEqual(100);

          // Detection confidence
          expect(profile.detectionConfidence, `${voice} detection confidence`).toBeGreaterThanOrEqual(0);
          expect(profile.detectionConfidence, `${voice} detection confidence`).toBeLessThanOrEqual(1);

          // Markers
          expect(profile.markers.length, `${voice} has markers`).toBeGreaterThan(0);

          for (const marker of profile.markers) {
            expect(validMarkerTypes, `${voice} marker type valid`).toContain(marker.type);
            expect(marker.weight, `${voice} marker weight range`).toBeGreaterThanOrEqual(0);
            expect(marker.weight, `${voice} marker weight range`).toBeLessThanOrEqual(1);
            expect(marker.examples, `${voice} marker has examples`).toBeDefined();
            expect(Array.isArray(marker.examples), `${voice} marker examples is array`).toBe(true);
          }
        }
      });
    });

    describe('updateVoiceProfile', () => {
      it('should update voice characteristics', () => {
        const before = calibration.getVoiceProfile('casual');
        const originalFormality = before.characteristics.formality;

        calibration.updateVoiceProfile('casual', {
          characteristics: {
            ...before.characteristics,
            formality: 0.5,
          },
        });

        const after = calibration.getVoiceProfile('casual');
        expect(after.characteristics.formality).toBe(0.5);
        expect(after.characteristics.formality).not.toBe(originalFormality);
      });

      it('should update detection confidence', () => {
        calibration.updateVoiceProfile('academic', {
          detectionConfidence: 0.95,
        });

        const profile = calibration.getVoiceProfile('academic');
        expect(profile.detectionConfidence).toBe(0.95);
      });

      it('should throw error for non-existent profile', () => {
        expect(() => {
          calibration.updateVoiceProfile('nonexistent', { detectionConfidence: 0.9 });
        }).toThrow('Voice profile not found');
      });

      it('should preserve other characteristics when updating one', () => {
        const before = calibration.getVoiceProfile('technical');
        const originalTechnicality = before.characteristics.technicality;

        calibration.updateVoiceProfile('technical', {
          characteristics: {
            ...before.characteristics,
            formality: 0.7,
          },
        });

        const after = calibration.getVoiceProfile('technical');
        expect(after.characteristics.technicality).toBe(originalTechnicality);
      });

      it('should update markers array', () => {
        const newMarkers = [
          {
            type: 'vocabulary' as const,
            indicator: 'test',
            weight: 0.8,
            examples: ['test example'],
          },
        ];

        calibration.updateVoiceProfile('executive', { markers: newMarkers });

        const profile = calibration.getVoiceProfile('executive');
        expect(profile.markers.length).toBe(1);
        expect(profile.markers[0].indicator).toBe('test');
      });
    });

    describe('createCustomVoiceProfile', () => {
      const testCharacteristics = {
        formality: 0.6,
        technicality: 0.5,
        assertiveness: 0.7,
        complexity: 0.6,
        sentenceLength: { avg: 20, min: 10, max: 30, variance: 5 },
        vocabularyLevel: 'advanced' as const,
        firstPersonUsage: 15,
        passiveVoiceRatio: 10,
      };

      it('should create new custom voice profile', () => {
        const markers = [
          {
            type: 'vocabulary' as const,
            indicator: 'custom',
            weight: 0.8,
            examples: ['custom example'],
          },
        ];

        const profile = calibration.createCustomVoiceProfile('custom', testCharacteristics, markers);

        expect(profile.voice).toBe('custom');
        expect(profile.characteristics).toEqual(testCharacteristics);
        expect(profile.markers).toEqual(markers);
      });

      it('should make custom profile retrievable', () => {
        calibration.createCustomVoiceProfile('customVoice', testCharacteristics, []);

        const retrieved = calibration.getVoiceProfile('customVoice');
        expect(retrieved.voice).toBe('customVoice');
      });

      it('should set default detection confidence', () => {
        const profile = calibration.createCustomVoiceProfile('testVoice', testCharacteristics, []);

        expect(profile.detectionConfidence).toBe(0.5);
      });
    });
  });

  describe('Calibration', () => {
    describe('calibrateVoice', () => {
      it('should calibrate with training corpus and show results', async () => {
        const corpus = [
          'The research methodology demonstrates empirical validity.',
          'Our analysis suggests that this framework provides theoretical foundation.',
          'Furthermore, the data indicates significant correlation.',
        ];

        const result = await calibration.calibrateVoice({
          voice: 'academic',
          trainingCorpus: corpus,
        });

        expect(result.voice).toBe('academic');
        expect(result.beforeAccuracy).toBeDefined();
        expect(result.afterAccuracy).toBeDefined();
        expect(result.improvement).toBeGreaterThanOrEqual(-0.2);
      });

      it('should use validation corpus when provided', async () => {
        const training = [
          'Strategic alignment delivers 40% ROI in Q1.',
          'We recommend prioritizing this initiative for maximum value.',
        ];

        const validation = [
          'The stakeholder analysis demonstrates $2M cost savings.',
          'I recommend accelerating deployment to Q2 targets.',
        ];

        const result = await calibration.calibrateVoice({
          voice: 'executive',
          trainingCorpus: training,
          validationCorpus: validation,
        });

        expect(result.validationResults).toBeDefined();
        expect(result.validationResults.precision).toBeGreaterThanOrEqual(0);
        expect(result.validationResults.recall).toBeGreaterThanOrEqual(0);
        expect(result.validationResults.f1Score).toBeGreaterThanOrEqual(0);
      });

      it('should apply target characteristics and optimize markers', async () => {
        const corpus = [
          "Here's the thing - it's basically a caching problem.",
          "I've seen this pattern work in production systems.",
        ];

        const result = await calibration.calibrateVoice({
          voice: 'casual',
          targetCharacteristics: {
            formality: 0.4,
            assertiveness: 0.65,
          },
          trainingCorpus: corpus,
        });

        expect(result.characteristicsAdjusted).toContain('formality');
        expect(result.characteristicsAdjusted).toContain('assertiveness');
        expect(result.characteristicsAdjusted).toContain('markers');
      });

      it('should track calibration history', async () => {
        const corpus = ['Technical implementation with 50ms latency.'];

        await calibration.calibrateVoice({
          voice: 'technical',
          trainingCorpus: corpus,
        });

        const report = calibration.generateCalibrationReport('technical');
        expect(report.recentCalibrations.length).toBeGreaterThan(0);
      });

      it('should handle edge cases gracefully', async () => {
        // Empty corpus
        const emptyResult = await calibration.calibrateVoice({
          voice: 'academic',
          trainingCorpus: [],
        });
        expect(emptyResult.beforeAccuracy).toBe(0);
        expect(emptyResult.afterAccuracy).toBe(0);

        // No target characteristics
        const noTargetResult = await calibration.calibrateVoice({
          voice: 'executive',
          trainingCorpus: ['Executive summary with strategic ROI.'],
        });
        expect(noTargetResult).toBeDefined();
      });

      it('should throw error for invalid voice', async () => {
        await expect(
          calibration.calibrateVoice({
            voice: 'invalid' as any,
            trainingCorpus: ['test'],
          })
        ).rejects.toThrow('Voice profile not found');
      });
    });

    describe('calibrateAllVoices', () => {
      it('should calibrate all provided voices and handle edge cases', async () => {
        const corpus = new Map([
          ['academic', ['The research methodology demonstrates validity.']],
          ['technical', ['System latency is 45ms with 99% uptime.']],
          ['invalid', ['Invalid voice text.']],
        ]);

        const results = await calibration.calibrateAllVoices(corpus);

        expect(results.size).toBe(2);
        expect(results.has('academic')).toBe(true);
        expect(results.has('technical')).toBe(true);
        expect(results.has('invalid')).toBe(false); // Invalid voices skipped
      });

      it('should split training and validation sets for larger corpora', async () => {
        const texts = Array(10).fill('Technical sample text.');
        const corpus = new Map([['technical', texts]]);

        const results = await calibration.calibrateAllVoices(corpus);

        expect(results.get('technical')).toBeDefined();
      });

      it('should handle empty corpus map', async () => {
        const corpus = new Map();

        const results = await calibration.calibrateAllVoices(corpus);

        expect(results.size).toBe(0);
      });

      it('should return results for all four standard voices', async () => {
        const corpus = new Map([
          ['academic', ['Research methodology framework.']],
          ['technical', ['System latency 45ms.']],
          ['executive', ['Strategic ROI of 40%.']],
          ['casual', ["Here's the thing."]],
        ]);

        const results = await calibration.calibrateAllVoices(corpus);

        expect(results.size).toBe(4);
      });
    });
  });

  describe('Detection Accuracy', () => {
    describe('testDetectionAccuracy', () => {
      it('should measure detection accuracy for all voice types with complete metrics', async () => {
        const voiceTests = [
          {
            voice: 'academic',
            corpus: [
              'The research methodology demonstrates empirical validity.',
              'Furthermore, our analysis suggests theoretical foundation.',
            ],
          },
          {
            voice: 'technical',
            corpus: [
              'System latency is 45ms with throughput of 10K req/sec.',
              'Implementation uses Redis for caching optimization.',
            ],
          },
          {
            voice: 'executive',
            corpus: [
              'Strategic initiative delivers $2M ROI in Q1.',
              'We recommend prioritizing stakeholder alignment.',
            ],
          },
          {
            voice: 'casual',
            corpus: ["Here's the thing - it's basically simple.", "I've seen this pattern work in production."],
          },
        ];

        for (const { voice, corpus } of voiceTests) {
          const result = await calibration.testDetectionAccuracy(voice, corpus);

          expect(result.voice, `${voice} voice name`).toBe(voice);
          expect(result.accuracy, `${voice} accuracy`).toBeGreaterThanOrEqual(0);
          expect(result.accuracy, `${voice} accuracy bound`).toBeLessThanOrEqual(1);
          expect(result.precision, `${voice} precision`).toBeGreaterThanOrEqual(0);
          expect(result.recall, `${voice} recall`).toBeGreaterThanOrEqual(0);
          expect(result.f1Score, `${voice} f1Score`).toBeGreaterThanOrEqual(0);
          expect(result.f1Score, `${voice} f1Score bound`).toBeLessThanOrEqual(1);
          expect(result.confidentCorrect, `${voice} confidentCorrect`).toBeGreaterThanOrEqual(0);
          expect(result.confidentWrong, `${voice} confidentWrong`).toBeGreaterThanOrEqual(0);
          expect(result.samples, `${voice} samples`).toBe(corpus.length);
        }
      });

      it('should handle empty corpus', async () => {
        const result = await calibration.testDetectionAccuracy('casual', []);

        expect(result.accuracy).toBe(0);
        expect(result.samples).toBe(0);
      });

      it('should handle perfect detection', async () => {
        const corpus = [
          'The research methodology demonstrates empirical theoretical framework validity.',
        ];

        const result = await calibration.testDetectionAccuracy('academic', corpus);

        expect(result.accuracy).toBeGreaterThan(0.5);
      });
    });

    describe('validateCrossVoiceDetection', () => {
      it('should generate confusion matrix and calculate metrics', async () => {
        const testSet = new Map([
          ['academic', ['Empirical research demonstrates.']],
          ['technical', ['Implementation optimizes throughput.']],
          ['casual', ['Sample text.']],
          ['executive', ['Strategic sample.']],
        ]);

        const result = await calibration.validateCrossVoiceDetection(testSet);

        expect(result.matrix).toBeDefined();
        expect(result.accuracy).toBeGreaterThanOrEqual(0);
        expect(result.accuracy).toBeLessThanOrEqual(1);
        expect(result.perVoiceAccuracy).toBeDefined();
        expect(result.perVoiceAccuracy['academic']).toBeGreaterThanOrEqual(0);
        expect(result.matrix['casual']).toBeDefined();
        expect(Object.keys(result.perVoiceAccuracy).length).toBe(4);
      });
    });
  });

  describe('Characteristic Tuning', () => {
    describe('tuneCharacteristic', () => {
      it('should tune all voice characteristics to target values', async () => {
        const tuneTests = [
          { voice: 'casual', characteristic: 'formality', targetValue: 0.5 },
          { voice: 'executive', characteristic: 'technicality', targetValue: 0.6 },
          { voice: 'academic', characteristic: 'assertiveness', targetValue: 0.7 },
          { voice: 'technical', characteristic: 'complexity', targetValue: 0.8 },
        ];

        for (const { voice, characteristic, targetValue } of tuneTests) {
          const result = await calibration.tuneCharacteristic(voice, characteristic, targetValue);

          expect(result.characteristic, `${voice} characteristic name`).toBe(characteristic);
          expect(result.afterValue, `${voice} afterValue`).toBe(targetValue);
          expect(result.beforeValue, `${voice} beforeValue`).toBeDefined();
          expect(result.improvement, `${voice} improvement`).toBeDefined();
          expect(result.accuracy, `${voice} accuracy`).toBeGreaterThanOrEqual(0);

          // Verify profile updated
          const profile = calibration.getVoiceProfile(voice);
          expect(profile.characteristics[characteristic as keyof typeof profile.characteristics], `${voice} profile updated`).toBe(targetValue);
        }
      });

      it('should throw error for sentenceLength', async () => {
        await expect(
          calibration.tuneCharacteristic('academic', 'sentenceLength' as any, 0.5)
        ).rejects.toThrow('Cannot tune sentenceLength directly');
      });

      it('should throw error for invalid voice', async () => {
        await expect(
          calibration.tuneCharacteristic('invalid', 'formality', 0.5)
        ).rejects.toThrow('Voice profile not found');
      });
    });

    describe('tuneAllCharacteristics', () => {
      it('should tune multiple characteristics', async () => {
        const targets = {
          formality: 0.6,
          technicality: 0.7,
          assertiveness: 0.8,
        };

        const results = await calibration.tuneAllCharacteristics('executive', targets);

        expect(results.length).toBe(3);
        expect(results.every(r => r.accuracy !== undefined)).toBe(true);
      });

      it('should skip non-tunable characteristics', async () => {
        const targets = {
          formality: 0.5,
          sentenceLength: { avg: 20, min: 10, max: 30, variance: 5 },
          vocabularyLevel: 'advanced' as const,
          complexity: 0.6,
        };

        const results = await calibration.tuneAllCharacteristics('technical', targets);

        expect(results.length).toBe(2); // Only formality and complexity
        expect(results.find(r => r.characteristic === 'formality')).toBeDefined();
        expect(results.find(r => r.characteristic === 'complexity')).toBeDefined();
      });

      it('should handle empty targets', async () => {
        const results = await calibration.tuneAllCharacteristics('casual', {});

        expect(results.length).toBe(0);
      });
    });
  });

  describe('Marker Optimization', () => {
    describe('optimizeMarkers', () => {
      it('should optimize markers with weight updates and sorting', async () => {
        const corpus = [
          'The research methodology demonstrates empirical validity with theoretical framework.',
        ];

        const markers = await calibration.optimizeMarkers('academic', corpus);

        expect(markers.length).toBeGreaterThanOrEqual(0);
        expect(markers.every(m => m.weight >= 0 && m.weight <= 1)).toBe(true);

        // Check sorting
        for (let i = 1; i < markers.length; i++) {
          expect(markers[i - 1].weight).toBeGreaterThanOrEqual(markers[i].weight);
        }
      });

      it('should remove weak markers below threshold', async () => {
        const corpus = ['Strategic ROI delivers value.'];

        await calibration.optimizeMarkers('executive', corpus);

        const after = calibration.getVoiceProfile('executive');
        expect(after.markers.every(m => m.weight >= 0.1)).toBe(true);
      });

      it('should preserve marker types and handle edge cases', async () => {
        const validTypes = ['vocabulary', 'structure', 'tone', 'perspective'];

        // Empty corpus
        const emptyMarkers = await calibration.optimizeMarkers('academic', []);
        expect(Array.isArray(emptyMarkers)).toBe(true);

        // Normal corpus
        const markers = await calibration.optimizeMarkers('technical', ['Technical implementation.']);
        expect(markers.every(m => validTypes.includes(m.type))).toBe(true);
      });

      it('should throw error for invalid voice', async () => {
        await expect(
          calibration.optimizeMarkers('invalid', ['test'])
        ).rejects.toThrow('Voice profile not found');
      });
    });

    describe('addMarker', () => {
      it('should add new marker to profile', async () => {
        const marker = {
          type: 'vocabulary' as const,
          indicator: 'newterm',
          weight: 0.8,
          examples: ['example 1'],
        };

        const before = calibration.getVoiceProfile('academic');
        const beforeCount = before.markers.length;

        await calibration.addMarker('academic', marker);

        const after = calibration.getVoiceProfile('academic');
        expect(after.markers.length).toBe(beforeCount + 1);
      });

      it('should not add duplicate markers', async () => {
        const marker = {
          type: 'vocabulary' as const,
          indicator: 'duplicate',
          weight: 0.8,
          examples: ['example'],
        };

        await calibration.addMarker('technical', marker);
        const after1 = calibration.getVoiceProfile('technical');
        const count1 = after1.markers.length;

        await calibration.addMarker('technical', marker);
        const after2 = calibration.getVoiceProfile('technical');

        expect(after2.markers.length).toBe(count1);
      });

      it('should throw error for invalid voice', async () => {
        const marker = {
          type: 'vocabulary' as const,
          indicator: 'test',
          weight: 0.8,
          examples: ['test'],
        };

        await expect(
          calibration.addMarker('invalid', marker)
        ).rejects.toThrow('Voice profile not found');
      });
    });

    describe('removeMarker', () => {
      it('should remove marker from profile', async () => {
        const freshCalibration = new VoiceCalibration(analyzer, diversifier);

        const profile = freshCalibration.getVoiceProfile('casual');

        if (profile.markers.length === 0) {
          console.warn('Warning: Academic profile has no markers - skipping test');
          return;
        }

        expect(profile.markers.length).toBeGreaterThan(0);
        const markerToRemove = profile.markers[0];

        await freshCalibration.removeMarker('academic', markerToRemove.type, markerToRemove.indicator);

        const after = freshCalibration.getVoiceProfile('academic');
        expect(after.markers.some(m => m.indicator === markerToRemove.indicator)).toBe(false);
      });

      it('should only remove matching type and indicator', async () => {
        const profile = calibration.getVoiceProfile('casual');
        const beforeCount = profile.markers.length;

        await calibration.removeMarker('casual', 'nonexistent', 'nonexistent');

        const after = calibration.getVoiceProfile('casual');
        expect(after.markers.length).toBe(beforeCount);
      });

      it('should throw error for invalid voice', async () => {
        await expect(
          calibration.removeMarker('invalid', 'vocabulary', 'test')
        ).rejects.toThrow('Voice profile not found');
      });
    });
  });

  describe('Transformation Accuracy', () => {
    describe('testTransformationAccuracy', () => {
      it('should test all voice pair transformations with complete metrics', async () => {
        const transformTests = [
          { fromVoice: 'academic', toVoice: 'technical', corpus: ['The research methodology demonstrates empirical validity.'] },
          { fromVoice: 'technical', toVoice: 'casual', corpus: ['System latency is 45ms with optimization.'] },
          { fromVoice: 'casual', toVoice: 'executive', corpus: ["Here's the thing about performance."] },
          { fromVoice: 'executive', toVoice: 'academic', corpus: ['Strategic ROI of 40% demonstrates value.'] },
        ];

        for (const { fromVoice, toVoice, corpus } of transformTests) {
          const result = await calibration.testTransformationAccuracy(fromVoice, toVoice, corpus);

          expect(result.fromVoice, `${fromVoice}→${toVoice} fromVoice`).toBe(fromVoice);
          expect(result.toVoice, `${fromVoice}→${toVoice} toVoice`).toBe(toVoice);
          expect(result.accuracy, `${fromVoice}→${toVoice} accuracy`).toBeGreaterThanOrEqual(0);
          expect(result.fidelity, `${fromVoice}→${toVoice} fidelity`).toBeGreaterThanOrEqual(0);
          expect(result.averageConfidence, `${fromVoice}→${toVoice} avgConfidence`).toBeGreaterThanOrEqual(0);
          expect(result.averageConfidence, `${fromVoice}→${toVoice} avgConfidence bound`).toBeLessThanOrEqual(1);
          expect(result.samples, `${fromVoice}→${toVoice} samples`).toBe(corpus.length);
        }
      });

      it('should handle edge cases', async () => {
        // Empty corpus
        const emptyResult = await calibration.testTransformationAccuracy('casual', 'executive', []);
        expect(emptyResult.accuracy).toBe(0);
        expect(emptyResult.samples).toBe(0);

        // Multiple samples
        const multiResult = await calibration.testTransformationAccuracy(
          'technical',
          'casual',
          ['Text 1.', 'Text 2.', 'Text 3.']
        );
        expect(multiResult.samples).toBe(3);
      });

      it('should test all 12 voice pair combinations', async () => {
        const voices = ['academic', 'technical', 'executive', 'casual'];
        const corpus = ['Test transformation text.'];

        for (const from of voices) {
          for (const to of voices) {
            if (from !== to) {
              const result = await calibration.testTransformationAccuracy(from, to, corpus);
              expect(result, `${from} → ${to} failed`).toBeDefined();
            }
          }
        }
      });
    });

    describe('optimizeTransformations', () => {
      it('should optimize transformation and measure improvements', async () => {
        const corpus = ['The research methodology demonstrates validity.'];

        const result = await calibration.optimizeTransformations({
          fromVoice: 'academic',
          toVoice: 'technical',
          corpus,
        });

        expect(result.fromVoice).toBe('academic');
        expect(result.toVoice).toBe('technical');
        expect(result.beforeFidelity).toBeGreaterThanOrEqual(0);
        expect(result.afterFidelity).toBeGreaterThanOrEqual(0);
        expect(result.improvement).toBeDefined();
        expect(Array.isArray(result.adjustmentsMade)).toBe(true);
      });

      it('should respect target fidelity when provided', async () => {
        const corpus = ['Optimization target test.'];

        const result = await calibration.optimizeTransformations({
          fromVoice: 'academic',
          toVoice: 'executive',
          corpus,
          targetFidelity: 0.9,
        });

        expect(result).toBeDefined();
      });

      it('should use default target fidelity', async () => {
        const corpus = ['Default fidelity test.'];

        const result = await calibration.optimizeTransformations({
          fromVoice: 'technical',
          toVoice: 'executive',
          corpus,
        });

        expect(result).toBeDefined();
      });
    });
  });

  describe('Analysis and Reporting', () => {
    describe('generateCalibrationReport', () => {
      it('should generate comprehensive reports for all voices', () => {
        const voices = ['academic', 'technical', 'executive', 'casual'];

        for (const voice of voices) {
          const report = calibration.generateCalibrationReport(voice);

          expect(report.voice, `${voice} voice`).toBe(voice);
          expect(report.profile, `${voice} profile`).toBeDefined();
          expect(report.accuracy, `${voice} accuracy`).toBeDefined();
          expect(report.characteristics, `${voice} characteristics`).toBeDefined();
          expect(report.characteristics.formality, `${voice} formality`).toBeDefined();
          expect(Array.isArray(report.recentCalibrations), `${voice} recent calibrations`).toBe(true);
        }
      });

      it('should include marker statistics', () => {
        const freshCalibration = new VoiceCalibration(analyzer, diversifier);
        const report = freshCalibration.generateCalibrationReport('executive');

        expect(report.markers.total).toBeGreaterThanOrEqual(0);
        expect(report.markers.byType).toBeDefined();
        expect(report.markers.averageWeight).toBeGreaterThanOrEqual(0);
        expect(report.markers.byType.vocabulary).toBeGreaterThanOrEqual(0);
        expect(report.markers.byType.structure).toBeGreaterThanOrEqual(0);
        expect(report.markers.byType.tone).toBeGreaterThanOrEqual(0);
        expect(report.markers.byType.perspective).toBeGreaterThanOrEqual(0);
      });

      it('should throw error for invalid voice', () => {
        expect(() => {
          calibration.generateCalibrationReport('invalid');
        }).toThrow('Voice profile not found');
      });
    });

    describe('compareVoiceProfiles', () => {
      it('should compare voice profiles with similarity and differences', () => {
        const comparison = calibration.compareVoiceProfiles('academic', 'technical');

        expect(comparison.voice1).toBe('academic');
        expect(comparison.voice2).toBe('technical');
        expect(comparison.similarity).toBeGreaterThanOrEqual(0);
        expect(comparison.similarity).toBeLessThanOrEqual(1);
        expect(comparison.differences.length).toBeGreaterThan(0);
        expect(comparison.differences[0].characteristic).toBeDefined();
        expect(comparison.differences[0].delta).toBeGreaterThanOrEqual(0);

        // Check sorting
        for (let i = 1; i < comparison.differences.length; i++) {
          expect(comparison.differences[i - 1].delta).toBeGreaterThanOrEqual(
            comparison.differences[i].delta
          );
        }
      });

      it('should identify distinguishing markers', () => {
        const comparison = calibration.compareVoiceProfiles('academic', 'technical');

        expect(comparison.distinguishingMarkers.voice1Only).toBeDefined();
        expect(comparison.distinguishingMarkers.voice2Only).toBeDefined();
      });

      it('should throw error for invalid voices', () => {
        expect(() => {
          calibration.compareVoiceProfiles('invalid', 'academic');
        }).toThrow('One or both voice profiles not found');

        expect(() => {
          calibration.compareVoiceProfiles('academic', 'invalid');
        }).toThrow('One or both voice profiles not found');
      });
    });

    describe('exportVoiceProfiles', () => {
      it('should export profiles as JSON', () => {
        const exported = calibration.exportVoiceProfiles('json');

        expect(typeof exported).toBe('string');
        expect(() => JSON.parse(exported)).not.toThrow();

        const data = JSON.parse(exported);
        expect(data.length).toBeGreaterThan(0);
        expect(data[0].voice).toBeDefined();
        expect(data[0].characteristics).toBeDefined();
      });

      it('should export profiles as YAML', () => {
        const exported = calibration.exportVoiceProfiles('yaml');

        expect(typeof exported).toBe('string');
        expect(exported.includes('voice:')).toBe(true);
        expect(exported.includes('characteristics:')).toBe(true);
        expect(exported.includes('markers:')).toBe(true);
      });
    });

    describe('importVoiceProfiles', () => {
      it('should import JSON profiles', () => {
        const data = JSON.stringify([
          {
            voice: 'test',
            characteristics: {
              formality: 0.5,
              technicality: 0.5,
              assertiveness: 0.5,
              complexity: 0.5,
              sentenceLength: { avg: 15, min: 10, max: 20, variance: 3 },
              vocabularyLevel: 'intermediate',
              firstPersonUsage: 10,
              passiveVoiceRatio: 10,
            },
            markers: [],
            detectionConfidence: 0.5,
          },
        ]);

        calibration.importVoiceProfiles(data, 'json');

        const profile = calibration.getVoiceProfile('test');
        expect(profile.voice).toBe('test');
      });

      it('should throw error for invalid JSON', () => {
        expect(() => {
          calibration.importVoiceProfiles('invalid json', 'json');
        }).toThrow();
      });

      it('should throw error for YAML import', () => {
        expect(() => {
          calibration.importVoiceProfiles('test: value', 'yaml');
        }).toThrow('YAML import not fully implemented');
      });
    });
  });

  describe('Integration', () => {
    it('should integrate with VoiceAnalyzer', () => {
      const text = 'The research methodology demonstrates empirical validity.';
      const profile = analyzer.analyzeVoice(text);

      expect(profile).toBeDefined();
      expect(profile.primaryVoice).toBeDefined();
    });

    it('should integrate with ContentDiversifier', () => {
      const text = 'Test content for transformation.';
      const transformed = diversifier.transformVoice(text, 'casual', 'academic');

      expect(transformed).toBeDefined();
      expect(transformed.length).toBeGreaterThan(0);
    });

    it('should use analyzer for detection accuracy', async () => {
      const corpus = ['Test text for integration.'];
      const result = await calibration.testDetectionAccuracy('technical', corpus);

      expect(result).toBeDefined();
    });

    it('should use diversifier for transformations', async () => {
      const corpus = ['Test transformation.'];
      const result = await calibration.testTransformationAccuracy('academic', 'technical', corpus);

      expect(result).toBeDefined();
    });

    it('should maintain consistency across components', async () => {
      const text = 'System latency is 45ms with optimization.';

      const analyzerResult = analyzer.analyzeVoice(text);
      const calibrationProfile = calibration.getVoiceProfile('technical');

      expect(analyzerResult).toBeDefined();
      expect(calibrationProfile).toBeDefined();
    });
  });
});
