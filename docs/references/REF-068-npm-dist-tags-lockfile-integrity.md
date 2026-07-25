# REF-068: npm Dist-Tags and Lockfile Integrity

## Citation

npm. (2026). *Package metadata response documentation*. npm registry repository.
<https://github.com/npm/registry/blob/master/docs/responses/package-metadata.md>

npm. (2026). *package-lock.json*. npm CLI documentation.
<https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/>

npm. (2026). *Adding dist-tags to packages*. npm documentation.
<https://docs.npmjs.com/adding-dist-tags-to-packages/>

## Document Profile

| Attribute | Value |
| ----------- | ------- |
| Year | 2026 |
| Type | Package registry and CLI documentation |
| Status | Active operational standard for JavaScript package distribution |
| AIWG Relevance | High - Provides the nearest operator model for channels, exact resolution, and lockfiles |

## Executive Summary

npm separates human-facing version selection from reproducible installation.
Package metadata exposes `dist-tags` such as `latest` as labels that map to
published versions, while lockfiles record the exact dependency tree and
integrity material needed for repeatable installs.

For AIWG, this is the clearest precedent for treating `stable`, `latest`,
`canary`, and `main` as mutable selectors that must resolve to exact immutable
resource releases. It also supports the current `.aiwg/resources.lock.json`
shape: persist the selector for auditability, but pin the resolved version,
manifest URL, manifest digest, and content digests for reproducibility.

## AIWG Implementation Mapping

| npm Pattern | AIWG Resource Pattern |
| ------------- | ----------------------- |
| `dist-tags` map labels to versions | Channel manifests map channel names to exact AIWG resource versions |
| `latest` is conventional, not immutable | `stable`/`latest` are pointers, not cache identities |
| `package-lock.json` records exact tree | `.aiwg/resources.lock.json` records exact resource release state |
| Integrity metadata protects fetched bytes | Manifest and descriptor SHA-256 values protect resource bytes |

## Design Implications

- Do not cache a channel name as if it were a release. Cache the exact resolved
  version plus manifest digest.
- Lockfile writes should be explicit. A read-only discover/show command should
  not silently change project reproducibility state.
- Offline mode should rely on lockfile/cache identity and fail closed when the
  required bytes are missing or drift from their recorded digest.

## Cross-References

- REF-067: SemVer supplies version ordering expectations used by npm-like
  registries.
- REF-071: SRI supplies the browser analogue for verifying fetched bytes.
- REF-072: TUF supplies rollback and metadata freshness protections beyond
  simple integrity fields.
- `docs/install/web-backed-resources.md`: AIWG resource lockfile contract.
