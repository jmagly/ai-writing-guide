/**
 * Agent Packager
 *
 * Converts agents to platform-specific formats.
 */

import type { AgentInfo, Platform, PackagedAgent } from './types.js';
import { getProviderDefinition } from '../providers/provider-definitions.js';

type AgentFormatAdapter = (agent: AgentInfo) => string;

export class AgentPackager {
  private getAgentFormatAdapters(): Record<string, AgentFormatAdapter> {
    return {
      'claude-markdown': (agent) => this.convertToClaudeFormat(agent),
      'cursor-json': (agent) => this.convertToCursorFormat(agent),
      'codex-markdown': (agent) => this.convertToCodexFormat(agent),
      'copilot-markdown': (agent) => this.convertToGenericFormat(agent),
      'factory-droid': (agent) => this.convertToClaudeFormat(agent),
      'generic-markdown': (agent) => this.convertToGenericFormat(agent),
      'windsurf-markdown': (agent) => this.convertToWindsurfFormat(agent),
    };
  }

  /**
   * Package agent for target platform
   */
  async package(agent: AgentInfo, platform: Platform): Promise<PackagedAgent> {
    const definition = getProviderDefinition(platform);
    if (!definition) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    const adapterKey = definition.adapters.agentFormat;
    const adapter = this.getAgentFormatAdapters()[adapterKey];
    if (!adapter) {
      throw new Error(`Unknown agent format adapter '${adapterKey}' for platform: ${platform}`);
    }

    return {
      agent,
      content: adapter(agent),
      format: definition.id,
    };
  }

  /**
   * Convert to Claude Code format (.md with YAML frontmatter)
   */
  convertToClaudeFormat(agent: AgentInfo): string {
    const { metadata, content } = agent;
    const lines: string[] = [];

    // Add frontmatter
    lines.push('---');
    lines.push(`name: ${metadata.name}`);
    lines.push(`description: ${metadata.description}`);

    if (metadata.model) {
      lines.push(`model: ${metadata.model}`);
    }

    if (metadata.tools && metadata.tools.length > 0) {
      lines.push(`tools: ${metadata.tools.join(', ')}`);
    }

    if (metadata.category) {
      lines.push(`category: ${metadata.category}`);
    }

    if (metadata.version) {
      lines.push(`version: ${metadata.version}`);
    }

    if (metadata.dependencies && metadata.dependencies.length > 0) {
      lines.push(`dependencies: ${metadata.dependencies.join(', ')}`);
    }

    lines.push('---');
    lines.push('');

    // Add content
    lines.push(content);

    return lines.join('\n');
  }

  /**
   * Convert to Cursor format (JSON-based)
   */
  convertToCursorFormat(agent: AgentInfo): string {
    const { metadata, content } = agent;

    // Cursor uses JSON format with lowercase tool names
    const tools = metadata.tools?.map((t) => t.toLowerCase()) || [];

    const cursorAgent = {
      name: metadata.name,
      description: metadata.description,
      prompt: content,
      tools,
      ...(metadata.model && { model: metadata.model }),
      ...(metadata.category && { category: metadata.category }),
      ...(metadata.version && { version: metadata.version }),
      ...(metadata.dependencies && { dependencies: metadata.dependencies }),
    };

    return JSON.stringify(cursorAgent, null, 2);
  }

  /**
   * Convert to OpenAI Codex format (YAML-based with specific structure)
   */
  convertToCodexFormat(agent: AgentInfo): string {
    const { metadata, content } = agent;
    const lines: string[] = [];

    // Codex uses YAML frontmatter similar to Claude
    lines.push('---');
    lines.push(`agent_name: ${metadata.name}`);
    lines.push(`description: ${metadata.description}`);

    if (metadata.tools && metadata.tools.length > 0) {
      lines.push('capabilities:');
      for (const tool of metadata.tools) {
        lines.push(`  - ${tool.toLowerCase()}`);
      }
    }

    if (metadata.model) {
      lines.push(`preferred_model: ${metadata.model}`);
    }

    if (metadata.category) {
      lines.push(`category: ${metadata.category}`);
    }

    if (metadata.version) {
      lines.push(`version: ${metadata.version}`);
    }

    lines.push('---');
    lines.push('');

    // Add system prompt header
    lines.push('# System Instructions');
    lines.push('');
    lines.push(content);

    return lines.join('\n');
  }

