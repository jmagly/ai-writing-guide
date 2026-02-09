/**
 * Typed internal event bus for AIWG messaging subsystem.
 *
 * Connects AIWG lifecycle event producers (Ralph orchestrator, HITL gates,
 * security auditor) to messaging consumers (platform adapters) without
 * requiring an external message broker.
 *
 * @implements @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md
 */

import { EventEmitter } from 'events';

/**
 * @typedef {Object} AiwgEvent
 * @property {string} topic - Event topic (e.g., "ralph.completed")
 * @property {string} timestamp - ISO-8601 timestamp
 * @property {string} source - Event source (e.g., "ralph-orchestrator")
 * @property {string} [loopId] - Ralph loop ID if applicable
 * @property {string} [gateId] - Gate ID if applicable
 * @property {'info'|'warning'|'critical'} severity
 * @property {string} summary - One-line human-readable summary
 * @property {Record<string, unknown>} details - Event-specific payload
 * @property {string} project - Project root basename
 */

export class EventBus {
  /** @type {EventEmitter} */
  #emitter;

  /** @type {Map<string, Function[]>} */
  #subscribers;

  /** @type {Array<{event: AiwgEvent, error: Error, handler: string}>} */
  #deadLetterQueue;

  /** @type {number} */
  #maxRetries;

  /** @type {number} */
  #maxDeadLetters;

  constructor({ maxRetries = 3, maxDeadLetters = 100 } = {}) {
    this.#emitter = new EventEmitter();
    this.#emitter.setMaxListeners(50);
    this.#subscribers = new Map();
    this.#deadLetterQueue = [];
    this.#maxRetries = maxRetries;
    this.#maxDeadLetters = maxDeadLetters;
  }

  /**
   * Subscribe to events matching a topic pattern.
   * Supports exact match ("ralph.completed") and wildcard ("ralph.*").
   *
   * @param {string} pattern - Topic or wildcard pattern
   * @param {(event: AiwgEvent) => Promise<void>} handler
   * @param {string} [name] - Handler name for debugging
   */
  subscribe(pattern, handler, name) {
    const handlerName = name || handler.name || 'anonymous';
    const wrappedHandler = async (event) => {
      if (!this.#matchesPattern(event.topic, pattern)) return;

      let lastError;
      for (let attempt = 1; attempt <= this.#maxRetries; attempt++) {
        try {
          await handler(event);
          return;
        } catch (error) {
          lastError = error;
          if (attempt < this.#maxRetries) {
            // Brief delay before retry
            await new Promise(r => setTimeout(r, 100 * attempt));
          }
        }
      }

      // All retries exhausted — send to dead letter queue
      this.#addToDeadLetter(event, lastError, handlerName);
    };

    if (!this.#subscribers.has(pattern)) {
      this.#subscribers.set(pattern, []);
    }
    this.#subscribers.get(pattern).push(wrappedHandler);
    this.#emitter.on('event', wrappedHandler);
  }

  /**
   * Publish an event to all matching subscribers.
   *
   * @param {AiwgEvent} event
   */
  publish(event) {
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }
    this.#emitter.emit('event', event);
  }

  /**
   * Remove all subscribers for a pattern.
   *
   * @param {string} pattern
   */
  unsubscribe(pattern) {
    const handlers = this.#subscribers.get(pattern);
    if (handlers) {
      for (const handler of handlers) {
        this.#emitter.removeListener('event', handler);
      }
      this.#subscribers.delete(pattern);
    }
  }

  /**
   * Get the dead letter queue contents.
   *
   * @returns {Array<{event: AiwgEvent, error: Error, handler: string, timestamp: string}>}
   */
  getDeadLetters() {
    return [...this.#deadLetterQueue];
  }

  /**
   * Clear the dead letter queue.
   */
  clearDeadLetters() {
    this.#deadLetterQueue.length = 0;
  }

  /**
   * Get subscriber count.
   *
   * @returns {number}
   */
  get subscriberCount() {
    let count = 0;
    for (const handlers of this.#subscribers.values()) {
      count += handlers.length;
    }
    return count;
  }

  /**
   * Remove all subscribers and clear state.
   */
  destroy() {
    this.#emitter.removeAllListeners();
    this.#subscribers.clear();
    this.#deadLetterQueue.length = 0;
  }

  /**
   * Check if a topic matches a subscription pattern.
   * Supports: exact match, single wildcard ("ralph.*"), double wildcard ("*")
   *
   * @param {string} topic
   * @param {string} pattern
   * @returns {boolean}
   */
  #matchesPattern(topic, pattern) {
    if (pattern === '*') return true;
    if (pattern === topic) return true;

    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return topic.startsWith(prefix + '.');
    }

    return false;
  }

  /**
   * Add a failed event to the dead letter queue.
   *
   * @param {AiwgEvent} event
   * @param {Error} error
   * @param {string} handlerName
   */
  #addToDeadLetter(event, error, handlerName) {
    this.#deadLetterQueue.push({
      event,
      error: { message: error.message, stack: error.stack },
      handler: handlerName,
      timestamp: new Date().toISOString(),
    });

    // Evict oldest entries if over capacity
    while (this.#deadLetterQueue.length > this.#maxDeadLetters) {
      this.#deadLetterQueue.shift();
    }

    // Log but don't throw — messaging failures must not crash the daemon
    console.error(
      `[EventBus] Handler "${handlerName}" failed after ${this.#maxRetries} retries for topic "${event.topic}": ${error.message}`
    );
  }
}
