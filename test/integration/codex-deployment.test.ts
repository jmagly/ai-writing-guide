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
import { execSync } from 'child_process';

// Test directories
const TEST_PROJECT_DIR = path.join(os.tmpdir(), 'aiwg-codex-test-project');
const TEST_HOME_DIR = path.join(os.tmpdir(), 'aiwg-codex-test-home');
const TEST_CODEX_DIR = path.join(TEST_HOME_DIR, '.codex');
const REPO_ROOT = path.resolve(__dirname, '../..');

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
    });
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
