/**
 * Unit tests for External Ralph Loop Session Launcher
 *
 * @source @tools/ralph-external/session-launcher.mjs
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

// Import the module under test
// @ts-ignore - ESM import
import { SessionLauncher } from '../../../tools/ralph-external/session-launcher.mjs';

describe('SessionLauncher', () => {
  let launcher: InstanceType<typeof SessionLauncher>;
  let testDir: string;

  beforeEach(() => {
    launcher = new SessionLauncher();
    testDir = join('/tmp', `ralph-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
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
      outputDir: '/tmp/output',
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

    it('should include verbose flag when specified', () => {
      const args = launcher.buildArgs({
        ...baseOptions,
        verbose: true,
      });

      expect(args).toContain('--verbose');
    });

    it('should not include verbose flag when false', () => {
      const args = launcher.buildArgs({
        ...baseOptions,
        verbose: false,
      });

      expect(args).not.toContain('--verbose');
    });

    it('should include max-turns when specified', () => {
      const args = launcher.buildArgs({
        ...baseOptions,
        maxTurns: 10,
      });

      const turnsIndex = args.indexOf('--max-turns');
      expect(turnsIndex).toBeGreaterThan(-1);
      expect(args[turnsIndex + 1]).toBe('10');
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
      expect(args).not.toContain('--max-turns');
      expect(args).not.toContain('--verbose');
    });
  });

  describe('parseStreamEvents', () => {
    it('should parse valid stream-json events', async () => {
      const stdoutPath = join(testDir, 'stdout.log');

      // Create mock stream-json output
      const mockEvents = [
        { type: 'message_start', message: { id: 'msg_1' } },
        { type: 'content_block_start', index: 0 },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
        { name: 'tool_read_file', type: 'tool_use', id: 'tool_1' },
        { error: 'File not found', code: 'not_found' },
        { type: 'message_stop' },
      ];

      writeFileSync(stdoutPath, mockEvents.map(e => JSON.stringify(e)).join('\n'));

      const { path, stats } = await launcher.parseStreamEvents(stdoutPath, testDir);

      expect(path).toBe(join(testDir, 'parsed-events.json'));
      expect(stats.totalEvents).toBe(6);
      expect(stats.toolCallCount).toBe(1);
      expect(stats.errorCount).toBe(1);
    });

    it('should handle empty stdout file', async () => {
      const stdoutPath = join(testDir, 'stdout-empty.log');
      writeFileSync(stdoutPath, '');

      const { path, stats } = await launcher.parseStreamEvents(stdoutPath, testDir);

      expect(path).toBe(join(testDir, 'parsed-events.json'));
      expect(stats.totalEvents).toBe(0);
      expect(stats.toolCallCount).toBe(0);
      expect(stats.errorCount).toBe(0);
    });

    it('should skip malformed JSON lines', async () => {
      const stdoutPath = join(testDir, 'stdout-malformed.log');

      const content = [
        '{"type": "valid"}',
        'not json',
        '{"type": "also_valid"}',
        '{incomplete',
      ].join('\n');

      writeFileSync(stdoutPath, content);

      const { path, stats } = await launcher.parseStreamEvents(stdoutPath, testDir);

      expect(path).toBe(join(testDir, 'parsed-events.json'));
      expect(stats.totalEvents).toBe(2); // Only valid lines counted
    });

    it('should categorize different event types', async () => {
      const stdoutPath = join(testDir, 'stdout-types.log');

      const mockEvents = [
        { type: 'message_start' },
        { type: 'content_block_start' },
        { type: 'content_block_delta', delta: {} },
        { type: 'content_block_stop' },
        { type: 'message_stop' },
        { tool_use: true, name: 'test_tool' },
        { error: 'Test error' },
      ];

      writeFileSync(stdoutPath, mockEvents.map(e => JSON.stringify(e)).join('\n'));

      const { path, stats } = await launcher.parseStreamEvents(stdoutPath, testDir);

      expect(stats.totalEvents).toBe(7);
      expect(stats.toolCallCount).toBeGreaterThan(0);
      expect(stats.errorCount).toBeGreaterThan(0);
    });
  });

  describe('_categorizeStreamEvent', () => {
    it('should categorize by type field', () => {
      expect(launcher._categorizeStreamEvent({ type: 'message_start' })).toBe('message_start');
      expect(launcher._categorizeStreamEvent({ type: 'error' })).toBe('error');
    });

    it('should detect tool calls', () => {
      expect(launcher._categorizeStreamEvent({ tool: 'read' })).toBe('tool_call');
      expect(launcher._categorizeStreamEvent({ tool_use: true })).toBe('tool_call');
      expect(launcher._categorizeStreamEvent({ name: 'tool_something' })).toBe('tool_call');
    });

    it('should detect errors', () => {
      expect(launcher._categorizeStreamEvent({ error: 'failure' })).toBe('error');
      expect(launcher._categorizeStreamEvent({ message: 'error occurred' })).toBe('error');
    });

    it('should detect completions', () => {
      expect(launcher._categorizeStreamEvent({ stop_reason: 'end_turn' })).toBe('completion');
      expect(launcher._categorizeStreamEvent({ content: [{ type: 'text' }] })).toBe('completion');
    });

    it('should detect deltas', () => {
      expect(launcher._categorizeStreamEvent({ delta: {} })).toBe('content_delta');
      expect(launcher._categorizeStreamEvent({ content_block_delta: {} })).toBe('content_delta');
    });

    it('should detect start events', () => {
      expect(launcher._categorizeStreamEvent({ message_start: {} })).toBe('start');
      expect(launcher._categorizeStreamEvent({ content_block_start: {} })).toBe('start');
    });

    it('should detect stop events', () => {
      expect(launcher._categorizeStreamEvent({ message_stop: {} })).toBe('stop');
      expect(launcher._categorizeStreamEvent({ content_block_stop: {} })).toBe('stop');
    });

    it('should return unknown for unrecognized events', () => {
      expect(launcher._categorizeStreamEvent({ random: 'data' })).toBe('unknown');
      expect(launcher._categorizeStreamEvent({})).toBe('unknown');
    });
  });

  describe('copySessionTranscript', () => {
    it('should encode working directory path correctly', async () => {
      const sessionId = 'test-session-123';
      const workingDir = '/foo/bar/baz';

      // Mock the home directory to our test dir for this test
      const expectedEncodedPath = '-foo-bar-baz';

      // This will fail to find the file, but we can check the emitted event
      let emittedPath = '';
      launcher.on('transcript-not-found', ({ sourcePath }) => {
        emittedPath = sourcePath;
      });

      await launcher.copySessionTranscript(sessionId, workingDir, testDir);

      expect(emittedPath).toContain(expectedEncodedPath);
      expect(emittedPath).toContain(sessionId);
    });

    it('should return null when transcript does not exist', async () => {
      const result = await launcher.copySessionTranscript(
        'nonexistent-session',
        '/some/path',
        testDir
      );

      expect(result).toBeNull();
    });

    it('should emit transcript-not-found event', async () => {
      const emittedEvents: any[] = [];
      launcher.on('transcript-not-found', (data) => {
        emittedEvents.push(data);
      });

      await launcher.copySessionTranscript('test', '/path', testDir);

      expect(emittedEvents.length).toBeGreaterThan(0);
      expect(emittedEvents[0].sourcePath).toBeDefined();
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
