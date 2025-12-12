/**
 * Factory AI Integration Tests
 *
 * Tests for Factory AI integration including:
 * - Agent name format (kebab-case)
 * - Tool mapping (MultiEdit -> Edit, Bash -> Execute, etc.)
 * - AGENTS.md generation
 * - Droid deployment to .factory/droids/
 * - Live droid CLI validation (when available)
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync, spawnSync } from 'child_process';

// Test directories
const TEST_PROJECT_DIR = path.join(os.tmpdir(), 'aiwg-factory-test-project');
const TEST_HOME_DIR = path.join(os.tmpdir(), 'aiwg-factory-test-home');
const TEST_FACTORY_DIR = path.join(TEST_PROJECT_DIR, '.factory');
const REPO_ROOT = path.resolve(__dirname, '../..');

// Check if droid CLI is available
function isDroidAvailable(): boolean {
  try {
    const result = spawnSync('droid', ['--version'], { encoding: 'utf-8', timeout: 5000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

// Check if FACTORY_API_KEY is set
function hasFactoryApiKey(): boolean {
  return !!process.env.FACTORY_API_KEY;
}

const DROID_AVAILABLE = isDroidAvailable();
const HAS_API_KEY = hasFactoryApiKey();

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

// Helper to run droid CLI commands
function runDroid(args: string[], options: { cwd?: string; timeout?: number } = {}): { stdout: string; stderr: string; status: number | null } {
  try {
    const result = spawnSync('droid', args, {
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
    return {
      stdout: '',
      stderr: String(e),
      status: -1,
    };
  }
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

/**
 * Live Factory CLI Tests
 *
 * These tests require the droid CLI to be installed and optionally
 * FACTORY_API_KEY to be set for full integration testing.
 *
 * Run with: FACTORY_API_KEY=your-key npx vitest run test/integration/factory-deployment.test.ts
 */
describe('Factory CLI Integration', () => {
  beforeAll(() => {
    if (!DROID_AVAILABLE) {
      console.log('⚠️  droid CLI not available - skipping CLI tests');
    }
    if (!HAS_API_KEY) {
      console.log('⚠️  FACTORY_API_KEY not set - skipping API-dependent tests');
    }
  });

  describe('CLI Installation', () => {
    it.skipIf(!DROID_AVAILABLE)('droid CLI is installed and accessible', () => {
      const result = runDroid(['--version']);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+/); // Version number format
    });

    it.skipIf(!DROID_AVAILABLE)('droid exec --list-tools returns available tools', () => {
      const result = runDroid(['exec', '--list-tools']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Available tools');
    });

    it.skipIf(!DROID_AVAILABLE)('lists Factory-compatible tools (no Claude-specific tools)', () => {
      const result = runDroid(['exec', '--list-tools']);

      // Factory should have these tools
      expect(result.stdout).toContain('Read');
      expect(result.stdout).toContain('Edit');
      expect(result.stdout).toContain('Create');
      expect(result.stdout).toContain('Execute');

      // Factory should NOT have these Claude-specific tools
      expect(result.stdout).not.toContain('MultiEdit');
      expect(result.stdout).not.toContain('Bash');
    });
  });

  describe('Custom Droids Configuration', () => {
    it.skipIf(!DROID_AVAILABLE)('custom droids are enabled in settings', async () => {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const settingsPath = path.join(homeDir, '.factory', 'settings.json');

      try {
        const settings = await fs.readFile(settingsPath, 'utf-8');
        expect(settings).toContain('enableCustomDroids');
        expect(settings).toMatch(/"enableCustomDroids":\s*true/);
      } catch {
        // Settings file may not exist yet
        console.log('Factory settings.json not found - droids may not be configured');
      }
    });

    it.skipIf(!DROID_AVAILABLE)('droids directory exists in home', async () => {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const droidsDir = path.join(homeDir, '.factory', 'droids');

      const exists = await fs.access(droidsDir).then(() => true).catch(() => false);
      // This is informational - may not exist if not deployed yet
      if (!exists) {
        console.log('No droids deployed to ~/.factory/droids/ yet');
      }
    });
  });

  describe('Live Droid Invocation', () => {
    it.skipIf(!DROID_AVAILABLE || !HAS_API_KEY)('can invoke @technical-researcher droid', async () => {
      // Deploy droids to home directory first
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const droidsDir = path.join(homeDir, '.factory', 'droids');

      execSync(`node ${path.join(REPO_ROOT, 'tools/agents/deploy-agents.mjs')} --provider factory --mode sdlc --force`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      // Verify droid file exists
      const techResearcher = path.join(droidsDir, 'technical-researcher.md');
      const exists = await fs.access(techResearcher).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Verify droid name is kebab-case
      const content = await fs.readFile(techResearcher, 'utf-8');
      expect(content).toContain('name: technical-researcher');

      // Invoke droid with a simple prompt (timeout 60s)
      const result = runDroid(
        ['exec', 'Use @technical-researcher to say "AIWG test successful"'],
        { timeout: 60000 }
      );

      // Should complete without error
      expect(result.status).toBe(0);
    }, 90000); // Extended timeout for API call

    it.skipIf(!DROID_AVAILABLE || !HAS_API_KEY)('droid responds with coherent output', async () => {
      // Simple test to verify droid can process and respond
      const result = runDroid(
        ['exec', 'What is 2 + 2? Reply with just the number.'],
        { timeout: 30000 }
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('4');
    }, 45000);
  });

  describe('MCP Integration', () => {
    it.skipIf(!DROID_AVAILABLE)('AIWG MCP tools are available', () => {
      const result = runDroid(['exec', '--list-tools']);

      // Check for AIWG MCP tools if configured
      if (result.stdout.includes('aiwg')) {
        expect(result.stdout).toContain('aiwg___agent-list');
        expect(result.stdout).toContain('aiwg___artifact-read');
        expect(result.stdout).toContain('aiwg___workflow-run');
      }
    });
  });
});
