/**
 * Tests for the Claude Code aiwg-hooks installer (PUW-010 / #1111).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  installAiwgHooks,
  restoreSettingsBackup,
} from '../../../src/extensions/claude-hooks-installer.js';

let tmpRoot: string;
let projectPath: string;
let frameworkRoot: string;

async function makeAddonHooks(root: string): Promise<void> {
  const dir = path.join(root, 'agentic', 'code', 'addons', 'aiwg-hooks', 'hooks');
  await fs.mkdir(dir, { recursive: true });
  for (const file of ['aiwg-permissions.js', 'aiwg-session.js', 'aiwg-trace.js']) {
    await fs.writeFile(path.join(dir, file), '#!/usr/bin/env node\n', 'utf8');
  }
}

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-claude-hooks-'));
  projectPath = path.join(tmpRoot, 'project');
  frameworkRoot = path.join(tmpRoot, 'framework');
  await fs.mkdir(projectPath, { recursive: true });
  await makeAddonHooks(frameworkRoot);
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('installAiwgHooks', () => {
  it('returns null when addon source is missing', async () => {
    const r = await installAiwgHooks({
      projectPath,
      frameworkRoot: path.join(tmpRoot, 'no-such-framework'),
    });
    expect(r).toBeNull();
  });

  it('copies hook scripts to .claude/hooks/', async () => {
    const r = await installAiwgHooks({ projectPath, frameworkRoot });
    expect(r).not.toBeNull();
    const claudeHooksDir = path.join(projectPath, '.claude', 'hooks');
    const installed = await fs.readdir(claudeHooksDir);
    expect(installed).toContain('aiwg-permissions.js');
    expect(installed).toContain('aiwg-session.js');
    expect(installed).toContain('aiwg-trace.js');
  });

  it('writes settings.json with AIWG-tagged hook entries', async () => {
    const r = await installAiwgHooks({ projectPath, frameworkRoot });
    expect(r).not.toBeNull();
    const settings = JSON.parse(
      await fs.readFile(path.join(projectPath, '.claude', 'settings.json'), 'utf8'),
    );
    expect(Array.isArray(settings.hooks)).toBe(true);
    const matchers = (settings.hooks as Array<{ matcher: string; hooks: Array<Record<string, unknown>> }>);
    const events = matchers.map((m) => m.matcher);
    expect(events).toContain('PermissionRequest');
    expect(events).toContain('SessionStart');
    expect(events).toContain('SubagentStart');
    expect(events).toContain('SubagentStop');
    // All AIWG entries tagged
    for (const m of matchers) {
      for (const h of m.hooks) {
        expect(h._aiwg_managed).toBe(true);
        expect(typeof h._aiwg_id).toBe('string');
      }
    }
  });

  it('preserves operator-authored entries when merging', async () => {
    const claudeDir = path.join(projectPath, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(
        {
          hooks: [
            {
              matcher: 'PermissionRequest',
              hooks: [{ type: 'command', command: 'operator-script.sh' }],
            },
          ],
          customField: 'preserved',
        },
        null,
        2,
      ),
      'utf8',
    );
    const r = await installAiwgHooks({ projectPath, frameworkRoot });
    expect(r?.backupPath).toBeDefined(); // backup created since no AIWG marker existed
    const settings = JSON.parse(
      await fs.readFile(path.join(claudeDir, 'settings.json'), 'utf8'),
    );
    expect(settings.customField).toBe('preserved');
    const permMatcher = (settings.hooks as Array<{ matcher: string; hooks: unknown[] }>).find(
      (m) => m.matcher === 'PermissionRequest',
    );
    // Operator entry plus AIWG entry both present
    expect(permMatcher?.hooks).toHaveLength(2);
  });

  it('is idempotent — re-running does not duplicate entries', async () => {
    await installAiwgHooks({ projectPath, frameworkRoot });
    await installAiwgHooks({ projectPath, frameworkRoot });
    const settings = JSON.parse(
      await fs.readFile(path.join(projectPath, '.claude', 'settings.json'), 'utf8'),
    );
    const permMatcher = (settings.hooks as Array<{ matcher: string; hooks: unknown[] }>).find(
      (m: { matcher: string }) => m.matcher === 'PermissionRequest',
    );
    expect(permMatcher?.hooks).toHaveLength(1);
  });

  it('dry-run does not write files', async () => {
    const r = await installAiwgHooks({ projectPath, frameworkRoot, dryRun: true });
    expect(r).not.toBeNull();
    await expect(fs.access(path.join(projectPath, '.claude', 'settings.json'))).rejects.toThrow();
  });

  it('skips backup when settings already has AIWG marker', async () => {
    const claudeDir = path.join(projectPath, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({
        hooks: [
          {
            matcher: 'PermissionRequest',
            hooks: [{ type: 'command', command: 'old-aiwg.js', _aiwg_managed: true, _aiwg_id: 'aiwg-permissions' }],
          },
        ],
      }, null, 2),
      'utf8',
    );
    const r = await installAiwgHooks({ projectPath, frameworkRoot });
    expect(r?.backupPath).toBeUndefined();
  });
});

describe('restoreSettingsBackup', () => {
  it('returns null when no backup exists', async () => {
    const r = await restoreSettingsBackup(projectPath);
    expect(r).toBeNull();
  });

  it('restores the latest backup', async () => {
    const claudeDir = path.join(projectPath, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(
      path.join(claudeDir, 'settings.json.bak.2026-01-01T00-00-00-000Z'),
      JSON.stringify({ marker: 'older' }),
      'utf8',
    );
    await fs.writeFile(
      path.join(claudeDir, 'settings.json.bak.2026-05-06T01-00-00-000Z'),
      JSON.stringify({ marker: 'newer' }),
      'utf8',
    );
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({ marker: 'current' }),
      'utf8',
    );
    const restored = await restoreSettingsBackup(projectPath);
    expect(restored).toContain('2026-05-06T01-00-00-000Z');
    const final = JSON.parse(
      await fs.readFile(path.join(claudeDir, 'settings.json'), 'utf8'),
    );
    expect(final.marker).toBe('newer');
  });
});
