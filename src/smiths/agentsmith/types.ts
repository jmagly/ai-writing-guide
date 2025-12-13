/**
 * Type definitions for AgentSmith - Agent Generation with Platform-Aware Deployment
 *
 * AgentSmith generates custom agents following the 10 Golden Rules and deploys
 * them to platform-specific locations with proper format transformations.
 */

import type { Platform } from '../../agents/types.js';

/**
 * Agent template categories
 */
export type AgentTemplate = 'simple' | 'complex' | 'orchestrator' | 'validator';

/**
 * Model tier selection
 *
 * Maps to actual models via enhanced model selection system.
 */
export type ModelTier = 'haiku' | 'sonnet' | 'opus';

/**
 * Agent generation options
 */
export interface AgentOptions {
  /** Agent name (kebab-case) */
  name: string;

  /** What the agent does */
  description: string;

  /** Template type (default: 'simple') */
  template?: AgentTemplate;

  /** Target deployment platform */
  platform: Platform;

  /** Project path where agent will be deployed */
  projectPath: string;

  /** User guidance for generation */
  guidance?: string;

  /** Enable interactive mode */
  interactive?: boolean;

  /** Model tier (auto-selected by template if not set) */
  model?: ModelTier;

  /** Tool access (auto-selected by template if not set) */
  tools?: string[];

  /** Don't write files, just preview */
  dryRun?: boolean;

  /** Agent category */
  category?: string;

  /** Agent version */
  version?: string;
}

/**
 * Generated agent result
 */
export interface GeneratedAgent {
  /** Agent name */
  name: string;

  /** Full path where agent was/would be deployed */
  path: string;

  /** Agent content (platform-formatted) */
  content: string;

  /** Target platform */
  platform: Platform;

  /** Model tier assigned */
  model: ModelTier;

  /** Tools assigned */
  tools: string[];

  /** Agent category */
  category?: string;

  /** Agent version */
  version?: string;
}

/**
 * Template configuration
 */
export interface TemplateConfig {
  /** Default model tier */
  modelTier: ModelTier;

  /** Default tool set */
  tools: string[];

  /** Maximum tool count */
  maxTools: number;

  /** Whether agent can delegate to other agents */
  canDelegate: boolean;

  /** Whether agent has write permissions */
  readOnly: boolean;

  /** Template description */
  description: string;
}

/**
 * Agent structure sections
 */
export interface AgentStructure {
  /** Title */
  title: string;

  /** Description paragraph */
  description: string;

  /** Expertise section */
  expertise: string[];

  /** Responsibilities section */
  responsibilities: string[];

  /** Workflow steps */
  workflow: string[];

  /** Output format specification */
  outputFormat: string;

  /** Constraints and limitations */
  constraints?: string[];

  /** Examples of usage */
  examples?: string[];
}

/**
 * Interactive prompt response
 */
export interface InteractiveResponse {
  /** Selected template */
  template: AgentTemplate;

  /** User guidance */
  guidance: string;

  /** Additional expertise areas */
  expertise: string[];

  /** Key responsibilities */
  responsibilities: string[];

  /** Desired output format */
  outputFormat: string;
}
