/**
 * Base API client with rate limiting and retry logic
 *
 * @module research/clients/base
 */

import {
  ClientConfig,
  RateLimitConfig,
  RetryConfig,
  ResearchError,
  ResearchErrorCode,
} from '../types.js';

/**
 * Token bucket rate limiter
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(private config: RateLimitConfig) {
    this.tokens = config.currentTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = elapsed * this.config.refillRate;

    this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time
    const deficit = 1 - this.tokens;
    const waitMs = (deficit / this.config.refillRate) * 1000;

    await this.sleep(waitMs);

    // Refill again after waiting
    this.refill();
    this.tokens -= 1;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current token count (for testing)
   */
  getCurrentTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Base API client with common functionality
 */
export abstract class BaseClient {
  protected rateLimiter: RateLimiter;
  protected retryConfig: RetryConfig;

  constructor(protected config: ClientConfig) {
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.retryConfig = config.retry;
  }

  /**
   * Execute an HTTP request with rate limiting and retry logic
   */
  protected async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Apply rate limiting
    await this.rateLimiter.acquire();

    // Execute with retry
    return this.executeWithRetry<T>(url, options);
  }

  /**
   * Execute request with exponential backoff retry
   */
  private async executeWithRetry<T>(
    url: string,
    options: RequestInit,
    attempt = 0
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.handleHttpError(response);
        throw error;
      }

      return (await response.json()) as T;
    } catch (error) {
      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ResearchError(
          ResearchErrorCode.RF_104,
          `Request timeout after ${this.config.timeout}ms`,
          error
        );
      }

      // Don't retry ResearchErrors (they're already handled)
      if (error instanceof ResearchError) {
        // Retry on transient errors
        if (this.isRetriable(error) && attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateBackoff(attempt);
          await this.sleep(delay);
          return this.executeWithRetry<T>(url, options, attempt + 1);
        }
        throw error;
      }

      // Retry on network errors
      if (attempt < this.retryConfig.maxRetries) {
        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);
        return this.executeWithRetry<T>(url, options, attempt + 1);
      }

      throw new ResearchError(
        ResearchErrorCode.RF_500,
        'Network error',
        error as Error
      );
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleHttpError(response: Response): Promise<ResearchError> {
    const status = response.status;

    if (status === 429) {
      return new ResearchError(
        ResearchErrorCode.RF_103,
        'Rate limit exceeded'
      );
    }

    if (status === 404) {
      return new ResearchError(
        ResearchErrorCode.RF_300,
        'Resource not found'
      );
    }

    if (status === 401 || status === 403) {
      return new ResearchError(
        ResearchErrorCode.RF_102,
        'Invalid API key or unauthorized'
      );
    }

    if (status >= 500) {
      return new ResearchError(
        ResearchErrorCode.RF_200,
        'API server error'
      );
    }

    return new ResearchError(
      ResearchErrorCode.RF_100,
      `HTTP error ${status}`
    );
  }

  /**
   * Determine if an error is retriable
   */
  private isRetriable(error: unknown): boolean {
    if (error instanceof ResearchError) {
      // Retry on server errors and rate limits
      return (
        error.code === ResearchErrorCode.RF_200 ||
        error.code === ResearchErrorCode.RF_103
      );
    }

    // Retry on network errors
    return true;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const delay =
      this.retryConfig.initialDelay *
      Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Build URL with query parameters
   */
  protected buildUrl(
    path: string,
    params: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path, this.config.baseUrl);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });

    return url.toString();
  }
}
