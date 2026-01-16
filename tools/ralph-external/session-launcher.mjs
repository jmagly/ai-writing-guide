/**
 * Session Launcher for External Ralph Loop
 *
 * Handles spawning Claude Code CLI sessions with proper argument
 * construction and output capture.
 *
 * @implements @.aiwg/requirements/design-ralph-external.md
 */

import { spawn } from 'child_process';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { EventEmitter } from 'events';

/**
 * @typedef {Object} LaunchOptions
 * @property {string} prompt - The prompt to send
 * @property {string} sessionId - Session UUID for tracking
 * @property {string} [model='opus'] - Claude model to use
 * @property {number} [budget] - Budget per iteration in USD
 * @property {string} [systemPrompt] - System prompt to append
 * @property {Object} [mcpConfig] - MCP server configuration
 * @property {string} workingDir - Working directory for session
 * @property {string} stdoutPath - Path to capture stdout
 * @property {string} stderrPath - Path to capture stderr
 * @property {number} [timeoutMs] - Timeout in milliseconds
 */

/**
 * @typedef {Object} SessionResult
 * @property {number} exitCode - Process exit code
 * @property {string} stdoutPath - Path to stdout log
 * @property {string} stderrPath - Path to stderr log
 * @property {number} duration - Duration in milliseconds
 * @property {boolean} timedOut - Whether session timed out
 * @property {string} stdoutBuffer - Last portion of stdout
 */

export class SessionLauncher extends EventEmitter {
  constructor() {
    super();
    this.currentProcess = null;
    this.startTime = null;
  }

  /**
   * Build Claude CLI arguments
   * @param {LaunchOptions} options
   * @returns {string[]}
   */
  buildArgs(options) {
    const args = [
      '--dangerously-skip-permissions',
      '--print',
      '--output-format', 'stream-json',
      '--session-id', options.sessionId,
    ];

    // Model selection
    if (options.model) {
      args.push('--model', options.model);
    }

    // Budget control
    if (options.budget) {
      args.push('--max-budget-usd', String(options.budget));
    }

    // MCP configuration
    if (options.mcpConfig) {
      const configJson = typeof options.mcpConfig === 'string'
        ? options.mcpConfig
        : JSON.stringify(options.mcpConfig);
      args.push('--mcp-config', configJson);
    }

    // System prompt injection
    if (options.systemPrompt) {
      args.push('--append-system-prompt', options.systemPrompt);
    }

    // The prompt itself
    args.push(options.prompt);

    return args;
  }

  /**
   * Launch a Claude Code session
   * @param {LaunchOptions} options
   * @returns {Promise<SessionResult>}
   */
  launch(options) {
    return new Promise((resolve, reject) => {
      // Ensure output directories exist
      mkdirSync(dirname(options.stdoutPath), { recursive: true });
      mkdirSync(dirname(options.stderrPath), { recursive: true });

      const args = this.buildArgs(options);
      this.startTime = Date.now();

      // Create write streams for output capture
      const stdoutStream = createWriteStream(options.stdoutPath);
      const stderrStream = createWriteStream(options.stderrPath);

      // Buffer for last portion of stdout (for quick analysis)
      let stdoutBuffer = '';
      const maxBufferSize = 100000; // 100KB

      // Spawn Claude process
      this.currentProcess = spawn('claude', args, {
        cwd: options.workingDir,
        env: {
          ...process.env,
          // Ensure Claude uses non-interactive mode
          CI: 'true',
        },
      });

      const child = this.currentProcess;

      // Capture stdout
      child.stdout.on('data', (chunk) => {
        stdoutStream.write(chunk);
        stdoutBuffer += chunk.toString();
        // Keep buffer size manageable
        if (stdoutBuffer.length > maxBufferSize) {
          stdoutBuffer = stdoutBuffer.slice(-maxBufferSize);
        }
        this.emit('stdout', chunk);
      });

      // Capture stderr
      child.stderr.on('data', (chunk) => {
        stderrStream.write(chunk);
        this.emit('stderr', chunk);
      });

      // Handle timeout
      let timeoutId = null;
      let timedOut = false;

      if (options.timeoutMs) {
        timeoutId = setTimeout(() => {
          timedOut = true;
          this.emit('timeout');
          child.kill('SIGTERM');
          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
        }, options.timeoutMs);
      }

      // Handle process completion
      child.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const duration = Date.now() - this.startTime;
        this.currentProcess = null;

        // Close streams
        stdoutStream.end();
        stderrStream.end();

        const result = {
          exitCode: code || 0,
          stdoutPath: options.stdoutPath,
          stderrPath: options.stderrPath,
          duration,
          timedOut,
          stdoutBuffer,
        };

        this.emit('complete', result);
        resolve(result);
      });

      // Handle process errors
      child.on('error', (err) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const duration = Date.now() - this.startTime;
        this.currentProcess = null;

        // Close streams
        stdoutStream.end();
        stderrStream.end();

        this.emit('error', err);
        reject(err);
      });

      this.emit('started', { pid: child.pid, args });
    });
  }

  /**
   * Get current process PID
   * @returns {number|null}
   */
  getPid() {
    return this.currentProcess?.pid || null;
  }

  /**
   * Check if a process is running
   * @returns {boolean}
   */
  isRunning() {
    return this.currentProcess !== null && !this.currentProcess.killed;
  }

  /**
   * Kill current process
   * @param {string} [signal='SIGTERM']
   */
  kill(signal = 'SIGTERM') {
    if (this.currentProcess && !this.currentProcess.killed) {
      this.currentProcess.kill(signal);
    }
  }

  /**
   * Get elapsed time since start
   * @returns {number|null}
   */
  getElapsed() {
    return this.startTime ? Date.now() - this.startTime : null;
  }
}

/**
 * Check if Claude CLI is available
 * @returns {Promise<boolean>}
 */
export async function isClaudeAvailable() {
  return new Promise((resolve) => {
    const child = spawn('claude', ['--version'], {
      stdio: 'pipe',
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get Claude CLI version
 * @returns {Promise<string|null>}
 */
export async function getClaudeVersion() {
  return new Promise((resolve) => {
    let output = '';

    const child = spawn('claude', ['--version'], {
      stdio: 'pipe',
    });

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        resolve(null);
      }
    });

    child.on('error', () => {
      resolve(null);
    });
  });
}

export default SessionLauncher;
