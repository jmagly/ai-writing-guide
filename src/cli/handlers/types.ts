/**
 * CLI Handler Types
 *
 * Defines the interface for CLI command handlers extracted from the monolithic router.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @source @src/cli/router.ts
 * @issue #33
 */

/**
 * Result of a CLI handler execution
 */
export interface HandlerResult {
  /** Exit code (0 = success, non-zero = error) */
  exitCode: number;

  /** Output message (optional) */
  message?: string;

  /** Error details (optional) */
  error?: Error;
}

/**
 * Context passed to handlers
 */
export interface HandlerContext {
  /** Command arguments (after the command name) */
  args: string[];

  /** Raw arguments including command name */
  rawArgs: string[];

  /** Current working directory */
  cwd: string;

  /** Framework root path */
  frameworkRoot: string;

  /** Whether running in dry-run mode */
  dryRun?: boolean;
}

/**
 * CLI command handler interface
 *
 * All extracted handlers implement this interface for uniform dispatch.
 */
export interface CommandHandler {
  /** Handler identifier matching command name */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description for help text */
  description: string;

  /** Command category for help grouping */
  category: CommandCategory;

  /** Command aliases (e.g., ['-new', '--new'] for 'new') */
  aliases: string[];

  /** Execute the handler */
  execute(ctx: HandlerContext): Promise<HandlerResult>;
}

/**
 * Command categories for help text grouping
 */
export type CommandCategory =
  | 'framework'     // Framework management (use, list, remove)
  | 'project'       // Project setup (new)
  | 'workspace'     // Workspace management (status, migrate, rollback)
  | 'mcp'           // MCP server commands
  | 'toolsmith'     // Runtime discovery
  | 'catalog'       // Model catalog
  | 'utility'       // Utilities (prefill-cards, validate-metadata, etc.)
  | 'plugin'        // Plugin packaging
  | 'scaffolding'   // Scaffolding (add-agent, scaffold-addon, etc.)
  | 'channel'       // Channel management
  | 'maintenance'   // Maintenance (doctor, version, update, help)
  | 'ralph';        // Ralph loop

/**
 * Handler factory function type
 */
export type HandlerFactory = () => CommandHandler;

/**
 * Script runner options
 */
export interface ScriptRunnerOptions {
  /** Working directory */
  cwd?: string;

  /** Additional environment variables */
  env?: Record<string, string>;

  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Script runner interface for delegating to existing scripts
 */
export interface ScriptRunner {
  /**
   * Run a script from the framework root
   *
   * @param scriptPath - Relative path to script from framework root
   * @param args - Arguments to pass to the script
   * @param options - Execution options
   */
  run(scriptPath: string, args: string[], options?: ScriptRunnerOptions): Promise<HandlerResult>;
}
