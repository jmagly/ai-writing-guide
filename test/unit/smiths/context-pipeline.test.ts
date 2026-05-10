/**
 * context-pipeline tests — sanitizer, allowlist, and AGENTS.md builder.
 *
 * Covers the security-critical sanitization and allowlist primitives from ADR-1 §2,
 * and the in-memory AGENTS.md construction. File-system emission is exercised by
 * the integration tests once the CLI wiring lands.
 */

import { describe, it, expect } from 'vitest';
import { homedir } from 'node:os';
import {
  sanitizeDescription,
  sanitizeTag,
  sanitizeTags,
  checkPathAllowed,
  buildAgentsMd,
  renderEntry,
} from '../../../src/smiths/context-pipeline/index.js';
import type { ContextPipelineOptions } from '../../../src/smiths/context-pipeline/index.js';

describe('sanitizeDescription', () => {
  it('accepts a plain ASCII description', () => {
    const r = sanitizeDescription('Designs and evolves API contracts');
    expect(r.ok).toBe(true);
    expect(r.value).toBe('Designs and evolves API contracts');
  });

  it('rejects backticks (prompt-injection vector)', () => {
    const r = sanitizeDescription('Has `code` in it');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toBe('backtick');
  });

  it('rejects code fences', () => {
    const r = sanitizeDescription('Has ```fence``` in it');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toMatch(/backtick|code fence/);
  });

  it('rejects HTML tags', () => {
    const r = sanitizeDescription('Has <script>alert(1)</script>');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toBe('HTML tag');
  });

  it('rejects absolute URL schemes', () => {
    const r = sanitizeDescription('See https://evil.example.com for details');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toBe('absolute URL');
  });

  it('rejects control characters', () => {
    const r = sanitizeDescription('null byte\x00here');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toBe('control character');
  });

  it('rejects empty strings', () => {
    expect(sanitizeDescription('').ok).toBe(false);
    expect(sanitizeDescription('   ').ok).toBe(false);
  });

  it('truncates descriptions over 120 chars with ellipsis', () => {
    const long = 'a'.repeat(200);
    const r = sanitizeDescription(long);
    expect(r.ok).toBe(true);
    expect(r.value.length).toBe(120);
    expect(r.value.endsWith('…')).toBe(true);
  });

  it('preserves descriptions exactly at the limit', () => {
    const exactly = 'a'.repeat(120);
    const r = sanitizeDescription(exactly);
    expect(r.ok).toBe(true);
    expect(r.value.length).toBe(120);
    expect(r.value.endsWith('…')).toBe(false);
  });
});

describe('sanitizeTag', () => {
  it('accepts kebab-case tags', () => {
    expect(sanitizeTag('security').ok).toBe(true);
    expect(sanitizeTag('api-design').ok).toBe(true);
  });

  it('rejects whitespace in tags', () => {
    const r = sanitizeTag('two words');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toBe('whitespace in tag');
  });

  it('rejects backticks in tags', () => {
    expect(sanitizeTag('back`tick').ok).toBe(false);
  });
});

describe('sanitizeTags', () => {
  it('keeps valid tags and reports rejected ones', () => {
    const result = sanitizeTags(['security', 'has spaces', 'ok-tag']);
    expect(result.kept).toEqual(['security', 'ok-tag']);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]).toContain('has spaces');
  });
});

