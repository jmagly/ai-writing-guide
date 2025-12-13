/**
 * AIWG Smiths - Tool and Server Generation Framework
 *
 * The Smiths ecosystem provides:
 * - Toolsmith: Tool specification generation for subagent scenarios
 * - MCPsmith: MCP server generation from any command/API
 *
 * @module smiths
 */

// Re-export Toolsmith
export * from './toolsmith/index.js';

// Re-export MCPsmith
export * from './mcpsmith/index.js';

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
