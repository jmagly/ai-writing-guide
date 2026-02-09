#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Config from './config.mjs';
import FileWatcher from './file-watcher.mjs';
import CronScheduler from './cron-scheduler.mjs';
import EventRouter from './event-router.mjs';
import { IPCServer } from './ipc-server.mjs';
import { AgentSupervisor } from './agent-supervisor.mjs';
import { TaskStore } from './task-store.mjs';
import { AutomationEngine } from './automation-engine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DaemonMain {
  constructor() {
    this.config = null;
    this.fileWatcher = null;
    this.cronScheduler = null;
    this.eventRouter = null;
    this.messagingBus = null;
    this.ipcServer = null;
    this.supervisor = null;
    this.taskStore = null;
    this.automationEngine = null;
    this.shutdownInProgress = false;
    this.isRotating = false;
    this.startTime = Date.now();
    this.pidFile = '.aiwg/daemon.pid';
    this.lockFile = '.aiwg/daemon/.lock';
    this.heartbeatFile = '.aiwg/daemon/heartbeat';
    this.stateFile = '.aiwg/daemon/state.json';
    this.logFile = '.aiwg/daemon/daemon.log';
    this.socketPath = '.aiwg/daemon/daemon.sock';
    this.taskStorePath = '.aiwg/daemon/tasks.json';
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

    // Initialize task store (persistent task tracking)
    this.taskStore = new TaskStore(this.taskStorePath);
    await this.taskStore.initialize();
    this.log(`Task store initialized (${this.taskStore.size} existing tasks)`);

    // Initialize agent supervisor (spawns claude -p subprocesses)
    const maxConcurrency = this.config.get('daemon.max_parallel_actions') || 3;
    const taskTimeoutMs = (this.config.get('daemon.action_timeout_minutes') || 120) * 60 * 1000;
    this.supervisor = new AgentSupervisor({
      maxConcurrency,
      taskStore: this.taskStore,
      taskTimeout: taskTimeoutMs,
    });
    this.supervisor.on('task:started', (e) => this.log(`Agent task started: ${e.taskId} (PID ${e.pid})`));
    this.supervisor.on('task:completed', (e) => this.log(`Agent task completed: ${e.taskId} (${e.duration}ms)`));
    this.supervisor.on('task:failed', (e) => this.log(`Agent task failed: ${e.taskId} - ${e.error}`));
    this.supervisor.on('task:timeout', (e) => this.log(`Agent task timed out: ${e.taskId}`));
    this.log(`Agent supervisor started (max ${maxConcurrency} concurrent)`);

    // Initialize automation engine (trigger-action rules)
    this.automationEngine = new AutomationEngine({
      supervisor: this.supervisor,
    });
    const rules = this.config.get('rules') || [];
    if (rules.length > 0) {
      this.automationEngine.loadRules(rules);
      this.log(`Automation engine loaded ${this.automationEngine.ruleCount} rules`);
    }

    // Initialize IPC server (Unix domain socket for CLI communication)
    this.ipcServer = new IPCServer(this.socketPath);
    this._registerIPCMethods();
    await this.ipcServer.start();
    this.log(`IPC server listening on ${this.socketPath}`);

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

    // Route events through automation engine
    this.eventRouter.on('event', (event) => {
      this.handleEvent(event);
      this.automationEngine.processEvent(event);
    });
  }

  /**
   * Register IPC method handlers for CLI communication
   */
  _registerIPCMethods() {
    this.ipcServer.registerMethods({
      // Daemon status
      'daemon.status': () => ({
        pid: process.pid,
        uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
        started_at: new Date(this.startTime).toISOString(),
        health: 'healthy',
        subsystems: {
          ipc: { clients: this.ipcServer.clientCount },
          supervisor: this.supervisor.getStatus(),
          automation: this.automationEngine.getStatus(),
          file_watcher: this.fileWatcher?.getStats() || { enabled: false },
          scheduler: this.cronScheduler?.getStats() || { enabled: false },
          messaging: this.messagingBus ? { enabled: true, adapters: this.messagingBus.adapterCount } : { enabled: false },
        },
      }),

      // Task management
      'task.submit': (params) => {
        if (!params.prompt) {
          const err = new Error('Missing required parameter: prompt');
          err.code = 'INVALID_PARAMS';
          throw err;
        }
        const task = this.supervisor.submit(params.prompt, {
          agent: params.agent,
          priority: params.priority || 0,
        });
        return { taskId: task.id, state: task.state };
      },

      'task.cancel': (params) => {
        if (!params.taskId) {
          const err = new Error('Missing required parameter: taskId');
          err.code = 'INVALID_PARAMS';
          throw err;
        }
        const cancelled = this.supervisor.cancel(params.taskId);
        return { cancelled };
      },

      'task.list': (params) => {
        return this.taskStore.getTasks({
          state: params?.state,
          limit: params?.limit || 20,
        });
      },

      'task.get': (params) => {
        if (!params.taskId) {
          const err = new Error('Missing required parameter: taskId');
          err.code = 'INVALID_PARAMS';
          throw err;
        }
        const task = this.taskStore.getTask(params.taskId);
        if (!task) {
          const err = new Error(`Task not found: ${params.taskId}`);
          err.code = 'INVALID_PARAMS';
          throw err;
        }
        return task;
      },

      'task.stats': () => {
        return this.taskStore.getStats();
      },

      // Automation
      'automation.status': () => {
        return this.automationEngine.getStatus();
      },

      'automation.enable': (params) => {
        if (params.ruleId) {
          return { success: this.automationEngine.setRuleEnabled(params.ruleId, true) };
        }
        this.automationEngine.setEnabled(true);
        return { enabled: true };
      },

      'automation.disable': (params) => {
        if (params.ruleId) {
          return { success: this.automationEngine.setRuleEnabled(params.ruleId, false) };
        }
        this.automationEngine.setEnabled(false);
        return { enabled: false };
      },

      // Chat (send message via IPC for non-tmux clients)
      'chat.send': (params) => {
        if (!params.message) {
          const err = new Error('Missing required parameter: message');
          err.code = 'INVALID_PARAMS';
          throw err;
        }
        // Submit as a task via supervisor
        const task = this.supervisor.submit(params.message, {
          priority: params.priority || 5, // Chat messages get higher priority
          metadata: { source: 'ipc-chat' },
        });
        return { taskId: task.id };
      },

      // Ping for health checks
      'ping': () => ({ pong: true, timestamp: new Date().toISOString() }),
    });
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
    const supervisorStatus = this.supervisor ? this.supervisor.getStatus() : { running: 0, queued: 0, tasks: { running: [], queued: [] } };
    const taskStats = this.taskStore ? this.taskStore.getStats() : {};

    const state = {
      pid: process.pid,
      started_at: new Date(this.startTime).toISOString(),
      last_heartbeat: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      restart_count: 0,
      ipc: {
        socket: this.socketPath,
        clients: this.ipcServer ? this.ipcServer.clientCount : 0,
      },
      agents: {
        running: supervisorStatus.running,
        queued: supervisorStatus.queued,
        max_concurrency: supervisorStatus.maxConcurrency,
        tasks: supervisorStatus.tasks,
      },
      task_stats: taskStats,
      monitors: {
        file_watcher: this.fileWatcher?.getStats() || { enabled: false },
        webhook: { enabled: false },
        scheduler: this.cronScheduler?.getStats() || { enabled: false }
      },
      automation: this.automationEngine ? {
        enabled: this.automationEngine.enabled,
        rule_count: this.automationEngine.ruleCount,
      } : { enabled: false },
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

    // Stop IPC server (reject new connections)
    if (this.ipcServer) {
      try {
        await this.ipcServer.stop();
        this.log('IPC server stopped');
      } catch (error) {
        this.log(`Error stopping IPC server: ${error.message}`);
      }
    }

    // Drain agent supervisor (wait for running tasks, cancel queued)
    if (this.supervisor) {
      try {
        this.log(`Draining supervisor (${this.supervisor.runningCount} running, ${this.supervisor.queuedCount} queued)`);
        await this.supervisor.shutdown(15000);
        this.log('Agent supervisor drained');
      } catch (error) {
        this.log(`Error draining supervisor: ${error.message}`);
      }
    }

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
