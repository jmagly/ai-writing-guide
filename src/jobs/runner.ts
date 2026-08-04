import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { approvalLabel, approvalRequired, resolveWorkspaceFile } from './flow.js';
import type {
  ExternalJobFlow, JobComment, JobExecutor, JobIssue, JobResult, WorkItemClient,
} from './types.js';

const CLAIM_PREFIX = '<!-- aiwg-job:claim ';
const COMPLETE_PREFIX = '<!-- aiwg-job:complete ';
const FAILURE_PREFIX = '<!-- aiwg-job:failed ';

interface ClaimMarker {
  job: string;
  revision: string;
  idempotencyKey: string;
  runnerId: string;
  expiresAt: string;
}

interface CompleteMarker {
  job: string;
  revision: string;
  idempotencyKey: string;
  externalResultUrl: string;
}

interface FailureMarker {
  job: string;
  revision: string;
  idempotencyKey: string;
  reason: string;
}

function marker<T>(body: string, prefix: string): T | null {
  const line = body.split(/\r?\n/u).find(candidate => candidate.startsWith(prefix) && candidate.endsWith(' -->'));
  if (!line) return null;
  try { return JSON.parse(line.slice(prefix.length, -4)) as T; } catch { return null; }
}

function jobKey(flow: ExternalJobFlow, issue: number): string {
  return createHash('sha256')
    .update(`${flow.metadata.name}\0${flow.metadata.revision}\0${issue}`)
    .digest('hex');
}

function claimBody(flow: ExternalJobFlow, issue: JobIssue, runnerId: string, expiresAt: string): string {
  const value: ClaimMarker = {
    job: flow.metadata.name,
    revision: flow.metadata.revision,
    idempotencyKey: jobKey(flow, issue.number),
    runnerId,
    expiresAt,
  };
  return `${CLAIM_PREFIX}${JSON.stringify(value)} -->\n\nAIWG external job claim. Execution remains subject to the reviewed flow contract.`;
}

function completionBody(flow: ExternalJobFlow, result: JobResult): string {
  const value: CompleteMarker = {
    job: flow.metadata.name,
    revision: flow.metadata.revision,
    idempotencyKey: result.idempotencyKey!,
    externalResultUrl: result.externalResultUrl!,
  };
  return [
    `${COMPLETE_PREFIX}${JSON.stringify(value)} -->`,
    '',
    `AIWG external job **${flow.metadata.name}** completed.`,
    `- Idempotency key: \`${result.idempotencyKey}\``,
    `- External result: ${result.externalResultUrl}`,
    `- Account: \`${result.account}\``,
    `- Verification: \`${result.verification!.replace(/[\r\n`]+/gu, ' ').slice(0, 1000)}\``,
  ].join('\n');
}

function failureBody(flow: ExternalJobFlow, key: string, message: string): string {
  const safeMessage = message.replace(/[\r\n]+/gu, ' ').slice(0, 1000);
  const value: FailureMarker = {
    job: flow.metadata.name,
    revision: flow.metadata.revision,
    idempotencyKey: key,
    reason: safeMessage,
  };
  return [
    `${FAILURE_PREFIX}${JSON.stringify(value)} -->`,
    '',
    `AIWG external job **${flow.metadata.name}** did not pass completion verification.`,
    `- Idempotency key: \`${key}\``,
    `- Result: no completion marker was written`,
    `- Reason: ${safeMessage}`,
  ].join('\n');
}

function failedBy(comments: JobComment[], actor: string, key: string): FailureMarker | null {
  for (const comment of comments) {
    if (comment.author !== actor) continue;
    const parsed = marker<FailureMarker>(comment.body, FAILURE_PREFIX);
    if (parsed?.idempotencyKey === key) return parsed;
  }
  return null;
}

function validateExternalUrl(flow: ExternalJobFlow, value: string): URL {
  const resultUrl = new URL(value);
  if (!flow.spec.security.allowedOrigins.includes(resultUrl.origin)) throw new Error('external result origin is not allow-listed');
  if (resultUrl.username || resultUrl.password) throw new Error('external result URL must not contain user information');
  for (const parameter of resultUrl.searchParams.keys()) {
    if (/(auth|cookie|credential|key|password|secret|session|signature|token)/iu.test(parameter)) {
      throw new Error('external result URL contains a sensitive query parameter');
    }
  }
  return resultUrl;
}

function completedBy(flow: ExternalJobFlow, comments: JobComment[], actor: string, key: string): CompleteMarker | null {
  for (const comment of comments) {
    if (comment.author !== actor) continue;
    const parsed = marker<CompleteMarker>(comment.body, COMPLETE_PREFIX);
    if (parsed?.idempotencyKey === key && typeof parsed.externalResultUrl === 'string') {
      validateExternalUrl(flow, parsed.externalResultUrl);
      return parsed;
    }
  }
  return null;
}

