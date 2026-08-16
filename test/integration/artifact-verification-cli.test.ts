import { generateKeyPairSync, sign } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { artifactVerifyHandler } from '../../src/cli/handlers/artifact-verify.js';
import {
  ARTIFACT_TRUST_ROOT_MEDIA_TYPE,
  ARTIFACT_TRUST_ROOT_SCHEMA_VERSION,
  canonicalJson,
  dssePae,
  sha256,
  trustRootSigningBytes,
  type ArtifactTrustRoot,
} from '../../src/security/artifact-trust.js';

describe('aiwg verify CLI integration (#2087/#2088)', () => {
  it('bootstraps explicit trust, verifies a local sidecar, and persists freshness state', async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'aiwg-artifact-verify-'));
    try {
      const rootKey = generateKeyPairSync('ed25519');
      const releaseKey = generateKeyPairSync('ed25519');
      const pem = (key: typeof rootKey.publicKey) => key.export({ format: 'pem', type: 'spki' }).toString();
      const artifact = Buffer.from('cli integration exact bytes\n');
      const statement = Buffer.from(canonicalJson({
        _type: 'https://in-toto.io/Statement/v1',
        subject: [{ name: 'asset.txt', digest: { sha256: sha256(artifact) } }],
        predicateType: 'https://aiwg.io/attestations/artifact-provenance/v1',
        predicate: {
          schemaVersion: 'aiwg.artifact-provenance.v1', assetType: 'documentation',
          publisher: { id: 'integration', namespace: 'aiwg.io' },
          publication: { version: '1', channel: 'stable', sequence: 1 },
          issuedAt: '2026-08-16T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z',
        },
      }));
      const root: ArtifactTrustRoot = {
        mediaType: ARTIFACT_TRUST_ROOT_MEDIA_TYPE,
        signed: {
          schemaVersion: ARTIFACT_TRUST_ROOT_SCHEMA_VERSION, version: 1,
          issuedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z',
          identities: [
            { id: 'root', independenceGroup: 'offline', kind: 'public-key', algorithm: 'ed25519', publicKey: pem(rootKey.publicKey) },
            { id: 'release', independenceGroup: 'ci', kind: 'public-key', algorithm: 'ed25519', publicKey: pem(releaseKey.publicKey) },
          ],
          sigstoreProfiles: [],
          root: { keyIds: ['root'], threshold: 1, scope: { assetTypes: ['*'], namespaces: ['*'], channels: ['*'] } },
          delegations: [{ id: 'release', parent: 'root', keyIds: ['release'], threshold: 1, scope: { assetTypes: ['documentation'], namespaces: ['aiwg.io'], channels: ['stable'] } }],
          revocations: [],
          policy: { name: 'integration', requireMaterialDigests: false, maxFreezeSeconds: 3600, allowPolicyExempt: [] },
        },
        signatures: [],
      };
      root.signatures = [{ sig: sign(null, trustRootSigningBytes(root), rootKey.privateKey).toString('base64') }];
      const rootBytes = Buffer.from(`${JSON.stringify(root, null, 2)}\n`);
      const attestation = {
        mediaType: 'application/vnd.aiwg.artifact-attestation.v1+json',
        envelope: {
          payloadType: 'application/vnd.in-toto+json', payload: statement.toString('base64'),
          signatures: [{ sig: sign(null, dssePae('application/vnd.in-toto+json', statement), releaseKey.privateKey).toString('base64') }],
        },
        verificationMaterial: { kind: 'public-key', algorithm: 'ed25519', publicKey: 'transport-only' },
      };
      writeFileSync(path.join(cwd, 'asset.txt'), artifact);
      writeFileSync(path.join(cwd, 'asset.attestation.json'), `${JSON.stringify(attestation)}\n`);
      writeFileSync(path.join(cwd, 'root.json'), rootBytes);

      const response = await artifactVerifyHandler.execute({
        args: ['asset.txt', '--attestation', 'asset.attestation.json', '--policy', 'root.json', '--root-fingerprint', sha256(rootBytes), '--json'],
        rawArgs: [], cwd, frameworkRoot: cwd,
      });
      expect(response.exitCode, response.message).toBe(0);
      expect(JSON.parse(response.message ?? '{}')).toMatchObject({ status: 'verified', identities: ['release'] });
      expect(existsSync(path.join(cwd, '.aiwg/security/artifact-trust-state.json'))).toBe(true);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
