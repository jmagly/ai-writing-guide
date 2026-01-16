/**
 * Unit tests for External Ralph Loop Prompt Generator
 *
 * @source @tools/ralph-external/prompt-generator.mjs
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import the module under test
// @ts-ignore - ESM import
import { PromptGenerator } from '../../../tools/ralph-external/prompt-generator.mjs';

describe('PromptGenerator', () => {
  let generator: InstanceType<typeof PromptGenerator>;

  beforeEach(() => {
    generator = new PromptGenerator();
  });

  describe('build', () => {
    const baseContext = {
      objective: 'Fix failing tests',
      completionCriteria: 'npm test passes',
      iteration: 1,
      maxIterations: 10,
      loopId: 'test-loop-123',
      sessionId: 'session-456',
    };

    describe('initial prompt', () => {
      it('should build initial prompt with required fields', () => {
        const result = generator.build({
          ...baseContext,
          type: 'initial',
        });

        expect(result.prompt).toContain('Fix failing tests');
        expect(result.prompt).toContain('npm test passes');
        expect(result.prompt).toContain('test-loop-123');
        expect(result.systemPrompt).toBeDefined();
      });

      it('should include iteration info in initial prompt', () => {
        const result = generator.build({
          ...baseContext,
          type: 'initial',
          iteration: 1,
          maxIterations: 5,
        });

        expect(result.prompt).toContain('1');
        expect(result.prompt).toContain('5');
      });

      it('should handle optional budget and time', () => {
        const result = generator.build({
          ...baseContext,
          type: 'initial',
          timeRemaining: 60,
          budgetRemaining: 5.0,
        });

        expect(result.prompt).toContain('60');
        expect(result.prompt).toContain('5');
      });
    });

    describe('continuation prompt', () => {
      it('should build continuation prompt with learnings', () => {
        const result = generator.build({
          ...baseContext,
          type: 'continuation',
          iteration: 3,
          learnings: 'Auth module requires mock setup',
          filesModified: ['src/auth.ts', 'test/auth.test.ts'],
        });

        expect(result.prompt).toContain('Auth module requires mock setup');
        expect(result.prompt).toContain('src/auth.ts');
        expect(result.prompt).toContain('test/auth.test.ts');
      });

      it('should include previous status', () => {
        const result = generator.build({
          ...baseContext,
          type: 'continuation',
          previousStatus: 'incomplete - tests failing',
        });

        expect(result.prompt).toContain('incomplete - tests failing');
      });

      it('should include last analysis', () => {
        const result = generator.build({
          ...baseContext,
          type: 'continuation',
          lastAnalysis: '3 tests fixed, 2 remaining',
        });

        expect(result.prompt).toContain('3 tests fixed, 2 remaining');
      });

      it('should use defaults for missing optional fields', () => {
        const result = generator.build({
          ...baseContext,
          type: 'continuation',
        });

        // Should not throw and should include default placeholders
        expect(result.prompt).toBeDefined();
        expect(result.prompt.length).toBeGreaterThan(0);
      });
    });

    describe('resume prompt', () => {
      it('should build resume prompt with crash context', () => {
        const result = generator.build({
          ...baseContext,
          type: 'resume',
          iteration: 2,
        });

        expect(result.prompt).toContain('CRASHED');
        expect(result.prompt).toContain('Resuming');
      });

      it('should carry over learnings from before crash', () => {
        const result = generator.build({
          ...baseContext,
          type: 'resume',
          learnings: 'Previous session found edge case in date parsing',
        });

        expect(result.prompt).toContain('Previous session found edge case in date parsing');
      });

      it('should suggest checking matric-memory', () => {
        const result = generator.build({
          ...baseContext,
          type: 'resume',
        });

        expect(result.prompt).toContain('matric-memory');
      });
    });

    describe('system prompt', () => {
      it('should include loop context in system prompt', () => {
        const result = generator.build({
          ...baseContext,
          type: 'initial',
        });

        expect(result.systemPrompt).toContain('test-loop-123');
        expect(result.systemPrompt).toContain('1');
        expect(result.systemPrompt).toContain('10');
      });
    });

    describe('error handling', () => {
      it('should throw for unknown prompt type', () => {
        expect(() =>
          generator.build({
            ...baseContext,
            // @ts-ignore - intentionally invalid type
            type: 'invalid',
          })
        ).toThrow('Unknown prompt type');
      });
    });
  });

  describe('buildAnalysisPrompt', () => {
    it('should build analysis prompt with stdout', () => {
      const result = generator.buildAnalysisPrompt({
        stdout: 'Test output: 5 passing, 2 failing',
        stderr: '',
        exitCode: 1,
        objective: 'Fix tests',
        criteria: 'All tests pass',
      });

      expect(result).toContain('Fix tests');
      expect(result).toContain('All tests pass');
      expect(result).toContain('5 passing, 2 failing');
      expect(result).toContain('Exit code: 1');
      expect(result).toContain('ERROR');
    });

    it('should include stderr when present', () => {
      const result = generator.buildAnalysisPrompt({
        stdout: 'Normal output',
        stderr: 'Error: Module not found',
        exitCode: 1,
        objective: 'Build project',
        criteria: 'Build succeeds',
      });

      expect(result).toContain('Error: Module not found');
      expect(result).toContain('stderr');
    });

    it('should indicate success for exit code 0', () => {
      const result = generator.buildAnalysisPrompt({
        stdout: 'All tests passed',
        stderr: '',
        exitCode: 0,
        objective: 'Run tests',
        criteria: 'Tests pass',
      });

      expect(result).toContain('Exit code: 0');
      expect(result).toContain('SUCCESS');
    });

    it('should include JSON response structure', () => {
      const result = generator.buildAnalysisPrompt({
        stdout: 'output',
        stderr: '',
        exitCode: 0,
        objective: 'Task',
        criteria: 'Done',
      });

      expect(result).toContain('"completed"');
      expect(result).toContain('"success"');
      expect(result).toContain('"failureClass"');
      expect(result).toContain('"shouldContinue"');
      expect(result).toContain('"learnings"');
      expect(result).toContain('"artifactsModified"');
    });

    it('should mention completion marker pattern', () => {
      const result = generator.buildAnalysisPrompt({
        stdout: '',
        stderr: '',
        exitCode: 0,
        objective: 'Task',
        criteria: 'Done',
      });

      expect(result).toContain('ralph_external_completion');
    });
  });
});
