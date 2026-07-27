import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import {
  PromotionReceiptSchema,
  SESSION_CONTRACT_VERSION,
  SessionContractError,
  sha256,
  type IntelligenceCandidate,
  type PromotionDependencyDecision,
  type PromotionReceipt,
} from './contracts.js';
import type { SessionPurgePreview } from './repository.js';

export interface PromotionStorePort {
  getCandidate(candidateId: string, version?: number): IntelligenceCandidate | null;
  getPromotionReceipt(
    candidateId: string,
    version: number,
    consumer: string,
  ): PromotionReceipt | null;
  recordPromotion(receipt: PromotionReceipt): PromotionReceipt;
}

export interface MemoryDestinationPlan {
  consumer: string;
  destinationRef: string;
  beforeHash: string | null;
  afterHash: string;
  content: string;
}

export interface MemoryPromotionDestination {
  readonly consumer: string;
  plan(candidate: IntelligenceCandidate): MemoryDestinationPlan;
  write(plan: MemoryDestinationPlan): void | Promise<void>;
}

export interface PromotionPreview {
  contractVersion: '1.0.0';
  operationId: string;
  candidateId: string;
  candidateVersion: number;
  consumer: string;
  destinationRef: string;
  reviewState: IntelligenceCandidate['reviewState'];
  evidenceEventIds: string[];
  conflictsWith: string[];
  supersedes: string[];
  beforeHash: string | null;
  afterHash: string;
  duplicate: boolean;
  confirmationRequired: true;
}

export class MemoryPromotionGateway {
  constructor(private readonly store: PromotionStorePort) {}

  preview(input: {
    candidateId: string;
    version: number;
    destination: MemoryPromotionDestination;
  }): PromotionPreview {
    const candidate = this.store.getCandidate(input.candidateId, input.version);
    if (!candidate) {
      throw new SessionContractError('MALFORMED_SOURCE', 'candidate version does not exist');
    }
    const existing = this.store.getPromotionReceipt(
      input.candidateId,
      input.version,
      input.destination.consumer,
    );
    if (candidate.reviewState !== 'accepted' && !(candidate.reviewState === 'promoted' && existing)) {
      throw new SessionContractError(
        'OPERATION_NOT_AUTHORIZED',
        'promotion requires an accepted exact candidate version',
      );
    }
    const plan = input.destination.plan(candidate);
    if (plan.consumer !== input.destination.consumer) {
      throw new SessionContractError('IMPORT_CONFLICT', 'destination consumer identity changed');
    }
    const evidenceEventIds = [...new Set(candidate.evidence.map((item) => item.eventId))].sort();
    const operationId = sha256(JSON.stringify({
      candidateId: candidate.candidateId,
      candidateVersion: candidate.version,
      consumer: plan.consumer,
      destinationRef: plan.destinationRef,
      evidenceEventIds,
      conflictsWith: [...candidate.conflictsWith].sort(),
      supersedes: [...candidate.supersedes].sort(),
      beforeHash: plan.beforeHash,
      afterHash: plan.afterHash,
    }));
    return {
      contractVersion: SESSION_CONTRACT_VERSION,
      operationId,
      candidateId: candidate.candidateId,
      candidateVersion: candidate.version,
      consumer: plan.consumer,
      destinationRef: plan.destinationRef,
      reviewState: candidate.reviewState,
      evidenceEventIds,
      conflictsWith: [...candidate.conflictsWith],
      supersedes: [...candidate.supersedes],
      beforeHash: plan.beforeHash,
      afterHash: plan.afterHash,
      duplicate: Boolean(existing),
      confirmationRequired: true,
    };
  }

