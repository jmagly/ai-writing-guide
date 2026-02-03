/**
 * Tests for Behavior Detector
 *
 * @implements Issue #25 - Autonomous Overseer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BehaviorDetector, THRESHOLDS } from '../../../tools/ralph-external/lib/behavior-detector.mjs';

describe('BehaviorDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new BehaviorDetector();
  });

  describe('constructor', () => {
    it('should initialize with default thresholds', () => {
      const thresholds = detector.getThresholds();
      expect(thresholds.stuck.sameErrorCount).toBe(THRESHOLDS.stuck.sameErrorCount);
      expect(thresholds.oscillation.undoRedoCycles).toBe(THRESHOLDS.oscillation.undoRedoCycles);
    });

    it('should allow custom thresholds', () => {
      const customDetector = new BehaviorDetector({
        thresholds: {
          stuck: { sameErrorCount: 5 },
        },
      });

      const thresholds = customDetector.getThresholds();
      expect(thresholds.stuck.sameErrorCount).toBe(5);
    });
  });

  describe('detect', () => {
    it('should return empty array for empty history', () => {
      const detections = detector.detect([]);
      expect(detections).toEqual([]);
    });

    it('should detect multiple issues simultaneously', () => {
      // Need 5+ iterations with same error and no progress to trigger stuck detection
      const history = [
        { number: 1, context: { objective: 'Fix bug' }, analysis: { failureClass: 'error1', completionPercentage: 10 } },
        { number: 2, context: { objective: 'Fix bug' }, analysis: { failureClass: 'error1', completionPercentage: 10 } },
        { number: 3, context: { objective: 'Fix bug' }, analysis: { failureClass: 'error1', completionPercentage: 10 } },
        { number: 4, context: { objective: 'Fix bug' }, analysis: { failureClass: 'error1', completionPercentage: 10 } },
        { number: 5, context: { objective: 'Fix bug' }, analysis: { failureClass: 'error1', completionPercentage: 10 } },
      ];

      const detections = detector.detect(history);
      // Should detect stuck loop
      expect(detections.some(d => d.type === 'stuck')).toBe(true);
    });
  });

  describe('detectStuck', () => {
    it('should not detect stuck with insufficient history', () => {
      const history = [
        { number: 1, analysis: { failureClass: 'error1', completionPercentage: 10 } },
      ];

      const detection = detector.detectStuck(history);
      expect(detection).toBeNull();
    });

    it('should detect stuck loop with same error 3+ times', () => {
      const history = [
        { number: 1, analysis: { failureClass: 'null_pointer', completionPercentage: 30 } },
        { number: 2, analysis: { failureClass: 'null_pointer', completionPercentage: 30 } },
        { number: 3, analysis: { failureClass: 'null_pointer', completionPercentage: 30 } },
        { number: 4, analysis: { failureClass: 'null_pointer', completionPercentage: 30 } },
      ];

      const detection = detector.detectStuck(history);
      expect(detection).not.toBeNull();
      expect(detection.type).toBe('stuck');
      expect(detection.severity).toBe('high');
      expect(detection.evidence.repeatedError).toBe('null_pointer');
      expect(detection.evidence.occurrences).toBe(4);
    });

    it('should escalate to critical after 5 occurrences', () => {
      const history = Array.from({ length: 6 }, (_, i) => ({
        number: i + 1,
        analysis: { failureClass: 'timeout', completionPercentage: 20 },
      }));

      const detection = detector.detectStuck(history);
      expect(detection).not.toBeNull();
      expect(detection.severity).toBe('critical');
    });

    it('should not detect stuck if making progress', () => {
      const history = [
        { number: 1, analysis: { failureClass: 'error', completionPercentage: 10 } },
        { number: 2, analysis: { failureClass: 'error', completionPercentage: 25 } },
        { number: 3, analysis: { failureClass: 'error', completionPercentage: 40 } },
        { number: 4, analysis: { failureClass: 'error', completionPercentage: 60 } },
      ];

      const detection = detector.detectStuck(history);
      expect(detection).toBeNull(); // Making progress despite errors
    });
  });

  describe('detectOscillation', () => {
    it('should not detect oscillation with insufficient history', () => {
      const history = [
        { number: 1, analysis: { artifactsModified: ['file1.ts'] } },
      ];

      const detection = detector.detectOscillation(history);
      expect(detection).toBeNull();
    });

    it('should detect undo/redo cycles', () => {
      const history = [
        { number: 1, analysis: { artifactsModified: ['file1.ts', 'file2.ts'] } },
        { number: 2, analysis: { artifactsModified: ['file3.ts'] } }, // Changed different files
        { number: 3, analysis: { artifactsModified: ['file1.ts', 'file2.ts'] } }, // Reverted to original
        { number: 4, analysis: { artifactsModified: ['file3.ts'] } },
        { number: 5, analysis: { artifactsModified: ['file1.ts', 'file2.ts'] } }, // Cycle 2
      ];

      const detection = detector.detectOscillation(history);
      expect(detection).not.toBeNull();
      expect(detection.type).toBe('oscillation');
      expect(detection.severity).toBe('high');
    });

    it('should not detect oscillation for normal file changes', () => {
      const history = [
        { number: 1, analysis: { artifactsModified: ['file1.ts'] } },
        { number: 2, analysis: { artifactsModified: ['file2.ts'] } },
        { number: 3, analysis: { artifactsModified: ['file3.ts'] } },
        { number: 4, analysis: { artifactsModified: ['file4.ts'] } },
      ];

      const detection = detector.detectOscillation(history);
      expect(detection).toBeNull();
    });
  });

  describe('detectDeviation', () => {
    it('should not detect deviation with insufficient history', () => {
      const history = [
        { number: 1, context: { objective: 'Fix authentication bug' }, analysis: {} },
      ];

      const detection = detector.detectDeviation(history);
      expect(detection).toBeNull();
    });

    it('should detect objective deviation', () => {
      const history = [
        {
          number: 1,
          context: { objective: 'Fix authentication bug in login module' },
          analysis: { learnings: 'Fixed authentication login module bug' },
        },
        {
          number: 2,
          context: { objective: 'Fix authentication bug in login module' },
          analysis: { learnings: 'Added new feature for user dashboard' },
        },
        {
          number: 3,
          context: { objective: 'Fix authentication bug in login module' },
          analysis: { learnings: 'Refactored payment processing system' },
        },
        {
          number: 4,
          context: { objective: 'Fix authentication bug in login module' },
          analysis: { learnings: 'Updated database schema migrations' },
        },
      ];

      const detection = detector.detectDeviation(history);
      expect(detection).not.toBeNull();
      expect(detection.type).toBe('deviation');
      expect(detection.severity).toBe('medium');
    });

    it('should not detect deviation when work aligns with objective', () => {
      const history = [
        {
          number: 1,
          context: { objective: 'Fix authentication bug in login module' },
          analysis: { learnings: 'Fixed null check in authentication' },
        },
        {
          number: 2,
          context: { objective: 'Fix authentication bug in login module' },
          analysis: { learnings: 'Updated login module authentication tests' },
        },
      ];

      const detection = detector.detectDeviation(history);
      expect(detection).toBeNull();
    });
  });

  describe('detectResourceBurn', () => {
    it('should not detect burn with no context', () => {
      const history = [
        { number: 1, analysis: {} },
      ];

      const detection = detector.detectResourceBurn(history);
      expect(detection).toBeNull();
    });

    it('should detect resource burn when exceeding 2x iterations', () => {
      const history = Array.from({ length: 21 }, (_, i) => ({
        number: i + 1,
        context: { maxIterations: 10 },
        analysis: { completionPercentage: 30 },
      }));

      const detection = detector.detectResourceBurn(history);
      expect(detection).not.toBeNull();
      expect(detection.type).toBe('resource_burn');
      expect(detection.severity).toBe('high');
      expect(detection.evidence.iterationRatio).toBeGreaterThan(2.0);
    });

    it('should escalate to critical at 2.5x iterations', () => {
      const history = Array.from({ length: 26 }, (_, i) => ({
        number: i + 1,
        context: { maxIterations: 10 },
        analysis: { completionPercentage: 40 },
      }));

      const detection = detector.detectResourceBurn(history);
      expect(detection).not.toBeNull();
      expect(detection.severity).toBe('critical');
    });

    it('should not detect burn within budget', () => {
      const history = Array.from({ length: 8 }, (_, i) => ({
        number: i + 1,
        context: { maxIterations: 10 },
        analysis: { completionPercentage: 70 },
      }));

      const detection = detector.detectResourceBurn(history);
      expect(detection).toBeNull();
    });
  });

  describe('detectRegression', () => {
    it('should not detect regression with insufficient history', () => {
      const history = [
        { number: 1, analysis: { testsPassing: true } },
      ];

      const detection = detector.detectRegression(history);
      expect(detection).toBeNull();
    });

    it('should detect tests going from passing to failing', () => {
      const history = [
        { number: 1, analysis: { testsPassing: true, coveragePercent: 80 } },
        { number: 2, analysis: { testsPassing: false, coveragePercent: 75 } },
      ];

      const detection = detector.detectRegression(history);
      expect(detection).not.toBeNull();
      expect(detection.type).toBe('regression');
      expect(detection.severity).toBe('high');
    });

    it('should detect coverage drops >= 10%', () => {
      const history = [
        { number: 1, analysis: { coveragePercent: 85 } },
        { number: 2, analysis: { coveragePercent: 74 } }, // 11% drop
      ];

      const detection = detector.detectRegression(history);
      expect(detection).not.toBeNull();
      expect(detection.type).toBe('regression');
    });

    it('should escalate to critical for multiple regressions', () => {
      const history = [
        { number: 1, analysis: { testsPassing: true, coveragePercent: 85 } },
        { number: 2, analysis: { testsPassing: false, coveragePercent: 85 } },
        { number: 3, analysis: { testsPassing: false, coveragePercent: 74 } },
      ];

      const detection = detector.detectRegression(history);
      expect(detection).not.toBeNull();
      expect(detection.severity).toBe('critical');
    });

    it('should not detect regression for minor coverage changes', () => {
      const history = [
        { number: 1, analysis: { testsPassing: true, coveragePercent: 85 } },
        { number: 2, analysis: { testsPassing: true, coveragePercent: 82 } }, // Only 3% drop
      ];

      const detection = detector.detectRegression(history);
      expect(detection).toBeNull();
    });
  });

  describe('updateThresholds', () => {
    it('should update specific thresholds', () => {
      detector.updateThresholds({
        stuck: { sameErrorCount: 10 },
      });

      const thresholds = detector.getThresholds();
      expect(thresholds.stuck.sameErrorCount).toBe(10);
      expect(thresholds.oscillation.undoRedoCycles).toBe(THRESHOLDS.oscillation.undoRedoCycles);
    });
  });
});
