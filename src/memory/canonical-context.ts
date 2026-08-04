import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, relative, resolve, sep } from 'node:path';
import { z } from 'zod';

const DigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);
const LocatorSchema = z.string().min(1).max(512).refine(value => !/[\r\n\0]/.test(value));
export const CanonicalContextTargetSchema = z.enum([
  'project-fact', 'preference', 'goal', 'project', 'person', 'decision', 'operating-rule',
]);
export const CanonicalContextClassificationSchema = z.enum(['public', 'internal']);

export const CanonicalContextProposalSchema = z.object({
  target: CanonicalContextTargetSchema,
  key: z.string().min(1).max(128).regex(/^[a-z0-9][a-z0-9._-]*$/),
  value: z.string().min(1).max(8192),
  sourceRef: LocatorSchema,
  sourceDigest: DigestSchema.nullable().default(null),
  reviewer: z.string().min(1).max(128),
  reason: z.string().min(1).max(1024),
  scope: z.string().min(1).max(128),
  classification: CanonicalContextClassificationSchema,
  reviewAt: z.string().datetime().nullable().default(null),
  expiresAt: z.string().datetime().nullable().default(null),
}).strict();

export type CanonicalContextProposal = z.infer<typeof CanonicalContextProposalSchema>;

export interface CanonicalContextEntry extends CanonicalContextProposal {
  entryId: string;
  status: 'active' | 'superseded' | 'revoked';
  createdAt: string;
  updatedAt: string;
  supersedes: string | null;
  disposition: { reviewer: string; reason: string; recordedAt: string } | null;
  importedFromWorkspace: string | null;
}

export interface CanonicalContextStore {
  schemaVersion: 'aiwg.canonical-context.v1';
  workspaceId: string;
  revision: number;
  entries: Record<string, CanonicalContextEntry>;
}

export interface CanonicalContextPreview {
  schemaVersion: 'aiwg.canonical-context-preview.v1';
  operationId: string;
  operation: 'upsert' | 'revoke' | 'import';
  workspaceId: string;
  storeDigest: string;
  duplicate: boolean;
  confirmationRequired: true;
  diff: Array<{ field: string; before: string | null; after: string | null }>;
  conflicts: Array<{ entryId: string; valueDigest: string }>;
  proposedEntryId: string | null;
  importCount: number;
}

export interface CanonicalContextReceipt {
  schemaVersion: 'aiwg.canonical-context-receipt.v1';
  receiptId: string;
  operationId: string;
  operation: CanonicalContextPreview['operation'];
  workspaceId: string;
  entryIds: string[];
  revision: number;
  duplicate: boolean;
  completedAt: string;
}

export interface CanonicalContextExport {
  schemaVersion: 'aiwg.canonical-context-export.v1';
  sourceWorkspaceId: string;
  exportedAt: string;
  entries: CanonicalContextEntry[];
}

function sha256(value: string | Buffer): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function canonicalLocator(value: string): string {
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
    // Opaque locator.
  }
  return value;
}

function assertSafeProposal(proposal: CanonicalContextProposal): void {
  const content = `${proposal.key}\n${proposal.value}\n${proposal.sourceRef}`;
  if (/(?:ignore|disregard) (?:all |the )?(?:previous|prior) instructions|system prompt|developer message|(?:run|execute) (?:a )?(?:shell|command)/i.test(content)) {
    throw new Error('canonical context proposal contains instruction-like material');
  }
  if (/(?:^|[?&;:\s])(?:api[_-]?key|access[_-]?token|token|secret|password|passwd|authorization)\s*[:=]\s*[^\s&;]+/i.test(content)
    || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) {
    throw new Error('canonical context proposal contains unsafe material');
  }
  if (/^(?:system|developer|provider|agent)(?:\.|$)/.test(proposal.key)) {
    throw new Error('canonical context cannot override a higher-authority namespace');
  }
}

function ensureStorageInsideProject(projectRoot: string, target: string): void {
  const root = realpathSync(projectRoot);
  const lexicalRoot = resolve(projectRoot);
  const candidate = resolve(target);
  if (candidate !== lexicalRoot && !candidate.startsWith(`${lexicalRoot}${sep}`)) {
    throw new Error('canonical context storage must remain inside the project');
  }
  let ancestor = candidate;
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const actual = realpathSync(ancestor);
  if (actual !== root && !actual.startsWith(`${root}${sep}`)) {
    throw new Error('canonical context storage cannot traverse a link outside the project');
  }
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  renameSync(temporary, filePath);
}

function workspaceIdentity(projectRoot: string): string {
  const root = realpathSync(projectRoot);
  return sha256(relative(dirname(root), root));
}

function stableEntryId(proposal: CanonicalContextProposal): string {
  return sha256(JSON.stringify({
    target: proposal.target,
    key: proposal.key,
    value: proposal.value,
    sourceRef: proposal.sourceRef,
    sourceDigest: proposal.sourceDigest,
    scope: proposal.scope,
    classification: proposal.classification,
  }));
}

