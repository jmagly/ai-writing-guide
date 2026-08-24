import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateUhpConfig, validateUhpEndpoint } from '../../../src/uhp/config.js';
import { UhpClient } from '../../../src/uhp/client.js';
import { UHP_VERSION, type UhpEndpointProfile } from '../../../src/uhp/types.js';

const dirs: string[] = [];
const profile: UhpEndpointProfile = { endpoint: 'https://uhp.example', version: UHP_VERSION, credential: { source: 'env', name: 'UHP_TOKEN' }, experimental: true };
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });

describe('UHP configuration security', () => {
  it('accepts only secret-by-reference credential profiles', () => {
    expect(validateUhpConfig({ enabled: true, profiles: { prod: profile } })).toEqual([]);
    expect(validateUhpConfig({ enabled: true, profiles: { prod: { ...profile, token: 'secret' } } })).toContain('uhp.profiles.prod.token: inline credentials are forbidden');
  });

  it.each([
    ['http://example.com', 'requires TLS'], ['https://user:pass@example.com', 'inline credentials'],
    ['file:///etc/passwd', 'must use HTTPS'], ['https://127.0.0.1', 'private network'],
    ['https://10.0.0.1', 'private network'], ['https://[fd00::1]', 'private network'],
  ])('rejects unsafe endpoint %s', (endpoint, message) => {
    expect(() => validateUhpEndpoint(endpoint, profile)).toThrow(message);
  });

  it('allows explicit plaintext loopback development only', () => {
    expect(validateUhpEndpoint('http://127.0.0.1:8787', { trust: { allowInsecureLoopback: true } }).origin).toBe('http://127.0.0.1:8787');
  });
});

describe('hostile UHP artifacts', () => {
  it.each(['../escape.txt', '..%2fescape.txt', '%252e%252e%252fescape.txt', '..\\escape.txt', '/absolute.txt'])('contains hostile filename %s in the approved directory', async (hostile) => {
    const dir = await mkdtemp(join(tmpdir(), 'uhp-artifact-')); dirs.push(dir);
    const client = new UhpClient('test', profile, async () => new Response('safe', { headers: { 'UHP-Version': UHP_VERSION, 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' } }), async () => 'secret');
    const receipt = await client.downloadArtifact('cntr_fixture', 'file_fixture', dir, hostile);
    expect(receipt.path.startsWith(`${dir}/`)).toBe(true);
    expect(await readFile(receipt.path, 'utf8')).toBe('safe');
  });

  it('refuses artifact bytes without nosniff', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'uhp-artifact-')); dirs.push(dir);
    const client = new UhpClient('test', profile, async () => new Response('<html>', { headers: { 'UHP-Version': UHP_VERSION, 'Content-Type': 'text/html' } }), async () => 'secret');
    await expect(client.downloadArtifact('cntr_fixture', 'file_fixture', dir, 'x.html')).rejects.toMatchObject({ code: 'artifact_missing_nosniff' });
  });
});

