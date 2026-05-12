// Fake agentic-sandbox HTTP + WS harness.
//
// Mimics the agentic-sandbox management-server surface that `aiwg serve` and
// `tools/daemon/sandbox-transport.mjs` consume, so integration tests can drive
// the full stack without a live VM host.
//
// Scope: HTTP routes for /api/v1/tasks lifecycle, basic instance listing, and
// the WS streams (/ws/sandbox/:id for events, /ws/tasks/:id for PTY-like
// streams). Scenarios live alongside in scenarios/ and customize response
// timing, error injection, and event sequences.
//
// @issue #1173
// @related test/fixtures/sandbox-api/  (canonical wire-shape fixtures)

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';

/**
 * @typedef {object} Task
 * @property {string} task_id
 * @property {'queued'|'running'|'completed'|'failed'|'cancelled'} state
 * @property {string} created_at
 * @property {string} [started_at]
 * @property {string} [ended_at]
 * @property {number} [exit_code]
 * @property {string[]} log
 * @property {object} manifest
 */

/**
 * @typedef {object} Scenario
 * @property {(req: object) => Promise<object | object[]> | object | object[]} [onTaskCreate]
 *   Override task creation. Default: accept and return queued task.
 * @property {(taskId: string) => 'running'|'completed'|'failed' | undefined} [taskAutoState]
 *   Auto-transition task state on each poll. Useful for happy-path.
 * @property {() => Array<object>} [listInstances]
 *   Override GET /api/v1/agents (instance list).
 * @property {AsyncGenerator<object> | object[]} [eventStream]
 *   Per-connection event stream. Re-instantiated for every new WS so events
 *   are not lost when no client is connected at startup. Pass a generator
 *   *function* if you need it called per-connect; pass a generator instance
 *   if you want it shared (legacy behaviour).
 * @property {() => AsyncGenerator<object> | object[]} [eventStreamFactory]
 *   Preferred over eventStream — called for each new WS so each subscriber
 *   gets its own iterator with deterministic ordering.
 * @property {{ pathPattern: { test: (path: string) => boolean }, status: number, body?: any }[]} [errorRoutes]
 *   Inject 4xx/5xx for matching request paths.
 * @property {(ws: any) => void} [onPartition]
 *   Called once per new connection; allow scenario to wrap ws.send to drop
 *   sockets mid-stream.
 */

/**
 * Start a fake agentic-sandbox on an ephemeral 127.0.0.1 port.
 *
 * @param {object} [opts]
 * @param {Scenario} [opts.scenario]  Default: happy-path semantics.
 * @param {(msg: string, meta?: object) => void} [opts.logger]
 * @returns {Promise<{url: string, ws_url: string, port: number, stop: () => Promise<void>, server: any, scenario: Scenario, _state: {tasks: Map<string, Task>, instances: object[]}, _emit: (event: object) => void}>}
 */
