import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import {
  collectBehaviorDirs,
  deployEmulatedBehaviors,
} from '../../../tools/agents/providers/base.mjs';

describe('provider behavior emulation', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-behaviors-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function writeBehavior(root: string, name = 'quiet-bot') {
    const dir = path.join(root, name);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, 'BEHAVIOR.md'),
      `---\nname: ${name}\ndescription: Mention-only behavior.\nmetadata:\n  triggers:\n    - chat-message\n---\n\n# ${name}\n\nStay quiet unless mentioned.\n`
    );
    return dir;
  }

  it('collects direct and addon-level behavior directories', async () => {
    const direct = await writeBehavior(path.join(tmpDir, 'behaviors'), 'direct-behavior');
    const addon = await writeBehavior(
      path.join(tmpDir, 'agentic', 'code', 'addons', 'aiwg-fleet', 'behaviors'),
      'addon-behavior'
    );

    const dirs = collectBehaviorDirs(tmpDir);

    expect(dirs).toEqual(expect.arrayContaining([direct, addon]));
  });

  it('deploys emulated behavior artifacts to Codex rules', async () => {
    const behavior = await writeBehavior(path.join(tmpDir, 'behaviors'));

    const count = deployEmulatedBehaviors([behavior], 'codex', tmpDir, {
      deployVersion: 'test',
      deploySource: 'unit',
    });

    expect(count).toBe(1);
    const output = await fs.readFile(path.join(tmpDir, '.codex', 'rules', 'behaviors', 'quiet-bot.md'), 'utf8');
    expect(output).toContain('AIWG Behavior: quiet-bot');
    expect(output).toContain('Provider surface: Codex rules');
    expect(output).toContain('Stay quiet unless mentioned.');
  });

  it('deploys emulated behavior artifacts to GitHub Copilot instructions', async () => {
    const behavior = await writeBehavior(path.join(tmpDir, 'behaviors'), 'quiet-business-bot');

    const count = deployEmulatedBehaviors([behavior], 'copilot', tmpDir, {
      deployVersion: 'test',
      deploySource: 'unit',
    });

    expect(count).toBe(1);
    const output = await fs.readFile(
      path.join(tmpDir, '.github', 'instructions', 'aiwg-behaviors', 'quiet-business-bot.instructions.md'),
      'utf8'
    );
    expect(output).toContain('Provider surface: GitHub Copilot instructions');
    expect(output).toContain('quiet-business-bot');
  });

  it('does not emulate OpenClaw native behaviors', async () => {
    const behavior = await writeBehavior(path.join(tmpDir, 'behaviors'));

    const count = deployEmulatedBehaviors([behavior], 'openclaw', tmpDir, {});

    expect(count).toBe(0);
  });
});
