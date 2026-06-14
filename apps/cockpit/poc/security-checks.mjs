// PoC T-SEC — surface auth (S1), approval integrity (E1/S3), no-creds (I1).
// Launches a stack (mock) + overlay (Bridge CLI, which writes the runtime token),
// then exercises the security properties the ABM gate requires. Run:
//   node apps/cockpit/poc/security-checks.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const MOCK = fileURLToPath(new URL('../mock-executor/src/server.mjs', import.meta.url));
const BRIDGE = fileURLToPath(new URL('../bridge/src/server.mjs', import.meta.url));
const RUNTIME = join(homedir(), '.aiwg', 'cockpit', 'runtime', 'bridge.json');
const MOCK_PORT = 8155, BRIDGE_PORT = 8156;
const base = `http://127.0.0.1:${BRIDGE_PORT}`;

const reachable = async (url) => { try { return (await fetch(url)).ok; } catch { return false; } };
async function waitOk(url, ms = 6000) { const end = Date.now() + ms; while (Date.now() < end) { if (await reachable(url)) return; await sleep(100); } throw new Error('never up: ' + url); }

const mock = spawn(process.execPath, [MOCK], { env: { ...process.env, PORT: String(MOCK_PORT) }, stdio: 'ignore' });
const bridge = spawn(process.execPath, [BRIDGE], { env: { ...process.env, PORT: String(BRIDGE_PORT), MOCK_URL: `http://127.0.0.1:${MOCK_PORT}` }, stdio: 'ignore' });

try {
  await waitOk(`http://127.0.0.1:${MOCK_PORT}/health`);
  await waitOk(`${base}/healthz`);
  const rt = JSON.parse(await readFile(RUNTIME, 'utf8'));
  const TOKEN = rt.token;
  const api = (p, o = {}) => fetch(base + p, { ...o, headers: { ...(o.headers || {}), authorization: `Bearer ${TOKEN}` } });

  // S1 — surface auth: control surface is gated, constant-time bearer token
  assert.equal((await fetch(`${base}/api/inventory`)).status, 401, 'S1: unauthed -> 401');
  assert.equal((await fetch(`${base}/api/inventory?token=not-it`)).status, 401, 'S1: wrong token -> 401');
  assert.equal((await api('/api/inventory')).status, 200, 'S1: authed -> 200');

  // E1/S3 — approval integrity: a decision needs the token AND cannot be flipped
  assert.equal((await fetch(`${base}/api/approvals/apr-002?decision=approve`, { method: 'POST' })).status, 401, 'E1: approval needs the gate token');
  assert.equal((await (await api('/api/approvals/apr-001?decision=approve', { method: 'POST' })).json()).status, 'approved', 'S3: approval records the decision');
  assert.equal((await api('/api/approvals/apr-001?decision=deny', { method: 'POST' })).status, 409, 'S3: a resolved approval cannot be flipped');

  // I1 — no stack credentials at rest: the runtime file holds the overlay's own
  // per-launch token and nothing else; no provider/stack secret is stored.
  const keys = Object.keys(rt).sort();
  assert.deepEqual(keys, ['pid', 'port', 'started_at', 'token'], `I1: runtime file keys are ${keys.join(',')} — only the overlay token, no stack creds`);
  const credLike = keys.filter((k) => /secret|password|provider|apikey|api_key|credential/i.test(k));
  assert.equal(credLike.length, 0, 'I1: no credential-like fields stored');
  // tenant_id is a routing token, not auth: a valid tenant still requires the gate
  assert.equal((await fetch(`${base}/api/sessions?instance=${'550e8400-e29b-41d4-a716-446655440000'}&tenant=acme`)).status, 401, 'I1: tenant_id never substitutes for the token');

  console.log('POC T-SEC PASS — S1 surface-auth gated; E1/S3 approval integrity (token-required, no flip); I1 no stack creds at rest, tenant_id is routing not auth.');
} finally {
  mock.kill(); bridge.kill();
}
