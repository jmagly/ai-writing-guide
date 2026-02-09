/**
 * Unit tests for IPCClient
 * @source @tools/daemon/ipc-client.mjs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import net from 'node:net';

// Mock modules BEFORE importing the class
vi.mock('node:net');

// Import after mocking
import { IPCClient, createClient } from '../../../tools/daemon/ipc-client.mjs';

const createMockSocket = () => {
  const socket = new EventEmitter();
  socket.write = vi.fn();
  socket.end = vi.fn();
  socket.destroyed = false;
  socket.removeListener = vi.fn(EventEmitter.prototype.removeListener.bind(socket));
  socket.once = vi.fn(EventEmitter.prototype.once.bind(socket));
  return socket;
};

describe('IPCClient', () => {
  let client;
  let mockSocket;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSocket = createMockSocket();

    net.createConnection = vi.fn((socketPath) => {
      // Simulate async connection
      setImmediate(() => {
        mockSocket.emit('connect');
      });
      return mockSocket;
    });

    client = new IPCClient('/tmp/test.sock');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('sets socketPath from parameter', () => {
      expect(client.socketPath).toBe('/tmp/test.sock');
    });

    it('sets default timeout to 30000ms', () => {
      expect(client.defaultTimeout).toBe(30000);
    });

    it('accepts custom timeout in options', () => {
      const customClient = new IPCClient('/tmp/test.sock', { timeout: 60000 });
      expect(customClient.defaultTimeout).toBe(60000);
    });

    it('initializes with connected = false', () => {
      expect(client.connected).toBe(false);
    });

    it('initializes empty pending map', () => {
      expect(client.pending.size).toBe(0);
    });

    it('initializes requestId to 0', () => {
      expect(client.requestId).toBe(0);
    });
  });

  describe('connect', () => {
    it('creates connection to socketPath', async () => {
      await client.connect();
      expect(net.createConnection).toHaveBeenCalledWith('/tmp/test.sock');
    });

    it('sets connected to true on success', async () => {
      await client.connect();
      expect(client.connected).toBe(true);
    });

    it('emits connected event', async () => {
      const listener = vi.fn();
      client.on('connected', listener);
      await client.connect();
      expect(listener).toHaveBeenCalled();
    });

    it('rejects with "not running" on ENOENT', async () => {
      net.createConnection = vi.fn(() => {
        const socket = createMockSocket();
        setImmediate(() => {
          const err = new Error('ENOENT');
          err.code = 'ENOENT';
          socket.emit('error', err);
        });
        return socket;
      });

      await expect(client.connect()).rejects.toThrow('Daemon is not running');
    });

    it('rejects with "not accepting connections" on ECONNREFUSED', async () => {
      net.createConnection = vi.fn(() => {
        const socket = createMockSocket();
        setImmediate(() => {
          const err = new Error('ECONNREFUSED');
          err.code = 'ECONNREFUSED';
          socket.emit('error', err);
        });
        return socket;
      });

      await expect(client.connect()).rejects.toThrow('not accepting connections');
    });

    it('is no-op when already connected', async () => {
      await client.connect();
      const callCount = net.createConnection.mock.calls.length;
      await client.connect();
      expect(net.createConnection.mock.calls.length).toBe(callCount);
    });
  });

  describe('request', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('sends JSON-RPC with auto-incrementing id', async () => {
      const promise = client.request('method1', { arg: 'value' });

      // Respond immediately
      const message = {
        jsonrpc: '2.0',
        id: 1,
        result: { success: true },
      };
      mockSocket.emit('data', Buffer.from(JSON.stringify(message) + '\n'));

      await promise;

      const written = mockSocket.write.mock.calls[0][0];
      const request = JSON.parse(written);
      expect(request.id).toBe(1);
      expect(request.method).toBe('method1');
    });

    it('increments id for each request', async () => {
      // First request
      const p1 = client.request('method1');
      mockSocket.emit('data', Buffer.from(JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }) + '\n'));
      await p1;

      // Second request
      const p2 = client.request('method2');
      mockSocket.emit('data', Buffer.from(JSON.stringify({ jsonrpc: '2.0', id: 2, result: {} }) + '\n'));
      await p2;

      const requests = mockSocket.write.mock.calls.map(call => JSON.parse(call[0]));
      expect(requests[0].id).toBe(1);
      expect(requests[1].id).toBe(2);
    });

    it('times out and rejects after timeout period', async () => {
      vi.useFakeTimers();

      const promise = client.request('method', {}, 1000);

      vi.advanceTimersByTime(1000);

      await expect(promise).rejects.toThrow('Request timeout: method (1000ms)');

      vi.useRealTimers();
    });

    it('uses defaultTimeout when timeout not specified', async () => {
      const customClient = new IPCClient('/tmp/test.sock', { timeout: 5000 });
      await customClient.connect();

      vi.useFakeTimers();

      const promise = customClient.request('method');

      vi.advanceTimersByTime(4999);
      // Should not timeout yet

      vi.advanceTimersByTime(1);
      await expect(promise).rejects.toThrow('5000ms');

      vi.useRealTimers();
    });

    it('rejects when not connected', async () => {
      client.connected = false;
      await expect(client.request('method')).rejects.toThrow('Not connected to daemon');
    });

    it('resolves with result on success response', async () => {
      const promise = client.request('test');

      mockSocket.emit('data', Buffer.from(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { data: 'success' },
      }) + '\n'));

      const result = await promise;
      expect(result).toEqual({ data: 'success' });
    });

    it('rejects with error on error response', async () => {
      const promise = client.request('test');

      mockSocket.emit('data', Buffer.from(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      }) + '\n'));

      await expect(promise).rejects.toThrow('Method not found');
    });
  });

  describe('notify', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('sends JSON-RPC without id', () => {
      client.notify('event', { data: 'test' });

      const written = mockSocket.write.mock.calls[0][0];
      const notification = JSON.parse(written);

      expect(notification.jsonrpc).toBe('2.0');
      expect(notification.method).toBe('event');
      expect(notification.params).toEqual({ data: 'test' });
      expect(notification.id).toBeUndefined();
    });

    it('throws when not connected', () => {
      client.connected = false;
      expect(() => client.notify('event')).toThrow('Not connected to daemon');
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('ends socket', () => {
      client.disconnect();
      expect(mockSocket.end).toHaveBeenCalled();
    });

    it('sets connected to false', () => {
      client.disconnect();
      expect(client.connected).toBe(false);
    });

    it('sets socket to null', () => {
      client.disconnect();
      expect(client.socket).toBeNull();
    });
  });

  describe('isConnected getter', () => {
    it('returns false when not connected', () => {
      expect(client.isConnected).toBe(false);
    });

    it('returns true when connected', async () => {
      await client.connect();
      expect(client.isConnected).toBe(true);
    });
  });

  describe('_processBuffer', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('handles newline-delimited messages', () => {
      const handleMessage = vi.spyOn(client, '_handleMessage');

      client.buffer = JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }) + '\n';
      client._processBuffer();

      expect(handleMessage).toHaveBeenCalledOnce();
      expect(client.buffer).toBe('');
    });

    it('handles multiple messages in buffer', () => {
      const handleMessage = vi.spyOn(client, '_handleMessage');

      client.buffer =
        JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }) + '\n' +
        JSON.stringify({ jsonrpc: '2.0', id: 2, result: {} }) + '\n';

      client._processBuffer();

      expect(handleMessage).toHaveBeenCalledTimes(2);
      expect(client.buffer).toBe('');
    });

    it('handles partial messages by buffering', () => {
      const handleMessage = vi.spyOn(client, '_handleMessage');

      client.buffer = '{"jsonrpc":"2.0","id":1';
      client._processBuffer();

      expect(handleMessage).not.toHaveBeenCalled();
      expect(client.buffer).toBe('{"jsonrpc":"2.0","id":1');
    });

    it('emits error event on invalid JSON', () => {
      const errorListener = vi.fn();
      client.on('error', errorListener);

      client.buffer = 'not json\n';
      client._processBuffer();

      expect(errorListener).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Invalid JSON'),
      }));
    });
  });

  describe('_handleMessage', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('resolves pending request on success', async () => {
      const promise = client.request('test');

      client._handleMessage({
        jsonrpc: '2.0',
        id: 1,
        result: { success: true },
      });

      const result = await promise;
      expect(result).toEqual({ success: true });
    });

    it('rejects pending request on error', async () => {
      const promise = client.request('test');

      client._handleMessage({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32601,
          message: 'Not found',
        },
      });

      await expect(promise).rejects.toThrow('Not found');
    });

    it('emits notification event for server-pushed events', () => {
      const listener = vi.fn();
      client.on('notification', listener);

      client._handleMessage({
        jsonrpc: '2.0',
        method: 'event',
        params: { data: 'test' },
      });

      expect(listener).toHaveBeenCalledWith('event', { data: 'test' });
    });

    it('ignores orphaned responses', () => {
      // No pending request with id 999
      expect(() => {
        client._handleMessage({
          jsonrpc: '2.0',
          id: 999,
          result: {},
        });
      }).not.toThrow();
    });

    it('clears timeout timer on response', async () => {
      vi.useFakeTimers();

      const promise = client.request('test', {}, 5000);

      // Respond before timeout
      client._handleMessage({
        jsonrpc: '2.0',
        id: 1,
        result: {},
      });

      await promise;

      // Advance past timeout - should not reject
      vi.advanceTimersByTime(6000);

      vi.useRealTimers();
    });
  });

  describe('socket close handling', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('rejects all pending requests on close', async () => {
      const p1 = client.request('method1');
      const p2 = client.request('method2');

      mockSocket.emit('close');

      await expect(p1).rejects.toThrow('Connection closed');
      await expect(p2).rejects.toThrow('Connection closed');
    });

    it('clears pending map on close', async () => {
      const p1 = client.request('method1');
      const p2 = client.request('method2');

      expect(client.pending.size).toBe(2);

      mockSocket.emit('close');

      // Wait for promises to reject
      await Promise.allSettled([p1, p2]);

      expect(client.pending.size).toBe(0);
    });

    it('sets connected to false on close', async () => {
      mockSocket.emit('close');
      expect(client.connected).toBe(false);
    });

    it('emits disconnected event on close', async () => {
      const listener = vi.fn();
      client.on('disconnected', listener);

      mockSocket.emit('close');

      expect(listener).toHaveBeenCalled();
    });
  });
});

describe('createClient', () => {
  let mockSocket;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSocket = createMockSocket();

    net.createConnection = vi.fn(() => {
      setImmediate(() => {
        mockSocket.emit('connect');
      });
      return mockSocket;
    });
  });

  it('creates and connects client', async () => {
    const client = await createClient('/tmp/test.sock');
    expect(client).toBeInstanceOf(IPCClient);
    expect(client.isConnected).toBe(true);
  });

  it('passes options to client', async () => {
    const client = await createClient('/tmp/test.sock', { timeout: 60000 });
    expect(client.defaultTimeout).toBe(60000);
  });

  it('rejects if connection fails', async () => {
    net.createConnection = vi.fn(() => {
      const socket = createMockSocket();
      setImmediate(() => {
        const err = new Error('ENOENT');
        err.code = 'ENOENT';
        socket.emit('error', err);
      });
      return socket;
    });

    await expect(createClient('/tmp/test.sock')).rejects.toThrow();
  });
});
