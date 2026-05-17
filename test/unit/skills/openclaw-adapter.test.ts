import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OpenClawAdapter } from '../../../src/skills/adapters/openclaw.js';

describe('OpenClawAdapter', () => {
  let tmpDir: string;
  let oldHome: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-openclaw-adapter-'));
    oldHome = process.env.HOME;
    process.env.HOME = tmpDir;
  });

  afterEach(() => {
    if (oldHome === undefined) delete process.env.HOME;
    else process.env.HOME = oldHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('discovers OpenClaw skills one namespace level below ~/.openclaw/skills', async () => {
    const skillDir = path.join(tmpDir, '.openclaw', 'skills', 'aiwg', 'aiwg-utils-quickref');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), [
      '---',
      'name: aiwg-utils-quickref',
      'platforms: [all]',
      '---',
      '',
      '# AIWG Utils Quickref',
      '',
      'Core utility quick reference.',
      '',
    ].join('\n'));

    const adapter = new OpenClawAdapter();
    const skills = await adapter.list();
    const details = await adapter.info('aiwg-utils-quickref');

    expect(skills.map(s => s.name)).toContain('aiwg-utils-quickref');
    expect(details?.path).toBe(path.join(skillDir, 'SKILL.md'));
  });
});
