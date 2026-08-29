import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse as parseYaml } from 'yaml';
import {
  createSanitizedSummary,
  evaluatePublicationGate,
  prepareEvidenceForSink,
  resolveArtifactGovernance,
  resolveClassificationDefinitions,
  type PublicationApproval,
  type PublicationSink,
} from '../../../src/governance/index.js';

describe('artifact classification and publication gates (#179)', () => {
  it('validates the shipped policy template and rejects incomplete artifact metadata', () => {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    const policySchema = JSON.parse(readFileSync(resolve('schemas/ops/governance-policy.schema.json'), 'utf8'));
    const artifactSchema = JSON.parse(readFileSync(resolve('schemas/ops/artifact-governance.schema.json'), 'utf8'));
    const policy = parseYaml(readFileSync(resolve('agentic/code/frameworks/ops-complete/templates/governance-policy.yaml'), 'utf8'));
    expect(ajv.compile(policySchema)(policy)).toBe(true);
    const validateArtifact = ajv.compile(artifactSchema);
    expect(validateArtifact({ governance: { classification: 'restricted-infrastructure' }, lifecycle: {} })).toBe(false);
    expect(validateArtifact.errors?.map((error) => error.instancePath)).toEqual(expect.arrayContaining(['/governance', '/lifecycle']));
    const prepared = prepareEvidenceForSink({
      artifact: {
        id: 'schema-proof', kind: 'Notice', category: 'generic', payload: { status: 'complete' },
        governance: { classification: 'public', handling: { allowedSinks: ['public-repository'], crossRepo: 'allow' } },
      },
      sinkId: 'public-repository', now: new Date('2026-08-29T12:00:00.000Z'),
    }).prepared;
    expect(prepared).toBeDefined();
    expect(validateArtifact({ governance: prepared?.governance, lifecycle: prepared?.lifecycle })).toBe(true);
  });

  it('applies explicit, parent, kind, category, and policy defaults in order', () => {
    expect(resolveArtifactGovernance({
      kind: 'ITAsset', category: 'generic', metadata: { classification: 'confidential' },
      parent: { classification: 'restricted-identity' },
    }).classificationSource).toBe('artifact');
    expect(resolveArtifactGovernance({
      kind: 'ITAsset', category: 'generic', parent: { classification: 'restricted-identity' },
    })).toMatchObject({ classification: 'restricted-identity', classificationSource: 'parent' });
    expect(resolveArtifactGovernance({ kind: 'ITAsset', category: 'generic' }))
      .toMatchObject({ classification: 'restricted-infrastructure', classificationSource: 'kind-default' });
    expect(resolveArtifactGovernance({ kind: 'UnknownKind', category: 'identity-audit' }))
      .toMatchObject({ classification: 'restricted-identity', classificationSource: 'category-default' });
    expect(resolveArtifactGovernance({ kind: 'UnknownKind', category: 'unknown' }))
      .toMatchObject({ classification: 'internal', classificationSource: 'policy-default' });
  });

  it('validates explicit requirements and custom ordered classifications', () => {
    expect(() => resolveArtifactGovernance({
      kind: 'ITAsset', category: 'generic', policy: { requireExplicitForKinds: ['ITAsset'] },
    })).toThrow(/requires an explicit classification/);
    const policy = { classes: { 'regulated-record': { rank: 35 } } };
    expect(resolveClassificationDefinitions(policy)['regulated-record'].rank).toBe(35);
    expect(resolveArtifactGovernance({
      kind: 'CustomRecord', category: 'generic', metadata: { classification: 'regulated-record' }, policy,
    }).classificationRank).toBe(35);
    expect(() => resolveClassificationDefinitions({ classes: { 'bad class': { rank: 2 } } })).toThrow(/stable identifier/);
    expect(() => resolveClassificationDefinitions({ classes: { public: { rank: 99 } } })).toThrow(/rank cannot be changed/);
  });

  it('allows public-to-public and restricted-to-private, but denies restricted-to-public', () => {
    const publicGovernance = resolveArtifactGovernance({
      kind: 'Notice', category: 'generic', metadata: { classification: 'public' },
    });
    const restrictedGovernance = resolveArtifactGovernance({ kind: 'ITNetworkState', category: 'network-inventory' });
    const publicSink: PublicationSink = {
      id: 'public-docs', visibility: 'public', external: true, persistent: true, mutable: true,
      maxClassification: 'public',
    };
    const privateSink: PublicationSink = {
      id: 'private-cmdb', visibility: 'private', external: false, persistent: true, mutable: true,
      maxClassification: 'restricted-infrastructure',
    };
    expect(evaluatePublicationGate({ artifactId: 'notice', artifactKind: 'Notice', governance: publicGovernance, sink: publicSink }).decision).toBe('allow');
    expect(evaluatePublicationGate({ artifactId: 'network', artifactKind: 'ITNetworkState', governance: restrictedGovernance, sink: privateSink }).decision).toBe('allow');
    expect(evaluatePublicationGate({ artifactId: 'network', artifactKind: 'ITNetworkState', governance: restrictedGovernance, sink: publicSink }))
      .toMatchObject({ allowed: false, decision: 'deny', reasonCodes: ['classification-exceeds-sink'] });
  });

  it('fails closed for unknown sink visibility even with an approval', () => {
    const governance = resolveArtifactGovernance({ kind: 'ITAsset', category: 'generic' });
    const sink: PublicationSink = {
      id: 'mystery-sink', visibility: 'unknown', external: true, persistent: true, mutable: false,
    };
    const approval: PublicationApproval = {
      id: 'approval-1', actor: 'operator', reason: 'requested exception', artifactId: 'asset-1',
      sinkId: 'mystery-sink', approvedAt: '2026-08-29T12:00:00.000Z',
    };
    expect(evaluatePublicationGate({ artifactId: 'asset-1', artifactKind: 'ITAsset', governance, sink, approval }))
      .toMatchObject({ allowed: false, decision: 'deny' });
  });

  it('fails closed without a payload when project governance policy is invalid', () => {
    const result = prepareEvidenceForSink({
      artifact: { id: 'x', kind: 'Notice', category: 'generic', payload: { status: 'ok' } },
      sinkId: 'broken',
      policy: {
        sinks: {
          broken: { id: 'different', visibility: 'public', external: true, persistent: true, mutable: true },
        },
      },
    });
    expect(result).toMatchObject({ allowed: false, audit: { reasonCodes: ['invalid-governance-policy'] } });
    expect(result.prepared).toBeUndefined();
    expect(prepareEvidenceForSink({
      artifact: { id: 'x', kind: 'Notice', category: 'generic', payload: { status: 'ok' } },
      sinkId: 'broken-visibility',
      policy: {
        sinks: {
          'broken-visibility': {
            id: 'broken-visibility', visibility: 'not-a-visibility' as 'public',
            external: true, persistent: true, mutable: true, maxClassification: 'public',
          },
        },
      },
    })).toMatchObject({ allowed: false, audit: { reasonCodes: ['invalid-governance-policy'] } });
  });

  it('requires scoped approval for a cross-repo downgrade and records no payload or reason', () => {
    const governance = resolveArtifactGovernance({
      kind: 'ITAsset', category: 'generic',
      metadata: { classification: 'restricted-infrastructure', handling: { crossRepo: 'approval-required' } },
    });
    const sink: PublicationSink = {
      id: 'partner-private', visibility: 'restricted', external: true, persistent: true, mutable: true,
      maxClassification: 'restricted-infrastructure', repository: 'partner/ops',
    };
    const denied = evaluatePublicationGate({
      artifactId: 'asset-1', artifactKind: 'ITAsset', governance, sink, sourceRepository: 'home/ops',
    });
    expect(denied.reasonCodes).toContain('cross-repo-approval-required');
    const approval: PublicationApproval = {
      id: 'approval-2', actor: 'data-owner', reason: 'approved partner handoff',
      artifactId: 'asset-1', sinkId: 'partner-private', approvedAt: '2026-08-29T12:00:00.000Z',
    };
    const allowed = evaluatePublicationGate({
      artifactId: 'asset-1', artifactKind: 'ITAsset', governance, sink,
      sourceRepository: 'home/ops', approval, now: new Date('2026-08-29T12:01:00.000Z'),
    });
    expect(allowed).toMatchObject({ allowed: true, decision: 'override', audit: { approvalId: 'approval-2' } });
    expect(JSON.stringify(allowed.audit)).not.toContain('approved partner handoff');

    const futureApproval = { ...approval, approvedAt: '2026-08-30T12:00:00.000Z' };
    expect(evaluatePublicationGate({
      artifactId: 'asset-1', artifactKind: 'ITAsset', governance, sink,
      sourceRepository: 'home/ops', approval: futureApproval, now: new Date('2026-08-29T12:01:00.000Z'),
    }).allowed).toBe(false);

    const deniedGovernance = resolveArtifactGovernance({
      kind: 'ITAsset', category: 'generic',
      metadata: { classification: 'restricted-infrastructure', handling: { crossRepo: 'deny' } },
    });
    expect(evaluatePublicationGate({
      artifactId: 'asset-1', artifactKind: 'ITAsset', governance: deniedGovernance, sink,
      sourceRepository: 'home/ops', approval, now: new Date('2026-08-29T12:01:00.000Z'),
    })).toMatchObject({ allowed: false, reasonCodes: ['cross-repo-denied'] });
  });

  it('publishes a payload-free sanitized summary when a public sink cannot receive the artifact', () => {
    const result = prepareEvidenceForSink({
      artifact: {
        id: 'network-prod', kind: 'ITNetworkState', category: 'network-inventory',
        payload: { status: 'current', subnet: '10.0.0.0/8', token: 'redaction-canary-network-token' },
        status: 'current',
      },
      sinkId: 'public-issue',
      now: new Date('2026-08-29T12:00:00.000Z'),
    });
    expect(result).toMatchObject({ allowed: true, prepared: { summary: true }, audit: { decision: 'summary' } });
    const serialized = JSON.stringify(result.prepared?.payload);
    expect(serialized).not.toContain('network-prod');
    expect(serialized).not.toContain('10.0.0.0/8');
    expect(serialized).not.toContain('redaction-canary');
    expect(result.prepared?.lifecycle).toMatchObject({ policyId: 'immutable-sanitized-summary', dispositionDeadline: null });
    expect(createSanitizedSummary({ artifactId: 'x', artifactKind: 'Y', omittedFields: 2, redactionClasses: [] }))
      .not.toHaveProperty('artifactId');

    const publicNotice = prepareEvidenceForSink({
      artifact: {
        id: 'public-notice', kind: 'Notice', category: 'generic', status: 'complete',
        payload: { status: 'complete', detail: 'already public but not retractable' },
        governance: { classification: 'public' },
      },
      sinkId: 'public-issue', now: new Date('2026-08-29T12:00:00.000Z'),
    });
    expect(publicNotice).toMatchObject({
      allowed: true,
      prepared: { summary: true, lifecycle: { policyId: 'immutable-sanitized-summary', dispositionDeadline: null } },
    });
    expect(JSON.stringify(publicNotice.prepared?.payload)).not.toContain('already public but not retractable');
  });
});
