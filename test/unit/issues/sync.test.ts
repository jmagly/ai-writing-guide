import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  LocalIssueProviderCore,
  attachExternalIssueSource,
  buildExternalIssueSnapshotFromLocal,
  buildLocalIssueConflictReport,
  parseCommentIdMappings,
  parseExternalIssueSnapshot,
} from '../../../src/issues/index.js';
import type { LocalIssueRecord } from '../../../src/issues/index.js';

function issue(overrides: Partial<LocalIssueRecord['fields']> = {}, body = 'Local body'): LocalIssueRecord {
  return {
    fields: {
      id: 'SYNC-0001',
      status: 'open',
      title: 'Local title',
      type: 'task',
      priority: 'P2',
      labels: ['local', 'sync'],
      assignees: [],
      created_at: '2026-05-24T00:00:00.000Z',
      updated_at: '2026-05-24T01:00:00.000Z',
      closed_at: null,
      links: { external: [], parent: null, children: [], related: [] },
      source: { provider: 'local', external_id: null, external_url: null },
      ...overrides,
    },
    body,
  };
}

describe('local issue sync helpers', () => {
  let tempRoot: string | undefined;

  afterEach(async () => {
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  });
  it('attaches external tracker id and url to local issue source metadata', () => {
    const linked = attachExternalIssueSource(issue(), {
      provider: 'gitea',
      external_id: '1463',
      external_url: 'https://git.integrolabs.net/roctinam/aiwg/issues/1463',
    });

    expect(linked.fields.source).toEqual({
      provider: 'gitea',
      external_id: '1463',
      external_url: 'https://git.integrolabs.net/roctinam/aiwg/issues/1463',
    });
  });

  it('builds a conflict report before two-way sync mutation', () => {
    const report = buildLocalIssueConflictReport(issue(), {
      provider: 'github',
      external_id: '42',
      external_url: 'https://github.com/example/project/issues/42',
      title: 'External title',
      body: 'External body',
      status: 'closed',
      labels: ['sync'],
      updated_at: '2026-05-24T02:00:00.000Z',
    });

    expect(report).toMatchObject({
      issue_id: 'SYNC-0001',
      provider: 'github',
      external_id: '42',
      external_url: 'https://github.com/example/project/issues/42',
    });
    expect(report.conflicts.map((conflict) => conflict.field)).toEqual(['title', 'body', 'status', 'labels']);
  });

  it('imports an external issue snapshot with source and comment ids preserved', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'aiwg-sync-import-'));
    const provider = new LocalIssueProviderCore(join(tempRoot, '.aiwg', 'issues'));
    await provider.init({ prefix: 'SYNC' });

    const imported = await provider.importIssue({
      provider: 'gitea',
      external_id: '1463',
      external_url: 'https://git.integrolabs.net/roctinam/aiwg/issues/1463',
      title: 'External title',
      body: 'External body',
      status: 'open',
      labels: ['sync'],
      created_at: '2026-05-24T00:00:00.000Z',
      updated_at: '2026-05-24T01:00:00.000Z',
      comments: [
        {
          external_id: '51710',
          author: 'roctibot',
          body: 'Imported comment',
          created_at: '2026-05-24T02:00:00.000Z',
          updated_at: '2026-05-24T02:30:00.000Z',
        },
      ],
    });

    expect(imported.fields.source).toEqual({
      provider: 'gitea',
      external_id: '1463',
      external_url: 'https://git.integrolabs.net/roctinam/aiwg/issues/1463',
    });
    expect(imported.fields.links.external).toEqual(['https://git.integrolabs.net/roctinam/aiwg/issues/1463']);
    const comment = imported.events.find((event) => event.type === 'comment');
    expect(comment?.data?.external_comment_id).toBe('51710');
    expect(comment?.body).toBe('Imported comment');
  });

  it('exports local issue comments with local event ids for external comment mapping', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'aiwg-sync-export-'));
    const provider = new LocalIssueProviderCore(join(tempRoot, '.aiwg', 'issues'));
    await provider.init({ prefix: 'EXP' });
    const created = await provider.createIssue({ title: 'Export me', body: 'Body', labels: ['sync'] });
    const comment = await provider.commentIssue(created.fields.id, 'Needs external id', { author: 'operator' });

    const exported = buildExternalIssueSnapshotFromLocal(await provider.getIssue(created.fields.id), 'github');

    expect(exported.local_issue_id).toBe(created.fields.id);
    expect(exported.comments).toMatchObject([{ local_event_id: comment.event_id, external_id: null, body: 'Needs external id' }]);
  });

  it('persists external comment id mappings onto local events', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'aiwg-sync-map-'));
    const provider = new LocalIssueProviderCore(join(tempRoot, '.aiwg', 'issues'));
    await provider.init({ prefix: 'MAP' });
    const created = await provider.createIssue({ title: 'Map comment', body: 'Body' });
    const comment = await provider.commentIssue(created.fields.id, 'Map me', { author: 'operator' });

    const events = await provider.applyCommentIdMappings(created.fields.id, [
      { local_event_id: comment.event_id, external_comment_id: '99' },
    ]);

    expect(events.find((event) => event.event_id === comment.event_id)?.data?.external_comment_id).toBe('99');
  });

  it('parses external snapshots and comment mapping files used by the CLI', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'aiwg-sync-parse-'));
    const snapshotFile = join(tempRoot, 'snapshot.json');
    const mappingsFile = join(tempRoot, 'mappings.json');
    await writeFile(snapshotFile, JSON.stringify({
      provider: 'github',
      external_id: '42',
      title: 'Imported',
      body: 'Body',
      status: 'open',
      labels: [],
      updated_at: '2026-05-24T00:00:00.000Z',
    }), 'utf-8');
    await writeFile(mappingsFile, JSON.stringify([{ local_event_id: 'evt-local', external_comment_id: '1001' }]), 'utf-8');

    expect(parseExternalIssueSnapshot(JSON.parse(await readFile(snapshotFile, 'utf-8'))).provider).toBe('github');
    expect(parseCommentIdMappings(JSON.parse(await readFile(mappingsFile, 'utf-8')))).toEqual([
      { local_event_id: 'evt-local', external_comment_id: '1001' },
    ]);
  });
});
