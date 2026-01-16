/**
 * Unit tests for External Ralph Loop Recovery Engine
 *
 * @source @tools/ralph-external/recovery-engine.mjs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import the module under test
// @ts-ignore - ESM import
import { RecoveryEngine } from '../../../tools/ralph-external/recovery-engine.mjs';
// @ts-ignore - ESM import
import { StateManager } from '../../../tools/ralph-external/state-manager.mjs';

describe('RecoveryEngine', () => {
  let testDir: string;
  let recoveryEngine: InstanceType<typeof RecoveryEngine>;
  let stateManager: InstanceType<typeof StateManager>;

  beforeEach(() => {
    testDir = join(tmpdir(), `ralph-external-recovery-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    recoveryEngine = new RecoveryEngine(testDir);
    stateManager = new StateManager(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should initialize with project root', () => {
      expect(recoveryEngine.projectRoot).toBe(testDir);
    });

    it('should create state manager', () => {
      expect(recoveryEngine.stateManager).toBeDefined();
    });

    it('should set internal ralph state path', () => {
      expect(recoveryEngine.internalRalphStatePath).toContain('.aiwg');
      expect(recoveryEngine.internalRalphStatePath).toContain('ralph');
    });
  });

  describe('readInternalRalphState', () => {
    it('should return null when no internal state exists', () => {
      expect(recoveryEngine.readInternalRalphState()).toBeNull();
    });

    it('should return parsed state when file exists', () => {
      const internalRalphDir = join(testDir, '.aiwg', 'ralph');
      mkdirSync(internalRalphDir, { recursive: true });
      writeFileSync(
        join(internalRalphDir, 'current-loop.json'),
        JSON.stringify({ active: true, task: 'Fix tests' })
      );

      const state = recoveryEngine.readInternalRalphState();
      expect(state).toEqual({ active: true, task: 'Fix tests' });
    });

    it('should return null when file is corrupted', () => {
      const internalRalphDir = join(testDir, '.aiwg', 'ralph');
      mkdirSync(internalRalphDir, { recursive: true });
      writeFileSync(join(internalRalphDir, 'current-loop.json'), 'not json');

      expect(recoveryEngine.readInternalRalphState()).toBeNull();
    });
  });

  describe('isProcessAlive', () => {
    it('should return false for null pid', () => {
      expect(recoveryEngine.isProcessAlive(null)).toBe(false);
    });

    it('should return false for undefined pid', () => {
      expect(recoveryEngine.isProcessAlive(undefined)).toBe(false);
    });

    it('should return false for non-existent pid', () => {
      // Use a very high PID that likely doesn't exist
      expect(recoveryEngine.isProcessAlive(999999999)).toBe(false);
    });

    it('should return true for current process', () => {
      // Current process is always alive
      expect(recoveryEngine.isProcessAlive(process.pid)).toBe(true);
    });
  });

  describe('detectCrash', () => {
    it('should return not crashed when no state', () => {
      expect(recoveryEngine.detectCrash()).toEqual({ crashed: false });
    });

    it('should return not crashed when status is completed', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'Done',
      });
      stateManager.update({ status: 'completed' });

      expect(recoveryEngine.detectCrash()).toEqual({ crashed: false });
    });

    it('should return crashed when running but process is dead', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'Done',
      });
      stateManager.update({
        status: 'running',
        currentIteration: 2,
        currentPid: 999999999, // Non-existent PID
      });

      const result = recoveryEngine.detectCrash();
      expect(result.crashed).toBe(true);
      expect(result.iteration).toBe(2);
      expect(result.lastCheckpoint).toBe('iteration-2');
      expect(result.recoveryStrategy).toBeDefined();
    });

    it('should return not crashed when running and process is alive', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'Done',
      });
      stateManager.update({
        status: 'running',
        currentPid: process.pid, // Current process is alive
      });

      expect(recoveryEngine.detectCrash()).toEqual({ crashed: false });
    });
  });

  describe('determineRecoveryStrategy', () => {
    it('should suggest resume_internal when internal Ralph is active', () => {
      // Create internal Ralph state
      const internalRalphDir = join(testDir, '.aiwg', 'ralph');
      mkdirSync(internalRalphDir, { recursive: true });
      writeFileSync(
        join(internalRalphDir, 'current-loop.json'),
        JSON.stringify({ active: true, task: 'Fix tests', currentIteration: 3 })
      );

      const state = stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'Done',
      });

      const strategy = recoveryEngine.determineRecoveryStrategy(state);
      expect(strategy.type).toBe('resume_internal');
      expect(strategy.action).toContain('Resume internal Ralph');
      expect(strategy.prompt).toContain('/ralph-status');
    });

    it('should suggest continue_external when analysis says continue', () => {
      const state = stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'Done',
      });

      stateManager.addIteration({
        number: 1,
        analysis: {
          shouldContinue: true,
          completionPercentage: 50,
          learnings: 'Made progress',
          nextApproach: 'Continue',
        },
      } as any);

      const updatedState = stateManager.load()!;
      const strategy = recoveryEngine.determineRecoveryStrategy(updatedState);
      expect(strategy.type).toBe('continue_external');
      expect(strategy.action).toContain('Continue');
    });

    it('should suggest restart when no other options', () => {
      const state = stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'Done',
      });

      const strategy = recoveryEngine.determineRecoveryStrategy(state);
      expect(strategy.type).toBe('restart');
      expect(strategy.action).toContain('Restart');
    });
  });

  describe('buildInternalResumePrompt', () => {
    it('should include external loop context', () => {
      const externalState = {
        loopId: 'ext-123',
        currentIteration: 2,
        objective: 'Fix bugs',
        accumulatedLearnings: 'Found root cause',
      };
      const internalState = { currentIteration: 5, task: 'Refactor' };

      const prompt = recoveryEngine.buildInternalResumePrompt(externalState, internalState);

      expect(prompt).toContain('ext-123');
      expect(prompt).toContain('Fix bugs');
      expect(prompt).toContain('/ralph-status');
      expect(prompt).toContain('/ralph-resume');
      expect(prompt).toContain('Found root cause');
    });
  });

  describe('buildContinuationPrompt', () => {
    it('should include state context', () => {
      const state = {
        loopId: 'loop-456',
        objective: 'Add feature',
        completionCriteria: 'Tests pass',
      };
      const lastAnalysis = {
        completionPercentage: 75,
        learnings: 'Almost done',
        nextApproach: 'Fix last test',
        blockers: ['Flaky test'],
      };

      const prompt = recoveryEngine.buildContinuationPrompt(state, lastAnalysis);

      expect(prompt).toContain('loop-456');
      expect(prompt).toContain('Add feature');
      expect(prompt).toContain('75%');
      expect(prompt).toContain('Almost done');
      expect(prompt).toContain('Fix last test');
      expect(prompt).toContain('Flaky test');
    });
  });

  describe('buildRestartPrompt', () => {
    it('should include accumulated learnings', () => {
      const state = {
        loopId: 'loop-789',
        objective: 'Migrate database',
        completionCriteria: 'Migration completes',
        currentIteration: 3,
        accumulatedLearnings: 'Backup first',
        filesModified: ['db/schema.sql', 'migrations/001.sql'],
      };

      const prompt = recoveryEngine.buildRestartPrompt(state);

      expect(prompt).toContain('loop-789');
      expect(prompt).toContain('Migrate database');
      expect(prompt).toContain('3');
      expect(prompt).toContain('Backup first');
      expect(prompt).toContain('db/schema.sql');
      expect(prompt).toContain('/ralph');
    });
  });

  describe('recover', () => {
    it('should return null when no crash detected', () => {
      expect(recoveryEngine.recover()).toBeNull();
    });

    it('should return recovery context when crash detected', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'Done',
      });
      stateManager.update({
        status: 'running',
        currentIteration: 2,
        currentPid: 999999999,
      });

      const recovery = recoveryEngine.recover();

      expect(recovery).not.toBeNull();
      expect(recovery?.state).toBeDefined();
      expect(recovery?.strategy).toBeDefined();

      // State should be updated to 'recovering'
      const state = stateManager.load();
      expect(state?.status).toBe('recovering');
    });
  });

  describe('markRecovered', () => {
    it('should update status to running', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'Done',
      });
      stateManager.update({ status: 'recovering' });

      recoveryEngine.markRecovered();

      const state = stateManager.load();
      expect(state?.status).toBe('running');
    });

    it('should not change status if not recovering', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'Done',
      });
      stateManager.update({ status: 'completed' });

      recoveryEngine.markRecovered();

      const state = stateManager.load();
      expect(state?.status).toBe('completed');
    });

    it('should handle no state', () => {
      expect(() => recoveryEngine.markRecovered()).not.toThrow();
    });
  });
});
