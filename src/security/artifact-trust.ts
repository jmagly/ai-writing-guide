import {
  constants as cryptoConstants,
  createHash,
  createPublicKey,
  verify as verifySignature,
  type KeyObject,
} from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const ARTIFACT_TRUST_ROOT_MEDIA_TYPE = 'application/vnd.aiwg.artifact-trust-root.v1+json';
export const ARTIFACT_TRUST_ROOT_SCHEMA_VERSION = 'aiwg.artifact-trust-root.v1';
export const ARTIFACT_TRUST_STATE_SCHEMA_VERSION = 'aiwg.artifact-trust-state.v1';

export type SignatureAlgorithm = 'ed25519' | 'ecdsa-p256-sha256' | 'rsa-pss-sha256';

export interface ArtifactScope {
  assetTypes: string[];
  namespaces: string[];
  channels: string[];
}

export interface PublicKeyTrustIdentity {
  id: string;
  independenceGroup: string;
  kind: 'public-key';
  algorithm: SignatureAlgorithm;
  publicKey: string;
}

export interface SigstoreTrustIdentity {
  id: string;
  independenceGroup: string;
  kind: 'sigstore';
  profile: string;
  subjectAlternativeName: string;
  issuer?: string;
}

export type ArtifactTrustIdentity = PublicKeyTrustIdentity | SigstoreTrustIdentity;

export interface SigstoreTrustProfile {
  id: string;
  trustedRoot: Record<string, unknown>;
  tlogThreshold: number;
  ctlogThreshold: number;
  timestampThreshold: number;
}

export interface ArtifactTrustRole {
  keyIds: string[];
  threshold: number;
  scope: ArtifactScope;
}

export interface ArtifactDelegation extends ArtifactTrustRole {
  id: string;
  parent: 'root' | string;
  notBefore?: string;
  expiresAt?: string;
}

export interface ArtifactRevocation {
  identityId: string;
  effectiveAt: string;
  compromisedFrom?: string;
  compromisedUntil?: string;
  scope: ArtifactScope;
  reason: string;
}

export interface ArtifactTrustPolicySettings {
  name: string;
  requireMaterialDigests: boolean;
  maxFreezeSeconds: number;
  allowPolicyExempt: ArtifactScope[];
}

export interface ArtifactTrustRootSigned {
  schemaVersion: typeof ARTIFACT_TRUST_ROOT_SCHEMA_VERSION;
  version: number;
  issuedAt: string;
  expiresAt: string;
  identities: ArtifactTrustIdentity[];
  sigstoreProfiles: SigstoreTrustProfile[];
  root: ArtifactTrustRole;
  delegations: ArtifactDelegation[];
  revocations: ArtifactRevocation[];
  policy: ArtifactTrustPolicySettings;
}

export interface ArtifactTrustRootSignature {
  identityId?: string;
  sig: string;
}

export interface ArtifactTrustRoot {
  mediaType: typeof ARTIFACT_TRUST_ROOT_MEDIA_TYPE;
  signed: ArtifactTrustRootSigned;
  signatures: ArtifactTrustRootSignature[];
}

export interface TrustedChannelState {
  namespace: string;
  channel: string;
  sequence: number;
  artifactSha256: string;
  version: string;
  verifiedAt: string;
}

export interface ArtifactTrustState {
  schemaVersion: typeof ARTIFACT_TRUST_STATE_SCHEMA_VERSION;
  rootVersion: number;
  rootSha256: string;
  trustedTime: string;
  channels: Record<string, TrustedChannelState>;
}

export interface ThresholdVerification {
  identityIds: string[];
  independenceGroups: string[];
  threshold: number;
  satisfied: boolean;
}

export interface RootBootstrapResult {
  root: ArtifactTrustRoot;
  rootSha256: string;
  authorizedIdentities: string[];
  state: ArtifactTrustState;
}

export interface RootTransitionResult {
  rootSha256: string;
  oldAuthorizedIdentities: string[];
  newAuthorizedIdentities: string[];
  state: ArtifactTrustState;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  if (unknown.length > 0) throw new Error(`${label} contains unknown field '${unknown[0]}'`);
}

