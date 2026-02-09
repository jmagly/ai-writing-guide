/**
 * IPC Client - Unix domain socket client for JSON-RPC 2.0
 *
 * Provides typed RPC calls from CLI commands to the running daemon.
 * Handles connection, timeouts, and reconnection.
 *
 * @implements @.aiwg/requirements/use-cases/UC-IPC-001.md
 * @tests @test/unit/daemon/ipc-client.test.js
 */

import net from 'node:net';
import { EventEmitter } from 'node:events';

export class IPCClient extends EventEmitter {
  constructor(socketPath, options = {}) {
    super();
    this.socketPath = socketPath;
    this.socket = null;
    this.buffer = '';
    this.requestId = 0;
    this.pending = new Map(); // id -> { resolve, reject, timer }
    this.connected = false;
    this.defaultTimeout = options.timeout || 30000;
  }

  /**
   * Connect to the daemon socket
   */
  async connect() {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.socketPath);

      const onConnect = () => {
        this.connected = true;
        this.socket.removeListener('error', onError);
        this.emit('connected');
        resolve();
      };

      const onError = (err) => {
        this.socket.removeListener('connect', onConnect);
        if (err.code === 'ENOENT') {
          reject(new Error('Daemon is not running (socket not found)'));
        } else if (err.code === 'ECONNREFUSED') {
          reject(new Error('Daemon is not accepting connections'));
        } else {
          reject(err);
        }
      };

      this.socket.once('connect', onConnect);
      this.socket.once('error', onError);

      this.socket.on('data', (chunk) => {
        this.buffer += chunk.toString();
        this._processBuffer();
      });

      this.socket.on('close', () => {
        this.connected = false;
        // Reject all pending requests
        for (const [id, entry] of this.pending) {
          clearTimeout(entry.timer);
          entry.reject(new Error('Connection closed'));
        }
        this.pending.clear();
        this.emit('disconnected');
      });

      this.socket.on('error', (err) => {
        if (this.connected) {
          this.emit('error', err);
        }
      });
    });
  }

  /**
   * Send a JSON-RPC request and wait for response
   */
  async request(method, params = {}, timeout) {
    if (!this.connected) {
      throw new Error('Not connected to daemon');
    }

    const timeoutMs = timeout || this.defaultTimeout;
    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout: ${method} (${timeoutMs}ms)`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });

      const message = JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id,
      }) + '\n';

      this.socket.write(message);
    });
  }

  /**
   * Send a notification (no response expected)
   */
  notify(method, params = {}) {
    if (!this.connected) {
      throw new Error('Not connected to daemon');
    }

    const message = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
    }) + '\n';

    this.socket.write(message);
  }

  /**
   * Disconnect from the daemon
   */
  disconnect() {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Check if client is connected
   */
  get isConnected() {
    return this.connected;
  }

  // --- Private methods ---

  _processBuffer() {
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);
        this._handleMessage(message);
      } catch {
        this.emit('error', new Error('Invalid JSON from daemon'));
      }
    }
  }

  _handleMessage(message) {
    // Check if this is a notification (no id)
    if (message.id === undefined || message.id === null) {
      if (message.method) {
        this.emit('notification', message.method, message.params);
      }
      return;
    }

    // This is a response to a pending request
    const entry = this.pending.get(message.id);
    if (!entry) return; // Orphaned response, ignore

    clearTimeout(entry.timer);
    this.pending.delete(message.id);

    if (message.error) {
      const err = new Error(message.error.message);
      err.code = message.error.code;
      entry.reject(err);
    } else {
      entry.resolve(message.result);
    }
  }
}

/**
 * Create a connected client (convenience function)
 */
export async function createClient(socketPath, options = {}) {
  const client = new IPCClient(socketPath, options);
  await client.connect();
  return client;
}
