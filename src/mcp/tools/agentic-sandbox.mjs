/**
 * Governed Agentic Sandbox fleet and activity MCP surface.
 *
 * Credentials are file-backed server configuration, never tool arguments.
 * Every tool in this module uses the management bearer domain; executor-plane
 * credentials are deliberately out of scope and cannot be substituted.
 *
 * @implements #2015
 */

import { readFile, stat } from 'node:fs/promises';
import { z } from 'zod';
import { mcpError, mcpJson } from '../helpers.mjs';

const FLEET_VERSION = 'agentic-orchestration/v1';
const ACTIVITY_VERSION = 'activity.event/v1';
const SCOPE_HEADERS = {
  tenant_id: 'x-agentic-tenant-id',
  host_id: 'x-agentic-host-id',
  instance_id: 'x-agentic-instance-id',
  agent_id: 'x-agentic-agent-id',
};
const RESTRICTED_KEY = /(?:^|_)(?:content|terminal|prompt|environment|env|credential|secret|password|authorization|bearer|token|private_key|certificate|restricted_(?:url|uri|link))(?:$|_)/i;

function configuredBaseUrl(env = process.env) {
  const raw = String(env.AIWG_SANDBOX_MANAGEMENT_URL ?? '').trim();
  if (!raw) throw new Error('AIWG_SANDBOX_MANAGEMENT_URL is required for the sandbox toolset');
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('AIWG_SANDBOX_MANAGEMENT_URL must be an HTTP(S) origin without credentials, query, or fragment');
  }
  if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error('AIWG_SANDBOX_MANAGEMENT_URL requires HTTPS outside loopback');
  }
  return url.toString().replace(/\/$/, '');
}

async function managementBearer(env = process.env) {
  const tokenFile = String(env.AIWG_SANDBOX_MANAGEMENT_TOKEN_FILE ?? '').trim();
  if (!tokenFile) throw new Error('AIWG_SANDBOX_MANAGEMENT_TOKEN_FILE is required for the sandbox toolset');
  const metadata = await stat(tokenFile);
  if (!metadata.isFile()) throw new Error('sandbox management token path is not a regular file');
  if (process.platform !== 'win32' && (metadata.mode & 0o077) !== 0) {
    throw new Error('sandbox management token file must not be accessible by group or other users');
  }
  const token = String(await readFile(tokenFile, 'utf8')).trim();
  if (!token || /[\r\n]/.test(token)) throw new Error('sandbox management token file must contain one non-empty bearer token');
  return token;
}

function containsRestricted(value) {
  if (Array.isArray(value)) return value.some(containsRestricted);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => RESTRICTED_KEY.test(key) || containsRestricted(child));
}

function requireSafePayload(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  if (containsRestricted(value)) throw new Error(`${label} contains credential or restricted-content fields`);
  return value;
}

function safeResponse(value) {
  if (containsRestricted(value)) throw Object.assign(new Error('sandbox response contained prohibited credential or restricted-content fields'), { code: 'sandbox_restricted_response' });
  return value;
}

function requireFleetRecord(record) {
  requireSafePayload(record, 'fleet workload');
  if (record.document_type !== 'workload' || record.api_version !== FLEET_VERSION) throw new Error(`fleet workload must use ${FLEET_VERSION}`);
  if (!record.lineage || typeof record.lineage.child_id !== 'string' || !record.lineage.child_id) throw new Error('fleet workload requires lineage.child_id');
  if (!record.status || !Number.isInteger(record.status.revision) || record.status.revision < 0) throw new Error('fleet workload requires a non-negative status.revision');
  return record;
}

function requireInventory(value) {
  safeResponse(value);
  if (value?.document_type !== 'inventory' || value?.api_version !== FLEET_VERSION || !Number.isInteger(value?.inventory_revision) || !Array.isArray(value?.records)) {
    throw new Error('invalid fleet inventory envelope');
  }
  value.records.forEach(requireFleetRecord);
  return value;
}

function requireReconciliation(value) {
  safeResponse(value);
  if (value?.document_type !== 'reconciliation' || value?.api_version !== FLEET_VERSION || !Number.isInteger(value?.before_revision) || !Number.isInteger(value?.after_revision) || !Array.isArray(value?.rows)) {
    throw new Error('invalid fleet reconciliation envelope');
  }
  return value;
}

