import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const canonical = 'agentic/code/addons/agentic-installer/skills/cockpit-headless-deploy/SKILL.md';
const plugin = 'agentic/code/plugins/agentic-installer/skills/cockpit-headless-deploy/SKILL.md';

describe('cockpit-headless-deploy skill contract (#2138)', () => {
  it('keeps canonical and plugin skill copies synchronized and manifest-owned', async () => {
    const [source, mirror] = await Promise.all([readFile(canonical, 'utf8'), readFile(plugin, 'utf8')]);
    expect(mirror).toBe(source);
    expect(source).toContain('https://aiwg.io/agentic-sandbox/setup.aiwg.yaml');
    expect(source).toContain('aiwg setup-validate');
    expect(source).toContain('Do not reproduce its package');
    expect(source).toContain('Will Agentic Sandbox run on the Cockpit host');
    expect(source).toContain('aiwg cockpit doctor');
  });

  it('registers the skill in canonical and plugin manifests', async () => {
    for (const file of [
      'agentic/code/addons/agentic-installer/manifest.json',
      'agentic/code/plugins/agentic-installer/manifest.json',
    ]) {
      const manifest = JSON.parse(await readFile(file, 'utf8'));
      expect(manifest.skills).toContain('cockpit-headless-deploy');
    }
  });
});
