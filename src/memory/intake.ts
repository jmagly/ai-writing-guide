import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';

export interface MemoryIntakePreview {
  schemaVersion: 'aiwg.compound-memory.intake-preview.v1';
  operationId: string;
  source: { locator: string; digest: string; byteLength: number; kind: string };
  rawLocator: string;
  route: 'sessions' | 'llm-wiki';
  duplicate: boolean;
  confirmationRequired: true;
  mutation: { wouldCopyRaw: boolean; wouldPromoteKnowledge: false };
}

export interface MemoryIntakeReceipt {
  schemaVersion: 'aiwg.compound-memory.intake-receipt.v1';
  receiptId: string;
  operationId: string;
  sourceLocator: string;
  sourceDigest: string;
  rawLocator: string;
  route: MemoryIntakePreview['route'];
  duplicate: boolean;
  registeredAt: string;
}

function sha256(value: Buffer | string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function safeProjectFile(projectRoot: string, requested: string): { absolute: string; locator: string } {
  const root = realpathSync(projectRoot);
  const candidate = realpathSync(resolve(root, requested));
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    throw new Error('intake source must resolve inside the project');
  }
  const segments = relative(root, candidate).split(sep);
  if (segments.some(segment => segment === '.env' || segment === '.ssh'
    || /^(?:credentials?|secrets?|tokens?)(?:\.|$)/i.test(segment))) {
    throw new Error('protected paths cannot be ingested into ordinary project memory');
  }
  return { absolute: candidate, locator: segments.join('/') };
}

function kindFor(filePath: string): string {
  const extension = extname(filePath).toLocaleLowerCase();
  if (['.jsonl', '.transcript'].includes(extension)) return 'session-transcript';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(extension)) return 'image';
  if (extension === '.pdf') return 'pdf';
  if (['.yaml', '.yml', '.json'].includes(extension)) return 'structured';
  if (['.md', '.txt', '.html', '.htm'].includes(extension)) return 'document';
  return 'artifact';
}

function assertFuturePathInsideProject(projectRoot: string, target: string): void {
  let ancestor = target;
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const actual = realpathSync(ancestor);
  if (actual !== projectRoot && !actual.startsWith(`${projectRoot}${sep}`)) {
    throw new Error('intake storage cannot traverse a link outside the project');
  }
}

function atomicJson(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  renameSync(temporary, filePath);
}

export class MemoryIntakeCoordinator {
  private readonly projectRoot: string;
  private readonly rawRoot: string;
  private readonly receiptRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = realpathSync(projectRoot);
    this.rawRoot = resolve(this.projectRoot, '.aiwg/wiki/raw');
    this.receiptRoot = resolve(this.projectRoot, '.aiwg/memory/compound-memory/intake-receipts');
    assertFuturePathInsideProject(this.projectRoot, this.rawRoot);
    assertFuturePathInsideProject(this.projectRoot, this.receiptRoot);
  }

  preview(requested: string): MemoryIntakePreview {
    const source = safeProjectFile(this.projectRoot, requested);
    const stat = statSync(source.absolute);
    if (!stat.isFile()) throw new Error('intake source must be a regular file');
    const bytes = readFileSync(source.absolute);
    const digest = sha256(bytes);
    const kind = kindFor(source.absolute);
    const safeName = basename(source.absolute).replace(/[^a-zA-Z0-9._-]+/g, '-');
    const rawLocator = `.aiwg/wiki/raw/${digest.slice(7, 23)}-${safeName}`;
    const rawPath = resolve(this.projectRoot, rawLocator);
    const duplicate = existsSync(rawPath) && sha256(readFileSync(rawPath)) === digest;
    const identity = {
      source: { locator: source.locator, digest, byteLength: bytes.length, kind },
      rawLocator,
      route: kind === 'session-transcript' ? 'sessions' as const : 'llm-wiki' as const,
    };
    return {
      schemaVersion: 'aiwg.compound-memory.intake-preview.v1',
      operationId: sha256(JSON.stringify(identity)),
      ...identity,
      duplicate,
      confirmationRequired: true,
      mutation: { wouldCopyRaw: !duplicate, wouldPromoteKnowledge: false },
    };
  }

  confirm(requested: string, operationId: string): MemoryIntakeReceipt {
    const preview = this.preview(requested);
    const receiptPath = resolve(this.receiptRoot, `${operationId.replace(':', '_')}.json`);
    if (existsSync(receiptPath)) {
      return { ...(JSON.parse(readFileSync(receiptPath, 'utf8')) as MemoryIntakeReceipt), duplicate: true };
    }
    if (preview.operationId !== operationId) {
      throw new Error('intake confirmation requires the exact current preview');
    }
    const source = safeProjectFile(this.projectRoot, requested);
    const rawPath = resolve(this.projectRoot, preview.rawLocator);
    mkdirSync(this.rawRoot, { recursive: true, mode: 0o700 });
    if (!preview.duplicate) copyFileSync(source.absolute, rawPath, 1);
    if (sha256(readFileSync(rawPath)) !== preview.source.digest) {
      throw new Error('immutable raw copy digest does not match the source preview');
    }
    const receipt: MemoryIntakeReceipt = {
      schemaVersion: 'aiwg.compound-memory.intake-receipt.v1',
      receiptId: sha256(`${operationId}\0${preview.rawLocator}`),
      operationId,
      sourceLocator: preview.source.locator,
      sourceDigest: preview.source.digest,
      rawLocator: preview.rawLocator,
      route: preview.route,
      duplicate: preview.duplicate,
      registeredAt: new Date().toISOString(),
    };
    atomicJson(receiptPath, receipt);
    return receipt;
  }
}
