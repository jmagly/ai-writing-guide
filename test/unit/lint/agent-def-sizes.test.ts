import { mkdtemp, mkdir, readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

import {
  AGENT_DEF_CEILING_BYTES,
  AGENT_DEF_SIZE_ALLOWLIST,
  PACKAGED_CODEX_AGENT_TARGET_BYTES,
  formatAgentDefSizeReport,
  scanDeployedAgentDefSizes,
  scanPackagedCodexAgentDefSizes,
} from '../../../tools/lint/agent-def-sizes.mjs';

async function writeAgent(root: string, relDir: string, name: string, bytes: number) {
  const dir = join(root, relDir);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), 'x'.repeat(bytes));
}

describe('lint:agent-sizes', () => {
  it('does not allow-list oversized deployed agents', () => {
    expect(AGENT_DEF_SIZE_ALLOWLIST).toEqual({});
  });

  it('fails security-auditor when any deployed filename variant exceeds the ceiling', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-agent-size-'));
    await writeAgent(root, '.claude/agents', 'security-auditor.md', AGENT_DEF_CEILING_BYTES + 100);
    await writeAgent(root, '.github/agents', 'security-auditor.agent.md', AGENT_DEF_CEILING_BYTES + 100);

    const result = await scanDeployedAgentDefSizes({ rootDir: root });

    expect(result.allowedOversized).toEqual([]);
    expect(result.violations.map((item) => item.path)).toEqual([
      '.claude/agents/security-auditor.md',
      '.github/agents/security-auditor.agent.md',
    ]);
  });

  it('fails a non-exempt deployed agent over the ceiling', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-agent-size-'));
    await writeAgent(root, '.codex/agents', 'custom-large-agent.toml', AGENT_DEF_CEILING_BYTES + 1);

    const result = await scanDeployedAgentDefSizes({ rootDir: root });
    const report = formatAgentDefSizeReport(result);

    expect(result.violations).toEqual([
      {
        agentId: 'custom-large-agent',
        path: '.codex/agents/custom-large-agent.toml',
        size: AGENT_DEF_CEILING_BYTES + 1,
      },
    ]);
    expect(report).toContain('Oversized deployed agent definitions');
    expect(report).toContain('custom-large-agent.toml');
  });

  it('catches Codex serialization growth from a raw source below the ceiling', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-agent-size-'));
    const relPath = 'agentic/code/frameworks/example/agents/escaped.md';
    const sourcePath = join(root, relPath);
    await mkdir(dirname(sourcePath), { recursive: true });
    const body = Array.from({ length: 1050 }, () => 'quoted "line"').join('\n');
    const source = `---\nname: escaped\ndescription: Serialization regression fixture\n---\n\n${body}\n`;
    expect(Buffer.byteLength(source)).toBeLessThan(AGENT_DEF_CEILING_BYTES);
    await writeFile(sourcePath, source);

    const result = await scanPackagedCodexAgentDefSizes({
      rootDir: root,
      targetPaths: [],
    });

    expect(result.renderFailures).toEqual([]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({
      agentId: 'escaped',
      path: relPath,
      renderedPath: relPath.replace(/\.md$/, '.toml'),
    });
  });

  it('keeps the three Codex dispatch regressions below the headroom target', async () => {
    const rootDir = resolve(__dirname, '../../..');
    const result = await scanPackagedCodexAgentDefSizes({ rootDir });

    expect(result.renderFailures).toEqual([]);
    expect(result.targetScanned).toHaveLength(3);
    expect(result.targetViolations).toEqual([]);
    expect(result.targetScanned.every((item) => item.size <= PACKAGED_CODEX_AGENT_TARGET_BYTES)).toBe(true);
  });

  it('preserves each compacted agent core contract and discovery handoff', async () => {
    const rootDir = resolve(__dirname, '../../..');
    const expectations: Array<[string, string[]]> = [
      ['agentic/code/frameworks/forensics-complete/agents/log-analyst.md', [
        '## Required Deliverable',
        '## Quality and Safety Gates',
        'aiwg discover "log analyst worked examples"',
      ]],
      ['agentic/code/frameworks/research-complete/agents/quality-agent.md', [
        '## Required Deliverables',
        '### 4. Apply GRADE Separately',
        'aiwg discover "quality agent worked examples"',
      ]],
      ['agentic/code/frameworks/sdlc-complete/agents/ai-ml-engineer.md', [
        '## Required Deliverables',
        '## Safety and Reliability Constraints',
        'aiwg discover "AI ML engineer worked examples"',
      ]],
    ];

    for (const [relPath, required] of expectations) {
      const content = await readFile(join(rootDir, relPath), 'utf8');
      for (const fragment of required) expect(content).toContain(fragment);
    }
  });
});
