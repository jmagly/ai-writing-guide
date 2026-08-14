import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../../../src/issues/cli.js';

describe('issues/cli', () => {
  let root: string;
  let output: string[];

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'aiwg-issue-cli-'));
    output = [];
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      output.push(String(message ?? ''));
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  it('initializes, creates, lists, comments, shows, closes, and rebuilds local issues', async () => {
    await main(['init', '--prefix', 'DOCS'], root);
    await main(['new', '--title', 'Fix docs', '--body', 'Acceptance criteria'], root);
    await main(['new', '--title', 'Triage import flow', '--body', 'Migration note'], root);
    await main(['list', '--status', 'open'], root);
    await main(['list', '--search', 'import'], root);

    expect(output.join('\n')).toContain('Initialized local issues with prefix DOCS');
    expect(output.join('\n')).toContain('Created DOCS-0001: Fix docs');
    expect(output.join('\n')).toContain('Created DOCS-0002: Triage import flow');
    expect(output.join('\n')).toContain('DOCS-0001\topen');
    const searchOutput = output.at(-1) ?? '';
    expect(searchOutput).toContain('DOCS-0002\topen');
    expect(searchOutput).not.toContain('DOCS-0001\topen');

    await main(['comment', 'DOCS-0001', '--body', 'Started'], root);
    await main(['show', 'DOCS-0001', '--comments', 'last:1'], root);
    await main(['close', 'DOCS-0001', '--reason', 'Done'], root);
    await main(['index', 'rebuild'], root);

    const events = await readFile(join(root, '.aiwg', 'issues', 'events', 'DOCS-0001.jsonl'), 'utf-8');
    expect(events).toContain('"type":"comment"');
    expect(events).toContain('"type":"closed"');
    expect(output.join('\n')).toContain('# DOCS-0001: Fix docs');
    expect(output.join('\n')).toContain('Closed DOCS-0001');
    expect(output.join('\n')).toContain('Rebuilt local issue index (2 issues)');
  });

  it('reads issue and comment body files', async () => {
    await mkdir(root, { recursive: true });
    await writeFile(join(root, 'body.md'), 'Body from file', 'utf-8');
    await writeFile(join(root, 'comment.md'), 'Comment from file', 'utf-8');

    await main(['init', '--prefix', 'FILE'], root);
    await main(['new', '--title', 'File body', '--body-file', join(root, 'body.md')], root);
    await main(['comment', 'FILE-0001', '--body-file', join(root, 'comment.md')], root);

    const body = await readFile(join(root, '.aiwg', 'issues', 'items', 'FILE-0001.md'), 'utf-8');
    expect(body).toContain('Body from file');
    const shown = await readFile(join(root, '.aiwg', 'issues', 'events', 'FILE-0001.jsonl'), 'utf-8');
    expect(shown).toContain('body_path');
  });

  it('plans drafts before writing and preserves the authorization no-write gate', async () => {
    await main(['plan', '--title', 'Safe issue', '--body', 'Clarify the empty state.'], root);
    const safePlan = JSON.parse(output.at(-1) ?? '{}');
    expect(safePlan.disposition).toBe('single');
    await expect(main([
      'new', '--title', 'Provider instructions', '--body', 'Update AGENTS.md for the project.',
    ], root)).rejects.toThrow(/requires explicit policy authorization/);
    await expect(readFile(join(root, '.aiwg', 'issues', 'index', 'issues.index.json'), 'utf8'))
      .rejects.toThrow();
  });

  it('creates linked local segments after digest-bound authorization', async () => {
    const body = [
      '## Goal', '', 'Improve setup.', '',
      '## Acquisition', '', 'Run npm install -g aiwg during setup.', '',
      '## Wiring', '', 'Update AGENTS.md for the configured provider.', '',
      '## Acceptance', '', '- [ ] Both independently scoped changes are tracked.',
    ].join('\n');
    await main(['plan', '--title', 'Improve setup', '--body', body, '--label', 'priority:P1-high'], root);
    const plan = JSON.parse(output.at(-1) ?? '{}');
    expect(plan.disposition).toBe('split-authorization-required');

    output = [];
    await main([
      'new', '--title', 'Improve setup', '--body', body,
      '--authorize-policy', plan.digest,
      '--label', 'priority:P1-high',
    ], root);
    const result = JSON.parse(output.at(-1) ?? '{}');
    expect(result.status).toBe('created');
    expect(result.created).toHaveLength(2);
    const index = JSON.parse(await readFile(join(root, '.aiwg', 'issues', 'index', 'issues.index.json'), 'utf8'));
    expect(index.issues).toHaveLength(2);
    expect(index.issues.every((issue: { labels: string[] }) => issue.labels.includes('priority:P1-high'))).toBe(true);
    const dependent = await readFile(join(root, '.aiwg', 'issues', 'items', `${result.created[1].id}.md`), 'utf8');
    expect(dependent).toContain(`parent: ${result.created[0].id}`);
  });

  it('rejects non-local providers', async () => {
    await expect(main(['list', '--provider', 'gitea'], root)).rejects.toThrow(/local issue storage only/);
  });

  it('rejects Fortemi/backend selectors for local issue search', async () => {
    await main(['init', '--prefix', 'BOUND'], root);
    await main(['new', '--title', 'Fortemi boundary', '--body', 'Keep issue search local'], root);

    await expect(
      main(['list', '--search', 'Fortemi', '--backend', 'fortemi-core'], root),
    ).rejects.toThrow(/--backend is not supported/);
  });
});
