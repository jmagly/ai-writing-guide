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
import { FrameworkIsolator } from '../../../src/plugin/framework-isolator.js';
import { FilesystemSandbox } from '../../../agentic/code/frameworks/sdlc-complete/src/testing/mocks/filesystem-sandbox.js';

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
  // Framework Path Resolution (8 tests)
  // ===========================

  describe('getFrameworkPath', () => {
    it('should return correct path for Claude framework', async () => {
      await sandbox.createDirectory('.aiwg/claude');

      const isolator = new FrameworkIsolator(projectRoot);
      const path = isolator.getFrameworkPath('claude');

      expect(path).toContain('.aiwg/claude');
    });

    it('should return correct path for Codex framework', async () => {
      await sandbox.createDirectory('.aiwg/codex');

      const isolator = new FrameworkIsolator(projectRoot);
      const path = isolator.getFrameworkPath('codex');

      expect(path).toContain('.aiwg/codex');
    });

    it('should return shared/ path for shared resources', async () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const path = isolator.getFrameworkPath('shared');

      expect(path).toContain('.aiwg/shared');
    });

    it('should throw error for unknown framework', async () => {
      const isolator = new FrameworkIsolator(projectRoot);

      expect(() => isolator.getFrameworkPath('unknown'))
        .toThrow('Unknown framework');
    });

    it('should resolve framework-specific resource paths', async () => {
      await sandbox.createDirectory('.aiwg/claude');

      const isolator = new FrameworkIsolator(projectRoot);
      const path = isolator.getFrameworkPath('claude', 'agents/test.md');

      expect(path).toContain('.aiwg/claude/agents/test.md');
    });

    it('should resolve shared resource paths', async () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const path = isolator.getFrameworkPath('shared', 'requirements/uc-001.md');

      expect(path).toContain('.aiwg/shared/requirements/uc-001.md');
    });

    it('should normalize paths with slashes', async () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const path1 = isolator.getFrameworkPath('claude', 'agents/test.md');
      const path2 = isolator.getFrameworkPath('claude', '/agents/test.md');

      // Both should resolve to same path
      expect(path1).toBe(path2);
    });

    it('should handle nested resource paths', async () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const path = isolator.getFrameworkPath('claude', 'agents/subfolder/test.md');

      expect(path).toContain('.aiwg/claude/agents/subfolder/test.md');
    });
  });

  // ===========================
  // Shared Resource Detection (8 tests)
  // ===========================

  describe('isSharedResource', () => {
    it('should identify requirements/ as shared', () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const isShared = isolator.isSharedResource('requirements/uc-001.md');

      expect(isShared).toBe(true);
    });

    it('should identify architecture/ as shared', () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const isShared = isolator.isSharedResource('architecture/sad.md');

      expect(isShared).toBe(true);
    });

    it('should identify agents/ as framework-specific', () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const isShared = isolator.isSharedResource('agents/test-agent.md');

      expect(isShared).toBe(false);
    });

    it('should identify commands/ as framework-specific', () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const isShared = isolator.isSharedResource('commands/test-cmd.md');

      expect(isShared).toBe(false);
    });

    it('should identify testing/ as shared', () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const isShared = isolator.isSharedResource('testing/test-plan.md');

      expect(isShared).toBe(true);
    });

    it('should identify deployment/ as shared', () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const isShared = isolator.isSharedResource('deployment/runbook.md');

      expect(isShared).toBe(true);
    });

    it('should identify memory/ as framework-specific', () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const isShared = isolator.isSharedResource('memory/session.json');

      expect(isShared).toBe(false);
    });

    it('should identify security/ as shared', () => {
      const isolator = new FrameworkIsolator(projectRoot);
      const isShared = isolator.isSharedResource('security/threat-model.md');

      expect(isShared).toBe(true);
    });
  });

  // ===========================
  // Framework Data Isolation (6 tests)
  // ===========================

  describe('isolateFrameworkData', () => {
    it('should keep framework agents separate', async () => {
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

    it('should share requirements across frameworks', async () => {
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# UC-001');

      const isolator = new FrameworkIsolator(projectRoot);
      const claudeReqs = await isolator.getSharedResources('requirements');
      const codexReqs = await isolator.getSharedResources('requirements');

      expect(claudeReqs).toEqual(codexReqs);
      expect(claudeReqs).toHaveLength(1);
    });

    it('should share architecture docs across frameworks', async () => {
      await sandbox.createDirectory('.aiwg/shared/architecture');
      await sandbox.writeFile('.aiwg/shared/architecture/sad.md', '# SAD');

      const isolator = new FrameworkIsolator(projectRoot);
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

    it('should prevent cross-framework file access', async () => {
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.writeFile('.aiwg/claude/agents/agent1.md', '# Agent');

      const isolator = new FrameworkIsolator(projectRoot);

      // Codex should not be able to access Claude's agents
      await expect(isolator.getFrameworkResources('codex', 'agents'))
        .resolves.toEqual([]);
    });

    it('should allow shared resource access from any framework', async () => {
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# UC-001');

      const isolator = new FrameworkIsolator(projectRoot);

      const fromClaude = await isolator.getSharedResources('requirements', 'claude');
      const fromCodex = await isolator.getSharedResources('requirements', 'codex');

      expect(fromClaude).toEqual(fromCodex);
      expect(fromClaude).toHaveLength(1);
    });
  });

  // ===========================
  // Isolation Validation (8 tests)
  // ===========================

  describe('validateIsolation', () => {
    it('should detect cross-framework contamination', async () => {
      // Create invalid structure: agents in shared
      await sandbox.createDirectory('.aiwg/shared/agents');
      await sandbox.writeFile('.aiwg/shared/agents/invalid.md', '# Invalid');

      const isolator = new FrameworkIsolator(projectRoot);
      const validation = await isolator.validateIsolation();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          type: 'contamination',
          message: expect.stringContaining('agents should not be in shared')
        })
      );
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

    it('should detect memory/ directory in shared', async () => {
      await sandbox.createDirectory('.aiwg/shared/memory');
      await sandbox.writeFile('.aiwg/shared/memory/session.json', '{}');

      const isolator = new FrameworkIsolator(projectRoot);
      const validation = await isolator.validateIsolation();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e =>
        e.message.includes('memory should not be in shared')
      )).toBe(true);
    });

    it('should detect commands/ directory in shared', async () => {
      await sandbox.createDirectory('.aiwg/shared/commands');

      const isolator = new FrameworkIsolator(projectRoot);
      const validation = await isolator.validateIsolation();

      expect(validation.valid).toBe(false);
    });

    it('should provide detailed error messages for violations', async () => {
      await sandbox.createDirectory('.aiwg/shared/agents');
      await sandbox.createDirectory('.aiwg/shared/memory');

      const isolator = new FrameworkIsolator(projectRoot);
      const validation = await isolator.validateIsolation();

      expect(validation.errors.length).toBeGreaterThanOrEqual(2);
      validation.errors.forEach(error => {
        expect(error.message).toBeDefined();
        expect(error.path).toBeDefined();
        expect(error.type).toBeDefined();
      });
    });

    it('should validate symlink isolation', async () => {
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.createDirectory('.aiwg/shared/requirements');

      const isolator = new FrameworkIsolator(projectRoot);
      const validation = await isolator.validateIsolation();

      // Should not report symlink-related errors for valid structure
      expect(validation.errors.filter(e => e.type === 'symlink')).toHaveLength(0);
    });
  });

  // ===========================
  // Resource Access Control (6 tests)
  // ===========================

  describe('Resource Access Control', () => {
    it('should restrict framework A from accessing framework B agents', async () => {
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.createDirectory('.aiwg/codex/agents');
      await sandbox.writeFile('.aiwg/claude/agents/claude-agent.md', '# Claude');
      await sandbox.writeFile('.aiwg/codex/agents/codex-agent.md', '# Codex');

      const isolator = new FrameworkIsolator(projectRoot);

      const claudeCanAccessClaude = await isolator.canAccess('claude', 'claude/agents/claude-agent.md');
      const claudeCanAccessCodex = await isolator.canAccess('claude', 'codex/agents/codex-agent.md');

      expect(claudeCanAccessClaude).toBe(true);
      expect(claudeCanAccessCodex).toBe(false);
    });

    it('should allow all frameworks to access shared resources', async () => {
      await sandbox.createDirectory('.aiwg/shared/requirements');
      await sandbox.writeFile('.aiwg/shared/requirements/uc-001.md', '# UC-001');

      const isolator = new FrameworkIsolator(projectRoot);

      const claudeCanAccess = await isolator.canAccess('claude', 'shared/requirements/uc-001.md');
      const codexCanAccess = await isolator.canAccess('codex', 'shared/requirements/uc-001.md');

      expect(claudeCanAccess).toBe(true);
      expect(codexCanAccess).toBe(true);
    });

    it('should allow framework to access its own memory', async () => {
      await sandbox.createDirectory('.aiwg/claude/memory');
      await sandbox.writeFile('.aiwg/claude/memory/session.json', '{}');

      const isolator = new FrameworkIsolator(projectRoot);

      const claudeCanAccess = await isolator.canAccess('claude', 'claude/memory/session.json');
      expect(claudeCanAccess).toBe(true);
    });

    it('should deny framework B access to framework A memory', async () => {
      await sandbox.createDirectory('.aiwg/claude/memory');
      await sandbox.writeFile('.aiwg/claude/memory/session.json', '{}');

      const isolator = new FrameworkIsolator(projectRoot);

      const codexCanAccess = await isolator.canAccess('codex', 'claude/memory/session.json');
      expect(codexCanAccess).toBe(false);
    });

    it('should allow framework to read shared resources', async () => {
      await sandbox.createDirectory('.aiwg/shared/architecture');
      await sandbox.writeFile('.aiwg/shared/architecture/sad.md', '# SAD');

      const isolator = new FrameworkIsolator(projectRoot);

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
  // Migration Helpers (4 tests)
  // ===========================

  describe('Migration Helpers', () => {
    it('should identify resources to move to framework-specific', async () => {
      await sandbox.createDirectory('.aiwg/agents'); // Legacy location
      await sandbox.writeFile('.aiwg/agents/legacy-agent.md', '# Legacy');

      const isolator = new FrameworkIsolator(projectRoot);
      const toMove = await isolator.identifyFrameworkSpecificResources('.aiwg');

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
      const toMove = await isolator.identifySharedResources('.aiwg');

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
      const categorized = await isolator.categorizeResources('.aiwg');

      expect(categorized.frameworkSpecific).toHaveLength(1);
      expect(categorized.shared).toHaveLength(1);
    });

    it('should suggest target framework for framework-specific resources', async () => {
      await sandbox.createDirectory('.aiwg/agents');
      await sandbox.createDirectory('.claude'); // Detected framework
      await sandbox.writeFile('.aiwg/agents/agent.md', '# Agent');

      const isolator = new FrameworkIsolator(projectRoot);
      const suggestions = await isolator.suggestFrameworkTargets('.aiwg');

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          resource: expect.stringContaining('agents/agent.md'),
          suggestedFramework: 'claude'
        })
      );
    });
  });
});
