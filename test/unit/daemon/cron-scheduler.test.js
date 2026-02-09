import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CronScheduler } from '../../../tools/daemon/cron-scheduler.mjs';

describe('CronScheduler', () => {
  let scheduler;
  let mockConfig;

  beforeEach(() => {
    vi.useFakeTimers();
    mockConfig = {
      enabled: true,
      jobs: [
        { id: 'test-job', cron: '0 */6 * * *', action: 'doctor' },
        { id: 'daily-job', cron: '0 9 * * 1', action: 'validate-metadata' }
      ]
    };
    scheduler = new CronScheduler(mockConfig);
  });

  afterEach(() => {
    scheduler.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('cronMatches', () => {
    it('should match wildcard patterns', () => {
      const cronExpression = '* * * * *';
      const testDates = [
        new Date('2026-02-08T12:34:56Z'),
        new Date('2026-05-15T23:59:00Z'),
        new Date('2026-01-01T00:00:00Z')
      ];

      for (const date of testDates) {
        expect(scheduler.cronMatches(cronExpression, date)).toBe(true);
      }
    });

    it('should match exact values', () => {
      // Feb 8, 2026 is a Sunday (day-of-week 0)
      const cronExpression = '30 14 8 2 0';
      const matchingDate = new Date('2026-02-08T14:30:00Z');
      const nonMatchingDate = new Date('2026-02-08T14:31:00Z');

      expect(scheduler.cronMatches(cronExpression, matchingDate)).toBe(true);
      expect(scheduler.cronMatches(cronExpression, nonMatchingDate)).toBe(false);
    });

    it('should match step patterns', () => {
      const cronExpression = '*/15 * * * *';

      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-08T12:00:00Z'))).toBe(true);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-08T12:15:00Z'))).toBe(true);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-08T12:30:00Z'))).toBe(true);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-08T12:45:00Z'))).toBe(true);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-08T12:10:00Z'))).toBe(false);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-08T12:17:00Z'))).toBe(false);
    });

    it('should match range patterns', () => {
      const cronExpression = '0 9-17 * * *';

      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-08T09:00:00Z'))).toBe(true);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-08T12:00:00Z'))).toBe(true);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-08T17:00:00Z'))).toBe(true);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-08T08:00:00Z'))).toBe(false);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-08T18:00:00Z'))).toBe(false);
    });

    it('should match list patterns', () => {
      const cronExpression = '0 0 * * 1,3,5';

      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-02T00:00:00Z'))).toBe(true);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-04T00:00:00Z'))).toBe(true);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-06T00:00:00Z'))).toBe(true);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-01T00:00:00Z'))).toBe(false);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-03T00:00:00Z'))).toBe(false);
    });

    it('should match complex patterns', () => {
      const cronExpression = '*/10 9-17 * * 1-5';
      const workdayHourTenMinuteInterval = new Date('2026-02-09T14:20:00Z');
      const workdayOffHour = new Date('2026-02-09T18:00:00Z');
      const weekend = new Date('2026-02-08T14:20:00Z');

      expect(scheduler.cronMatches(cronExpression, workdayHourTenMinuteInterval)).toBe(true);
      expect(scheduler.cronMatches(cronExpression, workdayOffHour)).toBe(false);
      expect(scheduler.cronMatches(cronExpression, weekend)).toBe(false);
    });

    it('should handle month boundaries correctly', () => {
      const cronExpression = '0 0 1 * *';

      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-01T00:00:00Z'))).toBe(true);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-03-01T00:00:00Z'))).toBe(true);
      expect(scheduler.cronMatches(cronExpression, new Date('2026-02-02T00:00:00Z'))).toBe(false);
    });

    it('should handle day of week 0 (Sunday)', () => {
      const cronExpression = '0 0 * * 0';
      const sunday = new Date('2026-02-08T00:00:00Z');
      const monday = new Date('2026-02-09T00:00:00Z');

      expect(scheduler.cronMatches(cronExpression, sunday)).toBe(true);
      expect(scheduler.cronMatches(cronExpression, monday)).toBe(false);
    });
  });

  describe('matchesField', () => {
    it('should match wildcard', () => {
      expect(scheduler.matchesField('*', 15, 0, 59)).toBe(true);
      expect(scheduler.matchesField('*', 0, 0, 59)).toBe(true);
      expect(scheduler.matchesField('*', 59, 0, 59)).toBe(true);
    });

    it('should match exact values', () => {
      expect(scheduler.matchesField('15', 15, 0, 59)).toBe(true);
      expect(scheduler.matchesField('15', 14, 0, 59)).toBe(false);
      expect(scheduler.matchesField('0', 0, 0, 23)).toBe(true);
    });

    it('should match step patterns with wildcard base', () => {
      expect(scheduler.matchesField('*/5', 0, 0, 59)).toBe(true);
      expect(scheduler.matchesField('*/5', 5, 0, 59)).toBe(true);
      expect(scheduler.matchesField('*/5', 10, 0, 59)).toBe(true);
      expect(scheduler.matchesField('*/5', 15, 0, 59)).toBe(true);
      expect(scheduler.matchesField('*/5', 3, 0, 59)).toBe(false);
      expect(scheduler.matchesField('*/5', 7, 0, 59)).toBe(false);
    });

    it('should match range patterns', () => {
      expect(scheduler.matchesField('10-20', 10, 0, 59)).toBe(true);
      expect(scheduler.matchesField('10-20', 15, 0, 59)).toBe(true);
      expect(scheduler.matchesField('10-20', 20, 0, 59)).toBe(true);
      expect(scheduler.matchesField('10-20', 9, 0, 59)).toBe(false);
      expect(scheduler.matchesField('10-20', 21, 0, 59)).toBe(false);
    });

    it('should match list patterns', () => {
      expect(scheduler.matchesField('1,15,30', 1, 0, 59)).toBe(true);
      expect(scheduler.matchesField('1,15,30', 15, 0, 59)).toBe(true);
      expect(scheduler.matchesField('1,15,30', 30, 0, 59)).toBe(true);
      expect(scheduler.matchesField('1,15,30', 2, 0, 59)).toBe(false);
      expect(scheduler.matchesField('1,15,30', 14, 0, 59)).toBe(false);
    });
  });

  describe('start and stop', () => {
    it('should not start when disabled', () => {
      const disabledConfig = { enabled: false, jobs: [] };
      const disabledScheduler = new CronScheduler(disabledConfig);

      disabledScheduler.start();

      expect(disabledScheduler.intervals.size).toBe(0);
    });

    it('should start intervals for all jobs', () => {
      scheduler.start();

      expect(scheduler.intervals.size).toBe(2);
      expect(scheduler.intervals.has('test-job')).toBe(true);
      expect(scheduler.intervals.has('daily-job')).toBe(true);
    });

    it('should clear all intervals on stop', () => {
      scheduler.start();
      expect(scheduler.intervals.size).toBe(2);

      scheduler.stop();

      expect(scheduler.intervals.size).toBe(0);
    });

    it('should emit events when cron expression matches', () => {
      const eventSpy = vi.fn();
      scheduler.on('event', eventSpy);

      // Set time 1 minute before match so interval fires AT 12:00:00
      vi.setSystemTime(new Date('2026-02-08T11:59:00Z'));

      scheduler.start();

      vi.advanceTimersByTime(60000);

      expect(eventSpy).toHaveBeenCalledWith({
        source: 'schedule',
        type: 'cron.fired',
        payload: { job_id: 'test-job', action: 'doctor' }
      });
    });

    it('should not emit events within 60 seconds of last fire', () => {
      const eventSpy = vi.fn();
      // Use a cron that matches every minute so we can test de-duplication
      const everyMinuteConfig = {
        enabled: true,
        jobs: [{ id: 'every-min', cron: '* * * * *', action: 'test' }]
      };
      const everyMinScheduler = new CronScheduler(everyMinuteConfig);
      everyMinScheduler.on('event', eventSpy);

      vi.setSystemTime(new Date('2026-02-08T12:00:00Z'));

      everyMinScheduler.start();

      // First fire at 12:01:00
      vi.advanceTimersByTime(60000);
      expect(eventSpy).toHaveBeenCalledTimes(1);

      // 30s later at 12:01:30 — within 60s of last fire, should not fire
      vi.advanceTimersByTime(30000);
      expect(eventSpy).toHaveBeenCalledTimes(1);

      // 30s later at 12:02:00 — another interval tick, but only 60s since last fire (not > 60s)
      vi.advanceTimersByTime(30000);
      expect(eventSpy).toHaveBeenCalledTimes(1);

      everyMinScheduler.stop();
    });

    it('should track last fire times', () => {
      // Set time 1 minute before match so interval fires AT 12:00:00
      vi.setSystemTime(new Date('2026-02-08T11:59:00Z'));

      scheduler.start();
      vi.advanceTimersByTime(60000);

      const expectedFireTime = new Date('2026-02-08T12:00:00Z');
      expect(scheduler.lastFires.has('test-job')).toBe(true);
      expect(scheduler.lastFires.get('test-job')).toEqual(expectedFireTime);
    });

    it('should not fire when cron expression does not match', () => {
      const eventSpy = vi.fn();
      scheduler.on('event', eventSpy);

      const nonMatchingDate = new Date('2026-02-08T11:30:00Z');
      vi.setSystemTime(nonMatchingDate);

      scheduler.start();
      vi.advanceTimersByTime(60000);

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return correct stats structure', () => {
      const stats = scheduler.getStats();

      expect(stats).toEqual({
        enabled: true,
        jobs: 2,
        last_fires: {}
      });
    });

    it('should include last fire times in ISO format', () => {
      // Set time 1 minute before match so interval fires AT 12:00:00
      vi.setSystemTime(new Date('2026-02-08T11:59:00Z'));

      scheduler.start();
      vi.advanceTimersByTime(60000);

      const stats = scheduler.getStats();

      expect(stats.last_fires).toEqual({
        'test-job': '2026-02-08T12:00:00.000Z'
      });
    });

    it('should reflect disabled state', () => {
      const disabledScheduler = new CronScheduler({ enabled: false, jobs: [] });
      const stats = disabledScheduler.getStats();

      expect(stats.enabled).toBe(false);
      expect(stats.jobs).toBe(0);
    });

    it('should show correct job count', () => {
      const manyJobsConfig = {
        enabled: true,
        jobs: [
          { id: 'job1', cron: '* * * * *', action: 'action1' },
          { id: 'job2', cron: '* * * * *', action: 'action2' },
          { id: 'job3', cron: '* * * * *', action: 'action3' }
        ]
      };
      const manyJobsScheduler = new CronScheduler(manyJobsConfig);
      const stats = manyJobsScheduler.getStats();

      expect(stats.jobs).toBe(3);
    });

    it('should handle multiple job fires', () => {
      const multiJobConfig = {
        enabled: true,
        jobs: [
          { id: 'job1', cron: '0 12 * * *', action: 'action1' },
          { id: 'job2', cron: '0 12 * * *', action: 'action2' }
        ]
      };
      const multiJobScheduler = new CronScheduler(multiJobConfig);

      // Set time 1 minute before match so interval fires AT 12:00:00
      vi.setSystemTime(new Date('2026-02-08T11:59:00Z'));

      multiJobScheduler.start();
      vi.advanceTimersByTime(60000);

      const stats = multiJobScheduler.getStats();

      expect(stats.last_fires).toEqual({
        'job1': '2026-02-08T12:00:00.000Z',
        'job2': '2026-02-08T12:00:00.000Z'
      });

      multiJobScheduler.stop();
    });
  });

  describe('edge cases', () => {
    it('should handle jobs with same cron expression', () => {
      const eventSpy = vi.fn();
      const sameTimeConfig = {
        enabled: true,
        jobs: [
          { id: 'job1', cron: '0 12 * * *', action: 'action1' },
          { id: 'job2', cron: '0 12 * * *', action: 'action2' }
        ]
      };
      const sameTimeScheduler = new CronScheduler(sameTimeConfig);
      sameTimeScheduler.on('event', eventSpy);

      // Set time 1 minute before match so interval fires AT 12:00:00
      vi.setSystemTime(new Date('2026-02-08T11:59:00Z'));

      sameTimeScheduler.start();
      vi.advanceTimersByTime(60000);

      expect(eventSpy).toHaveBeenCalledTimes(2);

      sameTimeScheduler.stop();
    });

    it('should handle empty jobs array', () => {
      const emptyScheduler = new CronScheduler({ enabled: true, jobs: [] });

      emptyScheduler.start();

      expect(emptyScheduler.intervals.size).toBe(0);
    });

    it('should allow fire after 60+ seconds', () => {
      const eventSpy = vi.fn();
      // Use a cron that matches every minute so we can test re-fire
      const everyMinuteConfig = {
        enabled: true,
        jobs: [{ id: 'every-min', cron: '* * * * *', action: 'test' }]
      };
      const everyMinScheduler = new CronScheduler(everyMinuteConfig);
      everyMinScheduler.on('event', eventSpy);

      vi.setSystemTime(new Date('2026-02-08T12:00:00Z'));

      everyMinScheduler.start();

      // First fire at 12:01:00
      vi.advanceTimersByTime(60000);
      expect(eventSpy).toHaveBeenCalledTimes(1);

      // Advance 2 full intervals (120s) to ensure > 60s since last fire
      vi.advanceTimersByTime(120000);
      expect(eventSpy).toHaveBeenCalledTimes(2);

      everyMinScheduler.stop();
    });
  });
});
