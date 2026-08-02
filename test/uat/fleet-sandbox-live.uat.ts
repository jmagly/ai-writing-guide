/**
 * Real AIWG conductor -> Agentic Sandbox management/A2A/restart proof.
 *
 * Set AGENTIC_SANDBOX_MGMT_BIN to an Agentic Sandbox `agentic-mgmt` binary.
 * The suite is opt-in unless AIWG_FLEET_SANDBOX_LIVE_REQUIRED=1.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AgenticSandboxFleetClient } from '../../src/serve/agentic-sandbox-fleet-client.js';
import { FleetMissionConductor, type FleetMissionPlan } from '../../src/serve/fleet-mission-conductor.js';
import type { ExecutorRegistration } from '../../src/serve/executor-registry.js';

const binary = resolve(process.env.AGENTIC_SANDBOX_MGMT_BIN ?? '../agentic-sandbox/management/target/debug/agentic-mgmt');
const required = process.env.AIWG_FLEET_SANDBOX_LIVE_REQUIRED === '1';
const available = existsSync(binary);
const suite = available || required ? describe : describe.skip;
const token = 'aiwg-fleet-sandbox-live-token';
const instanceId = '00000000-0000-7000-8000-000000000001';

let runRoot = '';
let secretsDir = '';
let grpcPort = 0;
let baseUrl = '';
let server: ChildProcess | undefined;

async function portAvailable(port: number): Promise<boolean> {
  return new Promise((resolvePort, reject) => {
    const listener = net.createServer();
    listener.once('error', () => resolvePort(false));
    listener.listen(port, '127.0.0.1', () => {
      listener.close((error) => error ? reject(error) : resolvePort(true));
    });
  });
}

async function freePortTriple(): Promise<number> {
  for (let candidate = 19420; candidate < 19720; candidate += 3) {
    if (await portAvailable(candidate) && await portAvailable(candidate + 1) && await portAvailable(candidate + 2)) return candidate;
  }
  throw new Error('could not reserve three adjacent Agentic Sandbox ports');
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const stopped = new Promise<void>((resolveStop) => server!.once('close', () => resolveStop()));
  server.kill('SIGTERM');
  await stopped;
  server = undefined;
}

async function startServer() {
  server = spawn(binary, [], {
    env: {
      ...process.env,
      LISTEN_ADDR: `127.0.0.1:${grpcPort}`,
      SECRETS_DIR: secretsDir,
      AIWG_CONFORMANCE_MODE: '1',
      RUST_LOG: 'warn',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  server.stderr?.on('data', (chunk) => { stderr += String(chunk).slice(-10_000); });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Agentic Sandbox exited before health: ${stderr}`);
    try {
      const response = await fetch(`${baseUrl}/healthz/http`);
      if (response.ok) return;
    } catch { /* server still starting */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Agentic Sandbox did not become healthy: ${stderr}`);
}

function plan(): FleetMissionPlan {
  return {
    orchestratorId: 'aiwg-live-uat',
    missionId: 'mission-live-restart',
    goal: 'prove AIWG and Agentic Sandbox durable orchestration binding',
    completionCriterion: 'persistent child is running and re-adopted after restart',
    aggregation: { mode: 'all-pass' },
    cycles: [{
      id: 'child-live-persistent', runtime: 'codex', prompt: 'AIWG fleet live binding probe',
      workloadKind: 'persistent-agent', longRunning: true,
    }],
  };
}

function executor(): ExecutorRegistration {
  return {
    executorId: 'sandbox-live-executor', a2aInstanceId: instanceId,
    name: 'Agentic Sandbox live UAT', version: 'live', specVersion: 'executor.aiwg.io/v1',
    transportEndpoints: { rest: baseUrl, ws: baseUrl.replace(/^http/, 'ws') },
    capabilities: ['runtime:codex', 'resumable'], token, connected: true,
    registeredAt: new Date().toISOString(), currentMissions: new Set(),
  };
}

function client() {
  return new AgenticSandboxFleetClient({
    baseUrl, token, pollIntervalMs: 10, maxPolls: 20,
  });
}

beforeAll(async () => {
  if (!available) {
    if (required) throw new Error(`AGENTIC_SANDBOX_MGMT_BIN is required and missing: ${binary}`);
    return;
  }
  runRoot = await mkdtemp(join(tmpdir(), 'aiwg-fleet-sandbox-live-'));
  secretsDir = join(runRoot, 'data', 'secrets');
  await mkdir(secretsDir, { recursive: true, mode: 0o700 });
  await writeFile(join(secretsDir, 'admin.token'), token, { mode: 0o600 });
  await writeFile(join(secretsDir, 'operator-tokens.toml'), `[[tokens]]\ntoken = "${token}"\nrole = "admin"\n`, { mode: 0o600 });
  await chmod(secretsDir, 0o700);
  grpcPort = await freePortTriple();
  baseUrl = `http://127.0.0.1:${grpcPort + 2}`;
  await startServer();
});

afterAll(async () => {
  await stopServer();
  if (runRoot) await rm(runRoot, { recursive: true, force: true });
});

suite('AIWG fleet conductor with a real Agentic Sandbox binary', () => {
  it('dispatches, binds, restarts, and re-adopts one durable child without duplication', async () => {
    const first = await new FleetMissionConductor({ runWorker: client().runWorker }).conduct(plan(), [executor()]);
    expect(first.parentState).toBe('completed');
    expect(first.cycles[0]).toMatchObject({ observedState: 'running', satisfied: true });
    expect(first.cycles[0]?.taskId).toBeTruthy();
    const taskId = first.cycles[0]!.taskId!;

    await stopServer();
    await startServer();

    const resumed = await new FleetMissionConductor({ runWorker: client().runWorker }).conduct(plan(), [executor()]);
    expect(resumed.parentState).toBe('completed');
    expect(resumed.cycles[0]).toMatchObject({ taskId, observedState: 'running', satisfied: true });

    const inventory = await client().inventory() as { records: Array<{ lineage: { task_id: string } }> };
    expect(inventory.records).toHaveLength(1);
    expect(inventory.records[0]?.lineage.task_id).toBe(taskId);
    const report = await client().reconcile(2, ['child-live-persistent']);
    expect(report.rows[0]).toMatchObject({ child_id: 'child-live-persistent', classification: 're-adopted' });

    const tasks = await fetch(`${baseUrl}/agents/${instanceId}/v1/tasks`, {
      headers: { authorization: `Bearer ${token}` },
    }).then((response) => response.json()) as { tasks: unknown[] };
    expect(tasks.tasks).toHaveLength(1);
  });
});
