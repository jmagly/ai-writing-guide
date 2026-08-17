# Cross-Asset Attestation Publication

AIWG cross-asset attestations are adjacent DSSE sidecars over exact canonical
in-toto Statement bytes. The subject digest binds the exact artifact bytes;
descriptor metadata and browser rendering are not substitutes for verification.

For an artifact named `<name>`, publish:

```text
<name>
<name>.aiwg-attestation.json
```

The signed release descriptor records the artifact and sidecar path, SHA-256,
byte length, and media type. HTTP publishers may add a `Link` header with
`rel="describedby"`, but clients treat that header only as discovery. ETag,
Last-Modified, cache age, CDN revalidation, and an unsigned digest record never
authorize a publisher or change a verification result.

Stable-channel attestations include an expiry and monotonic sequence. Freshness
state is isolated by namespace, channel, signed asset type, and subject name so
setup manifests, flows, and indices from one release can share its sequence.
Ambiguous legacy state remains fail-closed until explicitly migrated.

User interfaces distinguish these states:

- `rendered` — bytes were parsed or displayed only.
- `unsigned` — no usable signature evidence exists.
- `policy-exempt` — explicit signed policy permits use without normal
  verification; this is not `verified`.
- `verified` — signatures, publisher delegation, exact bytes, materials,
  freshness, and persisted trust state all passed.

Publisher, release, and verification time are displayed only from authenticated
verifier output. Copy and download may remain available for inspection in any
state, but an agentic execution or handoff path accepts only `verified`.

## Compatibility and rollback

During migration, the existing signed web release manifest remains mandatory
alongside the new sidecar. Marketplace evidence follows its signed trust-root
`evidenceMode`; legacy marketplace signatures remain mandatory until the
signed `legacySignatureMigrationGate` explicitly permits cross-asset-only
verification. Catalog inclusion remains discovery, not endorsement.

Freezing or rolling back publication stops new emission or advances the channel
to an older immutable version with a new sequence. It does not delete prior
artifacts, attestations, audit history, or client trusted-sequence state.
