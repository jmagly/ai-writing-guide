import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, sign } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  exportPortablePackage,
  findIndexedPackage,
  importPortablePackage,
  marketplacePortableBindingMaterials,
  publishLocalPackage,
  recordInstalledPackage,
  registerCatalog,
  removeCatalog,
  searchCatalogs,
  signCatalog,
  verifyIndexedPackage,
} from '../../../src/marketplace/exchange.js';
import {
  createMarketplaceArtifactAttestation,
  verifyMarketplaceEvidence,
  type MarketplaceAttestationMaterial,
} from '../../../src/marketplace/artifact-attestation.js';
import {
  buildFortemiEnvelopeShard,
  canonicalJson,
  createOperationReceipt,
  createPackageLock,
  createProvenanceEnvelope,
  sha256,
  signProvenanceEnvelope,
  signingKeyId,
} from '../../../src/marketplace/provenance.js';
import {
  ARTIFACT_TRUST_ROOT_MEDIA_TYPE,
  ARTIFACT_TRUST_ROOT_SCHEMA_VERSION,
  ARTIFACT_TRUST_STATE_SCHEMA_VERSION,
  sha256 as artifactSha256,
  trustRootSigningBytes,
  type ArtifactTrustRoot,
  type ArtifactTrustState,
} from '../../../src/security/artifact-trust.js';
import type {
  MarketplaceCatalog,
  MarketplacePortableBundleV2,
  MarketplaceReadablePortableBundle,
  MarketplaceProvenanceEnvelope,
  MarketplaceTrustStore,
} from '../../../src/marketplace/provenance-types.js';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function createKey(publisher: string) {
  const pair = generateKeyPairSync('ed25519');
  const privatePem = pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
  const publicBase64 = (pair.publicKey.export({ format: 'der', type: 'spki' }) as Buffer).toString('base64');
  const keyId = signingKeyId(pair.publicKey);
  return {
    privatePem,
    publicBase64,
    keyId,
    trusted: {
      keyId,
      publicKey: publicBase64,
      publisher,
      trustRoot: true,
      validFrom: '2026-01-01T00:00:00.000Z',
    },
  };
}

function crossAssetTrust(
  releaseKey: ReturnType<typeof generateKeyPairSync>,
  mode: 'dual-required' | 'cross-asset-required',
  options: { migrationGate?: boolean; revokePublisher?: boolean } = {},
): { rootBytes: Buffer; state: ArtifactTrustState } {
  const rootKey = generateKeyPairSync('ed25519');
  const releasePublicKey = releaseKey.publicKey.export({ format: 'pem', type: 'spki' }).toString();
  const rootPublicKey = rootKey.publicKey.export({ format: 'pem', type: 'spki' }).toString();
  const root: ArtifactTrustRoot = {
    mediaType: ARTIFACT_TRUST_ROOT_MEDIA_TYPE,
    signed: {
      schemaVersion: ARTIFACT_TRUST_ROOT_SCHEMA_VERSION,
      version: 1,
      issuedAt: '2026-08-01T00:00:00.000Z',
      expiresAt: '2027-08-01T00:00:00.000Z',
      identities: [
        { id: 'root-1', independenceGroup: 'offline', kind: 'public-key', algorithm: 'ed25519', publicKey: rootPublicKey },
        { id: 'acme-cross', independenceGroup: 'publisher', kind: 'public-key', algorithm: 'ed25519', publicKey: releasePublicKey },
      ],
      sigstoreProfiles: [],
      root: { keyIds: ['root-1'], threshold: 1, scope: { assetTypes: ['*'], namespaces: ['*'], channels: ['*'] } },
      delegations: [{
        id: 'marketplace', parent: 'root', keyIds: ['acme-cross'], threshold: 1,
        scope: { assetTypes: ['marketplace-envelope'], namespaces: ['acme'], channels: ['*'] },
      }],
      revocations: options.revokePublisher ? [{
        identityId: 'acme-cross',
        effectiveAt: '2026-08-15T00:00:00.000Z',
        scope: { assetTypes: ['marketplace-envelope'], namespaces: ['acme'], channels: ['marketplace:*'] },
        reason: 'fixture compromise',
      }] : [],
      policy: {
        name: `marketplace-${mode}`,
        requireMaterialDigests: true,
        maxFreezeSeconds: 86400,
        allowPolicyExempt: [],
        marketplace: {
          evidenceMode: mode,
          legacySignatureMigrationGate: options.migrationGate ?? false,
          recursiveDependencies: 'required',
        },
      },
    },
    signatures: [],
  };
  root.signatures = [{ identityId: 'root-1', sig: sign(null, trustRootSigningBytes(root), rootKey.privateKey).toString('base64') }];
  const rootBytes = Buffer.from(`${JSON.stringify(root)}\n`);
  return {
    rootBytes,
    state: {
      schemaVersion: ARTIFACT_TRUST_STATE_SCHEMA_VERSION,
      rootVersion: 1,
      rootSha256: artifactSha256(rootBytes),
      trustedTime: '2026-08-01T00:00:00.000Z',
      channels: {},
    },
  };
}

