import { mkdtemp, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import {
  formatClaudeContextInventory,
  formatStartupContext,
  scanClaudeContextInventory,
  scanStartupContext,
  STANDARD_SONNET_BUDGET_TOKENS,
} from '../../../tools/lint/claude-context-inventory.mjs';

async function write(root: string, relPath: string, content: string) {
  const filePath = join(root, relPath);
  await mkdir(join(filePath, '..'), { recursive: true });
  await writeFile(filePath, content);
}

describe('lint:claude-context', () => {
  it('flags oversized skills and broad parallel dispatch instructions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-claude-context-'));
    await write(
      root,
      'agentic/code/frameworks/demo/skills/doc-sync/SKILL.md',
      `---
name: doc-sync
description: Demo
---

Dispatch 8 domain-specific auditor agents via parallel-dispatch.
${'x'.repeat(1024)}
`,
    );

    const result = await scanClaudeContextInventory({ rootDir: root, skillCeilingBytes: 512 });

    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].riskyPatterns).toContain('oversized-body');
    expect(result.violations[0].riskyPatterns).toContain('broad-parallel-dispatch');
    expect(formatClaudeContextInventory(result)).toContain('Flagged context risks');
  });

  it('flags subagents that preload skills at startup', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-claude-context-'));
    await write(
      root,
      'agentic/code/plugins/demo/agents/reviewer.md',
      `---
name: reviewer
description: Demo
skills:
  - doc-sync
---

Review code.
`,
    );

    const result = await scanClaudeContextInventory({ rootDir: root });

    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].startupBehavior).toContain('skills preload at startup');
    expect(result.violations[0].riskyPatterns).toEqual(['skills-preload']);
  });

  it('measures aggregate startup context and ranks rules as the dominant component', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-startup-'));
    await write(root, 'CLAUDE.md', 'a'.repeat(4000));
    await write(root, 'AGENTS.md', 'b'.repeat(400));
    await write(root, '.claude/rules/one.md', 'c'.repeat(40000));
    await write(root, '.claude/rules/two.md', 'd'.repeat(40000));

    const result = await scanStartupContext({ rootDir: root });

    expect(result.budgetTokens).toBe(STANDARD_SONNET_BUDGET_TOKENS);
    // Rules dominate (80k chars / 4 = 20k tokens) over memory files.
    expect(result.components[0].label).toBe('.claude/rules/*.md');
    expect(result.components[0].files).toBe(2);
    expect(result.totalTokens).toBe(21100);
    expect(result.status).toBe('ok');
    expect(formatStartupContext(result)).toContain('Startup context budget');
  });

  it('flags startup context that exceeds the standard Sonnet budget', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-startup-over-'));
    // ~210k tokens of rules — over the 200k standard window.
    await write(root, '.claude/rules/huge.md', 'x'.repeat(840000));

    const result = await scanStartupContext({ rootDir: root });

    expect(result.status).toBe('over');
    expect(result.totalTokens).toBeGreaterThan(STANDARD_SONNET_BUDGET_TOKENS);
    expect(formatStartupContext(result)).toContain('OVER BUDGET');
  });
});
