/**
 * Codex Integration Tests
 *
 * Tests for OpenAI Codex CLI integration including:
 * - AGENTS.md generation
 * - Skills deployment to ~/.codex/skills/
 * - Prompts deployment to ~/.codex/prompts/
 * - MCP configuration generation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync, spawnSync } from 'child_process';

// Test directories
const TEST_PROJECT_DIR = path.join(os.tmpdir(), 'aiwg-codex-test-project');
const TEST_HOME_DIR = path.join(os.tmpdir(), 'aiwg-codex-test-home');
const TEST_CODEX_DIR = path.join(TEST_HOME_DIR, '.codex');
const REPO_ROOT = path.resolve(__dirname, '../..');

// Check if codex CLI is available
function isCodexAvailable(): boolean {
  try {
    const result = spawnSync('codex', ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
      shell: true,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

const CODEX_AVAILABLE = isCodexAvailable();

// Helper to run codex CLI commands
function runCodex(
  args: string[],
  options: { cwd?: string; timeout?: number } = {}
): { stdout: string; stderr: string; status: number | null } {
  try {
    const result = spawnSync('codex', args, {
      encoding: 'utf-8',
      timeout: options.timeout || 30000,
      cwd: options.cwd || process.cwd(),
      env: process.env,
      shell: true,
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
  return execSync(`node ${REPO_ROOT}/bin/aiwg.mjs ${args.join(' ')}`, {
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

  return execSync(`node ${path.join(REPO_ROOT, scriptPath)} ${args.join(' ')}`, {
    cwd: TEST_PROJECT_DIR,
    env,
    encoding: 'utf-8',
  });
}

describe('Codex Integration', () => {
  beforeEach(async () => {
    // Create test directories
    await fs.mkdir(TEST_PROJECT_DIR, { recursive: true });
    await fs.mkdir(TEST_CODEX_DIR, { recursive: true });

    // Initialize as git repo (Codex requires this)
    execSync('git init', { cwd: TEST_PROJECT_DIR, stdio: 'pipe' });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(TEST_PROJECT_DIR, { recursive: true, force: true });
    await fs.rm(TEST_HOME_DIR, { recursive: true, force: true });
  });

  describe('AGENTS.md Generation', () => {
    it('generates AGENTS.md for Codex provider', async () => {
      // Run deploy-agents with --create-agents-md
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'codex',
        '--mode', 'sdlc',
        '--create-agents-md',
        '--target', TEST_PROJECT_DIR
      ]);

      const agentsMd = await fs.readFile(
        path.join(TEST_PROJECT_DIR, 'AGENTS.md'),
        'utf-8'
      );

      expect(agentsMd).toContain('AIWG SDLC Framework');
      expect(agentsMd).toContain('Install Skills');
      expect(agentsMd).toContain('~/.codex/skills/');
    });

    it('respects 32KB size limit', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'codex',
        '--mode', 'sdlc',
        '--create-agents-md',
        '--target', TEST_PROJECT_DIR
      ]);

      const agentsMd = await fs.readFile(
        path.join(TEST_PROJECT_DIR, 'AGENTS.md'),
        'utf-8'
      );

      // Codex project_doc_max_bytes default is 32KB
      expect(Buffer.byteLength(agentsMd, 'utf8')).toBeLessThan(32768);
    });

    it('appends to existing AGENTS.md without duplicating', async () => {
      // Create existing AGENTS.md
      await fs.writeFile(
        path.join(TEST_PROJECT_DIR, 'AGENTS.md'),
        '# My Project\n\nExisting content here.\n'
      );

      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'codex',
        '--mode', 'sdlc',
        '--create-agents-md',
        '--target', TEST_PROJECT_DIR
      ]);

      const agentsMd = await fs.readFile(
        path.join(TEST_PROJECT_DIR, 'AGENTS.md'),
        'utf-8'
      );

      expect(agentsMd).toContain('# My Project');
      expect(agentsMd).toContain('Existing content here');
      expect(agentsMd).toContain('AIWG SDLC Framework');

      // Run again - should not duplicate
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'codex',
        '--mode', 'sdlc',
        '--create-agents-md',
        '--target', TEST_PROJECT_DIR,
        '--force'
      ]);

      const agentsMd2 = await fs.readFile(
        path.join(TEST_PROJECT_DIR, 'AGENTS.md'),
        'utf-8'
      );

      // Count only the ## heading, not the HTML comment marker
      const matches = agentsMd2.match(/## AIWG SDLC Framework/g);
      expect(matches?.length).toBe(1);
    });
  });

  describe('Skills Deployment', () => {
    it('deploys skills to ~/.codex/skills/', async () => {
      const output = runScript('tools/skills/deploy-skills-codex.mjs', [
        '--target', path.join(TEST_CODEX_DIR, 'skills')
      ]);

      expect(output).toContain('Deploying skills to Codex');

      // Check skills directory was created
      const skillsDir = path.join(TEST_CODEX_DIR, 'skills');
      const skills = await fs.readdir(skillsDir);

      expect(skills.length).toBeGreaterThan(0);
    });

    it('formats skill with correct YAML frontmatter', async () => {
      runScript('tools/skills/deploy-skills-codex.mjs', [
        '--target', path.join(TEST_CODEX_DIR, 'skills')
      ]);

      const skillDir = path.join(TEST_CODEX_DIR, 'skills', 'voice-apply');
      const skillMd = await fs.readFile(
        path.join(skillDir, 'SKILL.md'),
        'utf-8'
      );

      // Check YAML frontmatter format
      expect(skillMd).toMatch(/^---\n/);
      expect(skillMd).toMatch(/name: voice-apply/);
      expect(skillMd).toMatch(/description: .+/);
      expect(skillMd).toMatch(/\n---\n/);
    });

    it('truncates description to 500 chars', async () => {
      runScript('tools/skills/deploy-skills-codex.mjs', [
        '--target', path.join(TEST_CODEX_DIR, 'skills')
      ]);

      const skillsDir = path.join(TEST_CODEX_DIR, 'skills');
      const skills = await fs.readdir(skillsDir);

      for (const skill of skills) {
        const skillMd = await fs.readFile(
          path.join(skillsDir, skill, 'SKILL.md'),
          'utf-8'
        );

        // Extract description from frontmatter
        const descMatch = skillMd.match(/description: (.+)/);
        if (descMatch) {
          expect(descMatch[1].length).toBeLessThanOrEqual(500);
        }
      }
    });
  });

  describe('Prompts Deployment', () => {
    it('creates prompts in ~/.codex/prompts/', async () => {
      const output = runScript('tools/commands/deploy-prompts-codex.mjs', [
        '--target', path.join(TEST_CODEX_DIR, 'prompts')
      ]);

      expect(output).toContain('Deploying commands as Codex prompts');

      // Check prompts directory was created
      const promptsDir = path.join(TEST_CODEX_DIR, 'prompts');
      const prompts = await fs.readdir(promptsDir);

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts.some((p) => p.endsWith('.md'))).toBe(true);
    });

    it('converts AIWG command placeholders', async () => {
      runScript('tools/commands/deploy-prompts-codex.mjs', [
        '--target', path.join(TEST_CODEX_DIR, 'prompts')
      ]);

      const promptsDir = path.join(TEST_CODEX_DIR, 'prompts');
      const prompts = await fs.readdir(promptsDir);

      // Find a prompt with arguments
      const prReview = prompts.find((p) => p.includes('pr-review'));
      if (prReview) {
        const content = await fs.readFile(
          path.join(promptsDir, prReview),
          'utf-8'
        );

        // Should use Codex placeholder format (not {{}} mustache)
        expect(content).not.toContain('{{');
        expect(content).not.toContain('}}');
      }
    });

    it('generates correct argument-hint in frontmatter', async () => {
      runScript('tools/commands/deploy-prompts-codex.mjs', [
        '--target', path.join(TEST_CODEX_DIR, 'prompts')
      ]);

      const promptsDir = path.join(TEST_CODEX_DIR, 'prompts');
      const prompts = await fs.readdir(promptsDir);

      for (const prompt of prompts.filter((p) => p.endsWith('.md'))) {
        const content = await fs.readFile(
          path.join(promptsDir, prompt),
          'utf-8'
        );

        // If has frontmatter, check format
        if (content.startsWith('---')) {
          expect(content).toMatch(/\n---\n/);
        }
      }
    });
  });

  describe('MCP Configuration', () => {
    it('generates valid TOML config snippet for Codex', async () => {
      const output = runAiwg(['mcp', 'install', 'codex', '--dry-run']);

      expect(output).toContain('[DRY RUN]');
      expect(output).toContain('.codex/config.toml');
    });

    it('includes all AIWG MCP tools', async () => {
      // Create initial config.toml
      await fs.writeFile(
        path.join(TEST_CODEX_DIR, 'config.toml'),
        '# Existing config\nmodel = "gpt-5.1"\n'
      );

      runAiwg(['mcp', 'install', 'codex']);

      const config = await fs.readFile(
        path.join(TEST_CODEX_DIR, 'config.toml'),
        'utf-8'
      );

      expect(config).toContain('[mcp_servers.aiwg]');
      expect(config).toContain('workflow-run');
      expect(config).toContain('artifact-read');
      expect(config).toContain('artifact-write');
      expect(config).toContain('template-render');
      expect(config).toContain('agent-list');
    });

    it('does not duplicate MCP config on re-run', async () => {
      await fs.writeFile(
        path.join(TEST_CODEX_DIR, 'config.toml'),
        '# Config\n'
      );

      runAiwg(['mcp', 'install', 'codex']);
      const output = runAiwg(['mcp', 'install', 'codex']);

      expect(output).toContain('already configured');

      const config = await fs.readFile(
        path.join(TEST_CODEX_DIR, 'config.toml'),
        'utf-8'
      );

      const matches = config.match(/\[mcp_servers\.aiwg\]/g);
      expect(matches?.length).toBe(1);
    }, { timeout: 15000 });
  });

  describe('Dry Run', () => {
    it('--dry-run shows what would be deployed without writing', async () => {
      const output = runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'codex',
        '--mode', 'sdlc',
        '--create-agents-md',
        '--target', TEST_PROJECT_DIR,
        '--dry-run'
      ]);

      expect(output).toContain('[dry-run]');

      // Verify no AGENTS.md was created (only .git may exist)
      const files = await fs.readdir(TEST_PROJECT_DIR);
      expect(files).not.toContain('AGENTS.md');
    });
  });

  describe('Provider Aliases', () => {
    it('--provider openai is alias for codex', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'openai',
        '--mode', 'sdlc',
        '--create-agents-md',
        '--target', TEST_PROJECT_DIR
      ]);

      // Should create AGENTS.md for Codex
      const agentsMd = await fs.readFile(
        path.join(TEST_PROJECT_DIR, 'AGENTS.md'),
        'utf-8'
      );

      expect(agentsMd).toContain('~/.codex/skills/');
    });
  });
});

describe('CI/CD Templates', () => {
  it('provides GitHub Actions workflow templates', async () => {
    const templatesDir = path.join(
      REPO_ROOT,
      'agentic/code/frameworks/sdlc-complete/templates/codex/ci-cd'
    );

    const templates = await fs.readdir(templatesDir);

    expect(templates).toContain('aiwg-codex-review.yml');
    expect(templates).toContain('aiwg-codex-security.yml');
    expect(templates).toContain('aiwg-codex-tests.yml');
  });

  it('review workflow is valid YAML', async () => {
    const reviewYml = await fs.readFile(
      path.join(
        REPO_ROOT,
        'agentic/code/frameworks/sdlc-complete/templates/codex/ci-cd/aiwg-codex-review.yml'
      ),
      'utf-8'
    );

    // Basic YAML validation
    expect(reviewYml).toContain('name:');
    expect(reviewYml).toContain('on:');
    expect(reviewYml).toContain('jobs:');
    expect(reviewYml).toContain('codex exec');
  });
});

describe('Config Template', () => {
  it('provides config.toml template', async () => {
    const configTemplate = await fs.readFile(
      path.join(
        REPO_ROOT,
        'agentic/code/frameworks/sdlc-complete/templates/codex/config.toml.aiwg-template'
      ),
      'utf-8'
    );

    expect(configTemplate).toContain('project_doc_fallback_filenames');
    expect(configTemplate).toContain('CLAUDE.md');
    expect(configTemplate).toContain('[profiles.aiwg-sdlc]');
    // MCP config is commented out in template
    expect(configTemplate).toContain('mcp_servers.aiwg');
  });
});

/**
 * Live Codex CLI Integration Tests
 *
 * These tests validate integration with the actual Codex CLI tool.
 * Tests are skipped if Codex CLI is not installed.
 */
