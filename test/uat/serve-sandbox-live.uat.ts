/**
 * Tier-4 live UAT — `aiwg serve` against a real agentic-sandbox instance.
 *
 * Gated on AIWG_SANDBOX_ENDPOINT (default http://127.0.0.1:8122). When the
 * sandbox is unreachable, every test skips with a clear message so this UAT
 * is safe to run in any environment.
 *
 * Run on demand:
 *   npm run uat:serve-live
 *
 * @issue #1176
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs without bundled types
import { spawnAiwgServe, waitForHttp } from '../integration/_serve-harness.mjs';
import { A2AClient } from '../../src/a2a/client.js';
import { normalizeAgentCard } from '../../src/a2a/protocol.js';
import type { AgentCard, A2AProtocolVersion } from '../../src/a2a/types.js';

const SANDBOX_ENDPOINT = process.env.AIWG_SANDBOX_ENDPOINT || 'http://127.0.0.1:8122';

/** Probe the sandbox once up-front so we can skip the whole suite if it's unreachable. */
async function probeSandbox(): Promise<{ reachable: boolean; status?: Record<string, unknown>; error?: string }> {
  try {
    const resp = await fetch(`${SANDBOX_ENDPOINT}/api/v1/aiwg/status`, {
      signal: AbortSignal.timeout(2_000),
    });
    if (!resp.ok) return { reachable: false, error: `status ${resp.status}` };
    const status = await resp.json();
    return { reachable: true, status };
  } catch (err) {
    return { reachable: false, error: String((err as Error).message || err) };
  }
}

interface ServeHandle {
  url: string;
  port: number;
  kill: (signal?: NodeJS.Signals) => Promise<void>;
}

