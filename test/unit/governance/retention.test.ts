import { describe, expect, it, vi } from 'vitest';
import {
  createEvidenceLifecycle,
  executeLifecycle,
  minimizeEvidence,
  placeEvidenceHold,
  reapplyRetentionPolicy,
  releaseEvidenceHold,
  resolveRetentionRule,
  type EvidenceRecord,
  type PublicationSink,
  type RetentionRule,
} from '../../../src/governance/index.js';

const mutableStore: PublicationSink = {
  id: 'evidence-store', visibility: 'restricted', external: false, persistent: true, mutable: true,
  maxClassification: 'restricted-identity',
};

const immutableIssue: PublicationSink = {
  id: 'customer-issue', visibility: 'public', external: true, persistent: true, mutable: false,
  maxClassification: 'public', acceptsSanitizedSummary: true,
};

function record(overrides: Partial<EvidenceRecord['metadata']> = {}): EvidenceRecord<Record<string, unknown>> {
  return {
    metadata: {
      schemaVersion: 'ops-evidence-lifecycle.aiwg.io/v1', artifactId: 'evidence-1',
      category: 'raw-audit', classification: 'restricted-infrastructure', sinkId: 'evidence-store',
      tier: 'raw', createdAt: '2026-08-01T00:00:00.000Z', policyId: 'delete-raw',
      policyVersion: '1', dispositionDeadline: '2026-08-02T00:00:00.000Z', action: 'delete',
      rawCaptureReasonDigest: 'sha256:reason', holds: [],
      ...overrides,
    },
    payload: { confidential: 'synthetic-disposal-canary' },
  };
}

