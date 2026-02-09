/**
 * Tests for BaseAdapter 2-way messaging additions.
 *
 * @source @tools/messaging/adapters/base.mjs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create a concrete subclass since BaseAdapter is abstract
class TestAdapter {
  constructor() {
    // Manually replicate base adapter behavior for testing
    // We test via the real BaseAdapter by importing it
  }
}

// Import the real BaseAdapter
const { BaseAdapter } = await import(
  '../../../tools/messaging/adapters/base.mjs'
);

// Concrete test adapter
class ConcreteAdapter extends BaseAdapter {
  constructor() {
    super('test-platform');
    this.sentMessages = [];
  }

  async initialize() {
    this._setConnected();
  }

  async shutdown() {
    this._setDisconnected();
  }

  async send(message, channel) {
    this.sentMessages.push({ message, channel });
    return { messageId: 'msg-1', channelId: channel || 'default', success: true };
  }

  async update() {}

  // Expose protected methods for testing
  async testDispatchCommand(command, args, context) {
    return this._dispatchCommand(command, args, context);
  }

  async testDispatchMessage(text, context) {
    return this._dispatchMessage(text, context);
  }
}

describe('BaseAdapter messaging extensions', () => {
  let adapter;

  beforeEach(() => {
    adapter = new ConcreteAdapter();
  });

  describe('onMessage', () => {
    it('registers a message handler', () => {
      const handler = vi.fn();
      adapter.onMessage(handler);

      expect(adapter.hasMessageHandlers()).toBe(true);
    });

    it('registers multiple message handlers', () => {
      adapter.onMessage(vi.fn());
      adapter.onMessage(vi.fn());

      expect(adapter.hasMessageHandlers()).toBe(true);
    });
  });

  describe('hasMessageHandlers', () => {
    it('returns false when no handlers registered', () => {
      expect(adapter.hasMessageHandlers()).toBe(false);
    });

    it('returns true when handlers are registered', () => {
      adapter.onMessage(vi.fn());
      expect(adapter.hasMessageHandlers()).toBe(true);
    });
  });

  describe('_dispatchMessage', () => {
    it('calls all registered message handlers with text and context', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      adapter.onMessage(handler1);
      adapter.onMessage(handler2);

      const context = { chatId: 'chat1', from: { username: 'user1' } };
      await adapter.testDispatchMessage('Hello world', context);

      expect(handler1).toHaveBeenCalledWith('Hello world', {
        chatId: 'chat1',
        from: { username: 'user1' },
        platform: 'test-platform',
      });
      expect(handler2).toHaveBeenCalledWith('Hello world', {
        chatId: 'chat1',
        from: { username: 'user1' },
        platform: 'test-platform',
      });
    });

    it('increments received counter', async () => {
      adapter.onMessage(vi.fn());
      await adapter.testDispatchMessage('Test', {});

      const status = adapter.getStatus();
      expect(status.messagesReceived).toBe(1);
    });

    it('handles handler errors without stopping other handlers', async () => {
      const handler1 = vi.fn().mockRejectedValue(new Error('Handler 1 failed'));
      const handler2 = vi.fn();

      adapter.onMessage(handler1);
      adapter.onMessage(handler2);

      await adapter.testDispatchMessage('Test', {});

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('records error when handler throws', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      adapter.onMessage(handler);

      await adapter.testDispatchMessage('Test', {});

      const status = adapter.getStatus();
      expect(status.errors).toBe(1);
      expect(status.lastError).toBe('Handler error');
    });

    it('adds platform to context', async () => {
      const handler = vi.fn();
      adapter.onMessage(handler);

      await adapter.testDispatchMessage('Test', { chatId: '123' });

      expect(handler).toHaveBeenCalledWith('Test', {
        chatId: '123',
        platform: 'test-platform',
      });
    });
  });

  describe('onCommand (existing)', () => {
    it('still works alongside message handlers', async () => {
      const cmdHandler = vi.fn();
      const msgHandler = vi.fn();

      adapter.onCommand(cmdHandler);
      adapter.onMessage(msgHandler);

      await adapter.testDispatchCommand('help', [], { chatId: 'chat1' });

      expect(cmdHandler).toHaveBeenCalled();
      expect(msgHandler).not.toHaveBeenCalled();
    });
  });
});
