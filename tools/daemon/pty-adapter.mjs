/**
 * PTY Adapter
 *
 * Spawns a target platform's TUI under a pseudo-terminal (PTY) and bridges
 * I/O bidirectionally through the AIWG chat channel — enabling remote operation
 * with near-native messaging richness from human, scripted, or agentic drivers.
 *
 * The adapter can be driven by:
 *   - A human typing replies in a chat channel
 *   - A shell script sending input programmatically
 *   - An agentic LLM routing messages through the daemon IPC socket
 *
 * Requires: node-pty (optional dependency)
 *   Install: npm install node-pty
 *   Note: node-pty requires native compilation (node-gyp + build tools)
 *
 * Usage:
 *   const adapter = new PTYAdapter({ platform: 'opencode' });
 *   await adapter.start();
 *   adapter.on('data', (chunk) => process.stdout.write(chunk));
 *   adapter.write('some input\n');
 *   adapter.resize(120, 30);
 *   await adapter.stop();
 *
 *   // List live sessions
 *   const sessions = PTYAdapter.list();
 *
 * @issue #656
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { createHash, randomBytes } from 'crypto';
import { SandboxTransport } from './sandbox-transport.mjs';
import { importImpl } from '../_resolve-impl.mjs';

const SESSION_DIR = '.aiwg/daemon/pty';

/**
 * Map of AIWG provider keys to their CLI binary names.
 * Used to spawn the correct TUI process.
 */
const PLATFORM_BINS = {
  'claude-code': 'claude',
  'opencode':    'opencode',
  'codex':       'codex',
  'warp':        'warp-terminal',
  'openclaw':    'openclaw',
};

/**
 * PTY Adapter — wraps a platform TUI process in a pseudo-terminal
 * and exposes bidirectional I/O for chat-channel bridging.
 *
 * Events:
 *   'data'  (chunk: string) — screen output from the PTY process
 *   'exit'  ({ exitCode, signal }) — PTY process has exited
 *   'error' (err: Error) — unrecoverable error
 */
export class PTYAdapter extends EventEmitter {
  /**
   * @param {object} opts
   * @param {string} opts.platform  - AIWG provider key (e.g. 'opencode', 'claude-code')
   * @param {string[]} [opts.args]  - Extra arguments passed to the TUI binary
   * @param {string} [opts.sessionId] - Resume an existing session by ID
   * @param {number} [opts.cols]    - Initial terminal width (default: 80)
   * @param {number} [opts.rows]    - Initial terminal height (default: 24)
   * @param {string} [opts.cwd]     - Working directory (default: process.cwd())
   */
  constructor({
    platform,
    args = [],
    sessionId = null,
    cols = 80,
    rows = 24,
    cwd = process.cwd(),
  } = {}) {
    super();
    this.platform   = platform;
    this.bin        = PLATFORM_BINS[platform] || platform;
    this.args       = args;
    this.sessionId  = sessionId || PTYAdapter._generateSessionId();
    this.cols       = cols;
    this.rows       = rows;
    this.cwd        = cwd;
    this._pty       = null;
    this._stopped   = false;
    this._startedAt = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Start the PTY session.
   * Spawns the platform TUI process under a pseudo-terminal.
   *
   * @returns {Promise<string>} Resolves with the session ID once the process is live.
   * @throws {Error} If node-pty is not installed or the binary is not found.
   */
  async start() {
    let nodePty;
    try {
      const { loadFeaturePackage } = await importImpl(import.meta.url, 'features/runtime.js');
      const loaded = await loadFeaturePackage('node-pty');
      nodePty = loaded.default ?? loaded;
    } catch {
      throw new Error(
        'node-pty is required for PTY adapter support.\n' +
        'Install it with scoped approval: aiwg features install pty\n' +
        'node-pty requires native compilation — you need node-gyp and C++ build tools.\n' +
        'See: https://github.com/microsoft/node-pty#installation'
      );
    }

    PTYAdapter._ensureSessionDir();
    this._startedAt = new Date().toISOString();

    this._pty = nodePty.spawn(this.bin, this.args, {
      name: 'xterm-256color',
      cols:  this.cols,
      rows:  this.rows,
      cwd:   this.cwd,
      env:   process.env,
    });

    this._pty.onData((data) => {
      this.emit('data', data);
    });

    this._pty.onExit(({ exitCode, signal }) => {
      this._stopped = true;
      PTYAdapter._removeSession(this.sessionId);
      this.emit('exit', { exitCode, signal });
    });

    this._writeSession();
    return this.sessionId;
  }

  /**
   * Send input to the PTY process (keystrokes, commands, etc.).
   * @param {string} data
   */
  write(data) {
    if (!this._pty || this._stopped) {
      throw new Error(`PTY session ${this.sessionId} is not active`);
    }
    this._pty.write(data);
  }

  /**
   * Resize the PTY window.
   * @param {number} cols
   * @param {number} rows
   */
  resize(cols, rows) {
    if (!this._pty || this._stopped) return;
    this.cols = cols;
    this.rows = rows;
    this._pty.resize(cols, rows);
    this._writeSession();
  }

  /**
   * Stop the PTY session gracefully (SIGTERM → SIGKILL after 5 s).
   * @returns {Promise<void>}
   */
  stop() {
    if (!this._pty || this._stopped) return Promise.resolve();
    this._stopped = true;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        try { this._pty.kill('SIGKILL'); } catch { /* already gone */ }
        resolve();
      }, 5000);

