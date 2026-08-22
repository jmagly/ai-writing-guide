import {
  ARTIFACT_TRUST_STATE_SCHEMA_VERSION,
  canonicalJson,
  channelStateKey,
  decodeBase64,
  dssePae,
  isIdentityRevoked,
  parseTrustRoot,
  publicKeyFingerprint,
  scopeMatches,
  selectDelegations,
  sha256,
  validateTrustState,
  verifyBytes,
  type ArtifactTrustIdentity,
  type ArtifactTrustRoot,
  type ArtifactTrustState,
  type SigstoreTrustIdentity,
} from './artifact-trust.js';

export const ARTIFACT_VERIFICATION_RESULT_SCHEMA_VERSION = 'aiwg.verify.result.v1';

export const ARTIFACT_VERIFICATION_EXIT_CODES = {
  verified: 0,
  'policy-exempt': 20,
  unsigned: 21,
  'unknown-signer': 22,
  expired: 23,
  revoked: 24,
  stale: 25,
  mismatched: 26,
  malformed: 27,
  'offline-evidence-missing': 28,
  'policy-denied': 29,
} as const;

export type ArtifactVerificationStatus = keyof typeof ARTIFACT_VERIFICATION_EXIT_CODES;

export interface ArtifactVerificationDiagnostic {
  code: string;
  message: string;
}

export interface ArtifactVerificationResult {
  schemaVersion: typeof ARTIFACT_VERIFICATION_RESULT_SCHEMA_VERSION;
  status: ArtifactVerificationStatus;
  exitCode: number;
  artifact: { name: string; sha256: string };
  policy?: string;
  identities: string[];
  rootVersion?: number;
  freshness?: {
    namespace: string;
    channel: string;
    sequence: number;
    version: string;
  };
  diagnostics: ArtifactVerificationDiagnostic[];
  nextState?: ArtifactTrustState;
}

export interface ArtifactVerificationInput {
  artifactBytes: Uint8Array;
  artifactName: string;
  attestation: unknown;
  rootBytes: Uint8Array;
  state?: ArtifactTrustState;
  materials?: ReadonlyMap<string, Uint8Array>;
  expectedScope?: { assetType: string; namespace: string; channel: string };
  offline?: boolean;
  now?: string;
}

type Envelope = {
  payloadType: string;
  payload: string;
  signatures: Array<{ keyid?: string; sig: string }>;
};

type Provenance = {
  _type: string;
  subject: Array<{ name: string; digest: { sha256: string } }>;
  predicateType: string;
  predicate: {
    schemaVersion: string;
    assetType: string;
    publisher: { id: string; namespace: string; role?: string };
    publication: { version: string; channel: string; sequence: number };
    issuedAt: string;
    notBefore?: string;
    expiresAt?: string;
    derivation?: { materials: Array<{ name?: string; uri: string; mediaType?: string; digest: { sha256: string } }> };
  };
};

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  if (unknown.length > 0) throw new Error(`${label} contains unknown field '${unknown[0]}'`);
}

function result(
  status: ArtifactVerificationStatus,
  input: ArtifactVerificationInput,
  diagnostics: ArtifactVerificationDiagnostic[],
  extras: Partial<ArtifactVerificationResult> = {},
): ArtifactVerificationResult {
  return {
    schemaVersion: ARTIFACT_VERIFICATION_RESULT_SCHEMA_VERSION,
    status,
    exitCode: ARTIFACT_VERIFICATION_EXIT_CODES[status],
    artifact: { name: input.artifactName, sha256: sha256(input.artifactBytes) },
    identities: [],
    diagnostics,
    ...extras,
  };
}

