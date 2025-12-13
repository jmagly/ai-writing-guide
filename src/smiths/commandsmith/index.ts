/**
 * CommandSmith - Platform-Aware Slash Command Generator
 *
 * Generates slash commands with templates and multi-platform support.
 *
 * @example
 * ```typescript
 * import { generateCommand, deployCommand } from './commandsmith/index.js';
 *
 * // Generate a command
 * const command = await generateCommand({
 *   name: 'my-workflow',
 *   description: 'Execute my custom workflow',
 *   template: 'orchestration',
 *   platform: 'claude',
 *   projectPath: '/path/to/project',
 *   args: [
 *     { name: 'target', description: 'Target environment', required: true },
 *   ],
 *   options: [
 *     { name: 'dry-run', description: 'Preview changes', type: 'boolean' },
 *   ],
 * });
 *
 * // Deploy the command
 * const result = await deployCommand(command, { backup: true });
 * if (result.success) {
 *   console.log(`Command deployed to ${result.command.path}`);
 * }
 * ```
 *
 * @module commandsmith
 */

// Export types
export type {
  CommandTemplate,
  CommandArg,
  CommandOption,
  CommandOptions,
  GeneratedCommand,
  CommandFrontmatter,
  CursorCommandSpec,
  CommandDeploymentResult,
  ValidationIssue,
  ValidationResult,
} from './types.js';

// Export template functions
export {
  generateFrontmatter,
  generateArgumentsSection,
  generateOptionsSection,
  generateUtilityTemplate,
  generateTransformationTemplate,
  generateOrchestrationTemplate,
  generateCommandContent,
} from './templates.js';

// Export generator functions
export {
  validateCommand,
  generateCommand,
  deployCommand,
  generateAndDeploy,
  listCommands,
} from './generator.js';

// Note: Platform type is exported from agentsmith to avoid conflicts with toolsmith
// Export platform utilities (re-export from shared location)
export {
  getCommandsDirectory,
  getAgentsDirectory,
  getSkillsDirectory,
  getFileExtension,
  getRulesDirectory,
  usesAggregatedFiles,
  getConfigFileName,
  getPlatformDirectories,
} from '../platform-paths.js';
