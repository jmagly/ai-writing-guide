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
const instanceIds = [1, 2, 3].map((index) => `00000000-0000-7000-8000-${String(index).padStart(12, '0')}`);

let runRoot = '';
let secretsDir = '';
let grpcPort = 0;
let baseUrl = '';
let server: ChildProcess | undefined;
const protocolEvidence: Record<string, unknown> = {};

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
      AIWG_CONFORMANCE_FLEET_SIZE: String(instanceIds.length),
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
    cycles: instanceIds.map((_instanceId, index) => ({
      id: `child-live-${index + 1}`, runtime: 'codex', prompt: `AIWG fleet live binding probe ${index + 1}`,
      workloadKind: 'persistent-agent' as const, longRunning: true,
    })),
  };
}

function executor(instanceId: string, index: number): ExecutorRegistration {
  return {
    executorId: `sandbox-live-executor-${index + 1}`, a2aInstanceId: instanceId,
    name: `Agentic Sandbox live UAT ${index + 1}`, version: 'live', specVersion: 'executor.aiwg.io/v1',
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
  it('fails closed for auth/malformed input and exercises governed activity availability', async () => {
    const unauthorized = await fetch(`${baseUrl}/api/v2/fleet/workloads`);
    expect(unauthorized.status).toBe(401);

    const malformed = await fetch(`${baseUrl}/api/v2/fleet/workloads`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ document_type: 'workload', api_version: 'wrong/v0' }),
    });
    expect(malformed.status).toBeGreaterThanOrEqual(400);
    expect(malformed.status).toBeLessThan(500);

    const activityHeaders = {
      authorization: `Bearer ${token}`,
      'x-agentic-tenant-id': 'tenant-live',
      'x-agentic-host-id': 'host-live',
      'x-agentic-instance-id': instanceIds[0],
      'x-agentic-agent-id': 'agent-live',
    };
    const coverage = await fetch(`${baseUrl}/api/v2/activity/coverage`, { headers: activityHeaders });
    expect(coverage.status).toBe(200);
    expect(await coverage.json()).toMatchObject({ schema_version: 'activity.event/v1' });
    const timeline = await fetch(`${baseUrl}/api/v2/activity/timeline?limit=10`, { headers: activityHeaders });
    expect(timeline.status).toBe(200);
    expect(await timeline.json()).toMatchObject({ schema_version: 'activity.event/v1', events: [] });
    const signedExport = await fetch(`${baseUrl}/api/v2/activity/export`, {
      method: 'POST', headers: { ...activityHeaders, 'content-type': 'application/json' }, body: '{}',
    });
    expect(signedExport.status).toBe(503);

    Object.assign(protocolEvidence, {
      unauthorized_status: unauthorized.status,
      malformed_status: malformed.status,
      activity_coverage_status: coverage.status,
      activity_timeline_status: timeline.status,
      signed_export_unconfigured_status: signedExport.status,
    });
  });

  it('dispatches, binds, restarts, and re-adopts three durable children without duplication', async () => {
    const pool = instanceIds.map(executor);
    const first = await new FleetMissionConductor({ runWorker: client().runWorker }).conduct(plan(), pool);
    expect(first.parentState).toBe('completed');
    expect(first.cycles).toHaveLength(3);
    expect(first.cycles.every((cycle) => cycle.observedState === 'running' && cycle.satisfied)).toBe(true);
    expect(new Set(first.cycles.map((cycle) => cycle.lineage?.targetId)).size).toBe(3);
    const taskIds = first.cycles.map((cycle) => cycle.taskId!);
    expect(taskIds.every(Boolean)).toBe(true);
    expect(new Set(taskIds).size).toBe(3);

    await stopServer();
    await startServer();

    const resumed = await new FleetMissionConductor({ runWorker: client().runWorker }).conduct(plan(), pool);
    expect(resumed.parentState).toBe('completed');
    expect(resumed.cycles.map((cycle) => cycle.taskId)).toEqual(taskIds);
    expect(resumed.cycles.every((cycle) => cycle.observedState === 'running' && cycle.satisfied)).toBe(true);

    const inventory = await client().inventory() as {
      inventory_revision: number;
      records: Array<{ lineage: { task_id: string } }>;
    };
    expect(inventory.records).toHaveLength(3);
    expect(new Set(inventory.records.map((record) => record.lineage.task_id))).toEqual(new Set(taskIds));
    const childIds = plan().cycles.map((cycle) => cycle.id);
    const report = await client().reconcile(inventory.inventory_revision, childIds);
    expect(report.rows).toHaveLength(3);
    expect(report.rows.every((row) => row.classification === 're-adopted')).toBe(true);

    const taskCounts: Record<string, number> = {};
    for (const instanceId of instanceIds) {
      const tasks = await fetch(`${baseUrl}/agents/${instanceId}/v1/tasks`, {
        headers: { authorization: `Bearer ${token}` },
      }).then((response) => response.json()) as { tasks: unknown[] };
      taskCounts[instanceId] = tasks.tasks.length;
      expect(tasks.tasks).toHaveLength(1);
    }

    const evidenceDir = join(process.cwd(), 'test-results');
    await mkdir(evidenceDir, { recursive: true });
    await writeFile(join(evidenceDir, 'fleet-sandbox-live.evidence.json'), JSON.stringify({
      aiwg_commit: process.env.GITHUB_SHA ?? process.env.GITEA_SHA ?? null,
      aiwg_qualification_commit: process.env.AIWG_QUALIFICATION_COMMIT ?? null,
      sandbox_tag: process.env.AGENTIC_SANDBOX_QUALIFICATION_TAG ?? null,
      sandbox_commit: process.env.AGENTIC_SANDBOX_QUALIFICATION_COMMIT ?? null,
      sandbox_binary: binary,
      runtime_targets: { host_management: 'pass', managed_container: 'not_available', vm: 'not_available', apple_endpoint_security: 'not_available' },
      protocol_evidence: protocolEvidence,
      target_ids: first.cycles.map((cycle) => cycle.lineage?.targetId),
      task_ids: taskIds,
      restart_task_ids: resumed.cycles.map((cycle) => cycle.taskId),
      inventory_revision: inventory.inventory_revision,
      reconciliation: report.rows,
      task_counts_by_target: taskCounts,
    }, null, 2));
  });
});