  async promote(input: {
    candidateId: string;
    version: number;
    destination: MemoryPromotionDestination;
    reviewer: string;
    operationId: string;
  }): Promise<PromotionReceipt> {
    const preview = this.preview(input);
    if (preview.operationId !== input.operationId) {
      throw new SessionContractError(
        'OPERATION_NOT_AUTHORIZED',
        'promotion requires confirmation of the exact current preview',
      );
    }
    const existing = this.store.getPromotionReceipt(
      input.candidateId,
      input.version,
      input.destination.consumer,
    );
    if (existing) return { ...existing, duplicate: true };
    const candidate = this.store.getCandidate(input.candidateId, input.version)!;
    const plan = input.destination.plan(candidate);
    if (plan.afterHash !== preview.afterHash
      || plan.beforeHash !== preview.beforeHash
      || plan.destinationRef !== preview.destinationRef) {
      throw new SessionContractError('IMPORT_CONFLICT', 'promotion destination changed after preview');
    }
    await input.destination.write(plan);
    return this.store.recordPromotion(PromotionReceiptSchema.parse({
      contractVersion: SESSION_CONTRACT_VERSION,
      receiptId: sha256([
        preview.operationId,
        input.reviewer,
        preview.afterHash,
      ].join('\0')),
      operationId: preview.operationId,
      candidateId: candidate.candidateId,
      candidateVersion: candidate.version,
      consumer: preview.consumer,
      destinationRef: preview.destinationRef,
      reviewer: input.reviewer,
      approvedAt: new Date().toISOString(),
      evidenceEventIds: preview.evidenceEventIds,
      conflictsWith: preview.conflictsWith,
      supersedes: preview.supersedes,
      beforeHash: preview.beforeHash,
      afterHash: preview.afterHash,
      dryRun: false,
      duplicate: false,
    }));
  }
}

export class FilesystemMemoryDestination implements MemoryPromotionDestination {
  readonly consumer: string;
  private readonly projectRoot: string;
  private readonly destinationRoot: string;

  constructor(input: {
    projectRoot: string;
    consumer: string;
    manifestPath: string;
  }) {
    this.consumer = assertConsumerId(input.consumer);
    this.projectRoot = resolve(input.projectRoot);
    const manifest = JSON.parse(readFileSync(input.manifestPath, 'utf8')) as {
      id?: string;
      memory?: {
        topology?: {
          namespace?: string;
          derivedPages?: Record<string, string>;
        };
      };
    };
    if (manifest.id !== this.consumer) {
      throw new SessionContractError('SOURCE_NOT_AUTHORIZED', 'memory consumer manifest ID mismatch');
    }
    const topology = manifest.memory?.topology;
    if (!topology?.namespace?.startsWith('.aiwg/')) {
      throw new SessionContractError('MALFORMED_SOURCE', 'consumer has no valid memory topology');
    }
    const selected = topology.derivedPages?.session
      ?? topology.derivedPages?.summary
      ?? topology.derivedPages?.synthesis
      ?? topology.namespace;
    const target = resolve(this.projectRoot, selected);
    const allowedRoot = resolve(this.projectRoot, '.aiwg');
    if (target !== allowedRoot && !target.startsWith(`${allowedRoot}${sep}`)) {
      throw new SessionContractError('SOURCE_OUTSIDE_ALLOWED_ROOT', 'consumer destination escapes .aiwg');
    }
    this.destinationRoot = target;
  }

  plan(candidate: IntelligenceCandidate): MemoryDestinationPlan {
    const path = resolve(
      this.destinationRoot,
      `session-candidate-${candidate.candidateId.slice(7, 23)}-v${candidate.version}.md`,
    );
    const content = renderCandidate(candidate, this.consumer);
    const prior = existsSync(path) ? readFileSync(path, 'utf8') : null;
    return {
      consumer: this.consumer,
      destinationRef: relative(this.projectRoot, path).split(sep).join('/'),
      beforeHash: prior === null ? null : sha256(prior),
      afterHash: sha256(content),
      content,
    };
  }

