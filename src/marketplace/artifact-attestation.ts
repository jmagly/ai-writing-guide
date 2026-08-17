import type { KeyObject } from 'node:crypto';

import {
  createArtifactAttestation,
  serializeArtifactAttestation,
  type ArtifactAttestation,
  type ArtifactDescriptor,
} from '../security/artifact-attestation.js';
import {
  verifyArtifact,
  type ArtifactVerificationResult,
} from '../security/artifact-verifier.js';
import {
  canonicalJson as artifactCanonicalJson,
  parseTrustRoot,
  sha256 as artifactSha256,
  type ArtifactTrustRoot,
  type ArtifactTrustState,
} from '../security/artifact-trust.js';
import {
  canonicalJson,
  createPackageLock,
  verifyProvenanceEnvelope,
} from './provenance.js';
import type {
  MarketplacePackageLock,
  MarketplaceProvenanceEnvelope,
  MarketplaceTrustStore,
  MarketplaceVerificationPolicy,
  MarketplaceVerificationResult,
} from './provenance-types.js';

export const MARKETPLACE_ENVELOPE_SUBJECT = 'aiwg-marketplace-envelope.json';

export interface MarketplaceAttestationMaterial {
  name: 'lock' | 'inventory' | 'git-tree' | 'fortemi-shard' | 'receipt' | 'sbom' | 'license' | string;
  uri: string;
  mediaType?: string;
  bytes: Uint8Array;
}

export interface MarketplaceCrossAssetEvidence {
  attestation: ArtifactAttestation;
  materials: MarketplaceAttestationMaterial[];
}

export interface MarketplaceCompositeVerificationResult {
  ok: boolean;
  status: 'verified' | 'failed';
  marketplace: MarketplaceVerificationResult;
  crossAsset?: ArtifactVerificationResult;
  errors: string[];
}

export function serializeMarketplaceEnvelope(envelope: MarketplaceProvenanceEnvelope): Buffer {
  return Buffer.from(`${canonicalJson(envelope)}\n`, 'utf8');
}

export function marketplaceArtifactScope(envelope: MarketplaceProvenanceEnvelope) {
  return {
    assetType: 'marketplace-envelope',
    namespace: envelope.package.namespace,
    channel: `marketplace:${envelope.package.name}`,
  } as const;
}

function requiredMaterialNames(materials: MarketplaceAttestationMaterial[]): void {
  const names = new Set(materials.map(material => material.name));
  for (const required of ['lock', 'inventory', 'git-tree', 'fortemi-shard', 'receipt', 'sbom', 'license']) {
    if (!names.has(required)) throw new Error(`Marketplace attestation requires '${required}' material`);
  }
}

export function createMarketplaceArtifactAttestation(options: {
  envelope: MarketplaceProvenanceEnvelope;
  privateKey: string | Buffer | KeyObject;
  materials: MarketplaceAttestationMaterial[];
  publisherIdentity?: string;
  issuedAt?: string;
  expiresAt: string;
  builder: { id: string; version: string };
}): MarketplaceCrossAssetEvidence {
  requiredMaterialNames(options.materials);
  const scope = marketplaceArtifactScope(options.envelope);
  const envelopeBytes = serializeMarketplaceEnvelope(options.envelope);
  const provenanceBytes = Buffer.from(artifactCanonicalJson(options.envelope.provenance), 'utf8');
  const dependencies: ArtifactDescriptor[] = options.envelope.package.dependencies
    .filter(dependency => !dependency.optional)
    .map(dependency => {
      if (!dependency.lockId) throw new Error(`Required dependency '${dependency.identity}' has no immutable lockId`);
      return {
        name: dependency.identity,
        uri: `aiwg:marketplace-lock:${dependency.lockId}`,
        mediaType: 'application/vnd.aiwg.marketplace-lock.v1+json',
        digest: { sha256: dependency.lockId.replace(/^sha256:/, '') },
      };
    });
  const attestation = createArtifactAttestation({
    artifact: {
      name: MARKETPLACE_ENVELOPE_SUBJECT,
      bytes: envelopeBytes,
      mediaType: 'application/vnd.aiwg.marketplace-envelope.v1+json',
    },
    assetType: scope.assetType,
    publisher: {
      id: options.publisherIdentity ?? options.envelope.publisher.id,
      namespace: scope.namespace,
      role: 'marketplace-publisher',
    },
    publication: {
      version: options.envelope.package.version,
      channel: scope.channel,
      sequence: options.envelope.publication.sequence,
      sourceUri: options.envelope.source.canonicalRemote,
    },
    issuedAt: options.issuedAt ?? options.envelope.publication.publishedAt,
    expiresAt: options.expiresAt,
    derivation: {
      builder: options.builder,
      materials: options.materials.map(material => ({
        name: material.name,
        uri: material.uri,
        ...(material.mediaType ? { mediaType: material.mediaType } : {}),
        digest: { sha256: artifactSha256(material.bytes) },
      })),
      reproducible: true,
    },
    provenanceGraph: {
      standard: 'W3C-PROV',
      uri: 'aiwg:marketplace-provenance:w3c-prov',
      sha256: artifactSha256(provenanceBytes),
    },
    dependencies,
    privateKey: options.privateKey,
  });
  return { attestation, materials: options.materials };
}

export function serializeMarketplaceAttestation(evidence: MarketplaceCrossAssetEvidence): Buffer {
  return serializeArtifactAttestation(evidence.attestation);
}

function signedMarketplacePolicy(root: ArtifactTrustRoot) {
  return root.signed.policy.marketplace ?? {
    evidenceMode: 'marketplace-only' as const,
    legacySignatureMigrationGate: false,
    recursiveDependencies: 'if-present' as const,
  };
}