function requireActivityEnvelope(value, scope, { eventsRequired = false, exportEnvelope = false } = {}) {
  safeResponse(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid activity envelope');
  if (!exportEnvelope && value.schema_version !== ACTIVITY_VERSION) throw new Error(`activity envelope must use ${ACTIVITY_VERSION}`);
  if (!exportEnvelope && (!Array.isArray(value.coverage) || typeof value.completeness?.complete !== 'boolean')) throw new Error('activity envelope requires coverage and completeness');
  if (eventsRequired && !Array.isArray(value.events)) throw new Error('activity timeline requires events');
  for (const event of value.events ?? []) {
    if (
      event?.schema_version !== ACTIVITY_VERSION
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event?.event_id ?? '')
      || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(event?.event_name ?? '')
      || !['session', 'action', 'network', 'runtime', 'system', 'integrity'].includes(event?.plane)
      || Number.isNaN(Date.parse(event?.occurred_at ?? ''))
      || Number.isNaN(Date.parse(event?.observed_at ?? ''))
      || !event?.source || typeof event.source.collector !== 'string' || !event.source.collector
      || !['guest', 'runtime', 'host', 'control-plane', 'provider'].includes(event.source.layer)
      || !['qemu-kvm', 'cloud-hypervisor', 'docker', 'host', 'unknown'].includes(event.source.runtime)
      || !['observed', 'attested', 'self-reported', 'derived'].includes(event.source.trust)
      || event?.sensitivity !== 'metadata'
      || !['standard', 'security', 'forensic-hold', 'ephemeral'].includes(event?.retention_class)
      || !event?.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)
      || !Number.isInteger(event?.integrity?.collector_sequence) || event.integrity.collector_sequence < 1
    ) throw new Error('activity event violates schema or sensitivity policy');
    for (const [key, expected] of Object.entries(scope)) if (event?.correlation?.[key] !== expected) throw new Error(`activity event ${key} scope mismatch`);
  }
  if (exportEnvelope) {
    const manifest = value.manifest;
    if (!manifest || manifest.tenant_id !== scope.tenant_id || !Number.isInteger(manifest.event_count) || manifest.event_count < 0 || !/^[0-9a-f]{64}$/.test(manifest.merkle_root ?? '') || typeof manifest.key_id !== 'string' || !manifest.key_id || typeof manifest.signature !== 'string' || !manifest.signature) {
      throw new Error('activity export manifest is malformed or out of scope');
    }
  }
  return value;
}

function typedResult(body, status, validate) {
  if (status === 404 || status === 405) return mcpJson({ supported: false, reason: 'capability_absent', status });
  if (status < 200 || status >= 300) {
    const safe = safeResponse(body);
    return {
      ...mcpJson({ supported: true, ok: false, status, error_code: safe?.error ?? safe?.code ?? `http_${status}`, details: safe }),
      isError: true,
    };
  }
  return mcpJson({ supported: true, ok: true, status, data: validate(body) });
}

export class AgenticSandboxMcpClient {
  constructor({ env = process.env, fetch = globalThis.fetch.bind(globalThis) } = {}) {
    this.env = env;
    this.fetch = fetch;
  }

