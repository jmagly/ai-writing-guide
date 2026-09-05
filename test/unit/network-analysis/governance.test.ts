import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_NETWORK_ANALYSIS_POLICY,
  assertLiveCaptureAuthorized,
  assertLocalOutputAllowed,
  assertProviderTransferAllowed,
  hashEvidenceFile,
  resolveCaptureDestination,
  safeProcessSpec,
  tsharkFilterArgs,
  verifyEvidenceFile,
  type CaptureScope,
  type LiveCaptureAuthorization,
  type NetworkAnalysisPolicy,
  type ProviderDisclosureDecision,
} from '../../../src/network-analysis/governance.js';

const root = path.resolve(import.meta.dirname, '../../..');
const schema = JSON.parse(readFileSync(path.join(root, 'schemas/network-analysis/governance-record.v1.schema.json'), 'utf8'));
const fixtureNames = ['policy.valid.json', 'live-authorization.valid.json', 'disclosure.valid.json'];
const fixtures = fixtureNames.map(name => JSON.parse(readFileSync(path.join(root, 'test/fixtures/network-analysis/governance', name), 'utf8')));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const temporaryDirectories: string[] = [];

const activePolicy: NetworkAnalysisPolicy = {
  acquisition: 'live-capture-explicit-authorization',
  output: 'metadata-only',
  payloadAccess: 'explicit-opt-in',
  providerTransfer: 'explicit-decision',
};

const scope: CaptureScope = {
  interface: 'lab0',
  captureFilter: { type: 'capture_filter', language: 'bpf', expression: 'tcp port 443' },
  limits: { durationSeconds: 300, byteLimit: 100 * 1024 * 1024, fileCount: 1 },
  destination: { path: '/evidence/case-001/capture.pcapng', overwrite: false },
  retention: { class: 'case-evidence', deleteAt: '2026-10-05T20:00:00Z', disposition: 'verified-delete' },
};

const authorization: LiveCaptureAuthorization = {
  ...scope,
  authorizationId: 'capture-auth-001',
  state: 'authorized',
  authority: { principal: 'case-operator', basis: 'written lab authorization', approvedBy: 'security-owner' },
  issuedAt: '2026-09-05T20:00:00Z',
  expiresAt: '2026-09-05T21:00:00Z',
};

