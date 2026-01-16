/**
 * Unit tests for External Ralph Loop State Manager
 *
 * @source @tools/ralph-external/state-manager.mjs
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import the module under test
// @ts-ignore - ESM import
import { StateManager } from '../../../tools/ralph-external/state-manager.mjs';

describe('StateManager', () => {
  let testDir: string;
  let stateManager: InstanceType<typeof StateManager>;

  beforeEach(() => {
    // Create unique test directory
    testDir = join(tmpdir(), `ralph-external-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    stateManager = new StateManager(testDir);
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initialize', () => {
    it('should create initial state with required fields', () => {
      const state = stateManager.initialize({
        objective: 'Fix tests',
        completionCriteria: 'npm test passes',
      });

      expect(state.version).toBe('1.0.0');
      expect(state.objective).toBe('Fix tests');
      expect(state.completionCriteria).toBe('npm test passes');
      expect(state.status).toBe('running');
      expect(state.currentIteration).toBe(0);
      expect(state.iterations).toEqual([]);
      expect(state.loopId).toBeDefined();
      expect(state.sessionId).toBeDefined();
    });

    it('should create state directory structure', () => {
      stateManager.initialize({
        objective: 'Test task',
        completionCriteria: 'criteria',
      });

      const stateDir = join(testDir, '.aiwg', 'ralph-external');
      expect(existsSync(stateDir)).toBe(true);
      expect(existsSync(join(stateDir, 'iterations'))).toBe(true);
      expect(existsSync(join(stateDir, 'prompts'))).toBe(true);
      expect(existsSync(join(stateDir, 'outputs'))).toBe(true);
      expect(existsSync(join(stateDir, 'analysis'))).toBe(true);
    });

    it('should use default values for optional config', () => {
      const state = stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'done',
      });

      expect(state.maxIterations).toBe(10);
      expect(state.config.model).toBe('opus');
      expect(state.config.budgetPerIteration).toBe(2.0);
    });

    it('should accept custom config values', () => {
      const state = stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'done',
        maxIterations: 20,
        model: 'sonnet',
        budgetPerIteration: 5.0,
      });

      expect(state.maxIterations).toBe(20);
      expect(state.config.model).toBe('sonnet');
      expect(state.config.budgetPerIteration).toBe(5.0);
    });
  });

  describe('exists', () => {
    it('should return false when no state exists', () => {
      expect(stateManager.exists()).toBe(false);
    });

    it('should return true after initialization', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'done',
      });

      expect(stateManager.exists()).toBe(true);
    });
  });

  describe('save and load', () => {
    it('should save and load state correctly', () => {
      const original = stateManager.initialize({
        objective: 'Original objective',
        completionCriteria: 'test passes',
      });

      const loaded = stateManager.load();

      expect(loaded).not.toBeNull();
      expect(loaded?.loopId).toBe(original.loopId);
      expect(loaded?.objective).toBe('Original objective');
    });

    it('should update lastUpdate timestamp on save', async () => {
      const state = stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'done',
      });

      const firstUpdate = state.lastUpdate;

      // Wait a bit and save again
      await new Promise((resolve) => setTimeout(resolve, 10));
      state.status = 'paused';
      stateManager.save(state);

      const loaded = stateManager.load();
      expect(loaded?.lastUpdate).not.toBe(firstUpdate);
    });

    it('should create backup on save', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'done',
      });

      // Save again to create backup
      const state = stateManager.load()!;
      state.status = 'paused';
      stateManager.save(state);

      const backupPath = join(testDir, '.aiwg', 'ralph-external', 'session-state.json.bak');
      expect(existsSync(backupPath)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update partial state', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'done',
      });

      const updated = stateManager.update({
        status: 'paused',
        currentIteration: 5,
      });

      expect(updated.status).toBe('paused');
      expect(updated.currentIteration).toBe(5);
      expect(updated.objective).toBe('Test'); // Unchanged
    });

    it('should throw when no state exists', () => {
      expect(() => stateManager.update({ status: 'paused' })).toThrow('No existing state');
    });
  });

  describe('addIteration', () => {
    it('should add iteration record', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'done',
      });

      const state = stateManager.addIteration({
        number: 1,
        sessionId: 'test-session',
        promptFile: 'prompts/001-prompt.md',
        stdoutFile: 'outputs/001-stdout.log',
        stderrFile: 'outputs/001-stderr.log',
        exitCode: 0,
        duration: 1000,
        status: 'completed',
        analysis: { completed: false, success: null },
        learnings: ['First learning'],
        filesModified: ['file1.ts'],
        progress: 'Started',
      });

      expect(state.iterations).toHaveLength(1);
      expect(state.iterations[0].number).toBe(1);
      expect(state.iterations[0].learnings).toContain('First learning');
    });

    it('should accumulate learnings across iterations', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'done',
      });

      stateManager.addIteration({
        number: 1,
        learnings: ['Learning 1'],
        filesModified: [],
      } as any);

      const state = stateManager.addIteration({
        number: 2,
        learnings: ['Learning 2'],
        filesModified: [],
      } as any);

      expect(state.accumulatedLearnings).toContain('Learning 1');
      expect(state.accumulatedLearnings).toContain('Learning 2');
    });

    it('should merge files modified without duplicates', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'done',
      });

      stateManager.addIteration({
        number: 1,
        filesModified: ['file1.ts', 'file2.ts'],
      } as any);

      const state = stateManager.addIteration({
        number: 2,
        filesModified: ['file2.ts', 'file3.ts'],
      } as any);

      expect(state.filesModified).toHaveLength(3);
      expect(state.filesModified).toContain('file1.ts');
      expect(state.filesModified).toContain('file2.ts');
      expect(state.filesModified).toContain('file3.ts');
    });
  });

  describe('recovery from corrupted state', () => {
    it('should recover from corrupted state file using backup', () => {
      // Initialize and create backup
      const original = stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'done',
      });

      original.status = 'paused';
      stateManager.save(original);

      // Corrupt the main state file
      const statePath = join(testDir, '.aiwg', 'ralph-external', 'session-state.json');
      writeFileSync(statePath, 'corrupted data');

      // Load should recover from backup
      const recovered = stateManager.load();

      expect(recovered).not.toBeNull();
      expect(recovered?.loopId).toBe(original.loopId);
    });

    it('should throw when both state and backup are corrupted', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'done',
      });

      // Create backup first
      const state = stateManager.load()!;
      stateManager.save(state);

      // Corrupt both files
      const stateDir = join(testDir, '.aiwg', 'ralph-external');
      writeFileSync(join(stateDir, 'session-state.json'), 'corrupted');
      writeFileSync(join(stateDir, 'session-state.json.bak'), 'also corrupted');

      expect(() => stateManager.load()).toThrow();
    });
  });

  describe('path helpers', () => {
    it('should return correct iteration directory path', () => {
      const path = stateManager.getIterationDir(1);
      expect(path).toContain('001');
    });

    it('should return correct prompt path', () => {
      const path = stateManager.getPromptPath(5);
      expect(path).toContain('005-prompt.md');
    });

    it('should return correct output paths', () => {
      const paths = stateManager.getOutputPaths(10);
      expect(paths.stdout).toContain('010-stdout.log');
      expect(paths.stderr).toContain('010-stderr.log');
    });

    it('should return correct analysis path', () => {
      const path = stateManager.getAnalysisPath(3);
      expect(path).toContain('003-analysis.json');
    });
  });

  describe('clear', () => {
    it('should set status to aborted', () => {
      stateManager.initialize({
        objective: 'Test',
        completionCriteria: 'done',
      });

      stateManager.clear();

      const state = stateManager.load();
      expect(state?.status).toBe('aborted');
    });

    it('should not throw if no state exists', () => {
      expect(() => stateManager.clear()).not.toThrow();
    });
  });
});
