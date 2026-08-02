import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import { SessionContractError, sha256 } from './contracts.js';

const DigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);
const ReferenceSchema = z.string().min(1).max(512).refine(
  value => !/[\r\n\0]/.test(value),
  'references must be single-line inert locators',
);

export const OutputSourceReferenceSchema = z.object({
  kind: z.enum(['file', 'url', 'note', 'session', 'artifact', 'context-pack']),
  ref: ReferenceSchema,
  digest: DigestSchema.nullable().default(null),
  span: z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    quoteDigest: DigestSchema,
  }).strict().nullable().default(null),
}).strict().superRefine((value, context) => {
  if (value.span && value.span.end <= value.span.start) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'source span end must exceed start' });
  }
});

export const OutputRegistrationRequestSchema = z.object({
  outputPath: z.string().min(1),
  mediaType: z.string().min(1).max(128),
  contextPack: z.object({
    id: ReferenceSchema,
    digest: DigestSchema,
    sources: z.array(OutputSourceReferenceSchema).min(1).max(256),
  }).strict(),
  supersedes: z.array(ReferenceSchema).max(128).default([]),
  conflictsWith: z.array(ReferenceSchema).max(128).default([]),
}).strict();

export type OutputRegistrationRequest = z.infer<typeof OutputRegistrationRequestSchema>;

export interface DerivedOutputRegistration {
  schemaVersion: 'aiwg.output-registration.v1';
  registrationId: string;
  output: {
    locator: string;
    mediaType: string;
    digest: string;
    byteLength: number;
  };
  contextPack: OutputRegistrationRequest['contextPack'];
  supersedes: string[];
  conflictsWith: string[];
}

export interface OutputRegistrationPreview extends DerivedOutputRegistration {
  operationId: string;
  duplicate: boolean;
  confirmationRequired: true;
}

export interface OutputRegistrationReceipt {
  schemaVersion: 'aiwg.output-registration-receipt.v1';
  receiptId: string;
  registrationId: string;
  operationId: string;
  outputLocator: string;
  outputDigest: string;
  contextPackId: string;
  contextPackDigest: string;
  sourceRefs: string[];
  registeredAt: string;
  duplicate: boolean;
}

export interface OutputRegistrationOutboxRecord {
  schemaVersion: 'aiwg.output-registration-outbox.v1';
  operationId: string;
  registration: DerivedOutputRegistration;
  state: 'pending';
  attempts: number;
  lastError: string | null;
  updatedAt: string;
}

export interface OutputRegistrationStorePort {
  getReceipt(registrationId: string): OutputRegistrationReceipt | null;
  begin(operationId: string, registration: DerivedOutputRegistration): OutputRegistrationOutboxRecord;
  fail(registrationId: string, message: string): OutputRegistrationOutboxRecord;
  complete(operationId: string, registration: DerivedOutputRegistration): OutputRegistrationReceipt;
  pending(): OutputRegistrationOutboxRecord[];
}

/** The sink must be idempotent by registrationId. */
export interface DerivedOutputIndexPort {
  register(registration: DerivedOutputRegistration): void | Promise<void>;
}

/**
 * Minimal incremental index sink. Each registration is independently atomic,
 * discoverable, and replay-safe; corpus-wide index builders can consume these
 * bounded records without rescanning output bodies.
 */
export class FilesystemDerivedOutputIndex implements DerivedOutputIndexPort {
  private readonly root: string;

  constructor(projectRoot: string) {
    this.root = resolve(projectRoot, '.aiwg/memory/output-registration/index');
    assertStorageRootInsideProject(projectRoot, this.root);
  }

  register(registration: DerivedOutputRegistration): void {
    if (!/^sha256:[0-9a-f]{64}$/.test(registration.registrationId)) {
      throw new Error('invalid output registration identity');
    }
    const filePath = resolve(
      this.root,
      `${registration.registrationId.replace(':', '_')}.json`,
    );
    const existing = readJsonIfPresent<DerivedOutputRegistration>(filePath);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(registration)) {
        throw new SessionContractError(
          'IMPORT_CONFLICT',
          'derived output index identity already has different content',
        );
      }
      return;
    }
    writeJsonAtomic(filePath, registration);
  }

  registrations(): DerivedOutputRegistration[] {
    if (!existsSync(this.root)) return [];
    return readdirSync(this.root)
      .filter(name => /^sha256_[0-9a-f]{64}\.json$/.test(name))
      .sort()
      .map(name => JSON.parse(readFileSync(resolve(this.root, name), 'utf8')));
  }
}

function canonicalReference(value: string): string {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      parsed.username = '';
      parsed.password = '';
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    }
  } catch {
    // Non-URL references are opaque inert identifiers.
  }
  return value;
}

