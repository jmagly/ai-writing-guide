import { existsSync } from 'fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  LocalIssueLockError,
  LocalIssueLockManager,
  LocalIssueProviderCore,
  LocalIssueProviderError,
  parseIssueMarkdown,
  suggestLocalIssuePrefix,
  serializeIssueMarkdown,
} from '../../../src/issues/index.js';
import type { LocalIssueRecord } from '../../../src/issues/index.js';

describe('local issue provider core', () => {
  let projectRoot: string;
  let issuesRoot: string;
  let provider: LocalIssueProviderCore;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-local-issues-'));
    issuesRoot = join(projectRoot, '.aiwg', 'issues');
    provider = new LocalIssueProviderCore(issuesRoot);
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('initializes the local issue layout with configurable project prefix', async () => {
    const config = await provider.init({ prefix: 'docs', padding: 3 });

    expect(config.issue_key).toEqual({ prefix: 'DOCS', padding: 3, next: 1 });
    expect(existsSync(join(issuesRoot, 'items'))).toBe(true);
    expect(existsSync(join(issuesRoot, 'events', 'bodies'))).toBe(true);
    expect(existsSync(join(issuesRoot, 'index', 'issues.index.json'))).toBe(true);
    expect(await readFile(join(issuesRoot, 'next-id'), 'utf-8')).toBe('1\n');
  });

  it('suggests the issue prefix from project package metadata when no override is supplied', async () => {
    await writeFile(join(projectRoot, 'package.json'), JSON.stringify({ name: '@scope/local-issues-demo' }), 'utf-8');

    await expect(suggestLocalIssuePrefix(projectRoot)).resolves.toEqual({
      prefix: 'LID',
      source: 'package.json#name',
    });
    const config = await provider.init();
    expect(config.issue_key.prefix).toBe('LID');

    await writeFile(join(issuesRoot, 'config.json'), JSON.stringify({
      provider: 'local',
      issue_key: { prefix: 'KEEP', padding: 4, next: 1 },
    }), 'utf-8');
    const preserved = await provider.init({ prefix: 'NEW' });
    expect(preserved.issue_key.prefix).toBe('KEEP');
  });

  it('parses and serializes markdown issue bodies with structured YAML frontmatter', () => {
    const issue: LocalIssueRecord = {
      fields: {
        id: 'PROJECT-0001',
        status: 'open',
        title: 'Implement local issues',
        type: 'feature',
        priority: 'P1',
        labels: ['provider/local'],
        assignees: [],
        created_at: '2026-05-24T00:00:00.000Z',
        updated_at: '2026-05-24T00:00:00.000Z',
        closed_at: null,
        links: { external: [], parent: null, children: [], related: [] },
        source: { provider: 'local', external_id: null, external_url: null },
      },
      body: '# Body\n\nAcceptance criteria here.\n',
    };

    const serialized = serializeIssueMarkdown(issue);
    expect(serialized).toContain('id: PROJECT-0001');
    expect(serialized).toContain('# Body');
    expect(parseIssueMarkdown(serialized)).toEqual(issue);
  });

  it('rejects invalid issue frontmatter during schema validation', () => {
    const invalid = `---
id: PROJECT-0001
status: waiting
title: Broken
type: task
priority: P2
labels: []
assignees: []
created_at: 2026-05-24T00:00:00.000Z
updated_at: 2026-05-24T00:00:00.000Z
closed_at: null
links:
  external: []
  parent: null
  children: []
  related: []
source:
  provider: local
  external_id: null
---
Body
`;

    expect(() => parseIssueMarkdown(invalid)).toThrow(LocalIssueProviderError);
  });

  it('creates, reads, filters, comments on, updates, and closes local issues without an external tracker', async () => {
    await provider.init({ prefix: 'AIWG' });
    const issue = await provider.createIssue({
      title: 'Implement provider core',
      body: 'Local body markdown',
      type: 'feature',
      priority: 'P1',
      labels: ['provider/local', 'sdlc'],
      assignees: ['roctinam'],
    });

    expect(issue.fields.id).toBe('AIWG-0001');
    expect(await readFile(join(issuesRoot, 'items', 'AIWG-0001.md'), 'utf-8')).toContain('Local body markdown');

    await provider.commentIssue(issue.fields.id, 'First human comment', { author: 'operator' });
    await provider.commentIssue(issue.fields.id, 'Cycle status update', { author: 'aiwg', type: 'cycle_status' });
    await provider.updateIssueFields(issue.fields.id, { priority: 'P0', labels: ['provider/local', 'blocker'] });

    const listed = await provider.listIssues({
      filter: { status: 'open', labels: ['provider/local'], priority: 'P0', search: 'provider core' },
    });
    expect(listed.issues.map((entry) => entry.id)).toEqual(['AIWG-0001']);
    expect(listed.nextCursor).toBeNull();

    const read = await provider.getIssue(issue.fields.id, { body: true, comments: 'last:2' });
    expect(read.body).toBe('Local body markdown');
    expect(read.events).toHaveLength(2);
    expect(read.events[0].body).toBe('First human comment');
    expect(read.events[1].type).toBe('cycle_status');

    const closed = await provider.closeIssue(issue.fields.id, { author: 'operator', reason: 'Fixed' });
    expect(closed.fields.status).toBe('closed');
    expect(closed.fields.closed_at).toBeTruthy();

    const open = await provider.listIssues({ filter: { status: 'open' } });
    expect(open.issues).toEqual([]);
  });

  it('stores comments as append-only JSONL metadata with markdown body files', async () => {
    await provider.init({ prefix: 'ISSUE' });
    const issue = await provider.createIssue({ title: 'Comment storage', body: 'Body' });
    const event = await provider.commentIssue(issue.fields.id, 'A longer markdown comment\n\n- item', { author: 'operator' });

    const jsonl = await readFile(join(issuesRoot, 'events', `${issue.fields.id}.jsonl`), 'utf-8');
    const lines = jsonl.trim().split('\n').map((line) => JSON.parse(line));
    expect(lines.map((line) => line.type)).toEqual(['created', 'comment']);
    expect(lines[1].body).toBeUndefined();
    expect(lines[1].body_path).toBe(event.body_path);
    expect(event.body_path).toMatch(/^events\/bodies\/evt-/);
    expect(await readFile(join(issuesRoot, event.body_path!), 'utf-8')).toContain('longer markdown comment');
  });

  it('rebuilds the JSON index from canonical issue files', async () => {
    await provider.init({ prefix: 'DOCS' });
    await provider.createIssue({ title: 'First', body: 'one', labels: ['docs'] });
    await provider.createIssue({ title: 'Second', body: 'two', labels: ['docs', 'bug'], type: 'bug' });
    await rm(join(issuesRoot, 'index', 'issues.index.json'), { force: true });

    const rebuilt = await provider.rebuildIssueIndex();
    expect(rebuilt.issues.map((entry) => entry.id)).toEqual(['DOCS-0001', 'DOCS-0002']);

    const filtered = await provider.listIssues({ filter: { type: 'bug', labels: ['bug'] } });
    expect(filtered.issues.map((entry) => entry.title)).toEqual(['Second']);
  });

  it('reports existing locks instead of overwriting them', async () => {
    await mkdir(join(issuesRoot, 'locks'), { recursive: true });
    await writeFile(
      join(issuesRoot, 'locks', 'ISSUE-0001.lock'),
      JSON.stringify({ pid: 123, hostname: 'host', created_at: '2026-05-24T00:00:00.000Z', operation: 'test' }),
      'utf-8'
    );
    const locks = new LocalIssueLockManager(issuesRoot, { waitMs: 0 });

    await expect(locks.withIssueLock('ISSUE-0001', 'second writer', async () => undefined)).rejects.toThrow(LocalIssueLockError);
  });

  it('serializes concurrent issue creation through the global ID lock', async () => {
    await provider.init({ prefix: 'CONC' });

    const created = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        provider.createIssue({
          title: `Issue ${index}`,
          body: `Body ${index}`,
        })
      )
    );

    expect(created.map((issue) => issue.fields.id).sort()).toEqual([
      'CONC-0001',
      'CONC-0002',
      'CONC-0003',
      'CONC-0004',
      'CONC-0005',
    ]);
  });

  it('returns issue thread events after an event id or timestamp', async () => {
    await provider.init({ prefix: 'THR' });
    const issue = await provider.createIssue({ title: 'Thread polling', body: 'Body' });
    const first = await provider.commentIssue(issue.fields.id, 'first', { author: 'operator' });
    const second = await provider.commentIssue(issue.fields.id, 'second', { author: 'operator' });

    expect((await provider.getIssueThreadSince(issue.fields.id, first.event_id)).map((event) => event.event_id)).toEqual([second.event_id]);
    expect((await provider.getIssueThreadSince(issue.fields.id, '1970-01-01T00:00:00.000Z')).length).toBeGreaterThanOrEqual(3);
  });
});
