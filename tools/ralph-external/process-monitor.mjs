/**
 * Process Monitor for External Ralph Multi-Loop
 *
 * Monitors multiple loop processes for health, heartbeats, and crash detection.
 * Uses heartbeat mechanism for stale detection and resource monitoring.
 *
 * @implements @.aiwg/requirements/use-cases/UC-273-multi-loop-supervisor.md
 */

import { EventEmitter } from 'events';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

/**
 * @typedef {Object} ProcessHealth
 * @property {number} pid - Process ID
 * @property {number} cpu - CPU usage percentage
 * @property {number} memory - Memory usage in MB
 * @property {number} uptime - Process uptime in seconds
 * @property {string} status - Process status (running, zombie, sleeping)
 */

/**
 * @typedef {Object} HeartbeatRecord
 * @property {string} loopId - Loop identifier
 * @property {number} timestamp - Heartbeat timestamp
 * @property {number} iteration - Current iteration number
 * @property {string} status - Loop status
 */

export class ProcessMonitor extends EventEmitter {
  /**
   * @param {Object} config
   * @param {string} config.projectRoot - Project root directory
   * @param {number} [config.heartbeatIntervalMs=30000] - Heartbeat check interval
   * @param {number} [config.staleThresholdMs=60000] - Stale detection threshold
   */
  constructor(config) {
    super();
    this.projectRoot = config.projectRoot;
    this.heartbeatIntervalMs = config.heartbeatIntervalMs || 30000; // 30 seconds
    this.staleThresholdMs = config.staleThresholdMs || 60000; // 1 minute

    this.heartbeatDir = join(this.projectRoot, '.aiwg', 'ralph', 'heartbeats');
    this.monitoredLoops = new Map(); // loopId -> { pid, lastCheck }
    this.heartbeatTimer = null;

    // Ensure heartbeat directory exists
    mkdirSync(this.heartbeatDir, { recursive: true });
  }

