/**
 * Agent Deployment System - Type Definitions
 *
 * Defines interfaces and types for multi-platform agent deployment.
 */

export type Platform = 'claude' | 'cursor' | 'codex' | 'generic';
export type AgentCategory = 'writing-quality' | 'sdlc' | 'security' | 'testing' | 'architecture' | 'documentation' | 'general';

/**
 * Agent metadata from frontmatter
 */
export interface AgentMetadata {
  name: string;
  description: string;
  category?: AgentCategory;
  model?: string;
  tools?: string[];
  dependencies?: string[];
  version?: string;
}

/**
 * Parsed agent information
 */
export interface AgentInfo {
  metadata: AgentMetadata;
  content: string;
  filePath: string;
  fileName: string;
}

/**
 * Deployment target specification
 */
export interface DeploymentTarget {
  platform: Platform;
  projectPath: string;
  agentsPath?: string; // Custom agents directory (default: .{platform}/agents)
}

/**
 * Deployment options
 */
export interface DeploymentOptions {
  categories?: AgentCategory[];
  agentNames?: string[];
  dryRun?: boolean;
  force?: boolean;
  backup?: boolean;
  verbose?: boolean;
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  agent: AgentInfo;
}

/**
 * Deployment result for a single agent
 */
export interface AgentDeploymentResult {
  agent: AgentInfo;
  success: boolean;
  targetPath: string;
  error?: string;
}

/**
 * Overall deployment result
 */
export interface DeploymentResult {
  platform: Platform;
  projectPath: string;
  deployed: AgentDeploymentResult[];
  skipped: AgentInfo[];
  failed: { agent: AgentInfo; error: string }[];
  backupPath?: string;
  totalAgents: number;
  deployedCount: number;
  skippedCount: number;
  failedCount: number;
}

/**
 * Agent packaging result
 */
export interface PackagedAgent {
  agent: AgentInfo;
  content: string;
  format: Platform;
}
