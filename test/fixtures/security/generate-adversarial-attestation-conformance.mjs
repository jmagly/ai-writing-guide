#!/usr/bin/env node
import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const OUTPUT = 'test/fixtures/security/adversarial-attestation-conformance-v1.json';
const NOW = '2026-08-16T12:00:00.000Z';
const TEST_ONLY_SEEDS = {
  root: 'AIWG #2092 TEST ONLY root authority',
  releaseA: 'AIWG #2092 TEST ONLY release authority A',
  releaseB: 'AIWG #2092 TEST ONLY release authority B',
  unknown: 'AIWG #2092 TEST ONLY unknown authority',
};

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

function keyFromLabel(label) {
  const seed = createHash('sha256').update(label).digest();
  const prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  return createPrivateKey({ key: Buffer.concat([prefix, seed]), format: 'der', type: 'pkcs8' });
}

function publicPem(key) {
  return createPublicKey(key).export({ format: 'pem', type: 'spki' }).toString();
}

function pae(payload) {
  const type = Buffer.from('application/vnd.in-toto+json');
  return Buffer.concat([Buffer.from(`DSSEv1 ${type.length} `), type, Buffer.from(` ${payload.length} `), payload]);
}

const keys = Object.fromEntries(Object.entries(TEST_ONLY_SEEDS).map(([name, label]) => [name, keyFromLabel(label)]));
const artifact = Buffer.from('provider: codex\nsource: canonical\n');
const material = Buffer.from('dependency:v1\n');

function statement(sequence, assetType = 'generated-provider-artifact', name = 'provider.yaml', bytes = artifact) {
  return {
    _type: 'https://in-toto.io/Statement/v1',
    subject: [{ name, digest: { sha256: sha256(bytes) } }],
    predicateType: 'https://aiwg.io/attestations/artifact-provenance/v1',
    predicate: {
      schemaVersion: 'aiwg.artifact-provenance.v1',
      assetType,
      publisher: { id: 'test-only-release', namespace: 'aiwg.test' },
      publication: { version: `test-${sequence}`, channel: 'conformance', sequence },
      issuedAt: '2026-08-16T11:00:00.000Z',
      expiresAt: '2026-08-17T00:00:00.000Z',
      derivation: {
        builder: { id: 'test-only-fixture-generator', version: '1' },
        materials: [{ uri: 'test://dependency', digest: { sha256: sha256(material) } }],
        reproducible: true,
      },
    },
  };
}

function attestation(sequence, signers = [keys.releaseA, keys.releaseB], payloadOverride) {
  const payload = payloadOverride ?? Buffer.from(canonicalJson(statement(sequence)));
  return {
    mediaType: 'application/vnd.aiwg.artifact-attestation.v1+json',
    envelope: {
      payloadType: 'application/vnd.in-toto+json',
      payload: payload.toString('base64'),
      signatures: signers.map(key => ({ keyid: sha256(Buffer.from(publicPem(key))), sig: sign(null, pae(payload), key).toString('base64') })),
    },
    verificationMaterial: {
      kind: 'public-key', algorithm: 'ed25519', publicKey: publicPem(signers[0]),
    },
  };
}

function rootSigningBytes(root) {
  return Buffer.from(canonicalJson(root.signed));
}

function buildRoot({ revokedAt, compromisedFrom } = {}) {
  const root = {
    mediaType: 'application/vnd.aiwg.artifact-trust-root.v1+json',
    signed: {
      schemaVersion: 'aiwg.artifact-trust-root.v1', version: 1,
      issuedAt: '2026-08-01T00:00:00.000Z', expiresAt: '2027-08-01T00:00:00.000Z',
      identities: [
        { id: 'test-root', independenceGroup: 'test-offline-root', kind: 'public-key', algorithm: 'ed25519', publicKey: publicPem(keys.root) },
        { id: 'test-release-a', independenceGroup: 'test-release-a', kind: 'public-key', algorithm: 'ed25519', publicKey: publicPem(keys.releaseA) },
        { id: 'test-release-b', independenceGroup: 'test-release-b', kind: 'public-key', algorithm: 'ed25519', publicKey: publicPem(keys.releaseB) },
      ],
      sigstoreProfiles: [],
      root: { keyIds: ['test-root'], threshold: 1, scope: { assetTypes: ['*'], namespaces: ['*'], channels: ['*'] } },
      delegations: [{
        id: 'test-release-threshold', parent: 'root', keyIds: ['test-release-a', 'test-release-b'], threshold: 2,
        scope: { assetTypes: ['*'], namespaces: ['aiwg.test'], channels: ['conformance'] },
      }],
      revocations: revokedAt || compromisedFrom ? [{
        identityId: 'test-release-a', effectiveAt: revokedAt ?? compromisedFrom,
        ...(compromisedFrom ? { compromisedFrom } : {}),
        scope: { assetTypes: ['*'], namespaces: ['*'], channels: ['*'] }, reason: 'TEST ONLY adversarial fixture',
      }] : [],
      policy: {
        name: 'TEST ONLY #2092 conformance policy', requireMaterialDigests: true, maxFreezeSeconds: 86400,
        allowPolicyExempt: [{ assetTypes: ['documentation'], namespaces: ['aiwg.test'], channels: ['conformance'] }],
      },
    },
    signatures: [],
  };
  root.signatures = [{ identityId: 'test-root', sig: sign(null, rootSigningBytes(root), keys.root).toString('base64') }];
  return root;
}

const prettyPayload = Buffer.from(JSON.stringify(statement(1), null, 2));
const output = {
  schemaVersion: 'aiwg.adversarial-attestation-conformance.v1',
  provenance: {
    issue: 2092, generatedBy: 'test/fixtures/security/generate-adversarial-attestation-conformance.mjs',
    deterministicInputs: 'SHA-256-derived Ed25519 seeds whose labels contain TEST ONLY',
    releaseUse: 'forbidden', generatedAt: 'SOURCE_DATE_EPOCH:2026-08-16T12:00:00.000Z',
  },
  transports: ['file', 'https-web-resource', 'release-sidecar', 'marketplace-fortemi', 'oci-referrer', 'provider-transformation-receipt'],
  now: NOW,
  artifact: { name: 'provider.yaml', bytesBase64: artifact.toString('base64') },
  material: { uri: 'test://dependency', bytesBase64: material.toString('base64') },
  portableSigstoreTestBundle: {
    mediaType: 'application/vnd.dev.sigstore.bundle.v0.3+json', testOnly: true,
    dsseEnvelopeSha256: sha256(Buffer.from(fixturePayloadForBundle())),
    note: 'Portable test-bundle provenance; production parsing is covered by artifact-sigstore-profile.test.ts.',
  },
  root: buildRoot(),
  revokedRoot: buildRoot({ revokedAt: '2026-08-16T10:00:00.000Z' }),
  compromisedRoot: buildRoot({ compromisedFrom: '2026-08-16T10:30:00.000Z' }),
  attestations: {
    sequence1: attestation(1), sequence2: attestation(2), sequence3: attestation(3),
    unknownSigner: attestation(1, [keys.unknown]),
    noncanonical: attestation(1, [keys.releaseA, keys.releaseB], prettyPayload),
  },
};

function fixturePayloadForBundle() {
  return attestation(1).envelope.payload;
}

writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(`generated ${OUTPUT} (${sha256(Buffer.from(JSON.stringify(output)))} content digest)`);
