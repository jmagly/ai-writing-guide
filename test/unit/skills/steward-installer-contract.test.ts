import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const stewardInstructions = [
  'agentic/code/addons/aiwg-utils/agents/aiwg-steward.md',
  'agentic/code/plugins/utils/agents/aiwg-steward.md',
  'agentic/code/agents/personas/aiwg-steward.md',
  'agentic/code/addons/aiwg-utils/skills/steward/SKILL.md',
  'agentic/code/plugins/utils/skills/steward/SKILL.md',
];

const installerInstructions = [
  'agentic/code/addons/agentic-installer/agents/installer-agent.md',
  'agentic/code/plugins/agentic-installer/agents/installer-agent.md',
];

describe('self-verifying steward installer guidance (#2075)', () => {
  it('routes every steward surface through the one-command readiness result', async () => {
    for (const file of stewardInstructions) {
      const body = await readFile(file, 'utf8');
      expect(body, file).toContain('https://aiwg.io/setup.aiwg.yaml');
      expect(body, file).toMatch(/self-verifying `aiwg use`|self-verifying\n`aiwg use all`/);
      expect(body, file).not.toContain('then verify with `aiwg status --probe --json` and `aiwg doctor`');
      expect(body, file).not.toContain('verify with `aiwg status --probe --json` plus `aiwg doctor`');
    }
  });

  it('keeps canonical and generated steward copies synchronized', async () => {
    const canonicalAgent = await readFile(stewardInstructions[0], 'utf8');
    const pluginAgent = await readFile(stewardInstructions[1], 'utf8');
    const canonicalSkill = await readFile(stewardInstructions[3], 'utf8');
    const pluginSkill = await readFile(stewardInstructions[4], 'utf8');
    expect(pluginAgent).toBe(canonicalAgent);
    expect(pluginSkill).toBe(canonicalSkill);
  });

  it('keeps installer-agent fast paths aligned while preserving standalone recovery routes', async () => {
    for (const file of installerInstructions) {
      const body = await readFile(file, 'utf8');
      expect(body, file).toContain('structured-result verification stages');
      expect(body, file).toContain('audit and recovery routes, not mandatory follow-up steps');
      expect(body, file).toContain('Do not pass the\nmanifest to deterministic `aiwg setup-run`');
    }
  });
});
