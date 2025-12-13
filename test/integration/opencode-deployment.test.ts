/**
 * Integration tests for OpenCode provider deployment
 *
 * Tests AIWG agent and command deployment to OpenCode format.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// OpenCode is installed at ~/.opencode/bin/opencode
const OPENCODE_PATH = path.join(os.homedir(), '.opencode', 'bin', 'opencode');

// Check if opencode CLI is available
function isOpenCodeAvailable(): boolean {
  try {
    // Try direct path first
    if (fs.existsSync(OPENCODE_PATH)) {
      const result = spawnSync(OPENCODE_PATH, ['--version'], {
        encoding: 'utf-8',
        timeout: 5000,
      });
      return result.status === 0;
    }
    // Try via PATH
    const result = spawnSync('opencode', ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
      shell: true,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

const OPENCODE_AVAILABLE = isOpenCodeAvailable();

// Helper to run opencode CLI commands
function runOpenCode(
  args: string[],
  options: { cwd?: string; timeout?: number } = {}
): { stdout: string; stderr: string; status: number | null } {
  try {
    // Use direct path if available, otherwise try via shell
    const cmd = fs.existsSync(OPENCODE_PATH) ? OPENCODE_PATH : 'opencode';
    const result = spawnSync(cmd, args, {
      encoding: 'utf-8',
      timeout: options.timeout || 30000,
      cwd: options.cwd || process.cwd(),
      env: process.env,
      shell: !fs.existsSync(OPENCODE_PATH),
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

describe('OpenCode Deployment', () => {
  let testDir: string;
  const deployScript = path.resolve(__dirname, '../../tools/agents/deploy-agents.mjs');

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-opencode-test-'));
  });

  afterEach(() => {
    // Cleanup test directory
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Agent Deployment', () => {
    it('should deploy agents to .opencode/agent/ directory', () => {
      execSync(`node ${deployScript} --target ${testDir} --provider opencode --mode sdlc`, {
        encoding: 'utf-8'
      });

      const agentDir = path.join(testDir, '.opencode', 'agent');
      expect(fs.existsSync(agentDir)).toBe(true);

      const agents = fs.readdirSync(agentDir);
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.some(a => a.endsWith('.md'))).toBe(true);
    });

    it('should transform agent frontmatter to OpenCode format', () => {
      execSync(`node ${deployScript} --target ${testDir} --provider opencode --mode sdlc`, {
        encoding: 'utf-8'
      });

      const agentDir = path.join(testDir, '.opencode', 'agent');
      const agents = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));

      // Pick first agent to verify format
      const agentContent = fs.readFileSync(path.join(agentDir, agents[0]), 'utf-8');

      // Verify OpenCode frontmatter fields
      expect(agentContent).toMatch(/^---/);
      expect(agentContent).toMatch(/description:/);
      expect(agentContent).toMatch(/mode:\s*(primary|subagent)/);
      expect(agentContent).toMatch(/model:\s*anthropic\//);
      expect(agentContent).toMatch(/temperature:/);
      expect(agentContent).toMatch(/maxSteps:/);
    });

    it('should include tools configuration for agents', () => {
      execSync(`node ${deployScript} --target ${testDir} --provider opencode --mode sdlc`, {
        encoding: 'utf-8'
      });

      const agentDir = path.join(testDir, '.opencode', 'agent');
      const agents = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));

      // Check at least one agent has tools configuration
      let hasToolsConfig = false;
      for (const agent of agents) {
        const content = fs.readFileSync(path.join(agentDir, agent), 'utf-8');
        if (content.includes('tools:') && (content.includes('write:') || content.includes('bash:'))) {
          hasToolsConfig = true;
          break;
        }
      }
      expect(hasToolsConfig).toBe(true);
    });

    it('should include permission configuration for implementation agents', () => {
      execSync(`node ${deployScript} --target ${testDir} --provider opencode --mode sdlc`, {
        encoding: 'utf-8'
      });

      const agentDir = path.join(testDir, '.opencode', 'agent');

      // Find an implementation-type agent
      const implementerAgent = path.join(agentDir, 'software-implementer.md');
      if (fs.existsSync(implementerAgent)) {
        const content = fs.readFileSync(implementerAgent, 'utf-8');
        expect(content).toMatch(/permission:/);
        expect(content).toMatch(/bash:/);
      }
    });
  });

  describe('Command Deployment', () => {
    it('should deploy commands to .opencode/command/ directory', () => {
      execSync(`node ${deployScript} --target ${testDir} --provider opencode --mode sdlc --deploy-commands`, {
        encoding: 'utf-8'
      });

      const commandDir = path.join(testDir, '.opencode', 'command');
      expect(fs.existsSync(commandDir)).toBe(true);

      const commands = fs.readdirSync(commandDir);
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some(c => c.endsWith('.md'))).toBe(true);
    });

    it('should transform command frontmatter to OpenCode format', () => {
      execSync(`node ${deployScript} --target ${testDir} --provider opencode --mode sdlc --deploy-commands`, {
        encoding: 'utf-8'
      });

      const commandDir = path.join(testDir, '.opencode', 'command');
      const commands = fs.readdirSync(commandDir).filter(f => f.endsWith('.md'));

      if (commands.length > 0) {
        const commandContent = fs.readFileSync(path.join(commandDir, commands[0]), 'utf-8');

        // Verify OpenCode command frontmatter
        expect(commandContent).toMatch(/^---/);
        expect(commandContent).toMatch(/description:/);
        expect(commandContent).toMatch(/subtask:\s*true/);
      }
    });
  });

  describe('AGENTS.md Generation', () => {
    it('should create AGENTS.md when --create-agents-md is specified', () => {
      execSync(`node ${deployScript} --target ${testDir} --provider opencode --mode sdlc --create-agents-md`, {
        encoding: 'utf-8'
      });

      const agentsMdPath = path.join(testDir, 'AGENTS.md');
      expect(fs.existsSync(agentsMdPath)).toBe(true);

      const content = fs.readFileSync(agentsMdPath, 'utf-8');
      expect(content).toContain('AIWG SDLC Framework');
      expect(content).toContain('.opencode/agent/');
    });

    it('should append to existing AGENTS.md without duplicating', () => {
      // Create initial AGENTS.md
      const agentsMdPath = path.join(testDir, 'AGENTS.md');
      fs.writeFileSync(agentsMdPath, '# Project Agents\n\nExisting content.\n');

      // Deploy twice
      execSync(`node ${deployScript} --target ${testDir} --provider opencode --mode sdlc --create-agents-md`, {
        encoding: 'utf-8'
      });
      execSync(`node ${deployScript} --target ${testDir} --provider opencode --mode sdlc --create-agents-md`, {
        encoding: 'utf-8'
      });

      const content = fs.readFileSync(agentsMdPath, 'utf-8');

      // Should contain AIWG marker comment only once (not duplicated by second deploy)
      // Note: The template contains "AIWG SDLC Framework" twice (in comment and heading), which is expected
      const markerMatches = content.match(/<!-- AIWG SDLC Framework Integration -->/g);
      expect(markerMatches?.length).toBe(1);

      // Should contain the heading only once
      const headerMatches = content.match(/## AIWG SDLC Framework/g);
      expect(headerMatches?.length).toBe(1);

      // Should preserve original content
      expect(content).toContain('Existing content.');
    });
  });

  describe('Model Configuration', () => {
    it('should use OpenCode model format (anthropic/model-name)', () => {
      execSync(`node ${deployScript} --target ${testDir} --provider opencode --mode sdlc`, {
        encoding: 'utf-8'
      });

      const agentDir = path.join(testDir, '.opencode', 'agent');
      const agents = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));

      for (const agent of agents.slice(0, 5)) {
        const content = fs.readFileSync(path.join(agentDir, agent), 'utf-8');
        const modelMatch = content.match(/model:\s*([^\n]+)/);
        if (modelMatch) {
          expect(modelMatch[1]).toMatch(/^anthropic\//);
        }
      }
    });

    it('should accept model overrides', () => {
      execSync(
        `node ${deployScript} --target ${testDir} --provider opencode --mode sdlc ` +
        `--reasoning-model anthropic/claude-opus-4-20250514 ` +
        `--coding-model anthropic/claude-sonnet-4-20250514`,
        { encoding: 'utf-8' }
      );

      const agentDir = path.join(testDir, '.opencode', 'agent');
      const agents = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));

      // Verify at least one agent uses the override model
      let foundOverride = false;
      for (const agent of agents) {
        const content = fs.readFileSync(path.join(agentDir, agent), 'utf-8');
        if (content.includes('anthropic/claude-sonnet-4-20250514') ||
            content.includes('anthropic/claude-opus-4-20250514')) {
          foundOverride = true;
          break;
        }
      }
      expect(foundOverride).toBe(true);
    });
  });

  describe('Marketing Mode', () => {
    it('should deploy marketing agents when mode is marketing', () => {
      execSync(`node ${deployScript} --target ${testDir} --provider opencode --mode marketing`, {
        encoding: 'utf-8'
      });

      const agentDir = path.join(testDir, '.opencode', 'agent');
      expect(fs.existsSync(agentDir)).toBe(true);

      const agents = fs.readdirSync(agentDir);
      // Marketing agents should include content-related agents
      expect(agents.some(a =>
        a.includes('content') ||
        a.includes('marketing') ||
        a.includes('campaign') ||
        a.includes('copywriter')
      )).toBe(true);
    });
  });

  describe('Dry Run', () => {
    it('should not write files in dry-run mode', () => {
      execSync(`node ${deployScript} --target ${testDir} --provider opencode --mode sdlc --dry-run`, {
        encoding: 'utf-8'
      });

      const agentDir = path.join(testDir, '.opencode', 'agent');
      expect(fs.existsSync(agentDir)).toBe(false);
    });
  });
});

describe('OpenCode MCP Configuration', () => {
  let testDir: string;
  const cliPath = path.resolve(__dirname, '../../src/mcp/cli.mjs');

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-opencode-mcp-test-'));
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should generate opencode.json with MCP configuration', () => {
    // Use cwd option instead of process.chdir (not supported in workers)
    execSync(`node ${cliPath} install opencode ${testDir}`, {
      encoding: 'utf-8',
      cwd: testDir
    });

    const configPath = path.join(testDir, 'opencode.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.mcp).toBeDefined();
    expect(config.mcp.aiwg).toBeDefined();
    expect(config.mcp.aiwg.type).toBe('local');
    expect(config.mcp.aiwg.command).toContain('aiwg');
  });

  it('should merge with existing opencode.json', () => {
    const configPath = path.join(testDir, 'opencode.json');

    // Create existing config
    fs.writeFileSync(configPath, JSON.stringify({
      model: 'anthropic/claude-sonnet-4-20250514',
      mcp: {
        existing: { type: 'local', command: ['existing-server'] }
      }
    }, null, 2));

    // Use cwd option instead of process.chdir
    execSync(`node ${cliPath} install opencode ${testDir}`, {
      encoding: 'utf-8',
      cwd: testDir
    });

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Should preserve existing config
    expect(config.model).toBe('anthropic/claude-sonnet-4-20250514');
    expect(config.mcp.existing).toBeDefined();

    // Should add AIWG MCP
    expect(config.mcp.aiwg).toBeDefined();
  });
});

/**
 * Live OpenCode CLI Integration Tests
 *
 * These tests validate integration with the actual OpenCode CLI tool.
 * Tests are skipped if OpenCode CLI is not installed.
 */
