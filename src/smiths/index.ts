/**
 * AIWG Smiths - Tool and Server Generation Framework
 *
 * The Smiths ecosystem provides:
 * - Toolsmith: Tool specification generation for subagent scenarios
 * - MCPsmith: MCP server generation from any command/API
 * - AgentSmith: Custom agent generation with platform-aware deployment
 * - SkillSmith: Skill generation with platform-aware deployment
 * - CommandSmith: Platform-aware slash command generation
 *
 * @module smiths
 */

// Re-export Toolsmith (excluding Platform to avoid conflict)
export * from './toolsmith/types.js';
// Toolsmith's Platform type for OS platforms (linux, macos, windows, wsl)
export type { Platform as OSPlatform } from './toolsmith/types.js';

// Re-export MCPsmith
export * from './mcpsmith/index.js';

// Re-export AgentSmith
export * from './agentsmith/index.js';

// Re-export SkillSmith
export * from './skillsmith/index.js';

// Re-export CommandSmith
export * from './commandsmith/index.js';

// Note: The default exported 'Platform' type is for AI platforms (claude, factory, etc.)
// For OS platforms, use 'OSPlatform' instead

// Shared types
export interface SmithConfig {
  /** Base directory for smith artifacts */
  baseDir: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Cache duration in milliseconds */
  cacheDuration?: number;
}

export const SMITHS_DIR = '.aiwg/smiths';
export const TOOLSMITH_DIR = `${SMITHS_DIR}/toolsmith`;
export const MCPSMITH_DIR = `${SMITHS_DIR}/mcpsmith`;
export const AGENTSMITH_DIR = `${SMITHS_DIR}/agentsmith`;
export const SKILLSMITH_DIR = `${SMITHS_DIR}/skillsmith`;
export const COMMANDSMITH_DIR = `${SMITHS_DIR}/commandsmith`;
