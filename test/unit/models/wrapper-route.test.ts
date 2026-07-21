import { describe, expect, it } from 'vitest';
import { buildWrapperRouteEnvelope } from '../../../src/models/wrapper-route.js';

const softwareImplementer = {
  type: 'agent' as const,
  id: 'aiwg:agent:test',
  name: 'software-implementer',
  source: {
    path: 'agentic/code/frameworks/sdlc-complete/agents/software-implementer.md',
    scope: 'packaged' as const,
    provenance: 'corpus' as const,
  },
};

describe('model wrapper route envelope', () => {
  it.each([
    ['routine', { routine: true }, 'economy', 'efficiency', 'aiwg-model-efficiency-worker'],
    ['complex', { complex: true }, 'standard', 'coding', 'aiwg-model-coding-worker'],
    ['premium', { highImpact: true, premiumAuthorized: true, maxAutoTier: 3 as const }, 'premium', 'reasoning', 'aiwg-model-reasoning-worker'],
  ])('routes %s work through the expected wrapper', (_name, signals, tier, role, wrapper) => {
    const result = buildWrapperRouteEnvelope({
      provider: 'codex',
      capability: softwareImplementer,
      assignment: 'Perform a bounded verification task.',
      launchMechanism: 'aiwg-mc',
      ...signals,
    });
    expect(result.tier).toBe(tier);
    expect(result.role).toBe(role);
    expect(result.wrapper).toBe(wrapper);
    expect(result.model?.outcome).toBe('native');
    expect(result.launch.prompt).toContain('software-implementer');
  });

  it('uses no wrapper for deterministic work', () => {
    const result = buildWrapperRouteEnvelope({
      provider: 'codex',
      capability: { ...softwareImplementer, type: 'skill', name: 'aiwg-status' },
      assignment: 'Read the existing status output.',
      launchMechanism: 'manual',
      deterministic: true,
    });
    expect(result.tier).toBeNull();
    expect(result.wrapper).toBeNull();
    expect(result.model).toBeNull();
  });

  it('requires premium confirmation until policy authorizes it', () => {
    const base = {
      provider: 'codex' as const,
      capability: { ...softwareImplementer, type: 'rule' as const, name: 'security-review' },
      assignment: 'Review a high-impact decision.',
      launchMechanism: 'aiwg-mc' as const,
      highImpact: true,
    };
    expect(buildWrapperRouteEnvelope(base).decision.requiresConfirmation).toBe(true);
    expect(buildWrapperRouteEnvelope({ ...base, premiumAuthorized: true, maxAutoTier: 3 }).decision.requiresConfirmation).toBe(false);
  });

  it('rejects an unbounded empty assignment', () => {
    expect(() => buildWrapperRouteEnvelope({
      provider: 'codex', capability: { ...softwareImplementer, name: 'test-engineer' },
      assignment: ' ', launchMechanism: 'aiwg-mc', complex: true,
    })).toThrow(/bounded assignment/);
  });
});
