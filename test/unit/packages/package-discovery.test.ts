import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { discoverInstallablePackage } from '../../../src/packages/package-discovery.js';

const baseManifest = {
  name: 'BT6 Maintainer',
  version: '1.0.0',
  description: 'BT6 shared maintainer package',
  manifestVersion: '1',
  platforms: { claude: 'full', codex: 'full' },
  keywords: ['bt6'],
  deployment: { pathTemplate: '{provider}/bt6' },
};

describe('Git package discovery', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-package-discovery-'));
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  function writeWrapper(id: string, payloadPath = 'payload/') {
    const wrapper = path.join(root, '.aiwg', 'plugins', id);
    const payload = path.join(wrapper, 'payload');
    fs.mkdirSync(path.join(payload, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(payload, 'skills'), { recursive: true });
    fs.mkdirSync(path.join(payload, 'rules'), { recursive: true });
    fs.writeFileSync(path.join(wrapper, 'manifest.json'), `${JSON.stringify({
      ...baseManifest,
      id,
      type: 'plugin',
      pluginConfig: { payloadType: 'addon', payloadPath },
    })}\n`);
    fs.writeFileSync(path.join(payload, 'manifest.json'), `${JSON.stringify({
      ...baseManifest,
      id: `${id}-payload`,
      type: 'addon',
      addonConfig: {
        entry: { agents: 'agents/', skills: 'skills/', rules: 'rules/' },
        agents: Array.from({ length: 5 }, (_, index) => `agent-${index + 1}.md`),
        skills: Array.from({ length: 5 }, (_, index) => `skill-${index + 1}/SKILL.md`),
        rules: ['maintainer.md'],
      },
    })}\n`);
    return { wrapper, payload };
  }

  it('discovers the single documented standalone wrapper and its payload without copying', async () => {
    const fixture = writeWrapper('bt6-maintainer');
    const discovered = await discoverInstallablePackage(root);
    expect(discovered.type).toBe('plugin');
    expect(discovered.wrapperPath).toBe(fixture.wrapper);
    expect(discovered.artifactPath).toBe(fixture.payload);
    expect(discovered.manifest.id).toBe('bt6-maintainer');
  });

  it('requires a selector when multiple wrappers exist', async () => {
    writeWrapper('bt6-maintainer');
    const second = writeWrapper('bt6-reviewer');
    await expect(discoverInstallablePackage(root)).rejects.toThrow(/multiple standalone plugins/);
    expect((await discoverInstallablePackage(root, 'bt6-reviewer')).artifactPath).toBe(second.payload);
  });

  it('rejects traversing and type-mismatched payloads before deployment', async () => {
    writeWrapper('bt6-maintainer', '../outside/');
    await expect(discoverInstallablePackage(root)).rejects.toThrow(/manifest validation|discovery failed/);

    fs.rmSync(path.join(root, '.aiwg'), { recursive: true, force: true });
    const fixture = writeWrapper('bt6-maintainer');
    const payloadManifest = JSON.parse(fs.readFileSync(path.join(fixture.payload, 'manifest.json'), 'utf8'));
    payloadManifest.type = 'extension';
    fs.writeFileSync(path.join(fixture.payload, 'manifest.json'), JSON.stringify(payloadManifest));
    await expect(discoverInstallablePackage(root)).rejects.toThrow(/type must match|Payload manifest type/);
  });

  it('rejects unknown repositories instead of reporting zero-artifact success', async () => {
    fs.writeFileSync(path.join(root, 'README.md'), '# Not a package\n');
    await expect(discoverInstallablePackage(root)).rejects.toThrow(/no valid root package/);
  });
});
