/**
 * context-pipeline tests — sanitizer, allowlist, and AGENTS.md builder.
 *
 * Covers the security-critical sanitization and allowlist primitives from ADR-1 §2,
 * and the in-memory AGENTS.md construction. File-system emission is exercised by
 * the integration tests once the CLI wiring lands.
 */

import { describe, it, expect } from 'vitest';
import { homedir, tmpdir } from 'node:os';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  sanitizeDescription,
  sanitizeTag,
  sanitizeTags,
  checkPathAllowed,
  buildAgentsMd,
  generate,
  buildNormalizedAiwgMd,
  renderEntry,
} from '../../../src/smiths/context-pipeline/index.js';
import type { ContextPipelineOptions } from '../../../src/smiths/context-pipeline/index.js';

describe('sanitizeDescription', () => {
  it('accepts a plain ASCII description', async () => {
    const r = sanitizeDescription('Designs and evolves API contracts');
    expect(r.ok).toBe(true);
    expect(r.value).toBe('Designs and evolves API contracts');
  });

  it('rejects backticks (prompt-injection vector)', async () => {
    const r = sanitizeDescription('Has `code` in it');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toBe('backtick');
  });

  it('rejects code fences', async () => {
    const r = sanitizeDescription('Has ```fence``` in it');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toMatch(/backtick|code fence/);
  });

  it('rejects HTML tags', async () => {
    const r = sanitizeDescription('Has <script>alert(1)</script>');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toBe('HTML tag');
  });

  it('rejects absolute URL schemes', async () => {
    const r = sanitizeDescription('See https://evil.example.com for details');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toBe('absolute URL');
  });

  it('rejects control characters', async () => {
    const r = sanitizeDescription('null byte\x00here');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toBe('control character');
  });

  it('rejects empty strings', async () => {
    expect(sanitizeDescription('').ok).toBe(false);
    expect(sanitizeDescription('   ').ok).toBe(false);
  });

  it('truncates descriptions over 120 chars with ellipsis', async () => {
    const long = 'a'.repeat(200);
    const r = sanitizeDescription(long);
    expect(r.ok).toBe(true);
    expect(r.value.length).toBe(120);
    expect(r.value.endsWith('…')).toBe(true);
  });

  it('preserves descriptions exactly at the limit', async () => {
    const exactly = 'a'.repeat(120);
    const r = sanitizeDescription(exactly);
    expect(r.ok).toBe(true);
    expect(r.value.length).toBe(120);
    expect(r.value.endsWith('…')).toBe(false);
  });
});

describe('sanitizeTag', () => {
  it('accepts kebab-case tags', async () => {
    expect(sanitizeTag('security').ok).toBe(true);
    expect(sanitizeTag('api-design').ok).toBe(true);
  });

  it('rejects whitespace in tags', async () => {
    const r = sanitizeTag('two words');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toBe('whitespace in tag');
  });

  it('rejects backticks in tags', async () => {
    expect(sanitizeTag('back`tick').ok).toBe(false);
  });
});

describe('sanitizeTags', () => {
  it('keeps valid tags and reports rejected ones', async () => {
    const result = sanitizeTags(['security', 'has spaces', 'ok-tag']);
    expect(result.kept).toEqual(['security', 'ok-tag']);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]).toContain('has spaces');
  });
});

