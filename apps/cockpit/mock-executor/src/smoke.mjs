// Increment-1 smoke test: start the mock, fetch the AgentCard, assert the
// five declared extensions + runtime/v1 required. No deps; exits non-zero on failure.
import assert from 'node:assert/strict';
import { createExecutor, DEFAULT_INSTANCE } from './server.mjs';
import { EXT } from './agent-card.mjs';

const server = createExecutor();
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
  assert.equal(card.protocolVersion, '1.0.0', 'protocolVersion');

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

  console.log('SMOKE OK — AgentCard discovery (5 extensions declared, runtime/v1 required, 404 on unknown)');
} finally {
  server.close();
}
