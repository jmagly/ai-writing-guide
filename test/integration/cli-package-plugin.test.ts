import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const CLI = path.join(REPO_ROOT, 'bin', 'aiwg.mjs');
const isolatedHome = mkdtempSync(path.join(tmpdir(), 'aiwg-package-plugin-home-'));

function run(args: string[]): string {
  return execFileSync(process.execPath, [CLI, ...args], {
    cwd: REPO_ROOT,
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
});
