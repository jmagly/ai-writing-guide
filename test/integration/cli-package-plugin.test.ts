import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const CLI = path.join(REPO_ROOT, 'bin', 'aiwg.mjs');
const isolatedHome = mkdtempSync(path.join(tmpdir(), 'aiwg-package-plugin-home-'));

function run(args: string[], cwd = REPO_ROOT): string {
  return execFileSync(process.execPath, [CLI, ...args], {
    cwd,
    env: {
      ...process.env,
      HOME: isolatedHome,
      USERPROFILE: isolatedHome,
      AIWG_UPDATE_CHECK: '0',
    },
    encoding: 'utf8',
    timeout: 120_000,
  });
}

afterAll(() => rmSync(isolatedHome, { recursive: true, force: true }));

describe('public package-plugin CLI contract (#1864)', () => {
  it('shows AIWG-owned help rather than internal script usage', () => {
    const output = run(['package-plugin', '--help']);
    expect(output).toContain('aiwg package-plugin <name>');
    expect(output).not.toContain('node tools/plugin/package-plugins.mjs');
  });

  it('accepts the documented positional plugin name', () => {
    const output = run(['package-plugin', 'sdlc', '--dry-run']);
    expect(output).toContain('AIWG Plugin Packager');
    expect(output).toContain('Mode: DRY RUN');
    expect(output).not.toContain('Please specify --all or --plugin NAME');
  });

  it('auto-discovers and packages a standalone project-local wrapper', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'aiwg-package-plugin-project-'));
    const wrapper = path.join(project, '.aiwg', 'plugins', 'team-tools');
    const payload = path.join(wrapper, 'payload');
    mkdirSync(payload, { recursive: true });
    writeFileSync(path.join(wrapper, 'manifest.json'), JSON.stringify({
      id: 'team-tools',
      type: 'plugin',
      name: 'Team Tools',
      version: '1.0.0',
      manifestVersion: '1',
      platforms: { claude: 'full', codex: 'full' },
      pluginConfig: { payloadType: 'addon', payloadPath: 'payload/' },
    }));
    writeFileSync(path.join(payload, 'manifest.json'), JSON.stringify({
      id: 'team-tools-payload',
      type: 'addon',
      name: 'Team Tools Payload',
      version: '1.0.0',
      manifestVersion: '1',
      platforms: { claude: 'full', codex: 'full' },
      addonConfig: { entry: { skills: 'skills/' } },
    }));

    try {
      const output = run(['package-plugin', 'team-tools', '--provider', 'all'], project);
      expect(output).toContain('Source:');
      expect(existsSync(path.join(project, 'dist', 'plugins', 'team-tools-1.0.0-claude.tar.gz'))).toBe(true);
      expect(existsSync(path.join(project, 'dist', 'plugins', 'team-tools-1.0.0-codex.tar.gz'))).toBe(true);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