  write(plan: MemoryDestinationPlan): void {
    const path = resolve(this.projectRoot, plan.destinationRef);
    if (!path.startsWith(`${resolve(this.projectRoot, '.aiwg')}${sep}`)) {
      throw new SessionContractError('SOURCE_OUTSIDE_ALLOWED_ROOT', 'promotion path escapes .aiwg');
    }
    if (sha256(plan.content) !== plan.afterHash) {
      throw new SessionContractError('IMPORT_CONFLICT', 'promotion content hash changed');
    }
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.tmp-${process.pid}`;
    writeFileSync(temporary, plan.content, { encoding: 'utf8', mode: 0o600 });
    renameSync(temporary, path);
  }
}

export interface PromotionArtifactEffect {
  dependentId: string;
  destinationRef: string;
  action: PromotionDependencyDecision['action'];
  effect: 'mark-origin-unavailable' | 'mark-revoked' | 'mark-superseded'
    | 'mark-retained' | 'delete' | 'abort';
  destructive: boolean;
}

export interface PromotionDispositionJournal {
  contractVersion: '1.0.0';
  operationId: string;
  status: 'planned' | 'artifacts-applied' | 'catalog-committed';
  effects: Array<PromotionArtifactEffect & {
    outcome: 'pending' | 'applied' | 'already-applied';
  }>;
}

/**
 * Recoverable filesystem half of session purge. The journal is written before
 * promoted artifacts change; replaying `apply` is idempotent after any crash.
 * Call `catalogCommitted` only after SessionRepository.purgeSession succeeds.
 */
export class FilesystemPromotionDispositionCoordinator {
  private readonly projectRoot: string;
  private readonly allowedRoots: string[];
  private readonly journalRoot: string;

  constructor(input: { projectRoot: string; allowedRoots?: string[] }) {
    this.projectRoot = resolve(input.projectRoot);
    this.allowedRoots = (input.allowedRoots ?? ['.aiwg']).map((root) =>
      resolve(this.projectRoot, root));
    this.journalRoot = resolve(
      this.projectRoot,
      '.aiwg/telemetry/promotion-dispositions',
    );
  }

  preview(
    purge: SessionPurgePreview,
    decisions: readonly PromotionDependencyDecision[],
  ): PromotionArtifactEffect[] {
    const byId = new Map(decisions.map((item) => [item.dependentId, item]));
    return purge.promotedDependents.map((dependent) => {
      const decision = byId.get(dependent.dependentId);
      if (!decision) {
        throw new SessionContractError(
          'OPERATION_NOT_AUTHORIZED',
          'every promoted artifact requires an explicit disposition',
        );
      }
      this.authorizedPath(dependent.destinationRef);
      return {
        dependentId: dependent.dependentId,
        destinationRef: dependent.destinationRef,
        action: decision.action,
        effect: dispositionEffect(decision.action),
        destructive: decision.action === 'delete' || decision.action === 'revoke',
      };
    });
  }

  apply(
    purge: SessionPurgePreview,
    decisions: readonly PromotionDependencyDecision[],
  ): PromotionDispositionJournal {
    const effects = this.preview(purge, decisions);
    if (effects.some((effect) => effect.action === 'abort')) {
      throw new SessionContractError(
        'OPERATION_NOT_AUTHORIZED',
        'purge was aborted by promoted-artifact disposition',
      );
    }
    mkdirSync(this.journalRoot, { recursive: true, mode: 0o700 });
    const journalPath = this.journalPath(purge.operationId);
    let journal: PromotionDispositionJournal = existsSync(journalPath)
      ? JSON.parse(readFileSync(journalPath, 'utf8')) as PromotionDispositionJournal
      : {
          contractVersion: '1.0.0',
          operationId: purge.operationId,
          status: 'planned',
          effects: effects.map((effect) => ({ ...effect, outcome: 'pending' })),
        };
    this.writeJournal(journalPath, journal);

    for (const effect of journal.effects) {
      if (effect.outcome !== 'pending') continue;
      const target = this.authorizedPath(effect.destinationRef);
      const marker = dispositionMarker(purge.operationId, effect);
      if (effect.action === 'delete') {
        if (existsSync(target)) unlinkSync(target);
        effect.outcome = existsSync(target) ? 'pending' : 'applied';
      } else if (!existsSync(target)) {
        // Durable journal/provenance state is the observable disposition when
        // the external artifact was already absent.
        effect.outcome = 'already-applied';
      } else {
        const content = readFileSync(target, 'utf8');
        if (content.includes(marker)) {
          effect.outcome = 'already-applied';
        } else {
          this.atomicWrite(target, `${marker}\n${content}`);
          effect.outcome = 'applied';
        }
      }
      this.writeJournal(journalPath, journal);
    }
    journal.status = 'artifacts-applied';
    this.writeJournal(journalPath, journal);
    return journal;
  }

  catalogCommitted(operationId: string): PromotionDispositionJournal {
    const journalPath = this.journalPath(operationId);
    if (!existsSync(journalPath)) {
      throw new SessionContractError(
        'IMPORT_CONFLICT',
        'promotion disposition journal is missing',
      );
    }
    const journal = JSON.parse(
      readFileSync(journalPath, 'utf8'),
    ) as PromotionDispositionJournal;
    if (journal.status !== 'artifacts-applied') {
      throw new SessionContractError(
        'IMPORT_CONFLICT',
        'promotion artifact dispositions are incomplete',
      );
    }
    journal.status = 'catalog-committed';
    this.writeJournal(journalPath, journal);
    return journal;
  }

  listIncomplete(): PromotionDispositionJournal[] {
    if (!existsSync(this.journalRoot)) return [];
    return requireJournalFiles(this.journalRoot)
      .map((file) => JSON.parse(readFileSync(file, 'utf8')) as PromotionDispositionJournal)
      .filter((journal) => journal.status !== 'catalog-committed');
  }

  private authorizedPath(destinationRef: string): string {
    if (destinationRef.includes('\0') || resolve(destinationRef) === destinationRef) {
      throw new SessionContractError(
        'SOURCE_OUTSIDE_ALLOWED_ROOT',
        'promotion disposition requires a relative AIWG-owned destination',
      );
    }
    const target = resolve(this.projectRoot, destinationRef);
    if (!this.allowedRoots.some(
      (root) => target === root || target.startsWith(`${root}${sep}`),
    )) {
      throw new SessionContractError(
        'SOURCE_OUTSIDE_ALLOWED_ROOT',
        'promotion disposition path is outside configured AIWG roots',
      );
    }
    return target;
  }

  private journalPath(operationId: string): string {
    return resolve(this.journalRoot, `${operationId.replace(':', '-')}.json`);
  }

  private atomicWrite(target: string, content: string): void {
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    const temporary = `${target}.tmp-${process.pid}`;
    writeFileSync(temporary, content, { encoding: 'utf8', mode: 0o600 });
    renameSync(temporary, target);
  }

  private writeJournal(path: string, journal: PromotionDispositionJournal): void {
    this.atomicWrite(path, `${JSON.stringify(journal, null, 2)}\n`);
  }
}

function dispositionEffect(
  action: PromotionDependencyDecision['action'],
): PromotionArtifactEffect['effect'] {
  if (action === 'origin_unavailable') return 'mark-origin-unavailable';
  if (action === 'revoke') return 'mark-revoked';
  if (action === 'supersede') return 'mark-superseded';
  if (action === 'retain') return 'mark-retained';
  return action;
}

function dispositionMarker(
  operationId: string,
  effect: PromotionArtifactEffect,
): string {
  return `<!-- aiwg-promotion-disposition ${JSON.stringify({
    operationId,
    dependentId: effect.dependentId,
    state: effect.effect,
    originAvailable: false,
  })} -->`;
}

function requireJournalFiles(root: string): string[] {
  return readdirSync(root)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => resolve(root, name));
}

export function resolveMemoryConsumerManifest(projectRoot: string, consumer: string): string {
  const safeConsumer = assertConsumerId(consumer);
  const candidates = [
    resolve(projectRoot, 'agentic/code/frameworks', safeConsumer, 'manifest.json'),
    resolve(projectRoot, 'agentic/code/addons', safeConsumer, 'manifest.json'),
    resolve(projectRoot, '.aiwg/extensions', safeConsumer, 'manifest.json'),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new SessionContractError('UNSUPPORTED_OPERATION', `unknown memory consumer: ${safeConsumer}`);
  }
  return found;
}

function assertConsumerId(value: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) {
    throw new SessionContractError('MALFORMED_SOURCE', 'invalid memory consumer ID');
  }
  return value;
}

function renderCandidate(candidate: IntelligenceCandidate, consumer: string): string {
  const evidence = candidate.evidence
    .map((item) => `  - ${item.eventId}#${item.start}-${item.end}`)
    .join('\n');
  return `---
source: aiwg-session-candidate
consumer: ${consumer}
candidate_id: ${candidate.candidateId}
candidate_version: ${candidate.version}
candidate_type: ${candidate.type}
evidence:
${evidence}
---

# ${candidate.assertion}

Confidence: ${candidate.confidence}
Scope: ${candidate.projectScope} / ${candidate.temporalScope}
`;
}