  /**
   * Start monitoring loop processes
   * @param {string[]} loopIds - Loop IDs to monitor
   */
  startMonitoring(loopIds) {
    // Initialize monitoring for each loop
    for (const loopId of loopIds) {
      const stateFile = join(
        this.projectRoot,
        '.aiwg',
        'ralph',
        'loops',
        loopId,
        'state.json'
      );

      if (existsSync(stateFile)) {
        const state = JSON.parse(readFileSync(stateFile, 'utf8'));
        this.monitoredLoops.set(loopId, {
          pid: state.currentPid,
          lastCheck: Date.now(),
        });
      }
    }

    // Start heartbeat monitoring
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(
        () => this.checkAllHeartbeats(),
        this.heartbeatIntervalMs
      );
    }
  }

  /**
   * Stop monitoring a specific loop
   * @param {string} loopId - Loop ID to stop monitoring
   */
  stopMonitoring(loopId) {
    this.monitoredLoops.delete(loopId);

    // Stop timer if no loops are monitored
    if (this.monitoredLoops.size === 0 && this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Check if a process is still alive
   * @param {number} pid - Process ID
   * @returns {boolean}
   */
  isProcessAlive(pid) {
    if (!pid || pid <= 0) {
      return false;
    }

    try {
      // Signal 0 checks if process exists without killing it
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // ESRCH = No such process
      if (error.code === 'ESRCH') {
        return false;
      }
      // EPERM = Process exists but no permission to signal
      if (error.code === 'EPERM') {
        return true;
      }
      // Other errors, assume dead
      return false;
    }
  }

  /**
   * Get process health metrics
   * @param {string} loopId - Loop ID
   * @returns {ProcessHealth|null}
   */
  getProcessHealth(loopId) {
    const monitoring = this.monitoredLoops.get(loopId);
    if (!monitoring || !monitoring.pid) {
      return null;
    }

    const pid = monitoring.pid;

    if (!this.isProcessAlive(pid)) {
      return {
        pid,
        cpu: 0,
        memory: 0,
        uptime: 0,
        status: 'dead',
      };
    }

    try {
      // Use ps command to get process stats
      // Format: %cpu %mem etime stat
      const output = execSync(
        `ps -p ${pid} -o %cpu,%mem,etime,stat --no-headers`,
        { encoding: 'utf8' }
      ).trim();

      if (!output) {
        return null;
      }

      const parts = output.split(/\s+/);
      const cpu = parseFloat(parts[0]) || 0;
      const memPercent = parseFloat(parts[1]) || 0;
      const etime = parts[2] || '0:00';
      const stat = parts[3] || 'R';

      // Parse uptime (format: [[dd-]hh:]mm:ss or mm:ss)
      const uptime = this.parseUptime(etime);

      // Estimate memory in MB (assuming 16GB total RAM)
      const memory = (memPercent / 100) * 16384;

      // Parse status
      const status = this.parseStatus(stat);

      return {
        pid,
        cpu,
        memory,
        uptime,
        status,
      };
    } catch (error) {
      // Process may have died between isAlive check and ps call
      return null;
    }
  }

  /**
   * Parse uptime from ps etime format
   * @param {string} etime - Elapsed time string
   * @returns {number} - Uptime in seconds
   */
  parseUptime(etime) {
    // Format: [[dd-]hh:]mm:ss
    let seconds = 0;

    // Handle days
    if (etime.includes('-')) {
      const [days, rest] = etime.split('-');
      seconds += parseInt(days, 10) * 86400;
      etime = rest;
    }

    const parts = etime.split(':').map(p => parseInt(p, 10));

    if (parts.length === 3) {
      // hh:mm:ss
      seconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // mm:ss
      seconds += parts[0] * 60 + parts[1];
    } else {
      // Just seconds
      seconds += parts[0];
    }

    return seconds;
  }

  /**
   * Parse process status from ps stat field
   * @param {string} stat - Status field from ps
   * @returns {string} - Human-readable status
   */
  parseStatus(stat) {
    const statusChar = stat.charAt(0);

    const statusMap = {
      R: 'running',
      S: 'sleeping',
      D: 'disk-wait',
      Z: 'zombie',
      T: 'stopped',
      t: 'tracing-stop',
      W: 'paging',
      X: 'dead',
      x: 'dead',
      K: 'wakekill',
      P: 'parked',
    };

    return statusMap[statusChar] || 'unknown';
  }

  /**
   * Record heartbeat for a loop
   * @param {string} loopId - Loop ID
   * @param {Object} data - Heartbeat data
   */
  recordHeartbeat(loopId, data = {}) {
    const heartbeat = {
      loopId,
      timestamp: Date.now(),
      iteration: data.iteration || 0,
      status: data.status || 'running',
    };

    const heartbeatFile = join(this.heartbeatDir, `${loopId}.json`);
    writeFileSync(heartbeatFile, JSON.stringify(heartbeat, null, 2));
  }

  /**
   * Get last heartbeat for a loop
   * @param {string} loopId - Loop ID
   * @returns {HeartbeatRecord|null}
   */
  getLastHeartbeat(loopId) {
    const heartbeatFile = join(this.heartbeatDir, `${loopId}.json`);

    if (!existsSync(heartbeatFile)) {
      return null;
    }

    try {
      return JSON.parse(readFileSync(heartbeatFile, 'utf8'));
    } catch {
      return null;
    }
  }

  /**
   * Check if a loop's heartbeat is stale
   * @param {string} loopId - Loop ID
   * @param {number} [thresholdMs] - Stale threshold in milliseconds
   * @returns {boolean}
   */
  isStale(loopId, thresholdMs = this.staleThresholdMs) {
    const heartbeat = this.getLastHeartbeat(loopId);

    if (!heartbeat) {
      return true; // No heartbeat = stale
    }

    const age = Date.now() - heartbeat.timestamp;
    return age > thresholdMs;
  }

  /**
   * Check all monitored loops for heartbeat staleness
   */
  checkAllHeartbeats() {
    for (const [loopId, monitoring] of this.monitoredLoops.entries()) {
      // Check if process is alive
      if (monitoring.pid && !this.isProcessAlive(monitoring.pid)) {
        this.emit('crash', {
          loopId,
          pid: monitoring.pid,
          reason: 'process_died',
        });
        continue;
      }

      // Check if heartbeat is stale
      if (this.isStale(loopId)) {
        this.emit('stale', {
          loopId,
          pid: monitoring.pid,
          lastHeartbeat: this.getLastHeartbeat(loopId),
        });
      }
    }
  }

  /**
   * Get all monitored loop IDs
   * @returns {string[]}
   */
  getMonitoredLoops() {
    return Array.from(this.monitoredLoops.keys());
  }

  /**
   * Stop all monitoring
   */
  stopAll() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.monitoredLoops.clear();
  }
}

export default ProcessMonitor;
