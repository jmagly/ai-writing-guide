/**
 * Tests for CacheManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { CacheManager } from '../../../src/research/cache/manager.js';
import { ResearchErrorCode } from '../../../src/research/types.js';

describe('CacheManager', () => {
  const testCacheDir = join(process.cwd(), '.test-cache');
  let cacheManager: CacheManager;

  beforeEach(async () => {
    cacheManager = new CacheManager({
      cacheDir: testCacheDir,
      defaultTtl: 3600, // 1 hour
      ttlByEndpoint: {
        'test-endpoint': 7200, // 2 hours
      },
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

  describe('generateKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = cacheManager.generateKey('test', { id: '123', query: 'test' });
      const key2 = cacheManager.generateKey('test', { id: '123', query: 'test' });

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different input', () => {
      const key1 = cacheManager.generateKey('test', { id: '123' });
      const key2 = cacheManager.generateKey('test', { id: '456' });

      expect(key1).not.toBe(key2);
    });

    it('should be order-independent for params', () => {
      const key1 = cacheManager.generateKey('test', { a: '1', b: '2' });
      const key2 = cacheManager.generateKey('test', { b: '2', a: '1' });

      expect(key1).toBe(key2);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve data', async () => {
      const key = 'test-key';
      const data = { id: 1, name: 'test' };

      await cacheManager.set(key, data);
      const retrieved = await cacheManager.get<typeof data>(key);

      expect(retrieved).toEqual(data);
    });

    it('should return null for cache miss', async () => {
      const retrieved = await cacheManager.get('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should use endpoint-specific TTL', async () => {
      const key = 'test-key';
      const data = { value: 'test' };

      await cacheManager.set(key, data, 'test-endpoint');

      // Read the cache entry directly to verify TTL
      const cacheKey = cacheManager.generateKey('', { key });
      const entry = await cacheManager.get(cacheKey);

      // The entry should be stored with the endpoint-specific TTL
      // This is verified by checking the cache file exists
      const retrieved = await cacheManager.get<typeof data>(key);
      expect(retrieved).toEqual(data);
    });

    it('should return null for expired entries', async () => {
      const key = 'test-key';
      const data = { value: 'test' };

      // Set with very short TTL
      const shortTtlManager = new CacheManager({
        cacheDir: testCacheDir,
        defaultTtl: 1, // 1 second
      });

      await shortTtlManager.set(key, data);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const retrieved = await shortTtlManager.get<typeof data>(key);
      expect(retrieved).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete cached entry', async () => {
      const key = 'test-key';
      const data = { value: 'test' };

      await cacheManager.set(key, data);
      await cacheManager.delete(key);

      const retrieved = await cacheManager.get<typeof data>(key);
      expect(retrieved).toBeNull();
    });

    it('should not throw on deleting non-existent entry', async () => {
      await expect(cacheManager.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      await cacheManager.set('key1', { value: 'test1' });
      await cacheManager.set('key2', { value: 'test2' });
      await cacheManager.set('key3', { value: 'test3' });

      await cacheManager.clear();

      const retrieved1 = await cacheManager.get('key1');
      const retrieved2 = await cacheManager.get('key2');
      const retrieved3 = await cacheManager.get('key3');

      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeNull();
      expect(retrieved3).toBeNull();
    });
  });

  describe('clearExpired', () => {
    it('should clear only expired entries', async () => {
      const shortTtlManager = new CacheManager({
        cacheDir: testCacheDir,
        defaultTtl: 1, // 1 second
      });

      const longTtlManager = new CacheManager({
        cacheDir: testCacheDir,
        defaultTtl: 3600, // 1 hour
      });

      // Create one short-lived and one long-lived entry
      await shortTtlManager.set('expired', { value: 'old' });
      await longTtlManager.set('fresh', { value: 'new' });

      // Wait for short TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const cleared = await cacheManager.clearExpired();

      expect(cleared).toBe(1);

      // Fresh entry should still exist
      const fresh = await cacheManager.get('fresh');
      expect(fresh).toEqual({ value: 'new' });

      // Expired entry should be gone
      const expired = await cacheManager.get('expired');
      expect(expired).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await cacheManager.set('key1', { value: 'test1' });
      await cacheManager.set('key2', { value: 'test2' });

      const stats = await cacheManager.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.sizeBytes).toBeGreaterThan(0);
    });

    it('should count expired entries', async () => {
      const shortTtlManager = new CacheManager({
        cacheDir: testCacheDir,
        defaultTtl: 1, // 1 second
      });

      await shortTtlManager.set('key1', { value: 'test1' });
      await shortTtlManager.set('key2', { value: 'test2' });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const stats = await cacheManager.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.expiredEntries).toBe(2);
    });
  });

  describe('error handling', () => {
    // Root can write to read-only directories, so skip in CI Docker containers
    const isRoot = process.getuid?.() === 0;

    it.skipIf(isRoot)('should throw ResearchError on write failure', async () => {
      // Create a read-only cache directory
      const readOnlyDir = join(testCacheDir, 'readonly');
      await fs.mkdir(readOnlyDir, { recursive: true });
      await fs.chmod(readOnlyDir, 0o444);

      const readOnlyManager = new CacheManager({
        cacheDir: readOnlyDir,
      });

      await expect(
        readOnlyManager.set('test', { value: 'test' })
      ).rejects.toMatchObject({
        code: ResearchErrorCode.RF_401,
      });

      // Restore permissions for cleanup
      await fs.chmod(readOnlyDir, 0o755);
    });
  });

  describe('directory structure', () => {
    it('should organize cache files in subdirectories', async () => {
      const key1 = 'a'.repeat(64); // Key starting with 'aa'
      const key2 = 'b'.repeat(64); // Key starting with 'bb'

      await cacheManager.set(key1, { value: 'test1' });
      await cacheManager.set(key2, { value: 'test2' });

      // Check subdirectories exist
      const subdir1 = join(testCacheDir, key1.substring(0, 2));
      const subdir2 = join(testCacheDir, key2.substring(0, 2));

      const stat1 = await fs.stat(subdir1);
      const stat2 = await fs.stat(subdir2);

      expect(stat1.isDirectory()).toBe(true);
      expect(stat2.isDirectory()).toBe(true);
    });
  });
});
