/**
 * Tests for PID Controller and related components
 *
 * @implements Issue #23 - PID-inspired Control Feedback Loop
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '../../../tools/ralph-external/metrics-collector.mjs';
import { GainScheduler, GAIN_PROFILES } from '../../../tools/ralph-external/gain-scheduler.mjs';
import { ControlAlarms, INTERVENTION_LEVELS } from '../../../tools/ralph-external/control-alarms.mjs';
import { PIDController } from '../../../tools/ralph-external/pid-controller.mjs';

// ============================================================================
// MetricsCollector Tests
// ============================================================================

describe('MetricsCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new MetricsCollector({
      windowSize: 5,
      integralDecay: 0.9,
      noiseThreshold: 0.05,
    });
  });

  describe('extractIterationMetrics', () => {
    it('should extract metrics from iteration data', () => {
      const iteration = {
        analysis: {
          completionPercentage: 50,
          qualityScore: 0.8,
          errorCount: 2,
          learnings: ['Fixed null check'],
        },
        duration: 5000,
      };

      const metrics = collector.extractIterationMetrics(iteration);

      expect(metrics.completionPercentage).toBe(0.5);
      expect(metrics.qualityScore).toBe(0.8);
      expect(metrics.errorCount).toBe(2);
      expect(metrics.learnings).toContain('Fixed null check');
      expect(metrics.duration).toBe(5000);
    });

    it('should normalize percentages > 1 to 0-1 range', () => {
      const iteration = {
        analysis: {
          completionPercentage: 75, // Should become 0.75
        },
      };

      const metrics = collector.extractIterationMetrics(iteration);
      expect(metrics.completionPercentage).toBe(0.75);
    });

    it('should handle missing fields gracefully', () => {
      const iteration = {};
      const metrics = collector.extractIterationMetrics(iteration);

      expect(metrics.completionPercentage).toBe(0);
      expect(metrics.qualityScore).toBe(0.5);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.learnings).toEqual([]);
    });
  });

  describe('calculateProportional', () => {
    it('should calculate completion gap as primary error', () => {
      const metrics = {
        completionPercentage: 0.7,
        qualityScore: 1.0,
        errorCount: 0,
      };

      const p = collector.calculateProportional(metrics);
      expect(p).toBeCloseTo(0.3, 1); // 1.0 - 0.7 = 0.3
    });

    it('should add quality penalty', () => {
      const metrics = {
        completionPercentage: 0.8,
        qualityScore: 0.5, // Low quality adds penalty
        errorCount: 0,
      };

      const p = collector.calculateProportional(metrics);
      expect(p).toBeGreaterThan(0.2); // Base gap + quality penalty
    });

    it('should add error penalty', () => {
      const metrics = {
        completionPercentage: 0.9,
        qualityScore: 1.0,
        errorCount: 10,
      };

      const p = collector.calculateProportional(metrics);
      expect(p).toBeGreaterThan(0.1); // Base gap + error penalty
    });

    it('should apply deadband filter to small values', () => {
      const metrics = {
        completionPercentage: 0.98,
        qualityScore: 0.99,
        errorCount: 0,
      };

      collector.noiseThreshold = 0.05;
      const p = collector.calculateProportional(metrics);
      expect(p).toBe(0); // Below threshold = filtered to 0
    });
  });

  describe('calculateIntegral', () => {
    it('should accumulate error over iterations', () => {
      const metrics1 = { completionPercentage: 0.3, qualityScore: 0.5, errorCount: 1, learnings: [], blockers: [] };
      const metrics2 = { completionPercentage: 0.4, qualityScore: 0.6, errorCount: 1, learnings: [], blockers: [] };

      const p1 = collector.calculateProportional(metrics1);
      const i1 = collector.calculateIntegral(metrics1, p1);

      const p2 = collector.calculateProportional(metrics2);
      const i2 = collector.calculateIntegral(metrics2, p2);

      expect(i2).toBeGreaterThan(i1 * 0.5); // Should accumulate (with decay)
    });

    it('should increase integral for repeated blockers', () => {
      const blocker = 'Test failure in auth module';
      const metrics = {
        completionPercentage: 0.5,
        qualityScore: 0.8,
        errorCount: 0,
        learnings: [],
        blockers: [blocker],
      };

      // First occurrence
      const p1 = collector.calculateProportional(metrics);
      const i1 = collector.calculateIntegral(metrics, p1);

      // Second occurrence (same blocker)
      const i2 = collector.calculateIntegral(metrics, p1);

      expect(i2).toBeGreaterThan(i1); // Repeated blocker increases integral
    });

    it('should apply anti-windup bounds', () => {
      collector.integralAccumulator = 10; // Way above max

      const metrics = { completionPercentage: 0.1, qualityScore: 0.5, errorCount: 5, learnings: [], blockers: [] };
      const p = collector.calculateProportional(metrics);
      const i = collector.calculateIntegral(metrics, p);

      expect(i).toBeLessThanOrEqual(5.0); // Should be bounded
    });

    it('should reduce integral for learnings', () => {
      const metrics = {
        completionPercentage: 0.5,
        qualityScore: 0.8,
        errorCount: 0,
        learnings: ['Found the issue', 'Applied fix', 'Verified solution'],
        blockers: [],
      };

      const p = collector.calculateProportional(metrics);
      collector.calculateIntegral(metrics, p);

      expect(collector.learningsWeight).toBeGreaterThan(0);
    });
  });

  describe('calculateDerivative', () => {
    it('should return 0 with no history', () => {
      const metrics = { completionPercentage: 0.5, qualityScore: 0.8, errorCount: 0, learnings: [], blockers: [] };
      const p = collector.calculateProportional(metrics);
      const d = collector.calculateDerivative(metrics, p);

      expect(d).toBe(0);
    });

    it('should calculate positive derivative for regression', () => {
      // First iteration - low error
      const iter1 = { analysis: { completionPercentage: 80 } };
      collector.collect(iter1);

      // Second iteration - higher error (regression)
      const iter2 = { analysis: { completionPercentage: 60 } };
      const result = collector.collect(iter2);

      expect(result.derivative).toBeGreaterThan(0); // Positive = regression
    });

    it('should calculate negative derivative for improvement', () => {
      // First iteration - high error
      const iter1 = { analysis: { completionPercentage: 30 } };
      collector.collect(iter1);

      // Second iteration - lower error (improvement)
      const iter2 = { analysis: { completionPercentage: 60 } };
      const result = collector.collect(iter2);

      expect(result.derivative).toBeLessThan(0); // Negative = improvement
    });
  });

  describe('collect', () => {
    it('should return complete PID metrics', () => {
      const iteration = {
        number: 1,
        analysis: {
          completionPercentage: 50,
          qualityScore: 0.8,
        },
      };

      const result = collector.collect(iteration);

      expect(result).toHaveProperty('proportional');
      expect(result).toHaveProperty('integral');
      expect(result).toHaveProperty('derivative');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('raw');
    });

    it('should add metrics to history', () => {
      expect(collector.history.length).toBe(0);

      collector.collect({ analysis: { completionPercentage: 50 } });
      expect(collector.history.length).toBe(1);

      collector.collect({ analysis: { completionPercentage: 60 } });
      expect(collector.history.length).toBe(2);
    });
  });

  describe('getTrend', () => {
    it('should detect improving trend', () => {
      // Simulate improving progress
      collector.collect({ analysis: { completionPercentage: 30 } });
      collector.collect({ analysis: { completionPercentage: 50 } });
      collector.collect({ analysis: { completionPercentage: 70 } });

      const trend = collector.getTrend();
      expect(trend.trend).toBe('improving');
      expect(trend.velocity).toBeGreaterThan(0);
    });

    it('should detect regressing trend', () => {
      collector.collect({ analysis: { completionPercentage: 70 } });
      collector.collect({ analysis: { completionPercentage: 50 } });
      collector.collect({ analysis: { completionPercentage: 30 } });

      const trend = collector.getTrend();
      expect(trend.trend).toBe('regressing');
      expect(trend.velocity).toBeLessThan(0);
    });

    it('should detect oscillating trend', () => {
      collector.collect({ analysis: { completionPercentage: 50 } });
      collector.collect({ analysis: { completionPercentage: 70 } });
      collector.collect({ analysis: { completionPercentage: 40 } });

      const trend = collector.getTrend();
      expect(trend.trend).toBe('oscillating');
    });
  });

  describe('state persistence', () => {
    it('should export and import state correctly', () => {
      collector.collect({ analysis: { completionPercentage: 50 } });
      collector.collect({ analysis: { completionPercentage: 60 } });

      const exported = collector.exportState();

      const newCollector = new MetricsCollector();
      newCollector.importState(exported);

      expect(newCollector.history.length).toBe(2);
      expect(newCollector.integralAccumulator).toBe(collector.integralAccumulator);
    });
  });
});

// ============================================================================
// GainScheduler Tests
// ============================================================================

describe('GainScheduler', () => {
  let scheduler;

  beforeEach(() => {
    scheduler = new GainScheduler();
  });

  describe('assessTaskComplexity', () => {
    it('should select conservative profile for security-sensitive tasks', () => {
      const profile = scheduler.assessTaskComplexity({
        estimatedIterations: 5,
        filesAffected: 10,
        securitySensitive: true,
        breakingChanges: false,
        domainComplexity: 'medium',
      });

      expect(profile.name).toBe('conservative');
    });

    it('should select aggressive profile for simple tasks', () => {
      const profile = scheduler.assessTaskComplexity({
        estimatedIterations: 2,
        filesAffected: 2,
        securitySensitive: false,
        breakingChanges: false,
        domainComplexity: 'low',
      });

      expect(profile.name).toBe('aggressive');
    });

    it('should select standard profile for typical tasks', () => {
      const profile = scheduler.assessTaskComplexity({
        estimatedIterations: 6,  // >5 adds +1
        filesAffected: 10,       // >5 adds +1
        securitySensitive: false,
        breakingChanges: false,
        domainComplexity: 'medium',  // adds +1, total = 3
      });

      expect(profile.name).toBe('standard');
    });
  });

  describe('update', () => {
    it('should switch to recovery mode when stuck', () => {
      scheduler.setProfile(GAIN_PROFILES.standard, 'initial');

      scheduler.update({
        proportional: 0.8,
        integral: 4.0,
        derivative: 0.01,
        trend: 'stable',
        iterationNumber: 5,
        maxIterations: 10,
      });

      expect(scheduler.currentProfile.name).toBe('recovery');
    });

    it('should switch to cautious mode near completion', () => {
      scheduler.setProfile(GAIN_PROFILES.standard, 'initial');

      scheduler.update({
        proportional: 0.1,
        integral: 0.5,
        derivative: -0.05,
        trend: 'improving',
        iterationNumber: 8,
        maxIterations: 10,
      });

      expect(scheduler.currentProfile.name).toBe('cautious');
    });

    it('should create damped profile for oscillation', () => {
      scheduler.setProfile(GAIN_PROFILES.standard, 'initial');

      scheduler.update({
        proportional: 0.5,
        integral: 1.0,
        derivative: 0.05,
        trend: 'oscillating',
        iterationNumber: 3,
        maxIterations: 10,
      });

      expect(scheduler.currentProfile.name).toBe('damped');
    });
  });

  describe('calculateControlOutput', () => {
    it('should calculate control signal from PID metrics', () => {
      const metrics = {
        proportional: 0.5,
        integral: 1.0,
        derivative: 0.1,
      };

      const output = scheduler.calculateControlOutput(metrics);

      expect(output).toHaveProperty('controlSignal');
      expect(output).toHaveProperty('pTerm');
      expect(output).toHaveProperty('iTerm');
      expect(output).toHaveProperty('dTerm');
      expect(output).toHaveProperty('recommendations');
    });

    it('should recommend high urgency for high control signal', () => {
      const metrics = {
        proportional: 0.9,
        integral: 2.0,
        derivative: 0.15,
      };

      const output = scheduler.calculateControlOutput(metrics);

      expect(output.recommendations.urgency).toMatch(/high|critical/);
    });
  });

  describe('smoothTransition', () => {
    it('should gradually transition between profiles', () => {
      scheduler.transitionSmoothing = 0.5;

      const current = { name: 'test', kp: 0.5, ki: 0.1, kd: 0.2, description: 'test' };
      const target = { name: 'target', kp: 1.0, ki: 0.3, kd: 0.4, description: 'target' };

      const result = scheduler.smoothTransition(current, target);

      // Should be halfway between
      expect(result.kp).toBeCloseTo(0.75, 2);
      expect(result.ki).toBeCloseTo(0.2, 2);
      expect(result.kd).toBeCloseTo(0.3, 2);
    });
  });

  describe('state persistence', () => {
    it('should export and import state correctly', () => {
      scheduler.assessTaskComplexity({
        estimatedIterations: 10,
        filesAffected: 20,
        securitySensitive: true,
        domainComplexity: 'high',
      });

      const exported = scheduler.exportState();
      const newScheduler = new GainScheduler();
      newScheduler.importState(exported);

      expect(newScheduler.currentProfile.name).toBe(scheduler.currentProfile.name);
    });
  });
});

// ============================================================================
// ControlAlarms Tests
// ============================================================================

describe('ControlAlarms', () => {
  let alarms;

  beforeEach(() => {
    alarms = new ControlAlarms({
      thresholds: {
        stuckIterations: 3,
        oscillationCount: 2,
        regressionRate: 0.1,
      },
    });
  });

  describe('checkStuckLoop', () => {
    it('should detect stuck loop', () => {
      // Simulate stuck loop - same error for multiple iterations
      const metrics = { proportional: 0.7, derivative: 0.01, timestamp: Date.now() };

      alarms.check(metrics, { iterationNumber: 1, maxIterations: 10 });
      alarms.check(metrics, { iterationNumber: 2, maxIterations: 10 });
      const result = alarms.check(metrics, { iterationNumber: 3, maxIterations: 10 });

      expect(result.some(a => a.type === 'stuck_loop')).toBe(true);
    });
  });

  describe('checkOscillation', () => {
    it('should detect oscillation pattern', () => {
      // Simulate oscillation - alternating improvements/regressions
      // Need 4+ history entries before detection, alarm raised on check 4
      alarms.check({ proportional: 0.5, derivative: -0.1 }, {});
      alarms.check({ proportional: 0.4, derivative: 0.1 }, {});
      alarms.check({ proportional: 0.5, derivative: -0.1 }, {});
      const result = alarms.check({ proportional: 0.4, derivative: 0.1 }, {});

      expect(result.some(a => a.type === 'oscillation')).toBe(true);
    });
  });

  describe('checkRegression', () => {
    it('should detect regression', () => {
      const metrics = {
        proportional: 0.6,
        integral: 1.0,
        derivative: 0.15, // Positive = regression
        timestamp: Date.now(),
      };

      const result = alarms.check(metrics, {});

      expect(result.some(a => a.type === 'regression')).toBe(true);
    });
  });

  describe('checkResourceBurn', () => {
    it('should detect resource burn near iteration limit', () => {
      const metrics = { proportional: 0.5, derivative: 0, timestamp: Date.now() };

      const result = alarms.check(metrics, {
        iterationNumber: 9,
        maxIterations: 10,
      });

      expect(result.some(a => a.type === 'resource_burn')).toBe(true);
    });
  });

  describe('checkQualityDegradation', () => {
    it('should detect quality drop', () => {
      // Simulate quality degradation
      // Need 3+ history entries, threshold is 0.15 drop
      // Alarm raised on check 4 when drop (0.9 - 0.7 = 0.2) > 0.15
      alarms.check({ proportional: 0.5, derivative: 0, raw: { qualityScore: 0.9 } }, {});
      alarms.check({ proportional: 0.5, derivative: 0, raw: { qualityScore: 0.85 } }, {});
      alarms.check({ proportional: 0.5, derivative: 0, raw: { qualityScore: 0.8 } }, {});
      const result = alarms.check({ proportional: 0.5, derivative: 0, raw: { qualityScore: 0.7 } }, {});

      expect(result.some(a => a.type === 'quality_degradation')).toBe(true);
    });
  });

  describe('alarm management', () => {
    it('should not duplicate active alarms', () => {
      const metrics = { proportional: 0.5, derivative: 0.15 };

      const result1 = alarms.check(metrics, {});
      const result2 = alarms.check(metrics, {});

      // Should only raise once while active
      expect(result1.length).toBeGreaterThan(0);
      expect(result2.length).toBe(0);
    });

    it('should track alarm history', () => {
      alarms.check({ proportional: 0.5, derivative: 0.15 }, {});

      expect(alarms.alarmHistory.length).toBeGreaterThan(0);
    });

    it('should acknowledge alarms', () => {
      alarms.check({ proportional: 0.5, derivative: 0.15 }, {});
      const active = alarms.getActiveAlarms()[0];

      alarms.acknowledgeAlarm(active.id);

      expect(alarms.getActiveAlarms()[0].acknowledged).toBe(true);
    });

    it('should clear alarms', () => {
      alarms.check({ proportional: 0.5, derivative: 0.15 }, {});
      expect(alarms.getActiveAlarms().length).toBeGreaterThan(0);

      alarms.clearAlarm('regression');
      expect(alarms.isAlarmActive('regression')).toBe(false);
    });
  });

  describe('suggestIntervention', () => {
    it('should suggest abort for emergency', () => {
      const alarm = { severity: 'emergency' };
      expect(alarms.suggestIntervention(alarm)).toBe(INTERVENTION_LEVELS.ABORT);
    });

    it('should suggest pause for critical', () => {
      const alarm = { severity: 'critical' };
      expect(alarms.suggestIntervention(alarm)).toBe(INTERVENTION_LEVELS.PAUSE);
    });

    it('should suggest nudge for warning', () => {
      const alarm = { severity: 'warning' };
      expect(alarms.suggestIntervention(alarm)).toBe(INTERVENTION_LEVELS.NUDGE);
    });
  });

  describe('state persistence', () => {
    it('should export and import state correctly', () => {
      alarms.check({ proportional: 0.5, derivative: 0.15 }, {});

      const exported = alarms.exportState();
      const newAlarms = new ControlAlarms();
      newAlarms.importState(exported);

      expect(newAlarms.alarmHistory.length).toBe(alarms.alarmHistory.length);
    });
  });
});

// ============================================================================
// PIDController Integration Tests
// ============================================================================

describe('PIDController', () => {
  let controller;

  beforeEach(() => {
    controller = new PIDController({
      windowSize: 5,
      adaptiveGains: true,
    });
  });

  describe('initialize', () => {
    it('should initialize with task config', () => {
      const result = controller.initialize({
        objective: 'Fix tests',
        completionCriteria: 'All tests pass',
        maxIterations: 10,
        estimatedComplexity: 5,
      });

      expect(controller.isInitialized).toBe(true);
      expect(result).toHaveProperty('initialProfile');
      expect(result).toHaveProperty('taskComplexity');
    });

    it('should select appropriate initial profile', () => {
      const result = controller.initialize({
        objective: 'Security audit',
        completionCriteria: 'No vulnerabilities',
        maxIterations: 10,
        securitySensitive: true,
      });

      expect(result.initialProfile.name).toBe('conservative');
    });
  });

  describe('process', () => {
    beforeEach(() => {
      controller.initialize({
        objective: 'Test task',
        completionCriteria: 'Tests pass',
        maxIterations: 10,
      });
    });

    it('should return control decision', () => {
      const iteration = {
        number: 1,
        analysis: {
          completionPercentage: 30,
          qualityScore: 0.8,
        },
      };

      const decision = controller.process(iteration, {
        currentIteration: 1,
        maxIterations: 10,
      });

      expect(decision).toHaveProperty('action');
      expect(decision).toHaveProperty('controlSignal');
      expect(decision).toHaveProperty('urgency');
      expect(decision).toHaveProperty('metrics');
      expect(decision).toHaveProperty('gains');
    });

    it('should track decision history', () => {
      controller.process({ analysis: { completionPercentage: 30 } }, { currentIteration: 1, maxIterations: 10 });
      controller.process({ analysis: { completionPercentage: 40 } }, { currentIteration: 2, maxIterations: 10 });

      expect(controller.getDecisionHistory().length).toBe(2);
    });

    it('should detect regression and adjust', () => {
      controller.process({ analysis: { completionPercentage: 50 } }, { currentIteration: 1, maxIterations: 10 });
      controller.process({ analysis: { completionPercentage: 40 } }, { currentIteration: 2, maxIterations: 10 });
      const decision = controller.process({ analysis: { completionPercentage: 30 } }, { currentIteration: 3, maxIterations: 10 });

      expect(decision.metrics.trend).toBe('regressing');
    });

    it('should recommend pause when near iteration limit with high error', () => {
      const decision = controller.process(
        { analysis: { completionPercentage: 50 } },
        { currentIteration: 10, maxIterations: 10 }
      );

      expect(decision.action).toBe('pause');
      expect(decision.urgency).toBe('critical');
    });
  });

  describe('getPromptAdjustments', () => {
    beforeEach(() => {
      controller.initialize({
        objective: 'Test task',
        completionCriteria: 'Tests pass',
        maxIterations: 10,
      });
    });

    it('should return adjustments based on state', () => {
      controller.process({ analysis: { completionPercentage: 30 } }, { currentIteration: 1, maxIterations: 10 });

      const adjustments = controller.getPromptAdjustments();

      expect(adjustments).toHaveProperty('adjustments');
      expect(adjustments).toHaveProperty('context');
      expect(adjustments).toHaveProperty('metrics');
    });
  });

  describe('getInterventionRecommendation', () => {
    beforeEach(() => {
      controller.initialize({
        objective: 'Test task',
        completionCriteria: 'Tests pass',
        maxIterations: 10,
      });
    });

    it('should return none when no alarms', () => {
      controller.process({ analysis: { completionPercentage: 80, qualityScore: 0.9 } }, { currentIteration: 1, maxIterations: 10 });

      const recommendation = controller.getInterventionRecommendation();

      expect(recommendation.level).toBe(INTERVENTION_LEVELS.NONE);
    });
  });

  describe('state persistence', () => {
    it('should export and import state correctly', () => {
      controller.initialize({
        objective: 'Test task',
        completionCriteria: 'Tests pass',
        maxIterations: 10,
      });

      controller.process({ analysis: { completionPercentage: 50 } }, { currentIteration: 1, maxIterations: 10 });

      const exported = controller.exportState();

      const newController = new PIDController();
      newController.importState(exported);

      expect(newController.isInitialized).toBe(true);
      expect(newController.taskConfig.objective).toBe('Test task');
      expect(newController.getDecisionHistory().length).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      controller.initialize({
        objective: 'Test task',
        completionCriteria: 'Tests pass',
        maxIterations: 10,
      });

      controller.process({ analysis: { completionPercentage: 50 } }, { currentIteration: 1, maxIterations: 10 });

      controller.reset();

      expect(controller.isInitialized).toBe(false);
      expect(controller.taskConfig).toBeNull();
      expect(controller.getDecisionHistory().length).toBe(0);
    });
  });
});