function assertIsoDate(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be an RFC 3339 date-time`);
  return parsed;
}

function assertUniqueStrings(values: string[], label: string): void {
  if (!Array.isArray(values) || values.length === 0 || values.some(value => typeof value !== 'string' || value.length === 0)) {
    throw new Error(`${label} must contain at least one non-empty string`);
  }
  if (new Set(values).size !== values.length) throw new Error(`${label} must not contain duplicates`);
}

function assertScope(scope: ArtifactScope, label: string): void {
  if (!isRecord(scope)) throw new Error(`${label} must be an object`);
  assertKeys(scope, ['assetTypes', 'namespaces', 'channels'], label);
  assertUniqueStrings(scope.assetTypes, `${label}.assetTypes`);
  assertUniqueStrings(scope.namespaces, `${label}.namespaces`);
  assertUniqueStrings(scope.channels, `${label}.channels`);
}

function patternMatches(pattern: string, value: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) return value.startsWith(pattern.slice(0, -1));
  return pattern === value;
}

function patternContains(parent: string, child: string): boolean {
  if (parent === '*') return true;
  if (!parent.endsWith('*')) return parent === child;
  const prefix = parent.slice(0, -1);
  return child.startsWith(prefix);
}

function dimensionContains(parent: string[], child: string[]): boolean {
  return child.every(childPattern => parent.some(parentPattern => patternContains(parentPattern, childPattern)));
}

export function scopeContains(parent: ArtifactScope, child: ArtifactScope): boolean {
  return dimensionContains(parent.assetTypes, child.assetTypes)
    && dimensionContains(parent.namespaces, child.namespaces)
    && dimensionContains(parent.channels, child.channels);
}

export function scopeMatches(
  scope: ArtifactScope,
  input: { assetType: string; namespace: string; channel: string },
): boolean {
  return scope.assetTypes.some(pattern => patternMatches(pattern, input.assetType))
    && scope.namespaces.some(pattern => patternMatches(pattern, input.namespace))
    && scope.channels.some(pattern => patternMatches(pattern, input.channel));
}

/** RFC 8785-compatible for JSON values accepted by AIWG metadata schemas. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Canonical JSON does not permit non-finite numbers');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(entry => canonicalJson(entry)).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new Error(`Canonical JSON cannot encode ${typeof value}`);
}

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function dssePae(payloadType: string, payload: Uint8Array): Buffer {
  const type = Buffer.from(payloadType, 'utf8');
  const body = Buffer.from(payload);
  return Buffer.concat([
    Buffer.from(`DSSEv1 ${type.length} `, 'utf8'),
    type,
    Buffer.from(` ${body.length} `, 'utf8'),
    body,
  ]);
}

export function decodeBase64(value: string, label: string): Buffer {
  if (BASE64_PATTERN.test(value)) {
    const decoded = Buffer.from(value, 'base64');
    if (decoded.toString('base64') !== value) throw new Error(`${label} is not canonical standard base64`);
    return decoded;
  }
  if (!BASE64URL_PATTERN.test(value)) throw new Error(`${label} must use valid standard or URL-safe base64`);
  const unpadded = value.replace(/=+$/, '');
  if (unpadded.length % 4 === 1) throw new Error(`${label} has an invalid base64 length`);
  const requiredPadding = (4 - (unpadded.length % 4)) % 4;
  const suppliedPadding = value.length - unpadded.length;
  if (suppliedPadding !== 0 && suppliedPadding !== requiredPadding) throw new Error(`${label} has invalid base64 padding`);
  const decoded = Buffer.from(unpadded, 'base64url');
  if (decoded.toString('base64url') !== unpadded) throw new Error(`${label} is not canonical URL-safe base64`);
  return decoded;
}

export function publicKeyObject(publicKey: string): KeyObject {
  if (publicKey.includes('-----BEGIN')) return createPublicKey(publicKey);
  return createPublicKey({ key: decodeBase64(publicKey, 'publicKey'), format: 'der', type: 'spki' });
}

export function publicKeyFingerprint(publicKey: string): string {
  const key = publicKeyObject(publicKey);
  const der = key.export({ format: 'der', type: 'spki' });
  return sha256(der);
}

export function verifyBytes(
  algorithm: SignatureAlgorithm,
  publicKey: string,
  payload: Uint8Array,
  signature: Uint8Array,
): boolean {
  const key = publicKeyObject(publicKey);
  if (algorithm === 'ed25519') return verifySignature(null, payload, key, signature);
  if (algorithm === 'ecdsa-p256-sha256') return verifySignature('sha256', payload, key, signature);
  return verifySignature('sha256', payload, {
    key,
    padding: cryptoConstants.RSA_PKCS1_PSS_PADDING,
    saltLength: cryptoConstants.RSA_PSS_SALTLEN_DIGEST,
  }, signature);
}

function validateRole(
  role: ArtifactTrustRole,
  label: string,
  identities: Map<string, ArtifactTrustIdentity>,
  requirePublicKeys: boolean,
): void {
  if (!isRecord(role)) throw new Error(`${label} must be an object`);
  assertKeys(role, label.startsWith('delegation')
    ? ['id', 'parent', 'keyIds', 'threshold', 'scope', 'notBefore', 'expiresAt']
    : ['keyIds', 'threshold', 'scope'], label);
  assertUniqueStrings(role.keyIds, `${label}.keyIds`);
  if (!Number.isInteger(role.threshold) || role.threshold < 1) throw new Error(`${label}.threshold must be a positive integer`);
  assertScope(role.scope, `${label}.scope`);
  const groups = new Set<string>();
  for (const id of role.keyIds) {
    const identity = identities.get(id);
    if (!identity) throw new Error(`${label} references unknown identity '${id}'`);
    if (requirePublicKeys && identity.kind !== 'public-key') throw new Error(`${label} root identities must use public keys`);
    groups.add(identity.independenceGroup);
  }
  if (role.threshold > groups.size) {
    throw new Error(`${label}.threshold exceeds the number of independent identities`);
  }
}

export function validateTrustRoot(root: ArtifactTrustRoot): void {
  if (!isRecord(root)) throw new Error('trust root must be an object');
  assertKeys(root, ['mediaType', 'signed', 'signatures'], 'trust root');
  if (root.mediaType !== ARTIFACT_TRUST_ROOT_MEDIA_TYPE) throw new Error('unsupported trust-root media type');
  if (!isRecord(root.signed)) throw new Error('trust root signed payload must be an object');
  assertKeys(root.signed, ['schemaVersion', 'version', 'issuedAt', 'expiresAt', 'identities', 'sigstoreProfiles', 'root', 'delegations', 'revocations', 'policy'], 'trust root signed payload');
  if (root.signed.schemaVersion !== ARTIFACT_TRUST_ROOT_SCHEMA_VERSION) throw new Error('unsupported trust-root schema version');
  if (!Number.isInteger(root.signed.version) || root.signed.version < 1) throw new Error('root version must be a positive integer');
  const issuedAt = assertIsoDate(root.signed.issuedAt, 'root.issuedAt');
  const expiresAt = assertIsoDate(root.signed.expiresAt, 'root.expiresAt');
  if (expiresAt <= issuedAt) throw new Error('root expiry must be after issuance');
  if (!Array.isArray(root.signed.identities) || root.signed.identities.length === 0) throw new Error('root identities must not be empty');
  const identities = new Map<string, ArtifactTrustIdentity>();
  const authorities = new Map<string, string>();
  for (const identity of root.signed.identities) {
    if (!isRecord(identity) || typeof identity.id !== 'string' || !identity.id) throw new Error('identity.id is required');
    if (identities.has(identity.id)) throw new Error(`duplicate identity '${identity.id}'`);
    if (typeof identity.independenceGroup !== 'string' || !identity.independenceGroup) {
      throw new Error(`identity '${identity.id}' requires independenceGroup`);
    }
    if (identity.kind === 'public-key') {
      assertKeys(identity, ['id', 'independenceGroup', 'kind', 'algorithm', 'publicKey'], `identity '${identity.id}'`);
      if (!['ed25519', 'ecdsa-p256-sha256', 'rsa-pss-sha256'].includes(identity.algorithm)) {
        throw new Error(`identity '${identity.id}' has unsupported algorithm`);
      }
      publicKeyObject(identity.publicKey);
      const authority = `public-key:${publicKeyFingerprint(identity.publicKey)}`;
      if (authorities.has(authority)) throw new Error(`identity '${identity.id}' duplicates cryptographic authority '${authorities.get(authority)}'`);
      authorities.set(authority, identity.id);
    } else if (identity.kind === 'sigstore') {
      assertKeys(identity, ['id', 'independenceGroup', 'kind', 'profile', 'subjectAlternativeName', 'issuer'], `identity '${identity.id}'`);
      if (!identity.profile || !identity.subjectAlternativeName) throw new Error(`Sigstore identity '${identity.id}' is incomplete`);
      try {
        new RegExp(identity.subjectAlternativeName, 'u');
      } catch (error) {
        throw new Error(`Sigstore identity '${identity.id}' has invalid subjectAlternativeName: ${String(error)}`);
      }
      const authority = `sigstore:${identity.profile}:${identity.issuer ?? ''}:${identity.subjectAlternativeName}`;
      if (authorities.has(authority)) throw new Error(`identity '${identity.id}' duplicates cryptographic authority '${authorities.get(authority)}'`);
      authorities.set(authority, identity.id);
    } else {
      throw new Error(`identity '${identity.id}' has unsupported kind`);
    }
    identities.set(identity.id, identity as ArtifactTrustIdentity);
  }

  if (!Array.isArray(root.signed.sigstoreProfiles)) throw new Error('sigstoreProfiles must be an array');
  const profiles = new Set<string>();
  for (const profile of root.signed.sigstoreProfiles) {
    if (!isRecord(profile) || typeof profile.id !== 'string' || !profile.id) throw new Error('Sigstore profile id is required');
    assertKeys(profile, ['id', 'trustedRoot', 'tlogThreshold', 'ctlogThreshold', 'timestampThreshold'], `Sigstore profile '${profile.id}'`);
    if (profiles.has(profile.id)) throw new Error(`duplicate Sigstore profile '${profile.id}'`);
    if (!isRecord(profile.trustedRoot)) throw new Error(`Sigstore profile '${profile.id}' requires trustedRoot`);
    for (const field of ['tlogThreshold', 'ctlogThreshold', 'timestampThreshold'] as const) {
      if (!Number.isInteger(profile[field]) || profile[field] < 0) throw new Error(`Sigstore profile '${profile.id}' ${field} must be non-negative`);
    }
    profiles.add(profile.id);
  }
  for (const identity of identities.values()) {
    if (identity.kind === 'sigstore' && !profiles.has(identity.profile)) {
      throw new Error(`Sigstore identity '${identity.id}' references unknown profile '${identity.profile}'`);
    }
  }

  validateRole(root.signed.root, 'root role', identities, true);
  if (!Array.isArray(root.signed.delegations)) throw new Error('delegations must be an array');
  const delegations = new Map<string, ArtifactDelegation>();
  for (const delegation of root.signed.delegations) {
    if (!isRecord(delegation) || typeof delegation.id !== 'string' || !delegation.id) throw new Error('delegation.id is required');
    if (delegations.has(delegation.id) || delegation.id === 'root') throw new Error(`duplicate or reserved delegation '${delegation.id}'`);
    validateRole(delegation, `delegation '${delegation.id}'`, identities, false);
    if (delegation.notBefore) assertIsoDate(delegation.notBefore, `delegation '${delegation.id}'.notBefore`);
    if (delegation.expiresAt) assertIsoDate(delegation.expiresAt, `delegation '${delegation.id}'.expiresAt`);
    if (delegation.notBefore && delegation.expiresAt && Date.parse(delegation.expiresAt) <= Date.parse(delegation.notBefore)) {
      throw new Error(`delegation '${delegation.id}' validity window must be ordered`);
    }
    delegations.set(delegation.id, delegation as ArtifactDelegation);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const verifyParent = (delegation: ArtifactDelegation): void => {
    if (visited.has(delegation.id)) return;
    if (visiting.has(delegation.id)) throw new Error(`delegation cycle at '${delegation.id}'`);
    visiting.add(delegation.id);
    const parent = delegation.parent === 'root' ? root.signed.root : delegations.get(delegation.parent);
    if (!parent) throw new Error(`delegation '${delegation.id}' references unknown parent '${delegation.parent}'`);
    if (delegation.parent !== 'root') verifyParent(parent as ArtifactDelegation);
    if (!scopeContains(parent.scope, delegation.scope)) throw new Error(`delegation '${delegation.id}' expands parent scope`);
    if (delegation.parent !== 'root') {
      const parentDelegation = parent as ArtifactDelegation;
      if (parentDelegation.notBefore && (!delegation.notBefore || Date.parse(delegation.notBefore) < Date.parse(parentDelegation.notBefore))) {
        throw new Error(`delegation '${delegation.id}' expands parent validity window`);
      }
      if (parentDelegation.expiresAt && (!delegation.expiresAt || Date.parse(delegation.expiresAt) > Date.parse(parentDelegation.expiresAt))) {
        throw new Error(`delegation '${delegation.id}' expands parent validity window`);
      }
    }
    visiting.delete(delegation.id);
    visited.add(delegation.id);
  };
  for (const delegation of delegations.values()) verifyParent(delegation);

  if (!Array.isArray(root.signed.revocations)) throw new Error('revocations must be an array');
  for (const revocation of root.signed.revocations) {
    if (!isRecord(revocation) || !identities.has(revocation.identityId)) throw new Error('revocation references an unknown identity');
    assertKeys(revocation, ['identityId', 'effectiveAt', 'compromisedFrom', 'compromisedUntil', 'scope', 'reason'], 'revocation');
    const effectiveAt = assertIsoDate(revocation.effectiveAt, 'revocation.effectiveAt');
    if (revocation.compromisedFrom) assertIsoDate(revocation.compromisedFrom, 'revocation.compromisedFrom');
    if (revocation.compromisedUntil) {
      const until = assertIsoDate(revocation.compromisedUntil, 'revocation.compromisedUntil');
      const from = assertIsoDate(revocation.compromisedFrom ?? revocation.effectiveAt, 'revocation compromise start');
      if (until <= from) throw new Error('revocation compromise interval must be ordered');
    }
    if (!revocation.reason) throw new Error('revocation reason is required');
    assertScope(revocation.scope, 'revocation.scope');
    if (!Number.isFinite(effectiveAt)) throw new Error('revocation effectiveAt is invalid');
  }

  if (!isRecord(root.signed.policy) || !root.signed.policy.name) throw new Error('policy name is required');
  assertKeys(root.signed.policy, ['name', 'requireMaterialDigests', 'maxFreezeSeconds', 'allowPolicyExempt'], 'policy');
  if (typeof root.signed.policy.requireMaterialDigests !== 'boolean') throw new Error('policy requireMaterialDigests must be boolean');
  if (!Number.isInteger(root.signed.policy.maxFreezeSeconds) || root.signed.policy.maxFreezeSeconds < 0) {
    throw new Error('policy maxFreezeSeconds must be a non-negative integer');
  }
  if (!Array.isArray(root.signed.policy.allowPolicyExempt)) throw new Error('policy allowPolicyExempt must be an array');
  root.signed.policy.allowPolicyExempt.forEach((scope, index) => assertScope(scope, `policy.allowPolicyExempt[${index}]`));
  if (!Array.isArray(root.signatures) || root.signatures.length === 0) throw new Error('trust root signatures must not be empty');
  root.signatures.forEach((signature, index) => {
    if (!isRecord(signature)) throw new Error(`trust root signature ${index} must be an object`);
    assertKeys(signature, ['identityId', 'sig'], `trust root signature ${index}`);
    if (typeof signature.sig !== 'string') throw new Error(`trust root signature ${index} requires sig`);
  });
}

export function parseTrustRoot(bytes: Uint8Array): ArtifactTrustRoot {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    throw new Error(`trust root is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  validateTrustRoot(value as ArtifactTrustRoot);
  return value as ArtifactTrustRoot;
}

