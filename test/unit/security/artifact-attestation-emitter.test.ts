import { generateKeyPairSync, verify } from 'node:crypto';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

import {
  ARTIFACT_ATTESTATION_MEDIA_TYPE,
  createArtifactAttestation,
  createArtifactProvenanceStatement,
  describeAttestationSidecar,
  serializeArtifactAttestation,
} from '../../../src/security/artifact-attestation.js';
import { canonicalJson, dssePae, sha256 } from '../../../src/security/artifact-trust.js';
import envelopeSchema from '../../../schemas/security/aiwg-artifact-attestation.v1.schema.json';
import statementSchema from '../../../schemas/security/aiwg-artifact-provenance.v1.schema.json';

function options() {
  return {
    artifact: {
      name: 'setup.aiwg.yaml',
      bytes: Buffer.from('version: 1\n'),
      uri: 'https://aiwg.io/setup.aiwg.yaml',
      mediaType: 'application/yaml',
    },
    assetType: 'setup-manifest',
    publisher: { id: 'aiwg-release', namespace: 'aiwg', role: 'release' },
    publication: {
      version: '2026.8.16',
      channel: 'stable',
      sequence: 42,
      sourceUri: 'https://git.integrolabs.net/roctinam/aiwg/src/tag/v2026.8.16',
    },
    issuedAt: '2026-08-16T20:00:00.000Z',
    notBefore: '2026-08-16T20:00:00.000Z',
    expiresAt: '2026-09-15T20:00:00.000Z',
    derivation: {
      builder: { id: 'aiwg-release', version: '2026.8.16' },
      materials: [{
        uri: 'git+https://git.integrolabs.net/roctinam/aiwg@abc123',
        digest: { sha256: 'a'.repeat(64) },
      }],
      reproducible: true,
    },
  } as const;
}

describe('artifact attestation producer', () => {
  it('builds schema-valid canonical provenance bound to exact artifact bytes', () => {
    const statement = createArtifactProvenanceStatement(options());
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(statementSchema);

    expect(validate(statement), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(statement.subject[0].digest.sha256).toBe(sha256(options().artifact.bytes));
    expect(Buffer.from(canonicalJson(statement))).toEqual(Buffer.from(canonicalJson(statement)));
  });

  it('signs DSSE PAE over the exact emitted payload and publishes portable public-key material', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const attestation = createArtifactAttestation({ ...options(), privateKey });
    const payload = Buffer.from(attestation.envelope.payload, 'base64');
    const signature = Buffer.from(attestation.envelope.signatures[0].sig, 'base64');
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(envelopeSchema);

    expect(validate(attestation), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(verify(null, dssePae(attestation.envelope.payloadType, payload), publicKey, signature)).toBe(true);

    const changed = Buffer.from(`${payload.toString('utf8')} `);
    expect(verify(null, dssePae(attestation.envelope.payloadType, changed), publicKey, signature)).toBe(false);
  });

  it('describes adjacent sidecars using their exact serialized bytes', () => {
    const { privateKey } = generateKeyPairSync('ed25519');
    const bytes = serializeArtifactAttestation(createArtifactAttestation({ ...options(), privateKey }));
    expect(describeAttestationSidecar('setup.aiwg.yaml', bytes)).toEqual({
      path: 'setup.aiwg.yaml.aiwg-attestation.json',
      sha256: sha256(bytes),
      bytes: bytes.byteLength,
      mediaType: ARTIFACT_ATTESTATION_MEDIA_TYPE,
    });
  });

  it('rejects invalid freshness and sequence metadata before signing', () => {
    const { privateKey } = generateKeyPairSync('ed25519');
    expect(() => createArtifactAttestation({
      ...options(),
      publication: { ...options().publication, sequence: 0 },
      privateKey,
    })).toThrow(/positive safe integer/);
    expect(() => createArtifactAttestation({
      ...options(),
      expiresAt: options().issuedAt,
      privateKey,
    })).toThrow(/expiresAt must follow/);
  });
});