describe('aiwg serve — live UAT vs real agentic-sandbox', () => {
  let sandboxReachable = false;
  let sandboxStatus: Record<string, unknown> | undefined;
  let serve: ServeHandle | undefined;

  beforeAll(async () => {
    const probe = await probeSandbox();
    sandboxReachable = probe.reachable;
    sandboxStatus = probe.status;
    if (!sandboxReachable) {
      // eslint-disable-next-line no-console
      console.log(
        `\n  ⚠ Skipping serve-sandbox-live UAT — sandbox at ${SANDBOX_ENDPOINT} unreachable (${probe.error}).\n  Run a sandbox locally or set AIWG_SANDBOX_ENDPOINT to test against a different host.\n`,
      );
      return;
    }
    serve = await spawnAiwgServe();
    await waitForHttp(serve.url, 20_000, serve);
  }, 60_000);

  afterAll(async () => {
    if (serve) await serve.kill();
  });

  // Wrap each test in a guard so they skip cleanly when the sandbox is absent.
  function liveIt(name: string, body: () => Promise<void> | void, timeout?: number) {
    it(
      name,
      async () => {
        if (!sandboxReachable) {
          // eslint-disable-next-line no-console
          console.log(`  ⏭  ${name} — skipped (no sandbox)`);
          return;
        }
        await body();
      },
      timeout,
    );
  }

  function asRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  }

  function instanceRecords(body: unknown): Record<string, unknown>[] {
    if (Array.isArray(body)) return body.map(asRecord).filter((v): v is Record<string, unknown> => !!v);
    const record = asRecord(body);
    const candidates = [
      record?.instances,
      record?.data,
      record?.items,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.map(asRecord).filter((v): v is Record<string, unknown> => !!v);
      }
    }
    return [];
  }

  function routableInstanceId(record: Record<string, unknown>): string | undefined {
    const value = record.instance_id ?? record.instanceId ?? record.agent_instance_id ?? record.id;
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  liveIt('sandbox /api/v1/aiwg/status reports configured + endpoint', () => {
    expect(sandboxStatus).toBeDefined();
    expect(sandboxStatus!.configured).toBe(true);
    expect(typeof sandboxStatus!.endpoint).toBe('string');
  });

  liveIt('sandbox /api/v1/agents responds with an agents array', async () => {
    const resp = await fetch(`${SANDBOX_ENDPOINT}/api/v1/agents`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body.agents)).toBe(true);
  });

  liveIt('aiwg serve health endpoint responds (smoke)', async () => {
    expect(serve).toBeDefined();
    const resp = await fetch(serve!.url);
    expect(resp.status).toBeLessThan(500);
  });

  liveIt('serve POST /api/v1/executors/register accepts a synthetic executor', async () => {
    expect(serve).toBeDefined();
    const executorId = `uat-exec-${Date.now()}`;
    const resp = await fetch(`${serve!.url}/api/v1/executors/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executor_id: executorId,
        name: 'uat-synthetic',
        version: '0.0.0-uat',
        spec_version: '1.0.0',
        transport_endpoints: {
          rest: SANDBOX_ENDPOINT,
          ws: SANDBOX_ENDPOINT.replace('http', 'ws'),
        },
        capabilities: ['isolation:container', 'runtime:claude-code', 'platform:linux/x64'],
      }),
    });
    expect([200, 201]).toContain(resp.status);
    const body = await resp.json();
    expect(body.executor_id).toBe(executorId);
    expect(typeof body.token).toBe('string');
  }, 30_000);

  liveIt('serve GET /api/v1/executors lists a registered executor', async () => {
    expect(serve).toBeDefined();
    const list = await fetch(`${serve!.url}/api/v1/executors`);
    expect(list.status).toBe(200);
    const body = await list.json();
    expect(Array.isArray(body.executors)).toBe(true);
    expect(body.executors.length).toBeGreaterThan(0);
  }, 30_000);

  // ── Cycle 2 — read-side scenarios against the running sandbox ───
  // These exercise the actual sandbox surface AIWG depends on. They are
  // read-only and safe to run against any running sandbox without altering
  // state. Mission-lifecycle write tests (dispatch → execute → terminate)
  // require a connected executor and ride with cycle 3.

  liveIt('sandbox /api/v1/vms returns a vm list', async () => {
    const resp = await fetch(`${SANDBOX_ENDPOINT}/api/v1/vms`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('vms');
    expect(Array.isArray(body.vms)).toBe(true);
  });

  liveIt('sandbox /api/v1/containers returns a container list', async () => {
    const resp = await fetch(`${SANDBOX_ENDPOINT}/api/v1/containers`);
    // Some sandbox builds may not expose containers; accept 200 or 404.
    expect([200, 404]).toContain(resp.status);
    if (resp.status === 200) {
      const body = await resp.json();
      expect(body).toHaveProperty('containers');
    }
  });

  liveIt('serve registers a sandbox pointed at the live agentic-sandbox', async () => {
    expect(serve).toBeDefined();
    const wsEndpoint = SANDBOX_ENDPOINT.replace(/^http/, 'ws');
    const resp = await fetch(`${serve!.url}/api/sandboxes/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `uat-live-${Date.now()}`,
        instance_id: `uat-instance-${Date.now()}`,
        grpc_endpoint: SANDBOX_ENDPOINT,
        ws_endpoint: wsEndpoint,
        http_endpoint: SANDBOX_ENDPOINT,
        capabilities: ['vms', 'containers'],
        version: '0.0.0-uat',
      }),
    });
    expect([200, 201]).toContain(resp.status);
    const body = await resp.json();
    expect(typeof body.sandbox_id).toBe('string');
    expect(typeof body.token).toBe('string');
  }, 30_000);

  liveIt('serve proxies vms list through the registered live sandbox', async () => {
    expect(serve).toBeDefined();
    // Register fresh + use returned sandbox_id (state isolation per test)
    const wsEndpoint = SANDBOX_ENDPOINT.replace(/^http/, 'ws');
    const reg = await fetch(`${serve!.url}/api/sandboxes/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `uat-vmproxy-${Date.now()}`,
        instance_id: `uat-vmproxy-${Date.now()}`,
        grpc_endpoint: SANDBOX_ENDPOINT,
        ws_endpoint: wsEndpoint,
        http_endpoint: SANDBOX_ENDPOINT,
      }),
    });
    const { sandbox_id } = await reg.json();

    const resp = await fetch(`${serve!.url}/api/sandboxes/${sandbox_id}/vms`);
    expect([200, 502]).toContain(resp.status);
    if (resp.status === 200) {
      const body = await resp.json();
      expect(body).toHaveProperty('vms');
      expect(Array.isArray(body.vms)).toBe(true);
    }
    // 502 is acceptable if the running sandbox doesn't expose the legacy
    // /api/v1/vms route (some builds gate it behind a libvirt connection).
  }, 30_000);

  liveIt('sandbox A2A 0.3/1.0 smoke covers discovery, negotiated dispatch, and normalized task status', async () => {
    const inventory = await fetch(`${SANDBOX_ENDPOINT}/api/v2/admin/instances`);
    if (inventory.status === 404) {
      // eslint-disable-next-line no-console
      console.log('  ⏭  sandbox v2 A2A smoke — skipped (/api/v2/admin/instances unavailable)');
      return;
    }
    expect(inventory.status).toBe(200);
    const instances = instanceRecords(await inventory.json());
    const instanceId = instances.map(routableInstanceId).find((id): id is string => !!id);
    if (!instanceId) {
      // eslint-disable-next-line no-console
      console.log('  ⏭  sandbox v2 A2A smoke — skipped (no routable instance_id in inventory)');
      return;
    }

    let card = await fetch(`${SANDBOX_ENDPOINT}/agents/${encodeURIComponent(instanceId)}/.well-known/agent-card.json`);
    if (card.status === 404) {
      card = await fetch(`${SANDBOX_ENDPOINT}/agents/${encodeURIComponent(instanceId)}/v1/extendedAgentCard`);
    }
    expect(card.status).toBe(200);
    const cardBody = asRecord(await card.json());
    expect(typeof cardBody?.name).toBe('string');
    const normalizedCard = normalizeAgentCard(cardBody as unknown as AgentCard);
    const availableVersions = [...new Set(normalizedCard.interfaces.map(entry => entry.protocolVersion))];
    if (process.env.AIWG_A2A_LIVE_REQUIRE_BOTH === '1') {
      expect(availableVersions.sort()).toEqual(['0.3', '1.0']);
    }

    if (process.env.AIWG_A2A_LIVE_DISPATCH !== '1') {
      // eslint-disable-next-line no-console
      console.log('  ⏭  sandbox v2 A2A dispatch smoke — set AIWG_A2A_LIVE_DISPATCH=1 to send a live message');
      return;
    }

    const outcomes: Array<{ version: A2AProtocolVersion; state: string }> = [];
    for (const protocolPolicy of availableVersions) {
      const client = await A2AClient.negotiate({
        baseUrl: SANDBOX_ENDPOINT,
        bearer: process.env.AIWG_SANDBOX_TOKEN ?? '',
        instanceId,
        protocolPolicy,
      });
      const sent = await client.sendMessage({
        messageId: `uat-a2a-${protocolPolicy}-${Date.now()}`,
        role: 'user',
        parts: [{ type: 'text', text: 'AIWG live A2A smoke test. Report readiness only.' }],
        metadata: { source: 'aiwg-uat', issue: 2140 },
      });
      expect(sent.protocolVersion).toBe(protocolPolicy);
      const status = await client.getTask(sent.task.id);
      outcomes.push({ version: protocolPolicy, state: status.status.state });

      const subscription = client.subscribeToTask(sent.task.id);
      const iterator = subscription[Symbol.asyncIterator]();
      try {
        const first = await Promise.race([
          iterator.next(),
          new Promise<never>((_, reject) => setTimeout(
            () => reject(new Error(`timed out waiting for ${protocolPolicy} initial task snapshot`)),
            5_000,
          )),
        ]);
        expect(first.done).toBe(false);
        expect(first.value).toMatchObject({
          type: 'task',
          protocolVersion: protocolPolicy,
          task: { id: sent.task.id },
        });
      } finally {
        subscription.close();
      }

      const push = await client.createPushNotificationConfig(sent.task.id, {
        url: `https://subscriber.example.test/a2a/${protocolPolicy.replace('.', '-')}`,
        token: `uat-${protocolPolicy}`,
      });
      expect(typeof push.configId).toBe('string');
      const roundTrip = await client.getPushNotificationConfig(sent.task.id, push.configId!);
      expect(roundTrip).toMatchObject({ configId: push.configId, url: push.url });
      await client.deletePushNotificationConfig(sent.task.id, push.configId!);
    }
    expect(outcomes.map(outcome => outcome.version).sort()).toEqual(availableVersions.sort());
  }, 45_000);

  // ── Deferred to cycle 3 ─────────────────────────────────────────
  // - End-to-end mission lifecycle (register executor → dispatch → execute → terminate)
  //   requires the running sandbox to register as an executor (not just respond to reads).
  //   This is a write-side test that ride together with the executor adapter under
  //   sandbox#193 once mission events fully wire to dispatch.
  // - Multi-pane attach against a real VM
  // - Mid-PTY-session VM stop
  // - Network partition reconnect
  // - Concurrent registers from two serves
  // - Telemetry round-trip
});
