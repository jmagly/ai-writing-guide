#!/usr/bin/env node
//
// Cockpit dev-stage full-system e2e (#1635) — the developer confidence check
// that sits BETWEEN the automated mock smokes/integration tests and the
// release-grade host/container/VM matrix (#1621, `npm run uat:cockpit-live:matrix`).
//
// It drives the REAL control-plane chain through an in-process Bridge against a
// REAL agentic-sandbox executor: health -> inventory -> pick a running instance
// -> create a managed session -> list sessions -> verify a direct attach_url.
//
// Safe by default: when no real executor is reachable it logs a SKIP reason and
// exits 0 (so it is harmless in ordinary CI). Set AIWG_COCKPIT_E2E_REQUIRED=1 to
// fail instead (release/local gating). It never uses the bundled mock.
//
//   node test/e2e/cockpit-dev-e2e.mjs        # or: npm run e2e:cockpit-dev
//
import { createBridge } from '../../apps/cockpit/bridge/src/server.mjs';

const EXECUTOR_URL =
  process.env.AIWG_COCKPIT_EXECUTOR_URL ||
  process.env.AIWG_SANDBOX_ENDPOINT ||
  'http://127.0.0.1:8122';
const REQUIRED = process.env.AIWG_COCKPIT_E2E_REQUIRED === '1';

function done(status, msg) {
  console.log(`E2E ${status} — ${msg}`);
  if (status === 'FAIL' || (status === 'SKIP' && REQUIRED)) process.exit(1);
  process.exit(0);
}

async function reachable(url) {
  for (const path of ['/healthz/http', '/healthz', '/health']) {
    try {
      const r = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

if (!(await reachable(EXECUTOR_URL))) {
  done('SKIP', `no real agentic-sandbox executor reachable at ${EXECUTOR_URL} ` +
    `(start one with: cd <agentic-sandbox>/management && ./dev.sh). ` +
    `Set AIWG_COCKPIT_E2E_REQUIRED=1 to make this a hard failure.`);
}

const bridge = createBridge({ executorUrl: EXECUTOR_URL });
await new Promise((r) => bridge.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${bridge.address().port}`;
const token = bridge.cockpitToken;
const f = (p, o = {}) => fetch(base + p, { ...o, headers: { ...(o.headers || {}), authorization: `Bearer ${token}` } });

try {
  const health = await (await f('/api/health')).json();
  if (health.mock_executor_allowed) throw new Error('executor looks like the mock — dev e2e requires a real executor');

  const inv = await (await f('/api/inventory')).json();
  if (!Array.isArray(inv.instances) || inv.instances.length === 0) {
    bridge.close();
    done('SKIP', `executor ${EXECUTOR_URL} reachable but inventory is empty — ` +
      `provision an instance, then re-run.`);
  }

  const target = inv.instances.find((i) => i.state === 'running') ?? inv.instances[0];
  const created = await (await f(`/api/instances/${encodeURIComponent(target.id)}/sessions`, { method: 'POST' })).json();
  if (!created.attach_url || !/^wss?:\/\//.test(created.attach_url)) {
    throw new Error(`session create returned no ws attach_url: ${JSON.stringify(created)}`);
  }

  const sessions = await (await f(`/api/sessions?instance=${encodeURIComponent(target.id)}`)).json();
  const listed = (sessions.sessions || []).some((s) => s.id === created.id);
  if (!listed) throw new Error(`created session ${created.id} not present in session list`);

  bridge.close();
  done('PASS', `executor ${EXECUTOR_URL}: inventory(${inv.instances.length}) -> ` +
    `instance ${target.id} -> session ${created.id} with attach_url. Full control-plane chain works.`);
} catch (err) {
  bridge.close();
  done('FAIL', `control-plane chain failed against ${EXECUTOR_URL}: ${err?.message ?? err}`);
}
