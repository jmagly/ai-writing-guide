/**
 * IPC Server - Unix domain socket server with JSON-RPC 2.0
 *
 * Provides live 2-way communication between the daemon process and CLI clients.
 * Uses newline-delimited JSON framing over Unix domain sockets.
 *
 * @implements @.aiwg/requirements/use-cases/UC-IPC-001.md
 * @tests @test/unit/daemon/ipc-server.test.js
 */

import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

// JSON-RPC 2.0 error codes
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

export class IPCServer extends EventEmitter {
  constructor(socketPath, options = {}) {
    super();
    this.socketPath = socketPath;
    this.server = null;
    this.clients = new Set();
    this.handlers = new Map();
    this.running = false;
    this.permissions = options.permissions || 0o600;
  }

  /**
   * Register a method handler for JSON-RPC calls
   */
  registerMethod(method, handler) {
    this.handlers.set(method, handler);
  }

  /**
   * Register multiple method handlers at once
   */
  registerMethods(methods) {
    for (const [name, handler] of Object.entries(methods)) {
      this.registerMethod(name, handler);
    }
  }

  /**
   * Start listening on the Unix domain socket
   */
  async start() {
    if (this.running) return;

    // Ensure parent directory exists
    const dir = path.dirname(this.socketPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Clean up stale socket
    this._cleanupStaleSocket();

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this._handleConnection(socket);
      });

      this.server.on('error', (err) => {
        if (!this.running) {
          reject(err);
        } else {
          this.emit('error', err);
        }
      });

      this.server.listen(this.socketPath, () => {
        // Set secure permissions on socket file
        try {
          fs.chmodSync(this.socketPath, this.permissions);
        } catch {
          // chmod may not be supported on all platforms
        }
        this.running = true;
        this.emit('listening', this.socketPath);
        resolve();
      });
    });
  }

  /**
   * Stop the server and disconnect all clients
   */
  async stop() {
    if (!this.running) return;
    this.running = false;

    // Disconnect all clients
    for (const client of this.clients) {
      try {
        client.end();
      } catch {
        // Ignore errors during shutdown
      }
    }
    this.clients.clear();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this._cleanupStaleSocket();
          this.emit('closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Broadcast a notification to all connected clients (no id = notification)
   */
  broadcast(method, params) {
    const notification = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
    }) + '\n';

    for (const client of this.clients) {
      try {
        if (!client.destroyed) {
          client.write(notification);
        }
      } catch {
        // Client may have disconnected
      }
    }
  }

  /**
   * Get count of connected clients
   */
  get clientCount() {
    return this.clients.size;
  }

  /**
   * Get list of registered methods
   */
  get methods() {
    return Array.from(this.handlers.keys());
  }

  // --- Private methods ---

  _handleConnection(socket) {
    this.clients.add(socket);
    let buffer = '';

    this.emit('client:connect', { clientCount: this.clients.size });

    socket.on('data', (chunk) => {
      buffer += chunk.toString();

      // Process newline-delimited JSON messages
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.trim()) {
          this._processMessage(socket, line);
        }
      }
    });

    socket.on('error', (err) => {
      // ECONNRESET and EPIPE are expected when clients disconnect
      if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
        this.emit('error', err);
      }
    });

    socket.on('close', () => {
      this.clients.delete(socket);
      this.emit('client:disconnect', { clientCount: this.clients.size });
    });
  }

  async _processMessage(socket, raw) {
    let request;
    try {
      request = JSON.parse(raw);
    } catch {
      this._sendError(socket, null, PARSE_ERROR, 'Parse error');
      return;
    }

    // Validate JSON-RPC 2.0
    if (request.jsonrpc !== '2.0') {
      this._sendError(socket, request.id, INVALID_REQUEST, 'Invalid Request: missing jsonrpc 2.0');
      return;
    }

    if (!request.method || typeof request.method !== 'string') {
      this._sendError(socket, request.id, INVALID_REQUEST, 'Invalid Request: missing method');
      return;
    }

    // Find handler
    const handler = this.handlers.get(request.method);
    if (!handler) {
      this._sendError(socket, request.id, METHOD_NOT_FOUND, `Method not found: ${request.method}`);
      return;
    }

    // Execute handler
    try {
      const result = await handler(request.params || {});

      // Only send response if request has an id (not a notification)
      if (request.id !== undefined && request.id !== null) {
        this._sendResponse(socket, request.id, result);
      }
    } catch (err) {
      if (err.code === 'INVALID_PARAMS') {
        this._sendError(socket, request.id, INVALID_PARAMS, err.message);
      } else {
        this._sendError(socket, request.id, INTERNAL_ERROR, err.message);
      }
    }
  }

  _sendResponse(socket, id, result) {
    if (socket.destroyed) return;
    const response = JSON.stringify({
      jsonrpc: '2.0',
      result: result !== undefined ? result : null,
      id,
    }) + '\n';
    socket.write(response);
  }

  _sendError(socket, id, code, message) {
    if (socket.destroyed) return;
    const response = JSON.stringify({
      jsonrpc: '2.0',
      error: { code, message },
      id: id !== undefined ? id : null,
    }) + '\n';
    socket.write(response);
  }

  _cleanupStaleSocket() {
    try {
      fs.unlinkSync(this.socketPath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }
}

// Standard error codes export for clients
export const ErrorCodes = {
  PARSE_ERROR,
  INVALID_REQUEST,
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
  INTERNAL_ERROR,
};
