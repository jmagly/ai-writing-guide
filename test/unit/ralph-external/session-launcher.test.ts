/**
 * Unit tests for External Ralph Loop Session Launcher
 *
 * @source @tools/ralph-external/session-launcher.mjs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import the module under test
// @ts-ignore - ESM import
import { SessionLauncher } from '../../../tools/ralph-external/session-launcher.mjs';

describe('SessionLauncher', () => {
  let launcher: InstanceType<typeof SessionLauncher>;

  beforeEach(() => {
    launcher = new SessionLauncher();
  });

  describe('constructor', () => {
    it('should initialize with null currentProcess and startTime', () => {
      expect(launcher.currentProcess).toBeNull();
      expect(launcher.startTime).toBeNull();
    });

    it('should be an EventEmitter', () => {
      expect(typeof launcher.on).toBe('function');
      expect(typeof launcher.emit).toBe('function');
    });
  });

  describe('buildArgs', () => {
    const baseOptions = {
      prompt: 'Fix the bug',
      sessionId: 'test-session-123',
      workingDir: '/project',
      stdoutPath: '/tmp/stdout.log',
      stderrPath: '/tmp/stderr.log',
    };

    it('should include required flags', () => {
      const args = launcher.buildArgs(baseOptions);

      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).toContain('--print');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
      expect(args).toContain('--session-id');
      expect(args).toContain('test-session-123');
    });

    it('should include prompt at the end', () => {
      const args = launcher.buildArgs(baseOptions);
      expect(args[args.length - 1]).toBe('Fix the bug');
    });

    it('should include model when specified', () => {
      const args = launcher.buildArgs({
        ...baseOptions,
        model: 'sonnet',
      });

      const modelIndex = args.indexOf('--model');
      expect(modelIndex).toBeGreaterThan(-1);
      expect(args[modelIndex + 1]).toBe('sonnet');
    });

    it('should include budget when specified', () => {
      const args = launcher.buildArgs({
        ...baseOptions,
        budget: 5.0,
      });

      const budgetIndex = args.indexOf('--max-budget-usd');
      expect(budgetIndex).toBeGreaterThan(-1);
      expect(args[budgetIndex + 1]).toBe('5');
    });

    it('should include MCP config as JSON string', () => {
      const mcpConfig = { 'mcp-hound': { url: 'http://localhost:3000' } };
      const args = launcher.buildArgs({
        ...baseOptions,
        mcpConfig,
      });

      const mcpIndex = args.indexOf('--mcp-config');
      expect(mcpIndex).toBeGreaterThan(-1);
      expect(args[mcpIndex + 1]).toBe(JSON.stringify(mcpConfig));
    });

    it('should pass MCP config string as-is', () => {
      const mcpConfigStr = '{"mcp-server": {}}';
      const args = launcher.buildArgs({
        ...baseOptions,
        mcpConfig: mcpConfigStr,
      });

      const mcpIndex = args.indexOf('--mcp-config');
      expect(args[mcpIndex + 1]).toBe(mcpConfigStr);
    });

    it('should include system prompt when specified', () => {
      const args = launcher.buildArgs({
        ...baseOptions,
        systemPrompt: 'You are an expert developer',
      });

      const sysIndex = args.indexOf('--append-system-prompt');
      expect(sysIndex).toBeGreaterThan(-1);
      expect(args[sysIndex + 1]).toBe('You are an expert developer');
    });

    it('should not include optional args when not specified', () => {
      const args = launcher.buildArgs(baseOptions);

      expect(args).not.toContain('--model');
      expect(args).not.toContain('--max-budget-usd');
      expect(args).not.toContain('--mcp-config');
      expect(args).not.toContain('--append-system-prompt');
    });
  });

  describe('getPid', () => {
    it('should return null when no process', () => {
      expect(launcher.getPid()).toBeNull();
    });

    it('should return pid when process exists', () => {
      // @ts-ignore - mock
      launcher.currentProcess = { pid: 12345 };
      expect(launcher.getPid()).toBe(12345);
    });
  });

  describe('isRunning', () => {
    it('should return false when no process', () => {
      expect(launcher.isRunning()).toBe(false);
    });

    it('should return false when process is killed', () => {
      // @ts-ignore - mock
      launcher.currentProcess = { pid: 12345, killed: true };
      expect(launcher.isRunning()).toBe(false);
    });

    it('should return true when process is running', () => {
      // @ts-ignore - mock
      launcher.currentProcess = { pid: 12345, killed: false };
      expect(launcher.isRunning()).toBe(true);
    });
  });

  describe('kill', () => {
    it('should not throw when no process', () => {
      expect(() => launcher.kill()).not.toThrow();
    });

    it('should call kill on process with default signal', () => {
      const killMock = vi.fn();
      // @ts-ignore - mock
      launcher.currentProcess = { killed: false, kill: killMock };

      launcher.kill();

      expect(killMock).toHaveBeenCalledWith('SIGTERM');
    });

    it('should call kill on process with custom signal', () => {
      const killMock = vi.fn();
      // @ts-ignore - mock
      launcher.currentProcess = { killed: false, kill: killMock };

      launcher.kill('SIGKILL');

      expect(killMock).toHaveBeenCalledWith('SIGKILL');
    });

    it('should not call kill when process already killed', () => {
      const killMock = vi.fn();
      // @ts-ignore - mock
      launcher.currentProcess = { killed: true, kill: killMock };

      launcher.kill();

      expect(killMock).not.toHaveBeenCalled();
    });
  });

  describe('getElapsed', () => {
    it('should return null when not started', () => {
      expect(launcher.getElapsed()).toBeNull();
    });

    it('should return elapsed time when started', () => {
      const now = Date.now();
      launcher.startTime = now - 5000; // Started 5 seconds ago

      const elapsed = launcher.getElapsed();
      expect(elapsed).toBeGreaterThanOrEqual(5000);
      expect(elapsed).toBeLessThan(6000);
    });
  });
});
