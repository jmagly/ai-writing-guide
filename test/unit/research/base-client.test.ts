/**
 * Tests for BaseClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseClient, RateLimiter } from '../../../src/research/clients/base.js';
import {
  ClientConfig,
  ResearchError,
  ResearchErrorCode,
} from '../../../src/research/types.js';

// Test implementation of BaseClient
class TestClient extends BaseClient {
  async testRequest<T>(url: string, options?: RequestInit): Promise<T> {
    return this.request<T>(url, options);
  }

  testBuildUrl(path: string, params: Record<string, string | number | boolean | undefined>): string {
    return this.buildUrl(path, params);
  }
}

describe('RateLimiter', () => {
  it('should allow requests when tokens are available', async () => {
    const limiter = new RateLimiter({
      maxTokens: 10,
      refillRate: 1,
      currentTokens: 10,
      lastRefill: Date.now(),
    });

    const start = Date.now();
    await limiter.acquire();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(100); // Should be immediate
    expect(limiter.getCurrentTokens()).toBeCloseTo(9, 0);
  });

  it('should wait when no tokens are available', async () => {
    const limiter = new RateLimiter({
      maxTokens: 1,
      refillRate: 10, // 10 tokens per second
      currentTokens: 0,
      lastRefill: Date.now(),
    });

    const start = Date.now();
    await limiter.acquire();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThan(90); // Should wait ~100ms
    expect(elapsed).toBeLessThan(200);
  });

  it('should refill tokens over time', async () => {
    const limiter = new RateLimiter({
      maxTokens: 10,
      refillRate: 10, // 10 tokens per second
      currentTokens: 0,
      lastRefill: Date.now() - 500, // 0.5 seconds ago
    });

    const tokens = limiter.getCurrentTokens();
    expect(tokens).toBeCloseTo(5, 0); // Should have refilled ~5 tokens
  });

  it('should cap tokens at maxTokens', async () => {
    const limiter = new RateLimiter({
      maxTokens: 10,
      refillRate: 10,
      currentTokens: 5,
      lastRefill: Date.now() - 2000, // 2 seconds ago
    });

    const tokens = limiter.getCurrentTokens();
    expect(tokens).toBe(10); // Should be capped at 10
  });
});

describe('BaseClient', () => {
  let client: TestClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const config: ClientConfig = {
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      rateLimit: {
        maxTokens: 100,
        refillRate: 10,
        currentTokens: 100,
        lastRefill: Date.now(),
      },
      retry: {
        maxRetries: 3,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
      },
    };

    client = new TestClient(config);

    // Mock global fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildUrl', () => {
    it('should build URL with query parameters', () => {
      const url = client.testBuildUrl('/search', {
        query: 'test',
        limit: 10,
        offset: 0,
      });

      expect(url).toBe('https://api.example.com/search?query=test&limit=10&offset=0');
    });

    it('should skip undefined parameters', () => {
      const url = client.testBuildUrl('/search', {
        query: 'test',
        limit: undefined,
      });

      expect(url).toBe('https://api.example.com/search?query=test');
    });

    it('should handle boolean parameters', () => {
      const url = client.testBuildUrl('/search', {
        flag: true,
      });

      expect(url).toBe('https://api.example.com/search?flag=true');
    });
  });

  describe('request', () => {
    it('should make successful request', async () => {
      const mockData = { id: 1, name: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.testRequest<typeof mockData>('https://api.example.com/test');

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw on 404 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        client.testRequest('https://api.example.com/test')
      ).rejects.toMatchObject({
        code: ResearchErrorCode.RF_300,
      });
    });

    it('should throw on 429 rate limit error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      await expect(
        client.testRequest('https://api.example.com/test')
      ).rejects.toMatchObject({
        code: ResearchErrorCode.RF_103,
      });
    });

    it('should throw on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(
        client.testRequest('https://api.example.com/test')
      ).rejects.toMatchObject({
        code: ResearchErrorCode.RF_102,
      });
    });

    it('should throw on 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        client.testRequest('https://api.example.com/test')
      ).rejects.toMatchObject({
        code: ResearchErrorCode.RF_200,
      });
    });

    it('should retry on server errors', async () => {
      // Fail twice, succeed on third attempt
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const result = await client.testRequest('https://api.example.com/test');

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(
        client.testRequest('https://api.example.com/test')
      ).rejects.toMatchObject({
        code: ResearchErrorCode.RF_200,
      });

      // Should try initial + 3 retries = 4 total
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should throw timeout error', { timeout: 15000 }, async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 10000);
          })
      );

      await expect(
        client.testRequest('https://api.example.com/test')
      ).rejects.toMatchObject({
        code: ResearchErrorCode.RF_104,
      });
    });

    it('should throw network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(
        client.testRequest('https://api.example.com/test')
      ).rejects.toMatchObject({
        code: ResearchErrorCode.RF_500,
      });
    });
  });
});
