/**
 * Shared platform directory path utilities
 *
 * Provides consistent path resolution for agents, commands, and skills across all platforms.
 */

import { Platform } from '../agents/types.js';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Get the commands directory for a given platform
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Full path to commands directory
 */
export function getCommandsDirectory(platform: Platform, projectPath: string): string {
  const dirs: Record<Platform, string> = {
    'claude': '.claude/commands',
    'factory': '.factory/commands',
    'cursor': '.cursor/commands',
    'codex': '.codex/commands', // Codex commands are a static built-in enum in codex-rs; .codex/commands/ files are not auto-scanned. Path keeps writing per ADR-1 always-deploy invariant — files remain operator-visible and bridged via AGENTS.md links. See #1104.
    'copilot': '.github/agents',
    'hermes': '', // Hermes commands are statically registered in Python; no file-based command directory
    'opencode': '.opencode/command', // OpenCode scans .opencode/command/**/*.md via ConfigCommand.load() (PUW-006 #1107)
    'openclaw': join(homedir(), '.openclaw', 'commands'),
    'warp': '.warp/commands', // Not natively discovered — content delivered via WARP.md
    'windsurf': '.windsurf/workflows',
    'generic': 'commands',
  };
  const dir = dirs[platform];
  if (!dir) return '';
  // Absolute paths (home-dir providers) are returned as-is
  if (dir.startsWith('/')) return dir;
  return join(projectPath, dir);
}

/**
 * Get the agents directory for a given platform
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Full path to agents directory
 */
export function getAgentsDirectory(platform: Platform, projectPath: string): string {
  const dirs: Record<Platform, string> = {
    'claude': '.claude/agents',
    'factory': '.factory/droids',
    'cursor': '.cursor/agents',
    'codex': '.codex/agents',
    'copilot': '.github/agents',
    'hermes': '', // Aggregated into AGENTS.md at project root
    'opencode': '', // OpenCode agents are scanned via {agent,agents}/**/*.md glob (#773); not used by this getter — see PROVIDER_PATHS in src/cli/handlers/use.ts
    'openclaw': join(homedir(), '.openclaw', 'agents'),
    'warp': '.warp/agents', // Not natively discovered — content delivered via WARP.md
    'windsurf': '.windsurf/agents',
    'generic': 'agents',
  };
  const dir = dirs[platform];
  if (!dir) return '';
  if (dir.startsWith('/')) return dir;
  return join(projectPath, dir);
}

/**
 * Get the skills directory for a given platform
 *
 * Skills are mainly a Claude concept; other platforms map to commands/agents.
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Full path to skills directory
 */
export function getSkillsDirectory(platform: Platform, projectPath: string): string {
  const dirs: Record<Platform, string> = {
    'claude': '.claude/skills',
    'factory': '.factory/skills',
    'cursor': '.cursor/skills',
    'codex': '.codex/skills',
    'copilot': '.github/skills',
    'hermes': join(homedir(), '.hermes', 'skills'),
    'opencode': '.opencode/skill',
    'openclaw': join(homedir(), '.openclaw', 'skills'),
    'warp': '.warp/skills',
    'windsurf': '.windsurf/skills',
    'generic': 'skills',
  };
  const dir = dirs[platform];
  if (!dir) return '';
  if (dir.startsWith('/')) return dir;
  return join(projectPath, dir);
}

/**
 * Get the file extension for artifacts on a given platform
 *
 * @param platform - Target platform
 * @returns File extension (with dot)
 */
export function getFileExtension(platform: Platform): string {
  if (platform === 'cursor') return '.json';
  return '.md';
}

/**
 * Get the rules/config directory for a given platform
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Full path to rules/config directory
 */
export function getRulesDirectory(platform: Platform, projectPath: string): string {
  const dirs: Record<Platform, string> = {
    'claude': '.claude/rules',
    'factory': '.factory/rules',
    'cursor': '.cursor/rules',
    'codex': '.codex/rules',
    'copilot': '.github/copilot-rules',
    'hermes': '', // Not applicable — Hermes uses AGENTS.md
    'opencode': '.opencode/rule',
    'openclaw': join(homedir(), '.openclaw', 'rules'),
    'warp': '.warp/rules', // Not natively discovered — content delivered via WARP.md
    'windsurf': '.windsurf/rules',
    'generic': 'rules',
  };
  const dir = dirs[platform];
  if (!dir) return '';
  if (dir.startsWith('/')) return dir;
  return join(projectPath, dir);
}

/**
 * Check if platform uses aggregated files (vs individual files)
 *
 * @param platform - Target platform
 * @returns True if platform uses aggregated agent/command files
 */
export function usesAggregatedFiles(platform: Platform): boolean {
  return platform === 'windsurf' || platform === 'warp';
}

/**
 * Get the main config file name for a platform
 *
 * @param platform - Target platform
 * @returns Config file name
 */
export function getConfigFileName(platform: Platform): string {
  const configs: Record<Platform, string> = {
    'claude': 'CLAUDE.md',
    'factory': 'AGENTS.md',
    'cursor': 'AGENTS.md',  // PUW-037 (#1138): .cursorrules deprecated; Cursor reads AGENTS.md + .cursor/rules/ MDC files
    'codex': 'AGENTS.md',
    'copilot': 'copilot-instructions.md',
    'hermes': 'AGENTS.md',
    'opencode': 'AGENTS.md',
    'openclaw': 'AGENTS.md',
    'warp': 'WARP.md',
    'windsurf': '.windsurfrules',
    'generic': 'README.md',
  };
  return configs[platform];
}

/**
 * Get all platform directories for a project
 *
 * @param platform - Target platform
 * @param projectPath - Project root directory
 * @returns Object with all platform-specific directories
 */
export function getPlatformDirectories(platform: Platform, projectPath: string) {
  return {
    agents: getAgentsDirectory(platform, projectPath),
    commands: getCommandsDirectory(platform, projectPath),
    skills: getSkillsDirectory(platform, projectPath),
    rules: getRulesDirectory(platform, projectPath),
    extension: getFileExtension(platform),
    config: join(projectPath, getConfigFileName(platform)),
    aggregated: usesAggregatedFiles(platform),
  };
}
