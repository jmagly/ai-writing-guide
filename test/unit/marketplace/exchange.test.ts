import { execFileSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  exportPortablePackage,
  findIndexedPackage,
  importPortablePackage,
  publishLocalPackage,
  recordInstalledPackage,
  registerCatalog,
  removeCatalog,
  searchCatalogs,
  signCatalog,
  verifyIndexedPackage,
} from '../../../src/marketplace/exchange.js';
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
import type {
  MarketplaceCatalog,
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