  /**
   * Convert to generic format (plain markdown with minimal frontmatter)
   */
  convertToGenericFormat(agent: AgentInfo): string {
    const { metadata, content } = agent;
    const lines: string[] = [];

    // Minimal YAML frontmatter
    lines.push('---');
    lines.push(`name: ${metadata.name}`);
    lines.push(`description: ${metadata.description}`);

    if (metadata.version) {
      lines.push(`version: ${metadata.version}`);
    }

    lines.push('---');
    lines.push('');

    // Add metadata as comments
    lines.push('<!--');
    if (metadata.category) {
      lines.push(`Category: ${metadata.category}`);
    }
    if (metadata.model) {
      lines.push(`Preferred Model: ${metadata.model}`);
    }
    if (metadata.tools && metadata.tools.length > 0) {
      lines.push(`Tools: ${metadata.tools.join(', ')}`);
    }
    if (metadata.dependencies && metadata.dependencies.length > 0) {
      lines.push(`Dependencies: ${metadata.dependencies.join(', ')}`);
    }
    lines.push('-->');
    lines.push('');

    // Add content
    lines.push(content);

    return lines.join('\n');
  }

  /**
   * Convert to Windsurf format (plain markdown, no YAML frontmatter)
   *
   * Windsurf uses AGENTS.md for directory-scoped instructions.
   * Individual agent definitions use clean markdown sections.
   */
  convertToWindsurfFormat(agent: AgentInfo): string {
    const { metadata, content } = agent;
    const lines: string[] = [];

    // Windsurf prefers clean markdown without YAML frontmatter
    lines.push(`### ${metadata.name}`);
    lines.push('');

    // Only add description if present
    if (metadata.description) {
      lines.push(`> ${metadata.description}`);
      lines.push('');
    }

    // Include capabilities in a structured way
    if (metadata.tools && metadata.tools.length > 0) {
      lines.push('<capabilities>');
      for (const tool of metadata.tools) {
        lines.push(`- ${tool}`);
      }
      lines.push('</capabilities>');
      lines.push('');
    }

    // Add model info if present
    if (metadata.model) {
      lines.push(`**Model**: ${metadata.model}`);
      lines.push('');
    }

    // Add the agent's system instructions
    lines.push(content);

    return lines.join('\n');
  }

  /**
   * Get file extension for platform
   */
  getFileExtension(platform: Platform): string {
    return getProviderDefinition(platform)?.smithPaths.fileExtension ?? '.md';
  }

  /**
   * Get filename for agent
   */
  getFileName(agent: AgentInfo, platform: Platform): string {
    const ext = this.getFileExtension(platform);
    return `${agent.metadata.name}${ext}`;
  }

  /**
   * Package multiple agents
   */
  async packageBatch(
    agents: AgentInfo[],
    platform: Platform
  ): Promise<PackagedAgent[]> {
    const packaged: PackagedAgent[] = [];

    for (const agent of agents) {
      packaged.push(await this.package(agent, platform));
    }

    return packaged;
  }

  /**
   * Create combined AGENTS.md file (for platforms that support it)
   */
  async createCombinedFile(
    agents: AgentInfo[],
    platform: Platform
  ): Promise<string> {
    const lines: string[] = [];

    lines.push('# Available Agents');
    lines.push('');
    lines.push(`Platform: ${platform}`);
    lines.push(`Total Agents: ${agents.length}`);
    lines.push('');

    // Table of contents
    lines.push('## Table of Contents');
    lines.push('');
    for (const agent of agents) {
      lines.push(`- [${agent.metadata.name}](#${agent.metadata.name.replace(/-/g, '')})`);
    }
    lines.push('');

    // Individual agents
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const packaged = await this.package(agent, platform);

      if (i > 0) {
        lines.push('');
        lines.push('---');
        lines.push('');
      }

      lines.push(`## ${agent.metadata.name}`);
      lines.push('');
      lines.push(packaged.content);
    }

    return lines.join('\n');
  }
}
