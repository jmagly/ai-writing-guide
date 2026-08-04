import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// @ts-expect-error — source module is intentionally ESM JavaScript
import { AGENTIC_SANDBOX_TOOL_NAMES, AgenticSandboxMcpClient, registerAgenticSandboxToolset } from '../../../src/mcp/tools/agentic-sandbox.mjs';

const workload = (revision = 1) => ({
  document_type: 'workload', api_version: 'agentic-orchestration/v1', kind: 'one-shot-command',
  lineage: { child_id: 'child-1' }, status: { observed_state: 'running', revision },
});
const inventory = { document_type: 'inventory', api_version: 'agentic-orchestration/v1', inventory_revision: 7, records: [workload()] };
const scope = { tenant_id: 'tenant-1', host_id: 'host-1', instance_id: 'instance-1', agent_id: 'agent-1' };
const completeness = { complete: true };
const event = {
  schema_version: 'activity.event/v1', event_id: '0198f975-cdd5-7abc-8def-0123456789ab',
  event_name: 'agent.action', plane: 'action', occurred_at: '2026-08-04T12:00:00Z', observed_at: '2026-08-04T12:00:01Z',
  source: { collector: 'sandbox', layer: 'host', runtime: 'qemu-kvm', trust: 'observed' },
  correlation: scope, sensitivity: 'metadata', retention_class: 'security', payload: {}, integrity: { collector_sequence: 1 },
};
const body = (result: any) => JSON.parse(result.content[0].text);

