// PoC T-ISO-01 — overlay isolation (kill-bridge).
// Risk: does the Cockpit overlay (Bridge + UI) couple the lifecycle of the
// underlying agentic stacks to itself? It must NOT — killing the overlay must
// leave running agents and their sessions untouched. The data plane (pty) and the
// stacks live in the executor; the Bridge is a control-plane front, nothing more.
//
// This PoC launches a stack (mock executor) + the overlay (Bridge), confirms the
// stack has live work, SIGKILLs the overlay, and verifies the stack + its sessions
// survive. Run: node apps/cockpit/poc/kill-bridge-isolation.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const MOCK = fileURLToPath(new URL('../mock-executor/src/server.mjs', import.meta.url));
const BRIDGE = fileURLToPath(new URL('../bridge/src/server.mjs', import.meta.url));
const MOCK_PORT = 8151, BRIDGE_PORT = 8152;
const INST = '550e8400-e29b-41d4-a716-446655440000';

const reachable = async (url) => { try { return (await fetch(url)).ok; } catch { return false; } };
async function waitOk(url, ms = 6000) { const end = Date.now() + ms; while (Date.now() < end) { if (await reachable(url)) return; await sleep(100); } throw new Error('never came up: ' + url); }

const mock = spawn(process.execPath, [MOCK], { env: { ...process.env, PORT: String(MOCK_PORT) }, stdio: 'ignore' });
const bridge = spawn(process.execPath, [BRIDGE], { env: { ...process.env, PORT: String(BRIDGE_PORT), MOCK_URL: `http://127.0.0.1:${MOCK_PORT}` }, stdio: 'ignore' });

try {
  await waitOk(`http://127.0.0.1:${MOCK_PORT}/health`);
  await waitOk(`http://127.0.0.1:${BRIDGE_PORT}/healthz`);

  // the stack has live work + a session before we touch the overlay
  const before = await (await fetch(`http://127.0.0.1:${MOCK_PORT}/admin/running`)).json();
  assert.ok(before.running.length >= 1, 'stack has running work');

  // kill the OVERLAY hard
  bridge.kill('SIGKILL');
  await sleep(400);
  assert.equal(await reachable(`http://127.0.0.1:${BRIDGE_PORT}/healthz`), false, 'overlay (Bridge) is down');

  // the STACK is unaffected — running work + session transcript intact
  const after = await (await fetch(`http://127.0.0.1:${MOCK_PORT}/admin/running`)).json();
  assert.equal(after.running.length, before.running.length, 'stack running work survived overlay death');
  const sess = await (await fetch(`http://127.0.0.1:${MOCK_PORT}/agents/${INST}/sessions`)).json();
  assert.ok(sess.sessions.find((s) => s.id === 'demo-shell'), 'stack session intact after overlay death');

  console.log('POC T-ISO-01 PASS — overlay (Bridge) SIGKILLed; underlying stack + sessions unaffected. Kill-bridge isolation holds.');
} finally {
  mock.kill(); try { bridge.kill(); } catch { /* already dead */ }
}
