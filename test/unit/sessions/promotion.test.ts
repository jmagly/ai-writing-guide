import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FilesystemMemoryDestination,
  MemoryPromotionGateway,
  SESSION_CONTRACT_VERSION,
  sha256,
  type IntelligenceCandidate,
  type MemoryDestinationPlan,
  type MemoryPromotionDestination,
  type PromotionReceipt,
  type PromotionStorePort,
} from '../../../src/sessions/index.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function candidate(reviewState: IntelligenceCandidate['reviewState'] = 'accepted'): IntelligenceCandidate {
  return {
    contractVersion: SESSION_CONTRACT_VERSION,
    candidateId: `sha256:${'a'.repeat(64)}`,
    version: 2,
    type: 'decision',
    assertion: 'retain exact evidence citations',
    subject: null,
    predicate: null,
    object: null,
    evidence: [
      { eventId: 'event-2', start: 0, end: 6, quoteDigest: sha256('retain') },
      { eventId: 'event-2', start: 7, end: 12, quoteDigest: sha256('exact') },
      { eventId: 'event-1', start: 0, end: 8, quoteDigest: sha256('evidence') },
    ],
    confidence: 0.9,
    temporalScope: 'source-event',
    projectScope: 'workspace-1',
    extractionMethod: 'structural',
    extractionVersion: '1.0.0',
    extractionPolicyVersion: '1.0.0',
    model: null,
    sensitivity: 'none',
    reviewState,
    conflictsWith: ['candidate-conflict'],
    supersedes: ['candidate-old'],
    createdAt: '2026-07-27T00:00:00.000Z',
  };
}

class Store implements PromotionStorePort {
  current = candidate();
  receipt: PromotionReceipt | null = null;

  getCandidate(id: string, version?: number): IntelligenceCandidate | null {
    return id === this.current.candidateId && version === this.current.version
      ? this.current : null;
  }

  getPromotionReceipt(id: string, version: number, consumer: string): PromotionReceipt | null {
    return this.receipt?.candidateId === id
      && this.receipt.candidateVersion === version
      && this.receipt.consumer === consumer ? this.receipt : null;
  }

  recordPromotion(receipt: PromotionReceipt): PromotionReceipt {
    this.receipt = receipt;
    this.current = { ...this.current, reviewState: 'promoted' };
    return receipt;
  }
}

class Destination implements MemoryPromotionDestination {
  readonly consumer = 'memory';
  writes = 0;
  beforeHash: string | null = null;

  plan(): MemoryDestinationPlan {
    return {
      consumer: this.consumer,
      destinationRef: '.aiwg/memory/candidate.md',
      beforeHash: this.beforeHash,
      afterHash: sha256('content'),
      content: 'content',
    };
  }

  write(): void {
    this.writes += 1;
  }
}

describe('memory promotion gateway', () => {
  it('rejects unreviewed candidates and stale preview confirmations', async () => {
    const store = new Store();
    store.current = candidate('pending');
    const gateway = new MemoryPromotionGateway(store);
    const destination = new Destination();
    expect(() => gateway.preview({
      candidateId: store.current.candidateId,
      version: 2,
      destination,
    })).toThrow(/requires an accepted/);

    store.current = candidate();
    const preview = gateway.preview({
      candidateId: store.current.candidateId,
      version: 2,
      destination,
    });
    destination.beforeHash = sha256('changed');
    await expect(gateway.promote({
      candidateId: store.current.candidateId,
      version: 2,
      destination,
      reviewer: 'reviewer-a',
      operationId: preview.operationId,
    })).rejects.toThrow(/exact current preview/);
    expect(destination.writes).toBe(0);
  });

  it('promotes once and returns an idempotent lineage receipt', async () => {
    const store = new Store();
    const destination = new Destination();
    const gateway = new MemoryPromotionGateway(store);
    const preview = gateway.preview({
      candidateId: store.current.candidateId,
      version: 2,
      destination,
    });
    expect(preview).toMatchObject({
      evidenceEventIds: ['event-1', 'event-2'],
      conflictsWith: ['candidate-conflict'],
      supersedes: ['candidate-old'],
      duplicate: false,
      confirmationRequired: true,
    });
    const receipt = await gateway.promote({
      candidateId: store.current.candidateId,
      version: 2,
      destination,
      reviewer: 'reviewer-a',
      operationId: preview.operationId,
    });
    expect(receipt).toMatchObject({
      operationId: preview.operationId,
      candidateId: store.current.candidateId,
      candidateVersion: 2,
      destinationRef: '.aiwg/memory/candidate.md',
      evidenceEventIds: ['event-1', 'event-2'],
      duplicate: false,
    });
    expect(destination.writes).toBe(1);

    const repeatedPreview = gateway.preview({
      candidateId: store.current.candidateId,
      version: 2,
      destination,
    });
    expect(repeatedPreview.duplicate).toBe(true);
    const repeated = await gateway.promote({
      candidateId: store.current.candidateId,
      version: 2,
      destination,
      reviewer: 'reviewer-b',
      operationId: repeatedPreview.operationId,
    });
    expect(repeated.duplicate).toBe(true);
    expect(repeated.receiptId).toBe(receipt.receiptId);
    expect(destination.writes).toBe(1);
  });

  it('resolves a named manifest topology and writes evidence-bearing memory', () => {
    const root = mkdtempSync(join(tmpdir(), 'aiwg-promotion-'));
    roots.push(root);
    const manifestDir = join(root, 'agentic/code/frameworks/memory');
    mkdirSync(manifestDir, { recursive: true });
    const manifestPath = join(manifestDir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify({
      id: 'memory',
      memory: { topology: {
        namespace: '.aiwg/memory',
        derivedPages: { session: '.aiwg/memory/session-knowledge' },
      } },
    }));
    const destination = new FilesystemMemoryDestination({
      projectRoot: root,
      consumer: 'memory',
      manifestPath,
    });
    const plan = destination.plan(candidate());
    expect(plan.destinationRef).toMatch(/^\.aiwg\/memory\/session-knowledge\//);
    destination.write(plan);
    const content = readFileSync(join(root, plan.destinationRef), 'utf8');
    expect(content).toContain('candidate_version: 2');
    expect(content).toContain('event-2#0-6');
    expect(sha256(content)).toBe(plan.afterHash);
  });
});