describe('checkPathAllowed', () => {
  it('accepts known project-scope provider paths', () => {
    expect(checkPathAllowed('.codex/agents/api-designer.md').ok).toBe(true);
    expect(checkPathAllowed('.codex/commands/deploy.md').ok).toBe(true);
    expect(checkPathAllowed('.codex/rules/no-attribution.md').ok).toBe(true);
    expect(checkPathAllowed('.codex/skills/address-issues/SKILL.md').ok).toBe(true);
    expect(checkPathAllowed('.claude/agents/security-architect.md').ok).toBe(true);
    expect(checkPathAllowed('.agents/skills/address-issues/SKILL.md').ok).toBe(true);
  });

  it('strips leading ./ and accepts the result', () => {
    expect(checkPathAllowed('./.codex/agents/foo.md').ok).toBe(true);
  });

  it('rejects paths outside the AIWG-owned prefix list', () => {
    expect(checkPathAllowed('foo/bar.md').ok).toBe(false);
    expect(checkPathAllowed('src/evil.ts').ok).toBe(false);
    expect(checkPathAllowed('.evil/foo.md').ok).toBe(false);
  });

  it('rejects parent-directory traversal', () => {
    const r = checkPathAllowed('.codex/../etc/passwd');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toMatch(/parent-dir/);
  });

  it('rejects absolute paths outside home directory', () => {
    expect(checkPathAllowed('/etc/passwd').ok).toBe(false);
    expect(checkPathAllowed('/usr/local/bin/aiwg').ok).toBe(false);
  });

  it('accepts ~/.agents/skills/ user-scope path', () => {
    const r = checkPathAllowed('~/.agents/skills/address-issues/SKILL.md');
    expect(r.ok).toBe(true);
    expect(r.isUserScope).toBe(true);
  });

  it('accepts ~/.codex/skills/ user-scope path', () => {
    const r = checkPathAllowed('~/.codex/skills/foo/SKILL.md');
    expect(r.ok).toBe(true);
    expect(r.isUserScope).toBe(true);
  });

  it('accepts absolute home paths and tags as user-scope', () => {
    const homePath = `${homedir()}/.agents/skills/foo/SKILL.md`.replace(/\\/g, '/');
    const r = checkPathAllowed(homePath);
    expect(r.ok).toBe(true);
    expect(r.isUserScope).toBe(true);
  });

  it('rejects user-scope paths outside the user-scope allowlist', () => {
    const r = checkPathAllowed('~/.evil/skills/foo.md');
    expect(r.ok).toBe(false);
    expect(r.isUserScope).toBe(true);
  });

  it('rejects empty string', () => {
    expect(checkPathAllowed('').ok).toBe(false);
  });
});

describe('renderEntry', () => {
  it('renders a basic entry', () => {
    const r = renderEntry({
      id: 'api-designer',
      description: 'Designs API contracts',
      path: '.codex/agents/api-designer.md',
    });
    expect(r.markdown).toContain('**api-designer**');
    expect(r.markdown).toContain('Designs API contracts');
    expect(r.markdown).toContain('.codex/agents/api-designer.md');
    expect(r.warning).toBe('');
  });

  it('drops entries with rejected paths', () => {
    const r = renderEntry({
      id: 'evil',
      description: 'plain text',
      path: '/etc/passwd',
    });
    expect(r.markdown).toBeNull();
    expect(r.warning).toContain('path rejected');
  });

  it('drops entries with rejected descriptions', () => {
    const r = renderEntry({
      id: 'tricky',
      description: 'has `backticks` here',
      path: '.codex/agents/tricky.md',
    });
    expect(r.markdown).toBeNull();
    expect(r.warning).toContain('description rejected');
  });

  it('emits SAFETY-CRITICAL marker when flagged', () => {
    const r = renderEntry({
      id: 'human-authorization',
      description: 'Require operator approval before irreversible actions',
      path: '.codex/rules/human-authorization.md',
      safetyCritical: true,
    });
    expect(r.markdown).toContain('(SAFETY-CRITICAL)');
  });

  it('emits SHADOWED marker when shadowedBy is set', () => {
    const r = renderEntry({
      id: 'human-authorization',
      description: 'Require operator approval before irreversible actions',
      path: '.codex/rules/human-authorization.md',
      safetyCritical: true,
      shadowedBy: '.aiwg/extensions/foo/rules/human-authorization.md',
    });
    expect(r.markdown).toContain('(SAFETY-CRITICAL, SHADOWED');
  });

  it('emits user-scope marker for ~/.agents/skills/ paths', () => {
    const r = renderEntry({
      id: 'user-skill',
      description: 'A user-scope skill',
      path: '~/.agents/skills/user-skill/SKILL.md',
    });
    expect(r.markdown).toContain('user-scope; loader may not auto-resolve');
  });

  it('renders sanitized tags', () => {
    const r = renderEntry({
      id: 'thing',
      description: 'A thing',
      path: '.codex/agents/thing.md',
      tags: ['design', 'api', 'has spaces'],
    });
    expect(r.markdown).toContain('Tags: design, api');
    expect(r.markdown).not.toContain('has spaces');
  });
});