const decision: ProviderDisclosureDecision = {
  decisionId: 'disclosure-001',
  state: 'allow',
  captureDigest: `sha256:${'a'.repeat(64)}`,
  provider: 'approved-provider',
  purpose: 'summarize approved transport metadata',
  allowedContent: ['metadata', 'headers'],
  allowedFields: ['frame.number', 'ip.src', 'ip.dst'],
  payloadExplicitlyAuthorized: false,
  decidedBy: 'data-owner',
  issuedAt: '2026-09-05T20:00:00Z',
  expiresAt: '2026-09-05T21:00:00Z',
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('network analysis security governance (#2279)', () => {
  it('publishes strict records and requires explicit payload authorization for provider disclosure', () => {
    for (const fixture of fixtures) expect(validate(fixture), JSON.stringify(validate.errors)).toBe(true);

    const missingBound = structuredClone(fixtures[1]);
    delete missingBound.limits.byte_limit;
    expect(validate(missingBound)).toBe(false);

    const unapprovedPayload = structuredClone(fixtures[2]);
    unapprovedPayload.allowed_content = ['metadata', 'payload'];
    unapprovedPayload.payload_explicitly_authorized = false;
    expect(validate(unapprovedPayload)).toBe(false);
  });

  it('defaults to offline, metadata-only operation with payload and provider transfer denied', () => {
    expect(DEFAULT_NETWORK_ANALYSIS_POLICY).toEqual({
      acquisition: 'offline-only',
      output: 'metadata-only',
      payloadAccess: 'deny',
      providerTransfer: 'deny',
    });
    expect(() => assertLiveCaptureAuthorized(DEFAULT_NETWORK_ANALYSIS_POLICY, authorization, scope, new Date('2026-09-05T20:30:00Z')))
      .toThrow('Live capture is disabled by policy');
    expect(() => assertLocalOutputAllowed(DEFAULT_NETWORK_ANALYSIS_POLICY, { content: ['metadata', 'payload'], payloadOptIn: true }))
      .toThrow('require explicit policy and request opt-in');
    expect(() => assertLocalOutputAllowed(DEFAULT_NETWORK_ANALYSIS_POLICY, { content: ['metadata', 'headers'], payloadOptIn: false }))
      .toThrow('Header output requires explicit policy');
    expect(() => assertLocalOutputAllowed(activePolicy, { content: ['payload'], payloadOptIn: true }))
      .toThrow('metadata-first');
  });

  it('requires exact authority, scope, destination, retention, and active bounded authorization', () => {
    const now = new Date('2026-09-05T20:30:00Z');
    expect(() => assertLiveCaptureAuthorized(activePolicy, authorization, scope, now)).not.toThrow();

    expect(() => assertLiveCaptureAuthorized(activePolicy, authorization, {
      ...scope,
      interface: 'eth0',
    }, now)).toThrow('interface exceeds authorization');

    expect(() => assertLiveCaptureAuthorized(activePolicy, authorization, {
      ...scope,
      limits: { ...scope.limits, durationSeconds: 301 },
    }, now)).toThrow('limits exceed authorization');

    expect(() => assertLiveCaptureAuthorized(activePolicy, authorization, scope, new Date('2026-09-05T21:00:00Z')))
      .toThrow('is not active');
  });

  it('keeps filters typed and passes hostile-looking text as a literal argv entry with shell disabled', () => {
    const expression = 'tcp port 443; touch /tmp/should-never-run';
    const args = tsharkFilterArgs({ captureFilter: { type: 'capture_filter', language: 'bpf', expression } });
    const spec = safeProcessSpec('/usr/bin/tshark', ['-i', 'lab0', ...args]);

    expect(spec).toEqual({ file: '/usr/bin/tshark', args: ['-i', 'lab0', '-f', expression], shell: false });
    expect(() => safeProcessSpec('/usr/bin/tshark', ['safe', 'bad\0argument'])).toThrow('without NUL');
    expect(() => safeProcessSpec('tshark', [])).toThrow('must be absolute');
  });

  it('requires a separate, exact, active provider decision and never widens content or fields', () => {
    const request = {
      captureDigest: decision.captureDigest,
      provider: decision.provider,
      purpose: decision.purpose,
      content: ['metadata'] as const,
      fields: ['frame.number'],
    };
    expect(() => assertProviderTransferAllowed(activePolicy, decision, { ...request, content: [...request.content] }, new Date('2026-09-05T20:30:00Z')))
      .not.toThrow();
    expect(() => assertProviderTransferAllowed(DEFAULT_NETWORK_ANALYSIS_POLICY, decision, { ...request, content: [...request.content] }))
      .toThrow('disabled by policy');
    expect(() => assertProviderTransferAllowed(activePolicy, decision, { ...request, content: ['metadata', 'payload'] }, new Date('2026-09-05T20:30:00Z')))
      .toThrow('exceeds disclosure decision');
    expect(() => assertProviderTransferAllowed(activePolicy, decision, { ...request, fields: ['frame.number', 'tcp.payload'], content: [...request.content] }, new Date('2026-09-05T20:30:00Z')))
      .toThrow('fields exceed disclosure decision');
  });

  it('hashes source and derived files independently and detects tampering and symlinks', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'aiwg-network-governance-'));
    temporaryDirectories.push(directory);
    const source = path.join(directory, 'source.pcapng');
    const derived = path.join(directory, 'derived.json');
    await writeFile(source, 'immutable capture bytes');
    await writeFile(derived, '{"derived":true}');

    const sourceIdentity = await hashEvidenceFile(source, 'source-capture');
    const derivedIdentity = await hashEvidenceFile(derived, 'derived-artifact');
    expect(sourceIdentity.value).toMatch(/^[a-f0-9]{64}$/);
    expect(derivedIdentity.value).not.toBe(sourceIdentity.value);
    await expect(verifyEvidenceFile(source, sourceIdentity)).resolves.toBeUndefined();

    await writeFile(source, 'tampered capture bytes');
    await expect(verifyEvidenceFile(source, sourceIdentity)).rejects.toThrow('no longer matches');

    const link = path.join(directory, 'capture-link.pcapng');
    await symlink(source, link);
    await expect(hashEvidenceFile(link, 'source-capture')).rejects.toThrow('non-symlink');
  });

  it('confines new capture destinations below a real root and rejects symlink escapes', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'aiwg-network-destination-'));
    temporaryDirectories.push(directory);
    const allowedRoot = path.join(directory, 'evidence', 'case-001');
    const outside = path.join(directory, 'outside');
    await mkdir(allowedRoot, { recursive: true });
    await mkdir(outside);
    expect(await resolveCaptureDestination(allowedRoot, path.join(allowedRoot, 'capture.pcapng')))
      .toBe(path.join(allowedRoot, 'capture.pcapng'));
    await expect(resolveCaptureDestination(allowedRoot, path.join(outside, 'capture.pcapng')))
      .rejects.toThrow('below the allowed root');

    const linkedParent = path.join(allowedRoot, 'linked');
    await symlink(outside, linkedParent);
    await expect(resolveCaptureDestination(allowedRoot, path.join(linkedParent, 'capture.pcapng')))
      .rejects.toThrow('below the allowed root');
  });
});