describe('evidence minimization, retention, and disposal (#180)', () => {
  it('selects policy by category, classification, sink, and tier with project rules taking precedence', () => {
    const rules: RetentionRule[] = [{
      id: 'specific', version: '2', category: 'raw-audit', classification: 'restricted-infrastructure',
      sink: 'evidence-store', tier: 'raw', duration: 'PT12H', action: 'delete',
    }];
    expect(resolveRetentionRule({
      category: 'raw-audit', classification: 'restricted-infrastructure', sinkId: 'evidence-store', tier: 'raw',
    }, rules)).toMatchObject({ id: 'specific', version: '2' });
  });

  it('records creation, policy, deadline, tiers, and a reason digest without the raw reason', () => {
    const lifecycle = createEvidenceLifecycle({
      artifactId: 'raw-1', category: 'raw-audit', classification: 'restricted-infrastructure',
      sink: mutableStore, tier: 'raw', rawCaptureReason: 'needed for incident replay',
      createdAt: '2026-08-01T00:00:00.000Z',
    });
    expect(lifecycle).toMatchObject({
      createdAt: '2026-08-01T00:00:00.000Z', policyId: 'raw-audit-short-lived',
      dispositionDeadline: '2026-08-08T00:00:00.000Z', tier: 'raw', action: 'delete',
    });
    expect(lifecycle.rawCaptureReasonDigest).toMatch(/^sha256:/);
    expect(JSON.stringify(lifecycle)).not.toContain('needed for incident replay');
    expect(() => createEvidenceLifecycle({
      artifactId: 'raw-2', category: 'raw-audit', classification: 'restricted-infrastructure',
      sink: mutableStore, tier: 'raw',
    })).toThrow(/explicit reason/);
  });

  it('defaults durable audit output to minimum sufficient evidence', () => {
    const minimized = minimizeEvidence({
      status: 'failed', exitCode: 7, command: ['sensitive-command', '--flag'],
      stdout: 'a'.repeat(900), stderr: 'short failure', extraTopology: 'private-hostname',
    }, 32) as Record<string, unknown>;
    expect(minimized).toMatchObject({ status: 'failed', exitCode: 7, sourceFieldCount: 6 });
    expect(minimized).toHaveProperty('commandDigest');
    expect(minimized).not.toHaveProperty('command');
    expect(minimized).not.toHaveProperty('extraTopology');
    expect(minimized.stdout).toMatchObject({ bytes: 900, truncated: true });
  });

  it('treats immutable issue sinks explicitly and permits only durable non-expiring summaries', () => {
    expect(() => createEvidenceLifecycle({
      artifactId: 'raw-issue', category: 'raw-audit', classification: 'public', sink: immutableIssue,
      tier: 'raw', rawCaptureReason: 'debugging',
    })).toThrow(/immutable sink/);
    expect(createEvidenceLifecycle({
      artifactId: 'summary-issue', category: 'sanitized-summary', classification: 'public', sink: immutableIssue,
      tier: 'durable', createdAt: '2026-08-01T00:00:00.000Z',
    })).toMatchObject({ policyId: 'immutable-sanitized-summary', action: 'retain', dispositionDeadline: null });
  });

  it('places and releases explicit auditable holds that pause an already-due action', async () => {
    const placed = placeEvidenceHold({
      record: record(), holdId: 'legal-1', actor: 'counsel', reason: 'active litigation',
      now: new Date('2026-08-03T00:00:00.000Z'),
    });
    const deleteFn = vi.fn();
    expect(await executeLifecycle(placed.record, { delete: deleteFn }, new Date('2026-08-04T00:00:00.000Z')))
      .toMatchObject({ outcome: 'held' });
    expect(deleteFn).not.toHaveBeenCalled();
    expect(JSON.stringify(placed.audit)).not.toContain('active litigation');
    const released = releaseEvidenceHold({
      record: placed.record, holdId: 'legal-1', actor: 'counsel', reason: 'matter closed',
      now: new Date('2026-08-05T00:00:00.000Z'),
    });
    expect(await executeLifecycle(released.record, { delete: deleteFn }, new Date('2026-08-05T00:01:00.000Z')))
      .toMatchObject({ outcome: 'completed', action: 'delete' });
    expect(deleteFn).toHaveBeenCalledOnce();
  });

  it('emits payload-free failure receipts and supports every lifecycle action', async () => {
    const summarize = vi.fn();
    const redactFields = vi.fn();
    const archive = vi.fn();
    const deletion = vi.fn().mockRejectedValue(Object.assign(new Error('synthetic-disposal-canary'), { code: 'DELETE_DENIED' }));
    expect(await executeLifecycle(record({ action: 'summarize' }), { summarize }, new Date('2026-08-03T00:00:00.000Z')))
      .toMatchObject({ outcome: 'completed', action: 'summarize' });
    expect(await executeLifecycle(record({ action: 'redact-fields', dispositionFields: ['/namedUsers'] }), { redactFields }, new Date('2026-08-03T00:00:00.000Z')))
      .toMatchObject({ outcome: 'completed', action: 'redact-fields' });
    expect(redactFields).toHaveBeenCalledWith(expect.anything(), ['/namedUsers']);
    expect(await executeLifecycle(record({ action: 'archive', archiveSink: 'cold-store' }), { archive }, new Date('2026-08-03T00:00:00.000Z')))
      .toMatchObject({ outcome: 'completed', action: 'archive', destinationId: 'cold-store' });
    const failed = await executeLifecycle(record(), { delete: deletion }, new Date('2026-08-03T00:00:00.000Z'));
    expect(failed).toMatchObject({ outcome: 'failed', errorCode: 'DELETE_DENIED' });
    expect(JSON.stringify(failed)).not.toContain('synthetic-disposal-canary');
    expect(failed).not.toHaveProperty('payload');
  });

  it('recomputes deadlines after policy changes and acts on already-expired evidence', async () => {
    const changed = reapplyRetentionPolicy({
      record: record({ createdAt: '2026-08-01T00:00:00.000Z' }), sink: mutableStore,
      rules: [{ id: 'new-short-policy', version: '3', category: 'raw-audit', tier: 'raw', duration: 'PT1H', action: 'delete' }],
      requestedPolicyId: 'new-short-policy',
    });
    expect(changed.metadata).toMatchObject({
      policyId: 'new-short-policy', policyVersion: '3', dispositionDeadline: '2026-08-01T01:00:00.000Z',
      rawCaptureReasonDigest: 'sha256:reason',
    });
    const deletion = vi.fn();
    expect(await executeLifecycle(changed, { delete: deletion }, new Date('2026-08-01T02:00:00.000Z')))
      .toMatchObject({ outcome: 'completed' });
    expect(deletion).toHaveBeenCalledOnce();
  });
});
