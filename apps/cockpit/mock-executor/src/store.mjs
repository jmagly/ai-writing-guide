// In-memory instance store for the mock executor. Seeds a few demo instances
// so the admin surface + Cockpit inventory have real data to render.
// (Real provisioning lifecycle — start/stop/destroy — lands in a later increment.)

export const DEFAULT_INSTANCE = process.env.MOCK_INSTANCE_ID ?? '550e8400-e29b-41d4-a716-446655440000';

/** @typedef {{ instance_id: string, runtime: 'vm'|'container', loadout: string, state: 'running'|'stopped'|'provisioning', created_at: string, tenant_id: string }} Instance */

/** @type {Map<string, Instance>} */
export const instances = new Map([
  [DEFAULT_INSTANCE, { instance_id: DEFAULT_INSTANCE, runtime: 'container', loadout: 'agentic-dev', state: 'running', created_at: '2026-06-13T12:00:00Z', tenant_id: 'default' }],
  ['7c1f0b2a-3d4e-4f5a-9b8c-1d2e3f4a5b6c', { instance_id: '7c1f0b2a-3d4e-4f5a-9b8c-1d2e3f4a5b6c', runtime: 'vm', loadout: 'security-audit', state: 'running', created_at: '2026-06-13T12:05:00Z', tenant_id: 'default' }],
  ['9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b', { instance_id: '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b', runtime: 'container', loadout: 'agentic-dev', state: 'stopped', created_at: '2026-06-12T18:30:00Z', tenant_id: 'default' }],
]);

export function listInstances() {
  return [...instances.values()];
}
export function getInstance(id) {
  return instances.get(id) ?? null;
}

// --- lifecycle mutators (Cockpit management, UC-012) ---
export function setInstanceState(id, state) {
  const inst = instances.get(id);
  if (!inst) return null;
  inst.state = state;
  return inst;
}
export function destroyInstance(id) {
  return instances.delete(id);
}

// --- HITL approval queue (hitl-prompt/v1; UC-009) ---
/** @type {Map<string, {id:string, instance_id:string, prompt:string, risk:string, created_at:string, status:'pending'|'approved'|'denied', decided_at?:string}>} */
export const approvals = new Map([
  ['apr-001', { id: 'apr-001', instance_id: '7c1f0b2a-3d4e-4f5a-9b8c-1d2e3f4a5b6c', prompt: 'Deploy to production (security-audit stack)?', risk: 'high', created_at: '2026-06-13T20:00:00Z', status: 'pending' }],
  ['apr-002', { id: 'apr-002', instance_id: DEFAULT_INSTANCE, prompt: 'Write to ~/.ssh/config during setup?', risk: 'medium', created_at: '2026-06-13T20:02:00Z', status: 'pending' }],
]);
export function listApprovals(status) {
  return [...approvals.values()].filter((a) => !status || a.status === status);
}
export function resolveApproval(id, decision) {
  const a = approvals.get(id);
  if (!a || a.status !== 'pending') return null;
  a.status = decision === 'approve' ? 'approved' : 'denied';
  a.decided_at = new Date().toISOString();
  return a;
}

// --- cost / quota rollup (UC-010) — mock token+spend per instance/tenant ---
const COST = {
  [DEFAULT_INSTANCE]: { input_tokens: 184_200, output_tokens: 42_900, usd: 1.83 },
  '7c1f0b2a-3d4e-4f5a-9b8c-1d2e3f4a5b6c': { input_tokens: 96_400, output_tokens: 18_700, usd: 0.91 },
  '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b': { input_tokens: 12_100, output_tokens: 2_300, usd: 0.11 },
};
export function costReport() {
  const per = listInstances().map((i) => ({ instance_id: i.instance_id, tenant: i.tenant_id, ...(COST[i.instance_id] ?? { input_tokens: 0, output_tokens: 0, usd: 0 }) }));
  const total = per.reduce((a, c) => ({ input_tokens: a.input_tokens + c.input_tokens, output_tokens: a.output_tokens + c.output_tokens, usd: +(a.usd + c.usd).toFixed(2) }), { input_tokens: 0, output_tokens: 0, usd: 0 });
  return { per_instance: per, total };
}
