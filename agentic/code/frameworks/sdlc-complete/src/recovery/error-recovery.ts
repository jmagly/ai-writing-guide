/**
 * @file error-recovery.ts
 * @description Automated error recovery and resilience system
 *
 * Implements F-012/UC-012: Error Recovery
 * - Automatic error detection and classification
 * - Recovery strategy execution
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Graceful degradation
 * - Error reporting and logging
 *
 * @implements NFR-RECOV-001: Recovery time <30s for transient errors
 * @implements NFR-RECOV-002: 95% automatic recovery success rate
 * @implements NFR-RECOV-003: Zero data loss during recovery
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ErrorSeverity = 'transient' | 'recoverable' | 'critical';
export type RecoveryStrategy = 'retry' | 'fallback' | 'circuit-breaker' | 'restart' | 'manual';

export interface RecoverableError {
  timestamp: Date;
  error: Error;
  severity: ErrorSeverity;
  context: Record<string, any>;
  stackTrace?: string;
}

export interface RecoveryAttempt {
  timestamp: Date;
  strategy: RecoveryStrategy;
  success: boolean;
  duration: number; // ms
  error?: string;
}

export interface RecoveryResult {
  recovered: boolean;
  attempts: RecoveryAttempt[];
  finalStrategy?: RecoveryStrategy;
  totalDuration: number;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

export interface ErrorRecoveryConfig {
  maxRetries?: number;
  retryDelay?: number; // ms
  exponentialBackoff?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number; // ms
  fallbackEnabled?: boolean;
}

// ============================================================================
// Error Recovery Class
// ============================================================================

export class ErrorRecoverySystem extends EventEmitter {
  private config: Required<ErrorRecoveryConfig>;
  private errorHistory: RecoverableError[];
  private circuitBreakers: Map<string, CircuitBreakerState>;

  constructor(config: ErrorRecoveryConfig = {}) {
    super();

    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      exponentialBackoff: config.exponentialBackoff !== false,
      circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 60000,
      fallbackEnabled: config.fallbackEnabled !== false
    };

    this.errorHistory = [];
    this.circuitBreakers = new Map();
  }

  // ========================================================================
  // Recovery Methods
  // ========================================================================

  /**
   * Attempt to recover from an error
   */
  public async recover<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    const attempts: RecoveryAttempt[] = [];

    try {
      // Check circuit breaker
      const circuitKey = context?.operation || 'default';
      if (this.isCircuitOpen(circuitKey)) {
        throw new Error('Circuit breaker is OPEN');
      }

      // Try main operation with retries
      const result = await this.retryWithBackoff(operation, attempts);
      this.recordSuccess(circuitKey);
      return result;

    } catch (error) {
      const circuitKey = context?.operation || 'default';
      this.recordFailure(circuitKey);

      // Log error
      this.logError(error as Error, context);

      // Try fallback if available
      if (fallback && this.config.fallbackEnabled) {
        try {
          const fallbackResult = await fallback();

          attempts.push({
            timestamp: new Date(),
            strategy: 'fallback',
            success: true,
            duration: Date.now() - startTime
          });

          this.emit('recovered', {
            recovered: true,
            attempts,
            finalStrategy: 'fallback',
            totalDuration: Date.now() - startTime
          });

          return fallbackResult;
        } catch (fallbackError) {
          attempts.push({
            timestamp: new Date(),
            strategy: 'fallback',
            success: false,
            duration: Date.now() - startTime,
            error: (fallbackError as Error).message
          });
        }
      }

      // Recovery failed
      this.emit('failed', {
        recovered: false,
        attempts,
        totalDuration: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    attempts: RecoveryAttempt[]
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const attemptStart = Date.now();

      try {
        const result = await operation();

        attempts.push({
          timestamp: new Date(),
          strategy: 'retry',
          success: true,
          duration: Date.now() - attemptStart
        });

        return result;

      } catch (error) {
        lastError = error as Error;

        attempts.push({
          timestamp: new Date(),
          strategy: 'retry',
          success: false,
          duration: Date.now() - attemptStart,
          error: lastError.message
        });

        // Don't retry on last attempt
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    if (!this.config.exponentialBackoff) {
      return this.config.retryDelay;
    }

    return this.config.retryDelay * Math.pow(2, attempt);
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================================================
  // Circuit Breaker Methods
  // ========================================================================

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(key: string): boolean {
    const state = this.circuitBreakers.get(key);

    if (!state) {
      return false;
    }

    if (state.state === 'closed') {
      return false;
    }

    if (state.state === 'open') {
      // Check if timeout has elapsed
      if (state.nextAttemptTime && new Date() >= state.nextAttemptTime) {
        this.setCircuitState(key, 'half-open');
        return false;
      }
      return true;
    }

    return false; // half-open allows one attempt
  }

  /**
   * Record successful operation
   */
  private recordSuccess(key: string): void {
    const state = this.circuitBreakers.get(key);

    if (state && state.state === 'half-open') {
      this.setCircuitState(key, 'closed');
    }

    if (state) {
      state.failures = 0;
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(key: string): void {
    let state = this.circuitBreakers.get(key);

    if (!state) {
      state = {
        state: 'closed',
        failures: 0
      };
      this.circuitBreakers.set(key, state);
    }

    state.failures++;
    state.lastFailureTime = new Date();

    if (state.failures >= this.config.circuitBreakerThreshold) {
      this.openCircuit(key);
    }
  }

  /**
   * Open circuit breaker
   */
  private openCircuit(key: string): void {
    const nextAttemptTime = new Date();
    nextAttemptTime.setTime(nextAttemptTime.getTime() + this.config.circuitBreakerTimeout);

    this.setCircuitState(key, 'open', nextAttemptTime);

    this.emit('circuitOpened', {
      key,
      failures: this.circuitBreakers.get(key)?.failures,
      nextAttemptTime
    });
  }

  /**
   * Set circuit breaker state
   */
  private setCircuitState(key: string, state: 'closed' | 'open' | 'half-open', nextAttemptTime?: Date): void {
    const circuitState = this.circuitBreakers.get(key) || {
      state: 'closed',
      failures: 0
    };

    circuitState.state = state;
    if (nextAttemptTime) {
      circuitState.nextAttemptTime = nextAttemptTime;
    }

    this.circuitBreakers.set(key, circuitState);
  }

  /**
   * Get circuit breaker state
   */
  public getCircuitState(key: string): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(key);
  }

  /**
   * Reset circuit breaker
   */
  public resetCircuit(key: string): void {
    this.circuitBreakers.delete(key);
  }

  // ========================================================================
  // Error Classification
  // ========================================================================

  /**
   * Classify error severity
   */
  public classifyError(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();

    // Transient errors (network, timeouts)
    if (message.includes('timeout') ||
        message.includes('network') ||
        message.includes('econnrefused') ||
        message.includes('enotfound')) {
      return 'transient';
    }

    // Critical errors (data corruption, system failures)
    if (message.includes('corrupt') ||
        message.includes('out of memory') ||
        message.includes('segfault')) {
      return 'critical';
    }

    // Default to recoverable
    return 'recoverable';
  }

  // ========================================================================
  // Logging and Monitoring
  // ========================================================================

  /**
   * Log error with context
   */
  private logError(error: Error, context?: Record<string, any>): void {
    const recoverableError: RecoverableError = {
      timestamp: new Date(),
      error,
      severity: this.classifyError(error),
      context: context || {},
      stackTrace: error.stack
    };

    this.errorHistory.push(recoverableError);
    this.emit('error', recoverableError);

    // Prune old errors
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-500);
    }
  }

  /**
   * Get error history
   */
  public getErrorHistory(count: number = 100): RecoverableError[] {
    return this.errorHistory.slice(-count);
  }

  /**
   * Get error statistics
   */
  public getStatistics(): {
    totalErrors: number;
    transientErrors: number;
    recoverableErrors: number;
    criticalErrors: number;
    circuitBreakerTrips: number;
  } {
    const stats = {
      totalErrors: this.errorHistory.length,
      transientErrors: 0,
      recoverableErrors: 0,
      criticalErrors: 0,
      circuitBreakerTrips: 0
    };

    for (const error of this.errorHistory) {
      switch (error.severity) {
        case 'transient':
          stats.transientErrors++;
          break;
        case 'recoverable':
          stats.recoverableErrors++;
          break;
        case 'critical':
          stats.criticalErrors++;
          break;
      }
    }

    for (const state of this.circuitBreakers.values()) {
      if (state.state === 'open') {
        stats.circuitBreakerTrips++;
      }
    }

    return stats;
  }

  /**
   * Clear error history
   */
  public clearHistory(): void {
    this.errorHistory = [];
  }
}