      this.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      try {
        this._pty.kill('SIGTERM');
      } catch {
        clearTimeout(timeout);
        resolve();
      }
    });
  }

  /** @returns {string} The session ID for reconnecting later */
  getSessionId() { return this.sessionId; }

  /** @returns {number|undefined} The PID of the spawned TUI process */
  getPid() { return this._pty?.pid; }

  /** @returns {boolean} True if the session is active */
  isActive() { return !this._stopped && this._pty !== null; }

  // ---------------------------------------------------------------------------
  // Session persistence
  // ---------------------------------------------------------------------------

  _writeSession() {
    const record = {
      sessionId:  this.sessionId,
      platform:   this.platform,
      bin:        this.bin,
      pid:        this._pty?.pid ?? null,
      cols:       this.cols,
      rows:       this.rows,
      cwd:        this.cwd,
      started_at: this._startedAt,
    };
    const tmp = path.join(SESSION_DIR, `${this.sessionId}.json.tmp`);
    const dst = path.join(SESSION_DIR, `${this.sessionId}.json`);
    fs.writeFileSync(tmp, JSON.stringify(record, null, 2));
    fs.renameSync(tmp, dst);
  }

  // ---------------------------------------------------------------------------
  // Static helpers
  // ---------------------------------------------------------------------------

  /**
   * List all active PTY sessions by reading the session directory and
   * verifying each recorded PID is still alive.
   * Stale session files (dead PID) are removed automatically.
   *
   * @returns {Array<{sessionId, platform, bin, pid, cols, rows, cwd, started_at}>}
   */
  static list() {
    if (!fs.existsSync(SESSION_DIR)) return [];

    return fs.readdirSync(SESSION_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(SESSION_DIR, f), 'utf8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((s) => {
        if (!s.pid) return false;
        try {
          process.kill(s.pid, 0);   // signal 0 = existence check
          return true;
        } catch {
          // Stale — clean up
          PTYAdapter._removeSession(s.sessionId);
          return false;
        }
      });
  }

  /**
   * Return the session record for a given ID, or null if not found / stale.
   * @param {string} sessionId
   * @returns {object|null}
   */
  static getSession(sessionId) {
    const p = path.join(SESSION_DIR, `${sessionId}.json`);
    if (!fs.existsSync(p)) return null;
    try {
      const s = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (!s.pid) return null;
      process.kill(s.pid, 0);
      return s;
    } catch {
      PTYAdapter._removeSession(sessionId);
      return null;
    }
  }

  static _generateSessionId() {
    return randomBytes(6).toString('hex');
  }

  static _ensureSessionDir() {
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
  }

  static _removeSession(sessionId) {
    try {
      const p = path.join(SESSION_DIR, `${sessionId}.json`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Sandbox transport factory (#657)
  // ---------------------------------------------------------------------------

  /**
   * Create a PTYAdapter backed by a remote agentic-sandbox instance.
   * Connects via the management server's HTTP API instead of spawning locally.
   *
   * Auto-selects this mode when AIWG_SANDBOX_ENDPOINT is set:
   *   AIWG_SANDBOX_ENDPOINT=http://localhost:8122 aiwg daemon pty start
   *
   * @param {object} opts
   * @param {string} opts.httpEndpoint - Sandbox management HTTP endpoint
   * @param {string} opts.agentId - Target agent ID on the sandbox
   * @param {string} opts.platform - AIWG provider key
   * @param {string[]} [opts.args] - Extra arguments
   * @param {number} [opts.cols] - Terminal width (default: 120)
   * @param {number} [opts.rows] - Terminal height (default: 30)
   * @param {string} [opts.cwd] - Working directory on remote agent
   * @returns {PTYAdapter} Adapter instance using sandbox transport
   */
  static fromSandbox({
    httpEndpoint,
    agentId,
    platform,
    args = [],
    cols = 120,
    rows = 30,
    cwd = '/home/agent',
  }) {
    const adapter = new PTYAdapter({ platform, args, cols, rows, cwd });
    const bin = PLATFORM_BINS[platform] || platform;

    // Replace local start() with sandbox transport
    const transport = new SandboxTransport({
      httpEndpoint,
      agentId,
      command: bin,
      args,
      cols,
      rows,
      cwd,
    });

    // Wire transport events through the adapter
    transport.on('data', (chunk) => adapter.emit('data', chunk));
    transport.on('exit', (info) => {
      adapter._stopped = true;
      PTYAdapter._removeSession(adapter.sessionId);
      adapter.emit('exit', info);
    });
    transport.on('error', (err) => adapter.emit('error', err));

    // Override lifecycle methods to use transport
    adapter._transport = transport;
    adapter.start = async function () {
      PTYAdapter._ensureSessionDir();
      adapter._startedAt = new Date().toISOString();
      const cmdId = await transport.start();
      adapter.commandId = cmdId;
      adapter._writeSessionSandbox(httpEndpoint, agentId);
      return adapter.sessionId;
    };
    adapter.write = (data) => transport.write(data);
    adapter.resize = (c, r) => {
      adapter.cols = c;
      adapter.rows = r;
      transport.resize(c, r);
    };
    adapter.stop = () => transport.stop();
    adapter.isActive = () => transport.isActive();

    return adapter;
  }

  /**
   * Write a sandbox-backed session record (includes endpoint + agentId).
   * @param {string} httpEndpoint
   * @param {string} agentId
   */
  _writeSessionSandbox(httpEndpoint, agentId) {
    const record = {
      sessionId:     this.sessionId,
      platform:      this.platform,
      bin:           this.bin,
      pid:           null,
      cols:          this.cols,
      rows:          this.rows,
      cwd:           this.cwd,
      started_at:    this._startedAt,
      transport:     'sandbox',
      httpEndpoint,
      agentId,
      commandId:     this.commandId || null,
    };
    PTYAdapter._ensureSessionDir();
    const tmp = path.join(SESSION_DIR, `${this.sessionId}.json.tmp`);
    const dst = path.join(SESSION_DIR, `${this.sessionId}.json`);
    fs.writeFileSync(tmp, JSON.stringify(record, null, 2));
    fs.renameSync(tmp, dst);
  }

  /**
   * Resolve the transport mode based on environment and config.
   *
   * @param {object} opts - Same as PTYAdapter constructor
   * @returns {PTYAdapter} Local or sandbox-backed adapter
   */
  static auto(opts) {
    const endpoint = process.env.AIWG_SANDBOX_ENDPOINT;
    const agentId = process.env.AIWG_SANDBOX_AGENT_ID || 'agent-01';

    if (endpoint) {
      return PTYAdapter.fromSandbox({
        httpEndpoint: endpoint,
        agentId,
        ...opts,
      });
    }

    return new PTYAdapter(opts);
  }
}
