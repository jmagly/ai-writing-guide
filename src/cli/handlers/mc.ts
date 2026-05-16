/**
 * Mission Control Command Handler
 *
 * Multi-loop background orchestration dashboard. Lets an orchestrator
 * spawn multiple long-running agent loops, monitor all simultaneously,
 * and react to completions or failures without blocking the primary session.
 *
 * Subcommands: start, dispatch, status, watch, abort, pause, resume, stop, list
 *
 * @implements @agentic/code/frameworks/sdlc-complete/rules/self-maintenance.md
 * @source @src/cli/router.ts
 * @issue #483
 */

import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import * as ui from '../ui.js';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

// ── Constants ────────────────────────────────────────────────

const MC_ROOT = '.aiwg/ralph-external/mc';
const SESSIONS_DIR = join(MC_ROOT, 'sessions');

type MissionStatus = 'queued' | 'running' | 'done' | 'failed' | 'aborted' | 'paused';
type SessionState = 'active' | 'paused' | 'stopped';

type MissionMode = 'direct' | 'pty-orchestrator';

interface Mission {
  id: string;
  objective: string;
  completion?: string;
  status: MissionStatus;
  loop: number;
  maxIterations: number;
  priority: string;
  mode: MissionMode;
  targetAgent?: string;
  lastAction?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface Session {
  id: string;
  name: string;
  state: SessionState;
  maxMissions: number;
  createdAt: string;
  updatedAt: string;
  missions: Mission[];
}

// ── Helpers ──────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function readSession(sessionId: string): Promise<Session | null> {
  const path = join(SESSIONS_DIR, sessionId, 'session.json');
  try {
    const raw = await fs.readFile(path, 'utf-8');
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

async function writeSession(session: Session): Promise<void> {
  const dir = join(SESSIONS_DIR, session.id);
  await ensureDir(dir);
  session.updatedAt = new Date().toISOString();
  await fs.writeFile(join(dir, 'session.json'), JSON.stringify(session, null, 2));
}

async function appendLog(sessionId: string, event: Record<string, unknown>): Promise<void> {
  const logPath = join(SESSIONS_DIR, sessionId, 'log.jsonl');
  const entry = JSON.stringify({ ...event, ts: new Date().toISOString() });
  await fs.appendFile(logPath, entry + '\n');
}

async function listSessions(): Promise<Session[]> {
  try {
    const entries = await fs.readdir(SESSIONS_DIR, { withFileTypes: true });
    const sessions: Session[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const s = await readSession(entry.name);
        if (s) sessions.push(s);
      }
    }
    return sessions;
  } catch {
    return [];
  }
}

async function findActiveSession(sessionIdArg?: string): Promise<Session | null> {
  if (sessionIdArg) return readSession(sessionIdArg);

  // Find latest active session
  const sessions = await listSessions();
  const active = sessions
    .filter(s => s.state === 'active' || s.state === 'paused')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return active[0] || null;
}

function parseFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function getPositionalArgs(args: string[]): string[] {
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      // Skip flag and its value if it has one
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) i++;
      continue;
    }
    positional.push(args[i]);
  }
  return positional;
}

// ── Subcommand handlers ──────────────────────────────────────

async function mcStart(ctx: HandlerContext): Promise<HandlerResult> {
  const name = parseFlag(ctx.args, '--name') || `Mission ${new Date().toISOString().slice(0, 10)}`;
  const maxMissions = parseInt(parseFlag(ctx.args, '--max-missions') || '10', 10);

  const session: Session = {
    id: genId('mc'),
    name,
    state: 'active',
    maxMissions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    missions: [],
  };

  await writeSession(session);
  await appendLog(session.id, { event: 'session_started', name, maxMissions });

  ui.blank();
  console.log(`  ${ui.brandMark()} ${ui.bold('Mission Control')} — ${ui.accent(name)}`);
  ui.rule();
  ui.success(`Session started: ${session.id}`);
  ui.info(`Max missions: ${maxMissions}`);
  ui.blank();

  return { exitCode: 0, message: session.id };
}

