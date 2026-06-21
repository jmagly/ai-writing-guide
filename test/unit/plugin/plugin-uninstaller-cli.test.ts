/**
 * Tests for the plugin uninstaller CLI wrapper (#118).
 *
 * Covers:
 *  - parseArgs records unknown flags instead of silently dropping them.
 *  - `aiwg remove <id> --provider <x>` exits non-zero with a clear "unknown
 *    flag" message rather than swallowing the flag.
 *  - `aiwg remove <unknown-id>` fails with a clear "not installed" error and
 *    NOT the "path argument must be of type string" TypeError that the broken
 *    `new PluginUninstaller({...})` constructor call produced.
 *
 * @module test/unit/plugin/plugin-uninstaller-cli.test
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import { existsSync } from 'fs';
import { execFileSync } from 'child_process';
// @ts-expect-error — plain .mjs module, no type declarations
import { parseArgs } from '../../../tools/plugin/plugin-uninstaller-cli.mjs';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CLI = path.join(REPO_ROOT, 'tools/plugin/plugin-uninstaller-cli.mjs');
const DIST_BUILT = existsSync(path.join(REPO_ROOT, 'dist/src/plugin/plugin-uninstaller.js'));

function runCli(args: string[]): { status: number; output: string } {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 60_000,
    });
    return { status: 0, output: stdout };
  } catch (e: any) {
    return { status: e.status ?? 1, output: (e.stdout || '') + (e.stderr || '') };
  }
}

describe('plugin-uninstaller-cli parseArgs (#118)', () => {
  it('records an unknown flag instead of silently dropping it', () => {
    const opts = parseArgs(['all', '--provider', 'factory']);
    expect(opts.unknownFlag).toBe('--provider');
    // The positional id is still captured (it precedes the unknown flag).
    expect(opts.pluginId).toBe('all');
  });

  it('parses known flags without setting unknownFlag', () => {
    const opts = parseArgs(['my-plugin', '--force', '--dry-run', '--keep-data']);
    expect(opts.unknownFlag).toBeNull();
    expect(opts.pluginId).toBe('my-plugin');
    expect(opts.force).toBe(true);
    expect(opts.dryRun).toBe(true);
    expect(opts.keepData).toBe(true);
  });

  it('recognizes --help / -h', () => {
    expect(parseArgs(['-h']).help).toBe(true);
    expect(parseArgs(['--help']).help).toBe(true);
  });
});

describe('plugin-uninstaller-cli end-to-end (#118)', () => {
  it('rejects an unknown flag (--provider) with a clear message and exit code 2', () => {
    const { status, output } = runCli(['all', '--provider', 'factory']);
    expect(status).toBe(2);
    expect(output).toContain('unknown flag --provider');
    expect(output).not.toContain('must be of type string');
  });

  it.skipIf(!DIST_BUILT)(
    'fails cleanly on an unknown plugin id without a path TypeError',
    () => {
      const { status, output } = runCli(['all']);
      expect(status).toBe(1);
      // The old `new PluginUninstaller({...})` call threw this before doing
      // any work — the fix (createUninstaller) must prevent it.
      expect(output).not.toContain('must be of type string');
      expect(output).not.toContain('instance of Object');
      expect(output.toLowerCase()).toContain('not installed');
    },
  );
});
