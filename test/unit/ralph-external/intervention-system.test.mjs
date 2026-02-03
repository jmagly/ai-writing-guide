/**
 * Tests for Intervention System
 *
 * @implements Issue #25 - Autonomous Overseer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InterventionSystem, INTERVENTION_LEVELS } from '../../../tools/ralph-external/lib/intervention-system.mjs';

describe('InterventionSystem', () => {
  let system;
  let onIntervention;
  let onPause;
  let onAbort;

  beforeEach(() => {
    onIntervention = vi.fn();
    onPause = vi.fn();
    onAbort = vi.fn();

    system = new InterventionSystem({
      onIntervention,
      onPause,
      onAbort,
    });
  });

  describe('constructor', () => {
    it('should initialize with default callbacks', () => {
      const defaultSystem = new InterventionSystem();
      expect(defaultSystem.interventionLog).toEqual([]);
      expect(defaultSystem.isPaused).toBe(false);
    });
  });

  describe('determineLevel', () => {
    it('should map critical + resource_burn to ABORT', () => {
      const detection = { severity: 'critical', type: 'resource_burn' };
      const level = system.determineLevel(detection);
      expect(level).toBe(INTERVENTION_LEVELS.ABORT);
    });

    it('should map critical + regression to ABORT', () => {
      const detection = { severity: 'critical', type: 'regression' };
      const level = system.determineLevel(detection);
      expect(level).toBe(INTERVENTION_LEVELS.ABORT);
    });

    it('should map critical (other types) to PAUSE', () => {
      const detection = { severity: 'critical', type: 'stuck' };
      const level = system.determineLevel(detection);
      expect(level).toBe(INTERVENTION_LEVELS.PAUSE);
    });

    it('should map high + stuck to REDIRECT', () => {
      const detection = { severity: 'high', type: 'stuck' };
      const level = system.determineLevel(detection);
      expect(level).toBe(INTERVENTION_LEVELS.REDIRECT);
    });

    it('should map high + oscillation to REDIRECT', () => {
      const detection = { severity: 'high', type: 'oscillation' };
      const level = system.determineLevel(detection);
      expect(level).toBe(INTERVENTION_LEVELS.REDIRECT);
    });

    it('should map high (other types) to WARN', () => {
      const detection = { severity: 'high', type: 'deviation' };
      const level = system.determineLevel(detection);
      expect(level).toBe(INTERVENTION_LEVELS.WARN);
    });

    it('should map medium to WARN', () => {
      const detection = { severity: 'medium', type: 'any' };
      const level = system.determineLevel(detection);
      expect(level).toBe(INTERVENTION_LEVELS.WARN);
    });

    it('should map low to LOG', () => {
      const detection = { severity: 'low', type: 'any' };
      const level = system.determineLevel(detection);
      expect(level).toBe(INTERVENTION_LEVELS.LOG);
    });
  });

  describe('intervene', () => {
    it('should create LOG intervention', () => {
      const detection = {
        type: 'info',
        severity: 'low',
        message: 'Minor observation',
      };

      const intervention = system.intervene(detection);

      expect(intervention.level).toBe(INTERVENTION_LEVELS.LOG);
      expect(intervention.action).toBeDefined();
      expect(onIntervention).toHaveBeenCalledWith(intervention);
    });

    it('should create WARN intervention with warning message', () => {
      const detection = {
        type: 'deviation',
        severity: 'medium',
        message: 'Objective drift detected',
        recommendations: ['Realign with objective'],
      };

      const intervention = system.intervene(detection);

      expect(intervention.level).toBe(INTERVENTION_LEVELS.WARN);
      expect(intervention.warning).toBeDefined();
      expect(intervention.warning).toContain('Objective drift detected');
      expect(intervention.warning).toContain('Realign with objective');
    });

    it('should create REDIRECT intervention with strategy override', () => {
      const detection = {
        type: 'stuck',
        severity: 'high',
        message: 'Loop stuck',
        evidence: { repeatedError: 'TypeError', occurrences: 4 },
      };

      const intervention = system.intervene(detection);

      expect(intervention.level).toBe(INTERVENTION_LEVELS.REDIRECT);
      expect(intervention.strategyOverride).toBeDefined();
      expect(intervention.strategyOverride).toContain('OVERRIDE');
      expect(intervention.strategyOverride).toContain('TypeError');
    });

    it('should create PAUSE intervention and set paused state', () => {
      const detection = {
        type: 'critical_issue',
        severity: 'critical',
        message: 'Critical issue detected',
      };

      const intervention = system.intervene(detection);

      expect(intervention.level).toBe(INTERVENTION_LEVELS.PAUSE);
      expect(intervention.requiresApproval).toBe(true);
      expect(system.isPaused).toBe(true);
      expect(system.pauseReason).toBe('Critical issue detected');
      expect(onPause).toHaveBeenCalledWith(intervention);
    });

    it('should create ABORT intervention', () => {
      const detection = {
        type: 'resource_burn',
        severity: 'critical',
        message: 'Resource budget exceeded',
      };

      const intervention = system.intervene(detection);

      expect(intervention.level).toBe(INTERVENTION_LEVELS.ABORT);
      expect(intervention.requiresApproval).toBe(true);
      expect(intervention.abortReason).toBe('Resource budget exceeded');
      expect(onAbort).toHaveBeenCalledWith(intervention);
    });

    it('should add intervention to log', () => {
      const detection = { type: 'test', severity: 'low', message: 'Test' };

      system.intervene(detection);

      expect(system.interventionLog.length).toBe(1);
      expect(system.interventionLog[0].detection).toBe(detection);
    });

    it('should keep log bounded to 100 entries', () => {
      const detection = { type: 'test', severity: 'low', message: 'Test' };

      for (let i = 0; i < 150; i++) {
        system.intervene(detection);
      }

      expect(system.interventionLog.length).toBe(100);
    });
  });

  describe('buildWarning', () => {
    it('should build warning for stuck loop', () => {
      const detection = {
        type: 'stuck',
        message: 'Loop stuck',
        recommendations: ['Change approach'],
      };

      const warning = system.buildWarning(detection);

      expect(warning).toContain('⚠️ OVERSEER WARNING');
      expect(warning).toContain('Loop stuck');
      expect(warning).toContain('Change approach');
      expect(warning).toContain('same error repeatedly');
    });

    it('should build warning for oscillation', () => {
      const detection = {
        type: 'oscillation',
        message: 'Oscillation detected',
        recommendations: ['Commit to one approach'],
      };

      const warning = system.buildWarning(detection);

      expect(warning).toContain('undoing and redoing');
      expect(warning).toContain('Pick one direction');
    });

    it('should build warning for deviation', () => {
      const detection = {
        type: 'deviation',
        message: 'Objective deviation',
        recommendations: ['Refocus'],
      };

      const warning = system.buildWarning(detection);

      expect(warning).toContain('drifted from the original objective');
    });

    it('should build warning for resource burn', () => {
      const detection = {
        type: 'resource_burn',
        message: 'Budget exceeded',
        recommendations: ['Focus on critical work'],
      };

      const warning = system.buildWarning(detection);

      expect(warning).toContain('approaching your iteration budget');
    });

    it('should build warning for regression', () => {
      const detection = {
        type: 'regression',
        message: 'Tests failing',
        recommendations: ['Fix the code'],
      };

      const warning = system.buildWarning(detection);

      expect(warning).toContain('Fix the code, not the tests');
    });
  });

  describe('buildStrategyOverride', () => {
    it('should build override for stuck loop', () => {
      const detection = {
        type: 'stuck',
        evidence: { repeatedError: 'NullPointerException', occurrences: 5 },
      };

      const override = system.buildStrategyOverride(detection);

      expect(override).toContain('OVERRIDE');
      expect(override).toContain('Change approach immediately');
      expect(override).toContain('NullPointerException');
      expect(override).toContain('5 times');
    });

    it('should build override for oscillation', () => {
      const detection = {
        type: 'oscillation',
        evidence: {},
      };

      const override = system.buildStrategyOverride(detection);

      expect(override).toContain('Stop alternating');
      expect(override).toContain('No more back-and-forth');
    });

    it('should build override for deviation', () => {
      const detection = {
        type: 'deviation',
        evidence: { originalObjective: 'Fix authentication bug' },
      };

      const override = system.buildStrategyOverride(detection);

      expect(override).toContain('Return to original objective');
      expect(override).toContain('Fix authentication bug');
    });
  });

  describe('injectWarning', () => {
    it('should prepend warning to prompt', () => {
      const prompt = 'Please fix the bug';
      const warning = 'WARNING: You are stuck';

      const modified = system.injectWarning(prompt, warning);

      expect(modified).toContain(warning);
      expect(modified).toContain(prompt);
      expect(modified.indexOf(warning)).toBeLessThan(modified.indexOf(prompt));
    });

    it('should include clear demarcation', () => {
      const prompt = 'Task';
      const warning = 'Warning';

      const modified = system.injectWarning(prompt, warning);

      expect(modified).toContain('='.repeat(80));
      expect(modified).toContain('ORIGINAL TASK:');
    });
  });

  describe('resume', () => {
    it('should resume from paused state', () => {
      // First pause
      system.isPaused = true;
      system.pauseReason = 'Critical issue';

      const success = system.resume('Issue resolved');

      expect(success).toBe(true);
      expect(system.isPaused).toBe(false);
      expect(system.pauseReason).toBeNull();
    });

    it('should log resume event', () => {
      system.isPaused = true;
      system.pauseReason = 'Critical issue';

      system.resume('Issue resolved');

      const lastLog = system.interventionLog[system.interventionLog.length - 1];
      expect(lastLog.level).toBe('resume');
      expect(lastLog.reason).toBe('Issue resolved');
    });

    it('should return false if not paused', () => {
      const success = system.resume('Not paused');
      expect(success).toBe(false);
    });
  });

  describe('getPauseStatus', () => {
    it('should return pause status', () => {
      system.isPaused = true;
      system.pauseReason = 'Test pause';

      const status = system.getPauseStatus();

      expect(status.isPaused).toBe(true);
      expect(status.reason).toBe('Test pause');
    });
  });

  describe('getLog', () => {
    it('should return full log', () => {
      system.interventionLog = [{ level: 'log' }, { level: 'warn' }];

      const log = system.getLog();

      expect(log.length).toBe(2);
      expect(log).toEqual(system.interventionLog);
    });

    it('should return limited log', () => {
      system.interventionLog = [
        { level: 'log' },
        { level: 'warn' },
        { level: 'pause' },
      ];

      const log = system.getLog(2);

      expect(log.length).toBe(2);
      expect(log[0].level).toBe('warn');
      expect(log[1].level).toBe('pause');
    });
  });

  describe('getSummary', () => {
    it('should summarize interventions', () => {
      system.interventionLog = [
        { level: 'log', detection: { type: 'stuck' } },
        { level: 'warn', detection: { type: 'oscillation' } },
        { level: 'warn', detection: { type: 'stuck' } },
      ];

      const summary = system.getSummary();

      expect(summary.total).toBe(3);
      expect(summary.byLevel.log).toBe(1);
      expect(summary.byLevel.warn).toBe(2);
      expect(summary.byType.stuck).toBe(2);
      expect(summary.byType.oscillation).toBe(1);
    });
  });

  describe('state persistence', () => {
    it('should export state', () => {
      system.interventionLog = [{ level: 'log' }];
      system.isPaused = true;
      system.pauseReason = 'Test';

      const state = system.exportState();

      expect(state.interventionLog).toEqual([{ level: 'log' }]);
      expect(state.isPaused).toBe(true);
      expect(state.pauseReason).toBe('Test');
    });

    it('should import state', () => {
      const state = {
        interventionLog: [{ level: 'warn' }],
        isPaused: true,
        pauseReason: 'Imported',
      };

      system.importState(state);

      expect(system.interventionLog).toEqual([{ level: 'warn' }]);
      expect(system.isPaused).toBe(true);
      expect(system.pauseReason).toBe('Imported');
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      system.interventionLog = [{ level: 'log' }];
      system.isPaused = true;
      system.pauseReason = 'Test';

      system.reset();

      expect(system.interventionLog).toEqual([]);
      expect(system.isPaused).toBe(false);
      expect(system.pauseReason).toBeNull();
    });
  });
});
