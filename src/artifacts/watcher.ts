/**
 * Artifact Index Watcher
 *
 * Filesystem watcher daemon that triggers incremental index rebuilds when
 * `.aiwg/` files change. Uses chokidar for cross-platform compatibility
 * (inotify on Linux, FSEvents on macOS, fs.watch on Windows).
 *
 * Features:
 * - Debounced updates (batch rapid bursts into a single rebuild)
 * - Incremental only — relies on the checksum manifest (#794) for fast change detection
 * - Scope filtering — watches `.aiwg/` by default, configurable via config
 * - PID file for conflict detection (prevents duplicate watchers on the same project)
 * - Graceful shutdown on SIGINT/SIGTERM
 *
 * @implements #795
 * @source @src/artifacts/checksum-manifest.ts
 */

import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { buildIndex, type BuildOptions } from './index-builder.js';
import { getGraphIndexDir, getProjectIndexRoot } from './types.js';
import { resolveProjectAiwgDir } from '../config/project-artifacts.js';

export interface WatchOptions {
  /** Paths to watch (default: .aiwg/) */
  paths?: string[];
  /** Debounce window in ms (default: 500) */
  debounceMs?: number;
  /** Verbose logging */
  verbose?: boolean;
  /** Working directory (default: cwd) */
  cwd?: string;
  /** Graph to rebuild (default: project) */
  graph?: BuildOptions['graph'];
}

/**
 * PID file location for the watcher daemon.
 * One watcher per project — the PID file prevents conflicts.
 */
export function getPidFilePath(cwd: string): string {
  return path.join(getProjectIndexRoot(cwd), 'watcher.pid');
}

/**
 * Check if a watcher is already running for this project.
 * Returns the PID if running, null otherwise.
 */
