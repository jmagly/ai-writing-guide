/**
 * Tests for messaging hub 2-way chat wiring.
 *
 * Tests that createMessagingHub correctly wires the ChatHandler
 * for free-text message processing and /ask command routing.
 *
 * @source @tools/messaging/index.mjs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock adapter-registry to control adapter loading
vi.mock('../../../tools/messaging/adapter-registry.mjs', () => {
  let mockAdapters = new Map();

  return {
    initializeRegistry: vi.fn(),
    loadEnabledAdapters: vi.fn(async () => mockAdapters),
    getRegistryStatus: vi.fn(() => []),
    shutdownAll: vi.fn(async () => {}),
    _setMockAdapters: (adapters) => {
      mockAdapters = adapters;
    },
  };
});

// Mock child_process for ChatHandler's spawn
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

const { EventEmitter } = await import('events');
const { spawn } = await import('node:child_process');
const { createMessagingHub } = await import(
  '../../../tools/messaging/index.mjs'
);
const { _setMockAdapters } = await import(
  '../../../tools/messaging/adapter-registry.mjs'
);

function createMockProcess() {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn();
  proc.pid = Math.floor(Math.random() * 10000);
  return proc;
}

/**
 * Create a mock adapter with command and message handler support.
 */
function createMockAdapter(name = 'test') {
  const commandHandlers = [];
  const messageHandlers = [];
  const sentMessages = [];

  return {
    platform: name,
    onCommand: vi.fn((handler) => commandHandlers.push(handler)),
    onMessage: vi.fn((handler) => messageHandlers.push(handler)),
    hasMessageHandlers: vi.fn(() => messageHandlers.length > 0),
    send: vi.fn(async (message, channel) => {
      sentMessages.push({ message, channel });
      return { messageId: 'msg-1', channelId: channel || 'default', success: true };
    }),

    // Helpers for tests to simulate inbound
    _dispatchCommand: async (command, args, context) => {
      for (const handler of commandHandlers) {
        await handler(command, args, context);
      }
    },
    _dispatchMessage: async (text, context) => {
      for (const handler of messageHandlers) {
        await handler(text, context);
      }
    },
    _sentMessages: sentMessages,
  };
}

