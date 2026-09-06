import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyWritingConsumer } from '../../../src/writing/writing-consumer.js';
const roots: string[] = [];
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function request() {
  const cwd = await mkdtemp(path.join(tmpdir(), 'consumer-review-')); roots.push(cwd);
  vi.stubEnv('AIWG_CONFIG', path.join(cwd, 'user')); vi.stubEnv('AIWG_SESSION_ID', path.basename(cwd));
  return { cwd, frameworkRoot: cwd, provider: 'fixture', consumer: 'review', format: 'prose' as const };
}
describe('independent consumer no-op regressions', () => {
  it('never delivers the explicitly selected unaltered mode to a transform', async () => {
    const transform = vi.fn(() => 'Unexpected rewrite.');
    const result = await applyWritingConsumer('Original.\n🙂', { ...await request(), invocationModes: ['unaltered'], runtime: { transform } });
    expect(result.content).toBe('Original.\n🙂');
    expect(transform).not.toHaveBeenCalled();
    expect(result.state.selected).toEqual(['unaltered']);
    expect(result.state.delivered).toEqual([]); expect(result.state.applied).toEqual([]);
  });
  it('composes a no-op with a real voice without making an extra transformation call', async () => {
    const transform = vi.fn((text: string) => text + ' Again.');
    const result = await applyWritingConsumer('Original.', { ...await request(), invocationModes: ['unaltered', 'wittgenstein-inspired'], runtime: { transform } });
    expect(result.content).toBe('Original. Again.'); expect(transform).toHaveBeenCalledOnce();
    expect(result.state.delivered).toEqual(['wittgenstein-inspired']); expect(result.state.applied).toEqual(['wittgenstein-inspired']);
  });
});