describe('checkPathAllowed', () => {
  it('accepts known project-scope provider paths', async () => {
    expect(checkPathAllowed('.codex/agents/api-designer.md').ok).toBe(true);
    expect(checkPathAllowed('.codex/commands/deploy.md').ok).toBe(true);
    expect(checkPathAllowed('.codex/rules/no-attribution.md').ok).toBe(true);
    expect(checkPathAllowed('.codex/skills/address-issues/SKILL.md').ok).toBe(true);
    expect(checkPathAllowed('.claude/agents/security-architect.md').ok).toBe(true);
    expect(checkPathAllowed('.agents/skills/address-issues/SKILL.md').ok).toBe(true);
  });

  it('strips leading ./ and accepts the result', async () => {
    expect(checkPathAllowed('./.codex/agents/foo.md').ok).toBe(true);
  });

  it('rejects paths outside the AIWG-owned prefix list', async () => {
    expect(checkPathAllowed('foo/bar.md').ok).toBe(false);
    expect(checkPathAllowed('src/evil.ts').ok).toBe(false);
    expect(checkPathAllowed('.evil/foo.md').ok).toBe(false);
  });

  it('rejects parent-directory traversal', async () => {
    const r = checkPathAllowed('.codex/../etc/passwd');
    expect(r.ok).toBe(false);
    expect(r.rejectedFor).toMatch(/parent-dir/);
  });

  it('rejects absolute paths outside home directory', async () => {
    expect(checkPathAllowed('/etc/passwd').ok).toBe(false);
    expect(checkPathAllowed('/usr/local/bin/aiwg').ok).toBe(false);
  });

  it('accepts ~/.agents/skills/ user-scope path', async () => {
    const r = checkPathAllowed('~/.agents/skills/address-issues/SKILL.md');
    expect(r.ok).toBe(true);
    expect(r.isUserScope).toBe(true);
  });

  it('accepts ~/.codex/skills/ user-scope path', async () => {
    const r = checkPathAllowed('~/.codex/skills/foo/SKILL.md');
    expect(r.ok).toBe(true);
    expect(r.isUserScope).toBe(true);
  });

  it('accepts absolute home paths and tags as user-scope', async () => {
    const homePath = `${homedir()}/.agents/skills/foo/SKILL.md`.replace(/\\/g, '/');
    const r = checkPathAllowed(homePath);
    expect(r.ok).toBe(true);
    expect(r.isUserScope).toBe(true);
  });

  it('rejects user-scope paths outside the user-scope allowlist', async () => {
    const r = checkPathAllowed('~/.evil/skills/foo.md');
    expect(r.ok).toBe(false);
    expect(r.isUserScope).toBe(true);
  });

  it('rejects empty string', async () => {
    expect(checkPathAllowed('').ok).toBe(false);
  });
});

