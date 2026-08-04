import { promises as fs } from 'node:fs';
import type { ExternalJobFlow, JobComment, JobIssue, WorkItemClient } from './types.js';

interface GiteaUser { login: string }
interface GiteaLabel { name: string }
interface GiteaIssuePayload { number: number; title: string; body?: string; labels?: GiteaLabel[] }
interface GiteaCommentPayload { id: number; user: GiteaUser; body: string; created_at: string }

function combinedSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(30_000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export class GiteaWorkItemClient implements WorkItemClient {
  readonly #baseUrl: string;
  readonly #repository: string;
  readonly #token: string;

  private constructor(flow: ExternalJobFlow, token: string) {
    this.#baseUrl = flow.spec.workItem.baseUrl.replace(/\/$/u, '');
    this.#repository = flow.spec.workItem.repository;
    this.#token = token;
  }

  static async create(flow: ExternalJobFlow): Promise<GiteaWorkItemClient> {
    const tokenFile = flow.spec.workItem.tokenFile;
    const stat = await fs.stat(tokenFile);
    if (!stat.isFile()) throw new Error('Gitea token reference must resolve to a regular file');
    if ((stat.mode & 0o077) !== 0) throw new Error('Gitea token file must not be accessible by group or others');
    const token = (await fs.readFile(tokenFile, 'utf8')).trim();
    if (!token) throw new Error('Gitea token file is empty');
    return new GiteaWorkItemClient(flow, token);
  }

  async #request<T>(route: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`${this.#baseUrl}/api/v1${route}`, {
      ...init,
      signal: combinedSignal(signal),
      headers: {
        Accept: 'application/json',
        Authorization: `token ${this.#token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!response.ok) throw new Error(`Gitea request failed (${response.status}) for ${route.split('?')[0]}`);
    return response.json() as Promise<T>;
  }

  #repoRoute(suffix: string): string {
    const [owner, repo] = this.#repository.split('/');
    return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${suffix}`;
  }

  async currentUser(signal?: AbortSignal): Promise<string> {
    return (await this.#request<GiteaUser>('/user', {}, signal)).login;
  }

  async listOpenIssues(labels: string[], signal?: AbortSignal): Promise<JobIssue[]> {
    const issues: GiteaIssuePayload[] = [];
    for (let page = 1; ; page += 1) {
      const query = new URLSearchParams({ state: 'open', type: 'issues', limit: '100', page: String(page) });
      const batch = await this.#request<GiteaIssuePayload[]>(this.#repoRoute(`/issues?${query}`), {}, signal);
      issues.push(...batch);
      if (batch.length < 100) break;
    }
    return issues
      .map(issue => ({
        number: issue.number,
        title: issue.title,
        body: issue.body ?? '',
        labels: (issue.labels ?? []).map(label => label.name),
      }))
      .filter(issue => labels.every(label => issue.labels.includes(label)))
      .sort((left, right) => left.number - right.number);
  }

  async listComments(issue: number, signal?: AbortSignal): Promise<JobComment[]> {
    const comments: GiteaCommentPayload[] = [];
    for (let page = 1; ; page += 1) {
      const query = new URLSearchParams({ limit: '100', page: String(page) });
      const batch = await this.#request<GiteaCommentPayload[]>(
        this.#repoRoute(`/issues/${issue}/comments?${query}`), {}, signal,
      );
      comments.push(...batch);
      if (batch.length < 100) break;
    }
    return comments.map(comment => ({
      id: comment.id,
      author: comment.user.login,
      body: comment.body,
      createdAt: comment.created_at,
    }));
  }

  async addComment(issue: number, body: string, signal?: AbortSignal): Promise<JobComment> {
    const comment = await this.#request<GiteaCommentPayload>(this.#repoRoute(`/issues/${issue}/comments`), {
      method: 'POST',
      body: JSON.stringify({ body }),
    }, signal);
    return { id: comment.id, author: comment.user.login, body: comment.body, createdAt: comment.created_at };
  }
}
