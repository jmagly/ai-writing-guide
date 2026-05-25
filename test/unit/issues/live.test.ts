import { describe, expect, it, vi } from 'vitest';
import { LiveIssueClient, resolveToken } from '../../../src/issues/index.js';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('live issue sync clients', () => {
  it('imports a GitHub issue and comments as an external snapshot', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('/repos/acme/project/issues/42/comments')) {
        return jsonResponse([
          {
            id: 99,
            body: 'Remote comment',
            created_at: '2026-05-25T01:00:00.000Z',
            updated_at: '2026-05-25T01:00:00.000Z',
            user: { login: 'octocat' },
          },
        ]);
      }
      return jsonResponse({
        number: 42,
        html_url: 'https://github.com/acme/project/issues/42',
        title: 'Remote issue',
        body: 'Remote body',
        state: 'open',
        labels: [{ name: 'feature' }],
        created_at: '2026-05-25T00:00:00.000Z',
        updated_at: '2026-05-25T00:30:00.000Z',
      });
    });

    const client = new LiveIssueClient({ provider: 'github', repo: 'acme/project', fetchFn: fetchFn as never });
    const snapshot = await client.importIssue('42');

    expect(snapshot).toMatchObject({
      provider: 'github',
      external_id: '42',
      external_url: 'https://github.com/acme/project/issues/42',
      title: 'Remote issue',
      labels: ['feature'],
    });
    expect(snapshot.comments?.[0]).toMatchObject({ external_id: '99', author: 'octocat', body: 'Remote comment' });
  });

  it('exports a new local issue and returns comment id mappings', async () => {
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.endsWith('/repos/acme/project/issues')) {
        return jsonResponse({
          number: 42,
          html_url: 'https://github.com/acme/project/issues/42',
          title: 'Local issue',
          body: 'Body',
          state: 'open',
          labels: ['sync'],
          created_at: '2026-05-25T00:00:00.000Z',
          updated_at: '2026-05-25T00:00:00.000Z',
        });
      }
      if (init?.method === 'POST' && url.endsWith('/repos/acme/project/issues/42/comments')) {
        return jsonResponse({
          id: 1001,
          body: 'Comment',
          created_at: '2026-05-25T00:01:00.000Z',
          updated_at: '2026-05-25T00:01:00.000Z',
          user: { login: 'operator' },
        });
      }
      if (init?.method === 'GET' && url.endsWith('/repos/acme/project/issues/42/comments')) return jsonResponse([]);
      return jsonResponse({
        number: 42,
        html_url: 'https://github.com/acme/project/issues/42',
        title: 'Local issue',
        body: 'Body',
        state: 'open',
        labels: ['sync'],
        created_at: '2026-05-25T00:00:00.000Z',
        updated_at: '2026-05-25T00:00:00.000Z',
      });
    });
    const client = new LiveIssueClient({ provider: 'github', repo: 'acme/project', fetchFn: fetchFn as never });

    const result = await client.exportIssue({
      provider: 'github',
      local_issue_id: 'LOC-0001',
      external_id: '',
      external_url: null,
      title: 'Local issue',
      body: 'Body',
      status: 'open',
      labels: ['sync'],
      created_at: '2026-05-25T00:00:00.000Z',
      updated_at: '2026-05-25T00:00:00.000Z',
      comments: [
        {
          local_event_id: 'evt-1',
          external_id: null,
          author: 'operator',
          body: 'Comment',
          created_at: '2026-05-25T00:01:00.000Z',
        },
      ],
    });

    expect(result.snapshot.external_id).toBe('42');
    expect(result.commentMappings).toEqual([{ local_event_id: 'evt-1', external_comment_id: '1001' }]);
  });

  it('loads tokens only from provider-specific environment variables', () => {
    expect(resolveToken('gitea', { AIWG_GITEA_TOKEN: 'gitea-token' })).toBe('gitea-token');
    expect(resolveToken('github', { GITHUB_TOKEN: 'github-token' })).toBe('github-token');
  });
});
