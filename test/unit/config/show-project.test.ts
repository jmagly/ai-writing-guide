/**
 * Tests for `aiwg config show --project` (#999)
 *
 * Drives the cli main() entry and asserts on stdout. The handler is exercised
 * via the same path users hit; we keep the test focused on observable output
 * rather than internal helpers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

import { main } from '../../../src/config/cli.js';

function makeTmpRepo(): string {
  const dir = join(tmpdir(), `aiwg-show-project-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  execSync('git init --quiet', { cwd: dir });
  return dir;
}

function writeConfig(dir: string, body: Record<string, unknown>): void {
  mkdirSync(join(dir, '.aiwg'), { recursive: true });
  const cfg = {
    version: '1',
    providers: ['claude'],
    installed: {},
    scripts: {},
    ...body,
  };
  writeFileSync(join(dir, '.aiwg', 'aiwg.config'), JSON.stringify(cfg, null, 2));
}

// Note: vitest runs tests in worker threads where process.chdir() is unsupported,
// so we drive the handler via its `--target <path>` flag — same path the real
// CLI uses when the operator points at a non-cwd project.

describe('aiwg config show --project (#999)', () => {
  let tmp: string;
  let logs: string[];
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = makeTmpRepo();
    logs = [];
    consoleSpy = vi.spyOn(console, 'log').mockImplementation((msg: unknown) => {
      logs.push(typeof msg === 'string' ? msg : JSON.stringify(msg));
    });
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('errors when no project config exists', async () => {
    await expect(main(['show', '--project', '--target', tmp])).rejects.toMatchObject({
      code: 'ERR_NO_PROJECT_CONFIG',
    });
  });

  it('errors when --project flag is missing', async () => {
    await expect(main(['show'])).rejects.toMatchObject({
      code: 'ERR_USAGE_MISSING_FLAG',
    });
  });

  it('prints human-readable view with default (origin) remote topology', async () => {
    writeConfig(tmp, {});
    await main(['show', '--project', '--target', tmp]);
    const out = logs.join('\n');
    expect(out).toContain('Project config:');
    expect(out).toContain('Schema version: 1');
    expect(out).toContain('Remote topology:');
    expect(out).toContain('no `remotes` block');
    expect(out).toContain('Primary');
    expect(out).toContain('origin');
  });

  it('shows resolved remote URLs when remotes are present', async () => {
    execSync('git remote add origin https://example.com/owner/repo.git', { cwd: tmp });
    writeConfig(tmp, {
      remotes: { primary: 'origin' },
    });
    await main(['show', '--project', '--target', tmp]);
    const out = logs.join('\n');
    expect(out).toContain('https://example.com/owner/repo.git');
    expect(out).not.toContain('no `remotes` block');
  });

  it('shows secondary remotes with purpose and push_on_release flags', async () => {
    execSync('git remote add origin https://primary/r.git', { cwd: tmp });
    execSync('git remote add github https://github.com/o/r.git', { cwd: tmp });
    writeConfig(tmp, {
      remotes: {
        primary: 'origin',
        secondary: [{ name: 'github', purpose: 'public-mirror', push_on_release: true }],
      },
    });
    await main(['show', '--project', '--target', tmp]);
    const out = logs.join('\n');
    expect(out).toContain('Secondary');
    expect(out).toContain('github.com/o/r.git');
    expect(out).toContain('public-mirror');
    expect(out).toContain('push tags on release');
  });

  it('emits stable JSON with --json', async () => {
    execSync('git remote add origin https://example.com/owner/repo.git', { cwd: tmp });
    writeConfig(tmp, {
      remotes: { primary: 'origin', secondary: [{ name: 'mirror' }] },
    });
    await main(['show', '--project', '--json', '--target', tmp]);
    const out = logs.join('\n');
    const parsed = JSON.parse(out);
    expect(parsed).toMatchObject({
      version: '1',
      remotes: {
        has_remotes_block: true,
        primary: { name: 'origin', url: 'https://example.com/owner/repo.git' },
      },
    });
    expect(parsed.remotes.secondary[0]).toMatchObject({ name: 'mirror', url: null });
  });

  it('reports url:null in JSON when remote name does not exist in git', async () => {
    writeConfig(tmp, { remotes: { primary: 'nonexistent' } });
    await main(['show', '--project', '--json', '--target', tmp]);
    const parsed = JSON.parse(logs.join('\n'));
    expect(parsed.remotes.primary).toEqual({ name: 'nonexistent', url: null });
  });
});