describe('Agentic Sandbox MCP toolset', () => {
  let root: string;
  let tokenFile: string;
  let calls: Array<{ url: string; init: RequestInit }>;
  let response: { status: number; body: unknown };
  let client: any;
  let tools: Map<string, any>;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'aiwg-sandbox-mcp-'));
    tokenFile = join(root, 'management.token');
    await writeFile(tokenFile, 'management-bearer-canary\n', { mode: 0o600 });
    await chmod(tokenFile, 0o600);
    calls = [];
    response = { status: 200, body: inventory };
    const fetch = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(response.body), { status: response.status, headers: { 'content-type': 'application/json' } });
    });
    client = new AgenticSandboxMcpClient({ env: { AIWG_SANDBOX_MANAGEMENT_URL: 'https://sandbox.example', AIWG_SANDBOX_MANAGEMENT_TOKEN_FILE: tokenFile, AIWG_SANDBOX_EXECUTOR_TOKEN_FILE: join(root, 'executor.token') }, fetch });
    tools = new Map();
    registerAgenticSandboxToolset({ registerTool: (name: string, config: any, handler: any) => tools.set(name, { config, handler }) }, { client });
  });

  afterEach(async () => rm(root, { recursive: true, force: true }));

  it('registers a stable nine-tool packaged inventory', () => {
    expect([...tools.keys()]).toEqual(AGENTIC_SANDBOX_TOOL_NAMES);
    expect(AGENTIC_SANDBOX_TOOL_NAMES).toHaveLength(9);
  });

  it('reads fleet inventory with only the management bearer domain', async () => {
    const result = await tools.get('sandbox-fleet-list').handler({ contract_version: 'agentic-orchestration/v1' });
    expect(body(result)).toMatchObject({ supported: true, ok: true, data: { inventory_revision: 7 } });
    expect(calls[0].url).toBe('https://sandbox.example/api/v2/fleet/workloads');
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get('authorization')).toBe('Bearer management-bearer-canary');
    expect(JSON.stringify(result)).not.toContain('management-bearer-canary');
    expect(JSON.stringify(result)).not.toContain('executor.token');
  });

  it.each([404, 405])('returns typed capability absence for HTTP %s', async (status) => {
    response = { status, body: { error: 'missing' } };
    expect(body(await tools.get('sandbox-fleet-list').handler({}))).toEqual({ supported: false, reason: 'capability_absent', status });
  });

  it.each([[401, 'unauthorized'], [403, 'forbidden'], [409, 'fleet.stale_revision'], [422, 'fleet.idempotency_collision'], [503, 'fleet.store_unavailable']])('preserves HTTP %s and error code', async (status, error) => {
    response = { status: status as number, body: { error } };
    const result = await tools.get('sandbox-fleet-list').handler({});
    expect(result.isError).toBe(true);
    expect(body(result)).toMatchObject({ supported: true, ok: false, status, error_code: error });
  });

  it('fails closed on malformed and secret-bearing successful responses', async () => {
    response = { status: 200, body: { ...inventory, inventory_revision: 'seven' } };
    expect(body(await tools.get('sandbox-fleet-list').handler({})).error).toMatch(/invalid fleet inventory/);
    response = { status: 200, body: { ...inventory, records: [{ ...workload(), authorization_token: 'response-secret-canary' }] } };
    const restricted = await tools.get('sandbox-fleet-list').handler({});
    expect(restricted.isError).toBe(true);
    expect(JSON.stringify(restricted)).not.toContain('response-secret-canary');
    expect(body(restricted).error).toMatch(/restricted/);
  });

  it('computes reconciliation preview with GET and no state change', async () => {
    const result = await tools.get('sandbox-fleet-reconcile-preview').handler({ before_revision: 6, child_ids: ['child-1', 'missing'] });
    expect(body(result).data).toMatchObject({ stale: true, inventory_revision: 7, rows: [{ child_id: 'child-1', present: true }, { child_id: 'missing', present: false }] });
    expect(calls[0].init.method).toBe('GET');
  });

  it.each(['sandbox-fleet-admit', 'sandbox-fleet-observe', 'sandbox-fleet-reconcile', 'sandbox-activity-export'])('%s requires explicit confirmation before any request', async (name) => {
    const result = await tools.get(name).handler({ confirmed: false });
    expect(result.isError).toBe(true);
    expect(body(result)).toMatchObject({ requires_confirmation: true });
    expect(calls).toHaveLength(0);
  });

  it('validates outbound mutations and never forwards credential-shaped fields', async () => {
    const result = await tools.get('sandbox-fleet-admit').handler({ confirmed: true, workload: { ...workload(0), credential_material: 'request-secret-canary' } });
    expect(result.isError).toBe(true);
    expect(calls).toHaveLength(0);
    expect(JSON.stringify(result)).not.toContain('request-secret-canary');
  });

  it('forwards exact activity scope, bounded filters, and validates timeline correlation', async () => {
    response = { status: 200, body: { schema_version: 'activity.event/v1', coverage: [], completeness, events: [event], additive_optional: true } };
    const result = await tools.get('sandbox-activity-timeline').handler({ ...scope, filter: { limit: 100, trace_id: 'a'.repeat(32) } });
    expect(body(result)).toMatchObject({ supported: true, ok: true });
    expect(calls[0].url).toContain('/api/v2/activity/timeline?');
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get('x-agentic-tenant-id')).toBe(scope.tenant_id);
    expect(headers.get('x-agentic-agent-id')).toBe(scope.agent_id);
    expect(tools.get('sandbox-activity-timeline').config.inputSchema.filter.safeParse({ limit: 1001 }).success).toBe(false);
    expect(tools.get('sandbox-activity-timeline').config.inputSchema.filter.safeParse({ unsupported: 'x' }).success).toBe(false);
  });

  it('rejects cross-scope events and malformed signed export integrity', async () => {
    response = { status: 200, body: { schema_version: 'activity.event/v1', coverage: [], completeness, events: [{ ...event, correlation: { ...scope, agent_id: 'other' } }] } };
    expect(body(await tools.get('sandbox-activity-timeline').handler(scope)).error).toMatch(/scope mismatch/);
    response = { status: 200, body: { events: [], manifest: { tenant_id: scope.tenant_id, event_count: 0, merkle_root: 'bad', key_id: 'key', signature: 'sig' } } };
    expect(body(await tools.get('sandbox-activity-export').handler({ ...scope, confirmed: true })).error).toMatch(/manifest/);
  });
});
