/**
 * Tests for Workflow Orchestrator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { resolve } from 'path';
import { WorkflowOrchestrator } from '../../../src/cli/workflow-orchestrator.ts';
import { AiwgConfig } from '../../../src/cli/config-loader.ts';

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;
  let testDir: string;
  let config: AiwgConfig;

  beforeEach(async () => {
    orchestrator = new WorkflowOrchestrator();
    testDir = resolve(process.cwd(), 'test-temp-workflow');
    await mkdir(testDir, { recursive: true });

    config = {
      version: '1.0',
      validation: {
        enabled: true,
        threshold: 70,
        failOnCritical: true,
        rules: []
      },
      optimization: {
        enabled: true,
        autoApply: false,
        strategies: ['specificity', 'examples', 'constraints'],
        createBackup: true
      },
      output: {
        format: 'text',
        verbose: false,
        colors: false
      },
      watch: {
        enabled: false,
        patterns: ['**/*.md'],
        debounce: 500
      },
      hooks: {
        preCommit: false,
        prePush: false
      }
    };
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('processFile', () => {
    it('should run validate → optimize → revalidate workflow and handle errors', async () => {
      // Test basic workflow
      const filePath = resolve(testDir, 'test.md');
      await writeFile(filePath, 'Write about testing. Make it comprehensive and robust.', 'utf-8');

      const result = await orchestrator.processFile(filePath, config);

      expect(result.filePath).toBe(filePath);
      expect(result.validation.before).toBeDefined();
      expect(result.validation.before.score).toBeGreaterThanOrEqual(0);
      expect(result.validation.before.score).toBeLessThanOrEqual(100);
      expect(result.optimization).toBeDefined();
      expect(result.validation.after).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(10000); // Should be under 10s

      // Test file not found error
      const nonexistentPath = resolve(testDir, 'nonexistent.md');
      const errorResult = await orchestrator.processFile(nonexistentPath, config);
      expect(errorResult.error).toBeDefined();
      expect(errorResult.error).toContain('not found');
    }, 10000);

    it('should handle high-quality content and skip optimization when appropriate', async () => {
      // Content with human markers (specific metrics, technology names, trade-offs)
      const filePath = resolve(testDir, 'good.md');
      await writeFile(
        filePath,
        `I think OAuth 2.0 PKCE flow is the right choice for mobile apps. We chose this approach after evaluating alternatives. In my experience, the p99 latency for token refresh is typically 45ms with Redis caching.

While PKCE is more complex to implement, it provides better security for public clients. We found that token storage on iOS requires careful handling of the Keychain API - we reduced security incidents by 40% after implementing proper token rotation.`,
        'utf-8'
      );

      config.validation.threshold = 50; // Lower threshold

      const result = await orchestrator.processFile(filePath, config);

      expect(result.validation.before.score).toBeGreaterThan(50);
      // Optimization may still run if autoApply is true
    });

    it('should apply auto-fix when configured and create backups', async () => {
      const scenarios = [
        { name: 'autofix', content: 'Write about authentication. Make it comprehensive.' },
        { name: 'backup', content: 'Write about security. Comprehensive guide.' }
      ];

      for (const scenario of scenarios) {
        const filePath = resolve(testDir, `${scenario.name}.md`);
        await writeFile(filePath, scenario.content, 'utf-8');

        config.optimization.autoApply = true;
        config.optimization.createBackup = true;

        const result = await orchestrator.processFile(filePath, config);

        expect(result.applied).toBe(true);
        expect(result.optimization).toBeDefined();

        // Backup should exist
        const backupPath = `${filePath}.original`;
        const fs = await import('fs');
        expect(fs.existsSync(backupPath)).toBe(true);

        // For backup scenario, verify content matches
        if (scenario.name === 'backup') {
          const backupContent = await import('fs/promises').then(m =>
            m.readFile(backupPath, 'utf-8')
          );
          expect(backupContent).toBe(scenario.content);
        }
      }
    }, 10000);
  });

  describe('processBatch', () => {
    it('should process multiple files with progress tracking', async () => {
      const files = [
        resolve(testDir, 'file1.md'),
        resolve(testDir, 'file2.md'),
        resolve(testDir, 'file3.md')
      ];

      for (const file of files) {
        await writeFile(file, 'Write about testing', 'utf-8');
      }

      const results = await orchestrator.processBatch(files, config);

      expect(results.size).toBe(3);
      for (const file of files) {
        expect(results.has(file)).toBe(true);
      }

      // Test progress callback
      const progressFiles = [
        resolve(testDir, 'progress1.md'),
        resolve(testDir, 'progress2.md')
      ];

      for (const file of progressFiles) {
        await writeFile(file, 'Write about testing', 'utf-8');
      }

      const progressCalls: any[] = [];
      await orchestrator.processBatch(progressFiles, config, (progress) => {
        progressCalls.push({ ...progress });
      });

      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1].processed).toBe(2);
      expect(progressCalls[progressCalls.length - 1].total).toBe(2);
    }, 15000);

    it('should handle mixed success and errors with correct progress', async () => {
      const files = [
        resolve(testDir, 'success.md'),
        resolve(testDir, 'nonexistent.md'),
        resolve(testDir, 'success2.md')
      ];

      await writeFile(files[0], 'Content', 'utf-8');
      await writeFile(files[2], 'Content', 'utf-8');

      const results = await orchestrator.processBatch(files, config);

      expect(results.size).toBe(3);
      expect(results.get(files[0])?.error).toBeUndefined();
      expect(results.get(files[1])?.error).toBeDefined();
      expect(results.get(files[2])?.error).toBeUndefined();

      // Test progress update correctness
      const progressFiles = [
        resolve(testDir, 'p1.md'),
        resolve(testDir, 'p2.md'),
        resolve(testDir, 'p3.md')
      ];

      for (const file of progressFiles) {
        await writeFile(file, 'Write about testing', 'utf-8');
      }

      let finalProgress: any = null;
      await orchestrator.processBatch(progressFiles, config, (progress) => {
        finalProgress = progress;
      });

      expect(finalProgress).toBeDefined();
      expect(finalProgress.total).toBe(3);
      expect(finalProgress.processed).toBe(3);
    }, 15000);
  });

  describe('validation and optimization steps', () => {
    it('should validate content with context from config', async () => {
      const scenarios = [
        { content: 'Write about testing with specific examples', context: undefined },
        { content: 'Technical content about OAuth 2.0', context: 'technical' }
      ];

      for (const scenario of scenarios) {
        if (scenario.context) {
          config.validation.context = scenario.context;
        }

        const result = await orchestrator.validateStep(scenario.content, config);

        expect(result).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    });

    it('should optimize content and use context for optimization', async () => {
      const scenarios = [
        { content: 'Write about testing', context: undefined },
        { content: 'Write about authentication', context: 'technical' }
      ];

      for (const scenario of scenarios) {
        if (scenario.context) {
          config.validation.context = scenario.context;
        }

        const result = await orchestrator.optimizeStep(scenario.content, config);

        expect(result).toBeDefined();
        expect(result.originalPrompt).toBe(scenario.content);
        expect(result.optimizedPrompt).toBeDefined();
        expect(result.score.before).toBeDefined();
        expect(result.score.after).toBeDefined();

        if (scenario.context) {
          expect(result.optimizedPrompt).toContain('technical');
        }
      }
    });

    it('should revalidate optimized content', async () => {
      const content = 'Write a 1,500-word technical article about OAuth 2.0';

      const result = await orchestrator.revalidateStep(content, config);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('watch mode', () => {
    it('should start and stop watch mode correctly', async () => {
      config.watch.enabled = true;
      config.watch.patterns = [resolve(testDir, '*.md')];

      await orchestrator.startWatchMode(config);

      // Verify watch started (service should be running)
      // Stop immediately
      await orchestrator.stopWatchMode();

      // Test stopping after initialization
      await orchestrator.startWatchMode(config);
      // Give watch mode a moment to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      await orchestrator.stopWatchMode();

      // Should not throw
    }, 20000);

    it('should throw if watch not enabled', async () => {
      config.watch.enabled = false;

      await expect(orchestrator.startWatchMode(config)).rejects.toThrow(
        'Watch mode is not enabled'
      );
    });
  });

  describe('reporting', () => {
    it('should generate reports in all formats and save to file', async () => {
      const reportFormats = [
        { format: 'text' as const, checks: ['AIWG Workflow Report', 'Total Files: 1'] },
        { format: 'json' as const, checks: [] },
        { format: 'html' as const, checks: ['<!DOCTYPE html>', 'AIWG Workflow Report'] },
        { format: 'junit' as const, checks: ['<?xml version', '<testsuites>', '<testsuite'] }
      ];

      for (const { format, checks } of reportFormats) {
        const fileName = `${format}.md`;
        const filePath = resolve(testDir, fileName);
        await writeFile(filePath, 'Content', 'utf-8');

        const results = await orchestrator.processBatch([filePath], config);
        const report = orchestrator.generateReport(results, format);

        if (format === 'json') {
          const parsed = JSON.parse(report);
          expect(parsed[filePath]).toBeDefined();
        } else {
          for (const check of checks) {
            expect(report).toContain(check);
          }
        }

        if (format === 'text') {
          expect(report).toContain(filePath);
        }
      }

      // Test saving report to file
      const saveFile = resolve(testDir, 'save.md');
      await writeFile(saveFile, 'Content', 'utf-8');

      const results = await orchestrator.processBatch([saveFile], config);
      const report = orchestrator.generateReport(results, 'text');

      const reportPath = resolve(testDir, 'report.txt');
      await orchestrator.saveReport(report, reportPath);

      const fs = await import('fs');
      expect(fs.existsSync(reportPath)).toBe(true);
    }, 10000);
  });

  describe('expandGlob', () => {
    it('should expand glob patterns, remove duplicates, and handle no matches', async () => {
      await writeFile(resolve(testDir, 'file1.md'), 'Content', 'utf-8');
      await writeFile(resolve(testDir, 'file2.md'), 'Content', 'utf-8');
      await writeFile(resolve(testDir, 'file3.txt'), 'Content', 'utf-8');

      // Test basic glob expansion
      const files = await orchestrator.expandGlob([resolve(testDir, '*.md')]);

      expect(files.length).toBe(2);
      expect(files.every(f => f.endsWith('.md'))).toBe(true);

      // Test duplicate removal
      await writeFile(resolve(testDir, 'dup.md'), 'Content', 'utf-8');

      const dupFiles = await orchestrator.expandGlob([
        resolve(testDir, 'dup.md'),
        resolve(testDir, '*.md')
      ]);

      // Should have only one instance
      const dupCount = dupFiles.filter(f => f.endsWith('dup.md')).length;
      expect(dupCount).toBe(1);

      // Test no matches
      const noMatch = await orchestrator.expandGlob([resolve(testDir, '*.nonexistent')]);
      expect(noMatch).toEqual([]);
    });
  });

  describe('loadConfig', () => {
    it('should load and cache configuration', async () => {
      const config = await orchestrator.loadConfig();

      expect(config).toBeDefined();
      expect(config.version).toBeDefined();
      expect(config.validation).toBeDefined();
      expect(config.optimization).toBeDefined();

      // Test caching
      const config2 = await orchestrator.loadConfig();
      expect(config).toBe(config2); // Same reference
    });
  });

  describe('validateConfig', () => {
    it('should validate config and reject invalid thresholds', async () => {
      // Test valid config
      const result = orchestrator.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);

      // Test invalid threshold
      const invalidConfig = { ...config };
      invalidConfig.validation.threshold = 150;

      const invalidResult = orchestrator.validateConfig(invalidConfig);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });
});
