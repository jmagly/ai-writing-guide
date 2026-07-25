# REF-069: OCI Distribution Specification

## Citation

Open Container Initiative. (2026). *OCI Distribution Specification*. OCI.
<https://github.com/opencontainers/distribution-spec>

Rendered specification: <https://specs.opencontainers.org/distribution-spec/>

## Document Profile

| Attribute | Value |
| ----------- | ------- |
| Year | 2021-2026 |
| Type | Registry API specification |
| Status | Active OCI standard |
| AIWG Relevance | Medium - Registry model for immutable content distribution and referrers |

## Executive Summary

The OCI Distribution Specification standardizes registry APIs for distributing
content. The resource-distribution lesson for AIWG is not that AIWG must become
an OCI registry; it is that mature registries separate named references from
content-addressed blobs and make manifests the unit that binds related content.

This model supports AIWG's release-host architecture: channel names and exact
versions are lookup inputs, while manifest digests and descriptor hashes are the
verification surface.

## AIWG Implementation Mapping

| OCI Distribution Concept | AIWG Resource Implication |
| -------------------------- | --------------------------- |
| Registry API | `releases.aiwg.io` release-host contract |
| Manifest retrieval | Versioned `manifest.json` fetch before body reads |
| Blob/content transfer | Raw resources and prebuilt Fortemi exports |
| Referrers and artifact metadata | Future room for attestations, SBOMs, and release evidence |
| Conformance tooling | Local-vs-web parity and offline conformance suites |

## Design Implications

- Keep resource bodies behind a signed manifest instead of treating each URL as
  self-authenticating.
- Make digest-addressed cache generations the stable local identity.
- Reserve room for future attestation/referrer-style metadata without changing
  the first resource body contract.

## Cross-References

- REF-070: OCI Image Specification defines descriptors and digest-addressed
  content structures used by OCI Distribution.
- REF-074: Provenance graphs often use OCI registries as their storage substrate.
- `docs/install/web-backed-resources.md`: AIWG release-host contract.
