/**
 * AIWG Smiths - Tool and Server Generation Framework
 *
 * The Smiths ecosystem provides:
 * - Toolsmith: Tool specification generation for subagent scenarios
 * - MCPsmith: MCP server generation from any command/API
 * - AgentSmith: Custom agent generation with platform-aware deployment
 * - SkillSmith: Skill generation with platform-aware deployment
 * - CommandSmith: Platform-aware slash command generation
 * - ContextPipeline: AIWG.md + AGENTS.md generator (cross-platform context bridge)
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

// Re-export context-pipeline (AIWG.md + AGENTS.md generator; ADR-1).
// Namespaced (not flat * export) because its types overlap with agentsmith
// (different concern — assembly of cross-platform context vs subagent persona generation).
export * as ContextPipeline from './context-pipeline/index.js';

// Re-export hook-bridge (cross-provider hook translator; ADR-3 / PUW-018).
// Namespaced because translator types overlap by intent (HookSource etc.).
export * as HookBridge from './hook-bridge/index.js';

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
export const CONTEXT_PIPELINE_DIR = `${SMITHS_DIR}/context-pipeline`;
export const HOOK_BRIDGE_DIR = `${SMITHS_DIR}/hook-bridge`;
