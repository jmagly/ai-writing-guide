/**
 * Integration tests for External Ralph Loop
 *
 * Tests the full orchestration flow with mocked Claude sessions.
 *
 * @source @tools/ralph-external/orchestrator.mjs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import modules under test
// @ts-ignore - ESM import
import { Orchestrator } from '../../tools/ralph-external/orchestrator.mjs';

describe('External Ralph Loop Integration', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `ralph-external-integration-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('execute', () => {
    it('should complete successfully on first iteration when task succeeds', async () => {
      const orchestrator = new Orchestrator(testDir);

      // Mock session launcher
      vi.spyOn(orchestrator.sessionLauncher, 'launch').mockResolvedValue({
        exitCode: 0,
        killed: false,
        pid: 12345,
      });

      // Mock output analyzer - immediate success
      vi.spyOn(orchestrator.outputAnalyzer, 'analyze').mockResolvedValue({
        completed: true,
        success: true,
        failureClass: null,
        completionPercentage: 100,
        shouldContinue: false,
        learnings: 'Task completed successfully',
        artifactsModified: ['src/feature.ts'],
        blockers: [],
        nextApproach: '',
      });

      vi.spyOn(orchestrator.stateManager, 'setCurrentPid').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await orchestrator.execute({
        objective: 'Create a test file',
        completionCriteria: 'Test file exists',
        maxIterations: 5,
        enablePIDControl: false,
        enableOverseer: false,
        enableSemanticMemory: false,
        crossTask: false,
        enableAnalytics: false,
        enableBestOutput: false,
        enableEarlyStopping: false,
        enableClaudeIntelligence: false,
        enableSnapshots: false,
        enableCheckpoints: false,
      });

      expect(result.success).toBe(true);
      expect(result.reason).toBe('Task completed successfully');
      expect(result.iterations).toBe(1);
      expect(result.loopId).toBeDefined();

      // Check state was saved
      const finalState = orchestrator.stateManager.load();
      expect(finalState?.status).toBe('completed');
    }, { timeout: 10000 });

    it('should iterate multiple times when task is incomplete', async () => {
      const orchestrator = new Orchestrator(testDir);
      let callCount = 0;

      vi.spyOn(orchestrator.sessionLauncher, 'launch').mockResolvedValue({
        exitCode: 0,
        killed: false,
        pid: 12345,
      });

      // Incomplete first 2 times, complete on 3rd
      vi.spyOn(orchestrator.outputAnalyzer, 'analyze').mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          return {
            completed: false,
            success: null,
            failureClass: null,
            completionPercentage: callCount * 30,
            shouldContinue: true,
            learnings: `Progress in iteration ${callCount}`,
            artifactsModified: [`file${callCount}.ts`],
            blockers: [],
            nextApproach: 'Continue implementation',
          };
        }
        return {
          completed: true,
          success: true,
          failureClass: null,
          completionPercentage: 100,
          shouldContinue: false,
          learnings: 'All done',
          artifactsModified: ['final.ts'],
          blockers: [],
          nextApproach: '',
        };
      });

      vi.spyOn(orchestrator.stateManager, 'setCurrentPid').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await orchestrator.execute({
        objective: 'Complex task',
        completionCriteria: 'All tests pass',
        maxIterations: 5,
        enablePIDControl: false,
        enableOverseer: false,
        enableSemanticMemory: false,
        crossTask: false,
        enableAnalytics: false,
        enableBestOutput: false,
        enableEarlyStopping: false,
        enableClaudeIntelligence: false,
        enableSnapshots: false,
        enableCheckpoints: false,
      });

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(3);

      // Check accumulated state
      const finalState = orchestrator.stateManager.load();
      expect(finalState?.iterations).toHaveLength(3);
      expect(finalState?.filesModified).toContain('file1.ts');
      expect(finalState?.filesModified).toContain('file2.ts');
      expect(finalState?.filesModified).toContain('final.ts');
    }, { timeout: 10000 });

    it('should stop when max iterations reached', async () => {
      const orchestrator = new Orchestrator(testDir);

      vi.spyOn(orchestrator.sessionLauncher, 'launch').mockResolvedValue({
        exitCode: 0,
        killed: false,
        pid: 12345,
      });

      // Always incomplete
      vi.spyOn(orchestrator.outputAnalyzer, 'analyze').mockResolvedValue({
        completed: false,
        success: null,
        failureClass: null,
        completionPercentage: 50,
        shouldContinue: true,
        learnings: 'Making progress',
        artifactsModified: [],
        blockers: [],
        nextApproach: 'Keep trying',
      });

      vi.spyOn(orchestrator.stateManager, 'setCurrentPid').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await orchestrator.execute({
        objective: 'Impossible task',
        completionCriteria: 'Never achievable',
        maxIterations: 3,
        enablePIDControl: false,
        enableOverseer: false,
        enableSemanticMemory: false,
        crossTask: false,
        enableAnalytics: false,
        enableBestOutput: false,
        enableEarlyStopping: false,
        enableClaudeIntelligence: false,
        enableSnapshots: false,
        enableCheckpoints: false,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Maximum iterations reached');
      expect(result.iterations).toBe(3);

      const finalState = orchestrator.stateManager.load();
      expect(finalState?.status).toBe('limit_reached');
    }, { timeout: 10000 });

    it('should stop when shouldContinue is false', async () => {
      const orchestrator = new Orchestrator(testDir);

      vi.spyOn(orchestrator.sessionLauncher, 'launch').mockResolvedValue({
        exitCode: 1,
        killed: false,
        pid: 12345,
      });

      // Can't continue due to blocker
      vi.spyOn(orchestrator.outputAnalyzer, 'analyze').mockResolvedValue({
        completed: false,
        success: null,
        failureClass: 'budget_exceeded',
        completionPercentage: 40,
        shouldContinue: false,
        learnings: 'Budget exceeded',
        artifactsModified: [],
        blockers: ['Out of budget'],
        nextApproach: '',
      });

      vi.spyOn(orchestrator.stateManager, 'setCurrentPid').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await orchestrator.execute({
        objective: 'Task that exceeds budget',
        completionCriteria: 'Complete',
        maxIterations: 10,
        enablePIDControl: false,
        enableOverseer: false,
        enableSemanticMemory: false,
        crossTask: false,
        enableAnalytics: false,
        enableBestOutput: false,
        enableEarlyStopping: false,
        enableClaudeIntelligence: false,
        enableSnapshots: false,
        enableCheckpoints: false,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('budget_exceeded');
      expect(result.iterations).toBe(1);

      const finalState = orchestrator.stateManager.load();
      expect(finalState?.status).toBe('failed');
    }, { timeout: 10000 });

    it('should handle session errors and continue', async () => {
      const orchestrator = new Orchestrator(testDir);
      let callCount = 0;

      // Error on first call, succeed on second
      vi.spyOn(orchestrator.sessionLauncher, 'launch').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Session crashed');
        }
        return { exitCode: 0, killed: false, pid: 12345 };
      });

      vi.spyOn(orchestrator.outputAnalyzer, 'analyze').mockResolvedValue({
        completed: true,
        success: true,
        failureClass: null,
        completionPercentage: 100,
        shouldContinue: false,
        learnings: 'Recovered',
        artifactsModified: [],
        blockers: [],
        nextApproach: '',
      });

      vi.spyOn(orchestrator.stateManager, 'setCurrentPid').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await orchestrator.execute({
        objective: 'Task with recovery',
        completionCriteria: 'Complete',
        maxIterations: 5,
        enablePIDControl: false,
        enableOverseer: false,
        enableSemanticMemory: false,
        crossTask: false,
        enableAnalytics: false,
        enableBestOutput: false,
        enableEarlyStopping: false,
        enableClaudeIntelligence: false,
        enableSnapshots: false,
        enableCheckpoints: false,
      });

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(2);

      const finalState = orchestrator.stateManager.load();
      expect(finalState?.iterations[0].status).toBe('error');
      expect(finalState?.iterations[1].status).toBe('completed');
    }, { timeout: 10000 });
  });

  describe('resume', () => {
    it('should throw when no state to resume', async () => {
      const orchestrator = new Orchestrator(testDir);
      await expect(orchestrator.resume()).rejects.toThrow('No external Ralph loop to resume');
    });

    it('should resume from saved state', async () => {
      const orchestrator = new Orchestrator(testDir);

      // Create initial state
      orchestrator.stateManager.initialize({
        objective: 'Resumable task',
        completionCriteria: 'Done',
        maxIterations: 5,
        enablePIDControl: false,
        enableOverseer: false,
        enableSemanticMemory: false,
        crossTask: false,
        enableAnalytics: false,
        enableBestOutput: false,
        enableEarlyStopping: false,
        enableClaudeIntelligence: false,
        enableSnapshots: false,
        enableCheckpoints: false,
      });

      orchestrator.stateManager.update({ status: 'paused', currentIteration: 1 });

      // Add previous iteration
      orchestrator.stateManager.addIteration({
        number: 1,
        sessionId: 'test',
        promptFile: 'prompts/001.md',
        stdoutFile: 'outputs/001-stdout.log',
        stderrFile: 'outputs/001-stderr.log',
        exitCode: 0,
        duration: 1000,
        status: 'incomplete',
        analysis: { completed: false, shouldContinue: true },
        learnings: ['First attempt'],
        filesModified: ['src/partial.ts'],
        progress: '50%',
      });

      vi.spyOn(orchestrator.sessionLauncher, 'launch').mockResolvedValue({
        exitCode: 0,
        killed: false,
        pid: 12345,
      });

      vi.spyOn(orchestrator.outputAnalyzer, 'analyze').mockResolvedValue({
        completed: true,
        success: true,
        failureClass: null,
        completionPercentage: 100,
        shouldContinue: false,
        learnings: 'Completed after resume',
        artifactsModified: ['src/finished.ts'],
        blockers: [],
        nextApproach: '',
      });

      vi.spyOn(orchestrator.stateManager, 'setCurrentPid').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await orchestrator.resume();

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(2);

      const finalState = orchestrator.stateManager.load();
      expect(finalState?.status).toBe('completed');
      expect(finalState?.iterations).toHaveLength(2);
    }, { timeout: 10000 });
  });

  describe('getStatus', () => {
    it('should return null when no state', () => {
      const orchestrator = new Orchestrator(testDir);
      expect(orchestrator.getStatus()).toBeNull();
    });

    it('should return current status', () => {
      const orchestrator = new Orchestrator(testDir);
      orchestrator.stateManager.initialize({
        objective: 'Task',
        completionCriteria: 'Done',
      });

      const status = orchestrator.getStatus();
      expect(status).not.toBeNull();
      expect(status?.objective).toBe('Task');
      expect(status?.status).toBe('running');
    });
  });

  describe('completion report', () => {
    it('should generate completion report on success', async () => {
      const orchestrator = new Orchestrator(testDir);

      vi.spyOn(orchestrator.sessionLauncher, 'launch').mockResolvedValue({
        exitCode: 0,
        killed: false,
        pid: 12345,
      });

      vi.spyOn(orchestrator.outputAnalyzer, 'analyze').mockResolvedValue({
        completed: true,
        success: true,
        failureClass: null,
        completionPercentage: 100,
        shouldContinue: false,
        learnings: 'All tests pass',
        artifactsModified: ['src/feature.ts'],
        blockers: [],
        nextApproach: '',
      });

      vi.spyOn(orchestrator.stateManager, 'setCurrentPid').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await orchestrator.execute({
        objective: 'Implement feature',
        completionCriteria: 'Tests pass',
        maxIterations: 5,
        enablePIDControl: false,
        enableOverseer: false,
        enableSemanticMemory: false,
        crossTask: false,
        enableAnalytics: false,
        enableBestOutput: false,
        enableEarlyStopping: false,
        enableClaudeIntelligence: false,
        enableSnapshots: false,
        enableCheckpoints: false,
      });

      const reportPath = join(testDir, '.aiwg', 'ralph-external', 'completion-report.md');
      expect(existsSync(reportPath)).toBe(true);

      const report = readFileSync(reportPath, 'utf8');
      expect(report).toContain('External Ralph Loop Completion Report');
      expect(report).toContain('Implement feature');
      expect(report).toContain('Tests pass');
      expect(report).toContain('SUCCESS');
    }, { timeout: 10000 });
  });

  describe('abort', () => {
    it('should set aborted flag and call sessionLauncher.kill', () => {
      const orchestrator = new Orchestrator(testDir);
      const killSpy = vi.spyOn(orchestrator.sessionLauncher, 'kill').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      orchestrator.abort();

      expect(orchestrator.aborted).toBe(true);
      expect(killSpy).toHaveBeenCalled();
    });
  });
});
