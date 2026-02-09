import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../../tools/messaging/event-bus.mjs';

describe('EventBus', () => {
  let bus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('subscribe', () => {
    it('adds subscriber and fires on matching publish', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('test.event', handler);

      await bus.publish({
        topic: 'test.event',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'test',
        severity: 'info',
        summary: 'Test event',
        details: {},
        project: 'test-project',
      });

      // Wait for async handler to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'test.event',
          summary: 'Test event',
        })
      );
    });

    it('subscribes with wildcard pattern matching ralph.*', async () => {
      const ralphHandler = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('ralph.*', ralphHandler);

      await bus.publish({
        topic: 'ralph.started',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'ralph',
        severity: 'info',
        summary: 'Ralph started',
        details: {},
        project: 'test',
      });

      await bus.publish({
        topic: 'ralph.completed',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'ralph',
        severity: 'info',
        summary: 'Ralph completed',
        details: {},
        project: 'test',
      });

      // Wait for handlers
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(ralphHandler).toHaveBeenCalledTimes(2);
    });

    it('wildcard pattern does not match unrelated topics', async () => {
      const ralphHandler = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('ralph.*', ralphHandler);

      await bus.publish({
        topic: 'test.passed',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'test',
        severity: 'info',
        summary: 'Test passed',
        details: {},
        project: 'test',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(ralphHandler).not.toHaveBeenCalled();
    });

    it('subscribes with * pattern to receive all events', async () => {
      const allHandler = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('*', allHandler);

      await bus.publish({
        topic: 'ralph.started',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'ralph',
        severity: 'info',
        summary: 'Ralph started',
        details: {},
        project: 'test',
      });

      await bus.publish({
        topic: 'test.passed',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'test',
        severity: 'info',
        summary: 'Test passed',
        details: {},
        project: 'test',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(allHandler).toHaveBeenCalledTimes(2);
    });

    it('increments subscriber count', () => {
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      expect(bus.subscriberCount).toBe(0);

      bus.subscribe('test.event', handler1);
      expect(bus.subscriberCount).toBe(1);

      bus.subscribe('test.event', handler2);
      expect(bus.subscriberCount).toBe(2);
    });

    it('uses handler name for debugging when provided', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failingHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));

      bus.subscribe('test.event', failingHandler, 'myHandler');

      await bus.publish({
        topic: 'test.event',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'test',
        severity: 'info',
        summary: 'Test',
        details: {},
        project: 'test',
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('myHandler')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('publish', () => {
    it('dispatches to matching subscribers only', async () => {
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('test.event', handler1);
      bus.subscribe('other.event', handler2);

      await bus.publish({
        topic: 'test.event',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'test',
        severity: 'info',
        summary: 'Test',
        details: {},
        project: 'test',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
    });

    it('adds timestamp if not provided', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('test.event', handler);

      await bus.publish({
        topic: 'test.event',
        source: 'test',
        severity: 'info',
        summary: 'Test',
        details: {},
        project: 'test',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });

    it('retries failed handlers up to 3 times', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let callCount = 0;
      const failingHandler = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error('Handler failed'));
      });

      bus.subscribe('test.event', failingHandler);

      await bus.publish({
        topic: 'test.event',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'test',
        severity: 'info',
        summary: 'Test',
        details: {},
        project: 'test',
      });

      // Wait for retries to complete (3 retries with delays)
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(callCount).toBe(3);

      consoleSpy.mockRestore();
    });
  });

  describe('unsubscribe', () => {
    it('removes subscriber and stops firing', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('test.event', handler);

      await bus.publish({
        topic: 'test.event',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'test',
        severity: 'info',
        summary: 'First',
        details: {},
        project: 'test',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledTimes(1);

      bus.unsubscribe('test.event');

      await bus.publish({
        topic: 'test.event',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'test',
        severity: 'info',
        summary: 'Second',
        details: {},
        project: 'test',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('decrements subscriber count', () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      bus.subscribe('test.event', handler);
      expect(bus.subscriberCount).toBe(1);

      bus.unsubscribe('test.event');
      expect(bus.subscriberCount).toBe(0);
    });
  });

  describe('dead letter queue', () => {
    it('adds failed events after max retries', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failingHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));

      bus.subscribe('test.event', failingHandler, 'failingHandler');

      await bus.publish({
        topic: 'test.event',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'test',
        severity: 'info',
        summary: 'Test',
        details: {},
        project: 'test',
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const deadLetters = bus.getDeadLetters();
      expect(deadLetters).toHaveLength(1);
      expect(deadLetters[0]).toMatchObject({
        event: expect.objectContaining({ topic: 'test.event' }),
        error: expect.objectContaining({ message: 'Handler failed' }),
        handler: 'failingHandler',
      });

      consoleSpy.mockRestore();
    });

    it('limits dead letter queue to max 100 entries', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failingHandler = vi.fn().mockRejectedValue(new Error('Failed'));

      bus.subscribe('test.event', failingHandler);

      // Publish 110 failing events
      for (let i = 0; i < 110; i++) {
        await bus.publish({
          topic: 'test.event',
          timestamp: '2026-01-01T00:00:00Z',
          source: 'test',
          severity: 'info',
          summary: `Test ${i}`,
          details: {},
          project: 'test',
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      const deadLetters = bus.getDeadLetters();
      expect(deadLetters.length).toBeLessThanOrEqual(100);

      consoleSpy.mockRestore();
    });

    it('clears dead letter queue', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failingHandler = vi.fn().mockRejectedValue(new Error('Failed'));

      bus.subscribe('test.event', failingHandler);

      await bus.publish({
        topic: 'test.event',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'test',
        severity: 'info',
        summary: 'Test',
        details: {},
        project: 'test',
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(bus.getDeadLetters()).toHaveLength(1);

      bus.clearDeadLetters();
      expect(bus.getDeadLetters()).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  describe('subscriberCount', () => {
    it('returns correct count', () => {
      expect(bus.subscriberCount).toBe(0);

      bus.subscribe('test.event', vi.fn());
      expect(bus.subscriberCount).toBe(1);

      bus.subscribe('other.event', vi.fn());
      expect(bus.subscriberCount).toBe(2);

      bus.subscribe('test.event', vi.fn());
      expect(bus.subscriberCount).toBe(3);
    });
  });

  describe('destroy', () => {
    it('removes all subscribers', () => {
      bus.subscribe('test.event', vi.fn());
      bus.subscribe('other.event', vi.fn());

      expect(bus.subscriberCount).toBe(2);

      bus.destroy();

      expect(bus.subscriberCount).toBe(0);
    });

    it('clears dead letter queue', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failingHandler = vi.fn().mockRejectedValue(new Error('Failed'));

      bus.subscribe('test.event', failingHandler);

      await bus.publish({
        topic: 'test.event',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'test',
        severity: 'info',
        summary: 'Test',
        details: {},
        project: 'test',
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(bus.getDeadLetters()).toHaveLength(1);

      bus.destroy();

      expect(bus.getDeadLetters()).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('failed handler does not crash other subscribers', async () => {
      const handler1 = vi.fn().mockRejectedValue(new Error('Handler 1 failed'));
      const handler2 = vi.fn().mockResolvedValue(undefined);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      bus.subscribe('test.event', handler1);
      bus.subscribe('test.event', handler2);

      await bus.publish({
        topic: 'test.event',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'test',
        severity: 'info',
        summary: 'Test',
        details: {},
        project: 'test',
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });
});
