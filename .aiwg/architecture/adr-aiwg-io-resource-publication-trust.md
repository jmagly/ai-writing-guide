# ADR: aiwg.io Resource Publication and Trust Model

**Status**: Proposed
**Date**: 2026-07-21
**Related**: #1847, #1851, #1852, `.aiwg/architecture/adr-signed-tag-verify.md`

## Context

Publishing AIWG resources to `aiwg.io` moves first-party framework, addon, skill, command, rule, behavior, documentation, and index artifacts across a network trust boundary. HTTPS protects transport, but it does not by itself provide release immutability, rollback protection, or a way for clients to prove that fetched bytes are the intended AIWG release bytes.

The existing signed-tag release gate anchors source release identity. Web resource distribution must extend that chain to the published resource bundles and channel manifests.

## Decision

Every distinct AIWG release publishes:

```text
https://aiwg.io/resources/<version>/manifest.json
https://aiwg.io/resources/<version>/manifest.sig
https://aiwg.io/resources/<version>/bundles/<bundle>.tar.zst
https://aiwg.io/resources/<version>/bundles/<bundle>.tar.zst.sha256
```

Mutable channel manifests publish separately:

```text
https://aiwg.io/resources/channels/stable.json
https://aiwg.io/resources/channels/latest.json
https://aiwg.io/resources/channels/canary.json
https://aiwg.io/resources/channels/main.json
```

Required metadata:

- AIWG CLI/resource schema version.
- Source git commit and signed tag.
- Resource bundle list with SHA-256 digests, sizes, media types, and logical prefixes.
- Build timestamp and publishing workflow identity.
- Minimum compatible CLI version and known-incompatible CLI ranges.
- Optional signatures/attestations when available.

Client behavior:

- Require HTTPS for web resources.
- Verify manifest signature when trust roots are configured.
- Always verify manifest and bundle digests before using cached or downloaded bytes.
- Fail closed on digest mismatch.
- Persist the resolved version and digest in `.aiwg/resources.lock.json` for mutating commands.

Default-flip gate:

Web mode must not become the default until a TUF-style metadata layer, or equivalent signed snapshot/timestamp mechanism, protects clients from rollback, freeze, and mix-and-match attacks. The opt-in MVP may ship with signed release manifests and digest locks, but the default switch requires rollback/freeze protection.

## Consequences

### Positive

- The smaller npm package can fetch large resource graphs without losing integrity checks.
- The release chain remains anchored to signed tags.
- Operators can reproduce deployed resource state by version and digest.

### Negative

- Publication pipeline complexity increases.
- Channel manifests become operationally sensitive.
- CLI compatibility constraints must be maintained for old clients.

## Trust-Boundary Inventory

| Input | Source | Verification | Trust Anchor |
|---|---|---|---|
| AIWG source | Gitea/GitHub mirror | signed tag verification | maintainer signing keys |
| Release manifest | `aiwg.io` | signature and digest | AIWG release key |
| Resource bundles | `aiwg.io` | SHA-256 digest from manifest | signed manifest |
| Channel manifest | `aiwg.io` | signature and monotonic version policy | AIWG channel key |
| Cached bytes | local user cache | digest re-check | signed manifest or lockfile |

## Alternatives Considered

- **HTTPS-only CDN**: rejected for default mode because it lacks artifact-level integrity and rollback protection.
- **npm-only resource packages**: rejected because AIWG needs provider-neutral URI resolution and per-call resource selection independent of CLI binary installation.
- **OCI registry as first storage backend**: viable later, but `aiwg.io` static resources are simpler for the first opt-in path.

## References

- `.aiwg/architecture/adr-signed-tag-verify.md`
- `https://www.w3.org/TR/sri-2/`
- `https://theupdateframework.io/docs/metadata/`
- `https://github.com/theupdateframework/specification/blob/master/tuf-spec.md`
- `https://specs.opencontainers.org/distribution-spec/`
- Local corpus candidate: `/home/roctinam/dev/research/research-papers/documentation/references/REF-1814-mccann-2026-cryptographic-registry-provenance.md`
