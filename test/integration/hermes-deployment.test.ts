import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import { mkdtempSync, rmSync } from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const REPO_ROOT = path.resolve(__dirname, '../..');

function deployHermes(projectDir: string, homeDir: string): void {
  execFileSync(
    process.execPath,
    [
      path.join(REPO_ROOT, 'tools/agents/deploy-agents.mjs'),
      '--provider', 'hermes',
      '--mode', 'sdlc',
      '--target', projectDir,
      '--deploy-skills',
      '--deploy-rules',
    ],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir },
      stdio: 'pipe',
      timeout: 120_000,
    },
  );
}

describe('Hermes deployment', () => {
  it('delivers rules through AGENTS.md and CLI pointers without requiring MCP', async () => {
    const projectDir = mkdtempSync(path.join(os.tmpdir(), 'aiwg-hermes-project-'));
    const homeDir = mkdtempSync(path.join(os.tmpdir(), 'aiwg-hermes-home-'));
    try {
      execFileSync('git', ['init'], { cwd: projectDir, stdio: 'pipe' });
      deployHermes(projectDir, homeDir);

      const agentsMd = await fs.readFile(path.join(projectDir, 'AGENTS.md'), 'utf8');
      const ruleHeadings = agentsMd.match(/^### Rule:/gm) ?? [];

      expect(ruleHeadings.length).toBeGreaterThanOrEqual(7);
      expect(agentsMd).toContain('aiwg show rule <name>');
      expect(agentsMd).toContain('aiwg discover "rule <topic>" --type rule');
      expect(agentsMd).toContain('MCP is optional');
      expect(agentsMd).toContain('mcp_aiwg_rule_show');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
      rmSync(homeDir, { recursive: true, force: true });
    }
  });
});
