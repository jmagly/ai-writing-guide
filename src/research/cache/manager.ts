/**
 * Cache manager for research API responses
 *
 * @module research/cache/manager
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import {
  CacheEntry,
  ResearchError,
  ResearchErrorCode,
} from '../types.js';

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Cache directory path */
  cacheDir: string;
  /** Default TTL in seconds */
  defaultTtl: number;
  /** TTL per endpoint type */
  ttlByEndpoint?: Record<string, number>;
}

/**
 * Cache manager for file-based caching
 */
export class CacheManager {
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      cacheDir: '.aiwg/research/cache',
      defaultTtl: 86400, // 24 hours
      ttlByEndpoint: {
        'semantic-scholar': 604800, // 7 days
        'crossref': 604800, // 7 days
        'arxiv': 2592000, // 30 days (preprints don't change)
        'unpaywall': 86400, // 24 hours
      },
      ...config,
    };
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(key);
      const data = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(data);

      // Check if expired
      if (this.isExpired(entry)) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // Cache miss
      }

      throw new ResearchError(
        ResearchErrorCode.RF_400,
        'Cache read error',
        error as Error
      );
    }
  }

  /**
   * Set cached data
   */
  async set<T>(
    key: string,
    data: T,
    endpoint?: string
  ): Promise<void> {
    try {
      const ttl = endpoint
        ? this.config.ttlByEndpoint?.[endpoint] || this.config.defaultTtl
        : this.config.defaultTtl;

      const entry: CacheEntry<T> = {
        data,
        cachedAt: new Date().toISOString(),
        ttl,
        key,
      };

      const filePath = this.getFilePath(key);
      await this.ensureDir(dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    } catch (error) {
      throw new ResearchError(
        ResearchErrorCode.RF_401,
        'Cache write error',
        error as Error
      );
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new ResearchError(
          ResearchErrorCode.RF_402,
          'Cache deletion error',
          error as Error
        );
      }
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      const files = await this.listCacheFiles();
      await Promise.all(files.map((file) => fs.unlink(file)));
    } catch (error) {
      throw new ResearchError(
        ResearchErrorCode.RF_402,
        'Cache clear error',
        error as Error
      );
    }
  }

  /**
   * Clear expired entries
   */
  async clearExpired(): Promise<number> {
    try {
      const files = await this.listCacheFiles();
      let cleared = 0;

      for (const file of files) {
        try {
          const data = await fs.readFile(file, 'utf-8');
          const entry: CacheEntry<unknown> = JSON.parse(data);

          if (this.isExpired(entry)) {
            await fs.unlink(file);
            cleared++;
          }
        } catch {
          // Skip invalid files
        }
      }

      return cleared;
    } catch (error) {
      throw new ResearchError(
        ResearchErrorCode.RF_402,
        'Cache cleanup error',
        error as Error
      );
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    sizeBytes: number;
  }> {
    try {
      const files = await this.listCacheFiles();
      let expiredEntries = 0;
      let sizeBytes = 0;

      for (const file of files) {
        try {
          const stats = await fs.stat(file);
          sizeBytes += stats.size;

          const data = await fs.readFile(file, 'utf-8');
          const entry: CacheEntry<unknown> = JSON.parse(data);

          if (this.isExpired(entry)) {
            expiredEntries++;
          }
        } catch {
          // Skip invalid files
        }
      }

      return {
        totalEntries: files.length,
        expiredEntries,
        sizeBytes,
      };
    } catch (error) {
      throw new ResearchError(
        ResearchErrorCode.RF_400,
        'Cache stats error',
        error as Error
      );
    }
  }

  /**
   * Generate cache key from input
   */
  generateKey(endpoint: string, params: Record<string, unknown>): string {
    // Sort keys to ensure consistent hashing
    const sortedKeys = Object.keys(params).sort();
    const sortedParams: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      sortedParams[key] = params[key];
    }

    const normalized = JSON.stringify({ endpoint, params: sortedParams });
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired<T>(entry: CacheEntry<T>): boolean {
    const cachedTime = new Date(entry.cachedAt).getTime();
    const expiryTime = cachedTime + entry.ttl * 1000;
    return Date.now() > expiryTime;
  }

  /**
   * Get file path for cache key
   */
  private getFilePath(key: string): string {
    // Use first 2 chars for subdirectory to avoid too many files in one dir
    const subdir = key.substring(0, 2);
    return join(this.config.cacheDir, subdir, `${key}.json`);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * List all cache files
   */
  private async listCacheFiles(): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(this.config.cacheDir, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const fullPath = join(this.config.cacheDir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await fs.readdir(fullPath);
          for (const file of subFiles) {
            if (file.endsWith('.json')) {
              files.push(join(fullPath, file));
            }
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    return files;
  }
}
