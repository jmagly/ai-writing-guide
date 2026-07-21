import { describe, expect, it } from 'vitest';
import {
  CapabilityResolutionError,
  resolveRoutableCapability,
} from '../../../src/artifacts/capability-resolver.js';

describe('routable capability resolver', () => {
  const root = process.cwd();

  it.each([
    ['agent', 'software-implementer', 'aiwg:agent:'],
    ['skill', 'aiwg-status', 'aiwg:skill:'],
    ['rule', 'token-security', 'aiwg:rule:'],
    ['workflow', 'flow-gate-check', 'aiwg:flow:'],
  ] as const)('resolves an exact %s through canonical packaged provenance', async (type, name, prefix) => {
    const result = await resolveRoutableCapability(root, type, name);
    expect(result.name).toBe(name);
    expect(result.id).toMatch(new RegExp(`^${prefix}`));
    expect(result.source).toMatchObject({ scope: 'packaged', provenance: 'corpus' });
    expect(result.source.path).not.toContain('/plugins/');
  });

  it('rejects a missing capability', async () => {
    await expect(resolveRoutableCapability(root, 'agent', 'definitely-not-real'))
      .rejects.toMatchObject({ kind: 'missing' } satisfies Partial<CapabilityResolutionError>);
  });

  it('rejects a type mismatch', async () => {
    await expect(resolveRoutableCapability(root, 'rule', 'aiwg-status'))
      .rejects.toMatchObject({ kind: 'type-mismatch' } satisfies Partial<CapabilityResolutionError>);
  });
});
