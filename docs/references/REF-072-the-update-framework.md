# REF-072: The Update Framework

## Citation

The Update Framework. (2026). *The Update Framework Specification*. Version
1.0.35, last modified 15 July 2026.
<https://theupdateframework.github.io/specification/latest/>

The Update Framework. (2026). *Publications*. TUF.
<https://theupdateframework.io/resources/publications/>

## Document Profile

| Attribute | Value |
| ----------- | ------- |
| Year | 2010-2026 |
| Type | Secure update framework and specification |
| Status | Active CNCF graduated project ecosystem |
| AIWG Relevance | High - Canonical model for secure metadata, rollback protection, and key compromise resilience |

## Executive Summary

TUF is a framework for securing software update systems. Its central design
lesson is that signed targets are not enough: clients also need signed metadata
roles, freshness checks, version counters, consistent snapshots, and explicit
rollback detection.

AIWG's web-backed resource mode adopts a smaller version of that posture:
signed channel manifests point to exact release manifests, channel sequences
provide rollback resistance, manifest digests bind release contents, and offline
reads fail closed when verified cache state is unavailable.

## AIWG Implementation Mapping

| TUF Concept | AIWG Resource Implication |
| ------------- | --------------------------- |
| Root metadata | Bundled AIWG resource trust root |
| Timestamp/snapshot freshness | Signed channel manifest and sequence checks |
| Targets metadata | AIWG release manifest descriptors |
| Consistent snapshots | Cache generations keyed by version plus manifest digest |
| Rollback detection | Reject lower channel sequence or stale metadata |
| Key compromise resilience | Future threshold signing and key rotation work |

## Design Implications

- Maintain a distinction between channel metadata and release contents.
- Preserve monotonic channel sequence checks even when exact versions are
  otherwise immutable.
- Add future metadata expiry and threshold-signing support before treating the
  release-host architecture as a mature secure-update system.

## Pending Related Papers

The TUF publications list names several papers that should be inducted as
separate evidence entries when acquired: *Survivable Key Compromise in Software
Update Systems*, *Diplomat: Using Delegations to Protect Community
Repositories*, and *Mercury: Bandwidth-Effective Prevention of Rollback Attacks
Against Community Repositories*.

## Cross-References

- REF-071: SRI covers content integrity; TUF covers update-system metadata and
  freshness.
- REF-073: Registry provenance complements TUF by binding distribution authority
  to artifacts.
- `src/resources/web-release.ts`: AIWG release manifest and channel
  verification implementation.