async function mcDispatch(ctx: HandlerContext): Promise<HandlerResult> {
  const positional = getPositionalArgs(ctx.args);
  const sessionId = positional[0];
  const objective = positional.slice(1).join(' ') || parseFlag(ctx.args, '--objective');
  const completion = parseFlag(ctx.args, '--completion');
  const priority = parseFlag(ctx.args, '--priority') || 'normal';
  const maxIterations = parseInt(parseFlag(ctx.args, '--max-iterations') || '10', 10);
  const modeRaw = parseFlag(ctx.args, '--mode') || 'direct';
  const mode: MissionMode = modeRaw === 'pty-orchestrator' ? 'pty-orchestrator' : 'direct';
  const targetAgent = parseFlag(ctx.args, '--target-agent');

  if (!objective) {
    ui.error('Usage: aiwg mc dispatch <session-id> "<objective>" [--completion "<criteria>"] [--mode pty-orchestrator] [--target-agent <agent-id>]');
    return { exitCode: 1 };
  }

  if (mode === 'pty-orchestrator' && !targetAgent) {
    ui.error('--mode pty-orchestrator requires --target-agent <agent-id>');
    return { exitCode: 1 };
  }

  const session = await findActiveSession(sessionId);
  if (!session) {
    ui.error(sessionId ? `Session not found: ${sessionId}` : 'No active session. Run `aiwg mc start` first.');
    return { exitCode: 1 };
  }

  if (session.missions.length >= session.maxMissions) {
    ui.error(`Session at capacity (${session.maxMissions} missions). Increase with --max-missions or stop completed missions.`);
    return { exitCode: 1 };
  }

  // #1361: Check project-level parallelism cap. Active missions = running or
  // queued; if at cap, warn but still queue (FIFO behavior — the mission goes
  // into the session as 'queued' and will run when a slot frees up).
  let capWarning: string | undefined;
  try {
    const { readAiwgConfig, resolveParallelism } = await import('../../config/aiwg-config.js');
    const cfg = await readAiwgConfig(ctx.cwd || process.cwd());
    if (cfg) {
      const resolved = resolveParallelism(cfg.parallelism, cfg.providers[0]);
      const activeCount = session.missions.filter(
        m => m.status === 'running' || m.status === 'queued' || m.status === 'paused',
      ).length;
      if (activeCount >= resolved.max_parallel_mc_missions) {
        capWarning = `Active missions (${activeCount}) at or above project parallelism cap (${resolved.max_parallel_mc_missions}). Mission will queue; bump via 'aiwg config set --project parallelism.max_parallel_mc_missions N'.`;
      }
    }
  } catch {
    // Non-fatal — config read failure doesn't block dispatch
  }

  const mission: Mission = {
    id: genId('m'),
    objective,
    completion,
    status: 'queued',
    loop: 0,
    maxIterations,
    priority,
    mode,
    targetAgent: targetAgent || undefined,
  };

  session.missions.push(mission);
  await writeSession(session);
  await appendLog(session.id, { event: 'mission_dispatched', missionId: mission.id, objective, priority, mode, targetAgent });

  if (capWarning) ui.warn(capWarning);
  ui.success(`Dispatched mission ${mission.id}: ${objective}`);
  const modeLabel = mode === 'pty-orchestrator' ? ` | Mode: PTY orchestrator → ${targetAgent}` : '';
  ui.info(`Priority: ${priority} | Max iterations: ${maxIterations}${modeLabel}`);

  return { exitCode: 0, message: mission.id };
}

