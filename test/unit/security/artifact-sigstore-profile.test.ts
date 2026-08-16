import { generateKeyPairSync, sign } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

const verifySpy = vi.fn();

vi.mock('@sigstore/bundle', () => ({
  bundleFromJSON: (value: unknown) => value,
  isBundleWithDsseEnvelope: () => true,
}));
vi.mock('@sigstore/protobuf-specs', () => ({
  TrustedRoot: { fromJSON: (value: unknown) => ({ decoded: value }) },
}));
vi.mock('@sigstore/verify', () => ({
  toTrustMaterial: (value: unknown) => value,
  toSignedEntity: (value: unknown) => value,
  Verifier: class {
    constructor(public trust: unknown, public options: unknown) {}
    verify(entity: unknown, policy: unknown) {
      verifySpy({ trust: this.trust, options: this.options, entity, policy });
      return { key: { export: () => Buffer.from('test-sigstore-public-key') } };
    }
  },
}));

import {
  ARTIFACT_TRUST_ROOT_MEDIA_TYPE,
  ARTIFACT_TRUST_ROOT_SCHEMA_VERSION,
  bootstrapTrustRoot,
  canonicalJson,
  sha256,
  trustRootSigningBytes,
  type ArtifactTrustRoot,
} from '../../../src/security/artifact-trust.js';
import { verifyArtifact } from '../../../src/security/artifact-verifier.js';

describe('Sigstore trust-policy adapter (#2087)', () => {
  it('binds the exact DSSE bundle to explicit root, identity, and evidence thresholds', async () => {
    const artifact = Buffer.from('signed provider output\n');
    const payload = Buffer.from(canonicalJson({
      _type: 'https://in-toto.io/Statement/v1',
      subject: [{ name: 'provider.md', digest: { sha256: sha256(artifact) } }],
      predicateType: 'https://aiwg.io/attestations/artifact-provenance/v1',
      predicate: {
        schemaVersion: 'aiwg.artifact-provenance.v1', assetType: 'generated-provider-artifact',
        publisher: { id: 'release', namespace: 'aiwg.io' },
        publication: { version: '1', channel: 'stable', sequence: 1 },
        issuedAt: '2026-08-16T10:00:00.000Z', expiresAt: '2026-08-17T00:00:00.000Z',
      },
    }));
    const rootPair = generateKeyPairSync('ed25519');
    const root: ArtifactTrustRoot = {
      mediaType: ARTIFACT_TRUST_ROOT_MEDIA_TYPE,
      signed: {
        schemaVersion: ARTIFACT_TRUST_ROOT_SCHEMA_VERSION, version: 1,
        issuedAt: '2026-08-01T00:00:00.000Z', expiresAt: '2027-08-01T00:00:00.000Z',
        identities: [
          { id: 'root', independenceGroup: 'offline', kind: 'public-key', algorithm: 'ed25519', publicKey: rootPair.publicKey.export({ format: 'pem', type: 'spki' }).toString() },
          { id: 'sigstore-release', independenceGroup: 'ci', kind: 'sigstore', profile: 'public-good', subjectAlternativeName: '^https://github.com/jmagly/aiwg/', issuer: 'https://token.actions.githubusercontent.com' },
        ],
        sigstoreProfiles: [{ id: 'public-good', trustedRoot: { mediaType: 'test-root' }, tlogThreshold: 1, ctlogThreshold: 1, timestampThreshold: 1 }],
        root: { keyIds: ['root'], threshold: 1, scope: { assetTypes: ['*'], namespaces: ['*'], channels: ['*'] } },
        delegations: [{ id: 'release', parent: 'root', keyIds: ['sigstore-release'], threshold: 1, scope: { assetTypes: ['generated-provider-artifact'], namespaces: ['aiwg.io'], channels: ['stable'] } }],
        revocations: [],
        policy: { name: 'sigstore-test', requireMaterialDigests: false, maxFreezeSeconds: 3600, allowPolicyExempt: [] },
      },
      signatures: [],
    };
    root.signatures = [{ sig: sign(null, trustRootSigningBytes(root), rootPair.privateKey).toString('base64') }];
    const rootBytes = Buffer.from(`${JSON.stringify(root)}\n`);
    const state = bootstrapTrustRoot(rootBytes, sha256(rootBytes), '2026-08-16T12:00:00.000Z').state;
    const sig = Buffer.from('test-signature');
    const dsseEnvelope = { payloadType: 'application/vnd.in-toto+json', payload, signatures: [{ sig, keyid: Buffer.alloc(0) }] };
    const outcome = await verifyArtifact({
      artifactBytes: artifact, artifactName: 'provider.md', rootBytes, state, now: '2026-08-16T12:00:00.000Z',
      attestation: {
        mediaType: 'application/vnd.aiwg.artifact-attestation.v1+json',
        envelope: { payloadType: dsseEnvelope.payloadType, payload: payload.toString('base64'), signatures: [{ sig: sig.toString('base64') }] },
        verificationMaterial: { kind: 'sigstore-bundle', mediaType: 'application/vnd.dev.sigstore.bundle.v0.3+json', bundle: { content: { dsseEnvelope } } },
      },
    });

    expect(outcome.status).toBe('verified');
    expect(verifySpy).toHaveBeenCalledWith(expect.objectContaining({
      options: { tlogThreshold: 1, ctlogThreshold: 1, timestampThreshold: 1 },
      policy: { subjectAlternativeName: '^https://github.com/jmagly/aiwg/', extensions: { issuer: 'https://token.actions.githubusercontent.com' } },
    }));
  });
});
