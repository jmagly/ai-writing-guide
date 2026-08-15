# ADR: Cross-asset attestation envelope

- Status: Accepted
- Date: 2026-08-14
- Issue: [#2068](https://git.integrolabs.net/roctinam/aiwg/issues/2068)
- Decision owners: AIWG maintainers
- Research: [AIWG cross-asset authenticity and provenance](../research/asset-authenticity-and-provenance.md)
- Provenance: [Research derivation record](../research/provenance/asset-authenticity-contract.prov.json)

## Context

AIWG distributes npm packages, release manifests, setup YAML, agentic flows,
frameworks, addons, plugins, agents, skills, rules, schemas, prebuilt indices,
Fortemi shards, marketplace envelopes, website resources, and provider-generated
files. Existing controls are strong but transport-specific: signed Git tags,
npm provenance, Cosign bundles, signed web manifests, and Git-native marketplace
signatures do not expose one verifier status or one policy vocabulary.

Signing bytes alone also leaves rollback, freeze, mix-and-match, delegation,
revocation, threshold, and derivation questions unanswered. The design must not
replace working release controls or claim that provenance makes content safe.

## Decision

AIWG standardizes
`application/vnd.aiwg.artifact-attestation.v1+json` as its portable
cross-asset authenticity object.

1. The object carries a [DSSE
   envelope](https://github.com/secure-systems-lab/dsse/blob/master/protocol.md).
2. DSSE signs an [in-toto Statement
   v1](https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md)
   with predicate type
   `https://aiwg.io/attestations/artifact-provenance/v1`.
3. Every subject digest is SHA-256 over the artifact's exact published bytes.
4. Producers serialize Statements with [RFC
   8785](https://www.rfc-editor.org/rfc/rfc8785). Verifiers check the exact
   decoded payload bytes and never reserialize before DSSE verification.
5. Verification material may be embedded or referenced by digest. Sigstore
   material follows its [client and bundle
   specification](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md).
6. Trust roots, publisher identities, delegated asset/namespace/channel scope,
   thresholds, expiry, revocation, and persisted freshness state are external
   verifier policy.
7. TUF-derived monotonic root/channel versions and expiry protect against
   rollback, freeze, fast-forward, and mix-and-match attacks. AIWG does not
   claim TUF conformance without implementing the complete specification.
8. W3C PROV and SLSA-compatible material descriptors provide lineage. AIWG
   does not claim a SLSA level merely by emitting the predicate.

Single artifacts use the adjacent sidecar
`<artifact>.aiwg-attestation.json`. Signed collections carry a descriptor for
the sidecar. OCI/registry transports may publish the same media type as a
referrer.

## Policy boundary

Only `verified` means that integrity, authority, freshness, and policy passed.
`policy-exempt`, `unsigned`, `unknown-signer`, `expired`, `revoked`, `stale`,
`mismatched`, `malformed`, `offline-evidence-missing`, and `policy-denied` are
distinct stable outcomes. Execution-capable assets cannot be policy-exempt.

Existing release, web-resource, and marketplace verification remains required
during migration. The new envelope is a common policy bridge, not a downgrade
or replacement shortcut.

## Consequences

### Positive

- One result model can cover all asset types and transports.
- Exact-byte digests catch formatting and line-ending changes to YAML.
- DSSE avoids signature verification over parser-dependent reserialization.
- in-toto subjects/predicates interoperate with established attestation tools.
- Sigstore bundles, existing signed manifests, and marketplace provenance can
  be bridged rather than discarded.
- Provider directories remain derived outputs with traceable source and
  transformer identity.

### Costs and residual risk

- Clients must persist trust-root and sequence state.
- Key ceremonies, revocation, expiry, clock failure, and offline use require
  real operational runbooks.
- Recursive bundle/dependency policy increases verification work.
- A correctly authorized signer can still publish harmful content.
- Initial root delivery and the verifier implementation remain critical trust
  anchors.

## Rejected alternatives

### Sign each file with a raw detached signature

Rejected because raw signatures do not authenticate type, provenance, policy
scope, freshness, or collection consistency and are easy to pair with the wrong
object.

### Canonicalize YAML before hashing

Rejected because YAML parsers and emitters differ, comments and style can
matter to inspection, and canonicalization could accept bytes other than those
the publisher reviewed. AIWG hashes exact published bytes.

### Sign the outer JSON wrapper directly

Rejected because it couples verification to wrapper serialization and makes
verification-material attachment awkward. DSSE signs the typed payload and
allows the transport wrapper to remain non-authoritative.

### Use only Cosign/Sigstore

Rejected as the universal contract because offline maintainer roots,
project-local signing, and transports without public-good infrastructure remain
valid AIWG use cases. Sigstore is a supported identity/evidence profile.

### Treat signed Git as sufficient

Rejected because users often receive individual artifacts outside Git and
generated/provider outputs need explicit transformation lineage.

## Compatibility

The rollout is additive: publish/verify sidecars first, require them for remote
bootstrap and flows next, then bridge release and marketplace evidence, then
add generated-output receipts. Legacy artifacts report `unsigned`. Enforcement
rollback may relax policy but must retain trusted root and sequence state.

## Verification evidence

- Schema: [`schemas/security/aiwg-artifact-attestation.v1.schema.json`](https://github.com/jmagly/aiwg/blob/main/schemas/security/aiwg-artifact-attestation.v1.schema.json)
- Predicate schema: [`schemas/security/aiwg-artifact-provenance.v1.schema.json`](https://github.com/jmagly/aiwg/blob/main/schemas/security/aiwg-artifact-provenance.v1.schema.json)
- Adversarial vectors: [`test/fixtures/security/artifact-attestation-v1.json`](https://github.com/jmagly/aiwg/blob/main/test/fixtures/security/artifact-attestation-v1.json)
- Conformance test: [`test/unit/security/artifact-attestation.test.ts`](https://github.com/jmagly/aiwg/blob/main/test/unit/security/artifact-attestation.test.ts)

## Primary references

- [DSSE protocol and PAE](https://github.com/secure-systems-lab/dsse/blob/master/protocol.md)
- [in-toto Statement v1](https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md)
- [in-toto envelope rules](https://github.com/in-toto/attestation/blob/main/spec/v1/envelope.md)
- [TUF 1.0.35](https://theupdateframework.github.io/specification/v1.0.35/)
- [Sigstore client specification](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md)
- [SLSA 1.2 provenance](https://slsa.dev/spec/v1.2/provenance)
- [W3C PROV-DM](https://www.w3.org/TR/prov-dm/)
- [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)