describe('buildAgentsMd', () => {
  const baseOpts: ContextPipelineOptions = {
    provider: 'codex',
    projectPath: '/tmp/test-project',
    sections: [
      {
        type: 'agents',
        entries: [
          {
            id: 'api-designer',
            description: 'Designs API contracts',
            path: '.codex/agents/api-designer.md',
          },
        ],
      },
    ],
  };

  it('emits Framework Context section with AIWG.md link', () => {
    const { content } = buildAgentsMd(baseOpts);
    expect(content).toContain('## Framework Context');
    expect(content).toContain('[AIWG.md](./AIWG.md)');
  });

  it('emits the AIWG signature comment', () => {
    const { content } = buildAgentsMd(baseOpts);
    expect(content).toContain('<!-- aiwg-managed -->');
  });

  it('does not inline a link-index of deployed artifacts (#1239)', () => {
    const { content, splitOccurred, spilloverContent } = buildAgentsMd(baseOpts);
    expect(content).not.toContain('## Agents');
    expect(content).not.toContain('**api-designer**');
    expect(content).not.toContain('.codex/agents/api-designer.md');
    expect(splitOccurred).toBe(false);
    expect(spilloverContent).toBe('');
  });

  it('points readers at aiwg discover / aiwg show', () => {
    const { content } = buildAgentsMd(baseOpts);
    expect(content).toContain('aiwg discover');
    expect(content).toContain('aiwg show');
  });

  it('stays well under the 30KB soft threshold', () => {
    const huge: ContextPipelineOptions = {
      ...baseOpts,
      sections: [
        {
          type: 'agents',
          entries: Array.from({ length: 500 }, (_, i) => ({
            id: `agent-${i}`,
            description: `Agent number ${i} with some descriptive text`,
            path: `.codex/agents/agent-${i}.md`,
          })),
        },
      ],
    };
    const { content } = buildAgentsMd(huge);
    expect(Buffer.byteLength(content, 'utf8')).toBeLessThan(4 * 1024);
  });

  it('includes Project Context when provided', () => {
    const opts: ContextPipelineOptions = {
      ...baseOpts,
      projectContext: 'A short project description.',
    };
    const { content } = buildAgentsMd(opts);
    expect(content).toContain('## Project Context');
    expect(content).toContain('A short project description.');
  });

  it('skips Project Context with sanitization warning when content is rejected', () => {
    const opts: ContextPipelineOptions = {
      ...baseOpts,
      projectContext: 'Has `backticks` everywhere',
    };
    const { content, warnings } = buildAgentsMd(opts);
    expect(content).not.toContain('## Project Context');
    expect(warnings.some((w) => w.includes('Project Context'))).toBe(true);
  });

  it('emits the AGENTS.override.md trailer', () => {
    const { content } = buildAgentsMd(baseOpts);
    expect(content).toContain('AGENTS.override.md');
  });

  it('emits no warnings for a deploy with backtick-bearing artifact descriptions (#1239)', () => {
    // Pre-#1239 the link-index ran every description through the sanitizer
    // and rejected backtick-bearing entries with a warning. The thin-pointer
    // body never sees `opts.sections`, so those warnings stop firing.
    const opts: ContextPipelineOptions = {
      ...baseOpts,
      sections: [
        {
          type: 'agents',
          entries: [
            {
              id: 'aiwg-finder',
              description: 'Runs the `aiwg discover` + `aiwg show` pipeline',
              path: '.codex/agents/aiwg-finder.md',
            },
          ],
        },
      ],
    };
    const { warnings } = buildAgentsMd(opts);
    expect(warnings).toEqual([]);
  });
});
