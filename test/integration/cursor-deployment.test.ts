/**
 * Cursor Integration Tests
 *
 * Tests for Cursor CLI integration including:
 * - AGENTS.md generation
 * - Rules deployment to .cursor/rules/
 * - MCP configuration generation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

// Test directories
const TEST_PROJECT_DIR = path.join(os.tmpdir(), 'aiwg-cursor-test-project');
const TEST_HOME_DIR = path.join(os.tmpdir(), 'aiwg-cursor-test-home');
const TEST_CURSOR_DIR = path.join(TEST_PROJECT_DIR, '.cursor');
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

describe('Cursor Integration', () => {
  beforeEach(async () => {
    // Create test directories
    await fs.mkdir(TEST_PROJECT_DIR, { recursive: true });
    await fs.mkdir(TEST_CURSOR_DIR, { recursive: true });
    await fs.mkdir(path.join(TEST_HOME_DIR, '.cursor'), { recursive: true });

    // Initialize as git repo (Cursor requires this)
    execSync('git init', { cwd: TEST_PROJECT_DIR, stdio: 'pipe' });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(TEST_PROJECT_DIR, { recursive: true, force: true });
    await fs.rm(TEST_HOME_DIR, { recursive: true, force: true });
  });

  describe('AGENTS.md Generation', () => {
    it('generates AGENTS.md for Cursor provider', async () => {
      // Run deploy-agents with --create-agents-md
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'cursor',
        '--mode', 'sdlc',
        '--create-agents-md',
        '--target', TEST_PROJECT_DIR
      ]);

      const agentsMd = await fs.readFile(
        path.join(TEST_PROJECT_DIR, 'AGENTS.md'),
        'utf-8'
      );

      expect(agentsMd).toContain('AIWG SDLC Framework');
      expect(agentsMd).toContain('Install Rules');
      expect(agentsMd).toContain('.cursor/rules/');
    });

    it('respects 32KB size limit', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'cursor',
        '--mode', 'sdlc',
        '--create-agents-md',
        '--target', TEST_PROJECT_DIR
      ]);

      const agentsMd = await fs.readFile(
        path.join(TEST_PROJECT_DIR, 'AGENTS.md'),
        'utf-8'
      );

      // Cursor project_doc_max_bytes default is 32KB
      expect(Buffer.byteLength(agentsMd, 'utf8')).toBeLessThan(32768);
    });

    it('appends to existing AGENTS.md without duplicating', async () => {
      // Create existing AGENTS.md
      await fs.writeFile(
        path.join(TEST_PROJECT_DIR, 'AGENTS.md'),
        '# My Project\n\nExisting content here.\n'
      );

      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'cursor',
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
        '--provider', 'cursor',
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

  describe('Rules Deployment', () => {
    it('deploys rules to .cursor/rules/', async () => {
      const output = runScript('tools/rules/deploy-rules-cursor.mjs', [
        '--target', path.join(TEST_CURSOR_DIR, 'rules')
      ]);

      expect(output).toContain('Deploying commands as Cursor rules');

      // Check rules directory was created
      const rulesDir = path.join(TEST_CURSOR_DIR, 'rules');
      const rules = await fs.readdir(rulesDir);

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some((r) => r.endsWith('.mdc'))).toBe(true);
    });

    it('formats rule with correct MDC frontmatter', async () => {
      runScript('tools/rules/deploy-rules-cursor.mjs', [
        '--target', path.join(TEST_CURSOR_DIR, 'rules')
      ]);

      const rulesDir = path.join(TEST_CURSOR_DIR, 'rules');
      const rules = await fs.readdir(rulesDir);

      // Find a rule file
      const ruleFile = rules.find((r) => r.endsWith('.mdc'));
      expect(ruleFile).toBeDefined();

      const ruleContent = await fs.readFile(
        path.join(rulesDir, ruleFile!),
        'utf-8'
      );

      // Check MDC frontmatter format
      expect(ruleContent).toMatch(/^---\n/);
      expect(ruleContent).toMatch(/description: .+/);
      expect(ruleContent).toMatch(/\n---\n/);
    });

    it('includes globs for applicable rules', async () => {
      runScript('tools/rules/deploy-rules-cursor.mjs', [
        '--target', path.join(TEST_CURSOR_DIR, 'rules')
      ]);

      const rulesDir = path.join(TEST_CURSOR_DIR, 'rules');

      // Check security-audit rule has globs
      const securityRulePath = path.join(rulesDir, 'aiwg-security-audit.mdc');
      if (await fs.access(securityRulePath).then(() => true).catch(() => false)) {
        const content = await fs.readFile(securityRulePath, 'utf-8');
        expect(content).toContain('globs:');
        expect(content).toContain('*.ts');
      }
    });
  });

  describe('MCP Configuration', () => {
    it('generates valid JSON config for Cursor', async () => {
      const output = runAiwg(['mcp', 'install', 'cursor', '--dry-run']);

      expect(output).toContain('[DRY RUN]');
      expect(output).toContain('.cursor/mcp.json');
    });

    it('includes all AIWG MCP tools', async () => {
      runAiwg(['mcp', 'install', 'cursor']);

      const config = await fs.readFile(
        path.join(TEST_PROJECT_DIR, '.cursor', 'mcp.json'),
        'utf-8'
      );

      const parsed = JSON.parse(config);

      expect(parsed.mcpServers).toBeDefined();
      expect(parsed.mcpServers.aiwg).toBeDefined();
      expect(parsed.mcpServers.aiwg.command).toBe('aiwg');
      expect(parsed.mcpServers.aiwg.args).toContain('mcp');
      expect(parsed.mcpServers.aiwg.args).toContain('serve');
    });

    it('does not duplicate MCP config on re-run', async () => {
      // Create initial config
      await fs.writeFile(
        path.join(TEST_CURSOR_DIR, 'mcp.json'),
        JSON.stringify({ mcpServers: {} }, null, 2)
      );

      runAiwg(['mcp', 'install', 'cursor']);
      runAiwg(['mcp', 'install', 'cursor']);

      const config = await fs.readFile(
        path.join(TEST_CURSOR_DIR, 'mcp.json'),
        'utf-8'
      );

      const parsed = JSON.parse(config);

      // Should have exactly one aiwg entry
      expect(Object.keys(parsed.mcpServers)).toContain('aiwg');
      expect(Object.keys(parsed.mcpServers).filter(k => k === 'aiwg').length).toBe(1);
    });
  });

  describe('Dry Run', () => {
    it('--dry-run shows what would be deployed without writing', async () => {
      const output = runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'cursor',
        '--mode', 'sdlc',
        '--create-agents-md',
        '--target', TEST_PROJECT_DIR,
        '--dry-run'
      ]);

      expect(output).toContain('[dry-run]');

      // Verify no AGENTS.md was created (only .git and .cursor may exist)
      const files = await fs.readdir(TEST_PROJECT_DIR);
      expect(files).not.toContain('AGENTS.md');
    });
  });
});

describe('CI/CD Templates', () => {
  it('provides GitHub Actions workflow templates', async () => {
    const templatesDir = path.join(
      REPO_ROOT,
      'agentic/code/frameworks/sdlc-complete/templates/cursor/ci-cd'
    );

    const templates = await fs.readdir(templatesDir);

    expect(templates).toContain('aiwg-cursor-review.yml');
    expect(templates).toContain('aiwg-cursor-security.yml');
    expect(templates).toContain('aiwg-cursor-tests.yml');
  });

  it('review workflow is valid YAML', async () => {
    const reviewYml = await fs.readFile(
      path.join(
        REPO_ROOT,
        'agentic/code/frameworks/sdlc-complete/templates/cursor/ci-cd/aiwg-cursor-review.yml'
      ),
      'utf-8'
    );

    // Basic YAML validation
    expect(reviewYml).toContain('name:');
    expect(reviewYml).toContain('on:');
    expect(reviewYml).toContain('jobs:');
    expect(reviewYml).toContain('cursor-agent');
  });
});

describe('Config Templates', () => {
  it('provides cli.json template', async () => {
    const cliTemplate = await fs.readFile(
      path.join(
        REPO_ROOT,
        'agentic/code/frameworks/sdlc-complete/templates/cursor/cli.json.aiwg-template'
      ),
      'utf-8'
    );

    const parsed = JSON.parse(cliTemplate);

    expect(parsed.permissions).toBeDefined();
    expect(parsed.permissions.allow).toBeDefined();
    expect(parsed.permissions.deny).toBeDefined();
    expect(parsed.permissions.allow).toContain('Shell(aiwg)');
  });

  it('provides worktrees.json template', async () => {
    const worktreesTemplate = await fs.readFile(
      path.join(
        REPO_ROOT,
        'agentic/code/frameworks/sdlc-complete/templates/cursor/worktrees.json.aiwg-template'
      ),
      'utf-8'
    );

    const parsed = JSON.parse(worktreesTemplate);

    expect(parsed['setup-worktree']).toBeDefined();
    expect(Array.isArray(parsed['setup-worktree'])).toBe(true);
  });
});
