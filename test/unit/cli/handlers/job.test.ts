import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jobHandler } from '../../../../src/cli/handlers/job.js';
import { loadRegistry } from '../../../../src/extensions/loader.js';

const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aiwg-job-cli-'));
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), 'aiwg-job-cli-private-'));
  roots.push(root, privateRoot);
  await mkdir(path.join(root, 'prompts'));
  await mkdir(path.join(root, 'schemas'));
  await writeFile(path.join(root, 'prompts/run.md'), 'Run.');
  await writeFile(path.join(root, 'schemas/result.json'), '{}');
  const flow = path.join(root, 'job.json');
  await writeFile(flow, JSON.stringify({
    apiVersion: 'jobs.aiwg.io/v1', kind: 'ExternalJob', metadata: { name: 'demo', revision: '1' },
    spec: {
      trigger: { type: 'external' },
      executor: { provider: 'codex', mode: 'exec', workspace: root, prompt: 'prompts/run.md', resultSchema: 'schemas/result.json', binary: process.execPath },
      workItem: { provider: 'gitea', baseUrl: 'https://git.example.test', repository: 'team/jobs', tokenFile: path.join(privateRoot, 'token'), eligibleLabels: ['job'] },
      security: { allowedOrigins: ['https://social.example.test'], allowedAccounts: ['brand'], approvedAttachmentRoots: [] },
      completion: { require: ['external-result-url', 'issue-comment', 'idempotency-key', 'verification'] },
    },
  }));
  return { root, flow };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('job CLI handler', () => {
  it('is registered with a production handler', async () => {
    const loaded = await loadRegistry();
    expect(loaded.registry.resolveCommand('job')).toBe('job');
    expect(loaded.handlerMap.get('job')).toBe(jobHandler);
  });

  it('validates a flow and renders an external cron invocation', async () => {
    const { root, flow } = await fixture();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const context = (args: string[]) => ({ args, rawArgs: ['job', ...args], cwd: root, frameworkRoot: root });
    expect((await jobHandler.execute(context(['validate', flow]))).exitCode).toBe(0);
    expect(String(log.mock.calls.at(-1)?.[0])).toContain('"valid":true');
    expect((await jobHandler.execute(context(['render-cron', flow]))).exitCode).toBe(0);
    expect(String(log.mock.calls.at(-1)?.[0])).toContain('aiwg job run');
  });

  it('requires explicit single-shot mode', async () => {
    const { root, flow } = await fixture();
    const result = await jobHandler.execute({ args: ['run', flow], rawArgs: ['job', 'run', flow], cwd: root, frameworkRoot: root });
    expect(result.exitCode).toBe(2);
    expect(result.message).toContain('--once');
  });
});
