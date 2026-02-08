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
    it('should initialize correctly and be an EventEmitter', () => {
      expect(launcher.currentProcess).toBeNull();
      expect(launcher.startTime).toBeNull();
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

    it('should include required flags and prompt', () => {
      const args = launcher.buildArgs(baseOptions);

      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).toContain('--print');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
      expect(args).toContain('--session-id');
      expect(args).toContain('test-session-123');
      expect(args[args.length - 1]).toBe('Fix the bug');
    });

    it('should handle verbose flag correctly', () => {
      const verboseArgs = launcher.buildArgs({ ...baseOptions, verbose: true });
      expect(verboseArgs).toContain('--verbose');

      const nonVerboseArgs = launcher.buildArgs({ ...baseOptions, verbose: false });
      expect(nonVerboseArgs).not.toContain('--verbose');
    });

    it('should include optional arguments when specified', () => {
      const testCases = [
        { option: { maxTurns: 10 }, flag: '--max-turns', value: '10' },
        { option: { model: 'sonnet' }, flag: '--model', value: 'sonnet' },
        { option: { budget: 5.0 }, flag: '--max-budget-usd', value: '5' },
        { option: { systemPrompt: 'You are an expert developer' }, flag: '--append-system-prompt', value: 'You are an expert developer' },
      ];

      testCases.forEach(({ option, flag, value }) => {
        const args = launcher.buildArgs({ ...baseOptions, ...option });
        const flagIndex = args.indexOf(flag);
        expect(flagIndex).toBeGreaterThan(-1);
        expect(args[flagIndex + 1]).toBe(value);
      });
    });

    it('should handle MCP config as object or string', () => {
      const mcpConfig = { 'mcp-hound': { url: 'http://localhost:3000' } };
      const argsWithObject = launcher.buildArgs({ ...baseOptions, mcpConfig });
      const mcpIndexObject = argsWithObject.indexOf('--mcp-config');
      expect(mcpIndexObject).toBeGreaterThan(-1);
      expect(argsWithObject[mcpIndexObject + 1]).toBe(JSON.stringify(mcpConfig));

      const mcpConfigStr = '{"mcp-server": {}}';
      const argsWithString = launcher.buildArgs({ ...baseOptions, mcpConfig: mcpConfigStr });
      const mcpIndexString = argsWithString.indexOf('--mcp-config');
      expect(argsWithString[mcpIndexString + 1]).toBe(mcpConfigStr);
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
    it('should categorize events by type field', () => {
      const typeTests = [
        { event: { type: 'message_start' }, expected: 'message_start' },
        { event: { type: 'error' }, expected: 'error' },
      ];

      typeTests.forEach(({ event, expected }) => {
        expect(launcher._categorizeStreamEvent(event)).toBe(expected);
      });
    });

    it('should detect tool calls from multiple patterns', () => {
      const toolTests = [
        { tool: 'read' },
        { tool_use: true },
        { name: 'tool_something' },
      ];

      toolTests.forEach(event => {
        expect(launcher._categorizeStreamEvent(event)).toBe('tool_call');
      });
    });

    it('should detect errors from multiple patterns', () => {
      const errorTests = [
        { error: 'failure' },
        { message: 'error occurred' },
      ];

      errorTests.forEach(event => {
        expect(launcher._categorizeStreamEvent(event)).toBe('error');
      });
    });

    it('should detect completions from multiple patterns', () => {
      const completionTests = [
        { stop_reason: 'end_turn' },
        { content: [{ type: 'text' }] },
      ];

      completionTests.forEach(event => {
        expect(launcher._categorizeStreamEvent(event)).toBe('completion');
      });
    });

    it('should detect deltas from multiple patterns', () => {
      const deltaTests = [
        { delta: {} },
        { content_block_delta: {} },
      ];

      deltaTests.forEach(event => {
        expect(launcher._categorizeStreamEvent(event)).toBe('content_delta');
      });
    });

    it('should detect start events from multiple patterns', () => {
      const startTests = [
        { message_start: {} },
        { content_block_start: {} },
      ];

      startTests.forEach(event => {
        expect(launcher._categorizeStreamEvent(event)).toBe('start');
      });
    });

    it('should detect stop events from multiple patterns', () => {
      const stopTests = [
        { message_stop: {} },
        { content_block_stop: {} },
      ];

      stopTests.forEach(event => {
        expect(launcher._categorizeStreamEvent(event)).toBe('stop');
      });
    });

    it('should return unknown for unrecognized events', () => {
      const unknownTests = [
        { random: 'data' },
        {},
      ];

      unknownTests.forEach(event => {
        expect(launcher._categorizeStreamEvent(event)).toBe('unknown');
      });
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

    it('should return null and emit event when transcript does not exist', async () => {
      const emittedEvents: any[] = [];
      launcher.on('transcript-not-found', (data) => {
        emittedEvents.push(data);
      });

      const result = await launcher.copySessionTranscript(
        'nonexistent-session',
        '/some/path',
        testDir
      );

      expect(result).toBeNull();
      expect(emittedEvents.length).toBeGreaterThan(0);
      expect(emittedEvents[0].sourcePath).toBeDefined();
    });
  });

  describe('process state management', () => {
    it('should track getPid correctly', () => {
      expect(launcher.getPid()).toBeNull();

      // @ts-ignore - mock
      launcher.currentProcess = { pid: 12345 };
      expect(launcher.getPid()).toBe(12345);
    });

    it('should track isRunning correctly', () => {
      expect(launcher.isRunning()).toBe(false);

      // @ts-ignore - mock
      launcher.currentProcess = { pid: 12345, killed: true };
      expect(launcher.isRunning()).toBe(false);

      // @ts-ignore - mock
      launcher.currentProcess = { pid: 12345, killed: false };
      expect(launcher.isRunning()).toBe(true);
    });

    it('should handle kill correctly in all states', () => {
      expect(() => launcher.kill()).not.toThrow();

      const killMock = vi.fn();
      // @ts-ignore - mock
      launcher.currentProcess = { killed: false, kill: killMock };

      launcher.kill();
      expect(killMock).toHaveBeenCalledWith('SIGTERM');

      killMock.mockClear();
      launcher.kill('SIGKILL');
      expect(killMock).toHaveBeenCalledWith('SIGKILL');

      killMock.mockClear();
      // @ts-ignore - mock
      launcher.currentProcess.killed = true;
      launcher.kill();
      expect(killMock).not.toHaveBeenCalled();
    });
  });

  describe('getElapsed', () => {
    it('should return null when not started and elapsed time when started', () => {
      expect(launcher.getElapsed()).toBeNull();

      const now = Date.now();
      launcher.startTime = now - 5000; // Started 5 seconds ago

      const elapsed = launcher.getElapsed();
      expect(elapsed).toBeGreaterThanOrEqual(5000);
      expect(elapsed).toBeLessThan(6000);
    });
  });
});
