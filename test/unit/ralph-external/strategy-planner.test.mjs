/**
 * Tests for Strategy Planner
 *
 * @implements Issue #22 - Claude Intelligence Layer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StrategyPlanner } from '../../../tools/ralph-external/lib/strategy-planner.mjs';

describe('StrategyPlanner', () => {
  let planner;

  beforeEach(() => {
    planner = new StrategyPlanner({ verbose: false });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const p = new StrategyPlanner();
      expect(p.stuckThreshold).toBe(3);
      expect(p.oscillationThreshold).toBe(3);
      expect(p.escalationThreshold).toBe(7);
      expect(p.verbose).toBe(false);
    });

    it('should accept custom options', () => {
      const p = new StrategyPlanner({
        stuckThreshold: 5,
        oscillationThreshold: 4,
        escalationThreshold: 10,
        verbose: true,
      });

      expect(p.stuckThreshold).toBe(5);
      expect(p.oscillationThreshold).toBe(4);
      expect(p.escalationThreshold).toBe(10);
      expect(p.verbose).toBe(true);
    });
  });

  describe('_analyzeSituation', () => {
    it('should handle empty history', () => {
      const situation = planner._analyzeSituation([], {});

      expect(situation.stuck).toBe(false);
      expect(situation.oscillating).toBe(false);
      expect(situation.improving).toBe(false);
      expect(situation.repeatedIssues).toEqual([]);
    });

    it('should detect stuck situation', () => {
      const history = [
        { analysis: { completionPercentage: 30 } },
        { analysis: { completionPercentage: 31 } },
        { analysis: { completionPercentage: 32 } },
        { analysis: { completionPercentage: 31 } },
      ];

      const situation = planner._analyzeSituation(history, {});

      expect(situation.stuck).toBe(true);
    });

    it('should detect oscillating situation', () => {
      const history = [
        { analysis: { completionPercentage: 40 } },
        { analysis: { completionPercentage: 50 } },
        { analysis: { completionPercentage: 35 } },
        { analysis: { completionPercentage: 45 } },
        { analysis: { completionPercentage: 30 } },
        { analysis: { completionPercentage: 55 } },
      ];

      const situation = planner._analyzeSituation(history, {});

      expect(situation.oscillating).toBe(true);
    });

    it('should detect improving trend', () => {
      const situation = planner._analyzeSituation([], { trend: 'improving' });

      expect(situation.improving).toBe(true);
    });

    it('should detect regressing trend', () => {
      const situation = planner._analyzeSituation([], { trend: 'regressing' });

      expect(situation.regressing).toBe(true);
    });

    it('should detect near completion', () => {
      const history = [
        { analysis: { completionPercentage: 85 } },
      ];

      const situation = planner._analyzeSituation(history, {});

      expect(situation.nearCompletion).toBe(true);
    });

    it('should detect blockers', () => {
      const history = [
        { blockers: ['Test failure'] },
      ];

      const situation = planner._analyzeSituation(history, {});

      expect(situation.hasBlockers).toBe(true);
    });

    it('should detect repeated issues', () => {
      const history = [
        { blockers: ['Test A fails'] },
        { blockers: ['Test A fails', 'Test B fails'] },
        { blockers: ['Test A fails'] },
      ];

      const situation = planner._analyzeSituation(history, {});

      expect(situation.repeatedIssues.length).toBeGreaterThan(0);
      expect(situation.repeatedIssues[0].issue).toBe('Test A fails');
      expect(situation.repeatedIssues[0].count).toBe(3);
    });
  });

  describe('_selectStrategy', () => {
    it('should select pivot for blockers', () => {
      const situation = { hasBlockers: true };
      const strategy = planner._selectStrategy(situation, [], {});

      expect(strategy.approach).toBe('pivot');
      expect(strategy.reasoning).toContain('blockers');
    });

    it('should select pivot for stuck', () => {
      const situation = { stuck: true };
      const strategy = planner._selectStrategy(situation, [], {});

      expect(strategy.approach).toBe('pivot');
      expect(strategy.reasoning).toContain('progress');
    });

    it('should select pivot for oscillating', () => {
      const situation = { oscillating: true };
      const strategy = planner._selectStrategy(situation, [], {});

      expect(strategy.approach).toBe('pivot');
      expect(strategy.reasoning).toContain('oscillation');
    });

    it('should select pivot for regressing', () => {
      const situation = { regressing: true };
      const strategy = planner._selectStrategy(situation, [], {});

      expect(strategy.approach).toBe('pivot');
      expect(strategy.reasoning).toContain('regressing');
    });

    it('should select persist for near completion', () => {
      const situation = { nearCompletion: true };
      const strategy = planner._selectStrategy(situation, [], {});

      expect(strategy.approach).toBe('persist');
      expect(strategy.reasoning).toContain('completion');
    });

    it('should select persist for improving', () => {
      const situation = { improving: true };
      const strategy = planner._selectStrategy(situation, [], {});

      expect(strategy.approach).toBe('persist');
      expect(strategy.reasoning).toContain('progress');
    });

    it('should default to persist', () => {
      const situation = {};
      const strategy = planner._selectStrategy(situation, [], {});

      expect(strategy.approach).toBe('persist');
    });
  });

  describe('_buildPriorities', () => {
    it('should prioritize repeated issues', () => {
      const situation = {
        repeatedIssues: [
          { issue: 'Same test fails', count: 3 },
        ],
      };

      const priorities = planner._buildPriorities(situation, [], {});

      expect(priorities[0]).toContain('Same test fails');
    });

    it('should prioritize blockers', () => {
      const situation = {
        hasBlockers: true,
        repeatedIssues: [],
      };

      const priorities = planner._buildPriorities(situation, [], {});

      expect(priorities[0]).toContain('blockers');
    });

    it('should suggest completion tasks for near completion', () => {
      const situation = { nearCompletion: true };

      const priorities = planner._buildPriorities(situation, [], {});

      expect(priorities.some(p => p.includes('Complete remaining'))).toBe(true);
      expect(priorities.some(p => p.includes('final tests'))).toBe(true);
    });

    it('should suggest alternative approach for stuck', () => {
      const situation = { stuck: true };

      const priorities = planner._buildPriorities(situation, [], {});

      expect(priorities.some(p => p.includes('different approach'))).toBe(true);
    });

    it('should suggest review for regressing', () => {
      const situation = { regressing: true };

      const priorities = planner._buildPriorities(situation, [], {});

      expect(priorities.some(p => p.includes('Review recent changes'))).toBe(true);
    });

    it('should default to continue implementation', () => {
      const situation = {};

      const priorities = planner._buildPriorities(situation, [], {});

      expect(priorities[0]).toContain('Continue current implementation');
    });
  });

  describe('_calculateConfidence', () => {
    it('should have high confidence for blockers', () => {
      const strategy = { approach: 'pivot' };
      const situation = { hasBlockers: true };

      const confidence = planner._calculateConfidence(strategy, situation);

      expect(confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should have high confidence for stuck', () => {
      const strategy = { approach: 'pivot' };
      const situation = { stuck: true };

      const confidence = planner._calculateConfidence(strategy, situation);

      expect(confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should have high confidence for near completion', () => {
      const strategy = { approach: 'persist' };
      const situation = { nearCompletion: true };

      const confidence = planner._calculateConfidence(strategy, situation);

      expect(confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should have moderate confidence for improving', () => {
      const strategy = { approach: 'persist' };
      const situation = { improving: true };

      const confidence = planner._calculateConfidence(strategy, situation);

      expect(confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should have lower confidence for oscillating', () => {
      const strategy = { approach: 'pivot' };
      const situation = { oscillating: true };

      const confidence = planner._calculateConfidence(strategy, situation);

      expect(confidence).toBeLessThan(0.8);
    });
  });

  describe('plan', () => {
    it('should return complete plan', () => {
      const history = [
        { analysis: { completionPercentage: 40 } },
      ];
      const metrics = { trend: 'improving' };

      const plan = planner.plan(history, metrics);

      expect(plan).toHaveProperty('approach');
      expect(plan).toHaveProperty('reasoning');
      expect(plan).toHaveProperty('priorities');
      expect(plan).toHaveProperty('adjustments');
      expect(plan).toHaveProperty('confidence');
      expect(plan).toHaveProperty('metadata');
    });

    it('should handle first iteration', () => {
      const plan = planner.plan([], { trend: 'unknown' });

      expect(plan.approach).toBe('persist');
      expect(plan.metadata.iterationCount).toBe(0);
    });

    it('should adapt to stuck situation', () => {
      const history = [
        { analysis: { completionPercentage: 30 } },
        { analysis: { completionPercentage: 31 } },
        { analysis: { completionPercentage: 30 } },
        { analysis: { completionPercentage: 31 } },
      ];

      const plan = planner.plan(history, {});

      expect(plan.approach).toBe('pivot');
      expect(plan.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('shouldEscalate', () => {
    it('should escalate after escalation threshold', () => {
      const history = Array.from({ length: 8 }, (_, i) => ({
        analysis: { completionPercentage: 40 + i },
      }));

      expect(planner.shouldEscalate(history, {})).toBe(true);
    });

    it('should escalate on stuck for too long', () => {
      const history = Array.from({ length: 6 }, () => ({
        analysis: { completionPercentage: 30 },
      }));

      const situation = planner._analyzeSituation(history, {});
      expect(situation.stuck).toBe(true);
      expect(planner.shouldEscalate(history, {})).toBe(true);
    });

    it('should escalate on regressing for multiple iterations', () => {
      const history = Array.from({ length: 5 }, () => ({
        analysis: { completionPercentage: 40 },
      }));

      expect(planner.shouldEscalate(history, { trend: 'regressing' })).toBe(true);
    });

    it('should not escalate on good progress', () => {
      const history = [
        { analysis: { completionPercentage: 30 } },
        { analysis: { completionPercentage: 50 } },
      ];

      expect(planner.shouldEscalate(history, { trend: 'improving' })).toBe(false);
    });
  });

  describe('getSummary', () => {
    it('should return summary of plan', () => {
      const plan = {
        approach: 'pivot',
        reasoning: 'Stuck detected',
        confidence: 0.85,
        priorities: ['Task 1', 'Task 2', 'Task 3'],
      };

      const summary = planner.getSummary(plan);

      expect(summary).toContain('PIVOT');
      expect(summary).toContain('85%');
      expect(summary).toContain('Stuck detected');
      expect(summary).toContain('Task 1');
    });
  });

  describe('formatMarkdown', () => {
    it('should format plan as markdown', () => {
      const plan = {
        approach: 'pivot',
        reasoning: 'Blockers detected',
        confidence: 0.9,
        priorities: ['Fix blocker 1', 'Fix blocker 2'],
        adjustments: { focus: 'blocker_resolution' },
      };

      const formatted = planner.formatMarkdown(plan);

      expect(formatted).toContain('## Strategy Plan');
      expect(formatted).toContain('**Approach:** pivot');
      expect(formatted).toContain('**Confidence:** 90%');
      expect(formatted).toContain('Blockers detected');
      expect(formatted).toContain('Fix blocker 1');
      expect(formatted).toContain('### Adjustments');
      expect(formatted).toContain('**focus:**');
    });

    it('should format plan without adjustments', () => {
      const plan = {
        approach: 'persist',
        reasoning: 'Good progress',
        confidence: 0.8,
        priorities: ['Continue'],
        adjustments: {},
      };

      const formatted = planner.formatMarkdown(plan);

      expect(formatted).toContain('**Approach:** persist');
      expect(formatted).not.toContain('### Adjustments');
    });
  });

  describe('integration scenarios', () => {
    it('should handle normal progress', () => {
      const history = [
        { analysis: { completionPercentage: 30 } },
        { analysis: { completionPercentage: 50 } },
        { analysis: { completionPercentage: 70 } },
      ];
      const metrics = { trend: 'improving' };

      const plan = planner.plan(history, metrics);

      expect(plan.approach).toBe('persist');
      expect(plan.confidence).toBeGreaterThan(0.7);
      expect(planner.shouldEscalate(history, metrics)).toBe(false);
    });

    it('should handle stuck then pivot', () => {
      const history = [
        { analysis: { completionPercentage: 40 } },
        { analysis: { completionPercentage: 41 } },
        { analysis: { completionPercentage: 40 } },
        { analysis: { completionPercentage: 41 } },
      ];

      const plan = planner.plan(history, { trend: 'stable' });

      expect(plan.approach).toBe('pivot');
      expect(plan.priorities.some(p => p.includes('different approach'))).toBe(true);
    });

    it('should handle near completion scenario', () => {
      const history = [
        { analysis: { completionPercentage: 50 } },
        { analysis: { completionPercentage: 70 } },
        { analysis: { completionPercentage: 85 } },
      ];

      const plan = planner.plan(history, { trend: 'improving' });

      expect(plan.approach).toBe('persist');
      expect(plan.priorities.some(p => p.includes('Complete remaining'))).toBe(true);
    });

    it('should handle blocker scenario', () => {
      const history = [
        {
          analysis: { completionPercentage: 60 },
          blockers: ['Test failure in auth module'],
        },
      ];

      const plan = planner.plan(history, {});

      expect(plan.approach).toBe('pivot');
      expect(plan.confidence).toBeGreaterThan(0.85);
    });

    it('should handle repeated issue scenario', () => {
      const history = [
        { blockers: ['Database connection timeout'] },
        { blockers: ['Database connection timeout'] },
        { blockers: ['Database connection timeout'] },
      ];

      const plan = planner.plan(history, {});

      expect(plan.priorities[0]).toContain('Database connection timeout');
    });
  });
});
