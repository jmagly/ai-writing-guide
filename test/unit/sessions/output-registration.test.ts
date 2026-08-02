import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FilesystemOutputRegistrationStore,
  FilesystemDerivedOutputIndex,
  OutputRegistrationCoordinator,
  sha256,
  type DerivedOutputIndexPort,
  type DerivedOutputRegistration,
  type OutputRegistrationRequest,
} from '../../../src/sessions/index.js';

class IndexSink implements DerivedOutputIndexPort {
  registrations = new Map<string, DerivedOutputRegistration>();
  failures = 0;

  register(registration: DerivedOutputRegistration): void {
    if (this.failures-- > 0) throw new Error('index unavailable');
    this.registrations.set(registration.registrationId, registration);
  }
}

let root: string;
let outputPath: string;
let request: OutputRegistrationRequest;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-output-registration-'));
  mkdirSync(join(root, 'output/reports'), { recursive: true });
  outputPath = join(root, 'output/reports/result.md');
  writeFileSync(outputPath, '# Result\n\nDerived analysis.\n');
  request = {
    outputPath: 'output/reports/result.md',
    mediaType: 'text/markdown',
    contextPack: {
      id: 'context-pack:task-1',
      digest: sha256('exact bounded context pack'),
      sources: [
        {
          kind: 'session',
          ref: 'session:opaque-id',
          digest: sha256('session evidence'),
          span: null,
        },
        {
          kind: 'url',
          ref: 'https://user:secret@example.test/source?q=token#private',
          digest: sha256('public source'),
          span: null,
        },
      ],
    },
    supersedes: [],
    conflictsWith: [],
  };
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('derived output registration', () => {
  it('previews without mutation and records exact minimized lineage after confirmation', async () => {
    const store = new FilesystemOutputRegistrationStore(root);
    const sink = new IndexSink();
    const coordinator = new OutputRegistrationCoordinator(root, store, sink);
    const original = readFileSync(outputPath, 'utf8');

    const preview = coordinator.preview(request);
    expect(preview).toMatchObject({
      schemaVersion: 'aiwg.output-registration.v1',
      output: {
        locator: 'output/reports/result.md',
        mediaType: 'text/markdown',
        digest: sha256(original),
        byteLength: Buffer.byteLength(original),
      },
      contextPack: { id: 'context-pack:task-1', digest: sha256('exact bounded context pack') },
      duplicate: false,
      confirmationRequired: true,
    });
    expect(preview.contextPack.sources[1].ref).toBe('https://example.test/source');
    expect(store.pending()).toEqual([]);

    const receipt = await coordinator.register({ request, operationId: preview.operationId });
    expect(receipt).toMatchObject({
      registrationId: preview.registrationId,
      outputLocator: 'output/reports/result.md',
      outputDigest: sha256(original),
      contextPackId: 'context-pack:task-1',
      contextPackDigest: sha256('exact bounded context pack'),
      duplicate: false,
    });
    expect(receipt.sourceRefs).toEqual(['session:opaque-id', 'https://example.test/source']);
    expect(readFileSync(outputPath, 'utf8')).toBe(original);
    expect(store.pending()).toEqual([]);
    expect(sink.registrations.has(preview.registrationId)).toBe(true);

    const duplicate = await coordinator.register({ request, operationId: preview.operationId });
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.receiptId).toBe(receipt.receiptId);
  });

  it('rejects stale confirmation when the immutable output changes', async () => {
    const coordinator = new OutputRegistrationCoordinator(
      root,
      new FilesystemOutputRegistrationStore(root),
      new IndexSink(),
    );
    const preview = coordinator.preview(request);
    writeFileSync(outputPath, '# Changed\n');

    await expect(coordinator.register({ request, operationId: preview.operationId }))
      .rejects.toThrow(/exact current preview/);
  });

  it('keeps a durable outbox record and replays idempotently after sink failure', async () => {
    const store = new FilesystemOutputRegistrationStore(root);
    const sink = new IndexSink();
    sink.failures = 1;
    const coordinator = new OutputRegistrationCoordinator(root, store, sink);
    const preview = coordinator.preview(request);

    await expect(coordinator.register({ request, operationId: preview.operationId }))
      .rejects.toThrow('index unavailable');
    expect(store.pending()).toEqual([
      expect.objectContaining({
        operationId: preview.operationId,
        state: 'pending',
        attempts: 1,
        lastError: 'index unavailable',
      }),
    ]);

    const receipts = await coordinator.replayPending();
    expect(receipts).toHaveLength(1);
    expect(receipts[0].registrationId).toBe(preview.registrationId);
    expect(store.pending()).toEqual([]);
    expect(await coordinator.replayPending()).toEqual([]);
  });

  it('rejects output paths that resolve outside the project', () => {
    const external = join(tmpdir(), `aiwg-external-output-${Date.now()}.md`);
    writeFileSync(external, 'outside');
    const coordinator = new OutputRegistrationCoordinator(
      root,
      new FilesystemOutputRegistrationStore(root),
      new IndexSink(),
    );
    try {
      expect(() => coordinator.preview({ ...request, outputPath: external }))
        .toThrow(/inside the project/);
    } finally {
      rmSync(external, { force: true });
    }
  });

  it('rejects secret-bearing opaque references and sensitive output paths', () => {
    const coordinator = new OutputRegistrationCoordinator(
      root,
      new FilesystemOutputRegistrationStore(root),
      new IndexSink(),
    );
    expect(() => coordinator.preview({
      ...request,
      contextPack: {
        ...request.contextPack,
        sources: [{
          kind: 'artifact',
          ref: 'artifact:token=super-secret-value',
          digest: null,
          span: null,
        }],
      },
    })).toThrow(/secret material/);

    mkdirSync(join(root, '.env'), { recursive: true });
    writeFileSync(join(root, '.env/report.md'), 'not an ordinary output');
    expect(() => coordinator.preview({ ...request, outputPath: '.env/report.md' }))
      .toThrow(/credential\/secret paths/);
  });

  it('indexes unrelated registrations independently and tolerates exact replay', async () => {
    const store = new FilesystemOutputRegistrationStore(root);
    const index = new FilesystemDerivedOutputIndex(root);
    const coordinator = new OutputRegistrationCoordinator(root, store, index);
    const secondPath = join(root, 'output/reports/second.md');
    writeFileSync(secondPath, '# Second\n');
    const second = { ...request, outputPath: 'output/reports/second.md' };
    const firstPreview = coordinator.preview(request);
    const secondPreview = coordinator.preview(second);

    const [firstReceipt, secondReceipt] = await Promise.all([
      coordinator.register({ request, operationId: firstPreview.operationId }),
      coordinator.register({ request: second, operationId: secondPreview.operationId }),
    ]);
    expect(index.registrations().map(item => item.registrationId).sort()).toEqual([
      firstReceipt.registrationId,
      secondReceipt.registrationId,
    ].sort());

    index.register(index.registrations()[0]);
    expect(index.registrations()).toHaveLength(2);
  });
});
