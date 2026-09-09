import { SessionLauncher } from '../../../tools/ralph-external/session-launcher.mjs';
import { compileModelPolicy } from '../../../src/models/provider-policy.js';
import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OmpFrameDecoder, MAX_FRAME, OmpRpcClient, inspectOmpProcess, waitForOmpProcessCleanup } from '../../../tools/providers/omp-transport.mjs';
import { OmpAdapter } from '../../../tools/ralph-external/lib/omp-adapter.mjs';
import { OmpTaskGate, runOmpTeam, acquireOmpWorkspaceSlot } from '../../../tools/providers/omp-teams.mjs';
import { discoverOmpModels, resolveOmpRoleModel } from '../../../src/models/model-discovery.js';
const jsonl = (...frames: any[]) => frames.map(f => JSON.stringify(f) + '\n').join('');
const message = { role: 'assistant', content: [{ type: 'text', text: 'done' }], stopReason: 'stop' };

// Execute a committed shim; temporary scripts are interpreter input, never exec targets.
// exec preserves the actual child PID and signal/EOF lifecycle under test.
const rpcFixture = (script: string) => ({
  binary: fileURLToPath(new URL('../../fixtures/providers/omp-rpc-launcher.sh', import.meta.url)),
  env: { ...process.env, AIWG_OMP_TEST_SCRIPT: script },
});