async function mcStatus(ctx: HandlerContext): Promise<HandlerResult> {
  const positional = getPositionalArgs(ctx.args);
  const sessionId = positional[0];
  const json = hasFlag(ctx.args, '--json');

  const session = await findActiveSession(sessionId);
  if (!session) {
    if (json) {
      console.log(JSON.stringify({ error: 'no_active_session' }));
    } else {
      ui.error(sessionId ? `Session not found: ${sessionId}` : 'No active session.');
    }
    return { exitCode: 1 };
  }

  if (json) {
    console.log(JSON.stringify(session, null, 2));
    return { exitCode: 0 };
  }

  const statusIcons: Record<MissionStatus, string> = {
    done: '✓',
    running: '⏳',
    queued: '⏺',
    failed: '✗',
    aborted: '⊘',
    paused: '⏸',
  };

  ui.blank();
  console.log(`  ${ui.brandMark()} ${ui.bold('MISSION CONTROL')} — ${ui.accent(session.name)}  [${session.id}]`);
  ui.rule(60);

  // Header
  const header = `  ${'#'.padEnd(4)} ${'Mission'.padEnd(32)} ${'Mode'.padEnd(6)} ${'Status'.padEnd(12)} ${'Loop'.padEnd(8)} ${'Started'.padEnd(8)}`;
  console.log(ui.dim(header));
  ui.rule(68);

  for (let i = 0; i < session.missions.length; i++) {
    const m = session.missions[i];
    const icon = statusIcons[m.status] || '?';
    const num = String(i + 1).padEnd(4);
    const obj = m.objective.length > 30 ? m.objective.slice(0, 27) + '...' : m.objective.padEnd(32);
    const modeTag = m.mode === 'pty-orchestrator' ? 'PTY'.padEnd(6) : '—'.padEnd(6);
    const status = `${icon} ${m.status.toUpperCase()}`.padEnd(12);
    const loop = m.status === 'queued' ? '—'.padEnd(8) : `${m.loop}/${m.maxIterations}`.padEnd(8);
    const started = m.startedAt ? new Date(m.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
    console.log(`  ${num} ${obj} ${modeTag} ${status} ${loop} ${started}`);
    // Show last action for PTY-orchestrated missions
    if (m.mode === 'pty-orchestrator' && m.lastAction && m.status === 'running') {
      console.log(ui.dim(`       └─ Last: ${m.lastAction}`));
    }
  }

  ui.rule(68);

  const counts = {
    done: session.missions.filter(m => m.status === 'done').length,
    running: session.missions.filter(m => m.status === 'running').length,
    queued: session.missions.filter(m => m.status === 'queued').length,
    failed: session.missions.filter(m => m.status === 'failed').length,
  };

  console.log(`  ${session.missions.length} missions  |  ${counts.done} done  |  ${counts.running} running  |  ${counts.queued} queued  |  ${counts.failed} failed`);

  // #1361: Show project parallelism cap when one is configured.
  try {
    const { readAiwgConfig, resolveParallelism } = await import('../../config/aiwg-config.js');
    const cfg = await readAiwgConfig(ctx.cwd || process.cwd());
    if (cfg) {
      const resolved = resolveParallelism(cfg.parallelism, cfg.providers[0]);
      const active = counts.running + counts.queued;
      const cap = resolved.max_parallel_mc_missions;
      const overCap = active > cap ? ` ${ui.dim(`(${active - cap} over cap — queued)`)}` : '';
      console.log(`  Parallelism cap: ${active}/${cap} active${overCap}`);
    }
  } catch {
    // Non-fatal
  }

  ui.blank();

  return { exitCode: 0 };
}

async function mcAbort(ctx: HandlerContext): Promise<HandlerResult> {
  const positional = getPositionalArgs(ctx.args);
  const sessionId = positional[0];
  const missionId = positional[1];

  if (!sessionId || !missionId) {
    ui.error('Usage: aiwg mc abort <session-id> <mission-id>');
    return { exitCode: 1 };
  }

  const session = await readSession(sessionId);
  if (!session) {
    ui.error(`Session not found: ${sessionId}`);
    return { exitCode: 1 };
  }

  const mission = session.missions.find(m => m.id === missionId);
  if (!mission) {
    ui.error(`Mission not found: ${missionId}`);
    return { exitCode: 1 };
  }

  mission.status = 'aborted';
  mission.completedAt = new Date().toISOString();
  await writeSession(session);
  await appendLog(session.id, { event: 'mission_aborted', missionId });

  ui.success(`Aborted mission: ${missionId}`);
  return { exitCode: 0 };
}

async function mcPause(ctx: HandlerContext): Promise<HandlerResult> {
  const positional = getPositionalArgs(ctx.args);
  const sessionId = positional[0];

  const session = await findActiveSession(sessionId);
  if (!session) {
    ui.error('No active session to pause.');
    return { exitCode: 1 };
  }

  session.state = 'paused';
  for (const m of session.missions) {
    if (m.status === 'running') m.status = 'paused';
  }
  await writeSession(session);
  await appendLog(session.id, { event: 'session_paused' });

  ui.success(`Paused session: ${session.id}`);
  return { exitCode: 0 };
}

async function mcResume(ctx: HandlerContext): Promise<HandlerResult> {
  const positional = getPositionalArgs(ctx.args);
  const sessionId = positional[0];

  const session = await findActiveSession(sessionId);
  if (!session || session.state !== 'paused') {
    ui.error('No paused session to resume.');
    return { exitCode: 1 };
  }

  session.state = 'active';
  for (const m of session.missions) {
    if (m.status === 'paused') m.status = 'running';
  }
  await writeSession(session);
  await appendLog(session.id, { event: 'session_resumed' });

  ui.success(`Resumed session: ${session.id}`);
  return { exitCode: 0 };
}

async function mcStop(ctx: HandlerContext): Promise<HandlerResult> {
  const positional = getPositionalArgs(ctx.args);
  const sessionId = positional[0];
  const drain = hasFlag(ctx.args, '--drain');

  const session = await findActiveSession(sessionId);
  if (!session) {
    ui.error('No active session to stop.');
    return { exitCode: 1 };
  }

  if (drain) {
    // Mark queued missions as aborted, let running finish
    for (const m of session.missions) {
      if (m.status === 'queued') {
        m.status = 'aborted';
        m.completedAt = new Date().toISOString();
      }
    }
    ui.info('Draining: queued missions cancelled, running missions will complete.');
  } else {
    // Abort all non-completed missions
    for (const m of session.missions) {
      if (m.status === 'running' || m.status === 'queued' || m.status === 'paused') {
        m.status = 'aborted';
        m.completedAt = new Date().toISOString();
      }
    }
  }

  session.state = 'stopped';
  await writeSession(session);
  await appendLog(session.id, { event: 'session_stopped', drain });

  ui.success(`Stopped session: ${session.id}`);
  return { exitCode: 0 };
}

async function mcList(ctx: HandlerContext): Promise<HandlerResult> {
  const json = hasFlag(ctx.args, '--json');
  const sessions = await listSessions();

  if (json) {
    console.log(JSON.stringify(sessions.map(s => ({
      id: s.id,
      name: s.name,
      state: s.state,
      missions: s.missions.length,
      created: s.createdAt,
      updated: s.updatedAt,
    })), null, 2));
    return { exitCode: 0 };
  }

  if (sessions.length === 0) {
    ui.info('No Mission Control sessions. Run `aiwg mc start` to create one.');
    return { exitCode: 0 };
  }

  ui.blank();
  console.log(`  ${ui.brandMark()} ${ui.bold('Mission Control Sessions')}`);
  ui.rule();

  for (const s of sessions) {
    const stateIcon = s.state === 'active' ? '●' : s.state === 'paused' ? '⏸' : '○';
    const missionCount = s.missions.length;
    const done = s.missions.filter(m => m.status === 'done').length;
    console.log(`  ${stateIcon} ${s.id}  ${ui.accent(s.name)}  (${done}/${missionCount} done)  [${s.state}]`);
  }

  ui.blank();
  return { exitCode: 0 };
}

async function mcWatch(ctx: HandlerContext): Promise<HandlerResult> {
  const positional = getPositionalArgs(ctx.args);
  const sessionId = positional[0];

  const session = await findActiveSession(sessionId);
  if (!session) {
    ui.error('No active session to watch.');
    return { exitCode: 1 };
  }

  // For non-interactive contexts, show status once with a note
  // Real streaming would use fs.watch on the session file
  ui.info(`Watch mode: polling session ${session.id}`);
  ui.info('Press Ctrl+C to stop watching.');
  ui.blank();

  // Show current status
  ctx.args = [session.id];
  return mcStatus(ctx);
}

// ── Agent routing query ──────────────────────────────────────

/**
 * aiwg mc agents [--filter key=value...] [--json]
 *
 * Queries GET /api/agents/candidates on the local aiwg serve instance and
 * prints a table of agents that match the given routing filter. This is a thin
 * CLI wrapper over the #916 routing endpoint so operators can check routing
 * from a terminal without opening the dashboard.
 *
 * Filter flags:
 *   --framework <name>       Require a specific AIWG framework (repeatable)
 *   --sandbox <id>           Restrict to a specific sandbox
 *   --agent <id>             Restrict to a specific agent ID
 *   --name <n>               Match by logical name
 *   --max-cpu <pct>          Reject agents above this CPU %
 *   --min-memory <gb>        Reject agents below this memory threshold
 *   --json                   Output raw JSON
 */
async function mcAgents(ctx: HandlerContext): Promise<HandlerResult> {
  const args = ctx.args;
  const json = hasFlag(args, '--json');

  const port = process.env['AIWG_SERVE_PORT'] ?? '7337';
  const base = `http://127.0.0.1:${port}`;

  const params = new URLSearchParams();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--framework' && args[i + 1]) { params.append('frameworks', args[++i]!); }
    else if (a === '--sandbox' && args[i + 1]) { params.set('sandbox_id', args[++i]!); }
    else if (a === '--agent' && args[i + 1]) { params.set('agent_id', args[++i]!); }
    else if (a === '--name' && args[i + 1]) { params.set('agent_name', args[++i]!); }
    else if (a === '--max-cpu' && args[i + 1]) { params.set('max_cpu_percent', args[++i]!); }
    else if (a === '--min-memory' && args[i + 1]) { params.set('min_memory_gb', args[++i]!); }
  }

  // 5s timeout so a wedged serve cannot hang the CLI. Override with
  // AIWG_FETCH_TIMEOUT_MS for slow local environments or integration tests.
  const fetchTimeoutMs = (() => {
    const raw = process.env['AIWG_FETCH_TIMEOUT_MS'];
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 5_000;
  })();

  let result: { selected?: Record<string, unknown>; candidates: Record<string, unknown>[] };
  try {
    // Combine user-cancel (Ctrl-C) with the per-call timeout so the fetch
    // aborts on either. `AbortSignal.any` requires Node 20+.
    const signal = ctx.signal
      ? AbortSignal.any([ctx.signal, AbortSignal.timeout(fetchTimeoutMs)])
      : AbortSignal.timeout(fetchTimeoutMs);
    const resp = await fetch(`${base}/api/agents/candidates?${params.toString()}`, {
      signal,
    });
    if (!resp.ok) {
      ui.error(`aiwg serve returned ${resp.status} — is it running on port ${port}?`);
      return { exitCode: 1 };
    }
    result = await resp.json() as typeof result;
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      ui.error(`aiwg serve on port ${port} timed out after ${fetchTimeoutMs}ms. Is it wedged?`);
    } else {
      ui.error(`Cannot reach aiwg serve on port ${port}. Start it with: aiwg serve`);
    }
    return { exitCode: 1 };
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return { exitCode: 0 };
  }

  ui.blank();
  console.log(`  ${ui.brandMark()} ${ui.bold('Agent Routing Candidates')}`);
  ui.rule();

  if (result.candidates.length === 0) {
    ui.info('No matching agents found for the given filter.');
    return { exitCode: 0 };
  }

  for (const c of result.candidates) {
    const agent = c['agent'] as Record<string, unknown> | undefined;
    const agentId = agent?.['agentId'] as string ?? '?';
    const logicalName = agent?.['logicalName'] as string | undefined;
    const sandboxName = c['sandboxName'] as string ?? '';
    const cpu = (agent?.['latestMetrics'] as Record<string, number> | undefined)?.['cpu_percent'];
    const status = agent?.['status'] as string ?? '';
    const isSelected = (result.selected as Record<string, unknown> | undefined)?.['sandboxName'] === sandboxName &&
      ((result.selected as Record<string, unknown>)?.['agent'] as Record<string, unknown> | undefined)?.['agentId'] === agentId;

    const label = logicalName ? `${logicalName} (${agentId})` : agentId;
    const cpuStr = cpu !== undefined ? ` cpu:${cpu.toFixed(0)}%` : '';
    const selectedMark = isSelected ? ' ← selected' : '';
    console.log(`  • ${ui.bold(label)}  sandbox:${sandboxName}  status:${status}${cpuStr}${selectedMark}`);
    const reason = c['matchReason'] as string | undefined;
    if (reason) console.log(`      reason: ${reason}`);
  }

  ui.blank();
  return { exitCode: 0 };
}

