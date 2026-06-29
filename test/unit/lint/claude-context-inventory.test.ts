import { mkdtemp, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import {
  formatClaudeContextInventory,
  scanClaudeContextInventory,
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
      'plugins/demo/agents/reviewer.md',
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
});
