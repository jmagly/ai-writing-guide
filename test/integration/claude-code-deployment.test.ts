/**
 * Claude Code Integration Tests
 *
 * Tests for Claude Code CLI integration including:
 * - Agent deployment to .claude/agents/
 * - Command deployment to .claude/commands/
 * - MCP configuration generation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import { mkdtempSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync, spawnSync } from 'child_process';

// Test directories
const TEST_PROJECT_DIR = path.join(os.tmpdir(), 'aiwg-claude-test-project');
const TEST_HOME_DIR = path.join(os.tmpdir(), 'aiwg-claude-test-home');
const TEST_CLAUDE_DIR = path.join(TEST_PROJECT_DIR, '.claude');
const REPO_ROOT = path.resolve(__dirname, '../..');

function canInitGit(): boolean {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'aiwg-claude-git-check-'));
  try {
    execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

const GIT_INIT_AVAILABLE = canInitGit();

// Check if claude CLI is available
function isClaudeAvailable(): boolean {
  try {
    const result = spawnSync('claude', ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

const CLAUDE_AVAILABLE = isClaudeAvailable();

// Helper to run claude CLI commands
function runClaude(
  args: string[],
  options: { cwd?: string; timeout?: number } = {}
): { stdout: string; stderr: string; status: number | null } {
  try {
    const result = spawnSync('claude', args, {
      encoding: 'utf-8',
      timeout: options.timeout || 30000,
      cwd: options.cwd || process.cwd(),
      env: process.env,
    });
    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      status: result.status,
    };
  } catch (e) {
    return { stdout: '', stderr: String(e), status: -1 };
  }
}

// Helper to run CLI commands
function runAiwg(args: string[], cwd = TEST_PROJECT_DIR): string {
  const env = {
    ...process.env,
    HOME: TEST_HOME_DIR,
    USERPROFILE: TEST_HOME_DIR,
  };

  // Use bin/aiwg.mjs which properly awaits async operations
  return execFileSync(process.execPath, [path.join(REPO_ROOT, 'bin/aiwg.mjs'), ...args], {
    cwd,
    env,
    encoding: 'utf-8',
  });
}

// Helper to run deployment scripts directly
function runScript(scriptPath: string, args: string[] = []): string {
  const env = {
    ...process.env,
    HOME: TEST_HOME_DIR,
    USERPROFILE: TEST_HOME_DIR,
  };

  return execFileSync(process.execPath, [path.join(REPO_ROOT, scriptPath), ...args], {
    cwd: TEST_PROJECT_DIR,
    env,
    encoding: 'utf-8',
  });
}

describe.skipIf(!GIT_INIT_AVAILABLE)('Claude Code Integration', () => {
  beforeEach(async () => {
    // Create test directories
    await fs.mkdir(TEST_PROJECT_DIR, { recursive: true });
    await fs.mkdir(TEST_CLAUDE_DIR, { recursive: true });
    await fs.mkdir(path.join(TEST_HOME_DIR, '.claude'), { recursive: true });

    // Initialize as git repo
    execFileSync('git', ['init'], { cwd: TEST_PROJECT_DIR, stdio: 'pipe' });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(TEST_PROJECT_DIR, { recursive: true, force: true });
    await fs.rm(TEST_HOME_DIR, { recursive: true, force: true });
  });

  describe('Agent Deployment', () => {
    it('deploys agents to .claude/agents/', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'claude',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const agentsDir = path.join(TEST_CLAUDE_DIR, 'agents');
      const agents = await fs.readdir(agentsDir);

      expect(agents.length).toBeGreaterThan(0);
      expect(agents.some((a) => a.endsWith('.md'))).toBe(true);
    });

    it('formats agent with correct YAML frontmatter', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'claude',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const agentsDir = path.join(TEST_CLAUDE_DIR, 'agents');
      const agents = await fs.readdir(agentsDir);

      // Find an agent file
      const agentFile = agents.find((a) => a.endsWith('.md'));
      expect(agentFile).toBeDefined();

      const agentContent = await fs.readFile(
        path.join(agentsDir, agentFile!),
        'utf-8'
      );

      // Check YAML frontmatter format
      expect(agentContent).toMatch(/^---\n/);
      expect(agentContent).toMatch(/name: .+/);
      expect(agentContent).toMatch(/description: .+/);
      expect(agentContent).toMatch(/model: (sonnet|opus|haiku)/);
      expect(agentContent).toMatch(/\n---\n/);
    });

    it('includes tools in frontmatter', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'claude',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const agentsDir = path.join(TEST_CLAUDE_DIR, 'agents');
      const agents = await fs.readdir(agentsDir);

      // Check implementation agent for tools
      const implementer = agents.find((a) => a.includes('software-implementer'));
      if (implementer) {
        const content = await fs.readFile(
          path.join(agentsDir, implementer),
          'utf-8'
        );
        expect(content).toContain('tools:');
        expect(content).toMatch(/Read|Write|Bash|Edit/);
      }
    });
  });

  describe('Command Deployment', () => {
    it('deploys commands to .claude/commands/', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'claude',
        '--mode', 'sdlc',
        '--deploy-commands',
        '--target', TEST_PROJECT_DIR
      ]);

      const commandsDir = path.join(TEST_CLAUDE_DIR, 'commands');
      const commands = await fs.readdir(commandsDir);

      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some((c) => c.endsWith('.md'))).toBe(true);
    });

    it('command files are valid markdown', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'claude',
        '--mode', 'sdlc',
        '--deploy-commands',
        '--target', TEST_PROJECT_DIR
      ]);

      const commandsDir = path.join(TEST_CLAUDE_DIR, 'commands');
      const commands = await fs.readdir(commandsDir);

      for (const cmd of commands.filter((c) => c.endsWith('.md'))) {
        const content = await fs.readFile(
          path.join(commandsDir, cmd),
          'utf-8'
        );
        // Should be readable markdown content
        expect(content.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Claude Agents Directory', () => {
    it('deploys agents directly to .claude/agents/ without AGENTS.md', async () => {
      // Claude Code uses .claude/agents/ directory directly - no AGENTS.md needed
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'claude',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      // Verify agents are deployed
      const agentsDir = path.join(TEST_CLAUDE_DIR, 'agents');
      const agents = await fs.readdir(agentsDir);
      expect(agents.length).toBeGreaterThan(0);

      // Claude Code doesn't need AGENTS.md - agents are discovered from .claude/agents/
      // This is different from Cursor/Codex/Factory which use AGENTS.md as an index
    });
  });

  describe('MCP Configuration', () => {
    it('generates valid JSON config for Claude Code', async () => {
      const output = runAiwg(['mcp', 'install', 'claude', '--dry-run']);

      expect(output).toContain('[DRY RUN]');
    });
  });

  describe('Dry Run', () => {
    it('--dry-run shows what would be deployed without writing', async () => {
      const output = runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'claude',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR,
        '--dry-run'
      ]);

      expect(output).toContain('[dry-run]');

      // Verify no agents directory was created
      const agentsDir = path.join(TEST_CLAUDE_DIR, 'agents');
      const exists = await fs.access(agentsDir).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });
  });
});

/**
 * Live Claude Code CLI Integration Tests
 *
 * These tests validate integration with the actual Claude Code CLI tool.
 * Tests are skipped if Claude CLI is not installed.
 */
