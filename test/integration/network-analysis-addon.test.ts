import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { UseHandler } from '../../src/cli/handlers/use.js';

const root = path.resolve(import.meta.dirname, '../..');
const projects: string[] = [];

function context(project: string, provider: string) {
  return {
    args: ['network-analysis', '--target', project, '--provider', provider, '--copy-all'],
    rawArgs: ['network-analysis', '--target', project, '--provider', provider, '--copy-all'],
    cwd: project,
    frameworkRoot: root,
  };
}

afterEach(async () => {
  await Promise.all(projects.splice(0).map(project => rm(project, { recursive: true, force: true })));
});

describe('network-analysis addon deployment (#2272)', () => {
  for (const deployment of [
    { provider: 'claude', skill: '.claude/.aiwg/skills/analyze-network-capture/SKILL.md' },
    { provider: 'codex', skill: '.agents/skills/analyze-network-capture/SKILL.md' },
  ]) {
    it(`round-trips governed content for ${deployment.provider}`, async () => {
      const project = await mkdtemp(path.join(os.tmpdir(), `aiwg-network-${deployment.provider}-`));
      projects.push(project);
      const result = await new UseHandler().execute(context(project, deployment.provider));
      expect(result.exitCode, result.message).toBe(0);
      await expect(access(path.join(project, deployment.skill))).resolves.toBeUndefined();
      const deployed = await readFile(path.join(project, deployment.skill), 'utf8');
      expect(deployed).toContain('Analyze Network Capture');
      expect(deployed).toContain('offline-only and metadata-only');
      expect(deployed).toContain('network-analysis-safety.md');
    });
  }
});
