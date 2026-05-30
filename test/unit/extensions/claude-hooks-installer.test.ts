/**
 * Tests for the Claude Code aiwg-hooks installer (PUW-010 / #1111).
 *
 * Schema notes (#107): Claude Code requires `hooks` to be an object
 * keyed by event name, each value an array of `{ matcher?, hooks }`
 * groups. Earlier AIWG builds wrote an array-of-matchers; those are
 * migrated to object shape on read.
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

interface HookEntry {
  type: string;
  command: string;
  _aiwg_managed?: boolean;
  _aiwg_id?: string;
}
interface HookGroup {
  matcher?: string;
  hooks: HookEntry[];
}
type HooksField = Record<string, HookGroup[]>;

async function makeAddonHooks(root: string): Promise<void> {
  const dir = path.join(root, 'agentic', 'code', 'addons', 'aiwg-hooks', 'hooks');
  await fs.mkdir(dir, { recursive: true });
  for (const file of ['aiwg-permissions.cjs', 'aiwg-session.cjs', 'aiwg-trace.cjs']) {
    await fs.writeFile(path.join(dir, file), '#!/usr/bin/env node\n', 'utf8');
  }
}

async function readSettings(): Promise<{ hooks?: HooksField; [k: string]: unknown }> {
  return JSON.parse(
    await fs.readFile(path.join(projectPath, '.claude', 'settings.json'), 'utf8'),
  );
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
    expect(installed).toContain('aiwg-permissions.cjs');
    expect(installed).toContain('aiwg-session.cjs');
    expect(installed).toContain('aiwg-trace.cjs');
  });

  it('writes settings.json with hooks as an object keyed by event name (#107)', async () => {
    const r = await installAiwgHooks({ projectPath, frameworkRoot });
    expect(r).not.toBeNull();
    const settings = await readSettings();

    // Schema: hooks must be a plain object, not an array.
    expect(settings.hooks).toBeDefined();
    expect(Array.isArray(settings.hooks)).toBe(false);
    expect(typeof settings.hooks).toBe('object');

    const hooks = settings.hooks as HooksField;
    expect(Object.keys(hooks).sort()).toEqual(
      ['PermissionRequest', 'SessionStart', 'SubagentStart', 'SubagentStop'],
    );

    // Each event holds an array of groups; each group has a hooks array
    // with the AIWG-managed entry.
    for (const [event, groups] of Object.entries(hooks)) {
      expect(Array.isArray(groups)).toBe(true);
      expect(groups.length).toBeGreaterThan(0);
      for (const g of groups) {
        expect(Array.isArray(g.hooks)).toBe(true);
        for (const h of g.hooks) {
          expect(h._aiwg_managed).toBe(true);
          expect(typeof h._aiwg_id).toBe('string');
          expect(h.type).toBe('command');
          expect(h.command).toMatch(/^node \.claude[/\\]hooks[/\\]aiwg-/);
        }
      }
      void event;
    }
  });

  it('preserves operator-authored entries when merging (object shape)', async () => {
    const claudeDir = path.join(projectPath, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(
        {
          hooks: {
            PermissionRequest: [
              { hooks: [{ type: 'command', command: 'operator-script.sh' }] },
            ],
          },
          customField: 'preserved',
        },
        null,
        2,
      ),
      'utf8',
    );
    const r = await installAiwgHooks({ projectPath, frameworkRoot });
    expect(r?.backupPath).toBeDefined(); // backup created since no AIWG marker existed
    const settings = await readSettings();
    expect(settings.customField).toBe('preserved');
    const permGroups = settings.hooks?.PermissionRequest ?? [];
    // Operator group plus AIWG group
    expect(permGroups).toHaveLength(2);
    const operatorGroup = permGroups.find((g) =>
      g.hooks.some((h) => h.command === 'operator-script.sh'),
    );
    expect(operatorGroup).toBeDefined();
    const aiwgGroup = permGroups.find((g) =>
      g.hooks.some((h) => h._aiwg_managed === true),
    );
    expect(aiwgGroup).toBeDefined();
  });

  it('migrates legacy array-shaped hooks field to object shape (#107)', async () => {
    const claudeDir = path.join(projectPath, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    // Pre-write a settings.json in the old broken array shape
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
    expect(r?.migratedFromLegacy).toBe(true);

    const settings = await readSettings();
    expect(settings.customField).toBe('preserved');
    expect(Array.isArray(settings.hooks)).toBe(false);
    expect(typeof settings.hooks).toBe('object');

    const permGroups = settings.hooks?.PermissionRequest ?? [];
    // Operator entry preserved + AIWG entry added
    const allHandlers = permGroups.flatMap((g) => g.hooks);
    expect(allHandlers.some((h) => h.command === 'operator-script.sh')).toBe(true);
    expect(
      allHandlers.some((h) => h._aiwg_managed === true && h._aiwg_id === 'aiwg-permissions'),
    ).toBe(true);
  });

  it('is idempotent — re-running does not duplicate entries', async () => {
    await installAiwgHooks({ projectPath, frameworkRoot });
    await installAiwgHooks({ projectPath, frameworkRoot });
    const settings = await readSettings();
    const permGroups = settings.hooks?.PermissionRequest ?? [];
    // Single AIWG-managed group with one handler
    const aiwgHandlers = permGroups
      .flatMap((g) => g.hooks)
      .filter((h) => h._aiwg_id === 'aiwg-permissions');
    expect(aiwgHandlers).toHaveLength(1);
  });

  it('refreshes stale pre-.cjs hook command paths (regression: SessionStart MODULE_NOT_FOUND)', async () => {
    // User installed AIWG before be3ee551 renamed hook scripts from .js to
    // .cjs. After a later refresh, only .cjs files exist on disk, but
    // settings.json still references the .js paths — every hook
    // invocation crashes at `node:internal/modules/cjs/loader` with
    // MODULE_NOT_FOUND. The installer must update stale AIWG-managed
    // commands rather than skip them via the idempotency check.
    const claudeDir = path.join(projectPath, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'node .claude/hooks/aiwg-session.js',
                  _aiwg_managed: true,
                  _aiwg_id: 'aiwg-session',
                },
              ],
            },
          ],
          PermissionRequest: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'node .claude/hooks/aiwg-permissions.js',
                  _aiwg_managed: true,
                  _aiwg_id: 'aiwg-permissions',
                },
              ],
            },
          ],
        },
      }, null, 2),
      'utf8',
    );

    const result = await installAiwgHooks({ projectPath, frameworkRoot });
    const settings = await readSettings();
    const sessionHooks = (settings.hooks?.SessionStart ?? []).flatMap((g) => g.hooks);
    const sessionEntry = sessionHooks.find((h) => h._aiwg_id === 'aiwg-session');
    expect(sessionEntry?.command).toContain('aiwg-session.cjs');
    expect(sessionEntry?.command).not.toContain('aiwg-session.js"');

    const permHooks = (settings.hooks?.PermissionRequest ?? []).flatMap((g) => g.hooks);
    const permEntry = permHooks.find((h) => h._aiwg_id === 'aiwg-permissions');
    expect(permEntry?.command).toContain('aiwg-permissions.cjs');

    // Should not duplicate — exactly one entry per event.
    expect(sessionHooks.filter((h) => h._aiwg_id === 'aiwg-session')).toHaveLength(1);
    expect(permHooks.filter((h) => h._aiwg_id === 'aiwg-permissions')).toHaveLength(1);

    // And it should surface the refresh in warnings so refresh CLI users
    // see what changed.
    expect(result?.warnings.some((w) => w.includes('Refreshed stale'))).toBe(true);
  });

  it('dry-run does not write files', async () => {
    const r = await installAiwgHooks({ projectPath, frameworkRoot, dryRun: true });
    expect(r).not.toBeNull();
    await expect(fs.access(path.join(projectPath, '.claude', 'settings.json'))).rejects.toThrow();
  });

  it('skips backup when settings already has AIWG marker (object shape)', async () => {
    const claudeDir = path.join(projectPath, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({
        hooks: {
          PermissionRequest: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'old-aiwg.js',
                  _aiwg_managed: true,
                  _aiwg_id: 'aiwg-permissions',
                },
              ],
            },
          ],
        },
      }, null, 2),
      'utf8',
    );
    const r = await installAiwgHooks({ projectPath, frameworkRoot });
    expect(r?.backupPath).toBeUndefined();
  });

  it('skips backup when legacy-shaped settings still carries AIWG marker', async () => {
    const claudeDir = path.join(projectPath, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({
        hooks: [
          {
            matcher: 'PermissionRequest',
            hooks: [
              {
                type: 'command',
                command: 'old-aiwg.js',
                _aiwg_managed: true,
                _aiwg_id: 'aiwg-permissions',
              },
            ],
          },
        ],
      }, null, 2),
      'utf8',
    );
    const r = await installAiwgHooks({ projectPath, frameworkRoot });
    // AIWG marker recognized in legacy form → no backup, but migration still runs
    expect(r?.backupPath).toBeUndefined();
    expect(r?.migratedFromLegacy).toBe(true);
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
