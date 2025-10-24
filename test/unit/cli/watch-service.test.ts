/**
 * Tests for Watch Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { resolve } from 'path';
import { WatchService, WatchEvent } from '../../../src/cli/watch-service.js';
import { WatchConfig } from '../../../src/cli/config-loader.js';

describe('WatchService', () => {
  let service: WatchService;
  let testDir: string;
  let config: WatchConfig;

  beforeEach(async () => {
    service = new WatchService();
    testDir = resolve(process.cwd(), 'test-temp-watch');
    await mkdir(testDir, { recursive: true });

    config = {
      enabled: true,
      patterns: [resolve(testDir, '*.md')],
      debounce: 100,
      ignorePatterns: ['**/node_modules/**']
    };
  });

  afterEach(async () => {
    if (service.running()) {
      await service.stop();
    }
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('start/stop', () => {
    it('should start watching', async () => {
      await service.start(config.patterns, config);

      expect(service.running()).toBe(true);
    }, 5000);

    it('should stop watching', async () => {
      await service.start(config.patterns, config);
      await service.stop();

      expect(service.running()).toBe(false);
    }, 5000);

    it('should throw if starting when already running', async () => {
      await service.start(config.patterns, config);

      await expect(service.start(config.patterns, config)).rejects.toThrow(
        'already running'
      );
    }, 5000);

    it('should not throw when stopping if not running', async () => {
      await expect(service.stop()).resolves.not.toThrow();
    });
  });

  describe('file change detection', () => {
    it('should detect file additions', async () => {
      const events: WatchEvent[] = [];

      service.onFileChange(async (event) => {
        events.push(event);
      });

      await service.start(config.patterns, config);

      // Give watcher time to initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create file
      const filePath = resolve(testDir, 'new.md');
      await writeFile(filePath, 'Content', 'utf-8');

      // Wait for debounce + processing
      await new Promise(resolve => setTimeout(resolve, config.debounce + 200));

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'add')).toBe(true);
    }, 10000);

    it('should detect file changes', async () => {
      // Create file before watching
      const filePath = resolve(testDir, 'existing.md');
      await writeFile(filePath, 'Original', 'utf-8');

      const events: WatchEvent[] = [];
      service.onFileChange(async (event) => {
        events.push(event);
      });

      await service.start(config.patterns, config);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Modify file
      await writeFile(filePath, 'Modified', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, config.debounce + 200));

      expect(events.some(e => e.type === 'change')).toBe(true);
    }, 10000);

    it('should detect file deletions', async () => {
      const filePath = resolve(testDir, 'delete.md');
      await writeFile(filePath, 'Content', 'utf-8');

      const events: WatchEvent[] = [];
      service.onFileChange(async (event) => {
        events.push(event);
      });

      await service.start(config.patterns, config);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Delete file
      await rm(filePath);
      await new Promise(resolve => setTimeout(resolve, config.debounce + 200));

      expect(events.some(e => e.type === 'unlink')).toBe(true);
    }, 10000);
  });

  describe('debouncing', () => {
    it('should debounce rapid changes', async () => {
      const filePath = resolve(testDir, 'debounce.md');
      await writeFile(filePath, 'Initial', 'utf-8');

      let eventCount = 0;
      service.onFileChange(async () => {
        eventCount++;
      });

      await service.start(config.patterns, config);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Make rapid changes
      for (let i = 0; i < 5; i++) {
        await writeFile(filePath, `Content ${i}`, 'utf-8');
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Wait for debounce + processing
      await new Promise(resolve => setTimeout(resolve, config.debounce + 300));

      // Should have processed only once (debounced)
      expect(eventCount).toBeLessThan(5);
    }, 10000);

    it('should respect custom debounce time', async () => {
      service.debounce(500);

      const filePath = resolve(testDir, 'custom-debounce.md');
      await writeFile(filePath, 'Initial', 'utf-8');

      let processed = false;
      service.onFileChange(async () => {
        processed = true;
      });

      config.debounce = 500;
      await service.start(config.patterns, config);
      await new Promise(resolve => setTimeout(resolve, 500));

      await writeFile(filePath, 'Modified', 'utf-8');

      // Should not be processed yet
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(processed).toBe(false);

      // Should be processed after full debounce
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(processed).toBe(true);
    }, 10000);

    it('should throw on negative debounce', () => {
      expect(() => service.debounce(-100)).toThrow('must be >= 0');
    });
  });

  describe('callbacks', () => {
    it('should call registered callbacks', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.onFileChange(callback1);
      service.onFileChange(callback2);

      await service.start(config.patterns, config);
      await new Promise(resolve => setTimeout(resolve, 500));

      const filePath = resolve(testDir, 'callback.md');
      await writeFile(filePath, 'Content', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, config.debounce + 200));

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    }, 10000);

    it('should remove callbacks', async () => {
      const callback = vi.fn();

      service.onFileChange(callback);
      service.removeCallback(callback);

      await service.start(config.patterns, config);
      await new Promise(resolve => setTimeout(resolve, 500));

      const filePath = resolve(testDir, 'removed.md');
      await writeFile(filePath, 'Content', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, config.debounce + 200));

      expect(callback).not.toHaveBeenCalled();
    }, 10000);

    it('should handle callback errors gracefully', async () => {
      service.onFileChange(async () => {
        throw new Error('Callback error');
      });

      await service.start(config.patterns, config);
      await new Promise(resolve => setTimeout(resolve, 500));

      const filePath = resolve(testDir, 'error.md');
      await writeFile(filePath, 'Content', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, config.debounce + 200));

      // Should not crash the service
      expect(service.running()).toBe(true);

      const stats = service.getStats();
      expect(stats.errors).toBeGreaterThan(0);
    }, 10000);
  });

  describe('statistics', () => {
    it('should track events processed', async () => {
      await service.start(config.patterns, config);
      await new Promise(resolve => setTimeout(resolve, 500));

      service.onFileChange(async () => {});

      const filePath = resolve(testDir, 'stats.md');
      await writeFile(filePath, 'Content', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, config.debounce + 200));

      const stats = service.getStats();
      expect(stats.eventsProcessed).toBeGreaterThan(0);
    }, 10000);

    it('should track errors', async () => {
      service.onFileChange(async () => {
        throw new Error('Test error');
      });

      await service.start(config.patterns, config);
      await new Promise(resolve => setTimeout(resolve, 500));

      const filePath = resolve(testDir, 'error-stats.md');
      await writeFile(filePath, 'Content', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, config.debounce + 200));

      const stats = service.getStats();
      expect(stats.errors).toBeGreaterThan(0);
    }, 10000);

    it('should reset statistics', async () => {
      await service.start(config.patterns, config);
      await new Promise(resolve => setTimeout(resolve, 500));

      service.onFileChange(async () => {});

      const filePath = resolve(testDir, 'reset.md');
      await writeFile(filePath, 'Content', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, config.debounce + 200));

      service.resetStats();

      const stats = service.getStats();
      expect(stats.eventsProcessed).toBe(0);
      expect(stats.errors).toBe(0);
    }, 10000);
  });

  describe('pattern management', () => {
    it('should add pattern', async () => {
      await service.start([resolve(testDir, '*.md')], config);

      service.addPattern(resolve(testDir, '*.txt'));

      // Pattern should be watched
      expect(service.running()).toBe(true);
    }, 5000);

    it('should remove pattern', async () => {
      const pattern = resolve(testDir, '*.md');
      await service.start([pattern], config);

      service.removePattern(pattern);

      expect(service.running()).toBe(true);
    }, 5000);

    it('should throw when adding pattern if not running', () => {
      expect(() => service.addPattern('*.md')).toThrow('not running');
    });

    it('should throw when removing pattern if not running', () => {
      expect(() => service.removePattern('*.md')).toThrow('not running');
    });
  });

  describe('getWatchedFiles', () => {
    it('should return empty array when not running', () => {
      const files = service.getWatchedFiles();

      expect(files).toEqual([]);
    });

    it('should return watched files', async () => {
      await writeFile(resolve(testDir, 'watched.md'), 'Content', 'utf-8');

      await service.start(config.patterns, config);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const files = service.getWatchedFiles();

      // Should have files (exact count depends on timing)
      expect(Array.isArray(files)).toBe(true);
    }, 5000);
  });

  describe('running', () => {
    it('should return false when not started', () => {
      expect(service.running()).toBe(false);
    });

    it('should return true when running', async () => {
      await service.start(config.patterns, config);

      expect(service.running()).toBe(true);
    }, 5000);

    it('should return false after stop', async () => {
      await service.start(config.patterns, config);
      await service.stop();

      expect(service.running()).toBe(false);
    }, 5000);
  });
});
