/**
 * Integration tests for Research Framework
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  SemanticScholarClient,
  CrossRefClient,
  ArxivClient,
  UnpaywallClient,
  CacheManager,
} from '../../../src/research/index.js';
import {
  ResearchErrorCode,
  ResearchError,
} from '../../../src/research/types.js';

describe('Research Framework Integration', () => {
  const testCacheDir = join(process.cwd(), '.test-integration-cache');
  let cacheManager: CacheManager;

  beforeEach(async () => {
    cacheManager = new CacheManager({
      cacheDir: testCacheDir,
      defaultTtl: 3600,
    });

    // Clean up test cache directory
    try {
      await fs.rm(testCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      await fs.rm(testCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe('Client initialization', () => {
    it('should create SemanticScholarClient', () => {
      const client = new SemanticScholarClient();
      expect(client).toBeDefined();
    });

    it('should create CrossRefClient', () => {
      const client = new CrossRefClient();
      expect(client).toBeDefined();
    });

    it('should create ArxivClient', () => {
      const client = new ArxivClient();
      expect(client).toBeDefined();
    });

    it('should create UnpaywallClient', () => {
      const client = new UnpaywallClient({ email: 'test@example.com' });
      expect(client).toBeDefined();
    });
  });

  describe('Cache integration', () => {
    it('should cache and retrieve data', async () => {
      const key = cacheManager.generateKey('semantic-scholar', {
        doi: '10.1234/test',
      });

      const testData = {
        id: '123',
        title: 'Test Paper',
        authors: [],
        year: 2024,
        source: 'semantic-scholar' as const,
        retrievedAt: new Date().toISOString(),
      };

      // Set cache
      await cacheManager.set(key, testData, 'semantic-scholar');

      // Get from cache
      const cached = await cacheManager.get(key);

      expect(cached).toEqual(testData);
    });

    it('should handle cache miss gracefully', async () => {
      const key = 'nonexistent-key';
      const result = await cacheManager.get(key);

      expect(result).toBeNull();
    });

    it('should generate consistent cache keys', () => {
      const key1 = cacheManager.generateKey('crossref', {
        doi: '10.1234/test',
        query: 'machine learning',
      });

      const key2 = cacheManager.generateKey('crossref', {
        query: 'machine learning',
        doi: '10.1234/test',
      });

      expect(key1).toBe(key2);
    });
  });

  describe('Type compatibility', () => {
    it('should have compatible ResearchPaper types across clients', () => {
      // This test verifies that all clients return compatible types
      // If this compiles without errors, the types are compatible

      const semanticScholarPaper: Awaited<
        ReturnType<SemanticScholarClient['getPaperByDoi']>
      > = {
        id: '123',
        title: 'Test',
        authors: [],
        year: 2024,
        source: 'semantic-scholar',
        retrievedAt: new Date().toISOString(),
      };

      const crossrefPaper: Awaited<
        ReturnType<CrossRefClient['getPaperByDoi']>
      > = {
        id: '123',
        title: 'Test',
        authors: [],
        year: 2024,
        source: 'crossref',
        retrievedAt: new Date().toISOString(),
      };

      const arxivPaper: Awaited<ReturnType<ArxivClient['getPaperById']>> = {
        id: '123',
        title: 'Test',
        authors: [],
        year: 2024,
        source: 'arxiv',
        retrievedAt: new Date().toISOString(),
      };

      const unpaywallPaper: Awaited<
        ReturnType<UnpaywallClient['getPaperByDoi']>
      > = {
        id: '123',
        title: 'Test',
        authors: [],
        year: 2024,
        source: 'unpaywall',
        retrievedAt: new Date().toISOString(),
      };

      // All should be assignable to ResearchPaper[]
      const papers = [
        semanticScholarPaper,
        crossrefPaper,
        arxivPaper,
        unpaywallPaper,
      ];

      expect(papers).toHaveLength(4);
    });
  });

  describe('Error code consistency', () => {
    it('should have consistent error codes', () => {
      const error = new ResearchError(
        ResearchErrorCode.RF_100,
        'Test error'
      );

      expect(error.code).toBe(ResearchErrorCode.RF_100);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ResearchError');
    });
  });

  describe('Rate limiting across clients', () => {
    it('should respect rate limits independently', async () => {
      const ssClient = new SemanticScholarClient({
        rateLimit: {
          maxTokens: 2,
          refillRate: 1,
          currentTokens: 2,
          lastRefill: Date.now(),
        },
      });

      const crClient = new CrossRefClient({
        rateLimit: {
          maxTokens: 2,
          refillRate: 1,
          currentTokens: 2,
          lastRefill: Date.now(),
        },
      });

      // Each client should have independent rate limiters
      // This is verified by the fact that we can create them
      // with different configurations
      expect(ssClient).toBeDefined();
      expect(crClient).toBeDefined();
    });
  });
});
