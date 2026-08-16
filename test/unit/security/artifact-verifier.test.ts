import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

import {
  ARTIFACT_TRUST_ROOT_MEDIA_TYPE,
  ARTIFACT_TRUST_ROOT_SCHEMA_VERSION,
  bootstrapTrustRoot,
  canonicalJson,
  dssePae,
  sha256,
  trustRootSigningBytes,
  verifyRootTransition,
  type ArtifactTrustRoot,
} from '../../../src/security/artifact-trust.js';
import { ARTIFACT_VERIFICATION_EXIT_CODES, verifyArtifact } from '../../../src/security/artifact-verifier.js';

const NOW = '2026-08-16T12:00:00.000Z';
const ARTIFACT = Buffer.from('provider: codex\nsource: canonical\n');
const ARTIFACT_NAME = 'provider.yaml';

function keyPair() {
  const pair = generateKeyPairSync('ed25519');
  return {
    privateKey: pair.privateKey,
    publicKey: pair.publicKey.export({ format: 'pem', type: 'spki' }).toString(),
  };
}

function unsignedRoot(version = 1, rootKey = keyPair(), releaseKey = keyPair()): {
  root: ArtifactTrustRoot;
  rootKey: ReturnType<typeof keyPair>;
  releaseKey: ReturnType<typeof keyPair>;
} {
  return {
    rootKey,
    releaseKey,
    root: {
      mediaType: ARTIFACT_TRUST_ROOT_MEDIA_TYPE,
      signed: {
        schemaVersion: ARTIFACT_TRUST_ROOT_SCHEMA_VERSION,
        version,
        issuedAt: '2026-08-01T00:00:00.000Z',
        expiresAt: '2027-08-01T00:00:00.000Z',
        identities: [
          { id: 'root-1', independenceGroup: 'offline-a', kind: 'public-key', algorithm: 'ed25519', publicKey: rootKey.publicKey },
          { id: 'release-1', independenceGroup: 'release-a', kind: 'public-key', algorithm: 'ed25519', publicKey: releaseKey.publicKey },
        ],
        sigstoreProfiles: [],
        root: {
          keyIds: ['root-1'], threshold: 1,
          scope: { assetTypes: ['*'], namespaces: ['*'], channels: ['*'] },
        },
        delegations: [{
          id: 'release', parent: 'root', keyIds: ['release-1'], threshold: 1,
          scope: { assetTypes: ['generated-provider-artifact'], namespaces: ['aiwg.io'], channels: ['stable'] },
        }],
        revocations: [],
        policy: { name: 'test-policy', requireMaterialDigests: false, maxFreezeSeconds: 86_400, allowPolicyExempt: [] },
      },
      signatures: [],
    },
  };
}

function encodeRoot(root: ArtifactTrustRoot, signer: ReturnType<typeof keyPair>, identityId = 'root-1'): Buffer {
  root.signatures = [{ identityId, sig: sign(null, trustRootSigningBytes(root), signer.privateKey).toString('base64') }];
  return Buffer.from(`${JSON.stringify(root, null, 2)}\n`);
}

function attestation(releaseKey: ReturnType<typeof keyPair>, overrides: Record<string, unknown> = {}) {
  const statement = {
    _type: 'https://in-toto.io/Statement/v1',
    subject: [{ name: ARTIFACT_NAME, digest: { sha256: sha256(ARTIFACT) } }],
    predicateType: 'https://aiwg.io/attestations/artifact-provenance/v1',
    predicate: {
      schemaVersion: 'aiwg.artifact-provenance.v1',
      assetType: 'generated-provider-artifact',
      publisher: { id: 'test-release', namespace: 'aiwg.io', role: 'release' },
      publication: { version: '2026.8.16', channel: 'stable', sequence: 1 },
      issuedAt: '2026-08-16T11:00:00.000Z',
      expiresAt: '2026-09-16T00:00:00.000Z',
      ...overrides,
    },
  };
  const payload = Buffer.from(canonicalJson(statement));
  return {
    mediaType: 'application/vnd.aiwg.artifact-attestation.v1+json',
    envelope: {
      payloadType: 'application/vnd.in-toto+json',
      payload: payload.toString('base64url'),
      signatures: [{
        // Deliberately wrong: keyid is never a trust decision.
        keyid: 'attacker-controlled-hint',
        sig: sign(null, dssePae('application/vnd.in-toto+json', payload), releaseKey.privateKey).toString('base64url'),
      }],
    },
    verificationMaterial: { kind: 'public-key', algorithm: 'ed25519', publicKey: 'untrusted-outer-key' },
  };
}