describe('OMP catalog', () => {
  it('uses native JSON with safe extensions default and exact model overrides', async () => {
    const calls: any[] = [];
    const runner = async (_: string, args: string[]) => { calls.push(args); return { exitCode: 0, stderr: '', stdout: args.includes('--version') ? '18.1.10' : JSON.stringify({ models: [{ provider: 'openrouter', id: 'x/y', thinking: ['high'] }, { provider: 'other', id: 'z' }] }) }; };
    const catalog = await discoverOmpModels('omp', runner, { profile: 'work', config: ['/tmp/settings.yml'] });
    expect(calls[0]).toEqual(['--profile', 'work', 'models', '--json', '--no-extensions', '--config', '/tmp/settings.yml']);
    expect(catalog.models.map(m => m.id)).toEqual(['openrouter/x/y', 'other/z']);
    expect(resolveOmpRoleModel(catalog, 'coding', { coding: 'other/z' })).toBe('other/z');
    expect(resolveOmpRoleModel(catalog, 'coding', {}, 'explicit')).toBe('explicit');
    expect(() => resolveOmpRoleModel(catalog, 'coding', { coding: 'unavailable' })).toThrow('unavailable');
    calls.length = 0; await discoverOmpModels('omp', runner, { extensions: true }); expect(calls[0]).not.toContain('--no-extensions');
  });
  it.each([['empty', '{"models":[]}', 0, undefined], ['invalid', '{', 0, 'invalid-output'], ['shape', '{}', 0, 'invalid-output'], ['unsupported', '', 1, 'unsupported'], ['timeout', '', 124, 'timeout']])('%s catalog', async (_, stdout, exitCode, expected) => {
    const result = await discoverOmpModels('omp', async () => ({ stdout: stdout as string, stderr: 'unsupported command SECRET', exitCode: exitCode as number }));
    expect((result.error ?? '').length).toBeLessThan(200); expect(result.errorKind).toBe(expected); expect(result.error ?? '').not.toContain('SECRET');
  });
});
describe('OMP JSON and frames', () => {
  it('uses OMP flags and requires terminal assistant plus zero exit', () => {
    const adapter = new OmpAdapter(); const args = adapter.buildSessionArgs({ prompt: '--hello', model: 'p/m', tools: [] });
    expect(args).toEqual(['--mode', 'json', '--model', 'p/m', '--no-tools', '--', '--hello']);
    const output = jsonl({ type: 'message_end', message }, { type: 'agent_end', messages: [message] });
    expect(adapter.parseOutput(output).success).toBe(true);
    expect(adapter.parseOutput(output, { exitCode: 1 }).success).toBe(false);
    expect(adapter.parseOutput(jsonl({ type: 'agent_end', messages: [message], willContinue: true })).success).toBe(false);
    expect(adapter.parseOutput(jsonl({ type: 'agent_end', messages: [] })).success).toBe(false);
    expect(adapter.parseOutput(output + '{')).toBeNull(); expect(adapter.parseOutput('')).toBeNull();
    expect(adapter.parseOutput(jsonl({ type: 'tool_execution_end', isError: true }, { type: 'agent_end', messages: [message] })).success).toBe(false);
    expect(adapter.parseOutput(jsonl({ type: 'agent_end', messages: [{ ...message, stopReason: 'error' }] })).success).toBe(false);
    expect(adapter.parseOutput(jsonl({ type: 'agent_end', messages: [{ ...message, stopReason: 'aborted' }] })).aborted).toBe(true);
  });
  it('reassembles v2 ordered chunks including split UTF8 and bounds memory', () => {
    const frame = { type: 'message_end', text: 'é'.repeat(MAX_FRAME) }; const data = Buffer.from(JSON.stringify(frame));
    const count = Math.ceil(data.length / (256 * 1024));
    const chunks = Array.from({ length: count }, (_, index) => ({ type: 'rpc_chunk', chunkId: 'one', count, index, byteLength: data.length, data: data.subarray(index * 256 * 1024, (index + 1) * 256 * 1024).toString('base64') }));
    const decoder = new OmpFrameDecoder(); const results = [];
    for (const c of chunks) { const line = Buffer.from(jsonl(c)); results.push(...decoder.push(line.subarray(0, 51)), ...decoder.push(line.subarray(51))); }
    decoder.end(); expect(results).toEqual([frame]);
    expect(() => new OmpFrameDecoder().push(jsonl(chunks[1]))).toThrow('sequence');
    expect(() => new OmpFrameDecoder().push(jsonl({ ...chunks[0], byteLength: 65 * MAX_FRAME }))).toThrow();
    expect(() => new OmpFrameDecoder().push(jsonl({ ...chunks[0], data: '!!!!' }))).toThrow();
    const partial = new OmpFrameDecoder(); partial.push(jsonl(chunks[0])); expect(() => partial.end()).toThrow('Truncated');
    expect(() => new OmpFrameDecoder().push('x'.repeat(MAX_FRAME))).toThrow('limit');
  });
});
describe('OMP RPC lifecycle', () => {
  it.each([1, 2])('negotiates v%s with correlation, terminal events and process cleanup', async version => {
    const dir = await mkdtemp(join(tmpdir(), 'omp-rpc-')); const fixture = join(dir, 'fixture.cjs');
    await writeFile(fixture, `process.stdout.write(JSON.stringify({type:'ready',protocolVersion:1,supportedProtocolVersions:[1,${version}]})+'\\n');setTimeout(()=>process.stderr.write('fixture stderr noise'),25);require('readline').createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);const send=x=>process.stdout.write(JSON.stringify(x)+'\\n');send({type:'response',id:m.id,command:m.type,success:true,data:m.type==='get_state'?{isStreaming:false}: {protocolVersion:2}});if(m.type==='prompt'){send({type:'agent_end',willContinue:true,messages:[]});send({type:'message_end',message:${JSON.stringify(message)}});send({type:'agent_end',messages:[]});}});`);
    // Wrapper absorbs OMP args while retaining a real child process lifecycle.
    const executable = join(dir, 'omp'); await writeFile(executable, `#!/bin/sh\nexec '${process.execPath}' '${fixture}'\n`);
    const client = new OmpRpcClient({ ...rpcFixture(executable), timeoutMs: 2000 });
    try { await client.connect(); expect(client.protocolVersion).toBe(version); await vi.waitFor(() => expect(client.stderr).toContain('fixture stderr noise'), { timeout: 500, interval: 5 }); expect((await client.prompt('hello')).success).toBe(true); }
    finally { await client.close(); await rm(dir, { recursive: true, force: true }); }
    expect(client.isClosed).toBe(true);
  });
  it('allows EOF disposal to reap an owned descendant before closing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'omp-dispose-')); const executable = join(dir, 'omp');
    const fixture = join(dir, 'fixture.cjs'); const receipt = join(dir, 'reaped');
    await writeFile(fixture, `const {spawn}=require('child_process');const fs=require('fs');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});process.stdout.write(JSON.stringify({type:'ready'})+'\\n');process.stdin.resume();process.stdin.on('end',()=>setTimeout(()=>{child.once('exit',()=>{fs.writeFileSync(${JSON.stringify(receipt)},String(child.pid));process.exit(0)});child.kill('SIGTERM')},100));`);
    await writeFile(executable, `#!/bin/sh\nexec '${process.execPath}' '${fixture}'\n`);
    const client = new OmpRpcClient({ ...rpcFixture(executable), closeGraceMs: 1000 });
    try {
      await client.connect(); await client.close();
      const pid = Number(await readFile(receipt, 'utf8'));
      expect((await inspectOmpProcess({ pid })).present).toBe(false);
      expect(client.child.signalCode).toBe(null);
    } finally { await client.close(); await rm(dir, { recursive: true, force: true }); }
  });
  it('bounds shutdown when a ready process ignores EOF and SIGTERM', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'omp-close-bound-')); const executable = join(dir, 'omp');
    await writeFile(executable, `#!/bin/sh\nexec '${process.execPath}' -e 'process.on("SIGTERM",()=>{});process.stdout.write(JSON.stringify({type:"ready"})+"\\n");process.stdin.resume();setInterval(()=>{},1000)'\n`);
    const client = new OmpRpcClient({ ...rpcFixture(executable), closeGraceMs: 50 });
    try { await client.connect(); const started = Date.now(); await client.close(); expect(Date.now() - started).toBeLessThan(2000); expect(client.child.signalCode).toBe('SIGKILL'); }
    finally { await client.close(); await rm(dir, { recursive: true, force: true }); }
  });
  it('reports process ownership and refuses cleanup while a tracked process remains', async () => {
    const state = await inspectOmpProcess({ pid: process.pid });
    expect(state.present).toBe(true);
    if (process.platform === 'linux') { expect(state.parentPid).toBe(process.ppid); expect(state.startTime).toMatch(/^\d+$/); }
    const receipt = await waitForOmpProcessCleanup([{ pid: process.pid }], { timeoutMs: 10 });
    expect(receipt.complete).toBe(false); expect(receipt.final[0].present).toBe(true);
  });
  it('kills a hanging child on timeout and abort', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'omp-hang-')); const executable = join(dir, 'omp');
    await writeFile(executable, `#!/bin/sh\nexec '${process.execPath}' -e 'setInterval(()=>{},1000)'\n`);
    const client = new OmpRpcClient({ ...rpcFixture(executable), timeoutMs: 50 });
    await expect(client.connect()).rejects.toThrow('timeout'); await client.close(); expect(client.isClosed).toBe(true);
    await rm(dir, { recursive: true, force: true });
  });
});
describe('OMP team native dispatch', () => {
  it.each([1, 2, 4])('bounds %i active workers and queues the fifth', async cap => {
    const gate = new OmpTaskGate(cap, 4); const releases = [];
    for (let i = 0; i < cap; i++) releases.push(await gate.acquire());
    let admitted = false; const queued = gate.acquire().then((release: any) => { admitted = true; release(); });
    await Promise.resolve(); expect(admitted).toBe(false); expect(gate.active).toBe(cap);
    releases.shift()(); await queued; for (const release of releases) release(); expect(gate.active).toBe(0);
  });
  it('runs research and SDLC through native task traces and retains parent/ownership/results', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'omp-team-'));
    const factory = () => ({ connect: async () => {}, close: async () => {}, prompt: async (prompt: string) => { const nativeAgent = JSON.parse(prompt.match(/using agent ("[^"]+")/)![1]); const taskId = JSON.parse(prompt.match(/and name ("[^"]+")/)![1]); return { success: true, text: 'Complete', events: [{ type: 'tool_execution_start', toolName: 'task', args: { agent: nativeAgent } }, { type: 'tool_execution_end', toolName: 'task', result: { content: 'Evidence', details: { results: [{ id: taskId, exitCode: 0, output: 'Evidence' }] } } }] }; } });
    try {
      const tasks = [{ id: 'research', agent: 'researcher', role: 'reasoning', ownership: ['evidence.md'], tools: ['read'], prompt: 'inspect source' }, { id: 'sdlc', parentId: 'research', agent: 'architect', ownership: ['design.md'], tools: ['read', 'write'], prompt: 'document design' }];
      const result = await runOmpTeam({ cwd, tasks, maxParallel: 1, clientFactory: factory });
      expect(result.results.map((r: any) => r.status)).toEqual(['completed', 'completed']); expect(result.results[1].parentId).toBe('research');
      expect(JSON.parse(await readFile(result.results[0].output, 'utf8')).result.content).toBe('Evidence');
      expect(await readdir(join(cwd, '.omp', 'agents'))).toEqual([]);
      expect(result.results[0].controlArtifacts.retained).toBe(true);
      expect(await readFile(result.results[0].controlArtifacts.guard, 'utf8')).toContain('Tool outside AIWG task declaration');
      const signal = AbortSignal.abort(); const cancelled = await runOmpTeam({ cwd, tasks, signal, clientFactory: factory }); expect(cancelled.results.every((r: any) => r.status === 'cancelled')).toBe(true);
      await expect(runOmpTeam({ cwd, tasks: [{ ...tasks[0], tools: ['task'] }], clientFactory: factory })).rejects.toThrow('leaf');
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
});