function proposalFromEntry(entry: CanonicalContextEntry): CanonicalContextProposal {
  return CanonicalContextProposalSchema.parse({
    target: entry.target,
    key: entry.key,
    value: entry.value,
    sourceRef: entry.sourceRef,
    sourceDigest: entry.sourceDigest,
    reviewer: entry.reviewer,
    reason: entry.reason,
    scope: entry.scope,
    classification: entry.classification,
    reviewAt: entry.reviewAt,
    expiresAt: entry.expiresAt,
  });
}

function storeDigest(store: CanonicalContextStore): string {
  return sha256(JSON.stringify(store));
}

export class CanonicalContextRepository {
  private readonly root: string;
  private readonly statePath: string;
  private readonly receiptRoot: string;
  private readonly lockPath: string;
  readonly workspaceId: string;

  constructor(projectRoot: string) {
    this.root = resolve(projectRoot, '.aiwg/context/compound-memory');
    this.statePath = resolve(this.root, 'context.json');
    this.receiptRoot = resolve(this.root, 'receipts');
    this.lockPath = resolve(this.root, '.lock');
    ensureStorageInsideProject(projectRoot, this.root);
    this.workspaceId = workspaceIdentity(projectRoot);
  }

  read(): CanonicalContextStore {
    if (!existsSync(this.statePath)) {
      return {
        schemaVersion: 'aiwg.canonical-context.v1',
        workspaceId: this.workspaceId,
        revision: 0,
        entries: {},
      };
    }
    const store = JSON.parse(readFileSync(this.statePath, 'utf8')) as CanonicalContextStore;
    if (store.schemaVersion !== 'aiwg.canonical-context.v1'
      || store.workspaceId !== this.workspaceId
      || !Number.isSafeInteger(store.revision)
      || typeof store.entries !== 'object'
      || Array.isArray(store.entries)) {
      throw new Error('canonical context store identity or schema is invalid');
    }
    return store;
  }

  previewUpsert(raw: CanonicalContextProposal): CanonicalContextPreview {
    const proposal = CanonicalContextProposalSchema.parse({
      ...raw,
      sourceRef: canonicalLocator(raw.sourceRef),
    });
    assertSafeProposal(proposal);
    const store = this.read();
    const entryId = stableEntryId(proposal);
    const active = Object.values(store.entries).find(entry => (
      entry.status === 'active' && entry.target === proposal.target && entry.key === proposal.key
    ));
    const duplicate = active?.entryId === entryId;
    const conflicts = active && !duplicate
      ? [{ entryId: active.entryId, valueDigest: sha256(active.value) }]
      : [];
    const diff = duplicate ? [] : [
      { field: `${proposal.target}.${proposal.key}`, before: active?.value ?? null, after: proposal.value },
    ];
    const snapshot = storeDigest(store);
    return {
      schemaVersion: 'aiwg.canonical-context-preview.v1',
      operationId: sha256(JSON.stringify({ operation: 'upsert', proposal, snapshot })),
      operation: 'upsert',
      workspaceId: this.workspaceId,
      storeDigest: snapshot,
      duplicate,
      confirmationRequired: true,
      diff,
      conflicts,
      proposedEntryId: entryId,
      importCount: 0,
    };
  }

  previewRevoke(entryId: string, reviewer: string, reason: string): CanonicalContextPreview {
    const store = this.read();
    const entry = store.entries[entryId];
    if (!entry) throw new Error('canonical context entry was not found');
    const duplicate = entry.status === 'revoked';
    const snapshot = storeDigest(store);
    return {
      schemaVersion: 'aiwg.canonical-context-preview.v1',
      operationId: sha256(JSON.stringify({ operation: 'revoke', entryId, reviewer, reason, snapshot })),
      operation: 'revoke',
      workspaceId: this.workspaceId,
      storeDigest: snapshot,
      duplicate,
      confirmationRequired: true,
      diff: duplicate ? [] : [{ field: `${entry.target}.${entry.key}`, before: entry.value, after: null }],
      conflicts: [],
      proposedEntryId: entryId,
      importCount: 0,
    };
  }

  export(): CanonicalContextExport {
    const store = this.read();
    return {
      schemaVersion: 'aiwg.canonical-context-export.v1',
      sourceWorkspaceId: store.workspaceId,
      exportedAt: new Date().toISOString(),
      entries: Object.values(store.entries).sort((left, right) => left.entryId.localeCompare(right.entryId)),
    };
  }

