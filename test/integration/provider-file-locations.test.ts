/**
 * Provider File Locations Integration Tests
 *
 * Comprehensive test suite validating that each provider deploys files to
 * the correct locations. This test suite validates actual filesystem state
 * after deployment.
 *
 * Issue #21: Fix provider deployment file locations
 *
 * Expected locations by provider:
 * - Claude:   .claude/agents/, .claude/commands/, .claude/skills/, .claude/rules/
 * - Codex:    .codex/agents/, ~/.codex/prompts/, ~/.codex/skills/
 * - Factory:  .factory/droids/, .factory/commands/
 * - Copilot:  .github/agents/
 * - Cursor:   .cursor/rules/
 * - OpenCode: .opencode/agent/, .opencode/command/
 * - Warp:     WARP.md (aggregated)
 * - Windsurf: AGENTS.md, .windsurfrules, .windsurf/workflows/
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const REPO_ROOT = path.resolve(__dirname, '../..');
const TEST_BASE = path.join(os.tmpdir(), 'aiwg-provider-tests');

interface ProviderConfig {
  name: string;
  projectPaths: string[];       // Paths that should exist in project dir
  homePaths?: string[];         // Paths that should exist in home dir
  rootFiles?: string[];         // Files that should exist in project root
  forbiddenPaths?: string[];    // Paths that should NOT exist
  fileExtension: string;        // Expected file extension for artifacts
  minArtifacts?: number;        // Minimum number of artifacts expected
}

const PROVIDERS: Record<string, ProviderConfig> = {
  claude: {
    name: 'claude',
    projectPaths: ['.claude/agents', '.claude/commands', '.claude/skills'],
    forbiddenPaths: [],
    fileExtension: '.md',
    minArtifacts: 10,
  },
  codex: {
    name: 'codex',
    projectPaths: ['.codex/agents'],
    homePaths: ['~/.codex/prompts', '~/.codex/skills'],
    forbiddenPaths: ['.claude'],  // Should NOT create Claude dirs
    fileExtension: '.md',
    minArtifacts: 5,
  },
  factory: {
    name: 'factory',
    projectPaths: ['.factory/droids', '.factory/commands'],
    forbiddenPaths: ['.claude', '.codex'],
    fileExtension: '.md',
    minArtifacts: 5,
  },
  copilot: {
    name: 'copilot',
    projectPaths: ['.github/agents'],
    forbiddenPaths: ['.claude', '.codex', '.factory'],
    fileExtension: '.yaml',  // Copilot uses .yaml not .yml
    minArtifacts: 5,
  },
  cursor: {
    name: 'cursor',
    projectPaths: ['.cursor/rules'],
    forbiddenPaths: ['.claude', '.codex', '.factory', '.github/agents'],
    fileExtension: '.mdc',
    minArtifacts: 5,
  },
  opencode: {
    name: 'opencode',
    projectPaths: ['.opencode/agent', '.opencode/command'],
    forbiddenPaths: ['.claude', '.codex', '.cursor'],
    fileExtension: '.md',
    minArtifacts: 5,
  },
  warp: {
    name: 'warp',
    projectPaths: [],
    rootFiles: ['WARP.md'],
    forbiddenPaths: ['.claude/agents', '.warp'],  // Warp uses aggregated WARP.md, not a directory
    fileExtension: '.md',
    minArtifacts: 0,  // Aggregated file, not individual artifacts
  },
  windsurf: {
    name: 'windsurf',
    projectPaths: ['.windsurf/workflows'],
    rootFiles: ['AGENTS.md', '.windsurfrules'],
    forbiddenPaths: ['.claude/agents', '.codex'],
    fileExtension: '.md',
    minArtifacts: 0,  // Aggregated files
  },
};

// Helper to create isolated test directory
async function createTestEnv(provider: string): Promise<{ projectDir: string; homeDir: string }> {
  const timestamp = Date.now();
  const projectDir = path.join(TEST_BASE, `${provider}-project-${timestamp}`);
  const homeDir = path.join(TEST_BASE, `${provider}-home-${timestamp}`);

  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(homeDir, { recursive: true });

  // Initialize git (some providers require it)
  execSync('git init', { cwd: projectDir, stdio: 'pipe' });

  return { projectDir, homeDir };
}

// Helper to clean up test directory
async function cleanupTestEnv(projectDir: string, homeDir: string): Promise<void> {
  await fs.rm(projectDir, { recursive: true, force: true });
  await fs.rm(homeDir, { recursive: true, force: true });
}

// Helper to run deployment
function runDeploy(
  provider: string,
  projectDir: string,
  homeDir: string,
  extraArgs: string[] = []
): string {
  const env = {
    ...process.env,
    HOME: homeDir,
    USERPROFILE: homeDir,
  };

  const args = [
    '--provider', provider,
    '--mode', 'sdlc',
    '--target', projectDir,
    '--deploy-commands',
    '--deploy-skills',
    ...extraArgs,
  ];

  return execSync(
    `node ${path.join(REPO_ROOT, 'tools/agents/deploy-agents.mjs')} ${args.join(' ')}`,
    { cwd: REPO_ROOT, env, encoding: 'utf-8' }
  );
}

// Helper to list files recursively
async function listFilesRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await listFilesRecursive(fullPath));
      } else {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return files;
}

// Helper to check if path exists
async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

describe('Provider File Locations', () => {
  // Ensure base test directory exists
  beforeEach(async () => {
    await fs.mkdir(TEST_BASE, { recursive: true });
  });

  describe.each(Object.keys(PROVIDERS))('%s provider', (providerName) => {
    const config = PROVIDERS[providerName];
    let projectDir: string;
    let homeDir: string;

    beforeEach(async () => {
      const env = await createTestEnv(providerName);
      projectDir = env.projectDir;
      homeDir = env.homeDir;
    });

    afterEach(async () => {
      await cleanupTestEnv(projectDir, homeDir);
    });

    it(`deploys to correct project directories`, async () => {
      runDeploy(config.name, projectDir, homeDir);

      for (const expectedPath of config.projectPaths) {
        const fullPath = path.join(projectDir, expectedPath);
        const exists = await pathExists(fullPath);
        expect(exists, `Expected ${expectedPath} to exist`).toBe(true);
      }
    });

    if (config.homePaths && config.homePaths.length > 0) {
      it(`deploys to correct home directories`, async () => {
        runDeploy(config.name, projectDir, homeDir);

        for (const expectedPath of config.homePaths!) {
          const resolvedPath = expectedPath.replace('~/', '');
          const fullPath = path.join(homeDir, resolvedPath);
          const exists = await pathExists(fullPath);
          expect(exists, `Expected ${expectedPath} to exist in home dir`).toBe(true);
        }
      });
    }

    if (config.rootFiles && config.rootFiles.length > 0) {
      it(`creates correct root files`, async () => {
        runDeploy(config.name, projectDir, homeDir);

        for (const rootFile of config.rootFiles!) {
          const fullPath = path.join(projectDir, rootFile);
          const exists = await pathExists(fullPath);
          expect(exists, `Expected ${rootFile} to exist in project root`).toBe(true);
        }
      });
    }

    if (config.forbiddenPaths && config.forbiddenPaths.length > 0) {
      it(`does NOT create forbidden paths`, async () => {
        runDeploy(config.name, projectDir, homeDir);

        for (const forbiddenPath of config.forbiddenPaths!) {
          const fullPath = path.join(projectDir, forbiddenPath);
          const exists = await pathExists(fullPath);
          expect(exists, `${forbiddenPath} should NOT exist for ${providerName}`).toBe(false);
        }
      });
    }

    if (config.minArtifacts > 0) {
      it(`deploys at least ${config.minArtifacts} artifacts with correct extension`, async () => {
        runDeploy(config.name, projectDir, homeDir);

        let totalArtifacts = 0;

        for (const projectPath of config.projectPaths) {
          const fullPath = path.join(projectDir, projectPath);
          const files = await listFilesRecursive(fullPath);
          const matchingFiles = files.filter(f => f.endsWith(config.fileExtension));
          totalArtifacts += matchingFiles.length;
        }

        expect(totalArtifacts).toBeGreaterThanOrEqual(config.minArtifacts);
      });
    }

    it(`does NOT place unexpected files in project root`, async () => {
      runDeploy(config.name, projectDir, homeDir);

      const rootContents = await fs.readdir(projectDir);

      // Filter to only unexpected items
      const expectedRoots = [
        '.git',
        '.aiwg',  // Framework registry always created
        ...(config.projectPaths.map(p => p.split('/')[0])),  // Top-level dirs
        ...(config.rootFiles || []),
      ];

      const unexpected = rootContents.filter(item =>
        !expectedRoots.includes(item) &&
        !item.startsWith('.')  // Allow hidden files like .gitignore
      );

      // Allow certain known files
      const allowedExtras = [
        'CLAUDE.md',  // May be created as context file
        'AGENTS.md',  // May be requested
        'WARP.md',    // Warp aggregated file
        '.windsurfrules', // Windsurf rules file
      ];

      const reallyUnexpected = unexpected.filter(item =>
        !allowedExtras.includes(item)
      );

      expect(reallyUnexpected, `Unexpected files in project root: ${reallyUnexpected.join(', ')}`).toEqual([]);
    });
  });

  describe('Provider Isolation', () => {
    it('each provider creates only its own directories', async () => {
      const providerDirs: Record<string, string[]> = {
        claude: ['.claude'],
        codex: ['.codex'],
        factory: ['.factory'],
        copilot: ['.github'],
        cursor: ['.cursor'],
        opencode: ['.opencode'],
        warp: [],  // Only WARP.md
        windsurf: ['.windsurf', '.windsurfrules'],
      };

      for (const [provider, expectedDirs] of Object.entries(providerDirs)) {
        const { projectDir, homeDir } = await createTestEnv(`isolation-${provider}`);

        try {
          runDeploy(provider, projectDir, homeDir);

          const rootContents = await fs.readdir(projectDir);
          const createdDirs = rootContents.filter(item =>
            item.startsWith('.') && !['.',  '.git', '.aiwg'].includes(item)
          );

          // Should only have expected provider-specific dirs
          for (const dir of createdDirs) {
            const isExpected = expectedDirs.some(ed => dir === ed);
            expect(isExpected, `${provider} created unexpected directory: ${dir}`).toBe(true);
          }
        } finally {
          await cleanupTestEnv(projectDir, homeDir);
        }
      }
    });
  });

  describe('aiwg use Command Integration', () => {
    it('aiwg use --provider passes provider to all deployments', async () => {
      const { projectDir, homeDir } = await createTestEnv('cli-integration');

      try {
        const env = {
          ...process.env,
          HOME: homeDir,
          USERPROFILE: homeDir,
        };

        // Run aiwg use with provider
        execSync(
          `node ${path.join(REPO_ROOT, 'bin/aiwg.mjs')} use sdlc --provider codex --target ${projectDir}`,
          { cwd: REPO_ROOT, env, encoding: 'utf-8' }
        );

        // Should have .codex directory
        const hasCodex = await pathExists(path.join(projectDir, '.codex'));
        expect(hasCodex, '.codex should exist').toBe(true);

        // Should NOT have .claude directory
        const hasClaude = await pathExists(path.join(projectDir, '.claude'));
        expect(hasClaude, '.claude should NOT exist when using codex provider').toBe(false);

      } finally {
        await cleanupTestEnv(projectDir, homeDir);
      }
    });
  });
});

describe('Edge Cases', () => {
  let projectDir: string;
  let homeDir: string;

  beforeEach(async () => {
    const env = await createTestEnv('edge-cases');
    projectDir = env.projectDir;
    homeDir = env.homeDir;
  });

  afterEach(async () => {
    await cleanupTestEnv(projectDir, homeDir);
  });

  it('handles existing directories gracefully', async () => {
    // Pre-create some directories
    await fs.mkdir(path.join(projectDir, '.cursor/rules'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, '.cursor/rules/existing.mdc'),
      '---\ndescription: existing\n---\nExisting rule'
    );

    // Should not error
    expect(() => {
      runDeploy('cursor', projectDir, homeDir);
    }).not.toThrow();

    // Existing file should still be there
    const exists = await pathExists(path.join(projectDir, '.cursor/rules/existing.mdc'));
    expect(exists).toBe(true);
  });

  it('--dry-run does not create any files', async () => {
    runDeploy('cursor', projectDir, homeDir, ['--dry-run']);

    // Should only have .git and .aiwg (framework registry)
    const contents = await fs.readdir(projectDir);
    const nonGit = contents.filter(c => c !== '.git' && c !== '.aiwg');

    expect(nonGit).toEqual([]);
  });

  it('--force overwrites existing files', async () => {
    // Create a file that will be overwritten
    await fs.mkdir(path.join(projectDir, '.cursor/rules'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, '.cursor/rules/aiwg-pr-review.mdc'),
      'OLD CONTENT'
    );

    runDeploy('cursor', projectDir, homeDir, ['--force']);

    const content = await fs.readFile(
      path.join(projectDir, '.cursor/rules/aiwg-pr-review.mdc'),
      'utf-8'
    );

    expect(content).not.toBe('OLD CONTENT');
    expect(content).toContain('---');  // Should have proper MDC format
  });
});