function signedPayloadAttestation(releaseKey: ReturnType<typeof keyPair>, payload: Buffer) {
  return {
    mediaType: 'application/vnd.aiwg.artifact-attestation.v1+json',
    envelope: {
      payloadType: 'application/vnd.in-toto+json',
      payload: payload.toString('base64url'),
      signatures: [{
        sig: sign(null, dssePae('application/vnd.in-toto+json', payload), releaseKey.privateKey).toString('base64url'),
      }],
    },
    verificationMaterial: { kind: 'public-key', algorithm: 'ed25519', publicKey: 'transport-only' },
  };
}

describe('cross-asset verification contract (#2087)', () => {
  it('publishes closed schemas and the complete stable status map', () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    const stateSchema = JSON.parse(readFileSync('schemas/security/aiwg-artifact-trust-state.v1.schema.json', 'utf8'));
    ajv.addSchema(stateSchema);
    for (const file of [
      'schemas/security/aiwg-artifact-trust-root.v1.schema.json',
      'schemas/security/aiwg-artifact-verification-result.v1.schema.json',
    ]) expect(() => ajv.compile(JSON.parse(readFileSync(file, 'utf8'))), file).not.toThrow();
    expect(ARTIFACT_VERIFICATION_EXIT_CODES).toEqual({
      verified: 0, 'policy-exempt': 20, unsigned: 21, 'unknown-signer': 22,
      expired: 23, revoked: 24, stale: 25, mismatched: 26, malformed: 27,
      'offline-evidence-missing': 28, 'policy-denied': 29,
    });
  });

  it('verifies exact bytes with URL-safe DSSE encoding and ignores keyid/outer keys', async () => {
    const fixture = unsignedRoot();
    const rootBytes = encodeRoot(fixture.root, fixture.rootKey);
    const bootstrap = bootstrapTrustRoot(rootBytes, sha256(rootBytes), NOW);
    const outcome = await verifyArtifact({
      artifactBytes: ARTIFACT, artifactName: ARTIFACT_NAME,
      attestation: attestation(fixture.releaseKey), rootBytes, state: bootstrap.state, now: NOW,
    });
    expect(outcome.status).toBe('verified');
    expect(outcome.exitCode).toBe(0);
    expect(outcome.identities).toEqual(['release-1']);
  });

  it('returns stable mismatch, stale, revoked, and offline failure states', async () => {
    const fixture = unsignedRoot();
    const rootBytes = encodeRoot(fixture.root, fixture.rootKey);
    const state = bootstrapTrustRoot(rootBytes, sha256(rootBytes), NOW).state;
    const base = { artifactName: ARTIFACT_NAME, attestation: attestation(fixture.releaseKey), rootBytes, state, now: NOW };

    expect((await verifyArtifact({ ...base, artifactBytes: Buffer.from('tampered') })).status).toBe('mismatched');
    expect((await verifyArtifact({ ...base, artifactBytes: ARTIFACT, offline: true, attestation: { ...attestation(fixture.releaseKey), verificationMaterial: undefined } })).status)
      .toBe('offline-evidence-missing');

    state.channels['aiwg.io::stable'] = {
      namespace: 'aiwg.io', channel: 'stable', sequence: 2, artifactSha256: sha256(ARTIFACT), version: 'newer', verifiedAt: NOW,
    };
    expect((await verifyArtifact({ ...base, artifactBytes: ARTIFACT })).status).toBe('stale');

    fixture.root.signed.revocations.push({
      identityId: 'release-1', effectiveAt: '2026-08-16T10:00:00.000Z',
      scope: { assetTypes: ['*'], namespaces: ['*'], channels: ['*'] }, reason: 'test compromise',
    });
    const revokedRootBytes = encodeRoot(fixture.root, fixture.rootKey);
    const revokedState = bootstrapTrustRoot(revokedRootBytes, sha256(revokedRootBytes), NOW).state;
    expect((await verifyArtifact({ ...base, artifactBytes: ARTIFACT, rootBytes: revokedRootBytes, state: revokedState })).status).toBe('revoked');
  });

  it('returns stable expired, malformed, and policy-denied verifier outcomes', async () => {
    const fixture = unsignedRoot();
    const rootBytes = encodeRoot(fixture.root, fixture.rootKey);
    const state = bootstrapTrustRoot(rootBytes, sha256(rootBytes), NOW).state;
    const base = { artifactBytes: ARTIFACT, artifactName: ARTIFACT_NAME, rootBytes, state, now: NOW };

    const expired = await verifyArtifact({
      ...base,
      attestation: attestation(fixture.releaseKey, { expiresAt: '2026-08-16T11:30:00.000Z' }),
    });
    expect(expired.status).toBe('expired');
    expect(expired.exitCode).toBe(23);
    expect(expired.diagnostics[0]?.code).toBe('ATTESTATION_TIME_WINDOW');

    const malformed = await verifyArtifact({
      ...base,
      attestation: signedPayloadAttestation(fixture.releaseKey, Buffer.from('not-json')),
    });
    expect(malformed.status).toBe('malformed');
    expect(malformed.exitCode).toBe(27);
    expect(malformed.identities).toEqual(['release-1']);
    expect(malformed.diagnostics[0]?.code).toBe('MALFORMED_SIGNED_PAYLOAD');

    const denied = await verifyArtifact({
      ...base,
      attestation: attestation(fixture.releaseKey),
      expectedScope: { assetType: 'documentation', namespace: 'aiwg.io', channel: 'stable' },
    });
    expect(denied.status).toBe('policy-denied');
    expect(denied.exitCode).toBe(29);
    expect(denied.identities).toEqual(['release-1']);
    expect(denied.diagnostics[0]?.code).toBe('EXPECTED_SCOPE_MISMATCH');
  });

  it('rejects fast-forward, same-sequence mix-and-match, freeze, and clock rollback', async () => {
    const fixture = unsignedRoot();
    const rootBytes = encodeRoot(fixture.root, fixture.rootKey);
    const initial = bootstrapTrustRoot(rootBytes, sha256(rootBytes), NOW).state;
    const run = (state: typeof initial, signed = attestation(fixture.releaseKey), now = NOW) => verifyArtifact({
      artifactBytes: ARTIFACT, artifactName: ARTIFACT_NAME, attestation: signed, rootBytes, state, now,
    });

    const prior = { namespace: 'aiwg.io', channel: 'stable', sequence: 1, artifactSha256: sha256(ARTIFACT), version: '1', verifiedAt: NOW };
    const fastForward = structuredClone(initial);
    fastForward.channels['aiwg.io::stable'] = prior;
    expect((await run(fastForward, attestation(fixture.releaseKey, { publication: { version: '3', channel: 'stable', sequence: 3 } }))).status).toBe('stale');

    const mixed = structuredClone(initial);
    mixed.channels['aiwg.io::stable'] = { ...prior, artifactSha256: 'f'.repeat(64) };
    expect((await run(mixed)).status).toBe('stale');

    const frozen = structuredClone(initial);
    frozen.channels['aiwg.io::stable'] = { ...prior, verifiedAt: '2026-08-14T00:00:00.000Z' };
    expect((await run(frozen)).status).toBe('stale');

    const clockRollback = structuredClone(initial);
    clockRollback.trustedTime = '2026-08-16T13:00:00.000Z';
    expect((await run(clockRollback)).status).toBe('stale');
  });

  it('never grants an unsigned exemption from unsigned self-asserted metadata', async () => {
    const fixture = unsignedRoot();
    fixture.root.signed.policy.allowPolicyExempt = [{ assetTypes: ['documentation'], namespaces: ['aiwg.io'], channels: ['stable'] }];
    const rootBytes = encodeRoot(fixture.root, fixture.rootKey);
    const state = bootstrapTrustRoot(rootBytes, sha256(rootBytes), NOW).state;
    const unsigned = attestation(fixture.releaseKey, { assetType: 'documentation' });
    unsigned.envelope.signatures = [];
    expect((await verifyArtifact({ artifactBytes: ARTIFACT, artifactName: ARTIFACT_NAME, attestation: unsigned, rootBytes, state, now: NOW })).status).toBe('unsigned');
    expect((await verifyArtifact({
      artifactBytes: ARTIFACT, artifactName: ARTIFACT_NAME, attestation: unsigned, rootBytes, state, now: NOW,
      expectedScope: { assetType: 'documentation', namespace: 'aiwg.io', channel: 'stable' },
    })).status).toBe('policy-exempt');
  });

  it('fails closed for unknown signers and scope expansion', async () => {
    const fixture = unsignedRoot();
    const rootBytes = encodeRoot(fixture.root, fixture.rootKey);
    const state = bootstrapTrustRoot(rootBytes, sha256(rootBytes), NOW).state;
    expect((await verifyArtifact({
      artifactBytes: ARTIFACT, artifactName: ARTIFACT_NAME,
      attestation: attestation(keyPair()), rootBytes, state, now: NOW,
    })).status).toBe('unknown-signer');

    fixture.root.signed.delegations.push({
      id: 'expanded-child', parent: 'release', keyIds: ['release-1'], threshold: 1,
      scope: { assetTypes: ['*'], namespaces: ['*'], channels: ['*'] },
    });
    const expanded = encodeRoot(fixture.root, fixture.rootKey);
    expect(() => bootstrapTrustRoot(expanded, sha256(expanded), NOW)).toThrow(/expands parent scope/);
  });
});

