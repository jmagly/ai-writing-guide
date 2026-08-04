import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryIntakeCoordinator } from '../../../src/memory/intake.js';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'aiwg-memory-intake-'));
  mkdirSync(join(root, 'sources'), { recursive: true });
  writeFileSync(join(root, 'sources/decision.md'), '# Decision\n\nSQLite is authoritative.\n');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('compound-memory intake', () => {
  it('previews without mutation and preserves an immutable digest-addressed raw copy', () => {
    const coordinator = new MemoryIntakeCoordinator(root);
    const preview = coordinator.preview('sources/decision.md');
    expect(preview).toMatchObject({
      route: 'llm-wiki',
      duplicate: false,
      mutation: { wouldCopyRaw: true, wouldPromoteKnowledge: false },
    });
    expect(existsSync(join(root, '.aiwg'))).toBe(false);
    const original = readFileSync(join(root, 'sources/decision.md'), 'utf8');
    const receipt = coordinator.confirm('sources/decision.md', preview.operationId);
    expect(readFileSync(join(root, receipt.rawLocator), 'utf8')).toBe(original);
    expect(readFileSync(join(root, 'sources/decision.md'), 'utf8')).toBe(original);
    expect(coordinator.confirm('sources/decision.md', preview.operationId)).toMatchObject({
      receiptId: receipt.receiptId,
      duplicate: true,
    });
  });

  it('routes transcript formats to sessions and rejects changed-source confirmation', () => {
    writeFileSync(join(root, 'sources/session.jsonl'), '{"role":"user","text":"Decision: keep receipts"}\n');
    const coordinator = new MemoryIntakeCoordinator(root);
    expect(coordinator.preview('sources/session.jsonl').route).toBe('sessions');
    const preview = coordinator.preview('sources/decision.md');
    writeFileSync(join(root, 'sources/decision.md'), '# Changed\n');
    expect(() => coordinator.confirm('sources/decision.md', preview.operationId))
      .toThrow(/exact current preview/);
  });
});
