#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Config from './config.mjs';
import FileWatcher from './file-watcher.mjs';
import CronScheduler from './cron-scheduler.mjs';
import EventRouter from './event-router.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DaemonMain {
  constructor() {
    this.config = null;
    this.fileWatcher = null;
    this.cronScheduler = null;
    this.eventRouter = null;
    this.messagingBus = null;
    this.shutdownInProgress = false;
    this.isRotating = false;
    this.startTime = Date.now();
    this.pidFile = '.aiwg/daemon.pid';
    this.lockFile = '.aiwg/daemon/.lock';
    this.heartbeatFile = '.aiwg/daemon/heartbeat';
    this.stateFile = '.aiwg/daemon/state.json';
    this.logFile = '.aiwg/daemon/daemon.log';
    this.lockFd = null;
  }

  async start() {
    try {
      this.setupDirectories();
      this.acquireLock();
      this.writePidFile();
      this.setupSignalHandlers();
      this.redirectLogs();
      this.loadConfig();
      await this.initializeSubsystems();
      this.startHeartbeat();
      this.log('Daemon started successfully');
    } catch (error) {
      this.log(`Fatal error during startup: ${error.message}`);
      process.exit(1);
    }
  }

  setupDirectories() {
    const dirs = [
      '.aiwg/daemon',
      '.aiwg/daemon/actions',
      '.aiwg/daemon/events'
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  acquireLock() {
    try {
      this.lockFd = fs.openSync(this.lockFile, 'wx');
      fs.writeSync(this.lockFd, String(process.pid));
    } catch (error) {
      if (error.code === 'EEXIST') {
        this.log('Daemon is already running (lock file exists)');
        process.exit(1);
      }
      throw error;
    }
  }

  writePidFile() {
    const tmpFile = `${this.pidFile}.tmp`;
    fs.writeFileSync(tmpFile, String(process.pid));
    fs.renameSync(tmpFile, this.pidFile);
  }

  setupSignalHandlers() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGHUP', () => this.reloadConfig());
  }

  redirectLogs() {
    const logStream = fs.createWriteStream(this.logFile, { flags: 'a' });

    process.stdout.write = (chunk) => {
      this.rotateLogIfNeeded();
      return logStream.write(chunk);
    };

    process.stderr.write = (chunk) => {
      this.rotateLogIfNeeded();
      return logStream.write(chunk);
    };
  }

  rotateLogIfNeeded() {
    if (this.isRotating) return;

    try {
      const stats = fs.statSync(this.logFile);
      const maxSize = (this.config?.get('daemon.log.max_size_mb') || 50) * 1024 * 1024;
      const maxFiles = this.config?.get('daemon.log.max_files') || 5;

      if (stats.size > maxSize) {
        this.isRotating = true;

        for (let i = maxFiles - 1; i >= 1; i--) {
          const oldFile = `${this.logFile}.${i}`;
          const newFile = `${this.logFile}.${i + 1}`;
          if (fs.existsSync(oldFile)) {
            fs.renameSync(oldFile, newFile);
          }
        }

        fs.renameSync(this.logFile, `${this.logFile}.1`);

        if (fs.existsSync(`${this.logFile}.${maxFiles + 1}`)) {
          fs.unlinkSync(`${this.logFile}.${maxFiles + 1}`);
        }

        this.isRotating = false;
      }
    } catch (error) {
      this.isRotating = false;
    }
  }

  loadConfig() {
    this.config = new Config();
    this.config.load();

    const errors = this.config.validate();
    if (errors.length > 0) {
      this.log(`Configuration validation errors: ${errors.join(', ')}`);
      throw new Error('Invalid configuration');
    }
  }

  reloadConfig() {
    this.log('Reloading configuration (SIGHUP received)');
    try {
      this.loadConfig();
      this.stopSubsystems();
      this.initializeSubsystems();
      this.log('Configuration reloaded successfully');
    } catch (error) {
      this.log(`Failed to reload configuration: ${error.message}`);
    }
  }

  async initializeSubsystems() {
    this.eventRouter = new EventRouter();

    const watchConfig = this.config.get('watch');
    if (watchConfig?.enabled) {
      this.fileWatcher = new FileWatcher(watchConfig, watchConfig.debounce_ms);
      this.fileWatcher.on('event', (event) => this.eventRouter.route(event));
      this.fileWatcher.start();
      this.log('File watcher started');
    }

    const scheduleConfig = this.config.get('schedule');
    if (scheduleConfig?.enabled) {
      this.cronScheduler = new CronScheduler(scheduleConfig);
      this.cronScheduler.on('event', (event) => this.eventRouter.route(event));
      this.cronScheduler.start();
      this.log('Cron scheduler started');
    }

    // Initialize messaging subsystem if any adapters are configured
    try {
      const { createMessagingHub } = await import('../messaging/index.mjs');
      this.messagingBus = await createMessagingHub();
      if (this.messagingBus) {
        this.log(`Messaging hub initialized with ${this.messagingBus.adapterCount} adapter(s)`);
      }
    } catch (error) {
      this.log(`Messaging subsystem not available: ${error.message}`);
    }

    this.eventRouter.on('event', (event) => this.handleEvent(event));
  }

  handleEvent(event) {
    this.log(`Event received: ${event.source} - ${event.type}`);

    // Forward daemon events to messaging bus if available
    if (this.messagingBus) {
      this.messagingBus.publish({
        topic: event.type,
        source: event.source || 'daemon',
        severity: 'info',
        summary: `${event.source}: ${event.type}`,
        details: event.payload || {},
        project: path.basename(process.cwd()),
        timestamp: new Date().toISOString(),
      });
    }
  }

  startHeartbeat() {
    const intervalSeconds = this.config.get('daemon.heartbeat_interval_seconds') || 30;

    setInterval(() => {
      this.writeHeartbeat();
      this.writeState();
    }, intervalSeconds * 1000);

    this.writeHeartbeat();
    this.writeState();
  }

  writeHeartbeat() {
    const heartbeat = {
      pid: process.pid,
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000)
    };

    const tmpFile = `${this.heartbeatFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(heartbeat, null, 2));
    fs.renameSync(tmpFile, this.heartbeatFile);
  }

  writeState() {
    const state = {
      pid: process.pid,
      started_at: new Date(this.startTime).toISOString(),
      last_heartbeat: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      restart_count: 0,
      monitors: {
        file_watcher: this.fileWatcher?.getStats() || { enabled: false },
        webhook: { enabled: false },
        scheduler: this.cronScheduler?.getStats() || { enabled: false }
      },
      recent_actions: [],
      active_actions: [],
      health: {
        status: 'healthy',
        last_check: new Date().toISOString(),
        issues: []
      }
    };

    const tmpFile = `${this.stateFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2));
    fs.renameSync(tmpFile, this.stateFile);
  }

  stopSubsystems() {
    if (this.fileWatcher) {
      this.fileWatcher.stop();
      this.fileWatcher = null;
    }

    if (this.cronScheduler) {
      this.cronScheduler.stop();
      this.cronScheduler = null;
    }
  }

  async shutdown(signal) {
    if (this.shutdownInProgress) {
      return;
    }

    this.shutdownInProgress = true;
    this.log(`Shutdown initiated (${signal})`);

    // Shutdown messaging adapters
    if (this.messagingBus) {
      try {
        await this.messagingBus.shutdown();
        this.log('Messaging hub shut down');
      } catch (error) {
        this.log(`Error shutting down messaging: ${error.message}`);
      }
    }

    this.stopSubsystems();
    this.writeState();
    this.cleanup();

    this.log('Daemon stopped gracefully');
    process.exit(0);
  }

  cleanup() {
    try {
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
      }
    } catch (error) {
      this.log(`Failed to remove PID file: ${error.message}`);
    }

    try {
      if (this.lockFd !== null) {
        fs.closeSync(this.lockFd);
        fs.unlinkSync(this.lockFile);
      }
    } catch (error) {
      this.log(`Failed to remove lock file: ${error.message}`);
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
}

const daemon = new DaemonMain();
daemon.start();
