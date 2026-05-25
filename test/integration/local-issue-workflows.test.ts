import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../../src/cli/router.js';

describe('local issue workflow CLI integration', () => {
  let root: string;
  let output: string[];

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'aiwg-local-issue-integration-'));
    output = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      output.push(String(message ?? ''));
    });
    vi.spyOn(console, 'error').mockImplementation((message?: unknown) => {
      output.push(String(message ?? ''));
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  it('routes local issue-audit and address-issues through registered CLI handlers', async () => {
    await run(['issue', 'init', '--prefix', 'INT'], { cwd: root });
    await run(['issue', 'new', '--title', 'Integration issue', '--body', 'ordinary issue body'], { cwd: root });
    await run(['issue-audit', '--provider', 'local'], { cwd: root });
    await run(['address-issues', 'INT-0001', '--provider', 'local', '--json'], { cwd: root });

    expect(output.join('\n')).toContain('# Issue Audit');
    expect(output.join('\n')).toContain('INT-0001 [open/P2] Integration issue');

    const events = await readFile(join(root, '.aiwg', 'issues', 'events', 'INT-0001.jsonl'), 'utf-8');
    expect(events).toContain('"type":"cycle_status"');
    expect(events).toContain('"author":"aiwg"');
  });
});
