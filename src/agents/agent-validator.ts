/**
 * Agent Validator
 *
 * Validates agent metadata, content, and dependencies.
 */

import type {
  AgentInfo,
  ValidationResult,
  ValidationIssue,
  AgentMetadata,
} from './types.js';

const VALID_TOOLS = [
  'Read',
  'Write',
  'Bash',
  'Grep',
  'Glob',
  'WebFetch',
  'MultiEdit',
  'Task',
];

const REQUIRED_FIELDS: (keyof AgentMetadata)[] = [
  'name',
  'description',
];

export class AgentValidator {
  /**
   * Validate an agent
   */
  async validate(agent: AgentInfo): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    // Validate metadata
    issues.push(...this.validateMetadata(agent.metadata));

    // Validate tools
    if (agent.metadata.tools) {
      issues.push(...this.validateTools(agent.metadata.tools));
    }

    // Validate content
    issues.push(...this.validatePrompt(agent.content));

    // Check for errors
    const hasErrors = issues.some((issue) => issue.type === 'error');

    return {
      valid: !hasErrors,
      issues,
      agent,
    };
  }

  /**
   * Validate metadata fields
   */
  validateMetadata(metadata: AgentMetadata): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      const value = metadata[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        issues.push({
          type: 'error',
          field,
          message: `Required field '${field}' is missing or empty`,
          suggestion: `Add ${field} to agent frontmatter`,
        });
      }
    }

    // Validate name format
    if (metadata.name) {
      if (!/^[a-z0-9-]+$/.test(metadata.name)) {
        issues.push({
          type: 'error',
          field: 'name',
          message: 'Agent name must be lowercase alphanumeric with hyphens',
          suggestion: `Use format: ${metadata.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`,
        });
      }
    }

    // Validate description length
    if (metadata.description) {
      if (metadata.description.length < 20) {
        issues.push({
          type: 'warning',
          field: 'description',
          message: 'Description is too short (minimum 20 characters)',
          suggestion: 'Provide a more detailed description of agent capabilities',
        });
      }
      if (metadata.description.length > 500) {
        issues.push({
          type: 'warning',
          field: 'description',
          message: 'Description is very long (maximum 500 characters recommended)',
          suggestion: 'Keep description concise',
        });
      }
    }

    // Validate model if present
    if (metadata.model) {
      const validModels = ['sonnet', 'opus', 'haiku', 'gpt-4', 'gpt-3.5-turbo'];
      if (!validModels.includes(metadata.model)) {
        issues.push({
          type: 'warning',
          field: 'model',
          message: `Unrecognized model: ${metadata.model}`,
          suggestion: `Consider using: ${validModels.join(', ')}`,
        });
      }
    }

    // Validate version format
    if (metadata.version) {
      if (!/^\d+\.\d+\.\d+$/.test(metadata.version)) {
        issues.push({
          type: 'warning',
          field: 'version',
          message: 'Version should follow semantic versioning (e.g., 1.0.0)',
          suggestion: 'Use format: MAJOR.MINOR.PATCH',
        });
      }
    }

    return issues;
  }

  /**
   * Validate tool names
   */
  validateTools(tools: string[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!Array.isArray(tools)) {
      issues.push({
        type: 'error',
        field: 'tools',
        message: 'Tools must be an array',
        suggestion: 'Provide tools as comma-separated list or array',
      });
      return issues;
    }

    if (tools.length === 0) {
      issues.push({
        type: 'warning',
        field: 'tools',
        message: 'No tools specified',
        suggestion: 'Agents typically need at least Read and Write tools',
      });
    }

    // Check each tool
    for (const tool of tools) {
      const trimmedTool = tool.trim();
      if (!VALID_TOOLS.includes(trimmedTool)) {
        issues.push({
          type: 'warning',
          field: 'tools',
          message: `Unknown tool: ${trimmedTool}`,
          suggestion: `Valid tools: ${VALID_TOOLS.join(', ')}`,
        });
      }
    }

    return issues;
  }

  /**
   * Validate prompt content
   */
  validatePrompt(prompt: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!prompt || prompt.trim() === '') {
      issues.push({
        type: 'error',
        field: 'content',
        message: 'Agent content/prompt is empty',
        suggestion: 'Provide agent instructions and behavior',
      });
      return issues;
    }

    // Check minimum length
    if (prompt.length < 100) {
      issues.push({
        type: 'warning',
        field: 'content',
        message: 'Agent content is very short (< 100 characters)',
        suggestion: 'Provide more detailed instructions for the agent',
      });
    }

    // Check for common issues
    if (!prompt.includes('#')) {
      issues.push({
        type: 'info',
        field: 'content',
        message: 'Content has no headings - consider adding structure',
        suggestion: 'Use markdown headings to organize agent instructions',
      });
    }

    return issues;
  }

  /**
   * Check dependencies
   */
  checkDependencies(
    agent: AgentInfo,
    availableAgents: AgentInfo[]
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!agent.metadata.dependencies || agent.metadata.dependencies.length === 0) {
      return issues;
    }

    const availableNames = new Set(
      availableAgents.map((a) => a.metadata.name)
    );

    for (const dep of agent.metadata.dependencies) {
      if (!availableNames.has(dep)) {
        issues.push({
          type: 'error',
          field: 'dependencies',
          message: `Dependency not found: ${dep}`,
          suggestion: 'Ensure all dependencies are available for deployment',
        });
      }
    }

    // Check for circular dependencies (simple check)
    if (agent.metadata.dependencies.includes(agent.metadata.name)) {
      issues.push({
        type: 'error',
        field: 'dependencies',
        message: 'Agent cannot depend on itself',
        suggestion: 'Remove self-reference from dependencies',
      });
    }

    return issues;
  }

  /**
   * Validate batch of agents
   */
  async validateBatch(agents: AgentInfo[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const agent of agents) {
      const result = await this.validate(agent);

      // Also check dependencies
      const depIssues = this.checkDependencies(agent, agents);
      result.issues.push(...depIssues);

      // Re-evaluate validity
      result.valid = !result.issues.some((issue) => issue.type === 'error');

      results.push(result);
    }

    return results;
  }
}
