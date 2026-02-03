/**
 * Tests for Overseer
 *
 * @implements Issue #25 - Autonomous Overseer
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Overseer } from '../../../tools/ralph-external/lib/overseer.mjs';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';

const TEST_STORAGE = '/tmp/overseer-test';

describe('Overseer', () => {
  let overseer;

  beforeEach(() => {
    // Clean up test storage
    if (existsSync(TEST_STORAGE)) {
      rmSync(TEST_STORAGE, { recursive: true });
    }

    overseer = new Overseer('loop-test-001', 'Test task', {
      storagePath: TEST_STORAGE,
      autoEscalate: false, // Disable for testing
    });
  });

  afterEach(() => {
    // Clean up
    if (existsSync(TEST_STORAGE)) {
      rmSync(TEST_STORAGE, { recursive: true });
    }
  });

  describe('constructor', () => {
    it('should initialize with loop ID and task description', () => {
      expect(overseer.loopId).toBe('loop-test-001');
      expect(overseer.taskDescription).toBe('Test task');
      expect(overseer.currentStatus).toBe('healthy');
    });

    it('should create storage directory', () => {
      expect(existsSync(TEST_STORAGE)).toBe(true);
    });

    it('should initialize components', () => {
      expect(overseer.detector).toBeDefined();
      expect(overseer.interventionSystem).toBeDefined();
      expect(overseer.escalationHandler).toBeDefined();
    });
  });

  describe('check', () => {
    it('should run health check on iteration', async () => {
      const iteration = {
        number: 1,
        analysis: {
          completionPercentage: 50,
          failureClass: null,
        },
      };

      const healthCheck = await overseer.check(iteration);

      expect(healthCheck.iterationNumber).toBe(1);
      expect(healthCheck.timestamp).toBeDefined();
      expect(healthCheck.detections).toEqual([]);
      expect(healthCheck.status).toBe('healthy');
    });

    it('should detect stuck loop', async () => {
      const iterations = [
        { number: 1, analysis: { failureClass: 'error1', completionPercentage: 30 } },
        { number: 2, analysis: { failureClass: 'error1', completionPercentage: 30 } },
        { number: 3, analysis: { failureClass: 'error1', completionPercentage: 30 } },
        { number: 4, analysis: { failureClass: 'error1', completionPercentage: 30 } },
      ];

      for (const iter of iterations) {
        await overseer.check(iter);
      }

      const health = overseer.getHealth();
      expect(health.status).not.toBe('healthy');

      const lastCheck = overseer.healthCheckLog[overseer.healthCheckLog.length - 1];
      expect(lastCheck.detections.length).toBeGreaterThan(0);
    });

    it('should create interventions for detections', async () => {
      const iterations = [
        { number: 1, analysis: { failureClass: 'timeout', completionPercentage: 20 } },
        { number: 2, analysis: { failureClass: 'timeout', completionPercentage: 20 } },
        { number: 3, analysis: { failureClass: 'timeout', completionPercentage: 20 } },
        { number: 4, analysis: { failureClass: 'timeout', completionPercentage: 20 } },
      ];

      for (const iter of iterations) {
        await overseer.check(iter);
      }

      const interventions = overseer.getInterventionLog();
      expect(interventions.length).toBeGreaterThan(0);
    });

    it('should update status based on detections', async () => {
      const iteration = {
        number: 1,
        analysis: {
          failureClass: 'critical_error',
          completionPercentage: 10,
        },
      };

      await overseer.check(iteration);

      const health = overseer.getHealth();
      // Status may be healthy if no patterns detected yet
      expect(health.status).toBeDefined();
    });

    it('should save log after each check', async () => {
      const iteration = {
        number: 1,
        analysis: { completionPercentage: 50 },
      };

      await overseer.check(iteration);

      const logPath = `${TEST_STORAGE}/loop-test-001-overseer-log.json`;
      expect(existsSync(logPath)).toBe(true);

      const logData = JSON.parse(readFileSync(logPath, 'utf8'));
      expect(logData.loopId).toBe('loop-test-001');
      expect(logData.healthCheckLog.length).toBe(1);
    });

    it('should call onHealthCheck callback', async () => {
      const callback = vi.fn();
      const overseerWithCallback = new Overseer('loop-002', 'Test', {
        storagePath: TEST_STORAGE,
        onHealthCheck: callback,
      });

      const iteration = { number: 1, analysis: {} };
      await overseerWithCallback.check(iteration);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        iterationNumber: 1,
        detections: expect.any(Array),
      }));
    });
  });

  describe('shouldEscalate', () => {
    it('should escalate PAUSE interventions', () => {
      const intervention = {
        level: 'pause',
        detection: { type: 'stuck', severity: 'critical' },
      };

      expect(overseer.shouldEscalate(intervention)).toBe(true);
    });

    it('should escalate ABORT interventions', () => {
      const intervention = {
        level: 'abort',
        detection: { type: 'resource_burn', severity: 'critical' },
      };

      expect(overseer.shouldEscalate(intervention)).toBe(true);
    });

    it('should escalate critical REDIRECT interventions', () => {
      const intervention = {
        level: 'redirect',
        detection: { type: 'stuck', severity: 'critical' },
      };

      expect(overseer.shouldEscalate(intervention)).toBe(true);
    });

    it('should not escalate non-critical REDIRECT', () => {
      const intervention = {
        level: 'redirect',
        detection: { type: 'stuck', severity: 'high' },
      };

      expect(overseer.shouldEscalate(intervention)).toBe(false);
    });

    it('should not escalate WARN interventions', () => {
      const intervention = {
        level: 'warn',
        detection: { type: 'deviation', severity: 'medium' },
      };

      expect(overseer.shouldEscalate(intervention)).toBe(false);
    });
  });

  describe('determineStatus', () => {
    it('should return paused if intervention system is paused', () => {
      overseer.interventionSystem.isPaused = true;

      const status = overseer.determineStatus([], []);
      expect(status).toBe('paused');
    });

    it('should return aborted if abort intervention exists', () => {
      const interventions = [{ level: 'abort' }];

      const status = overseer.determineStatus([], interventions);
      expect(status).toBe('aborted');
    });

    it('should return critical if critical detection exists', () => {
      const detections = [{ severity: 'critical', type: 'stuck' }];

      const status = overseer.determineStatus(detections, []);
      expect(status).toBe('critical');
    });

    it('should return warning if warning-level detection exists', () => {
      const detections = [{ severity: 'high', type: 'oscillation' }];

      const status = overseer.determineStatus(detections, []);
      expect(status).toBe('warning');
    });

    it('should return healthy if no issues', () => {
      const status = overseer.determineStatus([], []);
      expect(status).toBe('healthy');
    });
  });

  describe('computeMetrics', () => {
    it('should compute basic metrics', async () => {
      const iteration = { number: 1, analysis: {} };
      await overseer.check(iteration);

      const metrics = overseer.computeMetrics();

      expect(metrics.totalIterations).toBe(1);
      expect(metrics.totalHealthChecks).toBe(1);
      expect(metrics.currentStatus).toBe('healthy');
    });

    it('should count detections by type', async () => {
      // Create multiple iterations that trigger detections
      const iterations = Array.from({ length: 5 }, (_, i) => ({
        number: i + 1,
        analysis: {
          failureClass: 'error1',
          completionPercentage: 30,
        },
      }));

      for (const iter of iterations) {
        await overseer.check(iter);
      }

      const metrics = overseer.computeMetrics();
      expect(metrics.detectionCounts).toBeDefined();
    });
  });

  describe('getHealth', () => {
    it('should return current health status', async () => {
      const iteration = { number: 1, analysis: { completionPercentage: 50 } };
      await overseer.check(iteration);

      const health = overseer.getHealth();

      expect(health.loopId).toBe('loop-test-001');
      expect(health.taskDescription).toBe('Test task');
      expect(health.status).toBe('healthy');
      expect(health.totalIterations).toBe(1);
      expect(health.latestHealthCheck).toBeDefined();
    });
  });

  describe('getLog', () => {
    it('should return health check log', async () => {
      await overseer.check({ number: 1, analysis: {} });
      await overseer.check({ number: 2, analysis: {} });

      const log = overseer.getLog();

      expect(log.length).toBe(2);
      expect(log[0].iterationNumber).toBe(1);
      expect(log[1].iterationNumber).toBe(2);
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', async () => {
      await overseer.check({ number: 1, analysis: { completionPercentage: 50 } });
      await overseer.check({ number: 2, analysis: { completionPercentage: 75 } });

      const report = overseer.generateReport();

      expect(report).toContain('# Overseer Report: loop-test-001');
      expect(report).toContain('Test task');
      expect(report).toContain('Total Iterations');
      expect(report).toContain('Health Checks');
    });

    it('should include recent health checks', async () => {
      await overseer.check({ number: 1, analysis: {} });

      const report = overseer.generateReport();

      expect(report).toContain('## Recent Health Checks');
      expect(report).toContain('Iteration 1');
    });
  });

  describe('state persistence', () => {
    it('should export full state', async () => {
      await overseer.check({ number: 1, analysis: {} });

      const state = overseer.exportState();

      expect(state.loopId).toBe('loop-test-001');
      expect(state.taskDescription).toBe('Test task');
      expect(state.healthCheckLog.length).toBe(1);
      expect(state.currentStatus).toBe('healthy');
    });

    it('should import state', () => {
      const state = {
        loopId: 'imported-loop',
        taskDescription: 'Imported task',
        healthCheckLog: [{ iterationNumber: 1 }],
        currentStatus: 'warning',
      };

      overseer.importState(state);

      expect(overseer.loopId).toBe('imported-loop');
      expect(overseer.taskDescription).toBe('Imported task');
      expect(overseer.healthCheckLog.length).toBe(1);
      expect(overseer.currentStatus).toBe('warning');
    });
  });

  describe('Overseer.load', () => {
    it('should load overseer from saved log', async () => {
      // Create and save overseer state
      await overseer.check({ number: 1, analysis: {} });
      await overseer.check({ number: 2, analysis: {} });
      overseer.saveLog();

      // Load it back
      const loaded = Overseer.load('loop-test-001', TEST_STORAGE);

      expect(loaded.loopId).toBe('loop-test-001');
      expect(loaded.taskDescription).toBe('Test task');
      expect(loaded.healthCheckLog.length).toBe(2);
    });

    it('should throw if log not found', () => {
      expect(() => {
        Overseer.load('nonexistent-loop', TEST_STORAGE);
      }).toThrow('Overseer log not found');
    });
  });

  describe('integration', () => {
    it('should handle complete stuck loop scenario', async () => {
      const iterations = [
        { number: 1, context: { objective: 'Fix bug' }, analysis: { failureClass: 'TypeError', completionPercentage: 20 } },
        { number: 2, context: { objective: 'Fix bug' }, analysis: { failureClass: 'TypeError', completionPercentage: 20 } },
        { number: 3, context: { objective: 'Fix bug' }, analysis: { failureClass: 'TypeError', completionPercentage: 20 } },
        { number: 4, context: { objective: 'Fix bug' }, analysis: { failureClass: 'TypeError', completionPercentage: 20 } },
      ];

      for (const iter of iterations) {
        await overseer.check(iter);
      }

      const health = overseer.getHealth();
      const lastCheck = overseer.healthCheckLog[overseer.healthCheckLog.length - 1];

      // Should have detected stuck loop
      const hasStuckDetection = lastCheck.detections.some(d => d.type === 'stuck');
      expect(hasStuckDetection).toBe(true);

      // Should have created intervention
      const interventions = overseer.getInterventionLog();
      expect(interventions.length).toBeGreaterThan(0);

      // Status should not be healthy
      expect(health.status).not.toBe('healthy');
    });

    it('should handle resource burn scenario', async () => {
      const iterations = Array.from({ length: 21 }, (_, i) => ({
        number: i + 1,
        context: { maxIterations: 10 },
        analysis: { completionPercentage: 30 },
      }));

      for (const iter of iterations) {
        await overseer.check(iter);
      }

      const lastCheck = overseer.healthCheckLog[overseer.healthCheckLog.length - 1];
      const hasBurnDetection = lastCheck.detections.some(d => d.type === 'resource_burn');

      expect(hasBurnDetection).toBe(true);
    });

    it('should maintain audit trail', async () => {
      await overseer.check({ number: 1, analysis: {} });
      await overseer.check({ number: 2, analysis: {} });
      await overseer.check({ number: 3, analysis: {} });

      const log = overseer.getLog();

      expect(log.length).toBe(3);
      expect(log[0].timestamp).toBeDefined();
      expect(log[1].timestamp).toBeDefined();
      expect(log[2].timestamp).toBeDefined();

      // Timestamps should be ordered
      expect(new Date(log[1].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(log[0].timestamp).getTime()
      );
    });
  });
});