describe('trust-root lifecycle (#2088)', () => {
  it('requires an independently supplied exact bootstrap fingerprint', () => {
    const fixture = unsignedRoot();
    const bytes = encodeRoot(fixture.root, fixture.rootKey);
    expect(bootstrapTrustRoot(bytes, sha256(bytes), NOW).state.rootVersion).toBe(1);
    expect(() => bootstrapTrustRoot(Buffer.from(bytes.toString().trim()), sha256(bytes), NOW)).toThrow(/fingerprint/);
  });

  it('does not count duplicate cryptographic authority as independent identities', () => {
    const fixture = unsignedRoot();
    fixture.root.signed.identities.push({
      id: 'root-copy', independenceGroup: 'claimed-independent', kind: 'public-key',
      algorithm: 'ed25519', publicKey: fixture.rootKey.publicKey,
    });
    const bytes = encodeRoot(fixture.root, fixture.rootKey);
    expect(() => bootstrapTrustRoot(bytes, sha256(bytes), NOW)).toThrow(/duplicates cryptographic authority/);
  });

  it('accepts exactly-next root updates signed by old and new thresholds', () => {
    const current = unsignedRoot();
    const currentBytes = encodeRoot(current.root, current.rootKey);
    const state = bootstrapTrustRoot(currentBytes, sha256(currentBytes), NOW).state;
    const newRootKey = keyPair();
    const next = unsignedRoot(2, newRootKey, current.releaseKey);
    next.root.signed.identities[0].id = 'root-2';
    next.root.signed.root.keyIds = ['root-2'];
    next.root.signatures = [
      { identityId: 'root-2', sig: sign(null, trustRootSigningBytes(next.root), newRootKey.privateKey).toString('base64') },
      { identityId: 'old-root', sig: sign(null, trustRootSigningBytes(next.root), current.rootKey.privateKey).toString('base64') },
    ];
    // The old role locates by cryptographic verification, not the unauthenticated hint.
    const nextBytes = Buffer.from(`${JSON.stringify(next.root, null, 2)}\n`);
    expect(verifyRootTransition(currentBytes, nextBytes, state, NOW).state.rootVersion).toBe(2);
    next.root.signed.version = 4;
    expect(() => verifyRootTransition(currentBytes, encodeRoot(next.root, newRootKey), state, NOW)).toThrow(/exactly the next/);
  });

  it('rejects root updates that lack either old or new threshold approval', () => {
    const current = unsignedRoot();
    const currentBytes = encodeRoot(current.root, current.rootKey);
    const state = bootstrapTrustRoot(currentBytes, sha256(currentBytes), NOW).state;
    const newRootKey = keyPair();
    const next = unsignedRoot(2, newRootKey, current.releaseKey);
    next.root.signed.identities[0].id = 'root-2';
    next.root.signed.root.keyIds = ['root-2'];
    const payload = trustRootSigningBytes(next.root);

    next.root.signatures = [
      { identityId: 'root-2', sig: sign(null, payload, newRootKey.privateKey).toString('base64') },
    ];
    expect(() => verifyRootTransition(currentBytes, Buffer.from(`${JSON.stringify(next.root, null, 2)}\n`), state, NOW))
      .toThrow(/both old and new independent signature thresholds/);

    next.root.signatures = [
      { identityId: 'old-root', sig: sign(null, payload, current.rootKey.privateKey).toString('base64') },
    ];
    expect(() => verifyRootTransition(currentBytes, Buffer.from(`${JSON.stringify(next.root, null, 2)}\n`), state, NOW))
      .toThrow(/both old and new independent signature thresholds/);
  });
});