describe('marketplace exchange', () => {
  let root: string;
  let repo: string;
  let configA: string;
  let configB: string;
  let envelope: MarketplaceProvenanceEnvelope;
  let trust: MarketplaceTrustStore;
  let key: ReturnType<typeof createKey>;

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-marketplace-exchange-'));
    repo = path.join(root, 'repo');
    configA = path.join(root, 'config-a');
    configB = path.join(root, 'config-b');
    fs.mkdirSync(repo);
    git(repo, ['init', '--quiet']);
    git(repo, ['config', 'user.name', 'AIWG Test']);
    git(repo, ['config', 'user.email', 'aiwg@example.invalid']);
    git(repo, ['remote', 'add', 'origin', 'https://git.example.invalid/acme/portable.git']);
    fs.writeFileSync(path.join(repo, 'manifest.json'), `${JSON.stringify({
      id: 'portable',
      type: 'extension',
      name: 'Portable package',
      version: '1.0.0',
      description: 'Portable package fixture',
      manifestVersion: '1',
      platforms: { claude: 'full', codex: 'full' },
      keywords: ['portable'],
      deployment: { pathTemplate: '{provider}/extensions/portable' },
      extensionConfig: {},
      author: 'acme',
      license: 'Apache-2.0',
    }, null, 2)}\n`);
    fs.mkdirSync(path.join(repo, 'skills', 'portable'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'skills', 'portable', 'SKILL.md'), '# Portable\n');
    git(repo, ['add', '.']);
    git(repo, ['commit', '--quiet', '-m', 'portable fixture']);
    envelope = await createProvenanceEnvelope({
      checkoutPath: repo,
      artifactPath: repo,
      manifest: JSON.parse(fs.readFileSync(path.join(repo, 'manifest.json'), 'utf8')),
      requestedRef: 'v1.0.0',
      publisher: 'acme',
      now: new Date('2026-08-03T12:00:00.000Z'),
    });
    key = createKey('acme');
    envelope = signProvenanceEnvelope(envelope, key.privatePem, {
      keyId: key.keyId,
      signedAt: '2026-08-03T12:01:00.000Z',
    });
    trust = { schemaVersion: 'aiwg.marketplace.trust-store.v1', keys: [key.trusted] };
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  async function seedInstalled(): Promise<void> {
    const lock = createPackageLock(envelope, envelope.publication.publishedAt);
    const fortemi = await buildFortemiEnvelopeShard(envelope);
    const receipt = createOperationReceipt({
      operation: 'install',
      lock,
      actor: 'fixture',
      verificationStatus: 'verified',
      conformance: fortemi.conformance,
      occurredAt: '2026-08-03T12:02:00.000Z',
    });
    await recordInstalledPackage({
      configDir: configA,
      envelope,
      lock,
      receipt,
      cachePath: repo,
      artifactPath: repo,
      verificationStatus: 'verified',
      fortemiShard: fortemi.archive,
    });
  }

  function exactGitTreeBytes(): Buffer {
    return execFileSync('git', ['ls-tree', '-r', '--full-tree', '-z', 'HEAD'], {
      cwd: repo,
      encoding: 'buffer',
    });
  }

  async function crossMaterials(): Promise<MarketplaceAttestationMaterial[]> {
    const lock = createPackageLock(envelope, envelope.publication.publishedAt);
    const fortemi = await buildFortemiEnvelopeShard(envelope);
    const receipt = createOperationReceipt({
      operation: 'install',
      lock,
      actor: 'fixture',
      verificationStatus: 'verified',
      conformance: fortemi.conformance,
      occurredAt: '2026-08-03T12:02:00.000Z',
    });
    return marketplacePortableBindingMaterials({
      envelope,
      lock,
      receipts: [receipt],
      fortemiShard: fortemi.archive,
      gitTreeBytes: exactGitTreeBytes(),
      files: envelope.package.inventory.map(item => ({
        ...item,
        contentBase64: fs.readFileSync(path.join(repo, ...item.path.split('/'))).toString('base64'),
      })),
    });
  }

  async function portableV2(
    target: MarketplaceProvenanceEnvelope,
    crossKey: ReturnType<typeof generateKeyPairSync>,
    dependencies: MarketplaceReadablePortableBundle[] = [],
  ): Promise<MarketplacePortableBundleV2> {
    const lock = createPackageLock(target, target.publication.publishedAt);
    const fortemi = await buildFortemiEnvelopeShard(target);
    const receipt = createOperationReceipt({
      operation: 'export', lock, actor: 'fixture', verificationStatus: 'verified',
      conformance: fortemi.conformance, occurredAt: '2026-08-03T12:02:00.000Z',
    });
    const files = target.package.inventory.map(item => ({
      ...item,
      contentBase64: fs.readFileSync(path.join(repo, ...item.path.split('/'))).toString('base64'),
    }));
    const materials = marketplacePortableBindingMaterials({
      envelope: target,
      lock,
      receipts: [receipt],
      fortemiShard: fortemi.archive,
      gitTreeBytes: exactGitTreeBytes(),
      files,
    });
    const evidence = createMarketplaceArtifactAttestation({
      envelope: target,
      privateKey: crossKey.privateKey,
      materials,
      issuedAt: '2026-08-03T12:01:00.000Z',
      expiresAt: '2026-09-03T12:01:00.000Z',
      builder: { id: 'aiwg-marketplace', version: '2' },
    });
    return {
      schemaVersion: 'aiwg.marketplace.portable-bundle.v2',
      envelope: target,
      lock,
      receipts: [receipt],
      fortemiShardBase64: Buffer.from(fortemi.archive).toString('base64'),
      files,
      crossAsset: {
        attestation: evidence.attestation,
        materials: materials.map(material => ({
          name: material.name, uri: material.uri, mediaType: material.mediaType,
          bytes: material.bytes.byteLength, sha256: artifactSha256(material.bytes),
          contentBase64: Buffer.from(material.bytes).toString('base64'),
        })),
      },
      dependencies,
    };
  }

  it('exports and reproduces one immutable package offline with identical lock and receipts', async () => {
    await seedInstalled();
    const output = path.join(root, 'portable.aiwg-package.json');
    const exported = await exportPortablePackage({ configDir: configA, query: 'acme/portable', output, actor: 'exporter' });
    expect(exported.receipt.operation).toBe('export');
    expect(exported.bundle.receipts.map((receipt) => receipt.operation)).toEqual(['install', 'export']);
    expect(exported.bundle.files.map((file) => file.path)).toContain('skills/portable/SKILL.md');

    // Offline import: the original Git repository is no longer available.
    fs.rmSync(repo, { recursive: true, force: true });
    const imported = await importPortablePackage({
      configDir: configB,
      input: output,
      verify: true,
      trustStore: trust,
      actor: 'importer',
    });
    expect(imported.receipt.operation).toBe('import');
    expect(imported.verification.status).toBe('verified');
    expect(imported.entry.lock.lockId).toBe(exported.bundle.lock.lockId);
    expect(fs.readFileSync(path.join(imported.entry.artifactPath, 'skills', 'portable', 'SKILL.md'), 'utf8')).toBe('# Portable\n');

    const verified = await verifyIndexedPackage({
      configDir: configB,
      query: imported.entry.lock.lockId,
      trustStore: trust,
      requireSignature: true,
      actor: 'verifier',
    });
    expect(verified.receipt.operation).toBe('verify');
    expect(verified.verification.ok).toBe(true);
  });

  it('fails before persistence on archive divergence or lossy/unknown bundle fields', async () => {
    await seedInstalled();
    const output = path.join(root, 'portable.aiwg-package.json');
    await exportPortablePackage({ configDir: configA, query: 'acme/portable', output });
    const original = JSON.parse(fs.readFileSync(output, 'utf8'));

    const altered = structuredClone(original);
    altered.files[0].contentBase64 = Buffer.from('changed').toString('base64');
    const alteredPath = path.join(root, 'altered.json');
    fs.writeFileSync(alteredPath, JSON.stringify(altered));
    await expect(importPortablePackage({ configDir: configB, input: alteredPath, trustStore: trust })).rejects.toThrow(/digest mismatch/);
    expect(await findIndexedPackage('acme/portable', { configDir: configB })).toBeUndefined();

    const unknown = { ...original, futureRequiredField: true };
    const unknownPath = path.join(root, 'unknown.json');
    fs.writeFileSync(unknownPath, JSON.stringify(unknown));
    await expect(importPortablePackage({ configDir: configB, input: unknownPath, trustStore: trust })).rejects.toThrow(/unknown required field/);
  });

  it.each(['dual-required', 'cross-asset-required'] as const)('round-trips strict v2 %s evidence offline and indexes its sidecars', async (mode) => {
    await seedInstalled();
    const crossKey = generateKeyPairSync('ed25519');
    const materials = await crossMaterials();
    const gitTreeMaterial = materials.find(material => material.name === 'git-tree');
    expect(gitTreeMaterial?.mediaType).toBe('application/vnd.aiwg.git-ls-tree.v1');
    expect(Buffer.from(gitTreeMaterial!.bytes)).toEqual(exactGitTreeBytes());
    const evidence = createMarketplaceArtifactAttestation({
      envelope,
      privateKey: crossKey.privateKey,
      materials,
      issuedAt: '2026-08-03T12:01:00.000Z',
      expiresAt: '2026-09-03T12:01:00.000Z',
      builder: { id: 'aiwg-marketplace', version: '2' },
    });
    const artifactTrust = { ...crossAssetTrust(crossKey, mode), now: '2026-08-16T12:00:00.000Z' };
    const dualTrust: MarketplaceTrustStore = {
      ...trust,
      keys: [{ ...trust.keys[0]!, artifactIdentityId: 'acme-cross' }],
    };
    const output = path.join(root, `${mode}.aiwg-package.json`);
    const exported = await exportPortablePackage({
      configDir: configA,
      query: 'acme/portable',
      output,
      crossAsset: evidence,
      artifactTrust,
      trustStore: dualTrust,
    });
    expect(exported.bundle.schemaVersion).toBe('aiwg.marketplace.portable-bundle.v2');
    expect(Object.values(exported.nextArtifactTrustState?.channels ?? {})).toEqual([
      expect.objectContaining({ subject: 'aiwg-marketplace-envelope.json', sequence: envelope.publication.sequence }),
    ]);

    const imported = await importPortablePackage({
      configDir: configB,
      input: output,
      verify: true,
      trustStore: dualTrust,
      artifactTrust,
    });
    expect(imported.verification.status).toBe('verified');
    expect(imported.entry.attestationPath && fs.existsSync(imported.entry.attestationPath)).toBe(true);
    expect(Object.keys(imported.entry.materialPaths ?? {})).toHaveLength(7);
    expect(imported.entry.dependencyLockIds).toEqual([]);
    expect(Object.values(imported.nextArtifactTrustState?.channels ?? {})).toHaveLength(1);
  });

  it('keeps legacy signatures mandatory until the signed migration gate is enabled', async () => {
    const unsigned = { ...envelope, signatures: [] };
    const crossKey = generateKeyPairSync('ed25519');
    const evidence = createMarketplaceArtifactAttestation({
      envelope: unsigned,
      privateKey: crossKey.privateKey,
      materials: await crossMaterials(),
      issuedAt: '2026-08-03T12:01:00.000Z',
      expiresAt: '2026-09-03T12:01:00.000Z',
      builder: { id: 'aiwg-marketplace', version: '2' },
    });
    const now = '2026-08-16T12:00:00.000Z';
    const beforeGate = crossAssetTrust(crossKey, 'cross-asset-required');
    const blocked = await verifyMarketplaceEvidence({
      envelope: unsigned,
      artifact: { evidence, ...beforeGate, now, offline: true },
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.errors.join('\n')).toMatch(/legacy publisher signature remains mandatory/);

    const afterGate = crossAssetTrust(crossKey, 'cross-asset-required', { migrationGate: true });
    const migrated = await verifyMarketplaceEvidence({
      envelope: unsigned,
      artifact: { evidence, ...afterGate, now, offline: true },
    });
    expect(migrated.ok).toBe(true);
    expect(migrated.crossAsset?.status).toBe('verified');
  });

  it('reports aligned legacy and cross-asset revocation failures for one publisher authority', async () => {
    const crossKey = generateKeyPairSync('ed25519');
    const evidence = createMarketplaceArtifactAttestation({
      envelope,
      privateKey: crossKey.privateKey,
      materials: await crossMaterials(),
      issuedAt: '2026-08-03T12:01:00.000Z',
      expiresAt: '2026-09-03T12:01:00.000Z',
      builder: { id: 'aiwg-marketplace', version: '2' },
    });
    const artifactTrust = crossAssetTrust(crossKey, 'dual-required', { revokePublisher: true });
    const revokedTrust: MarketplaceTrustStore = {
      ...trust,
      keys: [{
        ...trust.keys[0]!,
        artifactIdentityId: 'acme-cross',
        revokedAt: '2026-08-15T00:00:00.000Z',
        revocationReason: 'fixture compromise',
      }],
    };
    const result = await verifyMarketplaceEvidence({
      envelope,
      trustStore: revokedTrust,
      artifact: { evidence, ...artifactTrust, now: '2026-08-16T12:00:00.000Z', offline: true },
    });
    expect(result.ok).toBe(false);
    expect(result.marketplace.errors.join('\n')).toMatch(/revoked/i);
    expect(result.crossAsset?.status).toBe('revoked');
  });

  it('rejects a rotated legacy key that is mapped to a different cross-asset authority', async () => {
    const crossKey = generateKeyPairSync('ed25519');
    const evidence = createMarketplaceArtifactAttestation({
      envelope,
      privateKey: crossKey.privateKey,
      materials: await crossMaterials(),
      issuedAt: '2026-08-03T12:01:00.000Z',
      expiresAt: '2026-09-03T12:01:00.000Z',
      builder: { id: 'aiwg-marketplace', version: '2' },
    });
    const artifactTrust = crossAssetTrust(crossKey, 'dual-required');
    const mismappedTrust: MarketplaceTrustStore = {
      ...trust,
      keys: [{ ...trust.keys[0]!, artifactIdentityId: 'retired-cross-authority' }],
    };
    const result = await verifyMarketplaceEvidence({
      envelope,
      trustStore: mismappedTrust,
      artifact: { evidence, ...artifactTrust, now: '2026-08-16T12:00:00.000Z', offline: true },
    });
    expect(result.marketplace.status).toBe('verified');
    expect(result.crossAsset?.status).toBe('verified');
    expect(result.errors).toContain('trust-parity: marketplace and cross-asset verification resolved different publisher authorities');
  });

  it('rejects altered v2 material and missing scoped trust before persistence', async () => {
    await seedInstalled();
    const crossKey = generateKeyPairSync('ed25519');
    const materials = await crossMaterials();
    const semanticallyWrong = materials.map(material => ({ ...material }));
    semanticallyWrong[0] = { ...semanticallyWrong[0]!, bytes: Buffer.from('not-the-lock\n') };
    const wrongEvidence = createMarketplaceArtifactAttestation({
      envelope,
      privateKey: crossKey.privateKey,
      materials: semanticallyWrong,
      issuedAt: '2026-08-03T12:01:00.000Z',
      expiresAt: '2026-09-03T12:01:00.000Z',
      builder: { id: 'aiwg-marketplace', version: '2' },
    });
    const evidence = createMarketplaceArtifactAttestation({
      envelope,
      privateKey: crossKey.privateKey,
      materials,
      issuedAt: '2026-08-03T12:01:00.000Z',
      expiresAt: '2026-09-03T12:01:00.000Z',
      builder: { id: 'aiwg-marketplace', version: '2' },
    });
    const artifactTrust = { ...crossAssetTrust(crossKey, 'dual-required'), now: '2026-08-16T12:00:00.000Z' };
    const dualTrust: MarketplaceTrustStore = { ...trust, keys: [{ ...trust.keys[0]!, artifactIdentityId: 'acme-cross' }] };
    const output = path.join(root, 'dual.aiwg-package.json');
    await expect(exportPortablePackage({
      configDir: configA, query: 'acme/portable', output, crossAsset: wrongEvidence, artifactTrust, trustStore: dualTrust,
    })).rejects.toThrow(/'lock' material does not bind/);
    expect(fs.existsSync(output)).toBe(false);
    await exportPortablePackage({ configDir: configA, query: 'acme/portable', output, crossAsset: evidence, artifactTrust, trustStore: dualTrust });

    await expect(importPortablePackage({ configDir: configB, input: output, trustStore: dualTrust }))
      .rejects.toThrow(/requires scoped cross-asset trust/);
    const altered = JSON.parse(fs.readFileSync(output, 'utf8'));
    altered.crossAsset.materials[0].contentBase64 = Buffer.from('substituted').toString('base64');
    const alteredPath = path.join(root, 'altered-v2.json');
    fs.writeFileSync(alteredPath, JSON.stringify(altered));
    await expect(importPortablePackage({ configDir: configB, input: alteredPath, trustStore: dualTrust, artifactTrust }))
      .rejects.toThrow(/material digest mismatch/);

    const duplicate = JSON.parse(fs.readFileSync(output, 'utf8'));
    duplicate.crossAsset.materials[1].name = duplicate.crossAsset.materials[0].name;
    const duplicatePath = path.join(root, 'duplicate-material-name.json');
    fs.writeFileSync(duplicatePath, JSON.stringify(duplicate));
    await expect(importPortablePackage({ configDir: configB, input: duplicatePath, trustStore: dualTrust, artifactTrust }))
      .rejects.toThrow(/material name .* is duplicated/);
    expect(await findIndexedPackage('acme/portable', { configDir: configB })).toBeUndefined();
  });

  it('rejects an unavailable required subdependency before persisting a v2 root', async () => {
    const dependent = structuredClone(envelope);
    dependent.signatures = [];
    dependent.package.dependencies = [{
      identity: 'acme/base',
      version: '2.0.0',
      lockId: `sha256:${'a'.repeat(64)}`,
    }];
    envelope = signProvenanceEnvelope(dependent, key.privatePem, {
      keyId: key.keyId,
      signedAt: '2026-08-03T12:01:00.000Z',
    });
    const dependentLock = createPackageLock(envelope, envelope.publication.publishedAt);
    const dependentShard = await buildFortemiEnvelopeShard(envelope);
    const dependentReceipt = createOperationReceipt({
      operation: 'export',
      lock: dependentLock,
      actor: 'fixture',
      verificationStatus: 'verified',
      conformance: dependentShard.conformance,
      occurredAt: '2026-08-03T12:02:00.000Z',
    });
    const portableFiles = envelope.package.inventory.map(item => ({
      ...item,
      contentBase64: fs.readFileSync(path.join(repo, ...item.path.split('/'))).toString('base64'),
    }));
    const crossKey = generateKeyPairSync('ed25519');
    const materials = marketplacePortableBindingMaterials({
      envelope,
      lock: dependentLock,
      receipts: [dependentReceipt],
      fortemiShard: dependentShard.archive,
      gitTreeBytes: exactGitTreeBytes(),
      files: portableFiles,
    });
    const evidence = createMarketplaceArtifactAttestation({
      envelope,
      privateKey: crossKey.privateKey,
      materials,
      issuedAt: '2026-08-03T12:01:00.000Z',
      expiresAt: '2026-09-03T12:01:00.000Z',
      builder: { id: 'aiwg-marketplace', version: '2' },
    });
    const portable: MarketplacePortableBundleV2 = {
      schemaVersion: 'aiwg.marketplace.portable-bundle.v2',
      envelope,
      lock: dependentLock,
      receipts: [dependentReceipt],
      fortemiShardBase64: Buffer.from(dependentShard.archive).toString('base64'),
      files: portableFiles,
      crossAsset: {
        attestation: evidence.attestation,
        materials: materials.map(material => ({
          name: material.name,
          uri: material.uri,
          ...(material.mediaType ? { mediaType: material.mediaType } : {}),
          bytes: material.bytes.byteLength,
          sha256: artifactSha256(material.bytes),
          contentBase64: Buffer.from(material.bytes).toString('base64'),
        })),
      },
      dependencies: [],
    };
    const input = path.join(root, 'dependent-v2.json');
    fs.writeFileSync(input, JSON.stringify(portable));
    const artifactTrust = { ...crossAssetTrust(crossKey, 'dual-required'), now: '2026-08-16T12:00:00.000Z' };
    const dualTrust: MarketplaceTrustStore = { ...trust, keys: [{ ...trust.keys[0]!, artifactIdentityId: 'acme-cross' }] };

    await expect(importPortablePackage({ configDir: configB, input, trustStore: dualTrust, artifactTrust }))
      .rejects.toThrow(/Required dependency 'acme\/base' is unavailable/);
    expect(await findIndexedPackage('acme/portable', { configDir: configB })).toBeUndefined();
  });

  it('verifies and advances freshness state for every recursively imported member', async () => {
    const crossKey = generateKeyPairSync('ed25519');
    const childUnsigned = structuredClone(envelope);
    childUnsigned.signatures = [];
    childUnsigned.package.name = 'base';
    childUnsigned.package.dependencies = [];
    const childEnvelope = signProvenanceEnvelope(childUnsigned, key.privatePem, { keyId: key.keyId, signedAt: '2026-08-03T12:01:00.000Z' });
    const child = await portableV2(childEnvelope, crossKey);

    const rootUnsigned = structuredClone(envelope);
    rootUnsigned.signatures = [];
    rootUnsigned.package.dependencies = [{ identity: child.lock.identity, version: child.lock.version, lockId: child.lock.lockId }];
    const rootEnvelope = signProvenanceEnvelope(rootUnsigned, key.privatePem, { keyId: key.keyId, signedAt: '2026-08-03T12:01:00.000Z' });
    const rootBundle = await portableV2(rootEnvelope, crossKey, [child]);
    const input = path.join(root, 'recursive-v2.json');
    fs.writeFileSync(input, JSON.stringify(rootBundle));
    const artifactTrust = { ...crossAssetTrust(crossKey, 'dual-required'), now: '2026-08-16T12:00:00.000Z' };
    const dualTrust: MarketplaceTrustStore = { ...trust, keys: [{ ...trust.keys[0]!, artifactIdentityId: 'acme-cross' }] };

    const imported = await importPortablePackage({ configDir: configB, input, trustStore: dualTrust, artifactTrust });
    expect(Object.values(imported.nextArtifactTrustState?.channels ?? {})).toHaveLength(2);
    expect(imported.entry.dependencyLockIds).toEqual([child.lock.lockId]);
    expect((await findIndexedPackage(child.lock.lockId, { configDir: configB }))?.attestationPath).toBeTruthy();
  });

  it('indexes one immutable package from two independent signed catalogs without transferring trust authority', async () => {
    await seedInstalled();
    const lock = createPackageLock(envelope, envelope.publication.publishedAt);
    const catalogKeys = [createKey('catalog-one'), createKey('catalog-two')];
    const catalogTrust: MarketplaceTrustStore = {
      schemaVersion: 'aiwg.marketplace.trust-store.v1',
      keys: catalogKeys.map((entry) => entry.trusted),
    };
    for (let index = 0; index < 2; index++) {
      const catalogDir = path.join(root, `catalog-${index + 1}`);
      fs.mkdirSync(path.join(catalogDir, 'envelopes'), { recursive: true });
      fs.writeFileSync(path.join(catalogDir, 'envelopes', 'portable.json'), `${canonicalJson(envelope)}\n`);
      const unsigned: MarketplaceCatalog = {
        schemaVersion: 'aiwg.marketplace.catalog.v1',
        catalogId: `catalog-${index + 1}`,
        sequence: 1,
        generatedAt: '2026-08-03T13:00:00.000Z',
        entries: [{
          identity: lock.identity,
          version: lock.version,
          description: envelope.package.description,
          license: envelope.package.license,
          canonicalRemote: lock.canonicalRemote,
          requestedRef: lock.requestedRef,
          resolvedCommit: lock.resolvedCommit,
          envelopePath: 'envelopes/portable.json',
          envelopeSha256: sha256(canonicalJson(envelope)),
          lockId: lock.lockId,
          publisher: envelope.publisher.id,
          provenanceCompleteness: 100,
          verificationStatus: 'verified',
        }],
        signatures: [],
      };
      const signed = signCatalog(unsigned, catalogKeys[index]!.privatePem, {
        keyId: catalogKeys[index]!.keyId,
        signedAt: '2026-08-03T13:01:00.000Z',
      });
      const catalogPath = path.join(catalogDir, 'aiwg-marketplace-catalog.json');
      fs.writeFileSync(catalogPath, `${canonicalJson(signed)}\n`);
      await registerCatalog({
        configDir: configA,
        catalogPath,
        source: `https://git.example.invalid/catalog-${index + 1}.git`,
        requestedRef: 'main',
        resolvedCommit: String(index + 1).repeat(40),
        cachePath: catalogDir,
        trustStore: catalogTrust,
      });
    }

    const observations = await searchCatalogs('portable', { configDir: configA });
    expect(observations).toHaveLength(2);
    expect(new Set(observations.map((entry) => entry.lockId))).toEqual(new Set([lock.lockId]));
    expect(observations.every((entry) => entry.observation === 'catalog-observation-not-endorsement')).toBe(true);

    expect(await removeCatalog('catalog-1', { configDir: configA })).toBe(true);
    expect(await searchCatalogs('portable', { configDir: configA })).toHaveLength(1);
    expect((await findIndexedPackage(lock.lockId, { configDir: configA }))?.lock.lockId).toBe(lock.lockId);
  });

  it('emits a signed publication receipt and exact full-v1 shard from a local Git package', async () => {
    const privateKeyPath = path.join(root, 'publisher-private.pem');
    fs.writeFileSync(privateKeyPath, key.privatePem, { mode: 0o600 });
    const outputDir = path.join(repo, '.aiwg', 'marketplace');
    const published = await publishLocalPackage({
      sourceDir: repo,
      outputDir,
      privateKeyPath,
      publisher: 'acme',
      keyId: key.keyId,
      requestedRef: 'HEAD',
      sequence: 3,
    });
    expect(published.receipt.operation).toBe('publish');
    expect(published.receipt.conformance).toMatchObject({ profile: '2.0.0/full-v1', lossless: true });
    expect(published.envelope.signatures).toHaveLength(1);
    expect(fs.existsSync(published.shardPath)).toBe(true);
  });

  it('uses the catalog digest as an observation while package signatures remain publisher-owned', async () => {
    const lock = createPackageLock(envelope, envelope.publication.publishedAt);
    expect(lock.envelopeSha256).toBe(sha256(canonicalJson(envelope)));
    expect(envelope.signatures[0]?.keyId).toBe(key.keyId);
  });
});
