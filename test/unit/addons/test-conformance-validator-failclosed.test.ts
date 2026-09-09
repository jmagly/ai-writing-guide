import { beforeEach, describe, expect, it, vi } from 'vitest';

const failure = vi.hoisted(() => ({ unavailable: false, compileCalls: 0 }));
vi.mock('node:fs/promises', async importOriginal => {
  const actual: any = await importOriginal();
  return { ...actual, default: { ...actual.default, readFile: async (location: any, ...args: any[]) => {
    const schemaPath = String(location);
    if (schemaPath.endsWith('/schemas/test-compile-probe.v1.schema.json') || schemaPath.endsWith('/schemas/test-catalog-probe.v1.schema.json')) return JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object', properties: { payload: { $ref: schemaPath.endsWith('/schemas/test-compile-probe.v1.schema.json') ? '#/definitions/missing' : 'urn:missing:test-conformance-dependency' } }, required: ['payload'],
    });
    return actual.default.readFile(location, ...args);
  } } };
});
vi.mock('ajv', async importOriginal => {
  const actual: any = await importOriginal();
  return { ...actual, default: class extends actual.default {
    constructor(options: any) {
      if (failure.unavailable) throw new Error('validator dependency initialization unavailable');
      super(options);
    }
    compile(schema: any) {
      failure.compileCalls++;
      return super.compile(schema);
    }
  } };
});
beforeEach(() => { failure.unavailable = false; failure.compileCalls = 0; vi.resetModules(); });

describe('test conformance schema validation infrastructure fails closed', () => {
  it('rejects a real schema compilation failure for an unresolved local reference', async () => {
    // Virtual schema only: the checkout is never mutated. The local reference passes
    // catalog inspection and reaches actual Ajv compilation on both attempts.
    // @ts-expect-error distributed addon JavaScript
    const { validateContract } = await import('../../../agentic/code/addons/testing-quality/lib/contracts.mjs');
    await expect(validateContract({ payload: 'looks valid' }, 'test-compile-probe.v1')).rejects.toThrow("can't resolve reference #/definitions/missing from id #");
    expect(failure.compileCalls).toBe(1);
    await expect(validateContract({}, 'test-compile-probe.v1')).rejects.toThrow("can't resolve reference #/definitions/missing from id #");
    expect(failure.compileCalls).toBe(2);
  });
  it('rejects references outside the offline catalog before compilation', async () => {
    // @ts-expect-error distributed addon JavaScript
    const { validateContract } = await import('../../../agentic/code/addons/testing-quality/lib/contracts.mjs');
    await expect(validateContract({ payload: 'looks valid' }, 'test-catalog-probe.v1')).rejects.toThrow('Schema reference is outside the offline testing contract catalog: urn:missing:test-conformance-dependency');
    expect(failure.compileCalls).toBe(0);
  });
  it('propagates unavailable validator initialization instead of accepting a payload', async () => {
    failure.unavailable = true;
    // @ts-expect-error distributed addon JavaScript
    const { validateContract } = await import('../../../agentic/code/addons/testing-quality/lib/contracts.mjs');
    await expect(validateContract({}, 'conformance-protocol.v1')).rejects.toThrow('validator dependency initialization unavailable');
    expect(failure.compileCalls).toBe(0);
  });
});
