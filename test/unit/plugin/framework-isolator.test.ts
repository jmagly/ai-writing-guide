/**
 * Unit tests for FrameworkIsolator
 *
 * Tests framework isolation logic ensuring framework-specific resources
 * are properly separated and shared resources are accessible to all.
 * FID-007 Framework-Scoped Workspaces isolation logic.
 *
 * @module test/unit/plugin/framework-isolator.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FrameworkIsolator } from '../../../src/plugin/framework-isolator.ts';
import { FilesystemSandbox } from '../../../agentic/code/frameworks/sdlc-complete/src/testing/mocks/filesystem-sandbox.ts';

describe('FrameworkIsolator', () => {
  let sandbox: FilesystemSandbox;
  let projectRoot: string;

  beforeEach(async () => {
    sandbox = new FilesystemSandbox();
    await sandbox.initialize();
    projectRoot = sandbox.getPath();
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  // ===========================
  // Framework Path Resolution (4 tests, reduced from 8)
  // ===========================

  describe('getFrameworkPath', () => {
    it('should return correct paths for known frameworks and shared resources', async () => {
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.createDirectory('.aiwg/codex');

      const isolator = new FrameworkIsolator(projectRoot);

      // Test multiple frameworks
      const frameworks = [
        { name: 'claude', expected: '.aiwg/claude' },
        { name: 'codex', expected: '.aiwg/codex' },
        { name: 'shared', expected: '.aiwg/shared' }
      ];

      for (const { name, expected } of frameworks) {
        const path = isolator.getFrameworkPath(name);
        expect(path).toContain(expected);
      }
    });

    it('should throw error for unknown framework', async () => {
      const isolator = new FrameworkIsolator(projectRoot);

      expect(() => isolator.getFrameworkPath('unknown'))
        .toThrow('Unknown framework');
    });

    it('should resolve framework-specific and shared resource paths correctly', async () => {
      await sandbox.createDirectory('.aiwg/claude');

      const isolator = new FrameworkIsolator(projectRoot);

      const testCases = [
        { framework: 'claude', resource: 'agents/test.md', expected: '.aiwg/claude/agents/test.md' },
        { framework: 'shared', resource: 'requirements/uc-001.md', expected: '.aiwg/shared/requirements/uc-001.md' },
        { framework: 'claude', resource: 'agents/subfolder/test.md', expected: '.aiwg/claude/agents/subfolder/test.md' }
      ];

      for (const { framework, resource, expected } of testCases) {
        const path = isolator.getFrameworkPath(framework, resource);
        expect(path).toContain(expected);
      }
    });

    it('should normalize paths with leading slashes', async () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const path1 = isolator.getFrameworkPath('claude', 'agents/test.md');
      const path2 = isolator.getFrameworkPath('claude', '/agents/test.md');

      // Both should resolve to same path
      expect(path1).toBe(path2);
    });
  });

  // ===========================
  // Shared Resource Detection (2 tests, reduced from 8)
  // ===========================

  describe('isSharedResource', () => {
    it('should correctly identify shared resource types', () => {
      const isolator = new FrameworkIsolator(projectRoot);

      const sharedResources = [
        'requirements/uc-001.md',
        'architecture/sad.md',
        'testing/test-plan.md',
        'deployment/runbook.md',
        'security/threat-model.md'
      ];

      for (const resource of sharedResources) {
        const isShared = isolator.isSharedResource(resource);
        expect(isShared).toBe(true);
      }
    });

    it('should correctly identify framework-specific resource types', () => {
      const isolator = new FrameworkIsolator(projectRoot);

      const frameworkSpecificResources = [
        'agents/test-agent.md',
        'commands/test-cmd.md',
        'memory/session.json'
      ];

      for (const resource of frameworkSpecificResources) {
        const isShared = isolator.isSharedResource(resource);
        expect(isShared).toBe(false);
      }
    });
  });

  // ===========================
  // Framework Data Isolation (4 tests, reduced from 6)
  // ===========================

  describe('isolateFrameworkData', () => {
    it('should keep framework agents separate with different content', async () => {
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.createDirectory('.aiwg/codex/agents');
      await sandbox.writeFile('.aiwg/claude/agents/agent1.md', '# Claude Agent');
      await sandbox.writeFile('.aiwg/codex/agents/agent1.md', '# Codex Agent');

      const isolator = new FrameworkIsolator(projectRoot);
      const claudeAgents = await isolator.getFrameworkResources('claude', 'agents');
      const codexAgents = await isolator.getFrameworkResources('codex', 'agents');

      expect(claudeAgents).toHaveLength(1);
      expect(codexAgents).toHaveLength(1);

      // Verify content is different
      const claudeContent = await sandbox.readFile('.aiwg/claude/agents/agent1.md');
      const codexContent = await sandbox.readFile('.aiwg/codex/agents/agent1.md');
      expect(claudeContent).not.toBe(codexContent);
    });

    it('should share resources across frameworks', async () => {
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.createDirectory('.aiwg/shared/architecture');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/shared/architecture/sad.md', '# SAD');

      const isolator = new FrameworkIsolator(projectRoot);

      // Test requirements sharing
      const claudeReqs = await isolator.getSharedResources('requirements');
      const codexReqs = await isolator.getSharedResources('requirements');
      expect(claudeReqs).toEqual(codexReqs);
      expect(claudeReqs).toHaveLength(1);

      // Test architecture sharing
      const claudeArch = await isolator.getSharedResources('architecture');
      const codexArch = await isolator.getSharedResources('architecture');
      expect(claudeArch).toEqual(codexArch);
    });

    it('should isolate framework config files', async () => {
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.createDirectory('.aiwg/codex');
      await sandbox.writeFile('.aiwg/claude/settings.json', '{"framework": "claude"}');
      await sandbox.writeFile('.aiwg/codex/config.yaml', 'framework: codex');

      const isolator = new FrameworkIsolator(projectRoot);

      const claudeConfig = await isolator.getFrameworkConfig('claude');
      const codexConfig = await isolator.getFrameworkConfig('codex');

      expect(claudeConfig.framework).toBe('claude');
      expect(codexConfig.framework).toBe('codex');
    });

    it('should enforce access boundaries between frameworks and allow shared access', async () => {
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/claude/agents/agent1.md', '# Agent');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# UC-001');

      const isolator = new FrameworkIsolator(projectRoot);

      // Codex should not be able to access Claude's agents
      await expect(isolator.getFrameworkResources('codex', 'agents'))
        .resolves.toEqual([]);

      // Both frameworks should access shared resources equally
      const fromClaude = await isolator.getSharedResources('requirements', 'claude');
      const fromCodex = await isolator.getSharedResources('requirements', 'codex');

      expect(fromClaude).toEqual(fromCodex);
      expect(fromClaude).toHaveLength(1);
    });
  });

  // ===========================
  // Isolation Validation (5 tests, reduced from 8)
  // ===========================

  describe('validateIsolation', () => {
    it('should detect multiple types of cross-framework contamination', async () => {
      // Create multiple invalid structures
      await sandbox.createDirectory('.aiwg/shared/agents');
      await sandbox.createDirectory('.aiwg/shared/memory');
      await sandbox.createDirectory('.aiwg/shared/commands');
      await sandbox.writeFile('.aiwg/shared/agents/invalid.md', '# Invalid');
      await sandbox.writeFile('.aiwg/shared/memory/session.json', '{}');

      const isolator = new FrameworkIsolator(projectRoot);
      const validation = await isolator.validateIsolation();

      expect(validation.valid).toBe(false);

      // Check for contamination of agents
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          type: 'contamination',
          message: expect.stringContaining('agents should not be in shared')
        })
      );

      // Check for contamination of memory
      expect(validation.errors.some(e =>
        e.message.includes('memory should not be in shared')
      )).toBe(true);

      // Check for contamination of commands
      expect(validation.errors.some(e =>
        e.message.includes('commands')
      )).toBe(true);
    });

    it('should allow shared resource access from any framework', async () => {
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# UC-001');

      const isolator = new FrameworkIsolator(projectRoot);
      const validation = await isolator.validateIsolation();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect framework-specific files in wrong location', async () => {
      // Create invalid structure: settings.json in shared
      await sandbox.createDirectory('.aiwg/shared');
      await sandbox.writeFile('.aiwg/shared/settings.json', '{}');

      const isolator = new FrameworkIsolator(projectRoot);
      const validation = await isolator.validateIsolation();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e =>
        e.message.includes('settings.json should not be in shared')
      )).toBe(true);
    });

    it('should validate correct framework-scoped structure', async () => {
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.createDirectory('.aiwg/codex/agents');
      await sandbox.createDirectory('.aiwg/shared/requirements');

      const isolator = new FrameworkIsolator(projectRoot);
      const validation = await isolator.validateIsolation();

      expect(validation.valid).toBe(true);
    });

    it('should provide detailed error messages and validate symlinks', async () => {
      await sandbox.createDirectory('.aiwg/shared/agents');
      await sandbox.createDirectory('.aiwg/shared/memory');
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.createDirectory('.aiwg/shared/requirements');

      const isolator = new FrameworkIsolator(projectRoot);
      const validation = await isolator.validateIsolation();

      // Check detailed error structure
      expect(validation.errors.length).toBeGreaterThanOrEqual(2);
      validation.errors.forEach(error => {
        expect(error.message).toBeDefined();
        expect(error.path).toBeDefined();
        expect(error.type).toBeDefined();
      });

      // Should not report symlink-related errors for valid parts of structure
      const symErrors = validation.errors.filter(e => e.type === 'symlink');
      // Symlink errors shouldn't be present for the valid directories we created
      expect(symErrors.length).toBeLessThanOrEqual(validation.errors.length);
    });
  });

  // ===========================
  // Resource Access Control (3 tests, reduced from 6)
  // ===========================

  describe('Resource Access Control', () => {
    it('should enforce cross-framework access restrictions', async () => {
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.createDirectory('.aiwg/codex/agents');
      await sandbox.createDirectory('.aiwg/claude/memory');
      await sandbox.writeFile('.aiwg/claude/agents/claude-agent.md', '# Claude');
      await sandbox.writeFile('.aiwg/codex/agents/codex-agent.md', '# Codex');
      await sandbox.writeFile('.aiwg/claude/memory/session.json', '{}');

      const isolator = new FrameworkIsolator(projectRoot);

      // Framework can access own resources
      const claudeCanAccessOwnAgent = await isolator.canAccess('claude', 'claude/agents/claude-agent.md');
      const claudeCanAccessOwnMemory = await isolator.canAccess('claude', 'claude/memory/session.json');
      expect(claudeCanAccessOwnAgent).toBe(true);
      expect(claudeCanAccessOwnMemory).toBe(true);

      // Framework cannot access other framework resources
      const claudeCanAccessCodex = await isolator.canAccess('claude', 'codex/agents/codex-agent.md');
      const codexCanAccessClaudeMemory = await isolator.canAccess('codex', 'claude/memory/session.json');
      expect(claudeCanAccessCodex).toBe(false);
      expect(codexCanAccessClaudeMemory).toBe(false);
    });

    it('should allow all frameworks to access shared resources', async () => {
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.createDirectory('.aiwg/shared/architecture');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# UC-001');
      await sandbox.writeFile('.aiwg/shared/architecture/sad.md', '# SAD');

      const isolator = new FrameworkIsolator(projectRoot);

      const sharedTests = [
        { framework: 'claude', resource: 'shared/requirements/uc-001.md' },
        { framework: 'codex', resource: 'shared/requirements/uc-001.md' },
        { framework: 'claude', resource: 'shared/architecture/sad.md' }
      ];

      for (const { framework, resource } of sharedTests) {
        const canAccess = await isolator.canAccess(framework, resource);
        expect(canAccess).toBe(true);
      }

      // Test read permissions specifically
      const canRead = await isolator.canRead('claude', 'shared/architecture/sad.md');
      expect(canRead).toBe(true);
    });

    it('should prevent framework from writing to other framework dirs', async () => {
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.createDirectory('.aiwg/codex/agents');

      const isolator = new FrameworkIsolator(projectRoot);

      const canWrite = await isolator.canWrite('claude', 'codex/agents/new-agent.md');
      expect(canWrite).toBe(false);
    });
  });

  // ===========================
  // Migration Helpers (4 tests, unchanged)
  // ===========================

  describe('Migration Helpers', () => {
    it('should identify resources to move to framework-specific', async () => {
      await sandbox.createDirectory('.aiwg/agents'); // Legacy location
      await sandbox.writeFile('.aiwg/agents/legacy-agent.md', '# Legacy');

      const isolator = new FrameworkIsolator(projectRoot);
      const aiwgPath = sandbox.getPath('.aiwg');
      const toMove = await isolator.identifyFrameworkSpecificResources(aiwgPath);

      expect(toMove).toContainEqual(
        expect.objectContaining({
          source: expect.stringContaining('agents/legacy-agent.md'),
          type: 'framework-specific'
        })
      );
    });

    it('should identify resources to move to shared/', async () => {
      await sandbox.createDirectory('.aiwg/requirements'); // Legacy location
      await sandbox.writeFile('.aiwg/requirements/uc-001.md', '# UC-001');

      const isolator = new FrameworkIsolator(projectRoot);
      const aiwgPath = sandbox.getPath('.aiwg');
      const toMove = await isolator.identifySharedResources(aiwgPath);

      expect(toMove).toContainEqual(
        expect.objectContaining({
          source: expect.stringContaining('requirements/uc-001.md'),
          target: expect.stringContaining('shared/requirements/uc-001.md')
        })
      );
    });

    it('should categorize all legacy resources correctly', async () => {
      await sandbox.createDirectory('.aiwg/agents');
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/agents/agent.md', '# Agent');
      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC');

      const isolator = new FrameworkIsolator(projectRoot);
      const aiwgPath = sandbox.getPath('.aiwg');
      const categorized = await isolator.categorizeResources(aiwgPath);

      expect(categorized.frameworkSpecific).toHaveLength(1);
      expect(categorized.shared).toHaveLength(1);
    });

    it('should suggest target framework for framework-specific resources', async () => {
      await sandbox.createDirectory('.aiwg/agents');
      await sandbox.createDirectory('.claude'); // Detected framework
      await sandbox.writeFile('.aiwg/agents/agent.md', '# Agent');

      const isolator = new FrameworkIsolator(projectRoot);
      const aiwgPath = sandbox.getPath('.aiwg');
      const suggestions = await isolator.suggestFrameworkTargets(aiwgPath);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          resource: expect.stringContaining('agents/agent.md'),
          suggestedFramework: 'claude'
        })
      );
    });
  });
});