function assertStorageRootInsideProject(projectRoot: string, storageRoot: string): void {
  const root = realpathSync(projectRoot);
  const candidate = resolve(projectRoot, storageRoot);
  if (candidate !== resolve(projectRoot) && !candidate.startsWith(`${resolve(projectRoot)}${sep}`)) {
    throw new SessionContractError('SOURCE_OUTSIDE_ALLOWED_ROOT', 'memory storage must be inside the project');
  }
  let ancestor = candidate;
  while (!existsSync(ancestor)) {
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  const actualAncestor = realpathSync(ancestor);
  if (actualAncestor !== root && !actualAncestor.startsWith(`${root}${sep}`)) {
    throw new SessionContractError(
      'SOURCE_OUTSIDE_ALLOWED_ROOT',
      'memory storage cannot traverse a link outside the project',
    );
  }
}

function assertNoSecretMaterial(value: string, field: string): void {
  const secretAssignment = /(?:^|[?&;:\s])(?:api[_-]?key|access[_-]?token|token|secret|password|passwd|authorization)\s*[:=]\s*[^\s&;]+/i;
  const privateKey = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
  const providerToken = /(?:^|[^a-z0-9])(?:ghp|github_pat|sk|xox[baprs])_[a-z0-9_-]{16,}/i;
  if (secretAssignment.test(value) || privateKey.test(value) || providerToken.test(value)) {
    throw new SessionContractError(
      'SOURCE_NOT_AUTHORIZED',
      `${field} appears to contain secret material; store only a non-secret locator`,
    );
  }
}

function canonicalRequest(request: OutputRegistrationRequest): OutputRegistrationRequest {
  const canonical = {
    ...request,
    contextPack: {
      ...request.contextPack,
      id: canonicalReference(request.contextPack.id),
      sources: request.contextPack.sources.map(source => ({
        ...source,
        ref: canonicalReference(source.ref),
      })),
    },
    supersedes: [...new Set(request.supersedes.map(canonicalReference))].sort(),
    conflictsWith: [...new Set(request.conflictsWith.map(canonicalReference))].sort(),
  };
  assertNoSecretMaterial(canonical.contextPack.id, 'context-pack identity');
  for (const source of canonical.contextPack.sources) {
    assertNoSecretMaterial(source.ref, 'source reference');
  }
  for (const value of [...canonical.supersedes, ...canonical.conflictsWith]) {
    assertNoSecretMaterial(value, 'lifecycle reference');
  }
  return canonical;
}

function resolveImmutableOutput(projectRoot: string, requestedPath: string): {
  absolute: string;
  locator: string;
} {
  if (requestedPath.includes('\0')) {
    throw new SessionContractError('MALFORMED_SOURCE', 'output path contains a null byte');
  }
  const pathSegments = requestedPath.toLocaleLowerCase().split(/[\\/]+/);
  if (pathSegments.some(segment => segment === '.env'
    || segment === '.ssh'
    || /^(?:credentials?|secrets?|tokens?)(?:\.|$)/.test(segment))) {
    throw new SessionContractError(
      'SOURCE_NOT_AUTHORIZED',
      'sensitive credential/secret paths cannot be registered as ordinary outputs',
    );
  }
  const root = realpathSync(projectRoot);
  const candidate = realpathSync(resolve(root, requestedPath));
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    throw new SessionContractError(
      'SOURCE_OUTSIDE_ALLOWED_ROOT',
      'registered output must resolve inside the project',
    );
  }
  return { absolute: candidate, locator: relative(root, candidate).split(sep).join('/') };
}

function registrationFor(projectRoot: string, raw: OutputRegistrationRequest): DerivedOutputRegistration {
  const request = canonicalRequest(OutputRegistrationRequestSchema.parse(raw));
  const output = resolveImmutableOutput(projectRoot, request.outputPath);
  const content = readFileSync(output.absolute);
  const digest = `sha256:${createHash('sha256').update(content).digest('hex')}`;
  const identity = {
    output: { locator: output.locator, mediaType: request.mediaType, digest, byteLength: content.length },
    contextPack: request.contextPack,
    supersedes: request.supersedes,
    conflictsWith: request.conflictsWith,
  };
  return {
    schemaVersion: 'aiwg.output-registration.v1',
    registrationId: sha256(JSON.stringify(identity)),
    ...identity,
  };
}

export class FilesystemOutputRegistrationStore implements OutputRegistrationStorePort {
  private readonly root: string;
  private readonly outboxRoot: string;
  private readonly receiptRoot: string;

  constructor(projectRoot: string) {
    this.root = resolve(projectRoot, '.aiwg/memory/output-registration');
    assertStorageRootInsideProject(projectRoot, this.root);
    this.outboxRoot = resolve(this.root, 'outbox');
    this.receiptRoot = resolve(this.root, 'receipts');
  }

  getReceipt(registrationId: string): OutputRegistrationReceipt | null {
    return readJsonIfPresent<OutputRegistrationReceipt>(this.receiptPath(registrationId));
  }

