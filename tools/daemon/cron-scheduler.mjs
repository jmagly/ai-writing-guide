import { EventEmitter } from 'events';

export class CronScheduler extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.intervals = new Map();
    this.lastFires = new Map();
  }

  start() {
    if (!this.config.enabled) {
      return;
    }

    for (const job of this.config.jobs) {
      this.scheduleJob(job);
    }
  }

  scheduleJob(job) {
    const interval = setInterval(() => {
      const now = new Date();
      if (this.cronMatches(job.cron, now)) {
        const lastFire = this.lastFires.get(job.id);
        if (!lastFire || now - lastFire > 60000) {
          this.lastFires.set(job.id, now);
          this.emit('event', {
            source: 'schedule',
            type: 'cron.fired',
            payload: {
              job_id: job.id,
              action: job.action
            }
          });
        }
      }
    }, 60000);

    this.intervals.set(job.id, interval);
  }

  cronMatches(cronExpression, date) {
    const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(' ');

    const currentMinute = date.getUTCMinutes();
    const currentHour = date.getUTCHours();
    const currentDayOfMonth = date.getUTCDate();
    const currentMonth = date.getUTCMonth() + 1;
    const currentDayOfWeek = date.getUTCDay();

    if (!this.matchesField(minute, currentMinute, 0, 59)) return false;
    if (!this.matchesField(hour, currentHour, 0, 23)) return false;
    if (!this.matchesField(dayOfMonth, currentDayOfMonth, 1, 31)) return false;
    if (!this.matchesField(month, currentMonth, 1, 12)) return false;
    if (!this.matchesField(dayOfWeek, currentDayOfWeek, 0, 6)) return false;

    return true;
  }

  matchesField(field, value, min, max) {
    if (field === '*') return true;

    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepValue = parseInt(step, 10);
      if (range === '*') {
        return value % stepValue === 0;
      }
    }

    if (field.includes('-')) {
      const [start, end] = field.split('-').map(n => parseInt(n, 10));
      return value >= start && value <= end;
    }

    if (field.includes(',')) {
      const values = field.split(',').map(n => parseInt(n, 10));
      return values.includes(value);
    }

    return parseInt(field, 10) === value;
  }

  stop() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }

  getStats() {
    return {
      enabled: this.config.enabled,
      jobs: this.config.jobs.length,
      last_fires: Object.fromEntries(
        Array.from(this.lastFires.entries()).map(([id, date]) => [id, date.toISOString()])
      )
    };
  }
}

export default CronScheduler;