  async request(path, { method = 'GET', body, headers = {}, validate = (value) => safeResponse(value) } = {}) {
    const baseUrl = configuredBaseUrl(this.env);
    const token = await managementBearer(this.env);
    const response = await this.fetch(`${baseUrl}${path}`, {
      method,
      headers: { accept: 'application/json', authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let parsed;
    try {
      parsed = await response.json();
    } catch {
      if (response.status === 404 || response.status === 405) parsed = {};
      else return mcpError(`sandbox returned non-JSON HTTP ${response.status}`);
    }
    try {
      return typedResult(parsed, response.status, validate);
    } catch (error) {
      return mcpError(`${error.code ?? 'sandbox_malformed_response'}: ${error.message}`);
    }
  }
}

const scopeSchema = {
  tenant_id: z.string().min(1).max(255).regex(/^[^\r\n]+$/),
  host_id: z.string().min(1).max(255).regex(/^[^\r\n]+$/),
  instance_id: z.string().min(1).max(255).regex(/^[^\r\n]+$/),
  agent_id: z.string().min(1).max(255).regex(/^[^\r\n]+$/),
};
const activityFilterSchema = z.object({
  event_name: z.string().min(1).max(255).optional(), collector: z.string().min(1).max(255).optional(),
  trust: z.string().min(1).max(255).optional(), plane: z.string().min(1).max(255).optional(),
  outcome: z.string().min(1).max(255).optional(), session_id: z.string().min(1).max(255).optional(),
  mission_id: z.string().min(1).max(255).optional(), task_id: z.string().min(1).max(255).optional(),
  tool_call_id: z.string().min(1).max(255).optional(), command_id: z.string().min(1).max(255).optional(),
  process_id: z.string().min(1).max(255).optional(), trace_id: z.string().regex(/^[0-9a-f]{32}$/).optional(),
  since: z.string().datetime().optional(), until: z.string().datetime().optional(), limit: z.number().int().min(1).max(1000).optional(),
}).strict().optional();

function scopeHeaders(args) {
  return Object.fromEntries(Object.entries(SCOPE_HEADERS).map(([key, header]) => [header, args[key]]));
}

function activityQuery(filter = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) query.set(key, String(value));
  return query.size ? `?${query}` : '';
}

function confirmationError(name) {
  return mcpError(`${name} requires confirmed=true`, { requiresConfirmation: true, remediation: 'Review the exact scope and payload, then re-invoke with confirmed=true.' });
}

export function registerAgenticSandboxToolset(server, { client = new AgenticSandboxMcpClient() } = {}) {
  const register = (name, config, handler) => server.registerTool(name, config, async (args) => {
    try { return await handler(args); } catch (error) { return mcpError(`${name}: ${error.message}`); }
  });

  register('sandbox-fleet-list', { title: 'List Agentic Sandbox fleet workloads', description: 'Read revisioned v2026.8.3+ fleet inventory using the management credential domain.', inputSchema: { contract_version: z.literal(FLEET_VERSION).default(FLEET_VERSION) }, annotations: { readOnlyHint: true, destructiveHint: false } },
    () => client.request('/api/v2/fleet/workloads', { validate: requireInventory }));
  register('sandbox-fleet-get', { title: 'Get Agentic Sandbox fleet workload', description: 'Read one revisioned fleet workload by child identity.', inputSchema: { contract_version: z.literal(FLEET_VERSION).default(FLEET_VERSION), child_id: z.string().min(1).max(255) }, annotations: { readOnlyHint: true, destructiveHint: false } },
    ({ child_id }) => client.request(`/api/v2/fleet/workloads/${encodeURIComponent(child_id)}`, { validate: requireFleetRecord }));
  register('sandbox-fleet-reconcile-preview', { title: 'Preview fleet reconciliation', description: 'Compute a read-only reconciliation preview from inventory; never calls POST /reconcile.', inputSchema: { contract_version: z.literal(FLEET_VERSION).default(FLEET_VERSION), before_revision: z.number().int().min(0), child_ids: z.array(z.string().min(1).max(255)).max(1000) }, annotations: { readOnlyHint: true, destructiveHint: false } },
    async ({ before_revision, child_ids }) => client.request('/api/v2/fleet/workloads', { validate: (value) => {
      const inventory = requireInventory(value);
      const byId = new Map(inventory.records.map((record) => [record.lineage.child_id, record]));
      return { document_type: 'reconciliation-preview', api_version: FLEET_VERSION, before_revision, inventory_revision: inventory.inventory_revision, stale: before_revision !== inventory.inventory_revision, rows: child_ids.map((child_id) => ({ child_id, present: byId.has(child_id), observed_state: byId.get(child_id)?.status?.observed_state ?? 'unknown', revision: byId.get(child_id)?.status?.revision ?? null })) };
    } }));
  register('sandbox-fleet-admit', { title: 'Admit Agentic Sandbox fleet workload', description: 'Mutating fleet admission; requires an exact v1 workload and confirmed=true.', inputSchema: { contract_version: z.literal(FLEET_VERSION).default(FLEET_VERSION), workload: z.record(z.unknown()), confirmed: z.boolean().default(false) }, annotations: { readOnlyHint: false, destructiveHint: true } },
    ({ workload, confirmed }) => confirmed ? client.request('/api/v2/fleet/workloads', { method: 'POST', body: requireFleetRecord(workload), validate: (value) => ({ replayed: value?.replayed === true, workload: requireFleetRecord(value?.workload) }) }) : confirmationError('sandbox-fleet-admit'));
  register('sandbox-fleet-observe', { title: 'Record fleet workload observation', description: 'Mutating monotonic observation update; requires confirmed=true and expected revision.', inputSchema: { contract_version: z.literal(FLEET_VERSION).default(FLEET_VERSION), child_id: z.string().min(1).max(255), expected_revision: z.number().int().min(0), status: z.record(z.unknown()), runtime_identity: z.object({ session_id: z.string().optional(), task_id: z.string().optional(), command_id: z.string().optional() }).strict().optional(), confirmed: z.boolean().default(false) }, annotations: { readOnlyHint: false, destructiveHint: true } },
    ({ child_id, expected_revision, status, runtime_identity, confirmed }) => confirmed ? client.request(`/api/v2/fleet/workloads/${encodeURIComponent(child_id)}/observations`, { method: 'POST', body: requireSafePayload({ expected_revision, status, ...(runtime_identity ? { runtime_identity } : {}) }, 'fleet observation'), validate: requireFleetRecord }) : confirmationError('sandbox-fleet-observe'));
  register('sandbox-fleet-reconcile', { title: 'Reconcile fleet workloads', description: 'Mutating restart reconciliation; requires confirmed=true.', inputSchema: { contract_version: z.literal(FLEET_VERSION).default(FLEET_VERSION), before_revision: z.number().int().min(0), child_ids: z.array(z.string().min(1).max(255)).max(1000), confirmed: z.boolean().default(false) }, annotations: { readOnlyHint: false, destructiveHint: true } },
    ({ before_revision, child_ids, confirmed }) => confirmed ? client.request('/api/v2/fleet/reconcile', { method: 'POST', body: { before_revision, child_ids }, validate: requireReconciliation }) : confirmationError('sandbox-fleet-reconcile'));

  for (const [kind, eventsRequired] of [['coverage', false], ['timeline', true]]) {
    register(`sandbox-activity-${kind}`, { title: `${kind === 'coverage' ? 'Inspect coverage for' : 'Read timeline from'} Agentic Sandbox activity`, description: `Read governed, exactly scoped activity ${kind}; preserves capability and authorization status.`, inputSchema: { contract_version: z.literal(ACTIVITY_VERSION).default(ACTIVITY_VERSION), ...scopeSchema, filter: activityFilterSchema }, annotations: { readOnlyHint: true, destructiveHint: false } },
      (args) => { const scope = Object.fromEntries(Object.keys(SCOPE_HEADERS).map((key) => [key, args[key]])); return client.request(`/api/v2/activity/${kind}${activityQuery(args.filter)}`, { headers: scopeHeaders(args), validate: (value) => requireActivityEnvelope(value, scope, { eventsRequired }) }); });
  }
  register('sandbox-activity-export', { title: 'Export signed Agentic Sandbox activity evidence', description: 'Evidence export requires confirmed=true even though it does not mutate server state.', inputSchema: { contract_version: z.literal(ACTIVITY_VERSION).default(ACTIVITY_VERSION), ...scopeSchema, filter: activityFilterSchema, confirmed: z.boolean().default(false) }, annotations: { readOnlyHint: false, destructiveHint: true } },
    (args) => { if (!args.confirmed) return confirmationError('sandbox-activity-export'); const scope = Object.fromEntries(Object.keys(SCOPE_HEADERS).map((key) => [key, args[key]])); return client.request('/api/v2/activity/export', { method: 'POST', headers: scopeHeaders(args), body: args.filter ?? {}, validate: (value) => requireActivityEnvelope(value, scope, { eventsRequired: true, exportEnvelope: true }) }); });
}

export const AGENTIC_SANDBOX_TOOL_NAMES = [
  'sandbox-fleet-list', 'sandbox-fleet-get', 'sandbox-fleet-reconcile-preview',
  'sandbox-fleet-admit', 'sandbox-fleet-observe', 'sandbox-fleet-reconcile',
  'sandbox-activity-coverage', 'sandbox-activity-timeline', 'sandbox-activity-export',
];