function parseEnvelope(attestation: unknown): { envelope: Envelope; material?: Record<string, unknown> } {
  if (!record(attestation) || attestation.mediaType !== 'application/vnd.aiwg.artifact-attestation.v1+json') {
    throw new Error('unsupported or missing attestation mediaType');
  }
  exactKeys(attestation, ['mediaType', 'envelope', 'verificationMaterial'], 'attestation');
  if (!record(attestation.envelope)) throw new Error('attestation envelope is missing');
  const envelope = attestation.envelope;
  exactKeys(envelope, ['payloadType', 'payload', 'signatures'], 'DSSE envelope');
  if (envelope.payloadType !== 'application/vnd.in-toto+json' || typeof envelope.payload !== 'string') {
    throw new Error('unsupported DSSE payload type or payload');
  }
  if (!Array.isArray(envelope.signatures)) throw new Error('DSSE signatures must be an array');
  const signatures = envelope.signatures.map((entry, index) => {
    if (!record(entry) || typeof entry.sig !== 'string') throw new Error(`DSSE signature ${index} is malformed`);
    exactKeys(entry, ['keyid', 'sig'], `DSSE signature ${index}`);
    if (entry.keyid !== undefined && typeof entry.keyid !== 'string') throw new Error(`DSSE signature ${index} keyid is malformed`);
    if (decodeBase64(entry.sig, `DSSE signature ${index}`).length === 0) throw new Error(`DSSE signature ${index} must not be empty`);
    return { sig: entry.sig, ...(entry.keyid ? { keyid: entry.keyid } : {}) };
  });
  if (attestation.verificationMaterial !== undefined && !record(attestation.verificationMaterial)) {
    throw new Error('verificationMaterial must be an object');
  }
  const material = attestation.verificationMaterial as Record<string, unknown> | undefined;
  if (material) {
    if (material.kind === 'sigstore-bundle') {
      exactKeys(material, ['kind', 'mediaType', 'bundle'], 'Sigstore verification material');
      if (typeof material.mediaType !== 'string' || !record(material.bundle)) throw new Error('Sigstore verification material is incomplete');
    } else if (material.kind === 'public-key') {
      exactKeys(material, ['kind', 'algorithm', 'publicKey'], 'public-key verification material');
      if (!['ed25519', 'ecdsa-p256-sha256', 'rsa-pss-sha256'].includes(String(material.algorithm)) || typeof material.publicKey !== 'string' || !material.publicKey) throw new Error('public-key verification material is incomplete');
    } else if (material.kind === 'detached') {
      exactKeys(material, ['kind', 'mediaType', 'uri', 'sha256', 'bytes'], 'detached verification material');
      if (typeof material.mediaType !== 'string' || typeof material.uri !== 'string' || typeof material.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(material.sha256) || !Number.isInteger(material.bytes) || Number(material.bytes) < 1) throw new Error('detached verification material is incomplete');
    } else {
      throw new Error('verificationMaterial has an unsupported kind');
    }
  }
  return {
    envelope: { payloadType: envelope.payloadType, payload: envelope.payload, signatures },
    material,
  };
}

