/**
 * Git-native marketplace provenance contracts.
 *
 * These interfaces intentionally use JSON-native values only. Every digest and
 * signature is computed over the canonical JSON representation implemented in
 * provenance.ts, so the same bytes are portable across direct Git, catalogs,
 * export/import, and offline verification.
 *
 * @implements #2009
 */

export const MARKETPLACE_ENVELOPE_SCHEMA = 'aiwg.marketplace.provenance-envelope.v1' as const;
export const MARKETPLACE_LOCK_SCHEMA = 'aiwg.marketplace.package-lock.v1' as const;
export const MARKETPLACE_RECEIPT_SCHEMA = 'aiwg.marketplace.operation-receipt.v1' as const;
export const MARKETPLACE_TRUST_SCHEMA = 'aiwg.marketplace.trust-store.v1' as const;
export const MARKETPLACE_CATALOG_SCHEMA = 'aiwg.marketplace.catalog.v1' as const;
export const MARKETPLACE_CATALOG_REGISTRY_SCHEMA = 'aiwg.marketplace.catalog-registry.v1' as const;
export const MARKETPLACE_BUNDLE_SCHEMA = 'aiwg.marketplace.portable-bundle.v1' as const;
export const MARKETPLACE_INDEX_SCHEMA = 'aiwg.marketplace.local-index.v1' as const;

export type PackageKind = 'framework' | 'addon' | 'extension' | 'plugin' | 'unknown';
export type MarketplaceOperation = 'publish' | 'export' | 'import' | 'verify' | 'install';
export type VerificationStatus = 'verified' | 'integrity-only' | 'untrusted' | 'failed';

export interface MarketplaceInventoryEntry {
  path: string;
  bytes: number;
  mode: number;
  sha256: string;
}

export interface MarketplaceDependency {
  identity: string;
  version: string;
  lockId?: string;
  optional?: boolean;
}

export interface MarketplaceProviderSupport {
  provider: string;
  support: string;
}

export interface MarketplacePackageIdentity {
  namespace: string;
  name: string;
  version: string;
  type: PackageKind;
}

export interface MarketplaceSourceIdentity {
  canonicalRemote: string;
  requestedRef: string;
  resolvedCommit: string;
  gitTreeObject: string;
  treeSha256: string;
  artifactSha256: string;
  wrapperPath: string;
  payloadPath: string;
  resolvedAt: string;
  commitTime?: string;
  tag?: {
    name: string;
    object?: string;
    signed?: boolean;
  };
}

export interface MarketplacePublisher {
  id: string;
  displayName?: string;
  keyId?: string;
}

export interface MarketplaceProvEntity {
  id: string;
  type: string;
  digest?: string;
  attributes?: Record<string, string | number | boolean | null>;
}

export interface MarketplaceProvActivity {
  id: string;
  type: string;
  startedAt: string;
  endedAt: string;
  attributes?: Record<string, string | number | boolean | null>;
}

export interface MarketplaceProvAgent {
  id: string;
  type: 'person' | 'organization' | 'software' | 'catalog';
  attributes?: Record<string, string | number | boolean | null>;
}

export interface MarketplaceProvRelation {
  type: 'wasGeneratedBy' | 'used' | 'wasAssociatedWith' | 'wasAttributedTo' | 'wasDerivedFrom' | 'specializationOf';
  subject: string;
  object: string;
}

export interface MarketplaceProvenanceGraph {
  standard: 'W3C-PROV';
  entities: MarketplaceProvEntity[];
  activities: MarketplaceProvActivity[];
  agents: MarketplaceProvAgent[];
  relations: MarketplaceProvRelation[];
}

export interface MarketplaceEnvelopeSignature {
  keyId: string;
  algorithm: 'ed25519';
  publicKey: string;
  signedAt: string;
  payloadSha256: string;
  signature: string;
}

export interface MarketplaceFortemiBinding {
  schemaVersion: '2.0.0';
  profile: 'full-v1';
  sourceSchemaVersion: 'aiwg.fortemi.index.export.v2';
}

export interface MarketplacePublicationState {
  sequence: number;
  publishedAt: string;
  supersedes?: string;
  deprecated?: boolean;
  yanked?: boolean;
  reason?: string;
}

export interface MarketplaceProvenanceEnvelope {
  schemaVersion: typeof MARKETPLACE_ENVELOPE_SCHEMA;
  requiredCapabilities: string[];
  package: MarketplacePackageIdentity & {
    description: string;
    license: string;
    wrapperSchemaVersion: string;
    wrapperVersion: string;
    providers: MarketplaceProviderSupport[];
    dependencies: MarketplaceDependency[];
    inventory: MarketplaceInventoryEntry[];
    sbom?: { format: string; sha256: string; path: string };
  };
  source: MarketplaceSourceIdentity;
  publisher: MarketplacePublisher;
  publication: MarketplacePublicationState;
  provenance: MarketplaceProvenanceGraph;
  fortemi: MarketplaceFortemiBinding;
  signatures: MarketplaceEnvelopeSignature[];
}

