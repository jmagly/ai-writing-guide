import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runExternalJob } from '../../src/jobs/runner.js';
import type {
  ExecutorResult, ExternalJobFlow, JobComment, JobExecutor, JobIssue, WorkItemClient,
} from '../../src/jobs/types.js';

const roots: string[] = [];

async function fixture(): Promise<{ root: string; flow: ExternalJobFlow }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aiwg-job-runner-'));
  roots.push(root);
  await mkdir(path.join(root, 'prompts'), { recursive: true });
  await mkdir(path.join(root, 'approved-assets'), { recursive: true });
  await writeFile(path.join(root, 'prompts/run.md'), 'Perform the approved task.');
  return {
    root,
    flow: {
      apiVersion: 'jobs.aiwg.io/v1', kind: 'ExternalJob',
      metadata: { name: 'test-job', revision: '1' },
      spec: {
        trigger: { type: 'external' },
        executor: { provider: 'codex', mode: 'exec', workspace: root, prompt: 'prompts/run.md', resultSchema: 'result.schema.json', binary: process.execPath },
        workItem: {
          provider: 'gitea', baseUrl: 'https://git.example.test', repository: 'team/jobs',
          tokenFile: '/run/credentials/test-token', eligibleLabels: ['job'], claimSettleMs: 100,
        },
        approval: { required: true, label: 'approved-for-publish' },
        security: {
          allowedOrigins: ['https://social.example.test'], allowedAccounts: ['brand-main'],
          approvedAttachmentRoots: [path.join(root, 'approved-assets')],
        },
        completion: { require: ['external-result-url', 'issue-comment', 'idempotency-key', 'verification'] },
      },
    },
  };
}

class MemoryClient implements WorkItemClient {
  comments = new Map<number, JobComment[]>();
  nextId = 1;
  initialBarrier?: () => Promise<void>;
  constructor(public issues: JobIssue[]) {}
  async currentUser() { return 'aiwg-bot'; }
  async listOpenIssues(labels: string[]) { return this.issues.filter(issue => labels.every(label => issue.labels.includes(label))); }
  async listComments(issue: number) {
    if (this.initialBarrier && (this.comments.get(issue)?.length ?? 0) === 0) await this.initialBarrier();
    return [...(this.comments.get(issue) ?? [])];
  }
  async addComment(issue: number, body: string) {
    const comment = { id: this.nextId++, author: 'aiwg-bot', body, createdAt: new Date().toISOString() };
    this.comments.set(issue, [...(this.comments.get(issue) ?? []), comment]);
    return comment;
  }
}

class FakeExecutor implements JobExecutor {
  calls = 0;
  constructor(private readonly result: (key: string) => Record<string, unknown>, private readonly exitCode = 0) {}
  async execute(input: Parameters<JobExecutor['execute']>[0]): Promise<ExecutorResult> {
    this.calls += 1;
    return { exitCode: this.exitCode, stdout: '{}\n', stderr: '', finalMessage: JSON.stringify(this.result(input.idempotencyKey)) };
  }
}

function success(key: string) {
  return {
    idempotencyKey: key,
    externalResultUrl: 'https://social.example.test/posts/42',
    account: 'brand-main',
    verification: 'Post is visible and matches the approved item.',
    attachmentPaths: [],
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('external job runner integration', () => {
  it('claims approved work, executes once, and writes completion evidence', async () => {
    const { root, flow } = await fixture();
    const client = new MemoryClient([{ number: 12, title: 'Publish', body: 'fixture', labels: ['job', 'approved-for-publish'] }]);
    const executor = new FakeExecutor(success);
    const result = await runExternalJob({ flow, client, executor, stateRoot: path.join(root, 'state') });
    expect(result).toMatchObject({ status: 'completed', issue: 12, externalResultUrl: 'https://social.example.test/posts/42' });
    expect(executor.calls).toBe(1);
    expect(client.comments.get(12)?.some(comment => comment.body.includes('aiwg-job:complete'))).toBe(true);
  });

  it('returns no eligible work when approval or queue labels are absent', async () => {
    const { root, flow } = await fixture();
    const client = new MemoryClient([{ number: 12, title: 'Draft', body: '', labels: ['job'] }]);
    const executor = new FakeExecutor(success);
    expect(await runExternalJob({ flow, client, executor, stateRoot: path.join(root, 'state') }))
      .toEqual({ status: 'no-eligible-work' });
    expect(executor.calls).toBe(0);
  });

  it('detects a completed retry and does not repeat the external action', async () => {
    const { root, flow } = await fixture();
    const client = new MemoryClient([{ number: 12, title: 'Publish', body: '', labels: ['job', 'approved-for-publish'] }]);
    const executor = new FakeExecutor(success);
    expect((await runExternalJob({ flow, client, executor, stateRoot: path.join(root, 'state-a') })).status).toBe('completed');
    expect((await runExternalJob({ flow, client, executor, stateRoot: path.join(root, 'state-b') })).status).toBe('already-completed');
    expect(executor.calls).toBe(1);
  });

  it('records failed verification without a completion marker', async () => {
    const { root, flow } = await fixture();
    const client = new MemoryClient([{ number: 12, title: 'Publish', body: '', labels: ['job', 'approved-for-publish'] }]);
    const executor = new FakeExecutor(key => ({ ...success(key), externalResultUrl: 'https://evil.example/posts/1' }));
    const result = await runExternalJob({ flow, client, executor, stateRoot: path.join(root, 'state') });
    expect(result.status).toBe('failed-verification');
    expect(client.comments.get(12)?.some(comment => comment.body.includes('aiwg-job:complete'))).toBe(false);
    expect(client.comments.get(12)?.at(-1)?.body).toContain('did not pass completion verification');
    expect((await runExternalJob({ flow, client, executor, stateRoot: path.join(root, 'retry-state') })).status).toBe('failed-verification');
    expect(executor.calls).toBe(1);
  });

  it('elects one winner when two hosts claim concurrently', async () => {
    const { root, flow } = await fixture();
    flow.spec.workItem.claimSettleMs = 100;
    const client = new MemoryClient([{ number: 12, title: 'Publish', body: '', labels: ['job', 'approved-for-publish'] }]);
    let initialReads = 0;
    let releaseBarrier!: () => void;
    const barrier = new Promise<void>(resolve => { releaseBarrier = resolve; });
    client.initialBarrier = async () => {
      initialReads += 1;
      if (initialReads === 2) releaseBarrier();
      await barrier;
    };
    const executor = new FakeExecutor(success);
    const [left, right] = await Promise.all([
      runExternalJob({ flow, client, executor, stateRoot: path.join(root, 'host-a'), runnerId: 'a' }),
      runExternalJob({ flow, client, executor, stateRoot: path.join(root, 'host-b'), runnerId: 'b' }),
    ]);
    expect([left.status, right.status].sort()).toEqual(['claim-lost', 'completed']);
    expect(executor.calls).toBe(1);
  });

  it('refuses overlapping runs on the same host state directory', async () => {
    const { root, flow } = await fixture();
    const stateRoot = path.join(root, 'state');
    await mkdir(path.join(stateRoot, 'locks'), { recursive: true });
    await writeFile(path.join(stateRoot, 'locks/test-job.lock'), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    const client = new MemoryClient([{ number: 12, title: 'Publish', body: '', labels: ['job', 'approved-for-publish'] }]);
    const executor = new FakeExecutor(success);
    await expect(runExternalJob({ flow, client, executor, stateRoot })).rejects.toThrow('already running on this host');
    expect(executor.calls).toBe(0);
  });
});
