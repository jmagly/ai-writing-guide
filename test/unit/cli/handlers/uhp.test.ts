import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyConfig, writeAiwgConfig } from '../../../../src/config/aiwg-config.js';
import { allHandlers } from '../../../../src/cli/handlers/index.js';
import { uhpHandler } from '../../../../src/cli/handlers/uhp.js';
import { UHP_VERSION } from '../../../../src/uhp/types.js';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

const dirs: string[] = [];
const originalToken = process.env.AIWG_UHP_TEST_TOKEN;

afterEach(async () => {
  vi.unstubAllGlobals();
  if (originalToken === undefined) delete process.env.AIWG_UHP_TEST_TOKEN;
  else process.env.AIWG_UHP_TEST_TOKEN = originalToken;
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

function context(cwd: string, args: string[]): HandlerContext {
  return { cwd, args, rawArgs: ['uhp', ...args], frameworkRoot: cwd };
}

async function workspace(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), 'aiwg-uhp-cli-')); dirs.push(cwd);
  const config = emptyConfig();
  config.uhp = {
    enabled: true,
    profiles: {
      local: {
        endpoint: 'http://127.0.0.1:8787', version: UHP_VERSION,
        credential: { source: 'env', name: 'AIWG_UHP_TEST_TOKEN' },
        experimental: true, trust: { allowInsecureLoopback: true },
      },
    },
  };
  await writeAiwgConfig(cwd, config);
  return cwd;
}

describe('uhp CLI handler', () => {
  it('is registered for packaged command routing and never advertises a bearer argument', () => {
    expect(allHandlers).toContain(uhpHandler);
    expect(uhpHandler.id).toBe('uhp');
  });

  it('requires explicit profile routing', async () => {
    const result = await uhpHandler.execute(context(process.cwd(), ['discover']));
    expect(result).toMatchObject({ exitCode: 2 });
    expect(result.message).toContain('--profile');
  });

  it('performs unauthenticated discovery and authenticated smoke execution', async () => {
    const cwd = await workspace();
    process.env.AIWG_UHP_TEST_TOKEN = 'cli-secret';
    const calls: Headers[] = [];
    vi.stubGlobal('fetch', async (_input: unknown, init?: RequestInit) => {
      const headers = new Headers(init?.headers); calls.push(headers);
      const body = init?.method === 'POST'
        ? { id: 'resp_cli', object: 'response', created_at: 1787600000, status: 'completed', model: 'fixture', output: [], metadata: { harness_id: 'chrn_cli', session_id: 'hsesscli' }, usage: null }
        : { object: 'uhp.discovery', protocol: 'uhp', versions: [UHP_VERSION], default_version: UHP_VERSION, conformance_class: 'core', capabilities: { streaming: true, sessions: true, cancellation: true, idempotency: true } };
      return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'UHP-Version': UHP_VERSION } });
    });
    const discovery = await uhpHandler.execute(context(cwd, ['discover', '--profile', 'local']));
    const run = await uhpHandler.execute(context(cwd, ['run', '--profile', 'local', '--input', 'smoke']));
    expect(discovery.exitCode).toBe(0);
    expect(run.exitCode).toBe(0);
    expect(calls[0]!.get('Authorization')).toBeNull();
    expect(calls[1]!.get('Authorization')).toBe('Bearer cli-secret');
    expect(run.message).not.toContain('cli-secret');
    expect(JSON.parse(run.message).mission).toMatchObject({ apiVersion: 'mission.aiwg.io/v1', metadata: { id: 'resp_cli' }, provenance: { transport: 'uhp' } });
  });
});
