import { access, chmod, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DshJsonRpcClient,
  DSH_MAX_FRAME_BYTES,
  DSH_MAX_OUTPUT_BYTES,
  DSH_UPSTREAM_REVISION,
  assertSupportedDshVersion,
  buildCredentialEnvironment,
  buildRoutePatch,
  createEphemeralRoutePatch,
  inspectDshVersion,
  runDshHeadless,
} from '../../../tools/providers/deepseek-harness-transport.mjs';

const fakeDsh = resolve('test/fixtures/providers/deepseek-harness/fake-dsh.mjs');

async function fixtureFiles() {
  const root = await mkdtemp(join(tmpdir(), 'aiwg-dsh-transport-'));
  const projectPatch = join(root, 'project.patch.yml');
  const routePatch = join(root, 'route.patch.yml');
  await Promise.all([
    writeFile(projectPatch, '- id: sandbox-policy\n  config:\n    mode: workspace-write\n'),
    writeFile(routePatch, buildRoutePatch({ route: 'openrouter', model: 'deepseek/deepseek-chat-v3.1' })),
    chmod(fakeDsh, 0o755),
  ]);
  return { root, projectPatch, routePatch };
}

describe('DeepSeek Harness transport safety', () => {
  it('emits references but never credential values', async () => {
    const patch = buildRoutePatch({ route: 'openrouter', model: 'deepseek/deepseek-chat-v3.1', credentialEnv: 'OPENROUTER_API_KEY' });
    expect(patch).toContain('apiKeyEnv: OPENROUTER_API_KEY');
    expect(patch).not.toContain('sk-test-value');
    const env = buildCredentialEnvironment({ credentialEnv: 'OPENROUTER_API_KEY', credentialValue: 'sk-test-value', dshHome: '/tmp/dsh-home', env: { PATH: '/bin', UNRELATED_SECRET: 'do-not-copy' } });
    expect(env.OPENROUTER_API_KEY).toBe('sk-test-value');
    expect(env.UNRELATED_SECRET).toBeUndefined();
    expect(env.DSH_PERMISSION_MODE).toBe('workspace-write');
    expect(env.DSH_TELEMETRY_DISABLED).toBe('1');
    const ephemeral = await createEphemeralRoutePatch({
      route: 'openrouter',
      model: 'deepseek/deepseek-chat-v3.1',
      credentialEnv: 'OPENROUTER_API_KEY',
    });
    expect((await stat(ephemeral.path)).mode & 0o777).toBe(0o600);
    expect(await readFile(ephemeral.path, 'utf8')).not.toContain('sk-test-value');
    await ephemeral.cleanup();
    await expect(access(ephemeral.path)).rejects.toThrow();
  });

  it('pins qualified versions and rejects YAML injection', () => {
    expect(assertSupportedDshVersion('dsh v0.1.3-alpha.1')).toBe('0.1.3-alpha.1');
    expect(() => assertSupportedDshVersion('0.2.0')).toThrow(/Unsupported/);
    expect(() => buildRoutePatch({ route: 'openrouter', model: 'x\n- insert:', credentialEnv: 'OPENROUTER_API_KEY' })).toThrow(/unsupported/);
  });

  it('drives keyless headless and SDK prompt lifecycles with strict settlement', async () => {
    const fixture = await fixtureFiles();
    await expect(inspectDshVersion({ binary: fakeDsh, cwd: fixture.root, dshHome: join(fixture.root, 'home') }))
      .resolves.toBe('0.1.3-alpha.1');
    const headless = await runDshHeadless({
      binary: fakeDsh,
      prompt: 'run fixture',
      cwd: fixture.root,
      dshHome: join(fixture.root, 'home'),
      projectPatch: fixture.projectPatch,
      routePatch: fixture.routePatch,
      route: 'openrouter',
      model: 'deepseek/deepseek-chat-v3.1',
    });
    expect(headless).toMatchObject({ code: 0, stdout: 'fake final\n', stderr: 'fake diagnostic\n' });
    expect(headless.provenance).toMatchObject({
      provider: 'deepseek-harness',
      version: '0.1.3-alpha.1',
      profile: 'headless',
      route: 'openrouter',
      model: 'deepseek/deepseek-chat-v3.1',
      upstreamRevision: DSH_UPSTREAM_REVISION,
    });
    expect(headless.provenance.profileHash).not.toBe(headless.provenance.projectPatchHash);

    const client = new DshJsonRpcClient({
      binary: fakeDsh,
      cwd: fixture.root,
      dshHome: join(fixture.root, 'home'),
      projectPatch: fixture.projectPatch,
      routePatch: fixture.routePatch,
      timeoutMs: 2_000,
    });
    await expect(client.initialize({ provider: 'openrouter', model: 'deepseek/deepseek-chat-v3.1' }))
      .resolves.toMatchObject({ serverInfo: { name: 'deepseek-harness-sdk-runtime' } });
    const notifications = [];
    const settled = await client.promptAndWait('root', [{ type: 'text', text: 'fixture' }], {
      onNotification: notification => notifications.push(notification),
    });
    expect(settled.messageId).toBe('message-1');
    expect(settled.events.map(event => event.type).filter(Boolean)).toEqual(expect.arrayContaining([
      'user/question', 'tool/call', 'tool/result', 'workflow/start', 'job/started',
      'assistant/message', 'turn/end',
    ]));
    expect(settled.events.find(event => event.type === 'tool/result')).toMatchObject({ redacted: true });
    expect(JSON.stringify(settled)).not.toContain('hidden');
    expect(notifications.some(notification => notification.method === 'subagent.finished')).toBe(true);
    await expect(client.shutdown()).resolves.toEqual({});
  });

  it('fails closed on cancellation and malformed or oversized frames', async () => {
    const fixture = await fixtureFiles();
    const client = new DshJsonRpcClient({
      binary: fakeDsh,
      cwd: fixture.root,
      dshHome: join(fixture.root, 'home'),
      projectPatch: fixture.projectPatch,
      routePatch: fixture.routePatch,
      timeoutMs: 100,
      version: '0.1.3-alpha.1',
    });
    const failures = [];
    client.abort = error => failures.push(error);
    client.onData(Buffer.from('{not-json}\r\n'));
    client.onData(Buffer.alloc(DSH_MAX_FRAME_BYTES + 1, 0x61));
    expect(failures.map(error => error.message)).toEqual([
      'Malformed DeepSeek Harness JSON-RPC frame',
      'DeepSeek Harness JSON-RPC frame limit exceeded',
    ]);

    const aggregateFailures = [];
    const aggregate = new DshJsonRpcClient({
      binary: fakeDsh, cwd: fixture.root, dshHome: join(fixture.root, 'home'),
      projectPatch: fixture.projectPatch, routePatch: fixture.routePatch,
      version: '0.1.3-alpha.1',
    });
    aggregate.abort = error => aggregateFailures.push(error);
    aggregate.outputBytes = DSH_MAX_OUTPUT_BYTES;
    aggregate.onData(Buffer.from('x'));
    expect(aggregateFailures[0]?.message).toMatch(/aggregate output limit/);

    const unicode = new DshJsonRpcClient({
      binary: fakeDsh, cwd: fixture.root, dshHome: join(fixture.root, 'home'),
      projectPatch: fixture.projectPatch, routePatch: fixture.routePatch,
      version: '0.1.3-alpha.1',
    });
    const unicodeFrame = { jsonrpc: '2.0', method: 'session.event', params: {
      sessionId: 'root', event: { type: 'assistant/message', seq: 1, time: 1,
        data: { message: { content: [{ type: 'text', text: 'left\u2028right' }] } } },
    } };
    unicode.onData(Buffer.from(`${JSON.stringify(unicodeFrame)}\r\n`));
    expect(unicode.notifications).toHaveLength(1);

    const unknownFailures = [];
    const unknown = new DshJsonRpcClient({
      binary: fakeDsh, cwd: fixture.root, dshHome: join(fixture.root, 'home'),
      projectPatch: fixture.projectPatch, routePatch: fixture.routePatch,
      version: '0.1.3-alpha.1',
    });
    unknown.abort = error => unknownFailures.push(error);
    unknown.onData(Buffer.from('{"jsonrpc":"2.0","method":"future.event","params":{}}\n'));
    expect(unknownFailures[0]?.message).toMatch(/Unsupported.*notification/);

    const aborted = new AbortController();
    aborted.abort();
    const live = new DshJsonRpcClient({
      binary: fakeDsh,
      cwd: fixture.root,
      dshHome: join(fixture.root, 'home'),
      projectPatch: fixture.projectPatch,
      routePatch: fixture.routePatch,
      timeoutMs: 100,
      version: '0.1.3-alpha.1',
    });
    await expect(live.request('initialize', {}, { signal: aborted.signal }))
      .rejects.toThrow(/cancelled/);

    const timed = new DshJsonRpcClient({
      binary: fakeDsh,
      cwd: fixture.root,
      dshHome: join(fixture.root, 'home'),
      projectPatch: fixture.projectPatch,
      routePatch: fixture.routePatch,
      timeoutMs: 100,
      version: '0.1.3-alpha.1',
    });
    await timed.initialize({ provider: 'openrouter', model: 'deepseek/deepseek-chat-v3.1' });
    await expect(timed.promptAndWait('root', [{ type: 'text', text: 'hang' }]))
      .rejects.toThrow(/timed out/);
  });

  it('waits for forced teardown when a headless child ignores SIGTERM', async () => {
    const fixture = await fixtureFiles();
    const started = Date.now();
    await expect(runDshHeadless({
      binary: fakeDsh,
      prompt: 'hang-headless',
      cwd: fixture.root,
      dshHome: join(fixture.root, 'home'),
      projectPatch: fixture.projectPatch,
      routePatch: fixture.routePatch,
      route: 'openrouter',
      model: 'deepseek/deepseek-chat-v3.1',
      version: '0.1.3-alpha.1',
      timeoutMs: 100,
      terminateGraceMs: 40,
    })).rejects.toThrow(/timed out/);
    expect(Date.now() - started).toBeGreaterThanOrEqual(125);
  });
});
