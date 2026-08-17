import { execFileSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  MARKETPLACE_ENVELOPE_SUBJECT,
  createMarketplaceArtifactAttestation,
  marketplaceArtifactScope,
  serializeMarketplaceEnvelope,
  verifyMarketplaceDependencyClosure,
  type MarketplaceAttestationMaterial,
} from '../../../src/marketplace/artifact-attestation.js';
import { createProvenanceEnvelope } from '../../../src/marketplace/provenance.js';
import type { MarketplaceProvenanceEnvelope } from '../../../src/marketplace/provenance-types.js';
import { sha256 } from '../../../src/security/artifact-trust.js';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

describe('marketplace cross-asset bridge', () => {
  let root: string;
  let envelope: MarketplaceProvenanceEnvelope;

  beforeEach(async () => {
    root = mkdtempSync(path.join(tmpdir(), 'aiwg-marketplace-attestation-'));
    git(root, ['init', '--quiet']);
    git(root, ['config', 'user.name', 'AIWG Test']);
    git(root, ['config', 'user.email', 'aiwg@example.invalid']);
    git(root, ['remote', 'add', 'origin', 'https://git.example.invalid/acme/demo.git']);
    writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({
      id: 'demo', type: 'addon', version: '1.0.0', author: 'acme', license: 'MIT',
      dependencies: { required: [] },
    }));
    mkdirSync(path.join(root, 'skills', 'demo'), { recursive: true });
    writeFileSync(path.join(root, 'skills', 'demo', 'SKILL.md'), '# demo\n');
    git(root, ['add', '.']);
    git(root, ['commit', '--quiet', '-m', 'fixture']);
    envelope = await createProvenanceEnvelope({
      checkoutPath: root,
      artifactPath: root,
      manifest: JSON.parse(execFileSync('git', ['show', 'HEAD:manifest.json'], { cwd: root, encoding: 'utf8' })),
      requestedRef: 'main',
      publisher: 'acme',
      now: new Date('2026-08-16T12:00:00.000Z'),
    });
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function materials(): MarketplaceAttestationMaterial[] {
    return ['lock', 'inventory', 'git-tree', 'fortemi-shard', 'receipt', 'sbom', 'license'].map(name => ({
      name,
      uri: `aiwg:marketplace-material:${name}`,
      mediaType: 'application/octet-stream',
      bytes: Buffer.from(`${name}\n`),
    }));
  }

  it('binds the exact closed envelope and every required Fortemi/package material', () => {
    const pair = generateKeyPairSync('ed25519');
    const evidence = createMarketplaceArtifactAttestation({
      envelope,
      privateKey: pair.privateKey,
      materials: materials(),
      expiresAt: '2026-09-16T12:00:00.000Z',
      builder: { id: 'aiwg-marketplace', version: '1' },
    });
    const statement = JSON.parse(Buffer.from(evidence.attestation.envelope.payload, 'base64').toString('utf8'));

    expect(statement.subject).toEqual([{
      name: MARKETPLACE_ENVELOPE_SUBJECT,
      mediaType: 'application/vnd.aiwg.marketplace-envelope.v1+json',
      digest: { sha256: sha256(serializeMarketplaceEnvelope(envelope)) },
    }]);
    expect(statement.predicate.derivation.materials.map((item: { name: string }) => item.name))
      .toEqual(materials().map(item => item.name));
    expect(marketplaceArtifactScope(envelope)).toEqual({
      assetType: 'marketplace-envelope',
      namespace: 'acme',
      channel: 'marketplace:demo',
    });
  });

  it('refuses incomplete cross evidence rather than silently weakening provenance', () => {
    const pair = generateKeyPairSync('ed25519');
    expect(() => createMarketplaceArtifactAttestation({
      envelope,
      privateKey: pair.privateKey,
      materials: materials().filter(item => item.name !== 'receipt'),
      expiresAt: '2026-09-16T12:00:00.000Z',
      builder: { id: 'aiwg-marketplace', version: '1' },
    })).toThrow(/requires 'receipt'/);
  });

  it('detects unavailable and unlocked required dependencies recursively', async () => {
    const unlocked = structuredClone(envelope);
    unlocked.package.dependencies = [{ identity: 'acme/base', version: '2.0.0' }];
    const missingLock = await verifyMarketplaceDependencyClosure({
      root: unlocked,
      packages: new Map(),
      verify: async () => true,
      required: true,
    });
    expect(missingLock.errors).toEqual(["required dependency 'acme/base' has no immutable lockId"]);

    const unavailable = structuredClone(envelope);
    unavailable.package.dependencies = [{
      identity: 'acme/base', version: '2.0.0', lockId: `sha256:${'a'.repeat(64)}`,
    }];
    const missing = await verifyMarketplaceDependencyClosure({
      root: unavailable,
      packages: new Map(),
      verify: async () => true,
      required: true,
    });
    expect(missing.errors[0]).toMatch(/unavailable/);
  });
});