function parseProvenance(payload: Uint8Array): Provenance {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(payload).toString('utf8'));
  } catch (error) {
    throw new Error(`signed payload is not JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!record(value)
    || value._type !== 'https://in-toto.io/Statement/v1'
    || value.predicateType !== 'https://aiwg.io/attestations/artifact-provenance/v1'
    || !Array.isArray(value.subject) || value.subject.length === 0
    || !record(value.predicate)) throw new Error('signed payload is not an AIWG provenance Statement v1');
  exactKeys(value, ['_type', 'subject', 'predicateType', 'predicate'], 'Statement');
  const predicate = value.predicate;
  exactKeys(predicate, ['schemaVersion', 'assetType', 'publisher', 'publication', 'issuedAt', 'notBefore', 'expiresAt', 'derivation', 'provenanceGraph', 'dependencies'], 'provenance predicate');
  if (predicate.schemaVersion !== 'aiwg.artifact-provenance.v1'
    || typeof predicate.assetType !== 'string'
    || !record(predicate.publisher)
    || !record(predicate.publication)
    || typeof predicate.publisher.id !== 'string'
    || typeof predicate.publisher.namespace !== 'string'
    || typeof predicate.publication.channel !== 'string'
    || typeof predicate.publication.version !== 'string'
    || !Number.isInteger(predicate.publication.sequence) || Number(predicate.publication.sequence) < 1
    || typeof predicate.issuedAt !== 'string') throw new Error('signed provenance predicate is incomplete');
  if (!predicate.assetType || !predicate.publisher.id || !predicate.publisher.namespace || !predicate.publication.channel || !predicate.publication.version) throw new Error('signed provenance predicate strings must not be empty');
  exactKeys(predicate.publisher, ['id', 'namespace', 'role'], 'publisher');
  exactKeys(predicate.publication, ['version', 'channel', 'sequence', 'sourceUri', 'collection', 'supersedes'], 'publication');
  for (const dateField of ['issuedAt', 'notBefore', 'expiresAt'] as const) {
    if (predicate[dateField] !== undefined && !Number.isFinite(Date.parse(String(predicate[dateField])))) throw new Error(`${dateField} is invalid`);
  }
  const issuedAt = Date.parse(predicate.issuedAt);
  if (predicate.notBefore && predicate.expiresAt && Date.parse(String(predicate.expiresAt)) <= Date.parse(String(predicate.notBefore))) throw new Error('provenance validity window must be ordered');
  if (predicate.expiresAt && Date.parse(String(predicate.expiresAt)) <= issuedAt) throw new Error('provenance expiry must follow issuance');
  const validateDescriptor = (descriptor: unknown, label: string): void => {
    if (!record(descriptor) || typeof descriptor.name !== 'string' || !descriptor.name || !record(descriptor.digest) || typeof descriptor.digest.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(descriptor.digest.sha256)) {
      throw new Error(`${label} is malformed`);
    }
    exactKeys(descriptor, ['name', 'uri', 'mediaType', 'digest'], label);
    exactKeys(descriptor.digest, ['sha256'], `${label} digest`);
  };
  for (const subject of value.subject) {
    validateDescriptor(subject, 'subject');
  }
  for (const field of ['collection', 'supersedes'] as const) {
    if (predicate.publication[field] !== undefined) validateDescriptor(predicate.publication[field], `publication ${field}`);
  }
  if (predicate.dependencies !== undefined) {
    if (!Array.isArray(predicate.dependencies)) throw new Error('dependencies must be an array');
    predicate.dependencies.forEach((dependency, index) => validateDescriptor(dependency, `dependency ${index}`));
  }
  if (predicate.derivation !== undefined) {
    if (!record(predicate.derivation) || !record(predicate.derivation.builder) || !Array.isArray(predicate.derivation.materials)) throw new Error('derivation is malformed');
    exactKeys(predicate.derivation, ['builder', 'transformation', 'materials', 'reproducible', 'invocationId'], 'derivation');
    exactKeys(predicate.derivation.builder, ['id', 'version'], 'derivation builder');
    if (typeof predicate.derivation.builder.id !== 'string' || !predicate.derivation.builder.id || predicate.derivation.materials.length === 0) throw new Error('derivation builder/materials are incomplete');
    if (predicate.derivation.transformation !== undefined) {
      if (!record(predicate.derivation.transformation)) throw new Error('derivation transformation is malformed');
      exactKeys(predicate.derivation.transformation, ['id', 'version', 'provider'], 'derivation transformation');
      if (typeof predicate.derivation.transformation.id !== 'string' || typeof predicate.derivation.transformation.version !== 'string') throw new Error('derivation transformation is incomplete');
    }
    for (const material of predicate.derivation.materials) {
      if (!record(material) || typeof material.uri !== 'string' || !record(material.digest) || typeof material.digest.sha256 !== 'string') throw new Error('derivation material is malformed');
      exactKeys(material, ['name', 'uri', 'mediaType', 'digest'], 'derivation material');
      if (material.name !== undefined && (typeof material.name !== 'string' || !material.name)) throw new Error('derivation material name is malformed');
      if (material.mediaType !== undefined && (typeof material.mediaType !== 'string' || !material.mediaType)) throw new Error('derivation material mediaType is malformed');
      exactKeys(material.digest, ['sha256'], 'derivation material digest');
      if (!/^[a-f0-9]{64}$/.test(material.digest.sha256)) throw new Error('derivation material SHA-256 is malformed');
    }
  }
  if (predicate.provenanceGraph !== undefined) {
    if (!record(predicate.provenanceGraph)) throw new Error('provenanceGraph is malformed');
    exactKeys(predicate.provenanceGraph, ['standard', 'uri', 'sha256'], 'provenanceGraph');
    if (predicate.provenanceGraph.standard !== 'W3C-PROV' || typeof predicate.provenanceGraph.uri !== 'string' || typeof predicate.provenanceGraph.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(predicate.provenanceGraph.sha256)) throw new Error('provenanceGraph is incomplete');
  }
  return value as unknown as Provenance;
}

function isExecutionAsset(assetType: string): boolean {
  return new Set([
    'setup-manifest', 'agentic-flow', 'agent', 'skill', 'command', 'rule', 'behavior',
    'tool', 'mcp-server', 'hook', 'workflow', 'profile', 'plugin', 'generated-provider-artifact',
  ]).has(assetType);
}

async function verifySigstore(
  identity: SigstoreTrustIdentity,
  root: ArtifactTrustRoot,
  material: Record<string, unknown> | undefined,
  envelope: Envelope,
): Promise<string | undefined> {
  if (material?.kind !== 'sigstore-bundle' || !record(material.bundle)) return undefined;
  const profile = root.signed.sigstoreProfiles.find(candidate => candidate.id === identity.profile);
  if (!profile) return undefined;
  try {
    const [{ bundleFromJSON, isBundleWithDsseEnvelope }, { TrustedRoot }, { Verifier, toSignedEntity, toTrustMaterial }] = await Promise.all([
      // @ts-ignore -- runtime-optional; metadata CI intentionally installs with --omit=optional.
      import('@sigstore/bundle'),
      // @ts-ignore -- runtime-optional; verifySigstore fails closed when unavailable.
      import('@sigstore/protobuf-specs'),
      // @ts-ignore -- runtime-optional; verifySigstore fails closed when unavailable.
      import('@sigstore/verify'),
    ]);
    const bundle = bundleFromJSON(material.bundle);
    if (!isBundleWithDsseEnvelope(bundle)) return undefined;
    const bundled = bundle.content.dsseEnvelope;
    if (bundled.payloadType !== envelope.payloadType || !Buffer.from(bundled.payload).equals(decodeBase64(envelope.payload, 'DSSE payload'))) return undefined;
    if (bundled.signatures.length !== envelope.signatures.length) return undefined;
    for (let index = 0; index < bundled.signatures.length; index += 1) {
      if (!Buffer.from(bundled.signatures[index].sig).equals(decodeBase64(envelope.signatures[index].sig, 'DSSE signature'))) return undefined;
    }
    const trustedRoot = TrustedRoot.fromJSON(profile.trustedRoot);
    const verifier = new Verifier(toTrustMaterial(trustedRoot), {
      tlogThreshold: profile.tlogThreshold,
      ctlogThreshold: profile.ctlogThreshold,
      timestampThreshold: profile.timestampThreshold,
    });
    const signer = verifier.verify(toSignedEntity(bundle), {
      subjectAlternativeName: identity.subjectAlternativeName,
      ...(identity.issuer ? { extensions: { issuer: identity.issuer } } : {}),
    });
    return sha256(signer.key.export({ format: 'der', type: 'spki' }));
  } catch {
    return undefined;
  }
}

async function verifiedIdentities(
  identities: ArtifactTrustIdentity[],
  envelope: Envelope,
  pae: Uint8Array,
  root: ArtifactTrustRoot,
  material: Record<string, unknown> | undefined,
): Promise<ArtifactTrustIdentity[]> {
  const verified: ArtifactTrustIdentity[] = [];
  const proofs = new Set<string>();
  for (const identity of identities) {
    let accepted = false;
    let proof = '';
    if (identity.kind === 'public-key') {
      for (const signature of envelope.signatures) {
        try {
          if (verifyBytes(identity.algorithm, identity.publicKey, pae, decodeBase64(signature.sig, 'DSSE signature'))) {
            accepted = true;
            proof = `public-key:${publicKeyFingerprint(identity.publicKey)}`;
            break;
          }
        } catch { /* malformed signatures do not authenticate */ }
      }
    } else {
      const signerFingerprint = await verifySigstore(identity, root, material, envelope);
      accepted = Boolean(signerFingerprint);
      proof = signerFingerprint ? `sigstore:${signerFingerprint}` : '';
    }
    if (accepted && !proofs.has(proof)) {
      proofs.add(proof);
      verified.push(identity);
    }
  }
  return verified;
}

export async function verifyArtifact(input: ArtifactVerificationInput): Promise<ArtifactVerificationResult> {
  let root: ArtifactTrustRoot;
  let envelope: Envelope;
  let material: Record<string, unknown> | undefined;
  let payload: Buffer;
  const now = input.now ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  try {
    root = parseTrustRoot(input.rootBytes);
    if (input.state) validateTrustState(input.state);
    ({ envelope, material } = parseEnvelope(input.attestation));
    payload = decodeBase64(envelope.payload, 'DSSE payload');
    if (!Number.isFinite(nowMs)) throw new Error('verification time is invalid');
  } catch (error) {
    return result('malformed', input, [{ code: 'MALFORMED_INPUT', message: error instanceof Error ? error.message : String(error) }]);
  }

  const common = { policy: root.signed.policy.name, rootVersion: root.signed.version };
  if (nowMs < Date.parse(root.signed.issuedAt) || nowMs > Date.parse(root.signed.expiresAt)) {
    return result('expired', input, [{ code: 'ROOT_TIME_WINDOW', message: 'The active trust root is outside its validity window' }], common);
  }
  if (envelope.signatures.length === 0) {
    const scoped = input.expectedScope && root.signed.policy.allowPolicyExempt.some(scope => scopeMatches(scope, input.expectedScope!));
    if (scoped && !isExecutionAsset(input.expectedScope!.assetType)) {
      if (!input.state) return result(input.offline ? 'offline-evidence-missing' : 'policy-denied', input, [{
        code: 'TRUST_STATE_REQUIRED', message: 'A policy exemption requires bootstrapped trust state',
      }], common);
      if (input.state.rootVersion !== root.signed.version || input.state.rootSha256 !== sha256(input.rootBytes)) {
        return result('mismatched', input, [{ code: 'TRUST_STATE_MISMATCH', message: 'Persisted state does not match the exact active trust root' }], common);
      }
      if (nowMs < Date.parse(input.state.trustedTime)) return result('stale', input, [{ code: 'CLOCK_ROLLBACK', message: 'Verification time predates persisted trusted time' }], common);
      return result('policy-exempt', input, [{ code: 'EXPLICIT_POLICY_EXEMPTION', message: 'Unsigned non-executable asset is explicitly exempted by policy' }], common);
    }
    return result('unsigned', input, [{ code: 'SIGNATURE_REQUIRED', message: 'The attestation has no signatures' }], common);
  }

  if (material?.kind === 'detached') {
    const uri = String(material.uri);
    const detached = input.materials?.get(uri);
    if (!detached) return result(input.offline ? 'offline-evidence-missing' : 'policy-denied', input, [{
      code: 'DETACHED_VERIFICATION_MATERIAL_MISSING', message: `Detached verification material is unavailable: ${uri}`,
    }], common);
    if (detached.length !== Number(material.bytes) || sha256(detached) !== material.sha256) return result('mismatched', input, [{
      code: 'DETACHED_VERIFICATION_MATERIAL_MISMATCH', message: `Detached verification material does not match its signed descriptor: ${uri}`,
    }], common);
    if (!String(material.mediaType).startsWith('application/vnd.dev.sigstore.bundle.')) return result('policy-denied', input, [{
      code: 'DETACHED_VERIFICATION_MATERIAL_UNSUPPORTED', message: `Unsupported detached verification material type: ${String(material.mediaType)}`,
    }], common);
    try {
      const bundle = JSON.parse(Buffer.from(detached).toString('utf8')) as unknown;
      if (!record(bundle)) throw new Error('bundle is not an object');
      material = { kind: 'sigstore-bundle', mediaType: material.mediaType, bundle };
    } catch (error) {
      return result('malformed', input, [{
        code: 'DETACHED_VERIFICATION_MATERIAL_MALFORMED',
        message: error instanceof Error ? error.message : String(error),
      }], common);
    }
  }

  // Authenticate the exact payload bytes before parsing any signed claims. A
  // keyid is only a lookup hint; every trust-root identity remains a candidate.
  const allAuthenticated = await verifiedIdentities(
    root.signed.identities,
    envelope,
    dssePae(envelope.payloadType, payload),
    root,
    material,
  );
  if (allAuthenticated.length === 0) {
    if (input.offline && !material) return result('offline-evidence-missing', input, [{
      code: 'OFFLINE_VERIFICATION_MATERIAL_MISSING',
      message: 'Portable verification material is unavailable in offline mode',
    }], common);
    return result('unknown-signer', input, [{
      code: 'UNKNOWN_SIGNER',
      message: 'No trusted identity verified the signature; unauthenticated keyid and outer metadata were ignored',
    }], common);
  }

  let statement: Provenance;
  try { statement = parseProvenance(payload); } catch (error) {
    return result('malformed', input, [{ code: 'MALFORMED_SIGNED_PAYLOAD', message: error instanceof Error ? error.message : String(error) }], {
      ...common,
      identities: allAuthenticated.map(identity => identity.id).sort(),
    });
  }
  if (!Buffer.from(canonicalJson(statement), 'utf8').equals(payload)) {
    return result('mismatched', input, [{ code: 'NONCANONICAL_SIGNED_PAYLOAD', message: 'Signed provenance payload is not canonical JSON' }], {
      ...common,
      identities: allAuthenticated.map(identity => identity.id).sort(),
    });
  }
  const scopeInput = {
    assetType: statement.predicate.assetType,
    namespace: statement.predicate.publisher.namespace,
    channel: statement.predicate.publication.channel,
    now,
  };
  if (input.expectedScope && (
    input.expectedScope.assetType !== scopeInput.assetType
    || input.expectedScope.namespace !== scopeInput.namespace
    || input.expectedScope.channel !== scopeInput.channel
  )) return result('policy-denied', input, [{
    code: 'EXPECTED_SCOPE_MISMATCH',
    message: 'Authenticated provenance scope does not match the caller-required scope',
  }], { ...common, identities: allAuthenticated.map(identity => identity.id).sort() });
  const freshness = {
    namespace: scopeInput.namespace,
    channel: scopeInput.channel,
    sequence: statement.predicate.publication.sequence,
    version: statement.predicate.publication.version,
  };
  const scopedDelegations = selectDelegations(root, scopeInput);
  if (scopedDelegations.length === 0) {
    return result('policy-denied', input, [{ code: 'NO_AUTHORIZED_DELEGATION', message: 'No active delegation authorizes this asset scope' }], { ...common, freshness });
  }
  const authorizedIds = new Set(scopedDelegations.flatMap(delegation => delegation.keyIds));
  const authenticated = allAuthenticated.filter(identity => authorizedIds.has(identity.id));
  if (authenticated.length === 0) {
    return result('policy-denied', input, [{
      code: 'SIGNER_OUTSIDE_SCOPE',
      message: 'The authenticated identity is not authorized for this asset scope',
    }], { ...common, identities: allAuthenticated.map(identity => identity.id).sort(), freshness });
  }
  const satisfied = scopedDelegations.find(delegation => {
    const groups = new Set(authenticated
      .filter(identity => delegation.keyIds.includes(identity.id))
      .map(identity => identity.independenceGroup));
    return groups.size >= delegation.threshold;
  });
  const identities = authenticated.map(identity => identity.id).sort();
  if (!satisfied) {
    return result('policy-denied', input, [{ code: 'SIGNATURE_THRESHOLD', message: 'Independent signature threshold was not met' }], { ...common, identities, freshness });
  }
  for (const identity of authenticated) {
    const revocation = isIdentityRevoked(root, identity.id, { ...scopeInput, issuedAt: statement.predicate.issuedAt });
    if (revocation) return result('revoked', input, [{ code: 'IDENTITY_REVOKED', message: revocation.reason }], { ...common, identities, freshness });
  }
  const issuedAt = Date.parse(statement.predicate.issuedAt);
  if (!Number.isFinite(issuedAt)) return result('malformed', input, [{ code: 'INVALID_ISSUED_AT', message: 'issuedAt is invalid' }], { ...common, identities, freshness });
  if ((statement.predicate.notBefore && nowMs < Date.parse(statement.predicate.notBefore))
    || (statement.predicate.expiresAt && nowMs > Date.parse(statement.predicate.expiresAt))) {
    return result('expired', input, [{ code: 'ATTESTATION_TIME_WINDOW', message: 'The attestation is outside its validity window' }], { ...common, identities, freshness });
  }
  const artifactDigest = sha256(input.artifactBytes);
  if (!statement.subject.some(subject => subject.name === input.artifactName && subject.digest.sha256 === artifactDigest)) {
    return result('mismatched', input, [{ code: 'SUBJECT_DIGEST_MISMATCH', message: 'Exact artifact bytes do not match a named signed subject' }], { ...common, identities, freshness });
  }
  for (const signedMaterial of statement.predicate.derivation?.materials ?? []) {
    const bytes = input.materials?.get(signedMaterial.uri);
    if (!bytes) {
      if (root.signed.policy.requireMaterialDigests) return result(input.offline ? 'offline-evidence-missing' : 'policy-denied', input, [{ code: 'MATERIAL_MISSING', message: `Required material is unavailable: ${signedMaterial.uri}` }], { ...common, identities, freshness });
      continue;
    }
    if (sha256(bytes) !== signedMaterial.digest.sha256) return result('mismatched', input, [{ code: 'MATERIAL_DIGEST_MISMATCH', message: `Material bytes do not match: ${signedMaterial.uri}` }], { ...common, identities, freshness });
  }
  if (input.offline && (!input.state || !material)) {
    return result('offline-evidence-missing', input, [{ code: 'OFFLINE_STATE_OR_EVIDENCE_MISSING', message: 'Offline verification requires persisted state and portable verification material' }], { ...common, identities, freshness });
  }
  const state = input.state;
  if (!state) return result(input.offline ? 'offline-evidence-missing' : 'policy-denied', input, [{
    code: 'TRUST_STATE_REQUIRED',
    message: 'Persisted root and freshness state is required; bootstrap the trust root first',
  }], { ...common, identities, freshness });
  {
    if (state.schemaVersion !== ARTIFACT_TRUST_STATE_SCHEMA_VERSION
      || state.rootVersion !== root.signed.version
      || state.rootSha256 !== sha256(input.rootBytes)) {
      return result('mismatched', input, [{ code: 'TRUST_STATE_MISMATCH', message: 'Persisted state does not match the exact active trust root' }], { ...common, identities, freshness });
    }
    if (nowMs < Date.parse(state.trustedTime)) return result('stale', input, [{ code: 'CLOCK_ROLLBACK', message: 'Verification time predates persisted trusted time' }], { ...common, identities, freshness });
    const member = { assetType: scopeInput.assetType, subject: input.artifactName };
    const memberKey = channelStateKey(scopeInput.namespace, scopeInput.channel, member);
    // Pre-member v1 state is conservatively inherited by the first migration.
    // Operators must migrate/reset ambiguous legacy state before adding a
    // distinct collection member; silently ignoring it would permit rollback.
    const legacy = state.channels[channelStateKey(scopeInput.namespace, scopeInput.channel)];
    const prior = state.channels[memberKey] ?? legacy;
    if (prior) {
      if (freshness.sequence < prior.sequence
        || freshness.sequence > prior.sequence + 1
        || (freshness.sequence === prior.sequence && artifactDigest !== prior.artifactSha256)
        || (freshness.sequence === prior.sequence && nowMs - Date.parse(prior.verifiedAt) > root.signed.policy.maxFreezeSeconds * 1000)) {
        return result('stale', input, [{ code: 'SEQUENCE_FRESHNESS', message: 'Rollback, fast-forward, mix-and-match, or freeze protection rejected this artifact' }], { ...common, identities, freshness });
      }
    }
  }
  const nextState: ArtifactTrustState = {
    ...state,
    trustedTime: new Date(Math.max(Date.parse(state.trustedTime), nowMs)).toISOString(),
    channels: {
      ...state.channels,
      [channelStateKey(scopeInput.namespace, scopeInput.channel, {
        assetType: scopeInput.assetType,
        subject: input.artifactName,
      })]: {
        namespace: scopeInput.namespace,
        channel: scopeInput.channel,
        subject: input.artifactName,
        assetType: scopeInput.assetType,
        sequence: freshness.sequence,
        artifactSha256: artifactDigest,
        version: freshness.version,
        verifiedAt: now,
      },
    },
  };
  return result('verified', input, [{ code: 'VERIFIED', message: 'Signature, policy, exact bytes, materials, and freshness checks passed' }], {
    ...common, identities, freshness, nextState,
  });
}