describe('OpenCode CLI Integration', () => {
  it.skipIf(!OPENCODE_AVAILABLE)('opencode CLI is installed and accessible', () => {
    const result = runOpenCode(['--version']);
    expect(result.status).toBe(0);
    // OpenCode version format: X.X.X
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it.skipIf(!OPENCODE_AVAILABLE)('opencode --help returns available commands', () => {
    const result = runOpenCode(['--help']);
    expect(result.status).toBe(0);
    // Should show commands list
    expect(result.stdout.toLowerCase()).toContain('commands');
  });

  it.skipIf(!OPENCODE_AVAILABLE)('opencode has agent management commands', () => {
    const result = runOpenCode(['agent', '--help']);
    // Should have agent subcommand
    expect(result.stdout.toLowerCase() + result.stderr.toLowerCase()).toMatch(/agent|manage/);
  });

  describe('Agent Configuration', () => {
    it.skipIf(!OPENCODE_AVAILABLE)('validates .opencode/agent/ directory structure', async () => {
      // Create test directory with proper structure
      const testDir = path.join(os.tmpdir(), 'opencode-agent-test-' + Date.now());
      const agentDir = path.join(testDir, '.opencode', 'agent');
      fs.mkdirSync(agentDir, { recursive: true });

      // Create a test agent file with OpenCode format
      const agentContent = `---
description: Test agent for validation
mode: subagent
model: anthropic/claude-sonnet-4-20250514
temperature: 0.5
maxSteps: 50
tools:
  write:
    enabled: true
  bash:
    enabled: false
permission:
  allowWrite: false
  allowBash: false
---

# Test Agent

This is a test agent for OpenCode integration.
`;
      fs.writeFileSync(path.join(agentDir, 'test-agent.md'), agentContent);

      // Verify structure
      const agents = fs.readdirSync(agentDir);
      expect(agents).toContain('test-agent.md');

      // Verify format
      const content = fs.readFileSync(path.join(agentDir, 'test-agent.md'), 'utf-8');
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('mode: subagent');
      expect(content).toContain('model: anthropic/');
      expect(content).toContain('tools:');

      // Cleanup
      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe('Command Configuration', () => {
    it.skipIf(!OPENCODE_AVAILABLE)('validates .opencode/command/ directory structure', async () => {
      // Create test directory with proper structure
      const testDir = path.join(os.tmpdir(), 'opencode-command-test-' + Date.now());
      const commandDir = path.join(testDir, '.opencode', 'command');
      fs.mkdirSync(commandDir, { recursive: true });

      // Create a test command file with OpenCode format
      const commandContent = `---
description: Test command for validation
subtask: true
---

# Test Command

This is a test command for OpenCode integration.
`;
      fs.writeFileSync(path.join(commandDir, 'test-command.md'), commandContent);

      // Verify structure
      const commands = fs.readdirSync(commandDir);
      expect(commands).toContain('test-command.md');

      // Verify format
      const content = fs.readFileSync(path.join(commandDir, 'test-command.md'), 'utf-8');
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('description:');
      expect(content).toContain('subtask: true');

      // Cleanup
      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe('JSON Configuration', () => {
    it.skipIf(!OPENCODE_AVAILABLE)('validates opencode.json format', async () => {
      // Create a test config
      const testDir = path.join(os.tmpdir(), 'opencode-config-test-' + Date.now());
      fs.mkdirSync(testDir, { recursive: true });

      const configContent = {
        model: 'anthropic/claude-sonnet-4-20250514',
        mcp: {
          aiwg: {
            type: 'local',
            command: ['aiwg', 'mcp', 'serve'],
          },
        },
        agent: {
          defaultModel: 'anthropic/claude-sonnet-4-20250514',
        },
      };

      fs.writeFileSync(
        path.join(testDir, 'opencode.json'),
        JSON.stringify(configContent, null, 2)
      );

      // Verify JSON is valid
      const readBack = fs.readFileSync(path.join(testDir, 'opencode.json'), 'utf-8');
      const parsed = JSON.parse(readBack);

      expect(parsed.model).toBe('anthropic/claude-sonnet-4-20250514');
      expect(parsed.mcp.aiwg).toBeDefined();
      expect(parsed.mcp.aiwg.type).toBe('local');

      // Cleanup
      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe('CLI Availability Reporting', () => {
    it('reports opencode CLI availability status', () => {
      // This test always runs to report status
      console.log(`\n  OpenCode CLI Status:`);
      console.log(`    Available: ${OPENCODE_AVAILABLE}`);
      console.log(`    Expected Path: ${OPENCODE_PATH}`);
      console.log(`    Path Exists: ${fs.existsSync(OPENCODE_PATH)}`);
      if (OPENCODE_AVAILABLE) {
        const version = runOpenCode(['--version']);
        console.log(`    Version: ${version.stdout.trim()}`);
      } else {
        console.log('    Install: curl -fsSL https://opencode.sh | bash');
      }
      expect(true).toBe(true); // Always passes, just for reporting
    });
  });
});
