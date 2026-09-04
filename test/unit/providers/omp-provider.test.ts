import { describe, it, expect } from 'vitest';
import { resolveOmpPaths, normalizeOmpProfile } from '../../../src/providers/omp-paths.mjs';
import { getProviderDefinition, normalizeProviderDefinitionId as normalizeProviderId } from '../../../src/providers/provider-definitions.js';
import { buildProviderBootstrapBlock } from '../../../src/smiths/context-pipeline/workspace-context.js';

describe('OMP native identity and paths', () => {
  it('does not infer a runtime from Pi variables or coinstalled native directories', async () => {
    const { mkdtemp, mkdir, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { resolveActiveProvider, commandLooksLikeProvider } = await import('../../../src/cli/provider-resolution.js');
    const cwd = await mkdtemp(join(tmpdir(), 'omp-identity-'));
    try {
      await mkdir(join(cwd, '.pi'));
      await mkdir(join(cwd, '.omp'));
      const env = { PI_PROFILE: 'work', PI_CODING_AGENT_DIR: '/tmp/shared' };
      const inferred = await resolveActiveProvider({ cwd, env, detectProcess: false, defaultProvider: null });
      expect(inferred.provider).toBeNull();
      expect(await resolveActiveProvider({ cwd, env: { ...env, AIWG_PROVIDER: 'pi' }, explicitProvider: 'oh-my-pi', detectProcess: false })).toMatchObject({ provider: 'omp', source: 'explicit' });
      expect(commandLooksLikeProvider('/usr/local/bin/omp --mode rpc')).toBe('omp');
      expect(commandLooksLikeProvider('/usr/bin/bun /tmp/node_modules/@oh-my-pi/pi-coding-agent/src/cli.ts')).toBe('omp');
      expect(commandLooksLikeProvider('/usr/local/bin/pi --mode rpc')).toBe('pi');
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
  it('keeps fork identities separate', () => {
    expect(normalizeProviderId('oh-my-pi')).toBe('omp');
    expect(normalizeProviderId('pi-coding-agent')).toBe('pi');
    const omp = getProviderDefinition('omp')!;
    expect(omp.paths.artifacts.agents).toBe('.omp/agents');
    expect(omp.capabilities.nativeFeatures.mcp).toBe(true);
    expect(omp.detection.env).toEqual([]);
    expect(getProviderDefinition('pi')!.capabilities.nativeFeatures.mcp).toBe(false);
    expect(buildProviderBootstrapBlock('omp')).toContain('@../WORKSPACE.md');
    expect(buildProviderBootstrapBlock('omp')).toContain('@../AIWG.md');
  });
  it('resolves profile precedence without confusing Pi environment with runtime evidence', () => {
    const base = {home:'/home/test',cwd:'/workspace',platform:'linux',exists:()=>false};
    expect(resolveOmpPaths({...base,env:{}}).agentDir).toBe('/home/test/.omp/agent');
    expect(resolveOmpPaths({...base,env:{OMP_PROFILE:'',PI_PROFILE:'work'}}).profile).toBeUndefined();
    expect(resolveOmpPaths({...base,env:{PI_PROFILE:'work',PI_CODING_AGENT_DIR:'/other'}}).agentDir).toBe('/home/test/.omp/profiles/work/agent');
    expect(resolveOmpPaths({...base,env:{PI_CODING_AGENT_DIR:'local'}}).agentDir).toBe('/workspace/local');
    expect(resolveOmpPaths({...base,env:{PI_CONFIG_DIR:'.custom'}}).agentDir).toBe('/home/test/.custom/agent');
  });
  it('uses migrated XDG profile directories only when they exist', () => {
    const env={OMP_PROFILE:'work',XDG_DATA_HOME:'/data'};
    const base={home:'/home/test',cwd:'/workspace',env,platform:'linux'};
    expect(resolveOmpPaths({...base,exists:p=>p==='/data/omp'}).sessionsDir).toBe('/home/test/.omp/profiles/work/agent/sessions');
    expect(resolveOmpPaths({...base,exists:p=>p==='/data/omp/profiles/work'}).sessionsDir).toBe('/data/omp/profiles/work/sessions');
    expect(resolveOmpPaths({...base,platform:'win32',exists:()=>true}).sessionsDir).toBe('/home/test/.omp/profiles/work/agent/sessions');
  });
  it.each(['../escape','CON','con.txt','UPPER','ends.','.','..'])('rejects invalid profile %s', value => {
    expect(()=>normalizeOmpProfile(value)).toThrow('Invalid OMP profile');
  });
});

describe('OMP runtime diagnostics', () => {
  it('reports effective paths and a parsed version without exposing runtime output or credentials', async () => {
    const { diagnoseOmpRuntime } = await import('../../../src/providers/omp-diagnostics.mjs');
    const output = await diagnoseOmpRuntime({ cwd: '/tmp', env: { PATH: '/bin', PI_CODING_AGENT_DIR: '/tmp/agent', OPENROUTER_API_KEY: 'not-forwarded' }, runner: async (_binary, _args, options) => {
      expect(options.env).not.toHaveProperty('OPENROUTER_API_KEY');
      return { stdout: 'omp/18.1.10\n' };
    } });
    expect(output).toMatchObject({ available: true, version: '18.1.10', paths: { agentDir: '/tmp/agent' } });
    const unavailable = await diagnoseOmpRuntime({ runner: async () => { throw Error('sensitive stderr'); } });
    expect(unavailable.available).toBe(false);
    expect(JSON.stringify(unavailable)).not.toContain('sensitive stderr');
  });
});
