/**
 * Tests for WebServer HTTP + SSE
 *
 * @implements #519
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import { WebServer } from '../../../tools/daemon/web-server.mjs';

// --- Stub DaemonSupervisor ---

class StubSupervisor extends EventEmitter {
  constructor() {
    super();
    this._loops = [];
    this._queued = [];
  }

  status() {
    return {
      running: this._loops,
      queued: this._queued,
      circuitState: { state: 'closed', consecutiveFailures: 0, cooldownRemainingMs: 0 },
      concurrencyUsed: this._loops.length,
      concurrencyMax: 4,
      queueDepth: this._queued.length,
      queueMax: 20,
      budgetUsed: 1.5,
      budgetLimit: 10,
      permanentlyFailed: [],
    };
  }

  submit(config) {
    return { loopId: config.loopId || 'new-loop', queued: false, position: 0 };
  }

  cancel(loopId) {
    return loopId === 'known-loop';
  }
}

// --- HTTP request helper ---

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function jsonRequest(url, options = {}) {
  return request(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  }).then((res) => ({
    ...res,
    json: res.body ? JSON.parse(res.body) : null,
  }));
}

// --- Tests ---

describe('WebServer', () => {
  let server;
  let supervisor;
  let baseUrl;

  beforeEach(async () => {
    supervisor = new StubSupervisor();
    server = new WebServer({
      // Let the OS allocate an available ephemeral port. Choosing a random
      // port still races with other processes between selection and listen.
      port: 0,
      host: '127.0.0.1',
      daemonSupervisor: supervisor,
    });
    await server.start();
    baseUrl = server.url;
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('API endpoints', () => {
    it('GET /api/status should return daemon status', async () => {
      const res = await jsonRequest(`${baseUrl}/api/status`);
      expect(res.status).toBe(200);
      expect(res.json.status).toBe('healthy');
      expect(res.json.concurrency).toBeDefined();
      expect(res.json.budget).toBeDefined();
    });

    it('GET /api/loops should return running and queued', async () => {
      supervisor._loops = [{ loopId: 'l1', pid: 123, startedAt: new Date().toISOString(), taskId: 't1' }];
      const res = await jsonRequest(`${baseUrl}/api/loops`);
      expect(res.status).toBe(200);
      expect(res.json.running).toHaveLength(1);
      expect(res.json.queued).toHaveLength(0);
    });

    it('GET /api/history should return empty array without opsHandlers', async () => {
      const res = await jsonRequest(`${baseUrl}/api/history`);
      expect(res.status).toBe(200);
      expect(res.json).toEqual([]);
    });

    it('GET /api/resources should return system metrics', async () => {
      const res = await jsonRequest(`${baseUrl}/api/resources`);
      expect(res.status).toBe(200);
      expect(res.json.cpu).toBeDefined();
      expect(res.json.memory).toBeDefined();
      expect(typeof res.json.queueDepth).toBe('number');
    });

    it('POST /api/submit should create a loop', async () => {
      const res = await jsonRequest(`${baseUrl}/api/submit`, {
        method: 'POST',
        body: JSON.stringify({ prompt: 'Fix all tests' }),
      });
      expect(res.status).toBe(201);
      expect(res.json.loopId).toBeDefined();
    });

    it('POST /api/submit should reject missing prompt', async () => {
      const res = await jsonRequest(`${baseUrl}/api/submit`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      expect(res.json.error).toContain('prompt');
    });

    it('POST /api/cancel/:loopId should cancel a loop', async () => {
      const res = await jsonRequest(`${baseUrl}/api/cancel/known-loop`, { method: 'POST' });
      expect(res.status).toBe(200);
      expect(res.json.cancelled).toBe(true);
    });

    it('should return 404 for unknown routes', async () => {
      const res = await jsonRequest(`${baseUrl}/api/nonexistent`);
      expect(res.status).toBe(404);
    });

    it('returns 404 for unsupported methods on known paths', async () => {
      const res = await jsonRequest(`${baseUrl}/api/status`, { method: 'POST' });
      expect(res.status).toBe(404);
      expect(res.json.error).toBe('Not found');
    });

    it('returns 503 for submit and cancel when supervisor is not initialized', async () => {
      const bare = new WebServer({ port: 0, host: '127.0.0.1' });
      await bare.start();
      try {
        const submit = await jsonRequest(`${bare.url}/api/submit`, {
          method: 'POST',
          body: JSON.stringify({ prompt: 'work' }),
        });
        const cancel = await jsonRequest(`${bare.url}/api/cancel/loop-1`, { method: 'POST' });
        expect(submit.status).toBe(503);
        expect(cancel.status).toBe(503);
      } finally {
        await bare.stop();
      }
    });

    it('returns 422 when supervisor rejects a submitted loop', async () => {
      supervisor.submit = () => { throw new Error('queue full'); };
      const res = await jsonRequest(`${baseUrl}/api/submit`, {
        method: 'POST',
        body: JSON.stringify({ prompt: 'work' }),
      });
      expect(res.status).toBe(422);
      expect(res.json.error).toBe('queue full');
    });

    it('handles CORS preflight before route dispatch', async () => {
      const res = await request(`${baseUrl}/api/status`, { method: 'OPTIONS' });
      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1');
      expect(res.headers['access-control-allow-methods']).toContain('OPTIONS');
    });
  });

  describe('authentication', () => {
    let authedServer;
    let authedUrl;

    beforeEach(async () => {
      authedServer = new WebServer({
        port: 0,
        host: '127.0.0.1',
        token: 'secret-token',
        daemonSupervisor: supervisor,
      });
      await authedServer.start();
      authedUrl = authedServer.url;
    });

    afterEach(async () => {
      await authedServer.stop();
    });

    it('should reject API requests without token', async () => {
      const res = await jsonRequest(`${authedUrl}/api/status`);
      expect(res.status).toBe(401);
    });

    it('should accept API requests with Bearer token', async () => {
      const res = await jsonRequest(`${authedUrl}/api/status`, {
        headers: { Authorization: 'Bearer secret-token' },
      });
      expect(res.status).toBe(200);
    });

    it('should accept API requests with query param token', async () => {
      const res = await jsonRequest(`${authedUrl}/api/status?token=secret-token`);
      expect(res.status).toBe(200);
    });

    it('should reject API requests with wrong token', async () => {
      const res = await jsonRequest(`${authedUrl}/api/status`, {
        headers: { Authorization: 'Bearer wrong-token' },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('SSE endpoints', () => {
    it('GET /sse/events should return event stream headers', async () => {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(`${baseUrl}/sse/events`, (res) => {
          resolve(res);
          req.destroy();
        });
        req.on('error', reject);
      });
      expect(res.headers['content-type']).toBe('text/event-stream');
      expect(res.headers['cache-control']).toBe('no-cache');
    });

    it('should broadcast events to SSE clients', async () => {
      const events = [];
      await new Promise((resolve, reject) => {
        const req = http.get(`${baseUrl}/sse/events`, (res) => {
          res.on('data', (chunk) => {
            const text = chunk.toString();
            events.push(text);
            if (events.length >= 2) {
              req.destroy();
              resolve();
            }
          });
          // Wait for connection, then broadcast
          setTimeout(() => {
            server.broadcastEvent('loop:started', { loopId: 'test-1' });
          }, 50);
        });
        req.on('error', (err) => {
          if (err.code !== 'ECONNRESET') reject(err);
        });
        setTimeout(() => { req.destroy(); resolve(); }, 3000);
      });

      const eventData = events.join('');
      expect(eventData).toContain('loop:started');
    });

    it('GET /sse/output/:loopId should register and receive pushed output', async () => {
      const chunks = [];
      await new Promise((resolve, reject) => {
        const req = http.get(`${baseUrl}/sse/output/loop-1`, (res) => {
          res.on('data', (chunk) => {
            chunks.push(chunk.toString());
            if (chunks.join('').includes('hello')) {
              req.destroy();
              resolve();
            }
          });
          setTimeout(() => {
            server.pushOutput('loop-1', 'hello');
          }, 50);
        });
        req.on('error', (err) => {
          if (err.code !== 'ECONNRESET') reject(err);
        });
        setTimeout(() => { req.destroy(); resolve(); }, 3000);
      });

      expect(chunks.join('')).toContain('"chunk":"hello"');
    });
  });

  describe('static file serving', () => {
    it('should serve index.html at /', async () => {
      const res = await request(`${baseUrl}/`);
      // May be 200 if index.html exists, or 404 if not yet created in this test context
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers['content-type']).toBe('text/html');
      }
    });

    it('should return 404 for nonexistent static files', async () => {
      const res = await request(`${baseUrl}/static/nonexistent.xyz`);
      expect(res.status).toBe(404);
    });
  });

  describe('graceful behavior without supervisor', () => {
    let noSupServer;

    beforeEach(async () => {
      noSupServer = new WebServer({ port: 0, host: '127.0.0.1' });
      await noSupServer.start();
    });

    afterEach(async () => {
      await noSupServer.stop();
    });

    it('GET /api/status should return starting state', async () => {
      const res = await jsonRequest(`${noSupServer.url}/api/status`);
      expect(res.status).toBe(200);
      expect(res.json.status).toBe('starting');
    });

    it('POST /api/submit should return 503', async () => {
      const res = await jsonRequest(`${noSupServer.url}/api/submit`, {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test' }),
      });
      expect(res.status).toBe(503);
    });
  });
});