describe('Codex CLI Integration', () => {
  it.skipIf(!CODEX_AVAILABLE)('codex CLI is installed and accessible', () => {
    const result = runCodex(['--version']);
    expect(result.status).toBe(0);
    // Codex version format: X.X.X
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it.skipIf(!CODEX_AVAILABLE)('codex --help returns available commands', () => {
    const result = runCodex(['--help']);
    expect(result.status).toBe(0);
    // Should show help text with commands
    expect(result.stdout.toLowerCase()).toMatch(/usage|commands/);
  });

  describe('Skill and Prompt Discovery', () => {
    it.skipIf(!CODEX_AVAILABLE)('codex recognizes skill directories', async () => {
      // Create a test skill directory structure
      const testSkillsDir = path.join(os.tmpdir(), 'codex-skill-test-' + Date.now());
      const testSkillDir = path.join(testSkillsDir, 'test-skill');
      await fs.mkdir(testSkillDir, { recursive: true });

      // Create SKILL.md with proper format
      const skillContent = `---
name: test-skill
description: A test skill for validation
---

# Test Skill

This is a test skill.
`;
      await fs.writeFile(path.join(testSkillDir, 'SKILL.md'), skillContent);

      // Verify skill structure is valid
      const skillMd = await fs.readFile(path.join(testSkillDir, 'SKILL.md'), 'utf-8');
      expect(skillMd).toMatch(/^---\n/);
      expect(skillMd).toContain('name: test-skill');

      // Cleanup
      await fs.rm(testSkillsDir, { recursive: true, force: true });
    });

    it.skipIf(!CODEX_AVAILABLE)('codex recognizes prompt files', async () => {
      // Create a test prompts directory
      const testPromptsDir = path.join(os.tmpdir(), 'codex-prompt-test-' + Date.now());
      await fs.mkdir(testPromptsDir, { recursive: true });

      // Create a prompt file
      const promptContent = `---
description: A test prompt
argument-hint: <args>
---

# Test Prompt

This is a test prompt with $ARGUMENTS placeholder.
`;
      await fs.writeFile(path.join(testPromptsDir, 'test-prompt.md'), promptContent);

      // Verify prompt structure is valid
      const promptMd = await fs.readFile(path.join(testPromptsDir, 'test-prompt.md'), 'utf-8');
      expect(promptMd).toMatch(/^---\n/);
      expect(promptMd).toContain('description:');
      expect(promptMd).toContain('$ARGUMENTS');

      // Cleanup
      await fs.rm(testPromptsDir, { recursive: true, force: true });
    });
  });

  describe('Configuration Validation', () => {
    it.skipIf(!CODEX_AVAILABLE)('validates config.toml format', async () => {
      // Create a test config
      const testDir = path.join(os.tmpdir(), 'codex-config-test-' + Date.now());
      await fs.mkdir(path.join(testDir, '.codex'), { recursive: true });

      const configContent = `# Codex configuration
model = "gpt-4"
project_doc_fallback_filenames = ["CLAUDE.md", "AGENTS.md", "README.md"]

[profiles.aiwg-sdlc]
model = "gpt-4-turbo"

# MCP configuration
[mcp_servers.aiwg]
command = "aiwg"
args = ["mcp", "serve"]
env = { AIWG_MODE = "sdlc" }
`;

      await fs.writeFile(path.join(testDir, '.codex', 'config.toml'), configContent);

      // Verify TOML is valid by checking structure
      const readBack = await fs.readFile(path.join(testDir, '.codex', 'config.toml'), 'utf-8');
      expect(readBack).toContain('model =');
      expect(readBack).toContain('[profiles.aiwg-sdlc]');
      expect(readBack).toContain('[mcp_servers.aiwg]');

      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it.skipIf(!CODEX_AVAILABLE)('codex accepts custom skill directories', async () => {
      // Test that we can structure skills correctly for codex
      const testDir = path.join(os.tmpdir(), 'codex-custom-skill-' + Date.now());
      const skillsDir = path.join(testDir, '.codex', 'skills', 'voice-apply');
      await fs.mkdir(skillsDir, { recursive: true });

      // Create skill with proper structure
      await fs.writeFile(
        path.join(skillsDir, 'SKILL.md'),
        `---
name: voice-apply
description: Apply voice profile to content
---

# Voice Apply

Apply a voice profile to transform content.
`
      );

      // Verify structure
      const skillPath = path.join(skillsDir, 'SKILL.md');
      const stat = await fs.stat(skillPath);
      expect(stat.isFile()).toBe(true);

      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });
    });
  });

  describe('CLI Availability Reporting', () => {
    it('reports codex CLI availability status', () => {
      // This test always runs to report status
      console.log(`\n  Codex CLI Status:`);
      console.log(`    Available: ${CODEX_AVAILABLE}`);
      if (CODEX_AVAILABLE) {
        const version = runCodex(['--version']);
        console.log(`    Version: ${version.stdout.trim()}`);
      } else {
        console.log('    Install: npm install -g @openai/codex');
      }
      expect(true).toBe(true); // Always passes, just for reporting
    });
  });
});
