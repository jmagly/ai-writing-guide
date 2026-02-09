/**
 * Unit tests for IPCServer
 * @source @tools/daemon/ipc-server.mjs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';

// Mock modules BEFORE importing the class
vi.mock('node:net');
vi.mock('node:fs');
vi.mock('node:path');

// Import after mocking
import { IPCServer, ErrorCodes } from '../../../tools/daemon/ipc-server.mjs';

const createMockSocket = () => {
  const socket = new EventEmitter();
  socket.write = vi.fn();
  socket.end = vi.fn();
  socket.destroyed = false;
  return socket;
};

describe('IPCServer', () => {
  let server;
  let mockNetServer;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock server
    mockNetServer = new EventEmitter();
    mockNetServer.listen = vi.fn((socketPath, callback) => {
      setImmediate(callback);
      return mockNetServer;
    });
    mockNetServer.close = vi.fn((callback) => {
      setImmediate(callback);
      return mockNetServer;
    });

    net.createServer = vi.fn((handler) => {
      mockNetServer._handler = handler;
      return mockNetServer;
    });

    // Mock fs
    fs.existsSync = vi.fn(() => false);
    fs.mkdirSync = vi.fn();
    fs.unlinkSync = vi.fn();
    fs.chmodSync = vi.fn();

    // Mock path
    path.dirname = vi.fn((p) => p.replace(/\/[^/]*$/, ''));

    server = new IPCServer('/tmp/test.sock');
  });

  afterEach(async () => {
    if (server && server.running) {
      await server.stop();
    }
  });

  describe('constructor', () => {
    it('sets socketPath from parameter', () => {
      expect(server.socketPath).toBe('/tmp/test.sock');
    });

    it('sets default permissions to 0o600', () => {
      expect(server.permissions).toBe(0o600);
    });

    it('accepts custom permissions in options', () => {
      const customServer = new IPCServer('/tmp/test.sock', { permissions: 0o644 });
      expect(customServer.permissions).toBe(0o644);
    });

    it('initializes empty handlers map', () => {
      expect(server.handlers.size).toBe(0);
    });

    it('initializes empty clients set', () => {
      expect(server.clients.size).toBe(0);
    });
  });

  describe('registerMethod', () => {
    it('registers a method handler', () => {
      const handler = vi.fn();
      server.registerMethod('test', handler);
      expect(server.handlers.get('test')).toBe(handler);
    });

    it('overwrites existing handler with same name', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      server.registerMethod('test', handler1);
      server.registerMethod('test', handler2);
      expect(server.handlers.get('test')).toBe(handler2);
    });
  });

  describe('registerMethods', () => {
    it('registers multiple methods at once', () => {
      const methods = {
        method1: vi.fn(),
        method2: vi.fn(),
        method3: vi.fn(),
      };
      server.registerMethods(methods);
      expect(server.handlers.size).toBe(3);
      expect(server.handlers.get('method1')).toBe(methods.method1);
      expect(server.handlers.get('method2')).toBe(methods.method2);
      expect(server.handlers.get('method3')).toBe(methods.method3);
    });
  });

  describe('start', () => {
    it('creates server and calls listen', async () => {
      await server.start();
      expect(net.createServer).toHaveBeenCalledOnce();
      expect(mockNetServer.listen).toHaveBeenCalledWith('/tmp/test.sock', expect.any(Function));
    });

    it('creates parent directory if not exists', async () => {
      fs.existsSync = vi.fn(() => false);
      await server.start();
      expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp', { recursive: true });
    });

    it('cleans stale socket before starting', async () => {
      await server.start();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('sets permissions on socket file', async () => {
      await server.start();
      expect(fs.chmodSync).toHaveBeenCalledWith('/tmp/test.sock', 0o600);
    });

    it('sets running flag to true', async () => {
      await server.start();
      expect(server.running).toBe(true);
    });

    it('emits listening event', async () => {
      const listener = vi.fn();
      server.on('listening', listener);
      await server.start();
      expect(listener).toHaveBeenCalledWith('/tmp/test.sock');
    });

    it('is no-op when already running', async () => {
      await server.start();
      const callCount = net.createServer.mock.calls.length;
      await server.start();
      expect(net.createServer.mock.calls.length).toBe(callCount);
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('disconnects all clients', async () => {
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();
      server.clients.add(socket1);
      server.clients.add(socket2);

      await server.stop();

      expect(socket1.end).toHaveBeenCalled();
      expect(socket2.end).toHaveBeenCalled();
    });

    it('clears clients set', async () => {
      const socket = createMockSocket();
      server.clients.add(socket);
      await server.stop();
      expect(server.clients.size).toBe(0);
    });

    it('closes server', async () => {
      await server.stop();
      expect(mockNetServer.close).toHaveBeenCalled();
    });

    it('cleans socket file', async () => {
      await server.stop();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('emits closed event', async () => {
      const listener = vi.fn();
      server.on('closed', listener);
      await server.stop();
      expect(listener).toHaveBeenCalled();
    });

    it('sets running flag to false', async () => {
      await server.stop();
      expect(server.running).toBe(false);
    });

    it('ignores errors when client.end throws', async () => {
      const socket = createMockSocket();
      socket.end = vi.fn(() => {
        throw new Error('Socket already closed');
      });
      server.clients.add(socket);
      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe('broadcast', () => {
    let socket1, socket2;

    beforeEach(async () => {
      await server.start();
      socket1 = createMockSocket();
      socket2 = createMockSocket();
      server.clients.add(socket1);
      server.clients.add(socket2);
    });

    it('sends notification to all clients', () => {
      server.broadcast('event', { data: 'test' });

      const expected = JSON.stringify({
        jsonrpc: '2.0',
        method: 'event',
        params: { data: 'test' },
      }) + '\n';

      expect(socket1.write).toHaveBeenCalledWith(expected);
      expect(socket2.write).toHaveBeenCalledWith(expected);
    });

    it('skips destroyed sockets', () => {
      socket1.destroyed = true;
      server.broadcast('event', { data: 'test' });
      expect(socket1.write).not.toHaveBeenCalled();
      expect(socket2.write).toHaveBeenCalled();
    });

    it('ignores write errors', () => {
      socket1.write = vi.fn(() => {
        throw new Error('Write failed');
      });
      expect(() => server.broadcast('event', {})).not.toThrow();
    });
  });

  describe('_processMessage', () => {
    let socket;

    beforeEach(async () => {
      await server.start();
      socket = createMockSocket();
    });

    it('returns PARSE_ERROR for invalid JSON', async () => {
      await server._processMessage(socket, 'not json');

      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('"code":-32700')
      );
      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('Parse error')
      );
    });

    it('validates jsonrpc field is 2.0', async () => {
      const request = JSON.stringify({ method: 'test', id: 1 });
      await server._processMessage(socket, request);

      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('"code":-32600')
      );
      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('missing jsonrpc 2.0')
      );
    });

    it('validates method field exists', async () => {
      const request = JSON.stringify({ jsonrpc: '2.0', id: 1 });
      await server._processMessage(socket, request);

      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('"code":-32600')
      );
      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('missing method')
      );
    });

    it('returns METHOD_NOT_FOUND for unknown method', async () => {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'unknown',
        id: 1,
      });
      await server._processMessage(socket, request);

      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('"code":-32601')
      );
      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('Method not found')
      );
    });

    it('routes to correct handler', async () => {
      const handler = vi.fn(async () => ({ success: true }));
      server.registerMethod('test', handler);

      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: { arg: 'value' },
        id: 1,
      });
      await server._processMessage(socket, request);

      expect(handler).toHaveBeenCalledWith({ arg: 'value' });
    });

    it('returns INTERNAL_ERROR for handler exceptions', async () => {
      const handler = vi.fn(async () => {
        throw new Error('Handler error');
      });
      server.registerMethod('test', handler);

      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });
      await server._processMessage(socket, request);

      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('"code":-32603')
      );
      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('Handler error')
      );
    });

    it('returns INVALID_PARAMS when handler throws with code INVALID_PARAMS', async () => {
      const handler = vi.fn(async () => {
        const err = new Error('Invalid parameters');
        err.code = 'INVALID_PARAMS';
        throw err;
      });
      server.registerMethod('test', handler);

      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      });
      await server._processMessage(socket, request);

      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('"code":-32602')
      );
      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('Invalid parameters')
      );
    });

    it('does not send response for notifications (no id)', async () => {
      const handler = vi.fn(async () => ({ success: true }));
      server.registerMethod('test', handler);

      const notification = JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
      });
      await server._processMessage(socket, notification);

      expect(handler).toHaveBeenCalled();
      expect(socket.write).not.toHaveBeenCalled();
    });

    it('sends response when request has id', async () => {
      const handler = vi.fn(async () => ({ result: 'value' }));
      server.registerMethod('test', handler);

      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        id: 42,
      });
      await server._processMessage(socket, request);

      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('"id":42')
      );
      expect(socket.write).toHaveBeenCalledWith(
        expect.stringContaining('"result":{"result":"value"}')
      );
    });
  });

  describe('_sendResponse', () => {
    let socket;

    beforeEach(() => {
      socket = createMockSocket();
    });

    it('sends valid JSON-RPC response', () => {
      server._sendResponse(socket, 1, { data: 'test' });

      const response = JSON.parse(socket.write.mock.calls[0][0]);
      expect(response).toEqual({
        jsonrpc: '2.0',
        result: { data: 'test' },
        id: 1,
      });
    });

    it('includes newline delimiter', () => {
      server._sendResponse(socket, 1, {});
      expect(socket.write.mock.calls[0][0]).toMatch(/\n$/);
    });

    it('skips write on destroyed socket', () => {
      socket.destroyed = true;
      server._sendResponse(socket, 1, {});
      expect(socket.write).not.toHaveBeenCalled();
    });

    it('uses null for undefined result', () => {
      server._sendResponse(socket, 1, undefined);
      const response = JSON.parse(socket.write.mock.calls[0][0]);
      expect(response.result).toBeNull();
    });
  });

  describe('_sendError', () => {
    let socket;

    beforeEach(() => {
      socket = createMockSocket();
    });

    it('sends valid JSON-RPC error', () => {
      server._sendError(socket, 1, ErrorCodes.INTERNAL_ERROR, 'Test error');

      const response = JSON.parse(socket.write.mock.calls[0][0]);
      expect(response).toEqual({
        jsonrpc: '2.0',
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Test error',
        },
        id: 1,
      });
    });

    it('includes newline delimiter', () => {
      server._sendError(socket, 1, -32000, 'Error');
      expect(socket.write.mock.calls[0][0]).toMatch(/\n$/);
    });

    it('skips write on destroyed socket', () => {
      socket.destroyed = true;
      server._sendError(socket, 1, -32000, 'Error');
      expect(socket.write).not.toHaveBeenCalled();
    });

    it('uses null id when id is undefined', () => {
      server._sendError(socket, undefined, -32000, 'Error');
      const response = JSON.parse(socket.write.mock.calls[0][0]);
      expect(response.id).toBeNull();
    });
  });

  describe('_cleanupStaleSocket', () => {
    it('removes existing socket file', () => {
      server._cleanupStaleSocket();
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/test.sock');
    });

    it('ignores ENOENT error', () => {
      fs.unlinkSync = vi.fn(() => {
        const err = new Error('ENOENT');
        err.code = 'ENOENT';
        throw err;
      });
      expect(() => server._cleanupStaleSocket()).not.toThrow();
    });

    it('throws other errors', () => {
      fs.unlinkSync = vi.fn(() => {
        throw new Error('Permission denied');
      });
      expect(() => server._cleanupStaleSocket()).toThrow('Permission denied');
    });
  });

  describe('clientCount getter', () => {
    it('returns number of connected clients', async () => {
      await server.start();
      expect(server.clientCount).toBe(0);

      server.clients.add(createMockSocket());
      expect(server.clientCount).toBe(1);

      server.clients.add(createMockSocket());
      expect(server.clientCount).toBe(2);
    });
  });

  describe('methods getter', () => {
    it('returns array of registered method names', () => {
      server.registerMethod('method1', vi.fn());
      server.registerMethod('method2', vi.fn());
      server.registerMethod('method3', vi.fn());

      const methods = server.methods;
      expect(methods).toEqual(expect.arrayContaining(['method1', 'method2', 'method3']));
      expect(methods).toHaveLength(3);
    });

    it('returns empty array when no methods registered', () => {
      expect(server.methods).toEqual([]);
    });
  });
});