export interface MarketplacePackageLock {
  schemaVersion: typeof MARKETPLACE_LOCK_SCHEMA;
  lockId: string;
  identity: string;
  version: string;
  canonicalRemote: string;
  requestedRef: string;
  resolvedCommit: string;
  gitTreeObject: string;
  treeSha256: string;
  artifactSha256: string;
  wrapperSchemaVersion: string;
  fortemiProfile: '2.0.0/full-v1';
  envelopeSha256: string;
  dependencyLocks: Record<string, string>;
  createdAt: string;
}

export interface MarketplaceConformanceEvidence {
  profile: '2.0.0/full-v1';
  lossless: boolean;
  contractValid: boolean;
  shardSha256?: string;
  conversionReceipt?: Record<string, unknown>;
}

export interface MarketplaceOperationReceipt {
  schemaVersion: typeof MARKETPLACE_RECEIPT_SCHEMA;
  receiptId: string;
  operation: MarketplaceOperation;
  occurredAt: string;
  actor: string;
  lockId: string;
  envelopeSha256: string;
  result: 'success' | 'failure';
  verificationStatus: VerificationStatus;
  evidence: Record<string, string | number | boolean | null>;
  conformance: MarketplaceConformanceEvidence;
}

export interface MarketplaceTrustedKey {
  keyId: string;
  publicKey: string;
  publisher: string;
  trustRoot?: boolean;
  delegatedBy?: string;
  delegationSignature?: string;
  validFrom: string;
  validUntil?: string;
  revokedAt?: string;
  revocationReason?: string;
}

export interface MarketplaceTrustStore {
  schemaVersion: typeof MARKETPLACE_TRUST_SCHEMA;
  keys: MarketplaceTrustedKey[];
  policies?: Record<string, MarketplaceVerificationPolicy>;
}

export interface MarketplaceVerificationPolicy {
  requireSignature: boolean;
  allowIntegrityOnly: boolean;
  allowYanked: boolean;
  allowDeprecated: boolean;
  allowRefMove: boolean;
  allowRollback: boolean;
  minimumSequence?: Record<string, number>;
  requiredPublisher?: string;
}

export interface MarketplaceVerificationResult {
  ok: boolean;
  status: VerificationStatus;
  lock: MarketplacePackageLock;
  envelopeSha256: string;
  signer?: string;
  checks: Array<{ check: string; ok: boolean; detail: string }>;
  errors: string[];
  warnings: string[];
}

export interface MarketplaceCatalogEntry {
  identity: string;
  version: string;
  description: string;
  license: string;
  canonicalRemote: string;
  requestedRef: string;
  resolvedCommit: string;
  envelopePath: string;
  envelopeSha256: string;
  lockId: string;
  publisher: string;
  provenanceCompleteness: number;
  verificationStatus: VerificationStatus;
  deprecated?: boolean;
  yanked?: boolean;
}

export interface MarketplaceCatalog {
  schemaVersion: typeof MARKETPLACE_CATALOG_SCHEMA;
  catalogId: string;
  sequence: number;
  generatedAt: string;
  entries: MarketplaceCatalogEntry[];
  signatures: MarketplaceEnvelopeSignature[];
}

export interface MarketplaceCatalogRecord {
  catalogId: string;
  source: string;
  requestedRef: string;
  resolvedCommit: string;
  catalogSha256: string;
  cachePath: string;
  addedAt: string;
  verificationStatus: VerificationStatus;
}

export interface MarketplaceCatalogRegistry {
  schemaVersion: typeof MARKETPLACE_CATALOG_REGISTRY_SCHEMA;
  catalogs: MarketplaceCatalogRecord[];
}

export interface MarketplacePortableFile extends MarketplaceInventoryEntry {
  contentBase64: string;
}

export interface MarketplacePortableBundle {
  schemaVersion: typeof MARKETPLACE_BUNDLE_SCHEMA;
  envelope: MarketplaceProvenanceEnvelope;
  lock: MarketplacePackageLock;
  receipts: MarketplaceOperationReceipt[];
  fortemiShardBase64: string;
  files: MarketplacePortableFile[];
}

export interface MarketplaceIndexEntry {
  lock: MarketplacePackageLock;
  envelopePath: string;
  receiptPaths: string[];
  fortemiShardPath?: string;
  cachePath: string;
  artifactPath: string;
  installedAt: string;
  verificationStatus: VerificationStatus;
  catalogs: string[];
}

export interface MarketplaceLocalIndex {
  schemaVersion: typeof MARKETPLACE_INDEX_SCHEMA;
  updatedAt: string;
  packages: Record<string, MarketplaceIndexEntry>;
}
