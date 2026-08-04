import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// @ts-expect-error — source module is intentionally ESM JavaScript
import { AgenticSandboxMcpClient, registerAgenticSandboxToolset } from '../../src/mcp/tools/agentic-sandbox.mjs';

const inventory = {
  document_type: 'inventory', api_version: 'agentic-orchestration/v1', inventory_revision: 3,
  records: [{ document_type: 'workload', api_version: 'agentic-orchestration/v1', kind: 'one-shot-command', lineage: { child_id: 'child-live' }, status: { observed_state: 'running', revision: 2 } }],
};

describe('Agentic Sandbox MCP HTTP integration', () => {
  let root: string;
  let baseUrl: string;
  let server: ReturnType<typeof createServer>;
  let requests: Array<{ method?: string; url?: string; authorization?: string }>;
  let tools: Map<string, (args: any) => Promise<any>>;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'aiwg-sandbox-mcp-http-'));
    const tokenFile = join(root, 'management.token');
    await writeFile(tokenFile, 'integration-management-token\n', { mode: 0o600 });
    await chmod(tokenFile, 0o600);
    requests = [];
    server = createServer((request: IncomingMessage, response: ServerResponse) => {
      requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization });
      response.setHeader('content-type', 'application/json');
      if (request.headers.authorization !== 'Bearer integration-management-token') {
        response.statusCode = 401;
        response.end(JSON.stringify({ error: 'unauthorized' }));
        return;
      }
      if (request.method === 'GET' && request.url === '/api/v2/fleet/workloads') {
        response.end(JSON.stringify(inventory));
        return;
      }
      if (request.method === 'POST' && request.url === '/api/v2/fleet/reconcile') {
        response.statusCode = 409;
        response.end(JSON.stringify({ error: 'fleet.stale_revision' }));
        return;
      }
      response.statusCode = 404;
      response.end(JSON.stringify({ error: 'not_found' }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('HTTP integration server did not bind');
    baseUrl = `http://127.0.0.1:${address.port}`;
    const client = new AgenticSandboxMcpClient({ env: { AIWG_SANDBOX_MANAGEMENT_URL: baseUrl, AIWG_SANDBOX_MANAGEMENT_TOKEN_FILE: tokenFile } });
    tools = new Map();
    registerAgenticSandboxToolset({ registerTool: (name: string, _config: unknown, handler: any) => tools.set(name, handler) }, { client });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(root, { recursive: true, force: true });
  });

  it('performs authenticated inventory reads without exposing the bearer', async () => {
    const result = await tools.get('sandbox-fleet-list')!({});
    expect(JSON.parse(result.content[0].text)).toMatchObject({ supported: true, ok: true, data: { inventory_revision: 3 } });
    expect(requests.at(-1)).toMatchObject({ method: 'GET', url: '/api/v2/fleet/workloads', authorization: 'Bearer integration-management-token' });
    expect(JSON.stringify(result)).not.toContain('integration-management-token');
  });

  it('requires confirmation and then preserves reconciliation conflicts', async () => {
    const before = requests.length;
    expect((await tools.get('sandbox-fleet-reconcile')!({ before_revision: 2, child_ids: ['child-live'], confirmed: false })).isError).toBe(true);
    expect(requests).toHaveLength(before);
    const result = await tools.get('sandbox-fleet-reconcile')!({ before_revision: 2, child_ids: ['child-live'], confirmed: true });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toMatchObject({ status: 409, error_code: 'fleet.stale_revision' });
  });

  it('returns typed capability absence from a real 404 response', async () => {
    const result = await tools.get('sandbox-fleet-get')!({ child_id: 'missing' });
    expect(JSON.parse(result.content[0].text)).toEqual({ supported: false, reason: 'capability_absent', status: 404 });
  });
});