  previewImport(bundle: CanonicalContextExport, allowCrossWorkspace = false): CanonicalContextPreview {
    if (bundle.schemaVersion !== 'aiwg.canonical-context-export.v1' || !Array.isArray(bundle.entries)) {
      throw new Error('canonical context import schema is invalid');
    }
    if (bundle.sourceWorkspaceId !== this.workspaceId && !allowCrossWorkspace) {
      throw new Error('cross-workspace context import requires explicit authorization');
    }
    for (const entry of bundle.entries) assertSafeProposal(proposalFromEntry(entry));
    const store = this.read();
    const conflicts = bundle.entries.flatMap(imported => Object.values(store.entries)
      .filter(entry => entry.status === 'active'
        && imported.status === 'active'
        && entry.target === imported.target
        && entry.key === imported.key
        && entry.value !== imported.value)
      .map(entry => ({ entryId: entry.entryId, valueDigest: sha256(entry.value) })));
    const snapshot = storeDigest(store);
    return {
      schemaVersion: 'aiwg.canonical-context-preview.v1',
      operationId: sha256(JSON.stringify({
        operation: 'import',
        bundleDigest: sha256(JSON.stringify(bundle)),
        allowCrossWorkspace,
        snapshot,
      })),
      operation: 'import',
      workspaceId: this.workspaceId,
      storeDigest: snapshot,
      duplicate: bundle.entries.every(entry => Boolean(store.entries[entry.entryId])),
      confirmationRequired: true,
      diff: bundle.entries
        .filter(entry => !store.entries[entry.entryId])
        .map(entry => ({ field: `${entry.target}.${entry.key}`, before: null, after: entry.value })),
      conflicts,
      proposedEntryId: null,
      importCount: bundle.entries.length,
    };
  }

  confirm(input: {
    preview: CanonicalContextPreview;
    proposal?: CanonicalContextProposal;
    revoke?: { entryId: string; reviewer: string; reason: string };
    bundle?: CanonicalContextExport;
    allowCrossWorkspace?: boolean;
  }): CanonicalContextReceipt {
    mkdirSync(this.root, { recursive: true });
    const lock = openSync(this.lockPath, 'wx', 0o600);
    try {
      const requestedReceiptPath = resolve(
        this.receiptRoot,
        `${input.preview.operationId.replace(':', '_')}.json`,
      );
      if (existsSync(requestedReceiptPath)) {
        return {
          ...(JSON.parse(readFileSync(requestedReceiptPath, 'utf8')) as CanonicalContextReceipt),
          duplicate: true,
        };
      }
      const current = input.preview.operation === 'upsert' && input.proposal
        ? this.previewUpsert(input.proposal)
        : input.preview.operation === 'revoke' && input.revoke
          ? this.previewRevoke(input.revoke.entryId, input.revoke.reviewer, input.revoke.reason)
          : input.preview.operation === 'import' && input.bundle
            ? this.previewImport(input.bundle, input.allowCrossWorkspace)
            : null;
      if (!current || current.operationId !== input.preview.operationId) {
        throw new Error('confirmation requires the exact current canonical-context preview');
      }
      const receiptPath = requestedReceiptPath;
      const store = this.read();
      const now = new Date().toISOString();
      const changed: string[] = [];
      if (current.operation === 'upsert' && input.proposal && current.proposedEntryId) {
        const proposal = CanonicalContextProposalSchema.parse({
          ...input.proposal,
          sourceRef: canonicalLocator(input.proposal.sourceRef),
        });
        if (!current.duplicate) {
          const active = Object.values(store.entries).find(entry => (
            entry.status === 'active' && entry.target === proposal.target && entry.key === proposal.key
          ));
          if (active) {
            active.status = 'superseded';
            active.updatedAt = now;
            active.disposition = { reviewer: proposal.reviewer, reason: proposal.reason, recordedAt: now };
            changed.push(active.entryId);
          }
          store.entries[current.proposedEntryId] = {
            ...proposal,
            entryId: current.proposedEntryId,
            status: 'active',
            createdAt: now,
            updatedAt: now,
            supersedes: active?.entryId ?? null,
            disposition: null,
            importedFromWorkspace: null,
          };
          changed.push(current.proposedEntryId);
        }
      } else if (current.operation === 'revoke' && input.revoke) {
        const entry = store.entries[input.revoke.entryId];
        if (!current.duplicate) {
          entry.status = 'revoked';
          entry.updatedAt = now;
          entry.disposition = {
            reviewer: input.revoke.reviewer,
            reason: input.revoke.reason,
            recordedAt: now,
          };
          changed.push(entry.entryId);
        }
      } else if (current.operation === 'import' && input.bundle) {
        for (const imported of input.bundle.entries) {
          if (store.entries[imported.entryId]) continue;
          store.entries[imported.entryId] = {
            ...imported,
            importedFromWorkspace: input.bundle.sourceWorkspaceId,
          };
          changed.push(imported.entryId);
        }
      }
      if (changed.length > 0) {
        store.revision += 1;
        writeJsonAtomic(this.statePath, store);
      }
      const receipt: CanonicalContextReceipt = {
        schemaVersion: 'aiwg.canonical-context-receipt.v1',
        receiptId: sha256(`${current.operationId}\0${store.revision}`),
        operationId: current.operationId,
        operation: current.operation,
        workspaceId: this.workspaceId,
        entryIds: changed,
        revision: store.revision,
        duplicate: current.duplicate,
        completedAt: now,
      };
      writeJsonAtomic(receiptPath, receipt);
      return receipt;
    } finally {
      closeSync(lock);
      unlinkSync(this.lockPath);
    }
  }
}
