import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { afterEach, describe, expect, it } from 'vitest';
import { CodexJobExecutor } from '../../../src/jobs/executor.js';
import { approvalRequired, loadJobFlow } from '../../../src/jobs/flow.js';
import { renderExternalTrigger } from '../../../src/jobs/render.js';
import type { ExternalJobFlow } from '../../../src/jobs/types.js';

const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aiwg-job-unit-'));
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), 'aiwg-job-private-'));
  roots.push(root, privateRoot);
  await mkdir(path.join(root, 'prompts'));
  await mkdir(path.join(root, 'schemas'));
  await mkdir(path.join(root, 'assets'));
  await writeFile(path.join(root, 'prompts/run.md'), 'Original prompt');
  await writeFile(path.join(root, 'schemas/result.json'), '{}');
  const tokenFile = path.join(privateRoot, 'token');
  await writeFile(tokenFile, 'fixture-private-value', { mode: 0o600 });
  const flow: ExternalJobFlow = {
    apiVersion: 'jobs.aiwg.io/v1', kind: 'ExternalJob', metadata: { name: 'demo', revision: '1' },
    spec: {
      trigger: { type: 'external' },
      executor: { provider: 'codex', mode: 'exec', workspace: root, prompt: 'prompts/run.md', resultSchema: 'schemas/result.json', binary: process.execPath },
      workItem: {
        provider: 'gitea', baseUrl: 'https://git.example.test', repository: 'team/jobs',
        tokenFile, eligibleLabels: ['job'],
      },
      security: { allowedOrigins: ['https://social.example.test'], allowedAccounts: ['brand'], approvedAttachmentRoots: [path.join(root, 'assets')] },
      completion: { require: ['external-result-url', 'issue-comment', 'idempotency-key', 'verification'] },
    },
  };
  return { root, privateRoot, tokenFile, flow };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('external job flow and renderer', () => {
  it('publishes valid draft-2020 schemas for the flow and structured result', async () => {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    const [flowSchema, resultSchema] = await Promise.all([
      readFile(path.resolve('schemas/jobs/external-job.v1.schema.json'), 'utf8').then(JSON.parse),
      readFile(path.resolve('schemas/jobs/external-job-result.v1.schema.json'), 'utf8').then(JSON.parse),
    ]);
    expect(() => ajv.compile(flowSchema)).not.toThrow();
    expect(() => ajv.compile(resultSchema)).not.toThrow();
  });

  it('loads the v1 contract and defaults external mutation approval to required', async () => {
    const { root, flow } = await fixture();
    const file = path.join(root, 'job.yaml');
    await writeFile(file, JSON.stringify(flow));
    const loaded = await loadJobFlow(file);
    expect(loaded.flow.metadata).toEqual({ name: 'demo', revision: '1' });
    expect(approvalRequired(loaded.flow)).toBe(true);
  });

  it('rejects a credential reference inside the reviewed workspace', async () => {
    const { root, flow } = await fixture();
    flow.spec.workItem.tokenFile = path.join(root, 'token');
    const file = path.join(root, 'job.json');
    await writeFile(file, JSON.stringify(flow));
    await expect(loadJobFlow(file)).rejects.toThrow('must be outside executor.workspace');
  });

  it('renders cron, systemd, and Gitea Actions without credential material or resident-daemon claims', async () => {
    const { root, flow } = await fixture();
    const file = path.join(root, 'job.yaml');
    for (const format of ['cron', 'systemd', 'gitea-actions'] as const) {
      const output = renderExternalTrigger(flow, file, format);
      expect(output).toContain('aiwg job run');
      expect(output).toContain('--once');
      expect(output).not.toContain('fixture-private-value');
      expect(output).not.toContain('aiwg daemon');
    }
  });
});

describe('Codex single-shot executor', () => {
  it('passes the prompt and constraints on stdin, requests structured output, and redacts persisted logs', async () => {
    const { root, flow } = await fixture();
    const executable = path.join(root, 'fake-codex.mjs');
    const captured = path.join(root, 'captured-stdin.txt');
    await writeFile(executable, `#!/usr/bin/env node
import fs from 'node:fs';
const args = process.argv.slice(2);
const output = args[args.indexOf('--output-last-message') + 1];
let input = '';
for await (const chunk of process.stdin) input += chunk;
fs.writeFileSync(${JSON.stringify(captured)}, input);
const key = JSON.parse(input.slice(input.indexOf('{'))).aiwgJob.idempotencyKey;
fs.writeFileSync(output, JSON.stringify({idempotencyKey:key,externalResultUrl:'https://social.example.test/posts/1',account:'brand',verification:'fixture-private-value',attachmentPaths:[]}));
console.log('token fixture-private-value');
`);
    await chmod(executable, 0o700);
    flow.spec.executor.binary = executable;
    const runDirectory = path.join(root, 'run');
    await mkdir(runDirectory);
    const result = await new CodexJobExecutor().execute({
      flow, prompt: 'Original prompt', issue: { number: 7, title: 'Task', body: '', labels: [] },
      idempotencyKey: 'a'.repeat(64), runDirectory,
    });
    expect(result.exitCode).toBe(0);
    expect(await readFile(captured, 'utf8')).toContain('Original prompt');
    expect(await readFile(captured, 'utf8')).toContain('"idempotencyKey": "aaaaaaaa');
    expect(await readFile(path.join(runDirectory, 'stdout.jsonl'), 'utf8')).toContain('[REDACTED]');
    expect(result.finalMessage).toContain('externalResultUrl');
    expect(result.finalMessage).not.toContain('fixture-private-value');
  });
});