export async function startFakeSandbox(opts = {}) {
  const scenario = opts.scenario || {};
  const log = opts.logger || (() => {});

  /** @type {Map<string, Task>} */
  const tasks = new Map();
  const instances = scenario.listInstances
    ? scenario.listInstances()
    : defaultInstances();

  const app = new Hono();

  // ── Error injection middleware ─────────────────────────────────
  app.use('*', async (c, next) => {
    const path = new URL(c.req.url).pathname;
    const hit = (scenario.errorRoutes || []).find(r => r.pathPattern.test(path));
    if (hit) {
      log('fake-sandbox:inject-error', { path, status: hit.status });
      return c.json(hit.body ?? { error: 'injected' }, hit.status);
    }
    return next();
  });

  // ── /api/v1/tasks — PTY task lifecycle ─────────────────────────
  app.post('/api/v1/tasks', async (c) => {
    let manifest;
    try { manifest = await c.req.json(); }
    catch { return c.json({ error: 'invalid JSON' }, 400); }

    if (scenario.onTaskCreate) {
      const override = await scenario.onTaskCreate({ manifest });
      if (override && typeof override === 'object' && 'task_id' in override) {
        const task = makeTask(override);
        tasks.set(task.task_id, task);
        log('fake-sandbox:task-create', { taskId: task.task_id });
        return c.json({ task_id: task.task_id, state: task.state }, 201);
      }
    }

    const task = makeTask({ manifest });
    tasks.set(task.task_id, task);
    log('fake-sandbox:task-create', { taskId: task.task_id });
    return c.json({ task_id: task.task_id, state: task.state }, 201);
  });

  app.get('/api/v1/tasks', (c) => {
    const stateFilter = c.req.query('state');
    const all = [...tasks.values()];
    const filtered = stateFilter ? all.filter(t => t.state === stateFilter) : all;
    return c.json({ tasks: filtered.map(taskSummary) });
  });

  app.get('/api/v1/tasks/:id', (c) => {
    const task = tasks.get(c.req.param('id'));
    if (!task) return c.json({ error: 'not_found' }, 404);
    // Allow scenario-driven auto-state transitions
    if (scenario.taskAutoState) {
      const next = scenario.taskAutoState(task.task_id);
      if (next && next !== task.state) {
        task.state = next;
        if (next === 'running' && !task.started_at) task.started_at = new Date().toISOString();
        if (['completed', 'failed', 'cancelled'].includes(next) && !task.ended_at) {
          task.ended_at = new Date().toISOString();
          if (next === 'completed' && task.exit_code === undefined) task.exit_code = 0;
        }
      }
    }
    return c.json(taskSummary(task));
  });

  app.patch('/api/v1/tasks/:id', async (c) => {
    const task = tasks.get(c.req.param('id'));
    if (!task) return c.json({ error: 'not_found' }, 404);
    let body;
    try { body = await c.req.json(); }
    catch { return c.json({ error: 'invalid JSON' }, 400); }
    if (body.stdin) {
      task.log.push(`[stdin] ${String(body.stdin)}`);
    }
    log('fake-sandbox:task-patch', { taskId: task.task_id, hasStdin: Boolean(body.stdin) });
    return c.json({ ok: true });
  });

  app.delete('/api/v1/tasks/:id', (c) => {
    const task = tasks.get(c.req.param('id'));
    if (!task) return c.json({ error: 'not_found' }, 404);
    task.state = 'cancelled';
    task.ended_at = new Date().toISOString();
    log('fake-sandbox:task-cancel', { taskId: task.task_id });
    return c.json({ ok: true });
  });

  app.get('/api/v1/tasks/:id/logs', (c) => {
    const task = tasks.get(c.req.param('id'));
    if (!task) return c.json({ error: 'not_found' }, 404);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const slice = task.log.slice(offset);
    return c.json({
      task_id: task.task_id,
      offset,
      next_offset: offset + slice.length,
      lines: slice,
    });
  });

  // ── /api/v1/agents — instance list ────────────────────────────
  app.get('/api/v1/agents', (c) => {
    return c.json({ agents: instances });
  });

  // ── /api/sandboxes/register (legacy) ──────────────────────────
  app.post('/api/sandboxes/register', async (c) => {
    let body;
    try { body = await c.req.json(); }
    catch { return c.json({ error: 'invalid JSON' }, 400); }
    const sandboxId = body.sandbox_id || randomUUID();
    log('fake-sandbox:registered', { sandboxId });
    return c.json({ sandbox_id: sandboxId, token: `fake-${sandboxId.slice(0, 8)}` }, 201);
  });

  // ── /api/v1/aiwg/status ────────────────────────────────────────
  app.get('/api/v1/aiwg/status', (c) => {
    return c.json({ healthy: true, fake: true });
  });

  // ── HTTP server start ──────────────────────────────────────────
  /** @type {any} */
  let nodeServer;
  await new Promise((resolve, reject) => {
    try {
      nodeServer = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, (info) => {
        nodeServer._info = info;
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });

  const port = nodeServer._info?.port || (nodeServer.address && nodeServer.address().port);
  const url = `http://127.0.0.1:${port}`;
  const ws_url = `ws://127.0.0.1:${port}`;

  // ── WS server (manual upgrade so we can route by path) ────────
  const wss = new WebSocketServer({ noServer: true });
  /** Active WS connections, keyed by path. */
  const activeWS = new Map();

  // Hono's @hono/node-server doesn't expose .on('upgrade'). Hook the underlying
  // http server directly. Node-server returns the http.Server when configured.
  const httpServer = nodeServer.server || nodeServer;
  if (httpServer && typeof httpServer.on === 'function') {
    httpServer.on('upgrade', (req, socket, head) => {
      const path = (req.url || '').split('?')[0];
      // We accept any /ws/* path; the scenario decides what to emit.
      if (!path.startsWith('/ws/')) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        const conns = activeWS.get(path) || new Set();
        conns.add(ws);
        activeWS.set(path, conns);
        log('fake-sandbox:ws-open', { path });
        ws.on('close', () => {
          conns.delete(ws);
          log('fake-sandbox:ws-close', { path });
        });
        // Allow scenarios to wrap ws.send (e.g., for partition simulation)
        scenario.onPartition?.(ws);
        // Drive a per-connection event stream so events are not lost when
        // there's no subscriber at startup.
        const factory = scenario.eventStreamFactory;
        const iterableSrc = factory ? factory() : scenario.eventStream;
        if (iterableSrc) {
          (async () => {
            try {
              for await (const event of iterableSrc) {
                if (ws.readyState !== 1 /* OPEN */) break;
                try { ws.send(JSON.stringify(event)); } catch { break; }
              }
            } catch (err) {
              log('fake-sandbox:event-stream-error', { error: String(err), path });
            }
          })();
        }
      });
    });
  }

  /** Broadcast an event to every connection matching `pathPrefix`. */
  function _emit(event, pathPrefix = '/ws/') {
    for (const [p, conns] of activeWS) {
      if (!p.startsWith(pathPrefix)) continue;
      for (const ws of conns) {
        try {
          if (ws.readyState === 1 /* OPEN */) ws.send(JSON.stringify(event));
        } catch {}
      }
    }
  }

  let streamAbort = false;

  async function stop() {
    streamAbort = true;
    // Close all WS connections
    for (const [, conns] of activeWS) {
      for (const ws of conns) {
        try { ws.close(1000, 'shutdown'); } catch {}
      }
    }
    activeWS.clear();
    try { wss.close(); } catch {}
    await new Promise(r => {
      try {
        httpServer.close(() => r());
      } catch {
        r();
      }
    });
    log('fake-sandbox:stopped', { port });
  }

  return {
    url,
    ws_url,
    port,
    stop,
    server: nodeServer,
    scenario,
    _state: { tasks, instances },
    _emit,
  };
}

function makeTask({ manifest, task_id, state }) {
  return {
    task_id: task_id || `task-${randomUUID().slice(0, 8)}`,
    state: state || 'queued',
    created_at: new Date().toISOString(),
    log: [],
    manifest: manifest || {},
  };
}

function taskSummary(task) {
  return {
    task_id: task.task_id,
    state: task.state,
    created_at: task.created_at,
    started_at: task.started_at,
    ended_at: task.ended_at,
    exit_code: task.exit_code,
  };
}

function defaultInstances() {
  return [
    {
      id: 'agent-01',
      name: 'fake-agent-01',
      runtime: 'claude-code',
      status: 'running',
      kind: 'agent',
    },
    {
      id: 'vm-01',
      name: 'fake-vm-01',
      runtime: 'qemu',
      status: 'running',
      kind: 'vm',
    },
    {
      id: 'container-01',
      name: 'fake-container-01',
      runtime: 'docker',
      status: 'running',
      kind: 'container',
    },
  ];
}
