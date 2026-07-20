import { describe, expect, it } from 'vitest';
import { transformSkillModelPolicy } from '../../../tools/agents/providers/claude.mjs';

describe('Claude native skill model policy', () => {
  it('compiles legacy commandHint.model to a native turn-scoped model', () => {
    const output = transformSkillModelPolicy(`---
name: review
description: Review changes
commandHint:
  model: opus
---
Review the change.
`);
    expect(output).toMatch(/^model: opus$/m);
    expect(output).not.toMatch(/^effort:/m);
  });

  it('compiles canonical role and requested effort', () => {
    const output = transformSkillModelPolicy(`---
name: review
description: Review changes
commandHint:
  modelRole: efficiency
  modelTier: economy
  modelEffort: low
---
Review the change.
`);
    expect(output).toMatch(/^model: haiku$/m);
    expect(output).toMatch(/^effort: 1$/m);
  });

  it('does not add native fields when no skill model policy is requested', () => {
    const source = `---
name: review
description: Review changes
---
Review the change.
`;
    expect(transformSkillModelPolicy(source)).toBe(source);
  });
});
