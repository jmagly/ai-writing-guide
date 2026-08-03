import { execFileSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildFortemiEnvelopeShard,
  canonicalJson,
  createPackageLock,
  createProvenanceEnvelope,
  envelopeToFortemiIndex,
  inventoryDirectory,
  keyDelegationStatement,
  sha256,
  signKeyDelegation,
  signProvenanceEnvelope,
  signingKeyId,
  validateProvenanceEnvelope,
  verifyProvenanceEnvelope,
} from '../../../src/marketplace/provenance.js';
import type {
  MarketplaceProvenanceEnvelope,
  MarketplaceTrustedKey,
  MarketplaceTrustStore,
} from '../../../src/marketplace/provenance-types.js';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function keyPair() {
  const pair = generateKeyPairSync('ed25519');
  return {
    privatePem: pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicPem: pair.publicKey.export({ format: 'pem', type: 'spki' }).toString(),
    publicBase64: (pair.publicKey.export({ format: 'der', type: 'spki' }) as Buffer).toString('base64'),
    keyId: signingKeyId(pair.publicKey),
  };
}

describe('Git-native marketplace provenance', () => {
  let root: string;
  let envelope: MarketplaceProvenanceEnvelope;

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-marketplace-provenance-'));
    git(root, ['init', '--quiet']);
    git(root, ['config', 'user.name', 'AIWG Test']);
    git(root, ['config', 'user.email', 'aiwg@example.invalid']);
    git(root, ['remote', 'add', 'origin', 'https://git.example.invalid/acme/demo.git']);
    fs.writeFileSync(path.join(root, 'manifest.json'), `${JSON.stringify({
      id: 'demo',
      name: 'Demo package',
      type: 'addon',
      version: '1.2.3',
      description: 'Signed demo',
      author: 'acme',
      license: 'MIT',
      manifestVersion: '1',
      platforms: { claude: 'native', codex: 'native' },
      dependencies: { required: ['acme/base@2.0.0'] },
    }, null, 2)}\n`);
    fs.mkdirSync(path.join(root, 'skills', 'demo'), { recursive: true });
    fs.writeFileSync(path.join(root, 'skills', 'demo', 'SKILL.md'), '# Demo\n');
    git(root, ['add', '.']);
    git(root, ['commit', '--quiet', '-m', 'fixture']);
    envelope = await createProvenanceEnvelope({
      checkoutPath: root,
      artifactPath: root,
      manifest: JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')),
      requestedRef: 'main',
      publisher: 'acme',
      now: new Date('2026-08-03T12:00:00.000Z'),
    });
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('binds immutable Git, package, wrapper, provider, inventory, and W3C PROV identities', async () => {
    expect(envelope.schemaVersion).toBe('aiwg.marketplace.provenance-envelope.v1');
    expect(envelope.package).toMatchObject({ namespace: 'acme', name: 'demo', version: '1.2.3', license: 'MIT' });
    expect(envelope.package.providers.map((entry) => entry.provider)).toEqual(['claude', 'codex']);
    expect(envelope.package.inventory).toEqual(await inventoryDirectory(root));
    expect(envelope.source.resolvedCommit).toBe(git(root, ['rev-parse', 'HEAD']));
    expect(envelope.source.gitTreeObject).toBe(git(root, ['rev-parse', 'HEAD^{tree}']));
    expect(envelope.provenance.standard).toBe('W3C-PROV');
    expect(envelope.fortemi).toEqual({
      schemaVersion: '2.0.0',
      profile: 'full-v1',
      sourceSchemaVersion: 'aiwg.fortemi.index.export.v2',
    });
  });

  it('gives direct and catalog coordinates the same immutable lock identity', () => {
    const direct = createPackageLock(envelope, '2026-08-03T12:00:00.000Z');
    const catalog = createPackageLock({
      ...envelope,
      source: { ...envelope.source, requestedRef: envelope.source.resolvedCommit },
    }, '2026-08-03T13:00:00.000Z');
    expect(catalog.lockId).toBe(direct.lockId);
    expect(catalog.requestedRef).not.toBe(direct.requestedRef);
  });

  it('verifies an Ed25519 publisher root and rejects altered package bytes', async () => {
    const key = keyPair();
    const signed = signProvenanceEnvelope(envelope, key.privatePem, {
      keyId: key.keyId,
      signedAt: '2026-08-03T12:01:00.000Z',
    });
    const trust: MarketplaceTrustStore = {
      schemaVersion: 'aiwg.marketplace.trust-store.v1',
      keys: [{
        keyId: key.keyId,
        publicKey: key.publicBase64,
        publisher: 'acme',
        trustRoot: true,
        validFrom: '2026-01-01T00:00:00.000Z',
      }],
    };
    const verified = await verifyProvenanceEnvelope({
      envelope: signed,
      contentRoot: root,
      checkoutPath: root,
      trustStore: trust,
      policy: { requireSignature: true, allowIntegrityOnly: false },
      at: new Date('2026-08-03T12:02:00.000Z'),
    });
    expect(verified.ok).toBe(true);
    expect(verified.status).toBe('verified');

    fs.writeFileSync(path.join(root, 'skills', 'demo', 'SKILL.md'), '# Altered\n');
    const altered = await verifyProvenanceEnvelope({ envelope: signed, contentRoot: root, trustStore: trust });
    expect(altered.ok).toBe(false);
    expect(altered.errors.join('\n')).toMatch(/artifact-digest|file:skills\/demo\/SKILL\.md/);
  });

  it('supports delegated key rotation and fail-closed revocation', async () => {
    const rootKey = keyPair();
    const rotated = keyPair();
    const delegated: MarketplaceTrustedKey = {
      keyId: rotated.keyId,
      publicKey: rotated.publicBase64,
      publisher: 'acme',
      delegatedBy: rootKey.keyId,
      validFrom: '2026-08-01T00:00:00.000Z',
    };
    delegated.delegationSignature = signKeyDelegation(delegated, rootKey.privatePem);
    expect(keyDelegationStatement(delegated).keyId).toBe(rotated.keyId);
    const trust: MarketplaceTrustStore = {
      schemaVersion: 'aiwg.marketplace.trust-store.v1',
      keys: [{
        keyId: rootKey.keyId,
        publicKey: rootKey.publicBase64,
        publisher: 'acme',
        trustRoot: true,
        validFrom: '2026-01-01T00:00:00.000Z',
      }, delegated],
    };
    const signed = signProvenanceEnvelope(envelope, rotated.privatePem, {
      keyId: rotated.keyId,
      signedAt: '2026-08-03T12:01:00.000Z',
    });
    const valid = await verifyProvenanceEnvelope({
      envelope: signed,
      trustStore: trust,
      policy: { requireSignature: true, allowIntegrityOnly: false },
      at: new Date('2026-08-03T13:00:00.000Z'),
    });
    expect(valid.ok).toBe(true);

    delegated.revokedAt = '2026-08-03T12:30:00.000Z';
    const revoked = await verifyProvenanceEnvelope({
      envelope: signed,
      trustStore: trust,
      policy: { requireSignature: true, allowIntegrityOnly: false },
      at: new Date('2026-08-03T13:00:00.000Z'),
    });
    expect(revoked.ok).toBe(false);
    expect(revoked.errors.join('\n')).toMatch(/revoked/);
  });

  it('detects replay/rollback, moved refs, and dependency substitution', async () => {
    const lock = createPackageLock(envelope, envelope.publication.publishedAt);
    const replay = await verifyProvenanceEnvelope({
      envelope,
      policy: { minimumSequence: { 'acme/demo': 2 }, allowRollback: false },
    });
    expect(replay.errors.join('\n')).toMatch(/below trusted minimum/);

    const movedEnvelope = {
      ...envelope,
      source: { ...envelope.source, resolvedCommit: 'f'.repeat(40) },
    };
    const moved = await verifyProvenanceEnvelope({ envelope: movedEnvelope, previousLock: lock });
    expect(moved.errors.join('\n')).toMatch(/moved/);

    const dependencyEnvelope = {
      ...envelope,
      package: {
        ...envelope.package,
        dependencies: [{ identity: 'acme/base', version: '2.0.0', lockId: `sha256:${'a'.repeat(64)}` }],
      },
    };
    const substitution = await verifyProvenanceEnvelope({
      envelope: dependencyEnvelope,
      installedLocks: { 'acme/base': `sha256:${'b'.repeat(64)}` },
    });
    expect(substitution.errors.join('\n')).toMatch(/Dependency substitution/);
  });

  it('round-trips the exact envelope through Fortemi Knowledge Shard 2.0 full-v1', async () => {
    const converted = await buildFortemiEnvelopeShard(envelope);
    expect(converted.archive.byteLength).toBeGreaterThan(100);
    expect(converted.conformance).toMatchObject({
      profile: '2.0.0/full-v1',
      lossless: true,
      contractValid: true,
    });
    const index = envelopeToFortemiIndex(envelope);
    expect(index.items[0]?.type).toBe('aiwg.artifact');
    expect(index.items[0]?.text).toBe(canonicalJson(envelope));
  });

  it('fails closed on unknown required fields and invalid signatures', async () => {
    expect(() => validateProvenanceEnvelope({ ...envelope, futureRequiredField: true })).toThrow(/unknown required field/);
    const key = keyPair();
    const signed = signProvenanceEnvelope(envelope, key.privatePem, { keyId: key.keyId });
    signed.signatures[0]!.signature = Buffer.from('tampered').toString('base64');
    const result = await verifyProvenanceEnvelope({ envelope: signed });
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/Invalid signature/);
  });

  it('uses canonical hashes rather than object insertion order', () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
    expect(sha256(canonicalJson({ b: 2, a: 1 }))).toBe(sha256(canonicalJson({ a: 1, b: 2 })));
  });
});