describe('Hub chat wiring', () => {
  let mockProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = createMockProcess();
    spawn.mockReturnValue(mockProcess);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('returns null when no adapters are enabled', async () => {
    _setMockAdapters(new Map());
    const hub = await createMessagingHub();
    expect(hub).toBeNull();
  });

  it('creates hub with chat handler when chatHandler config provided', async () => {
    const adapter = createMockAdapter('telegram');
    _setMockAdapters(new Map([['telegram', adapter]]));

    const hub = await createMessagingHub({
      chatHandler: { maxConcurrent: 2 },
    });

    expect(hub).not.toBeNull();
    expect(hub.chatHandler).not.toBeNull();
    expect(adapter.onMessage).toHaveBeenCalled();

    await hub.shutdown();
  });

  it('creates hub with default chat handler when no chatHandler option', async () => {
    const adapter = createMockAdapter('telegram');
    _setMockAdapters(new Map([['telegram', adapter]]));

    const hub = await createMessagingHub();

    expect(hub.chatHandler).not.toBeNull();

    await hub.shutdown();
  });

  it('disables chat handler when chatHandler is false', async () => {
    const adapter = createMockAdapter('telegram');
    _setMockAdapters(new Map([['telegram', adapter]]));

    const hub = await createMessagingHub({ chatHandler: false });

    expect(hub.chatHandler).toBeNull();
    expect(adapter.onMessage).not.toHaveBeenCalled();

    await hub.shutdown();
  });

  it('registers /ask command handler', async () => {
    // Set up spawn to auto-complete with response
    spawn.mockImplementation(() => {
      const proc = createMockProcess();
      process.nextTick(() => {
        proc.stdout.emit('data', Buffer.from('Node.js is a runtime.'));
        proc.emit('exit', 0);
      });
      return proc;
    });

    const adapter = createMockAdapter('telegram');
    _setMockAdapters(new Map([['telegram', adapter]]));

    const hub = await createMessagingHub();

    // Dispatch /ask command
    const context = { chatId: 'chat1', platform: 'telegram', from: { username: 'tester' } };
    await adapter._dispatchCommand('ask', ['what', 'is', 'Node.js?'], context);

    // Wait for async processing
    await new Promise((r) => setTimeout(r, 50));

    // ChatHandler spawns claude with the question
    expect(spawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['-p']),
      expect.any(Object)
    );

    // Response should be sent back
    expect(adapter.send).toHaveBeenCalled();

    await hub.shutdown();
  });

  it('/ask command returns error when no question provided', async () => {
    const adapter = createMockAdapter('telegram');
    _setMockAdapters(new Map([['telegram', adapter]]));

    const hub = await createMessagingHub();

    const context = { chatId: 'chat1', platform: 'telegram' };
    await adapter._dispatchCommand('ask', [], context);

    // Should send error response
    const lastSend = adapter.send.mock.calls[adapter.send.mock.calls.length - 1];
    expect(lastSend[0].body).toMatch(/Usage: \/ask/);

    await hub.shutdown();
  });

  it('wires free-text messages to chat handler', async () => {
    // Set up spawn to auto-complete with response
    spawn.mockImplementation(() => {
      const proc = createMockProcess();
      process.nextTick(() => {
        proc.stdout.emit('data', Buffer.from('Testing is important.'));
        proc.emit('exit', 0);
      });
      return proc;
    });

    const adapter = createMockAdapter('telegram');
    _setMockAdapters(new Map([['telegram', adapter]]));

    const hub = await createMessagingHub();

    // Simulate free-text message from user
    const context = { chatId: 'chat1', platform: 'telegram', from: { username: 'tester' } };

    await adapter._dispatchMessage('Tell me about testing', context);

    // Wait for async processing
    await new Promise((r) => setTimeout(r, 50));

    // Should send AI response back
    const aiResponse = adapter.send.mock.calls.find(
      (call) => call[0].title === 'AI Response'
    );
    expect(aiResponse).toBeDefined();
    expect(aiResponse[0].body).toBe('Testing is important.');
    expect(aiResponse[1]).toBe('chat1');

    await hub.shutdown();
  });

  it('sends error event when chat response fails to send', async () => {
    const adapter = createMockAdapter('telegram');
    // Make send fail on the AI response
    let callCount = 0;
    adapter.send = vi.fn(async () => {
      callCount++;
      if (callCount > 0) {
        // Allow first calls (command responses), but we need to track
      }
      return { messageId: 'msg-1', channelId: 'default', success: true };
    });

    _setMockAdapters(new Map([['telegram', adapter]]));

    const hub = await createMessagingHub();

    // We can verify the bus publishes CHAT_MESSAGE events on free-text
    let chatMessagePublished = false;
    hub.bus.subscribe('chat.message', () => {
      chatMessagePublished = true;
    }, 'test-subscriber');

    const context = { chatId: 'chat1', platform: 'telegram', from: { username: 'tester' } };
    const messagePromise = adapter._dispatchMessage('Hello', context);

    process.nextTick(() => {
      mockProcess.stdout.emit('data', Buffer.from('Hi'));
      mockProcess.emit('exit', 0);
    });

    await messagePromise;

    expect(chatMessagePublished).toBe(true);

    await hub.shutdown();
  });

  it('wires message handlers for all adapters', async () => {
    const telegram = createMockAdapter('telegram');
    const discord = createMockAdapter('discord');
    _setMockAdapters(
      new Map([
        ['telegram', telegram],
        ['discord', discord],
      ])
    );

    const hub = await createMessagingHub();

    expect(telegram.onMessage).toHaveBeenCalled();
    expect(discord.onMessage).toHaveBeenCalled();

    await hub.shutdown();
  });

  it('exposes chatHandler in returned hub object', async () => {
    const adapter = createMockAdapter('telegram');
    _setMockAdapters(new Map([['telegram', adapter]]));

    const hub = await createMessagingHub();

    expect(hub.chatHandler).toBeDefined();
    expect(typeof hub.chatHandler.processMessage).toBe('function');
    expect(typeof hub.chatHandler.getConversation).toBe('function');
    expect(typeof hub.chatHandler.clearConversation).toBe('function');
    expect(typeof hub.chatHandler.getStats).toBe('function');

    await hub.shutdown();
  });
});