  begin(operationId: string, registration: DerivedOutputRegistration): OutputRegistrationOutboxRecord {
    const existing = readJsonIfPresent<OutputRegistrationOutboxRecord>(
      this.outboxPath(registration.registrationId),
    );
    if (existing) return existing;
    const record: OutputRegistrationOutboxRecord = {
      schemaVersion: 'aiwg.output-registration-outbox.v1',
      operationId,
      registration,
      state: 'pending',
      attempts: 0,
      lastError: null,
      updatedAt: new Date().toISOString(),
    };
    writeJsonAtomic(this.outboxPath(registration.registrationId), record);
    return record;
  }

  fail(registrationId: string, message: string): OutputRegistrationOutboxRecord {
    const path = this.outboxPath(registrationId);
    const record = readJsonIfPresent<OutputRegistrationOutboxRecord>(path);
    if (!record) throw new Error(`missing output-registration outbox record: ${registrationId}`);
    const failed = {
      ...record,
      attempts: record.attempts + 1,
      lastError: message.slice(0, 512),
      updatedAt: new Date().toISOString(),
    };
    writeJsonAtomic(path, failed);
    return failed;
  }

  complete(
    operationId: string,
    registration: DerivedOutputRegistration,
  ): OutputRegistrationReceipt {
    const existing = this.getReceipt(registration.registrationId);
    if (existing) {
      unlinkIfPresent(this.outboxPath(registration.registrationId));
      return { ...existing, duplicate: true };
    }
    const receipt: OutputRegistrationReceipt = {
      schemaVersion: 'aiwg.output-registration-receipt.v1',
      receiptId: sha256(`${operationId}\0${registration.registrationId}`),
      registrationId: registration.registrationId,
      operationId,
      outputLocator: registration.output.locator,
      outputDigest: registration.output.digest,
      contextPackId: registration.contextPack.id,
      contextPackDigest: registration.contextPack.digest,
      sourceRefs: registration.contextPack.sources.map(source => source.ref),
      registeredAt: new Date().toISOString(),
      duplicate: false,
    };
    writeJsonAtomic(this.receiptPath(registration.registrationId), receipt);
    unlinkIfPresent(this.outboxPath(registration.registrationId));
    return receipt;
  }

  pending(): OutputRegistrationOutboxRecord[] {
    if (!existsSync(this.outboxRoot)) return [];
    return readdirSync(this.outboxRoot)
      .filter(name => /^sha256_[0-9a-f]{64}\.json$/.test(name))
      .sort()
      .map(name => JSON.parse(readFileSync(resolve(this.outboxRoot, name), 'utf8')));
  }

  private safeName(registrationId: string): string {
    if (!/^sha256:[0-9a-f]{64}$/.test(registrationId)) {
      throw new Error('invalid output registration identity');
    }
    return `${registrationId.replace(':', '_')}.json`;
  }

  private outboxPath(registrationId: string): string {
    return resolve(this.outboxRoot, this.safeName(registrationId));
  }

  private receiptPath(registrationId: string): string {
    return resolve(this.receiptRoot, this.safeName(registrationId));
  }
}

export class OutputRegistrationCoordinator {
  private readonly projectRoot: string;

  constructor(
    projectRoot: string,
    private readonly store: OutputRegistrationStorePort,
    private readonly index: DerivedOutputIndexPort,
  ) {
    this.projectRoot = resolve(projectRoot);
  }

  preview(request: OutputRegistrationRequest): OutputRegistrationPreview {
    const registration = registrationFor(this.projectRoot, request);
    const operationId = sha256(JSON.stringify({
      registrationId: registration.registrationId,
      outputDigest: registration.output.digest,
      contextPackDigest: registration.contextPack.digest,
    }));
    return {
      ...registration,
      operationId,
      duplicate: Boolean(this.store.getReceipt(registration.registrationId)),
      confirmationRequired: true,
    };
  }

  async register(input: {
    request: OutputRegistrationRequest;
    operationId: string;
  }): Promise<OutputRegistrationReceipt> {
    const preview = this.preview(input.request);
    if (preview.operationId !== input.operationId) {
      throw new SessionContractError(
        'OPERATION_NOT_AUTHORIZED',
        'output registration requires confirmation of the exact current preview',
      );
    }
    const existing = this.store.getReceipt(preview.registrationId);
    if (existing) return { ...existing, duplicate: true };
    const registration = registrationFor(this.projectRoot, input.request);
    if (registration.registrationId !== preview.registrationId
      || registration.output.digest !== preview.output.digest) {
      throw new SessionContractError('IMPORT_CONFLICT', 'output changed after registration preview');
    }
    this.store.begin(input.operationId, registration);
    try {
      await this.index.register(registration);
    } catch (error) {
      this.store.fail(
        registration.registrationId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
    return this.store.complete(input.operationId, registration);
  }

  async replayPending(): Promise<OutputRegistrationReceipt[]> {
    const receipts: OutputRegistrationReceipt[] = [];
    for (const record of this.store.pending()) {
      try {
        await this.index.register(record.registration);
        receipts.push(this.store.complete(record.operationId, record.registration));
      } catch (error) {
        this.store.fail(
          record.registration.registrationId,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
    return receipts;
  }
}

function readJsonIfPresent<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, filePath);
}

function unlinkIfPresent(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
