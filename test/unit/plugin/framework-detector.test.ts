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
  // Framework Detection
  // ===========================

  describe('detectFrameworks', () => {
    it('should detect frameworks from various directory structures', async () => {
      const testCases = [
        // .{framework}/ directories
        { framework: 'claude', file: '.claude/settings.json', content: '{}' },
        { framework: 'codex', file: '.codex/config.yaml', content: 'version: 1.0' },
        { framework: 'cursor', file: '.cursor/config.json', content: '{}' },
        // .aiwg/{framework}/ structures
        { framework: 'claude', file: '.aiwg/claude/settings.json', content: '{}' },
        { framework: 'codex', file: '.aiwg/codex/config.yaml', content: 'version: 1.0' },
        // Frameworks with subdirectories
        { framework: 'claude', file: '.claude/agents/test-agent.md', content: '# Agent' },
        { framework: 'codex', file: '.codex/commands/test.md', content: '# Command' }
      ];

      for (const { framework, file, content } of testCases) {
        const dir = file.substring(0, file.lastIndexOf('/'));
        await sandbox.createDirectory(dir);
        await sandbox.writeFile(file, content);

        const detector = new FrameworkDetector(projectRoot);
        const detected = await detector.detectFrameworks();

        expect(detected).toContain(framework);

        // Cleanup for next iteration
        await sandbox.cleanup();
        sandbox = new FilesystemSandbox();
        await sandbox.initialize();
        projectRoot = sandbox.getPath();
      }
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

    it('should handle empty/missing directories and errors gracefully', async () => {
      // Test empty project
      let detector = new FrameworkDetector(projectRoot);
      let frameworks = await detector.detectFrameworks();
      expect(frameworks).toEqual([]);
      expect(() => detector.detectFrameworks()).not.toThrow();

      // Test with directory that might have permission issues
      await sandbox.createDirectory('.claude');
      detector = new FrameworkDetector(projectRoot);
      await expect(detector.detectFrameworks()).resolves.toBeDefined();
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

    it('should handle deduplication and special directories', async () => {
      // Should detect both .claude/ and .aiwg/claude/ as single framework
      await sandbox.createDirectory('.claude');
      await sandbox.createDirectory('.aiwg/claude');

      let detector = new FrameworkDetector(projectRoot);
      let frameworks = await detector.detectFrameworks();
      expect(frameworks.filter(f => f === 'claude')).toHaveLength(1);

      // Should ignore .aiwg/shared/
      await sandbox.cleanup();
      sandbox = new FilesystemSandbox();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();

      await sandbox.createDirectory('.aiwg/shared');
      await sandbox.writeFile('.aiwg/shared/test.md', '# Shared');

      detector = new FrameworkDetector(projectRoot);
      frameworks = await detector.detectFrameworks();
      expect(frameworks).not.toContain('shared');
    });

    it('should handle nested structures and return consistent order', async () => {
      // Test nested .aiwg structure
      await sandbox.createDirectory('.aiwg/claude/agents');
      await sandbox.createDirectory('.aiwg/codex/commands');

      const detector = new FrameworkDetector(projectRoot);
      const frameworks = await detector.detectFrameworks();

      expect(frameworks).toContain('claude');
      expect(frameworks).toContain('codex');

      // Test consistency
      const frameworks1 = await detector.detectFrameworks();
      const frameworks2 = await detector.detectFrameworks();
      expect(frameworks1).toEqual(frameworks2);
    });

    it('should detect from minimal or no config and ignore non-framework directories', async () => {
      // Minimal config (empty directory)
      await sandbox.createDirectory('.claude');
      let detector = new FrameworkDetector(projectRoot);
      let frameworks = await detector.detectFrameworks();
      expect(frameworks).toContain('claude');

      // Ignore non-framework directories in .aiwg
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('.aiwg/architecture');

      detector = new FrameworkDetector(projectRoot);
      frameworks = await detector.detectFrameworks();
      expect(frameworks).toContain('claude');
      expect(frameworks).not.toContain('requirements');
      expect(frameworks).not.toContain('architecture');
    });
  });

  // ===========================
  // Legacy Workspace Detection
  // ===========================

  describe('isLegacyWorkspace', () => {
    it('should detect legacy workspace with SDLC directories', async () => {
      const testCases = [
        {
          scenario: 'single SDLC directory',
          dirs: ['.aiwg/intake', '.aiwg/requirements'],
          files: ['.aiwg/intake/test.md'],
          expected: true
        },
        {
          scenario: 'multiple SDLC directories',
          dirs: ['.aiwg/intake', '.aiwg/requirements', '.aiwg/architecture', '.aiwg/testing'],
          files: [],
          expected: true
        }
      ];

      for (const { dirs, files, expected } of testCases) {
        for (const dir of dirs) {
          await sandbox.createDirectory(dir);
        }
        for (const file of files) {
          await sandbox.writeFile(file, '# Test');
        }

        const detector = new FrameworkDetector(projectRoot);
        const isLegacy = await detector.isLegacyWorkspace();

        expect(isLegacy).toBe(expected);

        // Cleanup for next iteration
        await sandbox.cleanup();
        sandbox = new FilesystemSandbox();
        await sandbox.initialize();
        projectRoot = sandbox.getPath();
      }
    });

    it('should return false for framework-scoped, mixed, or empty workspaces', async () => {
      // Framework-scoped workspace
      await sandbox.createDirectory('.aiwg/claude');
      await sandbox.createDirectory('.aiwg/shared');
      await sandbox.writeFile('.aiwg/claude/settings.json', '{}');

      let detector = new FrameworkDetector(projectRoot);
      let isLegacy = await detector.isLegacyWorkspace();
      expect(isLegacy).toBe(false);

      // Mixed structure (legacy + framework)
      await sandbox.cleanup();
      sandbox = new FilesystemSandbox();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();

      await sandbox.createDirectory('.aiwg/intake');
      await sandbox.createDirectory('.aiwg/claude');
      detector = new FrameworkDetector(projectRoot);
      isLegacy = await detector.isLegacyWorkspace();
      expect(isLegacy).toBe(false);
    });

    it('should handle missing or empty .aiwg/ directory', async () => {
      // Test missing directory
      const detector1 = new FrameworkDetector(projectRoot);
      const isLegacy1 = await detector1.isLegacyWorkspace();
      expect(isLegacy1).toBe(false);

      // Test empty directory
      await sandbox.createDirectory('.aiwg');
      const detector2 = new FrameworkDetector(projectRoot);
      const isLegacy2 = await detector2.isLegacyWorkspace();
      expect(isLegacy2).toBe(false);
    });
  });

  // ===========================
  // Framework Info
  // ===========================

  describe('getFrameworkInfo', () => {
    it('should return framework config data (version, capabilities)', async () => {
      // Test version
      await sandbox.createDirectory('.claude');
      await sandbox.writeFile('.claude/settings.json', JSON.stringify({
        version: '1.0.0',
        capabilities: ['agents', 'commands', 'memory']
      }));

      const detector = new FrameworkDetector(projectRoot);
      const info = await detector.getFrameworkInfo('claude');

      expect(info).toBeDefined();
      expect(info.version).toBe('1.0.0');
      expect(info.capabilities).toEqual(['agents', 'commands', 'memory']);
    });

    it('should handle invalid/missing config and return defaults', async () => {
      // Invalid framework name
      let detector = new FrameworkDetector(projectRoot);
      await expect(detector.getFrameworkInfo('invalid-framework'))
        .rejects.toThrow('Framework not found');

      // Missing config file
      await sandbox.createDirectory('.claude');
      detector = new FrameworkDetector(projectRoot);
      let info = await detector.getFrameworkInfo('claude');
      expect(info).toBeDefined();
      expect(info.name).toBe('claude');
      expect(info.version).toBeUndefined();

      // Corrupted config
      await sandbox.writeFile('.claude/settings.json', 'invalid json{{{');
      detector = new FrameworkDetector(projectRoot);
      info = await detector.getFrameworkInfo('claude');
      expect(info.name).toBe('claude');
    });

    it('should detect framework path and prioritize .aiwg/ over root', async () => {
      // Test path detection
      await sandbox.createDirectory('.aiwg/claude');
      let detector = new FrameworkDetector(projectRoot);
      let info = await detector.getFrameworkInfo('claude');
      expect(info.path).toContain('.aiwg/claude');

      // Test prioritization
      await sandbox.createDirectory('.claude');
      await sandbox.writeFile('.aiwg/claude/settings.json', JSON.stringify({
        version: '2.0.0'
      }));
      await sandbox.writeFile('.claude/settings.json', JSON.stringify({
        version: '1.0.0'
      }));

      detector = new FrameworkDetector(projectRoot);
      info = await detector.getFrameworkInfo('claude');
      expect(info.version).toBe('2.0.0');
    });

    it('should return framework type', async () => {
      await sandbox.createDirectory('.claude');

      const detector = new FrameworkDetector(projectRoot);
      const info = await detector.getFrameworkInfo('claude');

      expect(info.type).toBe('ide');
    });

    it('should count installed agents and commands', async () => {
      // Test agents count
      await sandbox.createDirectory('.claude/agents');
      await sandbox.writeFile('.claude/agents/agent1.md', '# Agent 1');
      await sandbox.writeFile('.claude/agents/agent2.md', '# Agent 2');

      let detector = new FrameworkDetector(projectRoot);
      let info = await detector.getFrameworkInfo('claude');
      expect(info.agentCount).toBe(2);

      // Test commands count
      await sandbox.cleanup();
      sandbox = new FilesystemSandbox();
      await sandbox.initialize();
      projectRoot = sandbox.getPath();

      await sandbox.createDirectory('.codex/commands');
      await sandbox.writeFile('.codex/commands/cmd1.md', '# Command 1');
      await sandbox.writeFile('.codex/commands/cmd2.md', '# Command 2');
      await sandbox.writeFile('.codex/commands/cmd3.md', '# Command 3');

      detector = new FrameworkDetector(projectRoot);
      info = await detector.getFrameworkInfo('codex');
      expect(info.commandCount).toBe(3);
    });
  });
});
