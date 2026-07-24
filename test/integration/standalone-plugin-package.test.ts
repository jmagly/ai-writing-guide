import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { packageStandalonePlugin } from '../../src/plugins/standalone-packager.mjs';

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
    pluginConfig: { payloadType: overrides.payloadType ?? 'addon', payloadPath },
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(payload, 'manifest.json'), `${JSON.stringify({
    id: 'team-tools-payload',
    type: 'addon',
    name: 'Team Tools Payload',
    version: '1.2.3',
    manifestVersion: '1',
    platforms: { claude: 'full', codex: 'full' },
    addonConfig: { entry: { skills: 'skills/' } },
  }, null, 2)}\n`);
  const bytes = Buffer.from([0, 1, 2, 3, 254, 255]);
  fs.writeFileSync(path.join(payload, 'skills', 'team-check', 'asset.bin'), bytes);
  return { root, wrapper, bytes };
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('standalone project-local plugin packaging', () => {
  it('auto-discovers, packages deterministically, and preserves payload bytes', () => {
    const { root, bytes } = fixture();
    const first = packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
      provider: 'all',
    })!;
    expect(first.plans.map(plan => plan.provider)).toEqual(['claude', 'codex']);
    const archive = first.plans[0].archivePath;
    const digest = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');

    packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
      provider: 'all',
      clean: true,
    });
    expect(createHash('sha256').update(fs.readFileSync(archive)).digest('hex')).toBe(digest);

    const extracted = path.join(root, 'extracted-claude');
    fs.mkdirSync(extracted);
    execFileSync('tar', ['-xzf', archive, '-C', extracted]);
    expect(fs.readFileSync(path.join(
      extracted,
      'team-tools',
      'payload',
      'skills',
      'team-check',
      'asset.bin',
    ))).toEqual(bytes);
    expect(fs.existsSync(path.join(extracted, 'team-tools', '.claude-plugin', 'plugin.json'))).toBe(true);

    const codexExtracted = path.join(root, 'extracted-codex');
    fs.mkdirSync(codexExtracted);
    execFileSync('tar', ['-xzf', first.plans[1].archivePath, '-C', codexExtracted]);
    expect(fs.readFileSync(path.join(
      codexExtracted,
      'team-tools',
      'payload',
      'skills',
      'team-check',
      'asset.bin',
    ))).toEqual(bytes);
    expect(fs.existsSync(path.join(codexExtracted, 'team-tools', '.codex-plugin', 'plugin.json'))).toBe(true);
    expect(fs.existsSync(path.join(codexExtracted, 'team-tools', 'marketplace.json'))).toBe(true);
  });

  it('supports an explicit in-project source and output path', () => {
    const { root, wrapper } = fixture();
    const result = packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
      source: path.relative(root, wrapper),
      output: 'release',
      provider: 'codex',
    })!;
    expect(result.plans[0].archivePath).toBe(path.join(root, 'release', 'team-tools-1.2.3-codex.tar.gz'));
  });

  it('rejects malformed and traversal payload paths', () => {
    const malformed = fixture({ payloadType: 'framework' });
    expect(() => packageStandalonePlugin({
      cwd: malformed.root,
      name: 'team-tools',
    })).toThrow(/does not match pluginConfig.payloadType/);

    const traversal = fixture({ payloadPath: '../payload' });
    expect(() => packageStandalonePlugin({
      cwd: traversal.root,
      name: 'team-tools',
    })).toThrow(/traversal-safe/);
  });

  it('rejects source traversal, unsupported providers, and output collisions', () => {
    const { root } = fixture();
    expect(() => packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
      source: '../outside',
    })).toThrow(/must stay inside/);
    expect(() => packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
      provider: 'cursor',
    })).toThrow(/not supported/);
    packageStandalonePlugin({ cwd: root, name: 'team-tools' });
    expect(() => packageStandalonePlugin({ cwd: root, name: 'team-tools' }))
      .toThrow(/already exists/);
  });

  it('rejects providers not declared compatible by the wrapper', () => {
    const { root, wrapper } = fixture();
    const manifestPath = path.join(wrapper, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.platforms = { claude: 'full' };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    expect(() => packageStandalonePlugin({
      cwd: root,
      name: 'team-tools',
      provider: 'codex',
    })).toThrow(/does not declare compatible 'codex'/);
  });
});
