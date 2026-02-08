/**
 * Tests for AgentValidator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentValidator } from '../../../src/agents/agent-validator.ts';
import type { AgentInfo, AgentMetadata } from '../../../src/agents/types.ts';

describe('AgentValidator', () => {
  let validator: AgentValidator;

  beforeEach(() => {
    validator = new AgentValidator();
  });

  describe('validateMetadata', () => {
    it('should pass with valid metadata', () => {
      const metadata: AgentMetadata = {
        name: 'writing-validator',
        description: 'Validates writing quality against AI patterns',
        category: 'writing-quality',
        model: 'sonnet',
        tools: ['Read', 'Write', 'Bash'],
        version: '1.0.0',
      };

      const issues = validator.validateMetadata(metadata);
      const errors = issues.filter((i) => i.type === 'error');

      expect(errors).toHaveLength(0);
    });

    it('should validate required fields and detect missing/invalid values', () => {
      // Test cases: [metadata, expectedErrorField]
      const testCases = [
        [{ name: '', description: 'Validates writing quality' }, 'name'],
        [{ name: 'test-agent', description: '' }, 'description'],
        [{ name: 'Invalid Agent Name', description: 'Test agent with invalid name' }, 'name'],
      ] as const;

      for (const [metadata, expectedField] of testCases) {
        const issues = validator.validateMetadata(metadata as AgentMetadata);
        const errors = issues.filter((i) => i.type === 'error');

        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e) => e.field === expectedField)).toBe(true);
      }
    });

    it('should warn on description length issues', () => {
      // Test cases: [description, shouldWarn]
      const testCases = [
        ['Too short', true],
        ['x'.repeat(600), true],
      ];

      for (const [description, shouldWarn] of testCases) {
        const metadata: AgentMetadata = {
          name: 'test-agent',
          description,
        };

        const issues = validator.validateMetadata(metadata);
        const warnings = issues.filter((i) => i.type === 'warning');

        if (shouldWarn) {
          expect(warnings.some((w) => w.field === 'description')).toBe(true);
        }
      }
    });

    it('should accept valid models and warn on unrecognized ones', () => {
      const validModels = ['sonnet', 'opus', 'haiku', 'gpt-4'];

      // Test valid models - should have no warnings
      for (const model of validModels) {
        const metadata: AgentMetadata = {
          name: 'test-agent',
          description: 'Test agent with valid model',
          model,
        };

        const issues = validator.validateMetadata(metadata);
        const modelWarnings = issues.filter(
          (i) => i.type === 'warning' && i.field === 'model'
        );

        expect(modelWarnings).toHaveLength(0);
      }

      // Test unrecognized model - should warn
      const unrecognizedMetadata: AgentMetadata = {
        name: 'test-agent',
        description: 'Test agent with custom model',
        model: 'custom-model-9000',
      };

      const issues = validator.validateMetadata(unrecognizedMetadata);
      const warnings = issues.filter((i) => i.type === 'warning');
      expect(warnings.some((w) => w.field === 'model')).toBe(true);
    });

    it('should validate version format', () => {
      // Test cases: [version, shouldWarn]
      const testCases: Array<[string, boolean]> = [
        ['v1.0', true], // Invalid format
        ['1.2.3', false], // Valid format
      ];

      for (const [version, shouldWarn] of testCases) {
        const metadata: AgentMetadata = {
          name: 'test-agent',
          description: 'Test agent with version',
          version,
        };

        const issues = validator.validateMetadata(metadata);
        const versionWarnings = issues.filter(
          (i) => i.type === 'warning' && i.field === 'version'
        );

        if (shouldWarn) {
          expect(versionWarnings.length).toBeGreaterThan(0);
        } else {
          expect(versionWarnings).toHaveLength(0);
        }
      }
    });
  });

  describe('validateTools', () => {
    it('should validate tools array with various scenarios', () => {
      // Test cases: [tools, expectedIssueType, expectedField]
      const testCases = [
        // Valid tools - no errors
        [['Read', 'Write', 'Bash', 'Grep'], 'none', null],
        // Unknown tools - warnings
        [['Read', 'UnknownTool', 'CustomTool'], 'warning', null],
        // Empty array - warning
        [[], 'warning', 'tools'],
        // Non-array - error
        ['Read, Write' as any, 'error', 'tools'],
        // All valid tools - no warnings
        [['Read', 'Write', 'Bash', 'Grep', 'Glob', 'WebFetch', 'MultiEdit', 'Task'], 'none', 'tools'],
      ] as const;

      for (const [tools, expectedIssueType, expectedField] of testCases) {
        const issues = validator.validateTools(tools);

        if (expectedIssueType === 'none') {
          const relevantIssues = expectedField
            ? issues.filter((i) => i.type === 'error' || (i.type === 'warning' && i.field === expectedField))
            : issues.filter((i) => i.type === 'error');
          expect(relevantIssues).toHaveLength(0);
        } else if (expectedIssueType === 'error') {
          const errors = issues.filter((i) => i.type === 'error');
          expect(errors.some((e) => e.field === expectedField)).toBe(true);
        } else if (expectedIssueType === 'warning') {
          const warnings = issues.filter((i) => i.type === 'warning');
          if (expectedField) {
            expect(warnings.some((w) => w.field === expectedField)).toBe(true);
          } else {
            expect(warnings.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe('validatePrompt', () => {
    it('should validate prompt content with various scenarios', () => {
      // Test cases: [prompt, expectedIssueType, expectedField]
      const testCases = [
        // Valid prompt
        ['# Test Agent\n\nYou are a test agent that performs testing tasks.\n\n## Instructions\n- Follow test guidelines\n- Report results clearly', 'none', null],
        // Empty prompt - error
        ['', 'error', 'content'],
        // Short prompt - warning
        ['Short prompt', 'warning', 'content'],
        // No structure - info
        ['This is a long prompt without any headings or structure but it has enough content to not trigger the short prompt warning.', 'info', 'content'],
      ] as const;

      for (const [prompt, expectedIssueType, expectedField] of testCases) {
        const issues = validator.validatePrompt(prompt);

        if (expectedIssueType === 'none') {
          const errors = issues.filter((i) => i.type === 'error');
          expect(errors).toHaveLength(0);
        } else if (expectedIssueType === 'error') {
          const errors = issues.filter((i) => i.type === 'error');
          expect(errors.some((e) => e.field === expectedField)).toBe(true);
        } else if (expectedIssueType === 'warning') {
          const warnings = issues.filter((i) => i.type === 'warning');
          expect(warnings.some((w) => w.field === expectedField)).toBe(true);
        } else if (expectedIssueType === 'info') {
          const info = issues.filter((i) => i.type === 'info');
          expect(info.some((i) => i.field === expectedField)).toBe(true);
        }
      }
    });
  });

  describe('checkDependencies', () => {
    const createAgent = (name: string, deps: string[] = []): AgentInfo => ({
      metadata: {
        name,
        description: `${name} agent`,
        dependencies: deps,
      },
      content: 'Agent content',
      filePath: `/path/to/${name}.md`,
      fileName: `${name}.md`,
    });

    it('should validate dependencies in various scenarios', () => {
      // Test cases: [description, agent, availableAgents, shouldHaveErrors, errorCheck]
      const testCases = [
        // No dependencies
        ['no dependencies', createAgent('agent-a'), [createAgent('agent-a')], false, null],
        // All dependencies available
        ['all dependencies available', createAgent('agent-a', ['agent-b', 'agent-c']), [createAgent('agent-a', ['agent-b', 'agent-c']), createAgent('agent-b'), createAgent('agent-c')], false, null],
        // Missing dependency
        ['missing dependency', createAgent('agent-a', ['missing-agent']), [createAgent('agent-a', ['missing-agent'])], true, (errors: any[]) => errors.some((e: any) => e.field === 'dependencies')],
        // Self-dependency
        ['self-dependency', createAgent('agent-a', ['agent-a']), [createAgent('agent-a', ['agent-a'])], true, (errors: any[]) => errors.some((e: any) => e.message.includes('itself'))],
      ] as const;

      for (const [description, agent, availableAgents, shouldHaveErrors, errorCheck] of testCases) {
        const issues = validator.checkDependencies(agent, availableAgents);
        const errors = issues.filter((i) => i.type === 'error');

        if (shouldHaveErrors) {
          expect(errors.length).toBeGreaterThan(0);
          if (errorCheck) {
            expect(errorCheck(errors)).toBe(true);
          }
        } else {
          expect(errors).toHaveLength(0);
        }
      }
    });
  });

  describe('validate', () => {
    it('should validate complete agent', async () => {
      const agent: AgentInfo = {
        metadata: {
          name: 'test-agent',
          description: 'A comprehensive test agent for validation',
          category: 'testing',
          tools: ['Read', 'Write'],
          version: '1.0.0',
        },
        content: '# Test Agent\n\nThis is a test agent with proper structure.',
        filePath: '/path/to/test-agent.md',
        fileName: 'test-agent.md',
      };

      const result = await validator.validate(agent);

      expect(result.valid).toBe(true);
      expect(result.agent).toBe(agent);
    });

    it('should fail validation with errors', async () => {
      const agent: AgentInfo = {
        metadata: {
          name: '',
          description: '',
        },
        content: '',
        filePath: '/path/to/bad-agent.md',
        fileName: 'bad-agent.md',
      };

      const result = await validator.validate(agent);

      expect(result.valid).toBe(false);
      expect(result.issues.filter((i) => i.type === 'error').length).toBeGreaterThan(0);
    });
  });

  describe('validateBatch', () => {
    const createAgent = (name: string, valid: boolean = true): AgentInfo => ({
      metadata: {
        name,
        description: valid ? 'Valid agent description' : '',
      },
      content: valid ? 'Valid content' : '',
      filePath: `/path/to/${name}.md`,
      fileName: `${name}.md`,
    });

    it('should validate multiple agents and detect invalid ones', async () => {
      // All valid agents
      const validAgents = [
        createAgent('agent-a'),
        createAgent('agent-b'),
        createAgent('agent-c'),
      ];

      const validResults = await validator.validateBatch(validAgents);
      expect(validResults).toHaveLength(3);
      expect(validResults.every((r) => r.valid)).toBe(true);

      // Mixed valid and invalid agents
      const mixedAgents = [
        createAgent('agent-a', true),
        createAgent('agent-b', false),
        createAgent('agent-c', true),
      ];

      const mixedResults = await validator.validateBatch(mixedAgents);
      expect(mixedResults).toHaveLength(3);
      expect(mixedResults.filter((r) => !r.valid)).toHaveLength(1);
    });

    it('should check dependencies across batch', async () => {
      // Valid dependencies
      const agentB: AgentInfo = {
        metadata: {
          name: 'agent-b',
          description: 'Agent B',
        },
        content: 'Content',
        filePath: '/path/to/agent-b.md',
        fileName: 'agent-b.md',
      };

      const agentA: AgentInfo = {
        metadata: {
          name: 'agent-a',
          description: 'Agent A depends on B',
          dependencies: ['agent-b'],
        },
        content: 'Content',
        filePath: '/path/to/agent-a.md',
        fileName: 'agent-a.md',
      };

      const validResults = await validator.validateBatch([agentA, agentB]);
      expect(validResults).toHaveLength(2);
      expect(validResults.every((r) => r.valid)).toBe(true);

      // Missing dependency
      const agentMissingDep: AgentInfo = {
        metadata: {
          name: 'agent-a',
          description: 'Agent A depends on missing agent',
          dependencies: ['missing-agent'],
        },
        content: 'Content',
        filePath: '/path/to/agent-a.md',
        fileName: 'agent-a.md',
      };

      const invalidResults = await validator.validateBatch([agentMissingDep]);
      expect(invalidResults[0].valid).toBe(false);
      expect(
        invalidResults[0].issues.some((i) => i.type === 'error' && i.field === 'dependencies')
      ).toBe(true);
    });
  });
});
