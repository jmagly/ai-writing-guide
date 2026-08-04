import { describe, expect, it } from 'vitest';
import { SANDBOX_BASELINE, validateSandboxIdentity } from '../../../tools/qualification/agentic-sandbox-baseline.mjs';

describe('Agentic Sandbox qualification baseline', () => {
  it('accepts only the immutable v2026.8.3 release identity', () => {
    expect(validateSandboxIdentity(SANDBOX_BASELINE)).toBe(SANDBOX_BASELINE);
  });

  it.each([
    { tag: 'v2026.8.4', commit: SANDBOX_BASELINE.commit },
    { tag: SANDBOX_BASELINE.tag, commit: '0'.repeat(40) },
  ])('fails closed on tag or commit drift', (identity) => {
    expect(() => validateSandboxIdentity(identity)).toThrow(/baseline drift/);
  });
});
