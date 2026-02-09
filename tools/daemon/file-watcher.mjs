import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export class FileWatcher extends EventEmitter {
  constructor(config, debounceMs = 500) {
    super();
    this.config = config;
    this.debounceMs = debounceMs;
    this.watchers = [];
    this.timers = new Map();
    this.eventsReceived = 0;
  }

  start() {
    if (!this.config.enabled) {
      return;
    }

    for (const watchPath of this.config.paths) {
      try {
        const watcher = this.watchPath(watchPath);
        this.watchers.push(watcher);
      } catch (error) {
        console.error(`Failed to watch ${watchPath.path}:`, error.message);
      }
    }
  }

  watchPath(watchConfig) {
    const { path: watchPath, events, ignore = [], extensions = [] } = watchConfig;

    if (!fs.existsSync(watchPath)) {
      console.warn(`Watch path does not exist: ${watchPath}`);
      return null;
    }

    const watcher = fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      if (this.shouldIgnore(filename, ignore)) {
        return;
      }

      if (extensions.length > 0 && !this.hasExtension(filename, extensions)) {
        return;
      }

      const filepath = path.join(watchPath, filename);
      const normalizedEvent = this.normalizeEventType(eventType, filepath);
      if (events && !events.includes(normalizedEvent)) {
        return;
      }

      this.handleRawEvent(normalizedEvent, filepath);
    });

    return watcher;
  }

  handleRawEvent(eventType, filepath) {
    const key = `${eventType}:${filepath}`;

    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.timers.set(key, setTimeout(() => {
      this.eventsReceived++;
      this.emit('event', {
        source: 'watch',
        type: `file.${eventType}`,
        payload: {
          path: filepath,
          event_type: eventType
        }
      });
      this.timers.delete(key);
    }, this.debounceMs));
  }

  shouldIgnore(filename, ignorePatterns) {
    for (const pattern of ignorePatterns) {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        if (regex.test(filename)) {
          return true;
        }
      } else if (filename.includes(pattern)) {
        return true;
      }
    }

    if (filename.includes('node_modules') ||
        filename.includes('.git') ||
        filename.includes('.aiwg/working') ||
        filename.includes('.aiwg/daemon')) {
      return true;
    }

    return false;
  }

  hasExtension(filename, extensions) {
    return extensions.some(ext => filename.endsWith(ext));
  }

  normalizeEventType(eventType, filepath) {
    if (eventType === 'rename') {
      return fs.existsSync(filepath) ? 'create' : 'delete';
    }
    if (eventType === 'change') {
      return 'modify';
    }
    return eventType;
  }

  stop() {
    for (const watcher of this.watchers) {
      if (watcher) {
        watcher.close();
      }
    }
    this.watchers = [];

    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  getStats() {
    return {
      enabled: this.config.enabled,
      paths: this.config.paths.map(p => p.path),
      events_received: this.eventsReceived
    };
  }
}

export default FileWatcher;
