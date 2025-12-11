/**
 * Watch Service
 *
 * Monitors file system for changes and triggers workflow processing.
 * Uses chokidar for efficient file watching with debouncing.
 */

import chokidar, { FSWatcher } from 'chokidar';
import * as path from 'path';
import { WatchConfig } from './config-loader.js';

export interface WatchEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: Date;
}

export type WatchCallback = (event: WatchEvent) => Promise<void>;

export interface WatchStats {
  filesWatched: number;
  eventsProcessed: number;
  errors: number;
  startTime: Date;
  lastEvent?: Date;
}

/**
 * File watching service with debouncing
 */
export class WatchService {
  private watcher: FSWatcher | null = null;
  private callbacks: WatchCallback[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 500;
  private stats: WatchStats;
  private isRunning = false;

  constructor() {
    this.stats = {
      filesWatched: 0,
      eventsProcessed: 0,
      errors: 0,
      startTime: new Date()
    };
  }

  /**
   * Start watching files
   */
  async start(patterns: string[], config: WatchConfig): Promise<void> {
    if (this.isRunning) {
      throw new Error('Watch service is already running');
    }

    this.debounceMs = config.debounce;

    // Configure chokidar
    this.watcher = chokidar.watch(patterns, {
      ignored: config.ignorePatterns || [],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      }
    });

    // Set up event handlers
    this.watcher.on('add', (path) => this.handleEvent('add', path));
    this.watcher.on('change', (path) => this.handleEvent('change', path));
    this.watcher.on('unlink', (path) => this.handleEvent('unlink', path));

    this.watcher.on('ready', () => {
      const watched = this.watcher?.getWatched() || {};
      this.stats.filesWatched = Object.values(watched).reduce(
        (sum, files) => sum + files.length,
        0
      );
    });

    this.watcher.on('error', (error) => {
      this.stats.errors++;
      console.error('Watch error:', error);
    });

    this.isRunning = true;

    // Wait for ready
    await new Promise<void>((resolve) => {
      if (this.watcher) {
        this.watcher.on('ready', () => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Clear pending debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    this.isRunning = false;
  }

  /**
   * Register callback for file changes
   */
  onFileChange(callback: WatchCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove callback
   */
  removeCallback(callback: WatchCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Set debounce time
   */
  debounce(ms: number): void {
    if (ms < 0) {
      throw new Error('Debounce time must be >= 0');
    }
    this.debounceMs = ms;
  }

  /**
   * Get watch statistics
   */
  getStats(): WatchStats {
    return { ...this.stats };
  }

  /**
   * Check if service is running
   */
  running(): boolean {
    return this.isRunning;
  }

  /**
   * Get list of watched files
   */
  getWatchedFiles(): string[] {
    if (!this.watcher) {
      return [];
    }

    const watched = this.watcher.getWatched();
    const files: string[] = [];

    for (const [dir, fileList] of Object.entries(watched)) {
      for (const file of fileList) {
        files.push(path.join(dir, file));
      }
    }

    return files;
  }

  // Private methods

  private handleEvent(type: 'add' | 'change' | 'unlink', path: string): void {
    // Clear existing timer for this path
    const existingTimer = this.debounceTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.processEvent(type, path);
      this.debounceTimers.delete(path);
    }, this.debounceMs);

    this.debounceTimers.set(path, timer);
  }

  private async processEvent(type: 'add' | 'change' | 'unlink', path: string): Promise<void> {
    const event: WatchEvent = {
      type,
      path,
      timestamp: new Date()
    };

    this.stats.eventsProcessed++;
    this.stats.lastEvent = event.timestamp;

    // Call all registered callbacks
    for (const callback of this.callbacks) {
      try {
        await callback(event);
      } catch (error) {
        this.stats.errors++;
        console.error(`Error processing ${path}:`, error);
      }
    }
  }

  /**
   * Add pattern to watch
   */
  addPattern(pattern: string): void {
    if (!this.watcher) {
      throw new Error('Watch service is not running');
    }
    this.watcher.add(pattern);
  }

  /**
   * Remove pattern from watch
   */
  removePattern(pattern: string): void {
    if (!this.watcher) {
      throw new Error('Watch service is not running');
    }
    this.watcher.unwatch(pattern);
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      filesWatched: this.stats.filesWatched,
      eventsProcessed: 0,
      errors: 0,
      startTime: new Date(),
      lastEvent: undefined
    };
  }
}
