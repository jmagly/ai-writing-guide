import { beforeEach, describe, expect, it, vi } from 'vitest';

const failure = vi.hoisted(() => ({ unavailable: false }));
vi.mock('node:fs/promises', async importOriginal => {
  const actual: any = await importOriginal();
  return { ...actual, default: { ...actual.default, readFile: async (location: any, ...args: any[]) => {
    if (String(location).endsWith('/schemas/test-compile-probe.v1.schema.json')) return JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object', properties: { payload: { $ref: 'urn:missing:test-conformance-dependency' } }, required: ['payload'],
    });
    return actual.default.readFile(location, ...args);
  } } };
});
vi.mock('ajv', async importOriginal => {
  const actual: any = await importOriginal();
  return { ...actual, default: class {
    constructor(options: any) {
      if (failure.unavailable) throw new Error('validator dependency initialization unavailable');
      return new actual.default(options);
    }
  } };
});
beforeEach(() => { failure.unavailable = false; vi.resetModules(); });

describe('test conformance schema validation infrastructure fails closed', () => {
  it('rejects a real schema compilation failure for an unresolved reference', async () => {
    // Virtual schema only: the checkout is never mutated. Actual Ajv compiles it.
    // @ts-expect-error distributed addon JavaScript
    const { validateContract } = await import('../../../agentic/code/addons/testing-quality/lib/contracts.mjs');
    await expect(validateContract({ payload: 'looks valid' }, 'test-compile-probe.v1')).rejects.toThrow(/resolve reference|missing:test-conformance/);
    await expect(validateContract({}, 'test-compile-probe.v1')).rejects.toThrow(/resolve reference|missing:test-conformance/);
  });
  it('propagates unavailable validator initialization instead of accepting a payload', async () => {
    failure.unavailable = true;
    // @ts-expect-error distributed addon JavaScript
    const { validateContract } = await import('../../../agentic/code/addons/testing-quality/lib/contracts.mjs');
    await expect(validateContract({}, 'conformance-protocol.v1')).rejects.toThrow('validator dependency initialization unavailable');
  });
});
