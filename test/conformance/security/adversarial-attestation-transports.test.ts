import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { bootstrapTrustRoot, sha256, type ArtifactTrustState } from '../../../src/security/artifact-trust.js';
import { verifyArtifact, type ArtifactVerificationInput, type ArtifactVerificationStatus } from '../../../src/security/artifact-verifier.js';

type Fixture = {
  schemaVersion: string;
  provenance: { releaseUse: string; generatedBy: string; deterministicInputs: string };
  transports: string[];
  now: string;
  artifact: { name: string; bytesBase64: string };
  material: { uri: string; bytesBase64: string };
  portableSigstoreTestBundle: { mediaType: string; testOnly: boolean; dsseEnvelopeSha256: string };
  root: unknown;
  revokedRoot: unknown;
  compromisedRoot: unknown;
  attestations: Record<string, any>;
};

const fixture = JSON.parse(readFileSync(
  'test/fixtures/security/adversarial-attestation-conformance-v1.json',
  'utf8',
)) as Fixture;

const artifact = Buffer.from(fixture.artifact.bytesBase64, 'base64');
const material = Buffer.from(fixture.material.bytesBase64, 'base64');

function bytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function stateFor(root = fixture.root): { rootBytes: Buffer; state: ArtifactTrustState } {
  const rootBytes = bytes(root);
  return { rootBytes, state: bootstrapTrustRoot(rootBytes, sha256(rootBytes), fixture.now).state };
}

type Evidence = {
  artifactBytes: Buffer;
  artifactName: string;
  attestation: any;
  rootBytes: Buffer;
  state: ArtifactTrustState;
  materials: Map<string, Uint8Array>;
  offline?: boolean;
  now: string;
  expectedScope?: { assetType: string; namespace: string; channel: string };
};

function baseEvidence(attestation = fixture.attestations.sequence1, root = fixture.root): Evidence {
  const trust = stateFor(root);
  return {
    artifactBytes: Buffer.from(artifact), artifactName: fixture.artifact.name,
    attestation: structuredClone(attestation), ...trust,
    materials: new Map([[fixture.material.uri, Buffer.from(material)]]), now: fixture.now,
  };
}

// Each adapter exercises the representation boundary used by its transport,
// then returns the verifier's single transport-neutral input contract.
const adapters: Record<string, (evidence: Evidence) => Evidence> = {
  file: evidence => structuredClone(evidence),
  'https-web-resource': evidence => ({
    ...evidence,
    artifactBytes: Buffer.from(evidence.artifactBytes.toString('base64'), 'base64'),
    attestation: JSON.parse(JSON.stringify(evidence.attestation)),
  }),
  'release-sidecar': evidence => ({ ...evidence, attestation: JSON.parse(bytes(evidence.attestation).toString('utf8')) }),
  'marketplace-fortemi': evidence => ({
    ...evidence,
    artifactBytes: Buffer.from(JSON.parse(JSON.stringify({ payload: evidence.artifactBytes.toString('base64') })).payload, 'base64'),
  }),
  'oci-referrer': evidence => ({
    ...evidence,
    attestation: JSON.parse(Buffer.from(evidence.attestation.envelope.payload, 'base64').length > 0
      ? JSON.stringify(evidence.attestation) : 'null'),
  }),
  'provider-transformation-receipt': evidence => ({
    ...evidence,
    artifactBytes: Buffer.from(evidence.artifactBytes),
    materials: new Map([...evidence.materials].map(([uri, value]) => [uri, Buffer.from(value)])),
  }),
};

async function status(evidence: Evidence): Promise<ArtifactVerificationStatus> {
  return (await verifyArtifact(evidence as ArtifactVerificationInput)).status;
}

async function acrossTransports(evidence: Evidence, expected: ArtifactVerificationStatus): Promise<void> {
  expect(Object.keys(adapters)).toEqual(fixture.transports);
  const results = await Promise.all(fixture.transports.map(name => status(adapters[name](evidence))));
  expect(new Set(results), `${expected}: ${results.join(', ')}`).toEqual(new Set([expected]));
}

function unsigned(attestation = fixture.attestations.sequence1): any {
  const copy = structuredClone(attestation);
  copy.envelope.signatures = [];
  return copy;
}

