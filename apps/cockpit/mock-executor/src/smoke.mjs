// Increment-1 smoke test: start the mock, fetch the AgentCard, assert the
// five declared extensions + runtime/v1 required. No deps; exits non-zero on failure.
import assert from 'node:assert/strict';
import { createExecutor, DEFAULT_INSTANCE } from './server.mjs';
import { EXT } from './agent-card.mjs';

const server = createExecutor({ protocolMode: 'dual' });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

try {
  // health
  const h = await fetch(`${base}/health`);
  assert.equal(h.status, 200, 'health 200');

  // AgentCard discovery
  const r = await fetch(`${base}/agents/${DEFAULT_INSTANCE}/.well-known/agent-card.json`);
  assert.equal(r.status, 200, 'agent-card 200');
  const card = await r.json();
  assert.equal(card.protocolVersion, '0.3.0', 'legacy top-level declaration stays truthful');
  assert.deepEqual(
    card.supportedInterfaces.map((entry) => entry.protocolVersion),
    ['1.0', '0.3'],
    'dual card declares version per interface'
  );

  const uris = card.capabilities.extensions.map((e) => e.uri);
  for (const u of Object.values(EXT)) assert.ok(uris.includes(u), `declares ${u}`);

  const runtime = card.capabilities.extensions.find((e) => e.uri === EXT.runtime);
  assert.equal(runtime.required, true, 'runtime/v1 required:true');
  assert.equal(runtime.params.instance_id, DEFAULT_INSTANCE, 'runtime params instance_id matches');
  assert.ok(['vm', 'container'].includes(runtime.params.runtime), 'runtime kind vm|container');

  const mt = card.capabilities.extensions.find((e) => e.uri === EXT.multiTenant);
  assert.equal(mt.params.default_tenant, 'default', 'multi-tenant default_tenant');

  // unknown instance → 404
  const nf = await fetch(`${base}/agents/does-not-exist/.well-known/agent-card.json`);
  assert.equal(nf.status, 404, 'unknown instance 404');

  const v1Url = `${base}/agents/${DEFAULT_INSTANCE}/message:send`;
  const v1Body = JSON.stringify({ message: { messageId: 'smoke-v1', role: 'ROLE_USER', parts: [{ text: 'hello' }] } });
  const missingVersion = await fetch(v1Url, {
    method: 'POST', headers: { 'content-type': 'application/a2a+json' }, body: v1Body,
  });
  assert.equal(missingVersion.status, 400, '1.0 route rejects missing A2A-Version');
  const v1 = await fetch(v1Url, {
    method: 'POST',
    headers: { 'content-type': 'application/a2a+json', 'A2A-Version': '1.0' },
    body: v1Body,
  });
  assert.equal(v1.status, 200, 'explicit 1.0 request accepted');
  assert.equal((await v1.json()).task.status.state, 'TASK_STATE_WORKING', '1.0 enum shape');

  const v03 = await fetch(`${base}/agents/${DEFAULT_INSTANCE}/v1/messages:send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: { messageId: 'smoke-v03', role: 'user', parts: [{ kind: 'text', text: 'hello' }] } }),
  });
  assert.equal(v03.status, 200, 'headerless 0.3 compatibility request accepted');
  assert.equal((await v03.json()).status.state, 'working', '0.3 lowercase enum shape');

  console.log('SMOKE OK — truthful dual AgentCard plus distinct 0.3/1.0 wire contracts');
} finally {
  server.close();
}