function activeClaims(comments: JobComment[], actor: string, key: string, now: number): Array<{ comment: JobComment; marker: ClaimMarker }> {
  return comments.flatMap(comment => {
    if (comment.author !== actor) return [];
    const parsed = marker<ClaimMarker>(comment.body, CLAIM_PREFIX);
    const expiry = parsed ? Date.parse(parsed.expiresAt) : Number.NaN;
    if (!parsed || parsed.idempotencyKey !== key || !Number.isFinite(expiry) || expiry <= now) return [];
    return [{ comment, marker: parsed }];
  }).sort((left, right) => left.comment.id - right.comment.id);
}

async function isInside(file: string, roots: string[]): Promise<boolean> {
  let resolved: string;
  try { resolved = await fs.realpath(file); } catch { return false; }
  const canonicalRoots = await Promise.all(roots.map(root => fs.realpath(root)));
  return canonicalRoots.some(root => {
    const relation = path.relative(root, resolved);
    return relation === '' || (!relation.startsWith('..') && !path.isAbsolute(relation));
  });
}

async function validateResult(flow: ExternalJobFlow, key: string, finalMessage: string): Promise<JobResult> {
  let value: Record<string, unknown>;
  try { value = JSON.parse(finalMessage) as Record<string, unknown>; } catch { throw new Error('executor final response is not JSON'); }
  if (value.idempotencyKey !== key) throw new Error('executor returned a different idempotency key');
  if (typeof value.externalResultUrl !== 'string') throw new Error('externalResultUrl is required');
  validateExternalUrl(flow, value.externalResultUrl);
  if (typeof value.account !== 'string' || !flow.spec.security.allowedAccounts.includes(value.account)) {
    throw new Error('result account is not allow-listed');
  }
  if (typeof value.verification !== 'string' || !value.verification.trim()) throw new Error('verification evidence is required');
  const attachments = value.attachmentPaths ?? [];
  if (!Array.isArray(attachments) || !attachments.every(item => typeof item === 'string')) {
    throw new Error('attachmentPaths must be an array of paths');
  }
  const approvedAttachments = await Promise.all(attachments.map(item => isInside(item as string, flow.spec.security.approvedAttachmentRoots)));
  if (!approvedAttachments.every(Boolean)) {
    throw new Error('result references an attachment outside approved roots');
  }
  return {
    status: 'completed', idempotencyKey: key, externalResultUrl: value.externalResultUrl,
    account: value.account, verification: value.verification, attachmentPaths: attachments as string[],
  };
}

async function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
}

async function acquireLock(stateRoot: string, flow: ExternalJobFlow): Promise<() => Promise<void>> {
  const directory = path.join(stateRoot, 'locks');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, `${flow.metadata.name}.lock`);
  const create = async () => {
    const handle = await fs.open(file, 'wx', 0o600);
    await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    await handle.close();
  };
  try { await create(); } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    let stale = false;
    try {
      const lock = JSON.parse(await fs.readFile(file, 'utf8')) as { pid?: number; startedAt?: string };
      const tooOld = !lock.startedAt || Date.now() - Date.parse(lock.startedAt) > (flow.spec.workItem.claimTtlSeconds ?? 900) * 1000;
      let alive = false;
      if (typeof lock.pid === 'number') {
        try { process.kill(lock.pid, 0); alive = true; } catch { /* process is gone or inaccessible */ }
      }
      stale = tooOld && !alive;
    } catch { stale = true; }
    if (!stale) throw new Error(`job ${flow.metadata.name} is already running on this host`);
    await fs.unlink(file).catch(() => undefined);
    await create();
  }
  return async () => { await fs.unlink(file).catch(() => undefined); };
}

async function readRecovery(stateRoot: string, key: string): Promise<JobResult | null> {
  try { return JSON.parse(await fs.readFile(path.join(stateRoot, 'results', `${key}.json`), 'utf8')) as JobResult; }
  catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function writeRecovery(stateRoot: string, result: JobResult): Promise<void> {
  const directory = path.join(stateRoot, 'results');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const target = path.join(directory, `${result.idempotencyKey}.json`);
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporary, target);
}

async function writeRunRecord(runDirectory: string, record: Record<string, unknown>): Promise<void> {
  const target = path.join(runDirectory, 'run.json');
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporary, target);
}

export interface RunExternalJobOptions {
  flow: ExternalJobFlow;
  client: WorkItemClient;
  executor: JobExecutor;
  stateRoot?: string;
  signal?: AbortSignal;
  now?: () => number;
  runnerId?: string;
}

