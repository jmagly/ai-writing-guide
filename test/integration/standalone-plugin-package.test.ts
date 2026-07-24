import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { packageStandalonePlugin } from '../../src/plugins/standalone-packager.js';
import { loadAndValidateManifest } from '../../src/extensions/project-local-discovery.js';

const roots: string[] = [];

function fixture(overrides: { payloadPath?: string; payloadType?: string } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-standalone-plugin-'));
  roots.push(root);
  const wrapper = path.join(root, '.aiwg', 'plugins', 'team-tools');
  const payloadPath = overrides.payloadPath ?? 'payload/';
  const payload = path.join(wrapper, 'payload');
  fs.mkdirSync(path.join(payload, 'skills', 'team-check'), { recursive: true });
  fs.writeFileSync(path.join(wrapper, 'manifest.json'), `${JSON.stringify({
    id: 'team-tools',
    type: 'plugin',
    name: 'Team Tools',
    version: '1.2.3',
    description: 'Team plugin',
    manifestVersion: '1',
    platforms: { claude: 'full', codex: 'full' },
    keywords: ['team-tools'],
    deployment: { pathTemplate: '.aiwg/plugins/team-tools' },
    pluginConfig: { payloadType: overrides.payloadType ?? 'addon', payloadPath },
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(payload, 'manifest.json'), `${JSON.stringify({
    id: 'team-tools-payload',
    type: 'addon',
    name: 'Team Tools Payload',
    version: '1.2.3',
    description: 'Team tools payload',
    manifestVersion: '1',
    platforms: { claude: 'full', codex: 'full' },
    keywords: ['team-tools'],
    deployment: { pathTemplate: '.aiwg/addons/team-tools-payload' },
    addonConfig: { entry: { skills: 'skills/' } },
  }, null, 2)}\n`);
  const bytes = Buffer.from([0, 1, 2, 3, 254, 255]);
  fs.writeFileSync(path.join(payload, 'skills', 'team-check', 'asset.bin'), bytes);
  return { root, wrapper, bytes };
}

function installArchive(archive: string, repository: string, provider: 'claude' | 'codex') {
  fs.mkdirSync(path.join(repository, '.git'), { recursive: true });
  const pluginRoot = path.join(repository, `.${provider}`, 'plugins');
  fs.mkdirSync(pluginRoot, { recursive: true });
  execFileSync('tar', ['-xzf', archive, '-C', pluginRoot]);
  return path.join(pluginRoot, 'team-tools');
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('standalone project-local plugin packaging', () => {
  it('auto-discovers, packages deterministically, and preserves payload bytes', async () => {
    const { root, bytes } = fixture();
    const first = (await packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
      provider: 'all',
    }))!;
    expect(first.plans.map(plan => plan.provider)).toEqual(['claude', 'codex']);
    const archive = first.plans[0].archivePath;
    const digest = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');

    await packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
      provider: 'all',
      clean: true,
    });
    expect(createHash('sha256').update(fs.readFileSync(archive)).digest('hex')).toBe(digest);

    const claudeRepository = path.join(root, 'claude-fixture-repository');
    const claudeInstall = installArchive(archive, claudeRepository, 'claude');
    expect(fs.readFileSync(path.join(
      claudeInstall,
      'payload',
      'skills',
      'team-check',
      'asset.bin',
    ))).toEqual(bytes);
    const claudeMetadata = JSON.parse(fs.readFileSync(path.join(
      claudeInstall,
      '.claude-plugin',
      'plugin.json',
    ), 'utf8'));
    expect(claudeMetadata).toMatchObject({ name: 'team-tools', version: '1.2.3' });
    await expect(loadAndValidateManifest(
      path.join(claudeInstall, 'manifest.json'),
      'plugin',
      claudeRepository,
    )).resolves.toMatchObject({ errors: [], bundle: { id: 'team-tools', type: 'plugin' } });

    const codexRepository = path.join(root, 'codex-fixture-repository');
    const codexInstall = installArchive(first.plans[1].archivePath, codexRepository, 'codex');
    expect(fs.readFileSync(path.join(
      codexInstall,
      'payload',
      'skills',
      'team-check',
      'asset.bin',
    ))).toEqual(bytes);
    const codexMetadata = JSON.parse(fs.readFileSync(path.join(
      codexInstall,
      '.codex-plugin',
      'plugin.json',
    ), 'utf8'));
    const marketplace = JSON.parse(fs.readFileSync(path.join(codexInstall, 'marketplace.json'), 'utf8'));
    expect(codexMetadata).toMatchObject({ name: 'team-tools', version: '1.2.3' });
    expect(marketplace.plugins).toContainEqual({
      name: 'team-tools',
      source: { source: 'local', path: '.' },
    });
    await expect(loadAndValidateManifest(
      path.join(codexInstall, 'manifest.json'),
      'plugin',
      codexRepository,
    )).resolves.toMatchObject({ errors: [], bundle: { id: 'team-tools', type: 'plugin' } });
  });

  it('supports an explicit in-project source and output path', async () => {
    const { root, wrapper } = fixture();
    const result = (await packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
      source: path.relative(root, wrapper),
      output: 'release',
      provider: 'codex',
    }))!;
    expect(result.plans[0].archivePath).toBe(path.join(root, 'release', 'team-tools-1.2.3-codex.tar.gz'));
  });

  it('rejects malformed and traversal payload paths', async () => {
    const malformed = fixture({ payloadType: 'framework' });
    await expect(packageStandalonePlugin({
      cwd: malformed.root,
      name: 'team-tools',
    })).rejects.toThrow(/Payload manifest type must match|matching directory/);

    const traversal = fixture({ payloadPath: '../payload' });
    await expect(packageStandalonePlugin({
      cwd: traversal.root,
      name: 'team-tools',
    })).rejects.toThrow(/relative path|payloadPath/);
  });

  it('rejects source traversal, unsupported providers, and output collisions', async () => {
    const { root } = fixture();
    await expect(packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
      source: '../outside',
    })).rejects.toThrow(/must stay inside/);
    await expect(packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
      provider: 'cursor',
    })).rejects.toThrow(/not supported/);
    await packageStandalonePlugin({ cwd: root, name: 'team-tools' });
    await expect(packageStandalonePlugin({ cwd: root, name: 'team-tools' }))
      .rejects.toThrow(/already exists/);
  });

  it('rejects providers not declared compatible by the wrapper', async () => {
    const { root, wrapper } = fixture();
    const manifestPath = path.join(wrapper, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.platforms = { claude: 'full' };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    await expect(packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
      provider: 'codex',
    })).rejects.toThrow(/does not declare compatible 'codex'/);
  });

  it('rejects manifests missing canonical required fields', async () => {
    const { root, wrapper } = fixture();
    const manifestPath = path.join(wrapper, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    delete manifest.keywords;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    await expect(packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
    })).rejects.toThrow(/keywords/);
  });
});