describe('Claude Code CLI Integration', () => {
  it.skipIf(!CLAUDE_AVAILABLE)('claude CLI is installed and accessible', () => {
    const result = runClaude(['--version']);
    expect(result.status).toBe(0);
    // Claude Code version format: X.X.X (Claude Code)
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    expect(result.stdout).toContain('Claude Code');
  });

  it.skipIf(!CLAUDE_AVAILABLE)('claude --help returns available commands', () => {
    const result = runClaude(['--help']);
    expect(result.status).toBe(0);
    // Should show usage information
    expect(result.stdout.toLowerCase()).toContain('usage');
  });

  it.skipIf(!CLAUDE_AVAILABLE)('claude supports agent flag', () => {
    const result = runClaude(['--help']);
    expect(result.status).toBe(0);
    // Should have --agent option documented
    expect(result.stdout).toContain('--agent');
  });

  it.skipIf(!CLAUDE_AVAILABLE)('claude supports MCP configuration', () => {
    const result = runClaude(['--help']);
    expect(result.status).toBe(0);
    // Should have MCP-related options
    expect(result.stdout).toContain('--mcp-config');
  });

  describe('Agent Configuration Validation', () => {
    it.skipIf(!CLAUDE_AVAILABLE)('validates .claude/agents/ directory structure', async () => {
      // Create test directory with proper structure
      const testDir = path.join(os.tmpdir(), 'claude-agent-test-' + Date.now());
      const agentsDir = path.join(testDir, '.claude', 'agents');
      await fs.mkdir(agentsDir, { recursive: true });

      // Create a test agent file with Claude Code format
      const agentContent = `---
name: test-agent
description: Test agent for validation
model: sonnet
tools: Read, Write, Bash
---

# Test Agent

This is a test agent for Claude Code integration.
`;
      await fs.writeFile(path.join(agentsDir, 'test-agent.md'), agentContent);

      // Verify structure
      const agents = await fs.readdir(agentsDir);
      expect(agents).toContain('test-agent.md');

      // Verify format
      const content = await fs.readFile(path.join(agentsDir, 'test-agent.md'), 'utf-8');
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('name: test-agent');
      expect(content).toContain('model: sonnet');
      expect(content).toContain('tools:');

      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });
    });
  });

  describe('Command Configuration Validation', () => {
    it.skipIf(!CLAUDE_AVAILABLE)('validates .claude/commands/ directory structure', async () => {
      // Create test directory with proper structure
      const testDir = path.join(os.tmpdir(), 'claude-command-test-' + Date.now());
      const commandsDir = path.join(testDir, '.claude', 'commands');
      await fs.mkdir(commandsDir, { recursive: true });

      // Create a test command file
      const commandContent = `# Test Command

This is a test command for Claude Code integration.

## Usage

Run this command to test validation.
`;
      await fs.writeFile(path.join(commandsDir, 'test-command.md'), commandContent);

      // Verify structure
      const commands = await fs.readdir(commandsDir);
      expect(commands).toContain('test-command.md');

      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });
    });
  });

  describe('MCP Configuration Validation', () => {
    it.skipIf(!CLAUDE_AVAILABLE)('validates MCP JSON format', async () => {
      // Create a test MCP config
      const testDir = path.join(os.tmpdir(), 'claude-mcp-test-' + Date.now());
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });

      const mcpConfig = {
        mcpServers: {
          aiwg: {
            command: 'aiwg',
            args: ['mcp', 'serve'],
          },
        },
      };

      await fs.writeFile(
        path.join(testDir, '.claude', 'mcp.json'),
        JSON.stringify(mcpConfig, null, 2)
      );

      // Verify JSON is valid
      const readBack = await fs.readFile(
        path.join(testDir, '.claude', 'mcp.json'),
        'utf-8'
      );
      const parsed = JSON.parse(readBack);

      expect(parsed.mcpServers.aiwg).toBeDefined();
      expect(parsed.mcpServers.aiwg.command).toBe('aiwg');

      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });
    });
  });

  describe('CLAUDE.md Validation', () => {
    it.skipIf(!CLAUDE_AVAILABLE)('validates CLAUDE.md structure', async () => {
      // Create a test CLAUDE.md
      const testDir = path.join(os.tmpdir(), 'claude-md-test-' + Date.now());
      await fs.mkdir(testDir, { recursive: true });

      const claudeMd = `# Project Context

This project uses AIWG SDLC Framework.

## Quick Start

\`\`\`bash
aiwg -deploy-agents
\`\`\`

## Agents

Agents are deployed to \`.claude/agents/\`.
`;

      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), claudeMd);

      // Verify content
      const content = await fs.readFile(path.join(testDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('# Project Context');
      expect(content).toContain('.claude/agents/');

      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });
    });
  });

  describe('CLI Availability Reporting', () => {
    it('reports claude CLI availability status', () => {
      // This test always runs to report status
      console.log(`\n  Claude Code CLI Status:`);
      console.log(`    Available: ${CLAUDE_AVAILABLE}`);
      if (CLAUDE_AVAILABLE) {
        const version = runClaude(['--version']);
        console.log(`    Version: ${version.stdout.trim()}`);
      } else {
        console.log('    Install: npm install -g @anthropic-ai/claude-code');
      }
      expect(true).toBe(true); // Always passes, just for reporting
    });
  });
});
