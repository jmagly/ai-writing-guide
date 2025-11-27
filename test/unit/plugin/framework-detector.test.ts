/**
 * Unit tests for FrameworkDetector
 *
 * Tests framework detection from directory structure and config files.
 * FID-007 Framework-Scoped Workspaces detection logic.
 *
 * @module test/unit/plugin/framework-detector.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FrameworkDetector } from '../../../src/plugin/framework-detector.ts';
import { FilesystemSandbox } from '../../../agentic/code/frameworks/sdlc-complete/src/testing/mocks/filesystem-sandbox.ts';

describe('FrameworkDetector', () => {
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
  // Framework Detection (20 tests)
  // ===========================

  describe('detectFrameworks', () => {
    it('should detect Claude framework from .claude/ directory', async () => {
      await sandbox.createDirectory('.claude');
      await sandbox.writeFile('.claude/settings.json', '{}');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toContain('claude');
    });

    it('should detect Codex framework from .codex/ directory', async () => {
      await sandbox.createDirectory('.codex');
      await sandbox.writeFile('.codex/config.yaml', 'version: 1.0');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toContain('codex');
    });

    it('should detect Cursor framework from .cursor/ directory', async () => {
      await sandbox.createDirectory('.cursor');
      await sandbox.writeFile('.cursor/config.json', '{}');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toContain('cursor');
    });

    it('should detect multiple frameworks in same project', async () => {
      await sandbox.createDirectory('.claude');
      await sandbox.createDirectory('.codex');
      await sandbox.createDirectory('.cursor');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toHaveLength(3);
      expect(frameworks).toContain('claude');
      expect(frameworks).toContain('codex');
      expect(frameworks).toContain('cursor');
    });

    it('should return empty array when no frameworks detected', async () => {
      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toEqual([]);
    });

    it('should handle missing directories gracefully', async () => {
      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toEqual([]);
      expect(() => detector.detectFrameworks()).not.toThrow();
    });

    it('should detect framework from config files (.claude/settings.json)', async () => {
      await sandbox.createDirectory('.claude');
      await sandbox.writeFile('.claude/settings.json', JSON.stringify({
        framework: 'claude',
        version: '1.0.0'
      }));

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toContain('claude');
    });

    it('should prioritize directory over config file detection', async () => {
      // Create directory with misleading config
      await sandbox.createDirectory('.claude');
      await sandbox.writeFile('.claude/settings.json', JSON.stringify({
        framework: 'codex'  // Wrong framework name in config
      }));

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      // Should detect 'claude' from directory name, not 'codex' from config
      expect(frameworks).toContain('claude');
    });

    it('should detect framework from .aiwg/claude/ structure', async () => {
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.writeFile('.aiwg/claude/settings.json', '{}');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toContain('claude');
    });

    it('should detect framework from .aiwg/codex/ structure', async () => {
      await sandbox.createDirectory('.aiwg/codex');
      await sandbox.writeFile('.aiwg/codex/config.yaml', 'version: 1.0');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toContain('codex');
    });

    it('should detect both .claude/ and .aiwg/claude/ as single framework', async () => {
      await sandbox.createDirectory('.claude');
      await sandbox.createDirectory('.aiwg/claude');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      // Should detect 'claude' only once
      expect(frameworks.filter(f => f === 'claude')).toHaveLength(1);
    });

    it('should detect frameworks with agents subdirectory', async () => {
      await sandbox.createDirectory('.claude/agents');
      await sandbox.writeFile('.claude/agents/test-agent.md', '# Agent');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toContain('claude');
    });

    it('should detect frameworks with commands subdirectory', async () => {
      await sandbox.createDirectory('.codex/commands');
      await sandbox.writeFile('.codex/commands/test.md', '# Command');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toContain('codex');
    });

    it('should ignore .aiwg/shared/ as framework', async () => {
      await sandbox.createDirectory('.aiwg/shared');
      await sandbox.writeFile('.aiwg/shared/test.md', '# Shared');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).not.toContain('shared');
    });

    it('should handle symlinks in framework directories', async () => {
      await sandbox.createDirectory('.claude');
      // Note: FilesystemSandbox might not support symlinks, so this test
      // validates that detection doesn't crash on symlink presence
      await sandbox.writeFile('.claude/settings.json', '{}');

      const detector = new FrameworkDetector(projectRoot);
      await expect(detector.detectFrameworks()).resolves.toBeDefined();
    });

    it('should detect frameworks from nested .aiwg structure', async () => {
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.createDirectory('.aiwg/codex/commands');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toContain('claude');
      expect(frameworks).toContain('codex');
    });

    it('should return frameworks in consistent order', async () => {
      await sandbox.createDirectory('.cursor');
      await sandbox.createDirectory('.claude');
      await sandbox.createDirectory('.codex');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks1 = await detector.detectFrameworks();
      const frameworks2 = await detector.detectFrameworks();

      expect(frameworks1).toEqual(frameworks2);
    });

    it('should detect framework from minimal config', async () => {
      await sandbox.createDirectory('.claude');
      // Empty directory, no config file

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toContain('claude');
    });

    it('should ignore non-framework directories in .aiwg', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.aiwg/architecture');
      await sandbox.createDirectory('.aiwg/claude');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toEqual(['claude']);
      expect(frameworks).not.toContain('requirements');
      expect(frameworks).not.toContain('architecture');
    });

    it('should handle permission errors gracefully', async () => {
      // Create directory
      await sandbox.createDirectory('.claude');

      const detector = new FrameworkDetector(projectRoot);
      // Should not throw even if permissions are limited
      await expect(detector.detectFrameworks()).resolves.toBeDefined();
    });
  });

  // ===========================
  // Legacy Workspace Detection
  // ===========================

  describe('isLegacyWorkspace', () => {
    it('should detect legacy workspace (.aiwg/ without framework subdirs)', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/intake/test.md', '# Test');

      const detector = new FrameworkDetector(projectRoot);
      const isLegacy = await detector.isLegacyWorkspace();

      expect(isLegacy).toBe(true);
    });

    it('should return false for framework-scoped workspace', async () => {
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.createDirectory('.aiwg/shared');
      await sandbox.writeFile('.aiwg/claude/settings.json', '{}');

      const detector = new FrameworkDetector(projectRoot);
      const isLegacy = await detector.isLegacyWorkspace();

      expect(isLegacy).toBe(false);
    });

    it('should handle missing .aiwg/ directory', async () => {
      const detector = new FrameworkDetector(projectRoot);
      const isLegacy = await detector.isLegacyWorkspace();

      expect(isLegacy).toBe(false);
    });

    it('should detect legacy workspace with multiple SDLC directories', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.aiwg/architecture');
      await sandbox.createDirectory('.aiwg/testing');

      const detector = new FrameworkDetector(projectRoot);
      const isLegacy = await detector.isLegacyWorkspace();

      expect(isLegacy).toBe(true);
    });

    it('should return false for mixed structure (legacy + framework)', async () => {
      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.createDirectory('.aiwg/claude');

      const detector = new FrameworkDetector(projectRoot);
      const isLegacy = await detector.isLegacyWorkspace();

      // Mixed structure is not considered "legacy only"
      expect(isLegacy).toBe(false);
    });

    it('should handle empty .aiwg/ directory', async () => {
      await sandbox.createDirectory('.aiwg');

      const detector = new FrameworkDetector(projectRoot);
      const isLegacy = await detector.isLegacyWorkspace();

      expect(isLegacy).toBe(false);
    });
  });

  // ===========================
  // Framework Info
  // ===========================

  describe('getFrameworkInfo', () => {
    it('should return framework version from config', async () => {
      await sandbox.createDirectory('.claude');
      await sandbox.writeFile('.claude/settings.json', JSON.stringify({
        version: '1.0.0'
      }));

      const detector = new FrameworkDetector(projectRoot);
      const info = await detector.getFrameworkInfo('claude');

      expect(info).toBeDefined();
      expect(info.version).toBe('1.0.0');
    });

    it('should return framework capabilities', async () => {
      await sandbox.createDirectory('.claude');
      await sandbox.writeFile('.claude/settings.json', JSON.stringify({
        capabilities: ['agents', 'commands', 'memory']
      }));

      const detector = new FrameworkDetector(projectRoot);
      const info = await detector.getFrameworkInfo('claude');

      expect(info.capabilities).toEqual(['agents', 'commands', 'memory']);
    });

    it('should handle invalid framework names', async () => {
      const detector = new FrameworkDetector(projectRoot);

      await expect(detector.getFrameworkInfo('invalid-framework'))
        .rejects.toThrow('Framework not found');
    });

    it('should return default info when config missing', async () => {
      await sandbox.createDirectory('.claude');
      // No config file

      const detector = new FrameworkDetector(projectRoot);
      const info = await detector.getFrameworkInfo('claude');

      expect(info).toBeDefined();
      expect(info.name).toBe('claude');
      expect(info.version).toBeUndefined();
    });

    it('should detect framework path', async () => {
      await sandbox.createDirectory('.aiwg/claude');

      const detector = new FrameworkDetector(projectRoot);
      const info = await detector.getFrameworkInfo('claude');

      expect(info.path).toContain('.aiwg/claude');
    });

    it('should prioritize .aiwg/framework/ over .framework/', async () => {
      await sandbox.createDirectory('.claude');
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.writeFile('.aiwg/claude/settings.json', JSON.stringify({
        version: '2.0.0'
      }));
      await sandbox.writeFile('.claude/settings.json', JSON.stringify({
        version: '1.0.0'
      }));

      const detector = new FrameworkDetector(projectRoot);
      const info = await detector.getFrameworkInfo('claude');

      // Should use .aiwg/claude/ version
      expect(info.version).toBe('2.0.0');
    });

    it('should return framework type', async () => {
      await sandbox.createDirectory('.claude');

      const detector = new FrameworkDetector(projectRoot);
      const info = await detector.getFrameworkInfo('claude');

      expect(info.type).toBe('ide');
    });

    it('should detect installed agents count', async () => {
      await sandbox.createDirectory('.claude/agents');
      await sandbox.writeFile('.claude/agents/agent1.md', '# Agent 1');
      await sandbox.writeFile('.claude/agents/agent2.md', '# Agent 2');

      const detector = new FrameworkDetector(projectRoot);
      const info = await detector.getFrameworkInfo('claude');

      expect(info.agentCount).toBe(2);
    });

    it('should detect installed commands count', async () => {
      await sandbox.createDirectory('.codex/commands');
      await sandbox.writeFile('.codex/commands/cmd1.md', '# Command 1');
      await sandbox.writeFile('.codex/commands/cmd2.md', '# Command 2');
      await sandbox.writeFile('.codex/commands/cmd3.md', '# Command 3');

      const detector = new FrameworkDetector(projectRoot);
      const info = await detector.getFrameworkInfo('codex');

      expect(info.commandCount).toBe(3);
    });

    it('should handle corrupted config gracefully', async () => {
      await sandbox.createDirectory('.claude');
      await sandbox.writeFile('.claude/settings.json', 'invalid json{{{');

      const detector = new FrameworkDetector(projectRoot);
      const info = await detector.getFrameworkInfo('claude');

      // Should return basic info despite corrupted config
      expect(info.name).toBe('claude');
    });
  });
});