export function trustRootSigningBytes(root: ArtifactTrustRoot): Buffer {
  return Buffer.from(canonicalJson(root.signed), 'utf8');
}

export function verifyThresholdSignatures(
  payload: Uint8Array,
  signatures: ArtifactTrustRootSignature[],
  allowedIdentityIds: string[],
  threshold: number,
  identities: ArtifactTrustIdentity[],
): ThresholdVerification {
  const allowed = identities.filter((identity): identity is PublicKeyTrustIdentity => (
    allowedIdentityIds.includes(identity.id) && identity.kind === 'public-key'
  ));
  const acceptedIds = new Set<string>();
  const acceptedGroups = new Set<string>();
  for (const signatureRecord of signatures) {
    let signature: Buffer;
    try {
      signature = decodeBase64(signatureRecord.sig, 'signature');
    } catch {
      continue;
    }
    const hinted = signatureRecord.identityId
      ? allowed.filter(identity => identity.id === signatureRecord.identityId)
      : [];
    const candidates = [...hinted, ...allowed.filter(identity => !hinted.includes(identity))];
    for (const identity of candidates) {
      if (acceptedIds.has(identity.id)) continue;
      try {
        if (!verifyBytes(identity.algorithm, identity.publicKey, payload, signature)) continue;
      } catch {
        continue;
      }
      acceptedIds.add(identity.id);
      acceptedGroups.add(identity.independenceGroup);
      break;
    }
  }
  return {
    identityIds: [...acceptedIds].sort(),
    independenceGroups: [...acceptedGroups].sort(),
    threshold,
    satisfied: acceptedGroups.size >= threshold,
  };
}

