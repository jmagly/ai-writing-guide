import { afterEach, describe, expect, it } from 'vitest';
import {
  mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  deployAgents,
  renderAgentToml,
} from '../../../tools/agents/providers/codex.mjs';

const source = `---
name: reviewer
description: Reviews code changes
model: claude-opus-4-7
model-effort: high
---

Inspect the changes and report concrete risks.
`;

describe('Codex native custom-agent TOML', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    dirs.length = 0;
  });

  it('renders the documented required fields and native model controls', () => {
    expect(renderAgentToml('/tmp/reviewer.md', source, {
      reasoning: 'gpt-5.4',
      coding: 'gpt-5.3-codex',
      efficiency: 'gpt-5.1-codex-mini',
    })).toBe([
      'name = "reviewer"',
      'description = "Reviews code changes"',
      'developer_instructions = "Inspect the changes and report concrete risks."',
      'model = "gpt-5.4"',
      'model_reasoning_effort = "high"',
      '',
    ].join('\n'));
  });

  it('deploys .toml rather than legacy Markdown agent files', () => {
    const root = mkdtempSync(join(tmpdir(), 'aiwg-codex-agent-toml-'));
    dirs.push(root);
    const sourcePath = join(root, 'reviewer.md');
    writeFileSync(sourcePath, source);

    deployAgents([sourcePath], root, {
      dryRun: false,
      force: true,
      provider: 'codex',
      deployVersion: 'test',
      deploySource: 'test',
    });

    const files = readdirSync(join(root, '.codex', 'agents'));
    expect(files).toContain('reviewer.toml');
    expect(files).not.toContain('reviewer.md');
    expect(readFileSync(join(root, '.codex', 'agents', 'reviewer.toml'), 'utf8'))
      .toContain('model = "gpt-5.4"');
  });
});