export async function runExternalJob(options: RunExternalJobOptions): Promise<JobResult> {
  const { flow, client, executor, signal } = options;
  const now = options.now ?? Date.now;
  const stateRoot = options.stateRoot ?? path.join(flow.spec.executor.workspace, '.aiwg', 'jobs');
  if (path.resolve(stateRoot) === path.parse(path.resolve(stateRoot)).root) throw new Error('job state root must not be a filesystem root');
  const release = await acquireLock(stateRoot, flow);
  try {
    const actor = await client.currentUser(signal);
    const requiredLabels = [...flow.spec.workItem.eligibleLabels];
    if (approvalRequired(flow) && !requiredLabels.includes(approvalLabel(flow))) requiredLabels.push(approvalLabel(flow));
    const issues = await client.listOpenIssues(requiredLabels, signal);
    let lostClaim = false;
    for (const issue of issues) {
      const key = jobKey(flow, issue.number);
      let comments = await client.listComments(issue.number, signal);
      const completed = completedBy(flow, comments, actor, key);
      if (completed) return { status: 'already-completed', issue: issue.number, idempotencyKey: key, externalResultUrl: completed.externalResultUrl };
      const priorFailure = failedBy(comments, actor, key);
      if (priorFailure) return { status: 'failed-verification', issue: issue.number, idempotencyKey: key, message: priorFailure.reason };

      const recovered = await readRecovery(stateRoot, key);
      if (recovered?.status === 'completed') {
        const verifiedRecovery = { ...await validateResult(flow, key, JSON.stringify(recovered)), issue: issue.number };
        await client.addComment(issue.number, completionBody(flow, verifiedRecovery), signal);
        return { ...verifiedRecovery, status: 'already-completed' };
      }
      if (recovered?.status === 'failed-verification') return { ...recovered, issue: issue.number };
      if (activeClaims(comments, actor, key, now()).length > 0) continue;

      const runnerId = options.runnerId ?? randomUUID();
      const ttl = flow.spec.workItem.claimTtlSeconds ?? 900;
      const expiresAt = new Date(now() + ttl * 1000).toISOString();
      const own = await client.addComment(issue.number, claimBody(flow, issue, runnerId, expiresAt), signal);
      await delay(flow.spec.workItem.claimSettleMs ?? 1000, signal);
      comments = await client.listComments(issue.number, signal);
      const duringClaim = completedBy(flow, comments, actor, key);
      if (duringClaim) return { status: 'already-completed', issue: issue.number, idempotencyKey: key, externalResultUrl: duringClaim.externalResultUrl };
      const winner = activeClaims(comments, actor, key, now())[0];
      if (!winner || winner.comment.id !== own.id) { lostClaim = true; continue; }

      const stillEligible = (await client.listOpenIssues(requiredLabels, signal)).some(candidate => candidate.number === issue.number);
      if (!stillEligible) { lostClaim = true; continue; }

      const runDirectory = path.join(stateRoot, 'runs', `${key}-${Date.now()}`);
      await fs.mkdir(runDirectory, { recursive: true, mode: 0o700 });
      const prompt = await fs.readFile(resolveWorkspaceFile(flow, flow.spec.executor.prompt), 'utf8');
      const startedAt = new Date().toISOString();
      const execution = await executor.execute({ flow, prompt, issue, idempotencyKey: key, runDirectory, signal });
      if (execution.exitCode !== 0) {
        const message = `executor exited with status ${execution.exitCode}`;
        await writeRunRecord(runDirectory, { job: flow.metadata.name, revision: flow.metadata.revision, issue: issue.number, idempotencyKey: key, startedAt, finishedAt: new Date().toISOString(), exitStatus: execution.exitCode, status: 'failed-verification', message });
        await writeRecovery(stateRoot, { status: 'failed-verification', issue: issue.number, idempotencyKey: key, message });
        await client.addComment(issue.number, failureBody(flow, key, message), signal);
        return { status: 'failed-verification', issue: issue.number, idempotencyKey: key, message };
      }
      try {
        const result = { ...await validateResult(flow, key, execution.finalMessage), issue: issue.number };
        await writeRunRecord(runDirectory, { job: flow.metadata.name, revision: flow.metadata.revision, issue: issue.number, idempotencyKey: key, startedAt, finishedAt: new Date().toISOString(), exitStatus: execution.exitCode, status: result.status, externalResultUrl: result.externalResultUrl });
        await writeRecovery(stateRoot, result);
        await client.addComment(issue.number, completionBody(flow, result), signal);
        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        await writeRunRecord(runDirectory, { job: flow.metadata.name, revision: flow.metadata.revision, issue: issue.number, idempotencyKey: key, startedAt, finishedAt: new Date().toISOString(), exitStatus: execution.exitCode, status: 'failed-verification', message });
        await writeRecovery(stateRoot, { status: 'failed-verification', issue: issue.number, idempotencyKey: key, message });
        await client.addComment(issue.number, failureBody(flow, key, message), signal);
        return { status: 'failed-verification', issue: issue.number, idempotencyKey: key, message };
      }
    }
    return { status: lostClaim ? 'claim-lost' : 'no-eligible-work' };
  } finally {
    await release();
  }
}