export function createInitialTrustState(root: ArtifactTrustRoot, rootSha256: string, now: string): ArtifactTrustState {
  return {
    schemaVersion: ARTIFACT_TRUST_STATE_SCHEMA_VERSION,
    rootVersion: root.signed.version,
    rootSha256,
    trustedTime: now,
    channels: {},
  };
}

export function bootstrapTrustRoot(
  rootBytes: Uint8Array,
  expectedSha256: string,
  now = new Date().toISOString(),
): RootBootstrapResult {
  if (!SHA256_PATTERN.test(expectedSha256)) throw new Error('bootstrap fingerprint must be lowercase SHA-256');
  const rootSha256 = sha256(rootBytes);
  if (rootSha256 !== expectedSha256) throw new Error('bootstrap fingerprint does not match the exact trust-root bytes');
  const root = parseTrustRoot(rootBytes);
  const nowMs = assertIsoDate(now, 'bootstrap time');
  if (nowMs < assertIsoDate(root.signed.issuedAt, 'root.issuedAt') || nowMs > assertIsoDate(root.signed.expiresAt, 'root.expiresAt')) {
    throw new Error('initial trust root is outside its validity window');
  }
  const threshold = verifyThresholdSignatures(
    trustRootSigningBytes(root),
    root.signatures,
    root.signed.root.keyIds,
    root.signed.root.threshold,
    root.signed.identities,
  );
  if (!threshold.satisfied) throw new Error('initial trust root does not satisfy its independent signature threshold');
  return {
    root,
    rootSha256,
    authorizedIdentities: threshold.identityIds,
    state: createInitialTrustState(root, rootSha256, now),
  };
}