describe('renderEntry', () => {
  it('renders a basic entry', async () => {
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

  it('drops entries with rejected paths', async () => {
    const r = renderEntry({
      id: 'evil',
      description: 'plain text',
      path: '/etc/passwd',
    });
    expect(r.markdown).toBeNull();
    expect(r.warning).toContain('path rejected');
  });

  it('drops entries with rejected descriptions', async () => {
    const r = renderEntry({
      id: 'tricky',
      description: 'has `backticks` here',
      path: '.codex/agents/tricky.md',
    });
    expect(r.markdown).toBeNull();
    expect(r.warning).toContain('description rejected');
  });

  it('emits SAFETY-CRITICAL marker when flagged', async () => {
    const r = renderEntry({
      id: 'human-authorization',
      description: 'Require operator approval before irreversible actions',
      path: '.codex/rules/human-authorization.md',
      safetyCritical: true,
    });
    expect(r.markdown).toContain('(SAFETY-CRITICAL)');
  });

  it('emits SHADOWED marker when shadowedBy is set', async () => {
    const r = renderEntry({
      id: 'human-authorization',
      description: 'Require operator approval before irreversible actions',
      path: '.codex/rules/human-authorization.md',
      safetyCritical: true,
      shadowedBy: '.aiwg/extensions/foo/rules/human-authorization.md',
    });
    expect(r.markdown).toContain('(SAFETY-CRITICAL, SHADOWED');
  });

  it('emits user-scope marker for ~/.agents/skills/ paths', async () => {
    const r = renderEntry({
      id: 'user-skill',
      description: 'A user-scope skill',
      path: '~/.agents/skills/user-skill/SKILL.md',
    });
    expect(r.markdown).toContain('user-scope; loader may not auto-resolve');
  });

  it('renders sanitized tags', async () => {
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

  it('emits Framework Context section with AIWG.md link', async () => {
    const { content } = await buildAgentsMd(baseOpts);
    expect(content).toContain('## Framework Context');
    expect(content).toContain('[AIWG.md](./AIWG.md)');
  });

  it('emits the AIWG signature comment', async () => {
    const { content } = await buildAgentsMd(baseOpts);
    expect(content).toContain('<!-- aiwg-managed -->');
  });

  it('does not inline a link-index of deployed artifacts (#1239)', async () => {
    const { content, splitOccurred, spilloverContent } = await buildAgentsMd(baseOpts);
    expect(content).not.toContain('Path: `.codex/agents/api-designer.md`');
    expect(content).not.toContain('**api-designer**');
    expect(content).not.toContain('.codex/agents/api-designer.md');
    expect(splitOccurred).toBe(false);
    expect(spilloverContent).toBe('');
  });

  it('emits a minimal canonical graph bootstrap instead of duplicating quickref detail', async () => {
    const { content } = await buildAgentsMd(baseOpts);
    expect(content.indexOf('WORKSPACE.md')).toBeLessThan(content.indexOf('AIWG.md'));
    expect(content).not.toContain('## Tier 2 Capability Map');
    expect(content).not.toContain('api-designer');
  });

  it('keeps the startup adapter constant-size for a large deployed corpus', async () => {
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
        {
          type: 'skills',
          entries: Array.from({ length: 500 }, (_, i) => ({
            id: `skill-${i}`,
            description: `Skill number ${i} with some descriptive text`,
            path: `.codex/skills/skill-${i}/SKILL.md`,
          })),
        },
      ],
    };
    const { content } = await buildAgentsMd(huge);
    expect(content).not.toContain('agent-0');
    expect(content).not.toContain('skill-0');
    expect(content).not.toContain('agent-499');
    expect(content).not.toContain('skill-499');
    expect(Buffer.byteLength(content, 'utf8')).toBeLessThan(2 * 1024);
  });

  it('does not inspect or inline deployed artifact IDs', async () => {
    const opts: ContextPipelineOptions = {
      ...baseOpts,
      sections: [
        {
          type: 'agents',
          entries: [
            {
              id: 'bad`id',
              description: 'Plain description',
              path: '.codex/agents/bad-id.md',
            },
          ],
        },
      ],
    };
    const { content } = await buildAgentsMd(opts);
    expect(content).not.toContain('bad`id');
  });

  it('points readers at aiwg discover / aiwg show', async () => {
    const { content } = await buildAgentsMd(baseOpts);
    expect(content).toContain('aiwg discover');
    expect(content).toContain('aiwg show');
    expect(content).not.toContain('## Context Finalization');
  });

  it('stays well under the 30KB soft threshold', async () => {
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
    const { content } = await buildAgentsMd(huge);
    expect(Buffer.byteLength(content, 'utf8')).toBeLessThan(2 * 1024);
  });

  it('routes project context to WORKSPACE.md instead of inlining it', async () => {
    const opts: ContextPipelineOptions = {
      ...baseOpts,
      projectContext: 'A short project description.',
    };
    const { content, warnings } = await buildAgentsMd(opts);
    expect(content).not.toContain('A short project description.');
    expect(warnings.some((warning) => warning.includes('WORKSPACE.md'))).toBe(true);
  });

  it('routes even legacy projectContext input to WORKSPACE.md', async () => {
    const opts: ContextPipelineOptions = {
      ...baseOpts,
      projectContext: 'Has `backticks` everywhere',
    };
    const { content, warnings } = await buildAgentsMd(opts);
    expect(content).not.toContain('## Project Context');
    expect(warnings.some((w) => w.includes('WORKSPACE.md'))).toBe(true);
  });

  it('emits the AGENTS.override.md trailer', async () => {
    const { content } = await buildAgentsMd(baseOpts);
    expect(content).toContain('AGENTS.override.md');
  });

  it('emits no warnings for a deploy with backtick-bearing artifact descriptions (#1239)', async () => {
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
    const { warnings } = await buildAgentsMd(opts);
    expect(warnings).toEqual([]);
  });
});

describe('context finalization emission', () => {
  function makeTmpDir(): string {
    const dir = join(tmpdir(), `aiwg-context-pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  it('builds normalized .aiwg/AIWG.md without erasing operator-authored content', async () => {
    const content = await buildNormalizedAiwgMd('/tmp/test-project', '# Local AIWG Notes\n\nOperator note.\n');

    expect(content).toContain('Operator note.');
    expect(content).toContain('<!-- aiwg-managed -->');
    expect(content).toContain('## Context Finalization');
    expect(content).toContain('`.aiwg/AIWG.md` is the normalized project-local context entry point.');
  });

  it('refreshes the managed finalization block idempotently', async () => {
    const first = await buildNormalizedAiwgMd('/tmp/test-project', '# Local AIWG Notes\n\nOperator note.\n');
    const second = await buildNormalizedAiwgMd('/tmp/test-project', first);

    expect(second).toContain('Operator note.');
    expect(second.match(/aiwg-context-finalization:START/g)).toHaveLength(1);
    expect(second.match(/aiwg-context-finalization:END/g)).toHaveLength(1);
    expect(second.match(/## Context Finalization/g)).toHaveLength(1);
  });

  it('emits root, normalized, and provider twin context files with discover-first guidance', async () => {
    const dir = makeTmpDir();
    try {
      mkdirSync(join(dir, '.aiwg'), { recursive: true });
      writeFileSync(join(dir, '.aiwg', 'aiwg.config'), JSON.stringify({
        version: '1',
        providers: ['copilot'],
        installed: {
          sdlc: {
            version: '2026.5.7',
            source: 'bundled',
            installedAt: '2026-05-15T00:00:00.000Z',
            deployedTo: {
              copilot: { agents: 1, commands: 0, skills: 1, rules: 1 },
            },
          },
        },
        scripts: {},
        remotes: {
          primary: 'origin',
          issue_tracker: 'origin',
          ci: 'origin',
          secondary: [{ name: 'github', purpose: 'backup-mirror' }],
        },
        delivery: {
          mode: 'pr-required',
          issue_storage: 'gitea-only',
        },
      }, null, 2));

      const result = await generate({
        provider: 'copilot',
        projectPath: dir,
        sections: [],
        detectExistingFiles: true,
      });

      expect(result.aiwgMdPath).toBe(join(dir, 'AIWG.md'));
      expect(result.agentsMdPath).toBe(join(dir, 'AGENTS.md'));
      expect(result.normalizedAiwgMdPath).toBe(join(dir, '.aiwg', 'AIWG.md'));
      expect(result.twinPaths).toContain(join(dir, '.github', 'copilot-instructions.md'));

      for (const file of [result.aiwgMdPath, result.normalizedAiwgMdPath]) {
        const content = readFileSync(file, 'utf8');
        expect(content).toContain('aiwg discover');
        expect(content).toContain('aiwg show');
        expect(content).toContain('decline-without-search');
        // #1542: directive classification + act-don't-ask + command discovery hint
        expect(content).toContain('new directive');
        expect(content).toContain('address-issues');
        expect(content).toContain('show command');
        expect(content).toContain('.aiwg/aiwg.config');
        expect(content).toContain('Tracker Authority Protocol');
        expect(content).toContain('Internal/canonical tracker: `origin` (gitea;');
        expect(content).toContain('Customer issue tracker: not configured');
        expect(content).toContain('MCP/app tools for the configured tracker');
        expect(content).toContain('Git SSH remote access is repository sync, not issue-tracker API access');
      }
      for (const file of [result.agentsMdPath, ...result.twinPaths]) {
        const content = readFileSync(file, 'utf8');
        expect(content.indexOf('WORKSPACE.md')).toBeLessThan(content.indexOf('AIWG.md'));
        expect(content).toContain('aiwg discover');
        expect(content).toContain('.aiwg/aiwg.config');
        expect(content).not.toContain('Tracker Authority Protocol');
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('preserves operator override files while refreshing generated tracker protocol (#1735)', async () => {
    const dir = makeTmpDir();
    const overridePath = join(dir, 'AGENTS.override.md');
    const configPath = join(dir, '.aiwg', 'aiwg.config');
    try {
      mkdirSync(join(dir, '.aiwg'), { recursive: true });
      writeFileSync(overridePath, '# AGENTS.override.md\n\nOperator tracker notes stay here.\n', 'utf8');
      writeFileSync(configPath, JSON.stringify({
        version: '1',
        providers: ['codex'],
        installed: {},
        scripts: {},
        remotes: {
          primary: 'origin',
          issue_tracker: 'origin',
          ci: 'origin',
        },
        delivery: {
          mode: 'pr-required',
          issue_storage: 'gitea-only',
        },
      }, null, 2));

      await generate({ provider: 'codex', projectPath: dir, sections: [], detectExistingFiles: true });
      writeFileSync(configPath, JSON.stringify({
        version: '1',
        providers: ['codex'],
        installed: {},
        scripts: {},
        remotes: {
          primary: 'origin',
          issue_tracker: 'github',
          ci: 'origin',
          secondary: [{ name: 'origin', purpose: 'primary-repo' }],
        },
        delivery: {
          mode: 'pr-required',
          issue_storage: 'github-only',
        },
      }, null, 2));

      await generate({ provider: 'codex', projectPath: dir, sections: [], detectExistingFiles: true });

      expect(readFileSync(overridePath, 'utf8')).toBe('# AGENTS.override.md\n\nOperator tracker notes stay here.\n');
      const normalized = readFileSync(join(dir, '.aiwg', 'AIWG.md'), 'utf8');
      expect(normalized).toContain('Tracker Authority Protocol');
      expect(normalized).toContain('Internal/canonical tracker: `github` (github;');
      expect(normalized).toContain('Issue storage mode: github-only');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // #1597/#1579: an operator-owned provider twin must not be skipped — the @AIWG.md
  // hook is installed ADDITIVELY (content preserved, no --force) so discover-first
  // isn't buried. (Supersedes the old warn-and-skip behavior.)
  it('additively installs the canonical graph hook into an operator-owned twin, preserving content (#1579/#1597)', async () => {
    const dir = makeTmpDir();
    try {
      mkdirSync(join(dir, '.aiwg'), { recursive: true });
      const staleWarp = '# My hand-rolled WARP context\n\nNothing AIWG here.\n';
      writeFileSync(join(dir, 'WARP.md'), staleWarp);

      const result = await generate({ provider: 'warp', projectPath: dir, sections: [], detectExistingFiles: true });

      const after = readFileSync(join(dir, 'WARP.md'), 'utf8');
      // operator content preserved byte-for-byte (original is a prefix) ...
      expect(after.startsWith(staleWarp.replace(/\n+$/, '\n'))).toBe(true);
      expect(after).toContain('# My hand-rolled WARP context');
      expect(after).toContain('Nothing AIWG here.');
      // ... and the additive canonical graph hook is now present.
      expect(after).toContain('<!-- AIWG:context-hook:start -->');
      expect(after.indexOf('WORKSPACE.md')).toBeLessThan(after.indexOf('AIWG.md'));
      expect(result.twinPaths).toContain(join(dir, 'WARP.md'));
      const msg = result.warnings.find((w) => w.includes('WARP.md'));
      expect(msg).toBeDefined();
      expect(msg).toContain('WORKSPACE.md → AIWG.md hook additively');

      // idempotent: a second regenerate leaves it byte-identical, message says so.
      const result2 = await generate({ provider: 'warp', projectPath: dir, sections: [], detectExistingFiles: true });
      expect(readFileSync(join(dir, 'WARP.md'), 'utf8')).toBe(after);
      expect(result2.warnings.find((w) => w.includes('WARP.md') && w.includes('already loads'))).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('additively installs the canonical graph hook into operator-owned AGENTS.md without --force (#1597)', async () => {
    const dir = makeTmpDir();
    try {
      mkdirSync(join(dir, '.aiwg'), { recursive: true });
      const staleAgents = '# AGENTS.md\n\n## AIWG Framework\n\nOlder inline content, no hook.\n';
      writeFileSync(join(dir, 'AGENTS.md'), staleAgents);

      const result = await generate({ provider: 'codex', projectPath: dir, sections: [], detectExistingFiles: true });

      const after = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
      expect(after).toContain('Older inline content, no hook.'); // preserved
      expect(after.indexOf('WORKSPACE.md')).toBeLessThan(after.indexOf('AIWG.md'));
      expect(after).toContain('<!-- AIWG:context-hook:start -->');
      expect(result.agentsMdPath).toBe(join(dir, 'AGENTS.md'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
