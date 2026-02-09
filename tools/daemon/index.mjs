#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PID_FILE = '.aiwg/daemon.pid';
const LOG_FILE = '.aiwg/daemon/daemon.log';
const STATE_FILE = '.aiwg/daemon/state.json';

class DaemonCLI {
  constructor() {
    this.command = process.argv[2];
    this.flags = this.parseFlags(process.argv.slice(3));
  }

  parseFlags(args) {
    const flags = {};
    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('--')) {
        const key = args[i].slice(2);
        const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
        flags[key] = value;
        if (value !== true) i++;
      }
    }
    return flags;
  }

  async run() {
    switch (this.command) {
      case 'start':
        await this.start();
        break;
      case 'stop':
        await this.stop();
        break;
      case 'status':
        await this.status();
        break;
      case 'logs':
        await this.logs();
        break;
      case 'restart':
        await this.restart();
        break;
      default:
        this.usage();
        process.exit(1);
    }
  }

  async start() {
    if (this.isDaemonRunning()) {
      const pid = this.readPidFile();
      console.error(`Daemon is already running (PID: ${pid})`);
      process.exit(1);
    }

    this.ensureDirectories();

    if (this.flags.foreground) {
      await this.startForeground();
    } else {
      await this.startDetached();
    }
  }

  async startForeground() {
    console.log('Starting daemon in foreground mode...');
    const daemonScript = path.join(__dirname, 'daemon-main.mjs');

    const child = spawn(process.execPath, [daemonScript], {
      stdio: 'inherit',
      env: process.env
    });

    child.on('exit', (code) => {
      console.log(`Daemon exited with code ${code}`);
      process.exit(code);
    });
  }

  async startDetached() {
    console.log('Starting daemon...');
    const daemonScript = path.join(__dirname, 'daemon-main.mjs');

    const logFd = fs.openSync(LOG_FILE, 'a');

    const child = spawn(process.execPath, [daemonScript], {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: process.env
    });

    child.unref();

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (this.isDaemonRunning()) {
      const pid = this.readPidFile();
      console.log(`Daemon started successfully (PID: ${pid})`);
      console.log(`Logs: ${LOG_FILE}`);
    } else {
      console.error('Daemon failed to start. Check logs for details.');
      process.exit(1);
    }
  }

  async stop() {
    if (!this.isDaemonRunning()) {
      console.log('Daemon is not running');
      return;
    }

    const pid = this.readPidFile();
    console.log(`Stopping daemon (PID: ${pid})...`);

    try {
      process.kill(pid, 'SIGTERM');

      const maxWait = 10000;
      const checkInterval = 500;
      let waited = 0;

      while (waited < maxWait) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;

        if (!this.isPidAlive(pid)) {
          console.log('Daemon stopped gracefully');
          this.cleanup();
          return;
        }
      }

      console.log('Daemon did not stop gracefully, sending SIGKILL...');
      process.kill(pid, 'SIGKILL');
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!this.isPidAlive(pid)) {
        console.log('Daemon killed');
        this.cleanup();
      } else {
        console.error('Failed to stop daemon');
        process.exit(1);
      }
    } catch (error) {
      if (error.code === 'ESRCH') {
        console.log('Daemon process not found (stale PID file)');
        this.cleanup();
      } else {
        console.error(`Failed to stop daemon: ${error.message}`);
        process.exit(1);
      }
    }
  }

  async status() {
    if (!this.isDaemonRunning()) {
      console.log('Daemon: stopped');
      return;
    }

    const pid = this.readPidFile();
    console.log(`Daemon: running (PID: ${pid})`);

    if (fs.existsSync(STATE_FILE)) {
      try {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        console.log(`Started: ${state.started_at}`);
        console.log(`Uptime: ${state.uptime_seconds}s`);
        console.log(`Last heartbeat: ${state.last_heartbeat}`);
        console.log(`Health: ${state.health.status}`);

        console.log('\nMonitors:');
        if (state.monitors.file_watcher?.enabled) {
          console.log(`  File watcher: enabled (${state.monitors.file_watcher.events_received} events)`);
        }
        if (state.monitors.scheduler?.enabled) {
          console.log(`  Scheduler: enabled (${state.monitors.scheduler.jobs} jobs)`);
        }
        if (state.monitors.webhook?.enabled) {
          console.log(`  Webhook: enabled (port ${state.monitors.webhook.port})`);
        }

        if (state.health.issues.length > 0) {
          console.log('\nIssues:');
          for (const issue of state.health.issues) {
            console.log(`  - ${issue}`);
          }
        }
      } catch (error) {
        console.error(`Failed to read state file: ${error.message}`);
      }
    }
  }

  async logs() {
    if (!fs.existsSync(LOG_FILE)) {
      console.log('No log file found');
      return;
    }

    const lines = parseInt(this.flags.lines || '50', 10);
    const follow = this.flags.follow || this.flags.f;

    if (follow) {
      const tail = spawn('tail', ['-f', '-n', String(lines), LOG_FILE], {
        stdio: 'inherit'
      });

      process.on('SIGINT', () => {
        tail.kill();
        process.exit(0);
      });
    } else {
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      const allLines = content.split('\n');
      const tailLines = allLines.slice(-lines);
      console.log(tailLines.join('\n'));
    }
  }

  async restart() {
    console.log('Restarting daemon...');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start();
  }

  isDaemonRunning() {
    if (!fs.existsSync(PID_FILE)) {
      return false;
    }

    const pid = this.readPidFile();
    return this.isPidAlive(pid);
  }

  isPidAlive(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  readPidFile() {
    try {
      return parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    } catch (error) {
      return null;
    }
  }

  ensureDirectories() {
    const dirs = [
      '.aiwg',
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

  cleanup() {
    try {
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  usage() {
    console.log(`
Usage: aiwg daemon <command> [options]

Commands:
  start       Start the daemon
  stop        Stop the daemon
  status      Show daemon status
  logs        Show daemon logs
  restart     Restart the daemon

Options:
  --foreground    Run in foreground (for Docker/systemd)
  --lines N       Show last N lines of logs (default: 50)
  --follow, -f    Follow log output in real-time

Examples:
  aiwg daemon start
  aiwg daemon start --foreground
  aiwg daemon stop
  aiwg daemon status
  aiwg daemon logs --follow
  aiwg daemon logs --lines 100
  aiwg daemon restart
    `.trim());
  }
}

const cli = new DaemonCLI();
cli.run().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