// ── Subcommand router ────────────────────────────────────────

async function mcBridge(ctx: HandlerContext): Promise<HandlerResult> {
  const aiwgServeUrl = parseFlag(ctx.args, '--aiwg-serve') || 'http://127.0.0.1:7337';
  const watchDir = parseFlag(ctx.args, '--watch') || MC_ROOT;
  const detach = hasFlag(ctx.args, '--detach');
  const subscribeExecutorsArg = parseFlag(ctx.args, '--subscribe-executors');
  const subscribeExecutors = subscribeExecutorsArg
    ? subscribeExecutorsArg.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const verbose = hasFlag(ctx.args, '--verbose');

  if (detach) {
    ui.error('--detach is not yet implemented. Run in the foreground for now (#1182 follow-up).');
    return { exitCode: 1 };
  }

  ui.blank();
  ui.info(`${ui.brandMark()} ${ui.bold('Mission Control Bridge')}`);
  ui.info(`  aiwg serve: ${aiwgServeUrl}`);
  ui.info(`  watching:   ${watchDir}`);
  if (subscribeExecutors.length > 0) {
    ui.info(`  subscribed: ${subscribeExecutors.join(', ')}`);
  }
  ui.blank();

  // Import the bridge implementation lazily so the CLI startup cost stays low
  // and the bridge's optional ws dep is only loaded when actually used.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — .mjs module has no TS declarations
  const { startQueueTailer } = await import('../../../tools/mc-bridge/queue-tailer.mjs');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — ws lacks bundled types; we use the runtime constructor only
  const wsMod = await import('ws');
  const WSCtor =
    (wsMod as { WebSocket?: unknown }).WebSocket ||
    (wsMod as { default?: { WebSocket?: unknown } }).default?.WebSocket;
  if (!WSCtor) {
    ui.error('Could not resolve a WebSocket implementation from the `ws` package.');
    return { exitCode: 1 };
  }

  const ac = new AbortController();
  const handle = await startQueueTailer({
    aiwgServeUrl,
    watchDir,
    subscribeExecutors,
    WebSocketImpl: WSCtor,
    signal: ac.signal,
    logger: verbose
      ? (msg: string, meta?: Record<string, unknown>) => {
          // eslint-disable-next-line no-console
          console.log(`[mc-bridge] ${msg}`, meta ? JSON.stringify(meta) : '');
        }
      : (msg: string, meta?: Record<string, unknown>) => {
          // Print only the headline events at normal verbosity
          const interesting = new Set([
            'queue-tailer:dispatched',
            'queue-tailer:dispatch-failed',
            'queue-tailer:event-applied',
            'queue-tailer:ws-state',
          ]);
          if (interesting.has(msg)) {
            // eslint-disable-next-line no-console
            console.log(`[mc-bridge] ${msg}`, meta ? JSON.stringify(meta) : '');
          }
        },
  });

  ui.success('Bridge running. Ctrl-C to stop.');

  return new Promise<HandlerResult>((resolve) => {
    const onSignal = async () => {
      ui.blank();
      ui.info('Stopping bridge…');
      ac.abort();
      try { await handle.stop(); } catch {}
      resolve({ exitCode: 0 });
    };
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
  });
}

