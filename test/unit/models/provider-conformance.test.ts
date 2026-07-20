import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  compileModelPolicy,
  loadProviderModelCapabilities,
  validateCanonicalModelPolicy,
} from '../../../src/models/provider-policy.js';

const fixture = JSON.parse(fs.readFileSync(path.resolve(
  'test/fixtures/models/provider-conformance.v1.json',
), 'utf8'));

describe('fixture-first provider model conformance', () => {
  it('covers the three semantic tiers plus unknown and blocked pins', () => {
    expect(fixture.policies.map((item: any) => item.id)).toEqual([
      'reasoning-premium',
      'coding-standard',
      'efficiency-economy',
      'unknown-exact-id',
      'invalid-blocked-pin',
    ]);
    const invalid = validateCanonicalModelPolicy(fixture.policies[4].policy);
    expect(invalid.valid).toBe(false);
    expect(invalid.diagnostics[0].code).toBe('MODEL_POLICY_INVALID');
  });

  it.each(Object.entries(fixture.providers))(
    '%s matches its golden path, format, fields, and degradation contract',
    (provider, golden: any) => {
      const capability = (loadProviderModelCapabilities().providers as any)[provider];
      expect(capability.agent).toBe(golden.agent);
      expect(capability.skill).toBe(golden.skill);
      expect(capability.configTarget).toBe(golden.target);
      expect(capability.artifactFormat).toBe(golden.format);

      for (const entry of fixture.policies.slice(0, 3)) {
        const compiled = compileModelPolicy({
          provider: provider as any,
          artifact: 'agent',
          policy: entry.policy,
        });
        expect(compiled.outcome).toBe(golden.agent);
        expect(compiled.target).toBe(golden.target);
        if (golden.modelField) {
          expect(compiled.fields[golden.modelField]).toBe(compiled.effectiveModel);
        } else {
          expect(compiled.fields).toEqual({});
        }
        if (!golden.effortField) {
          expect(Object.keys(compiled.fields)).not.toContain('effort');
          expect(Object.keys(compiled.fields)).not.toContain('model_reasoning_effort');
          expect(Object.keys(compiled.fields)).not.toContain('reasoningEffort');
        }
      }

      const skill = compileModelPolicy({
        provider: provider as any,
        artifact: 'skill',
        policy: fixture.policies[1].policy,
      });
      expect(skill.outcome).toBe(golden.skill);
      if (golden.skill === 'unsupported' || golden.skill === 'informational') {
        expect(skill.fields).toEqual({});
      }
    },
  );

  it('diagnoses an unknown exact override without silently changing it', () => {
    const entry = fixture.policies[3];
    const compiled = compileModelPolicy({
      provider: 'codex', artifact: 'agent', policy: entry.policy,
    });
    expect(compiled.effectiveModel).toBe(entry.policy.override);
    expect(compiled.diagnostics.map(item => item.code)).toContain(entry.diagnostic);
  });
});
