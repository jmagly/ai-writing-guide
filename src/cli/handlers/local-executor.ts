/**
 * Local Executor Handler
 *
 * Implements `aiwg local-executor serve` — boots a no-sandbox host-process
 * executor as a conformance shim over DaemonSupervisor, then registers it
 * with `aiwg serve` via the executor contract v1 handshake.
 *
 * Security note:
 *   This executor has `isolation:none`. Agent code runs directly in the host
 *   process under the same filesystem permissions as the operator. It inherits
 *   the Claude Code `--dangerously-skip-permissions` posture when invoked via
 *   the standard agent runner. Do not expose on non-loopback interfaces unless
 *   you understand the risk (see docs/local-executor-guide.md §Security).
 *
 * @issue #1181
 * @see docs/contracts/executor.v1.md
 * @see tools/ralph-external/executor-shim.mjs
 */

import path from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

const DEFAULT_PORT         = 8200;
const DEFAULT_BIND         = '127.0.0.1';
const DEFAULT_AIWG_SERVE   = 'http://127.0.0.1:7337';
const IDENTITY_FILE        = path.join('.aiwg', 'local-executor', 'identity.json');

interface LocalExecutorArgs {
  port:          number;
  bind:          string;
  aiwgServe:     string;
  maxConcurrency: number;
  executorId:    string;
}

interface ExecutorIdentity {
  executor_id: string;
  created_at:  string;
}

/**
 * Resolve or generate-once the executor identity.
 * Written to `.aiwg/local-executor/identity.json` so restarts reuse the same
 * UUID (token reclaim via identity store on the aiwg-serve side).
 */
function resolveExecutorId(override?: string): string {
  if (override) return override;

  const abs = path.resolve(IDENTITY_FILE);
  if (existsSync(abs)) {
    try {
      const raw = readFileSync(abs, 'utf-8');
      const data = JSON.parse(raw) as ExecutorIdentity;
      if (data.executor_id) return data.executor_id;
    } catch { /* fall through to generate */ }
  }

  const id = randomUUID();
  try {
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({ executor_id: id, created_at: new Date().toISOString() }, null, 2), 'utf-8');
  } catch { /* non-fatal — use in-memory id */ }
  return id;
}

/**
 * Parse `aiwg local-executor serve` flags.
 */
function parseLocalExecutorArgs(args: string[]): LocalExecutorArgs {
  let port          = DEFAULT_PORT;
  let bind          = DEFAULT_BIND;
  let aiwgServe     = process.env['AIWG_SERVE_ENDPOINT'] ?? DEFAULT_AIWG_SERVE;
  let maxConcurrency = 4;
  let executorIdFlag: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--port' || arg === '-p') && args[i + 1]) {
      const parsed = parseInt(args[i + 1], 10);
      if (!isNaN(parsed)) port = parsed;
      i++;
    } else if (arg === '--bind' && args[i + 1]) {
      bind = args[i + 1];
      i++;
    } else if (arg === '--aiwg-serve' && args[i + 1]) {
      aiwgServe = args[i + 1];
      i++;
    } else if (arg === '--max-concurrency' && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (!isNaN(n) && n > 0) maxConcurrency = n;
      i++;
    } else if (arg === '--executor-id' && args[i + 1]) {
      executorIdFlag = args[i + 1];
      i++;
    }
  }

  return {
    port,
    bind,
    aiwgServe,
    maxConcurrency,
    executorId: resolveExecutorId(executorIdFlag),
  };
}

/**
 * Emit a warning when the executor binds on a non-loopback interface.
 */
function warnIfNonLoopback(bind: string): void {
  const loopbackAddrs = new Set(['127.0.0.1', '::1', 'localhost']);
  if (!loopbackAddrs.has(bind)) {
    console.warn(
      '[local-executor] WARNING: binding on non-loopback interface ' + bind + '.\n' +
      '  This executor has isolation:none — agent code runs in the host process.\n' +
      '  Ensure this interface is not reachable by untrusted parties.\n' +
      '  The executor token will be rotated by aiwg-serve on first non-loopback register.'
    );
  }
}

