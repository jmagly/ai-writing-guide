import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { manageOmpMcp, ompServerConfig } from '../../../src/mcp/omp-config.mjs';
import { getProviderConfigPath } from '../../../src/mcp/registry.mjs';

describe('OMP native MCP ownership', () => {
  it('preserves unknown metadata and operator entries through injection, update and removal', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'omp-mcp-'));
    const file = join(dir, 'mcp.json');
    try {
      const operator = { command: 'operator', future: true };
      await writeFile(file, JSON.stringify({ future: { enabled: true }, mcpServers: { operator } }));
      const server = { name: 'managed', command: 'node', args: ['server.mjs'], cwd: '${ROOT}', env: { TOKEN: '${TOKEN}' }, enabled: false, timeout: 123, requestIdFormat: 'string' };
      const original = await readFile(file, 'utf8');
      await manageOmpMcp(file, [server], { dryRun: true });
      expect(await readFile(file, 'utf8')).toBe(original);
      await manageOmpMcp(file, [server]);
      await manageOmpMcp(file, [{ ...server, enabled: true }]);
      let data = JSON.parse(await readFile(file, 'utf8'));
      expect(data.mcpServers.managed).toMatchObject({ enabled: true, cwd: '${ROOT}', env: { TOKEN: '${TOKEN}' }, timeout: 123, requestIdFormat: 'string' });
      expect(await readFile(file + '.aiwg-ownership.json', 'utf8')).not.toContain('TOKEN');
      await expect(manageOmpMcp(file, [{ name: 'operator', command: 'overwrite' }])).rejects.toThrow('operator-owned');
      expect(await manageOmpMcp(file, [], { remove: ['managed'] })).toMatchObject({ removed: ['managed'] });
      data = JSON.parse(await readFile(file, 'utf8'));
      expect(data).toEqual({ future: { enabled: true }, mcpServers: { operator } });
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it('refuses operator edits and malformed input without writing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'omp-mcp-'));
    const file = join(dir, 'mcp.json');
    try {
      await manageOmpMcp(file, [{ name: 'owned', command: 'node' }]);
      await writeFile(file, JSON.stringify({ mcpServers: { owned: { command: 'operator-edit' } } }));
      const original = await readFile(file, 'utf8');
      await expect(manageOmpMcp(file, [], { remove: ['owned'] })).rejects.toThrow('modified');
      expect(await readFile(file, 'utf8')).toBe(original);
      await writeFile(file, '{malformed');
      await expect(manageOmpMcp(file, [{ name: 'new', command: 'node' }])).rejects.toThrow();
      expect(await readFile(file, 'utf8')).toBe('{malformed');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it('retains remote options and unresolved header references', () => {
    expect(ompServerConfig({ name: 'remote', type: 'http', url: 'http://127.0.0.1/mcp', headerEnv: { Authorization: 'MCP_TOKEN' }, oauth: { clientId: '${CLIENT}' } })).toEqual({ type: 'http', url: 'http://127.0.0.1/mcp', headers: { Authorization: '${MCP_TOKEN}' }, oauth: { clientId: '${CLIENT}' } });
    expect(ompServerConfig({ name: 'inherited', enabled: false })).toEqual({ enabled: false });
    expect(getProviderConfigPath('oh-my-pi', '/workspace')).toBe('/workspace/.omp/mcp.json');
    expect(() => getProviderConfigPath('oh-my-pi', '/workspace', { scope: 'invalid' })).toThrow('scope');
  });
  it.each([{ timeout: -1 }, { enabled: 'false' }, { requestIdFormat: 'uuid' }, { args: 'arg' }, { type: 'unknown' }, { env: { KEY: 1 } }])('rejects malformed options %j', options => {
    expect(() => ompServerConfig({ name: 'bad', command: 'node', ...options })).toThrow('Invalid');
  });
});

describe('OMP MCP review regressions', () => {
  it('rejects SDK-only policies that native mcp.json would silently ignore', () => {
    for (const options of [{ envPolicy: 'literal' }, { envLiteralKeys: ['VALUE'] }, { headerPolicy: 'origin-locked' }]) {
      expect(() => ompServerConfig({ name: 'native', command: 'node', ...options })).toThrow('native mcp.json does not enforce');
    }
    expect(ompServerConfig({ name: 'http', type: 'http', url: 'https://example.test/mcp', auth: { type: 'oauth', credentialId: 'reference' }, oauth: { clientId: '${CLIENT}', scope: 'tools', callbackPort: 0 } })).toMatchObject({ auth: { type: 'oauth', credentialId: 'reference' }, oauth: { scope: 'tools', callbackPort: 0 } });
    expect(() => ompServerConfig({ name: 'bad', command: 'node', oauth: { callbackPort: -1 } })).toThrow('callbackPort');
  });
  it('never reflects malformed configuration contents and cleans its writer lock', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'omp-invalid-json-')); const file = join(dir, 'mcp.json');
    try {
      await writeFile(file, '{"SECRET_FIXTURE": broken}');
      await expect(manageOmpMcp(file, [{ name: 'x', command: 'node' }])).rejects.toThrow('invalid JSON');
      try { await manageOmpMcp(file, []); } catch (error) { expect(String(error)).not.toContain('SECRET_FIXTURE'); }
      await expect(readFile(file + '.aiwg-lock')).rejects.toMatchObject({ code: 'ENOENT' });
      expect(await readFile(file, 'utf8')).toBe('{"SECRET_FIXTURE": broken}');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it('refuses an active writer lock without changing operator configuration', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'omp-lock-')); const file = join(dir, 'mcp.json');
    try {
      await writeFile(file, '{"operator":true}'); await writeFile(file + '.aiwg-lock', 'active');
      await expect(manageOmpMcp(file, [{ name: 'x', command: 'node' }])).rejects.toThrow('locked');
      expect(await readFile(file, 'utf8')).toBe('{"operator":true}');
      expect(await readFile(file + '.aiwg-lock', 'utf8')).toBe('active');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
