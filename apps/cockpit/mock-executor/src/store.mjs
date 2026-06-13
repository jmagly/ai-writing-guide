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
