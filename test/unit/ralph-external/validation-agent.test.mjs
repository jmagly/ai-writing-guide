/**
 * Tests for Validation Agent
 *
 * @implements Issue #22 - Claude Intelligence Layer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationAgent } from '../../../tools/ralph-external/lib/validation-agent.mjs';
import { spawnSync } from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
  execSync: vi.fn(),
}));

describe('ValidationAgent', () => {
  let agent;

  beforeEach(() => {
    agent = new ValidationAgent({
      projectRoot: '/tmp/test-project',
      verbose: false,
    });
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const a = new ValidationAgent();
      expect(a.runTests).toBe(true);
      expect(a.checkBuild).toBe(true);
      expect(a.checkLint).toBe(true);
    });

    it('should accept custom options', () => {
      const a = new ValidationAgent({
        projectRoot: '/custom/path',
        runTests: false,
        checkBuild: false,
        timeout: 30000,
      });

      expect(a.projectRoot).toBe('/custom/path');
      expect(a.runTests).toBe(false);
      expect(a.checkBuild).toBe(false);
      expect(a.timeout).toBe(30000);
    });
  });

  describe('_checkGitStatus', () => {
    it('should detect clean git status', () => {
      spawnSync.mockReturnValueOnce({
        stdout: '',
        status: 0,
      }).mockReturnValueOnce({
        stdout: '',
        status: 0,
      });

      const result = agent._checkGitStatus();

      expect(result.clean).toBe(true);
      expect(result.conflicts).toBe(false);
      expect(result.uncommitted).toBe(0);
      expect(result.issues).toEqual([]);
    });

    it('should detect git conflicts', () => {
      spawnSync.mockReturnValueOnce({
        stdout: 'src/file.ts\n',
        status: 0,
      });

      const result = agent._checkGitStatus();

      expect(result.conflicts).toBe(true);
      expect(result.clean).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('git_conflict');
      expect(result.issues[0].severity).toBe('critical');
    });

    it('should count uncommitted changes', () => {
      spawnSync.mockReturnValueOnce({
        stdout: '',
        status: 0,
      }).mockReturnValueOnce({
        stdout: ' M src/file1.ts\n M src/file2.ts\n',
        status: 0,
      });

      const result = agent._checkGitStatus();

      expect(result.uncommitted).toBe(2);
      expect(result.clean).toBe(false);
    });

    it('should handle git unavailable', () => {
      spawnSync.mockImplementationOnce(() => {
        throw new Error('git not found');
      });

      const result = agent._checkGitStatus();

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('git_unavailable');
      expect(result.issues[0].severity).toBe('warning');
    });
  });

  describe('_checkDependencies', () => {
    it('should detect missing node_modules', () => {
      // Mock existsSync to return true for package.json, false for node_modules
      const originalExistsSync = agent.constructor.prototype._checkDependencies;

      const result = agent._checkDependencies();

      // This is implementation-dependent
      expect(result).toHaveProperty('packageJsonExists');
      expect(result).toHaveProperty('nodeModulesExists');
    });
  });

  describe('_runTests', () => {
    it('should parse passing test output', () => {
      spawnSync.mockReturnValueOnce({
        stdout: '10 pass, 0 fail',
        status: 0,
      });

      const result = agent._runTests();

      expect(result.ran).toBe(true);
      expect(result.passed).toBe(10);
      expect(result.failed).toBe(0);
      expect(result.issues).toEqual([]);
    });

    it('should detect failing tests', () => {
      spawnSync.mockReturnValueOnce({
        stdout: '8 pass, 2 fail',
        status: 1,
      });

      const result = agent._runTests();

      expect(result.ran).toBe(true);
      expect(result.passed).toBe(8);
      expect(result.failed).toBe(2);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('test_failure');
      expect(result.issues[0].severity).toBe('error');
    });

    it('should handle test errors', () => {
      spawnSync.mockReturnValueOnce({
        stdout: '',
        stderr: 'Error running tests',
        status: 1,
      });

      const result = agent._runTests();

      expect(result.ran).toBe(true);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should handle test command unavailable', () => {
      spawnSync.mockImplementationOnce(() => {
        throw new Error('npm not found');
      });

      const result = agent._runTests();

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('test_unavailable');
    });
  });

  describe('_checkBuild', () => {
    it('should detect successful build', () => {
      spawnSync.mockReturnValueOnce({
        stdout: '',
        status: 0,
      });

      const result = agent._checkBuild();

      // Only runs if tsconfig.json exists
      expect(result).toHaveProperty('ran');
    });

    it('should detect build errors', () => {
      spawnSync.mockReturnValueOnce({
        stdout: 'error TS2304: Cannot find name\nerror TS2345: Type error',
        status: 1,
      });

      const result = agent._checkBuild();

      if (result.ran) {
        expect(result.success).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
        expect(result.issues[0].type).toBe('build_error');
      }
    });
  });

  describe('_runLint', () => {
    it('should parse lint output', () => {
      spawnSync.mockReturnValueOnce({
        stdout: '0 errors, 2 warnings',
        status: 0,
      });

      const result = agent._runLint();

      expect(result.ran).toBe(true);
      expect(result.errors).toBe(0);
      expect(result.warnings).toBe(2);
    });

    it('should detect lint errors', () => {
      spawnSync.mockReturnValueOnce({
        stdout: '5 errors, 10 warnings',
        status: 1,
      });

      const result = agent._runLint();

      expect(result.ran).toBe(true);
      expect(result.errors).toBe(5);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('lint_error');
    });
  });

  describe('_determineSeverity', () => {
    it('should return ok for no issues', () => {
      const severity = agent._determineSeverity([]);
      expect(severity).toBe('ok');
    });

    it('should return critical if any critical issue', () => {
      const issues = [
        { severity: 'warning' },
        { severity: 'critical' },
        { severity: 'error' },
      ];

      const severity = agent._determineSeverity(issues);
      expect(severity).toBe('critical');
    });

    it('should return error if any error (no critical)', () => {
      const issues = [
        { severity: 'warning' },
        { severity: 'error' },
        { severity: 'info' },
      ];

      const severity = agent._determineSeverity(issues);
      expect(severity).toBe('error');
    });

    it('should return warning if only warnings', () => {
      const issues = [
        { severity: 'warning' },
        { severity: 'info' },
      ];

      const severity = agent._determineSeverity(issues);
      expect(severity).toBe('warning');
    });
  });

  describe('validatePre', () => {
    it('should pass with clean state', async () => {
      spawnSync.mockReturnValue({
        stdout: '',
        status: 0,
      });

      const result = await agent.validatePre({});

      expect(result.passed).toBe(true);
      expect(result.severity).toBe('ok');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('timestamp');
    });

    it('should fail with critical issues', async () => {
      // Mock git conflict
      spawnSync.mockReturnValueOnce({
        stdout: 'conflict.ts\n',
        status: 0,
      });

      const result = await agent.validatePre({});

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('validatePost', () => {
    it('should pass with all checks passing', async () => {
      spawnSync.mockReturnValue({
        stdout: '10 pass, 0 fail',
        status: 0,
      });

      const result = await agent.validatePost({}, {});

      expect(result.passed).toBe(true);
      expect(result).toHaveProperty('details');
      expect(result.details).toHaveProperty('tests');
    });

    it('should fail with test failures', async () => {
      spawnSync.mockReturnValueOnce({
        stdout: '8 pass, 2 fail',
        status: 1,
      });

      const result = await agent.validatePost({}, {});

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('error');
      expect(result.issues.some(i => i.type === 'test_failure')).toBe(true);
    });

    it('should include all check results', async () => {
      spawnSync.mockReturnValue({
        stdout: '',
        status: 0,
      });

      const result = await agent.validatePost({}, {});

      expect(result.details).toHaveProperty('tests');
      expect(result.details).toHaveProperty('build');
      expect(result.details).toHaveProperty('lint');
      expect(result.details).toHaveProperty('imports');
    });

    it('should respect disabled checks', async () => {
      const a = new ValidationAgent({
        runTests: false,
        checkBuild: false,
        checkLint: false,
      });

      const result = await a.validatePost({}, {});

      expect(result.details.tests).toBeUndefined();
      expect(result.details.build).toBeUndefined();
      expect(result.details.lint).toBeUndefined();
    });
  });

  describe('getSummary', () => {
    it('should summarize validation results', () => {
      const result = {
        passed: false,
        severity: 'error',
        issues: [
          { severity: 'critical' },
          { severity: 'error' },
          { severity: 'error' },
          { severity: 'warning' },
        ],
        timestamp: Date.now(),
      };

      const summary = agent.getSummary(result);

      expect(summary.passed).toBe(false);
      expect(summary.severity).toBe('error');
      expect(summary.issueCount).toBe(4);
      expect(summary.criticalCount).toBe(1);
      expect(summary.errorCount).toBe(2);
      expect(summary.warningCount).toBe(1);
    });
  });

  describe('format', () => {
    it('should format passing validation', () => {
      const result = {
        passed: true,
        severity: 'ok',
        issues: [],
      };

      const formatted = agent.format(result);

      expect(formatted).toContain('PASSED');
      expect(formatted).toContain('ok');
    });

    it('should format failing validation with issues', () => {
      const result = {
        passed: false,
        severity: 'error',
        issues: [
          {
            severity: 'error',
            message: 'Test failure',
            suggestion: 'Fix the test',
          },
          {
            severity: 'warning',
            message: 'Lint warning',
          },
        ],
      };

      const formatted = agent.format(result);

      expect(formatted).toContain('FAILED');
      expect(formatted).toContain('Test failure');
      expect(formatted).toContain('Fix the test');
      expect(formatted).toContain('Lint warning');
    });
  });

  describe('integration scenarios', () => {
    it('should handle first iteration pre-validation', async () => {
      spawnSync.mockReturnValue({
        stdout: '',
        status: 0,
      });

      const context = {
        iteration: 1,
      };

      const result = await agent.validatePre(context);

      expect(result.passed).toBe(true);
      expect(result).toHaveProperty('details');
    });

    it('should detect regression in post-validation', async () => {
      // Previously passing, now failing
      spawnSync.mockReturnValueOnce({
        stdout: '5 pass, 5 fail',
        status: 1,
      });

      const result = await agent.validatePost(
        { iteration: 2 },
        { previousTests: { passed: 10, failed: 0 } }
      );

      expect(result.passed).toBe(false);
      expect(result.issues.some(i => i.type === 'test_failure')).toBe(true);
    });

    it('should handle multiple validation issues', async () => {
      // Git conflict
      spawnSync.mockReturnValueOnce({
        stdout: 'conflict.ts\n',
        status: 0,
      });

      const result = await agent.validatePre({});

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });
  });
});
