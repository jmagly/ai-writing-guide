import { describe, expect, it } from 'vitest';
import { generateCommand } from '../../../src/smiths/commandsmith/generator.js';

describe('CommandSmith generator', () => {
  it('emits canonical commandHint policy and a SKILL.md source artifact', async () => {
    const command = await generateCommand({
      name: 'audit-demo',
      description: 'Audit demonstration command',
      platform: 'claude',
      projectPath: '/tmp/project',
    });

    expect(command.content).toContain('commandHint:');
    expect(command.content).toContain('modelRole: efficiency');
    expect(command.content).toContain('modelTier: economy');
    expect(command.skillPath).toBe('/tmp/project/.agents/skills/audit-demo/SKILL.md');
    expect(command.skillContent).toContain('commandHint:');
    expect(command.skillContent).toContain('modelRole: efficiency');
    expect(command.skillContent).toContain('modelTier: economy');
  });
});