/**
 * `aiwg local-executor serve` handler.
 *
 * Boots a DaemonSupervisor + ExecutorShim, registers with aiwg-serve,
 * then keeps the process alive until SIGINT/SIGTERM.
 */
export const localExecutorServeHandler: CommandHandler = {
  id:          'local-executor-serve',
  name:        'Local Executor Serve',
  description: 'Start the local no-sandbox executor (isolation:none, Core+HITL conformance)',
  category:    'project',
  aliases:     [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    // The subcommand is: `aiwg local-executor serve [flags]`
    // ctx.args[0] === 'serve' (consumed by router) or flags directly
    const flagArgs = ctx.args[0] === 'serve' ? ctx.args.slice(1) : ctx.args;
    const opts = parseLocalExecutorArgs(flagArgs);

    warnIfNonLoopback(opts.bind);

    // ── Dynamic imports (same pattern as serve.ts) ──────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ExecutorShim: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let startExecutorServer: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let DaemonSupervisor: any;

    try {
      const shimMod = await (new Function('m', 'return import(m)'))(
        path.join(ctx.frameworkRoot, 'tools', 'ralph-external', 'executor-shim.mjs')
      );
      ExecutorShim      = shimMod.ExecutorShim;
      startExecutorServer = shimMod.startExecutorServer;
    } catch (err) {
      return {
        message:  `Failed to load executor-shim: ${(err as Error).message}`,
        exitCode: 1,
      };
    }

    try {
      const dsMod = await (new Function('m', 'return import(m)'))(
        path.join(ctx.frameworkRoot, 'tools', 'ralph-external', 'daemon-supervisor.mjs')
      );
      DaemonSupervisor = dsMod.DaemonSupervisor;
    } catch (err) {
      return {
        message:  `Failed to load DaemonSupervisor: ${(err as Error).message}`,
        exitCode: 1,
      };
    }

    // AgentSupervisor is optional — shim works without it but task execution
    // requires it. Try loading from ralph-external/orchestrator.mjs.
    let agentSupervisorInstance: unknown = null;
    try {
      const orchMod = await (new Function('m', 'return import(m)'))(
        path.join(ctx.frameworkRoot, 'tools', 'ralph-external', 'orchestrator.mjs')
      );
      const OrchClass = orchMod.Orchestrator ?? orchMod.default;
      if (OrchClass) {
        const orch = new OrchClass({ maxConcurrent: opts.maxConcurrency });
        agentSupervisorInstance = orch.agentSupervisor ?? orch;
      }
    } catch { /* orchestrator optional */ }

    // Minimal stub if no real agent supervisor is available (allows shim to
    // boot for conformance testing without a real Claude/Codex install)
    if (!agentSupervisorInstance) {
      const { EventEmitter } = await import('events');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stub = new (class StubAgentSupervisor extends EventEmitter {
        tasks = new Map<string, unknown>();
        counter = 0;
        submit(prompt: string, options: Record<string, unknown> = {}) {
          const id = `task-${++this.counter}`;
          this.tasks.set(id, { id, prompt, ...options });
          // Simulate async start
          queueMicrotask(() => {
            this.emit('task:started', { taskId: id, pid: 50000 + this.counter });
          });
          return { id };
        }
        cancel(taskId: string) {
          if (this.tasks.has(taskId)) {
            this.tasks.delete(taskId);
            this.emit('task:cancelled', { taskId });
            return true;
          }
          return false;
        }
        async shutdown() { this.tasks.clear(); }
      })();
      agentSupervisorInstance = stub;
    }

    // Build supervisor + shim
    const supervisor = new DaemonSupervisor({
      agentSupervisor: agentSupervisorInstance,
      maxConcurrent:   opts.maxConcurrency,
    });

    const restBase = `http://${opts.bind}:${opts.port}`;
    const wsBase   = `ws://${opts.bind}:${opts.port}`;

    const shim = new ExecutorShim({
      supervisor,
      executorId:   opts.executorId,
      name:         'aiwg-local-executor',
      version:      '1.0.0',
      restBase,
      wsBase,
      aiwgServeUrl: opts.aiwgServe,
    });

    // Register with aiwg-serve
    let token: string;
    try {
      token = await shim.register();
    } catch (err) {
      return {
        message:  `Failed to register with aiwg-serve at ${opts.aiwgServe}: ${(err as Error).message}\n` +
                  'Is aiwg serve running? Start it with: aiwg serve --no-open',
        exitCode: 1,
      };
    }

    // Start the executor's own HTTP+WS server
    let server: { url: string; close: () => void };
    try {
      server = await startExecutorServer(shim, {
        port:  opts.port,
        bind:  opts.bind,
        token,
      });
    } catch (err) {
      await shim.deregister();
      return {
        message:  `Failed to start executor server: ${(err as Error).message}`,
        exitCode: 1,
      };
    }

    console.log(`Local executor:    ${server.url}`);
    console.log(`Registered with:   ${opts.aiwgServe}`);
    console.log(`Executor ID:       ${opts.executorId}`);
    console.log(`Max concurrency:   ${opts.maxConcurrency}`);
    console.log('Press Ctrl+C to stop.');

    // Status ticker — log active mission count every 30 s
    const ticker = setInterval(() => {
      const st = supervisor.status();
      console.log(
        `[local-executor] running=${st.concurrencyUsed}/${st.concurrencyMax} ` +
        `queued=${st.queueDepth} circuit=${st.circuitState?.state ?? 'ok'}`
      );
    }, 30_000);

    // Keep alive until SIGINT/SIGTERM
    await new Promise<void>((resolve) => {
      let settled = false;

      const cleanup = async (signal: string) => {
        if (settled) return;
        settled = true;
        clearInterval(ticker);
        console.log(`\n[local-executor] ${signal} received — shutting down…`);

        try { await shim.shutdown(); } catch { /* ignore */ }
        try { server.close(); } catch { /* ignore */ }
        try { await supervisor.shutdown(5_000); } catch { /* ignore */ }

        resolve();
      };

      process.once('SIGINT',  () => { void cleanup('SIGINT'); });
      process.once('SIGTERM', () => { void cleanup('SIGTERM'); });
    });

    return { exitCode: 0, message: 'Local executor stopped.' };
  },
};