export function validateTrustState(state: ArtifactTrustState): void {
  if (!isRecord(state) || state.schemaVersion !== ARTIFACT_TRUST_STATE_SCHEMA_VERSION) {
    throw new Error('unsupported trust-state schema version');
  }
  assertKeys(state, ['schemaVersion', 'rootVersion', 'rootSha256', 'trustedTime', 'channels'], 'trust state');
  if (!Number.isInteger(state.rootVersion) || state.rootVersion < 1) throw new Error('trust-state rootVersion must be positive');
  if (!SHA256_PATTERN.test(state.rootSha256)) throw new Error('trust-state rootSha256 is invalid');
  assertIsoDate(state.trustedTime, 'trust-state trustedTime');
  if (!isRecord(state.channels)) throw new Error('trust-state channels must be an object');
  for (const [key, channel] of Object.entries(state.channels)) {
    if (!isRecord(channel) || !channel.namespace || !channel.channel || !channel.version) throw new Error(`trust-state channel '${key}' is incomplete`);
    assertKeys(channel, ['namespace', 'channel', 'sequence', 'artifactSha256', 'version', 'verifiedAt'], `trust-state channel '${key}'`);
    if (key !== channelStateKey(String(channel.namespace), String(channel.channel))) throw new Error(`trust-state channel '${key}' key does not match its scope`);
    if (!Number.isInteger(channel.sequence) || channel.sequence < 1) throw new Error(`trust-state channel '${key}' sequence is invalid`);
    if (!SHA256_PATTERN.test(channel.artifactSha256)) throw new Error(`trust-state channel '${key}' digest is invalid`);
    assertIsoDate(channel.verifiedAt, `trust-state channel '${key}' verifiedAt`);
  }
}

