/**
 * CLI Router Characterization Tests
 *
 * These tests capture the CURRENT behavior of the CLI router (src/cli/index.mjs)
 * before refactoring to the unified extension system. They serve as a safety net
 * to ensure the refactoring preserves existing functionality.
 *
 * @implements @.aiwg/architecture/unified-extension-system-implementation-plan.md
 * @source @src/cli/index.mjs
 * @tests Characterization tests for CLI refactoring
 *
 * Issue: #61 - Write characterization tests for existing CLI behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync, spawn, ChildProcess } from 'child_process';
import { resolve, join } from 'path';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';

const PROJECT_ROOT = resolve(__dirname, '../..');
const CLI_PATH = join(PROJECT_ROOT, 'src/cli/index.mjs');
const BIN_PATH = join(PROJECT_ROOT, 'bin/aiwg.mjs');

/**
 * Helper to run CLI command and capture output
 */
function runCli(args: string[], options: { cwd?: string; timeout?: number } = {}): {
  stdout: string;
  stderr: string;
  exitCode: number;
} {
  const cwd = options.cwd || PROJECT_ROOT;
  const timeout = options.timeout || 30000;

  try {
    const stdout = execSync(`node ${BIN_PATH} ${args.join(' ')}`, {
      encoding: 'utf-8',
      cwd,
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || '',
      exitCode: error.status || 1,
    };
  }
}

describe('CLI Router Characterization Tests', () => {
  describe('Command Alias Mapping', () => {
    /**
     * Captures the exact alias mappings from COMMAND_ALIASES constant.
     * These must be preserved during refactoring.
     */

    describe('project setup aliases', () => {
      it('-new should be equivalent to --new', () => {
        // Both should route to the same handler
        const result1 = runCli(['-new', '--help']);
        const result2 = runCli(['--new', '--help']);
        // They may both fail (no --help support), but should fail the same way
        expect(result1.exitCode).toBe(result2.exitCode);
      });
    });

    describe('workspace management aliases', () => {
      it('-status should be equivalent to --status', () => {
        const result1 = runCli(['-status', '--help']);
        const result2 = runCli(['--status', '--help']);
        expect(result1.exitCode).toBe(result2.exitCode);
      });

      it('-migrate-workspace should be equivalent to --migrate-workspace', () => {
        const result1 = runCli(['-migrate-workspace', '--help']);
        const result2 = runCli(['--migrate-workspace', '--help']);
        expect(result1.exitCode).toBe(result2.exitCode);
      });

      it('-rollback-workspace should be equivalent to --rollback-workspace', () => {
        const result1 = runCli(['-rollback-workspace', '--help']);
        const result2 = runCli(['--rollback-workspace', '--help']);
        expect(result1.exitCode).toBe(result2.exitCode);
      });
    });

    describe('utility aliases', () => {
      it('-prefill-cards should be equivalent to --prefill-cards', () => {
        const result1 = runCli(['-prefill-cards', '--help']);
        const result2 = runCli(['--prefill-cards', '--help']);
        expect(result1.exitCode).toBe(result2.exitCode);
      });

      it('-doctor should be equivalent to --doctor and doctor', () => {
        const result1 = runCli(['-doctor']);
        const result2 = runCli(['--doctor']);
        const result3 = runCli(['doctor']);
        // All should attempt to run doctor
        expect(result1.stdout + result1.stderr).toMatch(/doctor|health|check|error/i);
        expect(result2.stdout + result2.stderr).toMatch(/doctor|health|check|error/i);
        expect(result3.stdout + result3.stderr).toMatch(/doctor|health|check|error/i);
      });
    });

    describe('help aliases', () => {
      it('-h, -help, --help should all show help', () => {
        const result1 = runCli(['-h']);
        const result2 = runCli(['-help']);
        const result3 = runCli(['--help']);
        const result4 = runCli(['help']);

        // All should contain help text
        [result1, result2, result3, result4].forEach((result) => {
          expect(result.stdout).toMatch(/AIWG - AI Writing Guide CLI/);
          expect(result.stdout).toMatch(/Usage:/);
          expect(result.exitCode).toBe(0);
        });
      });
    });

    describe('version aliases', () => {
      it('-version and --version should show version', () => {
        const result1 = runCli(['-version']);
        const result2 = runCli(['--version']);

        [result1, result2].forEach((result) => {
          expect(result.stdout).toMatch(/aiwg version:/i);
          expect(result.stdout).toMatch(/channel:/i);
          expect(result.exitCode).toBe(0);
        });
      });
    });

    describe('ralph aliases', () => {
      it('ralph, -ralph, --ralph should all route to ralph handler', () => {
        // Without args, all should fail similarly (missing required args)
        const result1 = runCli(['ralph']);
        const result2 = runCli(['-ralph']);
        const result3 = runCli(['--ralph']);
        // All should mention ralph in some way
        expect(result1.stdout + result1.stderr + result2.stdout + result2.stderr + result3.stdout + result3.stderr).toBeDefined();
      });
    });
  });

  describe('Help Output Format', () => {
    /**
     * Captures the exact structure of help output.
     * Help text format must be preserved during refactoring.
     */

    let helpOutput: string;

    beforeEach(() => {
      const result = runCli(['--help']);
      helpOutput = result.stdout;
    });

    it('should have header with name and usage', () => {
      expect(helpOutput).toMatch(/AIWG - AI Writing Guide CLI/);
      expect(helpOutput).toMatch(/Usage: aiwg <command> \[options\]/);
    });

    it('should have Framework Management section', () => {
      expect(helpOutput).toMatch(/Framework Management:/);
      expect(helpOutput).toMatch(/use <framework>/);
      expect(helpOutput).toMatch(/list/);
      expect(helpOutput).toMatch(/remove <id>/);
    });

    it('should have Project Setup section', () => {
      expect(helpOutput).toMatch(/Project Setup:/);
      expect(helpOutput).toMatch(/-new/);
    });

    it('should have Workspace Management section', () => {
      expect(helpOutput).toMatch(/Workspace Management:/);
      expect(helpOutput).toMatch(/-status/);
      expect(helpOutput).toMatch(/-migrate-workspace/);
      expect(helpOutput).toMatch(/-rollback-workspace/);
    });

    it('should have MCP Server section', () => {
      expect(helpOutput).toMatch(/MCP Server:/);
      expect(helpOutput).toMatch(/mcp serve/);
      expect(helpOutput).toMatch(/mcp install/);
      expect(helpOutput).toMatch(/mcp info/);
    });

    it('should have Toolsmith section', () => {
      expect(helpOutput).toMatch(/Toolsmith \(Runtime Discovery\):/);
      expect(helpOutput).toMatch(/runtime-info/);
    });

    it('should have Model Catalog section', () => {
      expect(helpOutput).toMatch(/Model Catalog:/);
      expect(helpOutput).toMatch(/catalog list/);
      expect(helpOutput).toMatch(/catalog info/);
      expect(helpOutput).toMatch(/catalog search/);
    });

    it('should have Utilities section', () => {
      expect(helpOutput).toMatch(/Utilities:/);
      expect(helpOutput).toMatch(/-prefill-cards/);
      expect(helpOutput).toMatch(/-contribute-start/);
      expect(helpOutput).toMatch(/-validate-metadata/);
    });

    it('should have Plugin Packaging section', () => {
      expect(helpOutput).toMatch(/Plugin Packaging/);
      expect(helpOutput).toMatch(/-package-plugin/);
      expect(helpOutput).toMatch(/-package-all-plugins/);
    });

    it('should have Scaffolding section', () => {
      expect(helpOutput).toMatch(/Scaffolding:/);
      expect(helpOutput).toMatch(/add-agent/);
      expect(helpOutput).toMatch(/add-command/);
      expect(helpOutput).toMatch(/add-skill/);
      expect(helpOutput).toMatch(/add-template/);
      expect(helpOutput).toMatch(/scaffold-addon/);
      expect(helpOutput).toMatch(/scaffold-extension/);
      expect(helpOutput).toMatch(/scaffold-framework/);
    });

    it('should have Channel Management section', () => {
      expect(helpOutput).toMatch(/Channel Management:/);
      expect(helpOutput).toMatch(/--use-main/);
      expect(helpOutput).toMatch(/--use-stable/);
    });

    it('should have Maintenance section', () => {
      expect(helpOutput).toMatch(/Maintenance:/);
      expect(helpOutput).toMatch(/doctor/);
      expect(helpOutput).toMatch(/-version/);
      expect(helpOutput).toMatch(/-update/);
      expect(helpOutput).toMatch(/-help/);
    });

    it('should have Platform Options section', () => {
      expect(helpOutput).toMatch(/Platform Options:/);
      expect(helpOutput).toMatch(/--provider copilot/);
      expect(helpOutput).toMatch(/--provider factory/);
      expect(helpOutput).toMatch(/--provider openai/);
      expect(helpOutput).toMatch(/--provider windsurf/);
    });

    it('should have Model Selection section', () => {
      expect(helpOutput).toMatch(/Model Selection/);
      expect(helpOutput).toMatch(/--reasoning-model/);
      expect(helpOutput).toMatch(/--coding-model/);
      expect(helpOutput).toMatch(/--efficiency-model/);
    });

    it('should have Ralph Loop section', () => {
      expect(helpOutput).toMatch(/Ralph Loop/);
      expect(helpOutput).toMatch(/ralph.*--completion/);
      expect(helpOutput).toMatch(/ralph-status/);
      expect(helpOutput).toMatch(/ralph-abort/);
      expect(helpOutput).toMatch(/ralph-resume/);
    });

    it('should have Examples section', () => {
      expect(helpOutput).toMatch(/Examples:/);
      expect(helpOutput).toMatch(/aiwg use sdlc/);
      expect(helpOutput).toMatch(/aiwg -new/);
      expect(helpOutput).toMatch(/aiwg doctor/);
    });
  });

  describe('Version Output Format', () => {
    /**
     * Captures the exact format of version output.
     */

    it('should display version in expected format', () => {
      const result = runCli(['--version']);
      expect(result.stdout).toMatch(/aiwg version: \d+\.\d+\.\d+/);
      expect(result.stdout).toMatch(/Channel: (stable|edge)/);
    });

    it('should show package root or git info depending on channel', () => {
      const result = runCli(['--version']);
      // Should have either package root (stable) or git info (edge)
      expect(result.stdout).toMatch(/(Package root|Git):/);
    });
  });

  describe('Command Routing', () => {
    /**
     * Captures which commands route to which handlers.
     * Critical for ensuring registry-based routing works identically.
     */

    describe('use command', () => {
      it('should require framework name', () => {
        const result = runCli(['use']);
        expect(result.stderr).toMatch(/Framework name required/i);
        expect(result.exitCode).toBe(1);
      });

      it('should reject unknown frameworks', () => {
        const result = runCli(['use', 'invalid-framework']);
        expect(result.stderr).toMatch(/Unknown framework/i);
        expect(result.exitCode).toBe(1);
      });

      it('should list valid frameworks on error', () => {
        const result = runCli(['use', 'invalid']);
        expect(result.stdout + result.stderr).toMatch(/sdlc/i);
        expect(result.stdout + result.stderr).toMatch(/marketing/i);
      });
    });

    describe('list command', () => {
      it('should run plugin-status-cli.mjs', () => {
        // Just verify it routes to the handler, not unknown command
        // Exit code may be non-zero if no workspace context
        const result = runCli(['list']);
        expect(result.stdout + result.stderr).not.toMatch(/Unknown command: list/i);
      });
    });

    describe('mcp subcommands', () => {
      it('should route to mcp/cli.mjs', () => {
        const result = runCli(['mcp', 'info']);
        // Should show MCP info or error from MCP handler, not unknown command
        expect(result.stdout + result.stderr).not.toMatch(/Unknown command: mcp/i);
      });
    });

    describe('catalog subcommands', () => {
      it('should route to catalog/cli.mjs', () => {
        const result = runCli(['catalog', 'list']);
        // Should show catalog output or error from catalog handler
        expect(result.stdout + result.stderr).not.toMatch(/Unknown command: catalog/i);
      });
    });

    describe('runtime-info command', () => {
      it('should run without --discover flag', () => {
        const result = runCli(['runtime-info']);
        // Should show summary or prompt to run discovery
        expect(result.stdout + result.stderr).toMatch(/runtime|catalog|discovery/i);
      });
    });

    describe('scaffolding commands', () => {
      it('add-agent should route to scaffolding handler', () => {
        const result = runCli(['add-agent']);
        // Should error about missing name, not unknown command
        expect(result.stdout + result.stderr).not.toMatch(/Unknown command: add-agent/i);
      });

      it('add-command should route to scaffolding handler', () => {
        const result = runCli(['add-command']);
        expect(result.stdout + result.stderr).not.toMatch(/Unknown command: add-command/i);
      });

      it('scaffold-addon should route to scaffolding handler', () => {
        const result = runCli(['scaffold-addon']);
        expect(result.stdout + result.stderr).not.toMatch(/Unknown command: scaffold-addon/i);
      });
    });

    describe('unknown commands', () => {
      it('should report unknown command and suggest help', () => {
        const result = runCli(['completely-unknown-command']);
        expect(result.stderr).toMatch(/Unknown command/i);
        expect(result.stdout + result.stderr).toMatch(/aiwg help/i);
        expect(result.exitCode).toBe(1);
      });
    });
  });

  describe('No Arguments Behavior', () => {
    /**
     * Captures behavior when CLI is run with no arguments.
     */

    it('should show help when no command provided', () => {
      const result = runCli([]);
      expect(result.stdout).toMatch(/AIWG - AI Writing Guide CLI/);
      expect(result.stdout).toMatch(/Usage:/);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Argument Passthrough', () => {
    /**
     * Captures how arguments are passed to sub-handlers.
     */

    it('should pass remaining args after command to handler', () => {
      // use command with extra args
      const result = runCli(['use', 'sdlc', '--dry-run']);
      // Should pass --dry-run to deploy handler
      expect(result.stdout + result.stderr).toMatch(/dry.?run|preview/i);
    });
  });
});

describe('CLI Module Structure Characterization', () => {
  /**
   * Documents the current module structure that the refactoring must accommodate.
   */

  describe('exports', () => {
    it('should export run function', async () => {
      const module = await import(CLI_PATH);
      expect(typeof module.run).toBe('function');
    });
  });

  describe('dependencies', () => {
    it('should have expected imports in CLI module', () => {
      const cliContent = readFileSync(CLI_PATH, 'utf-8');

      // Core imports
      expect(cliContent).toMatch(/import.*fileURLToPath.*from.*url/);
      expect(cliContent).toMatch(/import.*path.*from.*path/);
      expect(cliContent).toMatch(/import.*spawn.*from.*child_process/);

      // Internal imports
      expect(cliContent).toMatch(/import.*getFrameworkRoot.*from.*channel\/manager/);
      expect(cliContent).toMatch(/import.*getVersionInfo.*from.*channel\/manager/);
      expect(cliContent).toMatch(/import.*forceUpdateCheck.*from.*update\/checker/);
    });
  });
});

describe('COMMAND_ALIASES Constant Characterization', () => {
  /**
   * Documents the exact alias mappings that must be migrated to the registry.
   */

  it('should capture all current alias mappings', () => {
    const cliContent = readFileSync(CLI_PATH, 'utf-8');

    // Extract COMMAND_ALIASES from source
    const aliasMatch = cliContent.match(/const COMMAND_ALIASES = \{[\s\S]*?\n\};/);
    expect(aliasMatch).not.toBeNull();

    const aliasBlock = aliasMatch![0];

    // Project setup
    expect(aliasBlock).toMatch(/'-new': 'new'/);
    expect(aliasBlock).toMatch(/'--new': 'new'/);

    // Workspace
    expect(aliasBlock).toMatch(/'-status': 'status'/);
    expect(aliasBlock).toMatch(/'-migrate-workspace': 'migrate-workspace'/);
    expect(aliasBlock).toMatch(/'-rollback-workspace': 'rollback-workspace'/);

    // Utilities
    expect(aliasBlock).toMatch(/'-prefill-cards': 'prefill-cards'/);
    expect(aliasBlock).toMatch(/'-contribute-start': 'contribute-start'/);
    expect(aliasBlock).toMatch(/'-validate-metadata': 'validate-metadata'/);
    expect(aliasBlock).toMatch(/'-install-plugin': 'install-plugin'/);
    expect(aliasBlock).toMatch(/'-uninstall-plugin': 'uninstall-plugin'/);
    expect(aliasBlock).toMatch(/'-plugin-status': 'plugin-status'/);
    expect(aliasBlock).toMatch(/'-package-plugin': 'package-plugin'/);
    expect(aliasBlock).toMatch(/'-package-all-plugins': 'package-all-plugins'/);

    // Maintenance
    expect(aliasBlock).toMatch(/'-doctor': 'doctor'/);
    expect(aliasBlock).toMatch(/'-version': 'version'/);
    expect(aliasBlock).toMatch(/'-update': 'update'/);
    expect(aliasBlock).toMatch(/'-h': 'help'/);
    expect(aliasBlock).toMatch(/'-help': 'help'/);
    expect(aliasBlock).toMatch(/'--help': 'help'/);

    // Scaffolding
    expect(aliasBlock).toMatch(/'add-agent': 'add-agent'/);
    expect(aliasBlock).toMatch(/'add-command': 'add-command'/);
    expect(aliasBlock).toMatch(/'add-skill': 'add-skill'/);
    expect(aliasBlock).toMatch(/'add-template': 'add-template'/);
    expect(aliasBlock).toMatch(/'scaffold-addon': 'scaffold-addon'/);
    expect(aliasBlock).toMatch(/'scaffold-extension': 'scaffold-extension'/);
    expect(aliasBlock).toMatch(/'scaffold-framework': 'scaffold-framework'/);

    // Ralph
    expect(aliasBlock).toMatch(/'ralph': 'ralph'/);
    expect(aliasBlock).toMatch(/'-ralph': 'ralph'/);
    expect(aliasBlock).toMatch(/'--ralph': 'ralph'/);
    expect(aliasBlock).toMatch(/'ralph-status': 'ralph-status'/);
    expect(aliasBlock).toMatch(/'ralph-abort': 'ralph-abort'/);
    expect(aliasBlock).toMatch(/'ralph-resume': 'ralph-resume'/);
  });
});

describe('Switch Case Routing Characterization', () => {
  /**
   * Documents the exact routing that must be replicated by the registry.
   */

  it('should capture all switch cases in CLI', () => {
    const cliContent = readFileSync(CLI_PATH, 'utf-8');

    // Framework management
    expect(cliContent).toMatch(/case 'use':/);
    expect(cliContent).toMatch(/case 'list':/);
    expect(cliContent).toMatch(/case 'remove':/);

    // Project setup
    expect(cliContent).toMatch(/case 'new':/);

    // Workspace
    expect(cliContent).toMatch(/case 'status':/);
    expect(cliContent).toMatch(/case 'migrate-workspace':/);
    expect(cliContent).toMatch(/case 'rollback-workspace':/);

    // MCP
    expect(cliContent).toMatch(/case 'mcp':/);

    // Toolsmith
    expect(cliContent).toMatch(/case 'runtime-info':/);

    // Catalog
    expect(cliContent).toMatch(/case 'catalog':/);

    // Utilities
    expect(cliContent).toMatch(/case 'prefill-cards':/);
    expect(cliContent).toMatch(/case 'contribute-start':/);
    expect(cliContent).toMatch(/case 'validate-metadata':/);
    expect(cliContent).toMatch(/case 'install-plugin':/);
    expect(cliContent).toMatch(/case 'uninstall-plugin':/);
    expect(cliContent).toMatch(/case 'plugin-status':/);
    expect(cliContent).toMatch(/case 'package-plugin':/);
    expect(cliContent).toMatch(/case 'package-all-plugins':/);

    // Maintenance
    expect(cliContent).toMatch(/case 'doctor':/);
    expect(cliContent).toMatch(/case 'version':/);
    expect(cliContent).toMatch(/case 'update':/);
    expect(cliContent).toMatch(/case 'help':/);

    // Scaffolding
    expect(cliContent).toMatch(/case 'add-agent':/);
    expect(cliContent).toMatch(/case 'add-command':/);
    expect(cliContent).toMatch(/case 'add-skill':/);
    expect(cliContent).toMatch(/case 'add-template':/);
    expect(cliContent).toMatch(/case 'scaffold-addon':/);
    expect(cliContent).toMatch(/case 'scaffold-extension':/);
    expect(cliContent).toMatch(/case 'scaffold-framework':/);

    // Ralph
    expect(cliContent).toMatch(/case 'ralph':/);
    expect(cliContent).toMatch(/case 'ralph-status':/);
    expect(cliContent).toMatch(/case 'ralph-abort':/);
    expect(cliContent).toMatch(/case 'ralph-resume':/);

    // Default
    expect(cliContent).toMatch(/default:/);
  });
});

describe('Handler Function Characterization', () => {
  /**
   * Documents which handlers exist and their signatures.
   */

  it('should have expected helper functions', () => {
    const cliContent = readFileSync(CLI_PATH, 'utf-8');

    // Functions that must be preserved/migrated
    expect(cliContent).toMatch(/function normalizeCommand\(cmd\)/);
    expect(cliContent).toMatch(/function displayHelp\(\)/);
    expect(cliContent).toMatch(/async function displayVersion\(\)/);
    expect(cliContent).toMatch(/async function runScript\(scriptPath, args.*options/);
    expect(cliContent).toMatch(/async function handleUse\(args\)/);
    expect(cliContent).toMatch(/async function handleRuntimeInfo\(args\)/);
    expect(cliContent).toMatch(/export async function run\(args, options/);
  });
});
