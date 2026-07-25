# REF-067: Semantic Versioning 2.0.0

## Citation

Preston-Werner, T. (2013). *Semantic Versioning Specification (SemVer) 2.0.0*.
Semantic Versioning. <https://semver.org/>

## Document Profile

| Attribute | Value |
| ----------- | ------- |
| Year | 2013 |
| Type | Versioning specification |
| Status | Stable, widely adopted |
| GRADE / Quality | A - normative specification with broad ecosystem adoption |
| AIWG Relevance | High - Defines exact version precedence and immutability language for resource selectors |

## Executive Summary

Semantic Versioning defines a public version contract using `MAJOR.MINOR.PATCH`,
optional prerelease identifiers, and optional build metadata. Its two resource
distribution lessons are directly applicable to AIWG:

1. Released version contents must be immutable; fixes require a new version.
2. Version precedence and prerelease ordering need one shared parser contract.

AIWG currently uses CalVer for project releases, but the web-resource selector
contract still needs SemVer literacy for future range support and for operator
expectations inherited from npm-like ecosystems.

## AIWG Implementation Mapping

| SemVer Concept | AIWG Resource Implication |
| ---------------- | --------------------------- |
| Immutable released version | A signed resource release must never be overwritten in place |
| Prerelease precedence | Candidate/canary channels must resolve to explicit immutable releases |
| Build metadata ignored in precedence | Build provenance belongs in manifests and lockfiles, not selector ordering |
| Public API requirement | Resource schema compatibility is part of AIWG's public CLI/resource contract |

## Design Implications

- `--aiwg-version` range support should be implemented with a standards-backed
  comparator, not an ad hoc string sort.
- Channel names are not versions. They are mutable pointers that must resolve
  to an immutable version plus manifest digest before resource bytes are read.
- Lockfiles should persist the resolved immutable version, not only the
  human-facing selector.

## Cross-References

- REF-068: npm dist-tags and lockfiles apply SemVer expectations in a package
  registry workflow.
- REF-072: TUF also uses version counters and rollback checks, but for metadata
  freshness rather than API compatibility.
- `docs/install/web-backed-resources.md`: public AIWG web-resource selector
  contract.