export function parseTrustState(bytes: Uint8Array): ArtifactTrustState {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    throw new Error(`trust state is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  validateTrustState(value as ArtifactTrustState);
  return value as ArtifactTrustState;
}

export function readTrustState(file: string): ArtifactTrustState {
  return parseTrustState(readFileSync(file));
}

export function writeTrustState(file: string, state: ArtifactTrustState): void {
  validateTrustState(state);
  const directory = path.dirname(file);
  mkdirSync(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(file)}.${process.pid}.tmp`);
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, file);
}

export function verifyRootTransition(
  currentBytes: Uint8Array,
  nextBytes: Uint8Array,
  state: ArtifactTrustState,
  now = new Date().toISOString(),
): RootTransitionResult {
  const current = parseTrustRoot(currentBytes);
  validateTrustState(state);
  const currentSha256 = sha256(currentBytes);
  if (state.rootVersion !== current.signed.version) throw new Error('persisted root version does not match the current root');
  if (state.rootSha256 !== currentSha256) throw new Error('persisted root digest does not match the exact current root bytes');
  const next = parseTrustRoot(nextBytes);
  if (next.signed.version !== current.signed.version + 1) {
    throw new Error('root update must be exactly the next version; rollback and fast-forward are rejected');
  }
  const nowMs = assertIsoDate(now, 'root update time');
  if (nowMs < Date.parse(state.trustedTime)) throw new Error('root update time predates persisted trusted time');
  if (nowMs > assertIsoDate(current.signed.expiresAt, 'current root expiry')) throw new Error('current root is expired');
  if (nowMs < assertIsoDate(next.signed.issuedAt, 'next root issuance') || nowMs > assertIsoDate(next.signed.expiresAt, 'next root expiry')) {
    throw new Error('next root is outside its validity window');
  }
  if (Date.parse(next.signed.issuedAt) < Date.parse(current.signed.issuedAt)) throw new Error('next root issuance cannot predate the current root');
  const payload = trustRootSigningBytes(next);
  const oldThreshold = verifyThresholdSignatures(
    payload,
    next.signatures,
    current.signed.root.keyIds,
    current.signed.root.threshold,
    current.signed.identities,
  );
  const newThreshold = verifyThresholdSignatures(
    payload,
    next.signatures,
    next.signed.root.keyIds,
    next.signed.root.threshold,
    next.signed.identities,
  );
  if (!oldThreshold.satisfied || !newThreshold.satisfied) {
    throw new Error('root update must satisfy both old and new independent signature thresholds');
  }
  const rootSha256 = sha256(nextBytes);
  return {
    rootSha256,
    oldAuthorizedIdentities: oldThreshold.identityIds,
    newAuthorizedIdentities: newThreshold.identityIds,
    state: {
      ...state,
      rootVersion: next.signed.version,
      rootSha256,
      trustedTime: new Date(Math.max(Date.parse(state.trustedTime), nowMs)).toISOString(),
    },
  };
}

