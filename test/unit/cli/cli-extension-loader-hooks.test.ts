/**
 * Tests for registerHooks / unregisterHooks in cli-extension-loader.
 *
 * Covers the #107 fix: hooks must be written as an object keyed by
 * event name, and legacy array-shaped fields must be migrated to the
 * object form on write.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { registerHooks, unregisterHooks } from '../../../src/cli/cli-extension-loader.js';

let tmpRoot: string;
let cwd: string;

interface HookEntry {
  type: string;
  command: string;
}
interface HookGroup {
  matcher?: string;
  hooks: HookEntry[];
}
type HooksField = Record<string, HookGroup[]>;

async function readSettings(): Promise<{ hooks?: HooksField; [k: string]: unknown }> {
  return JSON.parse(
    await fs.readFile(path.join(cwd, '.claude', 'settings.json'), 'utf8'),
  );
}

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-cli-ext-hooks-'));
  cwd = path.join(tmpRoot, 'project');
  await fs.mkdir(cwd, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('registerHooks (#107 schema)', () => {
  it('writes hooks as an object keyed by event name', async () => {
    const registered = await registerHooks(cwd, 'demo', {
      'on-stop': { file: 'stop.mjs', description: 'stop', hook_event: 'Stop' },
      'on-start': { file: 'start.mjs', description: 'start', hook_event: 'SessionStart' },
    });
    expect(registered.sort()).toEqual(
      ['SessionStart → aiwg demo on-start', 'Stop → aiwg demo on-stop'],
    );

    const settings = await readSettings();
    expect(Array.isArray(settings.hooks)).toBe(false);
    expect(typeof settings.hooks).toBe('object');
    expect(settings.hooks?.Stop?.[0].hooks[0].command).toBe('aiwg demo on-stop');
    expect(settings.hooks?.SessionStart?.[0].hooks[0].command).toBe(
      'aiwg demo on-start',
    );
  });

  it('skips events not in AUTO_HOOK_EVENTS', async () => {
    const registered = await registerHooks(cwd, 'demo', {
      foo: { file: 'foo.mjs', description: 'foo', hook_event: 'NotARealEvent' },
    });
    expect(registered).toEqual([]);
    await expect(
      fs.access(path.join(cwd, '.claude', 'settings.json')),
    ).rejects.toThrow();
  });

  it('is idempotent — re-registering does not duplicate', async () => {
    const subs = {
      'on-stop': { file: 'stop.mjs', description: 'stop', hook_event: 'Stop' },
    };
    await registerHooks(cwd, 'demo', subs);
    await registerHooks(cwd, 'demo', subs);
    const settings = await readSettings();
    const handlers = (settings.hooks?.Stop ?? []).flatMap((g) => g.hooks);
    expect(handlers.filter((h) => h.command === 'aiwg demo on-stop')).toHaveLength(
      1,
    );
  });

  it('migrates legacy array-shaped hooks to object form on write', async () => {
    const claudeDir = path.join(cwd, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(
        {
          hooks: [
            {
              matcher: 'Stop',
              hooks: [{ type: 'command', command: 'operator-stop.sh' }],
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );
    await registerHooks(cwd, 'demo', {
      'on-stop': { file: 'stop.mjs', description: 'stop', hook_event: 'Stop' },
    });
    const settings = await readSettings();
    expect(Array.isArray(settings.hooks)).toBe(false);
    const stopHandlers = (settings.hooks?.Stop ?? []).flatMap((g) => g.hooks);
    // Legacy operator entry preserved + new AIWG entry merged
    expect(stopHandlers.some((h) => h.command === 'operator-stop.sh')).toBe(true);
    expect(stopHandlers.some((h) => h.command === 'aiwg demo on-stop')).toBe(
      true,
    );
  });

  it('migrates legacy shape even when no new hooks are registered', async () => {
    const claudeDir = path.join(cwd, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(
        {
          hooks: [
            {
              matcher: 'Stop',
              hooks: [{ type: 'command', command: 'aiwg demo on-stop' }],
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );
    // Re-register the same command — registered list will be empty,
    // but the legacy field should still be migrated.
    await registerHooks(cwd, 'demo', {
      'on-stop': { file: 'stop.mjs', description: 'stop', hook_event: 'Stop' },
    });
    const settings = await readSettings();
    expect(Array.isArray(settings.hooks)).toBe(false);
    expect(settings.hooks?.Stop?.[0].hooks[0].command).toBe('aiwg demo on-stop');
  });
});

describe('unregisterHooks (#107 schema)', () => {
  it('removes namespace entries and leaves object-shaped settings', async () => {
    await registerHooks(cwd, 'demo', {
      'on-stop': { file: 'stop.mjs', description: 'stop', hook_event: 'Stop' },
    });
    const removed = await unregisterHooks(cwd, 'demo');
    expect(removed).toBe(1);
    const settings = await readSettings();
    expect(Array.isArray(settings.hooks)).toBe(false);
    expect(settings.hooks?.Stop).toBeUndefined(); // event dropped when empty
  });

  it('migrates legacy array shape during unregister', async () => {
    const claudeDir = path.join(cwd, '.claude');
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(
        {
          hooks: [
            {
              matcher: 'Stop',
              hooks: [
                { type: 'command', command: 'operator-stop.sh' },
                { type: 'command', command: 'aiwg demo on-stop' },
              ],
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );
    const removed = await unregisterHooks(cwd, 'demo');
    expect(removed).toBe(1);
    const settings = await readSettings();
    expect(Array.isArray(settings.hooks)).toBe(false);
    const stopHandlers = (settings.hooks?.Stop ?? []).flatMap((g) => g.hooks);
    expect(stopHandlers.map((h) => h.command)).toEqual(['operator-stop.sh']);
  });

  it('returns 0 when settings.json is missing', async () => {
    const removed = await unregisterHooks(cwd, 'demo');
    expect(removed).toBe(0);
  });
});