export async function verifyMarketplaceEvidence(options: {
  envelope: MarketplaceProvenanceEnvelope;
  contentRoot?: string;
  checkoutPath?: string;
  trustStore?: MarketplaceTrustStore;
  marketplacePolicy?: Partial<MarketplaceVerificationPolicy>;
  /** Candidate dependency locks; recursive callers still verify each child. */
  installedLocks?: Record<string, string>;
  artifact?: {
    evidence: MarketplaceCrossAssetEvidence;
    rootBytes: Uint8Array;
    state: ArtifactTrustState;
    now?: string;
    offline?: boolean;
  };
}): Promise<MarketplaceCompositeVerificationResult> {
  const authenticatedRoot = options.artifact ? parseTrustRoot(options.artifact.rootBytes) : undefined;
  const signedPolicy = authenticatedRoot ? signedMarketplacePolicy(authenticatedRoot) : {
    evidenceMode: 'marketplace-only' as const,
    legacySignatureMigrationGate: false,
    recursiveDependencies: 'if-present' as const,
  };
  const legacyRequired = signedPolicy.evidenceMode !== 'cross-asset-required'
    || !signedPolicy.legacySignatureMigrationGate;
  const marketplace = await verifyProvenanceEnvelope({
    envelope: options.envelope,
    contentRoot: options.contentRoot,
    checkoutPath: options.checkoutPath,
    trustStore: options.trustStore,
    installedLocks: options.installedLocks,
    at: options.artifact?.now ? new Date(options.artifact.now) : undefined,
    policy: legacyRequired
      ? {
          requireSignature: true,
          allowIntegrityOnly: false,
          requireDependencyLocks: signedPolicy.recursiveDependencies === 'required',
          ...options.marketplacePolicy,
        }
      : {
          requireDependencyLocks: signedPolicy.recursiveDependencies === 'required',
          ...options.marketplacePolicy,
        },
  });
  const errors = marketplace.ok ? [] : marketplace.errors.map(error => `marketplace: ${error}`);
  let crossAsset: ArtifactVerificationResult | undefined;
  const crossRequired = signedPolicy.evidenceMode !== 'marketplace-only';
  if (options.artifact) {
    const scope = marketplaceArtifactScope(options.envelope);
    crossAsset = await verifyArtifact({
      artifactBytes: serializeMarketplaceEnvelope(options.envelope),
      artifactName: MARKETPLACE_ENVELOPE_SUBJECT,
      attestation: options.artifact.evidence.attestation,
      rootBytes: options.artifact.rootBytes,
      state: options.artifact.state,
      materials: new Map(options.artifact.evidence.materials.map(material => [material.uri, material.bytes])),
      expectedScope: scope,
      offline: options.artifact.offline,
      now: options.artifact.now,
    });
    if (crossAsset.status !== 'verified') errors.push(`cross-asset: ${crossAsset.status}`);
  } else if (crossRequired) {
    errors.push('cross-asset: required evidence is unavailable');
  }

  if (legacyRequired && marketplace.status !== 'verified') errors.push('marketplace: a trusted legacy publisher signature remains mandatory');
  if (crossAsset?.status === 'verified' && marketplace.signer && options.trustStore) {
    const legacyKey = options.trustStore.keys.find(key => key.keyId === marketplace.signer);
    if (!legacyKey?.artifactIdentityId || !crossAsset.identities.includes(legacyKey.artifactIdentityId)) {
      errors.push('trust-parity: marketplace and cross-asset verification resolved different publisher authorities');
    }
  }
  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? 'verified' : 'failed',
    marketplace,
    ...(crossAsset ? { crossAsset } : {}),
    errors: [...new Set(errors)],
  };
}

export async function verifyMarketplaceDependencyClosure(options: {
  root: MarketplaceProvenanceEnvelope;
  packages: ReadonlyMap<string, MarketplaceProvenanceEnvelope>;
  verify: (envelope: MarketplaceProvenanceEnvelope) => Promise<boolean>;
  required: boolean;
}): Promise<{ ok: boolean; errors: string[]; verifiedLocks: string[] }> {
  const errors: string[] = [];
  const verified = new Set<string>();
  const active = new Set<string>();
  const visit = async (envelope: MarketplaceProvenanceEnvelope): Promise<void> => {
    const lock: MarketplacePackageLock = createPackageLock(envelope, envelope.publication.publishedAt);
    if (verified.has(lock.lockId)) return;
    if (active.has(lock.lockId)) {
      errors.push(`dependency cycle detected at ${lock.lockId}`);
      return;
    }
    active.add(lock.lockId);
    if (!await options.verify(envelope)) errors.push(`dependency evidence failed for ${lock.lockId}`);
    for (const dependency of envelope.package.dependencies.filter(item => !item.optional)) {
      if (!dependency.lockId) {
        if (options.required) errors.push(`required dependency '${dependency.identity}' has no immutable lockId`);
        continue;
      }
      const child = options.packages.get(dependency.lockId);
      if (!child) {
        errors.push(`required dependency '${dependency.identity}' is unavailable at ${dependency.lockId}`);
        continue;
      }
      const actual = createPackageLock(child, child.publication.publishedAt).lockId;
      if (actual !== dependency.lockId) {
        errors.push(`dependency substitution for '${dependency.identity}': expected ${dependency.lockId}, got ${actual}`);
        continue;
      }
      await visit(child);
    }
    active.delete(lock.lockId);
    verified.add(lock.lockId);
  };
  await visit(options.root);
  return { ok: errors.length === 0, errors, verifiedLocks: [...verified].sort() };
}