export function channelStateKey(namespace: string, channel: string): string {
  return `${encodeURIComponent(namespace)}::${encodeURIComponent(channel)}`;
}

export function selectDelegations(
  root: ArtifactTrustRoot,
  input: { assetType: string; namespace: string; channel: string; now: string },
): ArtifactDelegation[] {
  const nowMs = assertIsoDate(input.now, 'verification time');
  return root.signed.delegations.filter(delegation => {
    if (!scopeMatches(delegation.scope, input)) return false;
    if (delegation.notBefore && nowMs < Date.parse(delegation.notBefore)) return false;
    if (delegation.expiresAt && nowMs > Date.parse(delegation.expiresAt)) return false;
    return true;
  });
}

export function isIdentityRevoked(
  root: ArtifactTrustRoot,
  identityId: string,
  input: { assetType: string; namespace: string; channel: string; issuedAt: string; now: string },
): ArtifactRevocation | undefined {
  const issuedAt = assertIsoDate(input.issuedAt, 'artifact issuedAt');
  const now = assertIsoDate(input.now, 'verification time');
  return root.signed.revocations.find(revocation => {
    if (revocation.identityId !== identityId || !scopeMatches(revocation.scope, input)) return false;
    const effectiveAt = Date.parse(revocation.effectiveAt);
    const from = Date.parse(revocation.compromisedFrom ?? revocation.effectiveAt);
    const until = revocation.compromisedUntil ? Date.parse(revocation.compromisedUntil) : Number.POSITIVE_INFINITY;
    return now >= effectiveAt || (issuedAt >= from && issuedAt <= until);
  });
}
