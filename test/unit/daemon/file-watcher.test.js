import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileWatcher } from '../../../tools/daemon/file-watcher.mjs';
import fs from 'fs';

vi.mock('fs');

describe('FileWatcher', () => {
  let fileWatcher;
  let mockConfig;

  beforeEach(() => {
    vi.useFakeTimers();
    mockConfig = {
      enabled: true,
      paths: [
        {
          path: '.aiwg/',
          events: ['create', 'modify', 'delete'],
          ignore: ['*.tmp', 'working/**'],
          extensions: ['.md', '.yaml']
        }
      ]
    };
    fileWatcher = new FileWatcher(mockConfig, 500);
  });

  afterEach(() => {
    fileWatcher.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('shouldIgnore', () => {
    it('should ignore patterns with wildcards', () => {
      expect(fileWatcher.shouldIgnore('test.tmp', ['*.tmp'])).toBe(true);
      expect(fileWatcher.shouldIgnore('backup.tmp', ['*.tmp'])).toBe(true);
      expect(fileWatcher.shouldIgnore('test.md', ['*.tmp'])).toBe(false);
    });

    it('should ignore exact substring matches', () => {
      expect(fileWatcher.shouldIgnore('working/file.md', ['working'])).toBe(true);
      expect(fileWatcher.shouldIgnore('path/working/file.md', ['working'])).toBe(true);
      expect(fileWatcher.shouldIgnore('data/file.md', ['working'])).toBe(false);
    });

    it('should ignore built-in patterns', () => {
      expect(fileWatcher.shouldIgnore('node_modules/package/index.js', [])).toBe(true);
      expect(fileWatcher.shouldIgnore('.git/config', [])).toBe(true);
      expect(fileWatcher.shouldIgnore('.aiwg/working/temp.md', [])).toBe(true);
      expect(fileWatcher.shouldIgnore('.aiwg/daemon/state.json', [])).toBe(true);
    });

    it('should not ignore non-matching patterns', () => {
      expect(fileWatcher.shouldIgnore('src/index.js', ['*.tmp'])).toBe(false);
      expect(fileWatcher.shouldIgnore('docs/readme.md', ['working'])).toBe(false);
    });
  });

  describe('hasExtension', () => {
    it('should match files with specified extensions', () => {
      expect(fileWatcher.hasExtension('file.md', ['.md', '.yaml'])).toBe(true);
      expect(fileWatcher.hasExtension('config.yaml', ['.md', '.yaml'])).toBe(true);
      expect(fileWatcher.hasExtension('data.json', ['.md', '.yaml'])).toBe(false);
    });

    it('should return false for files without matching extensions', () => {
      expect(fileWatcher.hasExtension('script.js', ['.ts', '.tsx'])).toBe(false);
      expect(fileWatcher.hasExtension('readme', ['.md'])).toBe(false);
    });

    it('should handle empty extension list', () => {
      expect(fileWatcher.hasExtension('file.md', [])).toBe(false);
    });
  });

  describe('normalizeEventType', () => {
    it('should normalize rename to create when file exists', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      expect(fileWatcher.normalizeEventType('rename', '/path/to/file')).toBe('create');
    });

    it('should normalize rename to delete when file does not exist', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      expect(fileWatcher.normalizeEventType('rename', '/path/to/file')).toBe('delete');
    });

    it('should normalize change to modify', () => {
      expect(fileWatcher.normalizeEventType('change', '/path/to/file')).toBe('modify');
    });

    it('should pass through unknown event types', () => {
      expect(fileWatcher.normalizeEventType('unknown', '/path/to/file')).toBe('unknown');
    });
  });

  describe('handleRawEvent', () => {
    it('should debounce events and emit only once', () => {
      const eventSpy = vi.fn();
      fileWatcher.on('event', eventSpy);

      fileWatcher.handleRawEvent('modify', '/path/to/file.md');
      fileWatcher.handleRawEvent('modify', '/path/to/file.md');
      fileWatcher.handleRawEvent('modify', '/path/to/file.md');

      expect(eventSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith({
        source: 'watch',
        type: 'file.modify',
        payload: { path: '/path/to/file.md', event_type: 'modify' }
      });
    });

    it('should emit correct event structure', () => {
      const eventSpy = vi.fn();
      fileWatcher.on('event', eventSpy);

      fileWatcher.handleRawEvent('create', '/path/to/new.yaml');
      vi.advanceTimersByTime(500);

      expect(eventSpy).toHaveBeenCalledWith({
        source: 'watch',
        type: 'file.create',
        payload: {
          path: '/path/to/new.yaml',
          event_type: 'create'
        }
      });
    });

    it('should reset timer on subsequent events', () => {
      const eventSpy = vi.fn();
      fileWatcher.on('event', eventSpy);

      fileWatcher.handleRawEvent('modify', '/path/to/file.md');
      vi.advanceTimersByTime(300);

      fileWatcher.handleRawEvent('modify', '/path/to/file.md');
      vi.advanceTimersByTime(300);

      expect(eventSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200);
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should track events received', () => {
      fileWatcher.handleRawEvent('modify', '/path/to/file1.md');
      vi.advanceTimersByTime(500);

      fileWatcher.handleRawEvent('create', '/path/to/file2.md');
      vi.advanceTimersByTime(500);

      expect(fileWatcher.eventsReceived).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return correct stats structure', () => {
      const stats = fileWatcher.getStats();

      expect(stats).toEqual({
        enabled: true,
        paths: ['.aiwg/'],
        events_received: 0
      });
    });

    it('should reflect events received count', () => {
      fileWatcher.handleRawEvent('modify', '/path/to/file.md');
      vi.advanceTimersByTime(500);

      const stats = fileWatcher.getStats();
      expect(stats.events_received).toBe(1);
    });

    it('should handle disabled configuration', () => {
      const disabledWatcher = new FileWatcher({ enabled: false, paths: [] });
      const stats = disabledWatcher.getStats();

      expect(stats.enabled).toBe(false);
      expect(stats.paths).toEqual([]);
    });
  });

  describe('stop', () => {
    it('should clear all watchers', () => {
      const mockWatcher = { close: vi.fn() };
      fileWatcher.watchers = [mockWatcher];

      fileWatcher.stop();

      expect(mockWatcher.close).toHaveBeenCalled();
      expect(fileWatcher.watchers).toEqual([]);
    });

    it('should clear all pending timers', () => {
      fileWatcher.handleRawEvent('modify', '/path/to/file1.md');
      fileWatcher.handleRawEvent('create', '/path/to/file2.md');

      expect(fileWatcher.timers.size).toBe(2);

      fileWatcher.stop();

      expect(fileWatcher.timers.size).toBe(0);
    });

    it('should handle null watchers gracefully', () => {
      fileWatcher.watchers = [null, undefined];

      expect(() => fileWatcher.stop()).not.toThrow();
      expect(fileWatcher.watchers).toEqual([]);
    });
  });

  describe('start', () => {
    it('should not start when disabled', () => {
      const disabledWatcher = new FileWatcher({ enabled: false, paths: [] });
      vi.spyOn(disabledWatcher, 'watchPath');

      disabledWatcher.start();

      expect(disabledWatcher.watchPath).not.toHaveBeenCalled();
    });

    it('should handle watch errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(fileWatcher, 'watchPath').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => fileWatcher.start()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('watchPath', () => {
    it('should warn when watch path does not exist', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      const result = fileWatcher.watchPath({ path: '/nonexistent', events: [] });

      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith('Watch path does not exist: /nonexistent');

      consoleSpy.mockRestore();
    });

    it('should handle files without filename gracefully', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mockWatcher = { close: vi.fn() };
      let watchCallback;

      vi.spyOn(fs, 'watch').mockImplementation((path, options, callback) => {
        watchCallback = callback;
        return mockWatcher;
      });

      fileWatcher.watchPath({ path: '/test', events: ['modify'] });

      const eventSpy = vi.fn();
      fileWatcher.on('event', eventSpy);

      watchCallback('change', null);
      vi.advanceTimersByTime(500);

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });
});
