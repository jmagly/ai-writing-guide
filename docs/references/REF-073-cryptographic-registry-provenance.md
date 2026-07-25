# REF-073: Cryptographic Registry Provenance

## Citation

McCann, A. L. (2026). *Cryptographic Registry Provenance: Structural Defense
Against Dependency Confusion in AI Package Ecosystems*. arXiv:2605.03309v2.
<https://arxiv.org/abs/2605.03309>

Local source corpus: `/home/roctinam/dev/research/research-papers` REF-1814.

## Document Profile

| Attribute | Value |
| ----------- | ------- |
| Year | 2026 |
| Type | arXiv preprint |
| Source status | Full PDF/text archived in local research corpus |
| AIWG Relevance | High - Direct model for registry identity and namespace binding |

## Executive Summary

McCann frames dependency confusion as a missing distribution-provenance problem.
The proposed defense gives registries cryptographic identities, has publishers
sign provenance manifests, has registries countersign publication events, and
lets consumers pin authoritative registry fingerprints for namespaces.

For AIWG, this is relevant because web-backed resources create a first-party
registry-like surface. Signing the release manifest proves integrity under the
AIWG trust root, but higher-assurance deployment may also need explicit
distribution authority: which host, key, and namespace were authorized to serve
which resource family.

## AIWG Implementation Mapping

| Paper Concept | AIWG Resource Implication |
| --------------- | --------------------------- |
| Registry identity | Publish and pin release-host signing identity |
| Publisher signature | AIWG release signing key signs manifests |
| Registry countersignature | Future release-host attestation can bind publication event |
| Namespace binding | Restrict `aiwg://frameworks`, `aiwg://addons`, and `aiwg://core` to first-party authority |
| Resolver enforcement | Reject resources whose host/key/path do not match first-party policy |

## Design Implications

- Treat release host identity as part of the trust contract, not just a URL.
- Keep logical resource IDs separate from physical URLs so resolver policy can
  enforce first-party ownership.
- Consider registry/publication attestations as a future layer above the
  current signed manifest.

## Cross-References

- REF-072: TUF protects update metadata and rollback-sensitive publication.
- REF-074: Provenance graph verification complements artifact and registry
  signatures.
- REF-075: Agent skills need content-level review in addition to provenance.
- `src/resources/resolver.ts`: AIWG logical resource resolver.
