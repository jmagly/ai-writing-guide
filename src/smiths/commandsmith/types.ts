/**
 * Type definitions for CommandSmith feature
 *
 * CommandSmith generates platform-aware slash commands for agent orchestration.
 */

import { Platform } from '../../agents/types.js';

/**
 * Command template types
 */
export type CommandTemplate = 'utility' | 'transformation' | 'orchestration';

/**
 * Command argument definition
 */
export interface CommandArg {
  name: string;
  description: string;
  required: boolean;
  default?: string;
}

/**
 * Command option definition
 */
export interface CommandOption {
  name: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  default?: string | boolean | number;
}

/**
 * Command generation options
 */
export interface CommandOptions {
  /** Command name (kebab-case) */
  name: string;
  /** What the command does */
  description: string;
  /** Template to use */
  template?: CommandTemplate;
  /** Target platform */
  platform: Platform;
  /** Project path for deployment */
  projectPath: string;
  /** User guidance for generation */
  guidance?: string;
  /** Enable interactive mode */
  interactive?: boolean;
  /** Command arguments */
  args?: CommandArg[];
  /** Command options */
  options?: CommandOption[];
  /** Dry run (don't write files) */
  dryRun?: boolean;
  /** Custom target directory */
  targetDir?: string;
}

/**
 * Generated command result
 */
export interface GeneratedCommand {
  /** Command name */
  name: string;
  /** Full path where command will be deployed */
  path: string;
  /** Command file content */
  content: string;
  /** Target platform */
  platform: Platform;
  /** Template used */
  template: CommandTemplate;
}

/**
 * Command frontmatter (Claude/Factory/Generic)
 */
export interface CommandFrontmatter {
  name: string;
  description: string;
  args: string;
}

/**
 * Command structure for Cursor (JSON format)
 */
export interface CursorCommandSpec {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
    type: string;
    default?: string;
  }>;
  options: Array<{
    name: string;
    description: string;
    type: string;
    default?: string | boolean | number;
  }>;
  execution: {
    steps: string[];
  };
}

/**
 * Command deployment result
 */
export interface CommandDeploymentResult {
  /** Command that was deployed */
  command: GeneratedCommand;
  /** Whether deployment was successful */
  success: boolean;
  /** Error message if deployment failed */
  error?: string;
  /** Whether file was backed up */
  backed_up?: boolean;
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
 * Command validation result
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  command: GeneratedCommand;
}
