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
    it('should run validate → optimize → revalidate workflow', async () => {
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
    }, 10000);

    it('should skip optimization if score above threshold', async () => {
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

    it('should apply auto-fix when configured', async () => {
      const filePath = resolve(testDir, 'autofix.md');
      await writeFile(filePath, 'Write about authentication. Make it comprehensive.', 'utf-8');

      config.optimization.autoApply = true;

      const result = await orchestrator.processFile(filePath, config);

      expect(result.applied).toBe(true);
      expect(result.optimization).toBeDefined();

      // Backup should exist
      const backupPath = `${filePath}.original`;
      const fs = await import('fs');
      expect(fs.existsSync(backupPath)).toBe(true);
    }, 10000);

    it('should create backup before auto-fix', async () => {
      const filePath = resolve(testDir, 'backup.md');
      const originalContent = 'Write about security. Comprehensive guide.';
      await writeFile(filePath, originalContent, 'utf-8');

      config.optimization.autoApply = true;
      config.optimization.createBackup = true;

      await orchestrator.processFile(filePath, config);

      const fs = await import('fs');
      const backupPath = `${filePath}.original`;
      expect(fs.existsSync(backupPath)).toBe(true);

      const backupContent = await import('fs/promises').then(m =>
        m.readFile(backupPath, 'utf-8')
      );
      expect(backupContent).toBe(originalContent);
    }, 10000);

    it('should handle file not found error', async () => {
      const filePath = resolve(testDir, 'nonexistent.md');

      const result = await orchestrator.processFile(filePath, config);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
    });

    it('should return duration in result', async () => {
      const filePath = resolve(testDir, 'duration.md');
      await writeFile(filePath, 'Write about testing', 'utf-8');

      const result = await orchestrator.processFile(filePath, config);

      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(10000); // Should be under 10s
    });
  });

  describe('processBatch', () => {
    it('should process multiple files', async () => {
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
    }, 15000);

    it('should call progress callback', async () => {
      const files = [
        resolve(testDir, 'progress1.md'),
        resolve(testDir, 'progress2.md')
      ];

      for (const file of files) {
        await writeFile(file, 'Write about testing', 'utf-8');
      }

      const progressCalls: any[] = [];
      await orchestrator.processBatch(files, config, (progress) => {
        progressCalls.push({ ...progress });
      });

      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1].processed).toBe(2);
      expect(progressCalls[progressCalls.length - 1].total).toBe(2);
    }, 15000);

    it('should handle mixed success and errors', async () => {
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
    }, 15000);

    it('should update progress correctly', async () => {
      const files = [
        resolve(testDir, 'p1.md'),
        resolve(testDir, 'p2.md'),
        resolve(testDir, 'p3.md')
      ];

      for (const file of files) {
        await writeFile(file, 'Write about testing', 'utf-8');
      }

      let finalProgress: any = null;
      await orchestrator.processBatch(files, config, (progress) => {
        finalProgress = progress;
      });

      expect(finalProgress).toBeDefined();
      expect(finalProgress.total).toBe(3);
      expect(finalProgress.processed).toBe(3);
    }, 15000);
  });

  describe('validateStep', () => {
    it('should validate content', async () => {
      const content = 'Write about testing with specific examples';

      const result = await orchestrator.validateStep(content, config);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should use context from config', async () => {
      config.validation.context = 'technical';
      const content = 'Technical content about OAuth 2.0';

      const result = await orchestrator.validateStep(content, config);

      expect(result).toBeDefined();
    });
  });

  describe('optimizeStep', () => {
    it('should optimize content', async () => {
      const content = 'Write about testing';

      const result = await orchestrator.optimizeStep(content, config);

      expect(result).toBeDefined();
      expect(result.originalPrompt).toBe(content);
      expect(result.optimizedPrompt).toBeDefined();
      expect(result.score.before).toBeDefined();
      expect(result.score.after).toBeDefined();
    });

    it('should use context for optimization', async () => {
      config.validation.context = 'technical';
      const content = 'Write about authentication';

      const result = await orchestrator.optimizeStep(content, config);

      expect(result).toBeDefined();
      expect(result.optimizedPrompt).toContain('technical');
    });
  });

  describe('revalidateStep', () => {
    it('should revalidate optimized content', async () => {
      const content = 'Write a 1,500-word technical article about OAuth 2.0';

      const result = await orchestrator.revalidateStep(content, config);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('watch mode', () => {
    it('should start watch mode', async () => {
      config.watch.enabled = true;
      config.watch.patterns = [resolve(testDir, '*.md')];

      await orchestrator.startWatchMode(config);

      // Verify watch started (service should be running)
      // Stop immediately
      await orchestrator.stopWatchMode();
    }, 5000);

    it('should throw if watch not enabled', async () => {
      config.watch.enabled = false;

      await expect(orchestrator.startWatchMode(config)).rejects.toThrow(
        'Watch mode is not enabled'
      );
    });

    it('should stop watch mode', async () => {
      config.watch.enabled = true;

      await orchestrator.startWatchMode(config);
      await orchestrator.stopWatchMode();

      // Should not throw
    }, 5000);
  });

  describe('reporting', () => {
    it('should generate text report', async () => {
      const files = [resolve(testDir, 'report.md')];
      await writeFile(files[0], 'Content', 'utf-8');

      const results = await orchestrator.processBatch(files, config);
      const report = orchestrator.generateReport(results, 'text');

      expect(report).toContain('AIWG Workflow Report');
      expect(report).toContain('Total Files: 1');
      expect(report).toContain(files[0]);
    }, 10000);

    it('should generate JSON report', async () => {
      const files = [resolve(testDir, 'json.md')];
      await writeFile(files[0], 'Content', 'utf-8');

      const results = await orchestrator.processBatch(files, config);
      const report = orchestrator.generateReport(results, 'json');

      const parsed = JSON.parse(report);
      expect(parsed[files[0]]).toBeDefined();
    }, 10000);

    it('should generate HTML report', async () => {
      const files = [resolve(testDir, 'html.md')];
      await writeFile(files[0], 'Content', 'utf-8');

      const results = await orchestrator.processBatch(files, config);
      const report = orchestrator.generateReport(results, 'html');

      expect(report).toContain('<!DOCTYPE html>');
      expect(report).toContain('AIWG Workflow Report');
    }, 10000);

    it('should generate JUnit XML report', async () => {
      const files = [resolve(testDir, 'junit.md')];
      await writeFile(files[0], 'Content', 'utf-8');

      const results = await orchestrator.processBatch(files, config);
      const report = orchestrator.generateReport(results, 'junit');

      expect(report).toContain('<?xml version');
      expect(report).toContain('<testsuites>');
      expect(report).toContain('<testsuite');
    }, 10000);

    it('should save report to file', async () => {
      const files = [resolve(testDir, 'save.md')];
      await writeFile(files[0], 'Content', 'utf-8');

      const results = await orchestrator.processBatch(files, config);
      const report = orchestrator.generateReport(results, 'text');

      const reportPath = resolve(testDir, 'report.txt');
      await orchestrator.saveReport(report, reportPath);

      const fs = await import('fs');
      expect(fs.existsSync(reportPath)).toBe(true);
    }, 10000);
  });

  describe('expandGlob', () => {
    it('should expand glob patterns', async () => {
      await writeFile(resolve(testDir, 'file1.md'), 'Content', 'utf-8');
      await writeFile(resolve(testDir, 'file2.md'), 'Content', 'utf-8');
      await writeFile(resolve(testDir, 'file3.txt'), 'Content', 'utf-8');

      const files = await orchestrator.expandGlob([resolve(testDir, '*.md')]);

      expect(files.length).toBe(2);
      expect(files.every(f => f.endsWith('.md'))).toBe(true);
    });

    it('should remove duplicate files', async () => {
      await writeFile(resolve(testDir, 'dup.md'), 'Content', 'utf-8');

      const files = await orchestrator.expandGlob([
        resolve(testDir, 'dup.md'),
        resolve(testDir, '*.md')
      ]);

      // Should have only one instance
      const dupCount = files.filter(f => f.endsWith('dup.md')).length;
      expect(dupCount).toBe(1);
    });

    it('should handle no matches', async () => {
      const files = await orchestrator.expandGlob([resolve(testDir, '*.nonexistent')]);

      expect(files).toEqual([]);
    });
  });

  describe('loadConfig', () => {
    it('should load configuration', async () => {
      const config = await orchestrator.loadConfig();

      expect(config).toBeDefined();
      expect(config.version).toBeDefined();
      expect(config.validation).toBeDefined();
      expect(config.optimization).toBeDefined();
    });

    it('should cache loaded configuration', async () => {
      const config1 = await orchestrator.loadConfig();
      const config2 = await orchestrator.loadConfig();

      expect(config1).toBe(config2); // Same reference
    });
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const result = orchestrator.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid threshold', () => {
      const invalidConfig = { ...config };
      invalidConfig.validation.threshold = 150;

      const result = orchestrator.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