describe('OMP edge cases', () => {
  it('marks v1 elision as incomplete, refuses interrupted chunks and malformed JSON', () => {
    const adapter = new OmpAdapter();
    expect(adapter.parseOutput(jsonl({ type: 'agent_end', messages: [{ ...message, content: [{ type: 'text', text: '…[5 chars elided for RPC frame]' }] }] })).success).toBe(false);
    const decoder = new OmpFrameDecoder();
    decoder.push(jsonl({ type: 'rpc_chunk', chunkId: 'x', index: 0, count: 5, byteLength: MAX_FRAME, data: Buffer.alloc(256 * 1024).toString('base64') }));
    expect(() => decoder.push(jsonl({ type: 'agent_end' }))).toThrow('interrupted');
    expect(() => new OmpFrameDecoder().push('{bad}\n')).toThrow();
  });
  it('shares filesystem slots between independent gates and cancels queued admission', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'omp-slot-'));
    const release = await acquireOmpWorkspaceSlot(cwd, 1);
    const controller = new AbortController();
    const waiting = acquireOmpWorkspaceSlot(cwd, 1, controller.signal);
    controller.abort(); await expect(waiting).rejects.toThrow('cancelled'); await release();
    const next = await acquireOmpWorkspaceSlot(cwd, 1); await next(); await rm(cwd, { recursive: true, force: true });
  });
  it('cancels descendants through parent signals and persists failures', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'omp-cancel-'));
    try {
      const parentSignal = AbortSignal.abort();
      const tasks = [{ id: 'parent', agent: 'r', prompt: 'work', tools: ['read'], ownership: [], signal: parentSignal }, { id: 'child', parentId: 'parent', agent: 'c', prompt: 'work', tools: ['read'], ownership: [] }];
      const result = await runOmpTeam({ cwd, tasks, clientFactory: () => { throw new Error('must not dispatch'); } });
      expect(result.results.map((r: any) => r.status)).toEqual(['cancelled', 'cancelled']);
      const failed = await runOmpTeam({ cwd, tasks: [{ ...tasks[0], signal: undefined }], clientFactory: () => { throw new Error('fixture failure'); } });
      expect(failed.results[0].status).toBe('failed'); expect(failed.results[0].error).toBe('fixture failure');
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
  it('rejects RPC EOF without a terminal event', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'omp-eof-')); const executable = join(dir, 'omp');
    await writeFile(executable, `#!/bin/sh\nprintf '%s\\n' '{"type":"ready","supportedProtocolVersions":[1]}'\nread line\nprintf '%s\\n' '{"type":"response","id":"aiwg-1","command":"prompt","success":true}'\n`);
    const client = new OmpRpcClient({ ...rpcFixture(executable), timeoutMs: 1000 });
    try { await client.connect(); await expect(client.prompt('work')).rejects.toThrow('exited'); } finally { await client.close(); await rm(dir, { recursive: true, force: true }); }
  });
});


