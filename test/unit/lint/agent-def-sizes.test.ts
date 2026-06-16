import { mkdtemp, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import {
  AGENT_DEF_CEILING_BYTES,
  AGENT_DEF_SIZE_ALLOWLIST,
  formatAgentDefSizeReport,
  scanDeployedAgentDefSizes,
} from '../../../tools/lint/agent-def-sizes.mjs';

async function writeAgent(root: string, relDir: string, name: string, bytes: number) {
  const dir = join(root, relDir);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), 'x'.repeat(bytes));
}

describe('lint:agent-sizes', () => {
  it('requires a rationale for the only allow-listed oversized agent', () => {
    expect(Object.keys(AGENT_DEF_SIZE_ALLOWLIST)).toEqual(['security-auditor']);
    expect(AGENT_DEF_SIZE_ALLOWLIST['security-auditor']).toContain('#1587');
  });

  it('honors the security-auditor allow-list across deployed filename variants', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-agent-size-'));
    await writeAgent(root, '.claude/agents', 'security-auditor.md', AGENT_DEF_CEILING_BYTES + 100);
    await writeAgent(root, '.github/agents', 'security-auditor.agent.md', AGENT_DEF_CEILING_BYTES + 100);

    const result = await scanDeployedAgentDefSizes({ rootDir: root });

    expect(result.violations).toEqual([]);
    expect(result.allowedOversized).toHaveLength(2);
    expect(result.allowedOversized.every((item) => item.rationale.includes('#1587'))).toBe(true);
  });

  it('fails a non-exempt deployed agent over the ceiling', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-agent-size-'));
    await writeAgent(root, '.codex/agents', 'custom-large-agent.md', AGENT_DEF_CEILING_BYTES + 1);

    const result = await scanDeployedAgentDefSizes({ rootDir: root });
    const report = formatAgentDefSizeReport(result);

    expect(result.violations).toEqual([
      {
        agentId: 'custom-large-agent',
        path: '.codex/agents/custom-large-agent.md',
        size: AGENT_DEF_CEILING_BYTES + 1,
      },
    ]);
    expect(report).toContain('Oversized deployed agent definitions');
    expect(report).toContain('custom-large-agent.md');
  });
});
