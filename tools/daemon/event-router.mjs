import { EventEmitter } from 'events';

export class EventRouter extends EventEmitter {
  constructor() {
    super();
    this.eventHistory = [];
    this.deadLetterQueue = [];
    this.maxRetries = 3;
  }

  route(event) {
    this.eventHistory.push({
      ...event,
      timestamp: new Date().toISOString()
    });

    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }

    this.emit('event', event);
  }

  handleFailedEvent(event, error, attemptCount = 0) {
    if (attemptCount >= this.maxRetries) {
      this.deadLetterQueue.push({
        event,
        error: error.message,
        attempts: attemptCount,
        timestamp: new Date().toISOString()
      });

      if (this.deadLetterQueue.length > 100) {
        this.deadLetterQueue = this.deadLetterQueue.slice(-100);
      }

      this.emit('event-failed', { event, error });
    } else {
      setTimeout(() => {
        this.handleFailedEvent(event, error, attemptCount + 1);
      }, Math.pow(2, attemptCount) * 1000);
    }
  }

  getEventHistory(limit = 50) {
    return this.eventHistory.slice(-limit);
  }

  getDeadLetterQueue() {
    return [...this.deadLetterQueue];
  }

  clearHistory() {
    this.eventHistory = [];
  }

  clearDeadLetterQueue() {
    this.deadLetterQueue = [];
  }
}

export default EventRouter;
