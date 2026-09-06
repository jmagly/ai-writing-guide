import { mkdtemp, readFile, rm, stat, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createWritingReceipt,
  readWritingReceipt,
  validateWritingReceipt,
  writeWritingReceipt,
  writingReceiptPath,
  type WritingReceiptInput,
} from '../../../src/writing/writing-receipt.js';

const roots: string[] = [];
const digest = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

function input(overrides: Partial<WritingReceiptInput> = {}): WritingReceiptInput {
  return {
    id: 'receipt-1',
    createdAt: '2026-09-06T12:00:00.000Z',
    operation: 'proofread-only',
    profile: { id: 'author', version: '1.0.0', revision: 1, cacheEpoch: 0, fallback: false },
    examples: {
      receiptSha256: digest('example-receipt'),
      cacheKey: digest('cache-key'),
      selections: [{ sampleId: 'sample-1', sha256: digest('sample text') }],
      budget: { limit: 1000, used: 240, unit: 'utf8-bytes', measurement: 'upper-bound', tokenizerId: 'utf8-byte-budget', tokenizerVersion: '1' },
      fallback: false,
    },
    modes: [{ id: 'writer-author', version: '1.0.0', profileSha256: digest('mode') }],
    state: { selected: ['writer-author'], delivered: ['writer-author'], applied: ['writer-author'], validated: [], deliveredTo: 'local-transform-callback', fallback: 'none' },
    modelPrompt: { execution: 'none', promptSha256: digest('prompt'), templateSha256: digest('template'), decoding: { temperature: 0 }, promptConfigSha256: digest('config') },
    inputs: [{ id: 'brief-1', role: 'brief', sha256: digest('brief text') }],
    operationConfig: { action: 'proofread', correctionIds: ['C:1'], channel: 'engineering', configSha256: digest('proofread config') },
    output: { sha256: digest('fixed text'), path: 'out/fixed.md' },
    budget: { limit: 1000, used: 330, unit: 'utf8-bytes', measurement: 'upper-bound', tokenizerId: 'utf8-byte-budget', tokenizerVersion: '1' },
    fallback: { applied: false },
    validators: [{ id: 'proofread-corrections', version: '1', outcome: 'pass', sha256: digest('validator report') }],
    evaluation: [{ id: 'fidelity', method: 'conservative-literal-review-v1', sha256: digest('fidelity report'), outcome: 'pass' }],
    authorAcceptance: { status: 'accepted', acceptedAt: '2026-09-06T12:05:00.000Z', acceptedBy: 'author' },
    ...overrides,
  };
}

afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe('writing receipts', () => {
  it('creates a strict hash-bound receipt without raw samples, credentials or hosted attestation claims', () => {
    const receipt = createWritingReceipt(input());
    expect(validateWritingReceipt(receipt)).toEqual(receipt);
    expect(receipt.receiptSha256).toMatch(/^[a-f0-9]{64}$/);
    const hosted = createWritingReceipt(input({ modelPrompt: { execution: 'hosted', provider: 'hosted', model: 'model', promptSha256: digest('prompt') } }));
    expect(hosted.modelPrompt.hostedVersion).toEqual({
      attested: false,
      reason: 'Hosted provider prompt/version cannot be attested from this local receipt.',
    });
    expect(receipt.modelPrompt.hostedVersion).toBeUndefined();
    const serialized = JSON.stringify(receipt);
    expect(serialized).not.toContain('sample text');
    expect(serialized).not.toContain('brief text');
    expect(serialized).not.toContain('fixed text');
  });

  it('rejects tampering, secret metadata and ambiguous fallback records', () => {
    const receipt = createWritingReceipt(input());
    expect(() => validateWritingReceipt({ ...receipt, budget: { ...receipt.budget, used: 1 } })).toThrow('integrity mismatch');
    expect(() => createWritingReceipt(input({
      fallback: { applied: true, reason: 'Authorization: Bearer test-secret-value' },
      state: { selected: ['writer-author'], delivered: [], applied: [], validated: [], deliveredTo: 'none', fallback: 'unaltered' },
    }))).toThrow('known secret');
    expect(() => createWritingReceipt(input({ fallback: { applied: true } }))).toThrow();
    expect(() => createWritingReceipt(input({ id: '..' }))).toThrow();
    expect(() => createWritingReceipt(input({ fallback: { applied: true, reason: 'No modes retained' }, state: { selected: ['writer-author'], delivered: ['writer-author'], applied: ['writer-author'], validated: [], deliveredTo: 'local-transform-callback', fallback: 'unaltered' } }))).toThrow('Fallback receipts cannot report applied');
    expect(() => createWritingReceipt(input({ state: { selected: ['missing-mode'], delivered: [], applied: [], validated: [], deliveredTo: 'none', fallback: 'none' } }))).toThrow('declared mode');
    expect(() => createWritingReceipt(input({ state: { selected: ['writer-author'], delivered: [], applied: ['writer-author'], validated: [], deliveredTo: 'none', fallback: 'none' } }))).toThrow('subset');
    expect(() => createWritingReceipt(input({ state: { selected: ['writer-author'], delivered: ['writer-author'], applied: [], validated: [], deliveredTo: 'none', fallback: 'none' } }))).toThrow('No delivery target');
    expect(() => createWritingReceipt(input({ fallback: { applied: true, reason: 'No modes retained' }, state: { selected: ['writer-author'], delivered: [], applied: [], validated: [], deliveredTo: 'none', fallback: 'none' } }))).toThrow('fallback must agree');
    expect(() => createWritingReceipt(input({ modelPrompt: { promptSha256: digest('prompt'), decoding: { freeform: 'raw prompt text' } } as WritingReceiptInput['modelPrompt'] }))).toThrow();
    expect(() => createWritingReceipt(input({ budget: { ...input().budget, used: 1001 } }))).toThrow();
  });

  it('does not remove a lock owned by another receipt writer', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'writing-receipt-lock-')); roots.push(cwd);
    const receipt = createWritingReceipt(input());
    const destination = writingReceiptPath(cwd, receipt.id);
    const lock = `${destination}.lock`;
    await mkdir(lock, { recursive: true });
    await expect(writeWritingReceipt(cwd, receipt)).rejects.toMatchObject({ code: 'EEXIST' });
    expect((await stat(lock)).isDirectory()).toBe(true);
    await expect(readFile(destination)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('writes canonical receipts through .aiwg-location with owner-only permissions and detects corrupt files', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'writing-receipt-'));
    const corpus = await mkdtemp(path.join(tmpdir(), 'writing-receipt-corpus-'));
    roots.push(cwd, corpus);
    await writeFile(path.join(cwd, '.aiwg-location'), `${corpus}\n`);
    const receipt = createWritingReceipt(input());

    const written = await writeWritingReceipt(cwd, receipt);
    expect(written.path).toBe(path.join(corpus, 'writing', 'receipts', 'receipt-1.json'));
    expect(written.path).toBe(writingReceiptPath(cwd, 'receipt-1'));
    expect((await readWritingReceipt(cwd, 'receipt-1')).receipt).toEqual(receipt);
    expect((await stat(path.dirname(written.path))).mode & 0o777).toBe(0o700);
    expect((await stat(written.path)).mode & 0o777).toBe(0o600);
    await expect(writeWritingReceipt(cwd, receipt)).resolves.toEqual(written);
    await expect(writeWritingReceipt(cwd, createWritingReceipt(input({ createdAt: '2026-09-06T12:01:00.000Z' })))).rejects.toThrow('already exists');

    await mkdir(path.dirname(written.path), { recursive: true });
    await writeFile(written.path, '{ bad json');
    await expect(readWritingReceipt(cwd, 'receipt-1')).rejects.toThrow('corrupt');
    await expect(readFile(path.join(cwd, '.aiwg', 'writing', 'receipts', 'receipt-1.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
