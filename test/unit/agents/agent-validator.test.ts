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

    it('should error on missing name', () => {
      const metadata: AgentMetadata = {
        name: '',
        description: 'Validates writing quality',
      };

      const issues = validator.validateMetadata(metadata);
      const errors = issues.filter((i) => i.type === 'error');

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('should error on missing description', () => {
      const metadata: AgentMetadata = {
        name: 'test-agent',
        description: '',
      };

      const issues = validator.validateMetadata(metadata);
      const errors = issues.filter((i) => i.type === 'error');

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === 'description')).toBe(true);
    });

    it('should error on invalid name format', () => {
      const metadata: AgentMetadata = {
        name: 'Invalid Agent Name',
        description: 'Test agent with invalid name',
      };

      const issues = validator.validateMetadata(metadata);
      const errors = issues.filter((i) => i.type === 'error');

      expect(errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('should warn on short description', () => {
      const metadata: AgentMetadata = {
        name: 'test-agent',
        description: 'Too short',
      };

      const issues = validator.validateMetadata(metadata);
      const warnings = issues.filter((i) => i.type === 'warning');

      expect(warnings.some((w) => w.field === 'description')).toBe(true);
    });

    it('should warn on long description', () => {
      const metadata: AgentMetadata = {
        name: 'test-agent',
        description: 'x'.repeat(600),
      };

      const issues = validator.validateMetadata(metadata);
      const warnings = issues.filter((i) => i.type === 'warning');

      expect(warnings.some((w) => w.field === 'description')).toBe(true);
    });

    it('should warn on unrecognized model', () => {
      const metadata: AgentMetadata = {
        name: 'test-agent',
        description: 'Test agent with custom model',
        model: 'custom-model-9000',
      };

      const issues = validator.validateMetadata(metadata);
      const warnings = issues.filter((i) => i.type === 'warning');

      expect(warnings.some((w) => w.field === 'model')).toBe(true);
    });

    it('should accept valid models', () => {
      const validModels = ['sonnet', 'opus', 'haiku', 'gpt-4'];

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
    });

    it('should warn on invalid version format', () => {
      const metadata: AgentMetadata = {
        name: 'test-agent',
        description: 'Test agent with bad version',
        version: 'v1.0',
      };

      const issues = validator.validateMetadata(metadata);
      const warnings = issues.filter((i) => i.type === 'warning');

      expect(warnings.some((w) => w.field === 'version')).toBe(true);
    });

    it('should accept valid version format', () => {
      const metadata: AgentMetadata = {
        name: 'test-agent',
        description: 'Test agent with valid version',
        version: '1.2.3',
      };

      const issues = validator.validateMetadata(metadata);
      const versionWarnings = issues.filter(
        (i) => i.type === 'warning' && i.field === 'version'
      );

      expect(versionWarnings).toHaveLength(0);
    });
  });

  describe('validateTools', () => {
    it('should pass with valid tools', () => {
      const tools = ['Read', 'Write', 'Bash', 'Grep'];
      const issues = validator.validateTools(tools);
      const errors = issues.filter((i) => i.type === 'error');

      expect(errors).toHaveLength(0);
    });

    it('should warn on unknown tools', () => {
      const tools = ['Read', 'UnknownTool', 'CustomTool'];
      const issues = validator.validateTools(tools);
      const warnings = issues.filter((i) => i.type === 'warning');

      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should warn on empty tools array', () => {
      const tools: string[] = [];
      const issues = validator.validateTools(tools);
      const warnings = issues.filter((i) => i.type === 'warning');

      expect(warnings.some((w) => w.field === 'tools')).toBe(true);
    });

    it('should error on non-array tools', () => {
      const tools = 'Read, Write' as any;
      const issues = validator.validateTools(tools);
      const errors = issues.filter((i) => i.type === 'error');

      expect(errors.some((e) => e.field === 'tools')).toBe(true);
    });

    it('should handle all valid tools', () => {
      const allTools = ['Read', 'Write', 'Bash', 'Grep', 'Glob', 'WebFetch', 'MultiEdit', 'Task'];
      const issues = validator.validateTools(allTools);
      const warnings = issues.filter((i) => i.type === 'warning' && i.field === 'tools');

      expect(warnings).toHaveLength(0);
    });
  });

  describe('validatePrompt', () => {
    it('should pass with valid prompt', () => {
      const prompt = `# Test Agent

You are a test agent that performs testing tasks.

## Instructions
- Follow test guidelines
- Report results clearly`;

      const issues = validator.validatePrompt(prompt);
      const errors = issues.filter((i) => i.type === 'error');

      expect(errors).toHaveLength(0);
    });

    it('should error on empty prompt', () => {
      const prompt = '';
      const issues = validator.validatePrompt(prompt);
      const errors = issues.filter((i) => i.type === 'error');

      expect(errors.some((e) => e.field === 'content')).toBe(true);
    });

    it('should warn on very short prompt', () => {
      const prompt = 'Short prompt';
      const issues = validator.validatePrompt(prompt);
      const warnings = issues.filter((i) => i.type === 'warning');

      expect(warnings.some((w) => w.field === 'content')).toBe(true);
    });

    it('should suggest structure when no headings', () => {
      const prompt = 'This is a long prompt without any headings or structure but it has enough content to not trigger the short prompt warning.';
      const issues = validator.validatePrompt(prompt);
      const info = issues.filter((i) => i.type === 'info');

      expect(info.some((i) => i.field === 'content')).toBe(true);
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

    it('should pass when no dependencies', () => {
      const agent = createAgent('agent-a');
      const availableAgents = [agent];

      const issues = validator.checkDependencies(agent, availableAgents);
      const errors = issues.filter((i) => i.type === 'error');

      expect(errors).toHaveLength(0);
    });

    it('should pass when all dependencies available', () => {
      const agentB = createAgent('agent-b');
      const agentC = createAgent('agent-c');
      const agentA = createAgent('agent-a', ['agent-b', 'agent-c']);

      const availableAgents = [agentA, agentB, agentC];

      const issues = validator.checkDependencies(agentA, availableAgents);
      const errors = issues.filter((i) => i.type === 'error');

      expect(errors).toHaveLength(0);
    });

    it('should error on missing dependency', () => {
      const agentA = createAgent('agent-a', ['missing-agent']);
      const availableAgents = [agentA];

      const issues = validator.checkDependencies(agentA, availableAgents);
      const errors = issues.filter((i) => i.type === 'error');

      expect(errors.some((e) => e.field === 'dependencies')).toBe(true);
    });

    it('should error on self-dependency', () => {
      const agentA = createAgent('agent-a', ['agent-a']);
      const availableAgents = [agentA];

      const issues = validator.checkDependencies(agentA, availableAgents);
      const errors = issues.filter((i) => i.type === 'error');

      expect(errors.some((e) => e.message.includes('itself'))).toBe(true);
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

    it('should validate multiple agents', async () => {
      const agents = [
        createAgent('agent-a'),
        createAgent('agent-b'),
        createAgent('agent-c'),
      ];

      const results = await validator.validateBatch(agents);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.valid)).toBe(true);
    });

    it('should detect invalid agents in batch', async () => {
      const agents = [
        createAgent('agent-a', true),
        createAgent('agent-b', false),
        createAgent('agent-c', true),
      ];

      const results = await validator.validateBatch(agents);

      expect(results).toHaveLength(3);
      expect(results.filter((r) => !r.valid)).toHaveLength(1);
    });

    it('should check dependencies across batch', async () => {
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

      const results = await validator.validateBatch([agentA, agentB]);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.valid)).toBe(true);
    });

    it('should detect missing dependencies in batch', async () => {
      const agentA: AgentInfo = {
        metadata: {
          name: 'agent-a',
          description: 'Agent A depends on missing agent',
          dependencies: ['missing-agent'],
        },
        content: 'Content',
        filePath: '/path/to/agent-a.md',
        fileName: 'agent-a.md',
      };

      const results = await validator.validateBatch([agentA]);

      expect(results[0].valid).toBe(false);
      expect(
        results[0].issues.some((i) => i.type === 'error' && i.field === 'dependencies')
      ).toBe(true);
    });
  });
});
