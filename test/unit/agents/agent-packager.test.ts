/**
 * Tests for AgentPackager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentPackager } from '../../../src/agents/agent-packager.ts';
import type { AgentInfo } from '../../../src/agents/types.ts';

describe('AgentPackager', () => {
  let packager: AgentPackager;

  beforeEach(() => {
    packager = new AgentPackager();
  });

  const createSampleAgent = (): AgentInfo => ({
    metadata: {
      name: 'test-agent',
      description: 'A test agent for packaging',
      category: 'testing',
      model: 'sonnet',
      tools: ['Read', 'Write', 'Bash'],
      version: '1.0.0',
      dependencies: ['helper-agent'],
    },
    content: '# Test Agent\n\nYou are a test agent.',
    filePath: '/path/to/test-agent.md',
    fileName: 'test-agent.md',
  });

  describe('convertToClaudeFormat', () => {
    it('should convert to Claude Code format with frontmatter', () => {
      const agent = createSampleAgent();
      const result = packager.convertToClaudeFormat(agent);

      expect(result).toContain('---');
      expect(result).toContain('name: test-agent');
      expect(result).toContain('description: A test agent for packaging');
      expect(result).toContain('model: sonnet');
      expect(result).toContain('tools: Read, Write, Bash');
      expect(result).toContain('category: testing');
      expect(result).toContain('version: 1.0.0');
      expect(result).toContain('dependencies: helper-agent');
      expect(result).toContain('# Test Agent');
    });

    it('should handle minimal metadata', () => {
      const agent: AgentInfo = {
        metadata: {
          name: 'minimal-agent',
          description: 'Minimal agent',
        },
        content: 'Agent content',
        filePath: '/path/to/minimal.md',
        fileName: 'minimal.md',
      };

      const result = packager.convertToClaudeFormat(agent);

      expect(result).toContain('name: minimal-agent');
      expect(result).toContain('description: Minimal agent');
      expect(result).not.toContain('model:');
      expect(result).not.toContain('tools:');
    });

    it('should preserve agent content', () => {
      const agent = createSampleAgent();
      const result = packager.convertToClaudeFormat(agent);

      expect(result).toContain('# Test Agent');
      expect(result).toContain('You are a test agent.');
    });
  });

  describe('convertToCursorFormat', () => {
    it('should convert to JSON format', () => {
      const agent = createSampleAgent();
      const result = packager.convertToCursorFormat(agent);

      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('test-agent');
      expect(parsed.description).toBe('A test agent for packaging');
      expect(parsed.prompt).toBe('# Test Agent\n\nYou are a test agent.');
      expect(parsed.tools).toEqual(['read', 'write', 'bash']);
      expect(parsed.model).toBe('sonnet');
      expect(parsed.category).toBe('testing');
      expect(parsed.version).toBe('1.0.0');
    });

    it('should lowercase tool names', () => {
      const agent = createSampleAgent();
      const result = packager.convertToCursorFormat(agent);
      const parsed = JSON.parse(result);

      expect(parsed.tools).toEqual(['read', 'write', 'bash']);
      expect(parsed.tools).not.toContain('Read');
    });

    it('should handle minimal metadata', () => {
      const agent: AgentInfo = {
        metadata: {
          name: 'minimal-agent',
          description: 'Minimal agent',
        },
        content: 'Content',
        filePath: '/path/to/minimal.md',
        fileName: 'minimal.md',
      };

      const result = packager.convertToCursorFormat(agent);
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('minimal-agent');
      expect(parsed.description).toBe('Minimal agent');
      expect(parsed.model).toBeUndefined();
    });
  });

  describe('convertToCodexFormat', () => {
    it('should convert to Codex YAML format', () => {
      const agent = createSampleAgent();
      const result = packager.convertToCodexFormat(agent);

      expect(result).toContain('---');
      expect(result).toContain('agent_name: test-agent');
      expect(result).toContain('description: A test agent for packaging');
      expect(result).toContain('capabilities:');
      expect(result).toContain('  - read');
      expect(result).toContain('  - write');
      expect(result).toContain('  - bash');
      expect(result).toContain('preferred_model: sonnet');
      expect(result).toContain('# System Instructions');
    });

    it('should lowercase capabilities', () => {
      const agent = createSampleAgent();
      const result = packager.convertToCodexFormat(agent);

      expect(result).toContain('  - read');
      expect(result).not.toContain('  - Read');
    });

    it('should add system instructions header', () => {
      const agent = createSampleAgent();
      const result = packager.convertToCodexFormat(agent);

      expect(result).toContain('# System Instructions');
      expect(result.indexOf('# System Instructions')).toBeGreaterThan(result.indexOf('---'));
    });
  });

  describe('convertToGenericFormat', () => {
    it('should create generic markdown format', () => {
      const agent = createSampleAgent();
      const result = packager.convertToGenericFormat(agent);

      expect(result).toContain('---');
      expect(result).toContain('name: test-agent');
      expect(result).toContain('description: A test agent for packaging');
      expect(result).toContain('<!--');
      expect(result).toContain('Category: testing');
      expect(result).toContain('Tools: Read, Write, Bash');
      expect(result).toContain('-->');
    });

    it('should include metadata as comments', () => {
      const agent = createSampleAgent();
      const result = packager.convertToGenericFormat(agent);

      expect(result).toContain('Category: testing');
      expect(result).toContain('Preferred Model: sonnet');
      expect(result).toContain('Tools: Read, Write, Bash');
      expect(result).toContain('Dependencies: helper-agent');
    });
  });

  describe('convertToWindsurfFormat', () => {
    it('should convert to Windsurf markdown format without YAML frontmatter', () => {
      const agent = createSampleAgent();
      const result = packager.convertToWindsurfFormat(agent);

      // Should NOT have YAML frontmatter
      expect(result).not.toMatch(/^---/);

      // Should have heading and description
      expect(result).toContain('### test-agent');
      expect(result).toContain('> A test agent for packaging');

      // Should have capabilities block
      expect(result).toContain('<capabilities>');
      expect(result).toContain('- Read');
      expect(result).toContain('- Write');
      expect(result).toContain('- Bash');
      expect(result).toContain('</capabilities>');

      // Should have model info
      expect(result).toContain('**Model**: sonnet');

      // Should have content
      expect(result).toContain('# Test Agent');
      expect(result).toContain('You are a test agent.');
    });

    it('should handle agents without tools', () => {
      const agent: AgentInfo = {
        metadata: {
          name: 'minimal-agent',
          description: 'Minimal agent',
        },
        content: 'Agent content',
        filePath: '/path/to/minimal.md',
        fileName: 'minimal.md',
      };

      const result = packager.convertToWindsurfFormat(agent);

      expect(result).toContain('### minimal-agent');
      expect(result).toContain('> Minimal agent');
      expect(result).not.toContain('<capabilities>');
      expect(result).not.toContain('**Model**:');
      expect(result).toContain('Agent content');
    });

    it('should handle agents without description', () => {
      const agent: AgentInfo = {
        metadata: {
          name: 'no-desc-agent',
          description: '',
        },
        content: 'Content here',
        filePath: '/path/to/agent.md',
        fileName: 'agent.md',
      };

      const result = packager.convertToWindsurfFormat(agent);

      expect(result).toContain('### no-desc-agent');
      expect(result).not.toContain('> '); // No empty description
      expect(result).toContain('Content here');
    });
  });

  describe('getFileExtension', () => {
    it('should return .md for claude', () => {
      expect(packager.getFileExtension('claude')).toBe('.md');
    });

    it('should return .json for cursor', () => {
      expect(packager.getFileExtension('cursor')).toBe('.json');
    });

    it('should return .md for codex', () => {
      expect(packager.getFileExtension('codex')).toBe('.md');
    });

    it('should return .md for generic', () => {
      expect(packager.getFileExtension('generic')).toBe('.md');
    });

    it('should return .md for windsurf', () => {
      expect(packager.getFileExtension('windsurf')).toBe('.md');
    });

    it('should return .md for factory', () => {
      expect(packager.getFileExtension('factory')).toBe('.md');
    });

    it('should return .md for copilot', () => {
      expect(packager.getFileExtension('copilot')).toBe('.md');
    });
  });

  describe('getFileName', () => {
    it('should generate correct filename for each platform', () => {
      const agent = createSampleAgent();

      expect(packager.getFileName(agent, 'claude')).toBe('test-agent.md');
      expect(packager.getFileName(agent, 'cursor')).toBe('test-agent.json');
      expect(packager.getFileName(agent, 'codex')).toBe('test-agent.md');
      expect(packager.getFileName(agent, 'generic')).toBe('test-agent.md');
      expect(packager.getFileName(agent, 'windsurf')).toBe('test-agent.md');
      expect(packager.getFileName(agent, 'factory')).toBe('test-agent.md');
      expect(packager.getFileName(agent, 'copilot')).toBe('test-agent.md');
    });
  });

  describe('package', () => {
    it('should package for claude platform', async () => {
      const agent = createSampleAgent();
      const packaged = await packager.package(agent, 'claude');

      expect(packaged.agent).toBe(agent);
      expect(packaged.format).toBe('claude');
      expect(packaged.content).toContain('name: test-agent');
    });

    it('should package for cursor platform', async () => {
      const agent = createSampleAgent();
      const packaged = await packager.package(agent, 'cursor');

      expect(packaged.format).toBe('cursor');
      const parsed = JSON.parse(packaged.content);
      expect(parsed.name).toBe('test-agent');
    });

    it('should package for codex platform', async () => {
      const agent = createSampleAgent();
      const packaged = await packager.package(agent, 'codex');

      expect(packaged.format).toBe('codex');
      expect(packaged.content).toContain('agent_name: test-agent');
    });

    it('should package for generic platform', async () => {
      const agent = createSampleAgent();
      const packaged = await packager.package(agent, 'generic');

      expect(packaged.format).toBe('generic');
      expect(packaged.content).toContain('<!--');
    });

    it('should package for windsurf platform', async () => {
      const agent = createSampleAgent();
      const packaged = await packager.package(agent, 'windsurf');

      expect(packaged.format).toBe('windsurf');
      expect(packaged.content).toContain('### test-agent');
      expect(packaged.content).not.toMatch(/^---/); // No YAML frontmatter
    });

    it('should package for factory platform', async () => {
      const agent = createSampleAgent();
      const packaged = await packager.package(agent, 'factory');

      expect(packaged.format).toBe('factory');
      // Factory uses Claude format
      expect(packaged.content).toContain('name: test-agent');
    });

    it('should package for copilot platform', async () => {
      const agent = createSampleAgent();
      const packaged = await packager.package(agent, 'copilot');

      expect(packaged.format).toBe('copilot');
      // Copilot uses generic format
      expect(packaged.content).toContain('<!--');
    });

    it('should throw on unknown platform', async () => {
      const agent = createSampleAgent();

      await expect(
        packager.package(agent, 'unknown' as any)
      ).rejects.toThrow('Unknown platform');
    });
  });

  describe('packageBatch', () => {
    it('should package multiple agents', async () => {
      const agents: AgentInfo[] = [
        createSampleAgent(),
        {
          ...createSampleAgent(),
          metadata: { ...createSampleAgent().metadata, name: 'agent-2' },
        },
        {
          ...createSampleAgent(),
          metadata: { ...createSampleAgent().metadata, name: 'agent-3' },
        },
      ];

      const packaged = await packager.packageBatch(agents, 'claude');

      expect(packaged).toHaveLength(3);
      expect(packaged.every((p) => p.format === 'claude')).toBe(true);
    });
  });

  describe('createCombinedFile', () => {
    it('should create combined AGENTS.md file', async () => {
      const agents: AgentInfo[] = [
        createSampleAgent(),
        {
          ...createSampleAgent(),
          metadata: { ...createSampleAgent().metadata, name: 'agent-2', description: 'Second agent' },
        },
      ];

      const combined = await packager.createCombinedFile(agents, 'claude');

      expect(combined).toContain('# Available Agents');
      expect(combined).toContain('Platform: claude');
      expect(combined).toContain('Total Agents: 2');
      expect(combined).toContain('## Table of Contents');
      expect(combined).toContain('- [test-agent]');
      expect(combined).toContain('- [agent-2]');
      expect(combined).toContain('## test-agent');
      expect(combined).toContain('## agent-2');
      expect(combined).toContain('---'); // Separator between agents
    });

    it('should handle single agent', async () => {
      const agents = [createSampleAgent()];
      const combined = await packager.createCombinedFile(agents, 'claude');

      expect(combined).toContain('Total Agents: 1');
      expect(combined).toContain('## test-agent');
      expect(combined).not.toContain('---\n\n## '); // No separator for single agent
    });

    it('should include full agent content in combined file', async () => {
      const agent = createSampleAgent();
      const combined = await packager.createCombinedFile([agent], 'claude');

      expect(combined).toContain('name: test-agent');
      expect(combined).toContain('# Test Agent');
      expect(combined).toContain('You are a test agent.');
    });
  });
});