describe('non-waiveable adversarial attestation conformance (#2092)', () => {
  it('uses deterministic, visibly test-only real cryptographic fixtures', () => {
    expect(fixture.schemaVersion).toBe('aiwg.adversarial-attestation-conformance.v1');
    expect(fixture.provenance.releaseUse).toBe('forbidden');
    expect(fixture.provenance.generatedBy).toBe('test/fixtures/security/generate-adversarial-attestation-conformance.mjs');
    expect(fixture.provenance.deterministicInputs).toContain('TEST ONLY');
    expect(JSON.stringify(fixture.root)).toContain('TEST ONLY');
    expect(fixture.portableSigstoreTestBundle).toMatchObject({
      mediaType: 'application/vnd.dev.sigstore.bundle.v0.3+json', testOnly: true,
    });
  });

  it('accepts the two-independent-signature threshold and portable offline evidence everywhere', async () => {
    await acrossTransports({ ...baseEvidence(), offline: true }, 'verified');
  });

  it.each([
    ['tampering', (e: Evidence) => { e.artifactBytes = Buffer.from('tampered'); }, 'mismatched'],
    ['LF/CRLF change', (e: Evidence) => { e.artifactBytes = Buffer.from(e.artifactBytes.toString().replaceAll('\n', '\r\n')); }, 'mismatched'],
    ['payload reserialization', (e: Evidence) => { e.attestation = structuredClone(fixture.attestations.noncanonical); }, 'mismatched'],
    ['unknown signer', (e: Evidence) => { e.attestation = structuredClone(fixture.attestations.unknownSigner); }, 'unknown-signer'],
    ['expiry', (e: Evidence) => { e.now = '2026-08-18T00:00:00.000Z'; }, 'expired'],
    ['revocation', (e: Evidence) => Object.assign(e, stateFor(fixture.revokedRoot)), 'revoked'],
    ['retroactive key compromise', (e: Evidence) => Object.assign(e, stateFor(fixture.compromisedRoot)), 'revoked'],
    ['subdependency substitution', (e: Evidence) => { e.materials.set(fixture.material.uri, Buffer.from('dependency:v2\n')); }, 'mismatched'],
    ['altered generated output', (e: Evidence) => { e.artifactBytes = Buffer.from('provider: codex\nsource: altered\n'); }, 'mismatched'],
    ['offline evidence loss', (e: Evidence) => { e.offline = true; delete e.attestation.verificationMaterial; }, 'offline-evidence-missing'],
  ] as const)('%s has the same stable status across transports', async (_name, mutate, expected) => {
    const evidence = baseEvidence();
    mutate(evidence);
    await acrossTransports(evidence, expected);
  });

  it('enforces replay, rollback, freeze, mix-and-match, and fast-forward recovery', async () => {
    const initial = baseEvidence();
    const first = await verifyArtifact(initial);
    expect(first.status).toBe('verified');

    const second = { ...baseEvidence(fixture.attestations.sequence2), state: first.nextState! };
    const secondResult = await verifyArtifact(second);
    expect(secondResult.status).toBe('verified');

    await acrossTransports({ ...baseEvidence(), state: secondResult.nextState! }, 'stale');

    const fastForward = baseEvidence(fixture.attestations.sequence3);
    fastForward.state = first.nextState!;
    await acrossTransports(fastForward, 'stale');

    const third = { ...baseEvidence(fixture.attestations.sequence3), state: secondResult.nextState! };
    await acrossTransports(third, 'verified');

    const mixed = baseEvidence();
    mixed.state.channels['aiwg.test::conformance::generated-provider-artifact::provider.yaml'] = {
      namespace: 'aiwg.test', channel: 'conformance', subject: 'provider.yaml',
      assetType: 'generated-provider-artifact', sequence: 1, version: 'test-1',
      artifactSha256: 'f'.repeat(64), verifiedAt: fixture.now,
    };
    await acrossTransports(mixed, 'stale');

    const frozen = baseEvidence();
    frozen.state.channels['aiwg.test::conformance::generated-provider-artifact::provider.yaml'] = {
      namespace: 'aiwg.test', channel: 'conformance', subject: 'provider.yaml',
      assetType: 'generated-provider-artifact', sequence: 1, version: 'test-1',
      artifactSha256: sha256(artifact), verifiedAt: '2026-08-14T00:00:00.000Z',
    };
    await acrossTransports(frozen, 'stale');
  });

  it('keeps generic insecure compatibility handling from upgrading negative evidence', async () => {
    const negative = baseEvidence();
    negative.artifactBytes = Buffer.from('tampered');
    const result = await verifyArtifact({ ...negative, genericInsecure: true } as ArtifactVerificationInput);
    expect(result.status).toBe('mismatched');
    expect(result.exitCode).not.toBe(0);
  });

  it('covers unsigned legacy assets and only explicit non-executable exemptions', async () => {
    await acrossTransports(baseEvidence(unsigned()), 'unsigned');
    const exempt = baseEvidence(unsigned());
    exempt.expectedScope = { assetType: 'documentation', namespace: 'aiwg.test', channel: 'conformance' };
    await acrossTransports(exempt, 'policy-exempt');

    const executable = baseEvidence(unsigned());
    executable.expectedScope = { assetType: 'generated-provider-artifact', namespace: 'aiwg.test', channel: 'conformance' };
    await acrossTransports(executable, 'unsigned');
  });
});
