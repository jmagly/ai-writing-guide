/**
 * Persistent marketplace exchange: local index, receipts, portable bundles,
 * trust roots, and federated signed catalogs.
 *
 * @implements #2009
 */

import { randomBytes } from 'node:crypto';
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { setPackageEntry } from '../packages/package-registry.js';
import { discoverInstallablePackage } from '../packages/package-discovery.js';
import {
  parseTrustRoot,
  sha256 as artifactSha256,
  type ArtifactTrustState,
} from '../security/artifact-trust.js';
import {
  serializeMarketplaceAttestation,
  verifyMarketplaceEvidence,
  type MarketplaceCrossAssetEvidence,
} from './artifact-attestation.js';
import {
  buildFortemiEnvelopeShard,
  canonicalJson,
  createOperationReceipt,
  createPackageLock,
  createProvenanceEnvelope,
  inventoryDirectory,
  inventorySha256,
  sha256,
  signProvenanceEnvelope,
  signCanonicalDocument,
  validateProvenanceEnvelope,
  verifyDocumentTrust,
  verifyFortemiEnvelopeShard,
  verifyProvenanceEnvelope,
} from './provenance.js';
import {
  MARKETPLACE_BUNDLE_SCHEMA,
  MARKETPLACE_BUNDLE_V2_SCHEMA,
  MARKETPLACE_CATALOG_REGISTRY_SCHEMA,
  MARKETPLACE_CATALOG_SCHEMA,
  MARKETPLACE_INDEX_SCHEMA,
  MARKETPLACE_TRUST_SCHEMA,
  type MarketplaceConformanceEvidence,
  type MarketplaceCatalog,
  type MarketplaceCatalogEntry,
  type MarketplaceCatalogRecord,
  type MarketplaceCatalogRegistry,
  type MarketplaceIndexEntry,
  type MarketplaceLocalIndex,
  type MarketplaceOperationReceipt,
  type MarketplacePackageLock,
  type MarketplacePortableBundleV2,
  type MarketplacePortableCrossAssetEvidence,
  type MarketplacePortableFile,
  type MarketplaceReadablePortableBundle,
  type MarketplaceProvenanceEnvelope,
  type MarketplaceTrustStore,
  type MarketplaceVerificationPolicy,
  type MarketplaceVerificationResult,
} from './provenance-types.js';

const STATE_DIR = 'marketplace';
const INDEX_FILE = 'index.json';
const TRUST_FILE = 'trust.json';
const CATALOGS_FILE = 'catalogs.json';
const MAX_PORTABLE_BUNDLE_BYTES = 512 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function resolveGlobalConfigDir(): string {
  if (process.env.AIWG_CONFIG) return path.resolve(process.env.AIWG_CONFIG);
  const primary = path.join(os.homedir(), '.aiwg');
  const xdg = path.join(os.homedir(), '.config', 'aiwg');
  if (existsSync(primary)) return primary;
  if (existsSync(xdg)) return xdg;
  return primary;
}

export interface MarketplaceScopeOptions {
  configDir?: string;
  projectDir?: string;
  projectLocal?: boolean;
}

export function marketplaceConfigDir(options: MarketplaceScopeOptions = {}): string {
  if (options.configDir) return path.resolve(options.configDir);
  if (options.projectLocal) return path.join(path.resolve(options.projectDir ?? process.cwd()), '.aiwg');
  return resolveGlobalConfigDir();
}

export function marketplaceStateDir(options: MarketplaceScopeOptions = {}): string {
  return path.join(marketplaceConfigDir(options), STATE_DIR);
}

function safeDigestName(value: string): string {
  if (!/^sha256:[a-f0-9]{64}$/.test(value)) throw new Error(`Invalid content address '${value}'`);
  return value.slice('sha256:'.length);
}

async function pathExists(filename: string): Promise<boolean> {
  try {
    await access(filename);
    return true;
  } catch {
    return false;
  }
}

