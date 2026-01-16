/**
 * Unit tests for External Ralph Loop Output Analyzer
 *
 * @source @tools/ralph-external/output-analyzer.mjs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import the module under test
// @ts-ignore - ESM import
import { OutputAnalyzer } from '../../../tools/ralph-external/output-analyzer.mjs';

describe('OutputAnalyzer', () => {
  let testDir: string;
  let analyzer: InstanceType<typeof OutputAnalyzer>;
  let stdoutPath: string;
  let stderrPath: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `ralph-external-analyzer-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    stdoutPath = join(testDir, 'stdout.log');
    stderrPath = join(testDir, 'stderr.log');
    analyzer = new OutputAnalyzer();
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('readOutput', () => {
    it('should read file content', () => {
      writeFileSync(stdoutPath, 'Test output content');
      const content = analyzer.readOutput(stdoutPath);
      expect(content).toBe('Test output content');
    });

    it('should return empty string for missing file', () => {
      const content = analyzer.readOutput('/nonexistent/path');
      expect(content).toBe('');
    });

    it('should truncate large files to last N characters', () => {
      const largeContent = 'X'.repeat(100000);
      writeFileSync(stdoutPath, largeContent);

      const content = analyzer.readOutput(stdoutPath, 50000);
      expect(content.length).toBe(50000);
    });

    it('should preserve recent content when truncating', () => {
      const content = 'OLD'.repeat(20000) + 'RECENT_CONTENT';
      writeFileSync(stdoutPath, content);

      const result = analyzer.readOutput(stdoutPath, 1000);
      expect(result).toContain('RECENT_CONTENT');
    });
  });

  describe('analyzeWithPatterns', () => {
    const baseOptions = {
      stdoutPath: '',
      stderrPath: '',
      exitCode: 0,
      context: {
        objective: 'Fix tests',
        criteria: 'npm test passes',
      },
    };

    describe('completion detection', () => {
      it('should detect JSON completion marker', () => {
        writeFileSync(
          stdoutPath,
          'Working... {"ralph_external_completion": true, "success": true}'
        );
        writeFileSync(stderrPath, '');

        const result = analyzer.analyzeWithPatterns({
          ...baseOptions,
          stdoutPath,
          stderrPath,
        });

        expect(result.completed).toBe(true);
        expect(result.success).toBe(true);
        expect(result.shouldContinue).toBe(false);
      });

      it('should detect completion marker with failure', () => {
        writeFileSync(
          stdoutPath,
          '{"ralph_external_completion": true, "success": false, "reason": "Tests still failing"}'
        );
        writeFileSync(stderrPath, '');

        const result = analyzer.analyzeWithPatterns({
          ...baseOptions,
          stdoutPath,
          stderrPath,
        });

        expect(result.completed).toBe(true);
        expect(result.success).toBe(false);
        expect(result.shouldContinue).toBe(true);
        expect(result.learnings).toContain('Tests still failing');
      });

      it('should detect text completion marker', () => {
        writeFileSync(stdoutPath, 'Ralph Loop: SUCCESS');
        writeFileSync(stderrPath, '');

        const result = analyzer.analyzeWithPatterns({
          ...baseOptions,
          stdoutPath,
          stderrPath,
        });

        expect(result.completed).toBe(true);
        expect(result.success).toBe(true);
      });

      it('should detect [Ralph] Completed marker', () => {
        writeFileSync(stdoutPath, '[Ralph] Completed - all tasks done');
        writeFileSync(stderrPath, '');

        const result = analyzer.analyzeWithPatterns({
          ...baseOptions,
          stdoutPath,
          stderrPath,
        });

        expect(result.completed).toBe(true);
      });
    });

    describe('failure detection', () => {
      it('should detect context exhaustion', () => {
        writeFileSync(stdoutPath, 'Error: context limit reached');
        writeFileSync(stderrPath, '');

        const result = analyzer.analyzeWithPatterns({
          ...baseOptions,
          stdoutPath,
          stderrPath,
        });

        expect(result.failureClass).toBe('context_exhausted');
        expect(result.shouldContinue).toBe(true);
      });

      it('should detect budget exceeded', () => {
        writeFileSync(stdoutPath, 'Warning: budget exceeded, stopping');
        writeFileSync(stderrPath, '');

        const result = analyzer.analyzeWithPatterns({
          ...baseOptions,
          stdoutPath,
          stderrPath,
        });

        expect(result.failureClass).toBe('budget_exceeded');
        expect(result.shouldContinue).toBe(false);
      });

      it('should detect internal loop limit', () => {
        writeFileSync(stdoutPath, 'MAX_ITERATIONS reached without completion');
        writeFileSync(stderrPath, '');

        const result = analyzer.analyzeWithPatterns({
          ...baseOptions,
          stdoutPath,
          stderrPath,
        });

        expect(result.failureClass).toBe('internal_loop_limit');
        expect(result.shouldContinue).toBe(true);
      });

      it('should detect crash signals', () => {
        writeFileSync(stdoutPath, '');
        writeFileSync(stderrPath, 'SIGTERM received');

        const result = analyzer.analyzeWithPatterns({
          ...baseOptions,
          stdoutPath,
          stderrPath,
        });

        expect(result.failureClass).toBe('crash');
        expect(result.shouldContinue).toBe(false);
      });

      it('should detect crash from non-zero exit code', () => {
        writeFileSync(stdoutPath, 'Some output');
        writeFileSync(stderrPath, '');

        const result = analyzer.analyzeWithPatterns({
          ...baseOptions,
          stdoutPath,
          stderrPath,
          exitCode: 1,
        });

        expect(result.failureClass).toBe('crash');
        expect(result.shouldContinue).toBe(true);
        expect(result.learnings).toContain('code 1');
      });
    });

    describe('default behavior', () => {
      it('should return default result for empty output', () => {
        writeFileSync(stdoutPath, '');
        writeFileSync(stderrPath, '');

        const result = analyzer.analyzeWithPatterns({
          ...baseOptions,
          stdoutPath,
          stderrPath,
        });

        expect(result.completed).toBe(false);
        expect(result.success).toBeNull();
        expect(result.shouldContinue).toBe(true);
        expect(result.completionPercentage).toBe(0);
      });

      it('should handle missing files gracefully', () => {
        const result = analyzer.analyzeWithPatterns({
          ...baseOptions,
          stdoutPath: '/nonexistent/stdout.log',
          stderrPath: '/nonexistent/stderr.log',
        });

        expect(result).toBeDefined();
        expect(result.completed).toBe(false);
      });
    });
  });

  describe('estimateProgress', () => {
    it('should score passing tests', () => {
      const progress = analyzer.estimateProgress('10 tests passing');
      expect(progress).toBeGreaterThanOrEqual(30);
    });

    it('should score build success', () => {
      const progress = analyzer.estimateProgress('Build: success');
      expect(progress).toBeGreaterThanOrEqual(20);
    });

    it('should score file modifications', () => {
      const progress = analyzer.estimateProgress('modified file src/index.ts');
      expect(progress).toBeGreaterThanOrEqual(10);
    });

    it('should cap progress at 90%', () => {
      const output = `
        tests passing
        build success
        commit made
        created file
        modified file
        ralph iteration
      `;
      const progress = analyzer.estimateProgress(output);
      expect(progress).toBeLessThanOrEqual(90);
    });

    it('should return 0 for irrelevant output', () => {
      const progress = analyzer.estimateProgress('random text without indicators');
      expect(progress).toBe(0);
    });
  });

  describe('extractModifiedFiles', () => {
    it('should extract git-style modified files', () => {
      const output = `
        modified:   src/auth.ts
        modified:   src/utils.ts
      `;
      const files = analyzer.extractModifiedFiles(output);
      expect(files).toContain('src/auth.ts');
      expect(files).toContain('src/utils.ts');
    });

    it('should extract git-style created files', () => {
      const output = 'created:   test/new.test.ts';
      const files = analyzer.extractModifiedFiles(output);
      expect(files).toContain('test/new.test.ts');
    });

    it('should extract Writing tool patterns', () => {
      const output = 'Writing to src/component.ts';
      const files = analyzer.extractModifiedFiles(output);
      expect(files).toContain('src/component.ts');
    });

    it('should extract Edit tool patterns', () => {
      const output = 'Edit file src/module.mjs';
      const files = analyzer.extractModifiedFiles(output);
      expect(files).toContain('src/module.mjs');
    });

    it('should deduplicate files', () => {
      const output = `
        modified:   src/file.ts
        modified:   src/file.ts
        Writing to src/file.ts
      `;
      const files = analyzer.extractModifiedFiles(output);
      expect(files.filter((f: string) => f === 'src/file.ts')).toHaveLength(1);
    });

    it('should return empty array for no files', () => {
      const files = analyzer.extractModifiedFiles('no file mentions');
      expect(files).toEqual([]);
    });
  });

  describe('analyze', () => {
    it('should use pattern fallback when useClaude is false', async () => {
      writeFileSync(stdoutPath, 'Ralph Loop: SUCCESS');
      writeFileSync(stderrPath, '');

      const result = await analyzer.analyze({
        stdoutPath,
        stderrPath,
        exitCode: 0,
        context: {
          objective: 'Test',
          criteria: 'Done',
        },
        useClaude: false,
      });

      expect(result.completed).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should fall back to patterns when Claude fails', async () => {
      writeFileSync(stdoutPath, '{"ralph_external_completion": true, "success": true}');
      writeFileSync(stderrPath, '');

      // Mock console methods to suppress output
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock analyzeWithClaude to simulate failure
      const analyzeWithClaudeSpy = vi
        .spyOn(analyzer, 'analyzeWithClaude')
        .mockReturnValue(null);

      const result = await analyzer.analyze({
        stdoutPath,
        stderrPath,
        exitCode: 0,
        context: {
          objective: 'Test',
          criteria: 'Done',
        },
        useClaude: true,
      });

      // Should have called analyzeWithClaude
      expect(analyzeWithClaudeSpy).toHaveBeenCalled();

      // Should have fallen back to patterns
      expect(consoleLog).toHaveBeenCalledWith(
        'Claude analysis failed, falling back to pattern matching'
      );

      // Should still get a result from pattern fallback
      expect(result).toBeDefined();
      // The completion marker in the output should be detected by pattern matching
      expect(result.completed).toBe(true);
      expect(result.success).toBe(true);

      analyzeWithClaudeSpy.mockRestore();
      consoleLog.mockRestore();
    });
  });
});