export function getRunningPid(cwd: string): number | null {
  const pidFile = getPidFilePath(cwd);
  if (!fs.existsSync(pidFile)) return null;

  try {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
    if (!Number.isFinite(pid)) return null;

    // Check if the process is still alive
    try {
      process.kill(pid, 0); // signal 0 = liveness check, doesn't actually kill
      return pid;
    } catch {
      // Process doesn't exist — stale PID file
      fs.unlinkSync(pidFile);
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Write the PID file for this watcher instance.
 */
function writePidFile(cwd: string): void {
  const pidFile = getPidFilePath(cwd);
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  fs.writeFileSync(pidFile, String(process.pid), 'utf-8');
}

/**
 * Remove the PID file on shutdown.
 */
function removePidFile(cwd: string): void {
  const pidFile = getPidFilePath(cwd);
  try {
    fs.unlinkSync(pidFile);
  } catch {
    // File may already be gone
  }
}

/**
 * Stop a running watcher by sending SIGTERM to its PID.
 * Returns true if a watcher was stopped, false if none was running.
 */
export function stopWatcher(cwd: string): boolean {
  const pid = getRunningPid(cwd);
  if (!pid) return false;

  try {
    process.kill(pid, 'SIGTERM');
    // Wait briefly for the watcher to clean up its PID file
    const start = Date.now();
    while (Date.now() - start < 2000) {
      if (!fs.existsSync(getPidFilePath(cwd))) return true;
      // Small synchronous wait
      const buf = Buffer.alloc(1);
      try { fs.readSync(0, buf, 0, 0, 0); } catch { /* ignored */ }
    }
    // Force removal of the stale PID file if the watcher didn't clean up
    removePidFile(cwd);
    return true;
  } catch {
    removePidFile(cwd);
    return false;
  }
}

/**
 * Start the watcher daemon. Returns a function to stop it.
 */
export function startWatcher(options: WatchOptions = {}): () => Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const watchPaths = options.paths ?? [resolveProjectAiwgDir(cwd)];
  const debounceMs = options.debounceMs ?? 500;
  const verbose = options.verbose ?? false;
  const graph = options.graph;

  // Check for existing watcher
  const existingPid = getRunningPid(cwd);
  if (existingPid) {
    throw new Error(
      `Watcher already running (PID ${existingPid}). Stop it first with: aiwg index watch --stop`
    );
  }

  writePidFile(cwd);

  // Track pending rebuild
  let rebuildTimer: NodeJS.Timeout | null = null;
  let pendingChanges = 0;
  let rebuildInProgress = false;

  const triggerRebuild = () => {
    if (rebuildInProgress) {
      // A build is already running — keep counter going, let the current
      // build finish, then we'll re-check.
      return;
    }
    if (pendingChanges === 0) return;

    rebuildInProgress = true;
    const changes = pendingChanges;
    pendingChanges = 0;

    console.log(`[watcher] ${changes} change(s) detected — rebuilding index...`);

    buildIndex(cwd, {
      force: false,
      verbose,
      graph,
    })
      .then(() => {
        rebuildInProgress = false;
        // If more changes came in during the rebuild, schedule another
        if (pendingChanges > 0) {
          scheduleRebuild();
        }
      })
      .catch((err: unknown) => {
        rebuildInProgress = false;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[watcher] rebuild failed:', msg);
      });
  };

  const scheduleRebuild = () => {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      triggerRebuild();
    }, debounceMs);
  };

  const watcher = chokidar.watch(watchPaths, {
    ignored: [
      /(^|[\/\\])\../,         // dotfiles (includes .index/, .git/)
      /node_modules/,
      /\/working\//,           // temporary working files
    ],
    ignoreInitial: true,       // don't fire on existing files at startup
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  });

  watcher
    .on('add', (filePath: string) => {
      if (verbose) console.log(`[watcher] add: ${path.relative(cwd, filePath)}`);
      pendingChanges++;
      scheduleRebuild();
    })
    .on('change', (filePath: string) => {
      if (verbose) console.log(`[watcher] change: ${path.relative(cwd, filePath)}`);
      pendingChanges++;
      scheduleRebuild();
    })
    .on('unlink', (filePath: string) => {
      if (verbose) console.log(`[watcher] unlink: ${path.relative(cwd, filePath)}`);
      pendingChanges++;
      scheduleRebuild();
    })
    .on('error', (err: unknown) => {
      console.error('[watcher] error:', err);
    });

  console.log(`[watcher] watching ${watchPaths.join(', ')}`);
  console.log(`[watcher] debounce: ${debounceMs}ms`);
  console.log(`[watcher] PID: ${process.pid}`);
  console.log(`[watcher] stop with: aiwg index watch --stop`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[watcher] shutting down...');
    if (rebuildTimer) clearTimeout(rebuildTimer);
    await watcher.close();
    removePidFile(cwd);
    console.log('[watcher] stopped');
  };

  process.on('SIGINT', () => shutdown().then(() => process.exit(0)));
  process.on('SIGTERM', () => shutdown().then(() => process.exit(0)));

  return shutdown;
}

/**
 * Check whether the index is stale (older than `maxAgeMs`)
 */
export function isIndexStale(cwd: string, maxAgeMs: number, graph?: BuildOptions['graph']): boolean {
  const indexDir = graph
    ? getGraphIndexDir(cwd, graph)
    : getProjectIndexRoot(cwd);
  const metadataPath = path.join(indexDir, 'metadata.json');

  if (!fs.existsSync(metadataPath)) return true; // no index = stale

  try {
    const stat = fs.statSync(metadataPath);
    const age = Date.now() - stat.mtimeMs;
    return age > maxAgeMs;
  } catch {
    return true;
  }
}

/**
 * Parse a human-readable duration (e.g. "5m", "30s", "1h") to milliseconds.
 */
export function parseDuration(s: string): number | null {
  const match = s.trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)?$/);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'ms';

  switch (unit) {
    case 'ms': return value;
    case 's':  return value * 1000;
    case 'm':  return value * 60 * 1000;
    case 'h':  return value * 60 * 60 * 1000;
    case 'd':  return value * 24 * 60 * 60 * 1000;
    default:   return null;
  }
}
