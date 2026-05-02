/**
 * Unit tests for project-local activity log helper (#1037)
 *
 * @source @src/extensions/project-local-activity.ts
 * @design @.aiwg/architecture/design-doctor-log-promote.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  initStorage,
  resetStorage,
  resolveStorage,
} from '../../../src/storage/index.js';
import {
  appendProjectLocalActivity,
  emitDiscoverEventsDeduped,
} from '../../../src/extensions/project-local-activity.js';

describe('project-local-activity (#1037)', () => {
  let projectRoot: string;
  let logPath: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-pla-'));
    resetStorage();
    await initStorage(projectRoot);
    // Default fs adapter writes to .aiwg/activity-log/activity.log per
    // subsystem root. Resolve once to materialize the dir layout.
    await resolveStorage('activity_log');
    logPath = join(projectRoot, '.aiwg', 'activity.log');
  });

  afterEach(async () => {
    resetStorage();
    delete process.env['AIWG_SKIP_ACTIVITY_LOG'];
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('appends a deploy event to activity.log', async () => {
    await appendProjectLocalActivity({
      event: 'deploy',
      name: 'my-ext',
      type: 'extension',
      summary: 'claude: agents=0 commands=0 skills=1 rules=1',
    });

    expect(existsSync(logPath)).toBe(true);
    const raw = readFileSync(logPath, 'utf-8');
    expect(raw).toContain('deploy | deploy: my-ext:extension | claude: agents=0 commands=0 skills=1 rules=1');
    expect(raw).toMatch(/^## \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] deploy/);
  });

  it('encodes design event names in the summary prefix', async () => {
    await appendProjectLocalActivity({
      event: 'shadow-acknowledged',
      name: 'foo',
      type: 'extension',
      summary: 'rule/human-authorization overrides safety-critical',
    });

    const raw = readFileSync(logPath, 'utf-8');
    // wire-format op falls back to 'deploy', design event is the summary prefix
    expect(raw).toContain('] deploy | shadow-acknowledged: foo:extension');
  });

  it('uses delete op for remove events and promote op for promote events', async () => {
    await appendProjectLocalActivity({ event: 'remove', name: 'foo', type: 'addon', summary: 'claude=2 reverted' });
    await appendProjectLocalActivity({ event: 'promote', name: 'foo', type: 'addon', summary: 'agentic/code/addons/foo/' });

    const raw = readFileSync(logPath, 'utf-8');
    expect(raw).toContain('] delete | remove: foo:addon');
    expect(raw).toContain('] promote | promote: foo:addon');
  });

  it('respects AIWG_SKIP_ACTIVITY_LOG=1', async () => {
    process.env['AIWG_SKIP_ACTIVITY_LOG'] = '1';
    await appendProjectLocalActivity({
      event: 'deploy',
      name: 'foo',
      type: 'extension',
      summary: 'should not appear',
    });
    expect(existsSync(logPath)).toBe(false);
  });

  it('emitDiscoverEventsDeduped writes one entry per new bundle and dedupes repeats', async () => {
    await emitDiscoverEventsDeduped([
      { id: 'foo', type: 'extension' },
      { id: 'bar', type: 'addon' },
    ]);
    let raw = readFileSync(logPath, 'utf-8');
    expect((raw.match(/discover: foo:extension/g) ?? []).length).toBe(1);
    expect((raw.match(/discover: bar:addon/g) ?? []).length).toBe(1);

    // Re-emit — dedupe must suppress both
    await emitDiscoverEventsDeduped([
      { id: 'foo', type: 'extension' },
      { id: 'bar', type: 'addon' },
      { id: 'baz', type: 'plugin' },
    ]);
    raw = readFileSync(logPath, 'utf-8');
    expect((raw.match(/discover: foo:extension/g) ?? []).length).toBe(1);
    expect((raw.match(/discover: bar:addon/g) ?? []).length).toBe(1);
    expect((raw.match(/discover: baz:plugin/g) ?? []).length).toBe(1);
  });

  it('non-blocking: append returns even when storage write throws', async () => {
    // Sabotage by stubbing the adapter
    const adapter = await resolveStorage('activity_log');
    const origWrite = adapter.write.bind(adapter);
    const origAppend = adapter.append?.bind(adapter);
    adapter.write = async () => { throw new Error('disk full'); };
    if (origAppend) adapter.append = async () => { throw new Error('disk full'); };

    // Should not throw
    await expect(
      appendProjectLocalActivity({ event: 'deploy', name: 'foo', type: 'extension', summary: 'sabotaged' }),
    ).resolves.toBeUndefined();

    adapter.write = origWrite;
    if (origAppend) adapter.append = origAppend;
  });
});
