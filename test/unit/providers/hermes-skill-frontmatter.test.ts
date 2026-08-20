import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// @ts-expect-error - .mjs provider helper has no declaration file.
import { stripPlatformsFromContent } from '../../../tools/agents/providers/base.mjs';
// @ts-expect-error - .mjs provider helper has no declaration file.
import { transformHermesSkillContent } from '../../../tools/agents/providers/hermes.mjs';

describe('Hermes skill frontmatter compatibility', () => {
  it('removes an inline AIWG platforms field without changing the body', () => {
    const source = `---
name: review
platforms: [all]
description: Review a change
---
Body mentions platforms: [all].
`;

    const output = stripPlatformsFromContent(source);

    expect(output).not.toMatch(/^platforms:/m);
    expect(output).toContain('Body mentions platforms: [all].');
  });

  it('removes a multiline platforms field and preserves following metadata', () => {
    const source = `---
name: review
platforms:
  - claude-code
  - hermes
metadata:
  hermes:
    tags: [review]
---
Review a change.
`;

    const output = stripPlatformsFromContent(source);

    expect(output).not.toMatch(/^platforms:/m);
    expect(output).toContain('metadata:\n  hermes:\n    tags: [review]');
  });

  it('removes platforms when it is the final frontmatter field', () => {
    const source = `---
name: memory-lint
description: Validate semantic memory
platforms: [claude, hermes]
---
Validate memory.
`;

    expect(stripPlatformsFromContent(source)).not.toMatch(/^platforms:/m);
  });

  it('ships aiwg-orchestrate with documented Hermes metadata', () => {
    const template = readFileSync(resolve(
      'agentic/code/frameworks/sdlc-complete/templates/hermes/skills/aiwg-orchestrate/SKILL.md',
    ), 'utf8');

    expect(template).toContain('version: 1.2.0');
    expect(template).toContain('metadata:\n  hermes-tags: "aiwg,sdlc,artifacts,delegation,mcp"');

    const deployed = transformHermesSkillContent(template);
    expect(deployed).not.toMatch(/^platforms:/m);
    expect(deployed).toContain('metadata:\n  hermes:\n    tags:');
    expect(deployed).toContain('    - aiwg');
    expect(deployed).not.toContain('hermes-tags');
  });
});
