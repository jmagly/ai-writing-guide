/**
 * Unit tests for ChatHandler class.
 *
 * @source @tools/messaging/chat-handler.mjs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock child_process.spawn before importing ChatHandler
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

// Import after mocking
const { spawn } = await import('node:child_process');
const { ChatHandler } = await import('../../../tools/messaging/chat-handler.mjs');

/**
 * Create a mock process object with EventEmitter-like behavior.
 */
function createMockProcess() {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn();
  proc.pid = Math.floor(Math.random() * 10000);
  return proc;
}

describe('ChatHandler', () => {
  let mockProcess;

  beforeEach(() => {
    mockProcess = createMockProcess();
    spawn.mockReturnValue(mockProcess);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('uses default options', () => {
      const handler = new ChatHandler();
      const stats = handler.getStats();

      expect(stats.activeProcesses).toBe(0);
      expect(stats.maxConcurrent).toBe(3);
      expect(stats.conversationCount).toBe(0);
    });

    it('accepts custom options', () => {
      const handler = new ChatHandler({
        agentCommand: 'custom-claude',
        agentArgs: ['--verbose'],
        cwd: '/custom/dir',
        maxContextMessages: 5,
        timeoutMs: 60000,
        maxConcurrent: 5,
        maxResponseLength: 2000,
      });

      const stats = handler.getStats();
      expect(stats.maxConcurrent).toBe(5);
    });

    it('handles partial options', () => {
      const handler = new ChatHandler({
        maxConcurrent: 10,
        timeoutMs: 30000,
      });

      const stats = handler.getStats();
      expect(stats.maxConcurrent).toBe(10);
      expect(stats.conversationCount).toBe(0);
    });
  });

  describe('processMessage', () => {
    it('processes a basic message and returns response', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const responsePromise = handler.processMessage('Hello', context);

      // Simulate agent response
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Hi there!'));
        mockProcess.emit('exit', 0);
      });

      const result = await responsePromise;

      expect(result.response).toBe('Hi there!');
      expect(result.conversationId).toBe('telegram:chat1');
      expect(spawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['-p', 'Hello']),
        expect.any(Object)
      );
    });

    it('tracks conversation history', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise1 = handler.processMessage('First message', context);
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('First response'));
        mockProcess.emit('exit', 0);
      });
      await promise1;

      const history = handler.getConversation('telegram:chat1');
      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('First message');
      expect(history[1].role).toBe('assistant');
      expect(history[1].content).toBe('First response');
      expect(history[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('prevents concurrent processing of same chat', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise1 = handler.processMessage('Message 1', context);
      const promise2 = handler.processMessage('Message 2', context);

      const result2 = await promise2;
      expect(result2.response).toBe('Still processing your previous message. Please wait.');

      // Clean up first promise
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Response'));
        mockProcess.emit('exit', 0);
      });
      await promise1;
    });

    it('enforces concurrency limit across different chats', async () => {
      const handler = new ChatHandler({ maxConcurrent: 2 });

      const contexts = [
        { chatId: 'chat1', platform: 'telegram' },
        { chatId: 'chat2', platform: 'telegram' },
        { chatId: 'chat3', platform: 'telegram' },
      ];

      const promises = contexts.map((ctx) => handler.processMessage('Test', ctx));

      // Third request should be rejected immediately
      const result3 = await promises[2];
      expect(result3.response).toMatch(/AI is busy/);
      expect(result3.response).toMatch(/2\/2 active/);

      // Clean up first two
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Response'));
        mockProcess.emit('exit', 0);
      });

      await Promise.all([promises[0], promises[1]]);
    });

    it('handles errors and returns error message', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);

      process.nextTick(() => {
        mockProcess.emit('error', new Error('Command not found'));
      });

      const result = await promise;
      expect(result.response).toMatch(/Error:/);
      expect(result.response).toMatch(/Failed to spawn AI/);
    });

    it('decrements active process count after completion', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);

      const statsDuring = handler.getStats();
      expect(statsDuring.activeProcesses).toBe(1);

      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Response'));
        mockProcess.emit('exit', 0);
      });

      await promise;

      const statsAfter = handler.getStats();
      expect(statsAfter.activeProcesses).toBe(0);
    });

    it('decrements active process count after error', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);

      process.nextTick(() => {
        mockProcess.emit('error', new Error('Spawn failed'));
      });

      await promise;

      const stats = handler.getStats();
      expect(stats.activeProcesses).toBe(0);
    });
  });

  describe('getConversation', () => {
    it('returns a copy of conversation history', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Hello', context);
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Hi'));
        mockProcess.emit('exit', 0);
      });
      await promise;

      const history1 = handler.getConversation('telegram:chat1');
      const history2 = handler.getConversation('telegram:chat1');

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });

    it('returns empty array for unknown conversation', () => {
      const handler = new ChatHandler();
      const history = handler.getConversation('unknown:chat99');

      expect(history).toEqual([]);
    });
  });

  describe('clearConversation', () => {
    it('removes conversation history', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Hello', context);
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Hi'));
        mockProcess.emit('exit', 0);
      });
      await promise;

      expect(handler.getStats().conversationCount).toBe(1);

      handler.clearConversation('telegram:chat1');

      expect(handler.getStats().conversationCount).toBe(0);
      expect(handler.getConversation('telegram:chat1')).toEqual([]);
    });

    it('handles clearing non-existent conversation', () => {
      const handler = new ChatHandler();

      expect(() => {
        handler.clearConversation('unknown:chat99');
      }).not.toThrow();
    });
  });

  describe('getStats', () => {
    it('returns accurate active process count', async () => {
      const handler = new ChatHandler({ maxConcurrent: 5 });
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);

      const stats = handler.getStats();
      expect(stats.activeProcesses).toBe(1);
      expect(stats.maxConcurrent).toBe(5);

      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Response'));
        mockProcess.emit('exit', 0);
      });

      await promise;
    });

    it('returns accurate conversation count', async () => {
      const handler = new ChatHandler();

      expect(handler.getStats().conversationCount).toBe(0);

      const contexts = [
        { chatId: 'chat1', platform: 'telegram' },
        { chatId: 'chat2', platform: 'telegram' },
      ];

      for (const ctx of contexts) {
        const promise = handler.processMessage('Test', ctx);
        process.nextTick(() => {
          mockProcess.stdout.emit('data', Buffer.from('Response'));
          mockProcess.emit('exit', 0);
        });
        await promise;
      }

      expect(handler.getStats().conversationCount).toBe(2);
    });
  });

  describe('conversation context', () => {
    it('builds prompt with conversation history for multi-turn', async () => {
      const handler = new ChatHandler({ maxContextMessages: 3 });
      const context = { chatId: 'chat1', platform: 'telegram' };

      // Turn 1
      const promise1 = handler.processMessage('What is Node.js?', context);
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Node.js is a runtime.'));
        mockProcess.emit('exit', 0);
      });
      await promise1;

      // Turn 2 - should include context
      const promise2 = handler.processMessage('Who created it?', context);

      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Ryan Dahl.'));
        mockProcess.emit('exit', 0);
      });
      await promise2;

      // Check spawn was called with context
      const secondCall = spawn.mock.calls[1];
      const promptArg = secondCall[1].find((arg) => arg.includes('User:'));

      expect(promptArg).toContain('Previous conversation context:');
      expect(promptArg).toContain('User: What is Node.js?');
      expect(promptArg).toContain('Assistant: Node.js is a runtime.');
      expect(promptArg).toContain('Current message:');
      expect(promptArg).toContain('Who created it?');
    });

    it('includes only recent history within maxContextMessages', async () => {
      const handler = new ChatHandler({ maxContextMessages: 2 });
      const context = { chatId: 'chat1', platform: 'telegram' };

      const messages = ['Msg 1', 'Msg 2', 'Msg 3', 'Msg 4'];

      for (const msg of messages) {
        const promise = handler.processMessage(msg, context);
        process.nextTick(() => {
          mockProcess.stdout.emit('data', Buffer.from(`Response to ${msg}`));
          mockProcess.emit('exit', 0);
        });
        await promise;
      }

      // Last prompt should only include last 2 context messages (excluding current)
      const lastCall = spawn.mock.calls[spawn.mock.calls.length - 1];
      const promptArg = lastCall[1].find((arg) => arg.includes('User:') || arg === 'Msg 4');

      // Should include only last 2 messages as context (Msg 3 + Response), current is Msg 4
      expect(promptArg).toContain('Msg 3');
      expect(promptArg).toContain('Response to Msg 3');
      expect(promptArg).not.toContain('Msg 1'); // Too old
    });

    it('does not include context for first message', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('First message', context);
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Response'));
        mockProcess.emit('exit', 0);
      });
      await promise;

      const call = spawn.mock.calls[0];
      const promptArg = call[1][call[1].indexOf('-p') + 1];

      expect(promptArg).toBe('First message');
      expect(promptArg).not.toContain('Previous conversation context:');
    });
  });

  describe('response truncation', () => {
    it('does not truncate responses under limit', async () => {
      const handler = new ChatHandler({ maxResponseLength: 100 });
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Short response'));
        mockProcess.emit('exit', 0);
      });

      const result = await promise;
      expect(result.response).toBe('Short response');
      expect(result.response).not.toContain('[...truncated]');
    });

    it('truncates responses over limit', async () => {
      const handler = new ChatHandler({ maxResponseLength: 50 });
      const context = { chatId: 'chat1', platform: 'telegram' };

      const longResponse = 'A'.repeat(100);
      const promise = handler.processMessage('Test', context);

      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from(longResponse));
        mockProcess.emit('exit', 0);
      });

      const result = await promise;
      expect(result.response.length).toBeLessThanOrEqual(50);
      expect(result.response).toContain('[...truncated]');
    });

    it('truncates at correct boundary', async () => {
      const handler = new ChatHandler({ maxResponseLength: 100 });
      const context = { chatId: 'chat1', platform: 'telegram' };

      const response = 'X'.repeat(150);
      const promise = handler.processMessage('Test', context);

      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from(response));
        mockProcess.emit('exit', 0);
      });

      const result = await promise;
      // Should be maxResponseLength - 20 + '\n\n[...truncated]' (18 chars)
      expect(result.response.length).toBeLessThanOrEqual(100);
      expect(result.response).toMatch(/X+\n\n\[\.\.\.truncated\]/);
    });
  });

  describe('timeout handling', () => {
    it('rejects on timeout and kills process', async () => {
      vi.useFakeTimers();

      const handler = new ChatHandler({ timeoutMs: 1000 });
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);

      // Advance past timeout
      vi.advanceTimersByTime(1001);

      // Process should be killed
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');

      const result = await promise;
      expect(result.response).toMatch(/Error:/);
      expect(result.response).toMatch(/timed out/);

      vi.useRealTimers();
    });

    it('clears timeout on successful completion', async () => {
      vi.useFakeTimers();

      const handler = new ChatHandler({ timeoutMs: 10000 });
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);

      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Response'));
        mockProcess.emit('exit', 0);
      });

      await promise;

      // Advancing timers should not cause issues
      vi.advanceTimersByTime(20000);
      expect(mockProcess.kill).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('process error/exit handling', () => {
    it('handles non-zero exit code', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);

      process.nextTick(() => {
        mockProcess.emit('exit', 1);
      });

      const result = await promise;
      expect(result.response).toMatch(/Error:/);
      expect(result.response).toMatch(/exited with code 1/);
    });

    it('handles SIGTERM signal', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);

      process.nextTick(() => {
        mockProcess.emit('exit', null, 'SIGTERM');
      });

      const result = await promise;
      expect(result.response).toMatch(/Error:/);
      expect(result.response).toMatch(/terminated/);
    });

    it('handles SIGKILL signal', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);

      process.nextTick(() => {
        mockProcess.emit('exit', null, 'SIGKILL');
      });

      const result = await promise;
      expect(result.response).toMatch(/Error:/);
      expect(result.response).toMatch(/terminated/);
    });

    it('handles spawn error', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);

      process.nextTick(() => {
        mockProcess.emit('error', new Error('ENOENT: command not found'));
      });

      const result = await promise;
      expect(result.response).toMatch(/Error:/);
      expect(result.response).toMatch(/Failed to spawn AI/);
      expect(result.response).toMatch(/ENOENT/);
    });

    it('accumulates stdout across multiple chunks', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);

      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('First '));
        mockProcess.stdout.emit('data', Buffer.from('Second '));
        mockProcess.stdout.emit('data', Buffer.from('Third'));
        mockProcess.emit('exit', 0);
      });

      const result = await promise;
      expect(result.response).toBe('First Second Third');
    });
  });

  describe('history trimming', () => {
    it('trims history when exceeding maxContextMessages * 2', async () => {
      const handler = new ChatHandler({ maxContextMessages: 2 });
      const context = { chatId: 'chat1', platform: 'telegram' };

      // Add 6 messages (3 user + 3 assistant = 6 total)
      const messages = ['Msg 1', 'Msg 2', 'Msg 3'];

      for (const msg of messages) {
        const promise = handler.processMessage(msg, context);
        process.nextTick(() => {
          mockProcess.stdout.emit('data', Buffer.from(`Response to ${msg}`));
          mockProcess.emit('exit', 0);
        });
        await promise;
      }

      const history = handler.getConversation('telegram:chat1');

      // maxContextMessages * 2 = 2 * 2 = 4, so should keep only 4 most recent
      expect(history.length).toBeLessThanOrEqual(4);
      expect(history[history.length - 1].content).toContain('Msg 3');
    });

    it('preserves history under limit', async () => {
      const handler = new ChatHandler({ maxContextMessages: 10 });
      const context = { chatId: 'chat1', platform: 'telegram' };

      const messages = ['Msg 1', 'Msg 2'];

      for (const msg of messages) {
        const promise = handler.processMessage(msg, context);
        process.nextTick(() => {
          mockProcess.stdout.emit('data', Buffer.from(`Response to ${msg}`));
          mockProcess.emit('exit', 0);
        });
        await promise;
      }

      const history = handler.getConversation('telegram:chat1');
      expect(history.length).toBe(4); // 2 user + 2 assistant
    });

    it('removes oldest messages first when trimming', async () => {
      const handler = new ChatHandler({ maxContextMessages: 1 });
      const context = { chatId: 'chat1', platform: 'telegram' };

      const messages = ['Old', 'Middle', 'Recent'];

      for (const msg of messages) {
        const promise = handler.processMessage(msg, context);
        process.nextTick(() => {
          mockProcess.stdout.emit('data', Buffer.from(`Response to ${msg}`));
          mockProcess.emit('exit', 0);
        });
        await promise;
      }

      const history = handler.getConversation('telegram:chat1');

      // Should only keep maxContextMessages * 2 = 2 messages
      expect(history.length).toBeLessThanOrEqual(2);

      // Should not contain the oldest message
      const hasOld = history.some((msg) => msg.content === 'Old');
      expect(hasOld).toBe(false);

      // Should contain the most recent
      const hasRecent = history.some((msg) => msg.content === 'Recent');
      expect(hasRecent).toBe(true);
    });
  });

  describe('conversation ID generation', () => {
    it('generates stable IDs from context', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat123', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Response'));
        mockProcess.emit('exit', 0);
      });

      const result = await promise;
      expect(result.conversationId).toBe('telegram:chat123');
    });

    it('handles missing platform in context', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat123' };

      const promise = handler.processMessage('Test', context);
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Response'));
        mockProcess.emit('exit', 0);
      });

      const result = await promise;
      expect(result.conversationId).toBe('unknown:chat123');
    });

    it('handles missing chatId in context', async () => {
      const handler = new ChatHandler();
      const context = { platform: 'telegram' };

      const promise = handler.processMessage('Test', context);
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Response'));
        mockProcess.emit('exit', 0);
      });

      const result = await promise;
      expect(result.conversationId).toBe('telegram:default');
    });

    it('separates conversations by platform and chat', async () => {
      const handler = new ChatHandler();

      const contexts = [
        { chatId: 'chat1', platform: 'telegram' },
        { chatId: 'chat1', platform: 'discord' },
      ];

      for (const ctx of contexts) {
        const promise = handler.processMessage('Test', ctx);
        process.nextTick(() => {
          mockProcess.stdout.emit('data', Buffer.from('Response'));
          mockProcess.emit('exit', 0);
        });
        await promise;
      }

      expect(handler.getStats().conversationCount).toBe(2);
      expect(handler.getConversation('telegram:chat1')).toHaveLength(2);
      expect(handler.getConversation('discord:chat1')).toHaveLength(2);
    });
  });

  describe('spawn configuration', () => {
    it('passes custom agent command and args', async () => {
      const handler = new ChatHandler({
        agentCommand: 'custom-agent',
        agentArgs: ['--verbose', '--debug'],
      });
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Response'));
        mockProcess.emit('exit', 0);
      });

      await promise;

      expect(spawn).toHaveBeenCalledWith(
        'custom-agent',
        expect.arrayContaining(['--verbose', '--debug', '-p']),
        expect.any(Object)
      );
    });

    it('passes custom working directory', async () => {
      const customCwd = '/custom/working/dir';
      const handler = new ChatHandler({ cwd: customCwd });
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Response'));
        mockProcess.emit('exit', 0);
      });

      await promise;

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ cwd: customCwd })
      );
    });

    it('includes environment variables in spawn', async () => {
      const handler = new ChatHandler();
      const context = { chatId: 'chat1', platform: 'telegram' };

      const promise = handler.processMessage('Test', context);
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Response'));
        mockProcess.emit('exit', 0);
      });

      await promise;

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining(process.env),
        })
      );
    });
  });
});
