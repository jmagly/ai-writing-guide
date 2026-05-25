import { describe, expect, it } from 'vitest';
import { attachExternalIssueSource, buildLocalIssueConflictReport } from '../../../src/issues/index.js';
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
});
