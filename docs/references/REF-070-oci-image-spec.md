# REF-070: OCI Image Specification

## Citation

Open Container Initiative. (2026). *OCI Image Specification*. OCI.
<https://github.com/opencontainers/image-spec>

Descriptor specification:
<https://github.com/opencontainers/image-spec/blob/main/descriptor.md>

## Document Profile

| Attribute | Value |
| ----------- | ------- |
| Year | 2017-2026 |
| Type | Content and descriptor specification |
| Status | Active OCI standard |
| AIWG Relevance | Medium - Descriptor and digest model for verifiable resource bundles |

## Executive Summary

The OCI Image Specification defines content descriptors that bind media type,
size, and digest. The digest acts as a content identifier: clients can fetch
bytes from an untrusted or intermediate source and independently verify that
the bytes match the expected descriptor.

AIWG uses the same pattern for web resources: manifests commit descriptor paths,
sizes, and SHA-256 digests; cache reads re-check the descriptor before the CLI
uses a resource body.

## AIWG Implementation Mapping

| OCI Image Concept | AIWG Resource Implication |
| ------------------- | --------------------------- |
| Descriptor digest | Manifest `sha256` fields for bundles, prebuilt indices, and raw resources |
| Descriptor size | Manifest byte-size commitments for cache and body validation |
| Image manifest | AIWG release manifest |
| Image index | Future multi-graph or multi-platform resource manifest extensions |
| Content addressability | Cache key includes version and manifest digest |

## Design Implications

- Descriptor verification should remain mandatory before any resource body is
  parsed or rendered.
- Cache cleanup must preserve digest-keyed generations that are pinned by a
  project lockfile.
- Descriptor metadata should be treated as public compatibility surface because
  downstream tooling can build reproducibility checks on it.

## Cross-References

- REF-069: OCI Distribution Specification defines the registry API around OCI
  manifests and blobs.
- REF-071: SRI is a simpler content-hash precedent for web fetches.
- `src/resources/web-release.ts`: AIWG descriptor verification implementation.
