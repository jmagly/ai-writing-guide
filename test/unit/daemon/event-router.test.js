import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventRouter } from '../../../tools/daemon/event-router.mjs';

describe('EventRouter', () => {
  let router;

  beforeEach(() => {
    vi.useFakeTimers();
    router = new EventRouter();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('route', () => {
    it('should add events to history with timestamp', () => {
      const mockDate = new Date('2026-02-08T12:00:00Z');
      vi.setSystemTime(mockDate);

      const event = { source: 'watch', type: 'file.modify', payload: { path: '/test.md' } };
      router.route(event);

      expect(router.eventHistory).toHaveLength(1);
      expect(router.eventHistory[0]).toEqual({
        ...event,
        timestamp: '2026-02-08T12:00:00.000Z'
      });
    });

    it('should emit event', () => {
      const eventSpy = vi.fn();
      router.on('event', eventSpy);

      const event = { source: 'watch', type: 'file.modify', payload: { path: '/test.md' } };
      router.route(event);

      expect(eventSpy).toHaveBeenCalledWith(event);
    });

    it('should trim history at 1000 events', () => {
      for (let i = 0; i < 1100; i++) {
        router.route({ source: 'test', type: 'event', payload: { index: i } });
      }

      expect(router.eventHistory).toHaveLength(1000);
      expect(router.eventHistory[0].payload.index).toBe(100);
      expect(router.eventHistory[999].payload.index).toBe(1099);
    });

    it('should handle multiple different events', () => {
      const events = [
        { source: 'watch', type: 'file.create', payload: { path: '/new.md' } },
        { source: 'schedule', type: 'cron.fired', payload: { job_id: 'test' } },
        { source: 'webhook', type: 'http.request', payload: { path: '/ci' } }
      ];

      for (const event of events) {
        router.route(event);
      }

      expect(router.eventHistory).toHaveLength(3);
      expect(router.eventHistory.map(e => e.type)).toEqual([
        'file.create',
        'cron.fired',
        'http.request'
      ]);
    });
  });

  describe('handleFailedEvent', () => {
    it('should add to dead letter queue after max retries', () => {
      const mockDate = new Date('2026-02-08T12:00:00Z');
      vi.setSystemTime(mockDate);

      const event = { source: 'test', type: 'action', payload: { id: 1 } };
      const error = new Error('Test error');

      router.handleFailedEvent(event, error, 3);

      expect(router.deadLetterQueue).toHaveLength(1);
      expect(router.deadLetterQueue[0]).toEqual({
        event,
        error: 'Test error',
        attempts: 3,
        timestamp: '2026-02-08T12:00:00.000Z'
      });
    });

    it('should emit event-failed when max retries reached', () => {
      const failedSpy = vi.fn();
      router.on('event-failed', failedSpy);

      const event = { source: 'test', type: 'action', payload: { id: 1 } };
      const error = new Error('Test error');

      router.handleFailedEvent(event, error, 3);

      expect(failedSpy).toHaveBeenCalledWith({ event, error });
    });

    it('should trim dead letter queue at 100 items', () => {
      const error = new Error('Test error');

      for (let i = 0; i < 110; i++) {
        const event = { source: 'test', type: 'action', payload: { index: i } };
        router.handleFailedEvent(event, error, 3);
      }

      expect(router.deadLetterQueue).toHaveLength(100);
      expect(router.deadLetterQueue[0].event.payload.index).toBe(10);
      expect(router.deadLetterQueue[99].event.payload.index).toBe(109);
    });

    it('should retry with exponential backoff when under max retries', () => {
      const event = { source: 'test', type: 'action', payload: { id: 1 } };
      const error = new Error('Test error');

      router.handleFailedEvent(event, error, 0);

      expect(router.deadLetterQueue).toHaveLength(0);

      vi.advanceTimersByTime(1000);
      expect(router.deadLetterQueue).toHaveLength(0);

      vi.advanceTimersByTime(2000);
      expect(router.deadLetterQueue).toHaveLength(0);

      vi.advanceTimersByTime(4000);
      expect(router.deadLetterQueue).toHaveLength(1);
    });

    it('should handle multiple failed events independently', () => {
      const error = new Error('Test error');

      for (let i = 0; i < 5; i++) {
        const event = { source: 'test', type: 'action', payload: { index: i } };
        router.handleFailedEvent(event, error, 3);
      }

      expect(router.deadLetterQueue).toHaveLength(5);
    });
  });

  describe('getEventHistory', () => {
    it('should return last N events with default limit of 50', () => {
      for (let i = 0; i < 100; i++) {
        router.route({ source: 'test', type: 'event', payload: { index: i } });
      }

      const history = router.getEventHistory();

      expect(history).toHaveLength(50);
      expect(history[0].payload.index).toBe(50);
      expect(history[49].payload.index).toBe(99);
    });

    it('should respect custom limit parameter', () => {
      for (let i = 0; i < 100; i++) {
        router.route({ source: 'test', type: 'event', payload: { index: i } });
      }

      const history = router.getEventHistory(10);

      expect(history).toHaveLength(10);
      expect(history[0].payload.index).toBe(90);
      expect(history[9].payload.index).toBe(99);
    });

    it('should return all events when limit exceeds history size', () => {
      for (let i = 0; i < 20; i++) {
        router.route({ source: 'test', type: 'event', payload: { index: i } });
      }

      const history = router.getEventHistory(100);

      expect(history).toHaveLength(20);
    });

    it('should return empty array when history is empty', () => {
      const history = router.getEventHistory();
      expect(history).toEqual([]);
    });
  });

  describe('getDeadLetterQueue', () => {
    it('should return copy of dead letter queue', () => {
      const event = { source: 'test', type: 'action', payload: { id: 1 } };
      const error = new Error('Test error');

      router.handleFailedEvent(event, error, 3);

      const dlq = router.getDeadLetterQueue();

      expect(dlq).toHaveLength(1);
      expect(dlq[0].event).toEqual(event);

      dlq.push({ event: {}, error: 'new', attempts: 0, timestamp: '' });

      expect(router.deadLetterQueue).toHaveLength(1);
    });

    it('should return empty array when queue is empty', () => {
      const dlq = router.getDeadLetterQueue();
      expect(dlq).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('should clear all event history', () => {
      for (let i = 0; i < 50; i++) {
        router.route({ source: 'test', type: 'event', payload: { index: i } });
      }

      expect(router.eventHistory).toHaveLength(50);

      router.clearHistory();

      expect(router.eventHistory).toEqual([]);
    });

    it('should allow new events after clearing', () => {
      router.route({ source: 'test', type: 'event', payload: { id: 1 } });
      router.clearHistory();
      router.route({ source: 'test', type: 'event', payload: { id: 2 } });

      expect(router.eventHistory).toHaveLength(1);
      expect(router.eventHistory[0].payload.id).toBe(2);
    });
  });

  describe('clearDeadLetterQueue', () => {
    it('should clear all dead letter queue items', () => {
      const error = new Error('Test error');

      for (let i = 0; i < 10; i++) {
        const event = { source: 'test', type: 'action', payload: { index: i } };
        router.handleFailedEvent(event, error, 3);
      }

      expect(router.deadLetterQueue).toHaveLength(10);

      router.clearDeadLetterQueue();

      expect(router.deadLetterQueue).toEqual([]);
    });

    it('should allow new failed events after clearing', () => {
      const error = new Error('Test error');
      const event1 = { source: 'test', type: 'action', payload: { id: 1 } };
      const event2 = { source: 'test', type: 'action', payload: { id: 2 } };

      router.handleFailedEvent(event1, error, 3);
      router.clearDeadLetterQueue();
      router.handleFailedEvent(event2, error, 3);

      expect(router.deadLetterQueue).toHaveLength(1);
      expect(router.deadLetterQueue[0].event.payload.id).toBe(2);
    });
  });

  describe('maxRetries configuration', () => {
    it('should use default maxRetries of 3', () => {
      expect(router.maxRetries).toBe(3);
    });

    it('should respect maxRetries in retry logic', () => {
      const event = { source: 'test', type: 'action', payload: { id: 1 } };
      const error = new Error('Test error');

      router.handleFailedEvent(event, error, 0);
      expect(router.deadLetterQueue).toHaveLength(0);

      router.handleFailedEvent(event, error, 1);
      expect(router.deadLetterQueue).toHaveLength(0);

      router.handleFailedEvent(event, error, 2);
      expect(router.deadLetterQueue).toHaveLength(0);

      router.handleFailedEvent(event, error, 3);
      expect(router.deadLetterQueue).toHaveLength(1);
    });
  });
});
