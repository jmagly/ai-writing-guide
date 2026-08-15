/**
 * Protocol conformance oracle for issue #2068.
 * @source schemas/security/aiwg-artifact-attestation.v1.schema.json
 * @source schemas/security/aiwg-artifact-provenance.v1.schema.json
 * @source test/fixtures/security/artifact-attestation-v1.json
 * @agent codex
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

type VectorCase = {
  id: string;
  expectedStatus: string;
  artifactBytesBase64?: string;
  materialBytesBase64?: string;
  subjectDigestOverride?: string;
  payloadSerialization?: 'pretty-json';
  now?: string;
  trustedSequence?: number;
  signerKnown?: boolean;
  signatureValid?: boolean;
  verificationMaterialAvailable?: boolean;
  signaturesPresent?: boolean;
  offline?: boolean;
  policyExempt?: boolean;
  revokedAt?: string;
  compromisedFrom?: string;
  malformed?: boolean;
  policyDenied?: boolean;
};

const vectors = JSON.parse(readFileSync('test/fixtures/security/artifact-attestation-v1.json', 'utf8'));
const envelopeSchema = JSON.parse(readFileSync('schemas/security/aiwg-artifact-attestation.v1.schema.json', 'utf8'));
const predicateSchema = JSON.parse(readFileSync('schemas/security/aiwg-artifact-provenance.v1.schema.json', 'utf8'));

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
}

function dssePae(payloadType: string, payload: Buffer): Buffer {
  const type = Buffer.from(payloadType, 'utf8');
  return Buffer.concat([
    Buffer.from(`DSSEv1 ${type.length} `),
    type,
    Buffer.from(` ${payload.length} `),
    payload,
  ]);
}

function evaluate(vector: VectorCase): string {
  const base = vectors.base;
  if (vector.malformed) return 'malformed';
  if (vector.policyExempt) return 'policy-exempt';
  if (vector.signaturesPresent === false) return 'unsigned';
  if (vector.signatureValid === false) return 'mismatched';

  const payloadBytes = Buffer.from(base.attestation.envelope.payload, 'base64');
  const statement = JSON.parse(payloadBytes.toString('utf8'));
  if (vector.payloadSerialization === 'pretty-json') {
    const changedBytes = Buffer.from(JSON.stringify(statement, null, 2));
    if (!changedBytes.equals(payloadBytes)) return 'mismatched';
  }

  const subject = vector.subjectDigestOverride ?? statement.subject[0].digest.sha256;
  const artifact = Buffer.from(vector.artifactBytesBase64 ?? base.artifactBytesBase64, 'base64');
  if (sha256(artifact) !== subject || statement.subject[0].name !== base.artifactName) return 'mismatched';

  const material = Buffer.from(vector.materialBytesBase64 ?? base.materialBytesBase64, 'base64');
  if (sha256(material) !== statement.predicate.derivation.materials[0].digest.sha256) return 'mismatched';

  if (vector.signerKnown === false) return 'unknown-signer';
  const issuedAt = Date.parse(statement.predicate.issuedAt);
  if (vector.compromisedFrom && issuedAt >= Date.parse(vector.compromisedFrom)) return 'revoked';
  if (vector.revokedAt && Date.parse(vector.revokedAt) <= Date.parse(vector.now ?? base.now)) return 'revoked';
  if (Date.parse(vector.now ?? base.now) > Date.parse(statement.predicate.expiresAt)) return 'expired';
  if (statement.predicate.publication.sequence < (vector.trustedSequence ?? base.trustedSequence)) return 'stale';
  if (vector.offline && vector.verificationMaterialAvailable === false) return 'offline-evidence-missing';
  if (vector.policyDenied) return 'policy-denied';
  return 'verified';
}

describe('AIWG artifact attestation v1 contract', () => {
  it('publishes closed, compilable envelope and predicate schemas', () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    const validateEnvelope = ajv.compile(envelopeSchema);
    const validatePredicate = ajv.compile(predicateSchema);
    const statement = JSON.parse(Buffer.from(vectors.base.attestation.envelope.payload, 'base64').toString('utf8'));

    expect(validateEnvelope(vectors.base.attestation), JSON.stringify(validateEnvelope.errors, null, 2)).toBe(true);
    expect(validatePredicate(statement), JSON.stringify(validatePredicate.errors, null, 2)).toBe(true);
    expect(validateEnvelope({ ...vectors.base.attestation, unsignedHint: true })).toBe(false);
    expect(validatePredicate({ ...statement, trustMe: true })).toBe(false);
  });

  it('uses canonical producer serialization while verifying exact DSSE payload bytes', () => {
    const payload = Buffer.from(vectors.base.attestation.envelope.payload, 'base64').toString('utf8');
    expect(canonicalJson(JSON.parse(payload))).toBe(payload);
    expect(sha256(Buffer.from(payload))).toBe('9730bbfbbbf556f7fae00f18ddddc4404a5ac99d0454fd80db44e7a615e1e402');
    expect(sha256(dssePae(vectors.base.attestation.envelope.payloadType, Buffer.from(payload))))
      .toBe(vectors.base.expectedPaeSha256);
  });

  it('treats LF and CRLF YAML as distinct artifacts', () => {
    const lf = Buffer.from(vectors.base.artifactBytesBase64, 'base64');
    const crlfCase = vectors.cases.find((entry: VectorCase) => entry.id === 'line-endings-lf-to-crlf');
    const crlf = Buffer.from(crlfCase.artifactBytesBase64, 'base64');
    expect(sha256(lf)).toBe('a4e8484c247e23d9abfb7734ef24d3086357780a654ec081bec0241b1ea88c67');
    expect(sha256(crlf)).toBe('4ac268aa359989d7db50feeae17b26399f02a5da0e007292bcbecddb243a4a12');
    expect(crlf.equals(lf)).toBe(false);
  });

  it('covers the required adversarial and offline states with stable outcomes', () => {
    const cases = vectors.cases as VectorCase[];
    expect(new Set(cases.map(entry => entry.id)).size).toBe(cases.length);
    for (const vector of cases) {
      expect(evaluate(vector), vector.id).toBe(vector.expectedStatus);
    }

    const ids = new Set(cases.map(entry => entry.id));
    for (const required of [
      'tampered-artifact-content',
      'line-endings-lf-to-crlf',
      'payload-reserialized-noncanonical',
      'mix-and-match-valid-envelope-wrong-subject',
      'replay-older-channel-sequence',
      'subdependency-substitution',
      'compromised-key-retroactive-window',
      'altered-generated-provider-output',
      'offline-missing-verification-material',
    ]) expect(ids.has(required), required).toBe(true);
  });

  it('defines every stable verifier status from the research contract', () => {
    const statuses = new Set((vectors.cases as VectorCase[]).map(entry => entry.expectedStatus));
    expect(statuses).toEqual(new Set([
      'verified',
      'policy-exempt',
      'unsigned',
      'unknown-signer',
      'expired',
      'revoked',
      'stale',
      'mismatched',
      'malformed',
      'offline-evidence-missing',
      'policy-denied',
    ]));
  });
});
