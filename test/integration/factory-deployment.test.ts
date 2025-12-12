/**
 * Factory AI Integration Tests
 *
 * Tests for Factory AI integration including:
 * - Agent name format (kebab-case)
 * - Tool mapping (MultiEdit -> Edit, Bash -> Execute, etc.)
 * - AGENTS.md generation
 * - Droid deployment to .factory/droids/
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

// Test directories
const TEST_PROJECT_DIR = path.join(os.tmpdir(), 'aiwg-factory-test-project');
const TEST_HOME_DIR = path.join(os.tmpdir(), 'aiwg-factory-test-home');
const TEST_FACTORY_DIR = path.join(TEST_PROJECT_DIR, '.factory');
const REPO_ROOT = path.resolve(__dirname, '../..');

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

describe('Factory AI Integration', () => {
  beforeEach(async () => {
    // Create test directories
    await fs.mkdir(TEST_PROJECT_DIR, { recursive: true });
    await fs.mkdir(TEST_FACTORY_DIR, { recursive: true });
    await fs.mkdir(path.join(TEST_HOME_DIR, '.factory'), { recursive: true });

    // Create minimal Factory settings to avoid settings prompts
    await fs.writeFile(
      path.join(TEST_HOME_DIR, '.factory', 'settings.json'),
      JSON.stringify({ customDroidsEnabled: true }, null, 2)
    );

    // Initialize as git repo
    execSync('git init', { cwd: TEST_PROJECT_DIR, stdio: 'pipe' });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(TEST_PROJECT_DIR, { recursive: true, force: true });
    await fs.rm(TEST_HOME_DIR, { recursive: true, force: true });
  });

  describe('Agent Name Format', () => {
    it('converts agent names to kebab-case', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');
      const droids = await fs.readdir(droidsDir);

      // Pick a droid with a multi-word name
      const technicalResearcher = await fs.readFile(
        path.join(droidsDir, 'technical-researcher.md'),
        'utf-8'
      );

      // Verify name is kebab-case (not "Technical Researcher")
      expect(technicalResearcher).toMatch(/^---\n/);
      expect(technicalResearcher).toMatch(/name: technical-researcher/);
      expect(technicalResearcher).not.toMatch(/name: Technical Researcher/);
    });

    it('converts all multi-word names correctly', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');
      const droids = await fs.readdir(droidsDir);

      // Check multiple droids
      const testCases = [
        { file: 'software-implementer.md', expected: 'software-implementer' },
        { file: 'security-architect.md', expected: 'security-architect' },
        { file: 'code-reviewer.md', expected: 'code-reviewer' },
        { file: 'test-engineer.md', expected: 'test-engineer' },
      ];

      for (const tc of testCases) {
        const content = await fs.readFile(path.join(droidsDir, tc.file), 'utf-8');
        expect(content).toContain(`name: ${tc.expected}`);
        // Ensure no spaces in name field
        expect(content).not.toMatch(/name: [A-Z][a-z]+ [A-Z]/);
      }
    });

    it('handles names with underscores', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');
      const droids = await fs.readdir(droidsDir);

      // Check all droids have no underscores or spaces in name field
      for (const droid of droids) {
        const content = await fs.readFile(path.join(droidsDir, droid), 'utf-8');
        const nameMatch = content.match(/name: (.+)/);
        if (nameMatch) {
          expect(nameMatch[1]).not.toContain(' ');
          expect(nameMatch[1]).not.toContain('_');
          expect(nameMatch[1]).toMatch(/^[a-z0-9-]+$/);
        }
      }
    });
  });

  describe('Tool Mapping', () => {
    it('maps MultiEdit to Edit (not MultiEdit)', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');
      const droids = await fs.readdir(droidsDir);

      // Check all droids - none should have MultiEdit
      for (const droid of droids) {
        const content = await fs.readFile(path.join(droidsDir, droid), 'utf-8');
        expect(content).not.toContain('"MultiEdit"');
      }
    });

    it('maps Bash to Execute', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');

      // Check a droid that should have Execute
      const softwareImpl = await fs.readFile(
        path.join(droidsDir, 'software-implementer.md'),
        'utf-8'
      );

      expect(softwareImpl).toContain('"Execute"');
      expect(softwareImpl).not.toContain('"Bash"');
    });

    it('maps Write to Create and Edit', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');

      // Check droids - should have Create and Edit, not Write
      const technicalWriter = await fs.readFile(
        path.join(droidsDir, 'technical-writer.md'),
        'utf-8'
      );

      expect(technicalWriter).toContain('"Create"');
      expect(technicalWriter).toContain('"Edit"');
      expect(technicalWriter).not.toContain('"Write"');
    });

    it('maps WebFetch to FetchUrl', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');
      const droids = await fs.readdir(droidsDir);

      // Check all droids - none should have WebFetch
      for (const droid of droids) {
        const content = await fs.readFile(path.join(droidsDir, droid), 'utf-8');
        expect(content).not.toContain('"WebFetch"');
      }
    });

    it('tools are formatted as JSON array', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');
      const droids = await fs.readdir(droidsDir);

      for (const droid of droids) {
        const content = await fs.readFile(path.join(droidsDir, droid), 'utf-8');
        const toolsMatch = content.match(/tools: (\[.+\])/);
        expect(toolsMatch).toBeTruthy();

        // Should be valid JSON
        if (toolsMatch) {
          const tools = JSON.parse(toolsMatch[1]);
          expect(Array.isArray(tools)).toBe(true);
          expect(tools.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Droid Deployment', () => {
    it('deploys droids to .factory/droids/', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');
      const droids = await fs.readdir(droidsDir);

      // Should have multiple droids
      expect(droids.length).toBeGreaterThan(40);
      expect(droids.every((d) => d.endsWith('.md'))).toBe(true);
    });

    it('formats droid with correct frontmatter', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');
      const droids = await fs.readdir(droidsDir);

      // Check first droid
      const droidContent = await fs.readFile(
        path.join(droidsDir, droids[0]),
        'utf-8'
      );

      // Check frontmatter format
      expect(droidContent).toMatch(/^---\n/);
      expect(droidContent).toMatch(/name: [a-z0-9-]+/);
      expect(droidContent).toMatch(/description: .+/);
      expect(droidContent).toMatch(/model: .+/);
      expect(droidContent).toMatch(/tools: \[.+\]/);
      expect(droidContent).toMatch(/\n---\n/);
    });
  });

  describe('AGENTS.md Generation', () => {
    it('generates AGENTS.md for Factory provider', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--create-agents-md',
        '--target', TEST_PROJECT_DIR
      ]);

      const agentsMd = await fs.readFile(
        path.join(TEST_PROJECT_DIR, 'AGENTS.md'),
        'utf-8'
      );

      expect(agentsMd).toContain('AIWG SDLC Framework');
      expect(agentsMd).toContain('.factory/droids/');
    });
  });

  describe('Dry Run', () => {
    it('--dry-run shows what would be deployed without writing', async () => {
      const output = runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR,
        '--dry-run'
      ]);

      expect(output).toContain('[dry-run]');

      // Verify no droids directory was populated
      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');
      const exists = await fs.access(droidsDir).then(() => true).catch(() => false);
      if (exists) {
        const droids = await fs.readdir(droidsDir);
        expect(droids.length).toBe(0);
      }
    });
  });

  describe('Regression: Task Tool Invocation', () => {
    it('agent names are valid for Task tool invocation', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');
      const droids = await fs.readdir(droidsDir);

      for (const droid of droids) {
        const content = await fs.readFile(path.join(droidsDir, droid), 'utf-8');
        const nameMatch = content.match(/name: ([^\n]+)/);

        if (nameMatch) {
          const name = nameMatch[1].trim();
          // Name must be kebab-case for Task tool to invoke it
          // Pattern: lowercase letters, numbers, and hyphens only
          expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
          // No spaces
          expect(name).not.toContain(' ');
          // No uppercase
          expect(name).toBe(name.toLowerCase());
          // No underscores
          expect(name).not.toContain('_');
        }
      }
    });

    it('no invalid tools in Factory droids', async () => {
      runScript('tools/agents/deploy-agents.mjs', [
        '--provider', 'factory',
        '--mode', 'sdlc',
        '--target', TEST_PROJECT_DIR
      ]);

      const droidsDir = path.join(TEST_FACTORY_DIR, 'droids');
      const droids = await fs.readdir(droidsDir);

      // Tools that don't exist in Factory
      const invalidTools = ['MultiEdit', 'Bash', 'Write', 'WebFetch'];

      for (const droid of droids) {
        const content = await fs.readFile(path.join(droidsDir, droid), 'utf-8');
        for (const invalidTool of invalidTools) {
          expect(content).not.toContain(`"${invalidTool}"`);
        }
      }
    });
  });
});