const subcommands: Record<string, (ctx: HandlerContext) => Promise<HandlerResult>> = {
  start: mcStart,
  dispatch: mcDispatch,
  status: mcStatus,
  watch: mcWatch,
  abort: mcAbort,
  pause: mcPause,
  resume: mcResume,
  stop: mcStop,
  list: mcList,
  agents: mcAgents,
  bridge: mcBridge,
};

function showMcHelp(): void {
  ui.blank();
  console.log(`  ${ui.brandMark()} ${ui.bold('Mission Control')} — multi-loop background orchestration`);
  ui.rule();
  console.log(`
  ${ui.bold('Usage:')} aiwg mc <subcommand> [options]

  ${ui.bold('Subcommands:')}
    start                         Start a new Mission Control session
    dispatch <id> "<objective>"   Add a background mission to session
                                  [--mode pty-orchestrator] [--target-agent <id>]
    status [<id>] [--json]        View mission status dashboard
    watch [<id>]                  Live monitor (streaming)
    abort <session> <mission>     Abort a specific mission
    pause [<id>]                  Pause active session
    resume [<id>]                 Resume paused session
    stop [<id>] [--drain]         Shut down session
    list [--json]                 List all sessions
    agents [--filter] [--json]    Query routable agents from aiwg serve (#916)
    bridge [--aiwg-serve URL]     Tail the MC queue and dispatch to aiwg serve (#1182)
                                  [--watch DIR] [--subscribe-executors id,id]
                                  [--verbose]

  ${ui.bold('Examples:')}
    aiwg mc start --name "Sprint 4"
    aiwg mc dispatch mc-abc123 "Fix auth" --completion "tests pass"
    aiwg mc dispatch mc-abc123 "Supervise agent-01" --mode pty-orchestrator --target-agent agent-01 --completion "migration complete"
    aiwg mc status mc-abc123
    aiwg mc stop mc-abc123 --drain
    aiwg mc agents --framework sdlc-complete --max-cpu 80
    aiwg mc bridge --aiwg-serve http://127.0.0.1:7337
`);
}

// ── Exported handler ─────────────────────────────────────────

export const mcHandler: CommandHandler = {
  id: 'mc',
  name: 'Mission Control',
  description: 'Multi-loop background orchestration (start, dispatch, status, watch, stop)',
  category: 'orchestration',
  aliases: ['mission-control'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const subcmd = ctx.args[0];

    if (!subcmd || subcmd === '--help' || subcmd === '-h') {
      showMcHelp();
      return { exitCode: 0 };
    }

    const handler = subcommands[subcmd];
    if (!handler) {
      ui.error(`Unknown subcommand: ${subcmd}. Run 'aiwg mc --help' for usage.`);
      return { exitCode: 1 };
    }

    // Pass remaining args to subcommand
    const subCtx: HandlerContext = {
      ...ctx,
      args: ctx.args.slice(1),
    };

    return handler(subCtx);
  },
};

/**
 * All MC-related handlers for bulk registration
 */
export const mcHandlers: CommandHandler[] = [mcHandler];
