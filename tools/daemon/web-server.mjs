/**
 * Daemon Web Server — HTTP + SSE for operator interface
 *
 * Lightweight HTTP server using Node.js built-in `http` module.
 * Serves the web UI dashboard and provides REST API + SSE endpoints
 * for live data streaming.
 *
 * @implements #519
 * @tests @test/unit/web-server.test.mjs
 */

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_UI_DIR = path.join(__dirname, 'web-ui');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export class WebServer extends EventEmitter {
  /**
   * @param {object} options
   * @param {number} [options.port=7474] - HTTP port
   * @param {string} [options.host='127.0.0.1'] - Bind address
   * @param {string} [options.token] - Bearer token for auth (null = no auth)
   * @param {object} [options.daemonSupervisor] - DaemonSupervisor instance
   * @param {object} [options.opsHandlers] - Ops handlers API (for history)
   */
  constructor(options = {}) {
    super();
    this.port = options.port ?? 7474;
    this.host = options.host ?? '127.0.0.1';
    this.token = options.token || process.env.AIWG_WEB_TOKEN || null;
    this.daemonSupervisor = options.daemonSupervisor || null;
    this.opsHandlers = options.opsHandlers || null;
    this.server = null;
    this.sseClients = new Set(); // event stream clients
    this.sseOutputClients = new Map(); // loopId -> Set<res>
    this._startTime = Date.now();
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this._handleRequest(req, res));

      this.server.on('error', (err) => {
        if (!this.server.listening) {
          reject(err);
        } else {
          this.emit('error', err);
        }
      });

      this.server.listen(this.port, this.host, () => {
        // When port: 0 is requested, the OS assigns a free port — read back
        // the actual bound port so callers can connect. Eliminates port-pick
        // races in tests that previously rolled random ports.
        const addr = this.server.address();
        if (addr && typeof addr === 'object' && typeof addr.port === 'number') {
          this.port = addr.port;
        }
        this.emit('listening', { port: this.port, host: this.host });
        resolve();
      });
    });
  }

  async stop() {
    // Close all SSE connections
    for (const client of this.sseClients) {
      client.end();
    }
    this.sseClients.clear();

    for (const [, clients] of this.sseOutputClients) {
      for (const client of clients) {
        client.end();
      }
    }
    this.sseOutputClients.clear();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Push an event to all SSE /sse/events clients.
   */
  broadcastEvent(eventType, data) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      if (!client.destroyed) {
        client.write(payload);
      }
    }
  }

  /**
   * Push output data to SSE /sse/output/:loopId clients.
   */
  pushOutput(loopId, chunk) {
    const clients = this.sseOutputClients.get(loopId);
    if (!clients) return;
    const payload = `data: ${JSON.stringify({ loopId, chunk })}\n\n`;
    for (const client of clients) {
      if (!client.destroyed) {
        client.write(payload);
      }
    }
  }

  get url() {
    return `http://${this.host}:${this.port}`;
  }

  // --- Request handling ---

  async _handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Auth check for all paths except root and static (optional)
    if (this.token && (pathname.startsWith('/api/') || pathname.startsWith('/sse/'))) {
      if (!this._checkAuth(req, url)) {
        this._sendJSON(res, 401, { error: 'Unauthorized' });
        return;
      }
    }

    try {
      // API routes
      if (pathname === '/api/status' && req.method === 'GET') {
        return this._handleApiStatus(req, res);
      }
      if (pathname === '/api/loops' && req.method === 'GET') {
        return this._handleApiLoops(req, res);
      }
      if (pathname === '/api/history' && req.method === 'GET') {
        return this._handleApiHistory(req, res, url);
      }
      if (pathname === '/api/resources' && req.method === 'GET') {
        return this._handleApiResources(req, res);
      }
      if (pathname === '/api/submit' && req.method === 'POST') {
        return this._handleApiSubmit(req, res);
      }
      if (pathname.startsWith('/api/cancel/') && req.method === 'POST') {
        const loopId = pathname.slice('/api/cancel/'.length);
        return this._handleApiCancel(req, res, loopId);
      }

      // SSE routes
      if (pathname === '/sse/events' && req.method === 'GET') {
        return this._handleSSEEvents(req, res);
      }
      if (pathname.startsWith('/sse/output/') && req.method === 'GET') {
        const loopId = pathname.slice('/sse/output/'.length);
        return this._handleSSEOutput(req, res, loopId);
      }

      // Static files
      if (pathname === '/' || pathname === '/index.html') {
        return this._serveFile(res, 'index.html');
      }
      if (pathname.startsWith('/static/')) {
        const filePath = pathname.slice('/static/'.length);
        return this._serveFile(res, filePath);
      }

      // 404
      this._sendJSON(res, 404, { error: 'Not found' });
    } catch (err) {
      this._sendJSON(res, 500, { error: err.message });
    }
  }

  _checkAuth(req, url) {
    if (!this.token) return true;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7) === this.token;
    }

    // Check query param
    const tokenParam = url.searchParams.get('token');
    if (tokenParam) {
      return tokenParam === this.token;
    }

    return false;
  }

  // --- API Handlers ---

  _handleApiStatus(_req, res) {
    if (!this.daemonSupervisor) {
      return this._sendJSON(res, 200, { status: 'starting', message: 'Supervisor not initialized' });
    }
    const status = this.daemonSupervisor.status();
    this._sendJSON(res, 200, {
      status: 'healthy',
      uptime: Math.floor((Date.now() - this._startTime) / 1000),
      concurrency: { used: status.concurrencyUsed, max: status.concurrencyMax },
      queue: { depth: status.queueDepth, max: status.queueMax },
      circuit: status.circuitState,
      budget: { used: status.budgetUsed, limit: status.budgetLimit },
    });
  }

  _handleApiLoops(_req, res) {
    if (!this.daemonSupervisor) {
      return this._sendJSON(res, 200, { running: [], queued: [] });
    }
    const status = this.daemonSupervisor.status();
    this._sendJSON(res, 200, {
      running: status.running,
      queued: status.queued,
    });
  }

  _handleApiHistory(_req, res, url) {
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    if (this.opsHandlers) {
      const history = this.opsHandlers.getHistory();
      this._sendJSON(res, 200, history.slice(-limit).reverse());
    } else {
      this._sendJSON(res, 200, []);
    }
  }

  _handleApiResources(_req, res) {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const status = this.daemonSupervisor ? this.daemonSupervisor.status() : null;

    this._sendJSON(res, 200, {
      cpu: { cores: os.cpus().length, loadAvg: os.loadavg() },
      memory: {
        totalMb: Math.round(totalMem / 1024 / 1024),
        freeMb: Math.round(freeMem / 1024 / 1024),
        percentUsed: parseFloat(((1 - freeMem / totalMem) * 100).toFixed(1)),
      },
      queueDepth: status?.queueDepth ?? 0,
      budgetRemaining: status
        ? (status.budgetLimit > 0 ? status.budgetLimit - status.budgetUsed : 'unlimited')
        : 'unknown',
    });
  }

  async _handleApiSubmit(req, res) {
    if (!this.daemonSupervisor) {
      return this._sendJSON(res, 503, { error: 'Supervisor not initialized' });
    }

    const body = await this._readBody(req);
    if (!body.prompt) {
      return this._sendJSON(res, 400, { error: 'Missing required field: prompt' });
    }

    try {
      const result = this.daemonSupervisor.submit({
        loopId: body.loopId,
        prompt: body.prompt,
        priority: body.priority || 0,
        estimatedCostUsd: body.estimatedCostUsd || 0,
      });
      this._sendJSON(res, 201, result);
    } catch (err) {
      this._sendJSON(res, 422, { error: err.message });
    }
  }

  _handleApiCancel(_req, res, loopId) {
    if (!this.daemonSupervisor) {
      return this._sendJSON(res, 503, { error: 'Supervisor not initialized' });
    }

    const cancelled = this.daemonSupervisor.cancel(loopId);
    this._sendJSON(res, 200, { cancelled, loopId });
  }

  // --- SSE Handlers ---

  _handleSSEEvents(_req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(':connected\n\n');

    this.sseClients.add(res);
    res.on('close', () => this.sseClients.delete(res));
  }

  _handleSSEOutput(_req, res, loopId) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(`:connected to ${loopId}\n\n`);

    if (!this.sseOutputClients.has(loopId)) {
      this.sseOutputClients.set(loopId, new Set());
    }
    this.sseOutputClients.get(loopId).add(res);

    res.on('close', () => {
      const clients = this.sseOutputClients.get(loopId);
      if (clients) {
        clients.delete(res);
        if (clients.size === 0) {
          this.sseOutputClients.delete(loopId);
        }
      }
    });
  }

  // --- Utilities ---

  _serveFile(res, filePath) {
    // Prevent directory traversal
    const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(WEB_UI_DIR, normalized);

    if (!fullPath.startsWith(WEB_UI_DIR)) {
      this._sendJSON(res, 403, { error: 'Forbidden' });
      return;
    }

    try {
      const content = fs.readFileSync(fullPath);
      const ext = path.extname(fullPath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        this._sendJSON(res, 404, { error: 'File not found' });
      } else {
        this._sendJSON(res, 500, { error: err.message });
      }
    }
  }

  _sendJSON(res, statusCode, data) {
    if (res.headersSent) return;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  _readBody(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          reject(new Error('Invalid JSON body'));
        }
      });
      req.on('error', reject);
    });
  }
}
