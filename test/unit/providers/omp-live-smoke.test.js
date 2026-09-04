import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runLiveSmoke, smokeEnvironment } from '../../../tools/providers/omp-live-smoke.mjs';
const env = { AIWG_OMP_LIVE_SMOKE: '1', OPENROUTER_API_KEY: 'fixture-secret', PATH: '/bin', HOME: '/operator-home', ANTHROPIC_API_KEY: 'unrelated-secret', NODE_OPTIONS: '--require malicious' };
const options = { binary: '/fake/omp', model: 'openrouter/openai/gpt-4.1-mini', env };
const verifyBinary = async () => ({ binaryPinned: true, versionMatched: true });
describe('OMP opt-in hosted smoke', () => {
  it('requires an opt-in, explicit backend/model and credential before starting a process', async () => {
    let called = false; const dependencies = { verifyBinary: async () => { called = true; return {}; } };
    for (const changed of [{ env: {} }, { env: { ...env, AIWG_OMP_LIVE_SMOKE: '0' } }, { model: undefined }, { model: 'anthropic/claude' }, { binary: undefined }]) {
      const result = await runLiveSmoke({ ...options, ...changed }, dependencies); expect(result.status).toBe('not-ready'); expect(result.promptSubmissions).toBe(0);
    }
    expect(called).toBe(false);
  });
  it('check verifies prerequisites without creating an RPC client or making model calls', async () => {
    const result = await runLiveSmoke({ ...options, check: true }, { verifyBinary, clientFactory: () => { throw new Error('must not launch'); } });
    expect(result.status).toBe('ready'); expect(result.modelCalls).toBe(0); expect(result.promptSubmissions).toBe(0);
  });
  it('uses an allowlisted child environment without HOME or unrelated credentials', () => {
    const child = smokeEnvironment(env, '/sandbox', true);
    expect(child.OPENROUTER_API_KEY).toBe('fixture-secret'); expect(child.PI_CODING_AGENT_DIR).toBe('/sandbox/agent');
    expect(child).not.toHaveProperty('HOME'); expect(child).not.toHaveProperty('ANTHROPIC_API_KEY'); expect(child).not.toHaveProperty('NODE_OPTIONS');
    expect(smokeEnvironment(env, '/sandbox')).not.toHaveProperty('OPENROUTER_API_KEY');
  });
  it('verifies completion, native context/read and persistence, then removes all session artifacts', async () => {
    let project; let count = 0;
    const result = await runLiveSmoke(options, { verifyBinary, clientFactory: config => {
      project = config.cwd;
      expect(config.eventLimit).toBe(2 * 1024 * 1024); expect(config.timeoutMs).toBeLessThanOrEqual(180000);
      return { connect: async () => {}, close: async () => {}, prompt: async () => {
        count++;
        if (count === 1) return { success: true, text: 'AIWG_OMP_COMPLETION_OK', events: [] };
        const context = readFileSync(join(project, '.omp/AGENTS.md'), 'utf8').match(/CONTEXT_[\w-]+/)[0];
        const marker = readFileSync(join(project, 'fixture.txt'), 'utf8');
        const session = config.args[config.args.indexOf('--session') + 1]; writeFileSync(session, 'fixture session');
        return { success: true, text: `${context} ${marker}`, events: [{ type: 'tool_execution_end', toolName: 'read', isError: false }] };
      } };
    } });
    expect(result.status).toBe('passed'); expect(result.promptSubmissions).toBe(2); expect(result.checks.readTool).toBe(true); expect(result.checks.sessionPersisted).toBe(true);
    expect(existsSync(project)).toBe(false); const serialized = JSON.stringify(result);
    for (const forbidden of ['fixture-secret','unrelated-secret','CONTEXT_','FILE_','fixture session',project]) expect(serialized).not.toContain(forbidden);
  });
  it('bounds a hanging prompt and cleans up isolated state after cancellation', async () => {
    let project; let closed = 0;
    const result = await runLiveSmoke({ ...options, timeoutMs: 100 }, { verifyBinary, clientFactory: config => {
      project = config.cwd;
      return { connect: async () => {}, close: async () => { closed++; }, prompt: async (_message, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
      }) };
    } });
    expect(result.status).toBe('failed'); expect(result.reason).toBe('SMOKE_EXECUTION_FAILED'); expect(closed).toBeGreaterThan(0); expect(existsSync(project)).toBe(false);
  });
  it('sanitizes child exceptions and fails binary mismatch before model execution', async () => {
    const mismatch = await runLiveSmoke(options, { verifyBinary: async () => ({ binaryPinned: false, versionMatched: false }) });
    expect(mismatch.reason).toBe('BINARY_VERIFICATION_FAILED'); expect(mismatch.promptSubmissions).toBe(0);
    const failed = await runLiveSmoke(options, { verifyBinary, clientFactory: () => ({ connect: async () => { throw new Error('fixture-secret provider response'); }, close: async () => {} }) });
    expect(failed.reason).toBe('SMOKE_EXECUTION_FAILED'); expect(JSON.stringify(failed)).not.toContain('fixture-secret');
  });
});