/**
 * Top-level `aiwg local-executor` handler.
 * Dispatches to subcommands (currently only `serve`).
 */
export const localExecutorHandler: CommandHandler = {
  id:          'local-executor',
  name:        'Local Executor',
  description: 'Manage the local no-sandbox executor (aiwg local-executor serve)',
  category:    'project',
  aliases:     [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const [subcommand, ...rest] = ctx.args;

    if (!subcommand || subcommand === 'serve') {
      const innerCtx: HandlerContext = { ...ctx, args: ['serve', ...rest] };
      return localExecutorServeHandler.execute(innerCtx);
    }

    if (subcommand === '--help' || subcommand === 'help') {
      console.log(
        'Usage: aiwg local-executor serve [flags]\n' +
        '\n' +
        'Flags:\n' +
        '  --port <n>              Bind port (default: 8200)\n' +
        '  --bind <host>           Bind interface (default: 127.0.0.1)\n' +
        '  --aiwg-serve <url>      Registration target (default: http://127.0.0.1:7337)\n' +
        '  --max-concurrency <n>   Max concurrent missions (default: 4)\n' +
        '  --executor-id <uuid>    Override stable executor ID\n' +
        '\n' +
        'Environment:\n' +
        '  AIWG_SERVE_ENDPOINT     Override --aiwg-serve default\n'
      );
      return { exitCode: 0 };
    }

    return {
      message:  `Unknown subcommand: ${subcommand}. Run \`aiwg local-executor help\` for usage.`,
      exitCode: 1,
    };
  },
};
