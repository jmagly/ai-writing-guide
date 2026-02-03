/**
 * Tests for Claude Prompt Generator
 *
 * @implements Issue #22 - Claude Intelligence Layer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudePromptGenerator } from '../../../tools/ralph-external/lib/claude-prompt-generator.mjs';

describe('ClaudePromptGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new ClaudePromptGenerator({ verbose: false });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const gen = new ClaudePromptGenerator();
      expect(gen.model).toBe('sonnet');
      expect(gen.timeout).toBe(90000);
      expect(gen.verbose).toBe(false);
    });

    it('should accept custom options', () => {
      const gen = new ClaudePromptGenerator({
        model: 'opus',
        timeout: 120000,
        verbose: true,
      });

      expect(gen.model).toBe('opus');
      expect(gen.timeout).toBe(120000);
      expect(gen.verbose).toBe(true);
    });
  });

  describe('_buildAnalysisPrompt', () => {
    it('should build analysis prompt with minimal context', () => {
      const context = {
        objective: 'Fix authentication bug',
        completionCriteria: 'Tests pass',
        iteration: 1,
        maxIterations: 5,
        loopId: 'loop-001',
      };

      const prompt = generator._buildAnalysisPrompt(context);

      expect(prompt).toContain('Fix authentication bug');
      expect(prompt).toContain('Tests pass');
      expect(prompt).toContain('**Iteration**: 1 / 5');
      expect(prompt).toContain('loop-001');
      expect(prompt).toContain('JSON response');
    });

    it('should include state assessment when provided', () => {
      const context = {
        objective: 'Test task',
        completionCriteria: 'Done',
        iteration: 2,
        maxIterations: 5,
        loopId: 'loop-002',
        stateAssessment: {
          estimatedProgress: 50,
          phase: 'mid',
          accomplishments: ['Created files', 'Added tests'],
          blockers: ['Test failure in auth'],
        },
      };

      const prompt = generator._buildAnalysisPrompt(context);

      expect(prompt).toContain('Progress**: 50%');
      expect(prompt).toContain('Phase**: mid');
      expect(prompt).toContain('Created files');
      expect(prompt).toContain('Test failure in auth');
    });

    it('should include PID metrics when provided', () => {
      const context = {
        objective: 'Test',
        completionCriteria: 'Done',
        iteration: 1,
        maxIterations: 5,
        loopId: 'loop-003',
        pidMetrics: {
          proportional: 0.3,
          integral: 1.5,
          trend: 'improving',
          velocity: 0.05,
        },
      };

      const prompt = generator._buildAnalysisPrompt(context);

      expect(prompt).toContain('Completion Gap**: 30');
      expect(prompt).toContain('Accumulated Error**: 1.5');
      expect(prompt).toContain('Trend**: improving');
      expect(prompt).toContain('Velocity**:');
    });

    it('should include strategy plan when provided', () => {
      const context = {
        objective: 'Test',
        completionCriteria: 'Done',
        iteration: 1,
        maxIterations: 5,
        loopId: 'loop-004',
        strategyPlan: {
          approach: 'pivot',
          reasoning: 'Stuck for 3 iterations',
          priorities: ['Try different approach', 'Review assumptions'],
        },
      };

      const prompt = generator._buildAnalysisPrompt(context);

      expect(prompt).toContain('Approach**: pivot');
      expect(prompt).toContain('Stuck for 3 iterations');
      expect(prompt).toContain('Try different approach');
    });

    it('should include validation results when provided', () => {
      const context = {
        objective: 'Test',
        completionCriteria: 'Done',
        iteration: 1,
        maxIterations: 5,
        loopId: 'loop-005',
        validationResults: {
          passed: false,
          issues: [
            { message: 'Test failure', severity: 'error' },
            { message: 'Lint warning', severity: 'warning' },
          ],
        },
      };

      const prompt = generator._buildAnalysisPrompt(context);

      expect(prompt).toContain('FAILED');
      expect(prompt).toContain('Test failure');
    });

    it('should include learnings when provided', () => {
      const context = {
        objective: 'Test',
        completionCriteria: 'Done',
        iteration: 3,
        maxIterations: 5,
        loopId: 'loop-006',
        learnings: [
          'Fixed null check',
          'Added error handling',
          'Updated tests',
        ],
      };

      const prompt = generator._buildAnalysisPrompt(context);

      expect(prompt).toContain('Fixed null check');
      expect(prompt).toContain('Added error handling');
    });
  });

  describe('_parseClaudeResponse', () => {
    it('should parse valid JSON response', () => {
      const stdout = JSON.stringify({
        prompt: 'Continue working on the task',
        systemContext: 'Iteration 2 of loop',
        focusAreas: ['Fix tests', 'Update docs'],
        reasoning: 'Tests are failing',
        urgency: 'high',
      });

      const result = generator._parseClaudeResponse(stdout);

      expect(result).toBeTruthy();
      expect(result.prompt).toBe('Continue working on the task');
      expect(result.systemContext).toBe('Iteration 2 of loop');
      expect(result.focusAreas).toEqual(['Fix tests', 'Update docs']);
      expect(result.metadata.urgency).toBe('high');
      expect(result.metadata.reasoning).toBe('Tests are failing');
    });

    it('should extract JSON from text output', () => {
      const stdout = `Here is the response:

${JSON.stringify({
        prompt: 'Test prompt',
        focusAreas: ['Task 1'],
      })}

That's my analysis.`;

      const result = generator._parseClaudeResponse(stdout);

      expect(result).toBeTruthy();
      expect(result.prompt).toBe('Test prompt');
    });

    it('should return null for invalid JSON', () => {
      const stdout = 'This is not JSON';
      const result = generator._parseClaudeResponse(stdout);
      expect(result).toBeNull();
    });

    it('should return null for missing prompt field', () => {
      const stdout = JSON.stringify({
        focusAreas: ['Task 1'],
        // Missing prompt
      });

      const result = generator._parseClaudeResponse(stdout);
      expect(result).toBeNull();
    });

    it('should use defaults for optional fields', () => {
      const stdout = JSON.stringify({
        prompt: 'Just the prompt',
      });

      const result = generator._parseClaudeResponse(stdout);

      expect(result).toBeTruthy();
      expect(result.systemContext).toBe('');
      expect(result.focusAreas).toEqual([]);
      expect(result.metadata.reasoning).toBe('');
      expect(result.metadata.urgency).toBe('normal');
    });
  });

  describe('_buildFallbackPrompt', () => {
    it('should build basic fallback prompt', () => {
      const context = {
        objective: 'Fix bug',
        completionCriteria: 'Tests pass',
        iteration: 1,
        maxIterations: 5,
        loopId: 'loop-007',
      };

      const result = generator._buildFallbackPrompt(context);

      expect(result.prompt).toContain('Fix bug');
      expect(result.prompt).toContain('Tests pass');
      expect(result.prompt).toContain('ralph_external_completion');
      expect(result.metadata.model).toBe('fallback');
    });

    it('should include blockers in fallback', () => {
      const context = {
        objective: 'Task',
        completionCriteria: 'Done',
        iteration: 1,
        maxIterations: 5,
        loopId: 'loop-008',
        stateAssessment: {
          blockers: ['Test failure', 'Build error'],
        },
      };

      const result = generator._buildFallbackPrompt(context);

      expect(result.prompt).toContain('Test failure');
      expect(result.prompt).toContain('Build error');
      expect(result.focusAreas).toEqual(['Test failure', 'Build error']);
    });

    it('should include validation issues in fallback', () => {
      const context = {
        objective: 'Task',
        completionCriteria: 'Done',
        iteration: 1,
        maxIterations: 5,
        loopId: 'loop-009',
        validationResults: {
          issues: [
            { message: 'Lint error' },
            { message: 'Type error' },
          ],
        },
      };

      const result = generator._buildFallbackPrompt(context);

      expect(result.prompt).toContain('Lint error');
      expect(result.prompt).toContain('Type error');
    });
  });

  describe('_suggestTools', () => {
    it('should suggest basic tools by default', () => {
      const context = {};
      const generated = { focusAreas: [] };

      const tools = generator._suggestTools(context, generated);

      expect(tools).toContain('Read');
      expect(tools).toContain('Write');
    });

    it('should suggest exploration tools for early phase', () => {
      const context = {
        stateAssessment: {
          phase: 'early',
        },
      };
      const generated = { focusAreas: [] };

      const tools = generator._suggestTools(context, generated);

      expect(tools).toContain('Glob');
      expect(tools).toContain('Grep');
    });

    it('should suggest implementation tools for mid/late phase', () => {
      const context = {
        stateAssessment: {
          phase: 'late',
        },
      };
      const generated = { focusAreas: [] };

      const tools = generator._suggestTools(context, generated);

      expect(tools).toContain('Edit');
      expect(tools).toContain('Bash');
    });

    it('should suggest Bash for test files', () => {
      const context = {
        stateAssessment: {
          filesChanged: {
            byCategory: {
              test: ['test1.test.ts', 'test2.test.ts'],
            },
          },
        },
      };
      const generated = { focusAreas: [] };

      const tools = generator._suggestTools(context, generated);

      expect(tools).toContain('Bash');
    });

    it('should suggest debug tools for debug strategy', () => {
      const context = {
        strategyPlan: {
          approach: 'debug',
        },
      };
      const generated = { focusAreas: [] };

      const tools = generator._suggestTools(context, generated);

      expect(tools).toContain('Bash');
      expect(tools).toContain('Grep');
    });

    it('should suggest Grep and Edit for validation issues', () => {
      const context = {
        validationResults: {
          issues: [{ message: 'Error' }],
        },
      };
      const generated = { focusAreas: [] };

      const tools = generator._suggestTools(context, generated);

      expect(tools).toContain('Grep');
      expect(tools).toContain('Edit');
    });
  });

  describe('validatePrompt', () => {
    it('should validate good prompt', () => {
      const generated = {
        prompt: 'Continue working on the task. When complete, output: {"ralph_external_completion": true}',
        focusAreas: ['Fix tests', 'Update docs'],
        toolSuggestions: ['Read', 'Write'],
      };

      const result = generator.validatePrompt(generated);

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should detect too short prompt', () => {
      const generated = {
        prompt: 'Short',
        focusAreas: ['Task'],
        toolSuggestions: ['Read'],
      };

      const result = generator.validatePrompt(generated);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Prompt is too short (< 50 characters)');
    });

    it('should detect missing completion signal', () => {
      const generated = {
        prompt: 'This is a long enough prompt but missing the completion signal instruction',
        focusAreas: ['Task'],
        toolSuggestions: ['Read'],
      };

      const result = generator.validatePrompt(generated);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Prompt missing completion signal instructions');
    });

    it('should detect missing focus areas', () => {
      const generated = {
        prompt: 'Good prompt with completion: {"ralph_external_completion": true}',
        focusAreas: [],
        toolSuggestions: ['Read'],
      };

      const result = generator.validatePrompt(generated);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No focus areas specified');
    });

    it('should detect missing tool suggestions', () => {
      const generated = {
        prompt: 'Good prompt with completion: {"ralph_external_completion": true}',
        focusAreas: ['Task'],
        toolSuggestions: [],
      };

      const result = generator.validatePrompt(generated);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No tool suggestions provided');
    });
  });

  describe('getSummary', () => {
    it('should return summary of generated prompt', () => {
      const generated = {
        prompt: 'Test prompt with enough length to be valid',
        focusAreas: ['Task 1', 'Task 2'],
        toolSuggestions: ['Read', 'Write', 'Edit'],
        metadata: {
          urgency: 'high',
          model: 'sonnet',
          generatedAt: '2026-01-01T00:00:00Z',
        },
      };

      const summary = generator.getSummary(generated);

      expect(summary.promptLength).toBeGreaterThan(0);
      expect(summary.focusAreaCount).toBe(2);
      expect(summary.toolSuggestionCount).toBe(3);
      expect(summary.urgency).toBe('high');
      expect(summary.model).toBe('sonnet');
    });
  });

  describe('integration scenarios', () => {
    it('should handle first iteration context', () => {
      const context = {
        objective: 'Implement user authentication',
        completionCriteria: 'All auth tests pass',
        iteration: 1,
        maxIterations: 10,
        loopId: 'loop-auth-001',
      };

      const prompt = generator._buildAnalysisPrompt(context);

      expect(prompt).toContain('Implement user authentication');
      expect(prompt).toContain('**Iteration**: 1 / 10');
    });

    it('should handle stuck situation', () => {
      const context = {
        objective: 'Fix tests',
        completionCriteria: 'Tests pass',
        iteration: 5,
        maxIterations: 10,
        loopId: 'loop-stuck',
        stateAssessment: {
          estimatedProgress: 40,
          phase: 'mid',
          blockers: ['Same test failing for 3 iterations'],
        },
        pidMetrics: {
          proportional: 0.6,
          integral: 3.5,
          trend: 'stable',
        },
        strategyPlan: {
          approach: 'pivot',
          reasoning: 'Stuck - need different approach',
          priorities: ['Try alternative solution'],
        },
      };

      const prompt = generator._buildAnalysisPrompt(context);

      expect(prompt).toContain('pivot');
      expect(prompt).toContain('Same test failing');
    });

    it('should handle near completion', () => {
      const context = {
        objective: 'Complete feature',
        completionCriteria: 'Feature complete and tested',
        iteration: 8,
        maxIterations: 10,
        loopId: 'loop-final',
        stateAssessment: {
          estimatedProgress: 90,
          phase: 'late',
          accomplishments: [
            'Implemented core functionality',
            'Added tests',
            'Updated docs',
          ],
        },
        pidMetrics: {
          proportional: 0.1,
          trend: 'improving',
        },
      };

      const prompt = generator._buildAnalysisPrompt(context);

      expect(prompt).toContain('90%');
      expect(prompt).toContain('late');
    });
  });
});
