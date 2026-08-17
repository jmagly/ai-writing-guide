import { describe, expect, it } from 'vitest';

import {
  ARTIFACT_ATTESTATION_MEDIA_TYPE,
  ARTIFACT_VERIFICATION_RESULT_SCHEMA_VERSION,
  PROVIDER_TRANSFORMATION_RECEIPT_SCHEMA,
  createArtifactAttestation,
  createMarketplaceArtifactAttestation,
  createProviderTransformationReceipt,
  describeAttestationSidecar,
  diagnoseProviderTransformationReceipt,
  verifyArtifact,
  verifyMarketplaceEvidence,
} from '../../../src/api/index.js';

describe('cross-asset public API', () => {
  it('exports producer, verifier, marketplace bridge, and provider receipt contracts', () => {
    expect(ARTIFACT_ATTESTATION_MEDIA_TYPE).toBe('application/vnd.aiwg.artifact-attestation.v1+json');
    expect(ARTIFACT_VERIFICATION_RESULT_SCHEMA_VERSION).toBe('aiwg.verify.result.v1');
    expect(PROVIDER_TRANSFORMATION_RECEIPT_SCHEMA).toBe('aiwg.provider-transformation-receipt.v1');
    for (const entrypoint of [
      createArtifactAttestation,
      describeAttestationSidecar,
      verifyArtifact,
      createMarketplaceArtifactAttestation,
      verifyMarketplaceEvidence,
      createProviderTransformationReceipt,
      diagnoseProviderTransformationReceipt,
    ]) expect(entrypoint).toBeTypeOf('function');
  });
});