describe('OMP native model field contract', () => {
  it('emits source-supported thinkingLevel key', () => {
    const policy = compileModelPolicy({ provider: 'omp', artifact: 'agent', policy: { role: 'coding', tier: 'standard', effort: 'high', override: 'fixture/model' } });
    expect(policy.fields.thinkingLevel).toBe('high'); expect(policy.fields['thinking-level']).toBeUndefined();
  });
  it('releases both admission slots when native client cleanup throws', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'omp-cleanup-'));
    try {
      const result = await runOmpTeam({ cwd, tasks: [{ id: 'x', agent: 'r', tools: [], ownership: [], prompt: 'work' }], clientFactory: () => ({ connect: async () => { throw new Error('connect failed'); }, close: async () => { throw new Error('close failed'); } }) });
      expect(result.results[0].status).toBe('failed');
      const release = await acquireOmpWorkspaceSlot(cwd, 1, AbortSignal.timeout(500)); await release();
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
});


describe('OMP External Ralph session integration', () => {
  it('does not treat AIWG tracking UUID as native resume and rejects model failure despite exit zero', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'omp-launcher-'));
    const executable = join(dir, 'omp');
    const adapter = new OmpAdapter(); let received: any;
    adapter.getBinary = () => executable;
    const build = adapter.buildSessionArgs.bind(adapter);
    adapter.buildSessionArgs = (options: any) => { received = options; return build(options); };
    const launcher = new SessionLauncher(); launcher.setProviderAdapter(adapter);
    const options = { prompt: 'work', sessionId: 'aiwg-tracking-uuid', workingDir: dir, stdoutPath: join(dir, 'stdout'), stderrPath: join(dir, 'stderr'), timeoutMs: 1000 };
    try {
      await writeFile(executable, `#!/bin/sh\nprintf '%s\\n' '${JSON.stringify({ type: 'agent_end', messages: [message] })}'\n`, { mode: 0o755 });
      const success = await launcher._launchSession(options);
      expect(received.sessionId).toBeUndefined(); expect(success.exitCode).toBe(0);
      await writeFile(executable, `#!/bin/sh\nprintf '%s\\n' '${JSON.stringify({ type: 'agent_end', messages: [{ ...message, stopReason: 'error' }] })}'\n`, { mode: 0o755 });
      const failed = await launcher._launchSession({ ...options, resumeSession: '/existing/native.jsonl' });
      expect(received.sessionId).toBe('/existing/native.jsonl'); expect(failed.exitCode).toBe(1);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
