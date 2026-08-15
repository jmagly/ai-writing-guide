# AIWG cross-asset authenticity and provenance

- Status: Accepted research baseline
- Date: 2026-08-14
- Issue: [#2068](https://git.integrolabs.net/roctinam/aiwg/issues/2068)
- Decision: [Cross-asset attestation envelope](../architecture/adr-cross-asset-attestation-envelope.md)
- Contract: [`aiwg-artifact-attestation.v1.schema.json`](https://github.com/jmagly/aiwg/blob/main/schemas/security/aiwg-artifact-attestation.v1.schema.json)
- Provenance: [`asset-authenticity-contract.prov.json`](provenance/asset-authenticity-contract.prov.json)

## Executive summary

AIWG should use one authenticity contract for every first-party asset without
requiring every asset to use one storage system. The contract is a DSSE envelope
whose payload is an in-toto Statement. The Statement names the artifact by the
SHA-256 digest of its exact published bytes and carries an AIWG provenance
predicate. Publisher identity, delegated scope, freshness, revocation, and
threshold rules remain verifier policy, not unauthenticated claims in the file.

This design deliberately separates four questions:

1. **Integrity** — are these the exact bytes named by the attestation?
2. **Identity and authority** — did enough currently trusted publishers sign
   for this asset class, namespace, and channel?
3. **Freshness** — is this publication newer than the verifier's persisted
   trusted state and still within its validity window?
4. **Lineage** — which immutable materials and transformation produced it?

A valid signature is not a safety review. It does not prove that an agent,
skill, flow, installer, dependency, or generated output is benign or correct.

## Primary-specification synthesis

- [DSSE](https://github.com/secure-systems-lab/dsse/blob/master/protocol.md)
  signs pre-authentication encoding of both payload type and exact payload
  bytes. This avoids ambiguous type interpretation and verifier-side
  canonicalization during signature verification.
- The [in-toto Statement v1
  specification](https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md)
  binds a typed predicate to immutable subjects identified by digest. Its
  [envelope rules](https://github.com/in-toto/attestation/blob/main/spec/v1/envelope.md)
  require the authenticated payload, not an outer media-type hint, to determine
  predicate semantics.
- [The Update Framework 1.0.35](https://theupdateframework.github.io/specification/v1.0.35/)
  shows why signatures alone do not prevent rollback, freeze, fast-forward, or
  mix-and-match attacks. AIWG therefore needs persisted sequence state,
  expiry, delegated scopes, threshold roots, and recovery procedures.
- The [Sigstore client
  specification](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md)
  defines a portable bundle for verification material and treats verification
  policy as distinct from the bundle. AIWG permits a Sigstore bundle by value
  or digest-bound reference rather than copying its certificate/transparency
  model.
- [SLSA 1.2 provenance](https://slsa.dev/spec/v1.2/provenance) describes
  verifiable information about where, when, and how an artifact was produced.
  AIWG uses that boundary for release and generated-asset lineage without
  claiming a SLSA level.
- [W3C PROV-DM](https://www.w3.org/TR/prov-dm/) supplies the Entity, Activity,
  Agent, and derivation vocabulary already used in AIWG. The signed predicate
  carries a compact distribution projection; richer PROV graphs can be linked
  by digest.
- [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) supplies deterministic JSON
  serialization for producers and test vectors. DSSE verification still uses
  the decoded payload bytes directly; a verifier must never parse and
  reserialize the payload before checking its signature.

## Threat model

### Protected against

| Threat | Required control |
| --- | --- |
| Artifact changed on a CDN, mirror, cache, registry, or website | Exact-byte subject digest plus a valid authorized signature |
| Correct signature paired with the wrong artifact | Subject name, digest, media type, asset class, and namespace policy |
| Old but valid release replayed | Monotonic channel sequence and persisted trusted state |
| Different metadata generations combined | Signed release/collection subject and consistent member digests |
| Expired publication frozen indefinitely | Signed expiry plus a verifier time/freshness policy |
| One online publishing key compromised | Offline root, scoped delegation, short validity, and configurable threshold |
| Generated provider file altered after deployment | Signed source material plus a local transformation receipt and output digest |
| Dependency or bundled member substituted | Signed material/inventory digests and recursive policy for required dependencies |
| Verification evidence unavailable offline | Portable verification material and previously persisted trust/freshness state |

### Not protected against

- A trusted signer intentionally publishing harmful content.
- A compromised build and signing path that produces internally consistent
  malicious bytes and provenance.
- Vulnerabilities, unsafe prompts, misleading documentation, or undesirable
  runtime behavior inside correctly signed assets.
- A compromised initial trust-root delivery channel.
- Loss of reliable time before any trusted freshness state has been persisted.
- Availability attacks. A verifier can fail closed but cannot force a mirror to
  serve a current artifact.

### Trust assumptions and residual risks

The first trusted root must arrive through the installed AIWG package, a signed
release, or an independently authenticated operator channel. Root metadata must
be versioned and persisted. Hardware/OS trust, cryptographic library
correctness, SHA-256 collision resistance, and correct verifier implementation
remain assumptions. Sigstore-backed verification additionally trusts the
selected certificate authority, transparency log, timestamp authority, OIDC
issuer, and the operator policy that binds their identities.

Compromise remains possible while a delegated key is valid. Short delegation
windows limit exposure but make offline verification sensitive to time. A
revocation cannot erase already consumed content; it prevents future policy
acceptance and gives incident response a stable cutoff.

## Signed object and byte rules

The distribution object is
`application/vnd.aiwg.artifact-attestation.v1+json`. Its `envelope` is DSSE:

- `payloadType` is `application/vnd.in-toto+json`.
- `payload` is base64 of an RFC 8785 JSON serialization of an in-toto Statement.
- `predicateType` is
  `https://aiwg.io/attestations/artifact-provenance/v1`.
- `subject[].digest.sha256` is lowercase hex over the exact artifact bytes.

Artifact bytes are never newline-normalized, Unicode-normalized, parsed as
YAML, reformatted, decompressed, or reserialized for digest verification. An LF
YAML file and a CRLF YAML file are different artifacts. Archives are subjects
as published; an unpacked directory is represented by a signed inventory whose
paths are UTF-8, relative, slash-separated, unique, sorted by raw UTF-8 byte
order, and individually digest-bound.

Producers canonicalize the Statement once before signing. Verifiers base64
decode, apply DSSE pre-authentication encoding, and verify those exact payload
bytes. Only after signature verification may they parse and validate the
Statement and predicate. This is important: RFC 8785 makes production and
fixtures reproducible, but is not a repair mechanism for a changed payload.

## Asset and trust matrix

| First-party asset class | Examples | Required authenticated claims | Initial policy |
| --- | --- | --- | --- |
| Bootstrap manifests | `setup.aiwg.yaml`, `agentic.yaml` | exact bytes, release, channel sequence, publisher scope, expiry | Required before agent-guided execution |
| Agentic flows | flow/playbook YAML, gates, targets, capabilities | exact bytes, schema, materials, bundle membership | Required for web/marketplace delivery |
| Executable guidance | agents, skills, commands, rules, behaviors | exact bytes, stable capability ID, source commit, containing bundle | Required for remote delivery; local source checkout may use signed Git release policy |
| Executable runtime | tools, scripts, MCP servers, hooks, workflow engines | exact bytes/package digest, runtime entry point, dependency inventory, source/build lineage | Required before remote installation or execution |
| Content assets | templates, examples, docs, prompts, quickrefs | exact bytes, content type, source release | Required when remotely fetched for agent context; informational site HTML may be policy-exempt |
| Configuration and presentation | provider profiles, personas/SOUL, themes, images, media | exact bytes, stable identity, intended consumer, source release | Required when injected into agent context; visual-only site media may be policy-exempt |
| Product bundles | frameworks, addons, extensions, plugins | inventory digest, member digests, dependency locks, license/SBOM link | Threshold required for stable channel |
| Schemas and contracts | JSON Schema, YAML schemas, protocol fixtures | exact bytes, schema ID/version, compatibility lineage | Required when used for validation or execution gates |
| Release artifacts | npm tarballs, CLI package, release manifest, SBOM | source revision, builder, workflow identity, artifact digest | Keep current tag/npm/Cosign controls; add cross-asset attestation as a bridge |
| Web resource releases | channel/release manifests, raw resources, indices | channel, sequence, expiry, resource descriptors, release digest | Required; preserve existing signed-manifest verification during migration |
| Marketplace/Fortemi | catalog, lock, provenance envelope, shard, receipt, prebuilt index | publisher namespace, immutable Git/material digests, inventory, PROV link | Verify existing envelope and new attestation during transition |
| Generated provider artifacts | `.claude`, `.agents`, `.codex`, provider context | verified source subject, transformer ID/version, output digest, project scope | Local receipt; never treat generated provider directories as source-of-truth implementations |
| Project/research outputs | plans, ADRs, findings, generated docs/code | source entities, activity, responsible agent, review state | Project policy; provenance may be required without publisher signature |
| Website presentation | rendered pages, social images, UI explainers | deployment manifest or build provenance | Site deployment manifest signs collections; individual static files may be policy-exempt |

`policy-exempt` is an explicit result, not a synonym for verified. It must name
the matching policy rule and still check any available digest. Nothing intended
for execution or provider context may use the website-presentation exemption.

## Publisher identity and lifecycle

### Root and delegation

The verifier stores versioned root metadata separately from attestations. A
root maps key IDs or Sigstore identities to publishers, permitted asset
classes, namespaces, channels, validity intervals, and signature thresholds.
Delegations are narrow and cannot expand the delegator's scope. The DSSE
`keyid` is only a lookup hint; trust comes from the root and policy.

Recommended operational split:

- Offline threshold root: 2-of-3 or stronger, used for root versions,
  revocations, and recovery.
- Release delegation: short-lived CI identity scoped to the canonical release
  workflow and tagged releases.
- Website delegation: scoped to site deployment manifests and public resource
  paths, never npm packages or bootstrap roots.
- Maintainer emergency delegation: hardware-backed, short expiry, with a
  mandatory incident record.

### Rotation, expiry, and revocation

Routine rotation publishes a new root version signed by both the old threshold
and the new threshold. Clients require exactly the next root version and persist
it before accepting new delegations. Delegated artifacts should overlap old and
new signatures for one release window.

Revocation records a key ID, effective time, reason, affected scopes, and
whether the compromise is retroactive to an earlier time. Verifiers reject
signatures inside the compromise interval even if the artifact predates the
revocation publication. Emergency recovery uses an uncompromised offline root,
increments root and channel versions, revokes the key, republishes current
targets, and identifies every potentially affected release.

### Thresholds and offline behavior

Thresholds count independent authorized identities, not duplicate signatures
or multiple services operated by the same identity. Offline verification is
allowed only with a complete envelope, required verification material, a
non-expired trusted root, and persisted sequence state. Missing evidence returns
`offline-evidence-missing`; it never silently degrades to hash-only trust.

## Discovery and storage convention

For a single artifact at `<name>`, publishers place the attestation at
`<name>.aiwg-attestation.json`. HTTP publishers may also emit:

```http
Link: <<name>.aiwg-attestation.json>; rel="describedby"; type="application/vnd.aiwg.artifact-attestation.v1+json"
```

The adjacent name is authoritative when no signed release descriptor is
available. A signed collection/release manifest should instead carry an
`attestation` descriptor containing the sidecar path, SHA-256, byte length, and
media type. Consumers verify the collection before trusting the descriptor.
OCI and registry transports may attach the same media type as a referrer; Git
transport stores the sidecar next to the immutable artifact.

For AIWG bootstrap resources this yields:

- `https://aiwg.io/setup.aiwg.yaml`
- `https://aiwg.io/setup.aiwg.yaml.aiwg-attestation.json`
- `https://aiwg.io/agentic.yaml`
- `https://aiwg.io/agentic.yaml.aiwg-attestation.json`

The install UI may inspect or copy either YAML without navigating away, but it
must display `verified`, the signer/publisher, release version, and verification
time only after local verification. Browser rendering alone is not evidence.

## Stable verifier contract

Proposed command surface:

```text
aiwg verify <artifact> [--attestation <path-or-url>] [--policy <name>] [--offline] [--json]
```

JSON returns `schemaVersion: aiwg.verify.result.v1`, `status`, subject digest,
matched policy, authorized identities, root version, sequence/freshness state,
and diagnostics. Human output must not collapse non-verified states into a
generic warning.

| Exit | Status | Meaning |
| ---: | --- | --- |
| 0 | `verified` | Integrity, authority, freshness, and policy all pass |
| 20 | `policy-exempt` | Explicit exemption matched; not verified |
| 21 | `unsigned` | No usable attestation exists |
| 22 | `unknown-signer` | Cryptographic signature may parse, but no authorized identity matches |
| 23 | `expired` | Attestation or required trust metadata is outside validity |
| 24 | `revoked` | A required signer is revoked or in a compromise interval |
| 25 | `stale` | Sequence/version indicates rollback, replay, freeze, or fast-forward recovery state |
| 26 | `mismatched` | Artifact, member, subject, payload, or signature bytes do not match |
| 27 | `malformed` | Envelope, Statement, predicate, or verification material is invalid |
| 28 | `offline-evidence-missing` | Offline policy lacks required roots, proofs, timestamps, or state |
| 29 | `policy-denied` | Valid evidence does not satisfy scope, threshold, namespace, or channel policy |

An explicit `--allow-policy-exempt` may convert exit 20 to zero for a caller
that consciously accepts the exemption; the JSON status remains
`policy-exempt`. No flag may convert exits 21–29 to `verified`.

## Mapping to current AIWG paths

### Release pipeline

Keep signed tags, npm provenance, Cosign bundles, signed release manifests, and
signed SBOMs. The new Statement references the same exact artifact digests and
records the immutable source revision and builder identity. Sigstore bundles
are accepted as verification material, so migration adds a common policy layer
without invalidating existing releases.

### Web-backed resources and aiwg.io setup paths

The existing signed channel/release manifest remains the collection root.
Release descriptors gain attestation descriptors, starting with
`setup.aiwg.yaml`, `agentic.yaml`, flow bundles, and prebuilt indices. The site
publishes adjacent sidecars and verification-aware inspection UI. A channel's
persisted sequence and expiry prevent a valid old setup file from being replayed
as current.

### Marketplace and Fortemi

The Git-native marketplace already records immutable Git/material digests,
W3C PROV, publisher keys, rotation, and revocation. A bridge signs its closed
marketplace envelope as an in-toto subject; the AIWG predicate links the
Fortemi shard/receipt and inventory digests. During compatibility mode both the
existing marketplace signature and the cross-asset attestation must verify.

### Provider deployment

Canonical implementations remain under `agentic/code`. Deployment verifies the
source bundle, records the transformer and provider adapter version, and emits a
local receipt for each generated provider tree. `.agents`, `.claude`, `.codex`,
and other provider roots are outputs, never independent publication authorities.

## Compatibility and rollout

1. **Contract and fixtures** — publish this report, ADR, schema, and adversarial
   oracle. No runtime behavior changes.
2. **Verifier and trust root** — add read-only verification, stable results,
   offline cache/state, root lifecycle, and runbooks. Legacy assets are
   `unsigned`, not invalid.
3. **Bootstrap/web enforcement** — publish sidecars for setup manifests and
   flows; verify before inspect/copy/use; require signatures on stable channel.
4. **Release and marketplace bridge** — emit common attestations alongside
   current Cosign and marketplace evidence; require both during one compatibility
   window.
5. **Bundle and provider lineage** — sign inventories and emit local transform
   receipts; make drift visible in doctor/status.
6. **Policy hardening** — apply thresholds, delegated scopes, revocation,
   freshness, and recursive dependency requirements by asset class.

Each phase needs rollback instructions. The verifier phase is additive and can
be disabled without changing artifacts. Enforcement rollback restores the
previous policy but must retain verified sequence/root state so rollback cannot
be used to accept older metadata. Publisher rollback stops new attestation
emission; it never deletes prior evidence.

## Operational runbooks required before enforcement

- Offline-root bootstrap and independent fingerprint publication.
- Routine delegation rotation with overlap and expiry rehearsal.
- Key-compromise revocation, affected-release enumeration, and root recovery.
- Lost-key recovery without weakening thresholds.
- Clock failure and offline freshness-state recovery.
- Mirror/CDN rollback, freeze, and mix-and-match diagnosis.
- Sigstore outage and portable-bundle verification.
- Emergency policy rollback that preserves monotonic trusted state.
- Generated provider-tree drift triage and clean regeneration.

## Adversarial conformance plan

The tracked oracle covers valid verification plus artifact tampering, LF/CRLF
changes, noncanonical payload serialization, replay, rollback, mix-and-match,
unknown signer, expiry, revocation/compromise interval, altered generated
outputs, subdependency substitution, missing offline evidence, and explicit
policy exemption. These fixtures are protocol tests, not a production verifier.

## Separately fileable implementation roadmap

1. [#2087: core DSSE/in-toto verifier and stable result
   contract](https://git.integrolabs.net/roctinam/aiwg/issues/2087).
2. [#2088: root, delegation, threshold, rotation, revocation, freshness, and
   runbooks](https://git.integrolabs.net/roctinam/aiwg/issues/2088).
3. [#2089: release/web-resource emission and aiwg.io setup inspection
   UI](https://git.integrolabs.net/roctinam/aiwg/issues/2089).
4. [#2090: marketplace/Fortemi bridge and recursive dependency
   policy](https://git.integrolabs.net/roctinam/aiwg/issues/2090).
5. [#2091: provider-transformation receipts and deployed drift
   diagnostics](https://git.integrolabs.net/roctinam/aiwg/issues/2091).
6. [#2092: adversarial conformance and compatibility gates across
   transports](https://git.integrolabs.net/roctinam/aiwg/issues/2092).

## References

- [DSSE protocol](https://github.com/secure-systems-lab/dsse/blob/master/protocol.md)
- [DSSE envelope](https://github.com/secure-systems-lab/dsse/blob/master/envelope.md)
- [in-toto Statement v1](https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md)
- [in-toto envelope specification](https://github.com/in-toto/attestation/blob/main/spec/v1/envelope.md)
- [TUF 1.0.35](https://theupdateframework.github.io/specification/v1.0.35/)
- [Sigstore client specification](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md)
- [Sigstore protobuf specifications](https://github.com/sigstore/protobuf-specs)
- [SLSA 1.2 provenance](https://slsa.dev/spec/v1.2/provenance)
- [W3C PROV-DM](https://www.w3.org/TR/prov-dm/)
- [RFC 8785 JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
- [REF-062: W3C PROV](../references/REF-062-w3c-prov.md)
- [REF-071: Subresource Integrity](../references/REF-071-w3c-subresource-integrity.md)
- [REF-072: The Update Framework](../references/REF-072-the-update-framework.md)
- [REF-073: Cryptographic registry provenance](../references/REF-073-cryptographic-registry-provenance.md)
- [REF-074: Signing is not enough](../references/REF-074-signing-is-not-enough-provenance-graph.md)
