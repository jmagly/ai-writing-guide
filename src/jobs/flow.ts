import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import { z } from 'zod';
import { JOB_API_VERSION, JOB_KIND, type ExternalJobFlow } from './types.js';

const relativeFile = z.string().min(1).refine(value => {
  if (path.isAbsolute(value)) return false;
  const normalized = path.normalize(value);
  return normalized !== '..' && !normalized.startsWith(`..${path.sep}`);
}, 'must stay relative to executor.workspace');
const absolutePath = z.string().min(1)
  .refine(path.isAbsolute, 'must be an absolute path')
  .refine(value => path.resolve(value) !== path.parse(path.resolve(value)).root, 'must not be a filesystem root');
const httpsOrigin = z.string().url().refine(value => new URL(value).protocol === 'https:', 'must use https');
const accountName = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.@:-]{0,127}$/u);

export const externalJobFlowSchema = z.object({
  apiVersion: z.literal(JOB_API_VERSION),
  kind: z.literal(JOB_KIND),
  metadata: z.object({
    name: z.string().regex(/^[a-z][a-z0-9-]{0,62}$/u),
    revision: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u),
  }).strict(),
  spec: z.object({
    trigger: z.object({ type: z.literal('external') }).strict(),
    executor: z.object({
      provider: z.literal('codex'),
      mode: z.literal('exec'),
      workspace: absolutePath,
      prompt: relativeFile,
      resultSchema: relativeFile,
      binary: absolutePath,
    }).strict(),
    workItem: z.object({
      provider: z.literal('gitea'),
      baseUrl: z.string().url().refine(value => new URL(value).protocol === 'https:', 'must use https'),
      repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u),
      tokenFile: absolutePath,
      eligibleLabels: z.array(z.string().min(1)).min(1),
      claimTtlSeconds: z.number().int().min(30).max(86400).optional(),
      claimSettleMs: z.number().int().min(100).max(30000).optional(),
    }).strict(),
    approval: z.object({
      required: z.boolean().optional(),
      label: z.string().min(1).optional(),
    }).strict().optional(),
    security: z.object({
      allowedOrigins: z.array(httpsOrigin).min(1),
      allowedAccounts: z.array(accountName).min(1),
      approvedAttachmentRoots: z.array(absolutePath),
      sensitiveValueFiles: z.array(absolutePath).optional(),
    }).strict(),
    completion: z.object({
      require: z.array(z.enum([
        'external-result-url', 'issue-comment', 'idempotency-key', 'verification',
      ])).min(1),
    }).strict(),
  }).strict(),
}).strict().superRefine((flow, ctx) => {
  const workspace = path.resolve(flow.spec.executor.workspace);
  const within = (candidate: string) => {
    const relative = path.relative(workspace, path.resolve(candidate));
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  };
  if (within(flow.spec.workItem.tokenFile)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['spec', 'workItem', 'tokenFile'], message: 'must be outside executor.workspace' });
  }
  for (const [index, file] of (flow.spec.security.sensitiveValueFiles ?? []).entries()) {
    if (within(file)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['spec', 'security', 'sensitiveValueFiles', index], message: 'must be outside executor.workspace' });
  }
  const origins = flow.spec.security.allowedOrigins;
  origins.forEach((value, index) => {
    const url = new URL(value);
    if (url.origin !== value.replace(/\/$/u, '')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['spec', 'security', 'allowedOrigins', index], message: 'must be an origin without a path, query, or fragment' });
    }
  });
  const evidence = new Set(flow.spec.completion.require);
  for (const required of ['external-result-url', 'issue-comment', 'idempotency-key', 'verification'] as const) {
    if (!evidence.has(required)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['spec', 'completion', 'require'], message: `must include ${required}` });
    }
  }
});

export interface LoadedJobFlow {
  flow: ExternalJobFlow;
  file: string;
}

export async function loadJobFlow(file: string, cwd = process.cwd()): Promise<LoadedJobFlow> {
  const absolute = path.resolve(cwd, file);
  const source = await fs.readFile(absolute, 'utf8');
  const parsed = absolute.endsWith('.json') ? JSON.parse(source) : loadYaml(source);
  return { flow: externalJobFlowSchema.parse(parsed) as ExternalJobFlow, file: absolute };
}

export function resolveWorkspaceFile(flow: ExternalJobFlow, relative: string): string {
  const workspace = path.resolve(flow.spec.executor.workspace);
  const resolved = path.resolve(workspace, relative);
  const relation = path.relative(workspace, resolved);
  if (relation.startsWith('..') || path.isAbsolute(relation)) throw new Error(`${relative} escapes executor.workspace`);
  return resolved;
}

export function approvalRequired(flow: ExternalJobFlow): boolean {
  return flow.spec.approval?.required !== false;
}

export function approvalLabel(flow: ExternalJobFlow): string {
  return flow.spec.approval?.label ?? 'approved-for-publish';
}
