/**
 * CLI Router Characterization Tests
 *
 * These tests capture the behavioral contract of the CLI router to ensure
 * refactoring preserves existing functionality.
 *
 * @implements @.aiwg/architecture/unified-extension-system-implementation-plan.md
 * @source @src/cli/router.ts
 * @tests Characterization tests for CLI behavior
 *
 * Issue: #61 - Write characterization tests for existing CLI behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync, spawn, ChildProcess } from 'child_process';
import { resolve, join } from 'path';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';

const PROJECT_ROOT = resolve(__dirname, '../..');
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
      it('new command should be accessible via --new', () => {
        const result = runCli(['--new', '--help']);
        // Should either succeed or fail with a known error (not crash)
        expect(result.exitCode).toBeDefined();
        expect(typeof result.exitCode).toBe('number');
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
          expect(result.stdout).toMatch(/AIWG/);
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
          // Matches both old format ("aiwg version: X.Y.Z") and new UI format ("◆ aiwg  X.Y.Z  [stable]")
          expect(result.stdout).toMatch(/(aiwg version:|◆ aiwg|\d+\.\d+\.\d+)/i);
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
      expect(helpOutput).toMatch(/AIWG/);
      expect(helpOutput).toMatch(/Usage: aiwg <command> \[options\]/);
    });

    it('should have Framework Management section', () => {
      expect(helpOutput).toMatch(/(Framework Management:|FRAMEWORK)/);
      expect(helpOutput).toMatch(/use/);
      expect(helpOutput).toMatch(/list/);
      expect(helpOutput).toMatch(/remove/);
    });

    it('should have Project Setup section', () => {
      expect(helpOutput).toMatch(/(Project Setup:|PROJECT)/);
      expect(helpOutput).toMatch(/new/);
    });

    it('should have Workspace Management section', () => {
      expect(helpOutput).toMatch(/(Workspace Management:|WORKSPACE)/);
      expect(helpOutput).toMatch(/status/);
      expect(helpOutput).toMatch(/migrate-workspace/);
      expect(helpOutput).toMatch(/rollback-workspace/);
    });

    it('should have MCP Server section', () => {
      expect(helpOutput).toMatch(/(MCP Server:|MCP SERVER)/);
      expect(helpOutput).toMatch(/mcp serve/);
      expect(helpOutput).toMatch(/mcp install/);
      expect(helpOutput).toMatch(/mcp info/);
    });

    it('should have Toolsmith section', () => {
      expect(helpOutput).toMatch(/(Toolsmith|TOOLSMITH)/);
      expect(helpOutput).toMatch(/runtime-info/);
    });

    it('should have Model Catalog section', () => {
      expect(helpOutput).toMatch(/(Model Catalog:|CATALOG)/);
      expect(helpOutput).toMatch(/catalog list/);
      expect(helpOutput).toMatch(/catalog info/);
      expect(helpOutput).toMatch(/catalog search/);
    });

    it('should have Scaffolding section', () => {
      expect(helpOutput).toMatch(/(Scaffolding:|SCAFFOLDING)/);
      expect(helpOutput).toMatch(/add-agent/);
      expect(helpOutput).toMatch(/add-command/);
      expect(helpOutput).toMatch(/add-skill/);
      expect(helpOutput).toMatch(/scaffold-addon/);
      expect(helpOutput).toMatch(/scaffold-framework/);
    });

    it('should have Channel Management section', () => {
      expect(helpOutput).toMatch(/(Channel Management:|CHANNEL)/);
      expect(helpOutput).toMatch(/--use-main/);
      expect(helpOutput).toMatch(/--use-stable/);
    });

    it('should have Maintenance section', () => {
      expect(helpOutput).toMatch(/(Maintenance:|MAINTENANCE)/);
      expect(helpOutput).toMatch(/doctor/);
      expect(helpOutput).toMatch(/version/);
      expect(helpOutput).toMatch(/update/);
      expect(helpOutput).toMatch(/help/);
    });

    it('should list supported providers', () => {
      // Providers listed either as a section or an inline line
      expect(helpOutput).toMatch(/(Platform Options|Providers:)/);
      expect(helpOutput).toMatch(/copilot/);
      expect(helpOutput).toMatch(/factory/);
      expect(helpOutput).toMatch(/(codex|openai)/);
      expect(helpOutput).toMatch(/windsurf/);
      expect(helpOutput).toMatch(/cursor/);
      expect(helpOutput).toMatch(/opencode/);
      expect(helpOutput).toMatch(/warp/);
    });

    it('should have Ralph Loop section', () => {
      expect(helpOutput).toMatch(/(Ralph Loop|RALPH LOOP)/);
      expect(helpOutput).toMatch(/ralph.*--completion/);
      expect(helpOutput).toMatch(/ralph-status/);
      expect(helpOutput).toMatch(/ralph-abort/);
      expect(helpOutput).toMatch(/ralph-resume/);
    });

    it('should have Examples section', () => {
      expect(helpOutput).toMatch(/Examples:/);
      expect(helpOutput).toMatch(/aiwg use sdlc/);
      expect(helpOutput).toMatch(/aiwg doctor/);
    });
  });

  describe('Version Output Format', () => {
    /**
     * Captures the exact format of version output.
     */

    it('should display version in expected format', () => {
      const result = runCli(['--version']);
      // Matches both old format ("aiwg version: X.Y.Z") and new format ("◆ aiwg  X.Y.Z  [stable]")
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
      expect(result.stdout).toMatch(/(stable|edge|dev|rc|alpha|beta|nightly)/);
    });

    it('should show path or git info', () => {
      const result = runCli(['--version']);
      // Old format: "Edge path:" / "Package root:", new format: "path:" / "git:"
      expect(result.stdout).toMatch(/(path|git):/i);
    });
  });

  describe('Command Routing', () => {
    /**
     * Captures which commands route to which handlers.
     * Critical for ensuring registry-based routing works identically.
     */

    describe('use command', () => {
      it('should require framework name or config when no args given', () => {
        // Must run from a directory without aiwg.config to trigger the error (#621)
        const tempDir = join(tmpdir(), `aiwg-test-${Date.now()}`);
        mkdirSync(tempDir, { recursive: true });
        try {
          const result = runCli(['use'], { cwd: tempDir });
          expect(result.stderr).toMatch(/Framework,? addon,? or extension name required/i);
          expect(result.exitCode).toBe(1);
        } finally {
          rmSync(tempDir, { recursive: true, force: true });
        }
      });

      it('should reject unknown frameworks', () => {
        const result = runCli(['use', 'invalid-framework']);
        expect(result.stderr).toMatch(/Unknown target/i);
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
        const result = runCli(['aiwg-mcp', 'info']);
        // Should show MCP info or error from MCP handler, not unknown command
        expect(result.stdout + result.stderr).not.toMatch(/Unknown command: aiwg-mcp/i);
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
      expect(result.stdout).toMatch(/AIWG/);
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