async function atomicWrite(filename: string, content: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    await writeFile(temporary, content, { flag: 'wx' });
    await rename(temporary, filename);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function readJson(filename: string, maxBytes = 8 * 1024 * 1024): Promise<unknown> {
  const bytes = await readFile(filename);
  if (bytes.byteLength > maxBytes) throw new Error(`${path.basename(filename)} exceeds the ${maxBytes}-byte safety limit`);
  try {
    return JSON.parse(bytes.toString('utf8')) as unknown;
  } catch (error) {
    throw new Error(`${path.basename(filename)} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function emptyIndex(): MarketplaceLocalIndex {
  return { schemaVersion: MARKETPLACE_INDEX_SCHEMA, updatedAt: new Date(0).toISOString(), packages: {} };
}

export async function readMarketplaceIndex(options: MarketplaceScopeOptions = {}): Promise<MarketplaceLocalIndex> {
  const filename = path.join(marketplaceStateDir(options), INDEX_FILE);
  if (!await pathExists(filename)) return emptyIndex();
  const value = await readJson(filename);
  if (!isRecord(value) || value.schemaVersion !== MARKETPLACE_INDEX_SCHEMA || !isRecord(value.packages)) {
    throw new Error(`Unsupported or malformed marketplace index at ${filename}`);
  }
  return value as unknown as MarketplaceLocalIndex;
}

export async function writeMarketplaceIndex(index: MarketplaceLocalIndex, options: MarketplaceScopeOptions = {}): Promise<void> {
  if (index.schemaVersion !== MARKETPLACE_INDEX_SCHEMA) throw new Error('Cannot write an unsupported marketplace index');
  await atomicWrite(path.join(marketplaceStateDir(options), INDEX_FILE), `${canonicalJson(index)}\n`);
}

export async function readTrustStore(options: MarketplaceScopeOptions & { path?: string } = {}): Promise<MarketplaceTrustStore> {
  const filename = options.path
    ? path.resolve(options.path)
    : path.join(marketplaceStateDir(options), TRUST_FILE);
  if (!await pathExists(filename)) return { schemaVersion: MARKETPLACE_TRUST_SCHEMA, keys: [], policies: {} };
  const value = await readJson(filename);
  if (!isRecord(value) || value.schemaVersion !== MARKETPLACE_TRUST_SCHEMA || !Array.isArray(value.keys)) {
    throw new Error(`Unsupported or malformed marketplace trust store at ${filename}`);
  }
  return value as unknown as MarketplaceTrustStore;
}

export async function writeTrustStore(store: MarketplaceTrustStore, options: MarketplaceScopeOptions = {}): Promise<void> {
  if (store.schemaVersion !== MARKETPLACE_TRUST_SCHEMA || !Array.isArray(store.keys)) throw new Error('Invalid marketplace trust store');
  const unique = new Set<string>();
  for (const key of store.keys) {
    if (unique.has(key.keyId)) throw new Error(`Duplicate trusted key '${key.keyId}'`);
    unique.add(key.keyId);
  }
  const normalized = { ...store, keys: [...store.keys].sort((a, b) => a.keyId.localeCompare(b.keyId)) };
  await atomicWrite(path.join(marketplaceStateDir(options), TRUST_FILE), `${canonicalJson(normalized)}\n`);
}

export async function resolveVerificationPolicy(
  policy: string | undefined,
  options: MarketplaceScopeOptions = {},
): Promise<{ policy: Partial<MarketplaceVerificationPolicy>; trustStore: MarketplaceTrustStore }> {
  if (policy && (policy.includes('/') || policy.endsWith('.json'))) {
    const value = await readJson(path.resolve(policy));
    if (!isRecord(value)) throw new Error(`Marketplace policy '${policy}' must be a JSON object`);
    const trustStore = await readTrustStore(options);
    return { policy: value as Partial<MarketplaceVerificationPolicy>, trustStore };
  }
  const trustStore = await readTrustStore(options);
  if (policy) {
    const resolved = trustStore.policies?.[policy];
    if (!resolved) throw new Error(`Unknown marketplace verification policy '${policy}'`);
    return { policy: resolved, trustStore };
  }
  return { policy: {}, trustStore };
}

export interface RecordInstalledPackageOptions extends MarketplaceScopeOptions {
  envelope: MarketplaceProvenanceEnvelope;
  lock: MarketplacePackageLock;
  receipt: MarketplaceOperationReceipt;
  cachePath: string;
  artifactPath: string;
  verificationStatus: MarketplaceIndexEntry['verificationStatus'];
  fortemiShard?: Uint8Array;
  crossAsset?: MarketplaceCrossAssetEvidence;
  dependencyLockIds?: string[];
  catalogId?: string;
}

export async function recordInstalledPackage(options: RecordInstalledPackageOptions): Promise<MarketplaceIndexEntry> {
  const state = marketplaceStateDir(options);
  const digest = safeDigestName(options.lock.lockId);
  const packageDir = path.join(state, 'packages', digest);
  const envelopePath = path.join(packageDir, 'envelope.json');
  const lockPath = path.join(packageDir, 'lock.json');
  const receiptPath = path.join(packageDir, 'receipts', `${safeDigestName(options.receipt.receiptId)}.json`);
  const shardPath = options.fortemiShard ? path.join(packageDir, 'provenance.full-v1.shard') : undefined;
  const attestationPath = options.crossAsset ? path.join(packageDir, 'cross-asset', 'attestation.json') : undefined;
  const materialPaths = options.crossAsset
    ? Object.fromEntries(options.crossAsset.materials.map((material, index) => [
        material.uri,
        path.join(packageDir, 'cross-asset', 'materials', `${String(index).padStart(4, '0')}-${artifactSha256(material.bytes)}.material`),
      ]))
    : undefined;
  if (options.crossAsset && Object.keys(materialPaths!).length !== options.crossAsset.materials.length) {
    throw new Error('Cross-asset material URIs must be unique');
  }
  await Promise.all([
    atomicWrite(envelopePath, `${canonicalJson(options.envelope)}\n`),
    atomicWrite(lockPath, `${canonicalJson(options.lock)}\n`),
    atomicWrite(receiptPath, `${canonicalJson(options.receipt)}\n`),
    ...(shardPath && options.fortemiShard ? [atomicWrite(shardPath, options.fortemiShard)] : []),
    ...(attestationPath && options.crossAsset ? [atomicWrite(attestationPath, serializeMarketplaceAttestation(options.crossAsset))] : []),
    ...((options.crossAsset && materialPaths) ? options.crossAsset.materials.map(material => atomicWrite(materialPaths[material.uri]!, material.bytes)) : []),
  ]);
  const index = await readMarketplaceIndex(options);
  const existing = index.packages[options.lock.lockId];
  const entry: MarketplaceIndexEntry = {
    lock: options.lock,
    envelopePath,
    receiptPaths: [...new Set([...(existing?.receiptPaths ?? []), receiptPath])].sort(),
    ...(shardPath ? { fortemiShardPath: shardPath } : existing?.fortemiShardPath ? { fortemiShardPath: existing.fortemiShardPath } : {}),
    ...(attestationPath ? { attestationPath } : existing?.attestationPath ? { attestationPath: existing.attestationPath } : {}),
    ...(materialPaths ? { materialPaths } : existing?.materialPaths ? { materialPaths: existing.materialPaths } : {}),
    ...(options.dependencyLockIds
      ? { dependencyLockIds: [...new Set(options.dependencyLockIds)].sort() }
      : existing?.dependencyLockIds ? { dependencyLockIds: existing.dependencyLockIds } : {}),
    cachePath: options.cachePath,
    artifactPath: options.artifactPath,
    installedAt: options.receipt.occurredAt,
    verificationStatus: options.verificationStatus,
    catalogs: [...new Set([...(existing?.catalogs ?? []), ...(options.catalogId ? [options.catalogId] : [])])].sort(),
  };
  index.packages[options.lock.lockId] = entry;
  index.updatedAt = new Date().toISOString();
  await writeMarketplaceIndex(index, options);
  return entry;
}

export async function findIndexedPackage(
  query: string,
  options: MarketplaceScopeOptions = {},
): Promise<MarketplaceIndexEntry | undefined> {
  const index = await readMarketplaceIndex(options);
  if (index.packages[query]) return index.packages[query];
  const matches = Object.values(index.packages).filter((entry) =>
    entry.lock.identity === query
    || `${entry.lock.identity}@${entry.lock.version}` === query
    || entry.lock.lockId === query);
  if (matches.length > 1) {
    throw new Error(`Package query '${query}' matches multiple installed versions; select identity@version or a lock ID`);
  }
  return matches[0];
}

export async function verifyIndexedPackage(options: MarketplaceScopeOptions & {
  query: string;
  policy?: Partial<MarketplaceVerificationPolicy>;
  trustStore?: MarketplaceTrustStore;
  requireSignature?: boolean;
  actor?: string;
}): Promise<{ verification: MarketplaceVerificationResult; receipt: MarketplaceOperationReceipt; entry: MarketplaceIndexEntry }> {
  const entry = await findIndexedPackage(options.query, options);
  if (!entry) throw new Error(`Installed marketplace package '${options.query}' was not found`);
  const envelope = await readEnvelope(entry.envelopePath);
  const verification = await verifyProvenanceEnvelope({
    envelope,
    contentRoot: entry.artifactPath,
    trustStore: options.trustStore,
    policy: options.requireSignature
      ? { requireSignature: true, allowIntegrityOnly: false, ...options.policy }
      : options.policy,
  });
  const priorReceipt = await readReceipt(entry.receiptPaths[entry.receiptPaths.length - 1]!);
  const receipt = createOperationReceipt({
    operation: 'verify',
    lock: entry.lock,
    actor: options.actor ?? 'aiwg',
    result: verification.ok ? 'success' : 'failure',
    verificationStatus: verification.status,
    evidence: { offline: true, checks: verification.checks.length, errors: verification.errors.length },
    conformance: priorReceipt.conformance,
  });
  await recordInstalledPackage({
    ...options,
    envelope,
    lock: entry.lock,
    receipt,
    cachePath: entry.cachePath,
    artifactPath: entry.artifactPath,
    verificationStatus: verification.status,
    ...(entry.fortemiShardPath ? { fortemiShard: new Uint8Array(await readFile(entry.fortemiShardPath)) } : {}),
  });
  return { verification, receipt, entry };
}

export async function publishLocalPackage(options: {
  sourceDir: string;
  outputDir: string;
  privateKeyPath: string;
  publicKeyPath?: string;
  keyId?: string;
  publisher: string;
  requestedRef?: string;
  packageSelector?: string;
  sequence?: number;
  actor?: string;
}): Promise<{
  envelope: MarketplaceProvenanceEnvelope;
  lock: MarketplacePackageLock;
  receipt: MarketplaceOperationReceipt;
  envelopePath: string;
  lockPath: string;
  receiptPath: string;
  shardPath: string;
}> {
  const sourceDir = path.resolve(options.sourceDir);
  const discovered = await discoverInstallablePackage(sourceDir, options.packageSelector);
  const unsigned = await createProvenanceEnvelope({
    checkoutPath: sourceDir,
    artifactPath: discovered.artifactPath,
    wrapperPath: path.relative(sourceDir, discovered.wrapperPath).replaceAll(path.sep, '/') || '.',
    manifest: discovered.manifest,
    requestedRef: options.requestedRef ?? 'HEAD',
    publisher: options.publisher,
    sequence: options.sequence,
  });
  const privateKey = await readFile(path.resolve(options.privateKeyPath), 'utf8');
  const publicKey = options.publicKeyPath ? await readFile(path.resolve(options.publicKeyPath), 'utf8') : undefined;
  const envelope = signProvenanceEnvelope(unsigned, privateKey, {
    keyId: options.keyId,
    publicKeyPem: publicKey,
  });
  const lock = createPackageLock(envelope, envelope.publication.publishedAt);
  const fortemi = await buildFortemiEnvelopeShard(envelope);
  const receipt = createOperationReceipt({
    operation: 'publish',
    lock,
    actor: options.actor ?? options.publisher,
    verificationStatus: 'verified',
    evidence: { sourceDir, signed: true, files: envelope.package.inventory.length },
    conformance: fortemi.conformance,
    occurredAt: envelope.publication.publishedAt,
  });
  const outputDir = path.resolve(options.outputDir);
  const envelopePath = path.join(outputDir, 'envelope.json');
  const lockPath = path.join(outputDir, 'lock.json');
  const receiptPath = path.join(outputDir, 'receipts', `${safeDigestName(receipt.receiptId)}.json`);
  const shardPath = path.join(outputDir, 'provenance.full-v1.shard');
  await Promise.all([
    atomicWrite(envelopePath, `${canonicalJson(envelope)}\n`),
    atomicWrite(lockPath, `${canonicalJson(lock)}\n`),
    atomicWrite(receiptPath, `${canonicalJson(receipt)}\n`),
    atomicWrite(shardPath, fortemi.archive),
  ]);
  return { envelope, lock, receipt, envelopePath, lockPath, receiptPath, shardPath };
}

async function readEnvelope(filename: string): Promise<MarketplaceProvenanceEnvelope> {
  const value = await readJson(filename);
  validateProvenanceEnvelope(value);
  return value;
}

async function readReceipt(filename: string): Promise<MarketplaceOperationReceipt> {
  const value = await readJson(filename);
  if (!isRecord(value) || value.schemaVersion !== 'aiwg.marketplace.operation-receipt.v1') throw new Error(`Invalid operation receipt at ${filename}`);
  return value as unknown as MarketplaceOperationReceipt;
}

async function portableFiles(root: string): Promise<MarketplacePortableFile[]> {
  const inventory = await inventoryDirectory(root);
  return Promise.all(inventory.map(async (entry) => ({
    ...entry,
    contentBase64: (await readFile(path.join(root, ...entry.path.split('/')))).toString('base64'),
  })));
}

function decodeStrictBase64(value: string, label: string, allowEmpty = false): Buffer {
  if ((!allowEmpty && value.length === 0)
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error(`${label} is not canonical base64`);
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value) throw new Error(`${label} is not canonical base64`);
  return bytes;
}

function validatePortableFiles(bundle: MarketplaceReadablePortableBundle): void {
  if (!Array.isArray(bundle.files) || bundle.files.length === 0) throw new Error('Portable marketplace bundle has no package files');
  const inventory = bundle.files.map(({ contentBase64: _content, ...entry }) => entry);
  if (canonicalJson(inventory) !== canonicalJson(bundle.envelope.package.inventory)) {
    throw new Error('Portable bundle file inventory diverges from the signed envelope');
  }
  for (const file of bundle.files) {
    const bytes = bundle.schemaVersion === MARKETPLACE_BUNDLE_V2_SCHEMA
      ? decodeStrictBase64(file.contentBase64, `Portable file '${file.path}' content`, true)
      : Buffer.from(file.contentBase64, 'base64');
    if (bytes.byteLength !== file.bytes || sha256(bytes) !== file.sha256) {
      throw new Error(`Portable bundle content digest mismatch for '${file.path}'`);
    }
  }
  if (inventorySha256(inventory) !== bundle.envelope.source.artifactSha256) {
    throw new Error('Portable bundle artifact digest does not match the provenance envelope');
  }
}

export interface MarketplacePortableArtifactTrust {
  /** Exact bytes of an already bootstrapped, scoped cross-asset trust root. */
  rootBytes: Uint8Array;
  state: ArtifactTrustState;
  now?: string;
}

function toPortableCrossAsset(evidence: MarketplaceCrossAssetEvidence): MarketplacePortableCrossAssetEvidence {
  return {
    attestation: evidence.attestation,
    materials: evidence.materials.map(material => ({
      name: material.name,
      uri: material.uri,
      ...(material.mediaType ? { mediaType: material.mediaType } : {}),
      bytes: material.bytes.byteLength,
      sha256: artifactSha256(material.bytes),
      contentBase64: Buffer.from(material.bytes).toString('base64'),
    })),
  };
}

function fromPortableCrossAsset(crossAsset: MarketplacePortableCrossAssetEvidence): MarketplaceCrossAssetEvidence {
  return {
    attestation: crossAsset.attestation,
    materials: crossAsset.materials.map(material => ({
      name: material.name,
      uri: material.uri,
      ...(material.mediaType ? { mediaType: material.mediaType } : {}),
      bytes: new Uint8Array(decodeStrictBase64(material.contentBase64, `Portable material '${material.uri}' content`)),
    })),
  };
}

function canonicalMaterial(value: unknown): Buffer {
  return Buffer.from(`${canonicalJson(value)}\n`, 'utf8');
}

/**
 * Produce the only material byte representation accepted by portable v2.
 * The Git/SBOM/license entries use explicit deterministic descriptors when
 * their source bytes are not themselves an archive member.
 */
export function marketplacePortableBindingMaterials(options: {
  envelope: MarketplaceProvenanceEnvelope;
  lock: MarketplacePackageLock;
  receipts: MarketplaceOperationReceipt[];
  fortemiShard: Uint8Array;
  /** Exact NUL-delimited bytes from `git ls-tree -r --full-tree -z`. */
  gitTreeBytes: Uint8Array;
  files: MarketplacePortableFile[];
}): MarketplaceCrossAssetEvidence['materials'] {
  if (options.receipts.length === 0) throw new Error('Marketplace binding requires at least one receipt');
  const boundReceipt = options.receipts.find(receipt => receipt.lockId === options.lock.lockId);
  if (!boundReceipt) throw new Error(`Marketplace binding has no receipt for ${options.lock.lockId}`);
  const sbom = options.envelope.package.sbom;
  let sbomBytes: Uint8Array;
  if (sbom) {
    const file = options.files.find(candidate => candidate.path === sbom.path);
    if (!file) throw new Error(`Marketplace SBOM '${sbom.path}' is absent from the portable inventory`);
    sbomBytes = new Uint8Array(Buffer.from(file.contentBase64, 'base64'));
    if (sha256(sbomBytes) !== sbom.sha256) throw new Error(`Marketplace SBOM '${sbom.path}' does not match its envelope digest`);
  } else {
    sbomBytes = canonicalMaterial({ present: false });
  }
  if (artifactSha256(options.gitTreeBytes) !== options.envelope.source.treeSha256) {
    throw new Error('Marketplace Git tree bytes do not match the envelope treeSha256');
  }
  return [
    { name: 'lock', uri: 'aiwg:marketplace-material:lock', mediaType: 'application/vnd.aiwg.marketplace-lock.v1+json', bytes: canonicalMaterial(options.lock) },
    { name: 'inventory', uri: 'aiwg:marketplace-material:inventory', mediaType: 'application/json', bytes: canonicalMaterial(options.envelope.package.inventory) },
    {
      name: 'git-tree',
      uri: 'aiwg:marketplace-material:git-tree',
      mediaType: 'application/vnd.aiwg.git-ls-tree.v1',
      bytes: options.gitTreeBytes,
    },
    { name: 'fortemi-shard', uri: 'aiwg:marketplace-material:fortemi-shard', mediaType: 'application/vnd.fortemi.index.full-v1', bytes: options.fortemiShard },
    { name: 'receipt', uri: 'aiwg:marketplace-material:receipt', mediaType: 'application/vnd.aiwg.marketplace-receipt.v1+json', bytes: canonicalMaterial(boundReceipt) },
    {
      name: 'sbom',
      uri: 'aiwg:marketplace-material:sbom',
      mediaType: sbom?.format ?? 'application/vnd.aiwg.absent-descriptor.v1+json',
      bytes: sbomBytes,
    },
    { name: 'license', uri: 'aiwg:marketplace-material:license', mediaType: 'application/vnd.aiwg.license-descriptor.v1+json', bytes: canonicalMaterial({ license: options.envelope.package.license }) },
  ];
}

function validatePortableMaterialBindings(
  bundle: MarketplacePortableBundleV2,
  evidence: MarketplaceCrossAssetEvidence,
  shard: Uint8Array,
): void {
  const gitTree = evidence.materials.find(material => material.name === 'git-tree');
  if (!gitTree) throw new Error("Portable crossAsset evidence requires 'git-tree' material");
  const expected = marketplacePortableBindingMaterials({
    envelope: bundle.envelope,
    lock: bundle.lock,
    receipts: bundle.receipts,
    fortemiShard: shard,
    gitTreeBytes: gitTree.bytes,
    files: bundle.files,
  });
  const actual = new Map(evidence.materials.map(material => [material.name, material]));
  for (const binding of expected) {
    const material = actual.get(binding.name);
    if (!material) throw new Error(`Portable crossAsset evidence requires '${binding.name}' material`);
    if (material.uri !== binding.uri || material.mediaType !== binding.mediaType) {
      throw new Error(`Portable crossAsset '${binding.name}' material descriptor is not canonical`);
    }
    if (binding.name === 'receipt') {
      const matchesReceipt = bundle.receipts.some(receipt => (
        receipt.lockId === bundle.lock.lockId && Buffer.from(material.bytes).equals(canonicalMaterial(receipt))
      ));
      if (!matchesReceipt) throw new Error('Portable crossAsset receipt material does not bind a bundled receipt');
      continue;
    }
    if (!Buffer.from(material.bytes).equals(Buffer.from(binding.bytes))) {
      throw new Error(`Portable crossAsset '${binding.name}' material does not bind the bundle evidence`);
    }
  }
}

export async function exportPortablePackage(options: MarketplaceScopeOptions & {
  query: string;
  output: string;
  actor?: string;
  /** Supplying cross-asset evidence opts into the strict v2 portable format. */
  crossAsset?: MarketplaceCrossAssetEvidence;
  artifactTrust?: MarketplacePortableArtifactTrust;
  dependencies?: MarketplaceReadablePortableBundle[];
  trustStore?: MarketplaceTrustStore;
}): Promise<{
  bundle: MarketplaceReadablePortableBundle;
  output: string;
  receipt: MarketplaceOperationReceipt;
  nextArtifactTrustState?: ArtifactTrustState;
}> {
  const indexed = await findIndexedPackage(options.query, options);
  if (!indexed) throw new Error(`Installed marketplace package '${options.query}' was not found`);
  const envelope = await readEnvelope(indexed.envelopePath);
  const verification = await verifyProvenanceEnvelope({ envelope, contentRoot: indexed.artifactPath });
  if (!verification.ok) throw new Error(`Cannot export an invalid package: ${verification.errors.join('; ')}`);
  const fortemi = indexed.fortemiShardPath && await pathExists(indexed.fortemiShardPath)
    ? {
        archive: new Uint8Array(await readFile(indexed.fortemiShardPath)),
        conformance: (await readReceipt(indexed.receiptPaths[indexed.receiptPaths.length - 1]!)).conformance,
      }
    : await buildFortemiEnvelopeShard(envelope);
  const receipt = createOperationReceipt({
    operation: 'export',
    lock: indexed.lock,
    actor: options.actor ?? 'aiwg',
    verificationStatus: verification.status,
    evidence: { output: path.resolve(options.output), offline: true },
    conformance: fortemi.conformance,
  });
  const receipts = await Promise.all(indexed.receiptPaths.map(readReceipt));
  const common = {
    envelope,
    lock: indexed.lock,
    receipts: [...receipts, receipt],
    fortemiShardBase64: Buffer.from(fortemi.archive).toString('base64'),
    files: await portableFiles(indexed.artifactPath),
  };
  const bundle: MarketplaceReadablePortableBundle = options.crossAsset
    ? {
        schemaVersion: MARKETPLACE_BUNDLE_V2_SCHEMA,
        ...common,
        crossAsset: toPortableCrossAsset(options.crossAsset),
        dependencies: options.dependencies ?? [],
      }
    : { schemaVersion: MARKETPLACE_BUNDLE_SCHEMA, ...common };
  let nextArtifactTrustState: ArtifactTrustState | undefined;
  if (bundle.schemaVersion === MARKETPLACE_BUNDLE_V2_SCHEMA) {
    if (!options.artifactTrust) throw new Error('v2 portable export requires scoped cross-asset trust root and state');
    validatePortableBundle(bundle);
    const verifiedTree = await verifyPortableBundleTree(bundle, {
      artifactTrust: options.artifactTrust,
      trustStore: options.trustStore,
      requireLegacySignature: true,
    });
    nextArtifactTrustState = verifiedTree.nextState;
  }
  const output = path.resolve(options.output);
  await atomicWrite(output, `${canonicalJson(bundle)}\n`);
  await recordInstalledPackage({
    ...options,
    envelope,
    lock: indexed.lock,
    receipt,
    cachePath: indexed.cachePath,
    artifactPath: indexed.artifactPath,
    verificationStatus: indexed.verificationStatus,
    fortemiShard: fortemi.archive,
    ...(options.crossAsset ? { crossAsset: options.crossAsset } : {}),
    ...(bundle.schemaVersion === MARKETPLACE_BUNDLE_V2_SCHEMA
      ? { dependencyLockIds: bundle.dependencies.map(dependency => dependency.lock.lockId) }
      : {}),
  });
  return { bundle, output, receipt, ...(nextArtifactTrustState ? { nextArtifactTrustState } : {}) };
}

function exactPortableKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const accepted = new Set(allowed);
  const extras = Object.keys(value).filter(key => !accepted.has(key));
  if (extras.length) throw new Error(`${label} contains unknown required field(s): ${extras.join(', ')}`);
}

function validatePortableBundle(value: unknown): asserts value is MarketplaceReadablePortableBundle {
  if (!isRecord(value) || ![MARKETPLACE_BUNDLE_SCHEMA, MARKETPLACE_BUNDLE_V2_SCHEMA].includes(value.schemaVersion as never)) {
    throw new Error('Unsupported portable marketplace bundle schema');
  }
  const isV2 = value.schemaVersion === MARKETPLACE_BUNDLE_V2_SCHEMA;
  const allowed = new Set([
    'schemaVersion', 'envelope', 'lock', 'receipts', 'fortemiShardBase64', 'files',
    ...(isV2 ? ['crossAsset', 'dependencies'] : []),
  ]);
  const extras = Object.keys(value).filter((key) => !allowed.has(key));
  if (extras.length) throw new Error(`Portable bundle contains unknown required field(s): ${extras.join(', ')}`);
  validateProvenanceEnvelope(value.envelope);
  if (!isRecord(value.lock) || value.lock.schemaVersion !== 'aiwg.marketplace.package-lock.v1') throw new Error('Portable bundle lock is invalid');
  if (!Array.isArray(value.receipts) || !Array.isArray(value.files) || typeof value.fortemiShardBase64 !== 'string') throw new Error('Portable bundle is incomplete');
  if (!isV2) return;
  decodeStrictBase64(value.fortemiShardBase64 as string, 'v2 portable Fortemi shard');
  if (!isRecord(value.crossAsset) || !Array.isArray(value.crossAsset.materials) || !isRecord(value.crossAsset.attestation)) {
    throw new Error('v2 portable bundle crossAsset evidence is incomplete');
  }
  exactPortableKeys(value.crossAsset, ['attestation', 'materials'], 'Portable crossAsset evidence');
  const uris = new Set<string>();
  const materialNames = new Set<string>();
  for (const [index, material] of value.crossAsset.materials.entries()) {
    if (!isRecord(material)) throw new Error(`Portable crossAsset material ${index} is malformed`);
    exactPortableKeys(material, ['name', 'uri', 'mediaType', 'bytes', 'sha256', 'contentBase64'], `Portable crossAsset material ${index}`);
    if (typeof material.name !== 'string' || !material.name
      || typeof material.uri !== 'string' || !material.uri
      || (material.mediaType !== undefined && (typeof material.mediaType !== 'string' || !material.mediaType))
      || !Number.isSafeInteger(material.bytes) || Number(material.bytes) < 0
      || typeof material.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(material.sha256)
      || typeof material.contentBase64 !== 'string') {
      throw new Error(`Portable crossAsset material ${index} is incomplete`);
    }
    decodeStrictBase64(material.contentBase64, `Portable crossAsset material ${index}`);
    if (uris.has(material.uri)) throw new Error(`Portable crossAsset material URI '${material.uri}' is duplicated`);
    if (materialNames.has(material.name)) throw new Error(`Portable crossAsset material name '${material.name}' is duplicated`);
    uris.add(material.uri);
    materialNames.add(material.name);
  }
  const names = new Set(value.crossAsset.materials.map(material => (material as Record<string, unknown>).name));
  for (const required of ['lock', 'inventory', 'git-tree', 'fortemi-shard', 'receipt', 'sbom', 'license']) {
    if (!names.has(required)) throw new Error(`v2 portable crossAsset evidence requires '${required}' material`);
  }
  if (!Array.isArray(value.dependencies)) throw new Error('v2 portable bundle dependencies must be an array');
  value.dependencies.forEach(validatePortableBundle);
}

async function verifyFortemiBundle(envelope: MarketplaceProvenanceEnvelope, bytes: Uint8Array): Promise<void> {
  await verifyFortemiEnvelopeShard(envelope, bytes);
}

interface PortableTreeVerificationOptions {
  artifactTrust: MarketplacePortableArtifactTrust;
  trustStore?: MarketplaceTrustStore;
  requireLegacySignature: boolean;
}

async function verifyPortableBundleTree(
  root: MarketplacePortableBundleV2,
  options: PortableTreeVerificationOptions,
): Promise<{ verifications: Map<string, MarketplaceVerificationResult>; nextState: ArtifactTrustState }> {
  const artifactRoot = parseTrustRoot(options.artifactTrust.rootBytes);
  const marketplacePolicy = artifactRoot.signed.policy.marketplace ?? {
    evidenceMode: 'marketplace-only' as const,
    legacySignatureMigrationGate: false,
    recursiveDependencies: 'if-present' as const,
  };
  const results = new Map<string, MarketplaceVerificationResult>();
  const visiting = new Set<string>();
  let nextState = options.artifactTrust.state;

  const visit = async (bundle: MarketplaceReadablePortableBundle): Promise<void> => {
    validatePortableFiles(bundle);
    const expectedLock = createPackageLock(bundle.envelope, bundle.lock.createdAt);
    if (canonicalJson(expectedLock) !== canonicalJson(bundle.lock)) throw new Error('Portable bundle lock does not match its provenance envelope');
    const shard = new Uint8Array(Buffer.from(bundle.fortemiShardBase64, 'base64'));
    await verifyFortemiBundle(bundle.envelope, shard);
    if (results.has(bundle.lock.lockId)) return;
    if (visiting.has(bundle.lock.lockId)) throw new Error(`Portable dependency cycle detected at ${bundle.lock.lockId}`);
    visiting.add(bundle.lock.lockId);

    let verification: MarketplaceVerificationResult;
    if (bundle.schemaVersion === MARKETPLACE_BUNDLE_V2_SCHEMA) {
      const evidence = fromPortableCrossAsset(bundle.crossAsset);
      for (const material of bundle.crossAsset.materials) {
        const bytes = evidence.materials.find(candidate => candidate.uri === material.uri)!.bytes;
        if (bytes.byteLength !== material.bytes || artifactSha256(bytes) !== material.sha256) {
          throw new Error(`Portable crossAsset material digest mismatch for '${material.uri}'`);
        }
      }
      validatePortableMaterialBindings(bundle, evidence, shard);
      const composite = await verifyMarketplaceEvidence({
        envelope: bundle.envelope,
        trustStore: options.trustStore,
        // Legacy verification authenticates the signed lock declarations here;
        // the recursive closure below proves the declared children are present
        // and unsubstituted before any persistence.
        installedLocks: Object.fromEntries(bundle.envelope.package.dependencies
          .filter(dependency => dependency.lockId)
          .map(dependency => [dependency.identity, dependency.lockId!])),
        artifact: {
          evidence,
          rootBytes: options.artifactTrust.rootBytes,
          state: nextState,
          now: options.artifactTrust.now,
          offline: true,
        },
      });
      if (!composite.ok) throw new Error(`Portable package verification failed: ${composite.errors.join('; ')}`);
      if (!composite.crossAsset?.nextState) throw new Error('Cross-asset verifier did not return advanced freshness state');
      nextState = composite.crossAsset.nextState;
      verification = composite.marketplace;
    } else {
      if (marketplacePolicy.evidenceMode !== 'marketplace-only') {
        throw new Error(`Portable dependency ${bundle.lock.lockId} lacks cross-asset evidence required by '${marketplacePolicy.evidenceMode}' policy`);
      }
      verification = await verifyProvenanceEnvelope({
        envelope: bundle.envelope,
        trustStore: options.trustStore,
        policy: options.requireLegacySignature ? { requireSignature: true, allowIntegrityOnly: false } : undefined,
      });
      if (!verification.ok) throw new Error(`Portable package verification failed: ${verification.errors.join('; ')}`);
    }

    const children = bundle.schemaVersion === MARKETPLACE_BUNDLE_V2_SCHEMA ? bundle.dependencies : [];
    const childByLock = new Map(children.map(child => [child.lock.lockId, child]));
    if (childByLock.size !== children.length) throw new Error(`Portable bundle ${bundle.lock.lockId} contains duplicate dependencies`);
    const requiredLocks = new Set<string>();
    for (const dependency of bundle.envelope.package.dependencies.filter(candidate => !candidate.optional)) {
      if (!dependency.lockId) {
        if (marketplacePolicy.recursiveDependencies === 'required') {
          throw new Error(`Required dependency '${dependency.identity}' has no immutable lockId`);
        }
        continue;
      }
      requiredLocks.add(dependency.lockId);
      const child = childByLock.get(dependency.lockId);
      if (!child) {
        const substituted = children.find(candidate => candidate.lock.identity === dependency.identity);
        if (substituted) {
          throw new Error(`Dependency substitution for '${dependency.identity}': expected ${dependency.lockId}, got ${substituted.lock.lockId}`);
        }
        throw new Error(`Required dependency '${dependency.identity}' is unavailable at ${dependency.lockId}`);
      }
      if (child.lock.identity !== dependency.identity) {
        throw new Error(`Dependency substitution for '${dependency.identity}' at ${dependency.lockId}`);
      }
      await visit(child);
    }
    for (const child of children) {
      if (!requiredLocks.has(child.lock.lockId)) throw new Error(`Portable bundle contains undeclared dependency ${child.lock.lockId}`);
    }
    visiting.delete(bundle.lock.lockId);
    results.set(bundle.lock.lockId, verification);
  };
  await visit(root);
  return { verifications: results, nextState };
}

async function writePortableFiles(stage: string, files: MarketplacePortableFile[]): Promise<void> {
  for (const file of files) {
    const relative = file.path.replaceAll('\\', '/');
    if (!relative || relative.startsWith('/') || relative.split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new Error(`Unsafe portable file path '${file.path}'`);
    }
    const destination = path.join(stage, ...relative.split('/'));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, Buffer.from(file.contentBase64, 'base64'), { flag: 'wx' });
    await chmod(destination, file.mode & 0o777);
  }
}

export async function importPortablePackage(options: MarketplaceScopeOptions & {
  input: string;
  verify?: boolean;
  policy?: Partial<MarketplaceVerificationPolicy>;
  trustStore?: MarketplaceTrustStore;
  artifactTrust?: MarketplacePortableArtifactTrust;
  actor?: string;
}): Promise<{
  entry: MarketplaceIndexEntry;
  verification: MarketplaceVerificationResult;
  receipt: MarketplaceOperationReceipt;
  nextArtifactTrustState?: ArtifactTrustState;
}> {
  const input = path.resolve(options.input);
  const value = await readJson(input, MAX_PORTABLE_BUNDLE_BYTES);
  validatePortableBundle(value);
  const bundle = value;
  let verifications: Map<string, MarketplaceVerificationResult>;
  let nextArtifactTrustState: ArtifactTrustState | undefined;
  if (bundle.schemaVersion === MARKETPLACE_BUNDLE_V2_SCHEMA) {
    if (!options.artifactTrust) throw new Error('v2 portable import requires scoped cross-asset trust root and state');
    const verifiedTree = await verifyPortableBundleTree(bundle, {
      artifactTrust: options.artifactTrust,
      trustStore: options.trustStore,
      requireLegacySignature: true,
    });
    verifications = verifiedTree.verifications;
    nextArtifactTrustState = verifiedTree.nextState;
  } else {
    validatePortableFiles(bundle);
    const expectedLock = createPackageLock(bundle.envelope, bundle.lock.createdAt);
    if (canonicalJson(expectedLock) !== canonicalJson(bundle.lock)) throw new Error('Portable bundle lock does not match its provenance envelope');
    await verifyFortemiBundle(bundle.envelope, new Uint8Array(Buffer.from(bundle.fortemiShardBase64, 'base64')));
    const verification = await verifyProvenanceEnvelope({
      envelope: bundle.envelope,
      trustStore: options.trustStore,
      policy: options.verify ? { requireSignature: true, allowIntegrityOnly: false, ...options.policy } : options.policy,
    });
    if (!verification.ok) throw new Error(`Portable package verification failed: ${verification.errors.join('; ')}`);
    verifications = new Map([[bundle.lock.lockId, verification]]);
  }

  const ordered: MarketplaceReadablePortableBundle[] = [];
  const collect = (candidate: MarketplaceReadablePortableBundle): void => {
    if (candidate.schemaVersion === MARKETPLACE_BUNDLE_V2_SCHEMA) candidate.dependencies.forEach(collect);
    if (!ordered.some(existing => existing.lock.lockId === candidate.lock.lockId)) ordered.push(candidate);
  };
  collect(bundle);
  const state = marketplaceStateDir(options);
  const cacheParent = path.join(state, 'cache');
  await mkdir(cacheParent, { recursive: true });
  for (const candidate of ordered) {
    const destination = path.join(cacheParent, safeDigestName(candidate.lock.lockId));
    if (!await pathExists(destination)) {
      const stage = await mkdtemp(path.join(cacheParent, '.import-'));
      try {
        await writePortableFiles(stage, candidate.files);
        const stagedInventory = await inventoryDirectory(stage);
        if (inventorySha256(stagedInventory) !== candidate.envelope.source.artifactSha256) throw new Error('Staged import changed package bytes');
        await rename(stage, destination);
      } catch (error) {
        await rm(stage, { recursive: true, force: true });
        throw error;
      }
    } else {
      const existing = await inventoryDirectory(destination);
      if (inventorySha256(existing) !== candidate.envelope.source.artifactSha256) throw new Error(`Existing cache content for ${candidate.lock.lockId} is inconsistent`);
    }
  }

  let rootEntry: MarketplaceIndexEntry | undefined;
  let rootReceipt: MarketplaceOperationReceipt | undefined;
  for (const candidate of ordered) {
    const verification = verifications.get(candidate.lock.lockId)!;
    const shard = new Uint8Array(Buffer.from(candidate.fortemiShardBase64, 'base64'));
    let conformance: MarketplaceConformanceEvidence = { profile: '2.0.0/full-v1', lossless: true, contractValid: true, shardSha256: sha256(shard) };
    for (let index = candidate.receipts.length - 1; index >= 0; index--) {
      const receiptConformance = candidate.receipts[index]?.conformance;
      if (receiptConformance?.lossless) {
        conformance = receiptConformance;
        break;
      }
    }
    const receipt = createOperationReceipt({
      operation: 'import',
      lock: candidate.lock,
      actor: options.actor ?? 'aiwg',
      verificationStatus: verification.status,
      evidence: { input, offline: true, importedFiles: candidate.files.length },
      conformance,
    });
    const destination = path.join(cacheParent, safeDigestName(candidate.lock.lockId));
    const entry = await recordInstalledPackage({
      ...options,
      envelope: candidate.envelope,
      lock: candidate.lock,
      receipt,
      cachePath: destination,
      artifactPath: destination,
      verificationStatus: verification.status,
      fortemiShard: shard,
      ...(candidate.schemaVersion === MARKETPLACE_BUNDLE_V2_SCHEMA
        ? {
            crossAsset: fromPortableCrossAsset(candidate.crossAsset),
            dependencyLockIds: candidate.dependencies.map(dependency => dependency.lock.lockId),
          }
        : {}),
    });
    const configDir = marketplaceConfigDir(options);
    await setPackageEntry(candidate.lock.identity, {
      version: candidate.lock.version,
      source: candidate.lock.canonicalRemote,
      type: candidate.envelope.package.type === 'plugin' ? 'extension' : candidate.envelope.package.type,
      cachePath: destination,
      installedAt: receipt.occurredAt,
      deployedTo: [],
      provenance: {
        lockId: candidate.lock.lockId,
        resolvedCommit: candidate.lock.resolvedCommit,
        treeSha256: candidate.lock.treeSha256,
        artifactSha256: candidate.lock.artifactSha256,
        envelopeSha256: candidate.lock.envelopeSha256,
        verificationStatus: verification.status,
      },
    }, configDir);
    if (candidate.lock.lockId === bundle.lock.lockId) {
      rootEntry = entry;
      rootReceipt = receipt;
    }
  }
  return {
    entry: rootEntry!,
    verification: verifications.get(bundle.lock.lockId)!,
    receipt: rootReceipt!,
    ...(nextArtifactTrustState ? { nextArtifactTrustState } : {}),
  };
}

function emptyCatalogRegistry(): MarketplaceCatalogRegistry {
  return { schemaVersion: MARKETPLACE_CATALOG_REGISTRY_SCHEMA, catalogs: [] };
}

export async function readCatalogRegistry(options: MarketplaceScopeOptions = {}): Promise<MarketplaceCatalogRegistry> {
  const filename = path.join(marketplaceStateDir(options), CATALOGS_FILE);
  if (!await pathExists(filename)) return emptyCatalogRegistry();
  const value = await readJson(filename);
  if (!isRecord(value) || value.schemaVersion !== MARKETPLACE_CATALOG_REGISTRY_SCHEMA || !Array.isArray(value.catalogs)) {
    throw new Error(`Unsupported or malformed marketplace catalog registry at ${filename}`);
  }
  return value as unknown as MarketplaceCatalogRegistry;
}

async function writeCatalogRegistry(registry: MarketplaceCatalogRegistry, options: MarketplaceScopeOptions = {}): Promise<void> {
  await atomicWrite(path.join(marketplaceStateDir(options), CATALOGS_FILE), `${canonicalJson(registry)}\n`);
}

export function catalogSigningPayload(catalog: MarketplaceCatalog): Record<string, unknown> {
  const { signatures: _signatures, ...payload } = catalog;
  return payload;
}

export function signCatalog(
  catalog: MarketplaceCatalog,
  privateKeyPem: string,
  options: { keyId?: string; signedAt?: string; publicKeyPem?: string } = {},
): MarketplaceCatalog {
  validateCatalog(catalog);
  const signature = signCanonicalDocument(catalogSigningPayload(catalog), privateKeyPem, options);
  return { ...catalog, signatures: [...catalog.signatures.filter((item) => item.keyId !== signature.keyId), signature].sort((a, b) => a.keyId.localeCompare(b.keyId)) };
}

export function validateCatalog(value: unknown): asserts value is MarketplaceCatalog {
  if (!isRecord(value) || value.schemaVersion !== MARKETPLACE_CATALOG_SCHEMA) throw new Error('Unsupported marketplace catalog schema');
  const allowed = new Set(['schemaVersion', 'catalogId', 'sequence', 'generatedAt', 'entries', 'signatures']);
  const extras = Object.keys(value).filter((key) => !allowed.has(key));
  if (extras.length) throw new Error(`Catalog contains unknown required field(s): ${extras.join(', ')}`);
  if (typeof value.catalogId !== 'string' || !value.catalogId || !Number.isSafeInteger(value.sequence) || Number(value.sequence) < 1) throw new Error('Catalog identity/sequence is invalid');
  if (!Array.isArray(value.entries) || !Array.isArray(value.signatures)) throw new Error('Catalog entries/signatures must be arrays');
  const identities = new Set<string>();
  for (const raw of value.entries) {
    if (!isRecord(raw)) throw new Error('Catalog entries must be objects');
    const entry = raw as unknown as MarketplaceCatalogEntry;
    const key = `${entry.identity}@${entry.version}`;
    if (identities.has(key)) throw new Error(`Duplicate catalog package '${key}'`);
    identities.add(key);
    if (!/^sha256:[a-f0-9]{64}$/.test(entry.lockId) || !/^[a-f0-9]{64}$/.test(entry.envelopeSha256)) throw new Error(`Catalog package '${key}' has invalid digests`);
    if (entry.provenanceCompleteness < 0 || entry.provenanceCompleteness > 100) throw new Error(`Catalog package '${key}' has invalid provenance completeness`);
  }
}

export async function registerCatalog(options: MarketplaceScopeOptions & {
  catalogPath: string;
  source: string;
  requestedRef: string;
  resolvedCommit: string;
  cachePath: string;
  trustStore: MarketplaceTrustStore;
}): Promise<MarketplaceCatalogRecord> {
  const catalog = await readJson(options.catalogPath);
  validateCatalog(catalog);
  const trust = verifyDocumentTrust({
    document: catalogSigningPayload(catalog),
    signatures: catalog.signatures,
    trustStore: options.trustStore,
  });
  if (!trust.ok) throw new Error(`Catalog signature verification failed: ${trust.errors.join('; ')}`);
  const record: MarketplaceCatalogRecord = {
    catalogId: catalog.catalogId,
    source: options.source,
    requestedRef: options.requestedRef,
    resolvedCommit: options.resolvedCommit,
    catalogSha256: sha256(canonicalJson(catalog)),
    cachePath: options.cachePath,
    addedAt: new Date().toISOString(),
    verificationStatus: 'verified',
  };
  const registry = await readCatalogRegistry(options);
  registry.catalogs = [...registry.catalogs.filter((item) => item.catalogId !== record.catalogId), record]
    .sort((a, b) => a.catalogId.localeCompare(b.catalogId));
  await writeCatalogRegistry(registry, options);
  return record;
}

async function loadRegisteredCatalog(record: MarketplaceCatalogRecord): Promise<MarketplaceCatalog> {
  const candidates = [
    path.join(record.cachePath, 'aiwg-marketplace-catalog.json'),
    path.join(record.cachePath, '.aiwg', 'marketplace', 'catalog.json'),
  ];
  for (const candidate of candidates) {
    if (!await pathExists(candidate)) continue;
    const catalog = await readJson(candidate);
    validateCatalog(catalog);
    if (sha256(canonicalJson(catalog)) !== record.catalogSha256) throw new Error(`Cached catalog '${record.catalogId}' changed after registration`);
    return catalog;
  }
  throw new Error(`Cached catalog '${record.catalogId}' is unavailable`);
}

export interface CatalogSearchResult extends MarketplaceCatalogEntry {
  catalogId: string;
  catalogSource: string;
  observation: 'catalog-observation-not-endorsement';
}

export async function searchCatalogs(query: string, options: MarketplaceScopeOptions = {}): Promise<CatalogSearchResult[]> {
  const registry = await readCatalogRegistry(options);
  const needle = query.toLowerCase();
  const results: CatalogSearchResult[] = [];
  for (const record of registry.catalogs) {
    const catalog = await loadRegisteredCatalog(record);
    for (const entry of catalog.entries) {
      const haystack = `${entry.identity} ${entry.version} ${entry.description} ${entry.publisher}`.toLowerCase();
      if (!haystack.includes(needle)) continue;
      results.push({ ...entry, catalogId: catalog.catalogId, catalogSource: record.source, observation: 'catalog-observation-not-endorsement' });
    }
  }
  return results.sort((a, b) => a.identity.localeCompare(b.identity) || b.version.localeCompare(a.version) || a.catalogId.localeCompare(b.catalogId));
}

export async function resolveCatalogEntry(query: string, options: MarketplaceScopeOptions = {}): Promise<CatalogSearchResult> {
  const results = (await searchCatalogs(query, options)).filter((entry) =>
    entry.identity === query || `${entry.identity}@${entry.version}` === query || entry.lockId === query);
  if (results.length === 0) throw new Error(`Catalog package '${query}' was not found`);
  const lockIds = new Set(results.map((entry) => entry.lockId));
  if (lockIds.size > 1) throw new Error(`Catalog package '${query}' resolves to conflicting immutable locks; select identity@version`);
  return results[0]!;
}

export async function removeCatalog(catalogId: string, options: MarketplaceScopeOptions = {}): Promise<boolean> {
  const registry = await readCatalogRegistry(options);
  const before = registry.catalogs.length;
  registry.catalogs = registry.catalogs.filter((item) => item.catalogId !== catalogId);
  if (registry.catalogs.length === before) return false;
  await writeCatalogRegistry(registry, options);
  // Intentionally retain cached bytes and package locks. Catalogs are discovery
  // observations, never the custody or continuing authority for an install.
  return true;
}

export async function readCatalogEnvelope(
  result: CatalogSearchResult,
  options: MarketplaceScopeOptions = {},
): Promise<MarketplaceProvenanceEnvelope> {
  const registry = await readCatalogRegistry(options);
  const record = registry.catalogs.find((item) => item.catalogId === result.catalogId);
  if (!record) throw new Error(`Catalog '${result.catalogId}' is not registered`);
  const candidate = path.resolve(record.cachePath, result.envelopePath);
  const relative = path.relative(path.resolve(record.cachePath), candidate);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Catalog envelope path '${result.envelopePath}' escapes its checkout`);
  }
  const envelope = await readEnvelope(candidate);
  if (sha256(canonicalJson(envelope)) !== result.envelopeSha256) throw new Error(`Catalog envelope digest mismatch for '${result.identity}@${result.version}'`);
  const lock = createPackageLock(envelope, envelope.publication.publishedAt);
  if (lock.lockId !== result.lockId) throw new Error(`Catalog lock identity mismatch for '${result.identity}@${result.version}'`);
  return envelope;
}
